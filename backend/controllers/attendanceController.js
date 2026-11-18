import { query } from '../config/database.js';

// ─────────────────────────────────────────────────────────────────────────────
// POST /attendance/bulk-save
// Body: { branch_id, academic_year_id, class_id, section_id,
//         attendance_date, session, timing_id, records:[{student_id,status}] }
// ─────────────────────────────────────────────────────────────────────────────
export const bulkSaveAttendance = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      section_id,
      attendance_date,
      session,
      timing_id,
      records,
    } = req.body;

    // Validate required top-level fields
    if (
      !branch_id ||
      !academic_year_id ||
      !class_id ||
      !section_id ||
      !attendance_date ||
      !session
    ) {
      return res.status(400).json({
        message:
          'branch_id, academic_year_id, class_id, section_id, attendance_date and session are required.',
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res
        .status(400)
        .json({ message: 'records array must be non-empty.' });
    }

    const marked_by = req.user.id;
    let saved = 0;

    for (const rec of records) {
      const { student_id, status } = rec;
      if (!student_id || !status) continue;

      await query(
        `INSERT INTO student_attendance
           (student_id, branch_id, academic_year_id, class_id, section_id,
            attendance_date, session, status, marked_by, timing_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status     = VALUES(status),
           marked_by  = VALUES(marked_by),
           timing_id  = VALUES(timing_id),
           updated_at = NOW()`,
        [
          student_id,
          branch_id,
          academic_year_id,
          class_id,
          section_id,
          attendance_date,
          session,
          status,
          marked_by,
          timing_id || null,
        ]
      );
      saved++;
    }

    return res.json({
      message: 'Attendance saved successfully.',
      saved,
      date: attendance_date,
      session,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /attendance
// Query: branch_id, academic_year_id, class_id, section_id,
//        date_from, date_to, session  (all optional)
// ─────────────────────────────────────────────────────────────────────────────
export const getAttendance = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      section_id,
      date_from,
      date_to,
      session,
    } = req.query;

    let sql = `
      SELECT
        sa.id,
        sa.student_id,
        s.name           AS student_name,
        s.roll_no,
        sa.attendance_date,
        sa.session,
        sa.status,
        u.name           AS marked_by_name,
        at.timing_name
      FROM student_attendance sa
      JOIN students s           ON sa.student_id       = s.id
      LEFT JOIN users u         ON sa.marked_by        = u.id
      LEFT JOIN attendance_timings at ON sa.timing_id  = at.id
      WHERE 1=1
    `;
    const params = [];

    // Branch scoping
    if (req.user.role !== 'super_admin' && req.user.branch_id) {
      sql += ' AND sa.branch_id = ?';
      params.push(req.user.branch_id);
    } else if (branch_id) {
      sql += ' AND sa.branch_id = ?';
      params.push(branch_id);
    }

    if (academic_year_id) {
      sql += ' AND sa.academic_year_id = ?';
      params.push(academic_year_id);
    }
    if (class_id) {
      sql += ' AND sa.class_id = ?';
      params.push(class_id);
    }
    if (section_id) {
      sql += ' AND sa.section_id = ?';
      params.push(section_id);
    }
    if (date_from) {
      sql += ' AND sa.attendance_date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      sql += ' AND sa.attendance_date <= ?';
      params.push(date_to);
    }
    if (session) {
      sql += ' AND sa.session = ?';
      params.push(session);
    }

    sql += ' ORDER BY sa.attendance_date DESC, s.roll_no ASC';

    const rows = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /attendance/monthly-report
// Query: branch_id, academic_year_id, class_id, section_id, year, month
// ─────────────────────────────────────────────────────────────────────────────
export const getMonthlyReport = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id, class_id, section_id, year, month } =
      req.query;

    if (!class_id || !section_id || !year || !month) {
      return res
        .status(400)
        .json({ message: 'class_id, section_id, year and month are required.' });
    }

    const yr = parseInt(year, 10);
    const mo = parseInt(month, 10);

    // All students in this class+section
    let studentSql = `
      SELECT id AS student_id, name AS student_name, roll_no
      FROM students
      WHERE class_id = ? AND section_id = ?
    `;
    const studentParams = [class_id, section_id];

    if (branch_id) {
      studentSql += ' AND branch_id = ?';
      studentParams.push(branch_id);
    }
    if (academic_year_id) {
      studentSql += ' AND academic_year_id = ?';
      studentParams.push(academic_year_id);
    }
    studentSql += ' ORDER BY roll_no ASC';

    const students = await query(studentSql, studentParams);

    // Total school days (distinct dates with any attendance for this class+section in month)
    let daysSql = `
      SELECT COUNT(DISTINCT attendance_date) AS total_days
      FROM student_attendance
      WHERE class_id = ? AND section_id = ?
        AND YEAR(attendance_date) = ? AND MONTH(attendance_date) = ?
    `;
    const daysParams = [class_id, section_id, yr, mo];

    if (branch_id) {
      daysSql += ' AND branch_id = ?';
      daysParams.push(branch_id);
    }
    if (academic_year_id) {
      daysSql += ' AND academic_year_id = ?';
      daysParams.push(academic_year_id);
    }

    const daysResult = await query(daysSql, daysParams);
    const total_days = daysResult[0]?.total_days ?? 0;

    // Per-student counts for the month
    let countSql = `
      SELECT
        student_id,
        SUM(status = 'present') AS present,
        SUM(status = 'absent')  AS absent,
        SUM(status = 'late')    AS late
      FROM student_attendance
      WHERE class_id = ? AND section_id = ?
        AND YEAR(attendance_date) = ? AND MONTH(attendance_date) = ?
    `;
    const countParams = [class_id, section_id, yr, mo];

    if (branch_id) {
      countSql += ' AND branch_id = ?';
      countParams.push(branch_id);
    }
    if (academic_year_id) {
      countSql += ' AND academic_year_id = ?';
      countParams.push(academic_year_id);
    }
    countSql += ' GROUP BY student_id';

    const counts = await query(countSql, countParams);
    const countMap = {};
    for (const row of counts) {
      countMap[row.student_id] = row;
    }

    // Build report rows
    let total_present = 0;
    let total_absent = 0;
    let total_late = 0;

    const data = students.map((st) => {
      const c = countMap[st.student_id] || { present: 0, absent: 0, late: 0 };
      const present = Number(c.present) || 0;
      const absent = Number(c.absent) || 0;
      const late = Number(c.late) || 0;
      const percentage =
        total_days > 0
          ? Math.round(((present + late) / total_days) * 1000) / 10
          : 0;

      total_present += present;
      total_absent += absent;
      total_late += late;

      return {
        student_id: st.student_id,
        student_name: st.student_name,
        roll_no: st.roll_no,
        present,
        absent,
        late,
        total_days,
        percentage,
      };
    });

    return res.json({
      data,
      summary: { total_present, total_absent, total_late, total_days },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /attendance/session-detect
// Query: branch_id, academic_year_id
// ─────────────────────────────────────────────────────────────────────────────
export const detectSession = async (req, res, next) => {
  try {
    const { branch_id, academic_year_id } = req.query;

    if (!branch_id || !academic_year_id) {
      return res
        .status(400)
        .json({ message: 'branch_id and academic_year_id are required.' });
    }

    const rows = await query(
      `SELECT * FROM attendance_timings
       WHERE branch_id = ? AND academic_year_id = ? AND is_active = 1
       LIMIT 1`,
      [branch_id, academic_year_id]
    );

    if (rows.length === 0) {
      return res.json({ timing: null, suggested_session: 'session1' });
    }

    const timing = rows[0];

    // Compare current local time against session windows
    const now = new Date();
    const hhmm = (t) => {
      // t may be a TIME string "HH:MM:SS" or a number of seconds
      if (typeof t === 'string') {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      }
      return Math.floor(t / 60); // seconds → minutes
    };

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const s1Start = hhmm(timing.session1_start);
    const s1End = hhmm(timing.session1_end);

    let suggested_session = 'session1';

    if (
      timing.session2_enabled &&
      timing.session2_start &&
      timing.session2_end
    ) {
      const s2Start = hhmm(timing.session2_start);
      const s2End = hhmm(timing.session2_end);

      if (nowMinutes >= s2Start && nowMinutes <= s2End) {
        suggested_session = 'session2';
      } else if (nowMinutes >= s1Start && nowMinutes <= s1End) {
        suggested_session = 'session1';
      } else if (nowMinutes > s1End && nowMinutes < s2Start) {
        // Between sessions — suggest session2 (upcoming)
        suggested_session = 'session2';
      } else if (nowMinutes > s2End) {
        // After session2 — still report session2
        suggested_session = 'session2';
      }
    }

    return res.json({ timing, suggested_session });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /attendance/check
// Query: branch_id, academic_year_id, class_id, section_id,
//        attendance_date, session
// ─────────────────────────────────────────────────────────────────────────────
export const checkAttendance = async (req, res, next) => {
  try {
    const {
      branch_id,
      academic_year_id,
      class_id,
      section_id,
      attendance_date,
      session,
    } = req.query;

    if (!class_id || !section_id || !attendance_date || !session) {
      return res.status(400).json({
        message:
          'class_id, section_id, attendance_date and session are required.',
      });
    }

    let sql = `
      SELECT student_id, status
      FROM student_attendance
      WHERE class_id = ? AND section_id = ?
        AND attendance_date = ? AND session = ?
    `;
    const params = [class_id, section_id, attendance_date, session];

    if (branch_id) {
      sql += ' AND branch_id = ?';
      params.push(branch_id);
    }
    if (academic_year_id) {
      sql += ' AND academic_year_id = ?';
      params.push(academic_year_id);
    }

    const records = await query(sql, params);

    return res.json({
      marked: records.length > 0,
      records,
    });
  } catch (err) {
    next(err);
  }
};
