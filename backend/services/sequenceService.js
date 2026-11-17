import { pool } from '../config/database.js';

/**
 * Atomically generates and increments the next sequence number for a series.
 * @param {number} branchId
 * @param {number} academicYearId
 * @param {'enquiry'|'application'|'admission'} seriesType
 * @param {import('mysql2/promise').PoolConnection} [externalConn]
 * @returns {Promise<string>} e.g. "ENQ/2026-2027/0001"
 */
export async function getNextSequenceNumber(branchId, academicYearId, seriesType, externalConn = null) {
  const conn = externalConn || (await pool.getConnection());
  const isInternalTx = !externalConn;

  try {
    if (isInternalTx) {
      await conn.beginTransaction();
    }

    // 1. Fetch academic year info
    const [ayRows] = await conn.query(
      `SELECT id, code, name FROM academic_years WHERE id = ?`,
      [academicYearId]
    );
    const yearCode = ayRows.length > 0 ? (ayRows[0].code || ayRows[0].name) : 'YYYY';

    // 2. Fetch and lock number series record
    let [seriesRows] = await conn.query(
      `SELECT * FROM admission_number_series 
       WHERE branch_id = ? AND academic_year_id = ? AND series_type = ? 
       FOR UPDATE`,
      [branchId, academicYearId, seriesType]
    );

    let series;
    if (seriesRows.length === 0) {
      // Auto-create default series if not found
      const defaultPrefixMap = {
        enquiry: 'ENQ/',
        application: 'APP/',
        admission: 'ADM/',
      };
      const defPrefix = defaultPrefixMap[seriesType] || `${seriesType.toUpperCase().slice(0, 3)}/`;

      await conn.query(
        `INSERT INTO admission_number_series 
         (branch_id, academic_year_id, series_type, prefix, include_year, current_number, padding_digits, status)
         VALUES (?, ?, ?, ?, TRUE, 1, 4, 'active')`,
        [branchId, academicYearId, seriesType, defPrefix]
      );

      [seriesRows] = await conn.query(
        `SELECT * FROM admission_number_series 
         WHERE branch_id = ? AND academic_year_id = ? AND series_type = ? 
         FOR UPDATE`,
        [branchId, academicYearId, seriesType]
      );
    }

    series = seriesRows[0];
    const numToAssign = series.current_number || 1;
    const padding = series.padding_digits || 4;
    const paddedNum = String(numToAssign).padStart(padding, '0');

    // Clean prefix: Ensure single trailing slash if not present
    let rawPrefix = (series.prefix || `${seriesType.toUpperCase()}/`).trim();
    if (!rawPrefix.endsWith('/')) {
      rawPrefix += '/';
    }

    let generatedNumber = '';
    if (series.include_year) {
      generatedNumber = `${rawPrefix}${yearCode}/${paddedNum}`;
    } else {
      generatedNumber = `${rawPrefix}${paddedNum}`;
    }

    // Increment current_number for next allocation
    await conn.query(
      `UPDATE admission_number_series SET current_number = current_number + 1, updated_at = NOW() WHERE id = ?`,
      [series.id]
    );

    if (isInternalTx) {
      await conn.commit();
    }

    return generatedNumber;
  } catch (err) {
    if (isInternalTx) {
      await conn.rollback();
    }
    throw err;
  } finally {
    if (isInternalTx) {
      conn.release();
    }
  }
}
