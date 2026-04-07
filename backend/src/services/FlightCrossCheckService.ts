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
    async findUpdatesCancelsAndNewFlights(scrapedFlights: ScrapedFlight[], dateStr: string, airportCode: string, tz: string): Promise<CrossCheckResult> {
        // 1. Load DB flights
        const depFlights = await flightCrossCheckRepository.getFlightsByDateAndAirport(dateStr, airportCode, 'departure');
        const arrFlights = await flightCrossCheckRepository.getFlightsByDateAndAirport(dateStr, airportCode, 'arrival');
        const allDbFlights = [...depFlights, ...arrFlights];

        // 2. Perform comparison
        const result = this.compareScrapeWithDatabase(scrapedFlights, allDbFlights, tz);

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

                // Determine origin/destination based on direction name
                const otherAirportMatch = f.direction.match(/^([A-Z0-9]{3})/);
                const otherAirport = otherAirportMatch ? otherAirportMatch[1] : '';
                if (!otherAirport) continue;

                const originCode = f.direction === 'arrival' ? otherAirport : airportCode;
                const destinationCode = f.direction === 'arrival' ? airportCode : otherAirport;

                const routeId = await flightCrossCheckRepository.getRouteId(originCode, destinationCode);
                if (!routeId) continue;

                const durationMinutes = this.parseDurationToMinutes(f.duration);
                
                // NAIVE STORAGE: Store the local time numbers directly as UTC
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
                    route_id: routeId, airline_id: airline.id,
                    departure_date: new Date(departure_time), arrival_date: new Date(arrival_time),
                    departure_time, arrival_time, duration: durationMinutes,
                    flight_number: f.flight.replace(/\s+/g, '').toUpperCase(),
                    trip_type: 'one-way', travel_class: 'economy', stops: 0,
                    dep_airport: originCode, arr_airport: destinationCode, 
                    airline_name: airline.name, airline_code: airlineCode,
                    source: 'flightsfrom.com', status: 'planned'
                });
            }

            if (newFlightRecords.length > 0) {
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
    compareScrapeWithDatabase(scrapedFlights: ScrapedFlight[], dbFlights: DbFlight[], tz: string): CrossCheckResult {
        const toUpdate: CrossCheckUpdate[] = [];
        const potentialCancels: DbFlight[] = [];
        const scrapedMap = this.buildScrapedMap(scrapedFlights);

        // 1. First pass: Match by exact flight number
        for (const dbFlight of dbFlights) {
            if (!dbFlight.flight_number) continue;
            const flightKey = `${dbFlight.flight_number.replace(/\s+/g, '').toUpperCase()}_${dbFlight.direction}`;
            const scrapedFlight = scrapedMap.get(flightKey);

            if (!scrapedFlight) {
                potentialCancels.push(dbFlight);
            } else {
                const changes = this.detectChanges(dbFlight, scrapedFlight, tz);
                if (changes) {
                    toUpdate.push({
                        dbFlightId: dbFlight.id, direction: dbFlight.direction, newData: changes
                    });
                }
                scrapedFlight.seenInDb = true;
            }
        }

        const remainingScraped = scrapedFlights.filter(f => !f.seenInDb && f.flight);
        const toCancel: DbFlight[] = [];

        // 2. Second pass: Fuzzy matching (Time + Airline Prefix)
        for (const dbFlight of potentialCancels) {
            const dbTimeValue = dbFlight.direction === 'departure' ? dbFlight.departure_time : dbFlight.arrival_time;
            const dbTimeObj = new Date(dbTimeValue);
            const dbTimeStr = this.formatToLocalTime(dbTimeObj, tz);
            const dbAirlinePrefix = dbFlight.flight_number.substring(0, 2).toUpperCase();

            const fuzzyMatchIdx = remainingScraped.findIndex(sf => {
                const sfAirlinePrefix = sf.flight.substring(0, 2).toUpperCase();
                return sf.time === dbTimeStr && sfAirlinePrefix === dbAirlinePrefix;
            });

            if (fuzzyMatchIdx !== -1) {
                const matchedScraped = remainingScraped[fuzzyMatchIdx];
                const changes = this.detectChanges(dbFlight, matchedScraped, tz);
                toUpdate.push({
                    dbFlightId: dbFlight.id, direction: dbFlight.direction,
                    newData: {
                        ...(changes || { time: dbTimeObj, duration: Number(dbFlight.duration) }),
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
            toUpdate, toCancel, newFlights: remainingScraped, 
            summary: { cancelledCount: toCancel.length, updatedCount: toUpdate.length, newArrivalsCount: remainingScraped.length }
        };
    }

    private buildScrapedMap(scrapedFlights: ScrapedFlight[]): Map<string, ScrapedFlight> {
        const scrapedMap = new Map<string, ScrapedFlight>();
        for (const f of scrapedFlights) {
            if (!f.flight) continue;
            const key = `${f.flight.replace(/\s+/g, '').toUpperCase()}_${f.direction}`;
            scrapedMap.set(key, f);
        }
        return scrapedMap;
    }

    private detectChanges(dbFlight: DbFlight, scrapedFlight: ScrapedFlight, tz: string) {
        const scrapedDurationMins = this.parseDurationToMinutes(scrapedFlight.duration);
        const dbTimeValue = dbFlight.direction === 'departure' ? dbFlight.departure_time : dbFlight.arrival_time;
        
        // Robustly treat database Date as UTC even if the driver parsed it as Local
        const dbTimeObj = this.treatAsUTC(new Date(dbTimeValue));

        // NAIVE COMPARISON: The database already stores the local airport time
        // numbers (e.g. 04:57) in a UTC column without conversion.
        // So we just extract the UTC HH:mm part and compare it directly 
        // with the scraper's reported Local Time.
        const dbTimeStr = this.formatAsNaiveTime(dbTimeObj);

        let timeChanged = false;
        if (scrapedFlight.time && scrapedFlight.time !== dbTimeStr) {
            timeChanged = true;
            console.log(`[DEBUG] Time Mismatch for ${dbFlight.flight_number}: Scraped=${scrapedFlight.time}, DB_Local=${dbTimeStr} (tz: ${tz}, DB_ISO: ${dbTimeObj.toISOString()})`);
        }

        const durationChanged = (scrapedDurationMins > 0 && scrapedDurationMins !== Number(dbFlight.duration));
        if (durationChanged) {
            console.log(`[DEBUG] Duration Mismatch for ${dbFlight.flight_number}: Scraped=${scrapedDurationMins}, DB=${dbFlight.duration}`);
        }

        if (timeChanged || durationChanged) {
            if (timeChanged) {
                // NAIVE STORAGE: Store the local time numbers directly as UTC
                const [h, m] = scrapedFlight.time.split(':');
                const datePart = new Date(dbTimeObj).toISOString().split('T')[0];
                const newTimeObj = new Date(`${datePart}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00Z`);

                return { time: newTimeObj, duration: scrapedDurationMins > 0 ? scrapedDurationMins : Number(dbFlight.duration) };
            }
            return { time: dbTimeObj, duration: scrapedDurationMins };
        }
        return null;
    }

    private formatToLocalTime(date: Date, tz: string): string {
        return new Intl.DateTimeFormat('en-GB', { 
            timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false 
        }).format(date);
    }

    parseDurationToMinutes(durationStr: string): number {
        if (!durationStr) return 0;
        let totalMinutes = 0;
        const hMatch = durationStr.match(/(\d+)h/);
        if (hMatch) totalMinutes += parseInt(hMatch[1], 10) * 60;
        const mMatch = durationStr.match(/(\d+)m/);
        if (mMatch) totalMinutes += parseInt(mMatch[1], 10);
        return totalMinutes;
    }

    /**
     * Extracts HH:mm as a string using UTC parts of the date.
     * Use this for naive comparison when the DB stores local times as UTC.
     */
    private formatAsNaiveTime(date: Date): string {
        const hh = String(date.getUTCHours()).padStart(2, '0');
        const mm = String(date.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    /**
     * Treats a Date object as UTC by taking its local year/month/day/hour/min/sec
     * and creating a new Date in the UTC timeline with those same numbers.
     * This fixes issues where "timestamp without time zone" is parsed as local.
     */
    private treatAsUTC(date: Date): Date {
        // If the date is invalid, just return it
        if (isNaN(date.getTime())) return date;
        
        return new Date(Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds()
        ));
    }
}

export const flightCrossCheckService = new FlightCrossCheckService();
