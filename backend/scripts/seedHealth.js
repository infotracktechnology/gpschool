import { pool } from '../config/database.js';

export const seedHealthData = async () => {
  console.log('[Seed] Seeding sample Health & Infirmary data...');

  // 1. Get sample students
  const [students] = await pool.query('SELECT id, admission_no, student_name, blood_group FROM students LIMIT 5');

  // 2. Health Profiles for students
  if (students.length > 0) {
    for (let i = 0; i < students.length; i++) {
      const st = students[i];
      const bg = st.blood_group || (i % 2 === 0 ? 'O+' : 'B+');
      const allergies = i === 0 ? 'Peanuts, Dust' : i === 1 ? 'Sulfa drugs' : 'None';
      const chronic = i === 0 ? 'Mild Asthma (uses inhaler)' : 'None';
      const height = 140 + i * 5;
      const weight = 35 + i * 4;
      const bmi = ((weight / ((height / 100) * (height / 100)))).toFixed(1);

      await pool.query(`
        INSERT INTO health_profiles (
          user_type, student_id, blood_group, height_cm, weight_kg, bmi,
          known_allergies, chronic_conditions, medical_notes, emergency_contact_name,
          emergency_contact_phone, emergency_contact_relation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        blood_group = VALUES(blood_group),
        height_cm = VALUES(height_cm),
        weight_kg = VALUES(weight_kg),
        bmi = VALUES(bmi),
        known_allergies = VALUES(known_allergies),
        chronic_conditions = VALUES(chronic_conditions)
      `, [
        'student',
        st.id,
        bg,
        height,
        weight,
        bmi,
        allergies,
        chronic,
        'Regular annual health card verified',
        'Parent / Guardian',
        '9840123456',
        'Father'
      ]);
    }
  }

  // 3. Health Profiles for staff
  const [staff] = await pool.query('SELECT id, first_name, last_name, blood_group FROM staff_profiles LIMIT 2');
  if (staff.length > 0) {
    for (let s of staff) {
      await pool.query(`
        INSERT INTO health_profiles (
          user_type, staff_id, blood_group, height_cm, weight_kg, bmi,
          known_allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        blood_group = VALUES(blood_group)
      `, [
        'staff',
        s.id,
        s.blood_group || 'A+',
        168,
        65,
        23.0,
        'None',
        'None',
        'Spouse',
        '9876543210'
      ]);
    }
  }

  // 4. Infirmary Visits
  const [visitsCount] = await pool.query('SELECT COUNT(*) AS c FROM infirmary_visits');
  if (visitsCount[0].c === 0 && students.length > 0) {
    await pool.query(`
      INSERT INTO infirmary_visits (
        visit_number, patient_type, student_id, patient_name, class_section,
        visit_date, visit_time, visit_type, chief_complaint, treatment_given,
        temperature_f, pulse_bpm, disposition, attended_by, remarks
      ) VALUES
      ('INF-20261124-0001', 'student', ?, ?, 'Grade 10 - A',
       CURDATE(), '10:15 AM', 'illness', 'High fever (100.8°F) and headache',
       'Cold compress applied, ORS hydration provided, rested in sick bay',
       100.8, 86, 'resting_in_bay', 'Nurse Saradha', 'Parent informed for pickup'),
      ('INF-20261124-0002', 'student', ?, 'Rohan Verma', 'Grade 8 - B',
       CURDATE(), '11:45 AM', 'injury', 'Right knee scrape from playground fall',
       'Antiseptic cleansing with Betadine, sterile gauze dressing applied',
       98.4, 78, 'sent_back_to_class', 'Nurse Saradha', 'Instructed to avoid sports for 2 days')
    `, [students[0].id, students[0].student_name, students.length > 1 ? students[1].id : students[0].id]);
  }

  // 5. Health Checkups
  const [chkCount] = await pool.query('SELECT COUNT(*) AS c FROM health_checkups');
  if (chkCount[0].c === 0 && students.length > 0) {
    await pool.query(`
      INSERT INTO health_checkups (
        student_id, student_name, class_section, checkup_date, height_cm, weight_kg,
        vision_left, vision_right, dental_status, ent_status, general_fitness,
        doctor_remarks, examiner_name
      ) VALUES
      (?, ?, 'Grade 10 - A', CURDATE(), 152.5, 42.0,
       '6/6', '6/6', 'Healthy - No Cavity', 'Clear', 'Fit',
       'Excellent overall posture and stamina', 'Dr. S. K. Ramanathan, MD (Pediatrics)'),
      (?, 'Ananya Sen', 'Grade 9 - C', CURDATE(), 148.0, 39.5,
       '6/9', '6/9', 'Mild plaque observed', 'Clear', 'Fit with glasses',
       'Mild myopia detected, spectacle prescription recommended', 'Dr. Meera Vasudevan (Ophthalmologist)')
    `, [students[0].id, students[0].student_name, students.length > 1 ? students[1].id : students[0].id]);
  }

  // 6. Medicine Dispensing Logs
  const [medCount] = await pool.query('SELECT COUNT(*) AS c FROM medicine_dispensing_logs');
  if (medCount[0].c === 0) {
    await pool.query(`
      INSERT INTO medicine_dispensing_logs (
        patient_type, patient_name, class_or_dept, medicine_name, dosage_qty, reason, dispensed_by
      ) VALUES
      ('student', 'Aditya Nair', 'Grade 7 - A', 'Paracetamol Suspension (120mg/5ml)', '5 ml', 'Mild fever after recess', 'Nurse Saradha'),
      ('student', 'Kavya S.', 'Grade 11 - Science', 'ORS Electrolyte Sachet', '1 Sachet in 200ml water', 'Dehydration after physical training', 'Nurse Saradha'),
      ('staff', 'Sundar Raman', 'Science & Physics', 'Pain Relief Gel (Volini)', 'Topical application', 'Sprained wrist while moving lab setup', 'Nurse Saradha')
    `);
  }

  // 7. Doctor Consultations
  const [docCount] = await pool.query('SELECT COUNT(*) AS c FROM doctor_consultations');
  if (docCount[0].c === 0 && students.length > 0) {
    await pool.query(`
      INSERT INTO doctor_consultations (
        consultation_number, doctor_name, doctor_reg_no, patient_type, student_id,
        patient_name, class_or_dept, consultation_date, symptoms, diagnosis,
        prescription, advice_and_rest, follow_up_date
      ) VALUES
      ('DOC-20261124-0001', 'Dr. S. K. Ramanathan, MD', 'TN-MED-44821', 'student', ?,
       ?, 'Grade 10 - A', CURDATE(),
       'Persistent throat irritation, dry cough for 3 days',
       'Acute Pharyngitis with allergic rhinitis',
       'Amoxicillin 250mg 1 tab twice daily x 3 days, Cetirizine 5mg at bedtime',
       'Warm saline gargles 3 times daily, avoid chilled water and ice cream',
       DATE_ADD(CURDATE(), INTERVAL 5 DAY))
    `, [students[0].id, students[0].student_name]);
  }

  console.log('[Seed] Health & Infirmary data seeded successfully!');
};

if (process.argv[1]?.includes('seedHealth.js')) {
  seedHealthData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
