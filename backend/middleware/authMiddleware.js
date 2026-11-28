import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const sanitizeScopeId = (val) => {
  if (val === undefined || val === null) return null;
  const s = String(val).trim().toLowerCase();
  if (!s || s === 'all' || s === 'null' || s === 'undefined') return null;
  const n = Number(s);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const applyScopeToRequest = (req) => {
  const user = req.user || null;
  const isSuperAdmin = user?.role === 'super_admin';

  // Clean stray 'all' / 'undefined' / 'null' query params so controllers never hit SQL = 'all'
  if (req.query) {
    if (req.query.branch_id !== undefined && sanitizeScopeId(req.query.branch_id) === null) {
      delete req.query.branch_id;
    }
    if (req.query.academic_year_id !== undefined && sanitizeScopeId(req.query.academic_year_id) === null) {
      delete req.query.academic_year_id;
    }
  }

  const headerBranch = sanitizeScopeId(req.headers['x-branch-id']);
  const queryBranch = sanitizeScopeId(req.query?.branch_id);
  const bodyBranch = sanitizeScopeId(req.body?.branch_id);

  let effectiveBranchId = queryBranch ?? bodyBranch ?? headerBranch ?? null;
  if (!isSuperAdmin && user?.branch_id) {
    effectiveBranchId = Number(user.branch_id);
    if (req.query && req.query.branch_id !== undefined) {
      req.query.branch_id = String(effectiveBranchId);
    }
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body) && req.body.branch_id !== undefined) {
      req.body.branch_id = effectiveBranchId;
    }
  }

  const effectiveAcademicYearId =
    sanitizeScopeId(req.query?.academic_year_id) ??
    sanitizeScopeId(req.body?.academic_year_id) ??
    sanitizeScopeId(req.headers['x-academic-year-id']) ??
    null;

  req.scope = {
    branchId: effectiveBranchId,
    academicYearId: effectiveAcademicYearId,
    isSuperAdmin,
  };
};

/**
 * Shared SQL scope clause builder using req.scope
 */
export const buildScopeFilter = (req, alias = '', { includeBranch = true, includeAy = true } = {}) => {
  const prefix = alias ? `${alias}.` : '';
  const conditions = [];
  const params = [];
  const branchId = req.scope?.branchId ?? sanitizeScopeId(req.query?.branch_id);
  const academicYearId = req.scope?.academicYearId ?? sanitizeScopeId(req.query?.academic_year_id);

  if (includeBranch && branchId) {
    conditions.push(`${prefix}branch_id = ?`);
    params.push(branchId);
  }
  if (includeAy && academicYearId) {
    conditions.push(`${prefix}academic_year_id = ?`);
    params.push(academicYearId);
  }

  return {
    sql: conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '',
    whereSql: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '',
    params,
    branchId,
    academicYearId,
  };
};

/**
 * Resolve concrete branch_id and academic_year_id for INSERT mutations
 */
export const resolveWriteScope = async (req, { fallbackBranchId = null, requireBranch = true } = {}) => {
  const isSuperAdmin = req.user?.role === 'super_admin';
  let branchId = !isSuperAdmin && req.user?.branch_id
    ? Number(req.user.branch_id)
    : (sanitizeScopeId(req.body?.branch_id) ?? req.scope?.branchId ?? sanitizeScopeId(fallbackBranchId) ?? null);

  let academicYearId =
    sanitizeScopeId(req.body?.academic_year_id) ?? req.scope?.academicYearId ?? null;

  if (!branchId && !requireBranch) {
    const bRows = await query(
      `SELECT id FROM branches ORDER BY (status = 'active') DESC, id ASC LIMIT 1`
    );
    branchId = bRows[0]?.id || null;
  }

  if (!academicYearId) {
    const ayRows = await query(
      `SELECT id FROM academic_years ORDER BY (is_current = 1) DESC, (status = 'active') DESC, id DESC LIMIT 1`
    );
    academicYearId = ayRows[0]?.id || null;
  }

  return { branchId, academicYearId };
};

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const users = await query(
      `SELECT u.id, u.name, u.username, u.role, u.branch_id, u.phone, u.status, b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found or no longer exists' });
    }

    const user = users[0];
    user.email = user.username; // Backward compatibility alias
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'User account is inactive. Please contact administrator.' });
    }

    req.user = user;
    applyScopeToRequest(req);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

export const optionalToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const users = await query(
        `SELECT u.id, u.name, u.username, u.role, u.branch_id, u.phone, u.status, b.name AS branch_name
         FROM users u
         LEFT JOIN branches b ON u.branch_id = b.id
         WHERE u.id = ?`,
        [decoded.id]
      );
      if (users.length > 0 && users[0].status === 'active') {
        req.user = users[0];
      }
    }
  } catch (err) {
    // Ignore invalid optional tokens
  }
  next();
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
