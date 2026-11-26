import { query, initDatabase } from '../config/database.js';

const run = async () => {
  try {
    await initDatabase();

    // 1. Categories (self-referencing hierarchy)
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        parent_category_id INT NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_parent (parent_category_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_categories');

    // 2. Units
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(60) NOT NULL,
        symbol VARCHAR(20) NULL,
        unit_type ENUM('quantity','weight','volume','length') DEFAULT 'quantity',
        conversion_factor DECIMAL(12,4) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_units');

    // 3. Suppliers
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplier_code VARCHAR(30) NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(120) NULL,
        phone VARCHAR(30) NULL,
        alt_phone VARCHAR(30) NULL,
        email VARCHAR(150) NULL,
        address_line1 VARCHAR(255) NULL,
        address_line2 VARCHAR(255) NULL,
        city VARCHAR(100) NULL,
        state VARCHAR(100) NULL,
        pincode VARCHAR(10) NULL,
        gstin VARCHAR(20) NULL,
        pan VARCHAR(12) NULL,
        bank_name VARCHAR(150) NULL,
        bank_account_no VARCHAR(50) NULL,
        bank_ifsc VARCHAR(15) NULL,
        payment_terms_days INT DEFAULT 30,
        credit_limit DECIMAL(12,2) NULL,
        rating TINYINT NULL,
        status ENUM('active','inactive') DEFAULT 'active',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_suppliers');

    // 4. Items
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_code VARCHAR(40) NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        category_id INT NULL,
        unit_id INT NULL,
        supplier_id INT NULL,
        description TEXT NULL,
        brand VARCHAR(120) NULL,
        model_no VARCHAR(120) NULL,
        barcode VARCHAR(80) NULL,
        hscode VARCHAR(20) NULL,
        reorder_level DECIMAL(12,2) DEFAULT 0,
        reorder_qty DECIMAL(12,2) DEFAULT 0,
        safety_stock DECIMAL(12,2) DEFAULT 0,
        unit_cost DECIMAL(12,2) DEFAULT 0,
        selling_price DECIMAL(12,2) NULL,
        min_selling_price DECIMAL(12,2) NULL,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_code VARCHAR(20) NULL,
        hsn_code VARCHAR(20) NULL,
        image_url VARCHAR(500) NULL,
        is_perishable TINYINT(1) DEFAULT 0,
        shelf_life_days INT NULL,
        storage_conditions VARCHAR(255) NULL,
        weight_kg DECIMAL(10,3) NULL,
        dimensions_length DECIMAL(10,2) NULL,
        dimensions_width DECIMAL(10,2) NULL,
        dimensions_height DECIMAL(10,2) NULL,
        status ENUM('active','discontinued') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category_id),
        INDEX idx_unit (unit_id),
        INDEX idx_supplier (supplier_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_items');

    // 5. Branch stock
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_branch_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        branch_id INT NOT NULL,
        quantity DECIMAL(12,2) DEFAULT 0,
        reserved_qty DECIMAL(12,2) DEFAULT 0,
        available_qty DECIMAL(12,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_item_branch (item_id, branch_id),
        INDEX idx_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_branch_stock');

    // 6. Stock movements
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        branch_id INT NOT NULL,
        movement_type ENUM('in','out','transfer_in','transfer_out','damaged','adjustment') NOT NULL,
        quantity DECIMAL(12,2) NOT NULL,
        reference_type ENUM('po','grn','allocation','transfer','manual','damaged') NULL,
        reference_id INT NULL,
        batch_no VARCHAR(60) NULL,
        expiry_date DATE NULL,
        reason VARCHAR(255) NULL,
        notes TEXT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_item (item_id),
        INDEX idx_branch (branch_id),
        INDEX idx_type (movement_type),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_stock_movements');

    // 7. Purchase orders
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_number VARCHAR(50) NOT NULL UNIQUE,
        branch_id INT NOT NULL,
        supplier_id INT NOT NULL,
        order_date DATE NOT NULL,
        expected_date DATE NULL,
        status ENUM('draft','sent','partial_received','received','cancelled') DEFAULT 'draft',
        subtotal DECIMAL(14,2) DEFAULT 0,
        tax_amount DECIMAL(14,2) DEFAULT 0,
        total_amount DECIMAL(14,2) DEFAULT 0,
        payment_terms VARCHAR(150) NULL,
        shipping_address TEXT NULL,
        billing_address TEXT NULL,
        remarks TEXT NULL,
        approved_by INT NULL,
        approved_date DATETIME NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_branch (branch_id),
        INDEX idx_supplier (supplier_id),
        INDEX idx_status (status),
        INDEX idx_order_date (order_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_purchase_orders');

    // 8. PO items
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity DECIMAL(12,2) NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        line_total DECIMAL(14,2) NOT NULL,
        received_qty DECIMAL(12,2) DEFAULT 0,
        disputed_qty DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_po (po_id),
        INDEX idx_item (item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_purchase_order_items');

    // 9. Goods receipt
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_goods_receipt (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grn_number VARCHAR(50) NOT NULL UNIQUE,
        po_id INT NULL,
        branch_id INT NOT NULL,
        receipt_date DATE NOT NULL,
        received_by INT NULL,
        status ENUM('pending','inspected','accepted','rejected') DEFAULT 'pending',
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_po (po_id),
        INDEX idx_branch (branch_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_goods_receipt');

    // 10. GRN items
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_goods_receipt_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grn_id INT NOT NULL,
        po_item_id INT NULL,
        item_id INT NOT NULL,
        quantity_received DECIMAL(12,2) NOT NULL,
        quantity_accepted DECIMAL(12,2) DEFAULT 0,
        quantity_rejected DECIMAL(12,2) DEFAULT 0,
        batch_no VARCHAR(60) NULL,
        expiry_date DATE NULL,
        notes TEXT NULL,
        INDEX idx_grn (grn_id),
        INDEX idx_item (item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_goods_receipt_items');

    // 11. Allocations
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_allocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        branch_id INT NOT NULL,
        allocated_to_type ENUM('department','class','section') NOT NULL,
        allocated_to_id INT NOT NULL,
        quantity DECIMAL(12,2) NOT NULL,
        unit_cost DECIMAL(12,2) DEFAULT 0,
        allocated_date DATE NOT NULL,
        allocated_by INT NULL,
        return_date DATE NULL,
        status ENUM('active','returned') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_item (item_id),
        INDEX idx_branch (branch_id),
        INDEX idx_target (allocated_to_type, allocated_to_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_allocations');

    // 12. Damaged items
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_damaged_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        branch_id INT NOT NULL,
        quantity DECIMAL(12,2) NOT NULL,
        damage_type ENUM('damaged','lost','expired') NOT NULL,
        damage_reason VARCHAR(255) NULL,
        reported_by INT NULL,
        reported_date DATE NOT NULL,
        inspected_by INT NULL,
        inspection_date DATE NULL,
        action_taken ENUM('write_off','repair','return_to_supplier') NULL,
        write_off_value DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_item (item_id),
        INDEX idx_branch (branch_id),
        INDEX idx_damage_type (damage_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_damaged_items');

    // 13. Audit trail
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_audit_trail (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT NOT NULL,
        action ENUM('create','update','delete','status_change') NOT NULL,
        old_values JSON NULL,
        new_values JSON NULL,
        changed_by INT NULL,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(50) NULL,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_changed (changed_at),
        INDEX idx_user (changed_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Inventory Migration] Verified inventory_audit_trail');

    // Seed default units
    const existingUnits = await query('SELECT COUNT(*) AS cnt FROM inventory_units');
    if (existingUnits[0].cnt === 0) {
      await query(`
        INSERT INTO inventory_units (name, symbol, unit_type, conversion_factor) VALUES
        ('Piece', 'pcs', 'quantity', 1),
        ('Box', 'box', 'quantity', 1),
        ('Pack', 'pk', 'quantity', 1),
        ('Dozen', 'dz', 'quantity', 12),
        ('Ream', 'rm', 'quantity', 500),
        ('Bottle', 'btl', 'quantity', 1),
        ('Kg', 'kg', 'weight', 1),
        ('Gram', 'g', 'weight', 0.001),
        ('Litre', 'L', 'volume', 1),
        ('ML', 'ml', 'volume', 0.001),
        ('Metre', 'm', 'length', 1),
        ('Cm', 'cm', 'length', 0.01)
      `);
      console.log('[Inventory Migration] Seeded default units');
    }

    console.log('[Inventory Migration] All tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('[Inventory Migration] Failed:', error);
    process.exit(1);
  }
};

run();
