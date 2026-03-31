import { Router } from 'express';
import {
  saveSearch,
  savePriceStat,
  getStatistics,
  getPriceStatistics,
  getDashboardSummary,
  getDashboardContinents,
  getDashboardTopRanks,
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

// Get continent cards for the world dashboard
router.get('/dashboard-continents', getDashboardContinents);

// Get top rank tables for the world dashboard
router.get('/dashboard-top-ranks', getDashboardTopRanks);

export default router;

