import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { ScrapedFlight } from './FlightCrossCheckService';

const execPromise = util.promisify(exec);

export class FlightScrapeIntegration {
    private readonly pythonScriptPath = '/app/src/scripts/flight_scraper.py';
    private readonly outputDir = path.join(__dirname, '../../data/intl_flight_data');

    /**
     * Entry point for scraping a specific date/airport
     */
    async runCrosscheckForDate(dateStr: string, airportCode: string, workerId: number = 0): Promise<ScrapedFlight[]> {
        await this.executePythonCrosscheck(dateStr, airportCode, workerId);
        const results = this.readScrapeResult(dateStr, airportCode);
        this.cleanupResultFile(dateStr, airportCode);
        return results;
    }

    /**
     * Executes the Python script
     */
    private async executePythonCrosscheck(dateStr: string, airportCode: string, workerId: number): Promise<void> {
        console.log(`[SCRAPER] Executing Python crosscheck for ${airportCode} on ${dateStr} (Worker ${workerId})...`);
        
        // Use xvfb-run -a for stability in Docker. 
        // We pass --worker-id to ensure separate Chrome profiles for parallel runs.
        const command = `HOME=/tmp xvfb-run -a python3 ${this.pythonScriptPath} --crosscheck ${dateStr} --airport ${airportCode} --worker-id ${workerId}`;
        
        try {
            const { stdout, stderr } = await execPromise(command, { timeout: 1200000 }); // 20 min
            if (stderr) console.log(`[SCRAPER] Info for ${airportCode} ${dateStr}:\n${stderr}`);
        } catch (error) {
            console.error(`[SCRAPER] Python script failed for ${airportCode} ${dateStr}:`, error);
            throw error;
        } finally {
            // ALWAYS try to clean up zombies for this specific worker
            await this.forceCleanup(workerId);
        }
    }

    /**
     * Forcefully kills any leftover chrome processes for a specific worker
     */
    private async forceCleanup(workerId: number): Promise<void> {
        try {
            // Target processes whose command line contains both 'chrome' and our unique worker profile dir
            // This is "Parallel Safe" - it won't touch other workers.
            const profileMarker = `chrome_profile_uc_${workerId}`;
            console.log(`[SCRAPER-W${workerId}] Running zombie cleanup (Marker: ${profileMarker})...`);
            
            // pkill returns 0 if it kills something, 1 if nothing matched. We ignore the error.
            const cleanupCommand = `pkill -9 -f "chrome.*${profileMarker}" || true`;
            await execPromise(cleanupCommand);
        } catch (err) {
            // Ignore cleanup errors
        }
    }

    /**
     * Reads the JSON result folder
     */
    private readScrapeResult(dateStr: string, airportCode: string): ScrapedFlight[] {
        const resultFile = path.join(this.outputDir, `flightsfrom_${airportCode}_${dateStr}_live.json`);
        
        if (!fs.existsSync(resultFile)) {
            console.log(`[SCRAPER] No result file found at ${resultFile}`);
            return [];
        }

        try {
            const fileContent = fs.readFileSync(resultFile, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            console.error(`[SCRAPER] Failed to parse result file ${resultFile}:`, error);
            return [];
        }
    }

    /**
     * Deletes the temporary JSON file
     */
    private cleanupResultFile(dateStr: string, airportCode: string): void {
        const resultFile = path.join(this.outputDir, `flightsfrom_${airportCode}_${dateStr}_live.json`);
        if (fs.existsSync(resultFile)) {
            try {
                fs.unlinkSync(resultFile);
                console.log(`[SCRAPER] Cleaned up ${resultFile}`);
            } catch (err: any) {
                console.warn(`[SCRAPER] Cleanup failed for ${resultFile}: ${err.message}`);
            }
        }
    }
}

export const flightScrapeIntegration = new FlightScrapeIntegration();
