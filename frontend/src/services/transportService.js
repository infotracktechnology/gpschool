import { api } from '../api/client';

const query = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const value = search.toString();
  return value ? `?${value}` : '';
};

const resource = (name) => ({
  list: (params) => api.get(`/transport/${name}${query(params)}`),
  get: (id) => api.get(`/transport/${name}/${id}`),
  create: (data) => api.post(`/transport/${name}`, data),
  update: (id, data) => api.put(`/transport/${name}/${id}`, data),
  remove: (id) => api.delete(`/transport/${name}/${id}`),
});

export const transportService = {
  getDashboard: (params) => api.get(`/transport/dashboard${query(params)}`),
  getSettings: (params) => api.get(`/transport/settings${query(params)}`),
  saveSettings: (data) => api.put('/transport/settings', data),
  getStudentTransport: () => api.get('/transport/student/me'),
  getReports: async (params) => {
    const suffix = query(params);
    const [fees, allocations, trips, expiries] = await Promise.all([
      api.get(`/transport/reports/fees${suffix}`),
      api.get(`/transport/reports/allocations${suffix}`),
      api.get(`/transport/reports/trips${suffix}`),
      api.get(`/transport/reports/expiries${suffix}`),
    ]);
    return {
      route_utilization: allocations.rows || [],
      fee_summary: fees.rows || [],
      vehicle_compliance: expiries.rows || [],
      trip_summary: trips.rows || [],
    };
  },
  getNotifications: (params) => api.get(`/transport/notifications${query(params)}`),
  sendNotification: (data) => api.post('/transport/notifications', data),
  getVehicleTypes: (params) => resource('vehicle-types').list(params),
  createVehicleType: (data) => resource('vehicle-types').create(data),
  updateVehicleType: (id, data) => resource('vehicle-types').update(id, data),
  deleteVehicleType: (id) => resource('vehicle-types').remove(id),
  getVehicles: (params) => resource('vehicles').list(params),
  createVehicle: (data) => resource('vehicles').create(data),
  updateVehicle: (id, data) => resource('vehicles').update(id, data),
  deleteVehicle: (id) => resource('vehicles').remove(id),
  getPersonnel: async (params) => {
    const [drivers, attendants] = await Promise.all([
      api.get(`/transport/drivers${query(params)}`),
      api.get(`/transport/attendants${query(params)}`),
    ]);
    return [
      ...(drivers.drivers || []).map((row) => ({ ...row, full_name: row.name, role: 'driver', licence: row.license_number })),
      ...(attendants.attendants || []).map((row) => ({ ...row, full_name: row.name, role: 'attendant', licence: row.license_number })),
    ];
  },
  createPersonnel: (data) => data.role === 'attendant'
    ? api.post('/transport/attendants', { name: data.full_name, phone: data.phone, status: data.status })
    : api.post('/transport/drivers', { name: data.full_name, phone: data.phone, license_number: data.license_number, license_expiry: data.license_expiry, status: data.status }),
  updatePersonnel: (id, data) => data.role === 'attendant'
    ? api.put(`/transport/attendants/${id}`, { name: data.full_name, phone: data.phone, status: data.status })
    : api.put(`/transport/drivers/${id}`, { name: data.full_name, phone: data.phone, license_number: data.license_number, license_expiry: data.license_expiry, status: data.status }),
  deletePersonnel: (id) => api.delete(`/transport/drivers/${id}`),
  getRoutes: (params) => resource('routes').list(params),
  createRoute: (data) => resource('routes').create(data),
  updateRoute: (id, data) => resource('routes').update(id, data),
  deleteRoute: (id) => resource('routes').remove(id),
  getAllocations: (params) => resource('allocations').list(params),
  createAllocation: (data) => resource('allocations').create(data),
  updateAllocation: (id, data) => resource('allocations').update(id, data),
  deleteAllocation: (id) => resource('allocations').remove(id),
  getFees: (params) => api.get(`/transport/collections${query(params)}`),
  createFee: (data) => resource('fees').create(data),
  collectFee: (data) => api.post('/transport/collections', data),
  getTrips: (params) => resource('trips').list(params),
  createTrip: (data) => resource('trips').create(data),
  updateTrip: (id, data) => resource('trips').update(id, data),
  getDocuments: (params) => resource('documents').list(params),
  createDocument: (data) => resource('documents').create(data),
  updateDocument: (id, data) => resource('documents').update(id, data),
  deleteDocument: (id) => resource('documents').remove(id),
  getMaintenance: (params) => resource('maintenance').list(params),
  createMaintenance: (data) => resource('maintenance').create(data),
  updateMaintenance: (id, data) => resource('maintenance').update(id, data),
  deleteMaintenance: (id) => resource('maintenance').remove(id),
};
