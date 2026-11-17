import { query } from '../config/database.js';

export const getSections = async (req, res, next) => {
  try {
    const { branch_id, class_id, status } = req.query;

    let sql = `
      SELECT bcs.id, bcs.branch_id, bcs.class_id, bcs.name,
             bcs.capacity, bcs.room_no, bcs.status, bcs.created_at, bcs.updated_at,
             b.name AS branch_name, b.code AS branch_code,
             c.name AS class_name, c.code AS class_code, c.stage AS class_stage, c.display_order AS class_display_order
      FROM branch_class_sections bcs
      JOIN branches b ON bcs.branch_id = b.id
      JOIN classes c ON bcs.class_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based branch scoping
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      sql += ' AND bcs.branch_id = ?';
      params.push(req.user.branch_id);
    } else if (branch_id) {
      sql += ' AND bcs.branch_id = ?';
      params.push(branch_id);
    }

    if (class_id) {
      sql += ' AND bcs.class_id = ?';
      params.push(class_id);
    }

    if (status) {
      sql += ' AND bcs.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY c.display_order ASC, c.name ASC, bcs.name ASC';

    const sections = await query(sql, params);
    res.json({ sections });
  } catch (error) {
    next(error);
  }
};

export const createSection = async (req, res, next) => {
  try {
    let { branch_id, class_id, name, capacity = 40, room_no, status = 'active' } = req.body;

    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      branch_id = req.user.branch_id;
    }

    if (!branch_id || !class_id || !name) {
      return res.status(400).json({
        message: 'Branch, Class, and Section Name are required',
      });
    }

    const sectionName = name.trim().toUpperCase();

    // Check duplicate
    const existing = await query(
      `SELECT id FROM branch_class_sections 
       WHERE branch_id = ? AND class_id = ? AND name = ?`,
      [branch_id, class_id, sectionName]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: `Section "${sectionName}" already exists for this branch and class`,
      });
    }

    const result = await query(
      `INSERT INTO branch_class_sections (branch_id, class_id, name, capacity, room_no, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(branch_id),
        Number(class_id),
        sectionName,
        Number(capacity) || 40,
        room_no ? room_no.trim() : null,
        status || 'active',
      ]
    );

    res.status(201).json({
      message: 'Section created successfully',
      sectionId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { branch_id, class_id, name, capacity, room_no, status } = req.body;

    const existing = await query('SELECT * FROM branch_class_sections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Section not found' });
    }

    const current = existing[0];
    const targetBranchId = req.user.role !== 'super_admin' && req.user.branch_id ? req.user.branch_id : (branch_id || current.branch_id);
    const targetClassId = class_id || current.class_id;
    const targetName = name ? name.trim().toUpperCase() : current.name;

    // Check duplicate if key components changed
    if (
      targetBranchId !== current.branch_id ||
      targetClassId !== current.class_id ||
      targetName !== current.name
    ) {
      const duplicate = await query(
        `SELECT id FROM branch_class_sections 
         WHERE branch_id = ? AND class_id = ? AND name = ? AND id != ?`,
        [targetBranchId, targetClassId, targetName, id]
      );

      if (duplicate.length > 0) {
        return res.status(409).json({
          message: `Section "${targetName}" already exists for this branch and class`,
        });
      }
    }

    await query(
      `UPDATE branch_class_sections
       SET branch_id = ?,
           class_id = ?,
           name = ?,
           capacity = COALESCE(?, capacity),
           room_no = ?,
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        Number(targetBranchId),
        Number(targetClassId),
        targetName,
        capacity !== undefined ? Number(capacity) : null,
        room_no !== undefined ? (room_no ? room_no.trim() : null) : current.room_no,
        status || null,
        id,
      ]
    );

    res.json({ message: 'Section updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id FROM branch_class_sections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Section not found' });
    }

    await query('DELETE FROM branch_class_sections WHERE id = ?', [id]);
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    next(error);
  }
};
