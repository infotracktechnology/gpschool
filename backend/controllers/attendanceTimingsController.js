import { query } from '../config/database.js';

// GET /attendance/timings — list timing configs with optional filters
export const getTimings = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id } = req.query;

    let sql = `
      SELECT
        at.id,
        at.branch_id,
        at.academic_year_id,
        at.timing_name,
        at.session1_start,
        at.session1_end,
        at.session2_enabled,
        at.session2_name,
        at.session2_start,
        at.session2_end,
        at.is_active,
        at.created_at,
        at.updated_at,
        b.name  AS branch_name,
        ay.label AS year_label
      FROM attendance_timings at
      LEFT JOIN branches b        ON at.branch_id        = b.id
      LEFT JOIN academic_years ay ON at.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      sql += ' AND at.branch_id = ?';
      params.push(Number(branch_id));
    }
    if (academic_year_id) {
      sql += ' AND at.academic_year_id = ?';
      params.push(Number(academic_year_id));
    }

    sql += ' ORDER BY at.is_active DESC, at.created_at DESC';

    const timings = await query(sql, params);
    res.json({ timings });
  } catch (error) {
    next(error);
  }
};

// POST /attendance/timings — create a new timing config
export const createTiming = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      timing_name,
      session1_start,
      session1_end,
      session2_enabled = 0,
      session2_name,
      session2_start,
      session2_end,
    } = req.body;

    if (!branch_id || !academic_year_id || !timing_name || !session1_start || !session1_end) {
      return res.status(400).json({
        message: 'branch_id, academic_year_id, timing_name, session1_start, and session1_end are required.',
      });
    }

    if (Number(session2_enabled) === 1) {
      if (!session2_start || !session2_end) {
        return res.status(400).json({
          message: 'session2_start and session2_end are required when session2 is enabled.',
        });
      }
    }

    const result = await query(
      `INSERT INTO attendance_timings
        (branch_id, academic_year_id, timing_name, session1_start, session1_end,
         session2_enabled, session2_name, session2_start, session2_end, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        Number(branch_id),
        Number(academic_year_id),
        timing_name.trim(),
        session1_start,
        session1_end,
        Number(session2_enabled) ? 1 : 0,
        session2_name || null,
        session2_start || null,
        session2_end || null,
      ]
    );

    res.status(201).json({ message: 'Timing config created successfully', id: result.insertId });
  } catch (error) {
    next(error);
  }
};

// PUT /attendance/timings/:id — update a timing config
export const updateTiming = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      branch_id,
      academic_year_id,
      timing_name,
      session1_start,
      session1_end,
      session2_enabled = 0,
      session2_name,
      session2_start,
      session2_end,
    } = req.body;

    if (!branch_id || !academic_year_id || !timing_name || !session1_start || !session1_end) {
      return res.status(400).json({
        message: 'branch_id, academic_year_id, timing_name, session1_start, and session1_end are required.',
      });
    }

    if (Number(session2_enabled) === 1) {
      if (!session2_start || !session2_end) {
        return res.status(400).json({
          message: 'session2_start and session2_end are required when session2 is enabled.',
        });
      }
    }

    const existing = await query('SELECT id FROM attendance_timings WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Timing config not found.' });
    }

    await query(
      `UPDATE attendance_timings
       SET branch_id = ?, academic_year_id = ?, timing_name = ?,
           session1_start = ?, session1_end = ?,
           session2_enabled = ?, session2_name = ?, session2_start = ?, session2_end = ?
       WHERE id = ?`,
      [
        Number(branch_id),
        Number(academic_year_id),
        timing_name.trim(),
        session1_start,
        session1_end,
        Number(session2_enabled) ? 1 : 0,
        session2_name || null,
        session2_start || null,
        session2_end || null,
        id,
      ]
    );

    res.json({ message: 'Timing config updated successfully' });
  } catch (error) {
    next(error);
  }
};

// DELETE /attendance/timings/:id — delete a timing config (not if active)
export const deleteTiming = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rows = await query('SELECT id, is_active FROM attendance_timings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Timing config not found.' });
    }
    if (rows[0].is_active) {
      return res.status(400).json({
        message: 'Cannot delete an active timing config. Deactivate it first.',
      });
    }

    await query('DELETE FROM attendance_timings WHERE id = ?', [id]);
    res.json({ message: 'Timing config deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// PATCH /attendance/timings/:id/set-active — set one config as active for its branch+year
export const setActiveTiming = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rows = await query('SELECT * FROM attendance_timings WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Timing config not found.' });
    }

    const { branch_id, academic_year_id } = rows[0];

    // Deactivate all configs for this branch + year
    await query(
      'UPDATE attendance_timings SET is_active = 0 WHERE branch_id = ? AND academic_year_id = ?',
      [branch_id, academic_year_id]
    );

    // Activate the requested config
    await query('UPDATE attendance_timings SET is_active = 1 WHERE id = ?', [id]);

    const updated = await query(
      `SELECT
         at.id, at.branch_id, at.academic_year_id, at.timing_name,
         at.session1_start, at.session1_end,
         at.session2_enabled, at.session2_name, at.session2_start, at.session2_end,
         at.is_active, at.created_at, at.updated_at,
         b.name  AS branch_name,
         ay.label AS year_label
       FROM attendance_timings at
       LEFT JOIN branches b        ON at.branch_id        = b.id
       LEFT JOIN academic_years ay ON at.academic_year_id = ay.id
       WHERE at.id = ?`,
      [id]
    );

    res.json({ message: 'Timing config set as active', timing: updated[0] });
  } catch (error) {
    next(error);
  }
};

// GET /attendance/timings/active — get active timing for a branch+year
export const getActiveTiming = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id } = req.query;

    if (!branch_id || !academic_year_id) {
      return res.status(400).json({ message: 'branch_id and academic_year_id are required.' });
    }

    const rows = await query(
      `SELECT
         at.id, at.branch_id, at.academic_year_id, at.timing_name,
         at.session1_start, at.session1_end,
         at.session2_enabled, at.session2_name, at.session2_start, at.session2_end,
         at.is_active, at.created_at, at.updated_at,
         b.name  AS branch_name,
         ay.label AS year_label
       FROM attendance_timings at
       LEFT JOIN branches b        ON at.branch_id        = b.id
       LEFT JOIN academic_years ay ON at.academic_year_id = ay.id
       WHERE at.branch_id = ? AND at.academic_year_id = ? AND at.is_active = 1
       LIMIT 1`,
      [Number(branch_id), Number(academic_year_id)]
    );

    res.json({ timing: rows.length > 0 ? rows[0] : null });
  } catch (error) {
    next(error);
  }
};
