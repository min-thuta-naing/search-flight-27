import { pool } from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function testTime() {
    try {
        console.log('--- Environment Info ---');
        console.log('Process TZ:', process.env.TZ || 'Not set (defaulting to system)');
        console.log('Current local Date():', new Date().toString());
        console.log('Current ISO Date():', new Date().toISOString());

        const query = "SELECT departure_time, departure_time::text as time_text FROM departure_flight_paths WHERE dep_airport = 'SAL' AND departure_date = '2026-04-07' LIMIT 1";
        const { rows } = await pool.query(query);

        if (rows.length > 0) {
            const row = rows[0];
            console.log('\n--- Database Row Data ---');
            console.log('Raw DB object type:', typeof row.departure_time);
            console.log('Raw DB object (toString):', row.departure_time.toString());
            console.log('Raw DB object (toISOString):', row.departure_time instanceof Date ? row.departure_time.toISOString() : 'N/A');
            console.log('DB time as text (::text):', row.time_text);

            const tz = 'America/El_Salvador'; // SAL
            const fmt = new Intl.DateTimeFormat('en-GB', { 
                timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false 
            });
            console.log(`\n--- Local Time Conversion (${tz}) ---`);
            console.log('Converted local time:', fmt.format(row.departure_time));
        } else {
            console.log('No rows found for SAL on 2026-04-07');
        }

    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

testTime();
