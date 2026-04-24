-- Migration: Add is_cross_check_enabled flag to airports table
-- This flag determines which airports to include in daily cross-check batches
-- Replaces dynamic scanning of arrival_flight_paths and departure_flight_paths

ALTER TABLE airports 
ADD COLUMN IF NOT EXISTS is_cross_check_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN airports.is_cross_check_enabled IS 'When TRUE, this airport is included in daily cross-check batches. Set automatically when airport appears in arrival_flight_paths or departure_flight_paths.';

-- Create index for efficient querying of cross-check airports
CREATE INDEX IF NOT EXISTS idx_airports_cross_check_enabled 
ON airports(code) 
WHERE is_cross_check_enabled = true;
