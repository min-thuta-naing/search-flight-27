import cron from 'node-cron';
import { format } from 'date-fns';
import { flightCrossCheckRepository } from '../repositories/FlightCrossCheckRepository';
import { flightCrossCheckService } from '../services/FlightCrossCheckService';
import { flightScrapeIntegration } from '../services/FlightScrapeIntegration';

/**
 * The Schedulers / Job Entry (Class 1)
 */
export function initFlightCrossCheckJobs() {
    // Daily schedule: 00:05 Thailand Time (17:05 UTC)
    cron.schedule('23 8 * * *', async () => {
        console.log('[CRON] Running daily 00:02 TH flight cross-check (Today only)...');
        await runScheduledCrossCheck();
    });
    
    console.log('✅ Registered Flight Cross-Check Scheduled Jobs (Orchestrator Mode)');
}

/**
 * Orchestrates the full flow: loops through all airports for today's cross-check
 * Parallelization: Processes in chunks of 2 to reach < 10m goal
 */
export async function runScheduledCrossCheck() {
    const globalStartTime = Date.now();
    const airports = await flightCrossCheckRepository.getAllAirports();
    console.log(`[CRON] Detected ${airports.length} airports for cross-check: ${airports.join(', ')}`);
    
    // Reverted to UTC as requested
    const todayStr = new Date().toISOString().split('T')[0]; 
    
    console.log(`[CRON] UTC Today: ${todayStr}`);
    for (let i = 0; i < airports.length; i += 2) {
        const chunk = airports.slice(i, i + 2);
        console.log(`\n========================================================================`);
        console.log(`[CRON] Processing chunk: ${chunk.join(', ')} (${i + 1}-${i + chunk.length}/${airports.length})`);
        console.log(`========================================================================`);
        
        await Promise.all(chunk.map((airport, index) => {
            return runSingleAirportCrossCheck(airport, todayStr, index); // index (0 or 1) as workerId
        }));

        // Safety pause between chunks
        if (i + 2 < airports.length) {
            console.log(`\n[CRON]   Chunk complete. Waiting 2s before next chunk...\n`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    const totalDuration = (Date.now() - globalStartTime) / 1000 / 60;
    console.log(`\n[CRON] ========================================================================`);
    console.log(`[CRON] Daily cross-check batch for ${todayStr} finished.`);
    console.log(`[CRON] Total execution time: ${totalDuration.toFixed(2)} minutes.`);
    console.log(`[CRON] ========================================================================\n`);
}

/**
 * Logic for a single airport cross-check (isolated for parallel usage)
 */
async function runSingleAirportCrossCheck(airport: string, dateStr: string, workerId: number = 0) {
    const startTime = Date.now();
    try {
        console.log(`[JOB-W${workerId}] Starting cross-check for ${airport} on ${dateStr}...`);
        
        // 2. Scrape (Arrow 1 -> 2: scrape by date/airport)
        const scrapedFlights = await flightScrapeIntegration.runCrosscheckForDate(dateStr, airport, workerId);
        
        if (scrapedFlights.length > 0) {
            // 3. Get timezone
            const tz = await flightCrossCheckRepository.getAirportTimezone(airport) || 'UTC';

            // 4. Compare & Save
            const result = await flightCrossCheckService.findUpdatesCancelsAndNewFlights(scrapedFlights, dateStr, airport, tz);
            
            const duration = (Date.now() - startTime) / 1000;
            const totalProcessed = (result.summary.updatedCount || 0) + (result.summary.cancelledCount || 0) + (result.newFlights?.length || 0);
            const timePerRecord = totalProcessed > 0 ? (duration / totalProcessed).toFixed(2) : '0';

            if (result.newFlights && result.newFlights.length > 0) {
                console.log(`[JOB-W${workerId}]   Discovered ${result.newFlights.length} new flights for ${airport}.`);
            }
            console.log(`[JOB-W${workerId}] Complete for ${airport}: ${result.summary.updatedCount} updated, ${result.summary.cancelledCount} cancelled in ${duration.toFixed(2)}s (${timePerRecord}s/record).`);
        } else {
            const duration = (Date.now() - startTime) / 1000;
            console.log(`[JOB-W${workerId}] No scrape results for ${airport} ${dateStr} (took ${duration.toFixed(2)}s).`);
        }
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        console.error(`[JOB-W${workerId}] Failed for ${airport} ${dateStr} after ${duration.toFixed(2)}s:`, error);
    }
}

/**
 * Exported for manual testing/scripts
 */
export async function runCrosscheckForDate(dateStr: string, airportCode: string = 'BKK', workerId: number = 0) {
    const scrapedFlights = await flightScrapeIntegration.runCrosscheckForDate(dateStr, airportCode, workerId);
    if (scrapedFlights.length > 0) {
        const tz = await flightCrossCheckRepository.getAirportTimezone(airportCode) || 'UTC';
        return await flightCrossCheckService.findUpdatesCancelsAndNewFlights(scrapedFlights, dateStr, airportCode, tz);
    }
    console.log(`[JOB] No scrape results for ${airportCode} ${dateStr}.`);
    return null;
}
