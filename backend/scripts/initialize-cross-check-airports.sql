-- Script: Auto-detect and enable cross-check for active airports
-- This script finds all airports used in arrival_flight_paths and departure_flight_paths
-- and sets is_cross_check_enabled = true for them

-- Step 1: Compute all active airport codes from flight path tables
WITH active_airports AS (
    SELECT DISTINCT UPPER(dep_airport) as code 
    FROM departure_flight_paths 
    WHERE dep_airport IS NOT NULL AND dep_airport != ''
    UNION
    SELECT DISTINCT UPPER(arr_airport) as code 
    FROM arrival_flight_paths 
    WHERE arr_airport IS NOT NULL AND arr_airport != ''
)

-- Step 2: Set the flag to true for active airports, false for inactive airports
UPDATE airports
SET is_cross_check_enabled = (code IN (SELECT code FROM active_airports));

-- Verify the result
SELECT COUNT(*) as total_airports_enabled, STRING_AGG(code, ', ' ORDER BY code) as airport_codes
FROM airports 
WHERE is_cross_check_enabled = true;
