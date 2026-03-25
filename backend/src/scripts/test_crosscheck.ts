import { runCrosscheckForDate } from '../jobs/flightCrossCheckJob';
import { format } from 'date-fns';

async function main() {
    console.log('--- STARTING MANUAL CROSSCHECK TEST ---');
    const today = format(new Date(), 'yyyy-MM-dd');
    // Testing CNX instead of BKK for faster verification (2-3 mins vs 8 mins)
    await runCrosscheckForDate(today, 'CNX');
    // If you want to test another: await runCrosscheckForDate(today, 'DMK');
    console.log('--- TEST COMPLETE ---');
    process.exit(0);
}

main();
