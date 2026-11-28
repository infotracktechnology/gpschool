import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const enrichUserContext = async (user) => {
  let studentId = user.student_id || null;
  let staffProfile = null;

  if (user.role === 'student') {
    const stuRows = await query(
      `SELECT id FROM students WHERE LOWER(admission_no) = ? LIMIT 1`,
      [(user.username || '').toLowerCase()]
    );
    if (stuRows.length > 0) {
      studentId = stuRows[0].id;
    }
  } else {
    const spRows = await query(
      `SELECT id, emp_no, designation, department, staff_type, avatar_url AS photo_url
       FROM staff_profiles
       WHERE user_id = ?
       LIMIT 1`,
      [user.id]
    );
    if (spRows.length > 0) {
      staffProfile = spRows[0];
    }
  }

  return {
    student_id: studentId,
    staff_id: staffProfile?.id || null,
    emp_no: staffProfile?.emp_no || null,
    designation: staffProfile?.designation || null,
    department: staffProfile?.department || null,
    staff_type: staffProfile?.staff_type || null,
    photo_url: staffProfile?.photo_url || null,
  };
};

export const login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = (username || email || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: 'Username/Email and password are required' });
    }

    let users = await query(
      `SELECT u.id, u.name, u.username, u.password, u.role, u.branch_id, u.status, b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE LOWER(u.username) = ?`,
      [loginIdentifier.toLowerCase()]
    );

    if (users.length === 0) {
      users = await query(
        `SELECT u.id, u.name, u.username, u.password, u.role, u.branch_id, u.status, b.name AS branch_name
         FROM staff_profiles sp
         JOIN users u ON sp.user_id = u.id
         LEFT JOIN branches b ON u.branch_id = b.id
         WHERE LOWER(sp.emp_no) = ?
            OR (sp.email IS NOT NULL AND sp.email != '' AND LOWER(sp.email) = ?)
         LIMIT 1`,
        [loginIdentifier.toLowerCase(), loginIdentifier.toLowerCase()]
      );
    }

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is inactive. Please contact your administrator.' });
    }

    // Support both plain text passwords (legacy student/staff accounts)
    // and bcrypt hashed passwords (admin accounts & newly generated credentials)
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
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Get current global active academic year
    const activeYears = await query(
      `SELECT id, code, name FROM academic_years WHERE is_current = TRUE LIMIT 1`
    );

    const extraContext = await enrichUserContext(user);

    const safeUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.username, // Backward compatibility alias
      role: user.role,
      branch_id: user.branch_id,
      branch_name: user.branch_name,
      ...extraContext,
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

    const extraContext = await enrichUserContext(req.user);

    res.json({
      user: {
        ...req.user,
        ...extraContext,
        current_academic_year: activeYears[0] || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
