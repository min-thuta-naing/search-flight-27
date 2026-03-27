import { runScheduledCrossCheck } from '../jobs/flightCrossCheckJob';
import { format } from 'date-fns';

async function main() {
    console.log('--- STARTING PARALLEL CROSSCHECK TEST (CHUNKS OF 2) ---');
    await runScheduledCrossCheck();
    console.log('--- TEST COMPLETE ---');
    process.exit(0);
}

main();
