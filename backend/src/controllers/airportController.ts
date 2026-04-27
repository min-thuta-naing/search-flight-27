import { Request, Response, NextFunction } from 'express';
import { AirportModel } from '../models/Airport';

/**
 * Search airports and cities
 * GET /api/airports/search?keyword=bangkok&subType=AIRPORT
 *
 * Note: keep this endpoint unchanged for backward compatibility.
 * For lazy-loaded dropdown UIs, use GET /api/airports/countries first
 * and then GET /api/airports/by-country for the selected country,
 * because this search endpoint requires a keyword and returns a limited subset of matches.
 */
export async function searchAirports(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { keyword, subType } = req.query;

    if (!keyword || typeof keyword !== 'string') {
      res.status(400).json({
        error: 'keyword parameter is required',
      });
      return;
    }

    // Search airports from database with total count
    const { items, total } = await AirportModel.searchAirportsWithTotal(keyword);

    res.json({ data: items, total });
  } catch (error) {
    next(error);
  }
}

/**
 * Get airport countries summary for lazy-loaded directory UIs
 * GET /api/airports/countries
 */
export async function getAirportCountries(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { airportCountries, totalCountries, totalAirports } = await AirportModel.getAirportCountries();

    res.json({
      airportCountries,
      totalCountries,
      totalAirports,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get airports for a single country
 * GET /api/airports/by-country?country=CN
 */
export async function getAirportsByCountry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { country } = req.query;

    if (!country || typeof country !== 'string') {
      res.status(400).json({
        error: 'country parameter is required',
      });
      return;
    }

    const airports = await AirportModel.getAirportsByCountry(country);
    const airportsWithFlights = airports.filter((airport) => airport.has_flight !== false);

    res.json({
      country,
      airports,
      total: airportsWithFlights.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get airport details by code
 * GET /api/airports/:code
 */
export async function getAirportDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;

    if (!code) {
      res.status(400).json({
        error: 'Airport code is required',
      });
      return;
    }

    // Get airport from database
    const airport = await AirportModel.getAirportByCode(code.toUpperCase());

    if (!airport) {
      res.status(404).json({
        error: 'Airport not found',
        message: `Airport with code "${code.toUpperCase()}" not found in database`,
      });
      return;
    }

    res.json(airport);
  } catch (error) {
    next(error);
  }
}

/**
 * Get total airport count
 * GET /api/airports/count
 */
export async function getTotalCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const total = await AirportModel.getTotalCount();
    res.json({ total });
  } catch (error) {
    next(error);
  }
}

/**
 * Get popular airports
 * GET /api/airports/popular
 */
export async function getPopularAirports(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const airports = await AirportModel.getPopularAirports(limit);
    res.json(airports);
  } catch (error) {
    next(error);
  }
}

