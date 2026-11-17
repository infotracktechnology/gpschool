/**
 * Syncs admitted students into the master `students` and `student_enrollments` tables.
 * Can be executed inside an existing database transaction.
 */
export async function syncAdmissionToStudent(conn, data) {
  const {
    admission_no,
    student_name,
    gender,
    dob,
    branch_id,
    academic_year_id,
    class_id,
    section_id,
    roll_no,
    admission_category = 'general',
    parent_name,
    primary_phone,
    address_street,
    city,
    state,
    pincode,
    emergency_contact_name,
    emergency_contact_phone,
    blood_group,
    aadhaar_no,
    religion,
    caste_category,
    nationality = 'Indian',
    mother_tongue,
    avatar_url,
    father_name,
    father_phone,
    father_email,
    father_occupation,
    mother_name,
    mother_phone,
    previous_school,
  } = data;

  if (!admission_no || !student_name) return null;

  // 1. Check if student already exists by admission_no
  const [existing] = await conn.query(
    'SELECT id FROM students WHERE admission_no = ?',
    [admission_no]
  );

  let studentId;
  if (existing.length > 0) {
    studentId = existing[0].id;
    await conn.query(
      `UPDATE students SET
        student_name = COALESCE(?, student_name),
        gender = COALESCE(?, gender),
        dob = COALESCE(?, dob),
        father_name = COALESCE(?, father_name),
        father_phone = COALESCE(?, father_phone),
        street_address = COALESCE(?, street_address),
        city = COALESCE(?, city),
        status = 'active',
        updated_at = NOW()
       WHERE id = ?`,
      [
        student_name ? student_name.trim() : null,
        gender || null,
        dob || null,
        father_name || parent_name || null,
        father_phone || primary_phone || null,
        address_street || null,
        city || null,
        studentId,
      ]
    );
  } else {
    const [insRes] = await conn.query(
      `INSERT INTO students
       (admission_no, student_name, gender, dob, blood_group, aadhaar_no, religion,
        caste_category, nationality, mother_tongue, avatar_url, father_name, father_phone,
        father_email, father_occupation, mother_name, mother_phone, street_address, city, state, pincode,
        emergency_contact_name, emergency_contact_phone, previous_school, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        admission_no,
        student_name.trim(),
        gender || 'other',
        dob || '2015-01-01',
        blood_group || null,
        aadhaar_no || null,
        religion || null,
        caste_category || null,
        nationality || 'Indian',
        mother_tongue || null,
        avatar_url || null,
        father_name || parent_name || null,
        father_phone || primary_phone || null,
        father_email || null,
        father_occupation || null,
        mother_name || null,
        mother_phone || null,
        address_street || null,
        city || null,
        state || null,
        pincode || null,
        emergency_contact_name || father_name || parent_name || null,
        emergency_contact_phone || father_phone || primary_phone || null,
        previous_school || null,
      ]
    );
    studentId = insRes.insertId;
  }

  // 2. Check if student enrollment exists for this academic_year_id
  const [existingEnr] = await conn.query(
    'SELECT id FROM student_enrollments WHERE student_id = ? AND academic_year_id = ?',
    [studentId, academic_year_id]
  );

  let enrollmentId;
  if (existingEnr.length > 0) {
    enrollmentId = existingEnr[0].id;
    await conn.query(
      `UPDATE student_enrollments SET
        branch_id = ?,
        class_id = ?,
        section_id = ?,
        roll_no = COALESCE(?, roll_no),
        admission_category = ?,
        enrollment_status = 'current',
        updated_at = NOW()
       WHERE id = ?`,
      [branch_id, class_id, section_id, roll_no || null, admission_category || 'general', enrollmentId]
    );
  } else {
    const [insEnr] = await conn.query(
      `INSERT INTO student_enrollments
       (student_id, branch_id, academic_year_id, class_id, section_id, roll_no, admission_category, enrollment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'current')`,
      [
        studentId,
        branch_id,
        academic_year_id,
        class_id,
        section_id,
        roll_no || null,
        admission_category || 'general',
      ]
    );
    enrollmentId = insEnr.insertId;
  }

  return { studentId, enrollmentId };
}
