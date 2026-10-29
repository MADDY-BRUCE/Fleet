import Database from 'better-sqlite3';
import { Vehicle, Driver, Delivery, Assignment, AuditLog } from './db';

export interface ServiceError {
  status: number;
  error: string;
  message: string;
}

export class AssignmentService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // Helper for audit logging
  public logAudit(actor: string, action: string, entity: string, entityId: string, details: string) {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (timestamp, actor, action, entity, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(new Date().toISOString(), actor, action, entity, entityId, details);
  }

  // 1. ATOMIC ASSIGNMENT (THE CORE RULE)
  public assignDelivery(deliveryId: string, vehicleId: string, driverId: string, actor: string = 'admin') {
    // Wrap entire check and update inside an IMMEDIATE transaction
    const executeAssignment = this.db.transaction(() => {
      // Step A: Fetch current records inside transaction
      const delivery = this.db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get(deliveryId) as Delivery | undefined;
      if (!delivery) {
        const err: ServiceError = {
          status: 404,
          error: 'DELIVERY_NOT_FOUND',
          message: `Delivery ${deliveryId} was not found in the manifest`,
        };
        throw err;
      }

      const vehicle = this.db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicleId) as Vehicle | undefined;
      if (!vehicle) {
        const err: ServiceError = {
          status: 404,
          error: 'VEHICLE_NOT_FOUND',
          message: `Vehicle ${vehicleId} does not exist in the fleet registry`,
        };
        throw err;
      }

      const driver = this.db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get(driverId) as Driver | undefined;
      if (!driver) {
        const err: ServiceError = {
          status: 404,
          error: 'DRIVER_NOT_FOUND',
          message: `Driver ${driverId} does not exist in the crew directory`,
        };
        throw err;
      }

      // Step B: Check delivery state
      if (delivery.status !== 'pending') {
        const err: ServiceError = {
          status: 409,
          error: 'DELIVERY_NOT_PENDING',
          message: `Delivery ${deliveryId} cannot be assigned because its current status is '${delivery.status}'`,
        };
        throw err;
      }

      // Check active assignment conflicts directly in assignments table
      const activeVehicleAssignment = this.db.prepare(
        'SELECT assignment_id, delivery_id FROM assignments WHERE vehicle_id = ? AND is_active = 1'
      ).get(vehicleId) as { assignment_id: string; delivery_id: string } | undefined;

      const activeDriverAssignment = this.db.prepare(
        'SELECT assignment_id, delivery_id FROM assignments WHERE driver_id = ? AND is_active = 1'
      ).get(driverId) as { assignment_id: string; delivery_id: string } | undefined;

      const isVehicleBusy = vehicle.status !== 'available' || !!activeVehicleAssignment;
      const isDriverBusy = driver.availability_status !== 'available' || !!activeDriverAssignment;

      // Check for both unavailable
      if (isVehicleBusy && isDriverBusy) {
        const err: ServiceError = {
          status: 409,
          error: 'BOTH_UNAVAILABLE',
          message: `Both vehicle ${vehicleId} (${vehicle.status}) and driver ${driver.name} (${driver.availability_status}) are currently unavailable`,
        };
        throw err;
      }

      if (isVehicleBusy) {
        const reason = vehicle.status === 'maintenance'
          ? `Vehicle ${vehicleId} is currently undergoing maintenance`
          : vehicle.status === 'inactive'
          ? `Vehicle ${vehicleId} is marked inactive`
          : `Vehicle ${vehicleId} is already assigned to active delivery ${activeVehicleAssignment?.delivery_id || 'another job'}`;

        const err: ServiceError = {
          status: 409,
          error: 'VEHICLE_UNAVAILABLE',
          message: reason,
        };
        throw err;
      }

      if (isDriverBusy) {
        const reason = driver.availability_status === 'unavailable'
          ? `Driver ${driver.name} (${driverId}) is marked off-duty/unavailable`
          : `Driver ${driver.name} (${driverId}) is already assigned to active delivery ${activeDriverAssignment?.delivery_id || 'another job'}`;

        const err: ServiceError = {
          status: 409,
          error: 'DRIVER_UNAVAILABLE',
          message: reason,
        };
        throw err;
      }

      // Generate assignment ID
      const assignmentId = `A${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      // Step C: Execute Atomic Writes
      this.db.prepare(`
        INSERT INTO assignments (assignment_id, delivery_id, vehicle_id, driver_id, assigned_at, released_at, is_active)
        VALUES (?, ?, ?, ?, ?, NULL, 1)
      `).run(assignmentId, deliveryId, vehicleId, driverId, now);

      this.db.prepare(`UPDATE vehicles SET status = 'assigned' WHERE vehicle_id = ?`).run(vehicleId);
      this.db.prepare(`UPDATE drivers SET availability_status = 'assigned' WHERE driver_id = ?`).run(driverId);
      this.db.prepare(`UPDATE deliveries SET status = 'assigned' WHERE delivery_id = ?`).run(deliveryId);

      this.logAudit(
        actor,
        'ASSIGN_DELIVERY',
        'DELIVERY',
        deliveryId,
        `Assigned delivery ${deliveryId} to Vehicle ${vehicleId} (${vehicle.registration_no}) and Driver ${driver.name} (${driverId})`
      );

      return {
        assignment_id: assignmentId,
        delivery_id: deliveryId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        driver_name: driver.name,
        vehicle_registration: vehicle.registration_no,
        status: 'assigned',
        message: 'Assignment created successfully',
      };
    });

    return executeAssignment.immediate();
  }

  // 2. STATUS TRANSITIONS & AUTOMATIC RESOURCE RELEASE
  public updateDeliveryStatus(deliveryId: string, newStatus: string, actor: string = 'system') {
    const executeTransition = this.db.transaction(() => {
      const delivery = this.db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get(deliveryId) as Delivery | undefined;
      if (!delivery) {
        const err: ServiceError = {
          status: 404,
          error: 'DELIVERY_NOT_FOUND',
          message: `Delivery ${deliveryId} does not exist`,
        };
        throw err;
      }

      const currentStatus = delivery.status;

      // Enforce strict allowed state transitions
      // pending -> assigned (only via assignDelivery)
      // assigned -> in_transit
      // in_transit -> delivered
      // pending -> cancelled
      // assigned -> cancelled
      const allowedTransitions: Record<string, string[]> = {
        pending: ['cancelled'], // assigned is handled via assignDelivery
        assigned: ['in_transit', 'cancelled'],
        in_transit: ['delivered'],
        delivered: [],
        cancelled: [],
      };

      if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
        let explanation = `Cannot transition delivery from '${currentStatus}' to '${newStatus}'.`;
        if (currentStatus === 'in_transit' && newStatus === 'cancelled') {
          explanation = `Safety policy: A delivery already in transit cannot be cancelled without returning to yard.`;
        } else if (currentStatus === 'pending' && newStatus === 'delivered') {
          explanation = `A pending delivery must be assigned and in transit before it can be marked delivered.`;
        }

        const err: ServiceError = {
          status: 409,
          error: 'INVALID_TRANSITION',
          message: explanation,
        };
        throw err;
      }

      const now = new Date().toISOString();

      if (newStatus === 'in_transit') {
        this.db.prepare(`UPDATE deliveries SET status = 'in_transit' WHERE delivery_id = ?`).run(deliveryId);
        this.logAudit(actor, 'START_TRIP', 'DELIVERY', deliveryId, `Trip started for delivery ${deliveryId} (in transit)`);
      } else if (newStatus === 'delivered') {
        // Complete delivery & release vehicle and driver
        const activeAssignment = this.db.prepare(`
          SELECT * FROM assignments WHERE delivery_id = ? AND is_active = 1
        `).get(deliveryId) as Assignment | undefined;

        if (activeAssignment) {
          // Deactivate assignment record
          this.db.prepare(`
            UPDATE assignments SET is_active = 0, released_at = ? WHERE assignment_id = ?
          `).run(now, activeAssignment.assignment_id);

          // Release vehicle & driver
          this.db.prepare(`UPDATE vehicles SET status = 'available' WHERE vehicle_id = ?`).run(activeAssignment.vehicle_id);
          this.db.prepare(`UPDATE drivers SET availability_status = 'available' WHERE driver_id = ?`).run(activeAssignment.driver_id);
        }

        this.db.prepare(`UPDATE deliveries SET status = 'delivered' WHERE delivery_id = ?`).run(deliveryId);

        this.logAudit(
          actor,
          'COMPLETE_DELIVERY',
          'DELIVERY',
          deliveryId,
          `Delivery ${deliveryId} completed. Released vehicle ${activeAssignment?.vehicle_id} and driver ${activeAssignment?.driver_id}`
        );
      } else if (newStatus === 'cancelled') {
        // Cancel delivery & release vehicle/driver if it was assigned
        const activeAssignment = this.db.prepare(`
          SELECT * FROM assignments WHERE delivery_id = ? AND is_active = 1
        `).get(deliveryId) as Assignment | undefined;

        if (activeAssignment) {
          this.db.prepare(`
            UPDATE assignments SET is_active = 0, released_at = ? WHERE assignment_id = ?
          `).run(now, activeAssignment.assignment_id);

          this.db.prepare(`UPDATE vehicles SET status = 'available' WHERE vehicle_id = ?`).run(activeAssignment.vehicle_id);
          this.db.prepare(`UPDATE drivers SET availability_status = 'available' WHERE driver_id = ?`).run(activeAssignment.driver_id);
        }

        this.db.prepare(`UPDATE deliveries SET status = 'cancelled' WHERE delivery_id = ?`).run(deliveryId);

        this.logAudit(
          actor,
          'CANCEL_DELIVERY',
          'DELIVERY',
          deliveryId,
          `Delivery ${deliveryId} cancelled. Resources released if assigned.`
        );
      }

      return {
        delivery_id: deliveryId,
        previous_status: currentStatus,
        status: newStatus,
        message: `Delivery ${deliveryId} status updated to ${newStatus}`,
      };
    });

    return executeTransition.immediate();
  }

  // 3. VEHICLE CRUD & STATUS MANAGEMENT
  public createVehicle(data: { vehicle_id?: string; registration_no: string; type: string; capacity: number }, actor: string = 'admin') {
    const regNo = data.registration_no.trim().toUpperCase();
    const existing = this.db.prepare('SELECT vehicle_id FROM vehicles WHERE registration_no = ?').get(regNo);
    if (existing) {
      const err: ServiceError = {
        status: 409,
        error: 'DUPLICATE_REGISTRATION',
        message: `A vehicle with registration '${regNo}' already exists`,
      };
      throw err;
    }

    const vehicleId = data.vehicle_id?.trim() || `V${Math.floor(100 + Math.random() * 900)}`;
    const existingId = this.db.prepare('SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?').get(vehicleId);
    if (existingId) {
      const err: ServiceError = {
        status: 409,
        error: 'DUPLICATE_VEHICLE_ID',
        message: `Vehicle ID '${vehicleId}' is already registered`,
      };
      throw err;
    }

    if (!['Van', 'Truck', 'Mini-truck', 'Bike'].includes(data.type)) {
      const err: ServiceError = {
        status: 400,
        error: 'VALIDATION_ERROR',
        message: `Type must be one of: Van, Truck, Mini-truck, Bike`,
      };
      throw err;
    }

    if (!data.capacity || data.capacity <= 0) {
      const err: ServiceError = {
        status: 400,
        error: 'VALIDATION_ERROR',
        message: `Capacity must be a positive integer in kg`,
      };
      throw err;
    }

    this.db.prepare(`
      INSERT INTO vehicles (vehicle_id, registration_no, type, capacity, status)
      VALUES (?, ?, ?, ?, 'available')
    `).run(vehicleId, regNo, data.type, Number(data.capacity));

    this.logAudit(actor, 'CREATE_VEHICLE', 'VEHICLE', vehicleId, `Added vehicle ${vehicleId} (${regNo}, ${data.type}, ${data.capacity}kg)`);

    return this.getVehicle(vehicleId);
  }

  public updateVehicleStatus(vehicleId: string, newStatus: string, actor: string = 'admin') {
    const execute = this.db.transaction(() => {
      const vehicle = this.db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicleId) as Vehicle | undefined;
      if (!vehicle) {
        const err: ServiceError = {
          status: 404,
          error: 'VEHICLE_NOT_FOUND',
          message: `Vehicle ${vehicleId} does not exist`,
        };
        throw err;
      }

      if (!['available', 'maintenance', 'inactive'].includes(newStatus)) {
        const err: ServiceError = {
          status: 400,
          error: 'VALIDATION_ERROR',
          message: `Cannot manually change vehicle status to '${newStatus}'. Only available, maintenance, or inactive are allowed.`,
        };
        throw err;
      }

      // Check active assignment
      const active = this.db.prepare(`
        SELECT a.assignment_id, a.delivery_id, d.pickup, d.dropoff
        FROM assignments a
        JOIN deliveries d ON a.delivery_id = d.delivery_id
        WHERE a.vehicle_id = ? AND a.is_active = 1
      `).get(vehicleId) as { assignment_id: string; delivery_id: string } | undefined;

      if (active && (newStatus === 'maintenance' || newStatus === 'inactive')) {
        const err: ServiceError = {
          status: 409,
          error: 'ACTIVE_ASSIGNMENT_EXISTS',
          message: `Vehicle ${vehicleId} is currently assigned to active delivery ${active.delivery_id}. Resolve or complete the delivery before changing status.`,
        };
        throw err;
      }

      this.db.prepare('UPDATE vehicles SET status = ? WHERE vehicle_id = ?').run(newStatus, vehicleId);
      this.logAudit(actor, 'UPDATE_VEHICLE_STATUS', 'VEHICLE', vehicleId, `Status changed from ${vehicle.status} to ${newStatus}`);

      return this.getVehicle(vehicleId);
    });

    return execute.immediate();
  }

  public getVehicle(vehicleId: string): Vehicle | undefined {
    return this.db.prepare(`
      SELECT 
        v.*,
        a.delivery_id as current_delivery_id,
        dr.name as current_driver_name
      FROM vehicles v
      LEFT JOIN assignments a ON v.vehicle_id = a.vehicle_id AND a.is_active = 1
      LEFT JOIN drivers dr ON a.driver_id = dr.driver_id
      WHERE v.vehicle_id = ?
    `).get(vehicleId) as Vehicle | undefined;
  }

  public listVehicles(): Vehicle[] {
    return this.db.prepare(`
      SELECT 
        v.*,
        a.delivery_id as current_delivery_id,
        dr.name as current_driver_name
      FROM vehicles v
      LEFT JOIN assignments a ON v.vehicle_id = a.vehicle_id AND a.is_active = 1
      LEFT JOIN drivers dr ON a.driver_id = dr.driver_id
      ORDER BY v.vehicle_id ASC
    `).all() as Vehicle[];
  }

  // 4. DRIVER CRUD & AVAILABILITY MANAGEMENT
  public createDriver(
    data: {
      driver_id: string;
      name: string;
      phone: string;
      license_no?: string;
      license_doc?: string;
      vehicle_ownership?: 'warehouse' | 'own';
      assigned_vehicle_id?: string;
      rc_book_no?: string;
      rc_book_doc?: string;
      vehicle_photo_front?: string;
      vehicle_photo_back?: string;
      vehicle_photo_left?: string;
      vehicle_photo_right?: string;
      vehicle_type?: string;
      vehicle_capacity?: number;
      registration_no?: string;
      username?: string;
      password?: string;
    },
    actor: string = 'admin'
  ) {
    const driverId = data.driver_id.trim().toUpperCase();
    const existing = this.db.prepare('SELECT driver_id FROM drivers WHERE driver_id = ?').get(driverId);
    if (existing) {
      const err: ServiceError = {
        status: 409,
        error: 'DUPLICATE_DRIVER_ID',
        message: `Driver ID '${driverId}' already exists in directory`,
      };
      throw err;
    }

    if (!data.name?.trim()) {
      const err: ServiceError = {
        status: 400,
        error: 'VALIDATION_ERROR',
        message: 'Driver name is required',
      };
      throw err;
    }

    if (!data.phone?.trim() || data.phone.trim().length < 7) {
      const err: ServiceError = {
        status: 400,
        error: 'VALIDATION_ERROR',
        message: 'A valid phone number is required',
      };
      throw err;
    }

    const ownership = data.vehicle_ownership === 'own' ? 'own' : 'warehouse';
    let assignedVehicleId = data.assigned_vehicle_id || null;

    const execute = this.db.transaction(() => {
      // If driver owns vehicle, create a vehicle record in yard fleet if registration details provided
      if (ownership === 'own' && (data.registration_no || data.rc_book_no)) {
        const rawReg = (data.registration_no || data.rc_book_no || '').trim().toUpperCase();
        // Check if vehicle already exists
        const existingVeh = this.db.prepare('SELECT vehicle_id FROM vehicles WHERE registration_no = ?').get(rawReg) as any;
        if (existingVeh) {
          assignedVehicleId = existingVeh.vehicle_id;
        } else {
          // Generate unique vehicle ID
          const newVehId = `V${Math.floor(200 + Math.random() * 790)}`;
          const vType = data.vehicle_type || 'Van';
          const defaultCapacity = vType === 'Bike' ? 40 : vType === 'Truck' ? 5000 : vType === 'Mini-truck' ? 1500 : 1000;
          const vCap = Number(data.vehicle_capacity) || defaultCapacity;

          this.db.prepare(`
            INSERT INTO vehicles (vehicle_id, registration_no, type, capacity, status)
            VALUES (?, ?, ?, ?, 'available')
          `).run(newVehId, rawReg, vType, vCap);

          assignedVehicleId = newVehId;
          this.logAudit(actor, 'CREATE_DRIVER_VEHICLE', 'VEHICLE', newVehId, `Enrolled personal vehicle for driver ${data.name} (${rawReg}, ${vType}, ${vCap}kg)`);
        }
      }

      const now = new Date().toISOString();

      this.db.prepare(`
        INSERT INTO drivers (
          driver_id, name, phone, availability_status,
          license_no, license_doc, vehicle_ownership, assigned_vehicle_id,
          rc_book_no, rc_book_doc,
          vehicle_photo_front, vehicle_photo_back, vehicle_photo_left, vehicle_photo_right,
          vehicle_type, vehicle_capacity, registered_at
        )
        VALUES (?, ?, ?, 'available', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        driverId,
        data.name.trim(),
        data.phone.trim(),
        data.license_no?.trim() || null,
        data.license_doc || null,
        ownership,
        assignedVehicleId,
        data.rc_book_no?.trim() || null,
        data.rc_book_doc || null,
        data.vehicle_photo_front || null,
        data.vehicle_photo_back || null,
        data.vehicle_photo_left || null,
        data.vehicle_photo_right || null,
        data.vehicle_type || (ownership === 'own' ? 'Van' : null),
        data.vehicle_capacity ? Number(data.vehicle_capacity) : null,
        now
      );

      // Create driver user account
      const username = data.username?.trim() || driverId;
      const pass = data.password?.trim() || `Driver@${driverId.replace('D', '')}`;
      const bcrypt = require('bcryptjs');
      const passwordHash = bcrypt.hashSync(pass, 8);

      // Check if username exists
      const existingUser = this.db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username);
      if (!existingUser) {
        this.db.prepare(`
          INSERT INTO users (username, password_hash, role, driver_id)
          VALUES (?, ?, 'driver', ?)
        `).run(username, passwordHash, driverId);
      }

      this.logAudit(actor, 'CREATE_DRIVER', 'DRIVER', driverId, `Enrolled driver ${data.name} (${driverId}, phone: ${data.phone}, vehicle: ${ownership})`);
    });

    execute.immediate();
    return this.getDriver(driverId);
  }

  public updateDriverAvailability(driverId: string, newStatus: string, actor: string = 'admin') {
    const execute = this.db.transaction(() => {
      const driver = this.db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get(driverId) as Driver | undefined;
      if (!driver) {
        const err: ServiceError = {
          status: 404,
          error: 'DRIVER_NOT_FOUND',
          message: `Driver ${driverId} does not exist`,
        };
        throw err;
      }

      if (!['available', 'unavailable'].includes(newStatus)) {
        const err: ServiceError = {
          status: 400,
          error: 'VALIDATION_ERROR',
          message: `Only 'available' or 'unavailable' are allowed for manual driver toggle.`,
        };
        throw err;
      }

      // Check active assignment
      const active = this.db.prepare(`
        SELECT a.assignment_id, a.delivery_id, d.pickup, d.dropoff
        FROM assignments a
        JOIN deliveries d ON a.delivery_id = d.delivery_id
        WHERE a.driver_id = ? AND a.is_active = 1
      `).get(driverId) as { assignment_id: string; delivery_id: string } | undefined;

      if (active && newStatus === 'unavailable') {
        const err: ServiceError = {
          status: 409,
          error: 'ACTIVE_ASSIGNMENT_EXISTS',
          message: `Driver ${driver.name} is currently assigned to active delivery ${active.delivery_id}. You cannot set them unavailable during an active trip.`,
        };
        throw err;
      }

      this.db.prepare('UPDATE drivers SET availability_status = ? WHERE driver_id = ?').run(newStatus, driverId);
      this.logAudit(actor, 'UPDATE_DRIVER_AVAILABILITY', 'DRIVER', driverId, `Availability toggled to ${newStatus}`);

      return this.getDriver(driverId);
    });

    return execute.immediate();
  }

  public getDriver(driverId: string): Driver | undefined {
    return this.db.prepare(`
      SELECT 
        d.*,
        a.delivery_id as current_delivery_id,
        a.vehicle_id as current_vehicle_id,
        u.username
      FROM drivers d
      LEFT JOIN assignments a ON d.driver_id = a.driver_id AND a.is_active = 1
      LEFT JOIN users u ON d.driver_id = u.driver_id
      WHERE d.driver_id = ?
    `).get(driverId) as Driver | undefined;
  }

  public listDrivers(): Driver[] {
    return this.db.prepare(`
      SELECT 
        d.*,
        a.delivery_id as current_delivery_id,
        a.vehicle_id as current_vehicle_id,
        u.username
      FROM drivers d
      LEFT JOIN assignments a ON d.driver_id = a.driver_id AND a.is_active = 1
      LEFT JOIN users u ON d.driver_id = u.driver_id
      ORDER BY d.driver_id ASC
    `).all() as Driver[];
  }

  // 5. DELIVERY CRUD & FILTERING
  public createDelivery(data: { delivery_id?: string; pickup: string; dropoff: string; scheduled_time: string; priority: string }, actor: string = 'admin') {
    if (!data.pickup?.trim()) {
      throw { status: 400, error: 'VALIDATION_ERROR', message: 'Pickup location is required' };
    }
    if (!data.dropoff?.trim()) {
      throw { status: 400, error: 'VALIDATION_ERROR', message: 'Dropoff destination is required' };
    }
    if (!data.scheduled_time?.trim()) {
      throw { status: 400, error: 'VALIDATION_ERROR', message: 'Scheduled time is required' };
    }
    if (!['Low', 'Medium', 'High', 'Urgent'].includes(data.priority)) {
      throw { status: 400, error: 'VALIDATION_ERROR', message: 'Priority must be Low, Medium, High, or Urgent' };
    }

    const deliveryId = data.delivery_id?.trim() || `DL${Math.floor(100 + Math.random() * 900)}`;
    const existing = this.db.prepare('SELECT delivery_id FROM deliveries WHERE delivery_id = ?').get(deliveryId);
    if (existing) {
      throw { status: 409, error: 'DUPLICATE_DELIVERY_ID', message: `Delivery ID '${deliveryId}' already exists` };
    }

    this.db.prepare(`
      INSERT INTO deliveries (delivery_id, pickup, dropoff, scheduled_time, priority, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(deliveryId, data.pickup.trim(), data.dropoff.trim(), data.scheduled_time.trim(), data.priority);

    this.logAudit(actor, 'CREATE_DELIVERY', 'DELIVERY', deliveryId, `Created delivery ${deliveryId} (${data.pickup} -> ${data.dropoff}, priority: ${data.priority})`);

    return this.getDelivery(deliveryId);
  }

  public getDelivery(deliveryId: string): Delivery | undefined {
    return this.db.prepare(`
      SELECT 
        d.*,
        a.vehicle_id as assigned_vehicle_id,
        a.driver_id as assigned_driver_id,
        dr.name as assigned_driver_name
      FROM deliveries d
      LEFT JOIN assignments a ON d.delivery_id = a.delivery_id AND a.is_active = 1
      LEFT JOIN drivers dr ON a.driver_id = dr.driver_id
      WHERE d.delivery_id = ?
    `).get(deliveryId) as Delivery | undefined;
  }

  public listDeliveries(filters?: { status?: string; priority?: string; search?: string }): Delivery[] {
    let sql = `
      SELECT 
        d.*,
        a.vehicle_id as assigned_vehicle_id,
        a.driver_id as assigned_driver_id,
        dr.name as assigned_driver_name
      FROM deliveries d
      LEFT JOIN assignments a ON d.delivery_id = a.delivery_id AND a.is_active = 1
      LEFT JOIN drivers dr ON a.driver_id = dr.driver_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      sql += ` AND d.status = ?`;
      params.push(filters.status);
    }
    if (filters?.priority) {
      sql += ` AND d.priority = ?`;
      params.push(filters.priority);
    }
    if (filters?.search) {
      sql += ` AND (d.delivery_id LIKE ? OR d.pickup LIKE ? OR d.dropoff LIKE ? OR dr.name LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY 
      CASE d.priority 
        WHEN 'Urgent' THEN 1 
        WHEN 'High' THEN 2 
        WHEN 'Medium' THEN 3 
        WHEN 'Low' THEN 4 
      END ASC,
      d.scheduled_time ASC
    `;

    return this.db.prepare(sql).all(...params) as Delivery[];
  }

  // 6. ASSIGNMENTS HISTORY
  public listAssignments(): Assignment[] {
    return this.db.prepare(`
      SELECT 
        a.*,
        d.pickup as delivery_pickup,
        d.dropoff as delivery_dropoff,
        dr.name as driver_name,
        v.registration_no as vehicle_registration
      FROM assignments a
      JOIN deliveries d ON a.delivery_id = d.delivery_id
      JOIN drivers dr ON a.driver_id = dr.driver_id
      JOIN vehicles v ON a.vehicle_id = v.vehicle_id
      ORDER BY a.assigned_at DESC
    `).all() as Assignment[];
  }

  // 7. STATS & METRICS
  public getStats() {
    const totalVehicles = (this.db.prepare('SELECT COUNT(*) as c FROM vehicles').get() as any).c;
    const availableVehicles = (this.db.prepare(`SELECT COUNT(*) as c FROM vehicles WHERE status = 'available'`).get() as any).c;
    const assignedVehicles = (this.db.prepare(`SELECT COUNT(*) as c FROM vehicles WHERE status = 'assigned'`).get() as any).c;
    const maintenanceVehicles = (this.db.prepare(`SELECT COUNT(*) as c FROM vehicles WHERE status = 'maintenance'`).get() as any).c;

    const totalDrivers = (this.db.prepare('SELECT COUNT(*) as c FROM drivers').get() as any).c;
    const availableDrivers = (this.db.prepare(`SELECT COUNT(*) as c FROM drivers WHERE availability_status = 'available'`).get() as any).c;
    const driversOnDuty = (this.db.prepare(`SELECT COUNT(*) as c FROM drivers WHERE availability_status IN ('available', 'assigned')`).get() as any).c;

    const pendingDeliveries = (this.db.prepare(`SELECT COUNT(*) as c FROM deliveries WHERE status = 'pending'`).get() as any).c;
    const activeDeliveries = (this.db.prepare(`SELECT COUNT(*) as c FROM deliveries WHERE status IN ('assigned', 'in_transit')`).get() as any).c;
    const deliveredToday = (this.db.prepare(`SELECT COUNT(*) as c FROM deliveries WHERE status = 'delivered'`).get() as any).c;
    const cancelledDeliveries = (this.db.prepare(`SELECT COUNT(*) as c FROM deliveries WHERE status = 'cancelled'`).get() as any).c;

    // Usable vehicles = total - maintenance - inactive
    const usableVehicles = Math.max(1, totalVehicles - maintenanceVehicles);
    const utilisationPct = Math.round((assignedVehicles / usableVehicles) * 100);

    return {
      totalVehicles,
      availableVehicles,
      assignedVehicles,
      maintenanceVehicles,
      totalDrivers,
      availableDrivers,
      driversOnDuty,
      pendingDeliveries,
      activeDeliveries,
      deliveredToday,
      cancelledDeliveries,
      utilisationPct,
    };
  }

  // 8. AUDIT LOGS
  public getAuditLogs(limit = 100): AuditLog[] {
    return this.db.prepare(`
      SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?
    `).all(limit) as AuditLog[];
  }

  // 9. DRIVER PORTAL DATA
  public getDriverPortalData(driverId: string) {
    const driver = this.getDriver(driverId);
    if (!driver) {
      throw { status: 404, error: 'DRIVER_NOT_FOUND', message: `Driver ${driverId} not found` };
    }

    // Active assignment
    const activeAssignment = this.db.prepare(`
      SELECT 
        a.*,
        d.pickup, d.dropoff, d.scheduled_time, d.priority, d.status as delivery_status,
        v.vehicle_id, v.registration_no, v.type as vehicle_type, v.capacity as vehicle_capacity, v.status as vehicle_status
      FROM assignments a
      JOIN deliveries d ON a.delivery_id = d.delivery_id
      JOIN vehicles v ON a.vehicle_id = v.vehicle_id
      WHERE a.driver_id = ? AND a.is_active = 1
    `).get(driverId) as any;

    // Completed history
    const history = this.db.prepare(`
      SELECT 
        a.assignment_id, a.assigned_at, a.released_at,
        d.delivery_id, d.pickup, d.dropoff, d.status as final_status,
        v.registration_no, v.type as vehicle_type
      FROM assignments a
      JOIN deliveries d ON a.delivery_id = d.delivery_id
      JOIN vehicles v ON a.vehicle_id = v.vehicle_id
      WHERE a.driver_id = ? AND a.is_active = 0
      ORDER BY a.released_at DESC
      LIMIT 20
    `).all(driverId);

    // Fleet board (read-only for drivers)
    const fleetBoard = this.db.prepare(`
      SELECT vehicle_id, registration_no, type, capacity, status
      FROM vehicles
      ORDER BY vehicle_id ASC
    `).all();

    return {
      driver,
      activeJob: activeAssignment ? {
        assignment_id: activeAssignment.assignment_id,
        delivery_id: activeAssignment.delivery_id,
        pickup: activeAssignment.pickup,
        dropoff: activeAssignment.dropoff,
        scheduled_time: activeAssignment.scheduled_time,
        priority: activeAssignment.priority,
        status: activeAssignment.delivery_status,
        vehicle: {
          vehicle_id: activeAssignment.vehicle_id,
          registration_no: activeAssignment.registration_no,
          type: activeAssignment.vehicle_type,
          capacity: activeAssignment.vehicle_capacity,
          status: activeAssignment.vehicle_status,
        }
      } : null,
      history,
      fleetBoard,
    };
  }

  // 10. DISPATCH RECOMMENDATION HELPER
  public recommendAssignment(deliveryId: string) {
    const delivery = this.getDelivery(deliveryId);
    if (!delivery || delivery.status !== 'pending') {
      return null;
    }

    // Find eligible vehicles (status available and not in active assignment)
    const eligibleVehicles = this.db.prepare(`
      SELECT v.* FROM vehicles v
      WHERE v.status = 'available'
      AND v.vehicle_id NOT IN (SELECT vehicle_id FROM assignments WHERE is_active = 1)
      ORDER BY 
        CASE ? 
          WHEN 'Urgent' THEN v.capacity 
          ELSE -v.capacity 
        END ASC
    `).all(delivery.priority) as Vehicle[];

    // Find eligible drivers (status available and not in active assignment)
    const eligibleDrivers = this.db.prepare(`
      SELECT d.* FROM drivers d
      WHERE d.availability_status = 'available'
      AND d.driver_id NOT IN (SELECT driver_id FROM assignments WHERE is_active = 1)
      ORDER BY d.driver_id ASC
    `).all() as Driver[];

    return {
      recommendedVehicle: eligibleVehicles[0] || null,
      recommendedDriver: eligibleDrivers[0] || null,
      availableVehiclesCount: eligibleVehicles.length,
      availableDriversCount: eligibleDrivers.length,
    };
  }
}
