import { query } from '../config/database.js';

export const getClasses = async (req, res, next) => {
  try {
    const { stage, status } = req.query;
    let sql = 'SELECT * FROM classes WHERE 1=1';
    const params = [];

    if (stage) {
      sql += ' AND stage = ?';
      params.push(stage);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY display_order ASC, name ASC';

    const classes = await query(sql, params);
    res.json({ classes });
  } catch (error) {
    next(error);
  }
};

export const createClass = async (req, res, next) => {
  try {
    const { code, name, stage, display_order = 0, status = 'active' } = req.body;

    if (!code || !name || !stage) {
      return res.status(400).json({ message: 'Class code, name, and stage are required' });
    }

    const validStages = ['pre_primary', 'primary', 'middle', 'secondary', 'higher_secondary'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
    }

    const existing = await query('SELECT id FROM classes WHERE code = ?', [code.trim().toUpperCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'A class with this code already exists' });
    }

    const result = await query(
      `INSERT INTO classes (code, name, stage, display_order, status)
       VALUES (?, ?, ?, ?, ?)`,
      [code.trim().toUpperCase(), name.trim(), stage, Number(display_order) || 0, status || 'active']
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
    const { code, name, stage, display_order, status } = req.body;

    const existing = await query('SELECT id FROM classes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (code) {
      const duplicate = await query('SELECT id FROM classes WHERE code = ? AND id != ?', [code.trim().toUpperCase(), id]);
      if (duplicate.length > 0) {
        return res.status(409).json({ message: 'A class with this code already exists' });
      }
    }

    const validStages = ['pre_primary', 'primary', 'middle', 'secondary', 'higher_secondary'];
    if (stage && !validStages.includes(stage)) {
      return res.status(400).json({ message: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
    }

    await query(
      `UPDATE classes
       SET code = COALESCE(?, code),
           name = COALESCE(?, name),
           stage = COALESCE(?, stage),
           display_order = COALESCE(?, display_order),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
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

    await query('DELETE FROM classes WHERE id = ?', [id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    next(error);
  }
};
