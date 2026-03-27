import { flightCrossCheckRepository, DbFlight } from '../repositories/FlightCrossCheckRepository';

export interface ScrapedFlight {
    flight: string;
    direction: string;
    time: string;
    duration: string;
    aircraft?: string;
    seenInDb?: boolean;
}

export interface CrossCheckUpdate {
    dbFlightId: number;
    direction: 'departure' | 'arrival';
    newData: {
        time: Date;
        duration: number;
        flight_number?: string;
    };
}

export interface CrossCheckResult {
    toUpdate: CrossCheckUpdate[];
    toCancel: DbFlight[];
    newFlights: ScrapedFlight[];
    summary: {
        cancelledCount: number;
        updatedCount: number;
        newArrivalsCount: number;
    };
}

export class FlightCrossCheckService {
    /**
     * Orchestrates the cross-check logic for a specific airport/date
     * Loads flights, finds changes, and applies them to DB.
     */
    async findUpdatesCancelsAndNewFlights(scrapedFlights: ScrapedFlight[], dateStr: string, airportCode: string): Promise<CrossCheckResult> {
        // 1. Load DB flights
        const depFlights = await flightCrossCheckRepository.getFlightsByDateAndAirport(dateStr, airportCode, 'departure');
        const arrFlights = await flightCrossCheckRepository.getFlightsByDateAndAirport(dateStr, airportCode, 'arrival');
        const allDbFlights = [...depFlights, ...arrFlights];

        // 2. Perform comparison
        const result = this.compareScrapeWithDatabase(scrapedFlights, allDbFlights);

        // 3. Apply updates / cancels
        for (const update of result.toUpdate) {
            await flightCrossCheckRepository.updateFlight(update.dbFlightId, update.direction, update.newData);
        }

        for (const cancel of result.toCancel) {
            await flightCrossCheckRepository.markCancelled(cancel.id, cancel.direction);
        }

        // 4. Apply insertions for new flights
        if (result.newFlights.length > 0) {
            const { FlightModel } = await import('../models/Flight');
            const newFlightRecords: any[] = [];
            
            for (const f of result.newFlights) {
                const airlineCode = f.flight.substring(0, 2).toUpperCase();
                const airline = await flightCrossCheckRepository.getAirlineByCode(airlineCode);
                if (!airline) continue;

                // Determine origin/destination
                let origin = f.direction === 'departure' ? airportCode : f.flight.length > 6 ? 'UNK' : 'BKK'; // Simplified
                let destination = f.direction === 'arrival' ? airportCode : 'UNK';
                
                // Try to infer from scraped destination if possible
                if (f.direction === 'departure') {
                    const match = f.direction.match(/([A-Z]{3})/); // This is not reliable
                }

                // Since we don't have full destination in CrossCheck (usually just time/flight), 
                // we might need more info. But the scraper DOES provide 'direction' (e.g. "BKK Bangkok")
                // Wait, ScrapedFlight.direction is "BKK Bangkok" (the other airport).
                const otherAirportMatch = f.direction.match(/^([A-Z0-9]{3})/);
                const otherAirport = otherAirportMatch ? otherAirportMatch[1] : '';

                if (!otherAirport) continue;

                const originCode = f.direction === 'arrival' ? otherAirport : airportCode;
                const destinationCode = f.direction === 'arrival' ? airportCode : otherAirport;

                const routeId = await flightCrossCheckRepository.getRouteId(originCode, destinationCode);
                if (!routeId) continue;

                const durationMinutes = this.parseDurationToMinutes(f.duration);
                
                // Calculate UTC times
                const [h, m] = f.time.split(':');
                const baseDate = new Date(`${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00Z`);
                
                let departure_time, arrival_time;
                if (f.direction === 'arrival') {
                    arrival_time = baseDate.toISOString();
                    departure_time = new Date(baseDate.getTime() - durationMinutes * 60000).toISOString();
                } else {
                    departure_time = baseDate.toISOString();
                    arrival_time = new Date(baseDate.getTime() + durationMinutes * 60000).toISOString();
                }

                newFlightRecords.push({
                    route_id: routeId,
                    airline_id: airline.id,
                    departure_date: new Date(departure_time),
                    arrival_date: new Date(arrival_time),
                    departure_time,
                    arrival_time,
                    duration: durationMinutes,
                    flight_number: f.flight.replace(/\s+/g, '').toUpperCase(),
                    trip_type: 'one-way',
                    travel_class: 'economy',
                    stops: 0,
                    dep_airport: originCode,
                    arr_airport: destinationCode,
                    airline_name: airline.name,
                    airline_code: airlineCode,
                    source: 'flightsfrom.com',
                    status: 'planned'
                });
            }

            if (newFlightRecords.length > 0) {
                // Batch insert (assuming some defaults for arrivals vs departures)
                const depBatch = newFlightRecords.filter(r => r.arr_airport !== airportCode);
                const arrBatch = newFlightRecords.filter(r => r.arr_airport === airportCode);
                
                if (depBatch.length > 0) await FlightModel.batchInsertFlightPaths(depBatch, true);
                if (arrBatch.length > 0) await FlightModel.batchInsertFlightPaths(arrBatch, false);
            }
        }

        return result;
    }

    /**
     * Main comparison logic between scraped data and database data
     */
    compareScrapeWithDatabase(scrapedFlights: ScrapedFlight[], dbFlights: DbFlight[]): CrossCheckResult {
        const toUpdate: CrossCheckUpdate[] = [];
        const potentialCancels: DbFlight[] = [];
        const newFlights: ScrapedFlight[] = [];

        const scrapedMap = this.buildScrapedMap(scrapedFlights);

        // 1. First pass: Match by exact flight number
        for (const dbFlight of dbFlights) {
            if (!dbFlight.flight_number) continue;
            const flightKey = `${dbFlight.flight_number.replace(/\s+/g, '').toUpperCase()}_${dbFlight.direction}`;
            const scrapedFlight = scrapedMap.get(flightKey);

            if (!scrapedFlight) {
                potentialCancels.push(dbFlight);
            } else {
                const changes = this.detectChanges(dbFlight, scrapedFlight);
                if (changes) {
                    toUpdate.push({
                        dbFlightId: dbFlight.id,
                        direction: dbFlight.direction,
                        newData: changes
                    });
                }
                scrapedFlight.seenInDb = true;
            }
        }

        // Identify new scraped flights
        const remainingScraped = scrapedFlights.filter(f => !f.seenInDb && f.flight);

        // 2. Second pass: Fuzzy matching (Time + Airline Prefix)
        // This handles cases like TG41 being renamed to TG40 for the same slot.
        const toCancel: DbFlight[] = [];

        for (const dbFlight of potentialCancels) {
            const dbTimeObj = new Date(dbFlight.direction === 'departure' ? dbFlight.departure_time : dbFlight.arrival_time);
            const dbTimeStr = `${String(dbTimeObj.getUTCHours()).padStart(2, '0')}:${String(dbTimeObj.getUTCMinutes()).padStart(2, '0')}`;
            const dbAirlinePrefix = dbFlight.flight_number.substring(0, 2).toUpperCase();

            const fuzzyMatchIdx = remainingScraped.findIndex(sf => {
                const sfAirlinePrefix = sf.flight.substring(0, 2).toUpperCase();
                return sf.time === dbTimeStr && sfAirlinePrefix === dbAirlinePrefix;
            });

            if (fuzzyMatchIdx !== -1) {
                const matchedScraped = remainingScraped[fuzzyMatchIdx];
                const changes = this.detectChanges(dbFlight, matchedScraped);
                
                // Even if time/duration didn't change, we still update flight_number
                toUpdate.push({
                    dbFlightId: dbFlight.id,
                    direction: dbFlight.direction,
                    newData: {
                        ...(changes || { 
                            time: dbTimeObj, 
                            duration: Number(dbFlight.duration) 
                        }),
                        flight_number: matchedScraped.flight.replace(/\s+/g, '').toUpperCase()
                    }
                });
                
                matchedScraped.seenInDb = true;
                remainingScraped.splice(fuzzyMatchIdx, 1);
            } else {
                toCancel.push(dbFlight);
            }
        }

        return {
            toUpdate,
            toCancel,
            newFlights: remainingScraped,
            summary: {
                cancelledCount: toCancel.length,
                updatedCount: toUpdate.length,
                newArrivalsCount: remainingScraped.length
            }
        };
    }

    /**
     * Builds a map for efficient lookups
     */
    private buildScrapedMap(scrapedFlights: ScrapedFlight[]): Map<string, ScrapedFlight> {
        const scrapedMap = new Map<string, ScrapedFlight>();
        for (const f of scrapedFlights) {
            if (!f.flight) continue;
            const key = `${f.flight.replace(/\s+/g, '').toUpperCase()}_${f.direction}`;
            scrapedMap.set(key, f);
        }
        return scrapedMap;
    }

    /**
     * Detects if there are any changes worth updating
     */
    private detectChanges(dbFlight: DbFlight, scrapedFlight: ScrapedFlight) {
        const scrapedDurationMins = this.parseDurationToMinutes(scrapedFlight.duration);
        
        // Use departure_time for departure flights, arrival_time for arrival flights
        const dbTimeValue = dbFlight.direction === 'departure' ? dbFlight.departure_time : dbFlight.arrival_time;
        const dbTimeObj = new Date(dbTimeValue);
        const dbTimeStr = `${String(dbTimeObj.getUTCHours()).padStart(2, '0')}:${String(dbTimeObj.getUTCMinutes()).padStart(2, '0')}`;

        let timeChanged = false;
        if (scrapedFlight.time && scrapedFlight.time !== dbTimeStr) {
            timeChanged = true;
        }

        const durationChanged = (scrapedDurationMins > 0 && scrapedDurationMins !== Number(dbFlight.duration));

        if (timeChanged || durationChanged) {
            const newTimeObj = new Date(dbTimeObj);
            if (timeChanged) {
                const [h, m] = scrapedFlight.time.split(':');
                newTimeObj.setUTCHours(parseInt(h), parseInt(m), 0, 0);
            }
            return {
                time: newTimeObj,
                duration: scrapedDurationMins > 0 ? scrapedDurationMins : Number(dbFlight.duration)
            };
        }
        return null;
    }

    /**
     * Parses duration string (e.g. 1h 30m) to total minutes
     */
    parseDurationToMinutes(durationStr: string): number {
        if (!durationStr) return 0;
        let totalMinutes = 0;
        const hMatch = durationStr.match(/(\d+)h/);
        if (hMatch) totalMinutes += parseInt(hMatch[1], 10) * 60;
        const mMatch = durationStr.match(/(\d+)m/);
        if (mMatch) totalMinutes += parseInt(mMatch[1], 10);
        return totalMinutes;
    }
}


export const flightCrossCheckService = new FlightCrossCheckService();
