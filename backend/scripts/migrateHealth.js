import { pool } from '../config/database.js';

export const migrateHealthTables = async () => {
  console.log('[Migration] Creating Health & Infirmary tables...');

  // 1. health_profiles
  await pool.query(`
    CREATE TABLE IF NOT EXISTS health_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_type ENUM('student', 'staff') NOT NULL DEFAULT 'student',
      student_id INT NULL,
      staff_id INT NULL,
      blood_group VARCHAR(10) NULL,
      height_cm DECIMAL(5,2) NULL,
      weight_kg DECIMAL(5,2) NULL,
      bmi DECIMAL(4,1) NULL,
      known_allergies TEXT NULL,
      chronic_conditions TEXT NULL,
      medical_notes TEXT NULL,
      identification_mark TEXT NULL,
      emergency_contact_name VARCHAR(150) NULL,
      emergency_contact_phone VARCHAR(20) NULL,
      emergency_contact_relation VARCHAR(50) NULL,
      doctor_name VARCHAR(150) NULL,
      doctor_phone VARCHAR(20) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_student (student_id),
      UNIQUE KEY uq_staff (staff_id),
      INDEX idx_blood (blood_group)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 2. infirmary_visits
  await pool.query(`
    CREATE TABLE IF NOT EXISTS infirmary_visits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      visit_number VARCHAR(50) NOT NULL UNIQUE,
      patient_type ENUM('student', 'staff') NOT NULL DEFAULT 'student',
      student_id INT NULL,
      staff_id INT NULL,
      patient_name VARCHAR(150) NOT NULL,
      class_section VARCHAR(50) NULL,
      department VARCHAR(100) NULL,
      visit_date DATE NOT NULL,
      visit_time VARCHAR(20) NOT NULL,
      visit_type ENUM('illness', 'injury', 'routine', 'other') DEFAULT 'illness',
      chief_complaint TEXT NOT NULL,
      treatment_given TEXT NOT NULL,
      temperature_f DECIMAL(4,1) NULL,
      pulse_bpm INT NULL,
      disposition ENUM('sent_back_to_class', 'resting_in_bay', 'sent_home', 'referred_hospital') DEFAULT 'sent_back_to_class',
      bed_number VARCHAR(20) NULL,
      attended_by VARCHAR(150) NULL,
      remarks TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_visit_no (visit_number),
      INDEX idx_visit_date (visit_date),
      INDEX idx_student (student_id),
      INDEX idx_staff (staff_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. health_checkups
  await pool.query(`
    CREATE TABLE IF NOT EXISTS health_checkups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      student_name VARCHAR(150) NOT NULL,
      class_section VARCHAR(50) NULL,
      checkup_date DATE NOT NULL,
      height_cm DECIMAL(5,2) NULL,
      weight_kg DECIMAL(5,2) NULL,
      vision_left VARCHAR(20) NULL,
      vision_right VARCHAR(20) NULL,
      dental_status VARCHAR(100) DEFAULT 'Healthy',
      ent_status VARCHAR(100) DEFAULT 'Normal',
      general_fitness VARCHAR(100) DEFAULT 'Fit',
      doctor_remarks TEXT NULL,
      examiner_name VARCHAR(150) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_chk_student (student_id),
      INDEX idx_chk_date (checkup_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 4. medicine_dispensing_logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS medicine_dispensing_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_type ENUM('student', 'staff') NOT NULL DEFAULT 'student',
      patient_name VARCHAR(150) NOT NULL,
      class_or_dept VARCHAR(100) NULL,
      medicine_name VARCHAR(150) NOT NULL,
      dosage_qty VARCHAR(50) NOT NULL,
      reason TEXT NULL,
      dispensed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      dispensed_by VARCHAR(150) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_med_date (dispensed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. doctor_consultations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctor_consultations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      consultation_number VARCHAR(50) NOT NULL UNIQUE,
      doctor_name VARCHAR(150) NOT NULL,
      doctor_reg_no VARCHAR(100) NULL,
      patient_type ENUM('student', 'staff') NOT NULL DEFAULT 'student',
      student_id INT NULL,
      staff_id INT NULL,
      patient_name VARCHAR(150) NOT NULL,
      class_or_dept VARCHAR(100) NULL,
      consultation_date DATE NOT NULL,
      symptoms TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      prescription TEXT NULL,
      advice_and_rest TEXT NULL,
      follow_up_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_doc_date (consultation_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('[Migration] Health tables created successfully!');
};

if (process.argv[1]?.includes('migrateHealth.js')) {
  migrateHealthTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migration Error]:', err);
      process.exit(1);
    });
}
