import { query } from '../../config/database.js';

export const getLeadSources = async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = `SELECT * FROM lead_sources WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY name ASC';
    const leadSources = await query(sql, params);
    res.json({ leadSources });
  } catch (error) {
    next(error);
  }
};

export const createLeadSource = async (req, res, next) => {
  try {
    const { name, description, status = 'active' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Lead source name is required' });
    }

    const existing = await query(`SELECT id FROM lead_sources WHERE name = ?`, [name.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'A lead source with this name already exists' });
    }

    const result = await query(
      `INSERT INTO lead_sources (name, description, status) VALUES (?, ?, ?)`,
      [name.trim(), description || null, status]
    );

    const [created] = await query(`SELECT * FROM lead_sources WHERE id = ?`, [result.insertId]);
    res.status(201).json({
      message: 'Lead source created successfully',
      leadSource: created,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeadSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const existing = await query(`SELECT * FROM lead_sources WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Lead source not found' });
    }

    if (name) {
      const duplicate = await query(
        `SELECT id FROM lead_sources WHERE name = ? AND id != ?`,
        [name.trim(), id]
      );
      if (duplicate.length > 0) {
        return res.status(409).json({ message: 'Another lead source with this name already exists' });
      }
    }

    await query(
      `UPDATE lead_sources 
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           status = COALESCE(?, status),
           updated_at = NOW()
       WHERE id = ?`,
      [name ? name.trim() : null, description !== undefined ? description : null, status || null, id]
    );

    const [updated] = await query(`SELECT * FROM lead_sources WHERE id = ?`, [id]);
    res.json({
      message: 'Lead source updated successfully',
      leadSource: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLeadSource = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if in use by any enquiry
    const inUse = await query(
      `SELECT id FROM enquiries WHERE lead_source_id = ? LIMIT 1`,
      [id]
    );
    if (inUse.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete lead source because it is referenced by existing enquiries. You can mark it inactive instead.',
      });
    }

    const result = await query(`DELETE FROM lead_sources WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lead source not found' });
    }

    res.json({ message: 'Lead source deleted successfully' });
  } catch (error) {
    next(error);
  }
};
