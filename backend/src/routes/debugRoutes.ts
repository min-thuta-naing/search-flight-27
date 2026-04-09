import { Router } from 'express';
import { debugGetContinentMap, debugRefreshDashboardCache } from '../controllers/debugController';

const router = Router();

// Debug: Get continent mapping for a country
router.get('/continent-map', debugGetContinentMap);

// Debug: Force refresh dashboard JSON cache snapshot
// POST /api/debug/dashboard-cache/refresh?clear=true&preset=focus&fullPreload=false
router.post('/dashboard-cache/refresh', debugRefreshDashboardCache);

export default router;
