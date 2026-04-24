import { futureSyncRepository } from '../repositories/FutureSyncRepository';
import { pool } from '../config/database';

async function verify() {
    console.log('\n--- 🔍 FUTURE SYNC DIAGNOSTIC ---');
    
    // 1. Check Sync Date
    const nextDate = await futureSyncRepository.getNextSyncDate();
    console.log(`📡 Current Target Date in DB: ${nextDate}`);

    // 2. Check Data for 2027
    const year = '2027';
    
    const depQuery = `SELECT COUNT(*) as count FROM departure_flight_paths WHERE EXTRACT(YEAR FROM departure_date) = 2027`;
    const arrQuery = `SELECT COUNT(*) as count FROM arrival_flight_paths WHERE EXTRACT(YEAR FROM arrival_date) = 2027`;
    
    const { rows: depRows } = await pool.query(depQuery);
    const { rows: arrRows } = await pool.query(arrQuery);
    
    console.log(`📊 2027 Departure Flights: ${depRows[0].count}`);
    console.log(`📊 2027 Arrival Flights: ${arrRows[0].count}`);

    // 3. Reset if requested via command line arg
    if (process.argv.includes('--reset')) {
        const targetDate = '2027-01-01';
        await futureSyncRepository.resetSyncDate(targetDate);
        console.log(`✅ Successfully reset tracking to ${targetDate}`);
    } else {
        console.log('\n💡 Hint: Run with --reset to move the target date back to 2027-01-01');
    }

    console.log('---------------------------------\n');
    process.exit(0);
}

verify().catch(err => {
    console.error('Diagnostic failed:', err);
    process.exit(1);
});
