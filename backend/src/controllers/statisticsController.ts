import { Request, Response, NextFunction } from 'express';
import { SearchStatisticsModel, PriceStatisticsModel } from '../models/SearchStatistics';
import { AirportModel } from '../models/Airport';
import { convertToAirportCode } from '../utils/airportCodeConverter';
import { DashboardSummaryService } from '../services/dashboardSummaryService';

/**
 * Save a search query to the database
 * POST /api/statistics/search
 */
export async function saveSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      origin,
      originName,
      destination,
      destinationName,
      durationRange,
      tripType,
    } = req.body;

    if (!origin || !destination) {
      res.status(400).json({
        error: 'Missing required fields: origin and destination',
      });
      return;
    }

    // Get user IP address (handle proxy headers)
    const userIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.connection.remoteAddress ||
      null;

    const userAgent = req.headers['user-agent'] || null;

    const record = await SearchStatisticsModel.saveSearch({
      origin,
      originName,
      destination,
      destinationName,
      durationRange,
      tripType,
      userIp: userIp || undefined,
      userAgent: userAgent || undefined,
    });

    res.json({ success: true, id: record.id });
  } catch (error) {
    next(error);
  }
}

/**
 * Save a price recommendation to the database
 * POST /api/statistics/price
 */
export async function savePriceStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      origin,
      originName,
      destination,
      destinationName,
      recommendedPrice,
      season,
      airline,
    } = req.body;

    if (!origin || !destination || recommendedPrice === undefined || !season) {
      res.status(400).json({
        error: 'Missing required fields: origin, destination, recommendedPrice, and season',
      });
      return;
    }

    const record = await PriceStatisticsModel.savePriceStat({
      origin,
      originName,
      destination,
      destinationName,
      recommendedPrice,
      season,
      airline,
    });

    res.json({ success: true, id: record.id });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all statistics
 * GET /api/statistics
 */
export async function getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { destination } = req.query;

    let countryCode: string | undefined;

    if (destination && typeof destination === 'string') {
      try {
        const airportCode = await convertToAirportCode(destination);
        const airport = await AirportModel.getAirportByCode(airportCode);
        if (airport) {
          countryCode = airport.country || undefined;
          console.log(`[statisticsController] Resolved destination ${destination} to country ${countryCode}`);
        }
      } catch (error) {
        console.warn(`[statisticsController] Failed to resolve country for destination: ${destination}`);
      }
    }

    const [
      totalSearches,
      mostSearchedDestination,
      mostSearchedDuration,
      popularDestinations,
      monthlyStats,
    ] = await Promise.all([
      SearchStatisticsModel.getTotalSearches(),
      SearchStatisticsModel.getMostSearchedDestination(1),
      SearchStatisticsModel.getMostSearchedDuration(1),
      SearchStatisticsModel.getPopularDestinations(5, countryCode),
      SearchStatisticsModel.getMonthlySearchStats(),
    ]);

    res.json({
      totalSearches,
      mostSearchedDestination: mostSearchedDestination[0] || null,
      mostSearchedDuration: mostSearchedDuration[0] || null,
      popularDestinations,
      monthlyStats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get price statistics
 * GET /api/statistics/price
 */
export async function getPriceStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { origin, destination } = req.query;

    const [averagePrice, priceTrend, searchTrend] = await Promise.all([
      PriceStatisticsModel.getAveragePrice(
        origin as string | undefined,
        destination as string | undefined
      ),
      PriceStatisticsModel.getPriceTrend(
        origin as string | undefined,
        destination as string | undefined
      ),
      SearchStatisticsModel.getSearchTrend(
        destination as string | undefined
      ),
    ]);

    res.json({
      averagePrice,
      priceTrend,
      searchTrend, // ✅ เพิ่ม search trend (จำนวนคนค้นหาเพิ่มขึ้น/ลดลง)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get world dashboard summary for the preset +/- date window
 * GET /api/statistics/dashboard-summary?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const summary = await DashboardSummaryService.getWorldSummary({
      centerDateInput: typeof date === 'string' ? date : undefined,
      windowDays,
      startDateInput: typeof start_date === 'string' ? start_date : undefined,
      endDateInput: typeof end_date === 'string' ? end_date : undefined,
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
}

/**
 * Get continent cards for the world dashboard
 * GET /api/statistics/dashboard-continents?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardContinents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const continents = await DashboardSummaryService.getWorldContinentCards({
      centerDateInput: typeof date === 'string' ? date : undefined,
      windowDays,
      startDateInput: typeof start_date === 'string' ? start_date : undefined,
      endDateInput: typeof end_date === 'string' ? end_date : undefined,
    });

    res.json(continents);
  } catch (error) {
    next(error);
  }
}

/**
 * Get continent detail for the drill-down dashboard
 * GET /api/statistics/dashboard-continent-detail?continent=Europe&date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardContinentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { continent, date, window_days, start_date, end_date, include_core, include_seasonal, include_top_routes } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!continent || typeof continent !== 'string') {
      res.status(400).json({
        error: 'Missing continent parameter',
        message: 'continent is required',
      });
      return;
    }

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const detail = await DashboardSummaryService.getContinentDetail({
      continent,
      centerDateInput: typeof date === 'string' ? date : undefined,
      windowDays,
      startDateInput: typeof start_date === 'string' ? start_date : undefined,
      endDateInput: typeof end_date === 'string' ? end_date : undefined,
      includeCore: typeof include_core === 'string' ? include_core !== 'false' : true,
      includeSeasonal: typeof include_seasonal === 'string' ? include_seasonal !== 'false' : true,
      includeTopRoutes: typeof include_top_routes === 'string' ? include_top_routes !== 'false' : true,
    });

    res.json(detail);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top airports for a specific continent (fast airport-focused query)
 * GET /api/statistics/dashboard-top-airports-continent?continent=Asia&window_days=15&limit=10
 */
export async function getDashboardTopAirportsContinent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { continent, date, window_days, start_date, end_date, limit } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;
    const topLimitRaw = typeof limit === 'string' ? Number.parseInt(limit, 10) : 10;
    const topLimit = Number.isNaN(topLimitRaw) ? 10 : Math.min(Math.max(topLimitRaw, 1), 50);

    if (!continent || typeof continent !== 'string') {
      res.status(400).json({
        error: 'Missing continent parameter',
        message: 'continent is required',
      });
      return;
    }

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const topAirports = await DashboardSummaryService.getContinentTopAirports({
      continent,
      centerDateInput: typeof date === 'string' ? date : undefined,
      windowDays,
      startDateInput: typeof start_date === 'string' ? start_date : undefined,
      endDateInput: typeof end_date === 'string' ? end_date : undefined,
      limit: topLimit,
    });

    res.json(topAirports);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top routes for a specific continent (fast route-focused query)
 * GET /api/statistics/dashboard-top-routes-continent?continent=Asia&window_days=15&limit=5
 */
export async function getDashboardTopRoutesContinent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { continent, date, window_days, start_date, end_date, limit } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;
    const topLimitRaw = typeof limit === 'string' ? Number.parseInt(limit, 10) : 5;
    const topLimit = Number.isNaN(topLimitRaw) ? 5 : Math.min(Math.max(topLimitRaw, 1), 20);

    if (!continent || typeof continent !== 'string') {
      res.status(400).json({
        error: 'Missing continent parameter',
        message: 'continent is required',
      });
      return;
    }

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const topRoutes = await DashboardSummaryService.getContinentTopRoutes({
      continent,
      centerDateInput: typeof date === 'string' ? date : undefined,
      windowDays,
      startDateInput: typeof start_date === 'string' ? start_date : undefined,
      endDateInput: typeof end_date === 'string' ? end_date : undefined,
      limit: topLimit,
    });

    res.json(topRoutes);
  } catch (error) {
    next(error);
  }
}

/**
 * Get average trend chart data for a specific continent
 * GET /api/statistics/dashboard-continent-trends?continent=Asia
 */
export async function getDashboardContinentTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { continent } = req.query;

    if (!continent || typeof continent !== 'string') {
      res.status(400).json({
        error: 'Missing continent parameter',
        message: 'continent is required',
      });
      return;
    }

    const trends = await DashboardSummaryService.getContinentTrendAverages({
      continent,
    });

    res.json(trends);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top country and airport ranks for the world dashboard
 * GET /api/statistics/dashboard-top-ranks?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardTopRanks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const topRanks = await DashboardSummaryService.getWorldTopRanks({
      centerDateInput: typeof date === 'string' ? date : undefined,
      windowDays,
      startDateInput: typeof start_date === 'string' ? start_date : undefined,
      endDateInput: typeof end_date === 'string' ? end_date : undefined,
    });

    res.json(topRanks);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top country ranks for the world dashboard
 * GET /api/statistics/dashboard-top-countries?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardTopCountries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const countries = await DashboardSummaryService.getWorldTopCountries({
      centerDateInput: typeof date === 'string' ? date : undefined,
      windowDays,
      startDateInput: typeof start_date === 'string' ? start_date : undefined,
      endDateInput: typeof end_date === 'string' ? end_date : undefined,
    });

    res.json(countries);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top airport ranks for the world dashboard
 * GET /api/statistics/dashboard-top-airports?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardTopAirports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const airports = await DashboardSummaryService.getWorldTopAirports({
      centerDateInput: typeof date === 'string' ? date : undefined,
      windowDays,
      startDateInput: typeof start_date === 'string' ? start_date : undefined,
      endDateInput: typeof end_date === 'string' ? end_date : undefined,
    });

    res.json(airports);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top destinations for the world dashboard
 * GET /api/statistics/dashboard-top-destinations?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardTopDestinations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const destinations = await DashboardSummaryService.getWorldTopDestinations({
      centerDateInput: typeof date === 'string' ? date : undefined,
      windowDays,
      startDateInput: typeof start_date === 'string' ? start_date : undefined,
      endDateInput: typeof end_date === 'string' ? end_date : undefined,
    });

    res.json(destinations);
  } catch (error) {
    next(error);
  }
}

