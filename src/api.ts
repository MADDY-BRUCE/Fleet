import { Vehicle, Driver, Delivery, Assignment, AuditLog, User, DashboardStats, TestSuiteSummary } from './types';

const TOKEN_KEY = 'fleetwise_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch (err: any) {
    console.warn(`[FleetWise API] Network connection issue on ${endpoint}:`, err);
    throw {
      status: 0,
      error: 'NETWORK_ERROR',
      message: 'Failed to communicate with dispatch server. Reconnecting...',
    };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      setStoredToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('fleetwise_auth_expired'));
      }
    }
    const errorObj = {
      status: response.status,
      error: data.error || 'SERVER_ERROR',
      message: data.message || `Request failed with status ${response.status}`,
    };
    throw errorObj;
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () => request<any>('/api/me'),

  // Health
  checkHealth: () => request<any>('/health'),

  // Vehicles
  getVehicles: () => request<Vehicle[]>('/api/vehicles'),
  createVehicle: (data: { vehicle_id?: string; registration_no: string; type: string; capacity: number }) =>
    request<Vehicle>('/api/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  updateVehicleStatus: (id: string, status: string) =>
    request<Vehicle>(`/api/vehicles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Drivers
  getDrivers: () => request<Driver[]>('/api/drivers'),
  createDriver: (data: { driver_id: string; name: string; phone: string; password?: string }) =>
    request<Driver>('/api/drivers', { method: 'POST', body: JSON.stringify(data) }),
  updateDriverAvailability: (id: string, availability_status: string) =>
    request<Driver>(`/api/drivers/${id}/availability`, { method: 'PATCH', body: JSON.stringify({ availability_status }) }),

  // Deliveries
  getDeliveries: (filters?: { status?: string; priority?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (filters?.status) query.set('status', filters.status);
    if (filters?.priority) query.set('priority', filters.priority);
    if (filters?.search) query.set('search', filters.search);
    const qs = query.toString();
    return request<Delivery[]>(`/api/deliveries${qs ? `?${qs}` : ''}`);
  },
  createDelivery: (data: { delivery_id?: string; pickup: string; dropoff: string; scheduled_time: string; priority: string }) =>
    request<Delivery>('/api/deliveries', { method: 'POST', body: JSON.stringify(data) }),
  recommendAssignment: (id: string) =>
    request<{ recommendedVehicle: Vehicle | null; recommendedDriver: Driver | null; availableVehiclesCount: number; availableDriversCount: number }>(`/api/deliveries/${id}/recommend`),
  assignDelivery: (deliveryId: string, vehicleId: string, driverId: string) =>
    request<{ assignment_id: string; delivery_id: string; vehicle_id: string; driver_id: string; status: string; message: string }>(
      `/api/deliveries/${deliveryId}/assign`,
      {
        method: 'POST',
        body: JSON.stringify({ vehicle_id: vehicleId, driver_id: driverId }),
      }
    ),
  updateDeliveryStatus: (deliveryId: string, status: string) =>
    request<{ delivery_id: string; previous_status: string; status: string; message: string }>(
      `/api/deliveries/${deliveryId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    ),

  // Assignments
  getAssignments: () => request<Assignment[]>('/api/assignments'),

  // Stats & Audit
  getStats: () => request<DashboardStats>('/api/stats'),
  getAudit: () => request<AuditLog[]>('/api/audit'),

  // Testing & Reset
  runTests: () => request<TestSuiteSummary>('/api/tests/run', { method: 'POST' }),
  resetDemo: () => request<{ message: string }>('/api/reset-demo', { method: 'POST' }),
};
