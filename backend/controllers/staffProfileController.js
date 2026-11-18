import { query } from '../config/database.js';

// GET /staff-profiles — list all staff (admin + teacher) with their profile
export const getStaffProfiles = async (req, res, next) => {
  try {
    let sql = `
      SELECT
        u.id,
        u.name,
        u.username AS email,
        u.role,
        u.branch_id,
        b.name        AS branch_name,
        u.phone,
        u.status,
        sp.emp_no,
        sp.designation,
        sp.department,
        sp.joining_date,
        sp.qualification
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      WHERE u.role IN ('admin', 'teacher')
    `;
    const params = [];

    // Branch scoping: non-super_admin can only see their own branch
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      sql += ' AND u.branch_id = ?';
      params.push(req.user.branch_id);
    }

    sql += ' ORDER BY u.name ASC';

    const staff = await query(sql, params);
    res.json({ staff });
  } catch (error) {
    next(error);
  }
};

// GET /staff-profiles/:userId — get one staff member's profile
export const getStaffProfileById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    let sql = `
      SELECT
        u.id,
        u.name,
        u.username AS email,
        u.role,
        u.branch_id,
        b.name        AS branch_name,
        u.phone,
        u.status,
        sp.id         AS profile_id,
        sp.emp_no,
        sp.designation,
        sp.department,
        sp.joining_date,
        sp.qualification,
        sp.created_at,
        sp.updated_at
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      WHERE u.id = ?
        AND u.role IN ('admin', 'teacher')
    `;
    const params = [userId];

    // Branch scoping
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      sql += ' AND u.branch_id = ?';
      params.push(req.user.branch_id);
    }

    const rows = await query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.json({ staff: rows[0] });
  } catch (error) {
    next(error);
  }
};

// POST /staff-profiles — create or upsert a staff profile
export const createStaffProfile = async (req, res, next) => {
  try {
    const { user_id, emp_no, designation, department, joining_date, qualification } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }
    if (!emp_no || String(emp_no).trim() === '') {
      return res.status(400).json({ message: 'emp_no is required' });
    }

    // Verify the target user exists and is admin/teacher
    const users = await query(
      `SELECT id, role, branch_id FROM users WHERE id = ? AND role IN ('admin', 'teacher')`,
      [user_id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found or not a staff member (admin/teacher)' });
    }

    // Branch scoping check
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (users[0].branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden: Cannot manage staff outside your branch' });
      }
    }

    const result = await query(
      `INSERT INTO staff_profiles (user_id, emp_no, designation, department, joining_date, qualification)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         emp_no        = VALUES(emp_no),
         designation   = VALUES(designation),
         department    = VALUES(department),
         joining_date  = VALUES(joining_date),
         qualification = VALUES(qualification)`,
      [
        user_id,
        String(emp_no).trim(),
        designation || null,
        department || null,
        joining_date || null,
        qualification || null,
      ]
    );

    const isInsert = result.insertId > 0 && result.affectedRows === 1;
    res.status(isInsert ? 201 : 200).json({
      message: isInsert ? 'Staff profile created successfully' : 'Staff profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// PUT /staff-profiles/:userId — update a staff profile
export const updateStaffProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { emp_no, designation, department, joining_date, qualification } = req.body;

    if (emp_no !== undefined && String(emp_no).trim() === '') {
      return res.status(400).json({ message: 'emp_no cannot be empty' });
    }

    // Verify the target user
    const users = await query(
      `SELECT id, role, branch_id FROM users WHERE id = ? AND role IN ('admin', 'teacher')`,
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found or not a staff member (admin/teacher)' });
    }

    // Branch scoping check
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (users[0].branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden: Cannot manage staff outside your branch' });
      }
    }

    // Check profile exists
    const existing = await query('SELECT id FROM staff_profiles WHERE user_id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found. Use POST to create one.' });
    }

    const fields = [];
    const params = [];

    if (emp_no !== undefined) { fields.push('emp_no = ?'); params.push(String(emp_no).trim()); }
    if (designation !== undefined) { fields.push('designation = ?'); params.push(designation || null); }
    if (department !== undefined) { fields.push('department = ?'); params.push(department || null); }
    if (joining_date !== undefined) { fields.push('joining_date = ?'); params.push(joining_date || null); }
    if (qualification !== undefined) { fields.push('qualification = ?'); params.push(qualification || null); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    params.push(userId);
    await query(`UPDATE staff_profiles SET ${fields.join(', ')} WHERE user_id = ?`, params);

    res.json({ message: 'Staff profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

// DELETE /staff-profiles/:userId — delete a staff profile
export const deleteStaffProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify the target user
    const users = await query(
      `SELECT id, role, branch_id FROM users WHERE id = ? AND role IN ('admin', 'teacher')`,
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found or not a staff member (admin/teacher)' });
    }

    // Branch scoping check
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      if (users[0].branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden: Cannot manage staff outside your branch' });
      }
    }

    const result = await query('DELETE FROM staff_profiles WHERE user_id = ?', [userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    res.json({ message: 'Staff profile deleted successfully' });
  } catch (error) {
    next(error);
  }
};
