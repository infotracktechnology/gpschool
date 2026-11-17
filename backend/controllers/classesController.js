import { query } from '../config/database.js';

export const getClasses = async (req, res, next) => {
  try {
    const { branch_id, stage, status } = req.query;
    let sql = `
      SELECT classes.*, b.name AS branch_name, b.code AS branch_code
      FROM classes
      JOIN branches b ON classes.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based branch scoping
    if (req.user && req.user.role !== 'super_admin' && req.user.branch_id) {
      sql += ' AND classes.branch_id = ?';
      params.push(req.user.branch_id);
    } else if (branch_id && branch_id !== 'all') {
      sql += ' AND classes.branch_id = ?';
      params.push(branch_id);
    }

    if (stage) {
      sql += ' AND classes.stage = ?';
      params.push(stage);
    }

    if (status) {
      sql += ' AND classes.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY classes.display_order ASC, classes.name ASC';

    const classes = await query(sql, params);
    res.json({ classes });
  } catch (error) {
    next(error);
  }
};

export const createClass = async (req, res, next) => {
  try {
    let { branch_id, code, name, stage, display_order = 0, status = 'active' } = req.body;

    // For non-super_admins, force branch_id = req.user.branch_id
    if (req.user && req.user.role !== 'super_admin' && req.user.branch_id) {
      branch_id = req.user.branch_id;
    }

    if (!branch_id) {
      return res.status(400).json({ message: 'Branch is required' });
    }

    if (!code || !name || !stage) {
      return res.status(400).json({ message: 'Class code, name, and stage are required' });
    }

    const validStages = ['pre_primary', 'primary', 'middle', 'secondary', 'higher_secondary'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
    }

    const classCode = code.trim().toUpperCase();

    // Verify branch exists
    const branch = await query('SELECT id FROM branches WHERE id = ?', [branch_id]);
    if (branch.length === 0) {
      return res.status(400).json({ message: 'Selected branch does not exist' });
    }

    const existing = await query(
      'SELECT id FROM classes WHERE branch_id = ? AND code = ?',
      [branch_id, classCode]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'A class with this code already exists for this branch' });
    }

    const result = await query(
      `INSERT INTO classes (branch_id, code, name, stage, display_order, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(branch_id), classCode, name.trim(), stage, Number(display_order) || 0, status || 'active']
    );

    res.status(201).json({
      message: 'Class created successfully',
      classId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { branch_id, code, name, stage, display_order, status } = req.body;

    const existing = await query('SELECT * FROM classes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const current = existing[0];

    // Branch scoping permission check for non-super_admins
    if (req.user && req.user.role !== 'super_admin' && req.user.branch_id) {
      if (current.branch_id && current.branch_id !== req.user.branch_id) {
        return res.status(403).json({
          message: 'Forbidden: You do not have permission to update classes in other branches',
        });
      }
    }

    // Support updating branch_id (if super_admin) or keeping current branch
    let targetBranchId = current.branch_id;
    if (req.user?.role === 'super_admin') {
      if (branch_id !== undefined && branch_id !== null && branch_id !== '') {
        targetBranchId = Number(branch_id);
      }
    } else if (req.user?.branch_id) {
      targetBranchId = req.user.branch_id;
    }

    if (targetBranchId) {
      const branch = await query('SELECT id FROM branches WHERE id = ?', [targetBranchId]);
      if (branch.length === 0) {
        return res.status(400).json({ message: 'Selected branch does not exist' });
      }
    }

    const targetCode = code ? code.trim().toUpperCase() : current.code;

    // Check duplicate code per branch: WHERE branch_id = ? AND code = ? AND id != ?
    const duplicate = await query(
      'SELECT id FROM classes WHERE branch_id = ? AND code = ? AND id != ?',
      [targetBranchId, targetCode, id]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ message: 'A class with this code already exists for this branch' });
    }

    const validStages = ['pre_primary', 'primary', 'middle', 'secondary', 'higher_secondary'];
    if (stage && !validStages.includes(stage)) {
      return res.status(400).json({ message: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
    }

    await query(
      `UPDATE classes
       SET branch_id = ?,
           code = COALESCE(?, code),
           name = COALESCE(?, name),
           stage = COALESCE(?, stage),
           display_order = COALESCE(?, display_order),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        targetBranchId,
        code ? code.trim().toUpperCase() : null,
        name ? name.trim() : null,
        stage || null,
        display_order !== undefined ? Number(display_order) : null,
        status || null,
        id,
      ]
    );

    res.json({ message: 'Class updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT * FROM classes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const current = existing[0];

    // Verify permissions and branch scoping
    if (req.user && req.user.role !== 'super_admin' && req.user.branch_id) {
      if (current.branch_id && current.branch_id !== req.user.branch_id) {
        return res.status(403).json({
          message: 'Forbidden: You do not have permission to delete classes in other branches',
        });
      }
    }

    // Check if sections exist
    const sections = await query('SELECT id FROM branch_class_sections WHERE class_id = ? LIMIT 1', [id]);
    if (sections.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete class because sections are configured for it. Please deactivate instead.',
      });
    }

    // Check if subjects exist
    const subjects = await query('SELECT id FROM subjects WHERE class_id = ? LIMIT 1', [id]);
    if (subjects.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete class because subjects are mapped to it. Please deactivate instead.',
      });
    }

    // Check if admissions exist
    const admissions = await query('SELECT id FROM admissions WHERE class_id = ? LIMIT 1', [id]);
    if (admissions.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete class because admissions exist for it. Please deactivate instead.',
      });
    }

    // Check if applications exist
    const applications = await query('SELECT id FROM applications WHERE class_id = ? LIMIT 1', [id]);
    if (applications.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete class because applications exist for it. Please deactivate instead.',
      });
    }

    // Check if enquiries exist
    const enquiries = await query('SELECT id FROM enquiries WHERE class_id = ? LIMIT 1', [id]);
    if (enquiries.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete class because enquiries exist for it. Please deactivate instead.',
      });
    }

    await query('DELETE FROM classes WHERE id = ?', [id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    next(error);
  }
};
