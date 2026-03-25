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
    cron.schedule('3 9 * * *', async () => {
        console.log('[CRON] Running daily 00:05 TH flight cross-check (Today only)...');
        await runScheduledCrossCheck();
    });
    
    console.log('✅ Registered Flight Cross-Check Scheduled Jobs (Orchestrator Mode)');
}

/**
 * Orchestrates the full flow: loops through all airports for today's cross-check
 */
export async function runScheduledCrossCheck() {
    // 1. Get airports (Arrow 1 -> 4: get airports)
    const airports = await flightCrossCheckRepository.getAllAirports();
    console.log(`[CRON] Detected ${airports.length} airports for cross-check: ${airports.join(', ')}`);
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    for (const airport of airports) {
        try {
            console.log(`[JOB] Starting flight cross-check for ${airport} on ${todayStr}...`);
            
            // 2. Scrape (Arrow 1 -> 2: scrape by date/airport)
            const scrapedFlights = await flightScrapeIntegration.runCrosscheckForDate(todayStr, airport);
            
            if (scrapedFlights.length > 0) {
                // 3. Compare & Save (Arrow 1 -> 3: cross-check result)
                const result = await flightCrossCheckService.findUpdatesCancelsAndNewFlights(scrapedFlights, todayStr, airport);
                
                // Logging discovery of new flights
                if (result.newFlights.length > 0) {
                    console.log(`[JOB]   Discovered ${result.newFlights.length} new flights for ${airport} not in DB.`);
                }
                console.log(`[JOB] Cross-check complete for ${airport}: ${result.summary.updatedCount} updated, ${result.summary.cancelledCount} cancelled.`);
            } else {
                console.log(`[JOB] No scrape results for ${airport} ${todayStr}. Skipping comparison.`);
            }

            // Production Safety: 10s pause between airports to release RAM/CPU
            console.log(`[CRON]   Waiting 10s before next airport...`);
            await new Promise(resolve => setTimeout(resolve, 10000));

        } catch (error) {
            console.error(`[JOB] Failed cross-check for ${airport} ${todayStr}:`, error);
        }
    }
}

/**
 * Exported for manual testing/scripts
 */
export async function runCrosscheckForDate(dateStr: string, airportCode: string = 'BKK') {
    const scrapedFlights = await flightScrapeIntegration.runCrosscheckForDate(dateStr, airportCode);
    if (scrapedFlights.length > 0) {
        return await flightCrossCheckService.findUpdatesCancelsAndNewFlights(scrapedFlights, dateStr, airportCode);
    }
    console.log(`[JOB] No scrape results for ${airportCode} ${dateStr}.`);
    return null;
}
