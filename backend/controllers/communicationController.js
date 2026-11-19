import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendToUser } from '../utils/fcmStudent.js';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for real-time communication audit logging
const logAudit = async ({ branch_id, academic_year_id, module_name, action, details, user_id = 1, ip_address = '127.0.0.1' }) => {
  try {
    if (!branch_id || !module_name || !action) return;
    await pool.query(
      `INSERT INTO communication_audit_logs 
       (branch_id, academic_year_id, module_name, action, details, user_id, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        Number(branch_id),
        academic_year_id ? Number(academic_year_id) : null,
        module_name,
        action,
        details || null,
        user_id ? Number(user_id) : 1,
        ip_address
      ]
    );
  } catch (err) {
    console.error('Audit logging failed:', err.message);
  }
};

export const communicationController = {
  // --- Homework ---
  async listHomework(req, res, next) {
    try {
      const { branch_id, class_id, section_id, academic_year_id, status, subject, search } = req.query;

      let sql = `
        SELECT 
          h.*,
          c.name AS class_name,
          s.name AS section_name,
          COALESCE(sub.name, h.subject) AS subject_name
        FROM homework h
        LEFT JOIN classes c ON h.class_id = c.id
        LEFT JOIN branch_class_sections s ON (
          (h.section_id REGEXP '^[0-9]+$' AND h.section_id != 'all' AND h.section_id != '' AND CAST(h.section_id AS UNSIGNED) = s.id)
          OR s.name = h.section_id
        )
        LEFT JOIN subjects sub ON h.subject_id = sub.id
        WHERE 1=1
      `;
      const params = [];

      if (branch_id && branch_id !== 'all') {
        sql += ' AND h.branch_id = ?';
        params.push(Number(branch_id));
      }
      if (academic_year_id && academic_year_id !== 'all' && !isNaN(Number(academic_year_id))) {
        sql += ' AND h.academic_year_id = ?';
        params.push(Number(academic_year_id));
      }
      if (class_id && class_id !== 'all') {
        sql += ' AND h.class_id = ?';
        params.push(Number(class_id));
      }
      if (section_id && section_id !== 'all') {
        sql += ' AND (h.section_id = ? OR s.name = ? OR (h.section_id REGEXP \'^[0-9]+$\' AND CAST(h.section_id AS UNSIGNED) = ?))';
        params.push(String(section_id), String(section_id), Number(section_id) || 0);
      }
      if (status && status !== 'all') {
        sql += ' AND h.status = ?';
        params.push(status);
      }
      if (subject && subject !== 'all') {
        sql += ' AND (h.subject = ? OR sub.name = ?)';
        params.push(subject, subject);
      }
      if (search) {
        sql += ' AND (h.title LIKE ? OR h.description LIKE ? OR h.subject LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      sql += ' ORDER BY h.id DESC';

      const [rows] = await pool.query(sql, params);

      const formatted = rows.map(r => {
        let attachmentsObj = null;
        if (r.attachments) {
          try {
            attachmentsObj = typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments;
          } catch (e) {
            attachmentsObj = null;
          }
        }
        return {
          ...r,
          attachments: attachmentsObj
        };
      });

      res.json({ success: true, data: formatted, homework: formatted });
    } catch (err) {
      next(err);
    }
  },

  async createHomework(req, res, next) {
    try {
      const payload = { ...req.body };
      const attachments = payload.attachments ? (typeof payload.attachments === 'string' ? payload.attachments : JSON.stringify(payload.attachments)) : null;

      const [result] = await pool.query(
        `INSERT INTO homework 
         (branch_id, academic_year_id, class_id, section_id, subject_id, subject, title, description, assigned_date, due_date, status, attachments, start_at, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          Number(payload.branch_id || 1),
          Number(payload.academic_year_id || 1),
          Number(payload.class_id),
          payload.section_id !== undefined ? String(payload.section_id) : 'all',
          payload.subject_id ? Number(payload.subject_id) : null,
          payload.subject || payload.subject_name || 'General',
          payload.title || '',
          payload.description || '',
          payload.assigned_date || new Date().toISOString().slice(0, 10),
          payload.due_date || null,
          payload.status || 'Draft',
          attachments,
          payload.start_at || null,
          payload.created_by ? Number(payload.created_by) : 1
        ]
      );
      const id = result.insertId;

      await logAudit({
        branch_id: payload.branch_id || 1,
        academic_year_id: payload.academic_year_id,
        module_name: 'Homework',
        action: 'Created Homework',
        details: `Created homework '${payload.title || 'Untitled'}' (${payload.subject || payload.subject_name || 'Subject'})`,
        user_id: payload.created_by || 1
      });

      // Send notification to all students of the class/section
      try {
        let studentSql = `
          SELECT se.student_id, se.student_id AS user_id
          FROM student_enrollments se
          WHERE se.enrollment_status = 'active'
        `;
        const studentParams = [];
        if (payload.branch_id && payload.branch_id !== 'all') {
          studentSql += ' AND se.branch_id = ?';
          studentParams.push(Number(payload.branch_id));
        }
        if (payload.class_id && payload.class_id !== 'all') {
          studentSql += ' AND se.class_id = ?';
          studentParams.push(Number(payload.class_id));
        }
        if (payload.section_id && payload.section_id !== 'all' && Number(payload.section_id) > 0) {
          studentSql += ' AND se.section_id = ?';
          studentParams.push(Number(payload.section_id));
        }

        const [studentRows] = await pool.query(studentSql, studentParams);

        const notifPayload = {
          title: `New Homework: ${payload.title || payload.subject_name || payload.subject || 'Assignment'}`,
          body: payload.description || payload.topic || 'New homework posted for your class.',
          data: { 
            homeworkId: id.toString(),
            type: 'homework'
          },
        };

        const targetUserIds = studentRows.map(row => row.user_id || row.student_id).filter(Boolean);
        console.log(`[Homework Notification] Targeting ${targetUserIds.length} students for class=${payload.class_id}, section=${payload.section_id || 'all'}:`, targetUserIds);

        Promise.all(
          targetUserIds.map((userId) => sendToUser(userId, notifPayload))
        ).catch(err => console.error('[Homework Notification] Error in batch send:', err));
      } catch (notifErr) {
        console.error('[Homework Notification] Query error:', notifErr);
      }

      res.status(201).json({ success: true, id, message: 'Homework created' });
    } catch (err) {
      next(err);
    }
  },

  async updateHomework(req, res, next) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };
      const attachments = payload.attachments ? (typeof payload.attachments === 'string' ? payload.attachments : JSON.stringify(payload.attachments)) : null;

      await pool.query(
        `UPDATE homework SET
           branch_id = COALESCE(?, branch_id),
           academic_year_id = COALESCE(?, academic_year_id),
           class_id = COALESCE(?, class_id),
           section_id = COALESCE(?, section_id),
           subject_id = ?,
           subject = COALESCE(?, subject),
           title = COALESCE(?, title),
           description = COALESCE(?, description),
           assigned_date = COALESCE(?, assigned_date),
           due_date = ?,
           status = COALESCE(?, status),
           attachments = COALESCE(?, attachments),
           start_at = ?,
           updated_at = NOW()
         WHERE id = ?`,
        [
          payload.branch_id ? Number(payload.branch_id) : null,
          payload.academic_year_id ? Number(payload.academic_year_id) : null,
          payload.class_id ? Number(payload.class_id) : null,
          payload.section_id !== undefined ? String(payload.section_id) : null,
          payload.subject_id ? Number(payload.subject_id) : null,
          payload.subject || payload.subject_name || null,
          payload.title || null,
          payload.description || null,
          payload.assigned_date || null,
          payload.due_date || null,
          payload.status || null,
          attachments,
          payload.start_at || null,
          Number(id)
        ]
      );

      await logAudit({
        branch_id: payload.branch_id || 1,
        academic_year_id: payload.academic_year_id,
        module_name: 'Homework',
        action: 'Updated Homework',
        details: `Updated homework #${id} - '${payload.title || 'Homework'}'`,
        user_id: payload.created_by || 1
      });

      res.json({ success: true, message: 'Homework updated' });
    } catch (err) {
      next(err);
    }
  },

  async deleteHomework(req, res, next) {
    try {
      const { id } = req.params;
      const [existing] = await pool.query('SELECT * FROM homework WHERE id = ?', [Number(id)]);
      await pool.query('DELETE FROM homework WHERE id = ?', [Number(id)]);

      if (existing && existing[0]) {
        await logAudit({
          branch_id: existing[0].branch_id || 1,
          module_name: 'Homework',
          action: 'Deleted Homework',
          details: `Deleted homework #${id} ('${existing[0].title || 'Untitled'}')`
        });
      }

      res.json({ success: true, message: 'Homework deleted' });
    } catch (err) {
      next(err);
    }
  },

  async uploadAttachment(req, res, next) {
    try {
      const { filename, base64Data } = req.body;
      if (!filename || !base64Data) {
        return res.status(400).json({ success: false, message: 'Missing file data' });
      }

      const ext = path.extname(filename);
      const safeBase = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniqueName = `${Date.now()}_${safeBase}${ext}`;
      const uploadDir = path.resolve(__dirname, '..', 'uploads', 'homework');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, uniqueName);
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      await fs.promises.writeFile(filePath, Buffer.from(cleanBase64, 'base64'));

      const fileUrl = `/uploads/homework/${uniqueName}`;
      res.json({
        success: true,
        url: fileUrl,
        name: filename,
        message: 'File uploaded successfully'
      });
    } catch (err) {
      next(err);
    }
  },

  // --- Announcements ---
  async listAnnouncements(req, res, next) {
    try {
      const { branch_id, academic_year_id, user_type, category, priority, status, search } = req.query;

      let sql = `
        SELECT 
          an.*,
          an.content AS message,
          c.name AS class_name,
          s.name AS section_name
        FROM announcements an
        LEFT JOIN classes c ON an.target_class_id = c.id
        LEFT JOIN branch_class_sections s ON an.target_section_id = s.id
        WHERE 1=1
      `;
      const params = [];

      if (branch_id && branch_id !== 'all') {
        sql += ' AND an.branch_id = ?';
        params.push(Number(branch_id));
      }
      if (academic_year_id && academic_year_id !== 'all' && !isNaN(Number(academic_year_id))) {
        sql += ' AND an.academic_year_id = ?';
        params.push(Number(academic_year_id));
      }
      if (user_type && user_type !== 'all') {
        sql += ' AND an.target_audience = ?';
        params.push(user_type);
      }
      if (category && category !== 'all') {
        sql += ' AND an.category = ?';
        params.push(category);
      }
      if (priority && priority !== 'all') {
        sql += ' AND an.priority = ?';
        params.push(priority);
      }
      if (status && status !== 'all') {
        sql += ' AND an.status = ?';
        params.push(status);
      }
      if (search) {
        sql += ' AND (an.title LIKE ? OR an.content LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ' ORDER BY an.id DESC';

      const [rows] = await pool.query(sql, params);

      const formatted = rows.map(r => {
        let attachmentsObj = null;
        if (r.attachments) {
          try {
            attachmentsObj = typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments;
          } catch (e) {
            attachmentsObj = null;
          }
        }
        return {
          ...r,
          attachments: attachmentsObj
        };
      });

      res.json({ success: true, data: formatted, announcements: formatted });
    } catch (err) {
      next(err);
    }
  },

  async createAnnouncement(req, res, next) {
    try {
      const payload = { ...req.body };
      const attachments = payload.attachments ? (typeof payload.attachments === 'string' ? payload.attachments : JSON.stringify(payload.attachments)) : null;
      const targetClasses = payload.target_classes ? (typeof payload.target_classes === 'string' ? payload.target_classes : JSON.stringify(payload.target_classes)) : null;
      const targetSections = payload.target_sections ? (typeof payload.target_sections === 'string' ? payload.target_sections : JSON.stringify(payload.target_sections)) : null;
      const targetGroups = payload.target_groups ? (typeof payload.target_groups === 'string' ? payload.target_groups : JSON.stringify(payload.target_groups)) : null;
      const channels = payload.channels ? (typeof payload.channels === 'string' ? payload.channels : JSON.stringify(payload.channels)) : null;

      const [result] = await pool.query(
        `INSERT INTO announcements 
         (branch_id, academic_year_id, title, content, category, priority, target_audience, target_classes, target_sections, target_groups, target_class_id, target_section_id, channels, start_date, end_date, status, attachments, read_count, acknowledged_count, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NOW(), NOW())`,
        [
          Number(payload.branch_id || 1),
          Number(payload.academic_year_id || 1),
          payload.title || '',
          payload.content || payload.message || '',
          payload.category || 'General',
          payload.priority || 'Normal',
          payload.target_audience || payload.user_type || 'All',
          targetClasses,
          targetSections,
          targetGroups,
          payload.target_class_id ? Number(payload.target_class_id) : null,
          payload.target_section_id ? Number(payload.target_section_id) : null,
          channels,
          payload.start_date || null,
          payload.end_date || null,
          payload.status || 'Draft',
          attachments,
          payload.created_by ? Number(payload.created_by) : 1
        ]
      );
      const id = result.insertId;

      await logAudit({
        branch_id: payload.branch_id || 1,
        academic_year_id: payload.academic_year_id,
        module_name: 'Announcement',
        action: 'Broadcast Notice',
        details: `Published announcement '${payload.title || 'Untitled'}' to ${payload.target_audience || payload.user_type || 'Audience'}`,
        user_id: payload.created_by || 1
      });

      // FCM Push Notification to students
      try {
        let qSql = 'SELECT se.student_id, se.student_id AS user_id FROM student_enrollments se WHERE se.enrollment_status = "active"';
        const qParams = [];
        if (payload.branch_id && payload.branch_id !== 'all') {
          qSql += ' AND se.branch_id = ?';
          qParams.push(Number(payload.branch_id));
        }
        if (payload.target_class_id && payload.target_class_id !== 'all') {
          qSql += ' AND se.class_id = ?';
          qParams.push(Number(payload.target_class_id));
        }
        if (payload.target_section_id && payload.target_section_id !== 'all') {
          qSql += ' AND se.section_id = ?';
          qParams.push(Number(payload.target_section_id));
        }

        const [studentRows] = await pool.query(qSql, qParams);
        const targetIds = studentRows.map(r => r.user_id || r.student_id).filter(Boolean);
        const notifMsg = payload.content || payload.message || '';
        const notifPayload = {
          title: 'Announcement: ' + (payload.title || 'Campus Circular'),
          body: notifMsg.length > 100 ? notifMsg.substring(0, 100) + '...' : (notifMsg || 'New announcement posted.'),
          data: {
            announcementId: id.toString(),
            type: 'announcement',
          },
        };
        console.log('[Announcement Notification] Broadcasting to ' + targetIds.length + ' recipients for announcement #' + id);
        Promise.all(targetIds.map(uid => sendToUser(uid, notifPayload)))
          .catch(err => console.error('[Announcement Notification] Batch send error:', err));
      } catch (notifErr) {
        console.error('[Announcement Notification] Error querying students:', notifErr);
      }

      res.status(201).json({ success: true, id, message: 'Announcement created successfully' });
    } catch (err) {
      next(err);
    }
  },

  async updateAnnouncement(req, res, next) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };
      const attachments = payload.attachments ? (typeof payload.attachments === 'string' ? payload.attachments : JSON.stringify(payload.attachments)) : null;
      const targetClasses = payload.target_classes ? (typeof payload.target_classes === 'string' ? payload.target_classes : JSON.stringify(payload.target_classes)) : null;
      const targetSections = payload.target_sections ? (typeof payload.target_sections === 'string' ? payload.target_sections : JSON.stringify(payload.target_sections)) : null;
      const targetGroups = payload.target_groups ? (typeof payload.target_groups === 'string' ? payload.target_groups : JSON.stringify(payload.target_groups)) : null;
      const channels = payload.channels ? (typeof payload.channels === 'string' ? payload.channels : JSON.stringify(payload.channels)) : null;

      await pool.query(
        `UPDATE announcements SET
           branch_id = COALESCE(?, branch_id),
           academic_year_id = COALESCE(?, academic_year_id),
           title = COALESCE(?, title),
           content = COALESCE(?, content),
           category = COALESCE(?, category),
           priority = COALESCE(?, priority),
           target_audience = COALESCE(?, target_audience),
           target_classes = COALESCE(?, target_classes),
           target_sections = COALESCE(?, target_sections),
           target_groups = COALESCE(?, target_groups),
           target_class_id = ?,
           target_section_id = ?,
           channels = COALESCE(?, channels),
           start_date = ?,
           end_date = ?,
           status = COALESCE(?, status),
           attachments = COALESCE(?, attachments),
           updated_at = NOW()
         WHERE id = ?`,
        [
          payload.branch_id ? Number(payload.branch_id) : null,
          payload.academic_year_id ? Number(payload.academic_year_id) : null,
          payload.title || null,
          payload.content || payload.message || null,
          payload.category || null,
          payload.priority || null,
          payload.target_audience || payload.user_type || null,
          targetClasses,
          targetSections,
          targetGroups,
          payload.target_class_id ? Number(payload.target_class_id) : null,
          payload.target_section_id ? Number(payload.target_section_id) : null,
          channels,
          payload.start_date || null,
          payload.end_date || null,
          payload.status || null,
          attachments,
          Number(id)
        ]
      );

      await logAudit({
        branch_id: payload.branch_id || 1,
        academic_year_id: payload.academic_year_id,
        module_name: 'Announcement',
        action: 'Updated Notice',
        details: `Updated circular #${id} - '${payload.title || 'Announcement'}'`,
        user_id: payload.created_by || 1
      });

      res.json({ success: true, message: 'Announcement updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async deleteAnnouncement(req, res, next) {
    try {
      const { id } = req.params;
      const [existing] = await pool.query('SELECT * FROM announcements WHERE id = ?', [Number(id)]);
      await pool.query('DELETE FROM announcements WHERE id = ?', [Number(id)]);

      if (existing && existing[0]) {
        await logAudit({
          branch_id: existing[0].branch_id || 1,
          academic_year_id: existing[0].academic_year_id,
          module_name: 'Announcement',
          action: 'Deleted Notice',
          details: `Deleted notice #${id} ('${existing[0].title || 'Untitled'}')`
        });
      }

      res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  // --- Assignments ---
  async listAssignments(req, res, next) {
    try {
      const { branch_id, class_id, section_id, academic_year_id, submission_type, status, search } = req.query;

      let sql = `
        SELECT 
          a.*,
          c.name AS class_name,
          s.name AS section_name,
          COALESCE(sub.name, a.subject) AS subject_name
        FROM assignments a
        LEFT JOIN classes c ON a.class_id = c.id
        LEFT JOIN branch_class_sections s ON (
          (a.section_id REGEXP '^[0-9]+$' AND a.section_id != 'all' AND a.section_id != '' AND CAST(a.section_id AS UNSIGNED) = s.id)
          OR s.name = a.section_id
        )
        LEFT JOIN subjects sub ON a.subject_id = sub.id
        WHERE 1=1
      `;
      const params = [];

      if (branch_id && branch_id !== 'all') {
        sql += ' AND a.branch_id = ?';
        params.push(Number(branch_id));
      }
      if (academic_year_id && academic_year_id !== 'all' && !isNaN(Number(academic_year_id))) {
        sql += ' AND a.academic_year_id = ?';
        params.push(Number(academic_year_id));
      }
      if (class_id && class_id !== 'all') {
        sql += ' AND a.class_id = ?';
        params.push(Number(class_id));
      }
      if (section_id && section_id !== 'all') {
        sql += ' AND (a.section_id = ? OR s.name = ? OR (a.section_id REGEXP \'^[0-9]+$\' AND CAST(a.section_id AS UNSIGNED) = ?))';
        params.push(String(section_id), String(section_id), Number(section_id) || 0);
      }
      if (submission_type && submission_type !== 'all') {
        sql += ' AND a.submission_type = ?';
        params.push(submission_type);
      }
      if (status && status !== 'all') {
        sql += ' AND a.status = ?';
        params.push(status);
      }
      if (search) {
        sql += ' AND (a.title LIKE ? OR a.description LIKE ? OR a.subject LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      sql += ' ORDER BY a.id DESC';

      const [rows] = await pool.query(sql, params);

      // Submission counts per assignment
      const [subCounts] = await pool.query(`
        SELECT 
          assignment_id,
          COUNT(*) as total_submissions,
          SUM(CASE WHEN status IN ('Submitted', 'Late Submitted', 'Reviewed', 'Completed') THEN 1 ELSE 0 END) as submitted_count
        FROM assignment_submissions
        GROUP BY assignment_id
      `);
      const subCountMap = new Map();
      subCounts.forEach(sc => subCountMap.set(sc.assignment_id, Number(sc.submitted_count || 0)));

      // Student enrollment counts per class/section
      const [enrollCounts] = await pool.query(`
        SELECT class_id, section_id, COUNT(*) as cnt
        FROM student_enrollments
        WHERE enrollment_status = 'active'
        GROUP BY class_id, section_id
      `);
      const enrollMap = new Map();
      enrollCounts.forEach(ec => {
        const key = `${ec.class_id}-${ec.section_id}`;
        enrollMap.set(key, Number(ec.cnt || 0));
        const classKey = `${ec.class_id}-all`;
        enrollMap.set(classKey, (enrollMap.get(classKey) || 0) + Number(ec.cnt || 0));
      });

      const formatted = rows.map(r => {
        let attachmentsObj = null;
        if (r.attachments) {
          try {
            attachmentsObj = typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments;
          } catch (e) {
            attachmentsObj = null;
          }
        }
        const targetedKey = (!r.section_id || r.section_id === 'all') ? `${r.class_id}-all` : `${r.class_id}-${r.section_id}`;
        const totalTargeted = enrollMap.get(targetedKey) || 0;
        const submitted = subCountMap.get(r.id) || 0;

        return {
          ...r,
          attachments: attachmentsObj,
          total_targeted_students: totalTargeted,
          submitted_count: submitted
        };
      });

      res.json({ success: true, data: formatted, assignments: formatted });
    } catch (err) {
      next(err);
    }
  },

  async getAssignmentDetails(req, res, next) {
    try {
      const { id } = req.params;
      const [assignments] = await pool.query(
        `SELECT a.*, c.name AS class_name, s.name AS section_name, COALESCE(sub.name, a.subject) AS subject_name
         FROM assignments a
         LEFT JOIN classes c ON a.class_id = c.id
         LEFT JOIN branch_class_sections s ON (
           (a.section_id REGEXP '^[0-9]+$' AND a.section_id != 'all' AND a.section_id != '' AND CAST(a.section_id AS UNSIGNED) = s.id)
           OR s.name = a.section_id
         )
         LEFT JOIN subjects sub ON a.subject_id = sub.id
         WHERE a.id = ?`,
        [Number(id)]
      );

      if (!assignments || assignments.length === 0) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }
      const assignment = assignments[0];

      // Fetch students for this class/section
      let stuSql = `
        SELECT 
          st.id AS student_id,
          st.student_name,
          st.admission_no AS admission_number,
          se.roll_no AS roll_number,
          s.name AS section_name
        FROM student_enrollments se
        JOIN students st ON se.student_id = st.id
        LEFT JOIN branch_class_sections s ON se.section_id = s.id
        WHERE se.class_id = ? AND se.enrollment_status = 'active'
      `;
      const stuParams = [assignment.class_id];

      if (assignment.section_id && assignment.section_id !== 'all') {
        const secNum = Number(assignment.section_id);
        if (!isNaN(secNum) && secNum > 0) {
          stuSql += ' AND se.section_id = ?';
          stuParams.push(secNum);
        }
      }

      const [students] = await pool.query(stuSql, stuParams);

      const [submissions] = await pool.query(
        'SELECT * FROM assignment_submissions WHERE assignment_id = ?',
        [Number(id)]
      );
      const submissionMap = new Map();
      submissions.forEach(sub => submissionMap.set(sub.student_id, sub));

      const rosterWithStatus = students.map(st => {
        const sub = submissionMap.get(st.student_id);
        return {
          student_id: st.student_id,
          student_name: st.student_name || 'Student',
          admission_number: st.admission_number,
          roll_number: st.roll_number,
          section_name: st.section_name || 'A',
          submission_status: sub ? (sub.status || 'Submitted') : 'Pending',
          submission_file_url: sub?.submission_files || null,
          submission_file_name: null,
          submission_notes: sub?.teacher_feedback || null,
          submission_date: sub?.submitted_at || null,
          marks_obtained: sub?.obtained_marks !== undefined ? sub.obtained_marks : null,
          grade: null,
          remarks: sub?.teacher_feedback || null,
          feedback: sub?.teacher_feedback || null,
          offline_completion_date: sub?.reviewed_at || null
        };
      });

      res.json({
        success: true,
        assignment,
        submissions: rosterWithStatus
      });
    } catch (err) {
      next(err);
    }
  },

  async createAssignment(req, res, next) {
    try {
      const payload = { ...req.body };
      const attachments = payload.attachments ? (typeof payload.attachments === 'string' ? payload.attachments : JSON.stringify(payload.attachments)) : null;

      const [result] = await pool.query(
        `INSERT INTO assignments 
         (branch_id, academic_year_id, class_id, section_id, subject_id, subject, title, description, max_marks, assigned_date, due_date, allow_late_submission, status, attachments, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          Number(payload.branch_id || 1),
          Number(payload.academic_year_id || 1),
          Number(payload.class_id),
          payload.section_id !== undefined ? String(payload.section_id) : 'all',
          payload.subject_id ? Number(payload.subject_id) : null,
          payload.subject || payload.subject_name || 'General',
          payload.title || '',
          payload.description || '',
          payload.max_marks !== undefined ? Number(payload.max_marks) : 100.00,
          payload.assigned_date || new Date().toISOString().slice(0, 10),
          payload.due_date || new Date().toISOString().slice(0, 10),
          payload.allow_late_submission ? 1 : 0,
          payload.status || 'Draft',
          attachments,
          payload.created_by ? Number(payload.created_by) : 1
        ]
      );
      const id = result.insertId;

      await logAudit({
        branch_id: payload.branch_id || 1,
        academic_year_id: payload.academic_year_id,
        module_name: 'Assignment',
        action: 'Created Assignment',
        details: `Published assignment '${payload.title || 'Untitled'}' (${payload.subject || payload.subject_name || 'Subject'})`,
        user_id: payload.created_by || 1
      });

      res.status(201).json({ success: true, id, message: 'Assignment created successfully' });
    } catch (err) {
      next(err);
    }
  },

  async updateAssignment(req, res, next) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };
      const attachments = payload.attachments ? (typeof payload.attachments === 'string' ? payload.attachments : JSON.stringify(payload.attachments)) : null;

      await pool.query(
        `UPDATE assignments SET
           branch_id = COALESCE(?, branch_id),
           academic_year_id = COALESCE(?, academic_year_id),
           class_id = COALESCE(?, class_id),
           section_id = COALESCE(?, section_id),
           subject_id = ?,
           subject = COALESCE(?, subject),
           title = COALESCE(?, title),
           description = COALESCE(?, description),
           max_marks = COALESCE(?, max_marks),
           assigned_date = COALESCE(?, assigned_date),
           due_date = COALESCE(?, due_date),
           allow_late_submission = COALESCE(?, allow_late_submission),
           status = COALESCE(?, status),
           attachments = COALESCE(?, attachments),
           updated_at = NOW()
         WHERE id = ?`,
        [
          payload.branch_id ? Number(payload.branch_id) : null,
          payload.academic_year_id ? Number(payload.academic_year_id) : null,
          payload.class_id ? Number(payload.class_id) : null,
          payload.section_id !== undefined ? String(payload.section_id) : null,
          payload.subject_id ? Number(payload.subject_id) : null,
          payload.subject || payload.subject_name || null,
          payload.title || null,
          payload.description || null,
          payload.max_marks !== undefined ? Number(payload.max_marks) : null,
          payload.assigned_date || null,
          payload.due_date || null,
          payload.allow_late_submission !== undefined ? (payload.allow_late_submission ? 1 : 0) : null,
          payload.status || null,
          attachments,
          Number(id)
        ]
      );

      await logAudit({
        branch_id: payload.branch_id || 1,
        academic_year_id: payload.academic_year_id,
        module_name: 'Assignment',
        action: 'Updated Assignment',
        details: `Updated assignment #${id} - '${payload.title || 'Assignment'}'`,
        user_id: payload.created_by || 1
      });

      res.json({ success: true, message: 'Assignment updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async deleteAssignment(req, res, next) {
    try {
      const { id } = req.params;
      const [existing] = await pool.query('SELECT * FROM assignments WHERE id = ?', [Number(id)]);
      await pool.query('DELETE FROM assignment_submissions WHERE assignment_id = ?', [Number(id)]);
      await pool.query('DELETE FROM assignments WHERE id = ?', [Number(id)]);

      if (existing && existing[0]) {
        await logAudit({
          branch_id: existing[0].branch_id || 1,
          academic_year_id: existing[0].academic_year_id,
          module_name: 'Assignment',
          action: 'Deleted Assignment',
          details: `Deleted assignment #${id} ('${existing[0].title || 'Untitled'}')`
        });
      }

      res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async reviewAssignment(req, res, next) {
    try {
      const { assignmentId, studentId } = req.params;
      const { marks_obtained, remarks, feedback, status, reviewed_by } = req.body;
      const aId = Number(assignmentId);
      const sId = Number(studentId);

      const [existing] = await pool.query(
        'SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
        [aId, sId]
      );

      const obtainedMarks = marks_obtained !== undefined ? Number(marks_obtained) : null;
      const teacherFeedback = feedback || remarks || null;
      const subStatus = status || 'Reviewed';
      const reviewerId = reviewed_by ? Number(reviewed_by) : 1;

      if (existing && existing.length > 0) {
        await pool.query(
          `UPDATE assignment_submissions SET
             obtained_marks = ?,
             teacher_feedback = ?,
             status = ?,
             reviewed_by = ?,
             reviewed_at = NOW(),
             updated_at = NOW()
           WHERE assignment_id = ? AND student_id = ?`,
          [obtainedMarks, teacherFeedback, subStatus, reviewerId, aId, sId]
        );
      } else {
        await pool.query(
          `INSERT INTO assignment_submissions 
           (assignment_id, student_id, status, obtained_marks, teacher_feedback, reviewed_by, reviewed_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
          [aId, sId, subStatus, obtainedMarks, teacherFeedback, reviewerId]
        );
      }

      res.json({ success: true, message: 'Review saved successfully' });
    } catch (err) {
      next(err);
    }
  },

  async submitAssignmentWork(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const { student_id, submission_file_url, file_url, submission_text } = req.body;
      const sId = Number(student_id);
      const aId = Number(assignmentId);

      if (!sId || !aId) {
        return res.status(400).json({ success: false, message: 'student_id and assignmentId are required' });
      }

      const finalFileUrl = submission_file_url || file_url || null;
      const submissionFiles = finalFileUrl ? JSON.stringify([{ url: finalFileUrl, text: submission_text || null }]) : null;

      const [existing] = await pool.query(
        'SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
        [aId, sId]
      );

      if (existing && existing.length > 0) {
        await pool.query(
          `UPDATE assignment_submissions SET
             status = 'Submitted',
             submission_files = COALESCE(?, submission_files),
             submitted_at = NOW(),
             updated_at = NOW()
           WHERE assignment_id = ? AND student_id = ?`,
          [submissionFiles, aId, sId]
        );
      } else {
        await pool.query(
          `INSERT INTO assignment_submissions 
           (assignment_id, student_id, status, submission_files, submitted_at, created_at, updated_at)
           VALUES (?, ?, 'Submitted', ?, NOW(), NOW(), NOW())`,
          [aId, sId, submissionFiles]
        );
      }

      res.json({ success: true, message: 'Assignment submitted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async markOfflineCompletion(req, res, next) {
    try {
      const { assignmentId, studentId } = req.params;
      const { marks_obtained, remarks, offline_verified_by } = req.body;
      const aId = Number(assignmentId);
      const sId = Number(studentId);

      const [existing] = await pool.query(
        'SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?',
        [aId, sId]
      );

      const obtainedMarks = marks_obtained !== undefined ? Number(marks_obtained) : null;
      const reviewerId = offline_verified_by ? Number(offline_verified_by) : 1;

      if (existing && existing.length > 0) {
        await pool.query(
          `UPDATE assignment_submissions SET
             status = 'Completed',
             obtained_marks = COALESCE(?, obtained_marks),
             teacher_feedback = COALESCE(?, teacher_feedback),
             reviewed_by = ?,
             reviewed_at = NOW(),
             updated_at = NOW()
           WHERE assignment_id = ? AND student_id = ?`,
          [obtainedMarks, remarks || null, reviewerId, aId, sId]
        );
      } else {
        await pool.query(
          `INSERT INTO assignment_submissions 
           (assignment_id, student_id, status, obtained_marks, teacher_feedback, reviewed_by, reviewed_at, created_at, updated_at)
           VALUES (?, ?, 'Completed', ?, ?, ?, NOW(), NOW(), NOW())`,
          [aId, sId, obtainedMarks, remarks || null, reviewerId]
        );
      }

      res.json({ success: true, message: 'Offline completion marked successfully' });
    } catch (err) {
      next(err);
    }
  },

  // --- Gallery Albums & Media ---
  async listAlbums(req, res, next) {
    try {
      const { branch_id, academic_year_id, status, search } = req.query;

      let sql = `
        SELECT 
          a.*,
          a.title AS album_name,
          a.title AS event_name,
          a.cover_image AS cover_image_url,
          (SELECT COUNT(*) FROM gallery_media gm WHERE gm.album_id = a.id) AS media_count
        FROM gallery_albums a
        WHERE 1=1
      `;
      const params = [];

      if (branch_id && branch_id !== 'all') {
        sql += ' AND a.branch_id = ?';
        params.push(Number(branch_id));
      }
      if (academic_year_id && academic_year_id !== 'all' && !isNaN(Number(academic_year_id))) {
        sql += ' AND a.academic_year_id = ?';
        params.push(Number(academic_year_id));
      }
      if (status && status !== 'all') {
        sql += ' AND a.status = ?';
        params.push(status);
      }
      if (search) {
        sql += ' AND (a.title LIKE ? OR a.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ' ORDER BY a.id DESC';

      const [rows] = await pool.query(sql, params);

      const albumsWithCount = rows.map(alb => {
        let totalCount = Number(alb.media_count || 0);
        if (totalCount === 0 && alb.cover_image && !alb.cover_image.includes('images.unsplash.com')) {
          totalCount = 1;
        }

        return {
          ...alb,
          album_name: alb.title,
          event_name: alb.title,
          cover_image_url: alb.cover_image,
          media_count: totalCount
        };
      });

      res.json({ success: true, data: albumsWithCount });
    } catch (err) {
      next(err);
    }
  },

  async getAlbumDetails(req, res, next) {
    try {
      const { id } = req.params;
      const [albums] = await pool.query(
        'SELECT a.*, a.title AS album_name, a.title AS event_name, a.cover_image AS cover_image_url FROM gallery_albums a WHERE a.id = ?',
        [Number(id)]
      );

      if (!albums || albums.length === 0) {
        return res.status(404).json({ success: false, message: 'Album not found' });
      }
      const album = albums[0];

      const [mediaRows] = await pool.query(
        'SELECT gm.*, gm.file_url AS media_url, gm.caption AS title FROM gallery_media gm WHERE gm.album_id = ? ORDER BY gm.id ASC',
        [Number(id)]
      );

      let media = mediaRows.map(m => ({
        ...m,
        media_url: m.file_url,
        title: m.caption || m.file_url
      }));

      // If media is empty but album has a valid cover image, auto-insert and return it
      if (media.length === 0 && album.cover_image && !album.cover_image.includes('images.unsplash.com')) {
        const fallbackTitle = album.title || 'Event Photo';
        try {
          const [insRes] = await pool.query(
            `INSERT INTO gallery_media (album_id, media_type, file_url, caption, created_at)
             VALUES (?, 'Photo', ?, ?, NOW())`,
            [Number(id), album.cover_image, fallbackTitle]
          );
          media = [{
            id: insRes.insertId,
            album_id: Number(id),
            media_type: 'Photo',
            media_url: album.cover_image,
            file_url: album.cover_image,
            title: fallbackTitle,
            caption: fallbackTitle
          }];
        } catch (_) {}
      }

      res.json({ success: true, album, media });
    } catch (err) {
      next(err);
    }
  },

  async createAlbum(req, res, next) {
    try {
      const payload = { ...req.body };
      const initialMedia = Array.isArray(payload.initial_media) ? payload.initial_media : [];

      let coverImage = payload.cover_image || payload.cover_image_url || null;
      if (initialMedia.length > 0 && initialMedia[0]?.media_url) {
        if (!coverImage || coverImage.includes('images.unsplash.com')) {
          coverImage = initialMedia[0].media_url;
        }
      }

      const targetClasses = payload.target_classes ? (typeof payload.target_classes === 'string' ? payload.target_classes : JSON.stringify(payload.target_classes)) : null;
      const targetSections = payload.target_sections ? (typeof payload.target_sections === 'string' ? payload.target_sections : JSON.stringify(payload.target_sections)) : null;
      const targetGroups = payload.target_groups ? (typeof payload.target_groups === 'string' ? payload.target_groups : JSON.stringify(payload.target_groups)) : null;

      const [result] = await pool.query(
        `INSERT INTO gallery_albums 
         (branch_id, academic_year_id, title, description, event_date, cover_image, target_audience, target_classes, target_sections, target_groups, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          Number(payload.branch_id || 1),
          Number(payload.academic_year_id || 1),
          payload.title || payload.album_name || payload.event_name || 'Event Album',
          payload.description || '',
          payload.event_date || new Date().toISOString().slice(0, 10),
          coverImage,
          payload.target_audience || payload.visibility || 'All',
          targetClasses,
          targetSections,
          targetGroups,
          payload.status || 'Published',
          payload.created_by ? Number(payload.created_by) : 1
        ]
      );
      const id = result.insertId;

      // Insert media
      for (const m of initialMedia) {
        if (m.media_url || m.file_url) {
          await pool.query(
            `INSERT INTO gallery_media (album_id, media_type, file_url, caption, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [
              id,
              m.media_type || 'Photo',
              m.media_url || m.file_url,
              m.caption || m.title || null
            ]
          );
        }
      }

      await logAudit({
        branch_id: payload.branch_id || 1,
        academic_year_id: payload.academic_year_id,
        module_name: 'Gallery',
        action: 'Created Event Album',
        details: `Created album '${payload.title || payload.album_name || 'Event Album'}' (${initialMedia.length} media items)`,
        user_id: payload.created_by || 1
      });

      res.status(201).json({ success: true, id, message: 'Gallery album created successfully' });
    } catch (err) {
      next(err);
    }
  },

  async updateAlbum(req, res, next) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };
      const newMedia = Array.isArray(payload.new_media) ? payload.new_media : [];
      const coverImage = payload.cover_image || payload.cover_image_url || null;

      await pool.query(
        `UPDATE gallery_albums SET
           branch_id = COALESCE(?, branch_id),
           academic_year_id = COALESCE(?, academic_year_id),
           title = COALESCE(?, title),
           description = COALESCE(?, description),
           event_date = COALESCE(?, event_date),
           cover_image = COALESCE(?, cover_image),
           target_audience = COALESCE(?, target_audience),
           status = COALESCE(?, status),
           updated_at = NOW()
         WHERE id = ?`,
        [
          payload.branch_id ? Number(payload.branch_id) : null,
          payload.academic_year_id ? Number(payload.academic_year_id) : null,
          payload.title || payload.album_name || payload.event_name || null,
          payload.description !== undefined ? payload.description : null,
          payload.event_date || null,
          coverImage,
          payload.target_audience || payload.visibility || null,
          payload.status || null,
          Number(id)
        ]
      );

      for (const m of newMedia) {
        if (m.media_url || m.file_url) {
          await pool.query(
            `INSERT INTO gallery_media (album_id, media_type, file_url, caption, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [
              Number(id),
              m.media_type || 'Photo',
              m.media_url || m.file_url,
              m.caption || m.title || null
            ]
          );
        }
      }

      await logAudit({
        branch_id: payload.branch_id || 1,
        academic_year_id: payload.academic_year_id,
        module_name: 'Gallery',
        action: 'Updated Album',
        details: `Updated album #${id} - '${payload.title || payload.album_name || 'Album'}'`,
        user_id: payload.created_by || 1
      });

      res.json({ success: true, message: 'Gallery album updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async deleteAlbum(req, res, next) {
    try {
      const { id } = req.params;
      const [existing] = await pool.query('SELECT * FROM gallery_albums WHERE id = ?', [Number(id)]);
      await pool.query('DELETE FROM gallery_media WHERE album_id = ?', [Number(id)]);
      await pool.query('DELETE FROM gallery_albums WHERE id = ?', [Number(id)]);

      if (existing && existing[0]) {
        await logAudit({
          branch_id: existing[0].branch_id || 1,
          academic_year_id: existing[0].academic_year_id,
          module_name: 'Gallery',
          action: 'Deleted Album',
          details: `Deleted album #${id} ('${existing[0].title || 'Untitled'}')`
        });
      }

      res.json({ success: true, message: 'Gallery album deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async addMediaToAlbum(req, res, next) {
    try {
      const { albumId } = req.params;
      const { media } = req.body;

      if (!Array.isArray(media) || media.length === 0) {
        return res.status(400).json({ success: false, message: 'Media list is required' });
      }

      for (const m of media) {
        if (m.media_url || m.file_url) {
          await pool.query(
            `INSERT INTO gallery_media (album_id, media_type, file_url, caption, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [
              Number(albumId),
              m.media_type || 'Photo',
              m.media_url || m.file_url,
              m.caption || m.title || null
            ]
          );
        }
      }

      res.status(201).json({ success: true, message: 'Media added to album successfully' });
    } catch (err) {
      next(err);
    }
  },

  async updateMediaItem(req, res, next) {
    try {
      const { mediaId } = req.params;
      const { media_url, file_url, title, caption, media_type } = req.body;

      await pool.query(
        `UPDATE gallery_media SET
           file_url = COALESCE(?, file_url),
           caption = COALESCE(?, caption),
           media_type = COALESCE(?, media_type)
         WHERE id = ?`,
        [
          media_url || file_url || null,
          caption || title || null,
          media_type || null,
          Number(mediaId)
        ]
      );
      res.json({ success: true, message: 'Media item updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async deleteMediaItem(req, res, next) {
    try {
      const { mediaId } = req.params;
      await pool.query('DELETE FROM gallery_media WHERE id = ?', [Number(mediaId)]);
      res.json({ success: true, message: 'Media deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  // --- Communication Dashboard & Monitoring ---
  async getDashboardSummary(req, res, next) {
    try {
      const { branch_id, academic_year_id } = req.query;
      const bId = branch_id && branch_id !== 'all' ? Number(branch_id) : null;
      const ayId = academic_year_id && academic_year_id !== 'all' ? Number(academic_year_id) : null;

      let hwSql = 'SELECT COUNT(*) as total, SUM(CASE WHEN status="Published" THEN 1 ELSE 0 END) as published, SUM(CASE WHEN status="Draft" THEN 1 ELSE 0 END) as draft FROM homework WHERE 1=1';
      const hwParams = [];
      if (bId) { hwSql += ' AND branch_id = ?'; hwParams.push(bId); }
      if (ayId) { hwSql += ' AND academic_year_id = ?'; hwParams.push(ayId); }
      const [hwRows] = await pool.query(hwSql, hwParams);

      let asgnSql = 'SELECT COUNT(*) as total FROM assignments WHERE 1=1';
      const asgnParams = [];
      if (bId) { asgnSql += ' AND branch_id = ?'; asgnParams.push(bId); }
      if (ayId) { asgnSql += ' AND academic_year_id = ?'; asgnParams.push(ayId); }
      const [asgnRows] = await pool.query(asgnSql, asgnParams);

      let annSql = 'SELECT COUNT(*) as total, SUM(CASE WHEN status="Published" THEN 1 ELSE 0 END) as published FROM announcements WHERE 1=1';
      const annParams = [];
      if (bId) { annSql += ' AND branch_id = ?'; annParams.push(bId); }
      if (ayId) { annSql += ' AND academic_year_id = ?'; annParams.push(ayId); }
      const [annRows] = await pool.query(annSql, annParams);

      let albSql = 'SELECT COUNT(*) as total, SUM(CASE WHEN status="Published" THEN 1 ELSE 0 END) as published FROM gallery_albums WHERE 1=1';
      const albParams = [];
      if (bId) { albSql += ' AND branch_id = ?'; albParams.push(bId); }
      if (ayId) { albSql += ' AND academic_year_id = ?'; albParams.push(ayId); }
      const [albRows] = await pool.query(albSql, albParams);

      res.json({
        success: true,
        homework: {
          total: hwRows[0]?.total || 0,
          published: hwRows[0]?.published || 0,
          draft: hwRows[0]?.draft || 0,
          scheduled: 0
        },
        assignment: {
          total: asgnRows[0]?.total || 0,
          online: 0,
          offline: 0,
          scheduled: 0
        },
        announcement: {
          total: annRows[0]?.total || 0,
          published: annRows[0]?.published || 0,
          scheduled: 0,
          urgent: 0
        },
        gallery: {
          total_albums: albRows[0]?.total || 0,
          published: albRows[0]?.published || 0,
          scheduled: 0
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getHomeworkMonitoring(req, res, next) {
    try {
      const { branch_id, academic_year_id } = req.query;
      let sql = `
        SELECT 
          c.name AS class_name,
          s.name AS section_name,
          COUNT(h.id) AS homework_count,
          GROUP_CONCAT(DISTINCT COALESCE(sub.name, h.subject) SEPARATOR ', ') AS subjects_covered
        FROM homework h
        LEFT JOIN classes c ON h.class_id = c.id
        LEFT JOIN branch_class_sections s ON (
          (h.section_id REGEXP '^[0-9]+$' AND h.section_id != 'all' AND h.section_id != '' AND CAST(h.section_id AS UNSIGNED) = s.id)
          OR s.name = h.section_id
        )
        LEFT JOIN subjects sub ON h.subject_id = sub.id
        WHERE 1=1
      `;
      const params = [];
      if (branch_id && branch_id !== 'all') {
        sql += ' AND h.branch_id = ?';
        params.push(Number(branch_id));
      }
      if (academic_year_id && academic_year_id !== 'all' && !isNaN(Number(academic_year_id))) {
        sql += ' AND h.academic_year_id = ?';
        params.push(Number(academic_year_id));
      }
      sql += ' GROUP BY h.class_id, h.section_id, c.name, s.name ORDER BY c.name ASC';

      const [rows] = await pool.query(sql, params);
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  },

  async getAssignmentMonitoring(req, res, next) {
    try {
      const { branch_id, academic_year_id } = req.query;
      let sql = `
        SELECT a.id, a.title, a.due_date, a.class_id, a.section_id, c.name AS class_name, s.name AS section_name
        FROM assignments a
        LEFT JOIN classes c ON a.class_id = c.id
        LEFT JOIN branch_class_sections s ON (
          (a.section_id REGEXP '^[0-9]+$' AND a.section_id != 'all' AND a.section_id != '' AND CAST(a.section_id AS UNSIGNED) = s.id)
          OR s.name = a.section_id
        )
        WHERE 1=1
      `;
      const params = [];
      if (branch_id && branch_id !== 'all') {
        sql += ' AND a.branch_id = ?';
        params.push(Number(branch_id));
      }
      if (academic_year_id && academic_year_id !== 'all' && !isNaN(Number(academic_year_id))) {
        sql += ' AND a.academic_year_id = ?';
        params.push(Number(academic_year_id));
      }
      sql += ' ORDER BY a.id DESC LIMIT 10';

      const [rows] = await pool.query(sql, params);

      const [subCounts] = await pool.query(`
        SELECT 
          assignment_id,
          COUNT(*) as total_submissions,
          SUM(CASE WHEN status IN ('Submitted', 'Late Submitted', 'Reviewed', 'Completed') THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN status IN ('Reviewed', 'Completed') THEN 1 ELSE 0 END) as reviewed_count
        FROM assignment_submissions
        GROUP BY assignment_id
      `);
      const subMap = new Map();
      subCounts.forEach(s => subMap.set(s.assignment_id, s));

      const formatted = rows.map(asgn => {
        const sc = subMap.get(asgn.id);
        return {
          ...asgn,
          total_targeted_students: 0,
          submitted_count: Number(sc?.submitted_count || 0),
          reviewed_count: Number(sc?.reviewed_count || 0)
        };
      });

      res.json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  },

  // --- Student / Parent Portal Feed Simulation ---
  async getStudentPortalFeed(req, res, next) {
    try {
      const { student_id } = req.query;
      const sId = Number(student_id);

      if (!sId) {
        return res.status(400).json({ success: false, message: 'student_id is required' });
      }

      const [students] = await pool.query(
        `SELECT st.*, se.class_id, se.section_id, se.branch_id, c.name AS class_name, s.name AS section_name, b.name AS branch_name
         FROM students st
         LEFT JOIN student_enrollments se ON st.id = se.student_id AND se.enrollment_status = 'active'
         LEFT JOIN classes c ON se.class_id = c.id
         LEFT JOIN branch_class_sections s ON se.section_id = s.id
         LEFT JOIN branches b ON se.branch_id = b.id
         WHERE st.id = ?`,
        [sId]
      );

      if (!students || students.length === 0) {
        return res.status(404).json({ success: false, message: 'Student record not found' });
      }
      const student = students[0];

      const [homework] = await pool.query(
        `SELECT h.*, COALESCE(sub.name, h.subject) AS subject_name 
         FROM homework h 
         LEFT JOIN subjects sub ON h.subject_id = sub.id 
         WHERE (h.class_id = ? OR h.class_id IS NULL)
         ORDER BY h.id DESC LIMIT 20`,
        [student.class_id || 0]
      );

      const [assignments] = await pool.query(
        `SELECT a.*, COALESCE(sub.name, a.subject) AS subject_name 
         FROM assignments a 
         LEFT JOIN subjects sub ON a.subject_id = sub.id 
         WHERE (a.class_id = ? OR a.class_id IS NULL)
         ORDER BY a.id DESC LIMIT 20`,
        [student.class_id || 0]
      );

      const [announcements] = await pool.query(
        `SELECT * FROM announcements 
         WHERE (target_audience = 'All' OR target_class_id = ? OR target_class_id IS NULL)
         ORDER BY id DESC LIMIT 20`,
        [student.class_id || 0]
      );

      const [albums] = await pool.query(
        `SELECT a.*, a.title AS album_name, a.cover_image AS cover_image_url 
         FROM gallery_albums a 
         ORDER BY id DESC LIMIT 20`
      );

      res.json({
        success: true,
        student,
        homework,
        assignments,
        announcements,
        albums
      });
    } catch (err) {
      next(err);
    }
  },

  // --- Audit History Endpoint ---
  async getAuditHistory(req, res, next) {
    try {
      const { branch_id, academic_year_id, module, activity_type, limit = 50 } = req.query;

      let sql = 'SELECT * FROM communication_audit_logs WHERE 1=1';
      const params = [];

      if (branch_id && branch_id !== 'all') {
        sql += ' AND branch_id = ?';
        params.push(Number(branch_id));
      }
      if (academic_year_id && academic_year_id !== 'all' && !isNaN(Number(academic_year_id))) {
        sql += ' AND (academic_year_id = ? OR academic_year_id IS NULL)';
        params.push(Number(academic_year_id));
      }
      const mod = module || activity_type;
      if (mod && mod !== 'all') {
        sql += ' AND module_name = ?';
        params.push(mod);
      }

      sql += ' ORDER BY id DESC LIMIT ?';
      params.push(Number(limit) || 50);

      const [logs] = await pool.query(sql, params);

      const formatted = logs.map(l => ({
        id: l.id,
        branch_id: l.branch_id,
        academic_year_id: l.academic_year_id,
        module_name: l.module_name,
        action: l.action,
        details: l.details,
        user_id: l.user_id,
        ip_address: l.ip_address,
        created_at: l.created_at ? new Date(l.created_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        }) : new Date().toLocaleString()
      }));

      res.json({ success: true, data: formatted, logs: formatted });
    } catch (err) {
      next(err);
    }
  },

  // --- Live Multi-Module Feeds for All Classes ---
  async getClassModuleFeeds(req, res, next) {
    try {
      const { branch_id, academic_year_id, class_id, module } = req.query;
      const feeds = [];

      // Homework Feeds
      if (!module || module === 'all' || module === 'homework') {
        try {
          let hwSql = `
            SELECT h.id, h.title, h.description, h.class_id, h.due_date, h.status, h.created_at,
                   c.name AS class_name, s.name AS section_name, COALESCE(sub.name, h.subject) AS subject_name
            FROM homework h
            LEFT JOIN classes c ON h.class_id = c.id
            LEFT JOIN branch_class_sections s ON (
              (h.section_id REGEXP '^[0-9]+$' AND h.section_id != 'all' AND h.section_id != '' AND CAST(h.section_id AS UNSIGNED) = s.id)
              OR s.name = h.section_id
            )
            LEFT JOIN subjects sub ON h.subject_id = sub.id
            WHERE 1=1
          `;
          const hwParams = [];
          if (branch_id && branch_id !== 'all') {
            hwSql += ' AND h.branch_id = ?';
            hwParams.push(Number(branch_id));
          }
          if (class_id && class_id !== 'all') {
            hwSql += ' AND h.class_id = ?';
            hwParams.push(Number(class_id));
          }
          hwSql += ' ORDER BY h.id DESC LIMIT 15';

          const [hwList] = await pool.query(hwSql, hwParams);

          hwList.forEach(hw => {
            feeds.push({
              id: `hw-${hw.id}`,
              module: 'Homework',
              title: `${hw.subject_name || 'Subject'}: ${hw.title}`,
              description: hw.description ? (hw.description.length > 90 ? hw.description.substring(0, 90) + '...' : hw.description) : 'Homework task assigned to class roster.',
              class_id: hw.class_id,
              class_name: hw.class_name || `Class ${hw.class_id}`,
              section_name: hw.section_name || 'All Sections',
              status: hw.status || 'Published',
              badge_color: 'indigo',
              due_date: hw.due_date,
              timestamp: hw.created_at,
              link: '/communication/homework'
            });
          });
        } catch (e) {
          console.error('Error fetching homework feed:', e.message);
        }
      }

      // Announcements Feeds
      if (!module || module === 'all' || module === 'announcements') {
        try {
          let annSql = `
            SELECT a.id, a.title, a.content, a.target_audience, a.target_class_id AS class_id, a.priority, a.status, a.created_at,
                   c.name AS class_name, s.name AS section_name
            FROM announcements a
            LEFT JOIN classes c ON a.target_class_id = c.id
            LEFT JOIN branch_class_sections s ON a.target_section_id = s.id
            WHERE 1=1
          `;
          const annParams = [];
          if (branch_id && branch_id !== 'all') {
            annSql += ' AND a.branch_id = ?';
            annParams.push(Number(branch_id));
          }
          if (class_id && class_id !== 'all') {
            annSql += ' AND (a.target_audience = "All" OR a.target_class_id = ?)';
            annParams.push(Number(class_id));
          }
          annSql += ' ORDER BY a.id DESC LIMIT 12';

          const [annList] = await pool.query(annSql, annParams);

          annList.forEach(ann => {
            feeds.push({
              id: `ann-${ann.id}`,
              module: 'Announcements',
              title: ann.title,
              description: ann.content ? (ann.content.length > 90 ? ann.content.substring(0, 90) + '...' : ann.content) : 'Important circular published.',
              class_id: ann.class_id,
              class_name: ann.target_audience === 'All' ? 'All Classes' : (ann.class_name || `Class ${ann.class_id}`),
              section_name: ann.section_name || 'All',
              status: ann.priority || 'Normal',
              badge_color: ann.priority === 'High' || ann.priority === 'Urgent' ? 'rose' : 'amber',
              timestamp: ann.created_at,
              link: '/communication/announcements'
            });
          });
        } catch (e) {
          console.error('Error fetching announcements feed:', e.message);
        }
      }

      // Assignments Feeds
      if (!module || module === 'all' || module === 'assignments') {
        try {
          let asgSql = `
            SELECT a.id, a.title, a.due_date, a.class_id, a.created_at,
                   c.name AS class_name, s.name AS section_name, COALESCE(sub.name, a.subject) AS subject_name
            FROM assignments a
            LEFT JOIN classes c ON a.class_id = c.id
            LEFT JOIN branch_class_sections s ON (
              (a.section_id REGEXP '^[0-9]+$' AND a.section_id != 'all' AND a.section_id != '' AND CAST(a.section_id AS UNSIGNED) = s.id)
              OR s.name = a.section_id
            )
            LEFT JOIN subjects sub ON a.subject_id = sub.id
            WHERE 1=1
          `;
          const asgParams = [];
          if (branch_id && branch_id !== 'all') {
            asgSql += ' AND a.branch_id = ?';
            asgParams.push(Number(branch_id));
          }
          if (class_id && class_id !== 'all') {
            asgSql += ' AND a.class_id = ?';
            asgParams.push(Number(class_id));
          }
          asgSql += ' ORDER BY a.id DESC LIMIT 10';

          const [asgList] = await pool.query(asgSql, asgParams);

          asgList.forEach(asg => {
            feeds.push({
              id: `asg-${asg.id}`,
              module: 'Assignments',
              title: `${asg.subject_name || 'Project'}: ${asg.title}`,
              description: `Assignment due on ${asg.due_date || 'Schedule'}.`,
              class_id: asg.class_id,
              class_name: asg.class_name || `Class ${asg.class_id}`,
              section_name: asg.section_name || 'All',
              status: 'Active',
              badge_color: 'sky',
              due_date: asg.due_date,
              timestamp: asg.created_at,
              link: '/communication/assignments'
            });
          });
        } catch (e) {
          console.error('Error fetching assignments feed:', e.message);
        }
      }

      feeds.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

      res.json({
        success: true,
        data: feeds,
        count: feeds.length
      });
    } catch (err) {
      next(err);
    }
  }
};

export default communicationController;
