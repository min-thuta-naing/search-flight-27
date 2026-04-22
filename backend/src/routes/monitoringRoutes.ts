import { Router } from 'express';
import { SystemHealth } from '../utils/SystemHealth';
import { getLiveJobStatus } from '../jobs/flightCrossCheckJob';

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

export default router;
