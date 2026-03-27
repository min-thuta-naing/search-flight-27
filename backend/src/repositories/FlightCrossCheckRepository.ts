import { pool } from '../config/database';

export interface DbFlight {
    id: number;
    flight_number: string;
    departure_time: string | Date;
    arrival_time: string | Date;
    duration: number;
    aircraft?: string;
    direction: 'departure' | 'arrival';
}

export class FlightCrossCheckRepository {
    /**
     * Fetches all distinct airport codes from both departure and arrival tables
     */
    async getAllAirports(): Promise<string[]> {
        const query = `
            SELECT DISTINCT dep_airport as code FROM departure_flight_paths
            UNION
            SELECT DISTINCT arr_airport as code FROM arrival_flight_paths
        `;
        const { rows } = await pool.query(query);
        return rows.map(r => r.code).filter(Boolean);
    }

    /**
     * Gets flights for a specific date and airport
     */
    async getFlightsByDateAndAirport(dateStr: string, airportCode: string, direction: 'departure' | 'arrival'): Promise<DbFlight[]> {
        const tableName = direction === 'departure' ? 'departure_flight_paths' : 'arrival_flight_paths';
        const dateColumn = direction === 'departure' ? 'departure_date' : 'arrival_date';
        const airportColumn = direction === 'departure' ? 'dep_airport' : 'arr_airport';

        const query = `
            SELECT * FROM ${tableName} 
            WHERE DATE(${dateColumn}) = $1 AND ${airportColumn} = $2
        `;
        const { rows } = await pool.query(query, [dateStr, airportCode]);
        return rows.map(f => ({ ...f, direction }));
    }

    /**
     * Updates flight record with new data and marks as 'updated'
     * Now supports updating flight_number (for fuzzy matching)
     */
    async updateFlight(id: number, direction: 'departure' | 'arrival', data: { time: Date, duration: number, flight_number?: string }): Promise<void> {
        const tableName = direction === 'departure' ? 'departure_flight_paths' : 'arrival_flight_paths';
        const timeColumn = direction === 'departure' ? 'departure_time' : 'arrival_time';

        let query = `UPDATE ${tableName} SET ${timeColumn} = $1, duration = $2`;
        const params: any[] = [data.time, data.duration];
        
        if (data.flight_number) {
            query += `, flight_number = $${params.length + 1}`;
            params.push(data.flight_number);
        }

        query += `, status = 'updated', updated_at = NOW() WHERE id = $${params.length + 1}`;
        params.push(id);

        await pool.query(query, params);
    }

    /**
     * Gets a route ID based on origin and destination
     */
    async getRouteId(origin: string, destination: string): Promise<number | null> {
        const query = `SELECT id FROM routes WHERE origin = $1 AND destination = $2`;
        const { rows } = await pool.query(query, [origin, destination]);
        return rows[0]?.id || null;
    }

    /**
     * Gets airline info by its 2-3 letter code
     */
    async getAirlineByCode(code: string): Promise<{ id: number, name: string } | null> {
        const query = `SELECT id, name FROM airlines WHERE code = $1`;
        const { rows } = await pool.query(query, [code]);
        return rows[0] || null;
    }

    /**
     * Marks a flight as 'cancelled'
     */
    async markCancelled(id: number, direction: 'departure' | 'arrival'): Promise<void> {
        const tableName = direction === 'departure' ? 'departure_flight_paths' : 'arrival_flight_paths';
        const query = `UPDATE ${tableName} SET status = 'cancelled', updated_at = NOW() WHERE id = $1`;
        await pool.query(query, [id]);
    }
}

export const flightCrossCheckRepository = new FlightCrossCheckRepository();
