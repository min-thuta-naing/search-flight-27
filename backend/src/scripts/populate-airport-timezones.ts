/**
 * Script to populate timezone column in airports table based on latitude and longitude
 * 
 * Usage:
 *   npx tsx src/scripts/populate-airport-timezones.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { pool } from '../config/database';
// @ts-ignore
import tzlookup from 'tz-lookup';

// Load environment variables
dotenv.config();

async function populateTimezones() {
    console.log('🌍 Starting Airport Timezone Population...');
    
    try {
        // 1. Fetch airports that have coordinates but no timezone
        const { rows: airports } = await pool.query(
            'SELECT id, code, latitude, longitude FROM airports WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND timezone IS NULL'
        );

        console.log(`📊 Found ${airports.length} airports to process.`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const airport of airports) {
            try {
                const lat = parseFloat(airport.latitude);
                const lon = parseFloat(airport.longitude);
                
                // 2. Lookup timezone
                const tz = tzlookup(lat, lon);
                
                if (tz) {
                    // 3. Update database
                    await pool.query(
                        'UPDATE airports SET timezone = $1, updated_at = NOW() WHERE id = $2',
                        [tz, airport.id]
                    );
                    updatedCount++;
                }

                if (updatedCount % 50 === 0 && updatedCount > 0) {
                    console.log(`✅ Processed ${updatedCount} airports...`);
                }
            } catch (err: any) {
                console.error(`❌ Error processing ${airport.code}: ${err.message}`);
                errorCount++;
            }
        }

        // Special case: Ensure common airports are definitely set if they were missing coords (fallback)
        const commonTimezones: Record<string, string> = {
            'BKK': 'Asia/Bangkok', 'DMK': 'Asia/Bangkok', 'CNX': 'Asia/Bangkok', 'HKT': 'Asia/Bangkok',
            'ARN': 'Europe/Stockholm', 'GOT': 'Europe/Stockholm', 'MMX': 'Europe/Stockholm', 'BMA': 'Europe/Stockholm'
        };

        for (const [code, tz] of Object.entries(commonTimezones)) {
            await pool.query(
                'UPDATE airports SET timezone = $1, updated_at = NOW() WHERE code = $2 AND timezone IS NULL',
                [tz, code]
            );
        }

        console.log('\n' + '='.repeat(50));
        console.log(`🎉 Population Finished!`);
        console.log(`✅ Successfully updated: ${updatedCount} airports`);
        console.log(`❌ Errors encountered: ${errorCount}`);
        console.log('='.repeat(50));

    } catch (error: any) {
        console.error('❌ Fatal error during population:', error.message);
    } finally {
        await pool.end();
    }
}

populateTimezones();
