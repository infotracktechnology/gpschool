const select = (name, label, source, valueKey = 'id', labelKey = 'name', required = true) => ({
  name, label, type: 'select', source, valueKey, labelKey, required,
});
const text = (name, label, required = false) => ({ name, label, type: 'text', required });
const number = (name, label, required = false) => ({ name, label, type: 'number', required });
const date = (name, label, required = false) => ({ name, label, type: 'date', required });
const datetime = (name, label, required = false) => ({ name, label, type: 'datetime-local', required });
const choice = (name, label, options, required = true) => ({
  name, label, type: 'select', options, required,
});

export const HOSTEL_SECTIONS = {
  setup: {
    title: 'Hostel setup',
    resource: 'hostels',
    fields: [
      text('name', 'Hostel name', true), text('code', 'Code'),
      choice('hostel_type', 'Hostel type', ['boys', 'girls', 'co-ed']),
      text('address', 'Address'), choice('status', 'Status', ['active', 'inactive']),
    ],
  },
  wardens: {
    title: 'Wardens',
    resource: 'wardens',
    fields: [
      select('hostel_id', 'Hostel', 'hostels'), text('name', 'Warden name', true),
      number('staff_id', 'Staff ID'), text('phone', 'Phone'), text('email', 'Email'),
      choice('status', 'Status', ['active', 'inactive']),
    ],
  },
  blocks: {
    title: 'Blocks',
    resource: 'blocks',
    fields: [select('hostel_id', 'Hostel', 'hostels'), text('name', 'Block name', true), choice('status', 'Status', ['active', 'inactive'])],
  },
  floors: {
    title: 'Floors',
    resource: 'floors',
    fields: [select('block_id', 'Block', 'blocks'), text('name', 'Floor name', true), number('floor_number', 'Floor number', true), choice('status', 'Status', ['active', 'inactive'])],
  },
  rooms: {
    title: 'Rooms',
    resource: 'rooms',
    fields: [select('floor_id', 'Floor', 'floors'), text('room_number', 'Room number', true), text('room_type', 'Room type'), number('capacity', 'Capacity', true), choice('status', 'Status', ['active', 'inactive', 'maintenance']), text('notes', 'Notes')],
  },
  beds: {
    title: 'Rooms & beds',
    resource: 'beds',
    fields: [select('room_id', 'Room', 'rooms'), text('bed_number', 'Bed number', true), choice('status', 'Status', ['available'])],
  },
  allocations: {
    title: 'Student room allocation',
    resource: 'allocations',
    fields: [select('student_id', 'Student', 'students', 'id', 'full_name'), select('bed_id', 'Available bed', 'beds', 'id', 'bed_number'), date('start_date', 'Start date', true), date('end_date', 'End date'), text('notes', 'Notes')],
    tableFields: [
      { name: 'student_id', label: 'Student ID' }, { name: 'bed_id', label: 'Bed ID' },
      { name: 'start_date', label: 'Start date' }, { name: 'end_date', label: 'End date' },
      { name: 'status', label: 'Status' },
    ],
  },
  attendance: {
    title: 'In-time / out-time',
    resource: 'attendance',
    fields: [select('student_id', 'Student', 'students', 'id', 'full_name'), choice('movement', 'Movement', ['in', 'out']), text('remarks', 'Remarks')],
    tableFields: [
      { name: 'student_id', label: 'Student ID' }, { name: 'attendance_date', label: 'Date' },
      { name: 'movement', label: 'Movement' }, { name: 'movement_time', label: 'Time' },
      { name: 'remarks', label: 'Remarks' },
    ],
  },
  'gate-passes': {
    title: 'Gate passes',
    resource: 'gate-passes',
    fields: [select('student_id', 'Student', 'students', 'id', 'full_name'), text('reason', 'Reason', true), datetime('departure_at', 'Departure', true), datetime('expected_return_at', 'Expected return', true)],
    tableFields: [
      { name: 'student_id', label: 'Student ID' }, { name: 'reason', label: 'Reason' },
      { name: 'departure_at', label: 'Departure' }, { name: 'expected_return_at', label: 'Expected return' },
      { name: 'actual_departure_at', label: 'Actual departure' }, { name: 'actual_return_at', label: 'Actual return' },
      { name: 'status', label: 'Status' },
    ],
  },
  fees: {
    title: 'Hostel fees',
    resource: 'fees',
    fields: [select('student_id', 'Student', 'students', 'id', 'full_name'), select('allocation_id', 'Allocation', 'allocations', 'id', 'id', false), text('fee_name', 'Fee name', true), number('amount', 'Amount', true), date('due_date', 'Due date'), choice('frequency', 'Frequency', ['monthly', 'term', 'annual', 'one_time', 'custom']), choice('status', 'Status', ['active', 'inactive']), text('notes', 'Notes')],
  },
  collections: {
    title: 'Fee collections',
    resource: 'fee-collections',
    fields: [select('fee_id', 'Fee', 'fees', 'id', 'fee_name'), number('amount', 'Amount', true), date('payment_date', 'Payment date'), choice('payment_method', 'Payment method', ['cash', 'card', 'upi', 'bank_transfer', 'cheque'], false), text('receipt_number', 'Receipt number'), text('reference_number', 'Reference number'), text('notes', 'Notes')],
    tableFields: [
      { name: 'student_id', label: 'Student ID' }, { name: 'fee_id', label: 'Fee ID' },
      { name: 'amount', label: 'Amount' }, { name: 'payment_date', label: 'Payment date' },
      { name: 'payment_method', label: 'Method' }, { name: 'receipt_number', label: 'Receipt' },
    ],
  },
  mess: {
    title: 'Mess menu',
    resource: 'mess',
    fields: [select('hostel_id', 'Hostel', 'hostels'), date('menu_date', 'Menu date', true), choice('meal_type', 'Meal', ['breakfast', 'lunch', 'snacks', 'dinner']), text('menu', 'Menu', true), text('notes', 'Notes')],
  },
  complaints: {
    title: 'Complaints',
    resource: 'complaints',
    fields: [select('student_id', 'Student', 'students', 'id', 'full_name'), text('category', 'Category', true), text('subject', 'Subject', true), text('description', 'Description', true), choice('status', 'Status', ['open', 'in_progress', 'resolved', 'closed']), number('assigned_to', 'Assigned staff ID'), text('resolution', 'Resolution')],
  },
  maintenance: {
    title: 'Maintenance',
    resource: 'maintenance',
    fields: [select('room_id', 'Room', 'rooms', 'id', 'room_number', false), select('bed_id', 'Bed', 'beds', 'id', 'bed_number', false), text('issue_type', 'Issue type', true), text('description', 'Description', true), choice('priority', 'Priority', ['low', 'normal', 'high', 'urgent']), choice('status', 'Status', ['open', 'in_progress', 'completed', 'cancelled']), number('assigned_to', 'Assigned staff ID'), number('cost', 'Cost'), date('scheduled_date', 'Scheduled date')],
  },
};

export const HOSTEL_REPORTS = [
  { type: 'occupancy', title: 'Bed occupancy' },
  { type: 'attendance', title: 'In/out activity' },
  { type: 'fees', title: 'Fee balances' },
  { type: 'complaints', title: 'Complaints' },
  { type: 'maintenance', title: 'Maintenance' },
];
