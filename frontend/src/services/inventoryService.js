import { api } from '../api/client';

export const inventoryService = {
  // Dashboard & reports
  getDashboard: (branch_id) => api.get(`/inventory/dashboard${branch_id ? `?branch_id=${branch_id}` : ''}`),
  getStockReport: (params = {}) => api.get(`/inventory/reports/stock?${new URLSearchParams(params)}`),
  getMovementReport: (params = {}) => api.get(`/inventory/reports/movement?${new URLSearchParams(params)}`),
  getSupplierReport: () => api.get('/inventory/reports/supplier'),
  getAllocationReport: () => api.get('/inventory/reports/allocation'),
  getDamageReport: (params = {}) => api.get(`/inventory/reports/damage?${new URLSearchParams(params)}`),
  getAuditTrail: (params = {}) => api.get(`/inventory/audit-trail?${new URLSearchParams(params)}`),

  // Categories
  getCategories: () => api.get('/inventory/categories'),
  createCategory: (data) => api.post('/inventory/categories', data),
  updateCategory: (id, data) => api.put(`/inventory/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/inventory/categories/${id}`),

  // Units
  getUnits: () => api.get('/inventory/units'),
  createUnit: (data) => api.post('/inventory/units', data),
  updateUnit: (id, data) => api.put(`/inventory/units/${id}`, data),
  deleteUnit: (id) => api.delete(`/inventory/units/${id}`),

  // Suppliers
  getSuppliers: (params = {}) => api.get(`/inventory/suppliers?${new URLSearchParams(params)}`),
  getSupplier: (id) => api.get(`/inventory/suppliers/${id}`),
  createSupplier: (data) => api.post('/inventory/suppliers', data),
  updateSupplier: (id, data) => api.put(`/inventory/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/inventory/suppliers/${id}`),

  // Items
  getItems: (params = {}) => api.get(`/inventory/items?${new URLSearchParams(params)}`),
  getItem: (id) => api.get(`/inventory/items/${id}`),
  createItem: (data) => api.post('/inventory/items', data),
  updateItem: (id, data) => api.put(`/inventory/items/${id}`, data),
  deleteItem: (id) => api.delete(`/inventory/items/${id}`),

  // Stock
  getStock: (params = {}) => api.get(`/inventory/stock?${new URLSearchParams(params)}`),
  getStockSummary: () => api.get('/inventory/stock/summary'),
  getMovements: (params = {}) => api.get(`/inventory/movements?${new URLSearchParams(params)}`),
  stockIn: (data) => api.post('/inventory/movements/in', data),
  stockOut: (data) => api.post('/inventory/movements/out', data),
  adjustStock: (data) => api.post('/inventory/movements/adjust', data),
  transferStock: (data) => api.post('/inventory/movements/transfer', data),

  // Purchase Orders
  getPOs: (params = {}) => api.get(`/inventory/purchase-orders?${new URLSearchParams(params)}`),
  getPO: (id) => api.get(`/inventory/purchase-orders/${id}`),
  createPO: (data) => api.post('/inventory/purchase-orders', data),
  updatePO: (id, data) => api.put(`/inventory/purchase-orders/${id}`, data),
  updatePOStatus: (id, status) => api.patch(`/inventory/purchase-orders/${id}/status`, { status }),
  sendPO: (id) => api.post(`/inventory/purchase-orders/${id}/send`),
  cancelPO: (id) => api.post(`/inventory/purchase-orders/${id}/cancel`),
  deletePO: (id) => api.delete(`/inventory/purchase-orders/${id}`),

  // Goods Receipt
  getGRNs: (params = {}) => api.get(`/inventory/goods-receipt?${new URLSearchParams(params)}`),
  getGRN: (id) => api.get(`/inventory/goods-receipt/${id}`),
  createGRN: (data) => api.post('/inventory/goods-receipt', data),
  inspectGRN: (id, data) => api.post(`/inventory/goods-receipt/${id}/inspect`, data),

  // Allocations
  getAllocations: (params = {}) => api.get(`/inventory/allocations?${new URLSearchParams(params)}`),
  getAllocation: (id) => api.get(`/inventory/allocations/${id}`),
  createAllocation: (data) => api.post('/inventory/allocations', data),
  returnAllocation: (id) => api.post(`/inventory/allocations/${id}/return`),
  deleteAllocation: (id) => api.delete(`/inventory/allocations/${id}`),

  // Damaged
  getDamaged: (params = {}) => api.get(`/inventory/damaged?${new URLSearchParams(params)}`),
  getDamagedItem: (id) => api.get(`/inventory/damaged/${id}`),
  reportDamage: (data) => api.post('/inventory/damaged', data),
  inspectDamage: (id, data) => api.post(`/inventory/damaged/${id}/inspect`, data),
};
