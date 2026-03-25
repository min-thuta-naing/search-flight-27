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
        // 1. Load DB flights (Arrow 3 -> 4: load db flights)
        const depFlights = await flightCrossCheckRepository.getFlightsByDateAndAirport(dateStr, airportCode, 'departure');
        const arrFlights = await flightCrossCheckRepository.getFlightsByDateAndAirport(dateStr, airportCode, 'arrival');
        const allDbFlights = [...depFlights, ...arrFlights];

        // 2. Perform comparison
        const result = this.compareScrapeWithDatabase(scrapedFlights, allDbFlights);

        // 3. Apply changes (Arrow 3 -> 4: update / cancel)
        for (const update of result.toUpdate) {
            await flightCrossCheckRepository.updateFlight(update.dbFlightId, update.direction, update.newData);
        }

        for (const cancel of result.toCancel) {
            await flightCrossCheckRepository.markCancelled(cancel.id, cancel.direction);
        }

        return result;
    }

    /**
     * Main comparison logic between scraped data and database data
     */
    compareScrapeWithDatabase(scrapedFlights: ScrapedFlight[], dbFlights: DbFlight[]): CrossCheckResult {
        const toUpdate: CrossCheckUpdate[] = [];
        const toCancel: DbFlight[] = [];
        const newFlights: ScrapedFlight[] = [];

        const scrapedMap = this.buildScrapedMap(scrapedFlights);

        for (const dbFlight of dbFlights) {
            if (!dbFlight.flight_number) continue;
            const flightKey = `${dbFlight.flight_number.replace(/\s+/g, '').toUpperCase()}_${dbFlight.direction}`;
            const scrapedFlight = scrapedMap.get(flightKey);

            if (!scrapedFlight) {
                toCancel.push(dbFlight);
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

        // Identify new flights
        for (const flight of scrapedFlights) {
            if (!flight.seenInDb && flight.flight) {
                newFlights.push(flight);
            }
        }

        return {
            toUpdate,
            toCancel,
            newFlights,
            summary: {
                cancelledCount: toCancel.length,
                updatedCount: toUpdate.length,
                newArrivalsCount: newFlights.length
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
