import cron from 'node-cron';
import { format } from 'date-fns';
import { flightCrossCheckRepository } from '../repositories/FlightCrossCheckRepository';
import { flightCrossCheckService } from '../services/FlightCrossCheckService';
import { flightScrapeIntegration } from '../services/FlightScrapeIntegration';
import { CrossCheckMetricsModel, CrossCheckAirportMetric } from '../models/CrossCheckMetrics';
import { SystemHealth } from '../utils/SystemHealth';

/**
 * The Schedulers / Job Entry (Class 1)
 */
export function initFlightCrossCheckJobs() {
    // Daily schedule: 00:05 Thailand Time (17:05 UTC)
    cron.schedule('3 4 * * *', async () => {
        console.log('[CRON] Running daily 00:02 TH flight cross-check (Today only)...');
        await runScheduledCrossCheck();
    });

    console.log('✅ Registered Flight Cross-Check Scheduled Jobs (Orchestrator Mode)');
}

/**
 * State tracking for real-time monitoring
 */
let isJobRunning = false;
let currentBatchId: number | null = null;
let totalAirports = 0;
let completedAirports = 0;
let lastStartTime: Date | null = null;
let currentProcessingAirports: string[] = [];

/**
 * Orchestrates the full flow: loops through all airports for today's cross-check
 * Parallelization: Processes in chunks of 2 to reach < 10m goal
 */
export async function runScheduledCrossCheck() {
    const globalStartTime = Date.now();
    const airports = await flightCrossCheckRepository.getAllAirports();
    
    // Reset state for monitoring
    isJobRunning = true;
    totalAirports = airports.length;
    completedAirports = 0;
    lastStartTime = new Date();
    currentProcessingAirports = [];

    SystemHealth.logMemory('Batch Start');
    console.log(`[CRON] Detected ${airports.length} airports for cross-check: ${airports.join(', ')}`);

    // Reverted to UTC as requested
    const todayStr = new Date().toISOString().split('T')[0];
    console.log(`[CRON] UTC Today: ${todayStr}`);

    // CREATE BATCH
    let batchId: number;
    try {
        batchId = await CrossCheckMetricsModel.createBatch({
            run_date: todayStr,
            total_airports: airports.length,
            status: 'running'
        });
        currentBatchId = batchId;
        console.log(`[CRON] Created batch metrics record (ID: ${batchId}).`);
    } catch (err: any) {
        console.error(`[CRON] Failed to create batch record: ${err.message}`);
        return; // Stop if we can't record metrics? Or continue? Let's continue without metrics if needed, but here I'll return to be safe.
    }

    try {
        for (let i = 0; i < airports.length; i += 2) {
            const chunk = airports.slice(i, i + 2);
            console.log(`\n========================================================================`);
            console.log(`[CRON] Processing chunk: ${chunk.join(', ')} (${i + 1}-${i + chunk.length}/${airports.length})`);
            console.log(`========================================================================`);
            
            SystemHealth.logMemory(`Pre-Chunk ${Math.floor(i / 2) + 1}`);
            currentProcessingAirports = chunk;

            await Promise.all(chunk.map((airport, index) => {
                return runSingleAirportCrossCheck(airport, todayStr, batchId, index); // index (0 or 1) as workerId
            }));

            completedAirports += chunk.length;
            currentProcessingAirports = [];
            SystemHealth.logMemory(`Post-Chunk ${Math.floor(i / 2) + 1}`);

            // Safety pause between chunks
            if (i + 2 < airports.length) {
                console.log(`\n[CRON]   Chunk complete. Waiting 2s before next chunk...\n`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        const totalDurationInMs = Date.now() - globalStartTime;
        const totalDuration = totalDurationInMs / 1000 / 60;

        // UPDATE BATCH SUCCESS
        await CrossCheckMetricsModel.updateBatch(batchId, {
            total_duration_seconds: totalDurationInMs / 1000,
            status: 'success'
        });

        console.log(`\n[CRON] ========================================================================`);
        console.log(`[CRON] Daily cross-check batch (ID: ${batchId}) finished at ${todayStr}.`);
        console.log(`[CRON] Total execution time: ${totalDuration.toFixed(2)} minutes.`);
        console.log(`[CRON] ========================================================================\n`);
        
        isJobRunning = false;
        currentProcessingAirports = [];
    } catch (err: any) {
        isJobRunning = false;
        currentProcessingAirports = [];
        console.error(`[CRON] Batch ${batchId} failed:`, err);
        await CrossCheckMetricsModel.updateBatch(batchId, {
            total_duration_seconds: (Date.now() - globalStartTime) / 1000,
            status: 'failed',
            error_message: err.message
        });
    }
}

/**
 * Logic for a single airport cross-check (isolated for parallel usage)
 */
async function runSingleAirportCrossCheck(airport: string, dateStr: string, batchId: number, workerId: number = 0) {
    const startTime = Date.now();
    const maxRetries = 2; // Total 3 attempts
    const retryDelayMs = 20000; // 20 seconds

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            if (attempt > 1) {
                console.log(`[JOB-W${workerId}]   Retry attempt ${attempt - 1}/${maxRetries} for ${airport} (Waiting 20s)...`);
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            }

            console.log(`[JOB-W${workerId}] Starting cross-check for ${airport} on ${dateStr} (Attempt ${attempt}/${maxRetries + 1})...`);

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

                // Save Metric
                await CrossCheckMetricsModel.saveAirportMetric({
                    batch_id: batchId,
                    airport_code: airport,
                    duration_seconds: duration,
                    updated_count: result.summary.updatedCount || 0,
                    cancelled_count: result.summary.cancelledCount || 0,
                    new_flights_count: result.newFlights?.length || 0,
                    total_records: scrapedFlights.length,
                    status: 'success',
                    attempts: attempt
                });

                console.log(`[JOB-W${workerId}] Complete for ${airport}: ${result.summary.updatedCount} updated, ${result.summary.cancelledCount} cancelled in ${duration.toFixed(2)}s (${timePerRecord}s/record).`);
            } else {
                const duration = (Date.now() - startTime) / 1000;
                // Save empty metric
                await CrossCheckMetricsModel.saveAirportMetric({
                    batch_id: batchId,
                    airport_code: airport,
                    duration_seconds: duration,
                    updated_count: 0,
                    cancelled_count: 0,
                    new_flights_count: 0,
                    total_records: 0,
                    status: 'success',
                    attempts: attempt
                });
                console.log(`[JOB-W${workerId}] No scrape results for ${airport} ${dateStr} (took ${duration.toFixed(2)}s).`);
            }
            
            // If we reached here, it's a success (either with data or without). Exit the retry loop.
            break;

        } catch (error: any) {
            const duration = (Date.now() - startTime) / 1000;
            
            // If this was the last attempt, save the failed metric
            if (attempt === maxRetries + 1) {
                try {
                    await CrossCheckMetricsModel.saveAirportMetric({
                        batch_id: batchId,
                        airport_code: airport,
                        duration_seconds: duration,
                        updated_count: 0,
                        cancelled_count: 0,
                        new_flights_count: 0,
                        total_records: 0,
                        status: 'failed',
                        error_message: error.message,
                        attempts: attempt
                    });
                } catch (mErr) {
                    console.error(`[JOB-W${workerId}] Double failure: could not log failure metric:`, mErr);
                }
                console.error(`[JOB-W${workerId}] Final failure for ${airport} ${dateStr} after ${duration.toFixed(2)}s:`, error);
            } else {
                console.warn(`[JOB-W${workerId}] Attempt ${attempt} failed for ${airport}: ${error.message}.`);
            }
        }
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

/**
 * Returns the current live status for monitoring API
 */
export function getLiveJobStatus() {
    return {
        isRunning: isJobRunning,
        activeBatchId: currentBatchId,
        startTime: lastStartTime,
        progress: {
            completed: completedAirports,
            total: totalAirports,
            percent: totalAirports > 0 ? `${((completedAirports / totalAirports) * 100).toFixed(1)}%` : '0%'
        },
        currentlyProcessing: currentProcessingAirports
    };
}
