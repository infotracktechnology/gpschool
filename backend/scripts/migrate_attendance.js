import { pool } from '../config/database.js';

const steps = [
  {
    name: "ALTER users — ensure 'teacher' in role ENUM",
    sql: `ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'principal', 'teacher', 'staff', 'student', 'parent') NOT NULL DEFAULT 'student';`,
  },
  {
    name: 'Create staff_profiles table',
    sql: `CREATE TABLE IF NOT EXISTS staff_profiles (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL UNIQUE,
  emp_no        VARCHAR(50) NOT NULL UNIQUE,
  designation   VARCHAR(100),
  department    VARCHAR(100),
  joining_date  DATE,
  qualification VARCHAR(200),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`,
  },
  {
    name: 'Create attendance_timings table',
    sql: `CREATE TABLE IF NOT EXISTS attendance_timings (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  branch_id        INT NOT NULL,
  academic_year_id INT NOT NULL,
  timing_name      VARCHAR(100) NOT NULL,
  session1_start   TIME NOT NULL,
  session1_end     TIME NOT NULL,
  session2_enabled TINYINT(1) DEFAULT 0,
  session2_name    VARCHAR(100),
  session2_start   TIME,
  session2_end     TIME,
  is_active        TINYINT(1) DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);`,
  },
  {
    name: 'Create student_attendance table',
    sql: `CREATE TABLE IF NOT EXISTS student_attendance (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  student_id       INT NOT NULL,
  branch_id        INT NOT NULL,
  academic_year_id INT NOT NULL,
  class_id         INT NOT NULL,
  section_id       INT NOT NULL,
  attendance_date  DATE NOT NULL,
  session          ENUM('session1','session2') DEFAULT 'session1',
  status           ENUM('present','absent','late') NOT NULL,
  marked_by        INT,
  timing_id        INT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_att (student_id, attendance_date, session),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (timing_id) REFERENCES attendance_timings(id) ON DELETE SET NULL
);`,
  },
];

async function runMigration() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('[Migration] Connected to database.');

    for (const step of steps) {
      try {
        await conn.query(step.sql);
        console.log(`[Migration] ✔ ${step.name}`);
      } catch (err) {
        console.error(`[Migration] ✘ ${step.name}: ${err.message}`);
        throw err;
      }
    }

    console.log('[Migration] All steps completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }
}

runMigration();
