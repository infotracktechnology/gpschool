import { query, initDatabase } from '../config/database.js';

const ensureColumn = async (table, column, definition) => {
  const cols = await query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (cols.length === 0) {
    await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[Cert Migration] Added ${table}.${column}`);
  }
};

const run = async () => {
  try {
    await initDatabase();

    // 1. Ensure transfer_certificates also carries detailed CBSE TC fields
    await ensureColumn('transfer_certificates', 'application_date', 'DATE NULL');
    await ensureColumn('transfer_certificates', 'month_dues_paid', 'VARCHAR(80) NULL');
    await ensureColumn('transfer_certificates', 'last_exam_result', 'VARCHAR(150) NULL');
    await ensureColumn('transfer_certificates', 'failed_status', 'VARCHAR(30) NULL');
    await ensureColumn('transfer_certificates', 'working_days', 'INT NULL');
    await ensureColumn('transfer_certificates', 'present_days', 'INT NULL');
    await ensureColumn('transfer_certificates', 'subjects_studied', 'TEXT NULL');
    await ensureColumn('transfer_certificates', 'fee_concession', 'VARCHAR(100) NULL');
    await ensureColumn('transfer_certificates', 'extra_activities', 'TEXT NULL');

    // 2. Certificate Templates table
    await query(`
      CREATE TABLE IF NOT EXISTS certificate_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        certificate_type ENUM('bonafide','tc','study','conduct','character','custom') NOT NULL,
        recipient_scope ENUM('student','staff','both') DEFAULT 'student',
        category_badge VARCHAR(80) DEFAULT 'OFFICIAL INSTITUTIONAL RECORD',
        title_heading VARCHAR(200) NOT NULL,
        body_template TEXT NOT NULL,
        footer_note TEXT NULL,
        border_style ENUM('classic_double','royal_seal','minimal_mono','cbse_formal') DEFAULT 'classic_double',
        color_theme ENUM('monochrome','crimson_gold','navy_royal') DEFAULT 'monochrome',
        signature_layout ENUM('principal_only','principal_seal','principal_teacher') DEFAULT 'principal_seal',
        show_student_photo TINYINT(1) DEFAULT 1,
        show_qr_verification TINYINT(1) DEFAULT 1,
        is_default TINYINT(1) DEFAULT 0,
        status ENUM('active','inactive') DEFAULT 'active',
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Cert Migration] Verified certificate_templates table');

    // 3. Issued Certificates & Approval Workflow table
    await query(`
      CREATE TABLE IF NOT EXISTS issued_certificates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        certificate_no VARCHAR(80) NOT NULL UNIQUE,
        certificate_type ENUM('bonafide','tc','study','conduct','character','custom') NOT NULL,
        template_id INT NULL,
        tc_id INT NULL,
        recipient_type ENUM('student','staff') DEFAULT 'student',
        student_id INT NULL,
        staff_id INT NULL,
        branch_id INT NULL,
        academic_year_id INT NULL,
        recipient_name VARCHAR(150) NOT NULL,
        ref_no VARCHAR(80) NULL,
        class_or_dept VARCHAR(120) NULL,
        father_name VARCHAR(150) NULL,
        mother_name VARCHAR(150) NULL,
        dob DATE NULL,
        gender VARCHAR(30) NULL,
        nationality VARCHAR(60) NULL,
        photo_url LONGTEXT NULL,
        title_heading VARCHAR(200) NOT NULL,
        rendered_body TEXT NOT NULL,
        footer_note TEXT NULL,
        border_style ENUM('classic_double','royal_seal','minimal_mono','cbse_formal') DEFAULT 'classic_double',
        color_theme ENUM('monochrome','crimson_gold','navy_royal') DEFAULT 'monochrome',
        signature_layout ENUM('principal_only','principal_seal','principal_teacher') DEFAULT 'principal_seal',
        show_student_photo TINYINT(1) DEFAULT 1,
        show_qr_verification TINYINT(1) DEFAULT 1,
        purpose VARCHAR(200) NULL,
        period_from VARCHAR(80) NULL,
        period_to VARCHAR(80) NULL,
        conduct_grade VARCHAR(80) NULL,
        custom_fields JSON NULL,
        issue_date DATE NULL,
        status ENUM('pending_approval','approved','issued','rejected','revoked') DEFAULT 'pending_approval',
        requested_by INT NULL,
        approved_by INT NULL,
        approval_remarks TEXT NULL,
        approved_at DATETIME NULL,
        issued_at DATETIME NULL,
        reprint_count INT DEFAULT 0,
        revoke_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Cert Migration] Verified issued_certificates table');

    // 4. Pre-seed official CBSE certificate templates if empty
    const [{ cnt }] = await query('SELECT COUNT(*) AS cnt FROM certificate_templates');
    if (Number(cnt) === 0) {
      const seedTemplates = [
        [
          'BON-STD-01',
          'Standard Student Bonafide Certificate',
          'bonafide',
          'student',
          'OFFICE OF THE PRINCIPAL • BONAFIDE RECORD',
          'BONAFIDE CERTIFICATE',
          `This is to certify that Master/Miss {{student_name}}, son/daughter of Mr. {{father_name}} and Mrs. {{mother_name}}, bearing Admission No. {{admission_no}}, is a bonafide student of this institution currently studying in {{class_section}} during the Academic Year {{academic_year}}.\n\nAs per our school admission register, his/her Date of Birth is {{dob}}. During his/her period of study at {{branch_name}}, he/she has maintained satisfactory attendance and discipline.\n\nThis certificate is issued upon request for the purpose of: {{purpose}}.`,
          'Verified from General Admission & Enrolment Register.',
          'classic_double',
          'monochrome',
          'principal_seal',
          1,
          1,
          1,
        ],
        [
          'BON-STF-01',
          'Staff Service & Employment Bonafide',
          'bonafide',
          'staff',
          'HUMAN RESOURCES & ADMINISTRATION',
          'SERVICE & EMPLOYMENT BONAFIDE CERTIFICATE',
          `This is to certify that Mr./Ms. {{recipient_name}} (Employee ID: {{emp_no}}) is a regular full-time staff member of {{branch_name}}, currently serving in the {{department}} department.\n\nHe/She is in good standing with the institution and continues to discharge assigned duties diligently.\n\nThis certificate is issued for the purpose of: {{purpose}}.`,
          'Issued on official staff record verification.',
          'minimal_mono',
          'monochrome',
          'principal_only',
          1,
          1,
          0,
        ],
        [
          'TC-CBSE-01',
          'Official CBSE Transfer Certificate (TC)',
          'tc',
          'student',
          'AFFILIATED TO CBSE NEW DELHI • SCHOOL LEAVING',
          'TRANSFER CERTIFICATE',
          `This is to certify that {{student_name}} (Admission No: {{admission_no}}), son/daughter of Mr. {{father_name}} and Mrs. {{mother_name}}, Date of Birth {{dob}}, was a bonafide pupil of {{branch_name}}.\n\nLast Class Studied: {{class_section}} | Date of Leaving: {{leaving_date}} | Reason for Leaving: {{reason_for_leaving}}.\n\nPromotion Status: {{promoted_to_class}} | General Conduct: {{conduct_grade}} | School Fee Dues: Cleared & Settled.`,
          'Certified strictly in accordance with CBSE Affiliation Bye-Laws & Student Leaving Register.',
          'cbse_formal',
          'monochrome',
          'principal_seal',
          1,
          1,
          1,
        ],
        [
          'STD-CERT-01',
          'Course & Period Study Certificate',
          'study',
          'student',
          'ACADEMIC RECORDS & REGISTRAR',
          'STUDY CERTIFICATE',
          `This is to certify that Master/Miss {{student_name}}, child of Mr. {{father_name}}, Admission No. {{admission_no}}, was / is a regular student of {{branch_name}} studying in {{class_section}} from {{period_from}} to {{period_to}}.\n\nHis/Her academic progress during the above study period has been duly verified from class attendance and examination registers.\n\nPurpose of Issue: {{purpose}}.`,
          'Issued based on verified Academic Progression Registers.',
          'royal_seal',
          'navy_royal',
          'principal_teacher',
          1,
          1,
          1,
        ],
        [
          'CND-CERT-01',
          'Student Conduct Certificate',
          'conduct',
          'student',
          'DISCIPLINE & STUDENT AFFAIRS',
          'CONDUCT CERTIFICATE',
          `This is to certify that Master/Miss {{student_name}}, son/daughter of Mr. {{father_name}}, Admission No. {{admission_no}}, studying in {{class_section}} at {{branch_name}} during Academic Year {{academic_year}}, bears a {{conduct_grade}} conduct record.\n\nTo the best of our knowledge, he/she has obeyed all school rules, shown respect toward faculty and peers, and has no pending disciplinary actions.\n\nPurpose: {{purpose}}.`,
          'Endorsed by Class Mentor and Head of Institution.',
          'classic_double',
          'monochrome',
          'principal_teacher',
          1,
          1,
          1,
        ],
        [
          'CHR-CERT-01',
          'Character & Moral Testimonial',
          'character',
          'student',
          'OFFICIAL TESTIMONIAL OF THE PRINCIPAL',
          'CHARACTER CERTIFICATE',
          `This is to certify that Master/Miss {{student_name}}, child of Mr. {{father_name}} and Mrs. {{mother_name}}, Admission No. {{admission_no}}, student of {{class_section}} at {{branch_name}} (period: {{period_from}} to {{period_to}}), possesses an {{conduct_grade}} moral character.\n\nHe/She is sincere, courteous, hardworking, and actively participates in co-curricular and campus community values. We wish him/her great success in all future endeavors.`,
          'Seal and signature of the Head of Institution.',
          'royal_seal',
          'crimson_gold',
          'principal_seal',
          1,
          1,
          1,
        ],
        [
          'CUS-CERT-01',
          'Merit / Appreciation / Custom Certificate',
          'custom',
          'both',
          'SPECIAL RECOGNITION & MERIT AWARD',
          '{{custom_title}}',
          `Proudly presented to {{recipient_name}} ({{class_section}} / {{department}}, ID: {{admission_no}}) of {{branch_name}} in recognition of {{purpose}}.\n\n{{custom_achievement}}\n\nAwarded on {{issue_date}} under the Academic Session {{academic_year}}.`,
          'Presented with institutional honors & appreciation.',
          'royal_seal',
          'crimson_gold',
          'principal_seal',
          1,
          1,
          1,
        ],
      ];

      for (const tpl of seedTemplates) {
        await query(
          `INSERT INTO certificate_templates (
            code, name, certificate_type, recipient_scope, category_badge, title_heading,
            body_template, footer_note, border_style, color_theme, signature_layout,
            show_student_photo, show_qr_verification, is_default
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          tpl
        );
      }
      console.log('[Cert Migration] Seeded 7 default CBSE Certificate Templates');
    }

    console.log('[Cert Migration] Completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Cert Migration] Error:', error);
    process.exit(1);
  }
};

run();
