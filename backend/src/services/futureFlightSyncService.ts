import fs from 'fs';
import path from 'path';
import { futureSyncRepository } from '../repositories/FutureSyncRepository';
import { futureScrapeIntegration } from './FutureScrapeIntegration';
import { FlightModel } from '../models/Flight';

/**
 * Service to manage the business logic of pulling and importing future flight data.
 * Isolated from the daily cross-check system as requested.
 */
export class FutureFlightSyncService {
    
    /**
     * Executes the sync process for a subset of airports.
     * This is designed to be called by the scheduler.
     */
    async syncAllEnabledAirports(workerId: number = 0): Promise<void> {
        const nextDate = await futureSyncRepository.getNextSyncDate();
        const airports = await futureSyncRepository.getEnabledAirports();
        
        console.log(`[FUTURE-SYNC] 🚀 Starting Future Pull for ${nextDate}`);
        console.log(`[FUTURE-SYNC] Airports to process: ${airports.join(', ')}`);

        // Cache routes and airlines to speed up insertion
        const routeCache = new Map<string, any>();
        const airlineCache = new Map<string, any>();
        let successCount = 0;

        for (const airport of airports) {
            try {
                // 1. Scrape
                const filePaths = await futureScrapeIntegration.scrapeFutureDate(nextDate, airport, workerId);
                const csvPath = filePaths.find(p => p.endsWith('.csv'));

                if (csvPath) {
                    // 2. Import
                    await this.importCsvFile(csvPath, airport, routeCache, airlineCache);
                    
                    // 3. Cleanup
                    await futureScrapeIntegration.cleanupFiles(filePaths);
                    successCount++;
                } else {
                    console.warn(`[FUTURE-SYNC] No data found for ${airport} on ${nextDate}`);
                }
            } catch (err: any) {
                console.error(`[FUTURE-SYNC] ❌ Failed processing ${airport}: ${err.message}`);
            }
        }

        // 4. Update the date for the next run ONLY if at least one airport succeeded
        if (successCount > 0) {
            const nextTarget = await futureSyncRepository.incrementNextSyncDate(nextDate);
            console.log(`[FUTURE-SYNC] ✅ Finished pulling all airports for ${nextDate}. Next target: ${nextTarget}`);
        } else {
            console.error(`[FUTURE-SYNC] ❌ Batch failed for all airports on ${nextDate}. Staying on the same date for next retry.`);
        }
    }

    /**
     * Simplified CSV parser adapted from import-intl-flights.ts
     */
    private async importCsvFile(
        csvPath: string, 
        airportCode: string,
        routeCache: Map<string, any>,
        airlineCache: Map<string, any>
    ): Promise<void> {
        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length <= 1) return;

        const headers = this.parseCSVLine(lines[0]);
        const departureBatch: any[] = [];
        const arrivalBatch: any[] = [];

        console.log(`[FUTURE-SYNC] Importing ${lines.length - 1} flights for ${airportCode}...`);

        for (let i = 1; i < lines.length; i++) {
            try {
                const values = this.parseCSVLine(lines[i]);
                const row: any = {};
                headers.forEach((h, idx) => row[h] = values[idx]);

                if (!row.flight || !row.time || !row.date || !row.destination) continue;

                const direction = row.direction.toLowerCase();
                const otherAirportMatch = row.destination.match(/^([A-Z0-9]{3})/);
                const otherAirport = otherAirportMatch ? otherAirportMatch[1].toUpperCase() : '';
                
                if (!otherAirport || otherAirport === airportCode.toUpperCase()) continue;

                // Route
                const origin = direction === 'arrival' ? otherAirport : airportCode.toUpperCase();
                const destination = direction === 'arrival' ? airportCode.toUpperCase() : otherAirport;
                const routeKey = `${origin}-${destination}`;
                
                let route = routeCache.get(routeKey);
                if (!route) {
                    route = await FlightModel.getOrCreateRoute(origin, destination, 0, 0);
                    routeCache.set(routeKey, route);
                }

                // Airline
                const airlineCode = this.extractAirlineCode(row.flight);
                let airline = airlineCache.get(airlineCode);
                if (!airline) {
                    // Note: row.airline is the name from the scraper
                    airline = await FlightModel.getOrCreateAirline(airlineCode, row.airline || airlineCode, row.airline || airlineCode);
                    airlineCache.set(airlineCode, airline);
                }

                // Data mapping (simplified from import-intl-flights.ts)
                const durationMinutes = this.parseDurationToMinutes(row.duration);
                const departureTimeUTC = this.calculateUTC(row.date, row.time, direction === 'arrival' ? -durationMinutes : 0);
                const arrivalTimeUTC = this.calculateUTC(row.date, row.time, direction === 'departure' ? durationMinutes : 0);

                const flightRecord = {
                    route_id: route.id,
                    airline_id: airline.id,
                    departure_date: new Date(row.date),
                    arrival_date: new Date(row.date), // Approximate, will be corrected by time logic if needed
                    departure_time: departureTimeUTC,
                    arrival_time: arrivalTimeUTC,
                    duration: durationMinutes,
                    flight_number: row.flight,
                    trip_type: 'one-way',
                    travel_class: 'economy',
                    source: 'flightsfrom.com',
                    dep_airport: origin,
                    arr_airport: destination,
                    destination: row.destination,
                    airline_name: airline.name,
                    airline_code: airlineCode,
                    aircraft: row.aircraft || null,
                    status: 'planned',
                    stops: 0
                };

                if (direction === 'departure') departureBatch.push(flightRecord);
                else arrivalBatch.push(flightRecord);

            } catch (err) {
                // Skip problematic rows
            }
        }

        // Batch insert
        if (departureBatch.length > 0) await FlightModel.batchInsertFlightPaths(departureBatch, true);
        if (arrivalBatch.length > 0) await FlightModel.batchInsertFlightPaths(arrivalBatch, false);
    }

    private parseCSVLine(line: string): string[] {
        const values: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(cur.trim()); cur = ''; }
            else cur += char;
        }
        values.push(cur.trim());
        return values.map(v => v.replace(/^"|"$/g, ''));
    }

    private extractAirlineCode(flight: string): string {
        const match = flight.match(/^([A-Z0-9]{2,3})/);
        return match ? match[1] : '';
    }

    private parseDurationToMinutes(durationStr: string): number {
        if (!durationStr) return 0;
        let mins = 0;
        const hMatch = durationStr.match(/(\d+)h/);
        if (hMatch) mins += parseInt(hMatch[1]) * 60;
        const mMatch = durationStr.match(/(\d+)m/);
        if (mMatch) mins += parseInt(mMatch[1]);
        return mins;
    }

    private calculateUTC(dateStr: string, timeStr: string, offsetMinutes: number): string {
        try {
            const [h, m] = timeStr.split(':');
            const d = new Date(`${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00Z`);
            if (isNaN(d.getTime())) return '';
            if (offsetMinutes !== 0) d.setMinutes(d.getMinutes() + offsetMinutes);
            return d.toISOString();
        } catch {
            return '';
        }
    }
}

export const futureFlightSyncService = new FutureFlightSyncService();
