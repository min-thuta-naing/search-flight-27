-- Migration 019: Add status column to flight_paths
-- This column tracks the lifecycle: 'planned', 'cancelled', 'updated'

-- 1. Add status to departure_flight_paths
ALTER TABLE departure_flight_paths ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planned';
CREATE INDEX IF NOT EXISTS idx_departure_flight_paths_status ON departure_flight_paths(status);

-- 2. Add status to arrival_flight_paths
ALTER TABLE arrival_flight_paths ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planned';
CREATE INDEX IF NOT EXISTS idx_arrival_flight_paths_status ON arrival_flight_paths(status);

-- 3. Update comments
COMMENT ON COLUMN departure_flight_paths.status IS 'Flight lifecycle status: planned, cancelled, or updated';
COMMENT ON COLUMN arrival_flight_paths.status IS 'Flight lifecycle status: planned, cancelled, or updated';
