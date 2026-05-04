import { pool } from '../config/database';

export interface FlightPriceRecord {
  id: number;
  route_id: number;
  airline_id: number;
  departure_date: Date;
  return_date: Date | null;
  price: number;
  base_price: number;
  departure_time: string;
  arrival_time: string;
  duration: number;
  flight_number: string;
  trip_type: 'one-way' | 'round-trip';
  season: 'high' | 'normal' | 'low';
  travel_class?: 'economy' | 'business' | 'first';
  price_level?: string;
  origin_group?: string;
  dep_airport?: string;
  arr_airport?: string;
  destination_name?: string; // Renamed from 'destination' to avoid conflict with route destination in join
  airline_name?: string;
  airline_code?: string;
  price_text?: string;
  scraped_at?: Date;
  source?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FlightPathRecord {
  id: number;
  route_id: number;
  airline_id: number;
  departure_date: Date;
  arrival_date: Date;
  departure_time: string;
  arrival_time: string;
  duration: number;
  flight_number: string;
  trip_type: string;
  travel_class?: string;
  stops: number;
  dep_airport?: string;
  arr_airport?: string;
  destination?: string;
  airline_name?: string;
  airline_code?: string;
  aircraft?: string;
  source?: string;
  status?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Route {
  id: number;
  origin: string;
  destination: string;
  base_price: number;
  avg_duration: number;
  created_at: Date;
  updated_at: Date;
}

export interface Airline {
  id: number;
  code: string;
  name: string;
  name_th: string;
  created_at: Date;
  updated_at: Date;
}

export class FlightModel {
  /**
   * Get flight prices for a specific route and date range
   */
  static async getFlightPrices(
    origin: string | string[],
    destination: string,
    startDate: Date,
    endDate?: Date,
    tripType: 'one-way' | 'round-trip' = 'round-trip',
    airlineIds?: number[],
    travelClass: 'economy' | 'business' | 'first' = 'economy',
    stops: 'direct' | 'connecting' | 'all' = 'all'
  ): Promise<FlightPriceRecord[]> {
    // Calculate endDate if not provided (default to 180 days)
    const finalEndDate = endDate || (() => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + 180);
      return date;
    })();

    // ✅ Convert dates to date-only format (YYYY-MM-DD) to match database date column
    // Database stores departure_date as DATE type, not TIMESTAMP
    // Use date_trunc to ensure we're comparing dates, not timestamps
    // Format: Extract date part from Date object (YYYY-MM-DD)
    const formatDateForQuery = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatDateForQuery(startDate);
    const endDateStr = formatDateForQuery(finalEndDate);

    // Log date range for debugging
    console.log('[FlightModel.getFlightPrices] Date range:', {
      origin,
      destination,
      startDate: startDateStr,
      endDate: endDateStr,
      startDateISO: startDate.toISOString(),
      endDateISO: finalEndDate.toISOString(),
      tripType,
      airlineIds: airlineIds?.length || 0,
      travelClass,
      stops,
    });

    // Check if travel_class column exists
    const columnExistsQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'flight_prices' 
        AND column_name = 'travel_class'
      ) as exists;
    `;

    let hasTravelClassColumn = false;
    try {
      const columnCheck = await pool.query(columnExistsQuery);
      hasTravelClassColumn = columnCheck.rows[0]?.exists || false;
    } catch (error) {
      // If check fails, assume column doesn't exist
      hasTravelClassColumn = false;
    }

    // Handle multiple origins (e.g., Bangkok has BKK and DMK)
    const originCodes = Array.isArray(origin) ? origin : [origin];

    let query = `
      SELECT 
        fp.*,
        fp.destination as destination_name,
        r.origin,
        r.destination,
        a.code as airline_code,
        a.name as airline_name,
        a.name_th as airline_name_th
      FROM flight_prices fp
      INNER JOIN routes r ON fp.route_id = r.id
      INNER JOIN airlines a ON fp.airline_id = a.id
      WHERE r.origin = ANY($1)
        AND r.destination = $2
        AND DATE(fp.departure_date) >= DATE($3)
        AND DATE(fp.departure_date) <= DATE($4)
        AND fp.trip_type = $5
        AND (fp.price IS NOT NULL AND fp.price > 0)
    `;

    const params: any[] = [originCodes, destination, startDateStr, endDateStr, tripType];
    let paramIndex = 6;

    // Only filter by travel_class if column exists
    // Query data directly from database based on selected travel class
    if (hasTravelClassColumn) {
      query += ` AND COALESCE(fp.travel_class, 'economy') = $${paramIndex}`;
      params.push(travelClass); // Query data for the selected travel class directly from database
      paramIndex++;
    }

    if (stops === 'direct') {
      query += ` AND fp.stops = 0`;
    } else if (stops === 'connecting') {
      query += ` AND fp.stops > 0`;
    }

    if (airlineIds && airlineIds.length > 0) {
      query += ` AND fp.airline_id = ANY($${paramIndex})`;
      params.push(airlineIds);
      paramIndex++;
    }

    // Add LIMIT to prevent querying too much data
    // เพิ่ม LIMIT เป็น 50000 เพื่อให้ครอบคลุมข้อมูลมากขึ้น (180 days * ~300 flights per day = 54000)
    // แต่ถ้าเป็นเดือนเดียว (30 วัน * ~300 flights = 9000) ก็เพียงพอ
    query += ` ORDER BY fp.departure_date, fp.price ASC LIMIT 50000`;

    const result = await pool.query(query, params);

    // Log query results for debugging
    const originStr = Array.isArray(origin) ? origin.join(', ') : origin;
    console.log(`[FlightModel.getFlightPrices] Found ${result.rows.length} flights for ${originStr} -> ${destination}`);

    return result.rows;
  }

  /**
   * Get available airlines for a route
   */
  static async getAvailableAirlines(
    origin: string | string[],
    destination: string
  ): Promise<Airline[]> {
    // Handle multiple origins (e.g., Bangkok has BKK and DMK)
    const originCodes = Array.isArray(origin) ? origin : [origin];

    const query = `
      SELECT DISTINCT a.*
      FROM airlines a
      INNER JOIN flight_prices fp ON a.id = fp.airline_id
      INNER JOIN routes r ON fp.route_id = r.id
      WHERE r.origin = ANY($1) AND r.destination = $2
      ORDER BY a.name
    `;

    const result = await pool.query(query, [originCodes, destination]);
    return result.rows;
  }

  /**
   * Get all airlines from database
   * Returns all airlines regardless of route
   */
  static async getAirlineByCode(code: string): Promise<Airline | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM airlines WHERE code = $1 LIMIT 1',
        [code.toUpperCase()],
      );
      return (result.rows[0] as Airline) ?? null;
    } catch (error: any) {
      const { logDatabaseError } = await import('../utils/errorLogger.js');
      logDatabaseError('FlightModel.getAirlineByCode', error, { code });
      if (error instanceof Error) throw error;
      throw new Error(error?.message || error?.detail || JSON.stringify(error) || 'Database error: Failed to get airline');
    }
  }

  static async getAllAirlines(): Promise<Airline[]> {
    try {
      const query = `
        SELECT *
        FROM airlines
        ORDER BY name
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error: any) {
      // Import logDatabaseError dynamically to avoid circular dependencies
      const { logDatabaseError } = await import('../utils/errorLogger.js');
      logDatabaseError('FlightModel.getAllAirlines', error, {});

      // Ensure we throw an Error instance
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || error?.detail || JSON.stringify(error) || 'Database error: Failed to get airlines');
    }
  }

  /**
   * Get a route by origin and destination
   */
  static async getRoute(origin: string, destination: string): Promise<Route | null> {
    const result = await pool.query(
      `SELECT id, origin, destination, base_price, avg_duration_minutes AS avg_duration, created_at, updated_at 
       FROM routes WHERE origin = $1 AND destination = $2`,
      [origin, destination]
    );

    return result.rows[0] || null;
  }

  /**
   * Get a route by ID
   */
  static async getRouteById(routeId: number): Promise<Route | null> {
    const result = await pool.query(
      `SELECT id, origin, destination, base_price, avg_duration_minutes AS avg_duration, created_at, updated_at 
       FROM routes WHERE id = $1`,
      [routeId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all routes
   */
  static async getAllRoutes(): Promise<Route[]> {
    const result = await pool.query(
      `SELECT id, origin, destination, base_price, avg_duration_minutes AS avg_duration, created_at, updated_at 
       FROM routes 
       ORDER BY origin, destination`
    );

    return result.rows;
  }

  /**
   * Get or create a route
   */
  static async getOrCreateRoute(
    origin: string,
    destination: string,
    basePrice: number,
    avgDuration: number
  ): Promise<Route> {
    try {
      // Use atomic ON CONFLICT to avoid race conditions
      const result = await pool.query(
        `INSERT INTO routes (origin, destination, base_price, avg_duration_minutes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (origin, destination) 
         DO UPDATE SET updated_at = NOW()
         RETURNING id, origin, destination, base_price, avg_duration_minutes AS avg_duration, created_at, updated_at`,
        [origin, destination, basePrice, avgDuration]
      );

      return result.rows[0];
    } catch (error: any) {
      // Fallback: If for some reason the above failed, try to just get it
      const existing = await this.getRoute(origin, destination);
      if (existing) return existing;
      throw error;
    }
  }

  /**
   * Get or create an airline
   */
  static async getOrCreateAirline(
    code: string,
    name: string,
    nameTh: string
  ): Promise<Airline> {
    try {
      // Use atomic ON CONFLICT to avoid race conditions
      const result = await pool.query(
        `INSERT INTO airlines (code, name, name_th, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (code) 
         DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [code, name, nameTh]
      );

      return result.rows[0];
    } catch (error: any) {
      // Fallback: If for some reason the above failed, try to just get it
      const existingResult = await pool.query(
        'SELECT * FROM airlines WHERE code = $1',
        [code]
      );

      if (existingResult.rows.length > 0) {
        return existingResult.rows[0];
      }
      throw error;
    }
  }

  /**
   * Bulk get or create airlines
   */
  static async bulkGetOrCreateAirlines(airlinesToCreate: Array<{ code: string, name: string, nameTh: string }>): Promise<Map<string, Airline>> {
    if (airlinesToCreate.length === 0) return new Map();

    const airlineMap = new Map<string, Airline>();
    
    // Process in chunks to avoid large query limits
    const chunkSize = 100;
    for (let i = 0; i < airlinesToCreate.length; i += chunkSize) {
      const chunk = airlinesToCreate.slice(i, i + chunkSize);
      
      const placeholders: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      chunk.forEach(a => {
        placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, NOW(), NOW())`);
        values.push(a.code, a.name, a.nameTh);
      });

      const query = `
        INSERT INTO airlines (code, name, name_th, created_at, updated_at)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (code) 
        DO UPDATE SET updated_at = NOW()
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      result.rows.forEach(row => airlineMap.set(row.code, row));
    }
    
    return airlineMap;
  }

  /**
   * Bulk get or create routes
   */
  static async bulkGetOrCreateRoutes(routesToCreate: Array<{ origin: string, destination: string, basePrice: number, avgDuration: number }>): Promise<Map<string, Route>> {
    if (routesToCreate.length === 0) return new Map();

    const routeMap = new Map<string, Route>();
    
    const chunkSize = 100;
    for (let i = 0; i < routesToCreate.length; i += chunkSize) {
      const chunk = routesToCreate.slice(i, i + chunkSize);
      
      const placeholders: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      chunk.forEach(r => {
        placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, NOW(), NOW())`);
        values.push(r.origin, r.destination, r.basePrice || 0, r.avgDuration || 0);
      });

      const query = `
        INSERT INTO routes (origin, destination, base_price, avg_duration_minutes, created_at, updated_at)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (origin, destination) 
        DO UPDATE SET updated_at = NOW()
        RETURNING id, origin, destination, base_price, avg_duration_minutes AS avg_duration, created_at, updated_at
      `;
      
      const result = await pool.query(query, values);
      result.rows.forEach(row => routeMap.set(`${row.origin}-${row.destination}`, row));
    }
    
    return routeMap;
  }

  /**
   * Insert or update flight price
   * Automatically saves previous values to history table before updating
   */
  static async upsertFlightPrice(
    routeId: number,
    airlineId: number,
    departureDate: Date,
    returnDate: Date | null,
    price: number,
    basePrice: number,
    departureTime: string,
    arrivalTime: string,
    duration: number,
    flightNumber: string,
    tripType: 'one-way' | 'round-trip',
    season: 'high' | 'normal' | 'low',
    data: {
      originGroup?: string;
      depAirport?: string;
      arrAirport?: string;
      destination?: string;
      airlineName?: string;
      airlineCode?: string;
      priceText?: string;
      source?: string;
      travelClass?: 'economy' | 'business' | 'first';
    } = {}
  ): Promise<FlightPriceRecord> {
    // Check if existing record exists
    const existingQuery = `
      SELECT * FROM flight_prices 
      WHERE route_id = $1 
        AND airline_id = $2 
        AND departure_date = $3 
        AND trip_type = $4
    `;

    const existingResult = await pool.query(existingQuery, [
      routeId,
      airlineId,
      departureDate,
      tripType,
    ]);

    // If existing record exists and price/data changed, save to history
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      const hasChanged =
        existing.price !== price ||
        existing.base_price !== basePrice ||
        existing.departure_time !== departureTime ||
        existing.arrival_time !== arrivalTime ||
        existing.duration !== duration ||
        existing.flight_number !== flightNumber ||
        existing.season !== season ||
        (existing.return_date?.toISOString() !== returnDate?.toISOString());

      if (hasChanged) {
        // Save to history table before updating
        try {
          await pool.query(`
            INSERT INTO flight_prices_history (
              route_id, airline_id, departure_date, return_date, price, base_price,
              departure_time, arrival_time, duration, flight_number, trip_type, season,
              recorded_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          `, [
            existing.route_id,
            existing.airline_id,
            existing.departure_date,
            existing.return_date,
            existing.price,
            existing.base_price,
            existing.departure_time,
            existing.arrival_time,
            existing.duration,
            existing.flight_number,
            existing.trip_type,
            existing.season,
          ]);
        } catch (historyError) {
          // Log error but don't fail the update if history table doesn't exist yet
          console.warn('Failed to save flight price history (this is OK if migration 009 not run yet):', historyError);
        }
      }
    }

    // Perform the upsert
    // ✅ Updated constraint: Now includes flight_number to allow multiple flights per day
    const query = `
      INSERT INTO flight_prices (
        route_id, airline_id, departure_date, return_date, price, base_price,
        departure_time, arrival_time, duration, flight_number, trip_type, season,
        origin_group, dep_airport, arr_airport, destination, airline_name, airline_code,
        price_text, source, travel_class,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      ON CONFLICT (route_id, airline_id, departure_date, trip_type, flight_number)
      DO UPDATE SET
        return_date = EXCLUDED.return_date,
        price = EXCLUDED.price,
        base_price = EXCLUDED.base_price,
        departure_time = EXCLUDED.departure_time,
        arrival_time = EXCLUDED.arrival_time,
        duration = EXCLUDED.duration,
        season = EXCLUDED.season,
        origin_group = EXCLUDED.origin_group,
        dep_airport = EXCLUDED.dep_airport,
        arr_airport = EXCLUDED.arr_airport,
        destination = EXCLUDED.destination,
        airline_name = EXCLUDED.airline_name,
        airline_code = EXCLUDED.airline_code,
        price_text = EXCLUDED.price_text,
        source = EXCLUDED.source,
        travel_class = EXCLUDED.travel_class,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      routeId,
      airlineId,
      departureDate,
      returnDate,
      price,
      basePrice,
      departureTime,
      arrivalTime,
      duration,
      flightNumber,
      tripType,
      season,
      data.originGroup || null,
      data.depAirport || null,
      data.arrAirport || null,
      data.destination || null,
      data.airlineName || null,
      data.airlineCode || null,
      data.priceText || null,
      data.source || null,
      data.travelClass || 'economy',
    ]);

    return result.rows[0];
  }

  /**
   * Batch insert flight prices (much faster than individual upserts)
   * Uses PostgreSQL multi-value INSERT with ON CONFLICT for better performance
   */
  static async batchInsertFlightPrices(
    flightPrices: Array<{
      route_id: number;
      airline_id: number;
      departure_date: Date;
      return_date?: Date | null;
      price?: number | null;
      base_price?: number | null;
      departure_time: Date | string;
      arrival_time: Date | string;
      duration: number;
      flight_number: string;
      trip_type: 'one-way' | 'round-trip';
      season?: 'high' | 'normal' | 'low' | null;
      travel_class?: string;
      search_date?: Date | null;
      airplane?: string | null;
      stops?: number;
      carbon_emissions?: number | null;
      legroom?: string | null;
      often_delayed?: boolean;
      lowest_price?: number | null;
      price_level?: string | null;
      origin_group?: string | null;
      dep_airport?: string | null;
      arr_airport?: string | null;
      destination?: string | null;
      airline_name?: string | null;
      airline_code?: string | null;
      price_text?: string | null;
      source?: string | null;
    }>
  ): Promise<void> {
    if (flightPrices.length === 0) {
      return;
    }

    // Use multi-value INSERT with ON CONFLICT for upsert behavior
    // Process in chunks to avoid query size limits
    const chunkSize = 500;
    for (let i = 0; i < flightPrices.length; i += chunkSize) {
      const chunk = flightPrices.slice(i, i + chunkSize);

      // Build values array
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      chunk.forEach((fp) => {
        const placeholdersRow: string[] = [];
        placeholdersRow.push(`$${paramIndex++}`); // route_id
        placeholdersRow.push(`$${paramIndex++}`); // airline_id
        placeholdersRow.push(`$${paramIndex++}`); // departure_date
        placeholdersRow.push(`$${paramIndex++}`); // return_date
        placeholdersRow.push(`$${paramIndex++}`); // price
        placeholdersRow.push(`$${paramIndex++}`); // base_price
        placeholdersRow.push(`$${paramIndex++}`); // departure_time
        placeholdersRow.push(`$${paramIndex++}`); // arrival_time
        placeholdersRow.push(`$${paramIndex++}`); // duration
        placeholdersRow.push(`$${paramIndex++}`); // flight_number
        placeholdersRow.push(`$${paramIndex++}`); // trip_type
        placeholdersRow.push(`$${paramIndex++}`); // travel_class
        placeholdersRow.push(`$${paramIndex++}`); // season
        placeholdersRow.push(`$${paramIndex++}`); // search_date
        placeholdersRow.push(`$${paramIndex++}`); // airplane
        placeholdersRow.push(`$${paramIndex++}`); // stops
        placeholdersRow.push(`$${paramIndex++}`); // carbon_emissions
        placeholdersRow.push(`$${paramIndex++}`); // legroom
        placeholdersRow.push(`$${paramIndex++}`); // often_delayed
        placeholdersRow.push(`$${paramIndex++}`); // lowest_price
        placeholdersRow.push(`$${paramIndex++}`); // price_level
        placeholdersRow.push(`$${paramIndex++}`); // origin_group
        placeholdersRow.push(`$${paramIndex++}`); // dep_airport
        placeholdersRow.push(`$${paramIndex++}`); // arr_airport
        placeholdersRow.push(`$${paramIndex++}`); // destination
        placeholdersRow.push(`$${paramIndex++}`); // airline_name
        placeholdersRow.push(`$${paramIndex++}`); // airline_code
        placeholdersRow.push(`$${paramIndex++}`); // price_text
        placeholdersRow.push(`$${paramIndex++}`); // source
        placeholdersRow.push(`NOW()`); // created_at
        placeholdersRow.push(`NOW()`); // updated_at

        placeholders.push(`(${placeholdersRow.join(', ')})`);

        values.push(
          fp.route_id,
          fp.airline_id,
          fp.departure_date,
          fp.return_date || null,
          fp.price ?? null,
          fp.base_price ?? null,
          fp.departure_time,
          fp.arrival_time,
          fp.duration,
          fp.flight_number,
          fp.trip_type,
          fp.travel_class || 'economy',
          fp.season || null,
          fp.search_date || null,
          fp.airplane || null,
          fp.stops ?? 0,
          fp.carbon_emissions || null,
          fp.legroom || null,
          fp.often_delayed || false,
          fp.lowest_price || null,
          fp.price_level || null,
          fp.origin_group || null,
          fp.dep_airport || null,
          fp.arr_airport || null,
          fp.destination || null,
          fp.airline_name || null,
          fp.airline_code || null,
          fp.price_text || null,
          fp.source || null
        );
      });

      const query = `
        INSERT INTO flight_prices (
          route_id, airline_id, departure_date, return_date, price, base_price,
          departure_time, arrival_time, duration, flight_number, trip_type, travel_class,
          season, search_date, airplane, stops, carbon_emissions, legroom, often_delayed,
          lowest_price, price_level, origin_group, dep_airport, arr_airport, destination,
          airline_name, airline_code, price_text, source, created_at, updated_at
        )
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (route_id, airline_id, departure_date, trip_type, flight_number, travel_class)
        DO UPDATE SET
          return_date = EXCLUDED.return_date,
          price = EXCLUDED.price,
          base_price = EXCLUDED.base_price,
          arrival_time = EXCLUDED.arrival_time,
          duration = EXCLUDED.duration,
          travel_class = EXCLUDED.travel_class,
          season = EXCLUDED.season,
          search_date = EXCLUDED.search_date,
          airplane = EXCLUDED.airplane,
          stops = EXCLUDED.stops,
          carbon_emissions = EXCLUDED.carbon_emissions,
          legroom = EXCLUDED.legroom,
          often_delayed = EXCLUDED.often_delayed,
          lowest_price = EXCLUDED.lowest_price,
          price_level = EXCLUDED.price_level,
          origin_group = EXCLUDED.origin_group,
          dep_airport = EXCLUDED.dep_airport,
          arr_airport = EXCLUDED.arr_airport,
          destination = EXCLUDED.destination,
          airline_name = EXCLUDED.airline_name,
          airline_code = EXCLUDED.airline_code,
          price_text = EXCLUDED.price_text,
          source = EXCLUDED.source,
          updated_at = NOW()
      `;

      await pool.query(query, values);
    }
  }

  /**
   * Batch insert international flight info (much faster than individual upserts)
   * Uses PostgreSQL multi-value INSERT with ON CONFLICT for better performance
   */
  static async batchInsertFlightPaths(
    flightPaths: Array<{
      route_id: number;
      airline_id: number;
      departure_date: Date;
      arrival_date: Date;
      departure_time: Date | string;
      arrival_time: Date | string;
      duration: number;
      flight_number: string;
      trip_type: string;
      travel_class?: string;
      stops?: number;
      dep_airport?: string | null;
      arr_airport?: string | null;
      destination?: string | null;
      airline_name?: string | null;
      airline_code?: string | null;
      aircraft?: string | null;
      source?: string | null;
      status?: string | null;
    }>,
    isDeparture: boolean = true
  ): Promise<void> {
    if (flightPaths.length === 0) {
      return;
    }

    const tableName = isDeparture ? 'departure_flight_paths' : 'arrival_flight_paths';

    // Use multi-value INSERT with ON CONFLICT for upsert behavior
    // Process in chunks to avoid query size limits
    const chunkSize = 500;
    for (let i = 0; i < flightPaths.length; i += chunkSize) {
      const chunk = flightPaths.slice(i, i + chunkSize);

      // Build values array
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      chunk.forEach((fp) => {
        const placeholdersRow: string[] = [];
        placeholdersRow.push(`$${paramIndex++}`); // route_id
        placeholdersRow.push(`$${paramIndex++}`); // airline_id
        placeholdersRow.push(`$${paramIndex++}`); // departure_date
        placeholdersRow.push(`$${paramIndex++}`); // arrival_date
        placeholdersRow.push(`$${paramIndex++}`); // departure_time
        placeholdersRow.push(`$${paramIndex++}`); // arrival_time
        placeholdersRow.push(`$${paramIndex++}`); // duration
        placeholdersRow.push(`$${paramIndex++}`); // flight_number
        placeholdersRow.push(`$${paramIndex++}`); // trip_type
        placeholdersRow.push(`$${paramIndex++}`); // travel_class
        placeholdersRow.push(`$${paramIndex++}`); // stops
        placeholdersRow.push(`$${paramIndex++}`); // dep_airport
        placeholdersRow.push(`$${paramIndex++}`); // arr_airport
        placeholdersRow.push(`$${paramIndex++}`); // destination
        placeholdersRow.push(`$${paramIndex++}`); // airline_name
        placeholdersRow.push(`$${paramIndex++}`); // airline_code
        placeholdersRow.push(`$${paramIndex++}`); // aircraft
        placeholdersRow.push(`$${paramIndex++}`); // source
        placeholdersRow.push(`$${paramIndex++}`); // status
        placeholdersRow.push(`NOW()`); // created_at
        placeholdersRow.push(`NOW()`); // updated_at

        placeholders.push(`(${placeholdersRow.join(', ')})`);

        values.push(
          fp.route_id,
          fp.airline_id,
          fp.departure_date,
          fp.arrival_date,
          fp.departure_time,
          fp.arrival_time,
          fp.duration,
          fp.flight_number,
          fp.trip_type,
          fp.travel_class || 'economy',
          fp.stops ?? 0,
          fp.dep_airport || null,
          fp.arr_airport || null,
          fp.destination || null,
          fp.airline_name || null,
          fp.airline_code || null,
          fp.aircraft || null,
          fp.source || null,
          fp.status || 'planned'
        );
      });

      const dateColumn = isDeparture ? 'departure_date' : 'arrival_date';

      const query = `
        INSERT INTO ${tableName} (
          route_id, airline_id, departure_date, arrival_date, departure_time, arrival_time,
          duration, flight_number, trip_type, travel_class, stops,
          dep_airport, arr_airport, destination, airline_name, airline_code,
          aircraft, source, status, created_at, updated_at
        )
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (route_id, airline_id, ${dateColumn}, trip_type, flight_number, departure_time)
        DO UPDATE SET
          arrival_time = EXCLUDED.arrival_time,
          duration = EXCLUDED.duration,
          travel_class = EXCLUDED.travel_class,
          stops = EXCLUDED.stops,
          dep_airport = EXCLUDED.dep_airport,
          arr_airport = EXCLUDED.arr_airport,
          destination = EXCLUDED.destination,
          airline_name = EXCLUDED.airline_name,
          airline_code = EXCLUDED.airline_code,
          aircraft = EXCLUDED.aircraft,
          source = EXCLUDED.source,
          status = EXCLUDED.status,
          updated_at = NOW()
      `;

      await pool.query(query, values);
    }
  }

  /**
   * Get price statistics for a route
   */
  static async getPriceStatistics(
    origin: string,
    destination: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    min: number;
    max: number;
    avg: number;
    count: number;
  }> {
    let query = `
        SELECT
        MIN(price) as min,
          MAX(price) as max,
          AVG(price) as avg,
          COUNT(*) as count
      FROM flight_prices fp
      INNER JOIN routes r ON fp.route_id = r.id
      WHERE r.origin = $1 AND r.destination = $2
          `;

    const params: any[] = [origin, destination];

    if (startDate) {
      query += ` AND fp.departure_date >= $3`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND fp.departure_date <= $${params.length + 1} `;
      params.push(endDate);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Get average prices by day of week for a route
   */
  static async getAveragePricesByDayOfWeek(
    origin: string | string[],
    destination: string,
    travelClass: 'economy' | 'business' | 'first' = 'economy'
  ): Promise<Array<{
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    averagePrice: number;
  }>> {
    const origins = Array.isArray(origin) ? origin : [origin];
    const placeholders = origins.map((_, i) => `$${i + 1} `).join(', ');

    const query = `
        SELECT
        EXTRACT(DOW FROM fp.departure_date):: INTEGER as day_of_week,
          AVG(fp.price):: DECIMAL(10, 2) as average_price
      FROM flight_prices fp
      INNER JOIN routes r ON fp.route_id = r.id
      WHERE r.origin = ANY(ARRAY[${placeholders}])
        AND r.destination = $${origins.length + 1}
        AND fp.price IS NOT NULL
        AND fp.price > 0
        AND fp.travel_class = $${origins.length + 2}
      GROUP BY EXTRACT(DOW FROM fp.departure_date)
      ORDER BY day_of_week
    `;

    const params = [...origins, destination, travelClass];
    const result = await pool.query(query, params);

    return result.rows.map((row: any) => ({
      dayOfWeek: parseInt(row.day_of_week),
      averagePrice: parseFloat(row.average_price),
    }));
  }

  /**
   * Get average prices by month for a route
   */
  static async getAveragePricesByMonth(
    origin: string | string[],
    destination: string,
    travelClass: 'economy' | 'business' | 'first' = 'economy'
  ): Promise<Array<{
    month: number; // 1-12
    averagePrice: number;
  }>> {
    const origins = Array.isArray(origin) ? origin : [origin];
    const placeholders = origins.map((_, i) => `$${i + 1} `).join(', ');

    const query = `
        SELECT
        EXTRACT(MONTH FROM fp.departure_date):: INTEGER as month,
          AVG(fp.price):: DECIMAL(10, 2) as average_price
      FROM flight_prices fp
      INNER JOIN routes r ON fp.route_id = r.id
      WHERE r.origin = ANY(ARRAY[${placeholders}])
        AND r.destination = $${origins.length + 1}
        AND fp.price IS NOT NULL
        AND fp.price > 0
        AND fp.travel_class = $${origins.length + 2}
      GROUP BY EXTRACT(MONTH FROM fp.departure_date)
      ORDER BY month
    `;

    const params = [...origins, destination, travelClass];
    const result = await pool.query(query, params);

    return result.rows.map((row: any) => ({
      month: parseInt(row.month),
      averagePrice: parseFloat(row.average_price),
    }));
  }

  /**
   * Get international flight info for a specific route and date range
   */
  static async getIntlFlights(
    origin: string | string[],
    destination: string,
    startDate: Date,
    endDate?: Date,
    tripType?: string,
    airlineIds?: number[],
    travelClass?: string,
    stops: 'direct' | 'connecting' | 'all' = 'all',
    isDeparture: boolean = true
  ): Promise<FlightPathRecord[]> {
    const finalEndDate = endDate || (() => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + 30); // Default to 30 days for intl info
      return date;
    })();

    const formatDateForQuery = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatDateForQuery(startDate);
    const endDateStr = formatDateForQuery(finalEndDate);

    const originCodes = Array.isArray(origin) ? origin : [origin];
    // isDeparture should be passed as an argument or determined by the caller
    // but here it was hardcoded to BKK/DMK. Let's fix it by adding it as a parameter if needed,
    // or just keeping the existing parameter if it was meant to be the source of truth.
    // Actually, getIntlFlights signature has it as an optional trailing param if I recall.
    // Wait, line 894: static async getIntlFlights(..., isDeparture: boolean = true)
    const tableName = isDeparture ? 'departure_flight_paths' : 'arrival_flight_paths';

    let query = `
        SELECT
        ifi.*,
          r.origin,
          r.destination,
          a.code as airline_code,
          a.name as airline_name,
          a.name_th as airline_name_th
      FROM ${tableName} ifi
      INNER JOIN routes r ON ifi.route_id = r.id
      INNER JOIN airlines a ON ifi.airline_id = a.id
      WHERE r.origin = ANY($1)
        AND r.destination = $2
        AND DATE(ifi.${isDeparture ? 'departure_date' : 'arrival_date'}) >= DATE($3)
        AND DATE(ifi.${isDeparture ? 'departure_date' : 'arrival_date'}) <= DATE($4)
        AND ifi.status != 'cancelled'
          `;

    const params: any[] = [originCodes, destination, startDateStr, endDateStr];
    let paramIndex = 5;

    if (tripType) {
      query += ` AND ifi.trip_type = $${paramIndex} `;
      params.push(tripType);
      paramIndex++;
    }

    if (travelClass) {
      query += ` AND ifi.travel_class = $${paramIndex} `;
      params.push(travelClass);
      paramIndex++;
    }

    if (stops === 'direct') {
      query += ` AND ifi.stops = 0`;
    } else if (stops === 'connecting') {
      query += ` AND ifi.stops > 0`;
    }

    if (airlineIds && airlineIds.length > 0) {
      query += ` AND ifi.airline_id = ANY($${paramIndex})`;
      params.push(airlineIds);
      paramIndex++;
    }

    query += ` ORDER BY ifi.${isDeparture ? 'departure_date' : 'arrival_date'}, ifi.departure_time ASC LIMIT 5000`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get flight route analysis data from flight_paths
   */
  static async getIntlFlightAnalysis(
    airportCode: string,
    isDeparture: boolean,
    startDate: Date,
    endDate: Date,
    selectedDate?: Date
  ): Promise<{
    dailyFrequency: Array<{ date: string; flights: number }>;
    routes: Array<{
      departureCode: string;
      departureName: string;
      arrivalCode: string;
      arrivalCity: string;
      direct: boolean;
      airlineCode: string;
      airlineName: string;
      flightNumber: string;
      departureTime: string;
      duration: string;
    }>;
    summary: {
      avgFlightsPerDay: number;
      peakHourRange: string;
      mostActiveCarrier: string;
      totalFlights: number;
    };
  }> {
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const airportParam = airportCode.toUpperCase();

    const startDateStr = formatLocalDate(startDate);
    const endDateStr = formatLocalDate(endDate);

    const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : null;

    const tableName = isDeparture ? 'departure_flight_paths' : 'arrival_flight_paths';

    // 1. Daily Frequency (Monthly Trend)
    const dailyQuery = `
        SELECT
        ${isDeparture ? 'departure_date' : 'arrival_date'} as date,
          COUNT(*):: INTEGER as flights
      FROM ${tableName}
      WHERE ${isDeparture ? 'dep_airport' : 'arr_airport'} = $1
        AND ${isDeparture ? 'departure_date' : 'arrival_date'} >= $2
        AND ${isDeparture ? 'departure_date' : 'arrival_date'} <= $3
        AND status != 'cancelled'
      GROUP BY ${isDeparture ? 'departure_date' : 'arrival_date'}
      ORDER BY date
          `;
    const dailyResult = await pool.query(dailyQuery, [airportParam, startDateStr, endDateStr]);

    console.log(`[FlightModel] Analysis for ${airportCode} (${isDeparture ? 'Dep' : 'Arr'})`);
    console.log(`[FlightModel] Date Range: ${startDateStr} to ${endDateStr}`);
    if (selectedDateStr) {
      console.log(`[FlightModel] Mode: Single Date Analysis (${selectedDateStr})`);
    } else {
      console.log(`[FlightModel] Mode: Range Analysis (Stats calculated over full range)`);
    }

    // Calculate days difference
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // If range is small (<= 60 days), return ALL flights (Daily view)
    // If range is large, return DISTINCT routes (Schedule view)
    const useDistinct = diffDays > 60;

    // 2. Routes List (Specific to Selected Date - including flight number, departure time, duration)
    const routesQuery = `
      SELECT ${useDistinct ? 'DISTINCT ON(dep_airport, arr_airport, airline_code, flight_number, departure_time)' : ''}
        departure_date,
        arrival_date,
        dep_airport as departure_code,
        arr_airport as arrival_code,
        destination as destination_name,
        airline_code,
        airline_name,
        flight_number,
        stops = 0 as direct,
        departure_time,
        duration,
        dep_airport_ref.name as departure_airport_name,
        arr_airport_ref.name as arrival_airport_name,
        dep_airport_ref.country_name as departure_country_name,
        dep_airport_ref.country_code as departure_country_code,
        arr_airport_ref.country_name as arrival_country_name,
        arr_airport_ref.country_code as arrival_country_code
      FROM ${tableName}
      -- Join airport reference data so the route list can show full airport names
      -- Normalize airport codes in the join because flight-path records can carry mixed case or padded values
      LEFT JOIN airports dep_airport_ref ON UPPER(TRIM(dep_airport_ref.code)) = UPPER(TRIM(dep_airport))
      LEFT JOIN airports arr_airport_ref ON UPPER(TRIM(arr_airport_ref.code)) = UPPER(TRIM(arr_airport))
      WHERE ${isDeparture ? 'dep_airport' : 'arr_airport'} = $1
        ${selectedDateStr
        ? `AND ${isDeparture ? 'departure_date' : 'arrival_date'} = $2`
        : `AND ${isDeparture ? 'departure_date' : 'arrival_date'} >= $2 AND ${isDeparture ? 'departure_date' : 'arrival_date'} <= $3`
      }
        AND status != 'cancelled'
      ORDER BY ${useDistinct ? 'dep_airport, arr_airport, airline_code, flight_number, departure_time' : 'departure_date, departure_time'}
          `;

    const routesParams = selectedDateStr
      ? [airportParam, selectedDateStr]
      : [airportParam, startDateStr, endDateStr];

    const routesResult = await pool.query(routesQuery, routesParams);

    // 3. Summary Stats (Stats for Selected Date, except average which is monthly)
    const summaryQuery = `
      WITH day_stats AS(
            SELECT 
          airline_code,
            EXTRACT(HOUR FROM departure_time) as dep_hour,
            COUNT(*) as flight_count
        FROM ${tableName}
        WHERE ${isDeparture ? 'dep_airport' : 'arr_airport'} = $1
          ${selectedDateStr
        ? `AND ${isDeparture ? 'departure_date' : 'arrival_date'} = $2`
        : `AND ${isDeparture ? 'departure_date' : 'arrival_date'} >= $2 AND ${isDeparture ? 'departure_date' : 'arrival_date'} <= $3`
      }
        AND status != 'cancelled'
        GROUP BY airline_code, dep_hour
          ),
          month_stats AS(
            SELECT 
          COUNT(*):: INTEGER as total_flights_month,
            COUNT(DISTINCT ${isDeparture ? 'departure_date' : 'arrival_date'}) as active_days_month
        FROM ${tableName}
        WHERE ${isDeparture ? 'dep_airport' : 'arr_airport'} = $1
          AND ${isDeparture ? 'departure_date' : 'arrival_date'} >= ${selectedDateStr ? '$3' : '$2'}
          AND ${isDeparture ? 'departure_date' : 'arrival_date'} <= ${selectedDateStr ? '$4' : '$3'}
          AND status != 'cancelled'
          ),
            peak_hour AS(
              SELECT dep_hour
        FROM day_stats
        GROUP BY dep_hour
        ORDER BY SUM(flight_count) DESC
        LIMIT 1
            ),
              top_carrier AS(
                SELECT airline_code
        FROM day_stats
        GROUP BY airline_code
        ORDER BY SUM(flight_count) DESC
        LIMIT 1
              )
        SELECT
          (SELECT COUNT(*) FROM ${tableName} WHERE ${isDeparture ? 'dep_airport' : 'arr_airport'} = $1 
            ${selectedDateStr
        ? `AND ${isDeparture ? 'departure_date' : 'arrival_date'} = $2`
        : `AND ${isDeparture ? 'departure_date' : 'arrival_date'} >= $2 AND ${isDeparture ? 'departure_date' : 'arrival_date'} <= $3`
      }
            AND status != 'cancelled'
          ):: INTEGER as total_flights_day,
            ms.total_flights_month,
            ms.active_days_month,
            ph.dep_hour as peak_hour,
            tc.airline_code as top_carrier
      FROM month_stats ms
      LEFT JOIN peak_hour ph ON true
      LEFT JOIN top_carrier tc ON true
    `;

    const summaryParams = selectedDateStr
      ? [airportParam, selectedDateStr, startDateStr, endDateStr]
      : [airportParam, startDateStr, endDateStr];

    const summaryResult = await pool.query(summaryQuery, summaryParams);

    // Fallback if no data
    if (!summaryResult.rows[0] || (summaryResult.rows[0].total_flights_day === 0 && summaryResult.rows[0].total_flights_month === 0)) {
      return {
        dailyFrequency: [],
        routes: [],
        summary: {
          avgFlightsPerDay: 0,
          peakHourRange: 'ไม่พบข้อมูล',
          mostActiveCarrier: 'ไม่พบข้อมูล',
          totalFlights: 0
        }
      };
    }

    const row = summaryResult.rows[0];
    const totalFlightsDay = parseInt(row.total_flights_day) || 0;
    const totalFlightsMonth = parseInt(row.total_flights_month) || 0;
    const activeDaysMonth = parseInt(row.active_days_month) || 1;
    const peakHour = row.peak_hour !== null ? parseInt(row.peak_hour) : 0;

    // Format peak hour range (e.g. 8 -> "08:00 - 10:00")
    const startHour = String(peakHour).padStart(2, '0') + ':00';
    const endHour = String((peakHour + 2) % 24).padStart(2, '0') + ':00';

    return {
      dailyFrequency: dailyResult.rows.map(r => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        flights: r.flights
      })),
      routes: routesResult.rows.map(r => {
        // Format departure time as HH:mm
        const depTime = r.departure_time != null
          ? (() => {
            const d = new Date(r.departure_time);
            const h = d.getUTCHours();
            const m = d.getUTCMinutes();
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          })()
          : '';

        // Format duration (minutes) as "Xh Ym"
        const durMins = parseInt(r.duration, 10) || 0;
        const durH = Math.floor(durMins / 60);
        const durM = durMins % 60;
        const durationStr = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;

        return {
          departureCode: r.departure_code,
          // Prefer joined airport names over codes so downstream UI can render full labels
          departureName: r.departure_airport_name || r.departure_code,
          // Expose country metadata so the analysis UI can compute country-level KPIs
          departureCountryName: r.departure_country_name,
          departureCountryCode: r.departure_country_code,
          arrivalCode: r.arrival_code,
          arrivalCity: r.arrival_airport_name || r.destination_name || r.arrival_code,
          arrivalCountryName: r.arrival_country_name,
          arrivalCountryCode: r.arrival_country_code,
          direct: r.direct,
          airlineCode: r.airline_code,
          airlineName: r.airline_name || r.airline_code,
          flightNumber: r.flight_number,
          departureTime: depTime,
          duration: durationStr,
          date: isDeparture ?
            (r.departure_date instanceof Date ? r.departure_date.toISOString().split('T')[0] : r.departure_date) :
            (r.arrival_date instanceof Date ? r.arrival_date.toISOString().split('T')[0] : r.arrival_date),
          departureDate: r.departure_date instanceof Date ? r.departure_date.toISOString().split('T')[0] : r.departure_date,
          arrivalDate: r.arrival_date instanceof Date ? r.arrival_date.toISOString().split('T')[0] : r.arrival_date, direction: isDeparture ? 'departure' : 'arrival'
        };
      }),
      summary: {
        avgFlightsPerDay: Math.ceil(totalFlightsMonth / activeDaysMonth),
        peakHourRange: totalFlightsDay > 0 ? `${startHour} - ${endHour} ` : 'ไม่พบข้อมูล',
        mostActiveCarrier: row.top_carrier || 'ไม่พบข้อมูล',
        totalFlights: totalFlightsDay
      }
    };
  }

  /**
   * Get flight route analysis data by Country
   */
  static async getIntlFlightAnalysisByCountry(
    countryName: string,
    isDeparture: boolean,
    startDate: Date,
    endDate: Date,
    selectedDate?: Date
  ): Promise<{
    dailyFrequency: Array<{ date: string; flights: number }>;
    routes: Array<{
      departureCode: string;
      departureName: string;
      arrivalCode: string;
      arrivalCity: string;
      direct: boolean;
      airlineCode: string;
      airlineName: string;
      flightNumber: string;
      departureTime: string;
      duration: string;
    }>;
    summary: {
      avgFlightsPerDay: number;
      peakHourRange: string;
      mostActiveCarrier: string;
      totalFlights: number;
    };
  }> {
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatLocalDate(startDate);
    const endDateStr = formatLocalDate(endDate);
    const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : null;

    const tableName = isDeparture ? 'departure_flight_paths' : 'arrival_flight_paths';
    const joinColumn = isDeparture ? 'dep_airport' : 'arr_airport';

    // Check if countryName is likely a country code (2 chars)
    const isCountryCode = countryName.length === 2;

    let whereClause = '';
    let queryParams: any[] = [];

    if (isCountryCode) {
      // Exact match for country code
      whereClause = `(a.country = $1)`;
      queryParams = [countryName.toUpperCase(), startDateStr, endDateStr];
    } else {
      // Fuzzy match for country name
      whereClause = `(a.country_name ILIKE $1 OR a.country ILIKE $1)`;
      queryParams = [`%${countryName}%`, startDateStr, endDateStr];
    }

    console.log(`[FlightModel] Country Analysis for ${countryName} (${isDeparture ? 'Dep' : 'Arr'})`);
    console.log(`[FlightModel] Date Range: ${startDateStr} to ${endDateStr}`);
    if (selectedDateStr) {
      console.log(`[FlightModel] Mode: Single Date Analysis (${selectedDateStr})`);
    } else {
      console.log(`[FlightModel] Mode: Range Analysis (Stats calculated over full range)`);
    }

    // 1. Daily Frequency (Monthly Trend)
    const dailyQuery = `
        SELECT
        departure_date as date,
          COUNT(*):: INTEGER as flights
      FROM ${tableName} fp
      JOIN airports a ON fp.${joinColumn} = a.code
      WHERE ${whereClause}
        AND departure_date >= $2
        AND departure_date <= $3
        AND status != 'cancelled'
      GROUP BY departure_date
      ORDER BY date
    `;
    const dailyResult = await pool.query(dailyQuery, queryParams);

    // 2. Routes List (Specific to Selected Date)

    // Re-prepare params for routes query (only needs country and selectedDate)
    let routesQueryParams: any[] = [];
    if (isCountryCode) {
      routesQueryParams = selectedDateStr
        ? [countryName.toUpperCase(), selectedDateStr]
        : [countryName.toUpperCase(), startDateStr, endDateStr];
    } else {
      routesQueryParams = selectedDateStr
        ? [`%${countryName}%`, selectedDateStr]
        : [`%${countryName}%`, startDateStr, endDateStr];
    }

    // Calculate days difference
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Country-level queries can explode in size for large markets like CN,
    // so keep the routes list compact by default.
    const useDistinct = true;
    const routeLimit = 500;

    const routesQuery = `
      SELECT ${useDistinct ? 'DISTINCT ON(dep_airport, arr_airport, airline_code, flight_number, departure_time)' : ''}
        dep_airport as departure_code,
        arr_airport as arrival_code,
        destination as destination_name,
        airline_code,
        airline_name,
        flight_number,
        stops = 0 as direct,
        departure_time,
        duration,
        a.name as airport_name,
        a.city as airport_city,
        dep_airport_ref.name as departure_airport_name,
        arr_airport_ref.name as arrival_airport_name,
        dep_airport_ref.country_name as departure_country_name,
        dep_airport_ref.country_code as departure_country_code,
        arr_airport_ref.country_name as arrival_country_name,
        arr_airport_ref.country_code as arrival_country_code
      FROM ${tableName} fp
      JOIN airports a ON fp.${joinColumn} = a.code
      -- Join both route endpoints so country analysis can also return full airport names
      -- Normalize airport codes in the join because flight-path records can carry mixed case or padded values
      LEFT JOIN airports dep_airport_ref ON UPPER(TRIM(dep_airport_ref.code)) = UPPER(TRIM(fp.dep_airport))
      LEFT JOIN airports arr_airport_ref ON UPPER(TRIM(arr_airport_ref.code)) = UPPER(TRIM(fp.arr_airport))
      WHERE ${whereClause}
        ${selectedDateStr ? 'AND departure_date = $2' : 'AND departure_date >= $2 AND departure_date <= $3'}
        AND status != 'cancelled'
      ORDER BY ${useDistinct ? 'dep_airport, arr_airport, airline_code, flight_number, departure_time' : 'departure_date, departure_time'}
      LIMIT ${selectedDateStr ? '$3' : '$4'}
    `;
    const routesResult = await pool.query(routesQuery, [...routesQueryParams, routeLimit]);
    console.log(`[FlightModel] Country routes returned: ${routesResult.rows.length} (limit ${routeLimit})`);

    // 3. Summary Stats (Stats for Selected Date)

    // Re-prepare params for summary query
    let summaryQueryParams: any[] = [];
    if (isCountryCode) {
      summaryQueryParams = selectedDateStr
        ? [countryName.toUpperCase(), selectedDateStr, startDateStr, endDateStr]
        : [countryName.toUpperCase(), startDateStr, endDateStr];
    } else {
      summaryQueryParams = selectedDateStr
        ? [`%${countryName}%`, selectedDateStr, startDateStr, endDateStr]
        : [`%${countryName}%`, startDateStr, endDateStr];
    }

    // Note: For country level summary, we might want to aggregate differently, but keeping consistent structure for now
    const summaryQuery = `
      WITH day_stats AS(
        SELECT 
          airline_code,
          EXTRACT(HOUR FROM departure_time) as dep_hour,
          COUNT(*) as flight_count
        FROM ${tableName} fp
        JOIN airports a ON fp.${joinColumn} = a.code
        WHERE ${whereClause}
          ${selectedDateStr ? 'AND departure_date = $2' : 'AND departure_date >= $2 AND departure_date <= $3'}
          AND status != 'cancelled'
        GROUP BY airline_code, dep_hour
      ),
      month_stats AS(
        SELECT 
          COUNT(*):: INTEGER as total_flights_month,
          COUNT(DISTINCT departure_date) as active_days_month
        FROM ${tableName} fp
        JOIN airports a ON fp.${joinColumn} = a.code
        WHERE ${whereClause}
          AND departure_date >= ${selectedDateStr ? '$3' : '$2'}
          AND departure_date <= ${selectedDateStr ? '$4' : '$3'}
          AND status != 'cancelled'
      ),
      peak_hour AS(
        SELECT dep_hour FROM day_stats GROUP BY dep_hour ORDER BY SUM(flight_count) DESC LIMIT 1
      ),
      top_carrier AS(
        SELECT airline_code FROM day_stats GROUP BY airline_code ORDER BY SUM(flight_count) DESC LIMIT 1
      )
      SELECT
        (SELECT COUNT(*) FROM ${tableName} fp JOIN airports a ON fp.${joinColumn} = a.code WHERE ${whereClause} 
          ${selectedDateStr
        ? 'AND departure_date = $2'
        : 'AND departure_date >= $2 AND departure_date <= $3'}
            AND status != 'cancelled'
        ):: INTEGER as total_flights_day,
        ms.total_flights_month,
        ms.active_days_month,
        ph.dep_hour as peak_hour,
        tc.airline_code as top_carrier
      FROM month_stats ms
      LEFT JOIN peak_hour ph ON true
      LEFT JOIN top_carrier tc ON true
    `;
    const summaryResult = await pool.query(summaryQuery, summaryQueryParams);

    // Fallback if no data
    if (!summaryResult.rows[0] || (summaryResult.rows[0].total_flights_day === 0 && summaryResult.rows[0].total_flights_month === 0)) {
      return {
        dailyFrequency: [],
        routes: [],
        summary: {
          avgFlightsPerDay: 0,
          peakHourRange: 'ไม่พบข้อมูล',
          mostActiveCarrier: 'ไม่พบข้อมูล',
          totalFlights: 0
        }
      };
    }

    const row = summaryResult.rows[0];
    const totalFlightsDay = parseInt(row.total_flights_day) || 0;
    const totalFlightsMonth = parseInt(row.total_flights_month) || 0;
    const activeDaysMonth = parseInt(row.active_days_month) || 1;
    const peakHour = row.peak_hour !== null ? parseInt(row.peak_hour) : 0;

    const startHour = String(peakHour).padStart(2, '0') + ':00';
    const endHour = String((peakHour + 2) % 24).padStart(2, '0') + ':00';

    return {
      dailyFrequency: dailyResult.rows.map(r => ({
        date: r.date instanceof Date ? formatLocalDate(r.date) : r.date,
        flights: r.flights
      })),
      routes: routesResult.rows.map(r => {
        const depTime = r.departure_time != null
          ? (() => {
            const d = new Date(r.departure_time);
            const h = d.getUTCHours();
            const m = d.getUTCMinutes();
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          })()
          : '';

        const durMins = parseInt(r.duration, 10) || 0;
        const durH = Math.floor(durMins / 60);
        const durM = durMins % 60;
        const durationStr = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;

        return {
          departureCode: r.departure_code,
          // Prefer joined airport names over codes so downstream UI can render full labels
          departureName: r.departure_airport_name || r.airport_name || r.departure_code,
          // Expose country metadata so the analysis UI can compute country-level KPIs
          departureCountryName: r.departure_country_name,
          departureCountryCode: r.departure_country_code,
          arrivalCode: r.arrival_code,
          arrivalCity: r.arrival_airport_name || r.destination_name || r.arrival_code,
          arrivalCountryName: r.arrival_country_name,
          arrivalCountryCode: r.arrival_country_code,
          direct: r.direct,
          airlineCode: r.airline_code,
          airlineName: r.airline_name || r.airline_code,
          flightNumber: r.flight_number,
          departureTime: depTime,
          duration: durationStr
        };
      }),
      summary: {
        avgFlightsPerDay: Math.ceil(totalFlightsMonth / activeDaysMonth),
        peakHourRange: totalFlightsDay > 0 ? `${startHour} - ${endHour} ` : 'ไม่พบข้อมูล',
        mostActiveCarrier: row.top_carrier || 'ไม่พบข้อมูล',
        totalFlights: totalFlightsDay
      }
    };
  }
}
