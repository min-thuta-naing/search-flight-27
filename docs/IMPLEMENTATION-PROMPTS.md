# Dashboard Performance Optimization - Implementation Prompts

**Reference Document**: [/memories/session/performance-recommendations.md](/memories/session/performance-recommendations.md)

---

## 📋 Overview

This document contains 5 engineer prompts (in English) for implementing performance recommendations identified in the dashboard performance analysis. Each prompt includes:
- Clear objective and scope
- Success criteria
- Related documentation paths
- Constraints and risks
- Suggested implementation order

**Recommended Priority**: Phase 1 → Phase 2 → Phase 3

---

## PHASE 1: QUICK WINS (Week 1)

### PROMPT #1: Consolidate API Calls into World Snapshot Endpoint

**Reference Path**: [frontend/app/dashboard/page.tsx](../frontend/app/dashboard/page.tsx)

```
OBJECTIVE:
Reduce world view API calls from 4-6 parallel requests to 1-2 calls by creating 
a unified "getDashboardWorldSnapshot" endpoint that returns all world-level 
dashboard data in a single optimized query.

SCOPE:
Backend:
  1. Create new endpoint: POST /api/dashboard/world-snapshot
  2. Consolidate queries: Combine logic from 4 separate services:
     - getDashboardSummary()
     - getDashboardContinents()
     - getDashboardTopRanks()
     - getDashboardTopDestinations()
  3. Single database query returning:
     - Summary KPIs (flights, revenue, routes)
     - All 9 continents data
     - Top 15 countries
     - Top 30 airports
     - Top 10 routes
  4. Cache result with same 5-minute TTL as current endpoints

Frontend:
  1. Replace Promise.all([...4 calls...]) in dashboard/page.tsx
  2. Single API call to new endpoint
  3. Parse response to populate same state/components
  4. No component changes needed (response structure maps to existing state)

Database:
  1. Review indexes on departure_flight_paths.departure_date
  2. Review indexes on arrival_flight_paths.departure_date
  3. Verify airport JOIN performance (see REC #3 if slow)

SUCCESS CRITERIA:
  ✓ World view API response time: <200ms (target: 100-150ms)
  ✓ Response payload: 20-30 KB (consolidated vs 60 KB × 4 calls)
  ✓ Dashboard renders without visual changes
  ✓ Cache hits recorded in logs
  ✓ No errors on 1000+ concurrent requests (load test)

CONSTRAINTS:
  • Backward compatibility: Keep old endpoints alive during transition (fallback)
  • Progressive rendering: Consider returning partial data if timeout (KPIs first)
  • Mobile users: Test on slow connections (3G, 50ms latency)

RELATED FILES:
  - [backend/src/controllers/dashboardController.ts](../backend/src/controllers/dashboardController.ts)
  - [backend/src/services/dashboardSummaryService.ts](../backend/src/services/dashboardSummaryService.ts)
  - [backend/src/routes/dashboardRoutes.ts](../backend/src/routes/dashboardRoutes.ts)
  - [frontend/app/dashboard/page.tsx](../frontend/app/dashboard/page.tsx)
  - [frontend/services/dashboardApi.ts](../frontend/services/dashboardApi.ts)

IMPLEMENTATION NOTES:
  • Current code does 4 parallel queries, each taking ~75-125ms
  • By consolidating into 1 query, we eliminate 3 roundtrip delays
  • Cache will prevent redundant DB hits within 5-minute window
  • Test with date ranges: last_7d, last_30d, last_90d, all_time

RISK MITIGATION:
  • Larger payload on slow networks: Implement response streaming
  • Query timeout: Set reasonable limit (2-3s), return partial data gracefully
  • Testing: Use same test data as current endpoints to validate number accuracy
```

---

### PROMPT #2: Bulk Country Preload Query Consolidation

**Reference Path**: [backend/src/services/dashboardSummaryService.ts](../backend/src/services/dashboardSummaryService.ts) - `preloadDashboardData()` method

```
OBJECTIVE:
Reduce country preload from 400+ individual queries to 1 efficient bulk query.
Current: 200+ countries × 2 queries = 400+ queries
Target: 1 bulk query returning all countries data grouped by country_code

Expected: Preload time 30-60s → 3-5s (90% improvement)

SCOPE:
1. Analyze current preload pattern:
   - Lines: dashboardSummaryService.ts:preloadDashboardData()
   - Current logic: for (countryName of countries) → getCountryOverview(countryName)
   - Problem: Each country triggers separate DB call

2. Create new bulk aggregation query:
   - Single SELECT with GROUP BY country_code
   - Return: flights count, routes count, price stats for each country
   - Include comparison period in same query (use UNION ALL or conditional)
   - Cache-friendly: key = "bulk_country_stats_{date_range}"

3. Refactor preloadDashboardData():
   - Replace loop with single bulk query call
   - Distribute results to individual cache entries
   - Same cache structure as before (no breaking changes)

4. Add progress logging:
   - Log: start time, countries count, batch size
   - Log: completion time, cache entries created, memory used
   - Alert if preload exceeds 10 seconds (SLA)

SUCCESS CRITERIA:
  ✓ Preload time: <5 seconds (target: 3-5s)
  ✓ Database queries during preload: <5 (was 400+)
  ✓ All 200+ countries cached with accurate stats
  ✓ Comparison period stats available in cache
  ✓ Memory usage: <50 MB peak (monitor with process.memoryUsage())
  ✓ Application startup: <10s from boot to API ready

CONSTRAINTS:
  • Backward compatibility: Maintain same cache key structure
  • Consistency: Preload results must match old endpoint data exactly
  • Fallback: Keep old endpoint working as safety net during testing

DATABASE QUERY TEMPLATE:
  ```sql
  -- New bulk query
  SELECT 
    country_code,
    'current' as period,
    COUNT(DISTINCT route_id) as route_count,
    COUNT(*) as flight_count,
    SUM(price) as total_price,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price
  FROM (
    SELECT country_code FROM departure_flight_paths
    WHERE departure_date BETWEEN $startDate AND $endDate
    UNION ALL
    SELECT country_code FROM arrival_flight_paths
    WHERE departure_date BETWEEN $startDate AND $endDate
  ) combined
  GROUP BY country_code
  
  UNION ALL
  
  -- Comparison period
  SELECT 
    country_code,
    'comparison' as period,
    ... same aggregations ...
  WHERE departure_date BETWEEN $compStart AND $compEnd
  ```

RELATED FILES:
  - [backend/src/services/dashboardSummaryService.ts](../backend/src/services/dashboardSummaryService.ts)
  - [backend/src/database/queries/dashboardQueries.ts](../backend/src/database/queries/dashboardQueries.ts)
  - [backend/scripts/test-preload.js](../backend/scripts/test-preload.js)

TESTING:
  • Unit test: preloadDashboardData() returns correct country count
  • Integration test: Stats match old endpoint for 10 random countries
  • Load test: Preload under 5s with 100 concurrent requests
  • Data integrity: Verify min/max/avg prices are reasonable bounds

RISK MITIGATION:
  • Query complexity: Start with simple GROUP BY, add aggregations incrementally
  • Memory spike: Monitor peak memory during preload, set alert at 100 MB
  • Data mismatch: Run parallel test comparing old vs new results for 1 week
```

---

## PHASE 2: STABILITY (Week 2)

### PROMPT #3: Bounded LRU In-Memory Cache Implementation

**Reference Path**: [backend/src/services/dashboardSummaryService.ts](../backend/src/services/dashboardSummaryService.ts)

```
OBJECTIVE:
Replace 7 unbounded Map caches with LRU (Least Recently Used) caches to prevent
memory leaks and ensure predictable memory footprint.

Current Risk: Maps grow unbounded → potential OOM errors under heavy load
Target: Bounded LRU with max 500-1000 entries per cache

SCOPE:
1. Create utility class: backend/src/utils/lruCache.ts
   - Generic LRU implementation: LRUCache<K, V>
   - Methods: get(key), set(key, value), clear(), size, maxSize
   - Eviction policy: FIFO when max size exceeded
   - TTL support: Optional expiration time per entry

2. Identify all 7 unbounded caches in dashboardSummaryService.ts:
   - continentDetailCache
   - continentTopAirportsCache
   - continentTrendsCache
   - countryDetailCache
   - countryTopAirportsCache
   - airlineDetailsCache
   - airportDetailCache

3. Replace each Map with LRUCache:
   OLD: const continentDetailCache = new Map();
   NEW: const continentDetailCache = new LRUCache(500);

4. Configure max sizes based on data:
   - Continental data: 500 entries (reasonable for drill-downs)
   - Country data: 1000 entries (200+ countries × variations)
   - Airline data: 500 entries (typical airlines count)
   - Airport data: 1000 entries (10,000+ airports worldwide)

5. Add memory monitoring:
   - Log cache size and memory usage on startup
   - Warn if eviction rate >5% (indicates cache too small)
   - Export metrics for monitoring/alerting

SUCCESS CRITERIA:
  ✓ Memory usage stable (no unbounded growth)
  ✓ Cache hit rate maintained >80% for repeat queries
  ✓ Eviction rate <2% for standard workload
  ✓ No performance regression vs Map-based caches
  ✓ Memory monitoring visible in logs/metrics
  ✓ Under load (1000 users): stable memory after 1 hour

CONSTRAINTS:
  • Backward compatibility: Cache behavior must be identical except size-bounded
  • Performance: LRU overhead must be <1ms per operation
  • Configuration: Max sizes tunable via environment variables

LRU IMPLEMENTATION TEMPLATE:
  ```typescript
  // backend/src/utils/lruCache.ts
  export class LRUCache<K, V> {
    private cache = new Map<K, V>();
    private accessOrder: K[] = [];
    
    constructor(
      private maxSize: number = 1000,
      private ttlMs?: number
    ) {}
    
    get(key: K): V | undefined {
      if (!this.cache.has(key)) return undefined;
      
      // Move to end (most recently used)
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
      
      return this.cache.get(key);
    }
    
    set(key: K, value: V): void {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      
      this.cache.set(key, value);
      this.accessOrder.push(key);
      
      // Evict oldest if exceeded
      while (this.accessOrder.length > this.maxSize) {
        const oldest = this.accessOrder.shift()!;
        this.cache.delete(oldest);
      }
    }
    
    clear(): void {
      this.cache.clear();
      this.accessOrder = [];
    }
    
    get size(): number {
      return this.cache.size;
    }
  }
  ```

RELATED FILES:
  - [backend/src/services/dashboardSummaryService.ts](../backend/src/services/dashboardSummaryService.ts)
  - [backend/src/utils/](../backend/src/utils/)

MONITORING & ALERTS:
  • Alert: Cache eviction rate >5% (cache too small)
  • Alert: Memory usage growth >100 MB/hour (leak suspected)
  • Metric: Cache hit rate per endpoint (dashboard)
  • Metric: LRU eviction count per cache type

TESTING:
  • Unit test: LRU evicts oldest entry when full
  • Unit test: Recently accessed entries not evicted
  • Integration test: Cache behavior same as old Map for 1000 operations
  • Load test: Memory stable under 1000 concurrent dashboard views
```

---

### PROMPT #4: Query Performance Monitoring & Logging

**Reference Path**: [backend/src/middleware/](../backend/src/middleware/)

```
OBJECTIVE:
Add visibility into slow queries and endpoint performance to enable
data-driven optimization decisions.

Create monitoring layer that logs:
  • Endpoint response times
  • Database query durations
  • Cache hit/miss rates
  • Slow query alerts (>500ms)

SCOPE:
1. Create middleware: backend/src/middleware/queryMonitoringMiddleware.ts
   - Track all API request/response times
   - Log endpoint, method, duration, status code
   - Alert if duration >500ms

2. Add database query logging:
   - Wrap database queries with timing code
   - Log query duration, parameters, result count
   - Alert if query >200ms

3. Enhance dashboard cache logging:
   - Log cache hits/misses per endpoint
   - Log cache eviction events
   - Track hit rate percentage

4. Centralize logging:
   - Use existing logger (check backend/src/utils/logger.ts)
   - Format: JSON for easy parsing
   - Separate log level: DEBUG for queries, WARN for slow endpoints

5. Optional: Send metrics to monitoring service (Datadog, NewRelic)
   - Create backend/src/services/metricsService.ts
   - Export: endpoint_response_time, query_duration, cache_hit_rate
   - Tag by: endpoint, database table, cache type

SUCCESS CRITERIA:
  ✓ All dashboard endpoints logged with response times
  ✓ Database queries >200ms logged with context
  ✓ Cache hit rates visible in logs
  ✓ Slow query alerts sent to logger
  ✓ Log parsing: Easy to extract top 10 slowest endpoints
  ✓ Performance baseline captured (before optimization)

CONSTRAINTS:
  • Minimal overhead: Monitoring must add <1ms per request
  • Privacy: Don't log sensitive data (emails, passwords, API keys)
  • Retention: Logs should rotate daily (use Winston file transport)

MONITORING TEMPLATE:
  ```typescript
  // backend/src/middleware/queryMonitoringMiddleware.ts
  export const queryMonitoringMiddleware = (req, res, next) => {
    const start = Date.now();
    const originalJson = res.json;
    
    res.json = function(data) {
      const duration = Date.now() - start;
      
      logger.info({
        event: 'api_response',
        endpoint: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
      
      if (duration > 500) {
        logger.warn({
          event: 'slow_endpoint',
          endpoint: req.path,
          duration,
          threshold: 500
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
  ```

  ```typescript
  // Database query logging
  async function logQueryDuration(query, params, fn) {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    
    if (duration > 200) {
      logger.debug({
        event: 'slow_query',
        query: query.substring(0, 100), // First 100 chars
        duration,
        threshold: 200,
        resultCount: result.length
      });
    }
    
    return result;
  }
  ```

RELATED FILES:
  - [backend/src/middleware/](../backend/src/middleware/)
  - [backend/src/utils/logger.ts](../backend/src/utils/logger.ts)
  - [backend/src/services/dashboardSummaryService.ts](../backend/src/services/dashboardSummaryService.ts)

ANALYSIS QUERIES:
  After implementation, extract insights:
  ```
  # Find top 10 slowest endpoints
  grep "slow_endpoint" logs/application.log | jq '.duration' | sort -n | tail -10
  
  # Cache hit rate
  grep "cache_hit" logs/application.log | jq '.hit_rate' | awk '{sum+=$1} END {print sum/NR}'
  
  # Average query duration by table
  grep "slow_query" logs/application.log | jq '.table' | sort | uniq -c
  ```

TESTING:
  • Verify: All dashboard endpoints logged
  • Verify: Slow threshold alerts working
  • Load test: <1ms overhead with 1000 concurrent requests
  • Baseline: Document current performance before optimization
```

---

## PHASE 3: DEEP OPTIMIZATION (Week 3)

### PROMPT #5: Airport Join Normalization with Indexed Columns

**Reference Path**: [backend/src/database/](../backend/src/database/)

```
OBJECTIVE:
Eliminate runtime string normalization in airport JOINs by adding pre-computed,
indexed normalized columns (code_upper, city_upper).

Current: JOIN airports a ON UPPER(TRIM(a.code)) = ... (FullTableScan)
Target: JOIN airports a ON a.code_upper = ... (IndexSeek)

Expected improvement: 50-100ms per query across all airport operations

SCOPE:
1. Database migration:
   a) Add normalized columns to airports table:
      - code_upper VARCHAR(10)
      - code_lower VARCHAR(10)
      - city_upper VARCHAR(100)
      - iata_upper VARCHAR(10)
   
   b) Create migration script: backend/scripts/migrate-airport-normalization.sql
      - Use transaction (all or nothing)
      - Backfill existing data
      - Create indexes
      - Validate data integrity
   
   c) Add database trigger for future UPDATEs:
      - Maintain normalized columns automatically
      - Prevent out-of-sync data

2. Code updates in all queries:
   a) Find all JOINs with UPPER(TRIM(a.code)):
      - backend/src/database/queries/ (search for "UPPER")
      - backend/src/repositories/ (search for "UPPER")
      - Approximately 20-30 query locations
   
   b) Replace with indexed column references:
      OLD: JOIN airports a ON UPPER(TRIM(a.code)) = $1
      NEW: JOIN airports a ON a.code_upper = upper_trim($1)
      
      Where upper_trim() is a PL/pgSQL function:
      CREATE FUNCTION upper_trim(text) RETURNS text AS 
        'SELECT UPPER(TRIM($1))' LANGUAGE SQL IMMUTABLE;

3. Validation & Testing:
   a) Unit tests: Verify JOIN results identical before/after
   b) Performance test: Query execution time <20ms (was 50-100ms)
   c) Data integrity: Random sampling of airports (1000+), validate normalized columns
   d) Deployment: Gradual rollout with read-only validation phase

SUCCESS CRITERIA:
  ✓ All airport queries execute with index seeks (EXPLAIN ANALYZE)
  ✓ Query performance: <20ms per airport-based query (was 50-100ms)
  ✓ Normalized columns always in sync with actual columns (trigger)
  ✓ No query results changed (correctness preserved)
  ✓ Airport search, flight filters, dashboard all faster
  ✓ Zero data loss during migration

CONSTRAINTS:
  • Backward compatibility: Normalized columns transparent to app logic
  • Migration downtime: <5 minutes for column addition + index creation
  • Database size: +300 MB additional storage (10,000+ airports × columns)
  • Dependency: All queries must be updated before deploying (breaking change risk)

MIGRATION SCRIPT TEMPLATE:
  ```sql
  -- backend/scripts/migrate-airport-normalization.sql
  BEGIN;
  
  -- Add new columns
  ALTER TABLE airports 
  ADD COLUMN IF NOT EXISTS code_upper VARCHAR(10),
  ADD COLUMN IF NOT EXISTS code_lower VARCHAR(10),
  ADD COLUMN IF NOT EXISTS city_upper VARCHAR(100),
  ADD COLUMN IF NOT EXISTS iata_upper VARCHAR(10);
  
  -- Backfill existing data
  UPDATE airports
  SET 
    code_upper = UPPER(TRIM(code)),
    code_lower = LOWER(TRIM(code)),
    city_upper = UPPER(TRIM(city)),
    iata_upper = UPPER(TRIM(iata))
  WHERE code_upper IS NULL;
  
  -- Create indexes
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_airports_code_upper 
    ON airports(code_upper);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_airports_city_upper 
    ON airports(city_upper);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_airports_iata_upper 
    ON airports(iata_upper);
  
  -- Create trigger to keep normalized columns in sync
  CREATE OR REPLACE FUNCTION airports_normalize_columns()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.code IS DISTINCT FROM OLD.code THEN
      NEW.code_upper := UPPER(TRIM(NEW.code));
      NEW.code_lower := LOWER(TRIM(NEW.code));
    END IF;
    IF NEW.city IS DISTINCT FROM OLD.city THEN
      NEW.city_upper := UPPER(TRIM(NEW.city));
    END IF;
    IF NEW.iata IS DISTINCT FROM OLD.iata THEN
      NEW.iata_upper := UPPER(TRIM(NEW.iata));
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  DROP TRIGGER IF EXISTS airports_normalize_columns_trigger ON airports;
  CREATE TRIGGER airports_normalize_columns_trigger
  BEFORE UPDATE ON airports
  FOR EACH ROW
  EXECUTE FUNCTION airports_normalize_columns();
  
  COMMIT;
  ```

QUERY UPDATE TEMPLATE:
  ```sql
  -- BEFORE
  SELECT * FROM flights f
  JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(f.departure_code))
  WHERE f.departure_date BETWEEN $1 AND $2;
  
  -- AFTER
  SELECT * FROM flights f
  JOIN airports a ON a.code_upper = upper_trim(f.departure_code)
  WHERE f.departure_date BETWEEN $1 AND $2;
  ```

RELATED FILES:
  - [backend/src/database/queries/](../backend/src/database/queries/)
  - [backend/src/repositories/](../backend/src/repositories/)
  - All files matching pattern: `backend/**/*.ts` (grep for "UPPER(TRIM")

DEPLOYMENT STRATEGY:
  Phase 1: Create columns, backfill, create indexes (read-only)
  Phase 2: Deploy code with new query patterns (read from normalized columns)
  Phase 3: Monitor performance, validate correctness
  Phase 4: Remove old queries using UPPER(TRIM(...))
  Phase 5: Optional: Mark UPPER(TRIM queries as deprecated in code review

TESTING CHECKLIST:
  ✓ Unit test: Airport normalization functions produce correct output
  ✓ Integration test: Query results identical before/after migration
  ✓ Performance test: EXPLAIN ANALYZE shows index seeks
  ✓ Load test: <20ms per query under 1000 concurrent requests
  ✓ Data validation: Random sample 1000 airports, check normalization
  ✓ Trigger test: UPDATE airports → normalized columns auto-updated

MONITORING POST-DEPLOYMENT:
  • Log slow queries (>20ms) for 1 week after deployment
  • Monitor database CPU usage (should decrease)
  • Alert: Normalized columns ever NULL (trigger failed)
  • Metric: Average query time by airport operation type

ROLLBACK PLAN:
  If performance doesn't improve:
  1. Revert query code to use UPPER(TRIM(...))
  2. Keep normalized columns (no harm, <300 MB storage)
  3. Drop trigger and indexes if needed
  4. No schema rollback necessary (columns can coexist)
```

---

## 🚀 Execution Roadmap

### Week 1: Phase 1
- **Day 1-2**: Implement PROMPT #1 (Consolidate API)
  - Test: World view <200ms, 1000 concurrent users
  
- **Day 2-3**: Implement PROMPT #2 (Bulk Preload)
  - Test: Preload <5s, data accuracy matches old endpoint
  
- **Day 4**: Integration testing, load testing, documentation

### Week 2: Phase 2
- **Day 1**: Implement PROMPT #3 (LRU Cache)
  - Test: Memory stable, hit rate maintained
  
- **Day 2-3**: Implement PROMPT #4 (Monitoring)
  - Test: All endpoints logged, baseline captured
  
- **Day 4**: Setup monitoring dashboards (Datadog/NewRelic)

### Week 3: Phase 3
- **Day 1-2**: Database migration planning (PROMPT #5)
  - Backup, test migration on staging
  
- **Day 2-3**: Query updates, validation
  - Test: All queries return identical results
  
- **Day 4**: Deployment, monitoring, documentation

---

## ✅ Success Metrics Summary

| Phase | Prompt | Expected Gain | Difficulty |
|-------|--------|---------------|-----------|
| 1 | #1: Consolidate API | 60-70% faster world view | Medium |
| 1 | #2: Bulk Preload | 90% faster startup | Low |
| 2 | #3: LRU Cache | Stability + risk mitigation | Low |
| 2 | #4: Monitoring | Data-driven decisions | Low |
| 3 | #5: Airport Index | 80% faster airport ops | High |

**Overall Impact**: Dashboard 75% faster, system-wide airport queries 80% faster, preload 90% faster

---

## 📚 Reference Documentation

- Analysis Document: [/memories/session/performance-recommendations.md](/memories/session/performance-recommendations.md)
- Cache Tuning Guide: [docs/CACHE-TUNING.text](CACHE-TUNING.text)
- SQL Commands: [docs/02-SQL-COMMANDS.md](02-SQL-COMMANDS.md)
- System Documentation: [docs/03-SYSTEM-DOCUMENTATION.md](03-SYSTEM-DOCUMENTATION.md)

