import { Router } from 'express';
import { SystemHealth } from '../utils/SystemHealth';
import { getLiveJobStatus, runScheduledCrossCheck } from '../jobs/flightCrossCheckJob';
import { runFutureFlightSync } from '../jobs/futureFlightSyncJob';

const router = Router();

/**
 * Secret Monitoring Endpoint
 * Path: /status-vt78-dashboard
 */
router.get('/status-vt78-dashboard', (req, res) => {
    try {
        const jobStatus = getLiveJobStatus();
        const systemHealth = SystemHealth.getMemoryStatus();

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            jobStatus,
            systemHealth
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * Manual trigger: full cross-check job
 * POST /api/system/trigger-crosscheck
 */
router.post('/trigger-crosscheck', (req, res) => {
    res.json({ success: true, message: 'Cross-check job triggered', timestamp: new Date().toISOString() });
    runScheduledCrossCheck().catch(err => console.error('[TRIGGER] cross-check failed:', err));
});

/**
 * Manual trigger: future flight sync job
 * POST /api/system/trigger-future-sync
 */
router.post('/trigger-future-sync', (req, res) => {
    res.json({ success: true, message: 'Future flight sync triggered', timestamp: new Date().toISOString() });
    runFutureFlightSync().catch(err => console.error('[TRIGGER] future sync failed:', err));
});

export default router;
