-- Migration to add timezone support to airports table
ALTER TABLE airports 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);

COMMENT ON COLUMN airports.timezone IS 'IANA timezone name (e.g., Asia/Bangkok)';
