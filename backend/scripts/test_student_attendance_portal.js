import { query } from '../config/database.js';
import * as attController from '../controllers/portal/portalStudentAttendanceController.js';

function createReqRes(opts = {}) {
  const req = {
    user: opts.user || { id: 1, role: 'super_admin', branch_id: 1, username: 'admin' },
    params: opts.params || {},
    query: opts.query || {},
    body: opts.body || {},
    headers: opts.headers || {},
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  const next = (err) => {
    if (err) {
      console.error('Controller Error:', err);
      throw err;
    }
  };

  return { req, res, next };
}

async function runTests() {
  console.log('========================================================================');
  console.log('Testing Staff Portal Student Attendance (Session-based & Tiered Lock)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✔ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`✘ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Test Assigned Classes (Campus Admin)
    console.log('\n--- 1. Testing Assigned Classes (Campus Admin) ---');
    const t1 = createReqRes({ user: { id: 1, role: 'admin', branch_id: 1 } });
    await attController.getAssignedClasses(t1.req, t1.res, t1.next);
    assert(t1.res.getStatusCode() === 200, 'getAssignedClasses returns 200');
    assert(t1.res.getData().access_level === 'campus', 'Admin has campus-level access');
    assert(t1.res.getData().can_edit_locked === true, 'Admin can edit locked backdated attendance');
    assert(Array.isArray(t1.res.getData().sections), 'Sections returned as array');

    const sections = t1.res.getData().sections;
    if (sections.length === 0) {
      console.log('Note: No sections found in branch 1. Exiting test.');
      process.exit(0);
    }
    const targetSection = sections[0];

    // 2. Test Assigned Classes (Teacher Role)
    console.log('\n--- 2. Testing Assigned Classes (Teacher Role Scoping) ---');
    const teacherUser = await query(`
      SELECT u.id, u.username, u.role, u.branch_id, sp.id AS staff_id
      FROM users u
      JOIN staff_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'teacher'
      LIMIT 1
    `);

    if (teacherUser.length > 0) {
      const tTeacher = createReqRes({ user: teacherUser[0] });
      await attController.getAssignedClasses(tTeacher.req, tTeacher.res, tTeacher.next);
      assert(tTeacher.res.getStatusCode() === 200, 'Teacher assigned classes returns 200');
      assert(['class_teacher', 'coordinator'].includes(tTeacher.res.getData().access_level), 'Teacher has scoped access level');
    }

    // 3. Test Roster (Today: is_locked = false, can_edit = true)
    console.log('\n--- 3. Testing Roster (Current Date: Editable) ---');
    const today = new Date().toISOString().split('T')[0];
    const t3 = createReqRes({
      user: { id: 1, role: 'teacher', branch_id: 1 },
      query: {
        class_id: String(targetSection.class_id),
        section_id: String(targetSection.section_id),
        attendance_date: today,
        session: 'session1',
      },
    });
    await attController.getStudentAttendanceRoster(t3.req, t3.res, t3.next);
    assert(t3.res.getStatusCode() === 200, 'getStudentAttendanceRoster returns 200');
    const rosterToday = t3.res.getData();
    assert(rosterToday.is_locked === false, 'Today is not locked');
    assert(rosterToday.can_edit === true, 'Today is editable by teachers');
    assert(rosterToday.session === 'session1', 'Session is session1');
    assert(rosterToday.summary !== undefined, 'Summary badges calculated');
    assert(Array.isArray(rosterToday.students), 'Students roster returned');

    // 4. Test Tiered Lock on Backdated Attendance (5 days ago)
    console.log('\n--- 4. Testing Tiered Backdated Attendance Lock (Older than 2 days) ---');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const pastDateStr = pastDate.toISOString().split('T')[0];

    // 4a. Teacher should be locked
    const t4a = createReqRes({
      user: { id: 99999, role: 'teacher', branch_id: 1 },
      query: {
        class_id: String(targetSection.class_id),
        section_id: String(targetSection.section_id),
        attendance_date: pastDateStr,
        session: 'session1',
      },
    });
    await attController.getStudentAttendanceRoster(t4a.req, t4a.res, t4a.next);
    assert(t4a.res.getData().is_locked === true, 'Dates older than 2 days are locked');
    assert(t4a.res.getData().can_edit === false, 'Teachers cannot edit locked backdated attendance');
    assert(Boolean(t4a.res.getData().lock_message), 'Lock message displayed to teacher');

    // 4b. Principal / Admin can edit locked dates
    const t4b = createReqRes({
      user: { id: 1, role: 'principal', branch_id: 1 },
      query: {
        class_id: String(targetSection.class_id),
        section_id: String(targetSection.section_id),
        attendance_date: pastDateStr,
        session: 'session1',
      },
    });
    await attController.getStudentAttendanceRoster(t4b.req, t4b.res, t4b.next);
    assert(t4b.res.getData().can_edit === true, 'Principal can edit locked backdated dates via override');
    assert(t4b.res.getData().is_privileged_override === true, 'Privileged override flag set for Principal');

    // 5. Test Save Attendance with FCM Silent Dispatch
    console.log('\n--- 5. Testing Save Attendance with Absent Alert Dispatch ---');
    const students = rosterToday.students;
    if (students.length > 0) {
      const recordsToSave = [
        {
          student_id: students[0].student_id,
          status: 'present',
          remarks: 'On time',
        },
      ];
      if (students.length > 1) {
        recordsToSave.push({
          student_id: students[1].student_id,
          status: 'absent',
          remarks: 'Uninformed absence - fever',
        });
      }

      const t5 = createReqRes({
        user: { id: 1, role: 'teacher', branch_id: 1 },
        body: {
          branch_id: 1,
          academic_year_id: 1,
          class_id: targetSection.class_id,
          section_id: targetSection.section_id,
          attendance_date: today,
          session: 'session1',
          records: recordsToSave,
        },
      });
      await attController.saveStudentAttendance(t5.req, t5.res, t5.next);
      assert(t5.res.getStatusCode() === 200, 'saveStudentAttendance returns 200');
      assert(t5.res.getData().saved_count === recordsToSave.length, `Saved ${recordsToSave.length} records`);
      assert(t5.res.getData().absentees_count >= 1, 'Detected absentee for silent FCM alert');
    }

    // 6. Test 'Copy Morning to Afternoon' Shortcut
    console.log('\n--- 6. Testing Copy Morning to Afternoon Shortcut ---');
    const t6 = createReqRes({
      user: { id: 1, role: 'teacher', branch_id: 1 },
      body: {
        branch_id: 1,
        academic_year_id: 1,
        class_id: targetSection.class_id,
        section_id: targetSection.section_id,
        attendance_date: today,
      },
    });
    await attController.copyMorningToAfternoon(t6.req, t6.res, t6.next);
    assert(t6.res.getStatusCode() === 200, 'copyMorningToAfternoon returns 200');
    assert(t6.res.getData().copied_count > 0, `Copied ${t6.res.getData().copied_count} records from Session 1 to Session 2`);

    // Verify Session 2 now has attendance
    const t6Verify = createReqRes({
      user: { id: 1, role: 'teacher', branch_id: 1 },
      query: {
        class_id: String(targetSection.class_id),
        section_id: String(targetSection.section_id),
        attendance_date: today,
        session: 'session2',
      },
    });
    await attController.getStudentAttendanceRoster(t6Verify.req, t6Verify.res, t6Verify.next);
    const session2Roster = t6Verify.res.getData();
    assert(session2Roster.summary.total > 0, 'Session 2 roster populated with copied attendance');

    console.log('\n========================================================================');
    console.log(`Student Attendance Unit Tests: ${passed} passed, ${failed} failed`);
    console.log('========================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  }
}

runTests();
