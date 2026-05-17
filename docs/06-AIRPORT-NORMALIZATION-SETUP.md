# Airport Normalization & Dashboard Performance Fix

## Overview

This document covers the performance fix applied in the `optimize` branch that resolved >30s timeouts on dashboard endpoints. New developers must run the migrations below before starting the backend.

**Root cause:** Dashboard queries used `UPPER(TRIM(dep_airport))` in `WHERE`/`JOIN` clauses, forcing full table scans on every request. With 9M+ rows per table, a single world-snapshot query scanned 18M+ rows.

**Fix:** Pre-computed normalized columns (`dep_airport_upper`, `arr_airport_upper`, `code_upper`) backed by indexes. Dashboard service queries updated to use these columns.

---

## What Changed

### Migrations Added

| File | What it does |
|------|-------------|
| `backend/src/database/migrations/027_add_normalized_airport_columns.sql` | Adds `code_upper`, `code_lower`, `city_upper` to `airports` (generated columns); adds `dep_airport_upper`, `arr_airport_upper` to `departure_flight_paths` and `arrival_flight_paths`; backfills existing rows; creates single-column indexes; creates `upper_trim()` function; creates triggers to keep columns in sync on INSERT/UPDATE |
| `backend/src/database/migrations/028_add_compound_upper_airport_date_indexes.sql` | Adds compound `(airport_upper, departure_date)` indexes on both flight path tables — critical for large date-range queries (90/180/365 day windows) |

### Service Updated

`backend/src/services/dashboardSummaryService.ts` — all `UPPER(TRIM(...))` patterns on airport/code columns replaced with indexed column references:

```sql
-- Before (full table scan)
WHERE UPPER(TRIM(dep_airport)) = $1
JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(fp.dep_airport))

-- After (index seek)
WHERE dep_airport_upper = upper_trim($1)
JOIN airports a ON a.code_upper = fp.dep_airport_upper
```

> Note: `UPPER(TRIM(country_code))` and `UPPER(TRIM(country))` were intentionally left as-is — no indexed column exists for those fields.

---

## Setup for New Developers

Migrations run automatically via `npm run migrate` (or Docker entrypoint on first start). No manual steps needed beyond the normal setup in `docs/01-GETTING-STARTED.md`.

If you are setting up a database that already has data (e.g. restoring a dump), verify the migrations ran:

```sql
SELECT name, executed_at
FROM schema_migrations
WHERE name IN (
  '027_add_normalized_airport_columns',
  '028_add_compound_upper_airport_date_indexes'
)
ORDER BY name;
```

Both rows must be present. If missing, run manually:

```bash
# Windows
$env:PGPASSWORD = 'your_password'
psql -h localhost -p 5432 -U postgres -d flight_search `
  -f backend/src/database/migrations/027_add_normalized_airport_columns.sql
psql -h localhost -p 5432 -U postgres -d flight_search `
  -f backend/src/database/migrations/028_add_compound_upper_airport_date_indexes.sql

# Then register in schema_migrations
psql -h localhost -p 5432 -U postgres -d flight_search -c "
  INSERT INTO schema_migrations (name)
  VALUES
    ('027_add_normalized_airport_columns'),
    ('028_add_compound_upper_airport_date_indexes')
  ON CONFLICT DO NOTHING;
"
```

> Migration 027 backfills ~9M rows per table — expect 5–15 minutes depending on hardware.

---

## Cache Warm-Up (Required After Restart)

Dashboard endpoints are fast only when the cache is warm. On a cold start the first request for each preset will hit the database directly — 180d/365d queries can take >60s cold.

Trigger preloads after the backend starts:

```bash
# Focus preset loads automatically if DASHBOARD_PRELOAD_ON_STARTUP=true in .env
# For larger presets, call the refresh endpoint:

curl -X POST http://localhost:3001/api/statistics/dashboard-cache/refresh \
  -H "Content-Type: application/json" \
  -d '{"preset":"30","clearFirst":false}'

curl -X POST http://localhost:3001/api/statistics/dashboard-cache/refresh \
  -H "Content-Type: application/json" \
  -d '{"preset":"90","clearFirst":false}'

curl -X POST http://localhost:3001/api/statistics/dashboard-cache/refresh \
  -H "Content-Type: application/json" \
  -d '{"preset":"180","clearFirst":false}'

# Wait ~2 min between 180 and 365 to avoid memory pressure
curl -X POST http://localhost:3001/api/statistics/dashboard-cache/refresh \
  -H "Content-Type: application/json" \
  -d '{"preset":"365","clearFirst":false}'
```

**Do not trigger `preset=all` — it loads all historical data and will OOM the process.**

### Expected Response Times

| Endpoint | Cold (first hit) | Cached |
|----------|-----------------|--------|
| world-snapshot focus (±15d) | ~80ms | ~80ms |
| world-snapshot 30d | ~? | ~3ms |
| world-snapshot 90d | ~? | ~2ms |
| world-snapshot 180d | ~? | ~12ms |
| world-snapshot 365d | ~? | ~5ms |
| continent-trends (any continent, any window) | ~25–40ms | ~3ms |
| continent-detail | ~40ms | ~3ms |
| continent-top-airports | ~25ms | ~3ms |
| continent-top-routes | ~27ms | ~3ms |

---

## Verifying the Indexes Exist

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('departure_flight_paths', 'arrival_flight_paths', 'airports')
  AND indexname LIKE '%upper%'
ORDER BY tablename, indexname;
```

Expected output — 10 indexes total:

```
airports                    | idx_airports_city_upper
airports                    | idx_airports_code_lower
airports                    | idx_airports_code_upper
arrival_flight_paths        | idx_arr_fp_arr_airport_upper
arrival_flight_paths        | idx_arr_fp_arr_upper_date
arrival_flight_paths        | idx_arr_fp_dep_airport_upper
arrival_flight_paths        | idx_arr_fp_dep_upper_date
departure_flight_paths      | idx_dep_fp_arr_airport_upper
departure_flight_paths      | idx_dep_fp_arr_upper_date
departure_flight_paths      | idx_dep_fp_dep_airport_upper
departure_flight_paths      | idx_dep_fp_dep_upper_date
```