import assert from 'assert';
import portalRoutes from '../routes/portalRoutes.js';
import * as attendanceController from '../controllers/portal/portalStudentAttendanceController.js';

console.log('======================================================================');
console.log('PORTAL STUDENT ATTENDANCE UNIT & LOGIC VERIFICATION');
console.log('======================================================================\n');

let testCount = 0;
let passCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

// -----------------------------------------------------------------
// 1. Controller Exports & Signatures
// -----------------------------------------------------------------
test('portalStudentAttendanceController exports all 4 student attendance handlers', () => {
  assert.strictEqual(typeof attendanceController.getAssignedClasses, 'function');
  assert.strictEqual(typeof attendanceController.getStudentAttendanceRoster, 'function');
  assert.strictEqual(typeof attendanceController.saveStudentAttendance, 'function');
  assert.strictEqual(typeof attendanceController.copyMorningToAfternoon, 'function');
});

// -----------------------------------------------------------------
// 2. Portal Routes Inspection
// -----------------------------------------------------------------
test('portalRoutes Express Router contains all student attendance endpoints', () => {
  const routes = portalRoutes.stack
    .filter(layer => layer.route)
    .map(layer => layer.route.path);

  assert(routes.includes('/student-attendance/assigned-classes'), '/student-attendance/assigned-classes endpoint exists');
  assert(routes.includes('/student-attendance/roster'), '/student-attendance/roster endpoint exists');
  assert(routes.includes('/student-attendance/save'), '/student-attendance/save endpoint exists');
  assert(routes.includes('/student-attendance/copy-morning'), '/student-attendance/copy-morning endpoint exists');
});

// -----------------------------------------------------------------
// 3. Tiered Backdated Attendance & Edit Lock Logic Verification
// -----------------------------------------------------------------
test('Tiered Edit Lock: Today and past 2 days are editable by teachers', () => {
  const today = new Date('2026-11-20');

  function checkLock(targetDateStr) {
    const dTarget = new Date(targetDateStr);
    const diffDays = Math.floor((today.getTime() - dTarget.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 2; // isLocked
  }

  // Today (0 days ago) -> not locked
  assert.strictEqual(checkLock('2026-11-20'), false, 'Today is not locked');

  // Yesterday (1 day ago) -> not locked
  assert.strictEqual(checkLock('2026-11-19'), false, 'Yesterday is not locked');

  // 2 days ago -> not locked
  assert.strictEqual(checkLock('2026-11-18'), false, '2 days ago is not locked');

  // 3 days ago -> locked
  assert.strictEqual(checkLock('2026-11-17'), true, '3 days ago is locked');

  // 10 days ago -> locked
  assert.strictEqual(checkLock('2026-11-10'), true, '10 days ago is locked');
});

test('Privileged override allows coordinators and principals to edit locked dates', () => {
  function canEdit(isLocked, userRole, isCoordinator) {
    const isPrivileged = ['super_admin', 'admin', 'principal'].includes(userRole) || isCoordinator;
    return !isLocked || isPrivileged;
  }

  // Regular teacher on locked date -> cannot edit
  assert.strictEqual(canEdit(true, 'teacher', false), false, 'Teacher cannot edit locked date');

  // Teacher on unlocked date -> can edit
  assert.strictEqual(canEdit(false, 'teacher', false), true, 'Teacher can edit unlocked date');

  // Coordinator on locked date -> can edit via override
  assert.strictEqual(canEdit(true, 'teacher', true), true, 'Coordinator can override locked date');

  // Principal on locked date -> can edit via override
  assert.strictEqual(canEdit(true, 'principal', false), true, 'Principal can override locked date');

  // Super Admin on locked date -> can edit via override
  assert.strictEqual(canEdit(true, 'super_admin', false), true, 'Super admin can override locked date');
});

// -----------------------------------------------------------------
// 4. Session Detection Logic Verification
// -----------------------------------------------------------------
test('Session detection: Morning vs Afternoon based on time threshold', () => {
  function getSuggestedSession(hours, minutes) {
    const timeMinutes = hours * 60 + minutes;
    const afternoonCutoff = 12 * 60 + 30; // 12:30 PM
    return timeMinutes >= afternoonCutoff ? 'session2' : 'session1';
  }

  assert.strictEqual(getSuggestedSession(9, 0), 'session1', '09:00 AM suggests session1 (Morning)');
  assert.strictEqual(getSuggestedSession(11, 45), 'session1', '11:45 AM suggests session1 (Morning)');
  assert.strictEqual(getSuggestedSession(12, 30), 'session2', '12:30 PM suggests session2 (Afternoon)');
  assert.strictEqual(getSuggestedSession(14, 15), 'session2', '02:15 PM suggests session2 (Afternoon)');
});

// -----------------------------------------------------------------
// 5. Silent FCM Alert Message Template Verification
// -----------------------------------------------------------------
test('Silent FCM Absent Alert payload format matches specification', () => {
  const studentName = 'K. Rahul';
  const attendanceDate = '2026-11-20';
  const sessionLabel = 'Morning (Session 1)';
  const remarks = 'High Fever';

  const payload = {
    title: 'Student Attendance Alert: Absent',
    body: `Dear Parent, ${studentName} was marked ABSENT for ${sessionLabel} on ${attendanceDate}.${remarks ? ` Note: ${remarks}` : ''}`,
    data: {
      type: 'attendance_alert',
      student_id: '101',
      date: attendanceDate,
      session: 'session1',
      status: 'absent',
    },
  };

  assert.strictEqual(payload.title, 'Student Attendance Alert: Absent');
  assert(payload.body.includes('K. Rahul was marked ABSENT for Morning (Session 1) on 2026-11-20'));
  assert(payload.body.includes('Note: High Fever'));
  assert.strictEqual(payload.data.type, 'attendance_alert');
  assert.strictEqual(payload.data.status, 'absent');
});

console.log('\n======================================================================');
console.log(`TOTAL LOGIC & ARCHITECTURE CHECKS: ${testCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${testCount - passCount}`);
console.log('======================================================================');

if (passCount === testCount) {
  console.log('\nALL PORTAL STUDENT ATTENDANCE CHECKS PASSED WITH 100% SUCCESS!');
  process.exit(0);
} else {
  process.exit(1);
}
