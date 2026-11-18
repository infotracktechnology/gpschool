import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = (username || email || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: 'Username/Email and password are required' });
    }

    const users = await query(
      `SELECT u.id, u.name, u.username, u.password, u.role, u.branch_id, u.status, b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE LOWER(u.username) = ?`,
      [loginIdentifier.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is inactive. Please contact your administrator.' });
    }

    // Support both plain text passwords (e.g. for student logins: "password hash vendam")
    // and bcrypt hashed passwords (for staff/admin accounts)
    let isMatch = false;
    if (user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'))) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, branch_id: user.branch_id },
      process.env.JWT_SECRET || 'school_erp_jwt_secret_key_2026_xyz',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Get current global active academic year
    const activeYears = await query(
      `SELECT id, code, name FROM academic_years WHERE is_current = TRUE LIMIT 1`
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.username, // Backward compatibility alias
      role: user.role,
      branch_id: user.branch_id,
      branch_name: user.branch_name,
      current_academic_year: activeYears[0] || null,
    };

    res.json({
      message: 'Login successful',
      token,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const activeYears = await query(
      `SELECT id, code, name FROM academic_years WHERE is_current = TRUE LIMIT 1`
    );

    res.json({
      user: {
        ...req.user,
        current_academic_year: activeYears[0] || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
