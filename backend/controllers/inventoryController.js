import { pool, query } from '../config/database.js';

/**
 * Generate sequential daily document code: PREFIX-YYYYMMDD-XXXX
 */
const generateDailyCode = async (prefixName, table, column) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `${prefixName}-${dateStr}-`;

  const [latest] = await pool.query(
    `SELECT \`${column}\` AS code FROM \`${table}\`
     WHERE \`${column}\` LIKE ?
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (latest && latest.length > 0 && latest[0].code) {
    const parts = latest[0].code.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

const generateItemCode = async () => {
  const [latest] = await pool.query(
    `SELECT item_code FROM inventory_items WHERE item_code IS NOT NULL ORDER BY id DESC LIMIT 1`
  );
  let seq = 1;
  if (latest.length > 0 && latest[0].item_code) {
    const m = latest[0].item_code.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `ITM-${String(seq).padStart(5, '0')}`;
};

const generateSupplierCode = async () => {
  const [latest] = await pool.query(
    `SELECT supplier_code FROM inventory_suppliers WHERE supplier_code IS NOT NULL ORDER BY id DESC LIMIT 1`
  );
  let seq = 1;
  if (latest.length > 0 && latest[0].supplier_code) {
    const m = latest[0].supplier_code.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `SUP-${String(seq).padStart(4, '0')}`;
};

const auditLog = async (entityType, entityId, action, oldValues, newValues, userId, req) => {
  try {
    await query(
      `INSERT INTO inventory_audit_trail (entity_type, entity_id, action, old_values, new_values, changed_by, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        action,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        userId || null,
        req?.ip || null,
      ]
    );
  } catch (e) {
    console.error('[Audit] Failed to log:', e.message);
  }
};

/** Recompute available_qty = quantity - reserved_qty for a stock row */
const refreshAvailable = async (itemId, branchId, conn = pool) => {
  await conn.query(
    `UPDATE inventory_branch_stock SET available_qty = quantity - reserved_qty WHERE item_id = ? AND branch_id = ?`,
    [itemId, branchId]
  );
};

const adjustStock = async ({ itemId, branchId, delta, movementType, referenceType = null, referenceId = null, batchNo = null, expiryDate = null, reason = null, notes = null, userId = null }, conn = pool) => {
  // Upsert stock row — quantity is updated first, so available uses the NEW quantity
  await conn.query(
    `INSERT INTO inventory_branch_stock (item_id, branch_id, quantity, reserved_qty, available_qty)
     VALUES (?, ?, GREATEST(0, ?), 0, GREATEST(0, ?))
     ON DUPLICATE KEY UPDATE
       quantity = GREATEST(0, quantity + ?),
       available_qty = GREATEST(0, quantity - reserved_qty)`,
    [itemId, branchId, delta, delta, delta]
  );

  await conn.query(
    `INSERT INTO inventory_stock_movements
     (item_id, branch_id, movement_type, quantity, reference_type, reference_id, batch_no, expiry_date, reason, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [itemId, branchId, movementType, Math.abs(delta), referenceType, referenceId, batchNo, expiryDate, reason, notes, userId]
  );
};

// ============ CATEGORIES ============
export const getCategories = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT c.*, p.name AS parent_name
       FROM inventory_categories c
       LEFT JOIN inventory_categories p ON c.parent_category_id = p.id
       ORDER BY c.name ASC`
    );
    res.json({ success: true, categories: rows });
  } catch (e) { next(e); }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM inventory_categories WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Category not found' });
    res.json({ success: true, category: rows[0] });
  } catch (e) { next(e); }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, parent_category_id, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const result = await query(
      `INSERT INTO inventory_categories (name, parent_category_id, description) VALUES (?, ?, ?)`,
      [name.trim(), parent_category_id || null, description || null]
    );
    await auditLog('category', result.insertId, 'create', null, req.body, req.user?.id, req);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (e) { next(e); }
};

export const updateCategory = async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM inventory_categories WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Category not found' });
    const { name, parent_category_id, description } = req.body;
    await query(
      `UPDATE inventory_categories SET name = COALESCE(?, name), parent_category_id = ?, description = COALESCE(?, description) WHERE id = ?`,
      [name?.trim() || null, parent_category_id === undefined ? existing[0].parent_category_id : (parent_category_id || null), description || null, req.params.id]
    );
    await auditLog('category', req.params.id, 'update', existing[0], req.body, req.user?.id, req);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const used = await query('SELECT COUNT(*) AS c FROM inventory_items WHERE category_id = ?', [req.params.id]);
    if (used[0].c > 0) return res.status(400).json({ message: 'Category has items assigned and cannot be deleted' });
    await query('DELETE FROM inventory_categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

// ============ UNITS ============
export const getUnits = async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM inventory_units ORDER BY name ASC');
    res.json({ success: true, units: rows });
  } catch (e) { next(e); }
};

export const getUnitById = async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM inventory_units WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Unit not found' });
    res.json({ success: true, unit: rows[0] });
  } catch (e) { next(e); }
};

export const createUnit = async (req, res, next) => {
  try {
    const { name, symbol, unit_type, conversion_factor } = req.body;
    if (!name) return res.status(400).json({ message: 'Unit name is required' });
    const result = await query(
      `INSERT INTO inventory_units (name, symbol, unit_type, conversion_factor) VALUES (?, ?, ?, ?)`,
      [name.trim(), symbol || null, unit_type || 'quantity', Number(conversion_factor) || 1]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (e) { next(e); }
};

export const updateUnit = async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM inventory_units WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Unit not found' });
    const { name, symbol, unit_type, conversion_factor } = req.body;
    await query(
      `UPDATE inventory_units SET name = COALESCE(?, name), symbol = COALESCE(?, symbol), unit_type = COALESCE(?, unit_type), conversion_factor = COALESCE(?, conversion_factor) WHERE id = ?`,
      [name?.trim() || null, symbol, unit_type, conversion_factor !== undefined ? Number(conversion_factor) : null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const deleteUnit = async (req, res, next) => {
  try {
    const used = await query('SELECT COUNT(*) AS c FROM inventory_items WHERE unit_id = ?', [req.params.id]);
    if (used[0].c > 0) return res.status(400).json({ message: 'Unit is used by items and cannot be deleted' });
    await query('DELETE FROM inventory_units WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

// ============ SUPPLIERS ============
export const getSuppliers = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let sql = `SELECT * FROM inventory_suppliers WHERE 1=1`;
    const params = [];
    if (search) {
      sql += ` AND (name LIKE ? OR supplier_code LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    if (status) { sql += ` AND status = ?`; params.push(status); }
    sql += ` ORDER BY name ASC`;
    const rows = await query(sql, params);
    res.json({ success: true, suppliers: rows });
  } catch (e) { next(e); }
};

export const getSupplierById = async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM inventory_suppliers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ success: true, supplier: rows[0] });
  } catch (e) { next(e); }
};

export const createSupplier = async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.name) return res.status(400).json({ message: 'Supplier name is required' });
    const supplierCode = b.supplier_code || (await generateSupplierCode());
    const result = await query(
      `INSERT INTO inventory_suppliers
       (supplier_code, name, contact_person, phone, alt_phone, email, address_line1, address_line2, city, state, pincode, gstin, pan,
        bank_name, bank_account_no, bank_ifsc, payment_terms_days, credit_limit, rating, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supplierCode, b.name.trim(), b.contact_person || null, b.phone || null, b.alt_phone || null,
        b.email || null, b.address_line1 || null, b.address_line2 || null, b.city || null, b.state || null,
        b.pincode || null, b.gstin || null, b.pan || null, b.bank_name || null, b.bank_account_no || null,
        b.bank_ifsc || null, b.payment_terms_days !== undefined ? Number(b.payment_terms_days) : 30,
        b.credit_limit !== undefined && b.credit_limit !== '' ? Number(b.credit_limit) : null,
        b.rating !== undefined && b.rating !== '' ? Number(b.rating) : null,
        b.status || 'active', b.notes || null,
      ]
    );
    await auditLog('supplier', result.insertId, 'create', null, { ...b, supplier_code: supplierCode }, req.user?.id, req);
    res.status(201).json({ success: true, id: result.insertId, supplier_code: supplierCode });
  } catch (e) { next(e); }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM inventory_suppliers WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Supplier not found' });
    const b = req.body;
    const fields = [];
    const params = [];
    const allowed = ['name','contact_person','phone','alt_phone','email','address_line1','address_line2','city','state','pincode','gstin','pan','bank_name','bank_account_no','bank_ifsc','notes','status'];
    for (const k of allowed) {
      if (b[k] !== undefined) { fields.push(`${k} = ?`); params.push(b[k]); }
    }
    if (b.payment_terms_days !== undefined) { fields.push('payment_terms_days = ?'); params.push(Number(b.payment_terms_days)); }
    if (b.credit_limit !== undefined) { fields.push('credit_limit = ?'); params.push(b.credit_limit === '' ? null : Number(b.credit_limit)); }
    if (b.rating !== undefined) { fields.push('rating = ?'); params.push(b.rating === '' ? null : Number(b.rating)); }
    if (fields.length === 0) return res.json({ success: true });
    params.push(req.params.id);
    await query(`UPDATE inventory_suppliers SET ${fields.join(', ')} WHERE id = ?`, params);
    await auditLog('supplier', req.params.id, 'update', existing[0], b, req.user?.id, req);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    const usedItems = await query('SELECT COUNT(*) AS c FROM inventory_items WHERE supplier_id = ?', [req.params.id]);
    const usedPO = await query('SELECT COUNT(*) AS c FROM inventory_purchase_orders WHERE supplier_id = ?', [req.params.id]);
    if (usedItems[0].c > 0 || usedPO[0].c > 0) {
      return res.status(400).json({ message: 'Supplier has items or purchase orders and cannot be deleted' });
    }
    await query('DELETE FROM inventory_suppliers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const getSupplierStockHistory = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT po.po_number, po.order_date, poi.quantity, poi.received_qty, i.name AS item_name
       FROM inventory_purchase_order_items poi
       JOIN inventory_purchase_orders po ON poi.po_id = po.id
       JOIN inventory_items i ON poi.item_id = i.id
       WHERE po.supplier_id = ?
       ORDER BY po.order_date DESC LIMIT 100`,
      [req.params.id]
    );
    res.json({ success: true, history: rows });
  } catch (e) { next(e); }
};

// ============ ITEMS ============
export const getItems = async (req, res, next) => {
  try {
    const { search, category_id, status, branch_id, low_stock } = req.query;
    let sql = `
      SELECT i.*,
             c.name AS category_name,
             u.name AS unit_name, u.symbol AS unit_symbol,
             s.name AS supplier_name,
             COALESCE(bs.quantity, 0) AS stock_qty,
             COALESCE(bs.reserved_qty, 0) AS reserved_qty,
             COALESCE(bs.available_qty, 0) AS available_qty
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      LEFT JOIN inventory_units u ON i.unit_id = u.id
      LEFT JOIN inventory_suppliers s ON i.supplier_id = s.id
      LEFT JOIN inventory_branch_stock bs ON bs.item_id = i.id ${branch_id ? 'AND bs.branch_id = ?' : ''}
      WHERE 1=1`;
    const params = [];
    if (branch_id) params.push(branch_id);
    if (search) {
      sql += ` AND (i.name LIKE ? OR i.item_code LIKE ? OR i.barcode LIKE ? OR i.brand LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (category_id) { sql += ` AND i.category_id = ?`; params.push(category_id); }
    if (status) { sql += ` AND i.status = ?`; params.push(status); }
    if (low_stock === 'true') { sql += ` AND COALESCE(bs.quantity,0) <= i.reorder_level`; }
    sql += ` ORDER BY i.name ASC`;
    const rows = await query(sql, params);
    res.json({ success: true, items: rows });
  } catch (e) { next(e); }
};

export const getItemById = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT i.*,
              c.name AS category_name, u.name AS unit_name, u.symbol AS unit_symbol,
              s.name AS supplier_name, s.supplier_code
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       LEFT JOIN inventory_units u ON i.unit_id = u.id
       LEFT JOIN inventory_suppliers s ON i.supplier_id = s.id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    const stock = await query('SELECT * FROM inventory_branch_stock WHERE item_id = ?', [req.params.id]);
    const movements = await query(
      `SELECT m.*, b.name AS branch_name, u.name AS user_name
       FROM inventory_stock_movements m
       LEFT JOIN branches b ON m.branch_id = b.id
       LEFT JOIN users u ON m.created_by = u.id
       WHERE m.item_id = ? ORDER BY m.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, item: rows[0], stock, movements });
  } catch (e) { next(e); }
};

export const createItem = async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.name) return res.status(400).json({ message: 'Item name is required' });
    const itemCode = b.item_code || (await generateItemCode());
    const result = await query(
      `INSERT INTO inventory_items
       (item_code, name, category_id, unit_id, supplier_id, description, brand, model_no, barcode, hscode,
        reorder_level, reorder_qty, safety_stock, unit_cost, selling_price, min_selling_price,
        tax_rate, tax_code, hsn_code, image_url, is_perishable, shelf_life_days, storage_conditions,
        weight_kg, dimensions_length, dimensions_width, dimensions_height, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemCode, b.name.trim(), b.category_id || null, b.unit_id || null, b.supplier_id || null,
        b.description || null, b.brand || null, b.model_no || null, b.barcode || null, b.hscode || null,
        Number(b.reorder_level) || 0, Number(b.reorder_qty) || 0, Number(b.safety_stock) || 0,
        Number(b.unit_cost) || 0, b.selling_price !== undefined && b.selling_price !== '' ? Number(b.selling_price) : null,
        b.min_selling_price !== undefined && b.min_selling_price !== '' ? Number(b.min_selling_price) : null,
        Number(b.tax_rate) || 0, b.tax_code || null, b.hsn_code || null, b.image_url || null,
        b.is_perishable ? 1 : 0, b.shelf_life_days ? Number(b.shelf_life_days) : null,
        b.storage_conditions || null, b.weight_kg ? Number(b.weight_kg) : null,
        b.dimensions_length ? Number(b.dimensions_length) : null,
        b.dimensions_width ? Number(b.dimensions_width) : null,
        b.dimensions_height ? Number(b.dimensions_height) : null,
        b.status || 'active',
      ]
    );
    await auditLog('item', result.insertId, 'create', null, { ...b, item_code: itemCode }, req.user?.id, req);
    res.status(201).json({ success: true, id: result.insertId, item_code: itemCode });
  } catch (e) { next(e); }
};

export const updateItem = async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM inventory_items WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Item not found' });
    const b = req.body;
    const fields = [];
    const params = [];
    const strFields = ['name','category_id','unit_id','supplier_id','description','brand','model_no','barcode','hscode','tax_code','hsn_code','image_url','storage_conditions','status'];
    for (const k of strFields) {
      if (b[k] !== undefined) { fields.push(`${k} = ?`); params.push(b[k] === '' ? null : b[k]); }
    }
    const numFields = ['reorder_level','reorder_qty','safety_stock','unit_cost','selling_price','min_selling_price','tax_rate','shelf_life_days','weight_kg','dimensions_length','dimensions_width','dimensions_height'];
    for (const k of numFields) {
      if (b[k] !== undefined) { fields.push(`${k} = ?`); params.push(b[k] === '' ? null : Number(b[k])); }
    }
    if (b.is_perishable !== undefined) { fields.push('is_perishable = ?'); params.push(b.is_perishable ? 1 : 0); }
    if (fields.length === 0) return res.json({ success: true });
    params.push(req.params.id);
    await query(`UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ?`, params);
    await auditLog('item', req.params.id, 'update', existing[0], b, req.user?.id, req);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const deleteItem = async (req, res, next) => {
  try {
    const usedPO = await query('SELECT COUNT(*) AS c FROM inventory_purchase_order_items WHERE item_id = ?', [req.params.id]);
    const usedStock = await query('SELECT COUNT(*) AS c FROM inventory_branch_stock WHERE item_id = ? AND quantity > 0', [req.params.id]);
    if (usedPO[0].c > 0 || usedStock[0].c > 0) {
      return res.status(400).json({ message: 'Item has stock or purchase history. Set status to discontinued instead.' });
    }
    await query('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const getItemStockHistory = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT m.*, b.name AS branch_name
       FROM inventory_stock_movements m
       LEFT JOIN branches b ON m.branch_id = b.id
       WHERE m.item_id = ? ORDER BY m.created_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json({ success: true, movements: rows });
  } catch (e) { next(e); }
};

// ============ BRANCH STOCK ============
export const getBranchStock = async (req, res, next) => {
  try {
    const { branch_id } = req.query;
    const rows = await query(
      `SELECT bs.*, i.name AS item_name, i.item_code, i.reorder_level, c.name AS category_name, u.symbol AS unit_symbol
       FROM inventory_branch_stock bs
       JOIN inventory_items i ON bs.item_id = i.id
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       LEFT JOIN inventory_units u ON i.unit_id = u.id
       ${branch_id ? 'WHERE bs.branch_id = ?' : ''}
       ORDER BY i.name ASC`,
      branch_id ? [branch_id] : []
    );
    res.json({ success: true, stock: rows });
  } catch (e) { next(e); }
};

export const getBranchStockSummary = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT bs.branch_id, b.name AS branch_name,
              COUNT(DISTINCT bs.item_id) AS item_count,
              SUM(bs.quantity) AS total_qty,
              SUM(bs.quantity * i.unit_cost) AS total_value
       FROM inventory_branch_stock bs
       JOIN inventory_items i ON bs.item_id = i.id
       LEFT JOIN branches b ON bs.branch_id = b.id
       GROUP BY bs.branch_id, b.name`
    );
    res.json({ success: true, summary: rows });
  } catch (e) { next(e); }
};

// ============ PURCHASE ORDERS ============
export const getPOs = async (req, res, next) => {
  try {
    const { status, branch_id, supplier_id, search } = req.query;
    let sql = `
      SELECT po.*, s.name AS supplier_name, s.supplier_code, b.name AS branch_name,
             (SELECT COUNT(*) FROM inventory_purchase_order_items WHERE po_id = po.id) AS item_count
      FROM inventory_purchase_orders po
      JOIN inventory_suppliers s ON po.supplier_id = s.id
      LEFT JOIN branches b ON po.branch_id = b.id
      WHERE 1=1`;
    const params = [];
    if (status) { sql += ` AND po.status = ?`; params.push(status); }
    if (branch_id) { sql += ` AND po.branch_id = ?`; params.push(branch_id); }
    if (supplier_id) { sql += ` AND po.supplier_id = ?`; params.push(supplier_id); }
    if (search) { sql += ` AND (po.po_number LIKE ? OR s.name LIKE ?)`; const s = `%${search}%`; params.push(s, s); }
    sql += ` ORDER BY po.created_at DESC`;
    const rows = await query(sql, params);
    res.json({ success: true, purchase_orders: rows });
  } catch (e) { next(e); }
};

export const getPOById = async (req, res, next) => {
  try {
    const po = await query(
      `SELECT po.*, s.name AS supplier_name, s.supplier_code, s.contact_person, s.phone, s.email, s.address_line1, s.city, s.state, s.pincode, s.gstin,
              b.name AS branch_name
       FROM inventory_purchase_orders po
       JOIN inventory_suppliers s ON po.supplier_id = s.id
       LEFT JOIN branches b ON po.branch_id = b.id
       WHERE po.id = ?`,
      [req.params.id]
    );
    if (po.length === 0) return res.status(404).json({ message: 'PO not found' });
    const items = await query(
      `SELECT poi.*, i.name AS item_name, i.item_code, u.symbol AS unit_symbol
       FROM inventory_purchase_order_items poi
       JOIN inventory_items i ON poi.item_id = i.id
       LEFT JOIN inventory_units u ON i.unit_id = u.id
       WHERE poi.po_id = ?`,
      [req.params.id]
    );
    const grns = await query(
      `SELECT * FROM inventory_goods_receipt WHERE po_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, purchase_order: po[0], items, grns });
  } catch (e) { next(e); }
};

export const createPO = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const b = req.body;
    if (!b.supplier_id || !b.branch_id || !b.order_date) {
      conn.release();
      return res.status(400).json({ message: 'Supplier, branch and order date are required' });
    }
    if (!Array.isArray(b.items) || b.items.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const poNumber = await generateDailyCode('PO', 'inventory_purchase_orders', 'po_number');

    await conn.beginTransaction();

    let subtotal = 0, taxAmount = 0;
    const lineItems = b.items.map((it) => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unit_price) || 0;
      const taxRate = Number(it.tax_rate) || 0;
      const lineTotal = qty * price;
      const lineTax = lineTotal * taxRate / 100;
      subtotal += lineTotal;
      taxAmount += lineTax;
      return { ...it, qty, price, taxRate, lineTotal, lineTax };
    });
    const totalAmount = subtotal + taxAmount;

    const [poRes] = await conn.query(
      `INSERT INTO inventory_purchase_orders
       (po_number, branch_id, supplier_id, order_date, expected_date, status, subtotal, tax_amount, total_amount,
        payment_terms, shipping_address, billing_address, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        poNumber, Number(b.branch_id), Number(b.supplier_id), b.order_date,
        b.expected_date || null, subtotal, taxAmount, totalAmount,
        b.payment_terms || null, b.shipping_address || null, b.billing_address || null,
        b.remarks || null, req.user?.id || null,
      ]
    );
    const poId = poRes.insertId;

    for (const it of lineItems) {
      await conn.query(
        `INSERT INTO inventory_purchase_order_items (po_id, item_id, quantity, unit_price, tax_rate, tax_amount, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [poId, Number(it.item_id), it.qty, it.price, it.taxRate, it.lineTax, it.lineTotal]
      );
    }

    await conn.commit();
    conn.release();
    await auditLog('purchase_order', poId, 'create', null, { po_number: poNumber, items: lineItems }, req.user?.id, req);
    res.status(201).json({ success: true, id: poId, po_number: poNumber });
  } catch (e) {
    await conn.rollback();
    conn.release();
    next(e);
  }
};

export const updatePO = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const existing = await query('SELECT * FROM inventory_purchase_orders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) { conn.release(); return res.status(404).json({ message: 'PO not found' }); }
    if (existing[0].status === 'received' || existing[0].status === 'cancelled') {
      conn.release();
      return res.status(400).json({ message: `Cannot edit PO in ${existing[0].status} status` });
    }
    const b = req.body;
    await conn.beginTransaction();

    const fields = [];
    const params = [];
    if (b.order_date) { fields.push('order_date = ?'); params.push(b.order_date); }
    if (b.expected_date !== undefined) { fields.push('expected_date = ?'); params.push(b.expected_date || null); }
    if (b.payment_terms !== undefined) { fields.push('payment_terms = ?'); params.push(b.payment_terms); }
    if (b.shipping_address !== undefined) { fields.push('shipping_address = ?'); params.push(b.shipping_address); }
    if (b.billing_address !== undefined) { fields.push('billing_address = ?'); params.push(b.billing_address); }
    if (b.remarks !== undefined) { fields.push('remarks = ?'); params.push(b.remarks); }
    if (fields.length > 0) {
      params.push(req.params.id);
      await conn.query(`UPDATE inventory_purchase_orders SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    if (Array.isArray(b.items)) {
      await conn.query('DELETE FROM inventory_purchase_order_items WHERE po_id = ?', [req.params.id]);
      let subtotal = 0, taxAmount = 0;
      for (const it of b.items) {
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unit_price) || 0;
        const taxRate = Number(it.tax_rate) || 0;
        const lineTotal = qty * price;
        const lineTax = lineTotal * taxRate / 100;
        subtotal += lineTotal;
        taxAmount += lineTax;
        await conn.query(
          `INSERT INTO inventory_purchase_order_items (po_id, item_id, quantity, unit_price, tax_rate, tax_amount, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [req.params.id, Number(it.item_id), qty, price, taxRate, lineTax, lineTotal]
        );
      }
      await conn.query(
        `UPDATE inventory_purchase_orders SET subtotal = ?, tax_amount = ?, total_amount = ? WHERE id = ?`,
        [subtotal, taxAmount, subtotal + taxAmount, req.params.id]
      );
    }

    await conn.commit();
    conn.release();
    await auditLog('purchase_order', req.params.id, 'update', existing[0], b, req.user?.id, req);
    res.json({ success: true });
  } catch (e) {
    await conn.rollback();
    conn.release();
    next(e);
  }
};

export const updatePOStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['draft', 'sent', 'partial_received', 'received', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const existing = await query('SELECT * FROM inventory_purchase_orders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'PO not found' });
    await query('UPDATE inventory_purchase_orders SET status = ? WHERE id = ?', [status, req.params.id]);
    await auditLog('purchase_order', req.params.id, 'status_change', existing[0], { status }, req.user?.id, req);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const sendPO = async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM inventory_purchase_orders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'PO not found' });
    if (existing[0].status !== 'draft') return res.status(400).json({ message: 'Only draft POs can be sent' });
    await query(`UPDATE inventory_purchase_orders SET status = 'sent' WHERE id = ?`, [req.params.id]);
    await auditLog('purchase_order', req.params.id, 'status_change', existing[0], { status: 'sent' }, req.user?.id, req);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const cancelPO = async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM inventory_purchase_orders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'PO not found' });
    if (existing[0].status === 'received') return res.status(400).json({ message: 'Cannot cancel a fully received PO' });
    await query(`UPDATE inventory_purchase_orders SET status = 'cancelled' WHERE id = ?`, [req.params.id]);
    await auditLog('purchase_order', req.params.id, 'status_change', existing[0], { status: 'cancelled' }, req.user?.id, req);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const deletePO = async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM inventory_purchase_orders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'PO not found' });
    if (existing[0].status !== 'draft') return res.status(400).json({ message: 'Only draft POs can be deleted' });
    const grns = await query('SELECT COUNT(*) AS c FROM inventory_goods_receipt WHERE po_id = ?', [req.params.id]);
    if (grns[0].c > 0) return res.status(400).json({ message: 'PO has goods receipts and cannot be deleted' });
    await query('DELETE FROM inventory_purchase_order_items WHERE po_id = ?', [req.params.id]);
    await query('DELETE FROM inventory_purchase_orders WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

// ============ GOODS RECEIPT ============
export const getGRNs = async (req, res, next) => {
  try {
    const { status, branch_id, po_id } = req.query;
    let sql = `
      SELECT gr.*, po.po_number, s.name AS supplier_name, b.name AS branch_name,
             (SELECT COUNT(*) FROM inventory_goods_receipt_items WHERE grn_id = gr.id) AS item_count
      FROM inventory_goods_receipt gr
      LEFT JOIN inventory_purchase_orders po ON gr.po_id = po.id
      LEFT JOIN inventory_suppliers s ON po.supplier_id = s.id
      LEFT JOIN branches b ON gr.branch_id = b.id
      WHERE 1=1`;
    const params = [];
    if (status) { sql += ` AND gr.status = ?`; params.push(status); }
    if (branch_id) { sql += ` AND gr.branch_id = ?`; params.push(branch_id); }
    if (po_id) { sql += ` AND gr.po_id = ?`; params.push(po_id); }
    sql += ` ORDER BY gr.created_at DESC`;
    const rows = await query(sql, params);
    res.json({ success: true, grns: rows });
  } catch (e) { next(e); }
};

export const getGRNById = async (req, res, next) => {
  try {
    const grn = await query(
      `SELECT gr.*, po.po_number, s.name AS supplier_name, b.name AS branch_name
       FROM inventory_goods_receipt gr
       LEFT JOIN inventory_purchase_orders po ON gr.po_id = po.id
       LEFT JOIN inventory_suppliers s ON po.supplier_id = s.id
       LEFT JOIN branches b ON gr.branch_id = b.id
       WHERE gr.id = ?`,
      [req.params.id]
    );
    if (grn.length === 0) return res.status(404).json({ message: 'GRN not found' });
    const items = await query(
      `SELECT gri.*, i.name AS item_name, i.item_code, u.symbol AS unit_symbol
       FROM inventory_goods_receipt_items gri
       JOIN inventory_items i ON gri.item_id = i.id
       LEFT JOIN inventory_units u ON i.unit_id = u.id
       WHERE gri.grn_id = ?`,
      [req.params.id]
    );
    res.json({ success: true, grn: grn[0], items });
  } catch (e) { next(e); }
};

export const createGRN = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const b = req.body;
    if (!b.branch_id || !b.receipt_date) {
      conn.release();
      return res.status(400).json({ message: 'Branch and receipt date are required' });
    }
    if (!Array.isArray(b.items) || b.items.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const grnNumber = await generateDailyCode('GRN', 'inventory_goods_receipt', 'grn_number');

    await conn.beginTransaction();

    const [grnRes] = await conn.query(
      `INSERT INTO inventory_goods_receipt (grn_number, po_id, branch_id, receipt_date, received_by, status, remarks)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [grnNumber, b.po_id || null, Number(b.branch_id), b.receipt_date, req.user?.id || null, b.remarks || null]
    );
    const grnId = grnRes.insertId;

    for (const it of b.items) {
      await conn.query(
        `INSERT INTO inventory_goods_receipt_items
         (grn_id, po_item_id, item_id, quantity_received, quantity_accepted, quantity_rejected, batch_no, expiry_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          grnId, it.po_item_id || null, Number(it.item_id),
          Number(it.quantity_received) || 0,
          Number(it.quantity_accepted) || 0,
          Number(it.quantity_rejected) || 0,
          it.batch_no || null, it.expiry_date || null, it.notes || null,
        ]
      );
    }

    await conn.commit();
    conn.release();
    await auditLog('goods_receipt', grnId, 'create', null, { grn_number: grnNumber }, req.user?.id, req);
    res.status(201).json({ success: true, id: grnId, grn_number: grnNumber });
  } catch (e) {
    await conn.rollback();
    conn.release();
    next(e);
  }
};

export const inspectGRN = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { status, items } = req.body; // status: 'accepted' or 'rejected', items: [{id, quantity_accepted, quantity_rejected, batch_no, expiry_date}]
    const grn = await query('SELECT * FROM inventory_goods_receipt WHERE id = ?', [req.params.id]);
    if (grn.length === 0) { conn.release(); return res.status(404).json({ message: 'GRN not found' }); }
    if (grn[0].status !== 'pending' && grn[0].status !== 'inspected') {
      conn.release();
      return res.status(400).json({ message: `GRN already ${grn[0].status}` });
    }

    await conn.beginTransaction();

    if (Array.isArray(items)) {
      for (const it of items) {
        await conn.query(
          `UPDATE inventory_goods_receipt_items SET
             quantity_accepted = ?, quantity_rejected = ?, batch_no = COALESCE(?, batch_no), expiry_date = COALESCE(?, expiry_date)
           WHERE id = ? AND grn_id = ?`,
          [Number(it.quantity_accepted) || 0, Number(it.quantity_rejected) || 0, it.batch_no || null, it.expiry_date || null, it.id, req.params.id]
        );
      }
    }

    const newStatus = status === 'rejected' ? 'rejected' : 'accepted';
    await conn.query('UPDATE inventory_goods_receipt SET status = ? WHERE id = ?', [newStatus, req.params.id]);

    // If accepted, update stock and PO received quantities
    if (newStatus === 'accepted') {
      const grnItems = await conn.query(
        `SELECT * FROM inventory_goods_receipt_items WHERE grn_id = ?`,
        [req.params.id]
      );
      for (const gi of grnItems[0]) {
        const accepted = Number(gi.quantity_accepted) || 0;
        if (accepted > 0) {
          await adjustStock({
            itemId: gi.item_id,
            branchId: grn[0].branch_id,
            delta: accepted,
            movementType: 'in',
            referenceType: 'grn',
            referenceId: grn[0].id,
            batchNo: gi.batch_no,
            expiryDate: gi.expiry_date,
            userId: req.user?.id,
          }, conn);

          // Update PO item received qty
          if (gi.po_item_id) {
            await conn.query(
              `UPDATE inventory_purchase_order_items SET received_qty = received_qty + ? WHERE id = ?`,
              [accepted, gi.po_item_id]
            );
          }
        }
      }

      // Update PO status
      if (grn[0].po_id) {
        const poItems = await conn.query(
          `SELECT quantity, received_qty FROM inventory_purchase_order_items WHERE po_id = ?`,
          [grn[0].po_id]
        );
        const allReceived = poItems[0].every((p) => Number(p.received_qty) >= Number(p.quantity));
        const anyReceived = poItems[0].some((p) => Number(p.received_qty) > 0);
        const newPoStatus = allReceived ? 'received' : (anyReceived ? 'partial_received' : 'sent');
        await conn.query('UPDATE inventory_purchase_orders SET status = ? WHERE id = ?', [newPoStatus, grn[0].po_id]);
      }
    }

    await conn.commit();
    conn.release();
    await auditLog('goods_receipt', req.params.id, 'status_change', grn[0], { status: newStatus }, req.user?.id, req);
    res.json({ success: true, status: newStatus });
  } catch (e) {
    await conn.rollback();
    conn.release();
    next(e);
  }
};

// ============ STOCK MOVEMENTS ============
export const getMovements = async (req, res, next) => {
  try {
    const { item_id, branch_id, movement_type, reference_type, from_date, to_date } = req.query;
    let sql = `
      SELECT m.*, i.name AS item_name, i.item_code, b.name AS branch_name,
             u.name AS user_name, u.username
       FROM inventory_stock_movements m
       JOIN inventory_items i ON m.item_id = i.id
       LEFT JOIN branches b ON m.branch_id = b.id
       LEFT JOIN users u ON m.created_by = u.id
       WHERE 1=1`;
    const params = [];
    if (item_id) { sql += ` AND m.item_id = ?`; params.push(item_id); }
    if (branch_id) { sql += ` AND m.branch_id = ?`; params.push(branch_id); }
    if (movement_type) { sql += ` AND m.movement_type = ?`; params.push(movement_type); }
    if (reference_type) { sql += ` AND m.reference_type = ?`; params.push(reference_type); }
    if (from_date) { sql += ` AND DATE(m.created_at) >= ?`; params.push(from_date); }
    if (to_date) { sql += ` AND DATE(m.created_at) <= ?`; params.push(to_date); }
    sql += ` ORDER BY m.created_at DESC LIMIT 500`;
    const rows = await query(sql, params);
    res.json({ success: true, movements: rows });
  } catch (e) { next(e); }
};

export const getMovementById = async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM inventory_stock_movements WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Movement not found' });
    res.json({ success: true, movement: rows[0] });
  } catch (e) { next(e); }
};

export const createStockIn = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const b = req.body;
    if (!b.item_id || !b.branch_id || !b.quantity) {
      conn.release();
      return res.status(400).json({ message: 'Item, branch and quantity are required' });
    }
    await conn.beginTransaction();
    await adjustStock({
      itemId: Number(b.item_id), branchId: Number(b.branch_id),
      delta: Number(b.quantity), movementType: 'in', referenceType: 'manual',
      reason: b.reason || null, notes: b.notes || null, userId: req.user?.id,
    }, conn);
    await conn.commit();
    conn.release();
    res.status(201).json({ success: true });
  } catch (e) { await conn.rollback(); conn.release(); next(e); }
};

export const createStockOut = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const b = req.body;
    if (!b.item_id || !b.branch_id || !b.quantity) {
      conn.release();
      return res.status(400).json({ message: 'Item, branch and quantity are required' });
    }
    const qty = Number(b.quantity);
    const stock = await conn.query(
      'SELECT quantity FROM inventory_branch_stock WHERE item_id = ? AND branch_id = ?',
      [Number(b.item_id), Number(b.branch_id)]
    );
    const available = stock[0].length > 0 ? Number(stock[0][0].quantity) : 0;
    if (qty > available) {
      conn.release();
      return res.status(400).json({ message: `Insufficient stock. Available: ${available}` });
    }
    await conn.beginTransaction();
    await adjustStock({
      itemId: Number(b.item_id), branchId: Number(b.branch_id),
      delta: -qty, movementType: 'out', referenceType: 'manual',
      reason: b.reason || null, notes: b.notes || null, userId: req.user?.id,
    }, conn);
    await conn.commit();
    conn.release();
    res.status(201).json({ success: true });
  } catch (e) { await conn.rollback(); conn.release(); next(e); }
};

export const createAdjustment = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const b = req.body;
    if (!b.item_id || !b.branch_id || b.new_quantity === undefined) {
      conn.release();
      return res.status(400).json({ message: 'Item, branch and new quantity are required' });
    }
    const itemId = Number(b.item_id);
    const branchId = Number(b.branch_id);
    const newQty = Number(b.new_quantity);
    const stock = await conn.query(
      'SELECT quantity FROM inventory_branch_stock WHERE item_id = ? AND branch_id = ?',
      [itemId, branchId]
    );
    const current = stock[0].length > 0 ? Number(stock[0][0].quantity) : 0;
    const diff = newQty - current;
    if (diff === 0) {
      conn.release();
      return res.json({ success: true, message: 'No change in quantity' });
    }
    await conn.beginTransaction();
    await adjustStock({
      itemId, branchId, delta: diff, movementType: 'adjustment', referenceType: 'manual',
      reason: b.reason || null, notes: b.notes || null, userId: req.user?.id,
    }, conn);
    await conn.commit();
    conn.release();
    res.json({ success: true, adjustment: diff });
  } catch (e) { await conn.rollback(); conn.release(); next(e); }
};

export const createBranchTransfer = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const b = req.body;
    if (!b.item_id || !b.from_branch_id || !b.to_branch_id || !b.quantity) {
      conn.release();
      return res.status(400).json({ message: 'Item, from branch, to branch and quantity are required' });
    }
    if (Number(b.from_branch_id) === Number(b.to_branch_id)) {
      conn.release();
      return res.status(400).json({ message: 'From and to branches must be different' });
    }
    const qty = Number(b.quantity);
    const itemId = Number(b.item_id);
    const fromBranch = Number(b.from_branch_id);
    const toBranch = Number(b.to_branch_id);

    const stock = await conn.query(
      'SELECT quantity FROM inventory_branch_stock WHERE item_id = ? AND branch_id = ?',
      [itemId, fromBranch]
    );
    const available = stock[0].length > 0 ? Number(stock[0][0].quantity) : 0;
    if (qty > available) {
      conn.release();
      return res.status(400).json({ message: `Insufficient stock at source branch. Available: ${available}` });
    }

    await conn.beginTransaction();
    await adjustStock({
      itemId, branchId: fromBranch, delta: -qty, movementType: 'transfer_out',
      referenceType: 'transfer', reason: b.reason || null, notes: b.notes || null, userId: req.user?.id,
    }, conn);
    await adjustStock({
      itemId, branchId: toBranch, delta: qty, movementType: 'transfer_in',
      referenceType: 'transfer', reason: b.reason || null, notes: b.notes || null, userId: req.user?.id,
    }, conn);
    await conn.commit();
    conn.release();
    res.status(201).json({ success: true });
  } catch (e) { await conn.rollback(); conn.release(); next(e); }
};

// ============ ALLOCATIONS ============
export const getAllocations = async (req, res, next) => {
  try {
    const { item_id, branch_id, allocated_to_type, allocated_to_id, status } = req.query;
    let sql = `
      SELECT a.*, i.name AS item_name, i.item_code, b.name AS branch_name,
             u.name AS allocated_by_name
       FROM inventory_allocations a
       JOIN inventory_items i ON a.item_id = i.id
       LEFT JOIN branches b ON a.branch_id = b.id
       LEFT JOIN users u ON a.allocated_by = u.id
       WHERE 1=1`;
    const params = [];
    if (item_id) { sql += ` AND a.item_id = ?`; params.push(item_id); }
    if (branch_id) { sql += ` AND a.branch_id = ?`; params.push(branch_id); }
    if (allocated_to_type) { sql += ` AND a.allocated_to_type = ?`; params.push(allocated_to_type); }
    if (allocated_to_id) { sql += ` AND a.allocated_to_id = ?`; params.push(allocated_to_id); }
    if (status) { sql += ` AND a.status = ?`; params.push(status); }
    sql += ` ORDER BY a.allocated_date DESC`;
    const rows = await query(sql, params);
    res.json({ success: true, allocations: rows });
  } catch (e) { next(e); }
};

export const getAllocationById = async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM inventory_allocations WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Allocation not found' });
    res.json({ success: true, allocation: rows[0] });
  } catch (e) { next(e); }
};

export const createAllocation = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const b = req.body;
    if (!b.item_id || !b.branch_id || !b.allocated_to_type || !b.allocated_to_id || !b.quantity) {
      conn.release();
      return res.status(400).json({ message: 'Item, branch, target type, target id and quantity are required' });
    }
    const validTypes = ['department', 'class', 'section'];
    if (!validTypes.includes(b.allocated_to_type)) {
      conn.release();
      return res.status(400).json({ message: 'Invalid allocation target type' });
    }
    const qty = Number(b.quantity);
    const itemId = Number(b.item_id);
    const branchId = Number(b.branch_id);

    const stock = await conn.query(
      'SELECT available_qty FROM inventory_branch_stock WHERE item_id = ? AND branch_id = ?',
      [itemId, branchId]
    );
    const available = stock[0].length > 0 ? Number(stock[0][0].available_qty) : 0;
    if (qty > available) {
      conn.release();
      return res.status(400).json({ message: `Insufficient available stock. Available: ${available}` });
    }

    await conn.beginTransaction();

    // Reserve stock
    await conn.query(
      `UPDATE inventory_branch_stock SET reserved_qty = reserved_qty + ?, available_qty = available_qty - ?
       WHERE item_id = ? AND branch_id = ?`,
      [qty, qty, itemId, branchId]
    );

    const [res2] = await conn.query(
      `INSERT INTO inventory_allocations
       (item_id, branch_id, allocated_to_type, allocated_to_id, quantity, unit_cost, allocated_date, allocated_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [itemId, branchId, b.allocated_to_type, Number(b.allocated_to_id), qty,
       Number(b.unit_cost) || 0, b.allocated_date || new Date().toISOString().slice(0, 10), req.user?.id || null]
    );

    await conn.commit();
    conn.release();
    await auditLog('allocation', res2.insertId, 'create', null, b, req.user?.id, req);
    res.status(201).json({ success: true, id: res2.insertId });
  } catch (e) { await conn.rollback(); conn.release(); next(e); }
};

export const returnAllocation = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const alloc = await query('SELECT * FROM inventory_allocations WHERE id = ?', [req.params.id]);
    if (alloc.length === 0) { conn.release(); return res.status(404).json({ message: 'Allocation not found' }); }
    if (alloc[0].status === 'returned') { conn.release(); return res.status(400).json({ message: 'Already returned' }); }

    await conn.beginTransaction();
    const qty = Number(alloc[0].quantity);
    await conn.query(
      `UPDATE inventory_branch_stock SET reserved_qty = GREATEST(0, reserved_qty - ?), available_qty = available_qty + ?
       WHERE item_id = ? AND branch_id = ?`,
      [qty, qty, alloc[0].item_id, alloc[0].branch_id]
    );
    await conn.query(
      `UPDATE inventory_allocations SET status = 'returned', return_date = ? WHERE id = ?`,
      [new Date().toISOString().slice(0, 10), req.params.id]
    );
    await conn.commit();
    conn.release();
    res.json({ success: true });
  } catch (e) { await conn.rollback(); conn.release(); next(e); }
};

export const deleteAllocation = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const alloc = await query('SELECT * FROM inventory_allocations WHERE id = ?', [req.params.id]);
    if (alloc.length === 0) { conn.release(); return res.status(404).json({ message: 'Allocation not found' }); }
    if (alloc[0].status === 'active') {
      await conn.beginTransaction();
      const qty = Number(alloc[0].quantity);
      await conn.query(
        `UPDATE inventory_branch_stock SET reserved_qty = GREATEST(0, reserved_qty - ?), available_qty = available_qty + ?
         WHERE item_id = ? AND branch_id = ?`,
        [qty, qty, alloc[0].item_id, alloc[0].branch_id]
      );
      await conn.commit();
    }
    conn.release();
    await query('DELETE FROM inventory_allocations WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { conn.release(); next(e); }
};

// ============ DAMAGED ITEMS ============
export const getDamaged = async (req, res, next) => {
  try {
    const { item_id, branch_id, damage_type, action_taken } = req.query;
    let sql = `
      SELECT d.*, i.name AS item_name, i.item_code, b.name AS branch_name,
             u1.name AS reported_by_name, u2.name AS inspected_by_name
       FROM inventory_damaged_items d
       JOIN inventory_items i ON d.item_id = i.id
       LEFT JOIN branches b ON d.branch_id = b.id
       LEFT JOIN users u1 ON d.reported_by = u1.id
       LEFT JOIN users u2 ON d.inspected_by = u2.id
       WHERE 1=1`;
    const params = [];
    if (item_id) { sql += ` AND d.item_id = ?`; params.push(item_id); }
    if (branch_id) { sql += ` AND d.branch_id = ?`; params.push(branch_id); }
    if (damage_type) { sql += ` AND d.damage_type = ?`; params.push(damage_type); }
    if (action_taken) { sql += ` AND d.action_taken = ?`; params.push(action_taken); }
    sql += ` ORDER BY d.reported_date DESC`;
    const rows = await query(sql, params);
    res.json({ success: true, damaged_items: rows });
  } catch (e) { next(e); }
};

export const getDamagedById = async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM inventory_damaged_items WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Record not found' });
    res.json({ success: true, damaged: rows[0] });
  } catch (e) { next(e); }
};

export const reportDamage = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const b = req.body;
    if (!b.item_id || !b.branch_id || !b.quantity || !b.damage_type) {
      conn.release();
      return res.status(400).json({ message: 'Item, branch, quantity and damage type are required' });
    }
    const qty = Number(b.quantity);
    const itemId = Number(b.item_id);
    const branchId = Number(b.branch_id);

    const stock = await conn.query(
      'SELECT quantity FROM inventory_branch_stock WHERE item_id = ? AND branch_id = ?',
      [itemId, branchId]
    );
    const available = stock[0].length > 0 ? Number(stock[0][0].quantity) : 0;
    if (qty > available) {
      conn.release();
      return res.status(400).json({ message: `Insufficient stock. Available: ${available}` });
    }

    await conn.beginTransaction();
    await adjustStock({
      itemId, branchId, delta: -qty, movementType: 'damaged', referenceType: 'damaged',
      reason: b.damage_reason || null, notes: b.notes || null, userId: req.user?.id,
    }, conn);

    const [res2] = await conn.query(
      `INSERT INTO inventory_damaged_items
       (item_id, branch_id, quantity, damage_type, damage_reason, reported_by, reported_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [itemId, branchId, qty, b.damage_type, b.damage_reason || null, req.user?.id || null,
       b.reported_date || new Date().toISOString().slice(0, 10)]
    );

    await conn.commit();
    conn.release();
    await auditLog('damaged_item', res2.insertId, 'create', null, b, req.user?.id, req);
    res.status(201).json({ success: true, id: res2.insertId });
  } catch (e) { await conn.rollback(); conn.release(); next(e); }
};

export const inspectDamage = async (req, res, next) => {
  try {
    const b = req.body;
    const existing = await query('SELECT * FROM inventory_damaged_items WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Record not found' });
    const validActions = ['write_off', 'repair', 'return_to_supplier'];
    if (b.action_taken && !validActions.includes(b.action_taken)) {
      return res.status(400).json({ message: 'Invalid action' });
    }
    await query(
      `UPDATE inventory_damaged_items SET
         inspected_by = ?, inspection_date = ?, action_taken = ?, write_off_value = ?
       WHERE id = ?`,
      [req.user?.id || null, new Date().toISOString().slice(0, 10),
       b.action_taken || null, b.write_off_value !== undefined ? Number(b.write_off_value) : 0, req.params.id]
    );
    await auditLog('damaged_item', req.params.id, 'update', existing[0], b, req.user?.id, req);
    res.json({ success: true });
  } catch (e) { next(e); }
};

// ============ DASHBOARD ============
export const getInventoryDashboard = async (req, res, next) => {
  try {
    const branchId = req.query.branch_id || req.user?.branch_id;

    const [kpis] = await query(
      `SELECT
        (SELECT COUNT(*) FROM inventory_items WHERE status = 'active') AS total_items,
        (SELECT COUNT(*) FROM inventory_items i
          JOIN inventory_branch_stock bs ON bs.item_id = i.id ${branchId ? 'AND bs.branch_id = ?' : ''}
          WHERE i.status = 'active' AND bs.quantity <= i.reorder_level) AS low_stock_count,
        (SELECT COUNT(*) FROM inventory_purchase_orders WHERE status IN ('draft','sent','partial_received')) AS pending_pos,
        (SELECT COUNT(*) FROM inventory_goods_receipt WHERE status = 'pending') AS pending_grns,
        (SELECT COUNT(*) FROM inventory_damaged_items) AS damaged_count,
        (SELECT COUNT(*) FROM inventory_allocations WHERE status = 'active') AS active_allocations`
    );

    // Re-run low stock count with branch filter properly
    const lowStock = await query(
      `SELECT i.id, i.name, i.item_code, bs.quantity, i.reorder_level, c.name AS category_name
       FROM inventory_items i
       JOIN inventory_branch_stock bs ON bs.item_id = i.id
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       WHERE i.status = 'active' AND bs.quantity <= i.reorder_level
       ${branchId ? 'AND bs.branch_id = ?' : ''}
       ORDER BY bs.quantity ASC LIMIT 20`,
      branchId ? [branchId] : []
    );

    const stockByBranch = await query(
      `SELECT bs.branch_id, b.name AS branch_name,
              COUNT(DISTINCT bs.item_id) AS item_count,
              SUM(bs.quantity) AS total_qty,
              SUM(bs.quantity * i.unit_cost) AS total_value
       FROM inventory_branch_stock bs
       JOIN inventory_items i ON bs.item_id = i.id
       LEFT JOIN branches b ON bs.branch_id = b.id
       ${branchId ? 'WHERE bs.branch_id = ?' : ''}
       GROUP BY bs.branch_id, b.name`,
      branchId ? [branchId] : []
    );

    const stockByCategory = await query(
      `SELECT c.name AS category_name, COUNT(DISTINCT i.id) AS item_count,
              SUM(bs.quantity) AS total_qty
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       LEFT JOIN inventory_branch_stock bs ON bs.item_id = i.id ${branchId ? 'AND bs.branch_id = ?' : ''}
       WHERE i.status = 'active'
       GROUP BY c.name ORDER BY total_qty DESC LIMIT 10`,
      branchId ? [branchId] : []
    );

    const recentMovements = await query(
      `SELECT m.*, i.name AS item_name, b.name AS branch_name
       FROM inventory_stock_movements m
       JOIN inventory_items i ON m.item_id = i.id
       LEFT JOIN branches b ON m.branch_id = b.id
       ${branchId ? 'WHERE m.branch_id = ?' : ''}
       ORDER BY m.created_at DESC LIMIT 15`,
      branchId ? [branchId] : []
    );

    const pendingPOs = await query(
      `SELECT po.*, s.name AS supplier_name, b.name AS branch_name
       FROM inventory_purchase_orders po
       JOIN inventory_suppliers s ON po.supplier_id = s.id
       LEFT JOIN branches b ON po.branch_id = b.id
       WHERE po.status IN ('draft','sent','partial_received')
       ${branchId ? 'AND po.branch_id = ?' : ''}
       ORDER BY po.created_at DESC LIMIT 10`,
      branchId ? [branchId] : []
    );

    res.json({
      success: true,
      kpis: kpis[0],
      low_stock: lowStock,
      stock_by_branch: stockByBranch,
      stock_by_category: stockByCategory,
      recent_movements: recentMovements,
      pending_pos: pendingPOs,
    });
  } catch (e) { next(e); }
};

// ============ REPORTS ============
export const getStockReport = async (req, res, next) => {
  try {
    const { branch_id, category_id, search } = req.query;
    let sql = `
      SELECT i.id, i.item_code, i.name, i.barcode, c.name AS category_name,
             u.name AS unit_name, u.symbol AS unit_symbol,
             s.name AS supplier_name,
             COALESCE(SUM(bs.quantity), 0) AS total_qty,
             COALESCE(SUM(bs.reserved_qty), 0) AS reserved_qty,
             COALESCE(SUM(bs.available_qty), 0) AS available_qty,
             i.unit_cost, i.selling_price, i.reorder_level, i.status
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      LEFT JOIN inventory_units u ON i.unit_id = u.id
      LEFT JOIN inventory_suppliers s ON i.supplier_id = s.id
      LEFT JOIN inventory_branch_stock bs ON bs.item_id = i.id ${branch_id ? 'AND bs.branch_id = ?' : ''}
      WHERE 1=1`;
    const params = [];
    if (branch_id) params.push(branch_id);
    if (category_id) { sql += ` AND i.category_id = ?`; params.push(category_id); }
    if (search) { sql += ` AND (i.name LIKE ? OR i.item_code LIKE ?)`; const s = `%${search}%`; params.push(s, s); }
    sql += ` GROUP BY i.id ORDER BY i.name ASC`;
    const rows = await query(sql, params);
    res.json({ success: true, items: rows });
  } catch (e) { next(e); }
};

export const getMovementReport = async (req, res, next) => {
  try {
    const { from_date, to_date, movement_type, branch_id, item_id } = req.query;
    let sql = `
      SELECT m.*, i.name AS item_name, i.item_code, b.name AS branch_name, u.name AS user_name
       FROM inventory_stock_movements m
       JOIN inventory_items i ON m.item_id = i.id
       LEFT JOIN branches b ON m.branch_id = b.id
       LEFT JOIN users u ON m.created_by = u.id
       WHERE 1=1`;
    const params = [];
    if (from_date) { sql += ` AND DATE(m.created_at) >= ?`; params.push(from_date); }
    if (to_date) { sql += ` AND DATE(m.created_at) <= ?`; params.push(to_date); }
    if (movement_type) { sql += ` AND m.movement_type = ?`; params.push(movement_type); }
    if (branch_id) { sql += ` AND m.branch_id = ?`; params.push(branch_id); }
    if (item_id) { sql += ` AND m.item_id = ?`; params.push(item_id); }
    sql += ` ORDER BY m.created_at DESC LIMIT 1000`;
    const rows = await query(sql, params);

    const summary = await query(
      `SELECT movement_type, SUM(quantity) AS total_qty, COUNT(*) AS txn_count
       FROM inventory_stock_movements m
       WHERE 1=1
       ${from_date ? 'AND DATE(m.created_at) >= ?' : ''}
       ${to_date ? 'AND DATE(m.created_at) <= ?' : ''}
       ${branch_id ? 'AND m.branch_id = ?' : ''}
       GROUP BY movement_type`,
      [
        ...(from_date ? [from_date] : []),
        ...(to_date ? [to_date] : []),
        ...(branch_id ? [branch_id] : []),
      ]
    );

    res.json({ success: true, movements: rows, summary });
  } catch (e) { next(e); }
};

export const getSupplierReport = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT s.id, s.supplier_code, s.name, s.rating, s.status,
              COUNT(DISTINCT po.id) AS po_count,
              SUM(po.total_amount) AS total_po_value,
              COUNT(DISTINCT CASE WHEN po.status = 'received' THEN po.id END) AS completed_pos,
              COUNT(DISTINCT CASE WHEN gr.status = 'accepted' THEN gr.id END) AS accepted_grns,
              COUNT(DISTINCT CASE WHEN gr.status = 'rejected' THEN gr.id END) AS rejected_grns,
              COUNT(DISTINCT i.id) AS item_count
       FROM inventory_suppliers s
       LEFT JOIN inventory_purchase_orders po ON s.id = po.supplier_id
       LEFT JOIN inventory_goods_receipt gr ON po.id = gr.po_id
       LEFT JOIN inventory_items i ON s.id = i.supplier_id
       GROUP BY s.id
       ORDER BY total_po_value DESC`
    );
    res.json({ success: true, suppliers: rows });
  } catch (e) { next(e); }
};

export const getAllocationReport = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT a.allocated_to_type, a.status,
              COUNT(*) AS allocation_count,
              SUM(a.quantity) AS total_qty,
              SUM(a.quantity * a.unit_cost) AS total_value
       FROM inventory_allocations a
       GROUP BY a.allocated_to_type, a.status`
    );
    const byTarget = await query(
      `SELECT a.allocated_to_type, a.allocated_to_id, i.name AS item_name,
              SUM(a.quantity) AS total_qty, COUNT(*) AS alloc_count
       FROM inventory_allocations a
       JOIN inventory_items i ON a.item_id = i.id
       WHERE a.status = 'active'
       GROUP BY a.allocated_to_type, a.allocated_to_id, i.name
       ORDER BY total_qty DESC LIMIT 50`
    );
    res.json({ success: true, summary: rows, by_target: byTarget });
  } catch (e) { next(e); }
};

export const getDamageReport = async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (from_date) { where += ' AND d.reported_date >= ?'; params.push(from_date); }
    if (to_date) { where += ' AND d.reported_date <= ?'; params.push(to_date); }

    const summary = await query(
      `SELECT d.damage_type, d.action_taken,
              COUNT(*) AS count, SUM(d.quantity) AS total_qty, SUM(d.write_off_value) AS total_value
       FROM inventory_damaged_items d ${where}
       GROUP BY d.damage_type, d.action_taken`,
      params
    );
    const byItem = await query(
      `SELECT i.name AS item_name, i.item_code,
              COUNT(*) AS damage_count, SUM(d.quantity) AS total_qty, SUM(d.write_off_value) AS total_value
       FROM inventory_damaged_items d
       JOIN inventory_items i ON d.item_id = i.id
       ${where}
       GROUP BY i.id ORDER BY total_value DESC LIMIT 20`,
      params
    );
    res.json({ success: true, summary, by_item: byItem });
  } catch (e) { next(e); }
};

// ============ AUDIT TRAIL ============
export const getAuditTrail = async (req, res, next) => {
  try {
    const { entity_type, action, changed_by, from_date, to_date, page = 1, limit = 50 } = req.query;
    let sql = `
      SELECT a.*, u.name AS user_name, u.username
       FROM inventory_audit_trail a
       LEFT JOIN users u ON a.changed_by = u.id
       WHERE 1=1`;
    const params = [];
    if (entity_type) { sql += ` AND a.entity_type = ?`; params.push(entity_type); }
    if (action) { sql += ` AND a.action = ?`; params.push(action); }
    if (changed_by) { sql += ` AND a.changed_by = ?`; params.push(changed_by); }
    if (from_date) { sql += ` AND DATE(a.changed_at) >= ?`; params.push(from_date); }
    if (to_date) { sql += ` AND DATE(a.changed_at) <= ?`; params.push(to_date); }
    sql += ` ORDER BY a.changed_at DESC`;

    const pageNum = Math.max(1, Number(page));
    const pageSize = Math.min(200, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * pageSize;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    const rows = await query(sql, params);

    const countSql = `SELECT COUNT(*) AS total FROM inventory_audit_trail a WHERE 1=1`;
    let countParams = [];
    let countWhere = '';
    if (entity_type) { countWhere += ' AND a.entity_type = ?'; countParams.push(entity_type); }
    if (action) { countWhere += ' AND a.action = ?'; countParams.push(action); }
    if (changed_by) { countWhere += ' AND a.changed_by = ?'; countParams.push(changed_by); }
    if (from_date) { countWhere += ' AND DATE(a.changed_at) >= ?'; countParams.push(from_date); }
    if (to_date) { countWhere += ' AND DATE(a.changed_at) <= ?'; countParams.push(to_date); }
    const [countRows] = await pool.query(countSql + countWhere, countParams);

    res.json({ success: true, audit: rows, total: countRows[0].total, page: pageNum, limit: pageSize });
  } catch (e) { next(e); }
};
