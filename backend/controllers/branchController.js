import { query } from '../config/database.js';

export const getBranches = async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT b.id, b.code, b.name, b.board_id, b.phone, b.email, b.address, b.logo, b.city, b.state, b.status,
             b.created_at, bd.name AS board_name, bd.code AS board_code
      FROM branches b
      LEFT JOIN boards bd ON b.board_id = bd.id
      WHERE 1=1
    `;
    const params = [];

    // Branch Admin can only see their branch if restricted
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      sql += ' AND b.id = ?';
      params.push(req.user.branch_id);
    }

    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.name ASC';

    const branches = await query(sql, params);
    res.json({ branches });
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req, res, next) => {
  try {
    const { code, name, board_id, phone, email, address, logo, city, state, status = 'active' } = req.body;

    if (!code || !name || !board_id) {
      return res.status(400).json({ message: 'Branch code, name, and board selection are required' });
    }

    // Verify board exists
    const boards = await query('SELECT id FROM boards WHERE id = ?', [board_id]);
    if (boards.length === 0) {
      return res.status(400).json({ message: 'Selected board does not exist' });
    }

    const result = await query(
      `INSERT INTO branches (code, name, board_id, phone, email, address, logo, city, state, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code.trim().toUpperCase(),
        name.trim(),
        Number(board_id),
        phone || null,
        email || null,
        address || null,
        logo || null,
        city || null,
        state || null,
        status,
      ]
    );

    res.status(201).json({
      message: 'Branch created successfully',
      branchId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, board_id, phone, email, address, logo, city, state, status } = req.body;

    const existing = await query('SELECT * FROM branches WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    if (board_id) {
      const boards = await query('SELECT id FROM boards WHERE id = ?', [board_id]);
      if (boards.length === 0) {
        return res.status(400).json({ message: 'Selected board does not exist' });
      }
    }

    await query(
      `UPDATE branches
       SET code = ?, name = ?, board_id = ?, phone = ?, email = ?, address = ?, logo = ?, city = ?, state = ?, status = ?
       WHERE id = ?`,
      [
        code.trim().toUpperCase(),
        name.trim(),
        Number(board_id),
        phone || null,
        email || null,
        address || null,
        logo !== undefined ? (logo || null) : existing[0].logo,
        city || null,
        state || null,
        status || 'active',
        id,
      ]
    );

    res.json({ message: 'Branch updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const uploadBranchLogoHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select a valid image file to upload' });
    }
    const url = `/uploads/branches/${req.file.filename}`;
    res.status(201).json({
      success: true,
      message: 'Branch logo uploaded successfully',
      url,
      filename: req.file.filename,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if branch has users or academic mappings
    const users = await query('SELECT id FROM users WHERE branch_id = ? LIMIT 1', [id]);
    if (users.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete branch because users are assigned to it. Deactivate the branch instead.',
      });
    }

    await query('DELETE FROM branches WHERE id = ?', [id]);
    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    next(error);
  }
};
