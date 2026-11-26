import { pool } from '../config/database.js';

export const migrateVisitorTables = async () => {
  console.log('[Migration] Creating Visitor Management tables...');

  // 1. visitors
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(100) NULL,
      photo_url LONGTEXT NULL,
      visitor_type VARCHAR(50) DEFAULT 'Guest',
      address VARCHAR(255) NULL,
      id_proof_type VARCHAR(50) NULL,
      id_proof_number VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 2. visitor_passes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitor_passes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pass_number VARCHAR(50) NOT NULL UNIQUE,
      visitor_id INT NOT NULL,
      visitor_name VARCHAR(150) NOT NULL,
      visitor_phone VARCHAR(20) NOT NULL,
      photo_url LONGTEXT NULL,
      branch_id INT DEFAULT 1,
      purpose VARCHAR(100) NOT NULL,
      purpose_details TEXT NULL,
      person_to_meet_id INT NULL,
      person_to_meet_name VARCHAR(150) NULL,
      department VARCHAR(100) NULL,
      student_id INT NULL,
      student_name VARCHAR(150) NULL,
      student_class_section VARCHAR(50) NULL,
      vehicle_type VARCHAR(30) DEFAULT 'None',
      vehicle_number VARCHAR(50) NULL,
      accompanying_count INT DEFAULT 0,
      check_in_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expected_duration_minutes INT DEFAULT 60,
      check_out_time DATETIME NULL,
      status ENUM('active', 'checked_out', 'overstayed') DEFAULT 'active',
      created_by INT NULL,
      exit_remarks TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pass_no (pass_number),
      INDEX idx_status (status),
      INDEX idx_check_in (check_in_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. visitor_appointments
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitor_appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appointment_number VARCHAR(50) NOT NULL UNIQUE,
      visitor_name VARCHAR(150) NOT NULL,
      visitor_phone VARCHAR(20) NOT NULL,
      visitor_email VARCHAR(100) NULL,
      person_to_meet_id INT NULL,
      person_to_meet_name VARCHAR(150) NOT NULL,
      department VARCHAR(100) NULL,
      appointment_date DATE NOT NULL,
      appointment_time VARCHAR(20) NOT NULL,
      purpose VARCHAR(100) NOT NULL,
      notes TEXT NULL,
      status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',
      staff_remarks TEXT NULL,
      approved_by INT NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_apt_no (appointment_number),
      INDEX idx_apt_date (appointment_date),
      INDEX idx_apt_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 4. visitor_host_extensions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitor_host_extensions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      staff_id INT UNIQUE NOT NULL,
      cabin_room VARCHAR(50) DEFAULT 'Main Staff Room',
      intercom VARCHAR(20) DEFAULT '101',
      visiting_hours VARCHAR(100) DEFAULT '2:30 PM - 3:30 PM',
      is_available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('[Migration] Visitor tables created successfully!');
};

if (process.argv[1]?.includes('migrateVisitors.js')) {
  migrateVisitorTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migration Error]:', err);
      process.exit(1);
    });
}
