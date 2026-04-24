-- Drop the old table (we will start fresh for the more professional structure)
DROP TABLE IF EXISTS cross_check_metrics;

-- Create Batch table (Parent)
CREATE TABLE IF NOT EXISTS cross_check_batches (
    id SERIAL PRIMARY KEY,
    run_date DATE NOT NULL,
    total_duration_seconds NUMERIC(10, 2) DEFAULT 0,
    total_airports INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'running', -- 'running', 'success', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Airport Metrics table (Child)
CREATE TABLE IF NOT EXISTS cross_check_airport_metrics (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES cross_check_batches(id) ON DELETE CASCADE,
    airport_code VARCHAR(10) NOT NULL,
    duration_seconds NUMERIC(10, 2) NOT NULL,
    updated_count INTEGER DEFAULT 0,
    cancelled_count INTEGER DEFAULT 0,
    new_flights_count INTEGER DEFAULT 0,
    total_records INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_batch_run_date ON cross_check_batches(run_date);
CREATE INDEX IF NOT EXISTS idx_airport_metrics_batch_id ON cross_check_airport_metrics(batch_id);
CREATE INDEX IF NOT EXISTS idx_airport_metrics_code ON cross_check_airport_metrics(airport_code);
