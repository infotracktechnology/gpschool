import { query } from '../config/database.js';

export const getBranchAcademicYears = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, status } = req.query;

    let sql = `
      SELECT bay.id, bay.branch_id, bay.academic_year_id, bay.start_date, bay.end_date, bay.status,
             b.name AS branch_name, b.code AS branch_code,
             bd.name AS board_name, bd.code AS board_code,
             ay.name AS academic_year_name, ay.code AS academic_year_code, ay.is_current AS is_global_current
      FROM branch_academic_years bay
      JOIN branches b ON bay.branch_id = b.id
      JOIN boards bd ON b.board_id = bd.id
      JOIN academic_years ay ON bay.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      sql += ' AND bay.branch_id = ?';
      params.push(req.user.branch_id);
    } else if (branch_id) {
      sql += ' AND bay.branch_id = ?';
      params.push(branch_id);
    }

    if (academic_year_id) {
      sql += ' AND bay.academic_year_id = ?';
      params.push(academic_year_id);
    }

    if (status) {
      sql += ' AND bay.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY bay.start_date DESC';

    const mappings = await query(sql, params);
    res.json({ mappings });
  } catch (error) {
    next(error);
  }
};

export const createBranchAcademicYear = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, start_date, end_date, status = 'active' } = req.body;

    if (!branch_id || !academic_year_id || !start_date || !end_date) {
      return res.status(400).json({
        message: 'Branch, Academic Year, Start Date, and End Date are all required.',
      });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({
        message: 'End date must be after Start date.',
      });
    }

    // Check if mapping already exists
    const existing = await query(
      'SELECT id FROM branch_academic_years WHERE branch_id = ? AND academic_year_id = ?',
      [branch_id, academic_year_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: 'This Branch is already mapped to the selected Academic Year.',
      });
    }

    const result = await query(
      `INSERT INTO branch_academic_years (branch_id, academic_year_id, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(branch_id), Number(academic_year_id), start_date, end_date, status]
    );

    res.status(201).json({
      message: 'Branch mapped to Academic Year successfully',
      mappingId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBranchAcademicYear = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, status } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Start Date and End Date are required' });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ message: 'End date must be after Start date.' });
    }

    const existing = await query('SELECT id FROM branch_academic_years WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Branch Academic Year mapping not found' });
    }

    await query(
      `UPDATE branch_academic_years
       SET start_date = ?, end_date = ?, status = ?
       WHERE id = ?`,
      [start_date, end_date, status || 'active', id]
    );

    res.json({ message: 'Branch Academic Year mapping updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteBranchAcademicYear = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id FROM branch_academic_years WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Mapping not found' });
    }

    await query('DELETE FROM branch_academic_years WHERE id = ?', [id]);
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    next(error);
  }
};
