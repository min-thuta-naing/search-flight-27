import { Pool, PoolConfig, types } from 'pg';
import dotenv from 'dotenv';

// Force pg driver to parse 'timestamp without time zone' (OID 1114) as UTC
// Instead of the default behavior which parses it based on the process's local timezone.
types.setTypeParser(1114, (stringValue: string) => {
  return new Date(stringValue + 'Z');
});

dotenv.config();

const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'flight_search',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 50, // Increased from 20 to 50 for better concurrency
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

export const pool = new Pool(dbConfig);

// Track if we've already logged the initial connection
let hasLoggedInitialConnection = false;

// Test database connection (only log once)
pool.on('connect', () => {
  if (!hasLoggedInitialConnection) {
    console.log('✅ Connected to PostgreSQL database');
    hasLoggedInitialConnection = true;
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize TimescaleDB extension if enabled
export async function initializeTimescaleDB(): Promise<void> {
  try {
    const enableTimescaleDB = process.env.ENABLE_TIMESCALEDB === 'true';

    if (enableTimescaleDB) {
      await pool.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');
      console.log('✅ TimescaleDB extension enabled');
    }
  } catch (error) {
    console.warn('⚠️  TimescaleDB extension not available:', error);
    console.warn('   Continuing without TimescaleDB...');
  }
}

export default pool;

