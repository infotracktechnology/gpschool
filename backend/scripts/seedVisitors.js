import { pool } from '../config/database.js';

export const seedVisitorData = async () => {
  console.log('[Seed] Seeding sample Visitor data...');

  // 1. Seed extension settings for staff_profiles if not present
  const [staff] = await pool.query('SELECT id, first_name, last_name, department FROM staff_profiles LIMIT 5');
  if (staff.length > 0) {
    for (let i = 0; i < staff.length; i++) {
      const s = staff[i];
      await pool.query(`
        INSERT INTO visitor_host_extensions (staff_id, cabin_room, intercom, visiting_hours, is_available)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
        cabin_room = VALUES(cabin_room),
        intercom = VALUES(intercom)
      `, [
        s.id,
        i === 0 ? 'Academic Block - Cabin 104' : 'Science Wing - Staff Room 2',
        101 + i,
        '2:00 PM - 3:30 PM'
      ]);
    }
  }

  // 2. Check existing passes
  const [existingPasses] = await pool.query('SELECT COUNT(*) AS c FROM visitor_passes');
  if (existingPasses[0].c === 0) {
    // Insert a master visitor
    const [vRes] = await pool.query(`
      INSERT INTO visitors (name, phone, email, visitor_type, address)
      VALUES ('Rajesh Sharma', '9840123456', 'rajesh.sharma@example.com', 'Parent', 'Anna Nagar, Chennai')
    `);
    const visitorId = vRes.insertId;

    // Active pass
    await pool.query(`
      INSERT INTO visitor_passes (
        pass_number, visitor_id, visitor_name, visitor_phone, purpose, purpose_details,
        person_to_meet_id, person_to_meet_name, department, student_name, student_class_section,
        vehicle_type, vehicle_number, accompanying_count, check_in_time, expected_duration_minutes, status
      ) VALUES (
        'VP-20261124-0001', ?, 'Rajesh Sharma', '9840123456', 'Parent Meeting / Early Student Pick-up',
        'Discussion regarding terminal term exam progress with Class Teacher',
        1, 'Ananya Krishnan', 'Mathematics', 'Aarav Sharma', 'Grade 10 - Section A',
        '4-Wheeler', 'TN-09-CB-1234', 1, DATE_SUB(NOW(), INTERVAL 35 MINUTE), 60, 'active'
      )
    `, [visitorId]);

    // Another visitor: Overstayed
    const [vRes2] = await pool.query(`
      INSERT INTO visitors (name, phone, email, visitor_type, address)
      VALUES ('Vikas Patel', '9884567890', 'vikas.patel@logistics.com', 'Vendor', 'Ambattur Industrial Estate')
    `);
    await pool.query(`
      INSERT INTO visitor_passes (
        pass_number, visitor_id, visitor_name, visitor_phone, purpose, purpose_details,
        person_to_meet_id, person_to_meet_name, department,
        vehicle_type, vehicle_number, accompanying_count, check_in_time, expected_duration_minutes, status
      ) VALUES (
        'VP-20261124-0002', ?, 'Vikas Patel', '9884567890', 'Vendor / Supplier Delivery',
        'Delivery of science laboratory glassware and chemicals',
        2, 'Sundar Raman', 'Science & Physics',
        '4-Wheeler', 'TN-02-AL-9988', 0, DATE_SUB(NOW(), INTERVAL 95 MINUTE), 45, 'active'
      )
    `, [vRes2.insertId]);

    // Completed pass (for History)
    await pool.query(`
      INSERT INTO visitor_passes (
        pass_number, visitor_id, visitor_name, visitor_phone, purpose, purpose_details,
        person_to_meet_id, person_to_meet_name, department,
        vehicle_type, vehicle_number, accompanying_count, check_in_time, check_out_time, expected_duration_minutes, status, exit_remarks
      ) VALUES (
        'VP-20261124-0003', ?, 'Dr. Meenakshi Sundaram', '9444112233', 'Official Inspection / CBSE Visit',
        'Academic quality audit and lab infrastructure inspection',
        1, 'Ananya Krishnan', 'Mathematics',
        '4-Wheeler', 'TN-01-AX-4321', 2, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), 120, 'checked_out', 'Inspection docket handed over'
      )
    `, [visitorId]);
  }

  // 3. Check existing appointments
  const [existingApt] = await pool.query('SELECT COUNT(*) AS c FROM visitor_appointments');
  if (existingApt[0].c === 0) {
    await pool.query(`
      INSERT INTO visitor_appointments (
        appointment_number, visitor_name, visitor_phone, visitor_email,
        person_to_meet_id, person_to_meet_name, department, appointment_date, appointment_time,
        purpose, notes, status
      ) VALUES 
      ('APT-20261124-0001', 'Kavitha Ramachandran', '9812345678', 'kavitha.r@gmail.com',
       1, 'Ananya Krishnan', 'Mathematics', CURDATE(), '02:30 PM',
       'Parent Teacher Interaction', 'Discuss olympiad training for Grade 10', 'pending'),
      ('APT-20261124-0002', 'Senthil Nathan', '9765432109', 'senthil@techsolutions.in',
       2, 'Sundar Raman', 'Science & Physics', CURDATE(), '03:15 PM',
       'Smart Classroom Demonstration', 'Physics digital simulation board demo', 'approved')
    `);
  }

  console.log('[Seed] Sample Visitor data seeded successfully!');
};

if (process.argv[1]?.includes('seedVisitors.js')) {
  seedVisitorData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
