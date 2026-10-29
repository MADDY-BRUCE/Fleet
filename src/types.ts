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

export interface CreateDriverPayload {
  driver_id: string;
  name: string;
  phone: string;
  license_no?: string;
  license_doc?: string;
  vehicle_ownership: 'warehouse' | 'own';
  assigned_vehicle_id?: string;
  rc_book_no?: string;
  rc_book_doc?: string;
  vehicle_photo_front?: string;
  vehicle_photo_back?: string;
  vehicle_photo_left?: string;
  vehicle_photo_right?: string;
  vehicle_type?: 'Bike' | 'Van' | 'Mini-truck' | 'Truck';
  vehicle_capacity?: number;
  registration_no?: string;
  username?: string;
  password?: string;
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
  role: 'admin' | 'driver';
  driver_id: string | null;
}

export interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  assignedVehicles: number;
  maintenanceVehicles: number;
  totalDrivers: number;
  availableDrivers: number;
  driversOnDuty: number;
  pendingDeliveries: number;
  activeDeliveries: number;
  deliveredToday: number;
  cancelledDeliveries: number;
  utilisationPct: number;
}

export interface TestResult {
  id: string;
  name: string;
  category: string;
  input: string;
  expected: string;
  observed: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  details?: string;
}

export interface TestSuiteSummary {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  totalDurationMs: number;
  tests: TestResult[];
}
