import { pool, query } from '../config/database.js';

async function seedGreenParkStudents() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const branchId = 2; // GREEN PARK SCHOOL
    const [branch] = await conn.query('SELECT id, name FROM branches WHERE id = ?', [branchId]);
    if (!branch || branch.length === 0) {
      throw new Error('GREEN PARK SCHOOL (branch_id=2) not found!');
    }
    console.log(`Target Branch: ${branch[0].name} (ID: ${branchId})`);

    // Ensure Academic Years
    const [years] = await conn.query('SELECT id, name FROM academic_years ORDER BY id ASC');
    const academicYearId = years.length > 1 ? years[1].id : (years[0]?.id || 1); // 2026-2027 or first
    console.log(`Target Academic Year ID: ${academicYearId}`);

    // Ensure Classes for Branch 2
    const classConfigs = [
      { name: 'Class 1', code: 'GPS-C1', stage: 'primary', display_order: 1 },
      { name: 'Class 2', code: 'GPS-C2', stage: 'primary', display_order: 2 },
      { name: 'Class 3', code: 'GPS-C3', stage: 'primary', display_order: 3 },
      { name: 'Class 4', code: 'GPS-C4', stage: 'primary', display_order: 4 },
      { name: 'Class 5', code: 'GPS-C5', stage: 'primary', display_order: 5 },
    ];

    const classMap = {};
    for (const cfg of classConfigs) {
      let [existing] = await conn.query(
        'SELECT id, name FROM classes WHERE branch_id = ? AND name = ?',
        [branchId, cfg.name]
      );
      let classId;
      if (existing.length > 0) {
        classId = existing[0].id;
      } else {
        const [res] = await conn.query(
          'INSERT INTO classes (branch_id, code, name, stage, display_order, status) VALUES (?, ?, ?, ?, ?, ?)',
          [branchId, cfg.code, cfg.name, cfg.stage, cfg.display_order, 'active']
        );
        classId = res.insertId;
      }
      classMap[cfg.name] = classId;

      // Ensure sections A and B for each class
      for (const secName of ['A', 'B']) {
        const [secExists] = await conn.query(
          'SELECT id FROM branch_class_sections WHERE branch_id = ? AND class_id = ? AND name = ?',
          [branchId, classId, secName]
        );
        if (secExists.length === 0) {
          await conn.query(
            'INSERT INTO branch_class_sections (branch_id, class_id, name, capacity, room_no, status) VALUES (?, ?, ?, 40, ?, "active")',
            [branchId, classId, secName, `GPS-${secName}`]
          );
        }
      }
    }

    // Get Sections map
    const [allSections] = await conn.query(
      'SELECT id, class_id, name FROM branch_class_sections WHERE branch_id = ?',
      [branchId]
    );

    const getSectionId = (className, secName) => {
      const cId = classMap[className];
      const s = allSections.find((sec) => sec.class_id === cId && sec.name === secName);
      return s ? s.id : allSections[0]?.id;
    };

    // 10 Students Sample Data
    const studentData = [
      {
        admission_no: 'GPS/2026/001',
        student_name: 'Aarav Sharma',
        gender: 'male',
        dob: '2019-05-14',
        blood_group: 'B+',
        aadhaar_no: '4821 9012 3411',
        religion: 'Hindu',
        caste_category: 'General',
        father_name: 'Vikram Sharma',
        father_phone: '9845012341',
        father_email: 'vikram.sharma@example.com',
        father_occupation: 'Software Engineer',
        mother_name: 'Pooja Sharma',
        mother_phone: '9845012342',
        street_address: '12, Anna Nagar 2nd Cross',
        city: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632001',
        className: 'Class 1',
        sectionName: 'A',
        roll_no: '101',
        previous_school: 'Little Millennium Preschool',
        previous_board: 'CBSE',
        previous_class: 'UKG',
        previous_tc_no: 'LM/2026/089',
        previous_tc_date: '2026-03-25',
        previous_school_address: 'Katpadi, Vellore, Tamil Nadu',
        previous_result: 'Passed - Grade A+ (94%)',
        previous_reason_for_leaving: 'Promoted to primary schooling wing',
      },
      {
        admission_no: 'GPS/2026/002',
        student_name: 'Diya Krishnan',
        gender: 'female',
        dob: '2019-08-22',
        blood_group: 'O+',
        aadhaar_no: '5912 3844 9102',
        religion: 'Hindu',
        caste_category: 'OBC',
        father_name: 'R. Krishnan',
        father_phone: '9845023451',
        father_email: 'krishnan.r@example.com',
        father_occupation: 'Bank Manager',
        mother_name: 'Meena Krishnan',
        mother_phone: '9845023452',
        street_address: '45/B, Gandhi Salai',
        city: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632002',
        className: 'Class 1',
        sectionName: 'A',
        roll_no: '102',
        previous_school: 'EuroKids International Kindergarten',
        previous_board: 'ICSE',
        previous_class: 'Senior KG',
        previous_tc_no: 'EK/VEL/2026/102',
        previous_tc_date: '2026-04-02',
        previous_school_address: 'Sathuvachari, Vellore',
        previous_result: 'Distinction - 96%',
        previous_reason_for_leaving: 'Seeking formal school admission',
      },
      {
        admission_no: 'GPS/2026/003',
        student_name: 'Mohammed Zayd',
        gender: 'male',
        dob: '2019-02-18',
        blood_group: 'A+',
        aadhaar_no: '7102 4819 2201',
        religion: 'Islam',
        caste_category: 'BC-Muslim',
        father_name: 'Tariq Mohammed',
        father_phone: '9845034561',
        father_email: 'tariq.zayd@example.com',
        father_occupation: 'Civil Contractor',
        mother_name: 'Fatima Zayd',
        mother_phone: '9845034562',
        street_address: '7, Mosque Street, Saidapet',
        city: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632012',
        className: 'Class 1',
        sectionName: 'B',
        roll_no: '103',
        previous_school: 'Crescent Nursery School',
        previous_board: 'State Board',
        previous_class: 'UKG',
        previous_tc_no: 'CNS/26/411',
        previous_tc_date: '2026-03-28',
        previous_school_address: 'Saidapet, Vellore',
        previous_result: 'Passed - 91%',
        previous_reason_for_leaving: 'Parent relocated residence',
      },
      {
        admission_no: 'GPS/2026/004',
        student_name: 'Ananya Sridhar',
        gender: 'female',
        dob: '2018-11-09',
        blood_group: 'AB+',
        aadhaar_no: '8210 3922 4192',
        religion: 'Hindu',
        caste_category: 'General',
        father_name: 'Sridhar Venkat',
        father_phone: '9845045671',
        father_email: 'sridhar.v@example.com',
        father_occupation: 'Senior Accountant',
        mother_name: 'Kavitha Sridhar',
        mother_phone: '9845045672',
        street_address: '108, Phase 2, Sathuvachari',
        city: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632009',
        className: 'Class 2',
        sectionName: 'A',
        roll_no: '201',
        previous_school: 'St. Marks Matriculation School',
        previous_board: 'Matriculation',
        previous_class: 'Class 1',
        previous_tc_no: 'SMMS/TC/2026/045',
        previous_tc_date: '2026-04-10',
        previous_school_address: 'Arcot Road, Ranipet',
        previous_result: 'Passed - 93.5% (Grade A)',
        previous_reason_for_leaving: 'Family shifted closer to Green Park campus',
      },
      {
        admission_no: 'GPS/2026/005',
        student_name: 'Karthik Raja',
        gender: 'male',
        dob: '2018-07-30',
        blood_group: 'O-',
        aadhaar_no: '9301 4810 5923',
        religion: 'Hindu',
        caste_category: 'MBC',
        father_name: 'Raja Sundaram',
        father_phone: '9845056781',
        father_email: 'raja.sundaram@example.com',
        father_occupation: 'Business Owner',
        mother_name: 'Latha Raja',
        mother_phone: '9845056782',
        street_address: '22, Trunk Road, Bagayam',
        city: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632002',
        className: 'Class 2',
        sectionName: 'A',
        roll_no: '202',
        previous_school: 'Sunbeam School',
        previous_board: 'CBSE',
        previous_class: 'Class 1',
        previous_tc_no: 'SBS/2026/TC-118',
        previous_tc_date: '2026-04-12',
        previous_school_address: 'Katpadi, Vellore',
        previous_result: 'Passed - 89%',
        previous_reason_for_leaving: 'Parent preference for curriculum',
      },
      {
        admission_no: 'GPS/2026/006',
        student_name: 'Sneha Murugan',
        gender: 'female',
        dob: '2017-10-15',
        blood_group: 'B+',
        aadhaar_no: '3419 8201 4920',
        religion: 'Hindu',
        caste_category: 'SC',
        father_name: 'Murugan K.',
        father_phone: '9845067891',
        father_email: 'murugan.k@example.com',
        father_occupation: 'Government Officer',
        mother_name: 'Selvi Murugan',
        mother_phone: '9845067892',
        street_address: '15, Old Town, Kosapet',
        city: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632001',
        className: 'Class 3',
        sectionName: 'A',
        roll_no: '301',
        previous_school: 'Kendriya Vidyalaya',
        previous_board: 'CBSE',
        previous_class: 'Class 2',
        previous_tc_no: 'KV/VLR/2026/088',
        previous_tc_date: '2026-04-15',
        previous_school_address: 'Gandhi Nagar, Vellore',
        previous_result: 'Passed - 95% (A1 in all subjects)',
        previous_reason_for_leaving: 'Parent transferred from Central sector',
      },
      {
        admission_no: 'GPS/2026/007',
        student_name: 'Rohan Daniel',
        gender: 'male',
        dob: '2017-04-05',
        blood_group: 'A-',
        aadhaar_no: '4820 1930 4819',
        religion: 'Christian',
        caste_category: 'General',
        father_name: 'Daniel Joseph',
        father_phone: '9845078901',
        father_email: 'daniel.j@example.com',
        father_occupation: 'Hospital Administrator',
        mother_name: 'Reena Daniel',
        mother_phone: '9845078902',
        street_address: '88, Hospital Road, Thorapadi',
        city: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632004',
        className: 'Class 3',
        sectionName: 'B',
        roll_no: '302',
        previous_school: 'Ida Scudder School',
        previous_board: 'ICSE',
        previous_class: 'Class 2',
        previous_tc_no: 'ISS/2026/512',
        previous_tc_date: '2026-04-08',
        previous_school_address: 'Kalinjur, Vellore',
        previous_result: 'Passed - Grade A',
        previous_reason_for_leaving: 'Parent relocation',
      },
      {
        admission_no: 'GPS/2026/008',
        student_name: 'Harini Balaji',
        gender: 'female',
        dob: '2016-12-19',
        blood_group: 'O+',
        aadhaar_no: '6019 3849 1029',
        religion: 'Hindu',
        caste_category: 'General',
        father_name: 'Balaji Narayanan',
        father_phone: '9845089011',
        father_email: 'balaji.n@example.com',
        father_occupation: 'Architect',
        mother_name: 'Sowmya Balaji',
        mother_phone: '9845089012',
        street_address: '5, Green Avenue, Otteri',
        city: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632002',
        className: 'Class 4',
        sectionName: 'A',
        roll_no: '401',
        previous_school: 'Delhi Public School',
        previous_board: 'CBSE',
        previous_class: 'Class 3',
        previous_tc_no: 'DPS/BLR/2026/904',
        previous_tc_date: '2026-04-18',
        previous_school_address: 'Whitefield, Bengaluru',
        previous_result: 'Passed - 92%',
        previous_reason_for_leaving: 'Parent relocated from Bengaluru to Vellore',
      },
      {
        admission_no: 'GPS/2026/009',
        student_name: 'Varun Teja',
        gender: 'male',
        dob: '2016-03-24',
        blood_group: 'B-',
        aadhaar_no: '7192 4810 3912',
        religion: 'Hindu',
        caste_category: 'OBC',
        father_name: 'Prasad Teja',
        father_phone: '9845090121',
        father_email: 'prasad.teja@example.com',
        father_occupation: 'Pharmacist',
        mother_name: 'Anitha Teja',
        mother_phone: '9845090122',
        street_address: '34, Officer Line',
        city: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632001',
        className: 'Class 4',
        sectionName: 'B',
        roll_no: '402',
        previous_school: 'Bhavans Vidya Mandir',
        previous_board: 'CBSE',
        previous_class: 'Class 3',
        previous_tc_no: 'BVM/2026/TC-076',
        previous_tc_date: '2026-04-14',
        previous_school_address: 'Tirupati, Andhra Pradesh',
        previous_result: 'Passed - 88%',
        previous_reason_for_leaving: 'Family moved to Tamil Nadu',
      },
      {
        admission_no: 'GPS/2026/010',
        student_name: 'Tanvi Rajesh',
        gender: 'female',
        dob: '2015-09-11',
        blood_group: 'AB-',
        aadhaar_no: '9201 3849 5012',
        religion: 'Hindu',
        caste_category: 'General',
        father_name: 'Rajesh Kumar M.',
        father_phone: '9845001231',
        father_email: 'rajesh.kumar@example.com',
        father_occupation: 'Senior Consultant',
        mother_name: 'Deepa Rajesh',
        mother_phone: '9845001232',
        street_address: '19, Green Park Enclave',
        city: 'Vellore',
        state: 'Tamil Nadu',
        pincode: '632009',
        className: 'Class 5',
        sectionName: 'A',
        roll_no: '501',
        previous_school: 'Shri Ram Universal School',
        previous_board: 'CBSE',
        previous_class: 'Class 4',
        previous_tc_no: 'SRUS/CHE/2026/301',
        previous_tc_date: '2026-04-20',
        previous_school_address: 'OMR, Chennai, Tamil Nadu',
        previous_result: 'Passed - 97% (Outstanding Academic Award)',
        previous_reason_for_leaving: 'Parent permanent relocation to Green Park area',
      },
    ];

    let insertedCount = 0;

    for (const s of studentData) {
      // Check if student with admission_no exists
      const [existingStudent] = await conn.query(
        'SELECT id FROM students WHERE admission_no = ?',
        [s.admission_no]
      );
      if (existingStudent.length > 0) {
        console.log(`Student ${s.admission_no} already exists, skipping.`);
        continue;
      }

      // 1. Insert into students
      const [stResult] = await conn.query(
        `INSERT INTO students
         (admission_no, student_name, gender, dob, blood_group, aadhaar_no, religion,
          caste_category, nationality, mother_tongue, father_name, father_phone,
          father_email, father_occupation, mother_name, mother_phone, street_address,
          city, state, pincode, emergency_contact_name, emergency_contact_phone,
          previous_school, previous_board, previous_class, previous_tc_no, previous_tc_date,
          previous_school_address, previous_result, previous_reason_for_leaving, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Indian', 'Tamil', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          s.admission_no,
          s.student_name,
          s.gender,
          s.dob,
          s.blood_group,
          s.aadhaar_no,
          s.religion,
          s.caste_category,
          s.father_name,
          s.father_phone,
          s.father_email,
          s.father_occupation,
          s.mother_name,
          s.mother_phone,
          s.street_address,
          s.city,
          s.state,
          s.pincode,
          s.father_name,
          s.father_phone,
          s.previous_school,
          s.previous_board,
          s.previous_class,
          s.previous_tc_no,
          s.previous_tc_date,
          s.previous_school_address,
          s.previous_result,
          s.previous_reason_for_leaving,
        ]
      );

      const studentId = stResult.insertId;
      const classId = classMap[s.className];
      const sectionId = getSectionId(s.className, s.sectionName);

      // 2. Insert into student_enrollments
      await conn.query(
        `INSERT INTO student_enrollments
         (student_id, branch_id, academic_year_id, class_id, section_id, roll_no, admission_category, enrollment_status)
         VALUES (?, ?, ?, ?, ?, ?, 'General', 'current')`,
        [studentId, branchId, academicYearId, classId, sectionId, s.roll_no]
      );

      // 3. Insert into admissions (for Confirmed Admissions page parity)
      await conn.query(
        `INSERT INTO admissions
         (branch_id, academic_year_id, class_id, section_id, student_name, gender, dob,
          parent_name, primary_phone, address_street, city, admission_date, admission_no,
          roll_no, admission_category, enrollment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-05-01', ?, ?, 'General', 'active')`,
        [
          branchId,
          academicYearId,
          classId,
          sectionId,
          s.student_name,
          s.gender,
          s.dob,
          s.father_name,
          s.father_phone,
          s.street_address,
          s.city,
          s.admission_no,
          s.roll_no,
        ]
      );

      insertedCount++;
      console.log(`Seeded: ${s.student_name} (${s.admission_no}) -> ${s.className} Sec ${s.sectionName}`);
    }

    await conn.commit();
    console.log(`\nSuccessfully seeded ${insertedCount} students for GREEN PARK SCHOOL.`);
  } catch (err) {
    await conn.rollback();
    console.error('Seeding failed:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seedGreenParkStudents();
