import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

export const getUsers = async (req, res, next) => {
  try {
    const { role, branch_id, status } = req.query;
    let sql = `
      SELECT u.id, u.name, u.email, u.role, u.branch_id, u.phone, u.status, u.created_at,
             b.name AS branch_name, b.code AS branch_code
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    // If caller is branch admin, only show users from their branch
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      sql += ' AND u.branch_id = ?';
      params.push(req.user.branch_id);
    } else if (branch_id) {
      sql += ' AND u.branch_id = ?';
      params.push(branch_id);
    }

    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    }

    if (status) {
      sql += ' AND u.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY u.created_at DESC';

    const users = await query(sql, params);
    res.json({ users });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'admin', branch_id, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Role check: Only super_admin can create super_admin
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only Super Admins can create other Super Admins' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (name, email, password, role, branch_id, phone, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        role,
        branch_id ? Number(branch_id) : null,
        phone || null,
      ]
    );

    res.status(201).json({
      message: 'User created successfully',
      userId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, branch_id, phone, status, password } = req.body;

    const existing = await query('SELECT id, role FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Role check: non-super_admin cannot elevate to super_admin or edit a super_admin
    if (existing[0].role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Cannot edit a Super Administrator' });
    }

    let sql = 'UPDATE users SET name = ?, phone = ?, status = ?';
    const params = [name, phone || null, status || 'active'];

    if (req.user.role === 'super_admin') {
      sql += ', role = ?, branch_id = ?';
      params.push(role, branch_id ? Number(branch_id) : null);
    }

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      sql += ', password = ?';
      params.push(hashedPassword);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await query(sql, params);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const existing = await query('SELECT id, role FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (existing[0].role === 'super_admin') {
      return res.status(403).json({ message: 'Cannot delete Super Admin' });
    }

    await query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
