import { pool } from '../config/database.js';

async function migrate() {
  try {
    console.log('[Migration] Starting Student Management Suite migration...');

    // 1. Create students table
    console.log('[Migration] Creating `students` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admission_no VARCHAR(100) UNIQUE NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        gender ENUM('male', 'female', 'other') NOT NULL,
        dob DATE NOT NULL,
        blood_group VARCHAR(10) NULL,
        aadhaar_no VARCHAR(20) NULL,
        religion VARCHAR(50) NULL,
        caste_category VARCHAR(50) NULL,
        nationality VARCHAR(50) DEFAULT 'Indian',
        mother_tongue VARCHAR(50) NULL,
        avatar_url VARCHAR(500) NULL,
        father_name VARCHAR(255) NULL,
        father_phone VARCHAR(50) NULL,
        father_email VARCHAR(255) NULL,
        father_occupation VARCHAR(100) NULL,
        mother_name VARCHAR(255) NULL,
        mother_phone VARCHAR(50) NULL,
        guardian_name VARCHAR(255) NULL,
        guardian_phone VARCHAR(50) NULL,
        street_address TEXT NULL,
        city VARCHAR(100) NULL,
        state VARCHAR(100) NULL,
        pincode VARCHAR(20) NULL,
        emergency_contact_name VARCHAR(255) NULL,
        emergency_contact_phone VARCHAR(50) NULL,
        medical_notes TEXT NULL,
        bus_stop VARCHAR(255) NULL,
        previous_school VARCHAR(255) NULL,
        status ENUM('active', 'inactive', 'transferred', 'graduated') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_students_status (status),
        INDEX idx_students_name (student_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create academic_groups table
    console.log('[Migration] Creating `academic_groups` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS academic_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL,
        class_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ag_branch (branch_id),
        INDEX idx_ag_class (class_id),
        CONSTRAINT fk_ag_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_ag_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Create academic_group_subjects table
    console.log('[Migration] Creating `academic_group_subjects` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS academic_group_subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        subject_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_group_subject (group_id, subject_id),
        CONSTRAINT fk_ags_group FOREIGN KEY (group_id) REFERENCES academic_groups(id) ON DELETE CASCADE,
        CONSTRAINT fk_ags_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Create student_enrollments table
    console.log('[Migration] Creating `student_enrollments` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        branch_id INT NOT NULL,
        academic_year_id INT NOT NULL,
        class_id INT NOT NULL,
        section_id INT NOT NULL,
        roll_no VARCHAR(50) NULL,
        admission_category VARCHAR(50) DEFAULT 'general',
        academic_group_id INT NULL,
        enrollment_status ENUM('current', 'promoted', 'detained', 'transferred', 'inactive') DEFAULT 'current',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_se_student (student_id),
        INDEX idx_se_branch_year (branch_id, academic_year_id),
        INDEX idx_se_class_section (class_id, section_id),
        INDEX idx_se_enrollment_status (enrollment_status),
        CONSTRAINT fk_se_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        CONSTRAINT fk_se_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_se_year FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_se_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_se_section FOREIGN KEY (section_id) REFERENCES branch_class_sections(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_se_group FOREIGN KEY (academic_group_id) REFERENCES academic_groups(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Create student_subject_mappings table
    console.log('[Migration] Creating `student_subject_mappings` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_subject_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        enrollment_id INT NOT NULL,
        subject_id INT NOT NULL,
        is_elective BOOLEAN DEFAULT FALSE,
        status ENUM('active', 'dropped') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_enrollment_subject (enrollment_id, subject_id),
        CONSTRAINT fk_ssm_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        CONSTRAINT fk_ssm_enrollment FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
        CONSTRAINT fk_ssm_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Create transfer_certificates table
    console.log('[Migration] Creating `transfer_certificates` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transfer_certificates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tc_no VARCHAR(100) UNIQUE NOT NULL,
        student_id INT NOT NULL,
        enrollment_id INT NOT NULL,
        branch_id INT NOT NULL,
        issue_date DATE NOT NULL,
        leaving_date DATE NOT NULL,
        reason_for_leaving TEXT NULL,
        conduct VARCHAR(100) DEFAULT 'Good',
        dues_cleared BOOLEAN DEFAULT TRUE,
        last_class_studied VARCHAR(100) NULL,
        promoted_to_class VARCHAR(100) NULL,
        remarks TEXT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tc_branch (branch_id),
        INDEX idx_tc_student (student_id),
        CONSTRAINT fk_tc_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        CONSTRAINT fk_tc_enrollment FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
        CONSTRAINT fk_tc_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT fk_tc_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Update users table role enum to support student & parent
    console.log('[Migration] Updating `users.role` enum to include student and parent...');
    try {
      await pool.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('super_admin','admin','principal','teacher','staff','student','parent') NOT NULL DEFAULT 'student'
      `);
      console.log('[Migration] `users.role` updated successfully.');
    } catch (uErr) {
      console.warn('[Migration Warning] Could not modify users.role:', uErr.message);
    }

    // 8. Migrate any existing admissions rows into students + student_enrollments
    console.log('[Migration] Checking for existing admissions to migrate...');
    const [admissions] = await pool.query('SELECT * FROM admissions');
    console.log(`[Migration] Found ${admissions.length} admissions records.`);

    for (const adm of admissions) {
      if (!adm.admission_no) continue;

      // Check if student exists
      const [existingStudent] = await pool.query(
        'SELECT id FROM students WHERE admission_no = ?',
        [adm.admission_no]
      );

      let studentId;
      if (existingStudent.length === 0) {
        const [appDetails] = adm.application_id
          ? await pool.query('SELECT * FROM applications WHERE id = ?', [adm.application_id])
          : [[]];
        const app = appDetails[0] || {};

        const [insertRes] = await pool.query(
          `INSERT INTO students
           (admission_no, student_name, gender, dob, blood_group, aadhaar_no, religion,
            caste_category, nationality, mother_tongue, avatar_url, father_name, father_phone,
            father_occupation, mother_name, mother_phone, street_address, city,
            emergency_contact_name, emergency_contact_phone, previous_school, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            adm.admission_no,
            adm.student_name,
            adm.gender || 'other',
            adm.dob || '2015-01-01',
            app.blood_group || null,
            app.aadhaar_no || null,
            app.religion || null,
            app.caste_category || null,
            app.nationality || 'Indian',
            app.mother_tongue || null,
            app.avatar_url || null,
            adm.parent_name || app.father_name || null,
            adm.primary_phone || app.father_phone || null,
            app.father_occupation || null,
            app.mother_name || null,
            app.mother_phone || null,
            adm.address_street || app.address_street || null,
            adm.city || app.city || null,
            adm.emergency_contact_name || adm.parent_name || null,
            adm.emergency_contact_phone || adm.primary_phone || null,
            app.prev_school_name || null,
            adm.enrollment_status === 'inactive' ? 'inactive' : 'active',
          ]
        );
        studentId = insertRes.insertId;
      } else {
        studentId = existingStudent[0].id;
      }

      // Check enrollment
      const [existingEnrollment] = await pool.query(
        `SELECT id FROM student_enrollments 
         WHERE student_id = ? AND academic_year_id = ?`,
        [studentId, adm.academic_year_id]
      );

      if (existingEnrollment.length === 0) {
        await pool.query(
          `INSERT INTO student_enrollments
           (student_id, branch_id, academic_year_id, class_id, section_id, roll_no, admission_category, enrollment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            studentId,
            adm.branch_id,
            adm.academic_year_id,
            adm.class_id,
            adm.section_id,
            adm.roll_no || null,
            adm.admission_category || 'general',
            adm.enrollment_status === 'active' ? 'current' : 'inactive',
          ]
        );
      }
    }

    console.log('[Migration] Student Management Suite migration completed successfully!');
  } catch (err) {
    console.error('[Migration Error]:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
