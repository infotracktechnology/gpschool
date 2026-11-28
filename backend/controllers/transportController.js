import { pool, query } from '../config/database.js';
import { buildScopeFilter, resolveWriteScope, sanitizeScopeId } from '../middleware/authMiddleware.js';
import { sendToStudent } from '../utils/fcmStudent.js';

const RESOURCES = {
  settings: { table: 'transport_settings', key: 'settings', fields: ['setting_key', 'setting_value', 'description'], required: ['setting_key'] },
  'vehicle-types': { table: 'transport_vehicle_types', key: 'vehicle_types', fields: ['name', 'capacity', 'description', 'status'], required: ['name'] },
  vehicles: { table: 'transport_vehicles', key: 'vehicles', fields: ['vehicle_type_id', 'registration_number', 'make', 'model', 'capacity', 'fuel_type', 'insurance_expiry', 'permit_expiry', 'fitness_expiry', 'status', 'notes'], required: ['registration_number'] },
  drivers: { table: 'transport_drivers', key: 'drivers', fields: ['name', 'phone', 'license_number', 'license_expiry', 'address', 'emergency_contact', 'status'], required: ['name'] },
  attendants: { table: 'transport_attendants', key: 'attendants', fields: ['name', 'phone', 'address', 'emergency_contact', 'status'], required: ['name'] },
  routes: { table: 'transport_routes', key: 'routes', fields: ['name', 'route_code', 'description', 'vehicle_id', 'driver_id', 'attendant_id', 'start_time', 'end_time', 'status'], required: ['name'] },
  stops: { table: 'transport_route_stops', key: 'stops', fields: ['route_id', 'name', 'address', 'sequence_no', 'pickup_time', 'drop_time', 'latitude', 'longitude'], required: ['route_id', 'name'] },
  allocations: { table: 'transport_allocations', key: 'allocations', fields: ['student_id', 'route_id', 'stop_id', 'allocation_mode', 'start_date', 'end_date', 'status', 'notes'], required: ['student_id', 'route_id'] },
  fees: { table: 'transport_fees', key: 'fees', fields: ['allocation_id', 'student_id', 'fee_name', 'amount', 'due_date', 'frequency', 'status', 'notes'], required: ['allocation_id', 'student_id', 'fee_name', 'amount'] },
  trips: { table: 'transport_trips', key: 'trips', fields: ['route_id', 'vehicle_id', 'driver_id', 'attendant_id', 'trip_date', 'trip_type', 'start_time', 'end_time', 'status', 'delay_minutes', 'notes'], required: ['route_id', 'trip_date', 'trip_type'] },
  'trip-stops': { table: 'transport_trip_stops', key: 'trip_stops', fields: ['trip_id', 'stop_id', 'reached_at', 'status', 'notes'], required: ['trip_id', 'stop_id'] },
  documents: { table: 'transport_documents', key: 'documents', fields: ['vehicle_id', 'driver_id', 'document_type', 'document_number', 'issue_date', 'expiry_date', 'file_url', 'notes'], required: ['document_type'] },
  maintenance: { table: 'transport_maintenance', key: 'maintenance', fields: ['vehicle_id', 'maintenance_type', 'description', 'service_date', 'next_service_date', 'cost', 'vendor', 'status'], required: ['vehicle_id', 'maintenance_type', 'service_date'] },
};

const WRITE_ROLES = ['super_admin', 'admin', 'principal'];
const STUDENT_ROLES = ['student'];
const pickFields = (source, fields) => Object.fromEntries(fields
  .filter((field) => source[field] !== undefined)
  .map((field) => [field, source[field] === '' ? null : source[field]]));
const numericId = (value) => sanitizeScopeId(value);
const respondError = (res, status, message) => res.status(status).json({ success: false, message });
const REFERENCES = {
  vehicles: { vehicle_type_id: 'transport_vehicle_types' },
  routes: { vehicle_id: 'transport_vehicles', driver_id: 'transport_drivers', attendant_id: 'transport_attendants' },
  stops: { route_id: 'transport_routes' },
  allocations: { route_id: 'transport_routes', stop_id: 'transport_route_stops' },
  fees: { allocation_id: 'transport_allocations' },
  trips: { route_id: 'transport_routes', vehicle_id: 'transport_vehicles', driver_id: 'transport_drivers', attendant_id: 'transport_attendants' },
  'trip-stops': { trip_id: 'transport_trips', stop_id: 'transport_route_stops' },
  documents: { vehicle_id: 'transport_vehicles', driver_id: 'transport_drivers' },
  maintenance: { vehicle_id: 'transport_vehicles' },
};

export const getTransportSettings = async (req, res, next) => {
  try {
    const scope = buildScopeFilter(req, 's');
    const rows = await query(
      `SELECT setting_key, setting_value FROM transport_settings s${scope.whereSql}`,
      scope.params
    );
    const settings = {};
    rows.forEach((row) => {
      let value = row.setting_value;
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch {}
      }
      settings[row.setting_key] = value;
    });
    res.json({ success: true, settings: [settings] });
  } catch (error) { next(error); }
};

export const saveTransportSettings = async (req, res, next) => {
  try {
    const { branchId, academicYearId } = await resolveWriteScope(req, { requireBranch: true });
    if (!branchId || !academicYearId) return respondError(res, 400, 'Branch and academic-year scope are required');
    const allowed = ['default_pickup_time', 'default_drop_time', 'grace_period_minutes', 'contact_phone', 'policy_notes'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const value = req.body[key] === '' ? null : req.body[key];
        await query(
          `INSERT INTO transport_settings (branch_id, academic_year_id, setting_key, setting_value)
           VALUES (?, ?, ?, CAST(? AS JSON))
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
          [branchId, academicYearId, key, JSON.stringify(value)]
        );
      }
    }
    res.json({ success: true });
  } catch (error) { next(error); }
};

const validateReferences = async (resourceName, values, branchId, academicYearId) => {
  for (const [field, table] of Object.entries(REFERENCES[resourceName] || {})) {
    if (values[field] === undefined || values[field] === null) continue;
    const rows = await query(
      `SELECT branch_id, academic_year_id FROM ${table} WHERE id = ? LIMIT 1`,
      [values[field]]
    );
    if (!rows.length || Number(rows[0].branch_id) !== Number(branchId) || Number(rows[0].academic_year_id) !== Number(academicYearId)) {
      return `${field} is outside the current branch and academic-year scope`;
    }
  }
  return null;
};

const scopeRecord = async (req, table, id, alias = 't') => {
  const scope = buildScopeFilter(req, alias);
  const rows = await query(
    `SELECT ${alias}.* FROM ${table} ${alias} WHERE ${alias}.id = ?${scope.sql} LIMIT 1`,
    [id, ...scope.params]
  );
  return rows[0] || null;
};

const writeAudit = async (req, entity, entityId, action, previous, current, branchId, academicYearId) => {
  await query(
    `INSERT INTO transport_audit_trail
     (branch_id, academic_year_id, entity_type, entity_id, action, old_values, new_values, changed_by, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [branchId, academicYearId, entity, entityId, action,
      previous ? JSON.stringify(previous) : null, current ? JSON.stringify(current) : null,
      req.user?.id || null, req.ip || null]
  );
};

export const listRecords = (resourceName) => async (req, res, next) => {
  try {
    const resource = RESOURCES[resourceName];
    if (!resource) return respondError(res, 404, 'Transport resource not found');
    const scope = buildScopeFilter(req, 't');
    const filters = [];
    const params = [...scope.params];
    for (const field of resource.fields) {
      if (req.query[field] !== undefined && ['status', 'student_id', 'route_id', 'vehicle_id', 'driver_id', 'allocation_id', 'fee_id', 'document_type'].includes(field)) {
        filters.push(`t.${field} = ?`);
        params.push(req.query[field]);
      }
    }
    const search = String(req.query.search || '').trim();
    const searchable = ['name', 'registration_number', 'route_code', 'phone', 'license_number', 'fee_name', 'document_type', 'maintenance_type'];
    const searchField = searchable.find((field) => resource.fields.includes(field));
    if (search && searchField) {
      filters.push(`t.${searchField} LIKE ?`);
      params.push(`%${search}%`);
    }
    if (resourceName === 'stops' && numericId(req.query.route_id)) {
      filters.push('t.route_id = ?');
      params.push(numericId(req.query.route_id));
    }
    const where = [scope.sql.replace(/^\s*AND\s*/, ''), ...filters].filter(Boolean).join(' AND ');
    let selectSql = `SELECT t.* FROM ${resource.table} t`;
    if (resourceName === 'vehicles') {
      selectSql = `SELECT t.*, vt.name AS vehicle_type_name, CONCAT_WS(' ', t.make, t.model) AS make_model
                   FROM transport_vehicles t LEFT JOIN transport_vehicle_types vt ON vt.id = t.vehicle_type_id`;
    } else if (resourceName === 'routes') {
      selectSql = `SELECT t.*, GROUP_CONCAT(ts.name ORDER BY ts.sequence_no SEPARATOR ', ') AS stops_summary
                   FROM transport_routes t LEFT JOIN transport_route_stops ts ON ts.route_id = t.id`;
    } else if (resourceName === 'allocations') {
      selectSql = `SELECT t.*, s.first_name, s.last_name, s.admission_number,
                          r.name AS route_name, st.name AS stop_name
                   FROM transport_allocations t
                   LEFT JOIN students s ON s.id = t.student_id
                   LEFT JOIN transport_routes r ON r.id = t.route_id
                   LEFT JOIN transport_route_stops st ON st.id = t.stop_id`;
    } else if (resourceName === 'trips') {
      selectSql = `SELECT t.*, r.name AS route_name, v.registration_number AS vehicle_registration,
                          d.name AS driver_name
                   FROM transport_trips t
                   LEFT JOIN transport_routes r ON r.id = t.route_id
                   LEFT JOIN transport_vehicles v ON v.id = t.vehicle_id
                   LEFT JOIN transport_drivers d ON d.id = t.driver_id`;
    }
    const groupBy = resourceName === 'routes' ? ' GROUP BY t.id' : '';
    const rows = await query(
      `${selectSql}${where ? ` WHERE ${where.replace(/t\./g, 't.')}` : ''}${groupBy} ORDER BY t.id DESC LIMIT 1000`,
      params
    );
    res.json({ success: true, [resource.key]: rows });
  } catch (error) { next(error); }
};

export const getRecord = (resourceName) => async (req, res, next) => {
  try {
    const resource = RESOURCES[resourceName];
    const row = resource && await scopeRecord(req, resource.table, req.params.id);
    if (!row) return respondError(res, 404, 'Transport record not found');
    res.json({ success: true, [resource.key.replace(/s$/, '')]: row });
  } catch (error) { next(error); }
};

export const createRecord = (resourceName) => async (req, res, next) => {
  let connection = null;
  let transactionOpen = false;
  try {
    const resource = RESOURCES[resourceName];
    if (!resource) return respondError(res, 404, 'Transport resource not found');
    const values = pickFields(req.body, resource.fields);
    for (const field of resource.required) {
      if (values[field] === undefined || values[field] === null || values[field] === '') return respondError(res, 400, `${field} is required`);
    }
    if (resourceName === 'settings' && values.setting_value !== undefined && values.setting_value !== null) {
      values.setting_value = JSON.stringify(values.setting_value);
    }
    const { branchId, academicYearId } = await resolveWriteScope(req, { requireBranch: true });
    if (!branchId) return respondError(res, 400, 'Branch scope is required');
    if (!academicYearId) return respondError(res, 400, 'Academic year scope is required');
    const referenceError = await validateReferences(resourceName, values, branchId, academicYearId);
    if (referenceError) return respondError(res, 400, referenceError);

    if (resourceName === 'stops') {
      const parent = await scopeRecord(req, 'transport_routes', values.route_id, 'r');
      if (!parent || Number(parent.branch_id) !== Number(branchId) || Number(parent.academic_year_id) !== Number(academicYearId)) return respondError(res, 400, 'Route is outside the current branch and academic-year scope');
    }
    if (resourceName === 'allocations') {
      if (!['pickup', 'drop', 'both'].includes(values.allocation_mode || 'both')) return respondError(res, 400, 'Invalid allocation mode');
      const route = await scopeRecord(req, 'transport_routes', values.route_id, 'r');
      connection = await pool.getConnection();
      await connection.beginTransaction();
      transactionOpen = true;
      const [studentRows] = await connection.query('SELECT id FROM students WHERE id = ? AND branch_id = ? FOR UPDATE', [values.student_id, branchId]);
      if (!route || Number(route.branch_id) !== Number(branchId) || Number(route.academic_year_id) !== Number(academicYearId) || !studentRows.length) return respondError(res, 400, 'Student or route is outside the current branch scope');
      if (values.stop_id) {
        const stop = await scopeRecord(req, 'transport_route_stops', values.stop_id, 's');
        if (!stop || Number(stop.branch_id) !== Number(branchId) || Number(stop.academic_year_id) !== Number(academicYearId) || Number(stop.route_id) !== Number(values.route_id)) return respondError(res, 400, 'Selected stop does not belong to the route');
      }
      const [duplicates] = await connection.query(
        `SELECT id, allocation_mode FROM transport_allocations
         WHERE student_id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'active' FOR UPDATE`,
        [values.student_id, branchId, academicYearId]
      );
      const mode = values.allocation_mode || 'both';
      if (duplicates.some((row) => row.allocation_mode === 'both' || mode === 'both' || row.allocation_mode === mode)) {
        return respondError(res, 409, 'Student already has an active allocation for this transport mode');
      }
    }
    if (resourceName === 'fees') {
      const allocation = await scopeRecord(req, 'transport_allocations', values.allocation_id, 'a');
      if (!allocation || Number(allocation.branch_id) !== Number(branchId) || Number(allocation.academic_year_id) !== Number(academicYearId) || Number(allocation.student_id) !== Number(values.student_id)) return respondError(res, 400, 'Fee must reference the student’s scoped allocation');
      if (!Number.isFinite(Number(values.amount)) || Number(values.amount) <= 0) return respondError(res, 400, 'Fee amount must be greater than zero');
    }
    if (resourceName === 'trips') {
      const route = await scopeRecord(req, 'transport_routes', values.route_id, 'r');
      if (!route || Number(route.branch_id) !== Number(branchId) || Number(route.academic_year_id) !== Number(academicYearId)) return respondError(res, 400, 'Route is outside the current branch and academic-year scope');
      if (!['pickup', 'drop'].includes(values.trip_type)) return respondError(res, 400, 'Trip type must be pickup or drop');
    }
    if (resourceName === 'trip-stops') {
      const trip = await scopeRecord(req, 'transport_trips', values.trip_id, 't');
      const stop = await scopeRecord(req, 'transport_route_stops', values.stop_id, 's');
      if (!trip || !stop || Number(trip.branch_id) !== Number(branchId) || Number(trip.academic_year_id) !== Number(academicYearId) || Number(stop.branch_id) !== Number(branchId) || Number(stop.academic_year_id) !== Number(academicYearId)) return respondError(res, 400, 'Trip or stop is outside the current scope');
      const tripRoute = await query('SELECT route_id FROM transport_trips WHERE id = ?', [trip.id]);
      if (Number(tripRoute[0]?.route_id) !== Number(stop.route_id)) return respondError(res, 400, 'Stop does not belong to the trip route');
    }
    const withScope = { ...values, branch_id: branchId, academic_year_id: academicYearId };
    if (resourceName === 'allocations') withScope.created_by = req.user?.id || null;
    if (resourceName === 'trips') withScope.created_by = req.user?.id || null;
    if (resourceName === 'maintenance') withScope.created_by = req.user?.id || null;
    const columns = Object.keys(withScope);
    const insertSql = `INSERT INTO ${resource.table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
    let result;
    if (connection) {
      [result] = await connection.query(insertSql, columns.map((column) => withScope[column]));
      await connection.commit();
      transactionOpen = false;
    } else {
      result = await query(insertSql, columns.map((column) => withScope[column]));
    }
    if (resourceName === 'routes' && Array.isArray(req.body.stops)) {
      for (let index = 0; index < req.body.stops.length; index += 1) {
        const stop = req.body.stops[index];
        if (!stop?.name) continue;
        await query(
          `INSERT INTO transport_route_stops
           (branch_id, academic_year_id, route_id, name, sequence_no, pickup_time, drop_time)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [branchId, academicYearId, result.insertId, stop.name, stop.sequence || index + 1, stop.pickup_time || null, stop.drop_time || null]
        );
      }
    }
    await writeAudit(req, resourceName, result.insertId, 'create', null, withScope, branchId, academicYearId);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    if (connection && transactionOpen) { try { await connection.rollback(); } catch {} transactionOpen = false; }
    next(error);
  } finally {
    if (connection && transactionOpen) { try { await connection.rollback(); } catch {} }
    if (connection) connection.release();
  }
};

export const updateRecord = (resourceName) => async (req, res, next) => {
  try {
    const resource = RESOURCES[resourceName];
    const current = resource && await scopeRecord(req, resource.table, req.params.id);
    if (!current) return respondError(res, 404, 'Transport record not found');
    if (resourceName === 'fees') return respondError(res, 400, 'Fees with collections cannot be edited; create an adjustment fee instead');
    if (resourceName === 'trips' && req.body.status !== undefined) {
      const transitions = {
        scheduled: ['in_progress', 'delayed', 'cancelled'],
        delayed: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'delayed', 'cancelled'],
        completed: [],
        cancelled: [],
      };
      if (!transitions[current.status]?.includes(req.body.status)) return respondError(res, 400, `Trip cannot transition from ${current.status} to ${req.body.status}`);
    }
    const values = pickFields(req.body, resource.fields);
    if (!Object.keys(values).length) return respondError(res, 400, 'No editable fields supplied');
    if (resourceName === 'allocations' && values.allocation_mode && !['pickup', 'drop', 'both'].includes(values.allocation_mode)) return respondError(res, 400, 'Invalid allocation mode');
    const referenceError = await validateReferences(resourceName, values, current.branch_id, current.academic_year_id);
    if (referenceError) return respondError(res, 400, referenceError);
    if (resourceName === 'allocations') {
      const studentId = values.student_id || current.student_id;
      const students = await query('SELECT id FROM students WHERE id = ? AND branch_id = ? LIMIT 1', [studentId, current.branch_id]);
      if (!students.length) return respondError(res, 400, 'Student is outside the current branch scope');
      if ((values.status || current.status) === 'active') {
        const active = await query(
          `SELECT id, allocation_mode FROM transport_allocations
           WHERE student_id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'active' AND id <> ?`,
          [studentId, current.branch_id, current.academic_year_id, current.id]
        );
        const mode = values.allocation_mode || current.allocation_mode;
        if (active.some((row) => row.allocation_mode === 'both' || mode === 'both' || row.allocation_mode === mode)) {
          return respondError(res, 409, 'Student already has an active allocation for this transport mode');
        }
      }
      const routeId = values.route_id || current.route_id;
      const stopId = values.stop_id === undefined ? current.stop_id : values.stop_id;
      if (stopId) {
        const stop = await query('SELECT route_id FROM transport_route_stops WHERE id = ? AND branch_id = ? AND academic_year_id = ? LIMIT 1', [stopId, current.branch_id, current.academic_year_id]);
        if (!stop.length || Number(stop[0].route_id) !== Number(routeId)) return respondError(res, 400, 'Selected stop does not belong to the route');
      }
    }
    if (resourceName === 'trip-stops') {
      const tripId = values.trip_id || current.trip_id;
      const stopId = values.stop_id || current.stop_id;
      const [trip] = await query('SELECT route_id FROM transport_trips WHERE id = ? AND branch_id = ? AND academic_year_id = ? LIMIT 1', [tripId, current.branch_id, current.academic_year_id]);
      const [stop] = await query('SELECT route_id FROM transport_route_stops WHERE id = ? AND branch_id = ? AND academic_year_id = ? LIMIT 1', [stopId, current.branch_id, current.academic_year_id]);
      if (!trip || !stop || Number(trip.route_id) !== Number(stop.route_id)) return respondError(res, 400, 'Stop does not belong to the trip route');
    }
    if (resourceName === 'settings' && values.setting_value !== undefined && values.setting_value !== null) values.setting_value = JSON.stringify(values.setting_value);
    if (resourceName === 'stops' && values.route_id) {
      const route = await scopeRecord(req, 'transport_routes', values.route_id, 'r');
      if (!route || Number(route.branch_id) !== Number(current.branch_id) || Number(route.academic_year_id) !== Number(current.academic_year_id)) return respondError(res, 400, 'Route is outside the current branch and academic-year scope');
    }
    const columns = Object.keys(values);
    await query(
      `UPDATE ${resource.table} SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ? AND branch_id = ? AND academic_year_id = ?`,
      [...columns.map((column) => values[column]), current.id, current.branch_id, current.academic_year_id]
    );
    if (resourceName === 'routes' && Array.isArray(req.body.stops)) {
      await query(
        'DELETE FROM transport_route_stops WHERE route_id = ? AND branch_id = ? AND academic_year_id = ?',
        [current.id, current.branch_id, current.academic_year_id]
      );
      for (let index = 0; index < req.body.stops.length; index += 1) {
        const stop = req.body.stops[index];
        if (!stop?.name) continue;
        await query(
          `INSERT INTO transport_route_stops
           (branch_id, academic_year_id, route_id, name, sequence_no, pickup_time, drop_time)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [current.branch_id, current.academic_year_id, current.id, stop.name, stop.sequence || index + 1, stop.pickup_time || null, stop.drop_time || null]
        );
      }
    }
    await writeAudit(req, resourceName, current.id, 'update', current, values, current.branch_id, current.academic_year_id);
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const deleteRecord = (resourceName) => async (req, res, next) => {
  try {
    if (['settings', 'allocations', 'fees', 'trips', 'stops', 'documents', 'maintenance'].includes(resourceName)) {
      return respondError(res, 400, 'This transport record cannot be deleted; update its status to retain the audit history');
    }
    const resource = RESOURCES[resourceName];
    const current = resource && await scopeRecord(req, resource.table, req.params.id);
    if (!current) return respondError(res, 404, 'Transport record not found');
    const dependents = {
      'vehicle-types': [['transport_vehicles', 'vehicle_type_id']],
      vehicles: [['transport_routes', 'vehicle_id'], ['transport_trips', 'vehicle_id'], ['transport_documents', 'vehicle_id'], ['transport_maintenance', 'vehicle_id']],
      drivers: [['transport_routes', 'driver_id'], ['transport_trips', 'driver_id'], ['transport_documents', 'driver_id']],
      attendants: [['transport_routes', 'attendant_id'], ['transport_trips', 'attendant_id']],
      routes: [['transport_route_stops', 'route_id'], ['transport_allocations', 'route_id'], ['transport_trips', 'route_id']],
    };
    for (const [table, column] of dependents[resourceName] || []) {
      const count = await query(
        `SELECT COUNT(*) AS total FROM ${table} WHERE ${column} = ? AND branch_id = ? AND academic_year_id = ?`,
        [current.id, current.branch_id, current.academic_year_id]
      );
      if (Number(count[0].total) > 0) return respondError(res, 400, 'Transport record is referenced by other records and cannot be deleted');
    }
    await query(`DELETE FROM ${resource.table} WHERE id = ? AND branch_id = ? AND academic_year_id = ?`, [current.id, current.branch_id, current.academic_year_id]);
    await writeAudit(req, resourceName, current.id, 'delete', current, null, current.branch_id, current.academic_year_id);
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const collectFee = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { fee_id, amount, payment_date, payment_method, receipt_number, reference_number, notes } = req.body;
    if (!numericId(fee_id) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return respondError(res, 400, 'A valid fee and positive payment amount are required');
    const { branchId, academicYearId } = await resolveWriteScope(req, { requireBranch: true });
    await connection.beginTransaction();
    const [fees] = await connection.query(
      `SELECT * FROM transport_fees WHERE id = ? AND branch_id = ? AND academic_year_id = ? AND status = 'active' FOR UPDATE`,
      [fee_id, branchId, academicYearId]
    );
    if (!fees.length) {
      await connection.rollback();
      return respondError(res, 404, 'Fee not found in the current scope');
    }
    const fee = fees[0];
    const [totals] = await connection.query(
      'SELECT COALESCE(SUM(amount), 0) AS paid FROM transport_fee_collections WHERE fee_id = ? AND branch_id = ? AND academic_year_id = ?',
      [fee.id, branchId, academicYearId]
    );
    const due = Number(fee.amount) - Number(totals[0].paid);
    if (Number(amount) > due + 0.00001) {
      await connection.rollback();
      return respondError(res, 400, `Payment exceeds outstanding balance of ${Math.max(0, due).toFixed(2)}`);
    }
    const [result] = await connection.query(
      `INSERT INTO transport_fee_collections
       (branch_id, academic_year_id, fee_id, student_id, amount, payment_date, payment_method, receipt_number, reference_number, notes, collected_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [branchId, academicYearId, fee.id, fee.student_id, Number(amount), payment_date || new Date().toISOString().slice(0, 10),
        payment_method || null, receipt_number || null, reference_number || null, notes || null, req.user?.id || null]
    );
    await connection.commit();
    await writeAudit(req, 'collection', result.insertId, 'create', null, { fee_id: fee.id, amount: Number(amount) }, branchId, academicYearId);
    res.status(201).json({ success: true, id: result.insertId, outstanding: Math.max(0, due - Number(amount)) });
  } catch (error) {
    try { await connection.rollback(); } catch {}
    next(error);
  } finally { connection.release(); }
};

export const listCollections = async (req, res, next) => {
  try {
    const scope = buildScopeFilter(req, 'c');
    const rows = await query(
      `SELECT c.*, f.fee_name, s.first_name, s.last_name, s.admission_number
       FROM transport_fee_collections c
       LEFT JOIN transport_fees f ON f.id = c.fee_id
       LEFT JOIN students s ON s.id = c.student_id
       WHERE 1=1 ${scope.sql} ORDER BY c.payment_date DESC, c.id DESC LIMIT 1000`,
      scope.params
    );
    res.json({ success: true, collections: rows });
  } catch (error) { next(error); }
};

export const dashboard = async (req, res, next) => {
  try {
    const a = buildScopeFilter(req, 'a');
    const v = buildScopeFilter(req, 'v');
    const t = buildScopeFilter(req, 't');
    const f = buildScopeFilter(req, 'f');
    const [allocations, vehicles, trips, fees, expiries] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM transport_allocations a WHERE a.status = 'active'${a.sql}`, a.params),
      query(`SELECT COUNT(*) AS total FROM transport_vehicles v WHERE v.status = 'active'${v.sql}`, v.params),
      query(`SELECT status, COUNT(*) AS total FROM transport_trips t WHERE t.trip_date = CURDATE()${t.sql} GROUP BY status`, t.params),
      query(`SELECT COUNT(DISTINCT f.student_id) AS students, COALESCE(SUM(f.amount),0) AS billed FROM transport_fees f WHERE f.status = 'active'${f.sql}`, f.params),
      query(`SELECT COUNT(*) AS total FROM transport_documents d WHERE d.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)${buildScopeFilter(req, 'd').sql}`, buildScopeFilter(req, 'd').params),
    ]);
    res.json({ success: true, dashboard: { active_allocations: allocations[0].total, active_vehicles: vehicles[0].total, today_trips: trips, fee_summary: fees[0], expiring_documents: expiries[0].total } });
  } catch (error) { next(error); }
};

export const report = (reportType) => async (req, res, next) => {
  try {
    let rows;
    if (reportType === 'fees') {
      const scope = buildScopeFilter(req, 'f');
      rows = await query(
        `SELECT f.*, COALESCE(SUM(c.amount),0) AS paid, GREATEST(f.amount - COALESCE(SUM(c.amount),0),0) AS outstanding
         FROM transport_fees f LEFT JOIN transport_fee_collections c ON c.fee_id = f.id
         WHERE 1=1 ${scope.sql} GROUP BY f.id ORDER BY f.due_date, f.id`, scope.params
      );
    } else if (reportType === 'allocations') {
      const scope = buildScopeFilter(req, 'a');
      rows = await query(
        `SELECT a.*, s.first_name, s.last_name, r.name AS route_name, st.name AS stop_name
         FROM transport_allocations a LEFT JOIN students s ON s.id = a.student_id
         LEFT JOIN transport_routes r ON r.id = a.route_id LEFT JOIN transport_route_stops st ON st.id = a.stop_id
         WHERE 1=1 ${scope.sql} ORDER BY s.first_name, s.last_name`, scope.params
      );
    } else if (reportType === 'trips') {
      const scope = buildScopeFilter(req, 't');
      rows = await query(`SELECT t.*, r.name AS route_name, v.registration_number FROM transport_trips t LEFT JOIN transport_routes r ON r.id = t.route_id LEFT JOIN transport_vehicles v ON v.id = t.vehicle_id WHERE 1=1 ${scope.sql} ORDER BY t.trip_date DESC`, scope.params);
    } else {
      const scope = buildScopeFilter(req, 'd');
      rows = await query(`SELECT d.*, v.registration_number FROM transport_documents d LEFT JOIN transport_vehicles v ON v.id = d.vehicle_id WHERE d.expiry_date IS NOT NULL AND d.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)${scope.sql} ORDER BY d.expiry_date`, scope.params);
    }
    res.json({ success: true, report: reportType, rows });
  } catch (error) { next(error); }
};

export const studentTransport = async (req, res, next) => {
  try {
    const students = await query('SELECT id, branch_id FROM students WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (!students.length) return respondError(res, 404, 'Student profile not found');
    const student = students[0];
    const scope = buildScopeFilter(req, 'a');
    const allocations = await query(
      `SELECT a.*, r.name AS route_name, r.route_code, r.start_time, r.end_time,
              v.registration_number, v.make, v.model, d.name AS driver_name, d.phone AS driver_phone,
              at.name AS attendant_name, st.name AS stop_name, st.address AS stop_address, st.pickup_time, st.drop_time
       FROM transport_allocations a
       LEFT JOIN transport_routes r ON r.id = a.route_id
       LEFT JOIN transport_vehicles v ON v.id = r.vehicle_id
       LEFT JOIN transport_drivers d ON d.id = r.driver_id
       LEFT JOIN transport_attendants at ON at.id = r.attendant_id
       LEFT JOIN transport_route_stops st ON st.id = a.stop_id
       WHERE a.student_id = ? AND a.status = 'active'${scope.sql} ORDER BY a.id DESC`,
      [student.id, ...scope.params]
    );
    const fees = await query(
      `SELECT f.*, COALESCE(SUM(c.amount),0) AS paid, GREATEST(f.amount - COALESCE(SUM(c.amount),0),0) AS outstanding
       FROM transport_fees f LEFT JOIN transport_fee_collections c ON c.fee_id = f.id
       WHERE f.student_id = ? AND f.status = 'active' AND f.branch_id = ?
       GROUP BY f.id ORDER BY f.due_date, f.id`,
      [student.id, student.branch_id]
    );
    const trips = await query(
      `SELECT t.id, t.trip_date, t.trip_type, t.status, t.delay_minutes, r.name AS route_name
       FROM transport_trips t JOIN transport_routes r ON r.id = t.route_id
       JOIN transport_allocations a ON a.route_id = t.route_id
       WHERE a.student_id = ? AND a.status = 'active' AND t.branch_id = ?
         AND t.trip_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ORDER BY t.trip_date DESC LIMIT 20`,
      [student.id, student.branch_id]
    );
    const notifications = await query(
      `SELECT n.id, n.title, n.message, n.notification_type, n.sent_at, nr.delivery_status, nr.read_at
       FROM transport_notification_recipients nr JOIN transport_notifications n ON n.id = nr.notification_id
       WHERE nr.student_id = ? AND nr.branch_id = ? ORDER BY n.id DESC LIMIT 50`,
      [student.id, student.branch_id]
    );
    const allocation = allocations[0] || null;
    const feeSummary = fees.reduce((summary, fee) => {
      summary.total_due += Number(fee.amount || 0);
      summary.paid += Number(fee.paid || 0);
      summary.balance += Number(fee.outstanding || 0);
      return summary;
    }, { total_due: 0, paid: 0, balance: 0 });
    res.json({
      success: true,
      allocation,
      route: allocation ? { name: allocation.route_name, route_code: allocation.route_code } : null,
      vehicle: allocation ? { registration_number: allocation.registration_number, make: allocation.make, model: allocation.model } : null,
      driver: allocation ? { full_name: allocation.driver_name, phone: allocation.driver_phone } : null,
      attendant: allocation ? { full_name: allocation.attendant_name } : null,
      fees: fees.length ? { ...feeSummary, status: feeSummary.balance > 0 ? 'due' : 'paid' } : null,
      trips,
      notifications,
      transport: { allocation, fees, trips, notifications },
    });
  } catch (error) { next(error); }
};

export const createNotification = async (req, res, next) => {
  try {
    const { title, message, notification_type = 'general', audience = 'selected', student_ids = [] } = req.body;
    if (!String(title || '').trim() || !String(message || '').trim()) return respondError(res, 400, 'Title and message are required');
    if (!['all', 'students', 'selected'].includes(audience)) return respondError(res, 400, 'Invalid notification audience');
    const { branchId, academicYearId } = await resolveWriteScope(req, { requireBranch: true });
    if (!branchId || !academicYearId) return respondError(res, 400, 'Branch and academic-year scope are required');
    let targets;
    if (audience === 'all' || audience === 'students') {
      targets = await query(
        `SELECT DISTINCT a.student_id FROM transport_allocations a
         WHERE a.branch_id = ? AND a.academic_year_id = ? AND a.status = 'active'`,
        [branchId, academicYearId]
      );
    } else {
      if (!Array.isArray(student_ids) || !student_ids.length) return respondError(res, 400, 'Provide at least one student');
      targets = await query(
        `SELECT id AS student_id FROM students WHERE branch_id = ? AND id IN (${student_ids.map(() => '?').join(',')})`,
        [branchId, ...student_ids]
      );
      if (targets.length !== new Set(student_ids.map(Number)).size) return respondError(res, 400, 'One or more students are outside the current branch');
    }
    const result = await query(
      `INSERT INTO transport_notifications (branch_id, academic_year_id, title, message, notification_type, audience, sent_by, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [branchId, academicYearId, String(title).trim(), String(message).trim(), notification_type, audience, req.user.id]
    );
    for (const { student_id } of targets) {
      await query(
        `INSERT INTO transport_notification_recipients (branch_id, academic_year_id, notification_id, student_id)
         VALUES (?, ?, ?, ?)`,
        [branchId, academicYearId, result.insertId, student_id]
      );
      const delivery = await sendToStudent(student_id, {
        title: String(title).trim(), body: String(message).trim(),
        data: { type: 'transport', notification_id: result.insertId, notification_type },
      });
      await query(
        `UPDATE transport_notification_recipients SET delivery_status = ?, fcm_status = ?, error_message = ?
         WHERE notification_id = ? AND student_id = ?`,
        [delivery.success ? 'sent' : 'failed', delivery.success ? 'sent' : 'unavailable',
          delivery.error?.message || delivery.reason || null, result.insertId, student_id]
      );
    }
    await writeAudit(req, 'notification', result.insertId, 'create', null, { recipient_count: targets.length }, branchId, academicYearId);
    res.status(201).json({ success: true, id: result.insertId, recipient_count: targets.length });
  } catch (error) { next(error); }
};

export const listNotifications = async (req, res, next) => {
  try {
    const scope = buildScopeFilter(req, 'n');
    const rows = await query(
      `SELECT n.*, COUNT(nr.id) AS recipient_count,
       SUM(nr.delivery_status = 'sent') AS delivered_count, SUM(nr.delivery_status = 'failed') AS failed_count
       FROM transport_notifications n LEFT JOIN transport_notification_recipients nr ON nr.notification_id = n.id
       WHERE 1=1 ${scope.sql} GROUP BY n.id ORDER BY n.id DESC LIMIT 500`,
      scope.params
    );
    res.json({ success: true, notifications: rows });
  } catch (error) { next(error); }
};

export const listCollectionsForStudent = async (req, res, next) => {
  try {
    const students = await query('SELECT id, branch_id FROM students WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (!students.length) return respondError(res, 404, 'Student profile not found');
    const rows = await query(
      `SELECT c.*, f.fee_name FROM transport_fee_collections c
       JOIN transport_fees f ON f.id = c.fee_id WHERE c.student_id = ? AND c.branch_id = ?
       ORDER BY c.payment_date DESC, c.id DESC`,
      [students[0].id, students[0].branch_id]
    );
    res.json({ success: true, collections: rows });
  } catch (error) { next(error); }
};

export const getTransportAudit = async (req, res, next) => {
  try {
    const scope = buildScopeFilter(req, 'a');
    const rows = await query(`SELECT * FROM transport_audit_trail a WHERE 1=1 ${scope.sql} ORDER BY a.id DESC LIMIT 500`, scope.params);
    res.json({ success: true, audit: rows });
  } catch (error) { next(error); }
};

export const markStudentNotificationRead = async (req, res, next) => {
  try {
    const students = await query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (!students.length) return respondError(res, 404, 'Student profile not found');
    const result = await query(
      `UPDATE transport_notification_recipients SET delivery_status = 'read', read_at = NOW()
       WHERE notification_id = ? AND student_id = ?`,
      [req.params.id, students[0].id]
    );
    if (!result.affectedRows) return respondError(res, 404, 'Notification not found');
    res.json({ success: true });
  } catch (error) { next(error); }
};

export { WRITE_ROLES, STUDENT_ROLES };
