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
    async runCrosscheckForDate(dateStr: string, airportCode: string): Promise<ScrapedFlight[]> {
        await this.executePythonCrosscheck(dateStr, airportCode);
        const results = this.readScrapeResult(dateStr, airportCode);
        this.cleanupResultFile(dateStr, airportCode);
        return results;
    }

    /**
     * Executes the Python script
     */
    private async executePythonCrosscheck(dateStr: string, airportCode: string): Promise<void> {
        console.log(`[SCRAPER] Executing Python crosscheck for ${airportCode} on ${dateStr}...`);
        // Clean up any stale Xvfb lock files
        const cleanupCommand = 'rm -rf /tmp/.X* /tmp/.X11-unix/*';
        const command = `${cleanupCommand} && HOME=/tmp xvfb-run -a python3 ${this.pythonScriptPath} --crosscheck ${dateStr} --airport ${airportCode}`;
        
        try {
            const { stdout, stderr } = await execPromise(command, { timeout: 1200000 }); // 20 min
            if (stderr) console.log(`[SCRAPER] Info for ${airportCode} ${dateStr}:\n${stderr}`);
        } catch (error) {
            console.error(`[SCRAPER] Python script failed for ${airportCode} ${dateStr}:`, error);
            throw error;
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
