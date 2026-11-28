import { pool, query } from '../config/database.js';
import { sanitizeScopeId } from '../middleware/authMiddleware.js';

const CAN_DIRECT_ISSUE_ROLES = ['super_admin', 'admin', 'principal'];

const TYPE_PREFIX_MAP = {
  bonafide: 'BON',
  tc: 'TC',
  study: 'STD',
  conduct: 'CND',
  character: 'CHR',
  custom: 'CUS',
};

const VALID_TYPES = Object.keys(TYPE_PREFIX_MAP);
const VALID_BORDERS = ['classic_double', 'royal_seal', 'minimal_mono', 'cbse_formal'];
const VALID_THEMES = ['monochrome', 'crimson_gold', 'navy_royal'];
const VALID_SIGNATURES = ['principal_only', 'principal_seal', 'principal_teacher'];

const parseJsonSafe = (val) => {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
};

const formatDateOnly = (val) => {
  if (!val) return null;
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) && s.endsWith('Z')) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const serializeCertificate = (row) => {
  if (!row) return row;
  return {
    ...row,
    dob: formatDateOnly(row.dob),
    issue_date: formatDateOnly(row.issue_date),
    tc_leaving_date: row.tc_leaving_date ? formatDateOnly(row.tc_leaving_date) : row.tc_leaving_date,
    custom_fields: parseJsonSafe(row.custom_fields),
  };
};

const renderBodyWithVars = (templateText = '', vars = {}) => {
  if (!templateText) return '';
  return String(templateText).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => {
    const val = vars[k];
    return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—';
  });
};

const generateCertificateNumber = async (certType = 'bonafide', branchId = null) => {
  const prefixType = TYPE_PREFIX_MAP[certType] || 'CRT';
  let branchCode = 'SCH';
  if (branchId) {
    const bRows = await query('SELECT code FROM branches WHERE id = ? LIMIT 1', [branchId]);
    if (bRows.length > 0 && bRows[0].code) {
      branchCode = String(bRows[0].code).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'SCH';
    }
  }
  const year = new Date().getFullYear();
  const fullPrefix = `${prefixType}/${branchCode}/${year}/`;

  let maxSeq = 0;
  const certRows = await query(
    `SELECT certificate_no FROM issued_certificates WHERE certificate_no LIKE ? ORDER BY id DESC LIMIT 10`,
    [`${fullPrefix}%`]
  );
  for (const r of certRows) {
    const num = parseInt(String(r.certificate_no || '').split('/').pop(), 10);
    if (!Number.isNaN(num) && num > maxSeq) maxSeq = num;
  }

  if (certType === 'tc') {
    const tcRows = await query(
      `SELECT tc_no FROM transfer_certificates WHERE tc_no LIKE ? ORDER BY id DESC LIMIT 10`,
      [`${fullPrefix}%`]
    );
    for (const r of tcRows) {
      const num = parseInt(String(r.tc_no || '').split('/').pop(), 10);
      if (!Number.isNaN(num) && num > maxSeq) maxSeq = num;
    }
  }

  return `${fullPrefix}${String(maxSeq + 1).padStart(4, '0')}`;
};

/**
 * Sync TC table + student/enrollment 'transferred' state inside an active transaction
 */
const syncTransferRecordOnIssue = async (conn, cert, userId) => {
  if (cert.certificate_type !== 'tc' || !cert.student_id) return null;

  const cf = parseJsonSafe(cert.custom_fields);
  const issueDate = formatDateOnly(cert.issue_date) || new Date().toISOString().slice(0, 10);
  const leavingDate = formatDateOnly(cf.leaving_date) || issueDate;
  const applicationDate = formatDateOnly(cf.application_date) || null;
  const conduct = cert.conduct_grade || cf.conduct || 'Good';
  const duesCleared = cf.dues_cleared === undefined ? 1 : cf.dues_cleared ? 1 : 0;
  const workingDays = cf.working_days !== undefined && cf.working_days !== '' ? Number(cf.working_days) : null;
  const presentDays = cf.present_days !== undefined && cf.present_days !== '' ? Number(cf.present_days) : null;

  // Locate latest enrollment if available
  const [enrRows] = await conn.query(
    `SELECT id, branch_id FROM student_enrollments
     WHERE student_id = ?
     ORDER BY (enrollment_status IN ('current', 'active')) DESC, id DESC LIMIT 1`,
    [cert.student_id]
  );
  const targetEnrollmentId = enrRows[0]?.id || null;
  const targetBranchId = cert.branch_id || enrRows[0]?.branch_id || 1;

  let tcId = cert.tc_id || null;

  if (tcId) {
    await conn.query(
      `UPDATE transfer_certificates SET
        issue_date = ?, leaving_date = ?, application_date = ?, reason_for_leaving = ?,
        conduct = ?, dues_cleared = ?, month_dues_paid = ?, last_class_studied = ?,
        last_exam_result = ?, failed_status = ?, promoted_to_class = ?,
        working_days = ?, present_days = ?, subjects_studied = ?, fee_concession = ?,
        extra_activities = ?, remarks = ?
       WHERE id = ?`,
      [
        issueDate,
        leavingDate,
        applicationDate,
        cf.reason_for_leaving || cert.purpose || 'Parents Request',
        conduct,
        duesCleared,
        cf.month_dues_paid || null,
        cf.last_class_studied || cert.class_or_dept || null,
        cf.last_exam_result || null,
        cf.failed_status || 'No',
        cf.promoted_to_class || null,
        workingDays,
        presentDays,
        cf.subjects_studied || null,
        cf.fee_concession || null,
        cf.extra_activities || null,
        cf.remarks || cert.footer_note || null,
        tcId,
      ]
    );
  } else {
    const [tcRes] = await conn.query(
      `INSERT INTO transfer_certificates (
        tc_no, student_id, enrollment_id, branch_id, academic_year_id, issue_date, leaving_date, application_date,
        reason_for_leaving, conduct, dues_cleared, month_dues_paid, last_class_studied,
        last_exam_result, failed_status, promoted_to_class, working_days, present_days,
        subjects_studied, fee_concession, extra_activities, remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cert.certificate_no,
        cert.student_id,
        targetEnrollmentId,
        targetBranchId,
        cert.academic_year_id || null,
        issueDate,
        leavingDate,
        applicationDate,
        cf.reason_for_leaving || cert.purpose || 'Parents Request',
        conduct,
        duesCleared,
        cf.month_dues_paid || null,
        cf.last_class_studied || cert.class_or_dept || null,
        cf.last_exam_result || null,
        cf.failed_status || 'No',
        cf.promoted_to_class || null,
        workingDays,
        presentDays,
        cf.subjects_studied || null,
        cf.fee_concession || null,
        cf.extra_activities || null,
        cf.remarks || cert.footer_note || null,
        userId || null,
      ]
    );
    tcId = tcRes.insertId;
    await conn.query(`UPDATE issued_certificates SET tc_id = ? WHERE id = ?`, [tcId, cert.id]);
  }

  await conn.query(`UPDATE students SET status = 'transferred' WHERE id = ?`, [cert.student_id]);
  if (targetEnrollmentId) {
    await conn.query(
      `UPDATE student_enrollments SET enrollment_status = 'transferred'
       WHERE student_id = ? AND enrollment_status IN ('current', 'active')`,
      [cert.student_id]
    );
  }

  return tcId;
};

/**
 * Roll back transfer_certificates row & restore student active status if a TC is revoked or deleted
 */
const rollbackTransferIfNeeded = async (conn, cert) => {
  if (!cert || cert.certificate_type !== 'tc') return;
  if (cert.tc_id) {
    await conn.query(`DELETE FROM transfer_certificates WHERE id = ?`, [cert.tc_id]);
  }
  if (cert.student_id) {
    const [remaining] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM transfer_certificates WHERE student_id = ?`,
      [cert.student_id]
    );
    if (Number(remaining[0]?.cnt || 0) === 0) {
      await conn.query(
        `UPDATE students SET status = 'active' WHERE id = ? AND status = 'transferred'`,
        [cert.student_id]
      );
      const [latestEnr] = await conn.query(
        `SELECT id FROM student_enrollments WHERE student_id = ? ORDER BY id DESC LIMIT 1`,
        [cert.student_id]
      );
      if (latestEnr.length > 0) {
        await conn.query(
          `UPDATE student_enrollments SET enrollment_status = 'current'
           WHERE id = ? AND enrollment_status = 'transferred'`,
          [latestEnr[0].id]
        );
      }
    }
  }
};

/**
 * GET /api/certificates/dashboard
 */
export const getCertificateDashboard = async (req, res, next) => {
  try {
    const branchId = req.scope?.branchId ?? sanitizeScopeId(req.query.branch_id);
    const academicYearId = sanitizeScopeId(req.query.academic_year_id) ?? req.scope?.academicYearId ?? null;

    const conditions = [];
    const params = [];
    if (branchId) {
      conditions.push('branch_id = ?');
      params.push(branchId);
    }
    if (academicYearId) {
      conditions.push('academic_year_id = ?');
      params.push(academicYearId);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const icConditions = conditions.map((c) => `ic.${c}`);
    const icAndClause = icConditions.length > 0 ? `AND ${icConditions.join(' AND ')}` : '';
    const icWhereClause = icConditions.length > 0 ? `WHERE ${icConditions.join(' AND ')}` : '';

    const [summary] = await query(
      `SELECT
        COUNT(*) AS total_records,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) AS total_issued,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS total_approved,
        SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS pending_approvals,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
        SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) AS revoked_count,
        SUM(CASE WHEN status = 'issued' AND DATE(COALESCE(issued_at, issue_date, created_at)) = CURDATE() THEN 1 ELSE 0 END) AS issued_today,
        COALESCE(SUM(reprint_count), 0) AS total_reprints
       FROM issued_certificates ${whereClause}`,
      params
    );

    const [tplStats] = await query(
      `SELECT
        COUNT(*) AS total_templates,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_templates
       FROM certificate_templates`
    );

    const byTypeRows = await query(
      `SELECT certificate_type,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) AS issued,
        SUM(CASE WHEN status IN ('approved', 'issued') THEN 1 ELSE 0 END) AS completed
       FROM issued_certificates ${whereClause}
       GROUP BY certificate_type`,
      params
    );

    const byType = {};
    for (const typeKey of VALID_TYPES) {
      const found = byTypeRows.find((r) => r.certificate_type === typeKey);
      byType[typeKey] = {
        total: Number(found?.total || 0),
        pending: Number(found?.pending || 0),
        issued: Number(found?.issued || 0),
        completed: Number(found?.completed || 0),
      };
    }

    const pendingSql = `
      SELECT ic.id, ic.certificate_no, ic.certificate_type, ic.recipient_type, ic.recipient_name,
             ic.ref_no, ic.class_or_dept, ic.purpose, ic.issue_date, ic.status, ic.created_at,
             b.name AS branch_name, u.name AS requested_by_name
      FROM issued_certificates ic
      LEFT JOIN branches b ON ic.branch_id = b.id
      LEFT JOIN users u ON ic.requested_by = u.id
      WHERE ic.status = 'pending_approval'
      ${icAndClause}
      ORDER BY ic.id DESC
      LIMIT 8
    `;
    const pendingList = await query(pendingSql, params);

    const recentSql = `
      SELECT ic.id, ic.certificate_no, ic.certificate_type, ic.recipient_type, ic.recipient_name,
             ic.ref_no, ic.class_or_dept, ic.title_heading, ic.purpose, ic.issue_date,
             ic.status, ic.reprint_count, ic.issued_at, ic.created_at,
             b.name AS branch_name, ct.name AS template_name, ay.name AS academic_year_name
      FROM issued_certificates ic
      LEFT JOIN branches b ON ic.branch_id = b.id
      LEFT JOIN certificate_templates ct ON ic.template_id = ct.id
      LEFT JOIN academic_years ay ON ic.academic_year_id = ay.id
      ${icWhereClause}
      ORDER BY ic.id DESC
      LIMIT 10
    `;
    const recentIssued = await query(recentSql, params);

    res.json({
      success: true,
      summary: {
        total_records: Number(summary?.total_records || 0),
        total_issued: Number(summary?.total_issued || 0),
        total_approved: Number(summary?.total_approved || 0),
        pending_approvals: Number(summary?.pending_approvals || 0),
        rejected_count: Number(summary?.rejected_count || 0),
        revoked_count: Number(summary?.revoked_count || 0),
        issued_today: Number(summary?.issued_today || 0),
        total_reprints: Number(summary?.total_reprints || 0),
        active_templates: Number(tplStats?.active_templates || 0),
        total_templates: Number(tplStats?.total_templates || 0),
      },
      byType,
      pendingList,
      recentIssued,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/search-students?q=...
 * Returns active/inactive/transferred students with class & section, parents, DOB, avatar, branch
 */
export const searchCertificateStudents = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const branchId = req.scope?.branchId ?? sanitizeScopeId(req.query.branch_id);
    const academicYearId = sanitizeScopeId(req.query.academic_year_id) ?? req.scope?.academicYearId;

    let sql = `
      SELECT
        s.id, s.admission_no, s.student_name, s.gender, s.dob, s.blood_group,
        s.nationality, s.religion, s.caste_category, s.father_name, s.father_phone,
        s.mother_name, s.mother_phone, s.avatar_url, s.status,
        se.id AS enrollment_id, se.branch_id, se.academic_year_id, se.class_id, se.section_id, se.roll_no,
        COALESCE(c.name, '') AS class_name,
        COALESCE(bcs.name, '') AS section_name,
        TRIM(CONCAT_WS(' - ', NULLIF(c.name, ''), NULLIF(bcs.name, ''))) AS class_section,
        b.name AS branch_name, b.code AS branch_code, b.logo AS branch_logo,
        ay.name AS academic_year_name
      FROM students s
      LEFT JOIN student_enrollments se ON se.id = (
        SELECT se2.id FROM student_enrollments se2
        WHERE se2.student_id = s.id
        ORDER BY ${academicYearId ? `(se2.academic_year_id = ${Number(academicYearId)}) DESC, ` : ''}(se2.enrollment_status IN ('current', 'active')) DESC, se2.id DESC
        LIMIT 1
      )
      LEFT JOIN classes c ON se.class_id = c.id
      LEFT JOIN branch_class_sections bcs ON se.section_id = bcs.id
      LEFT JOIN branches b ON se.branch_id = b.id
      LEFT JOIN academic_years ay ON se.academic_year_id = ay.id
      WHERE s.status IN ('active', 'inactive', 'transferred')
    `;
    const params = [];
    if (branchId) {
      sql += ` AND se.branch_id = ?`;
      params.push(branchId);
    }
    if (q && q.trim().length > 0) {
      sql += ` AND (s.student_name LIKE ? OR s.admission_no LIKE ? OR s.father_name LIKE ? OR c.name LIKE ?)`;
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }
    sql += ` ORDER BY (s.status = 'active') DESC, s.student_name ASC LIMIT 25`;
    const rows = await query(sql, params);
    const students = rows.map((s) => ({
      ...s,
      dob: formatDateOnly(s.dob),
    }));
    res.json({ success: true, students });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/search-staff?q=...
 */
export const searchCertificateStaff = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const branchId = req.scope?.branchId ?? sanitizeScopeId(req.query.branch_id);
    let sql = `
      SELECT
        sp.id, sp.emp_no,
        TRIM(CONCAT(COALESCE(sp.first_name, ''), ' ', COALESCE(sp.last_name, ''))) AS full_name,
        sp.department, sp.designation, sp.gender, sp.dob, sp.joining_date,
        sp.qualification, sp.phone, sp.email, sp.avatar_url, sp.branch_id, sp.status,
        b.name AS branch_name, b.code AS branch_code, b.logo AS branch_logo
      FROM staff_profiles sp
      LEFT JOIN branches b ON sp.branch_id = b.id
      WHERE sp.status IN ('active', 'inactive')
    `;
    const params = [];
    if (branchId) {
      sql += ` AND sp.branch_id = ?`;
      params.push(branchId);
    }
    if (q && q.trim().length > 0) {
      sql += ` AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.emp_no LIKE ? OR sp.department LIKE ? OR sp.designation LIKE ?)`;
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term, term);
    }
    sql += ` ORDER BY (sp.status = 'active') DESC, sp.first_name ASC LIMIT 25`;
    const rows = await query(sql, params);
    const staff = rows.map((stf) => ({
      ...stf,
      dob: formatDateOnly(stf.dob),
      joining_date: formatDateOnly(stf.joining_date),
    }));
    res.json({ success: true, staff });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/templates
 */
export const getTemplates = async (req, res, next) => {
  try {
    const { certificate_type, recipient_scope, status, search } = req.query;
    let sql = `
      SELECT ct.*,
        (SELECT COUNT(*) FROM issued_certificates ic WHERE ic.template_id = ct.id) AS usage_count
      FROM certificate_templates ct
      WHERE 1=1
    `;
    const params = [];
    if (certificate_type) {
      sql += ` AND ct.certificate_type = ?`;
      params.push(certificate_type);
    }
    if (recipient_scope) {
      sql += ` AND (ct.recipient_scope = ? OR ct.recipient_scope = 'both')`;
      params.push(recipient_scope);
    }
    if (status) {
      sql += ` AND ct.status = ?`;
      params.push(status);
    }
    if (search && search.trim()) {
      sql += ` AND (ct.name LIKE ? OR ct.code LIKE ? OR ct.title_heading LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    sql += ` ORDER BY ct.certificate_type ASC, ct.is_default DESC, ct.id DESC`;
    const templates = await query(sql, params);
    res.json({ success: true, templates });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/templates/:id
 */
export const getTemplateById = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT ct.*,
        (SELECT COUNT(*) FROM issued_certificates ic WHERE ic.template_id = ct.id) AS usage_count
       FROM certificate_templates ct WHERE ct.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Certificate template not found' });
    }
    res.json({ success: true, template: rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/certificates/templates
 */
export const createTemplate = async (req, res, next) => {
  try {
    const {
      code,
      name,
      certificate_type,
      recipient_scope = 'student',
      category_badge = 'OFFICIAL INSTITUTIONAL RECORD',
      title_heading,
      body_template,
      footer_note = '',
      border_style = 'classic_double',
      color_theme = 'monochrome',
      signature_layout = 'principal_seal',
      show_student_photo = 1,
      show_qr_verification = 1,
      is_default = 0,
      status = 'active',
    } = req.body;

    if (!code || !name || !VALID_TYPES.includes(certificate_type) || !title_heading || !body_template) {
      return res.status(400).json({
        message: 'Template code, name, valid certificate_type, title_heading, and body_template are required',
      });
    }

    const dup = await query('SELECT id FROM certificate_templates WHERE code = ? LIMIT 1', [code.trim()]);
    if (dup.length > 0) {
      return res.status(409).json({ message: `Template code "${code}" already exists` });
    }

    const bStyle = VALID_BORDERS.includes(border_style) ? border_style : 'classic_double';
    const cTheme = VALID_THEMES.includes(color_theme) ? color_theme : 'monochrome';
    const sLayout = VALID_SIGNATURES.includes(signature_layout) ? signature_layout : 'principal_seal';

    if (Number(is_default) === 1) {
      await query(
        'UPDATE certificate_templates SET is_default = 0 WHERE certificate_type = ? AND recipient_scope = ?',
        [certificate_type, recipient_scope]
      );
    }

    const result = await query(
      `INSERT INTO certificate_templates (
        code, name, certificate_type, recipient_scope, category_badge, title_heading,
        body_template, footer_note, border_style, color_theme, signature_layout,
        show_student_photo, show_qr_verification, is_default, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code.trim().toUpperCase(),
        name.trim(),
        certificate_type,
        recipient_scope,
        category_badge,
        title_heading,
        body_template,
        footer_note,
        bStyle,
        cTheme,
        sLayout,
        show_student_photo ? 1 : 0,
        show_qr_verification ? 1 : 0,
        Number(is_default) === 1 ? 1 : 0,
        status === 'inactive' ? 'inactive' : 'active',
        req.user?.id || null,
      ]
    );

    const [created] = await query('SELECT * FROM certificate_templates WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Certificate template created', template: created });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/certificates/templates/:id
 */
export const updateTemplate = async (req, res, next) => {
  try {
    const existingRows = await query('SELECT * FROM certificate_templates WHERE id = ? LIMIT 1', [req.params.id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Certificate template not found' });
    }
    const existing = existingRows[0];

    const {
      code = existing.code,
      name = existing.name,
      certificate_type = existing.certificate_type,
      recipient_scope = existing.recipient_scope,
      category_badge = existing.category_badge,
      title_heading = existing.title_heading,
      body_template = existing.body_template,
      footer_note = existing.footer_note,
      border_style = existing.border_style,
      color_theme = existing.color_theme,
      signature_layout = existing.signature_layout,
      show_student_photo = existing.show_student_photo,
      show_qr_verification = existing.show_qr_verification,
      is_default = existing.is_default,
      status = existing.status,
    } = req.body;

    if (!name || !VALID_TYPES.includes(certificate_type) || !title_heading || !body_template) {
      return res.status(400).json({ message: 'Name, certificate_type, title_heading, and body_template are required' });
    }

    const dup = await query('SELECT id FROM certificate_templates WHERE code = ? AND id <> ? LIMIT 1', [
      String(code).trim(),
      req.params.id,
    ]);
    if (dup.length > 0) {
      return res.status(409).json({ message: `Template code "${code}" is used by another template` });
    }

    if (Number(is_default) === 1) {
      await query(
        'UPDATE certificate_templates SET is_default = 0 WHERE certificate_type = ? AND recipient_scope = ? AND id <> ?',
        [certificate_type, recipient_scope, req.params.id]
      );
    }

    await query(
      `UPDATE certificate_templates SET
        code = ?, name = ?, certificate_type = ?, recipient_scope = ?, category_badge = ?,
        title_heading = ?, body_template = ?, footer_note = ?, border_style = ?, color_theme = ?,
        signature_layout = ?, show_student_photo = ?, show_qr_verification = ?, is_default = ?, status = ?
       WHERE id = ?`,
      [
        String(code).trim().toUpperCase(),
        String(name).trim(),
        certificate_type,
        recipient_scope,
        category_badge,
        title_heading,
        body_template,
        footer_note || '',
        VALID_BORDERS.includes(border_style) ? border_style : existing.border_style,
        VALID_THEMES.includes(color_theme) ? color_theme : existing.color_theme,
        VALID_SIGNATURES.includes(signature_layout) ? signature_layout : existing.signature_layout,
        show_student_photo ? 1 : 0,
        show_qr_verification ? 1 : 0,
        Number(is_default) === 1 ? 1 : 0,
        status === 'inactive' ? 'inactive' : 'active',
        req.params.id,
      ]
    );

    const [updated] = await query('SELECT * FROM certificate_templates WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Certificate template updated', template: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/certificates/templates/:id/duplicate
 */
export const duplicateTemplate = async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM certificate_templates WHERE id = ? LIMIT 1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Source template not found' });
    }
    const src = rows[0];
    const suffix = String(Date.now()).slice(-4);
    const newCode = `${src.code}-COPY-${suffix}`.slice(0, 48);

    const result = await query(
      `INSERT INTO certificate_templates (
        code, name, certificate_type, recipient_scope, category_badge, title_heading,
        body_template, footer_note, border_style, color_theme, signature_layout,
        show_student_photo, show_qr_verification, is_default, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?)`,
      [
        newCode,
        `${src.name} (Copy)`,
        src.certificate_type,
        src.recipient_scope,
        src.category_badge,
        src.title_heading,
        src.body_template,
        src.footer_note,
        src.border_style,
        src.color_theme,
        src.signature_layout,
        src.show_student_photo,
        src.show_qr_verification,
        req.user?.id || null,
      ]
    );

    const [created] = await query('SELECT * FROM certificate_templates WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Template duplicated', template: created });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/certificates/templates/:id
 */
export const deleteTemplate = async (req, res, next) => {
  try {
    const rows = await query('SELECT id, name FROM certificate_templates WHERE id = ? LIMIT 1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Certificate template not found' });
    }
    await query('UPDATE issued_certificates SET template_id = NULL WHERE template_id = ?', [req.params.id]);
    await query('DELETE FROM certificate_templates WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: `Template "${rows[0].name}" deleted` });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates
 */
export const getCertificates = async (req, res, next) => {
  try {
    const {
      certificate_type,
      recipient_type,
      status,
      branch_id,
      academic_year_id,
      date_from,
      date_to,
      search,
    } = req.query;

    let sql = `
      SELECT ic.*,
        b.name AS branch_name, b.code AS branch_code, b.address AS branch_address,
        b.phone AS branch_phone, b.email AS branch_email, b.logo AS branch_logo,
        b.city AS branch_city, b.state AS branch_state,
        ay.name AS academic_year_name,
        ct.name AS template_name, ct.category_badge AS template_badge,
        req_u.name AS requested_by_name,
        app_u.name AS approved_by_name
      FROM issued_certificates ic
      LEFT JOIN branches b ON ic.branch_id = b.id
      LEFT JOIN academic_years ay ON ic.academic_year_id = ay.id
      LEFT JOIN certificate_templates ct ON ic.template_id = ct.id
      LEFT JOIN users req_u ON ic.requested_by = req_u.id
      LEFT JOIN users app_u ON ic.approved_by = app_u.id
      WHERE 1=1
    `;
    const params = [];

    if (certificate_type) {
      sql += ` AND ic.certificate_type = ?`;
      params.push(certificate_type);
    }
    if (recipient_type) {
      sql += ` AND ic.recipient_type = ?`;
      params.push(recipient_type);
    }
    if (status) {
      sql += ` AND ic.status = ?`;
      params.push(status);
    }
    const effectiveBranchId = req.scope?.branchId ?? sanitizeScopeId(branch_id);
    const effectiveAyId = sanitizeScopeId(academic_year_id) ?? req.scope?.academicYearId ?? null;

    if (effectiveBranchId) {
      sql += ` AND ic.branch_id = ?`;
      params.push(effectiveBranchId);
    }
    if (effectiveAyId) {
      sql += ` AND ic.academic_year_id = ?`;
      params.push(effectiveAyId);
    }
    if (date_from) {
      sql += ` AND DATE(COALESCE(ic.issue_date, ic.created_at)) >= ?`;
      params.push(date_from);
    }
    if (date_to) {
      sql += ` AND DATE(COALESCE(ic.issue_date, ic.created_at)) <= ?`;
      params.push(date_to);
    }
    if (search && search.trim()) {
      sql += ` AND (
        ic.certificate_no LIKE ? OR ic.recipient_name LIKE ? OR ic.ref_no LIKE ?
        OR ic.class_or_dept LIKE ? OR ic.purpose LIKE ? OR ic.title_heading LIKE ?
      )`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term);
    }

    sql += ` ORDER BY ic.id DESC LIMIT 500`;
    const rows = await query(sql, params);
    const certificates = rows.map(serializeCertificate);

    const summary = {
      total: certificates.length,
      pending_approval: certificates.filter((c) => c.status === 'pending_approval').length,
      approved: certificates.filter((c) => c.status === 'approved').length,
      issued: certificates.filter((c) => c.status === 'issued').length,
      rejected: certificates.filter((c) => c.status === 'rejected').length,
      revoked: certificates.filter((c) => c.status === 'revoked').length,
    };

    res.json({ success: true, certificates, summary });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/certificates/:id
 */
export const getCertificateById = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT ic.*,
        b.name AS branch_name, b.code AS branch_code, b.address AS branch_address,
        b.phone AS branch_phone, b.email AS branch_email, b.logo AS branch_logo,
        b.city AS branch_city, b.state AS branch_state,
        ay.name AS academic_year_name,
        ct.name AS template_name, ct.code AS template_code, ct.category_badge AS template_badge,
        req_u.name AS requested_by_name,
        app_u.name AS approved_by_name,
        tc.tc_no AS linked_tc_no, tc.leaving_date AS tc_leaving_date, tc.dues_cleared AS tc_dues_cleared
       FROM issued_certificates ic
       LEFT JOIN branches b ON ic.branch_id = b.id
       LEFT JOIN academic_years ay ON ic.academic_year_id = ay.id
       LEFT JOIN certificate_templates ct ON ic.template_id = ct.id
       LEFT JOIN users req_u ON ic.requested_by = req_u.id
       LEFT JOIN users app_u ON ic.approved_by = app_u.id
       LEFT JOIN transfer_certificates tc ON ic.tc_id = tc.id
       WHERE ic.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Certificate record not found' });
    }
    const certificate = serializeCertificate(rows[0]);
    res.json({ success: true, certificate });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/certificates
 */
export const createCertificate = async (req, res, next) => {
  let conn;
  try {
    const {
      certificate_type,
      template_id = null,
      recipient_type = 'student',
      student_id = null,
      staff_id = null,
      branch_id = null,
      academic_year_id = null,
      recipient_name,
      ref_no = null,
      class_or_dept = null,
      father_name = null,
      mother_name = null,
      dob = null,
      gender = null,
      nationality = 'Indian',
      photo_url = null,
      title_heading,
      rendered_body,
      footer_note = null,
      border_style = 'classic_double',
      color_theme = 'monochrome',
      signature_layout = 'principal_seal',
      show_student_photo = 1,
      show_qr_verification = 1,
      purpose = null,
      period_from = null,
      period_to = null,
      conduct_grade = null,
      custom_fields = {},
      issue_date = null,
      action_mode = 'submit',
    } = req.body;

    if (!VALID_TYPES.includes(certificate_type)) {
      return res.status(400).json({ message: 'Invalid certificate_type' });
    }
    if (!recipient_name || !title_heading || !rendered_body) {
      return res.status(400).json({
        message: 'Recipient name, certificate heading, and certificate body are required',
      });
    }

    const userRole = String(req.user?.role || '').toLowerCase();
    const canDirectIssue = CAN_DIRECT_ISSUE_ROLES.includes(userRole);
    const wantsImmediateIssue = action_mode === 'issue' && canDirectIssue;

    const effectiveStatus = wantsImmediateIssue ? 'issued' : 'pending_approval';
    const effectiveBranchId =
      req.scope?.branchId ?? sanitizeScopeId(branch_id) ?? req.user?.branch_id ?? null;
    if (!effectiveBranchId) {
      return res.status(400).json({ message: 'Please select a specific Campus Branch to issue a certificate.' });
    }
    const effectiveAcademicYearId =
      sanitizeScopeId(academic_year_id) ?? req.scope?.academicYearId ?? null;
    const effectiveIssueDate = formatDateOnly(issue_date) || formatDateOnly(new Date());
    const certificateNo = await generateCertificateNumber(certificate_type, effectiveBranchId);

    const parsedCf = parseJsonSafe(custom_fields);
    const finalBody = renderBodyWithVars(rendered_body, {
      student_name: recipient_name,
      recipient_name,
      admission_no: ref_no || '—',
      emp_no: ref_no || '—',
      class_section: class_or_dept || '—',
      department: class_or_dept || '—',
      father_name: father_name || '—',
      mother_name: mother_name || '—',
      purpose: purpose || 'Official Purpose',
      period_from: period_from || '—',
      period_to: period_to || '—',
      conduct_grade: conduct_grade || 'Good',
      issue_date: effectiveIssueDate,
      ...parsedCf,
    });

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [ins] = await conn.query(
      `INSERT INTO issued_certificates (
        certificate_no, certificate_type, template_id, recipient_type,
        student_id, staff_id, branch_id, academic_year_id,
        recipient_name, ref_no, class_or_dept, father_name, mother_name,
        dob, gender, nationality, photo_url,
        title_heading, rendered_body, footer_note,
        border_style, color_theme, signature_layout, show_student_photo, show_qr_verification,
        purpose, period_from, period_to, conduct_grade, custom_fields,
        issue_date, status, requested_by, approved_by, approved_at, issued_at, reprint_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        certificateNo,
        certificate_type,
        template_id || null,
        recipient_type === 'staff' ? 'staff' : 'student',
        student_id || null,
        staff_id || null,
        effectiveBranchId,
        effectiveAcademicYearId,
        String(recipient_name).trim(),
        ref_no || null,
        class_or_dept || null,
        father_name || null,
        mother_name || null,
        formatDateOnly(dob),
        gender || null,
        nationality || 'Indian',
        photo_url || null,
        title_heading,
        finalBody,
        footer_note || null,
        VALID_BORDERS.includes(border_style) ? border_style : 'classic_double',
        VALID_THEMES.includes(color_theme) ? color_theme : 'monochrome',
        VALID_SIGNATURES.includes(signature_layout) ? signature_layout : 'principal_seal',
        show_student_photo ? 1 : 0,
        show_qr_verification ? 1 : 0,
        purpose || null,
        period_from || null,
        period_to || null,
        conduct_grade || null,
        JSON.stringify(parsedCf),
        effectiveIssueDate,
        effectiveStatus,
        req.user?.id || null,
        wantsImmediateIssue ? req.user?.id || null : null,
        wantsImmediateIssue ? new Date() : null,
        wantsImmediateIssue ? new Date() : null,
        wantsImmediateIssue ? 1 : 0,
      ]
    );

    const newId = ins.insertId;
    if (wantsImmediateIssue && certificate_type === 'tc') {
      await syncTransferRecordOnIssue(
        conn,
        {
          id: newId,
          certificate_no: certificateNo,
          certificate_type,
          student_id,
          branch_id: effectiveBranchId,
          class_or_dept,
          purpose,
          conduct_grade,
          footer_note,
          issue_date: effectiveIssueDate,
          custom_fields: parsedCf,
        },
        req.user?.id
      );
    }

    await conn.commit();

    const [created] = await query('SELECT * FROM issued_certificates WHERE id = ?', [newId]);
    res.status(201).json({
      success: true,
      message: wantsImmediateIssue
        ? `Certificate ${certificateNo} approved and issued`
        : `Certificate ${certificateNo} submitted to Approval Queue`,
      requires_approval: !wantsImmediateIssue,
      certificate: serializeCertificate(created),
    });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally {
    if (conn) conn.release();
  }
};

/**
 * PUT /api/certificates/:id
 */
export const updateCertificate = async (req, res, next) => {
  let conn;
  try {
    const existingRows = await query('SELECT * FROM issued_certificates WHERE id = ? LIMIT 1', [req.params.id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Certificate record not found' });
    }
    const existing = existingRows[0];

    const {
      template_id = existing.template_id,
      recipient_type = existing.recipient_type,
      student_id = existing.student_id,
      staff_id = existing.staff_id,
      branch_id = existing.branch_id,
      academic_year_id = existing.academic_year_id,
      recipient_name = existing.recipient_name,
      ref_no = existing.ref_no,
      class_or_dept = existing.class_or_dept,
      father_name = existing.father_name,
      mother_name = existing.mother_name,
      dob = existing.dob,
      gender = existing.gender,
      nationality = existing.nationality,
      photo_url = existing.photo_url,
      title_heading = existing.title_heading,
      rendered_body = existing.rendered_body,
      footer_note = existing.footer_note,
      border_style = existing.border_style,
      color_theme = existing.color_theme,
      signature_layout = existing.signature_layout,
      show_student_photo = existing.show_student_photo,
      show_qr_verification = existing.show_qr_verification,
      purpose = existing.purpose,
      period_from = existing.period_from,
      period_to = existing.period_to,
      conduct_grade = existing.conduct_grade,
      custom_fields = existing.custom_fields,
      issue_date = existing.issue_date,
      resubmit = false,
    } = req.body;

    if (!recipient_name || !title_heading || !rendered_body) {
      return res.status(400).json({ message: 'Recipient name, heading, and body are required' });
    }

    const parsedCf = parseJsonSafe(custom_fields);
    const nextStatus =
      resubmit && existing.status === 'rejected' ? 'pending_approval' : existing.status;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.query(
      `UPDATE issued_certificates SET
        template_id = ?, recipient_type = ?, student_id = ?, staff_id = ?,
        branch_id = ?, academic_year_id = ?, recipient_name = ?, ref_no = ?,
        class_or_dept = ?, father_name = ?, mother_name = ?, dob = ?, gender = ?,
        nationality = ?, photo_url = ?, title_heading = ?, rendered_body = ?,
        footer_note = ?, border_style = ?, color_theme = ?, signature_layout = ?,
        show_student_photo = ?, show_qr_verification = ?, purpose = ?, period_from = ?,
        period_to = ?, conduct_grade = ?, custom_fields = ?, issue_date = ?, status = ?
       WHERE id = ?`,
      [
        template_id || null,
        recipient_type === 'staff' ? 'staff' : 'student',
        student_id || null,
        staff_id || null,
        branch_id || existing.branch_id,
        academic_year_id || null,
        String(recipient_name).trim(),
        ref_no || null,
        class_or_dept || null,
        father_name || null,
        mother_name || null,
        formatDateOnly(dob),
        gender || null,
        nationality || 'Indian',
        photo_url || null,
        title_heading,
        rendered_body,
        footer_note || null,
        VALID_BORDERS.includes(border_style) ? border_style : existing.border_style,
        VALID_THEMES.includes(color_theme) ? color_theme : existing.color_theme,
        VALID_SIGNATURES.includes(signature_layout) ? signature_layout : existing.signature_layout,
        show_student_photo ? 1 : 0,
        show_qr_verification ? 1 : 0,
        purpose || null,
        period_from || null,
        period_to || null,
        conduct_grade || null,
        JSON.stringify(parsedCf),
        formatDateOnly(issue_date) || existing.issue_date,
        nextStatus,
        req.params.id,
      ]
    );

    if (existing.certificate_type === 'tc' && (nextStatus === 'issued' || nextStatus === 'approved')) {
      await syncTransferRecordOnIssue(
        conn,
        {
          id: existing.id,
          tc_id: existing.tc_id,
          certificate_no: existing.certificate_no,
          certificate_type: existing.certificate_type,
          student_id,
          branch_id: branch_id || existing.branch_id,
          class_or_dept,
          purpose,
          conduct_grade,
          footer_note,
          issue_date: formatDateOnly(issue_date) || existing.issue_date,
          custom_fields: parsedCf,
        },
        req.user?.id
      );
    }

    await conn.commit();

    const [updated] = await query('SELECT * FROM issued_certificates WHERE id = ?', [req.params.id]);
    res.json({
      success: true,
      message: 'Certificate updated successfully',
      certificate: serializeCertificate(updated),
    });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally {
    if (conn) conn.release();
  }
};

/**
 * PATCH /api/certificates/:id/status
 * Transitions: approve_issue | approve | reject | revoke | reopen
 */
export const updateCertificateStatus = async (req, res, next) => {
  let conn;
  try {
    const existingRows = await query('SELECT * FROM issued_certificates WHERE id = ? LIMIT 1', [req.params.id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'Certificate record not found' });
    }
    const existing = existingRows[0];

    const { action, approval_remarks = '', revoke_reason = '' } = req.body;
    const userRole = String(req.user?.role || '').toLowerCase();

    if (!CAN_DIRECT_ISSUE_ROLES.includes(userRole)) {
      return res.status(403).json({
        message: 'Only Principal, Admin, or Super Admin can approve, reject, or revoke certificates',
      });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    if (action === 'approve_issue' || action === 'approve') {
      const nextStatus = action === 'approve_issue' ? 'issued' : 'approved';
      await conn.query(
        `UPDATE issued_certificates SET
          status = ?, approved_by = ?, approval_remarks = ?,
          approved_at = NOW(),
          issued_at = CASE WHEN ? = 'issued' THEN COALESCE(issued_at, NOW()) ELSE issued_at END,
          reprint_count = CASE WHEN ? = 'issued' AND reprint_count = 0 THEN 1 ELSE reprint_count END
         WHERE id = ?`,
        [nextStatus, req.user?.id || null, approval_remarks || null, nextStatus, nextStatus, existing.id]
      );

      if (existing.certificate_type === 'tc') {
        await syncTransferRecordOnIssue(conn, existing, req.user?.id);
      }
    } else if (action === 'reject') {
      if (!String(approval_remarks || '').trim()) {
        await conn.rollback();
        return res.status(400).json({ message: 'Rejection reason / remarks are required' });
      }
      await conn.query(
        `UPDATE issued_certificates SET
          status = 'rejected', approved_by = ?, approval_remarks = ?, approved_at = NOW()
         WHERE id = ?`,
        [req.user?.id || null, approval_remarks.trim(), existing.id]
      );
    } else if (action === 'revoke') {
      if (!String(revoke_reason || approval_remarks || '').trim()) {
        await conn.rollback();
        return res.status(400).json({ message: 'Revocation reason is required' });
      }
      const reasonText = String(revoke_reason || approval_remarks).trim();
      await conn.query(
        `UPDATE issued_certificates SET status = 'revoked', revoke_reason = ?, tc_id = NULL WHERE id = ?`,
        [reasonText, existing.id]
      );
      await rollbackTransferIfNeeded(conn, existing);
    } else if (action === 'reopen') {
      await conn.query(
        `UPDATE issued_certificates SET status = 'pending_approval', approval_remarks = ? WHERE id = ?`,
        [approval_remarks || existing.approval_remarks || null, existing.id]
      );
    } else {
      await conn.rollback();
      return res.status(400).json({ message: 'Unsupported workflow action' });
    }

    await conn.commit();
    const [updated] = await query('SELECT * FROM issued_certificates WHERE id = ?', [existing.id]);
    res.json({
      success: true,
      message: `Certificate ${updated.certificate_no} updated to ${updated.status}`,
      certificate: serializeCertificate(updated),
    });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally {
    if (conn) conn.release();
  }
};

/**
 * POST /api/certificates/:id/print
 */
export const recordCertificatePrint = async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM issued_certificates WHERE id = ? LIMIT 1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    const existing = rows[0];
    if (existing.status === 'rejected' || existing.status === 'revoked') {
      return res.status(400).json({ message: `Cannot print a ${existing.status} certificate` });
    }

    const nextStatus = existing.status === 'approved' ? 'issued' : existing.status;
    await query(
      `UPDATE issued_certificates SET
        reprint_count = reprint_count + 1,
        status = ?,
        issued_at = CASE WHEN ? = 'issued' THEN COALESCE(issued_at, NOW()) ELSE issued_at END
       WHERE id = ?`,
      [nextStatus, nextStatus, existing.id]
    );

    const [updated] = await query('SELECT * FROM issued_certificates WHERE id = ?', [existing.id]);
    res.json({
      success: true,
      reprint_count: updated.reprint_count,
      certificate: serializeCertificate(updated),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/certificates/:id
 */
export const deleteCertificate = async (req, res, next) => {
  let conn;
  try {
    const rows = await query('SELECT * FROM issued_certificates WHERE id = ? LIMIT 1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Certificate record not found' });
    }
    const cert = rows[0];

    conn = await pool.getConnection();
    await conn.beginTransaction();
    await rollbackTransferIfNeeded(conn, cert);
    await conn.query('DELETE FROM issued_certificates WHERE id = ?', [cert.id]);
    await conn.commit();

    res.json({ success: true, message: `Certificate ${cert.certificate_no} deleted permanently` });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally {
    if (conn) conn.release();
  }
};
