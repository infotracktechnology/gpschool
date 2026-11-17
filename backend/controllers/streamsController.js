import { query } from '../config/database.js';

export const getStreams = async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM streams WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY name ASC';

    const streams = await query(sql, params);
    res.json({ streams });
  } catch (error) {
    next(error);
  }
};

export const createStream = async (req, res, next) => {
  try {
    const { code, name, description, status = 'active' } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: 'Stream code and name are required' });
    }

    const existing = await query('SELECT id FROM streams WHERE code = ?', [code.trim().toUpperCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'A stream with this code already exists' });
    }

    const result = await query(
      `INSERT INTO streams (code, name, description, status)
       VALUES (?, ?, ?, ?)`,
      [code.trim().toUpperCase(), name.trim(), description || null, status || 'active']
    );

    res.status(201).json({
      message: 'Stream created successfully',
      streamId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, description, status } = req.body;

    const existing = await query('SELECT id FROM streams WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Stream not found' });
    }

    if (code) {
      const duplicate = await query('SELECT id FROM streams WHERE code = ? AND id != ?', [code.trim().toUpperCase(), id]);
      if (duplicate.length > 0) {
        return res.status(409).json({ message: 'A stream with this code already exists' });
      }
    }

    await query(
      `UPDATE streams
       SET code = COALESCE(?, code),
           name = COALESCE(?, name),
           description = COALESCE(?, description),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        code ? code.trim().toUpperCase() : null,
        name ? name.trim() : null,
        description !== undefined ? description : null,
        status || null,
        id,
      ]
    );

    res.json({ message: 'Stream updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteStream = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if subjects use this stream
    const subjects = await query('SELECT id FROM subjects WHERE stream_id = ? LIMIT 1', [id]);
    if (subjects.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete stream because subjects are assigned to it. Please deactivate instead.',
      });
    }

    await query('DELETE FROM streams WHERE id = ?', [id]);
    res.json({ message: 'Stream deleted successfully' });
  } catch (error) {
    next(error);
  }
};
