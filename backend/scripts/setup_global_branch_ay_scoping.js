import { query, pool, initDatabase } from '../config/database.js';

const ensureColumn = async (table, column, definition) => {
  const cols = await query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (cols.length === 0) {
    await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[Scope Migration] Added ${table}.${column}`);
  }
};

const run = async () => {
  try {
    await initDatabase();

    // Resolve true default active branch & current academic year from DB
    const branchRows = await query(
      `SELECT id, code, name FROM branches ORDER BY (status = 'active') DESC, id ASC LIMIT 1`
    );
    const ayRows = await query(
      `SELECT id, code, name FROM academic_years ORDER BY (is_current = 1) DESC, (status = 'active') DESC, id DESC LIMIT 1`
    );

    const defaultBranchId = branchRows[0]?.id || 1;
    const defaultAyId = ayRows[0]?.id || 1;
    console.log(`[Scope Migration] Default Branch ID: ${defaultBranchId} (${branchRows[0]?.name || 'N/A'}), Default Academic Year ID: ${defaultAyId} (${ayRows[0]?.name || 'N/A'})`);

    // 1. Health & Infirmary schema additions
    const healthTablesBoth = [
      'health_profiles',
      'infirmary_visits',
      'health_checkups',
      'doctor_consultations',
      'medicine_dispensing_logs',
      'parent_health_notifications',
    ];
    for (const tbl of healthTablesBoth) {
      await ensureColumn(tbl, 'branch_id', 'INT NULL');
      await ensureColumn(tbl, 'academic_year_id', 'INT NULL');
    }
    await ensureColumn('infirmary_medicine_inventory', 'branch_id', 'INT NULL');

    // 2. Visitor Management schema additions
    await ensureColumn('visitors', 'branch_id', 'INT NULL');
    await ensureColumn('visitors', 'academic_year_id', 'INT NULL');
    await ensureColumn('visitor_passes', 'branch_id', 'INT NULL');
    await ensureColumn('visitor_passes', 'academic_year_id', 'INT NULL');
    await ensureColumn('visitor_appointments', 'branch_id', 'INT NULL');
    await ensureColumn('visitor_appointments', 'academic_year_id', 'INT NULL');
    await ensureColumn('visitor_host_extensions', 'branch_id', 'INT NULL');

    // 3. Certificate Management schema additions
    await ensureColumn('transfer_certificates', 'academic_year_id', 'INT NULL');

    // 4. Smart Backfill from linked student_enrollments / staff_profiles first, then defaults
    for (const tbl of healthTablesBoth) {
      const hasStudentCol = (await query(`SHOW COLUMNS FROM \`${tbl}\` LIKE 'student_id'`)).length > 0;
      const hasStaffCol = (await query(`SHOW COLUMNS FROM \`${tbl}\` LIKE 'staff_id'`)).length > 0;

      if (hasStudentCol) {
        await query(
          `UPDATE \`${tbl}\` t
           JOIN student_enrollments se ON se.id = (
             SELECT se2.id FROM student_enrollments se2
             WHERE se2.student_id = t.student_id
             ORDER BY (se2.enrollment_status IN ('current', 'active')) DESC, se2.id DESC LIMIT 1
           )
           SET t.branch_id = COALESCE(t.branch_id, se.branch_id),
               t.academic_year_id = COALESCE(t.academic_year_id, se.academic_year_id)
           WHERE t.student_id IS NOT NULL AND (t.branch_id IS NULL OR t.academic_year_id IS NULL)`
        );
      }
      if (hasStaffCol) {
        await query(
          `UPDATE \`${tbl}\` t
           JOIN staff_profiles sp ON sp.id = t.staff_id
           SET t.branch_id = COALESCE(t.branch_id, sp.branch_id)
           WHERE t.staff_id IS NOT NULL AND t.branch_id IS NULL`
        );
      }
      await query(`UPDATE \`${tbl}\` SET branch_id = ? WHERE branch_id IS NULL`, [defaultBranchId]);
      await query(`UPDATE \`${tbl}\` SET academic_year_id = ? WHERE academic_year_id IS NULL`, [defaultAyId]);
    }

    await query(`UPDATE infirmary_medicine_inventory SET branch_id = ? WHERE branch_id IS NULL`, [defaultBranchId]);

    // Visitor smart backfill
    await query(
      `UPDATE visitor_appointments va
       JOIN staff_profiles sp ON sp.id = va.person_to_meet_id
       SET va.branch_id = COALESCE(va.branch_id, sp.branch_id)
       WHERE va.person_to_meet_id IS NOT NULL AND va.branch_id IS NULL`
    );
    await query(
      `UPDATE visitor_host_extensions vhe
       JOIN staff_profiles sp ON sp.id = vhe.staff_id
       SET vhe.branch_id = COALESCE(vhe.branch_id, sp.branch_id)
       WHERE vhe.staff_id IS NOT NULL AND vhe.branch_id IS NULL`
    );
    await query(`UPDATE visitor_host_extensions SET branch_id = ? WHERE branch_id IS NULL`, [defaultBranchId]);

    for (const vTbl of ['visitors', 'visitor_passes', 'visitor_appointments']) {
      await query(`UPDATE \`${vTbl}\` SET branch_id = ? WHERE branch_id IS NULL`, [defaultBranchId]);
      await query(`UPDATE \`${vTbl}\` SET academic_year_id = ? WHERE academic_year_id IS NULL`, [defaultAyId]);
    }

    // Certificates backfill
    await query(
      `UPDATE transfer_certificates tc
       LEFT JOIN student_enrollments se ON se.id = tc.enrollment_id
       SET tc.branch_id = COALESCE(tc.branch_id, se.branch_id, ?),
           tc.academic_year_id = COALESCE(tc.academic_year_id, se.academic_year_id, ?)
       WHERE tc.branch_id IS NULL OR tc.academic_year_id IS NULL`,
      [defaultBranchId, defaultAyId]
    );
    await query(`UPDATE issued_certificates SET branch_id = ? WHERE branch_id IS NULL`, [defaultBranchId]);
    await query(`UPDATE issued_certificates SET academic_year_id = ? WHERE academic_year_id IS NULL`, [defaultAyId]);

    console.log('[Scope Migration] Schema & Backfill completed cleanly!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('[Scope Migration] Error:', error);
    process.exit(1);
  }
};

run();
