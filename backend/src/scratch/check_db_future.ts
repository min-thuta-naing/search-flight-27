import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkDb() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/flight_search'
    });

    try {
        console.log('Checking for future flight data in DB...');
        
        const arrCount = await pool.query("SELECT COUNT(*) FROM arrival_flight_paths WHERE date >= '2027-01-01'");
        const depCount = await pool.query("SELECT COUNT(*) FROM departure_flight_paths WHERE date >= '2027-01-01'");
        
        console.log(`Arrivals (>= 2027-01-01): ${arrCount.rows[0].count}`);
        console.log(`Departures (>= 2027-01-01): ${depCount.rows[0].count}`);

        const latestSync = await pool.query("SELECT * FROM future_sync_status ORDER BY id DESC LIMIT 5");
        console.log('\nLatest Future Sync Status:');
        console.table(latestSync.rows);

    } catch (err) {
        console.error('Error checking DB:', err);
    } finally {
        await pool.end();
    }
}

checkDb();
