import { query, pool } from '../config/database.js';

export const getAcademicYears = async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM academic_years WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY code DESC';

    const academicYears = await query(sql, params);
    res.json({ academicYears });
  } catch (error) {
    next(error);
  }
};

export const createAcademicYear = async (req, res, next) => {
  try {
    const { code, name, is_current = false, status = 'active' } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: 'Academic Year code and display name are required' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (is_current) {
        await conn.query('UPDATE academic_years SET is_current = FALSE');
      }

      const [result] = await conn.query(
        `INSERT INTO academic_years (code, name, is_current, status)
         VALUES (?, ?, ?, ?)`,
        [code.trim(), name.trim(), Boolean(is_current), status]
      );

      await conn.commit();
      res.status(201).json({
        message: 'Academic Year created successfully',
        academicYearId: result.insertId,
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    next(error);
  }
};

export const updateAcademicYear = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, status, is_current } = req.body;

    const existing = await query('SELECT id FROM academic_years WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Academic Year not found' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (is_current) {
        await conn.query('UPDATE academic_years SET is_current = FALSE');
      }

      await conn.query(
        `UPDATE academic_years
         SET code = ?, name = ?, status = ?, is_current = ?
         WHERE id = ?`,
        [code.trim(), name.trim(), status || 'active', Boolean(is_current), id]
      );

      await conn.commit();
      res.json({ message: 'Academic Year updated successfully' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    next(error);
  }
};

export const setCurrentAcademicYear = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, name FROM academic_years WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Academic Year not found' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE academic_years SET is_current = FALSE');
      await conn.query('UPDATE academic_years SET is_current = TRUE WHERE id = ?', [id]);
      await conn.commit();

      res.json({ message: `"${existing[0].name}" is now set as the active current Academic Year.` });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    next(error);
  }
};

export const deleteAcademicYear = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if mappings exist
    const mappings = await query('SELECT id FROM branch_academic_years WHERE academic_year_id = ? LIMIT 1', [id]);
    if (mappings.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete Academic Year because it is mapped to one or more branches. Remove the mappings first.',
      });
    }

    await query('DELETE FROM academic_years WHERE id = ?', [id]);
    res.json({ message: 'Academic Year deleted successfully' });
  } catch (error) {
    next(error);
  }
};
