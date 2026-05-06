-- Migration 025: Add cross-direction indexes for dashboard UNION ALL queries
-- The dashboard queries scan both tables for both directions (dep → arr and arr → dep).
-- The existing indexes cover dep_airport on departure_flight_paths and arr_airport on
-- arrival_flight_paths, but the cross-direction branches were doing sequential scans.

-- Inbound branch: departure_flight_paths WHERE arr_airport = ANY(...)
CREATE INDEX IF NOT EXISTS idx_departure_flight_paths_arr_airport_date
ON departure_flight_paths(arr_airport, departure_date);

-- Outbound branch: arrival_flight_paths WHERE dep_airport = ANY(...)
CREATE INDEX IF NOT EXISTS idx_arrival_flight_paths_dep_airport_date
ON arrival_flight_paths(dep_airport, departure_date);

COMMENT ON INDEX idx_departure_flight_paths_arr_airport_date IS 'Supports dashboard UNION ALL branch that reads inbound legs from departure_flight_paths';
COMMENT ON INDEX idx_arrival_flight_paths_dep_airport_date IS 'Supports dashboard UNION ALL branch that reads outbound legs from arrival_flight_paths';
