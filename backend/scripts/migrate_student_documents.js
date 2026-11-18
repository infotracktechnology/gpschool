import { query, pool } from '../config/database.js';

async function migrate() {
  console.log('[Migration] Creating student_documents table...');

  await query(`
    CREATE TABLE IF NOT EXISTS student_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      document_type VARCHAR(60) NOT NULL DEFAULT 'Other',
      title VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      file_size INT DEFAULT 0,
      file_type VARCHAR(100) DEFAULT '',
      uploaded_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_student_doc (student_id),
      CONSTRAINT fk_student_documents_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('[Migration] student_documents table created successfully!');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
