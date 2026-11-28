import { initDatabase, query } from '../config/database.js';

const statements = [
  `CREATE TABLE IF NOT EXISTS hostel_hostels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(40) NULL,
    hostel_type ENUM('boys','girls','co-ed') NOT NULL DEFAULT 'co-ed',
    address VARCHAR(255) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hostel_name (branch_id, academic_year_id, name),
    INDEX idx_hostel_scope (branch_id, academic_year_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_wardens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    hostel_id INT NOT NULL,
    staff_id INT NULL,
    name VARCHAR(160) NOT NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(160) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hostel_wardens_scope (branch_id, academic_year_id),
    INDEX idx_hostel_wardens_hostel (hostel_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    hostel_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hostel_block (hostel_id, name),
    INDEX idx_hostel_blocks_scope (branch_id, academic_year_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_floors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    block_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    floor_number INT NOT NULL DEFAULT 0,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hostel_floor (block_id, floor_number),
    INDEX idx_hostel_floors_scope (branch_id, academic_year_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    floor_id INT NOT NULL,
    room_number VARCHAR(40) NOT NULL,
    room_type VARCHAR(60) NULL,
    capacity INT NOT NULL DEFAULT 1,
    status ENUM('active','inactive','maintenance') NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hostel_room (floor_id, room_number),
    INDEX idx_hostel_rooms_scope (branch_id, academic_year_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_beds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    room_id INT NOT NULL,
    bed_number VARCHAR(40) NOT NULL,
    status ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hostel_bed (room_id, bed_number),
    INDEX idx_hostel_beds_scope (branch_id, academic_year_id),
    INDEX idx_hostel_beds_room_status (room_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    student_id INT NOT NULL,
    bed_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hostel_allocations_scope (branch_id, academic_year_id),
    INDEX idx_hostel_allocations_student (student_id, status),
    INDEX idx_hostel_allocations_bed (bed_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    student_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    movement ENUM('in','out') NOT NULL,
    movement_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT NULL,
    remarks VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hostel_attendance_scope (branch_id, academic_year_id),
    INDEX idx_hostel_attendance_student_date (student_id, attendance_date, movement_time)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_gate_passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    student_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    departure_at DATETIME NOT NULL,
    expected_return_at DATETIME NOT NULL,
    actual_return_at DATETIME NULL,
    status ENUM('pending','approved','rejected','departed','completed','cancelled') NOT NULL DEFAULT 'pending',
    actual_departure_at DATETIME NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    review_note VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hostel_gate_pass_scope (branch_id, academic_year_id),
    INDEX idx_hostel_gate_pass_student (student_id, status),
    INDEX idx_hostel_gate_pass_departure (departure_at, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    student_id INT NOT NULL,
    allocation_id INT NULL,
    fee_name VARCHAR(120) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    due_date DATE NULL,
    frequency ENUM('monthly','term','annual','one_time','custom') NOT NULL DEFAULT 'monthly',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hostel_fees_scope (branch_id, academic_year_id),
    INDEX idx_hostel_fees_student (student_id, status),
    INDEX idx_hostel_fees_due (due_date, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_fee_collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    fee_id INT NOT NULL,
    student_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(40) NULL,
    receipt_number VARCHAR(60) NOT NULL,
    reference_number VARCHAR(100) NULL,
    notes TEXT NULL,
    collected_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hostel_receipt (branch_id, receipt_number),
    INDEX idx_hostel_collections_scope (branch_id, academic_year_id),
    INDEX idx_hostel_collections_fee (fee_id),
    INDEX idx_hostel_collections_student (student_id, payment_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_mess_menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    hostel_id INT NOT NULL,
    menu_date DATE NOT NULL,
    meal_type ENUM('breakfast','lunch','snacks','dinner') NOT NULL,
    menu TEXT NOT NULL,
    notes VARCHAR(500) NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hostel_meal (hostel_id, menu_date, meal_type),
    INDEX idx_hostel_mess_scope (branch_id, academic_year_id, menu_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    student_id INT NOT NULL,
    category VARCHAR(80) NOT NULL,
    subject VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
    assigned_to INT NULL,
    resolution TEXT NULL,
    resolved_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hostel_complaints_scope (branch_id, academic_year_id),
    INDEX idx_hostel_complaints_student (student_id, status),
    INDEX idx_hostel_complaints_status (status, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS hostel_maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    room_id INT NULL,
    bed_id INT NULL,
    issue_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
    status ENUM('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
    reported_by INT NULL,
    assigned_to INT NULL,
    cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    scheduled_date DATE NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hostel_maintenance_scope (branch_id, academic_year_id),
    INDEX idx_hostel_maintenance_status (status, priority),
    INDEX idx_hostel_maintenance_room (room_id, bed_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

const run = async () => {
  try {
    await initDatabase();
    for (const statement of statements) {
      await query(statement);
      const table = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`[Hostel Migration] Verified ${table}`);
    }
    console.log('[Hostel Migration] All tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('[Hostel Migration] Failed:', error);
    process.exit(1);
  }
};

run();
