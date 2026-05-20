-- Migration 028: Compound indexes on normalized airport columns + departure_date
--
-- Migration 027 added single-column indexes on dep_airport_upper / arr_airport_upper.
-- Migration 018 already had compound indexes on the old dep_airport / arr_airport columns:
--   idx_departure_flight_paths_airport_date     (dep_airport, departure_date)
--   idx_departure_flight_paths_arr_airport_date (arr_airport, departure_date)
--
-- This migration adds the equivalent compound indexes for the normalized (_upper) columns
-- so the query planner can seek by airport code then range-scan by date in one index pass.
-- Without these, large-window queries (90/180/365 days) must either:
--   a) full-scan the date range and re-filter by airport, or
--   b) use the single-column airport index and re-check dates row-by-row
-- Both are significantly slower than a compound index seek.

CREATE INDEX IF NOT EXISTS idx_dep_fp_dep_upper_date
  ON departure_flight_paths (dep_airport_upper, departure_date);

CREATE INDEX IF NOT EXISTS idx_dep_fp_arr_upper_date
  ON departure_flight_paths (arr_airport_upper, departure_date);

CREATE INDEX IF NOT EXISTS idx_arr_fp_dep_upper_date
  ON arrival_flight_paths (dep_airport_upper, departure_date);

CREATE INDEX IF NOT EXISTS idx_arr_fp_arr_upper_date
  ON arrival_flight_paths (arr_airport_upper, departure_date);