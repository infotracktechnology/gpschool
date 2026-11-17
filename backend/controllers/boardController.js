import { query } from '../config/database.js';

export const getBoards = async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM boards WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY name ASC';

    const boards = await query(sql, params);
    res.json({ boards });
  } catch (error) {
    next(error);
  }
};

export const createBoard = async (req, res, next) => {
  try {
    const { code, name, description, status = 'active' } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: 'Board code and name are required' });
    }

    const result = await query(
      `INSERT INTO boards (code, name, description, status)
       VALUES (?, ?, ?, ?)`,
      [code.trim().toUpperCase(), name.trim(), description || null, status]
    );

    res.status(201).json({
      message: 'Board created successfully',
      boardId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, description, status } = req.body;

    const existing = await query('SELECT id FROM boards WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Board not found' });
    }

    await query(
      `UPDATE boards
       SET code = ?, name = ?, description = ?, status = ?
       WHERE id = ?`,
      [code.trim().toUpperCase(), name.trim(), description || null, status || 'active', id]
    );

    res.json({ message: 'Board updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteBoard = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if any branch uses this board
    const branches = await query('SELECT id FROM branches WHERE board_id = ? LIMIT 1', [id]);
    if (branches.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete board because one or more branches are associated with it. Please deactivate instead.',
      });
    }

    await query('DELETE FROM boards WHERE id = ?', [id]);
    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    next(error);
  }
};
