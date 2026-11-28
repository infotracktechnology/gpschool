import { pool, query } from '../../config/database.js';
import { buildScopeFilter, resolveWriteScope, sanitizeScopeId } from '../../middleware/authMiddleware.js';

const respondError = (res, status, message) => res.status(status).json({ success: false, message });

const RESOURCES = {
  hostels: {
    table: 'hostel_hostels',
    fields: ['name', 'code', 'hostel_type', 'address', 'status'],
    required: ['name'],
  },
  wardens: {
    table: 'hostel_wardens',
    fields: ['hostel_id', 'staff_id', 'name', 'phone', 'email', 'status'],
    required: ['hostel_id', 'name'],
    references: { hostel_id: 'hostel_hostels' },
  },
  blocks: {
    table: 'hostel_blocks',
    fields: ['hostel_id', 'name', 'status'],
    required: ['hostel_id', 'name'],
    references: { hostel_id: 'hostel_hostels' },
  },
  floors: {
    table: 'hostel_floors',
    fields: ['block_id', 'name', 'floor_number', 'status'],
    required: ['block_id', 'name'],
    references: { block_id: 'hostel_blocks' },
  },
  rooms: {
    table: 'hostel_rooms',
    fields: ['floor_id', 'room_number', 'room_type', 'capacity', 'status', 'notes'],
    required: ['floor_id', 'room_number'],
    references: { floor_id: 'hostel_floors' },
  },
  beds: {
    table: 'hostel_beds',
    fields: ['room_id', 'bed_number', 'status'],
    required: ['room_id', 'bed_number'],
    references: { room_id: 'hostel_rooms' },
  },
  allocations: {
    table: 'hostel_allocations',
    fields: ['student_id', 'bed_id', 'start_date', 'end_date', 'status', 'notes'],
    required: ['student_id', 'bed_id', 'start_date'],
    references: { bed_id: 'hostel_beds' },
  },
  'gate-passes': {
    table: 'hostel_gate_passes',
    fields: ['student_id', 'reason', 'departure_at', 'expected_return_at'],
    required: ['student_id', 'reason', 'departure_at', 'expected_return_at'],
  },
  attendance: {
    table: 'hostel_attendance',
    fields: ['student_id', 'attendance_date', 'movement', 'movement_time', 'remarks'],
  },
  fees: {
    table: 'hostel_fees',
    fields: ['student_id', 'allocation_id', 'fee_name', 'amount', 'due_date', 'frequency', 'status', 'notes'],
    required: ['student_id', 'fee_name', 'amount'],
    references: { allocation_id: 'hostel_allocations' },
  },
  'fee-collections': {
    table: 'hostel_fee_collections',
    fields: ['fee_id', 'student_id', 'amount', 'payment_date', 'payment_method', 'receipt_number', 'reference_number', 'notes'],
  },
  mess: {
    table: 'hostel_mess_menu',
    fields: ['hostel_id', 'menu_date', 'meal_type', 'menu', 'notes'],
    required: ['hostel_id', 'menu_date', 'meal_type', 'menu'],
    references: { hostel_id: 'hostel_hostels' },
  },
  complaints: {
    table: 'hostel_complaints',
    fields: ['student_id', 'category', 'subject', 'description', 'status', 'assigned_to', 'resolution'],
    required: ['student_id', 'category', 'subject', 'description'],
  },
  maintenance: {
    table: 'hostel_maintenance',
    fields: ['room_id', 'bed_id', 'issue_type', 'description', 'priority', 'status', 'assigned_to', 'cost', 'scheduled_date'],
    required: ['issue_type', 'description'],
    references: { room_id: 'hostel_rooms', bed_id: 'hostel_beds' },
  },
};

const pickFields = (source, fields) => Object.fromEntries(
  fields
    .filter((field) => source[field] !== undefined)
    .map((field) => [field, source[field] === '' ? null : source[field]])
);

const getResource = (name) => RESOURCES[name] || null;

const getScopedRecord = async (req, table, id, alias = 't') => {
  const scope = buildScopeFilter(req, alias);
  const rows = await query(
    `SELECT ${alias}.* FROM ${table} ${alias} WHERE ${alias}.id = ?${scope.sql} LIMIT 1`,
    [id, ...scope.params]
  );
  return rows[0] || null;
};

const validateReferences = async (resource, values, branchId, academicYearId) => {
  for (const [field, table] of Object.entries(resource.references || {})) {
    const id = sanitizeScopeId(values[field]);
    if (values[field] !== undefined && values[field] !== null && !id) {
      return `${field} must be a valid ID`;
    }
    if (!id) continue;
    const rows = await query(
      `SELECT id FROM ${table} WHERE id = ? AND branch_id = ? AND academic_year_id = ? LIMIT 1`,
      [id, branchId, academicYearId]
    );
    if (!rows.length) return `${field} is outside the current branch and academic-year scope`;
  }
  return null;
};

const resolveResourceScope = async (req) => {
  const { branchId, academicYearId } = await resolveWriteScope(req, { requireBranch: true });
  if (!branchId) return { error: 'Branch scope is required' };
  if (!academicYearId) return { error: 'Academic-year scope is required' };
  return { branchId, academicYearId };
};

export const getHostelDashboard = async (req, res, next) => {
  try {
    const scope = buildScopeFilter(req, 'h');
    const params = [...scope.params];
    const [hostels, beds, occupied, pendingPasses, openComplaints, openMaintenance, todaysMovements] = await Promise.all([
      query(`SELECT COUNT(*) AS count FROM hostel_hostels h WHERE h.status = 'active'${scope.sql}`, params),
      query(`SELECT COUNT(*) AS count FROM hostel_beds h WHERE h.status != 'maintenance'${scope.sql}`, params),
      query(`SELECT COUNT(*) AS count FROM hostel_allocations h WHERE h.status = 'active'${scope.sql}`, params),
      query(`SELECT COUNT(*) AS count FROM hostel_gate_passes h WHERE h.status = 'pending'${scope.sql}`, params),
      query(`SELECT COUNT(*) AS count FROM hostel_complaints h WHERE h.status IN ('open','in_progress')${scope.sql}`, params),
      query(`SELECT COUNT(*) AS count FROM hostel_maintenance h WHERE h.status IN ('open','in_progress')${scope.sql}`, params),
      query(
        `SELECT movement, COUNT(*) AS count FROM hostel_attendance h
         WHERE h.attendance_date = CURRENT_DATE()${scope.sql} GROUP BY movement`,
        params
      ),
    ]);
    const movementCounts = Object.fromEntries(todaysMovements.map((row) => [row.movement, Number(row.count)]));
    res.json({
      success: true,
      kpis: {
        hostels: Number(hostels[0]?.count || 0),
        beds: Number(beds[0]?.count || 0),
        active_allocations: Number(occupied[0]?.count || 0),
        pending_gate_passes: Number(pendingPasses[0]?.count || 0),
        open_complaints: Number(openComplaints[0]?.count || 0),
        open_maintenance: Number(openMaintenance[0]?.count || 0),
        check_ins_today: movementCounts.in || 0,
        check_outs_today: movementCounts.out || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listHostelStudents = async (req, res, next) => {
  try {
    const { branchId, academicYearId, error } = await resolveResourceScope(req);
    if (error) return respondError(res, 400, error);
    const search = String(req.query.search || '').trim();
    const like = `%${search}%`;
    const rows = await query(
      `SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_no, s.branch_id
       FROM students s
       LEFT JOIN student_enrollments se ON se.student_id = s.id
       WHERE s.branch_id = ? AND (
         ? = '' OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_no LIKE ?
       ) AND (
         se.student_id IS NULL OR (se.branch_id = ? AND se.academic_year_id = ?
         AND se.enrollment_status IN ('current','active'))
       )
       ORDER BY s.first_name, s.last_name LIMIT 100`,
      [branchId, search, like, like, like, branchId, academicYearId]
    );
    res.json({ success: true, students: rows });
  } catch (error) {
    next(error);
  }
};

export const listHostelResource = (resourceName) => async (req, res, next) => {
  try {
    const resource = getResource(resourceName);
    if (!resource) return respondError(res, 404, 'Hostel resource not found');
    const scope = buildScopeFilter(req, 't');
    const filters = [];
    const params = [...scope.params];
    for (const field of resource.fields) {
      if (req.query[field] !== undefined && ['status', 'hostel_id', 'block_id', 'floor_id', 'room_id', 'bed_id', 'student_id', 'fee_id', 'meal_type', 'category'].includes(field)) {
        filters.push(`t.${field} = ?`);
        params.push(req.query[field]);
      }
    }
    const where = [
      scope.sql.replace(/^\s*AND\s*/, ''),
      ...filters,
    ].filter(Boolean).join(' AND ');
    const rows = await query(
      `SELECT t.* FROM ${resource.table} t${where ? ` WHERE ${where}` : ''} ORDER BY t.id DESC LIMIT 1000`,
      params
    );
    res.json({ success: true, records: rows });
  } catch (error) {
    next(error);
  }
};

export const createHostelResource = (resourceName) => async (req, res, next) => {
  const resource = getResource(resourceName);
  if (!resource) return respondError(res, 404, 'Hostel resource not found');
  if (['attendance', 'fee-collections'].includes(resourceName)) {
    return respondError(res, 405, 'Use the dedicated workflow for this resource');
  }
  const values = pickFields(req.body, resource.fields);
  for (const field of resource.required) {
    if (values[field] === undefined || values[field] === null || values[field] === '') {
      return respondError(res, 400, `${field} is required`);
    }
  }
  if (resourceName === 'allocations') return createAllocation(req, res, next, values);
  if (resourceName === 'gate-passes') return createGatePass(req, res, next, values);
  if (resourceName === 'beds') values.status = 'available';
  if (resourceName === 'complaints') {
    values.status = 'open';
  }

  try {
    const { branchId, academicYearId, error } = await resolveResourceScope(req);
    if (error) return respondError(res, 400, error);
    const referenceError = await validateReferences(resource, values, branchId, academicYearId);
    if (referenceError) return respondError(res, 400, referenceError);
    if (values.student_id !== undefined) {
      const students = await query(
        'SELECT id FROM students WHERE id = ? AND branch_id = ? LIMIT 1',
        [values.student_id, branchId]
      );
      if (!students.length) return respondError(res, 400, 'Student is outside the current branch');
    }
    if (resourceName === 'fees' && values.amount !== undefined && (!Number.isFinite(Number(values.amount)) || Number(values.amount) <= 0)) {
      return respondError(res, 400, 'Fee amount must be greater than zero');
    }
    if (resourceName === 'rooms' && values.capacity !== undefined && (!Number.isInteger(Number(values.capacity)) || Number(values.capacity) < 1)) {
      return respondError(res, 400, 'Room capacity must be a positive whole number');
    }
    if (resourceName === 'fees' && values.allocation_id) {
      const allocations = await query(
        `SELECT student_id FROM hostel_allocations WHERE id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'active'`,
        [values.allocation_id, branchId, academicYearId]
      );
      if (!allocations.length || Number(allocations[0].student_id) !== Number(values.student_id)) {
        return respondError(res, 400, 'Allocation must belong to the selected student and scope');
      }
    }
    if (resourceName === 'beds') {
      const rooms = await query(
        `SELECT capacity FROM hostel_rooms WHERE id = ? AND branch_id = ? AND academic_year_id = ?`,
        [values.room_id, branchId, academicYearId]
      );
      const counts = await query(
        `SELECT COUNT(*) AS count FROM hostel_beds WHERE room_id = ? AND branch_id = ? AND academic_year_id = ?`,
        [values.room_id, branchId, academicYearId]
      );
      if (!rooms.length) return respondError(res, 400, 'Room is outside the current scope');
      if (Number(counts[0]?.count || 0) >= Number(rooms[0].capacity)) {
        return respondError(res, 409, 'Room has reached its configured bed capacity');
      }
    }

    const columns = [...Object.keys(values), 'branch_id', 'academic_year_id'];
    const params = [...Object.values(values), branchId, academicYearId];
    if (resourceName === 'mess') columns.push('created_by'), params.push(req.user.id);
    const columnSql = columns.map((column) => `\`${column}\``).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const result = await query(
      `INSERT INTO ${resource.table} (${columnSql}) VALUES (${placeholders})`,
      params
    );
    const record = await getScopedRecord(req, resource.table, result.insertId);
    res.status(201).json({ success: true, record });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return respondError(res, 409, 'A record with the same unique value already exists');
    next(error);
  }
};

const createAllocation = async (req, res, next, values) => {
  let connection;
  try {
    const { branchId, academicYearId, error } = await resolveResourceScope(req);
    if (error) return respondError(res, 400, error);
    const studentId = sanitizeScopeId(values.student_id);
    const bedId = sanitizeScopeId(values.bed_id);
    if (!studentId || !bedId) return respondError(res, 400, 'A valid student and bed are required');
    const students = await query(
      'SELECT id FROM students WHERE id = ? AND branch_id = ? LIMIT 1',
      [studentId, branchId]
    );
    if (!students.length) return respondError(res, 400, 'Student is outside the current branch');

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [beds] = await connection.query(
      `SELECT id, status FROM hostel_beds
       WHERE id = ? AND branch_id = ? AND academic_year_id = ? FOR UPDATE`,
      [bedId, branchId, academicYearId]
    );
    if (!beds.length || beds[0].status !== 'available') {
      await connection.rollback();
      return respondError(res, 409, 'The selected bed is not available in this scope');
    }
    const [activeByBed] = await connection.query(
      `SELECT id FROM hostel_allocations
       WHERE bed_id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'active' LIMIT 1 FOR UPDATE`,
      [bedId, branchId, academicYearId]
    );
    const [activeByStudent] = await connection.query(
      `SELECT id FROM hostel_allocations
       WHERE student_id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'active' LIMIT 1 FOR UPDATE`,
      [studentId, branchId, academicYearId]
    );
    if (activeByBed.length || activeByStudent.length) {
      await connection.rollback();
      return respondError(res, 409, activeByBed.length ? 'The bed already has an active allocation' : 'Student already has an active hostel allocation');
    }
    const [insert] = await connection.query(
      `INSERT INTO hostel_allocations
       (branch_id, academic_year_id, student_id, bed_id, start_date, end_date, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [branchId, academicYearId, studentId, bedId, values.start_date, values.end_date || null, values.notes || null, req.user.id]
    );
    await connection.query('UPDATE hostel_beds SET status = ? WHERE id = ?', ['occupied', bedId]);
    await connection.commit();
    const record = await getScopedRecord(req, 'hostel_allocations', insert.insertId);
    res.status(201).json({ success: true, record });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

const createGatePass = async (req, res, next, values) => {
  try {
    const { branchId, academicYearId, error } = await resolveResourceScope(req);
    if (error) return respondError(res, 400, error);
    const studentId = sanitizeScopeId(values.student_id);
    const students = await query(
      'SELECT id FROM students WHERE id = ? AND branch_id = ? LIMIT 1',
      [studentId, branchId]
    );
    if (!studentId || !students.length) return respondError(res, 400, 'Student is outside the current branch');
    if (new Date(values.expected_return_at) <= new Date(values.departure_at)) {
      return respondError(res, 400, 'Expected return must be later than departure');
    }
    const allocations = await query(
      `SELECT id FROM hostel_allocations WHERE student_id = ? AND branch_id = ?
       AND academic_year_id = ? AND status = 'active' LIMIT 1`,
      [studentId, branchId, academicYearId]
    );
    if (!allocations.length) return respondError(res, 409, 'Only students with an active hostel allocation can request a pass');
    const result = await query(
      `INSERT INTO hostel_gate_passes
       (branch_id, academic_year_id, student_id, reason, departure_at, expected_return_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [branchId, academicYearId, studentId, values.reason, values.departure_at, values.expected_return_at]
    );
    const record = await getScopedRecord(req, 'hostel_gate_passes', result.insertId);
    res.status(201).json({ success: true, record });
  } catch (error) {
    next(error);
  }
};

export const updateHostelResource = (resourceName) => async (req, res, next) => {
  const resource = getResource(resourceName);
  if (!resource) return respondError(res, 404, 'Hostel resource not found');
  if (['allocations', 'gate-passes', 'fee-collections', 'attendance'].includes(resourceName)) {
    return respondError(res, 405, 'Use the dedicated workflow for this resource');
  }
  try {
    const previous = await getScopedRecord(req, resource.table, req.params.id);
    if (!previous) return respondError(res, 404, 'Hostel record not found');
    const values = pickFields(req.body, resource.fields);
    if (!Object.keys(values).length) return respondError(res, 400, 'No supported fields to update');
    if (resourceName === 'beds' && values.status === 'occupied') {
      return respondError(res, 400, 'Beds become occupied only through a student allocation');
    }
    const { branchId, academicYearId, error } = await resolveResourceScope(req);
    if (error) return respondError(res, 400, error);
    const referenceError = await validateReferences(resource, values, branchId, academicYearId);
    if (referenceError) return respondError(res, 400, referenceError);
    if (resourceName === 'beds' && previous.status === 'occupied' && values.status && values.status !== 'occupied') {
      return respondError(res, 409, 'End the active allocation before changing an occupied bed status');
    }
    if (resourceName === 'rooms' && values.capacity !== undefined) {
      const beds = await query(
        'SELECT COUNT(*) AS count FROM hostel_beds WHERE room_id = ? AND branch_id = ? AND academic_year_id = ?',
        [req.params.id, branchId, academicYearId]
      );
      if (!Number.isInteger(Number(values.capacity)) || Number(values.capacity) < Number(beds[0]?.count || 0)) {
        return respondError(res, 409, 'Room capacity cannot be less than the number of configured beds');
      }
    }
    if (resourceName === 'fees') {
      if (values.amount !== undefined && (!Number.isFinite(Number(values.amount)) || Number(values.amount) <= 0)) {
        return respondError(res, 400, 'Fee amount must be greater than zero');
      }
      if (values.student_id !== undefined && Number(values.student_id) !== Number(previous.student_id)) {
        return respondError(res, 400, 'A fee cannot be reassigned to another student');
      }
      if (values.allocation_id !== undefined && String(values.allocation_id || '') !== String(previous.allocation_id || '')) {
        return respondError(res, 400, 'A fee allocation cannot be changed after creation');
      }
      if (values.amount !== undefined) {
        const collections = await query(
          'SELECT COALESCE(SUM(amount), 0) AS paid FROM hostel_fee_collections WHERE fee_id = ?',
          [req.params.id]
        );
        if (Number(values.amount) < Number(collections[0]?.paid || 0)) {
          return respondError(res, 409, 'Fee amount cannot be less than the amount already collected');
        }
      }
    }
    const assignments = Object.keys(values).map((field) => `\`${field}\` = ?`).join(', ');
    await query(
      `UPDATE ${resource.table} SET ${assignments}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND branch_id = ? AND academic_year_id = ?`,
      [...Object.values(values), req.params.id, branchId, academicYearId]
    );
    res.json({ success: true, record: await getScopedRecord(req, resource.table, req.params.id) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return respondError(res, 409, 'A record with the same unique value already exists');
    next(error);
  }
};

export const updateAllocation = async (req, res, next) => {
  let connection;
  try {
    const { branchId, academicYearId, error } = await resolveResourceScope(req);
    if (error) return respondError(res, 400, error);
    const id = sanitizeScopeId(req.params.id);
    const status = req.body.status;
    if (!['completed', 'cancelled'].includes(status)) return respondError(res, 400, 'Allocation status must be completed or cancelled');
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [allocations] = await connection.query(
      `SELECT id, bed_id, status FROM hostel_allocations
       WHERE id = ? AND branch_id = ? AND academic_year_id = ? FOR UPDATE`,
      [id, branchId, academicYearId]
    );
    if (!allocations.length) {
      await connection.rollback();
      return respondError(res, 404, 'Hostel allocation not found');
    }
    if (allocations[0].status !== 'active') {
      await connection.rollback();
      return respondError(res, 409, 'Only active allocations can be ended');
    }
    await connection.query(
      `UPDATE hostel_allocations SET status = ?, end_date = COALESCE(?, CURRENT_DATE()), notes = COALESCE(?, notes)
       WHERE id = ?`,
      [status, req.body.end_date || null, req.body.notes || null, id]
    );
    await connection.query(
      `UPDATE hostel_beds SET status = 'available' WHERE id = ? AND branch_id = ? AND academic_year_id = ?`,
      [allocations[0].bed_id, branchId, academicYearId]
    );
    await connection.commit();
    res.json({ success: true, record: await getScopedRecord(req, 'hostel_allocations', id) });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

export const createHostelMovement = async (req, res, next) => {
  let connection;
  try {
    const { branchId, academicYearId, error } = await resolveResourceScope(req);
    if (error) return respondError(res, 400, error);
    const studentId = sanitizeScopeId(req.body.student_id);
    const movement = req.body.movement;
    if (!studentId || !['in', 'out'].includes(movement)) return respondError(res, 400, 'A valid student and in/out movement are required');
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [allocations] = await connection.query(
      `SELECT id FROM hostel_allocations WHERE student_id = ? AND branch_id = ?
       AND academic_year_id = ? AND status = 'active' LIMIT 1 FOR UPDATE`,
      [studentId, branchId, academicYearId]
    );
    if (!allocations.length) {
      await connection.rollback();
      return respondError(res, 409, 'Student does not have an active hostel allocation');
    }
    const [latest] = await connection.query(
      `SELECT movement FROM hostel_attendance
       WHERE student_id = ? AND branch_id = ? AND academic_year_id = ?
       ORDER BY movement_time DESC, id DESC LIMIT 1 FOR UPDATE`,
      [studentId, branchId, academicYearId]
    );
    if (latest[0]?.movement === movement) {
      await connection.rollback();
      return respondError(res, 409, `Student is already marked ${movement === 'in' ? 'inside' : 'outside'}`);
    }

    let passId = null;
    if (movement === 'out') {
      const [passes] = await connection.query(
        `SELECT id FROM hostel_gate_passes
         WHERE student_id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'approved'
           AND departure_at <= DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 HOUR)
           AND expected_return_at > CURRENT_TIMESTAMP
         ORDER BY departure_at ASC LIMIT 1 FOR UPDATE`,
        [studentId, branchId, academicYearId]
      );
      if (!passes.length) {
        await connection.rollback();
        return respondError(res, 409, 'Student needs an approved gate pass valid for departure');
      }
      passId = passes[0].id;
      await connection.query(
        `UPDATE hostel_gate_passes SET status = 'departed', actual_departure_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [passId]
      );
    } else if (latest[0]?.movement === 'out') {
      const [passes] = await connection.query(
        `SELECT id FROM hostel_gate_passes
         WHERE student_id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'departed'
         ORDER BY actual_departure_at DESC, id DESC LIMIT 1 FOR UPDATE`,
        [studentId, branchId, academicYearId]
      );
      if (!passes.length) {
        await connection.rollback();
        return respondError(res, 409, 'No departed gate pass is available to record this return');
      }
      passId = passes[0].id;
      await connection.query(
        `UPDATE hostel_gate_passes SET status = 'completed', actual_return_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [passId]
      );
    }

    const [result] = await connection.query(
      `INSERT INTO hostel_attendance
       (branch_id, academic_year_id, student_id, attendance_date, movement, movement_time, recorded_by, remarks)
       VALUES (?, ?, ?, CURRENT_DATE(), ?, CURRENT_TIMESTAMP, ?, ?)`,
      [branchId, academicYearId, studentId, movement, req.user.id, req.body.remarks || null]
    );
    await connection.commit();
    res.status(201).json({ success: true, record: { id: result.insertId, student_id: studentId, movement, gate_pass_id: passId } });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

export const reviewGatePass = async (req, res, next) => {
  try {
    const { branchId, academicYearId, error } = await resolveResourceScope(req);
    if (error) return respondError(res, 400, error);
    const status = req.body.status;
    if (!['approved', 'rejected'].includes(status)) return respondError(res, 400, 'Gate pass decision must be approved or rejected');
    const result = await query(
      `UPDATE hostel_gate_passes
       SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_note = ?
       WHERE id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'pending'`,
      [status, req.user.id, req.body.review_note || null, req.params.id, branchId, academicYearId]
    );
    if (!result.affectedRows) return respondError(res, 409, 'Gate pass is not pending or is outside the current scope');
    res.json({ success: true, record: await getScopedRecord(req, 'hostel_gate_passes', req.params.id) });
  } catch (error) {
    next(error);
  }
};

export const completeGatePass = async (req, res, next) => {
  let connection;
  try {
    const { branchId, academicYearId, error } = await resolveResourceScope(req);
    if (error) return respondError(res, 400, error);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [passes] = await connection.query(
      `SELECT id, student_id FROM hostel_gate_passes
       WHERE id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'departed' FOR UPDATE`,
      [req.params.id, branchId, academicYearId]
    );
    if (!passes.length) {
      await connection.rollback();
      return respondError(res, 409, 'Only a departed gate pass can be completed');
    }
    const [latest] = await connection.query(
      `SELECT movement FROM hostel_attendance WHERE student_id = ? AND branch_id = ? AND academic_year_id = ?
       ORDER BY movement_time DESC, id DESC LIMIT 1 FOR UPDATE`,
      [passes[0].student_id, branchId, academicYearId]
    );
    if (latest[0]?.movement !== 'out') {
      await connection.rollback();
      return respondError(res, 409, 'Student is not currently marked outside');
    }
    await connection.query(
      `UPDATE hostel_gate_passes SET status = 'completed', actual_return_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [passes[0].id]
    );
    await connection.query(
      `INSERT INTO hostel_attendance
       (branch_id, academic_year_id, student_id, attendance_date, movement, movement_time, recorded_by)
       VALUES (?, ?, ?, CURRENT_DATE(), 'in', CURRENT_TIMESTAMP, ?)`,
      [branchId, academicYearId, passes[0].student_id, req.user.id]
    );
    await connection.commit();
    res.json({ success: true, record: await getScopedRecord(req, 'hostel_gate_passes', req.params.id) });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
};

export const collectHostelFee = async (req, res, next) => {
  let connection;
  try {
    const { branchId, academicYearId, error } = await resolveResourceScope(req);
    if (error) return respondError(res, 400, error);
    const feeId = sanitizeScopeId(req.body.fee_id);
    const amount = Number(req.body.amount);
    if (!feeId || !Number.isFinite(amount) || amount <= 0) return respondError(res, 400, 'A valid fee and positive collection amount are required');
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [fees] = await connection.query(
      `SELECT id, student_id, amount FROM hostel_fees
       WHERE id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'active' FOR UPDATE`,
      [feeId, branchId, academicYearId]
    );
    if (!fees.length) {
      await connection.rollback();
      return respondError(res, 404, 'Active Hostel fee not found');
    }
    const [totals] = await connection.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid FROM hostel_fee_collections WHERE fee_id = ?`,
      [feeId]
    );
    const balance = Number(fees[0].amount) - Number(totals[0].paid);
    if (amount > balance + 0.00001) {
      await connection.rollback();
      return respondError(res, 400, `Collection exceeds outstanding balance (${Math.max(0, balance).toFixed(2)})`);
    }
    const receiptNumber = String(req.body.receipt_number || `HST-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    const [insert] = await connection.query(
      `INSERT INTO hostel_fee_collections
       (branch_id, academic_year_id, fee_id, student_id, amount, payment_date, payment_method, receipt_number, reference_number, notes, collected_by)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE()), ?, ?, ?, ?, ?)`,
      [branchId, academicYearId, feeId, fees[0].student_id, amount, req.body.payment_date || null,
        req.body.payment_method || null, receiptNumber, req.body.reference_number || null, req.body.notes || null, req.user.id]
    );
    await connection.commit();
    res.status(201).json({ success: true, record: { id: insert.insertId, receipt_number: receiptNumber } });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return respondError(res, 409, 'Receipt number already exists');
    next(error);
  } finally {
    connection?.release();
  }
};

export const getHostelReport = async (req, res, next) => {
  try {
    const type = String(req.params.type || '');
    const scope = buildScopeFilter(req, 't');
    const reports = {
      occupancy: `SELECT h.name AS hostel, COUNT(DISTINCT b.id) AS total_beds,
          SUM(b.status = 'occupied') AS occupied_beds, SUM(b.status = 'available') AS available_beds
        FROM hostel_hostels h
        LEFT JOIN hostel_blocks bl ON bl.hostel_id = h.id
        LEFT JOIN hostel_floors f ON f.block_id = bl.id
        LEFT JOIN hostel_rooms r ON r.floor_id = f.id
        LEFT JOIN hostel_beds b ON b.room_id = r.id
        WHERE h.branch_id = ? AND h.academic_year_id = ?
        GROUP BY h.id, h.name ORDER BY h.name`,
      fees: `SELECT f.student_id, s.first_name, s.last_name, SUM(f.amount) AS billed,
          COALESCE(SUM(c.paid), 0) AS paid, SUM(f.amount) - COALESCE(SUM(c.paid), 0) AS balance
        FROM hostel_fees f JOIN students s ON s.id = f.student_id
        LEFT JOIN (
          SELECT fee_id, SUM(amount) AS paid FROM hostel_fee_collections GROUP BY fee_id
        ) c ON c.fee_id = f.id
        WHERE f.branch_id = ? AND f.academic_year_id = ? AND f.status = 'active'
        GROUP BY f.student_id, s.first_name, s.last_name ORDER BY balance DESC`,
      attendance: `SELECT attendance_date, movement, COUNT(*) AS count
        FROM hostel_attendance t WHERE t.branch_id = ? AND t.academic_year_id = ?
        GROUP BY attendance_date, movement ORDER BY attendance_date DESC LIMIT 1000`,
      complaints: `SELECT status, category, COUNT(*) AS count FROM hostel_complaints t
        WHERE t.branch_id = ? AND t.academic_year_id = ? GROUP BY status, category ORDER BY status, category`,
      maintenance: `SELECT status, priority, COUNT(*) AS count, COALESCE(SUM(cost), 0) AS cost
        FROM hostel_maintenance t WHERE t.branch_id = ? AND t.academic_year_id = ?
        GROUP BY status, priority ORDER BY status, priority`,
    };
    if (!reports[type]) return respondError(res, 404, 'Hostel report not found');
    const branchId = scope.branchId;
    const academicYearId = scope.academicYearId;
    if (!branchId || !academicYearId) return respondError(res, 400, 'Select one branch and academic year to view reports');
    const rows = await query(reports[type], [branchId, academicYearId]);
    res.json({ success: true, report: type, rows });
  } catch (error) {
    next(error);
  }
};

const getStudentRecord = async (req) => {
  const rows = await query(
    `SELECT id, branch_id FROM students WHERE user_id = ? LIMIT 1`,
    [req.user.id]
  );
  return rows[0] || null;
};

const getStudentPortalScope = async (req, student) => ({
  branchId: Number(student.branch_id),
  academicYearId: sanitizeScopeId(req.scope?.academicYearId) || null,
});

export const getStudentHostelDashboard = async (req, res, next) => {
  try {
    const student = await getStudentRecord(req);
    if (!student) return respondError(res, 404, 'Student profile not found');
    if (!sanitizeScopeId(student.branch_id)) return respondError(res, 409, 'Student account is not assigned to a branch');
    const { branchId, academicYearId } = await getStudentPortalScope(req, student);
    const ayClause = academicYearId ? ' AND a.academic_year_id = ?' : '';
    const scopeParams = academicYearId ? [student.id, branchId, academicYearId] : [student.id, branchId];
    const allocations = await query(
      `SELECT a.id AS allocation_id, a.start_date, a.end_date, a.status AS allocation_status,
          h.name AS hostel_name, b.name AS block_name, f.name AS floor_name,
          r.room_number, bed.bed_number
       FROM hostel_allocations a
       JOIN hostel_beds bed ON bed.id = a.bed_id
       JOIN hostel_rooms r ON r.id = bed.room_id
       JOIN hostel_floors f ON f.id = r.floor_id
       JOIN hostel_blocks b ON b.id = f.block_id
       JOIN hostel_hostels h ON h.id = b.hostel_id
       WHERE a.student_id = ? AND a.branch_id = ? AND a.status = 'active'${ayClause}
       ORDER BY a.id DESC LIMIT 1`,
      scopeParams
    );
    const feeParams = academicYearId ? [student.id, branchId, academicYearId] : [student.id, branchId];
    const fees = await query(
      `SELECT f.id, f.fee_name, f.amount, f.due_date, f.frequency,
          COALESCE(SUM(c.amount), 0) AS paid, f.amount - COALESCE(SUM(c.amount), 0) AS balance
       FROM hostel_fees f LEFT JOIN hostel_fee_collections c ON c.fee_id = f.id
       WHERE f.student_id = ? AND f.branch_id = ? AND f.status = 'active'${academicYearId ? ' AND f.academic_year_id = ?' : ''}
       GROUP BY f.id ORDER BY f.due_date`,
      feeParams
    );
    const passes = await query(
      `SELECT id, reason, departure_at, expected_return_at, status, review_note
       FROM hostel_gate_passes WHERE student_id = ? AND branch_id = ?${academicYearId ? ' AND academic_year_id = ?' : ''}
       ORDER BY id DESC LIMIT 10`,
      feeParams
    );
    const complaints = await query(
      `SELECT id, category, subject, status, created_at, resolution
       FROM hostel_complaints WHERE student_id = ? AND branch_id = ?${academicYearId ? ' AND academic_year_id = ?' : ''}
       ORDER BY id DESC LIMIT 10`,
      feeParams
    );
    const attendance = await query(
      `SELECT attendance_date, movement, movement_time, remarks FROM hostel_attendance
       WHERE student_id = ? AND branch_id = ?${academicYearId ? ' AND academic_year_id = ?' : ''}
       ORDER BY movement_time DESC LIMIT 20`,
      feeParams
    );
    const hostelId = allocations[0]?.allocation_id
      ? await query(
        `SELECT h.id FROM hostel_allocations a
         JOIN hostel_beds bed ON bed.id = a.bed_id
         JOIN hostel_rooms r ON r.id = bed.room_id
         JOIN hostel_floors f ON f.id = r.floor_id
         JOIN hostel_blocks b ON b.id = f.block_id
         JOIN hostel_hostels h ON h.id = b.hostel_id
         WHERE a.id = ? LIMIT 1`,
        [allocations[0].allocation_id]
      )
      : [];
    const mess = hostelId.length
      ? await query(
        `SELECT menu_date, meal_type, menu, notes FROM hostel_mess_menu
         WHERE hostel_id = ? AND branch_id = ? AND menu_date >= CURRENT_DATE()
           ${academicYearId ? 'AND academic_year_id = ?' : ''}
         ORDER BY menu_date, FIELD(meal_type, 'breakfast','lunch','snacks','dinner') LIMIT 28`,
        academicYearId ? [hostelId[0].id, branchId, academicYearId] : [hostelId[0].id, branchId]
      )
      : [];
    res.json({
      success: true,
      allocation: allocations[0] || null,
      fees,
      gate_passes: passes,
      complaints,
      attendance,
      mess,
    });
  } catch (error) {
    next(error);
  }
};

export const createStudentGatePass = async (req, res, next) => {
  try {
    const student = await getStudentRecord(req);
    if (!student) return respondError(res, 404, 'Student profile not found');
    if (!sanitizeScopeId(student.branch_id)) return respondError(res, 409, 'Student account is not assigned to a branch');
    const { branchId, academicYearId } = await getStudentPortalScope(req, student);
    const { reason, departure_at: departureAt, expected_return_at: expectedReturnAt } = req.body;
    const departureDate = new Date(departureAt);
    const returnDate = new Date(expectedReturnAt);
    if (!String(reason || '').trim() || !departureAt || !expectedReturnAt
      || Number.isNaN(departureDate.getTime()) || Number.isNaN(returnDate.getTime()) || returnDate <= departureDate) {
      return respondError(res, 400, 'Reason and valid departure/return times are required');
    }
    const allocation = await query(
      `SELECT id FROM hostel_allocations WHERE student_id = ? AND branch_id = ?
       AND status = 'active'${academicYearId ? ' AND academic_year_id = ?' : ''} LIMIT 1`,
      academicYearId ? [student.id, branchId, academicYearId] : [student.id, branchId]
    );
    if (!allocation.length) return respondError(res, 409, 'An active hostel allocation is required to request a gate pass');
    const actualAcademicYearId = academicYearId || (await query(
      `SELECT academic_year_id FROM hostel_allocations WHERE id = ?`,
      [allocation[0].id]
    ))[0]?.academic_year_id;
    if (!actualAcademicYearId) return respondError(res, 400, 'Academic-year scope is required');
    const result = await query(
      `INSERT INTO hostel_gate_passes
       (branch_id, academic_year_id, student_id, reason, departure_at, expected_return_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [branchId, actualAcademicYearId, student.id, String(reason).trim(), departureAt, expectedReturnAt]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    next(error);
  }
};

export const getStudentComplaints = async (req, res, next) => {
  try {
    const student = await getStudentRecord(req);
    if (!student) return respondError(res, 404, 'Student profile not found');
    if (!sanitizeScopeId(student.branch_id)) return respondError(res, 409, 'Student account is not assigned to a branch');
    const rows = await query(
      `SELECT id, category, subject, description, status, resolution, created_at
       FROM hostel_complaints WHERE student_id = ? AND branch_id = ?
       ORDER BY id DESC LIMIT 100`,
      [student.id, student.branch_id]
    );
    res.json({ success: true, complaints: rows });
  } catch (error) {
    next(error);
  }
};

export const createStudentComplaint = async (req, res, next) => {
  try {
    const student = await getStudentRecord(req);
    if (!student) return respondError(res, 404, 'Student profile not found');
    if (!sanitizeScopeId(student.branch_id)) return respondError(res, 409, 'Student account is not assigned to a branch');
    const { category, subject, description } = req.body;
    if (!String(category || '').trim() || !String(subject || '').trim() || !String(description || '').trim()) {
      return respondError(res, 400, 'Category, subject, and description are required');
    }
    const { academicYearId } = await getStudentPortalScope(req, student);
    const allocations = await query(
      `SELECT academic_year_id FROM hostel_allocations WHERE student_id = ? AND branch_id = ?
       AND status = 'active'${academicYearId ? ' AND academic_year_id = ?' : ''}
       ORDER BY id DESC LIMIT 1`,
      academicYearId ? [student.id, student.branch_id, academicYearId] : [student.id, student.branch_id]
    );
    const actualAcademicYearId = allocations[0]?.academic_year_id;
    if (!actualAcademicYearId) return respondError(res, 409, 'A hostel academic-year record is required');
    const result = await query(
      `INSERT INTO hostel_complaints
       (branch_id, academic_year_id, student_id, category, subject, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [student.branch_id, actualAcademicYearId, student.id, String(category).trim(), String(subject).trim(), String(description).trim()]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    next(error);
  }
};
