-- Migration 027: Add pre-computed normalized columns for indexed airport lookups
--
-- Problem: Dashboard queries used UPPER(TRIM(dep_airport)) in WHERE/JOIN clauses,
-- forcing full table scans on every request. A 30-day window query scanned millions
-- of rows across 4-6 sub-queries, causing >30s timeouts.
--
-- Solution: Pre-computed stored columns let the query planner use index seeks instead
-- of full scans when filtering by airport code.
--
-- airports      : GENERATED ALWAYS AS STORED — maintained by Postgres automatically
-- flight_paths  : regular columns + trigger — kept in sync on INSERT/UPDATE

-- ─── 1. airports — generated normalized columns ───────────────────────────────

ALTER TABLE airports
  ADD COLUMN IF NOT EXISTS code_upper  TEXT GENERATED ALWAYS AS (UPPER(TRIM(code)))  STORED,
  ADD COLUMN IF NOT EXISTS code_lower  TEXT GENERATED ALWAYS AS (LOWER(TRIM(code)))  STORED,
  ADD COLUMN IF NOT EXISTS city_upper  TEXT GENERATED ALWAYS AS (UPPER(TRIM(city)))  STORED;

CREATE INDEX IF NOT EXISTS idx_airports_code_upper ON airports (code_upper);
CREATE INDEX IF NOT EXISTS idx_airports_code_lower ON airports (code_lower);
CREATE INDEX IF NOT EXISTS idx_airports_city_upper ON airports (city_upper);

-- ─── 2. departure_flight_paths — normalized columns + backfill ────────────────

ALTER TABLE departure_flight_paths
  ADD COLUMN IF NOT EXISTS dep_airport_upper TEXT,
  ADD COLUMN IF NOT EXISTS arr_airport_upper TEXT;

UPDATE departure_flight_paths
SET
  dep_airport_upper = UPPER(TRIM(dep_airport)),
  arr_airport_upper = UPPER(TRIM(arr_airport))
WHERE dep_airport_upper IS NULL OR arr_airport_upper IS NULL;

CREATE INDEX IF NOT EXISTS idx_dep_fp_dep_airport_upper ON departure_flight_paths (dep_airport_upper);
CREATE INDEX IF NOT EXISTS idx_dep_fp_arr_airport_upper ON departure_flight_paths (arr_airport_upper);

-- ─── 3. arrival_flight_paths — normalized columns + backfill ─────────────────

ALTER TABLE arrival_flight_paths
  ADD COLUMN IF NOT EXISTS dep_airport_upper TEXT,
  ADD COLUMN IF NOT EXISTS arr_airport_upper TEXT;

UPDATE arrival_flight_paths
SET
  dep_airport_upper = UPPER(TRIM(dep_airport)),
  arr_airport_upper = UPPER(TRIM(arr_airport))
WHERE dep_airport_upper IS NULL OR arr_airport_upper IS NULL;

CREATE INDEX IF NOT EXISTS idx_arr_fp_dep_airport_upper ON arrival_flight_paths (dep_airport_upper);
CREATE INDEX IF NOT EXISTS idx_arr_fp_arr_airport_upper ON arrival_flight_paths (arr_airport_upper);

-- ─── 4. Utility function for normalizing query parameters ─────────────────────

CREATE OR REPLACE FUNCTION upper_trim(val TEXT) RETURNS TEXT AS $$
  SELECT UPPER(TRIM(val));
$$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE;

-- ─── 5. Trigger to keep flight path columns in sync on INSERT/UPDATE ──────────

CREATE OR REPLACE FUNCTION flight_paths_normalize_airports()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dep_airport_upper := UPPER(TRIM(NEW.dep_airport));
  NEW.arr_airport_upper := UPPER(TRIM(NEW.arr_airport));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS departure_flight_paths_normalize ON departure_flight_paths;
CREATE TRIGGER departure_flight_paths_normalize
  BEFORE INSERT OR UPDATE ON departure_flight_paths
  FOR EACH ROW EXECUTE FUNCTION flight_paths_normalize_airports();

DROP TRIGGER IF EXISTS arrival_flight_paths_normalize ON arrival_flight_paths;
CREATE TRIGGER arrival_flight_paths_normalize
  BEFORE INSERT OR UPDATE ON arrival_flight_paths
  FOR EACH ROW EXECUTE FUNCTION flight_paths_normalize_airports();

COMMENT ON COLUMN airports.code_upper IS 'Indexed normalized form of code — use in WHERE/JOIN instead of UPPER(TRIM(code))';
COMMENT ON COLUMN airports.code_lower IS 'Indexed lowercase form of code — use for case-insensitive lookups';
COMMENT ON COLUMN airports.city_upper IS 'Indexed normalized form of city — use in WHERE instead of UPPER(TRIM(city))';
COMMENT ON COLUMN departure_flight_paths.dep_airport_upper IS 'Indexed normalized dep_airport — kept in sync by trigger';
COMMENT ON COLUMN departure_flight_paths.arr_airport_upper IS 'Indexed normalized arr_airport — kept in sync by trigger';
COMMENT ON COLUMN arrival_flight_paths.dep_airport_upper IS 'Indexed normalized dep_airport — kept in sync by trigger';
COMMENT ON COLUMN arrival_flight_paths.arr_airport_upper IS 'Indexed normalized arr_airport — kept in sync by trigger';
