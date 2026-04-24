import { futureSyncRepository } from '../repositories/FutureSyncRepository';
import { futureFlightSyncService } from '../services/futureFlightSyncService';

async function test() {
    console.log('--- FUTURE SYNC TEST ---');
    
    // 1. Initialize table
    console.log('Step 1: Initializing table...');
    await futureSyncRepository.initializeTable();
    
    // 2. Check next date
    const date = await futureSyncRepository.getNextSyncDate();
    console.log(`Step 2: Next sync date is ${date}`);
    
    // 3. Get enabled airports
    const airports = await futureSyncRepository.getEnabledAirports();
    console.log(`Step 3: ${airports.length} airports enabled for sync.`);
    
    console.log('--- TEST FINISHED (Logic only) ---');
    process.exit(0);
}

test().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
