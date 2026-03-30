import { Router } from 'express';
import {
  saveSearch,
  savePriceStat,
  getStatistics,
  getPriceStatistics,
  getDashboardSummary,
} from '../controllers/statisticsController';

const router = Router();

// Save search query
router.post('/search', saveSearch);

// Save price recommendation
router.post('/price', savePriceStat);

// Get all statistics
router.get('/', getStatistics);

// Get price statistics
router.get('/price', getPriceStatistics);

// Get world dashboard summary from flight data
router.get('/dashboard-summary', getDashboardSummary);

export default router;

