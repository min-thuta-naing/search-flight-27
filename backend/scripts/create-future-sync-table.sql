-- Table to track the progress of automated future flight data pulls
CREATE TABLE IF NOT EXISTS future_sync_status (
    id SERIAL PRIMARY KEY,
    next_date DATE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initialize with 2027-01-01 if empty
INSERT INTO future_sync_status (next_date)
SELECT '2027-01-01'
WHERE NOT EXISTS (SELECT 1 FROM future_sync_status);
