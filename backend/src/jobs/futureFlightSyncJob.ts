import cron from 'node-cron';
import { futureSyncRepository } from '../repositories/FutureSyncRepository';
import { futureFlightSyncService } from '../services/futureFlightSyncService';

/**
 * Orchestrator for the Future Flight Sync Job.
 * Runs on an alternate-day schedule to pull 1 day of future data.
 */
export function initFutureFlightSyncJobs() {
    // Schedule: 01:00 UTC every 2 days
    // Logic: Runs on the 1st, 3rd, 5th, etc. of each month.
    // This satisfies the "alternate day" requirement.
    // Every other day schedule: 08:00 Thailand Time (01:00 UTC)
    cron.schedule('0 1 */2 * *', async () => {
        console.log('[FUTURE-CRON] Starting alternate-day future flight pull...');
        await runFutureFlightSync();
    });

    // Also ensure table is initialized at startup
    futureSyncRepository.initializeTable()
        .then(async () => {
            console.log('✅ Future Sync tracking table initialized');
        })
        .catch(err => console.error('❌ Failed to initialize future sync table:', err));

    console.log('✅ Registered Future Flight Sync Job (Alternate-Day Mode)');
}

/**
 * Main execution wrapper with basic state tracking for monitoring
 */
let isJobRunning = false;
let lastRunStartTime: Date | null = null;

export async function runFutureFlightSync() {
    if (isJobRunning) {
        console.warn('[FUTURE-CRON] Job already running. Skipping.');
        return;
    }

    isJobRunning = true;
    lastRunStartTime = new Date();
    const globalStartTime = Date.now();

    try {
        // Worker ID 10+ reserved for future sync to avoid profile conflicts with daily crosscheck (Worker 0, 1)
        await futureFlightSyncService.syncAllEnabledAirports(10);

        const durationMin = (Date.now() - globalStartTime) / 1000 / 60;
        console.log(`[FUTURE-CRON] Batch finished successfully in ${durationMin.toFixed(2)} minutes.`);
    } catch (err) {
        console.error('[FUTURE-CRON] Batch failed:', err);
    } finally {
        isJobRunning = false;
    }
}

/**
 * Live status for potential API monitoring
 */
export function getFutureSyncStatus() {
    return {
        isRunning: isJobRunning,
        lastStartTime: lastRunStartTime
    };
}
