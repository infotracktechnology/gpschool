import { query, initDatabase } from '../config/database.js';

const ensureColumn = async (table, column, definition) => {
  const cols = await query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (cols.length === 0) {
    await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[Migration] Added ${table}.${column}`);
  } else {
    console.log(`[Migration] Column ${table}.${column} already exists`);
  }
};

const run = async () => {
  try {
    await initDatabase();

    // 1. Visitor Passes enhancements
    await ensureColumn('visitor_passes', 'id_proof_type', 'VARCHAR(50) NULL');
    await ensureColumn('visitor_passes', 'id_proof_number', 'VARCHAR(100) NULL');
    await ensureColumn('visitor_passes', 'badge_number', 'VARCHAR(50) NULL');
    await ensureColumn('visitor_passes', 'appointment_id', 'INT NULL');

    // 2. Infirmary Medicine Inventory table
    await query(`
      CREATE TABLE IF NOT EXISTS infirmary_medicine_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        medicine_name VARCHAR(150) NOT NULL,
        category VARCHAR(80) DEFAULT 'General',
        batch_no VARCHAR(80) NULL,
        unit VARCHAR(40) DEFAULT 'Tablets',
        quantity_available INT DEFAULT 0,
        reorder_level INT DEFAULT 10,
        expiry_date DATE NULL,
        storage_location VARCHAR(100) DEFAULT 'Infirmary Cabinet A',
        supplier_name VARCHAR(150) NULL,
        status ENUM('in_stock','low_stock','expired','out_of_stock') DEFAULT 'in_stock',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Migration] Verified table infirmary_medicine_inventory');

    // Seed initial medicine inventory if empty
    const [{ cnt }] = await query('SELECT COUNT(*) AS cnt FROM infirmary_medicine_inventory');
    if (Number(cnt) === 0) {
      await query(`
        INSERT INTO infirmary_medicine_inventory
          (medicine_name, category, batch_no, unit, quantity_available, reorder_level, expiry_date, storage_location, supplier_name, status, notes)
        VALUES
          ('Paracetamol 500mg Tablets', 'Analgesic / Antipyretic', 'PCM-2026-A1', 'Tablets', 120, 25, '2027-08-31', 'Cabinet A - Shelf 1', 'MedCare Pharma', 'in_stock', 'Standard fever and headache relief'),
          ('Paracetamol Suspension (120mg/5ml)', 'Analgesic / Antipyretic', 'PCMS-2026-B4', 'Bottles', 12, 5, '2027-05-15', 'Cabinet A - Shelf 2', 'MedCare Pharma', 'in_stock', 'Pediatric syrup for lower grades'),
          ('Electral ORS Sachet (21.8g)', 'Hydration / ORS', 'ORS-2026-C2', 'Sachets', 45, 15, '2027-11-30', 'Cabinet B - Shelf 1', 'FDC Medicals', 'in_stock', 'Dehydration and heat exhaustion'),
          ('Povidone-Iodine Antiseptic Solution (100ml)', 'Antiseptic', 'BET-2026-09', 'Bottles', 8, 5, '2027-03-30', 'First-Aid Dressing Tray', 'Win-Medicare', 'in_stock', 'Wound cleansing and playground scrapes'),
          ('Sterile Cotton Gauze & Adhesive Bandages', 'First-Aid / Dressing', 'GAU-2026-11', 'Packs', 60, 20, '2028-01-31', 'First-Aid Dressing Tray', 'Surgicare India', 'in_stock', 'Minor cuts and abrasion dressing'),
          ('Cetirizine 10mg Anti-Allergy', 'Antihistamine', 'CET-2026-04', 'Tablets', 8, 15, '2027-02-28', 'Cabinet A - Shelf 3', 'Cipla Health', 'low_stock', 'Mild allergic reactions and cold symptoms')
      `);
      console.log('[Migration] Seeded initial infirmary_medicine_inventory records');
    }

    // 3. Link dispensing logs optionally to inventory
    await ensureColumn('medicine_dispensing_logs', 'inventory_id', 'INT NULL');
    await ensureColumn('medicine_dispensing_logs', 'quantity_units', 'INT DEFAULT 1');

    // 4. Parent Emergency / Health Notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS parent_health_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        notification_number VARCHAR(50) NULL,
        student_id INT NULL,
        student_name VARCHAR(150) NOT NULL,
        class_section VARCHAR(50) NULL,
        visit_id INT NULL,
        parent_name VARCHAR(150) NULL,
        parent_phone VARCHAR(30) NULL,
        channel ENUM('Phone Call','SMS','WhatsApp','In-Person','Email') DEFAULT 'Phone Call',
        urgency ENUM('Routine','Urgent','Emergency') DEFAULT 'Routine',
        message_summary TEXT NOT NULL,
        response_status ENUM('Notified','Acknowledged','Parent En Route','No Answer') DEFAULT 'Notified',
        notified_by VARCHAR(150) DEFAULT 'School Nurse',
        notified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Migration] Verified table parent_health_notifications');

    console.log('[Migration] Completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Error:', error);
    process.exit(1);
  }
};

run();
