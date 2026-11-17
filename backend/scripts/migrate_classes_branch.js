import { pool, query } from '../config/database.js';

async function migrate() {
  try {
    console.log('[Migration] Starting classes branch_id migration...');

    // 1. Check if branch_id column exists
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'classes' 
         AND COLUMN_NAME = 'branch_id'`
    );

    if (columns.length === 0) {
      console.log('[Migration] Adding branch_id column to classes table...');
      await pool.query('ALTER TABLE classes ADD COLUMN branch_id INT NULL AFTER id');
      console.log('[Migration] Column branch_id added successfully.');
    } else {
      console.log('[Migration] Column branch_id already exists in classes.');
    }

    // 2. Fetch first branch id to assign existing classes without branch_id
    const [branches] = await pool.query('SELECT id, name, code FROM branches ORDER BY id ASC LIMIT 1');
    if (branches.length === 0) {
      throw new Error('No branches found in database! Please seed or create a branch first.');
    }
    const defaultBranchId = branches[0].id;
    console.log(`[Migration] Default branch for existing classes is: ID=${defaultBranchId} (${branches[0].name})`);

    // 3. Update any classes where branch_id is NULL
    const [updateResult] = await pool.query(
      'UPDATE classes SET branch_id = ? WHERE branch_id IS NULL',
      [defaultBranchId]
    );
    console.log(`[Migration] Updated ${updateResult.affectedRows} classes with default branch_id.`);

    // 4. Check / Add foreign key constraint to branches(id)
    const [fks] = await pool.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'classes' 
         AND COLUMN_NAME = 'branch_id' 
         AND REFERENCED_TABLE_NAME = 'branches'`
    );

    if (fks.length === 0) {
      console.log('[Migration] Adding foreign key constraint fk_classes_branch...');
      await pool.query(
        `ALTER TABLE classes 
         ADD CONSTRAINT fk_classes_branch 
         FOREIGN KEY (branch_id) REFERENCES branches(id) 
         ON DELETE RESTRICT ON UPDATE CASCADE`
      );
      console.log('[Migration] Foreign key fk_classes_branch added successfully.');
    } else {
      console.log(`[Migration] Foreign key already exists: ${fks[0].CONSTRAINT_NAME}`);
    }

    // 5. Update UNIQUE constraint on code to be unique per branch (branch_id, code)
    const [indices] = await pool.query('SHOW INDEX FROM classes');
    const hasGlobalCodeUnique = indices.some(
      (idx) => idx.Key_name === 'code' && idx.Non_unique === 0
    );
    const hasBranchCodeUnique = indices.some(
      (idx) => idx.Key_name === 'uk_classes_branch_code'
    );

    if (hasGlobalCodeUnique) {
      console.log('[Migration] Dropping global UNIQUE index `code`...');
      await pool.query('ALTER TABLE classes DROP INDEX `code`');
      console.log('[Migration] Global index `code` dropped.');
    }

    if (!hasBranchCodeUnique) {
      console.log('[Migration] Adding composite UNIQUE index `uk_classes_branch_code` (branch_id, code)...');
      await pool.query('ALTER TABLE classes ADD UNIQUE KEY uk_classes_branch_code (branch_id, code)');
      console.log('[Migration] Composite index `uk_classes_branch_code` added successfully.');
    } else {
      console.log('[Migration] Composite unique index uk_classes_branch_code already exists.');
    }

    console.log('[Migration] Migration completed successfully!');
  } catch (err) {
    console.error('[Migration Error]:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
