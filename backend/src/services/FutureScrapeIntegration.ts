import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

export class FutureScrapeIntegration {
    private readonly pythonScriptPath = '/app/src/scripts/future_flight_scraper.py';
    // Use a dedicated directory for future pulls to avoid mixing with daily crosscheck
    private readonly outputDir = path.join(__dirname, '../../data/future_pull_data');

    /**
     * Executes the future flight scraper for a specific airport and date.
     * Pulls exactly one day as requested.
     */
    async scrapeFutureDate(dateStr: string, airportCode: string, workerId: number = 0): Promise<string[]> {
        console.log(`[FUTURE-SCRAPER] Starting scrape for ${airportCode} on ${dateStr} (Worker ${workerId})...`);
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        // command: python3 future_flight_scraper.py --range 2027-01-01:2027-01-01 --airport BKK --out-dir ...
        const dateRange = `${dateStr}:${dateStr}`;
        const command = `HOME=/tmp xvfb-run -a python3 ${this.pythonScriptPath} --range ${dateRange} --airport ${airportCode} --out-dir ${this.outputDir} --worker-id ${workerId}`;
        
        try {
            const { stdout, stderr } = await execPromise(command, { timeout: 1200000 }); // 20 min
            if (stderr) console.log(`[FUTURE-SCRAPER] Info for ${airportCode} ${dateStr}:\n${stderr}`);
            
            // Return paths to the generated files
            // Pattern: flightsfrom_AIRPORT_YYYY-MM-DD.csv
            const csvPath = path.join(this.outputDir, `flightsfrom_${airportCode.toUpperCase()}_${dateStr}.csv`);
            const jsonPath = path.join(this.outputDir, `flightsfrom_${airportCode.toUpperCase()}_${dateStr}.json`);
            
            const generatedFiles: string[] = [];
            if (fs.existsSync(csvPath)) generatedFiles.push(csvPath);
            if (fs.existsSync(jsonPath)) generatedFiles.push(jsonPath);
            
            return generatedFiles;
        } catch (error) {
            console.error(`[FUTURE-SCRAPER] Python script failed for ${airportCode} ${dateStr}:`, error);
            throw error;
        } finally {
            // ALWAYS clean up zombie chrome processes for this worker
            await this.forceCleanup(workerId);
        }
    }

    /**
     * Forcefully kills any leftover chrome processes for a specific worker
     */
    private async forceCleanup(workerId: number): Promise<void> {
        try {
            const profileMarker = `chrome_profile_uc_${workerId}`;
            const cleanupCommand = `pkill -9 -f "chrome.*${profileMarker}" || true`;
            await execPromise(cleanupCommand);
        } catch (err) {
            // Ignore cleanup errors
        }
    }

    /**
     * Deletes the temporary files after import
     */
    async cleanupFiles(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`[FUTURE-SCRAPER] Cleaned up temporary file: ${path.basename(filePath)}`);
                } catch (err: any) {
                    console.warn(`[FUTURE-SCRAPER] Cleanup failed for ${filePath}: ${err.message}`);
                }
            }
        }
    }
}

export const futureScrapeIntegration = new FutureScrapeIntegration();
