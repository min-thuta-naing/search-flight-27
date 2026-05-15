# 🚀 Dashboard Performance Optimization - Claude Implementation Kickoff

**Use this prompt to start implementing the dashboard performance optimizations.**

---

## 📌 CONTEXT

Our flight search dashboard has identified 5 performance bottlenecks that significantly impact user experience:

- **World view**: 300-500ms (should be 80-120ms)
- **Preload startup**: 30-60s (should be 3-5s)  
- **Airport queries**: 50-100ms each (should be 10-20ms)

We've created comprehensive implementation guides for each optimization. Your task is to implement them step-by-step, starting with Phase 1.

---

## 🎯 YOUR TASK

Implement the performance optimization prompts from this document:
**[docs/IMPLEMENTATION-PROMPTS.md](docs/IMPLEMENTATION-PROMPTS.md)**

**Workspace Location**: `d:\project\search-flight-27\`

**Reference Analysis**: [/memories/session/performance-recommendations.md](/memories/session/performance-recommendations.md)

---

## 📋 IMPLEMENTATION PHASES

### PHASE 1: QUICK WINS (Priority: CRITICAL)

Start with these two (use most of Week 1):

#### **PROMPT #1: Consolidate API Calls into World Snapshot Endpoint**
- **Objective**: Reduce 4-6 API calls → 1-2 calls for world view
- **Expected Gain**: 60-70% faster (300-500ms → 100-200ms)
- **Difficulty**: Medium
- **Time**: 2-3 days

**What to do**:
1. Read PROMPT #1 from [docs/IMPLEMENTATION-PROMPTS.md](docs/IMPLEMENTATION-PROMPTS.md)
2. Create new endpoint: `POST /api/dashboard/world-snapshot`
3. Consolidate logic from: `getDashboardSummary()`, `getDashboardContinents()`, `getDashboardTopRanks()`, `getDashboardTopDestinations()`
4. Update frontend dashboard/page.tsx to use single endpoint
5. Test on slow connections + load test (1000 concurrent)

**Key Files**:
- [backend/src/controllers/dashboardController.ts](backend/src/controllers/dashboardController.ts)
- [backend/src/services/dashboardSummaryService.ts](backend/src/services/dashboardSummaryService.ts)
- [frontend/app/dashboard/page.tsx](frontend/app/dashboard/page.tsx)

---

#### **PROMPT #2: Bulk Country Preload Query Consolidation**
- **Objective**: Reduce 400+ queries → 1 bulk query during preload
- **Expected Gain**: 90% faster (30-60s → 3-5s)
- **Difficulty**: Low
- **Time**: 1-2 days

**What to do**:
1. Read PROMPT #2 from [docs/IMPLEMENTATION-PROMPTS.md](docs/IMPLEMENTATION-PROMPTS.md)
2. Find `preloadDashboardData()` method in dashboardSummaryService.ts
3. Replace loop (200+ individual queries) with single bulk SQL query
4. Verify preload completes in <5 seconds
5. Test data accuracy matches old endpoint

**Key Files**:
- [backend/src/services/dashboardSummaryService.ts](backend/src/services/dashboardSummaryService.ts)
- [backend/src/database/queries/dashboardQueries.ts](backend/src/database/queries/dashboardQueries.ts)

---

### PHASE 2: STABILITY (Priority: HIGH)

After Phase 1, implement these two (use most of Week 2):

#### **PROMPT #3: Bounded LRU In-Memory Cache Implementation**
- **Objective**: Replace 7 unbounded Map caches with bounded LRU
- **Expected Gain**: Memory stability + prevent OOM
- **Difficulty**: Low
- **Time**: 1 day

**What to do**:
1. Read PROMPT #3 from [docs/IMPLEMENTATION-PROMPTS.md](docs/IMPLEMENTATION-PROMPTS.md)
2. Create `backend/src/utils/lruCache.ts` with LRU implementation
3. Replace all 7 unbounded caches in dashboardSummaryService.ts
4. Configure max sizes: continents=500, countries=1000, etc.
5. Add memory monitoring

**Key Files**:
- [backend/src/services/dashboardSummaryService.ts](backend/src/services/dashboardSummaryService.ts)
- [backend/src/utils/](backend/src/utils/)

---

#### **PROMPT #4: Query Performance Monitoring & Logging**
- **Objective**: Add visibility into slow queries
- **Expected Gain**: Data-driven optimization decisions
- **Difficulty**: Low
- **Time**: 1-2 days

**What to do**:
1. Read PROMPT #4 from [docs/IMPLEMENTATION-PROMPTS.md](docs/IMPLEMENTATION-PROMPTS.md)
2. Create middleware for endpoint monitoring
3. Add database query duration logging
4. Capture baseline performance (before optimization)
5. Setup metrics export (optional: Datadog/NewRelic)

**Key Files**:
- [backend/src/middleware/](backend/src/middleware/)
- [backend/src/utils/logger.ts](backend/src/utils/logger.ts)

---

### PHASE 3: DEEP OPTIMIZATION (Priority: MEDIUM)

After Phase 2, implement this (use Week 3):

#### **PROMPT #5: Airport Join Normalization with Indexed Columns**
- **Objective**: Eliminate runtime string normalization in airport JOINs
- **Expected Gain**: 80% faster airport queries (50-100ms → 10-20ms)
- **Difficulty**: High (database migration)
- **Time**: 2-3 days

**What to do**:
1. Read PROMPT #5 from [docs/IMPLEMENTATION-PROMPTS.md](docs/IMPLEMENTATION-PROMPTS.md)
2. Create database migration: Add normalized columns (code_upper, city_upper, etc.)
3. Create trigger to keep columns in sync
4. Update all queries to use indexed columns
5. Test on staging before production deployment

**Key Files**:
- [backend/scripts/migrate-airport-normalization.sql](backend/scripts/migrate-airport-normalization.sql) (NEW)
- [backend/src/database/queries/](backend/src/database/queries/)
- [backend/src/repositories/](backend/src/repositories/)

---

## 🔍 HOW TO PROCEED

### Step 1: Start with PROMPT #1
```
Go to docs/IMPLEMENTATION-PROMPTS.md and read the full PROMPT #1 section.
Follow every instruction under SCOPE, SUCCESS CRITERIA, and IMPLEMENTATION NOTES.
Use the RELATED FILES paths to navigate the codebase.
```

### Step 2: Implement PROMPT #1
```
1. Analyze current code in the RELATED FILES
2. Create new endpoint following the template
3. Test locally (measure response time < 200ms)
4. Run load tests (1000 concurrent users)
5. Verify cache hits are logged
```

### Step 3: Move to PROMPT #2
```
Same process: Read → Implement → Test → Verify
```

### Step 4: Repeat for PROMPT #3, #4, #5
```
Each prompt has its own SUCCESS CRITERIA checklist.
Check off each criterion before moving to next prompt.
```

---

## ✅ SUCCESS CRITERIA PER PROMPT

### PROMPT #1: World Snapshot
- [ ] Endpoint returns <200ms response time
- [ ] Response payload: 20-30 KB
- [ ] Dashboard renders without visual changes
- [ ] No errors on 1000+ concurrent requests
- [ ] Cache hits logged and visible

### PROMPT #2: Bulk Preload
- [ ] Preload completes in <5 seconds
- [ ] Database queries during preload: <5 (was 400+)
- [ ] All 200+ countries cached accurately
- [ ] Memory usage: <50 MB peak
- [ ] Application startup: <10s from boot

### PROMPT #3: LRU Cache
- [ ] Memory usage stable (no unbounded growth)
- [ ] Cache hit rate: >80% for repeat queries
- [ ] Eviction rate: <2%
- [ ] No performance regression vs old caches
- [ ] Memory monitoring visible in logs

### PROMPT #4: Monitoring
- [ ] All endpoints logged with response times
- [ ] Queries >200ms logged with context
- [ ] Cache hit rates visible in logs
- [ ] Baseline performance documented
- [ ] <1ms overhead per request

### PROMPT #5: Airport Indexes
- [ ] Database migration completes without data loss
- [ ] All queries execute with index seeks
- [ ] Query performance: <20ms (was 50-100ms)
- [ ] Normalized columns always in sync (trigger working)
- [ ] Query results identical before/after

---

## 📊 OVERALL METRICS AFTER ALL 5 PROMPTS

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| World view response | 300-500ms | 80-120ms | **75% faster** ⬇️ |
| Preload startup | 30-60s | 3-5s | **90% faster** ⬇️ |
| Airport queries | 50-100ms | 10-20ms | **80% faster** ⬇️ |
| Memory (unbounded) | Growing | Stable | **Risk eliminated** ✅ |
| Query visibility | None | Full logs | **Monitoring enabled** ✅ |

---

## 🛠️ TOOLS & RESOURCES

### Available Resources
- **Analysis Document**: [/memories/session/performance-recommendations.md](/memories/session/performance-recommendations.md) - Full context on what's slow and why
- **Implementation Guide**: [docs/IMPLEMENTATION-PROMPTS.md](docs/IMPLEMENTATION-PROMPTS.md) - This document with all 5 prompts
- **Workspace**: `d:\project\search-flight-27\` - All source files

### Key Directories
```
backend/
  ├─ src/controllers/     (API endpoints)
  ├─ src/services/        (Business logic, caching)
  ├─ src/database/        (Query definitions)
  ├─ src/repositories/    (Data access layer)
  ├─ src/middleware/      (Request/response handling)
  └─ scripts/             (Database migrations)

frontend/
  ├─ app/dashboard/       (Dashboard pages)
  ├─ services/            (API client)
  └─ components/          (UI components)
```

---

## 🎯 WORKFLOW

1. **Read the full PROMPT** from [docs/IMPLEMENTATION-PROMPTS.md](docs/IMPLEMENTATION-PROMPTS.md)
2. **Understand the scope**: What files need to change
3. **Check current code**: Navigate to RELATED FILES, understand current implementation
4. **Implement**: Make changes following the template/guidance in the prompt
5. **Test**: Verify all SUCCESS CRITERIA are met
6. **Document**: Add comments explaining changes
7. **Move to next PROMPT**: Repeat steps 1-6

---

## ⚠️ IMPORTANT NOTES

### Backward Compatibility
- Keep old endpoints alive during PROMPT #1 transition (use as fallback)
- Test extensively before removing deprecated endpoints

### Testing Strategy
- Local testing first (measure response times)
- Load testing (1000 concurrent users)
- Staging environment deployment
- Production monitoring (1 week)

### Risk Mitigation
- Database backup before PROMPT #5 migration
- Gradual rollout for queries (Phase 1 → Phase 2 → Phase 3)
- Keep monitoring logs for performance trending

### Performance Baselines
- **Capture "before" metrics** at start of implementation
- **Compare "after" metrics** after each prompt
- **Document improvements** in commit messages

---

## 📞 WHEN STUCK

If you encounter issues during implementation:

1. **Refer to RELATED FILES** in the prompt (includes path links)
2. **Check /memories/session/performance-recommendations.md** for context
3. **Read the CONSTRAINTS and RISK MITIGATION** sections
4. **Use the code templates** provided in the prompt
5. **Test incrementally** (don't change everything at once)

---

## 🚦 EXECUTION CHECKLIST

###  Phase 1
- [ ] PROMPT #1 implemented and tested
- [ ] PROMPT #2 implemented and tested
- [ ] Integration tests passing
- [ ] Load tests (1000 users) passing
- [ ] Code review completed

###  Phase 2
- [ ] PROMPT #3 implemented and tested
- [ ] PROMPT #4 implemented and tested
- [ ] Monitoring dashboards setup
- [ ] Baseline metrics captured
- [ ] Code review completed

###  Phase 3
- [ ] Database backup created
- [ ] PROMPT #5 migration tested on staging
- [ ] PROMPT #5 deployed to production
- [ ] 1-week monitoring completed
- [ ] Performance improvements documented

---

## 🎉 READY TO START?

1. Open: [docs/IMPLEMENTATION-PROMPTS.md](docs/IMPLEMENTATION-PROMPTS.md)
2. Read: **PROMPT #1: Consolidate API Calls into World Snapshot Endpoint**
3. Implement: Follow SCOPE, SUCCESS CRITERIA, and IMPLEMENTATION NOTES
4. Celebrate: Measure 60-70% performance improvement! 🎊

**Good luck!** 🚀
