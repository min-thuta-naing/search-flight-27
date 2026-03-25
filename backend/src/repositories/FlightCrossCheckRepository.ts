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
     */
    async updateFlight(id: number, direction: 'departure' | 'arrival', data: { time: Date, duration: number }): Promise<void> {
        const tableName = direction === 'departure' ? 'departure_flight_paths' : 'arrival_flight_paths';
        const timeColumn = direction === 'departure' ? 'departure_time' : 'arrival_time';

        const query = `
            UPDATE ${tableName} SET
                ${timeColumn} = $1,
                duration = $2,
                status = 'updated',
                updated_at = NOW()
            WHERE id = $3
        `;
        await pool.query(query, [data.time, data.duration, id]);
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
