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
  getDashboardCountryAirlineMarket,
  getDashboardCountryFlowMap,
  getDashboardAirportOverview,
  getDashboardAirportInsights,
  getDashboardAirportTrends,
  getDashboardTopCountries,
  getDashboardTopAirports,
  getDashboardTopDestinations,
  getDashboardAirlines,
  getDashboardAirlineDetail,
  getDashboardAirlineTrend,
  getDashboardAirlineOriginAirports,
  getDashboardAirlineDestAirports,
  getDashboardAirlineDestCountries,
  getDashboardAirlineHomeBase,
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

// Get airline market share for a country (standalone panel query)
router.get('/dashboard-country-airline-market', getDashboardCountryAirlineMarket);

// Get country flow map data for country drill-down dashboard
router.get('/dashboard-country-flow-map', getDashboardCountryFlowMap);

// Get airport overview data for airport drill-down dashboard
router.get('/dashboard-airport-overview', getDashboardAirportOverview);

// Get airport insights data for airport drill-down dashboard panels
router.get('/dashboard-airport-insights', getDashboardAirportInsights);

// Get airport trend data for airport drill-down charts
router.get('/dashboard-airport-trends', getDashboardAirportTrends);

// Get top countries for the world dashboard
router.get('/dashboard-top-countries', getDashboardTopCountries);

// Get top airports for the world dashboard
router.get('/dashboard-top-airports', getDashboardTopAirports);

// Get top destinations for the world dashboard
router.get('/dashboard-top-destinations', getDashboardTopDestinations);

// Get paginated airline overview for the dashboard airlines panel
router.get('/dashboard-airlines', getDashboardAirlines);

// Get full detail for a single airline drill-down
router.get('/dashboard-airline-detail', getDashboardAirlineDetail);

// Get daily flight frequency trend for an airline
router.get('/dashboard-airline-trend', getDashboardAirlineTrend);

// Get paginated origin airports for an airline
router.get('/dashboard-airline-origin-airports', getDashboardAirlineOriginAirports);

// Get paginated destination airports for an airline
router.get('/dashboard-airline-dest-airports', getDashboardAirlineDestAirports);

// Get paginated destination countries for an airline
router.get('/dashboard-airline-dest-countries', getDashboardAirlineDestCountries);

// Get airline home base (top origin airport + country + continent) for StatusLine pre-population
router.get('/dashboard-airline-home-base', getDashboardAirlineHomeBase);

// Get real min/max data bounds for dashboard preset calculations
router.get('/dashboard-date-bounds', getDashboardDateBounds);

// Read dashboard cache status
router.get('/dashboard-cache/status', getDashboardCacheStatus);

// Clear dashboard query cache manually
router.post('/dashboard-cache/clear', clearDashboardCache);

export default router;

