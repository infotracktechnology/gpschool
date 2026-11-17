import { query } from '../config/database.js';

export const getSubjects = async (req, res, next) => {
  try {
    const { board_id, class_id, stream_id, status, category, requirement } = req.query;

    let sql = `
      SELECT sub.*,
             bd.name AS board_name, bd.code AS board_code,
             c.name AS class_name, c.code AS class_code, c.stage AS class_stage, c.display_order AS class_display_order,
             s.name AS stream_name, s.code AS stream_code
      FROM subjects sub
      JOIN boards bd ON sub.board_id = bd.id
      JOIN classes c ON sub.class_id = c.id
      LEFT JOIN streams s ON sub.stream_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (board_id) {
      sql += ' AND sub.board_id = ?';
      params.push(board_id);
    }

    if (class_id) {
      sql += ' AND sub.class_id = ?';
      params.push(class_id);
    }

    if (stream_id !== undefined && stream_id !== '') {
      if (stream_id === 'null' || stream_id === null) {
        sql += ' AND sub.stream_id IS NULL';
      } else {
        sql += ' AND sub.stream_id = ?';
        params.push(stream_id);
      }
    }

    if (status) {
      sql += ' AND sub.status = ?';
      params.push(status);
    }

    if (category) {
      sql += ' AND sub.category = ?';
      params.push(category);
    }

    if (requirement) {
      sql += ' AND sub.requirement = ?';
      params.push(requirement);
    }

    sql += ' ORDER BY c.display_order ASC, sub.name ASC';

    const subjects = await query(sql, params);
    res.json({ subjects });
  } catch (error) {
    next(error);
  }
};

export const getSubjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subjects = await query(
      `SELECT sub.*,
              bd.name AS board_name, bd.code AS board_code,
              c.name AS class_name, c.code AS class_code, c.stage AS class_stage,
              s.name AS stream_name, s.code AS stream_code
       FROM subjects sub
       JOIN boards bd ON sub.board_id = bd.id
       JOIN classes c ON sub.class_id = c.id
       LEFT JOIN streams s ON sub.stream_id = s.id
       WHERE sub.id = ?`,
      [id]
    );

    if (subjects.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.json({ subject: subjects[0] });
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req, res, next) => {
  try {
    const {
      board_id,
      class_id,
      stream_id = null,
      name,
      code,
      category = 'Core',
      requirement = 'compulsory',
      is_language = false,
      language_name = null,
      language_level = null,
      max_marks = 100,
      pass_marks = 35,
      credits = 4,
      flag_exam = true,
      flag_gradebook = true,
      flag_report_card = true,
      flag_attendance = true,
      flag_homework = true,
      flag_assignment = true,
      flag_timetable = true,
      flag_promotion = true,
      status = 'active',
    } = req.body;

    if (!board_id || !class_id || !name || !code) {
      return res.status(400).json({
        message: 'Board, Class, Subject Name, and Subject Code are required',
      });
    }

    const result = await query(
      `INSERT INTO subjects (
        board_id, class_id, stream_id, name, code, category, requirement,
        is_language, language_name, language_level,
        max_marks, pass_marks, credits,
        flag_exam, flag_gradebook, flag_report_card, flag_attendance,
        flag_homework, flag_assignment, flag_timetable, flag_promotion,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(board_id),
        Number(class_id),
        stream_id ? Number(stream_id) : null,
        name.trim(),
        code.trim().toUpperCase(),
        category ? category.trim() : 'Core',
        requirement || 'compulsory',
        Boolean(is_language),
        is_language && language_name ? language_name.trim() : null,
        is_language && language_level ? language_level : null,
        Number(max_marks) || 100,
        Number(pass_marks) || 35,
        Number(credits) || 4,
        flag_exam !== undefined ? Boolean(flag_exam) : true,
        flag_gradebook !== undefined ? Boolean(flag_gradebook) : true,
        flag_report_card !== undefined ? Boolean(flag_report_card) : true,
        flag_attendance !== undefined ? Boolean(flag_attendance) : true,
        flag_homework !== undefined ? Boolean(flag_homework) : true,
        flag_assignment !== undefined ? Boolean(flag_assignment) : true,
        flag_timetable !== undefined ? Boolean(flag_timetable) : true,
        flag_promotion !== undefined ? Boolean(flag_promotion) : true,
        status || 'active',
      ]
    );

    res.status(201).json({
      message: 'Subject created successfully',
      subjectId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      board_id,
      class_id,
      stream_id,
      name,
      code,
      category,
      requirement,
      is_language,
      language_name,
      language_level,
      max_marks,
      pass_marks,
      credits,
      flag_exam,
      flag_gradebook,
      flag_report_card,
      flag_attendance,
      flag_homework,
      flag_assignment,
      flag_timetable,
      flag_promotion,
      status,
    } = req.body;

    const existing = await query('SELECT * FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const current = existing[0];

    await query(
      `UPDATE subjects
       SET board_id = COALESCE(?, board_id),
           class_id = COALESCE(?, class_id),
           stream_id = ?,
           name = COALESCE(?, name),
           code = COALESCE(?, code),
           category = COALESCE(?, category),
           requirement = COALESCE(?, requirement),
           is_language = COALESCE(?, is_language),
           language_name = ?,
           language_level = ?,
           max_marks = COALESCE(?, max_marks),
           pass_marks = COALESCE(?, pass_marks),
           credits = COALESCE(?, credits),
           flag_exam = COALESCE(?, flag_exam),
           flag_gradebook = COALESCE(?, flag_gradebook),
           flag_report_card = COALESCE(?, flag_report_card),
           flag_attendance = COALESCE(?, flag_attendance),
           flag_homework = COALESCE(?, flag_homework),
           flag_assignment = COALESCE(?, flag_assignment),
           flag_timetable = COALESCE(?, flag_timetable),
           flag_promotion = COALESCE(?, flag_promotion),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        board_id ? Number(board_id) : null,
        class_id ? Number(class_id) : null,
        stream_id !== undefined ? (stream_id ? Number(stream_id) : null) : current.stream_id,
        name ? name.trim() : null,
        code ? code.trim().toUpperCase() : null,
        category !== undefined ? (category ? category.trim() : null) : current.category,
        requirement || null,
        is_language !== undefined ? Boolean(is_language) : null,
        language_name !== undefined ? (language_name ? language_name.trim() : null) : current.language_name,
        language_level !== undefined ? language_level : current.language_level,
        max_marks !== undefined ? Number(max_marks) : null,
        pass_marks !== undefined ? Number(pass_marks) : null,
        credits !== undefined ? Number(credits) : null,
        flag_exam !== undefined ? Boolean(flag_exam) : null,
        flag_gradebook !== undefined ? Boolean(flag_gradebook) : null,
        flag_report_card !== undefined ? Boolean(flag_report_card) : null,
        flag_attendance !== undefined ? Boolean(flag_attendance) : null,
        flag_homework !== undefined ? Boolean(flag_homework) : null,
        flag_assignment !== undefined ? Boolean(flag_assignment) : null,
        flag_timetable !== undefined ? Boolean(flag_timetable) : null,
        flag_promotion !== undefined ? Boolean(flag_promotion) : null,
        status || null,
        id,
      ]
    );

    res.json({ message: 'Subject updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await query('DELETE FROM subjects WHERE id = ?', [id]);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    next(error);
  }
};
