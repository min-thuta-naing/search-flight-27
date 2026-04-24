import { pool } from '../config/database';

async function migrate() {
  console.log('Starting migration: add attempts column to cross_check_airport_metrics...');
  try {
    const query = `
      ALTER TABLE cross_check_airport_metrics 
      ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1;
    `;
    await pool.query(query);
    console.log('✅ Successfully added attempts column.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
