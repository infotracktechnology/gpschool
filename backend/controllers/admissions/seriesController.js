import { query } from '../../config/database.js';

export const getNumberSeries = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, series_type } = req.query;

    let sql = `
      SELECT s.*, 
             b.name AS branch_name, b.code AS branch_code,
             ay.name AS academic_year_name, ay.code AS academic_year_code
      FROM admission_number_series s
      JOIN branches b ON s.branch_id = b.id
      JOIN academic_years ay ON s.academic_year_id = ay.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      sql += ' AND s.branch_id = ?';
      params.push(Number(branch_id));
    }
    if (academic_year_id) {
      sql += ' AND s.academic_year_id = ?';
      params.push(Number(academic_year_id));
    }
    if (series_type) {
      sql += ' AND s.series_type = ?';
      params.push(series_type);
    }

    sql += ' ORDER BY s.branch_id ASC, s.academic_year_id ASC, s.series_type ASC';

    const series = await query(sql, params);
    res.json({ series });
  } catch (error) {
    next(error);
  }
};

export const upsertNumberSeries = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      series_type,
      prefix,
      include_year = true,
      current_number = 1,
      padding_digits = 4,
      status = 'active',
    } = req.body;

    if (!branch_id || !academic_year_id || !series_type || !prefix) {
      return res.status(400).json({
        message: 'Branch, academic year, series type, and prefix are required',
      });
    }

    await query(
      `INSERT INTO admission_number_series
       (branch_id, academic_year_id, series_type, prefix, include_year, current_number, padding_digits, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         prefix = VALUES(prefix),
         include_year = VALUES(include_year),
         current_number = VALUES(current_number),
         padding_digits = VALUES(padding_digits),
         status = VALUES(status),
         updated_at = NOW()`,
      [
        Number(branch_id),
        Number(academic_year_id),
        series_type,
        prefix.trim(),
        Boolean(include_year),
        Number(current_number),
        Number(padding_digits),
        status,
      ]
    );

    const [saved] = await query(
      `SELECT s.*, 
              b.name AS branch_name, 
              ay.name AS academic_year_name
       FROM admission_number_series s
       JOIN branches b ON s.branch_id = b.id
       JOIN academic_years ay ON s.academic_year_id = ay.id
       WHERE s.branch_id = ? AND s.academic_year_id = ? AND s.series_type = ?`,
      [branch_id, academic_year_id, series_type]
    );

    res.json({
      message: 'Number series configuration saved successfully',
      series: saved,
    });
  } catch (error) {
    next(error);
  }
};
