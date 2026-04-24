import { pool } from '../config/database';
import { format, addDays } from 'date-fns';

export class FutureSyncRepository {
    /**
     * Gets the next date to be synced from our tracking table.
     * Defaults to 2027-01-01 if no record is found.
     */
    async getNextSyncDate(): Promise<string> {
        const query = `SELECT next_date FROM future_sync_status ORDER BY id DESC LIMIT 1`;
        const { rows } = await pool.query(query);
        
        if (rows.length === 0) {
            return '2027-01-01';
        }
        
        // Ensure we return YYYY-MM-DD
        const date = new Date(rows[0].next_date);
        return format(date, 'yyyy-MM-dd');
    }

    /**
     * Increments the sync date by 1 day in the tracking table.
     */
    async incrementNextSyncDate(currentDateStr: string): Promise<string> {
        const currentDate = new Date(currentDateStr);
        const nextDate = addDays(currentDate, 1);
        const nextDateStr = format(nextDate, 'yyyy-MM-dd');

        const query = `
            UPDATE future_sync_status 
            SET next_date = $1, updated_at = NOW()
            WHERE id = (SELECT id FROM future_sync_status ORDER BY id DESC LIMIT 1)
        `;
        await pool.query(query, [nextDateStr]);
        
        return nextDateStr;
    }

    /**
     * Resets the next_date to a specific date.
     * Useful for fixing sync errors or re-running a specific day.
     */
    async resetSyncDate(dateStr: string): Promise<void> {
        const query = `
            UPDATE future_sync_status 
            SET next_date = $1, updated_at = NOW()
            WHERE id = (SELECT id FROM future_sync_status ORDER BY id DESC LIMIT 1)
        `;
        await pool.query(query, [dateStr]);
        console.log(`[FUTURE-REPO] 🔄 Reset sync date to: ${dateStr}`);
    }

    /**
     * Fetches all airport codes that have cross-check enabled.
     */
    async getEnabledAirports(): Promise<string[]> {
        const query = `
            SELECT code FROM airports 
            WHERE is_cross_check_enabled = true
            ORDER BY code
        `;
        const { rows } = await pool.query(query);
        return rows.map(r => r.code).filter(Boolean);
    }

    /**
     * Ensures the future_sync_status table and initial data exist.
     * This can be called during system startup.
     */
    async initializeTable(): Promise<void> {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS future_sync_status (
                id SERIAL PRIMARY KEY,
                next_date DATE NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(createTableQuery);

        const initDataQuery = `
            INSERT INTO future_sync_status (next_date)
            SELECT '2027-01-01'
            WHERE NOT EXISTS (SELECT 1 FROM future_sync_status);
        `;
        await pool.query(initDataQuery);
    }
}

export const futureSyncRepository = new FutureSyncRepository();
