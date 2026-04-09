import { pool } from '../config/database';
import { getContinentMeta } from '../utils/continentMapper';

export interface Airport {
  id: number;
  code: string;
  name: string;
  city: string;
  country: string;
  country_code: string | null;
  country_name: string | null;
  airport_type: string | null;
  latitude: number | null;
  longitude: number | null;
  has_flight?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AirportInput {
  code: string;
  name: string;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  airport_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AirportCountrySummary {
  country: string;
  country_code: string | null;
  airport_count: number;
  continent_key: string;
  continent_label: string;
  continent_icon: string;
}

export class AirportModel {
  private static airportCountriesCache: {
    countries: AirportCountrySummary[];
    totalCountries: number;
    totalAirports: number;
    cachedAt: number;
  } | null = null;
  private static readonly AIRPORT_COUNTRIES_CACHE_TTL_MS = 10 * 60 * 1000;

  static invalidateAirportCountriesCache(): void {
    AirportModel.airportCountriesCache = null;
  }

  /**
   * Get or create an airport
   */
  static async upsertAirport(input: AirportInput): Promise<Airport> {
    const query = `
      INSERT INTO airports (
        code, name, city, country, country_code, country_name, airport_type, 
        latitude, longitude, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        city = EXCLUDED.city,
        country = EXCLUDED.country,
        country_code = EXCLUDED.country_code,
        country_name = EXCLUDED.country_name,
        airport_type = EXCLUDED.airport_type,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      input.code,
      input.name,
      input.city || null,
      input.country || null,
      input.country_code || null,
      input.country_name || null,
      input.airport_type || null,
      input.latitude || null,
      input.longitude || null,
    ]);

    return result.rows[0];
  }

  static readonly SEARCH_WHERE = `
    code ILIKE $1 OR
    name ILIKE $1 OR
    city ILIKE $1 OR
    country_name ILIKE $1 OR
    country_code ILIKE $1
  `;

  /**
   * Search airports by keyword (code, name, city, or country)
   */
  static async searchAirports(keyword: string, limit: number = 20): Promise<Airport[]> {
    const query = `
      SELECT * FROM airports
      WHERE ${AirportModel.SEARCH_WHERE}
      ORDER BY 
        CASE 
          WHEN code ILIKE $1 THEN 1 
          WHEN city ILIKE $1 THEN 2
          WHEN name ILIKE $1 THEN 3
          ELSE 4 
        END,
        airport_type = 'large_airport' DESC,
        name
      LIMIT $2
    `;

    const result = await pool.query(query, [`%${keyword}%`, limit]);
    return result.rows;
  }

  /**
   * Search airports and return items + total matching count
   */
  static async searchAirportsWithTotal(keyword: string, limit: number = 20): Promise<{ items: Airport[]; total: number }> {
    const countQuery = `
      SELECT COUNT(*)::int AS total FROM airports
      WHERE ${AirportModel.SEARCH_WHERE}
    `;
    const countResult = await pool.query(countQuery, [`%${keyword}%`]);
    const total = countResult.rows[0]?.total ?? 0;

    const dataQuery = `
      SELECT * FROM airports
      WHERE ${AirportModel.SEARCH_WHERE}
      ORDER BY 
        CASE 
          WHEN code ILIKE $1 THEN 1 
          WHEN city ILIKE $1 THEN 2
          WHEN name ILIKE $1 THEN 3
          ELSE 4 
        END,
        airport_type = 'large_airport' DESC,
        name
      LIMIT $2
    `;
    const dataResult = await pool.query(dataQuery, [`%${keyword}%`, limit]);
    return { items: dataResult.rows, total };
  }

  /**
   * Get popular airports/destinations
   * For now, returns major international hubs
   * Ensures BKK and DMK are always included for Bangkok
   */
  static async getPopularAirports(limit: number = 10): Promise<Airport[]> {
    // First, get BKK and DMK separately to ensure they're included
    const bangkokQuery = `
      SELECT * FROM airports
      WHERE code IN ('BKK', 'DMK')
      ORDER BY code
    `;
    const bangkokResult = await pool.query(bangkokQuery);
    const bangkokAirports = bangkokResult.rows;

    // Then get other popular airports
    const otherQuery = `
      SELECT * FROM airports
      WHERE airport_type = 'large_airport'
      AND code NOT IN ('BKK', 'DMK')
      AND (
        code IN ('HKT', 'CNX', 'SIN', 'NRT', 'ICN', 'LHR', 'CDG', 'DXB', 'SYD', 'JFK')
        OR country_code = 'TH'
      )
      ORDER BY 
        CASE WHEN country_code = 'TH' THEN 1 ELSE 2 END,
        name
      LIMIT $1
    `;
    const otherResult = await pool.query(otherQuery, [limit - bangkokAirports.length]);
    const otherAirports = otherResult.rows;

    // Combine: BKK and DMK first, then others
    return [...bangkokAirports, ...otherAirports];
  }

  /**
   * Get total number of airports in the database
   */
  static async getTotalCount(): Promise<number> {
    const result = await pool.query('SELECT COUNT(*)::int AS total FROM airports');
    return result.rows[0]?.total ?? 0;
  }

  /**
   * Get airport by code
   */
  static async getAirportByCode(code: string): Promise<Airport | null> {
    const result = await pool.query(
      'SELECT * FROM airports WHERE code = $1',
      [code]
    );

    return result.rows[0] || null;
  }

  /**
   * Get country summaries for airport directory UIs.
   */
  static async getAirportCountries(): Promise<{
    countries: AirportCountrySummary[];
    totalCountries: number;
    totalAirports: number;
  }> {
    const cached = AirportModel.airportCountriesCache;
    if (cached && Date.now() - cached.cachedAt < AirportModel.AIRPORT_COUNTRIES_CACHE_TTL_MS) {
      return {
        countries: cached.countries,
        totalCountries: cached.totalCountries,
        totalAirports: cached.totalAirports,
      };
    }

    const query = `
      SELECT
        COALESCE(country_name, country, 'Other') AS country,
        COALESCE(country_code, country, NULL) AS country_code,
        COUNT(*)::int AS airport_count
      FROM airports
      GROUP BY COALESCE(country_name, country, 'Other'), COALESCE(country_code, country, NULL)
      ORDER BY COALESCE(country_name, country, 'Other')
    `;

    const result = await pool.query(query);
    const countries = (result.rows as Array<{
      country: string;
      country_code: string | null;
      airport_count: number;
    }>).map((row) => {
      const continentMeta = getContinentMeta(row.country_code, row.country);
      return {
        country: row.country,
        country_code: row.country_code,
        airport_count: row.airport_count,
        continent_key: continentMeta.key,
        continent_label: continentMeta.label,
        continent_icon: continentMeta.icon,
      } satisfies AirportCountrySummary;
    });
    const totalAirports = countries.reduce((sum, country) => sum + country.airport_count, 0);

    AirportModel.airportCountriesCache = {
      countries,
      totalCountries: countries.length,
      totalAirports,
      cachedAt: Date.now(),
    };

    return {
      countries,
      totalCountries: countries.length,
      totalAirports,
    };
  }

  /**
   * Get all airports for a single country, resolved by country code or country name.
   */
  static async getAirportsByCountry(countryValue: string): Promise<Airport[]> {
    const normalizedValue = countryValue.trim();
    const isCountryCode = normalizedValue.length <= 3;

    const query = `
      WITH country_airports AS (
        SELECT *
        FROM airports
        WHERE ${isCountryCode
          ? '(country_code = $1 OR country = $1)'
          : '(country_name = $1 OR country = $1)'}
      ),
      active_codes AS (
        SELECT DISTINCT code
        FROM (
          SELECT origin AS code
          FROM routes
          WHERE origin IN (SELECT code FROM country_airports)
          UNION ALL
          SELECT destination AS code
          FROM routes
          WHERE destination IN (SELECT code FROM country_airports)
          UNION ALL
          SELECT dep_airport AS code
          FROM departure_flight_paths
          WHERE dep_airport IN (SELECT code FROM country_airports)
          UNION ALL
          SELECT arr_airport AS code
          FROM departure_flight_paths
          WHERE arr_airport IN (SELECT code FROM country_airports)
          UNION ALL
          SELECT dep_airport AS code
          FROM arrival_flight_paths
          WHERE dep_airport IN (SELECT code FROM country_airports)
          UNION ALL
          SELECT arr_airport AS code
          FROM arrival_flight_paths
          WHERE arr_airport IN (SELECT code FROM country_airports)
        ) active_pool
        WHERE code IS NOT NULL
      )
      SELECT
        country_airports.*,
        (active_codes.code IS NOT NULL) AS has_flight
      FROM country_airports
      LEFT JOIN active_codes ON active_codes.code = country_airports.code
      ORDER BY
        (active_codes.code IS NOT NULL) DESC,
        country_airports.airport_type = 'large_airport' DESC,
        country_airports.city NULLS LAST,
        country_airports.name,
        country_airports.code
    `;

    const result = await pool.query(query, [isCountryCode ? normalizedValue.toUpperCase() : normalizedValue]);
    return result.rows;
  }
}
