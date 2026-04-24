/**
 * Script: Sync cross-check enabled flag for airports
 * Run this periodically or after importing new flight data
 * 
 * Usage: npx ts-node src/scripts/sync-cross-check-airports.ts
 */

import { pool } from '../config/database';

async function syncCrossCheckAirports() {
    const startTime = Date.now();
    console.log('[SYNC] Starting cross-check airport sync...');

    try {
        // Step 1: Get all airports currently in departure_flight_paths
        const depResult = await pool.query(`
            SELECT DISTINCT UPPER(dep_airport) as code 
            FROM departure_flight_paths 
            WHERE dep_airport IS NOT NULL AND dep_airport != ''
        `);

        // Step 2: Get all airports currently in arrival_flight_paths
        const arrResult = await pool.query(`
            SELECT DISTINCT UPPER(arr_airport) as code 
            FROM arrival_flight_paths 
            WHERE arr_airport IS NOT NULL AND arr_airport != ''
        `);

        // Combine and deduplicate
        const activeCodes = new Set<string>();
        depResult.rows.forEach(row => activeCodes.add(row.code));
        arrResult.rows.forEach(row => activeCodes.add(row.code));

        console.log(`[SYNC] Found ${activeCodes.size} active airport codes in flight paths`);
        console.log(`[SYNC] Active airports: ${Array.from(activeCodes).join(', ')}`);

        // Step 3: Update is_cross_check_enabled flag
        const activeCodesArray = Array.from(activeCodes);
        
        // Enable for active airports
        if (activeCodesArray.length > 0) {
            await pool.query(
                `UPDATE airports SET is_cross_check_enabled = true WHERE code = ANY($1)`,
                [activeCodesArray]
            );
            console.log(`[SYNC] ✅ Enabled ${activeCodesArray.length} airports for cross-check`);
        }

        // Step 4: Disable for airports NOT in flight paths (optional cleanup)
        const countResult = await pool.query(`
            SELECT COUNT(*) as disabled_count 
            FROM airports 
            WHERE is_cross_check_enabled = true AND code != ALL($1)
        `, [activeCodesArray]);

        if (countResult.rows[0].disabled_count > 0) {
            await pool.query(
                `UPDATE airports SET is_cross_check_enabled = false WHERE code != ALL($1)`,
                [activeCodesArray]
            );
            console.log(`[SYNC] ✅ Disabled ${countResult.rows[0].disabled_count} unused airports from cross-check`);
        }

        // Step 5: Report final state
        const finalResult = await pool.query(`
            SELECT COUNT(*) as enabled_count, STRING_AGG(code, ', ' ORDER BY code) as codes
            FROM airports 
            WHERE is_cross_check_enabled = true
        `);

        const duration = (Date.now() - startTime) / 1000;
        console.log(`\n[SYNC] Final state: ${finalResult.rows[0].enabled_count} airports enabled`);
        console.log(`[SYNC] Airports: ${finalResult.rows[0].codes || 'None'}`);
        console.log(`[SYNC] Completed in ${duration.toFixed(2)}s ✅\n`);

    } catch (err: any) {
        console.error('[SYNC] Error syncing airports:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the sync
syncCrossCheckAirports();
