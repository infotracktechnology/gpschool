import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'school_erp_jwt_secret_key_2026_xyz');

    const users = await query(
      `SELECT u.id, u.name, u.email, u.role, u.branch_id, u.phone, u.status, b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found or no longer exists' });
    }

    const user = users[0];
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'User account is inactive. Please contact administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};
