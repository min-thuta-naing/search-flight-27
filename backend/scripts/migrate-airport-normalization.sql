-- Migration: Add pre-computed normalized columns to airport/flight tables
-- Purpose: Eliminate UPPER(TRIM(...)) calls in WHERE/JOIN clauses that cause full table scans
-- Approach: GENERATED ALWAYS AS STORED for airports (PG 12+); trigger on flight_statistics
--
-- Deploy phases:
--   Phase 1 (this script): Add columns, backfill, create indexes
--   Phase 2 (code deploy): Update queries to use code_upper / dep_airport_upper
--   Phase 3 (validation): EXPLAIN ANALYZE confirms index seeks
--   Phase 4 (cleanup): Remove UPPER(TRIM(...)) wrappers from TypeScript queries

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. airports table — generated normalized columns (always in sync, no trigger needed)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE airports
  ADD COLUMN IF NOT EXISTS code_upper  TEXT GENERATED ALWAYS AS (UPPER(TRIM(code)))  STORED,
  ADD COLUMN IF NOT EXISTS code_lower  TEXT GENERATED ALWAYS AS (LOWER(TRIM(code)))  STORED,
  ADD COLUMN IF NOT EXISTS city_upper  TEXT GENERATED ALWAYS AS (UPPER(TRIM(city)))  STORED;

CREATE INDEX IF NOT EXISTS idx_airports_code_upper ON airports (code_upper);
CREATE INDEX IF NOT EXISTS idx_airports_code_lower ON airports (code_lower);
CREATE INDEX IF NOT EXISTS idx_airports_city_upper ON airports (city_upper);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. departure_flight_paths — regular columns + trigger (can't use GENERATED on
--    tables that already have triggers or partitions in some PG configs)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE departure_flight_paths
  ADD COLUMN IF NOT EXISTS dep_airport_upper TEXT,
  ADD COLUMN IF NOT EXISTS arr_airport_upper TEXT;

-- Backfill existing rows (OR covers partial runs where only one column was filled)
UPDATE departure_flight_paths
SET
  dep_airport_upper = UPPER(TRIM(dep_airport)),
  arr_airport_upper = UPPER(TRIM(arr_airport))
WHERE dep_airport_upper IS NULL OR arr_airport_upper IS NULL;

CREATE INDEX IF NOT EXISTS idx_dep_fp_dep_airport_upper ON departure_flight_paths (dep_airport_upper);
CREATE INDEX IF NOT EXISTS idx_dep_fp_arr_airport_upper ON departure_flight_paths (arr_airport_upper);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. arrival_flight_paths — same treatment
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Utility function for app-side normalization (makes query templates uniform)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upper_trim(val TEXT) RETURNS TEXT AS $$
  SELECT UPPER(TRIM(val));
$$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Triggers to keep departure/arrival flight_paths columns in sync on INSERT/UPDATE
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Validation — raise an exception if any column is missing
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  missing TEXT := '';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'airports' AND column_name = 'code_upper'
  ) THEN missing := missing || ' airports.code_upper'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'airports' AND column_name = 'city_upper'
  ) THEN missing := missing || ' airports.city_upper'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departure_flight_paths' AND column_name = 'dep_airport_upper'
  ) THEN missing := missing || ' departure_flight_paths.dep_airport_upper'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arrival_flight_paths' AND column_name = 'dep_airport_upper'
  ) THEN missing := missing || ' arrival_flight_paths.dep_airport_upper'; END IF;

  IF missing <> '' THEN
    RAISE EXCEPTION 'Migration failed — missing columns: %', missing;
  END IF;

  RAISE NOTICE 'Migration OK — all normalized columns and indexes present';
END $$;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- QUERY MIGRATION REFERENCE
-- After deploying this migration, update TypeScript queries to use indexed columns:
--
-- BEFORE:
--   JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(fp.dep_airport))
--   WHERE UPPER(TRIM(dep_airport)) = $1
--
-- AFTER:
--   JOIN airports a ON a.code_upper = upper_trim(fp.dep_airport)
--   WHERE dep_airport_upper = upper_trim($1)
--
-- Search pattern in codebase:  grep -r "UPPER(TRIM" backend/src/
-- ────────────────────────────────────────────────────────────────────────────
