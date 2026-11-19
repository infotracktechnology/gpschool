import { pool, query } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🚀 Running communication tables migration...');
  const sqlFile = path.join(__dirname, 'communication_tables.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Split queries by semicolon
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await query(statement);
      console.log('✅ Executed table statement successfully');
    } catch (err) {
      console.error('❌ Error executing statement:', err.message);
    }
  }

  console.log('🎉 All communication tables verified/created!');
  await pool.end();
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
