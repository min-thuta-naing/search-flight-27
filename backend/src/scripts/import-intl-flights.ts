/**
 * Script to import international flight data from FlightsFrom.com CSV format
 * 
 * Usage:
 *   npm run import-intl-flights
 *   npm run import-intl-flights -- --local
 *   npm run import-intl-flights -- --dir="./data/intl_flight_data"
 *   npm run import-intl-flights -- --file="./backend/data/intl_flight_data/flightsfrom_BKK_2026-01-31.csv"
 */

import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { FlightModel } from '../models/Flight';
import { ImportModel } from '../models/Import';
import { pool } from '../config/database';
import { GoogleDriveService } from '../services/GoogleDriveService';

// Load environment variables
const envPaths = [
    path.join(__dirname, '../../.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'backend/.env'),
];

for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
    }
}

/**
 * Parse CSV line (handles quoted values)
 */
function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values.map(v => v.replace(/^"|"$/g, ''));
}

/**
 * Normalize date to YYYY-MM-DD format
 * Handles both formats:
 * - YYYY-MM-DD (already normalized)
 * - DD/M/YYYY or DD/MM/YYYY (Indonesian format)
 */
function normalizeDateFormat(dateStr: string): string {
    if (!dateStr) return '';

    const trimmedDate = dateStr.trim();

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        return trimmedDate;
    }

    // Handle DD/M/YYYY or DD/MM/YYYY format (Indonesian format)
    // Supports / or - as delimiters
    const dateMatch = trimmedDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3];
        return `${year}-${month}-${day}`;
    }

    return trimmedDate;
}

/**
 * Extract airline code from flight number (e.g., "TG483" -> "TG")
 */
function extractAirlineCodeFromFlight(flight: string): string {
    if (!flight) return '';
    // Check for leading letters (most common for airline codes like TG, VZ, FD)
    const match = flight.match(/^([A-Z]{2,3})/);
    if (match) {
        return match[1];
    }
    // Fallback for codes that might have numbers (less common but possible)
    const alphaNumericMatch = flight.match(/^([A-Z0-9]{2})/);
    return alphaNumericMatch ? alphaNumericMatch[1] : '';
}

/**
 * Convert duration string (e.g., "6h 54m", "10h 0m", "1h 20m") to total minutes
 */
function parseDurationToMinutes(durationStr: string): number {
    if (!durationStr) return 0;

    let totalMinutes = 0;

    const hMatch = durationStr.match(/(\d+)h/);
    if (hMatch) {
        totalMinutes += parseInt(hMatch[1], 10) * 60;
    }

    const mMatch = durationStr.match(/(\d+)m/);
    if (mMatch) {
        totalMinutes += parseInt(mMatch[1], 10);
    }

    return totalMinutes;
}

/**
 * Calculate arrival time based on departure date, time, and duration
 */
function calculateArrivalTime(dateStr: string, timeStr: string, durationMinutes: number): string {
    // Ensure date is in YYYY-MM-DD format
    const normalizedDate = normalizeDateFormat(dateStr);
    if (!normalizedDate || !timeStr) return '';

    // Construct UTC date-time
    // timeStr format: HH:MM or H:MM
    const timeParts = timeStr.trim().split(':');
    if (timeParts.length < 2) return '';

    let [hours, minutes] = timeParts;

    // Pad hours with leading zero if necessary
    if (hours.length === 1) {
        hours = '0' + hours;
    }
    if (minutes.length === 1) {
        minutes = '0' + minutes;
    }

    // Ensure minutes are only 2 digits
    minutes = minutes.substring(0, 2);

    const departure = new Date(`${normalizedDate}T${hours}:${minutes}:00Z`);
    if (isNaN(departure.getTime())) {
        return '';
    }

    const arrival = new Date(departure.getTime() + durationMinutes * 60000);
    return arrival.toISOString();
}

/**
 * Map Thai airline names to English names
 */
function getAirlineInfo(airlineName: string, airlineCode: string): { name: string; nameTh: string } {
    // This is a simplified map, can be expanded
    const airlineMap: Record<string, { name: string; nameTh: string }> = {
        'TG': { name: 'Thai Airways', nameTh: 'การบินไทย' },
        'PG': { name: 'Bangkok Airways', nameTh: 'บางกอกแอร์เวย์' },
        'FD': { name: 'Thai AirAsia', nameTh: 'ไทยแอร์เอเชีย' },
        'VZ': { name: 'Thai Vietjet Air', nameTh: 'ไทยเวียดเจ็ทแอร์' },
        'DD': { name: 'Nok Air', nameTh: 'นกแอร์' },
        'SL': { name: 'Thai Lion Air', nameTh: 'ไทยไลอ้อนแอร์' },
        'EK': { name: 'Emirates', nameTh: 'เอมิเรตส์' },
        'CX': { name: 'Cathay Pacific', nameTh: 'คาเธ่ย์ แปซิฟิค' },
        'QR': { name: 'Qatar Airways', nameTh: 'กาตาร์ แอร์เวย์' },
        'SQ': { name: 'Singapore Airlines', nameTh: 'สิงคโปร์แอร์ไลน์' },
    };

    if (airlineMap[airlineCode]) {
        return airlineMap[airlineCode];
    }

    return {
        name: airlineName || airlineCode,
        nameTh: airlineName || airlineCode,
    };
}

/**
 * Get human-readable airport display name (e.g., "HKT" -> "Phuket (HKT)")
 */
function getAirportDisplayName(code: string): string {
    const airportMap: Record<string, string> = {
        'BKK': 'Bangkok (BKK)',
        'DMK': 'Bangkok (DMK)',
        'HKT': 'HKT Phuket',
        'CNX': 'Chiang Mai (CNX)',
        'KBV': 'Krabi (KBV)',
        'HDY': 'Hat Yai (HDY)',
        'UTH': 'Udon Thani (UTH)',
        'USM': 'Koh Samui (USM)',
        'CEI': 'Chiang Rai (CEI)',
        'UBP': 'Ubon Ratchathani (UBP)',
        'KKC': 'Khon Kaen (KKC)',
        'NST': 'Nakhon Si Thammarat (NST)',
        'URT': 'Surat Thani (URT)',
        'TDX': 'Trat (TDX)',
        'NAW': 'Narathiwat (NAW)',
        'BFV': 'Buri Ram (BFV)',
        'THS': 'Sukhothai (THS)',
        'UTP': 'Rayong/Pattaya (UTP)',
    };

    return airportMap[code] || `${code} (${code})`;
}

/**
 * Import flight data from a single CSV file (FlightsFrom.com format)
 */
async function importIntlCSVFile(
    csvContent: string, 
    fileName: string,
    routeCache: Map<string, any>,
    airlineCache: Map<string, any>
): Promise<{
    processed: number;
    stored: number;
    skipped: number;
    errors: number;
}> {
    console.log(`\n📄 Processing International Data: ${fileName}`);

    if (!csvContent) {
        console.error(`❌ No content found for: ${fileName}`);
        return { processed: 0, stored: 0, skipped: 0, errors: 1 };
    }
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length <= 1) {
        console.warn(`⚠️  CSV file is empty or has no data rows`);
        return { processed: 0, stored: 0, skipped: 0, errors: 0 };
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);
    // Expected headers: date,airport,direction,time,destination,flight,airline,duration,raw_text,scraped_at,aircraft
    const expectedHeaders = ['date', 'airport', 'direction', 'time', 'destination', 'flight', 'duration'];

    // Validate headers
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
        console.error(`❌ Missing required headers in international CSV: ${missingHeaders.join(', ')}`);
        console.error(`   Found headers: ${headers.join(', ')}`);
        return { processed: 0, stored: 0, skipped: 0, errors: 1 };
    }

    let totalProcessed = 0;
    let totalStored = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Caches are now passed as arguments for global reuse

    const BATCH_SIZE = 500;
    const departureBatch: any[] = [];
    const arrivalBatch: any[] = [];

    console.log(`[${fileName}] 📊 Processing ${lines.length - 1} rows...`);

    for (let i = 1; i < lines.length; i++) {
        try {
            const values = parseCSVLine(lines[i]);
            const row: any = {};
            headers.forEach((h, idx) => row[h] = values[idx]);

            if (!row.flight || !row.time || !row.date || !row.destination) {
                totalSkipped++;
                continue;
            }

            // Normalize date format to YYYY-MM-DD
            row.date = normalizeDateFormat(row.date);
            if (!row.date) {
                console.error(`   ❌ Error processing row ${i + 1}: Invalid date format`);
                totalErrors++;
                continue;
            }

            // Extract other airport code (e.g., "PER Perth" -> "PER")
            const otherAirportMatch = row.destination.match(/^([A-Z0-9]{3})/);
            const otherAirport = otherAirportMatch ? otherAirportMatch[1] : '';
            if (!otherAirport) {
                totalSkipped++;
                continue;
            }

            const csvAirport = row.airport.trim().toUpperCase(); // e.g., BKK
            const direction = row.direction.toLowerCase();

            if (otherAirport === csvAirport) {
                totalSkipped++;
                continue;
            }
            const durationMinutes = parseDurationToMinutes(row.duration);

            let originCode, destinationCode, departureTimeUTC, arrivalTimeUTC, displayDestination;

            if (direction === 'arrival') {
                // Flight arriving at csvAirport (BKK) from otherAirport (PER)
                originCode = otherAirport;
                destinationCode = csvAirport;
                
                // For arrivals, the CSV time is the arrival time
                // timeStr format: HH:MM or H:MM
                const timeParts = row.time.trim().split(':');
                if (timeParts.length < 2) {
                    console.warn(`   ⚠️  Row ${i + 1}: Invalid time format '${row.time}'`);
                    totalErrors++;
                    continue;
                }
                
                let [hours, minutes] = timeParts;
                if (hours.length === 1) hours = '0' + hours;
                if (minutes.length === 1) minutes = '0' + minutes;
                minutes = minutes.substring(0, 2);

                arrivalTimeUTC = `${row.date}T${hours}:${minutes}:00Z`;
                const arrivalDate = new Date(arrivalTimeUTC);
                
                if (isNaN(arrivalDate.getTime())) {
                    console.error(`   ❌ Row ${i + 1}: Invalid arrival date-time resulting from '${row.date}T${hours}:${minutes}:00Z'`);
                    totalErrors++;
                    continue;
                }

                const departureDate = new Date(arrivalDate.getTime() - durationMinutes * 60000);
                departureTimeUTC = departureDate.toISOString();
                displayDestination = getAirportDisplayName(csvAirport);
            } else {
                // Flight departing from csvAirport (BKK) to otherAirport (PER)
                originCode = csvAirport;
                destinationCode = otherAirport;
                
                // For departures, the CSV time is the departure time
                departureTimeUTC = calculateArrivalTime(row.date, row.time, 0); // Get ISO string for departure
                if (!departureTimeUTC) {
                    console.error(`   ❌ Row ${i + 1}: Invalid departure date-time from date '${row.date}', time '${row.time}'`);
                    totalErrors++;
                    continue;
                }
                
                arrivalTimeUTC = calculateArrivalTime(row.date, row.time, durationMinutes);
                if (!arrivalTimeUTC) {
                    console.error(`   ❌ Row ${i + 1}: Error calculating arrival time for date '${row.date}', time '${row.time}', duration ${durationMinutes}`);
                    totalErrors++;
                    continue;
                }
                
                displayDestination = row.destination; // Keeps "PER Perth"
            }

            const routeKey = `${originCode}-${destinationCode}`;

            // Get or create route
            let route = routeCache.get(routeKey);
            if (!route) {
                route = await FlightModel.getOrCreateRoute(originCode, destinationCode, 0, 0);
                routeCache.set(routeKey, route);
            }

            // Extract airline code
            const airlineCode = extractAirlineCodeFromFlight(row.flight);
            if (!airlineCode) {
                totalSkipped++;
                continue;
            }

            // Get or create airline
            let airline = airlineCache.get(airlineCode);
            if (!airline) {
                const airlineInfo = getAirlineInfo(row.airline, airlineCode);
                airline = await FlightModel.getOrCreateAirline(airlineCode, airlineInfo.name, airlineInfo.nameTh);
                airlineCache.set(airlineCode, airline);
            }

            const departureDateObj = new Date(departureTimeUTC);
            departureDateObj.setUTCHours(0, 0, 0, 0);

            const arrivalDateObj = new Date(arrivalTimeUTC);
            arrivalDateObj.setUTCHours(0, 0, 0, 0);

            const flightRecord = {
                route_id: route.id,
                airline_id: airline.id,
                departure_date: departureDateObj,
                arrival_date: arrivalDateObj,
                departure_time: departureTimeUTC,
                arrival_time: arrivalTimeUTC,
                duration: durationMinutes,
                flight_number: row.flight,
                trip_type: 'one-way',
                travel_class: 'economy',
                source: 'flightsfrom.com',
                dep_airport: originCode,
                arr_airport: destinationCode,
                destination: displayDestination,
                airline_name: airline.name,
                airline_code: airlineCode,
                aircraft: row.aircraft || null,
                status: 'planned',
                stops: 0
            };

            if (direction === 'departure') {
                departureBatch.push(flightRecord);
            } else {
                arrivalBatch.push(flightRecord);
            }

            totalProcessed++;

            if (departureBatch.length >= BATCH_SIZE) {
                const uniqueMap = new Map();
                for (const record of departureBatch) {
                    const departureDateStr = record.departure_date.toISOString().split('T')[0];
                    const arrivalDateStr = record.arrival_date.toISOString().split('T')[0];
                    const key = `${record.route_id}_${record.airline_id}_${departureDateStr}_${arrivalDateStr}_${record.trip_type}_${record.flight_number}_${record.departure_time}`;
                    uniqueMap.set(key, record);
                }
                const deduplicatedBatch = Array.from(uniqueMap.values());
                await FlightModel.batchInsertFlightPaths(deduplicatedBatch, true);
                totalStored += deduplicatedBatch.length;
                departureBatch.length = 0;
            }

            if (arrivalBatch.length >= BATCH_SIZE) {
                const uniqueMap = new Map();
                for (const record of arrivalBatch) {
                    const departureDateStr = record.departure_date.toISOString().split('T')[0];
                    const arrivalDateStr = record.arrival_date.toISOString().split('T')[0];
                    const key = `${record.route_id}_${record.airline_id}_${departureDateStr}_${arrivalDateStr}_${record.trip_type}_${record.flight_number}_${record.departure_time}`;
                    uniqueMap.set(key, record);
                }
                const deduplicatedBatch = Array.from(uniqueMap.values());
                await FlightModel.batchInsertFlightPaths(deduplicatedBatch, false);
                totalStored += deduplicatedBatch.length;
                arrivalBatch.length = 0;
            }
        } catch (error: any) {
            totalErrors++;
            console.error(`   ❌ Error processing row ${i + 1}:`, error.message);
        }
    }

    if (departureBatch.length > 0) {
        const uniqueMap = new Map();
        for (const record of departureBatch) {
            const departureDateStr = record.departure_date.toISOString().split('T')[0];
            const arrivalDateStr = record.arrival_date.toISOString().split('T')[0];
            const key = `${record.route_id}_${record.airline_id}_${departureDateStr}_${arrivalDateStr}_${record.trip_type}_${record.flight_number}_${record.departure_time}`;
            uniqueMap.set(key, record);
        }
        const deduplicatedBatch = Array.from(uniqueMap.values());
        await FlightModel.batchInsertFlightPaths(deduplicatedBatch, true);
        totalStored += deduplicatedBatch.length;
    }

    if (arrivalBatch.length > 0) {
        const uniqueMap = new Map();
        for (const record of arrivalBatch) {
            const departureDateStr = record.departure_date.toISOString().split('T')[0];
            const arrivalDateStr = record.arrival_date.toISOString().split('T')[0];
            const key = `${record.route_id}_${record.airline_id}_${departureDateStr}_${arrivalDateStr}_${record.trip_type}_${record.flight_number}_${record.departure_time}`;
            uniqueMap.set(key, record);
        }
        const deduplicatedBatch = Array.from(uniqueMap.values());
        await FlightModel.batchInsertFlightPaths(deduplicatedBatch, false);
        totalStored += deduplicatedBatch.length;
    }

    console.log(`[${fileName}] ✅ Completed: ${totalStored} stored, ${totalSkipped} skipped, ${totalErrors} errors`);
    return { processed: totalProcessed, stored: totalStored, skipped: totalSkipped, errors: totalErrors };
}

/**
 * Process a batch of files with a concurrency limit
 */
async function processFilesParallel(
    files: Array<{ name: string, id?: string, localPath?: string }>,
    concurrency: number,
    driveService: GoogleDriveService | null,
    routeCache: Map<string, any>,
    airlineCache: Map<string, any>,
    forceImport: boolean = false
) {
    let totalStored = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let processedFileCount = 0;

    const queue = [...files];
    const activeTasks: Promise<void>[] = [];

    const processNext = async (): Promise<void> => {
        if (queue.length === 0) return;

        const fileInfo = queue.shift()!;
        const fileName = fileInfo.name;
        const currentIdx = ++processedFileCount;

        try {
            if (!forceImport) {
                const alreadyImported = await ImportModel.isFileImported(fileName);
                if (alreadyImported) {
                    skippedCount++;
                    return processNext();
                }
            }

            console.log(`⏳ [${currentIdx}/${files.length}] Processing ${fileName}...`);
            let content = '';
            if (fileInfo.localPath) {
                content = fs.readFileSync(fileInfo.localPath, 'utf-8');
            } else if (fileInfo.id && driveService) {
                content = await driveService.downloadFileContent(fileInfo.id);
            }

            if (content) {
                const result = await importIntlCSVFile(content, fileName, routeCache, airlineCache);

                if (result.stored > 0 && result.errors === 0) {
                    await ImportModel.markFileImported(fileName);
                    console.log(`✅ Marked as imported: ${fileName}`);
                } else if (result.stored > 0) {
                    console.log(`⚠️  Imported with some errors, not marking as complete: ${fileName}`);
                }
                totalStored += result.stored;
            }
        } catch (err: any) {
            console.error(`❌ Failed to process ${fileName}:`, err.message);
            errorCount++;
        }

        return processNext();
    };

    // Start initial workers
    for (let i = 0; i < Math.min(concurrency, files.length); i++) {
        activeTasks.push(processNext());
    }

    await Promise.all(activeTasks);

    return { totalStored, skippedCount, errorCount };
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const csvDirArg = args.find(arg => arg.startsWith('--dir='))?.split('=')[1];
    const csvFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];
    const useDrive = args.includes('--drive');
    const useLocal = args.includes('--local') || (!useDrive && !csvFile && !csvDirArg);
    const folderId = args.find(arg => arg.startsWith('--folder-id='))?.split('=')[1] || '1GOFxWqbZQABNylMAL7xORETo85XJw8vv';
    const limit = parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '0');

    // Default directory logic: prioritize backend/data/intl_flight_data
    let csvDir = csvDirArg;
    if (!csvDir && !csvFile && !useDrive) {
        const possibleDirs = [
            path.join(process.cwd(), 'backend/data/intl_flight_data'),
            path.join(process.cwd(), 'data/intl_flight_data'),
            './backend/data/intl_flight_data',
            './data/intl_flight_data'
        ];
        
        for (const d of possibleDirs) {
            if (fs.existsSync(d)) {
                csvDir = d;
                break;
            }
        }
        
        if (!csvDir) {
            csvDir = './backend/data/intl_flight_data'; // Fallback
        }
    }

    // Check for force import
    const forceImport = process.env.FORCE_IMPORT === 'true' || args.includes('--force');

    console.log('\n' + '='.repeat(80));
    console.log('✈️  International Flight Data CSV Importer (FlightsFrom.com)');
    if (useDrive) {
        console.log(`📂 Source: Google Drive (Folder ID: ${folderId})`);
    } else if (useLocal) {
        console.log(`📂 Source: Local Manual Folder (${csvDir})`);
    } else {
        console.log(`📂 Source: Local Target (${csvFile || csvDir})`);
    }
    console.log(`DEBUG: Script Version - Local & Drive Support Active`);
    console.log('='.repeat(80));

    let csvFiles: string[] = [];

    /**
     * Recursively get all files in a directory
     */
    function getFilesRecursively(dir: string): string[] {
        let results: string[] = [];
        if (!fs.existsSync(dir)) return results;

        const list = fs.readdirSync(dir);
        for (const file of list) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat && stat.isDirectory()) {
                results = results.concat(getFilesRecursively(fullPath));
            } else if (file.endsWith('.csv')) {
                results.push(fullPath);
            }
        }
        return results;
    }

    let localFiles: string[] = [];
    if (!useDrive) {
        if (csvFile) {
            const fullPath = path.isAbsolute(csvFile) ? csvFile : path.join(process.cwd(), csvFile);
            localFiles = [fullPath];
        } else if (csvDir) {
            const fullDir = path.isAbsolute(csvDir) ? csvDir : path.join(process.cwd(), csvDir);
            if (fs.existsSync(fullDir)) {
                localFiles = getFilesRecursively(fullDir);
            }
        }
    }


    let totalStored = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const routeCache = new Map<string, any>();
    const airlineCache = new Map<string, any>();
    const CONCURRENCY = 1;

    try {
        if (useDrive) {
            const serviceAccountPath = path.join(process.cwd(), 'flight-data-import-f13fe24a45ef.json');
            if (!fs.existsSync(serviceAccountPath)) {
                console.error(`❌ Google Service Account file not found at: ${serviceAccountPath}`);
                process.exit(1);
            }

            const driveService = new GoogleDriveService(serviceAccountPath);
            console.log(`🔍 Stage 1/2: Discovering files from Google Drive (this may take a few minutes)...`);
            
            const driveFiles: Array<{ name: string, id: string }> = [];
            await driveService.walkCSVFiles(folderId, async (file) => {
                if (limit > 0 && driveFiles.length >= limit) return;
                driveFiles.push({ name: file.name || 'unknown.csv', id: file.id! });
            });

            console.log(`📊 Stage 2/2: Found ${driveFiles.length} files. Starting parallel import with concurrency ${CONCURRENCY}...`);
            const result = await processFilesParallel(driveFiles, CONCURRENCY, driveService, routeCache, airlineCache, forceImport);
            
            totalStored = result.totalStored;
            skippedCount = result.skippedCount;
            errorCount = result.errorCount;

        } else {
            if (localFiles.length === 0) {
                console.error(`❌ No CSV files found locally.`);
                process.exit(1);
            }

            if (limit > 0) {
                console.log(`ℹ️  Limiting to first ${limit} files.`);
                localFiles = localFiles.slice(0, limit);
            }

            const formattedLocalFiles = localFiles.map(f => ({ name: path.basename(f), localPath: f }));
            console.log(`📊 Found ${formattedLocalFiles.length} local files. Starting parallel import with concurrency ${CONCURRENCY}...`);
            const result = await processFilesParallel(formattedLocalFiles, CONCURRENCY, null, routeCache, airlineCache, forceImport);
            
            totalStored = result.totalStored;
            skippedCount = result.skippedCount;
            errorCount = result.errorCount;
        }

        if (skippedCount > 0) {
            console.log(`⏩ Skipped ${skippedCount} already imported file(s)`);
        }
        if (errorCount > 0) {
            console.log(`❌ Failed to process ${errorCount} file(s)`);
        }
        console.log(`\n🎉 Total successfully stored: ${totalStored}`);
    } catch (error: any) {
        console.error(`❌ Fatal Error:`, error.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    main();
}
