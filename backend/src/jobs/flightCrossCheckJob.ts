import cron from 'node-cron';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { addDays, format } from 'date-fns';
import { pool } from '../config/database'; 

const execPromise = util.promisify(exec);

const PYTHON_SCRIPT_PATH = '/app/src/scripts/flight_scraper.py';
// Since output directory is at data/intl_flight_data relative to backend root:
const OUTPUT_DIR = path.join(__dirname, '../../data/intl_flight_data');

function parseDurationToMinutes(durationStr: string): number {
    if (!durationStr) return 0;
    let totalMinutes = 0;
    const hMatch = durationStr.match(/(\d+)h/);
    if (hMatch) totalMinutes += parseInt(hMatch[1], 10) * 60;
    const mMatch = durationStr.match(/(\d+)m/);
    if (mMatch) totalMinutes += parseInt(mMatch[1], 10);
    return totalMinutes;
}

/**
 * Executes the Python script for a specific date and airport
 */
export async function runCrosscheckForDate(dateStr: string, airportCode: string = 'BKK') {
    console.log(`[JOB] Starting flight crosscheck for ${airportCode} on ${dateStr}...`);
    try {
        // Clean up any stale Xvfb lock files to prevent "session not created" errors
        const cleanupCommand = 'rm -rf /tmp/.X* /tmp/.X11-unix/*';
        const command = `${cleanupCommand} && HOME=/tmp xvfb-run -a python3 ${PYTHON_SCRIPT_PATH} --crosscheck ${dateStr} --airport ${airportCode}`;
        const { stdout, stderr } = await execPromise(command, { timeout: 1200000 }); // 20 min timeout to handle very large airports (e.g. Pekin, Shanghai) in the future
        
        console.log(`[JOB] Crosscheck stdout for ${airportCode} ${dateStr}:\n${stdout}`);
        if (stderr) console.log(`[JOB] Crosscheck info for ${airportCode} ${dateStr}:\n${stderr}`);

        const resultFile = path.join(OUTPUT_DIR, `flightsfrom_${airportCode}_${dateStr}_live.json`); 
        
        if (fs.existsSync(resultFile)) {
            const fileContent = fs.readFileSync(resultFile, 'utf8');
            const scrapedFlights = JSON.parse(fileContent);

            await compareScrapeWithDatabase(scrapedFlights, airportCode, dateStr);

            // CLEANUP: Delete the local JSON file after processing to save space
            try {
                fs.unlinkSync(resultFile);
                console.log(`[JOB] Local cleanup complete: Deleted ${resultFile}`);
            } catch (cleanupErr: any) {
                console.warn(`[JOB] Failed to delete local file ${resultFile}: ${cleanupErr.message}`);
            }
        } else {
            console.log(`[JOB] No scrape result file found for ${airportCode} ${dateStr} at ${resultFile}`);
        }
    } catch (error) {
        console.error(`[JOB] Failed cross-check for ${airportCode} ${dateStr}:`, error);
    }
}

/**
 * Updates the DB based on live scraped Python results
 */
async function compareScrapeWithDatabase(scrapedFlights: any[], airportCode: string, dateStr: string) {
    console.log(`[JOB] Comparing ${scrapedFlights.length} freshly scraped records against Database for ${airportCode}...`);
    let cancelledCount = 0;
    let updatedCount = 0;

    const scrapedMap = new Map<string, any>();
    for (const f of scrapedFlights) {
        if (!f.flight) continue;
        const key = `${f.flight.replace(/\\s+/g, '').toUpperCase()}_${f.direction}`;
        scrapedMap.set(key, f);
    }

    try {
        const { rows: depFlights } = await pool.query(
            `SELECT * FROM departure_flight_paths WHERE DATE(departure_date) = $1 AND dep_airport = $2`,
            [dateStr, airportCode]
        );
        const { rows: arrFlights } = await pool.query(
            `SELECT * FROM arrival_flight_paths WHERE DATE(arrival_date) = $1 AND arr_airport = $2`,
            [dateStr, airportCode]
        );

        const allDbFlights = [
            ...depFlights.map(f => ({ ...f, direction: 'departure' })),
            ...arrFlights.map(f => ({ ...f, direction: 'arrival' }))
        ];

        const flightsToCancel = [];

        for (const dbFlight of allDbFlights) {
            if (!dbFlight.flight_number) continue;
            const flightKey = `${dbFlight.flight_number.replace(/\s+/g, '').toUpperCase()}_${dbFlight.direction}`;
            const scrapedFlight = scrapedMap.get(flightKey);
            
            if (!scrapedFlight) {
                flightsToCancel.push(dbFlight);
            } else {
                // Compare duration and time
                const scrapedDurationMins = parseDurationToMinutes(scrapedFlight.duration);
                const dbTimeObj = new Date(dbFlight.direction === 'departure' ? dbFlight.departure_time : dbFlight.arrival_time);
                
                // Original import creates ISO string directly with Z, so UTC hours/mins match exactly the scraped local strings
                const dbTimeStr = `${String(dbTimeObj.getUTCHours()).padStart(2, '0')}:${String(dbTimeObj.getUTCMinutes()).padStart(2, '0')}`;
                
                let timeChanged = false;
                if (scrapedFlight.time && scrapedFlight.time !== dbTimeStr) {
                    timeChanged = true;
                }

                let durationChanged = (scrapedDurationMins > 0 && scrapedDurationMins !== dbFlight.duration);
                let aircraftChanged = (scrapedFlight.aircraft && scrapedFlight.aircraft !== dbFlight.aircraft);

                const hasChanged = timeChanged || durationChanged || aircraftChanged;

                if (hasChanged) {
                    console.log(`[JOB]   Updating record: ${dbFlight.flight_number} ${dbFlight.departure_time}`);
                    const timeColumn = dbFlight.direction === 'departure' ? 'departure_time' : 'arrival_time';
                    const newTimeObj = new Date(dbTimeObj);
                    if (timeChanged) {
                        const [h, m] = scrapedFlight.time.split(':');
                        newTimeObj.setUTCHours(parseInt(h), parseInt(m), 0, 0);
                    }
                    
                    const tableName = dbFlight.direction === 'departure' ? 'departure_flight_paths' : 'arrival_flight_paths';
                    const updateQuery = `
                        UPDATE ${tableName} SET
                            ${timeColumn} = $1,
                            duration = $2,
                            aircraft = $3,
                            status = 'updated',
                            updated_at = NOW()
                        WHERE id = $4
                    `;
                    await pool.query(
                        updateQuery,
                        [
                            newTimeObj,
                            scrapedDurationMins > 0 ? scrapedDurationMins : dbFlight.duration,
                            scrapedFlight.aircraft || dbFlight.aircraft, // Use scraped if available, else keep existing
                            dbFlight.id
                        ]
                    );
                    updatedCount++;
                }
                // Mark as seen so we can identify truly "new" flights later
                scrapedFlight.seenInDb = true;
            }
        }

        // 3. IDENTIFY NEW FLIGHTS (Found in scrape but NOT in DB)
        const newFlights: any[] = [];
        for (const flight of scrapedFlights) {
            if (!flight.seenInDb && flight.flight) {
                newFlights.push(flight);
            }
        }

        if (newFlights.length > 0) {
            console.log(`[JOB]   Discovered ${newFlights.length} new flights for ${airportCode} that are not in the database.`);
            console.log(`[JOB]   Discovery: Please use the bulk importer if you wish to add these new routes/flights.`);
        }

        for (const dbFlight of flightsToCancel) {
            console.log(`[JOB]   Marking as cancelled: ${dbFlight.flight_number} ${dbFlight.departure_time}`);
            const tableName = dbFlight.direction === 'departure' ? 'departure_flight_paths' : 'arrival_flight_paths';
            await pool.query(`UPDATE ${tableName} SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [dbFlight.id]);
            cancelledCount++;
        }

    } catch (err: any) {
        console.error(`[JOB] DB error during comparison: ${err.message}`);
    }
    
    console.log(`[JOB] Database cross-check complete for ${airportCode}: ${cancelledCount} cancelled, ${updatedCount} updated.`);
}

/**
 * Fetches all distinct airport codes from both departure and arrival tables
 */
export async function getAllAirports(): Promise<string[]> {
    try {
        const query = `
            SELECT DISTINCT dep_airport as code FROM departure_flight_paths
            UNION
            SELECT DISTINCT arr_airport as code FROM arrival_flight_paths
        `;
        const { rows } = await pool.query(query);
        return rows.map(r => r.code).filter(Boolean);
    } catch (err: any) {
        console.error(`[JOB] Error fetching airports: ${err.message}`);
        return ['BKK', 'DMK', 'HKT', 'CNX']; // Fallback
    }
}

/**
 * The Schedulers
 */
export function initFlightCrossCheckJobs() {
    // Schedule: 21:00 Thailand Time (14:00 UTC)
    cron.schedule('0 14 * * *', async () => {
        console.log('[CRON] Running daily 21:00 TH flight cross-check for today and next 2 days...');
        
        const airports = await getAllAirports();
        console.log(`[CRON] Detected ${airports.length} airports for cross-check: ${airports.join(', ')}`);
        
        const today = new Date();
        for (let i = 0; i <= 2; i++) {
            const targetDate = format(addDays(today, i), 'yyyy-MM-dd');
            for (const airport of airports) {
                await runCrosscheckForDate(targetDate, airport);
                // Production Safety: 10s pause between airports to release RAM/CPU
                console.log(`[CRON]   Waiting 10s before next airport...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    });
    
    console.log('✅ Registered Flight Cross-Check Scheduled Jobs (21:00 TH)');
}
