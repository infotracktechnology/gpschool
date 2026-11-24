import { pool } from '../config/database.js';

/**
 * Migration script to add `remarks` column to `student_attendance`
 * Script: backend/scripts/migrate_student_attendance_remarks.js
 * Database: schoolcampuseye (MySQL)
 */

async function getExistingColumns(conn, tableName) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return new Set(rows.map(r => r.COLUMN_NAME));
}

async function addColumnIfNotExists(conn, tableName, columnName, columnDefinition) {
  const existingCols = await getExistingColumns(conn, tableName);
  if (!existingCols.has(columnName)) {
    console.log(`[Migration] Adding column \`${columnName}\` to \`${tableName}\`...`);
    await conn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
    console.log(`[Migration] ✔ Added column \`${columnName}\` to \`${tableName}\``);
  } else {
    console.log(`[Migration] - Column \`${columnName}\` already exists in \`${tableName}\``);
  }
}

async function getExistingIndexes(conn, tableName) {
  const [rows] = await conn.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return new Set(rows.map(r => r.INDEX_NAME));
}

async function addIndexIfNotExists(conn, tableName, indexName, columnsSql) {
  const existingIndexes = await getExistingIndexes(conn, tableName);
  if (!existingIndexes.has(indexName)) {
    console.log(`[Migration] Adding index \`${indexName}\` to \`${tableName}\`...`);
    await conn.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (${columnsSql})`);
    console.log(`[Migration] ✔ Added index \`${indexName}\` to \`${tableName}\``);
  } else {
    console.log(`[Migration] - Index \`${indexName}\` already exists on \`${tableName}\``);
  }
}

async function migrateStudentAttendanceRemarks() {
  let conn;
  try {
    console.log('[Migration] =================================================================');
    console.log('[Migration] Migrating `student_attendance` for remarks & session tracking...');
    console.log('[Migration] =================================================================');

    conn = await pool.getConnection();

    // 1. Add remarks column to student_attendance if not present
    await addColumnIfNotExists(conn, 'student_attendance', 'remarks', 'VARCHAR(255) NULL AFTER status');

    // 2. Add performance index for class & date attendance lookups
    await addIndexIfNotExists(
      conn,
      'student_attendance',
      'idx_sa_class_date_session',
      'branch_id, class_id, section_id, attendance_date, session'
    );

    // 3. Verification check
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_attendance'
       ORDER BY ORDINAL_POSITION`
    );

    console.log(`\nTable [student_attendance] (${cols.length} columns):`);
    console.log(cols.map(c => `  - ${c.COLUMN_NAME} (${c.DATA_TYPE}${c.IS_NULLABLE === 'NO' ? ', NOT NULL' : ''})`).join('\n'));

    console.log('\n[Migration] =================================================================');
    console.log('[Migration] SUCCESS: `student_attendance` remarks column migration completed!');
    console.log('[Migration] =================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n[Migration] ✘ ERROR running migration:', err);
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }
}

migrateStudentAttendanceRemarks();
