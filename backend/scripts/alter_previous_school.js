import { query } from '../config/database.js';

async function main() {
  const cols = [
    { name: 'previous_class', def: 'VARCHAR(50) NULL' },
    { name: 'previous_board', def: 'VARCHAR(100) NULL' },
    { name: 'previous_tc_no', def: 'VARCHAR(100) NULL' },
    { name: 'previous_tc_date', def: 'DATE NULL' },
    { name: 'previous_school_address', def: 'VARCHAR(255) NULL' },
    { name: 'previous_result', def: 'VARCHAR(100) NULL' },
    { name: 'previous_reason_for_leaving', def: 'VARCHAR(255) NULL' },
  ];

  for (const c of cols) {
    const exists = await query(`SHOW COLUMNS FROM students LIKE '${c.name}'`);
    if (exists.length === 0) {
      await query(`ALTER TABLE students ADD COLUMN ${c.name} ${c.def}`);
      console.log('Added column:', c.name);
    }
  }
  console.log('Previous school columns ensured on students table.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
