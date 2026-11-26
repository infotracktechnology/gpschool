import { Router } from 'express';
import { verifyToken, requireRoles } from '../middleware/authMiddleware.js';
import {
  // Categories
  getCategories, getCategoryById, createCategory, updateCategory, deleteCategory,
  // Units
  getUnits, getUnitById, createUnit, updateUnit, deleteUnit,
  // Suppliers
  getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier, getSupplierStockHistory,
  // Items
  getItems, getItemById, createItem, updateItem, deleteItem, getItemStockHistory,
  // Branch stock
  getBranchStock, getBranchStockSummary,
  // Purchase Orders
  getPOs, getPOById, createPO, updatePO, updatePOStatus, deletePO, sendPO, cancelPO,
  // Goods Receipt
  getGRNs, getGRNById, createGRN, inspectGRN,
  // Stock Movements
  getMovements, getMovementById, createStockIn, createStockOut, createAdjustment, createBranchTransfer,
  // Allocations
  getAllocations, getAllocationById, createAllocation, returnAllocation, deleteAllocation,
  // Damaged Items
  getDamaged, getDamagedById, reportDamage, inspectDamage,
  // Dashboard & Reports
  getInventoryDashboard, getStockReport, getMovementReport, getSupplierReport, getAllocationReport, getDamageReport,
  // Audit Trail
  getAuditTrail,
} from '../controllers/inventoryController.js';

const router = Router();

const INVENTORY_ROLES = ['super_admin', 'admin', 'principal', 'staff'];
const INVENTORY_WRITE_ROLES = ['super_admin', 'admin', 'principal'];

router.use(verifyToken, requireRoles(...INVENTORY_ROLES));

// ============ Categories ============
router.get('/categories', getCategories);
router.get('/categories/:id', getCategoryById);
router.post('/categories', requireRoles(...INVENTORY_WRITE_ROLES), createCategory);
router.put('/categories/:id', requireRoles(...INVENTORY_WRITE_ROLES), updateCategory);
router.delete('/categories/:id', requireRoles(...INVENTORY_WRITE_ROLES), deleteCategory);

// ============ Units ============
router.get('/units', getUnits);
router.get('/units/:id', getUnitById);
router.post('/units', requireRoles(...INVENTORY_WRITE_ROLES), createUnit);
router.put('/units/:id', requireRoles(...INVENTORY_WRITE_ROLES), updateUnit);
router.delete('/units/:id', requireRoles(...INVENTORY_WRITE_ROLES), deleteUnit);

// ============ Suppliers ============
router.get('/suppliers', getSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.get('/suppliers/:id/stock-history', getSupplierStockHistory);
router.post('/suppliers', requireRoles(...INVENTORY_WRITE_ROLES), createSupplier);
router.put('/suppliers/:id', requireRoles(...INVENTORY_WRITE_ROLES), updateSupplier);
router.delete('/suppliers/:id', requireRoles(...INVENTORY_WRITE_ROLES), deleteSupplier);

// ============ Items ============
router.get('/items', getItems);
router.get('/items/:id', getItemById);
router.get('/items/:id/stock-history', getItemStockHistory);
router.post('/items', requireRoles(...INVENTORY_WRITE_ROLES), createItem);
router.put('/items/:id', requireRoles(...INVENTORY_WRITE_ROLES), updateItem);
router.delete('/items/:id', requireRoles(...INVENTORY_WRITE_ROLES), deleteItem);

// ============ Branch Stock ============
router.get('/stock', getBranchStock);
router.get('/stock/summary', getBranchStockSummary);

// ============ Purchase Orders ============
router.get('/purchase-orders', getPOs);
router.get('/purchase-orders/:id', getPOById);
router.post('/purchase-orders', requireRoles(...INVENTORY_WRITE_ROLES), createPO);
router.put('/purchase-orders/:id', requireRoles(...INVENTORY_WRITE_ROLES), updatePO);
router.patch('/purchase-orders/:id/status', requireRoles(...INVENTORY_WRITE_ROLES), updatePOStatus);
router.post('/purchase-orders/:id/send', requireRoles(...INVENTORY_WRITE_ROLES), sendPO);
router.post('/purchase-orders/:id/cancel', requireRoles(...INVENTORY_WRITE_ROLES), cancelPO);
router.delete('/purchase-orders/:id', requireRoles(...INVENTORY_WRITE_ROLES), deletePO);

// ============ Goods Receipt ============
router.get('/goods-receipt', getGRNs);
router.get('/goods-receipt/:id', getGRNById);
router.post('/goods-receipt', requireRoles(...INVENTORY_WRITE_ROLES), createGRN);
router.post('/goods-receipt/:id/inspect', requireRoles(...INVENTORY_WRITE_ROLES), inspectGRN);

// ============ Stock Movements ============
router.get('/movements', getMovements);
router.get('/movements/:id', getMovementById);
router.post('/movements/in', requireRoles(...INVENTORY_WRITE_ROLES), createStockIn);
router.post('/movements/out', requireRoles(...INVENTORY_WRITE_ROLES), createStockOut);
router.post('/movements/adjust', requireRoles(...INVENTORY_WRITE_ROLES), createAdjustment);
router.post('/movements/transfer', requireRoles(...INVENTORY_WRITE_ROLES), createBranchTransfer);

// ============ Allocations ============
router.get('/allocations', getAllocations);
router.get('/allocations/:id', getAllocationById);
router.post('/allocations', requireRoles(...INVENTORY_WRITE_ROLES), createAllocation);
router.post('/allocations/:id/return', requireRoles(...INVENTORY_WRITE_ROLES), returnAllocation);
router.delete('/allocations/:id', requireRoles(...INVENTORY_WRITE_ROLES), deleteAllocation);

// ============ Damaged Items ============
router.get('/damaged', getDamaged);
router.get('/damaged/:id', getDamagedById);
router.post('/damaged', requireRoles(...INVENTORY_WRITE_ROLES), reportDamage);
router.post('/damaged/:id/inspect', requireRoles(...INVENTORY_WRITE_ROLES), inspectDamage);

// ============ Dashboard & Reports ============
router.get('/dashboard', getInventoryDashboard);
router.get('/reports/stock', getStockReport);
router.get('/reports/movement', getMovementReport);
router.get('/reports/supplier', getSupplierReport);
router.get('/reports/allocation', getAllocationReport);
router.get('/reports/damage', getDamageReport);

// ============ Audit Trail ============
router.get('/audit-trail', getAuditTrail);

export default router;
