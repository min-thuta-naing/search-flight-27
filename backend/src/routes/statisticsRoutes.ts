import { Router } from 'express';
import {
  saveSearch,
  savePriceStat,
  getStatistics,
  getPriceStatistics,
  getDashboardSummary,
  getDashboardContinents,
  getDashboardContinentDetail,
  getDashboardTopAirportsContinent,
  getDashboardTopRoutesContinent,
  getDashboardContinentTrends,
  getDashboardTopRanks,
  getDashboardCountryOverview,
  getDashboardAirportOverview,
  getDashboardTopCountries,
  getDashboardTopAirports,
  getDashboardTopDestinations,
  clearDashboardCache,
  getDashboardDateBounds,
  getDashboardCacheStatus,
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

// Get continent detail for the drill-down dashboard
router.get('/dashboard-continent-detail', getDashboardContinentDetail);

// Get top airports for a specific continent
router.get('/dashboard-top-airports-continent', getDashboardTopAirportsContinent);

// Get top routes for a specific continent
router.get('/dashboard-top-routes-continent', getDashboardTopRoutesContinent);

// Get trend averages for continent chart modes (day/month/year)
router.get('/dashboard-continent-trends', getDashboardContinentTrends);

// Get top rank tables for the world dashboard
router.get('/dashboard-top-ranks', getDashboardTopRanks);

// Get country overview data for country drill-down dashboard
router.get('/dashboard-country-overview', getDashboardCountryOverview);

// Get airport overview data for airport drill-down dashboard
router.get('/dashboard-airport-overview', getDashboardAirportOverview);

// Get top countries for the world dashboard
router.get('/dashboard-top-countries', getDashboardTopCountries);

// Get top airports for the world dashboard
router.get('/dashboard-top-airports', getDashboardTopAirports);

// Get top destinations for the world dashboard
router.get('/dashboard-top-destinations', getDashboardTopDestinations);

// Get real min/max data bounds for dashboard preset calculations
router.get('/dashboard-date-bounds', getDashboardDateBounds);

// Read dashboard cache status
router.get('/dashboard-cache/status', getDashboardCacheStatus);

// Clear dashboard query cache manually
router.post('/dashboard-cache/clear', clearDashboardCache);

export default router;

