import { query } from '../config/database.js';

async function checkAttendanceTable() {
  const cols = await query("DESCRIBE student_attendance");
  console.log('student_attendance cols:', cols.map(c => c.Field));
  process.exit(0);
}

checkAttendanceTable().catch(console.error);
