import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, resetDatabase } from './db';
import { AssignmentService, ServiceError } from './assignment-service';
import { authenticate, requireAdmin, createToken, AuthenticatedRequest } from './auth';
import { runAllTests } from './test-suite';

export function createApiRouter(): express.Router {
  const router = express.Router();
  const db = getDb();
  const service = new AssignmentService(db);

  // Health endpoint
  router.get('/health', (req: Request, res: Response) => {
    try {
      const ping = db.prepare('SELECT 1 as alive').get() as { alive: number };
      res.status(200).json({
        status: 'ok',
        service: 'FleetWise Dispatch Engine',
        yard: 'Kovai Central Dispatch Yard',
        db: ping.alive === 1 ? 'connected' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        version: '1.0.0-hackathon-raale13',
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Auth: Login
  router.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Username and password are required',
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) as any;
    if (!user) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      });
    }

    const token = createToken({
      id: user.id,
      username: user.username,
      role: user.role,
      driver_id: user.driver_id,
    });

    service.logAudit(user.username, 'LOGIN', 'USER', user.username, `Successful login as ${user.role}`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        driver_id: user.driver_id,
      },
    });
  });

  // Driver/Admin: Me
  router.get('/api/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'driver' && user.driver_id) {
      try {
        const portalData = service.getDriverPortalData(user.driver_id);
        return res.json({
          user,
          ...portalData,
        });
      } catch (err: any) {
        return res.status(err.status || 500).json(err);
      }
    }

    res.json({ user });
  });

  // Vehicles: List
  router.get('/api/vehicles', authenticate, (req: Request, res: Response) => {
    const vehicles = service.listVehicles();
    res.json(vehicles);
  });

  // Vehicles: Create
  router.post('/api/vehicles', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const vehicle = service.createVehicle(req.body, req.user?.username);
      res.status(201).json(vehicle);
    } catch (err: any) {
      res.status(err.status || 400).json({
        error: err.error || 'ERROR',
        message: err.message || 'Failed to create vehicle',
      });
    }
  });

  // Vehicles: Update status (maintenance, inactive, available)
  router.patch('/api/vehicles/:id/status', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const vehicleId = req.params.id;
      const { status } = req.body;
      const updated = service.updateVehicleStatus(vehicleId, status, req.user?.username);
      res.json(updated);
    } catch (err: any) {
      res.status(err.status || 400).json({
        error: err.error || 'ERROR',
        message: err.message || 'Failed to update vehicle status',
      });
    }
  });

  // Drivers: List
  router.get('/api/drivers', authenticate, (req: Request, res: Response) => {
    const drivers = service.listDrivers();
    res.json(drivers);
  });

  // Drivers: Create
  router.post('/api/drivers', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const driver = service.createDriver(req.body, req.user?.username);
      res.status(201).json(driver);
    } catch (err: any) {
      res.status(err.status || 400).json({
        error: err.error || 'ERROR',
        message: err.message || 'Failed to create driver',
      });
    }
  });

  // Drivers: Update availability
  router.patch('/api/drivers/:id/availability', authenticate, (req: AuthenticatedRequest, res: Response) => {
    try {
      const driverId = req.params.id;
      const { availability_status } = req.body;

      // Allow if admin or if logged in as this driver
      if (req.user?.role !== 'admin' && req.user?.driver_id !== driverId) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Drivers may only update their own duty availability',
        });
      }

      const updated = service.updateDriverAvailability(driverId, availability_status, req.user?.username);
      res.json(updated);
    } catch (err: any) {
      res.status(err.status || 400).json({
        error: err.error || 'ERROR',
        message: err.message || 'Failed to update driver availability',
      });
    }
  });

  // Deliveries: List (with filters)
  router.get('/api/deliveries', authenticate, (req: Request, res: Response) => {
    const { status, priority, search } = req.query as { status?: string; priority?: string; search?: string };
    const deliveries = service.listDeliveries({ status, priority, search });
    res.json(deliveries);
  });

  // Deliveries: Create
  router.post('/api/deliveries', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const delivery = service.createDelivery(req.body, req.user?.username);
      res.status(201).json(delivery);
    } catch (err: any) {
      res.status(err.status || 400).json({
        error: err.error || 'ERROR',
        message: err.message || 'Failed to create delivery',
      });
    }
  });

  // Deliveries: Recommend Match
  router.get('/api/deliveries/:id/recommend', authenticate, (req: Request, res: Response) => {
    const deliveryId = req.params.id;
    const recommendation = service.recommendAssignment(deliveryId);
    if (!recommendation) {
      return res.status(404).json({
        error: 'DELIVERY_NOT_FOUND',
        message: `Delivery ${deliveryId} is not pending or not found`,
      });
    }
    res.json(recommendation);
  });

  // Deliveries: Assign (Atomic Transaction)
  router.post('/api/deliveries/:id/assign', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const deliveryId = req.params.id;
    const { vehicle_id, driver_id } = req.body;

    if (!vehicle_id || !driver_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Both vehicle_id and driver_id are required for assignment',
      });
    }

    try {
      const result = service.assignDelivery(deliveryId, vehicle_id, driver_id, req.user?.username);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(err.status || 409).json({
        error: err.error || 'ASSIGNMENT_FAILED',
        message: err.message || 'Assignment failed',
      });
    }
  });

  // Deliveries: Update status (Transitions: assigned -> in_transit -> delivered, or -> cancelled)
  router.patch('/api/deliveries/:id/status', authenticate, (req: AuthenticatedRequest, res: Response) => {
    const deliveryId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Status is required',
      });
    }

    // Role verification for drivers
    if (req.user?.role === 'driver') {
      const delivery = service.getDelivery(deliveryId);
      if (!delivery || delivery.assigned_driver_id !== req.user.driver_id) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Drivers can only update status for their own assigned trip',
        });
      }
    }

    try {
      const result = service.updateDeliveryStatus(deliveryId, status, req.user?.username);
      res.json(result);
    } catch (err: any) {
      res.status(err.status || 409).json({
        error: err.error || 'INVALID_TRANSITION',
        message: err.message || 'Status update failed',
      });
    }
  });

  // Assignments History
  router.get('/api/assignments', authenticate, requireAdmin, (req: Request, res: Response) => {
    const assignments = service.listAssignments();
    res.json(assignments);
  });

  // Dashboard Stats
  router.get('/api/stats', authenticate, (req: Request, res: Response) => {
    const stats = service.getStats();
    res.json(stats);
  });

  // Audit Logs
  router.get('/api/audit', authenticate, requireAdmin, (req: Request, res: Response) => {
    const logs = service.getAuditLogs(150);
    res.json(logs);
  });

  // Reset Demo Data
  router.post('/api/reset-demo', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      resetDatabase(db);
      res.json({ message: 'Demo database reset to factory state successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'RESET_FAILED', message: err.message });
    }
  });

  // Run Rule Tests T1 - T14
  router.post('/api/tests/run', authenticate, (req: Request, res: Response) => {
    try {
      const results = runAllTests();
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: 'TEST_RUN_ERROR', message: err.message });
    }
  });

  return router;
}
