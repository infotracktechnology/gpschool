import fs from 'fs';
import { query } from '../../config/database.js';

/**
 * Format date to DDMMYYYY string for plain text password
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
 * Helper to parse CSV lines safely (handles quotes & commas)
 */
const parseCSV = (csvText) => {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseRow = (text) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseRow(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] !== undefined ? vals[idx] : '';
    });
    rows.push(obj);
  }

  return rows;
};

/**
 * GET /api/staff/bulk-import/template
 * Download Basic (10 cols) or Full 360 (25 cols) CSV template
 */
export const getBulkImportTemplate = (req, res) => {
  const { type = 'basic' } = req.query;

  if (type === 'full') {
    const headers = [
      'Staff Type',
      'First Name',
      'Last Name',
      'Phone',
      'Email',
      'Designation',
      'Department',
      'Role',
      'Gender',
      'DOB (YYYY-MM-DD)',
      'Blood Group',
      'Marital Status',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Street Address',
      'City',
      'State',
      'Pincode',
      'Qualification',
      'Total Experience (Years)',
      'Previous School',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'PAN',
      'Aadhaar',
    ];

    const sampleRow = [
      'teaching',
      'Priya',
      'Raman',
      '9840112233',
      'priya.raman@greenpark.edu',
      'Senior Physics Teacher',
      'Science',
      'teacher',
      'female',
      '1992-04-18',
      'O+',
      'married',
      'Raman S',
      '9840112234',
      '12 Temple View Road',
      'Namakkal',
      'Tamil Nadu',
      '637001',
      'M.Sc. Physics, B.Ed.',
      '6.5',
      'DAV Senior Secondary School',
      'State Bank of India',
      '203948571029',
      'SBIN0001234',
      'ABCDE1234F',
      '234567890123',
    ];

    const csvContent = `${headers.join(',')}\n${sampleRow.join(',')}\n`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="staff_full_360_template.csv"');
    return res.send(csvContent);
  }

  // Basic template (10 columns)
  const headers = [
    'Staff Type',
    'First Name',
    'Last Name',
    'Phone',
    'Email',
    'Designation',
    'Department',
    'Gender',
    'DOB (YYYY-MM-DD)',
    'Joining Date (YYYY-MM-DD)',
  ];

  const sampleRow = [
    'teaching',
    'Anand',
    'Kumar',
    '9840556677',
    'anand.k@greenpark.edu',
    'English Teacher',
    'Languages',
    'male',
    '1991-08-22',
    '2024-06-01',
  ];

  const csvContent = `${headers.join(',')}\n${sampleRow.join(',')}\n`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="staff_basic_template.csv"');
  return res.send(csvContent);
};

/**
 * POST /api/staff/bulk-import/preview
 * Parse uploaded CSV and return validation report
 */
export const previewBulkImport = async (req, res, next) => {
  try {
    let rawCSV = '';
    if (req.file) {
      if (req.file.buffer) {
        rawCSV = req.file.buffer.toString('utf-8');
      } else if (req.file.path && fs.existsSync(req.file.path)) {
        rawCSV = fs.readFileSync(req.file.path, 'utf-8');
      }
    } else if (req.body.csv_data) {
      rawCSV = String(req.body.csv_data);
    } else {
      return res.status(400).json({ message: 'No CSV file or data provided' });
    }

    const parsedRows = parseCSV(rawCSV);
    if (parsedRows.length === 0) {
      return res.status(400).json({ message: 'CSV file is empty or missing headers' });
    }

    // Fetch existing phones, emails, and emp_nos to check for duplicates
    const existingUsers = await query('SELECT username, phone FROM users');
    const existingProfiles = await query('SELECT emp_no, phone, email FROM staff_profiles');

    const usedPhones = new Set();
    const usedEmails = new Set();
    existingUsers.forEach(u => {
      if (u.phone) usedPhones.add(String(u.phone).trim());
      if (u.username) usedEmails.add(String(u.username).toLowerCase().trim());
    });
    existingProfiles.forEach(p => {
      if (p.phone) usedPhones.add(String(p.phone).trim());
      if (p.email) usedEmails.add(String(p.email).toLowerCase().trim());
    });

    const fileSeenPhones = new Set();
    const fileSeenEmails = new Set();

    const validatedRows = [];

    for (let index = 0; index < parsedRows.length; index++) {
      const row = parsedRows[index];
      const errors = [];

      // Determine fields flexibly based on possible column headers
      const staffType = (row.staff_type || row.type || 'teaching').toLowerCase();
      const firstName = row.first_name || row.firstname || row.name || '';
      const lastName = row.last_name || row.lastname || '';
      const phone = String(row.phone || row.mobile || row.contact || '').trim();
      const email = String(row.email || row.email_address || '').trim().toLowerCase();
      const designation = row.designation || row.role_title || '';
      const department = row.department || row.dept || '';
      const gender = (row.gender || '').toLowerCase();
      const dob = row.dob__yyyy_mm_dd_ || row.dob || row.date_of_birth || '';
      const joiningDate = row.joining_date__yyyy_mm_dd_ || row.joining_date || '';

      if (!firstName) {
        errors.push('First Name is required');
      }
      if (!phone) {
        errors.push('Phone number is required');
      } else if (phone.length < 8) {
        errors.push('Phone number must have at least 8 digits');
      }

      if (phone) {
        if (fileSeenPhones.has(phone)) {
          errors.push(`Duplicate phone ${phone} found within the CSV file`);
        } else if (usedPhones.has(phone)) {
          errors.push(`Phone ${phone} already belongs to an existing staff member`);
        }
        fileSeenPhones.add(phone);
      }

      if (email) {
        if (fileSeenEmails.has(email)) {
          errors.push(`Duplicate email ${email} found within the CSV file`);
        } else if (usedEmails.has(email)) {
          errors.push(`Email ${email} already in use`);
        }
        fileSeenEmails.add(email);
      }

      validatedRows.push({
        row_number: index + 2,
        staff_type: staffType === 'non_teaching' ? 'non_teaching' : 'teaching',
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        designation: designation || (staffType === 'teaching' ? 'Teacher' : 'Staff'),
        department: department || (staffType === 'teaching' ? 'Academics' : 'Administration'),
        gender: ['male', 'female', 'other'].includes(gender) ? gender : 'other',
        dob: dob || null,
        joining_date: joiningDate || null,
        // Optional 360 fields
        blood_group: row.blood_group || null,
        marital_status: row.marital_status || null,
        emergency_contact_name: row.emergency_contact_name || null,
        emergency_contact_phone: row.emergency_contact_phone || null,
        street_address: row.street_address || row.address || null,
        city: row.city || null,
        state: row.state || null,
        pincode: row.pincode || null,
        qualification: row.qualification || null,
        total_experience_years: Number(row.total_experience__years_ || row.experience_years || 0),
        previous_school: row.previous_school || null,
        bank_name: row.bank_name || null,
        account_no: row.account_number || row.account_no || null,
        ifsc_code: row.ifsc_code || null,
        pan_no: row.pan || row.pan_no || null,
        aadhaar_no: row.aadhaar || row.aadhaar_no || null,
        status: errors.length === 0 ? 'valid' : 'invalid',
        errors,
      });
    }

    const validCount = validatedRows.filter(r => r.status === 'valid').length;
    const invalidCount = validatedRows.length - validCount;

    res.json({
      summary: {
        total: validatedRows.length,
        valid: validCount,
        invalid: invalidCount,
      },
      rows: validatedRows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/staff/bulk-import/execute
 * Process validated staff rows, auto-generating sequential Emp Nos and user credentials
 */
export const executeBulkImport = async (req, res, next) => {
  try {
    const { branch_id, rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No rows provided for bulk import' });
    }

    let targetBranchId = req.user.role === 'super_admin' ? (branch_id ? Number(branch_id) : 1) : req.user.branch_id;
    if (!targetBranchId) targetBranchId = 1;

    // Get branch code
    let branchCode = 'GPS';
    const branchRows = await query('SELECT code, name FROM branches WHERE id = ?', [targetBranchId]);
    if (branchRows.length > 0 && branchRows[0].code) {
      branchCode = branchRows[0].code.trim().toUpperCase();
    }

    // Determine current active academic year
    let activeYearId = 1;
    try {
      const activeYears = await query('SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1');
      if (activeYears.length > 0) activeYearId = activeYears[0].id;
    } catch (e) {}

    // Get active leave types
    let leaveTypes = [];
    try {
      leaveTypes = await query('SELECT id, annual_quota FROM staff_leave_types ORDER BY id ASC');
    } catch (e) {}

    let importedCount = 0;
    let skippedCount = 0;
    const results = [];

    // Filter only valid rows
    const validRows = rows.filter(r => r.status === 'valid' || (!r.errors || r.errors.length === 0));

    for (const r of validRows) {
      try {
        const isTeaching = String(r.staff_type).toLowerCase() === 'teaching';
        const typeCode = isTeaching ? 'T' : 'NT';
        const prefix = `${branchCode}-${typeCode}-`;

        // Sequential Emp No generation
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
        const empNo = `${prefix}${String(nextSeq).padStart(3, '0')}`;

        // Plain text password (phone or DOB DDMMYYYY)
        let plainPassword = String(r.phone || '').trim();
        if (!plainPassword || plainPassword.length < 4) {
          const dobFormatted = formatDobToDDMMYYYY(r.dob);
          plainPassword = dobFormatted || 'Staff@123';
        }

        const fullName = `${r.first_name || ''} ${r.last_name || ''}`.trim() || empNo;
        const userRole = isTeaching ? 'teacher' : 'staff';

        // Insert user
        const userResult = await query(
          `INSERT INTO users (name, username, password, role, branch_id, phone, status)
           VALUES (?, ?, ?, ?, ?, ?, 'active')`,
          [fullName, empNo, plainPassword, userRole, targetBranchId, r.phone || null]
        );
        const userId = userResult.insertId;

        // Insert staff profile
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
             status,
             gender,
             dob,
             phone,
             email,
             blood_group,
             marital_status,
             street_address,
             city,
             state,
             pincode,
             emergency_contact_name,
             emergency_contact_phone,
             qualification,
             highest_qualification,
             total_experience_years,
             previous_school_experience,
             bank_name,
             account_no,
             ifsc_code,
             pan_no,
             aadhaar_no
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'permanent', ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            targetBranchId,
            empNo,
            isTeaching ? 'teaching' : 'non_teaching',
            r.first_name,
            r.last_name || '',
            r.designation || (isTeaching ? 'Teacher' : 'Staff'),
            r.department || (isTeaching ? 'Academics' : 'Administration'),
            r.joining_date || null,
            r.gender || 'other',
            r.dob || null,
            r.phone || null,
            r.email || null,
            r.blood_group || null,
            r.marital_status || null,
            r.street_address || null,
            r.city || null,
            r.state || null,
            r.pincode || null,
            r.emergency_contact_name || null,
            r.emergency_contact_phone || null,
            r.qualification || null,
            r.qualification || null,
            Number(r.total_experience_years || 0),
            r.previous_school || null,
            r.bank_name || null,
            r.account_no || null,
            r.ifsc_code || null,
            r.pan_no || null,
            r.aadhaar_no || null,
          ]
        );
        const staffId = profileResult.insertId;

        // Auto-initialize leave balances
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
            [activeYearId, staffId, lt.id, quota, quota, quota]
          );
        }

        importedCount++;
        results.push({
          row_number: r.row_number,
          emp_no: empNo,
          name: fullName,
          username: empNo,
          password: plainPassword,
          status: 'success',
        });
      } catch (rowErr) {
        skippedCount++;
        results.push({
          row_number: r.row_number,
          name: `${r.first_name} ${r.last_name}`,
          status: 'error',
          error: rowErr.message,
        });
      }
    }

    res.json({
      message: `Bulk onboarding completed: ${importedCount} staff imported, ${skippedCount} skipped`,
      imported_count: importedCount,
      skipped_count: skippedCount,
      results,
    });
  } catch (error) {
    next(error);
  }
};
