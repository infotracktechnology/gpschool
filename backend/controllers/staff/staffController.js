import { query } from '../../config/database.js';

/**
 * Format date to DDMMYYYY string
 */
const formatDobToDDMMYYYY = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}${month}${year}`;
};

/**
 * GET /api/staff - List staff with comprehensive filters
 */
export const getStaff = async (req, res, next) => {
  try {
    const { branch_id, staff_type, department, status, search, role } = req.query;

    let sql = `
      SELECT
        sp.id,
        sp.user_id,
        sp.branch_id,
        sp.emp_no,
        sp.staff_type,
        sp.first_name,
        sp.last_name,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS profile_full_name,
        sp.designation,
        sp.department,
        sp.joining_date,
        sp.qualification,
        sp.highest_qualification,
        sp.specialization,
        sp.university,
        sp.gender,
        sp.dob,
        sp.blood_group,
        sp.pan_no,
        sp.aadhaar_no,
        sp.phone AS staff_phone,
        sp.alt_phone,
        sp.email AS staff_email,
        sp.marital_status,
        sp.street_address,
        sp.city,
        sp.state,
        sp.pincode,
        COALESCE(sp.avatar_url, '') AS photo_url,
        sp.avatar_url,
        sp.emergency_contact_name,
        sp.emergency_contact_phone,
        sp.bank_name,
        sp.account_no,
        sp.account_no AS bank_account_no,
        sp.ifsc_code,
        sp.ifsc_code AS bank_ifsc,
        sp.pf_uan_no,
        sp.pf_uan_no AS uan_no,
        sp.esi_no,
        sp.employment_type,
        sp.biometric_id,
        sp.total_experience_years,
        sp.total_experience_years AS experience_years,
        sp.previous_school_experience,
        sp.previous_school_experience AS previous_school,
        sp.status,
        sp.created_at,
        sp.updated_at,
        u.name AS user_name,
        u.username AS email,
        u.phone AS user_phone,
        u.role AS user_role,
        b.name AS branch_name,
        b.code AS branch_code
      FROM staff_profiles sp
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN branches b ON sp.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based branch scoping
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      sql += ' AND sp.branch_id = ?';
      params.push(req.user.branch_id);
    } else if (branch_id && branch_id !== 'all') {
      sql += ' AND sp.branch_id = ?';
      params.push(Number(branch_id));
    }

    if (staff_type && staff_type !== 'all') {
      sql += ' AND sp.staff_type = ?';
      params.push(staff_type);
    }

    if (department && department !== 'all') {
      sql += ' AND sp.department = ?';
      params.push(department);
    }

    if (status && status !== 'all') {
      sql += ' AND sp.status = ?';
      params.push(status);
    }

    if (role && role !== 'all') {
      sql += ' AND u.role = ?';
      params.push(role);
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ` AND (
        sp.first_name LIKE ? OR
        sp.last_name LIKE ? OR
        sp.emp_no LIKE ? OR
        u.name LIKE ? OR
        u.username LIKE ? OR
        u.phone LIKE ? OR
        sp.phone LIKE ? OR
        sp.emergency_contact_phone LIKE ? OR
        sp.designation LIKE ? OR
        sp.department LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term, term, term, term);
    }

    sql += ' ORDER BY sp.id DESC';

    const staffList = await query(sql, params);

    // Normalize display fields
    const staff = staffList.map(item => {
      let displayName = item.profile_full_name && item.profile_full_name.trim() !== ''
        ? item.profile_full_name.trim()
        : (item.user_name || item.emp_no);
      let displayPhone = item.user_phone || item.staff_phone || item.emergency_contact_phone || '';
      return {
        ...item,
        name: displayName,
        phone: displayPhone,
        first_name: item.first_name || (item.user_name ? item.user_name.split(' ')[0] : 'Staff'),
        last_name: item.last_name || (item.user_name ? item.user_name.split(' ').slice(1).join(' ') : ''),
      };
    });

    res.json({ staff });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/staff/:id - Full 360° Staff Profile
 */
export const getStaffById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const staffQuery = `
      SELECT
        sp.*,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS profile_full_name,
        sp.account_no AS bank_account_no,
        sp.ifsc_code AS bank_ifsc,
        sp.pf_uan_no AS uan_no,
        sp.avatar_url AS photo_url,
        sp.total_experience_years AS experience_years,
        sp.previous_school_experience AS previous_school,
        sp.street_address AS address_line1,
        sp.emergency_contact_phone AS emergency_contact,
        u.name AS user_name,
        u.username AS email,
        u.phone AS user_phone,
        u.role AS user_role,
        u.status AS user_status,
        b.name AS branch_name,
        b.code AS branch_code
      FROM staff_profiles sp
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN branches b ON sp.branch_id = b.id
      WHERE sp.id = ? OR sp.user_id = ?
      LIMIT 1
    `;
    const staffRows = await query(staffQuery, [id, id]);

    if (staffRows.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const staff = staffRows[0];
    const staffId = staff.id;

    // Scoping check
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (staff.branch_id && staff.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Access denied to staff outside your branch' });
      }
    }

    staff.name = (staff.profile_full_name && staff.profile_full_name.trim() !== '') ? staff.profile_full_name : (staff.user_name || staff.emp_no);
    staff.phone = staff.user_phone || staff.phone || staff.emergency_contact_phone || '';
    if (!staff.first_name && staff.user_name) {
      staff.first_name = staff.user_name.split(' ')[0] || '';
      staff.last_name = staff.user_name.split(' ').slice(1).join(' ') || '';
    }

    // 1. Documents
    let documents = [];
    try {
      documents = await query(
        `SELECT
           id,
           staff_id,
           COALESCE(document_type, doc_type) AS document_type,
           COALESCE(document_type, doc_type) AS doc_type,
           COALESCE(document_name, title) AS document_name,
           COALESCE(document_name, title) AS title,
           file_url,
           file_size,
           uploaded_at
         FROM staff_documents
         WHERE staff_id = ?
         ORDER BY uploaded_at DESC`,
        [staffId]
      );
    } catch (e) {
      console.warn('Could not fetch staff_documents:', e.message);
    }

    // 2. Class Teacher Allocations
    let classTeacherAllocations = [];
    try {
      classTeacherAllocations = await query(
        `SELECT
           bcs.id,
           bcs.branch_id,
           bcs.class_id,
           bcs.name AS section_name,
           bcs.class_teacher_id,
           bcs.co_class_teacher_id,
           c.name AS class_name,
           c.code AS class_code,
           b.name AS branch_name,
           CASE
             WHEN bcs.class_teacher_id = ? THEN 'Primary Class Teacher'
             WHEN bcs.co_class_teacher_id = ? THEN 'Co-Class Teacher'
             ELSE 'Class Teacher'
           END AS allocation_role
         FROM branch_class_sections bcs
         JOIN classes c ON bcs.class_id = c.id
         LEFT JOIN branches b ON bcs.branch_id = b.id
         WHERE bcs.class_teacher_id = ? OR bcs.co_class_teacher_id = ?`,
        [staffId, staffId, staffId, staffId]
      );
    } catch (e) {
      console.warn('Could not fetch class teacher allocations:', e.message);
    }

    // 3. Subject Allocations
    let subjectAllocations = [];
    try {
      subjectAllocations = await query(
        `SELECT
           tsa.id,
           tsa.branch_id,
           tsa.academic_year_id,
           tsa.class_id,
           tsa.section_id,
           tsa.subject_id,
           tsa.teacher_id,
           tsa.weekly_periods,
           tsa.is_primary,
           sub.name AS subject_name,
           sub.code AS subject_code,
           c.name AS class_name,
           bcs.name AS section_name,
           ay.name AS academic_year_name
         FROM teacher_subject_allocations tsa
         JOIN subjects sub ON tsa.subject_id = sub.id
         JOIN classes c ON tsa.class_id = c.id
         LEFT JOIN branch_class_sections bcs ON tsa.section_id = bcs.id
         LEFT JOIN academic_years ay ON tsa.academic_year_id = ay.id
         WHERE tsa.teacher_id = ?
         ORDER BY tsa.id DESC`,
        [staffId]
      );
    } catch (e) {
      console.warn('Could not fetch subject allocations:', e.message);
    }

    // 4. Leave Balances
    let leaveBalances = [];
    try {
      leaveBalances = await query(
        `SELECT
           slb.id,
           slb.staff_id,
           slb.academic_year_id,
           slb.leave_type_id,
           COALESCE(slb.opening_balance, 0) AS opening_balance,
           COALESCE(slb.total_allocated, slb.allocated, 0) AS allocated,
           COALESCE(slb.used_days, slb.used, 0) AS used,
           COALESCE(slb.pending_days, slb.pending, 0) AS pending,
           slt.name AS leave_type_name,
           slt.code AS leave_type_code,
           slt.annual_quota,
           GREATEST(0, (COALESCE(slb.total_allocated, slb.allocated, 0) - COALESCE(slb.used_days, slb.used, 0) - COALESCE(slb.pending_days, slb.pending, 0))) AS available_balance
         FROM staff_leave_balances slb
         JOIN staff_leave_types slt ON slb.leave_type_id = slt.id
         WHERE slb.staff_id = ?`,
        [staffId]
      );
    } catch (e) {
      console.warn('Could not fetch leave balances:', e.message);
    }

    // 5. Payroll Structure
    let payrollStructure = null;
    try {
      const psRows = await query(
        `SELECT
           id,
           staff_id,
           COALESCE(basic_pay, basic_salary, 0) AS basic_pay,
           COALESCE(basic_salary, basic_pay, 0) AS basic_salary,
           hra,
           da,
           conveyance_allowance,
           special_allowance,
           gross_salary,
           pf_deduction_pct,
           esi_deduction_pct,
           pt_deduction,
           tds_deduction,
           updated_at
         FROM staff_payroll_structures
         WHERE staff_id = ?
         LIMIT 1`,
        [staffId]
      );
      if (psRows.length > 0) {
        payrollStructure = psRows[0];
      }
    } catch (e) {
      console.warn('Could not fetch payroll structure:', e.message);
    }

    // 6. Recent Leave Applications
    let recentLeaves = [];
    try {
      recentLeaves = await query(
        `SELECT
           sla.id,
           sla.leave_type_id,
           sla.from_date,
           sla.to_date,
           COALESCE(sla.total_days, sla.days, 1) AS days,
           COALESCE(sla.total_days, sla.days, 1) AS total_days,
           sla.reason,
           sla.status,
           sla.reviewed_at,
           sla.review_remarks,
           sla.created_at,
           slt.name AS leave_type_name,
           slt.code AS leave_type_code
         FROM staff_leave_applications sla
         JOIN staff_leave_types slt ON sla.leave_type_id = slt.id
         WHERE sla.staff_id = ?
         ORDER BY sla.created_at DESC
         LIMIT 10`,
        [staffId]
      );
    } catch (e) {
      console.warn('Could not fetch recent leaves:', e.message);
    }

    res.json({
      staff,
      documents,
      allocations: {
        classTeacher: classTeacherAllocations,
        subjects: subjectAllocations,
      },
      leaveBalances,
      payrollStructure,
      recentLeaves,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/staff - Onboarding Staff Member
 * Auto-generates sequential Emp No: {BranchCode}-T-001 (Teaching) or {BranchCode}-NT-001 (Non-Teaching)
 * Auto-creates user account in `users` table:
 * username = emp_no, password = plain text phone or DOB DDMMYYYY (no hash).
 * Auto-initializes leave balances in staff_leave_balances.
 */
export const createStaff = async (req, res, next) => {
  try {
    const {
      branch_id,
      staff_type = 'teaching',
      role,
      first_name,
      last_name,
      name,
      email,
      phone,
      alt_phone,
      gender,
      dob,
      blood_group,
      father_spouse_name,
      emergency_contact,
      emergency_contact_name,
      emergency_contact_phone,
      address_line1,
      street_address,
      city,
      state,
      pincode,
      pan_no,
      aadhaar_no,
      uan_no,
      pf_uan_no,
      esi_no,
      bank_name,
      bank_account_no,
      account_no,
      bank_ifsc,
      ifsc_code,
      designation,
      department,
      joining_date,
      qualification,
      highest_qualification,
      specialization,
      university,
      marital_status,
      employment_type = 'permanent',
      biometric_id,
      photo_url,
      avatar_url,
      experience_years = 0,
      total_experience_years,
      previous_school,
      previous_school_experience,
      custom_emp_no,
    } = req.body;

    // Determine target branch
    let targetBranchId = req.user.role === 'super_admin' ? (branch_id ? Number(branch_id) : 1) : req.user.branch_id;
    if (!targetBranchId) targetBranchId = 1;

    // Get branch code
    let branchCode = 'GPS';
    const branchRows = await query('SELECT code, name FROM branches WHERE id = ?', [targetBranchId]);
    if (branchRows.length > 0 && branchRows[0].code) {
      branchCode = branchRows[0].code.trim().toUpperCase();
    }

    // Determine Emp No
    let empNo = custom_emp_no ? String(custom_emp_no).trim() : null;
    const isTeaching = String(staff_type).toLowerCase() === 'teaching';
    const typeCode = isTeaching ? 'T' : 'NT';
    const prefix = `${branchCode}-${typeCode}-`;

    if (!empNo) {
      const existingEmps = await query(
        `SELECT emp_no FROM staff_profiles WHERE emp_no LIKE ? ORDER BY id DESC LIMIT 100`,
        [`${prefix}%`]
      );

      let maxSeq = 0;
      for (const row of existingEmps) {
        if (row.emp_no) {
          const match = row.emp_no.match(new RegExp(`^${prefix}(\\d+)$`));
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (num > maxSeq) maxSeq = num;
          }
        }
      }
      const nextSeq = maxSeq + 1;
      empNo = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    }

    // Determine Names
    let finalFirstName = first_name ? String(first_name).trim() : '';
    let finalLastName = last_name ? String(last_name).trim() : '';
    if (!finalFirstName && name) {
      const parts = String(name).trim().split(' ');
      finalFirstName = parts[0] || 'Staff';
      finalLastName = parts.slice(1).join(' ') || '';
    }
    if (!finalFirstName) {
      finalFirstName = 'Staff';
    }
    const fullName = `${finalFirstName} ${finalLastName}`.trim();

    // Determine User Role
    let userRole = role;
    if (!userRole) {
      if (designation && designation.toLowerCase().includes('principal')) {
        userRole = 'principal';
      } else if (isTeaching) {
        userRole = 'teacher';
      } else {
        userRole = 'staff';
      }
    }

    // Plain text password: phone or DOB DDMMYYYY (no hash)
    const rawPhone = phone || emergency_contact_phone || emergency_contact || '';
    let plainPassword = String(rawPhone).trim();
    if (!plainPassword || plainPassword.length < 4) {
      const dobFormatted = formatDobToDDMMYYYY(dob);
      if (dobFormatted) {
        plainPassword = dobFormatted;
      } else {
        plainPassword = 'Staff@123';
      }
    }

    // Check existing user
    let existingUser = await query('SELECT id FROM users WHERE LOWER(username) = ?', [empNo.toLowerCase()]);
    let userId = null;

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
    } else {
      const userResult = await query(
        `INSERT INTO users (name, username, password, role, branch_id, phone, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [
          fullName,
          empNo,
          plainPassword,
          userRole,
          targetBranchId,
          rawPhone || null,
        ]
      );
      userId = userResult.insertId;
    }

    const finalAddress = address_line1 || street_address || null;
    const finalAccountNo = bank_account_no || account_no || null;
    const finalIfsc = bank_ifsc || ifsc_code || null;
    const finalUan = pf_uan_no || uan_no || null;
    const finalAvatar = photo_url || avatar_url || null;
    const finalExp = total_experience_years !== undefined ? Number(total_experience_years) : (experience_years !== undefined ? Number(experience_years) : 0);
    const finalPrevSchool = previous_school_experience || previous_school || null;
    const finalEmergencyPhone = emergency_contact_phone || emergency_contact || null;
    const finalEmergencyName = emergency_contact_name || father_spouse_name || null;
    const finalQual = highest_qualification || qualification || null;

    // Insert into staff_profiles
    const profileResult = await query(
      `INSERT INTO staff_profiles (
        user_id,
        branch_id,
        emp_no,
        staff_type,
        first_name,
        last_name,
        designation,
        department,
        employment_type,
        joining_date,
        biometric_id,
        status,
        gender,
        dob,
        blood_group,
        pan_no,
        aadhaar_no,
        phone,
        alt_phone,
        email,
        marital_status,
        street_address,
        city,
        state,
        pincode,
        avatar_url,
        emergency_contact_name,
        emergency_contact_phone,
        qualification,
        highest_qualification,
        specialization,
        university,
        total_experience_years,
        previous_school_experience,
        bank_name,
        account_no,
        ifsc_code,
        pf_uan_no,
        esi_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        targetBranchId,
        empNo,
        staff_type,
        finalFirstName,
        finalLastName,
        designation || null,
        department || null,
        employment_type,
        joining_date || null,
        biometric_id || null,
        gender || null,
        dob || null,
        blood_group || null,
        pan_no || null,
        aadhaar_no || null,
        rawPhone || null,
        alt_phone || null,
        email || null,
        marital_status || null,
        finalAddress,
        city || null,
        state || null,
        pincode || null,
        finalAvatar,
        finalEmergencyName,
        finalEmergencyPhone,
        finalQual,
        finalQual,
        specialization || null,
        university || null,
        finalExp,
        finalPrevSchool,
        bank_name || null,
        finalAccountNo,
        finalIfsc,
        finalUan,
        esi_no || null,
      ]
    );

    const staffId = profileResult.insertId;

    // Auto-initialize leave balances from staff_leave_types
    try {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      const academicYearId = activeYears.length > 0 ? activeYears[0].id : 1;

      const leaveTypes = await query('SELECT id, code, annual_quota FROM staff_leave_types ORDER BY id');

      for (const lt of leaveTypes) {
        const quota = Number(lt.annual_quota) || 12;
        await query(
          `INSERT INTO staff_leave_balances (
             academic_year_id,
             staff_id,
             leave_type_id,
             opening_balance,
             allocated,
             total_allocated,
             used,
             used_days,
             pending,
             pending_days
           ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0)
           ON DUPLICATE KEY UPDATE
             total_allocated = VALUES(total_allocated),
             allocated = VALUES(allocated)`,
          [academicYearId, staffId, lt.id, quota, quota, quota]
        );
      }
    } catch (leaveErr) {
      console.warn('Auto-initializing leave balances:', leaveErr.message);
    }

    res.status(201).json({
      message: 'Staff member onboarded successfully',
      staffId,
      emp_no: empNo,
      user: {
        id: userId,
        username: empNo,
        password: plainPassword,
        role: userRole,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/staff/:id - Update Staff Profile
 */
export const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingRows = await query('SELECT * FROM staff_profiles WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }
    const staff = existingRows[0];

    // Scoping check
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (staff.branch_id && staff.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden: Cannot update staff from another branch' });
      }
    }

    const {
      branch_id,
      staff_type,
      first_name,
      last_name,
      designation,
      department,
      employment_type,
      joining_date,
      qualification,
      highest_qualification,
      specialization,
      university,
      gender,
      dob,
      blood_group,
      marital_status,
      phone,
      alt_phone,
      email,
      emergency_contact,
      emergency_contact_phone,
      emergency_contact_name,
      address_line1,
      street_address,
      city,
      state,
      pincode,
      pan_no,
      aadhaar_no,
      uan_no,
      pf_uan_no,
      esi_no,
      bank_name,
      bank_account_no,
      account_no,
      bank_ifsc,
      ifsc_code,
      biometric_id,
      photo_url,
      avatar_url,
      experience_years,
      total_experience_years,
      previous_school,
      previous_school_experience,
      status,
      role,
    } = req.body;

    const fields = [];
    const params = [];

    if (req.user.role === 'super_admin' && branch_id !== undefined) {
      fields.push('branch_id = ?');
      params.push(Number(branch_id));
    }
    if (staff_type !== undefined) { fields.push('staff_type = ?'); params.push(staff_type); }
    if (first_name !== undefined) { fields.push('first_name = ?'); params.push(first_name); }
    if (last_name !== undefined) { fields.push('last_name = ?'); params.push(last_name); }
    if (designation !== undefined) { fields.push('designation = ?'); params.push(designation); }
    if (department !== undefined) { fields.push('department = ?'); params.push(department); }
    if (employment_type !== undefined) { fields.push('employment_type = ?'); params.push(employment_type); }
    if (joining_date !== undefined) { fields.push('joining_date = ?'); params.push(joining_date || null); }
    if (qualification !== undefined || highest_qualification !== undefined) {
      const q = highest_qualification || qualification;
      fields.push('qualification = ?', 'highest_qualification = ?');
      params.push(q, q);
    }
    if (specialization !== undefined) { fields.push('specialization = ?'); params.push(specialization); }
    if (university !== undefined) { fields.push('university = ?'); params.push(university); }
    if (gender !== undefined) { fields.push('gender = ?'); params.push(gender); }
    if (dob !== undefined) { fields.push('dob = ?'); params.push(dob || null); }
    if (blood_group !== undefined) { fields.push('blood_group = ?'); params.push(blood_group); }
    if (marital_status !== undefined) { fields.push('marital_status = ?'); params.push(marital_status); }
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
    if (alt_phone !== undefined) { fields.push('alt_phone = ?'); params.push(alt_phone); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (emergency_contact_phone !== undefined || emergency_contact !== undefined) {
      fields.push('emergency_contact_phone = ?');
      params.push(emergency_contact_phone || emergency_contact);
    }
    if (emergency_contact_name !== undefined) {
      fields.push('emergency_contact_name = ?');
      params.push(emergency_contact_name);
    }
    if (address_line1 !== undefined || street_address !== undefined) {
      fields.push('street_address = ?');
      params.push(address_line1 || street_address);
    }
    if (city !== undefined) { fields.push('city = ?'); params.push(city); }
    if (state !== undefined) { fields.push('state = ?'); params.push(state); }
    if (pincode !== undefined) { fields.push('pincode = ?'); params.push(pincode); }
    if (pan_no !== undefined) { fields.push('pan_no = ?'); params.push(pan_no); }
    if (aadhaar_no !== undefined) { fields.push('aadhaar_no = ?'); params.push(aadhaar_no); }
    if (uan_no !== undefined || pf_uan_no !== undefined) {
      fields.push('pf_uan_no = ?');
      params.push(uan_no || pf_uan_no);
    }
    if (esi_no !== undefined) { fields.push('esi_no = ?'); params.push(esi_no); }
    if (bank_name !== undefined) { fields.push('bank_name = ?'); params.push(bank_name); }
    if (bank_account_no !== undefined || account_no !== undefined) {
      fields.push('account_no = ?');
      params.push(bank_account_no || account_no);
    }
    if (bank_ifsc !== undefined || ifsc_code !== undefined) {
      fields.push('ifsc_code = ?');
      params.push(bank_ifsc || ifsc_code);
    }
    if (biometric_id !== undefined) { fields.push('biometric_id = ?'); params.push(biometric_id); }
    if (photo_url !== undefined || avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      params.push(photo_url || avatar_url);
    }
    if (experience_years !== undefined || total_experience_years !== undefined) {
      fields.push('total_experience_years = ?');
      params.push(Number(experience_years !== undefined ? experience_years : total_experience_years));
    }
    if (previous_school !== undefined || previous_school_experience !== undefined) {
      fields.push('previous_school_experience = ?');
      params.push(previous_school || previous_school_experience);
    }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }

    if (fields.length > 0) {
      params.push(id);
      await query(`UPDATE staff_profiles SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    // Sync to users table
    if (staff.user_id) {
      const userFields = [];
      const userParams = [];

      if (first_name !== undefined || last_name !== undefined) {
        const f = first_name !== undefined ? first_name : staff.first_name;
        const l = last_name !== undefined ? last_name : staff.last_name;
        const full = `${f || ''} ${l || ''}`.trim();
        if (full) {
          userFields.push('name = ?');
          userParams.push(full);
        }
      }
      if (phone !== undefined) {
        userFields.push('phone = ?');
        userParams.push(phone);
      }
      if (status !== undefined) {
        const uStatus = status === 'active' ? 'active' : 'inactive';
        userFields.push('status = ?');
        userParams.push(uStatus);
      }
      if (role !== undefined && req.user.role === 'super_admin') {
        userFields.push('role = ?');
        userParams.push(role);
      }

      if (userFields.length > 0) {
        userParams.push(staff.user_id);
        await query(`UPDATE users SET ${userFields.join(', ')} WHERE id = ?`, userParams);
      }
    }

    res.json({ message: 'Staff profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/staff/:id - Deactivate / Delete Staff Member
 */
export const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const existingRows = await query('SELECT * FROM staff_profiles WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }
    const staff = existingRows[0];

    // Scoping check
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (staff.branch_id && staff.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden: Cannot delete staff from another branch' });
      }
    }

    if (force === 'true' && req.user.role === 'super_admin') {
      await query('DELETE FROM staff_documents WHERE staff_id = ?', [id]);
      await query('DELETE FROM staff_leave_balances WHERE staff_id = ?', [id]);
      await query('DELETE FROM staff_leave_applications WHERE staff_id = ?', [id]);
      await query('DELETE FROM teacher_subject_allocations WHERE teacher_id = ?', [id]);
      await query('DELETE FROM staff_payroll_structures WHERE staff_id = ?', [id]);
      await query('DELETE FROM staff_payslips WHERE staff_id = ?', [id]);
      await query('DELETE FROM staff_attendance WHERE staff_id = ?', [id]);
      await query('DELETE FROM staff_profiles WHERE id = ?', [id]);
      if (staff.user_id) {
        await query('DELETE FROM users WHERE id = ?', [staff.user_id]);
      }
      return res.json({ message: 'Staff record permanently deleted' });
    }

    // Soft delete / deactivation
    await query(`UPDATE staff_profiles SET status = 'inactive' WHERE id = ?`, [id]);
    if (staff.user_id) {
      await query(`UPDATE users SET status = 'inactive' WHERE id = ?`, [staff.user_id]);
    }

    res.json({ message: 'Staff deactivated successfully' });
  } catch (error) {
    next(error);
  }
};
