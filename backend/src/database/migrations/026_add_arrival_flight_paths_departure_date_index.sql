-- Migration 026: Index arrival_flight_paths by departure_date
--
-- All dashboard queries filter both tables by departure_date, but the existing
-- arrival_flight_paths indexes only cover arrival_date.  Every UNION ALL branch
-- on arrival_flight_paths that lacks an airport predicate (world summary, continent
-- detail, top ranks, top routes, country overview …) was doing a full sequential
-- scan.  This single index covers all those date-range-only WHERE clauses.
--
-- The compound variant (departure_date, arr_airport) also covers the case where
-- an arr_airport filter is added after the date range, avoiding a second lookup.

CREATE INDEX IF NOT EXISTS idx_arrival_flight_paths_departure_date
ON arrival_flight_paths(departure_date);

CREATE INDEX IF NOT EXISTS idx_arrival_flight_paths_departure_date_arr
ON arrival_flight_paths(departure_date, arr_airport);

COMMENT ON INDEX idx_arrival_flight_paths_departure_date IS 'Covers dashboard UNION ALL branches that filter arrival_flight_paths by departure_date only';
COMMENT ON INDEX idx_arrival_flight_paths_departure_date_arr IS 'Covers dashboard branches that filter arrival_flight_paths by departure_date + arr_airport';
