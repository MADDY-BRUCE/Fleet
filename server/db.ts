import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

export interface Vehicle {
  vehicle_id: string;
  registration_no: string;
  type: 'Van' | 'Truck' | 'Mini-truck' | 'Bike';
  capacity: number;
  status: 'available' | 'assigned' | 'maintenance' | 'inactive';
  current_delivery_id?: string | null;
  current_driver_name?: string | null;
}

export interface Driver {
  driver_id: string;
  name: string;
  phone: string;
  availability_status: 'available' | 'assigned' | 'unavailable';
  current_delivery_id?: string | null;
  current_vehicle_id?: string | null;
  license_no?: string | null;
  license_doc?: string | null;
  vehicle_ownership?: 'warehouse' | 'own' | null;
  assigned_vehicle_id?: string | null;
  rc_book_no?: string | null;
  rc_book_doc?: string | null;
  vehicle_photo_front?: string | null;
  vehicle_photo_back?: string | null;
  vehicle_photo_left?: string | null;
  vehicle_photo_right?: string | null;
  vehicle_type?: string | null;
  vehicle_capacity?: number | null;
  registered_at?: string | null;
  username?: string | null;
}

export interface Delivery {
  delivery_id: string;
  pickup: string;
  dropoff: string;
  scheduled_time: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  assigned_vehicle_id?: string | null;
  assigned_driver_id?: string | null;
  assigned_driver_name?: string | null;
}

export interface Assignment {
  assignment_id: string;
  delivery_id: string;
  vehicle_id: string;
  driver_id: string;
  assigned_at: string;
  released_at: string | null;
  is_active: number;
  delivery_pickup?: string;
  delivery_dropoff?: string;
  driver_name?: string;
  vehicle_registration?: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'driver';
  driver_id: string | null;
}

export function initDatabase(dbPath?: string): Database.Database {
  const finalPath = dbPath || path.resolve(process.cwd(), 'fleetwise.db');
  const db = new Database(finalPath);
  
  // Pragmas for performance and safety
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      vehicle_id TEXT PRIMARY KEY,
      registration_no TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Van', 'Truck', 'Mini-truck', 'Bike')),
      capacity INTEGER NOT NULL CHECK(capacity > 0),
      status TEXT NOT NULL CHECK(status IN ('available', 'assigned', 'maintenance', 'inactive'))
    );

    CREATE TABLE IF NOT EXISTS drivers (
      driver_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      availability_status TEXT NOT NULL CHECK(availability_status IN ('available', 'assigned', 'unavailable')),
      license_no TEXT,
      license_doc TEXT,
      vehicle_ownership TEXT DEFAULT 'warehouse',
      assigned_vehicle_id TEXT,
      rc_book_no TEXT,
      rc_book_doc TEXT,
      vehicle_photo_front TEXT,
      vehicle_photo_back TEXT,
      vehicle_photo_left TEXT,
      vehicle_photo_right TEXT,
      vehicle_type TEXT,
      vehicle_capacity INTEGER,
      registered_at TEXT
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      delivery_id TEXT PRIMARY KEY,
      pickup TEXT NOT NULL,
      dropoff TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('Low', 'Medium', 'High', 'Urgent')),
      status TEXT NOT NULL CHECK(status IN ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled'))
    );

    CREATE TABLE IF NOT EXISTS assignments (
      assignment_id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL REFERENCES deliveries(delivery_id),
      vehicle_id TEXT NOT NULL REFERENCES vehicles(vehicle_id),
      driver_id TEXT NOT NULL REFERENCES drivers(driver_id),
      assigned_at TEXT NOT NULL,
      released_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
    );

    -- Partial UNIQUE Indexes: Enforce at database engine level that no vehicle, driver or delivery can have >1 active assignment!
    CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_active_vehicle ON assignments(vehicle_id) WHERE is_active = 1;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_active_driver ON assignments(driver_id) WHERE is_active = 1;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_active_delivery ON assignments(delivery_id) WHERE is_active = 1;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'driver')),
      driver_id TEXT REFERENCES drivers(driver_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT
    );
  `);

  // Migrate existing databases safely
  const driverCols = [
    'license_no TEXT',
    'license_doc TEXT',
    'vehicle_ownership TEXT DEFAULT "warehouse"',
    'assigned_vehicle_id TEXT',
    'rc_book_no TEXT',
    'rc_book_doc TEXT',
    'vehicle_photo_front TEXT',
    'vehicle_photo_back TEXT',
    'vehicle_photo_left TEXT',
    'vehicle_photo_right TEXT',
    'vehicle_type TEXT',
    'vehicle_capacity INTEGER',
    'registered_at TEXT'
  ];
  for (const col of driverCols) {
    try {
      db.exec(`ALTER TABLE drivers ADD COLUMN ${col}`);
    } catch {}
  }

  return db;
}

export function seedDatabase(db: Database.Database): void {
  const countVehicles = (db.prepare('SELECT COUNT(*) as count FROM vehicles').get() as { count: number }).count;
  if (countVehicles > 0) {
    return; // Already seeded
  }

  resetDatabase(db);
}

export function resetDatabase(db: Database.Database): void {
  const runInTransaction = db.transaction(() => {
    // Clear in proper order respecting foreign keys
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM assignments;
      DELETE FROM users;
      DELETE FROM deliveries;
      DELETE FROM drivers;
      DELETE FROM vehicles;
    `);

    // 1. Vehicles (8)
    const insertVehicle = db.prepare(`
      INSERT INTO vehicles (vehicle_id, registration_no, type, capacity, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const vehicles = [
      ['V101', 'TN38AB1234', 'Van', 1000, 'available'],
      ['V102', 'TN37CD5678', 'Truck', 5000, 'available'],
      ['V103', 'TN66EF9012', 'Mini-truck', 1500, 'available'],
      ['V104', 'TN38GH3456', 'Van', 900, 'maintenance'],
      ['V105', 'TN39JK7890', 'Truck', 7500, 'available'],
      ['V106', 'TN43LM2345', 'Bike', 40, 'available'],
      ['V107', 'TN38NP6789', 'Van', 1100, 'inactive'],
      ['V108', 'TN37QR0123', 'Mini-truck', 1800, 'available'],
    ];
    for (const v of vehicles) {
      insertVehicle.run(v[0], v[1], v[2], v[3], v[4]);
    }

    // 2. Drivers (6)
    const insertDriver = db.prepare(`
      INSERT INTO drivers (driver_id, name, phone, availability_status)
      VALUES (?, ?, ?, ?)
    `);

    const drivers = [
      ['D101', 'Arun', '9876543210', 'available'],
      ['D102', 'Meena', '9876543211', 'available'],
      ['D103', 'Karthik', '9876543212', 'available'],
      ['D104', 'Priya', '9876543213', 'unavailable'],
      ['D105', 'Suresh', '9876543214', 'available'],
      ['D106', 'Divya', '9876543215', 'available'],
    ];
    for (const d of drivers) {
      insertDriver.run(d[0], d[1], d[2], d[3]);
    }

    // 3. Deliveries (7)
    const insertDelivery = db.prepare(`
      INSERT INTO deliveries (delivery_id, pickup, dropoff, scheduled_time, priority, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const deliveries = [
      ['DL101', 'Coimbatore', 'Chennai', '10:00 AM', 'High', 'pending'],
      ['DL102', 'Tiruppur', 'Salem', '11:30 AM', 'Medium', 'pending'],
      ['DL103', 'Coimbatore', 'Madurai', '02:00 PM', 'Urgent', 'pending'],
      ['DL104', 'Erode', 'Bengaluru', '04:00 PM', 'Low', 'pending'],
      ['DL105', 'Pollachi', 'Kochi', '09:00 AM', 'High', 'pending'],
      ['DL106', 'Coimbatore', 'Trichy', '01:00 PM', 'Medium', 'pending'],
      ['DL107', 'Avinashi', 'Ooty', '03:30 PM', 'Low', 'pending'],
    ];
    for (const dl of deliveries) {
      insertDelivery.run(dl[0], dl[1], dl[2], dl[3], dl[4], dl[5]);
    }

    // 4. Users (Admin + Drivers)
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, driver_id)
      VALUES (?, ?, ?, ?)
    `);

    // Salt rounds: 8 for fast seeding and instant startup
    const adminHash = bcrypt.hashSync('Admin@123', 8);
    insertUser.run('admin', adminHash, 'admin', null);

    for (const d of drivers) {
      const driverId = d[0] as string;
      const pass = `Driver@${driverId.replace('D', '')}`;
      const driverHash = bcrypt.hashSync(pass, 8);
      insertUser.run(driverId, driverHash, 'driver', driverId);
    }

    // 5. Initial Audit Log
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (timestamp, actor, action, entity, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run(
      new Date().toISOString(),
      'SYSTEM',
      'SYSTEM_INITIALIZED',
      'SYSTEM',
      'SYS-001',
      'Kovai Central Dispatch Yard seed data initialized (8 vehicles, 6 drivers, 7 deliveries)'
    );
  });

  runInTransaction();
}

// Global default db instance
let defaultDb: Database.Database | null = null;
export function getDb(): Database.Database {
  if (!defaultDb) {
    defaultDb = initDatabase();
    seedDatabase(defaultDb);
  }
  return defaultDb;
}
