import { Request, Response, NextFunction } from 'express';
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { SearchStatisticsModel, PriceStatisticsModel } from '../models/SearchStatistics';
import { AirportModel } from '../models/Airport';
import { convertToAirportCode } from '../utils/airportCodeConverter';
import { DashboardSummaryService, clearDashboardMemoryCache, getDashboardMemoryCacheStats } from '../services/dashboardSummaryService';

const DASHBOARD_QUERY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type DashboardCacheEntry = {
  value: unknown;
  expiresAt: number;
};

type DashboardCacheSnapshot = {
  version: 1;
  updatedAt: string;
  entries: Record<string, DashboardCacheEntry>;
};

const dashboardQueryInFlight = new Map<string, Promise<unknown>>();
const DASHBOARD_PRELOAD_PRESETS = ['all', 'focus', '7', '30', '90', '180', '365'] as const;
const DASHBOARD_CACHE_DIR = join(tmpdir(), 'search-flight-27');
const DASHBOARD_CACHE_FILE = join(DASHBOARD_CACHE_DIR, 'dashboard-query-cache.json');

let dashboardQueryCacheWriteChain = Promise.resolve();

type DashboardPreloadPreset = typeof DASHBOARD_PRELOAD_PRESETS[number];
type DashboardPreloadPhase = 'idle' | 'running' | 'completed' | 'failed';

type DashboardPreloadStatus = {
  phase: DashboardPreloadPhase;
  startedAt: string | null;
  finishedAt: string | null;
  attempted: number;
  failed: number;
  durationMs: number;
  durationMinutes: number;
  error: string | null;
};

const dashboardPreloadStatus: DashboardPreloadStatus = {
  phase: 'idle',
  startedAt: null,
  finishedAt: null,
  attempted: 0,
  failed: 0,
  durationMs: 0,
  durationMinutes: 0,
  error: null,
};

function setDashboardPreloadStatus(nextStatus: Partial<DashboardPreloadStatus>) {
  Object.assign(dashboardPreloadStatus, nextStatus);
}

function beginDashboardPreload() {
  const startedAt = new Date().toISOString();
  setDashboardPreloadStatus({
    phase: 'running',
    startedAt,
    finishedAt: null,
    attempted: 0,
    failed: 0,
    durationMs: 0,
    durationMinutes: 0,
    error: null,
  });
  return startedAt;
}

function finishDashboardPreload(phase: 'completed' | 'failed', attempted: number, failed: number, error?: string) {
  const finishedAt = new Date().toISOString();
  const startedMs = dashboardPreloadStatus.startedAt ? Date.parse(dashboardPreloadStatus.startedAt) : Date.now();
  const durationMs = Math.max(0, Date.parse(finishedAt) - startedMs);

  setDashboardPreloadStatus({
    phase,
    finishedAt,
    attempted,
    failed,
    durationMs,
    durationMinutes: durationMs / 60000,
    error: error ?? null,
  });
}

async function readDashboardQueryCacheSnapshot(): Promise<Record<string, DashboardCacheEntry>> {
  try {
    const raw = await readFile(DASHBOARD_CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DashboardCacheSnapshot>;

    if (parsed.version !== 1 || typeof parsed.entries !== 'object' || !parsed.entries) {
      return {};
    }

    return parsed.entries;
  } catch {
    return {};
  }
}

async function writeDashboardQueryCacheSnapshot(entries: Record<string, DashboardCacheEntry>): Promise<void> {
  await mkdir(DASHBOARD_CACHE_DIR, { recursive: true });
  const tempFile = `${DASHBOARD_CACHE_FILE}.tmp`;
  const snapshot: DashboardCacheSnapshot = {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries,
  };

  await writeFile(tempFile, JSON.stringify(snapshot, null, 2), 'utf8');
  await rename(tempFile, DASHBOARD_CACHE_FILE);
}

function queueDashboardCacheWrite(task: () => Promise<void>): Promise<void> {
  const next = dashboardQueryCacheWriteChain.then(task, task);
  dashboardQueryCacheWriteChain = next.then(() => undefined, () => undefined);
  return next;
}

async function waitForDashboardCacheWrites(): Promise<void> {
  await dashboardQueryCacheWriteChain;
}

async function clearDashboardQueryCacheStore() {
  const entries = await readDashboardQueryCacheSnapshot();
  const cacheEntries = Object.keys(entries).length;
  const inFlightEntries = dashboardQueryInFlight.size;
  dashboardQueryInFlight.clear();
  await rm(DASHBOARD_CACHE_FILE, { force: true });

  return {
    cacheEntries,
    inFlightEntries,
    totalCleared: cacheEntries + inFlightEntries,
  };
}

async function getDashboardQueryCacheStats() {
  const entries = await readDashboardQueryCacheSnapshot();
  return {
    cacheEntries: Object.keys(entries).length,
    inFlightEntries: dashboardQueryInFlight.size,
  };
}

function toQueryValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(',');
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function buildDashboardQueryCacheKey(scope: string, query: Request['query']): string {
  return [
    scope,
    `date=${toQueryValue(query.date)}`,
    `window_days=${toQueryValue(query.window_days)}`,
    `start_date=${toQueryValue(query.start_date)}`,
    `end_date=${toQueryValue(query.end_date)}`,
    `country=${toQueryValue(query.country)}`,
    `continent=${toQueryValue(query.continent)}`,
    `limit=${toQueryValue(query.limit)}`,
    `include_core=${toQueryValue(query.include_core)}`,
    `include_seasonal=${toQueryValue(query.include_seasonal)}`,
    `include_top_routes=${toQueryValue(query.include_top_routes)}`,
  ].join('|');
}

function formatDateForKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function buildPreloadChunks(startDate: string, endDate: string, chunkMonths = 3): Array<{ startDate: string; endDate: string }> {
  const chunks: Array<{ startDate: string; endDate: string }> = [];
  let currentStart = new Date(`${startDate}T00:00:00.000Z`);
  const finalEnd = new Date(`${endDate}T00:00:00.000Z`);

  while (currentStart <= finalEnd) {
    const nextChunkStart = addUtcMonths(currentStart, chunkMonths);
    const chunkEnd = new Date(nextChunkStart);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() - 1);

    const effectiveEnd = chunkEnd < finalEnd ? chunkEnd : finalEnd;

    chunks.push({
      startDate: formatDateForKey(currentStart),
      endDate: formatDateForKey(effectiveEnd),
    });

    currentStart = addUtcDays(effectiveEnd, 1);
  }

  return chunks;
}

function buildPresetDateRange(
  preset: DashboardPreloadPreset,
  minDate: string,
  recommendedEndDate: string,
  baseDate: Date,
) {
  if (preset === 'focus') {
    return { startDate: formatDateForKey(addUtcDays(baseDate, -15)), endDate: formatDateForKey(addUtcDays(baseDate, 15)) };
  }

  if (preset === '7') {
    return { startDate: formatDateForKey(baseDate), endDate: formatDateForKey(addUtcDays(baseDate, 6)) };
  }

  if (preset === '30') {
    return { startDate: formatDateForKey(baseDate), endDate: formatDateForKey(addUtcDays(baseDate, 29)) };
  }

  if (preset === '90') {
    return { startDate: formatDateForKey(baseDate), endDate: formatDateForKey(addUtcDays(baseDate, 89)) };
  }

  if (preset === '180') {
    return { startDate: formatDateForKey(baseDate), endDate: formatDateForKey(addUtcDays(baseDate, 179)) };
  }

  if (preset === '365') {
    return { startDate: formatDateForKey(baseDate), endDate: formatDateForKey(addUtcDays(baseDate, 364)) };
  }

  return { startDate: minDate, endDate: recommendedEndDate };
}

async function readDashboardQueryCache<T>(key: string): Promise<T | null> {
  const entries = await readDashboardQueryCacheSnapshot();
  const cached = entries[key];

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    delete entries[key];
    await queueDashboardCacheWrite(() => writeDashboardQueryCacheSnapshot(entries));
    return null;
  }

  return cached.value as T;
}

async function writeDashboardQueryCache<T>(key: string, value: T): Promise<void> {
  await queueDashboardCacheWrite(async () => {
    const entries = await readDashboardQueryCacheSnapshot();
    entries[key] = {
      value,
      expiresAt: Date.now() + DASHBOARD_QUERY_CACHE_TTL_MS,
    };
    await writeDashboardQueryCacheSnapshot(entries);
  });
}

async function getOrSetDashboardQueryCache<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const cached = await readDashboardQueryCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const inFlight = dashboardQueryInFlight.get(key) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  const request = factory()
    .then(async (result) => {
      await writeDashboardQueryCache(key, result);
      return result;
    })
    .finally(() => {
      dashboardQueryInFlight.delete(key);
    });

  dashboardQueryInFlight.set(key, request as Promise<unknown>);
  return request;
}

export async function warmDashboardCachesOnStartup(): Promise<{ attempted: number; failed: number }> {
  let attempted = 0;
  let failed = 0;
  const startedAt = beginDashboardPreload();
  console.log(`[dashboard-preload] start at ${startedAt}`);

  try {
    const boundsKey = buildDashboardQueryCacheKey('dashboard-date-bounds', {} as Request['query']);
    const bounds = await getOrSetDashboardQueryCache(boundsKey, () => DashboardSummaryService.getDashboardDataBounds());

    if (!bounds.minDate || !bounds.recommendedEndDate) {
      finishDashboardPreload('completed', attempted, failed);
      console.log('[dashboard-preload] completed without date bounds');
      return { attempted, failed };
    }

    const now = new Date();
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    for (const preset of DASHBOARD_PRELOAD_PRESETS) {
      const { startDate, endDate } = buildPresetDateRange(preset, bounds.minDate, bounds.recommendedEndDate, utcToday);
      const chunks = buildPreloadChunks(startDate, endDate, 3);

      console.log(`[dashboard-preload] preset ${preset} start (${startDate} -> ${endDate}); chunks=${chunks.length}`);

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
        const chunk = chunks[chunkIndex];
        const query = {
          window_days: '15',
          start_date: chunk.startDate,
          end_date: chunk.endDate,
        } as Request['query'];

        console.log(`[dashboard-preload] preset ${preset} chunk ${chunkIndex + 1}/${chunks.length} start (${chunk.startDate} -> ${chunk.endDate})`);

        const tasks: Array<{ scope: string; run: () => Promise<unknown> }> = [
          {
            scope: 'dashboard-summary',
            run: () => DashboardSummaryService.getWorldSummary({ startDateInput: chunk.startDate, endDateInput: chunk.endDate }),
          },
          {
            scope: 'dashboard-top-ranks',
            run: () => DashboardSummaryService.getWorldTopRanks({ startDateInput: chunk.startDate, endDateInput: chunk.endDate }),
          },
          {
            scope: 'dashboard-top-destinations',
            run: () => DashboardSummaryService.getWorldTopDestinations({ startDateInput: chunk.startDate, endDateInput: chunk.endDate }),
          },
        ];

        for (const task of tasks) {
          attempted += 1;
          setDashboardPreloadStatus({ attempted, failed });
          try {
            const cacheKey = buildDashboardQueryCacheKey(task.scope, query);
            await getOrSetDashboardQueryCache(cacheKey, task.run);
          } catch {
            failed += 1;
            setDashboardPreloadStatus({ attempted, failed });
          }
        }

        // Flush each 3-month chunk before moving on so the snapshot and RAM stay bounded.
        await waitForDashboardCacheWrites();
        const cleared = clearDashboardMemoryCache();

        console.log(`[dashboard-preload] preset ${preset} chunk ${chunkIndex + 1}/${chunks.length} done; dump-flushed=yes; memory-cleared=${cleared.totalCleared}`);
      }

      console.log(`[dashboard-preload] preset ${preset} done; chunked-flush=3-month; chunks=${chunks.length}`);
    }

    finishDashboardPreload('completed', attempted, failed);
    console.log(`[dashboard-preload] completed in ${dashboardPreloadStatus.durationMinutes.toFixed(2)} min; attempted=${attempted}; failed=${failed}; dumped-to=${DASHBOARD_CACHE_FILE}`);
    return { attempted, failed };
  } catch (error) {
    finishDashboardPreload('failed', attempted, failed, error instanceof Error ? error.message : String(error));
    console.warn(`[dashboard-preload] failed in ${dashboardPreloadStatus.durationMinutes.toFixed(2)} min; attempted=${attempted}; failed=${failed}; error=${dashboardPreloadStatus.error}`);
    throw error;
  }
}

export async function refreshDashboardQueryCacheSnapshot(options?: {
  clearFirst?: boolean;
  preset?: DashboardPreloadPreset;
  fullPreload?: boolean;
}) {
  const clearFirst = options?.clearFirst ?? true;
  const preset = options?.preset ?? 'focus';
  const fullPreload = options?.fullPreload ?? false;
  let cleared = {
    queryCache: { cacheEntries: 0, inFlightEntries: 0, totalCleared: 0 },
    memoryCache: { totalCleared: 0 },
  };

  if (clearFirst) {
    const queryCache = await clearDashboardQueryCacheStore();
    const memoryCache = clearDashboardMemoryCache();
    cleared = {
      queryCache,
      memoryCache,
    };
  }

  let preload: { attempted: number; failed: number };

  if (fullPreload) {
    preload = await warmDashboardCachesOnStartup();
  } else {
    const boundsKey = buildDashboardQueryCacheKey('dashboard-date-bounds', {} as Request['query']);
    const bounds = await getOrSetDashboardQueryCache(boundsKey, () => DashboardSummaryService.getDashboardDataBounds());

    if (!bounds.minDate || !bounds.recommendedEndDate) {
      preload = { attempted: 0, failed: 0 };
    } else {
      const now = new Date();
      const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const { startDate, endDate } = buildPresetDateRange(preset, bounds.minDate, bounds.recommendedEndDate, utcToday);
      const query = {
        window_days: '15',
        start_date: startDate,
        end_date: endDate,
      } as Request['query'];

      const tasks: Array<{ scope: string; run: () => Promise<unknown> }> = [
        {
          scope: 'dashboard-summary',
          run: () => DashboardSummaryService.getWorldSummary({ startDateInput: startDate, endDateInput: endDate }),
        },
        {
          scope: 'dashboard-top-ranks',
          run: () => DashboardSummaryService.getWorldTopRanks({ startDateInput: startDate, endDateInput: endDate }),
        },
        {
          scope: 'dashboard-top-destinations',
          run: () => DashboardSummaryService.getWorldTopDestinations({ startDateInput: startDate, endDateInput: endDate }),
        },
      ];

      let attempted = 0;
      let failed = 0;

      for (const task of tasks) {
        attempted += 1;
        try {
          const cacheKey = buildDashboardQueryCacheKey(task.scope, query);
          await getOrSetDashboardQueryCache(cacheKey, task.run);
        } catch {
          failed += 1;
        }
      }

      await waitForDashboardCacheWrites();
      preload = { attempted, failed };
    }
  }

  const queryCache = await getDashboardQueryCacheStats();
  const memoryCache = getDashboardMemoryCacheStats();

  return {
    clearFirst,
    preset,
    fullPreload,
    cleared,
    preload,
    queryCache,
    memoryCache,
    preloadStatus: { ...dashboardPreloadStatus },
  };
}

/**
 * Clear shared dashboard query cache manually
 * POST /api/statistics/dashboard-cache/clear
 */
export async function clearDashboardCache(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queryCache = await clearDashboardQueryCacheStore();
    const memoryCache = clearDashboardMemoryCache();
    res.json({
      success: true,
      message: 'Dashboard query cache cleared',
      queryCache,
      memoryCache,
      totalCleared: queryCache.totalCleared + memoryCache.totalCleared,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Read dashboard cache memory status
 * GET /api/statistics/dashboard-cache/status
 */
export async function getDashboardCacheStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queryCache = await getDashboardQueryCacheStats();
    const memoryCache = getDashboardMemoryCacheStats();

    res.json({
      success: true,
      queryCache,
      memoryCache,
      preload: { ...dashboardPreloadStatus },
      totalEntries:
        queryCache.cacheEntries + queryCache.inFlightEntries +
        Object.values(memoryCache).reduce((sum, count) => sum + count, 0),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get real dashboard data bounds for preset 'all'
 * GET /api/statistics/dashboard-date-bounds
 */
export async function getDashboardDateBounds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cacheKey = buildDashboardQueryCacheKey('dashboard-date-bounds', req.query);
    const bounds = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getDashboardDataBounds(),
    );

    res.json(bounds);
  } catch (error) {
    next(error);
  }
}

/**
 * Save a search query to the database
 * POST /api/statistics/search
 */
export async function saveSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      origin,
      originName,
      destination,
      destinationName,
      durationRange,
      tripType,
    } = req.body;

    if (!origin || !destination) {
      res.status(400).json({
        error: 'Missing required fields: origin and destination',
      });
      return;
    }

    // Get user IP address (handle proxy headers)
    const userIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.connection.remoteAddress ||
      null;

    const userAgent = req.headers['user-agent'] || null;

    const record = await SearchStatisticsModel.saveSearch({
      origin,
      originName,
      destination,
      destinationName,
      durationRange,
      tripType,
      userIp: userIp || undefined,
      userAgent: userAgent || undefined,
    });

    res.json({ success: true, id: record.id });
  } catch (error) {
    next(error);
  }
}

/**
 * Save a price recommendation to the database
 * POST /api/statistics/price
 */
export async function savePriceStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      origin,
      originName,
      destination,
      destinationName,
      recommendedPrice,
      season,
      airline,
    } = req.body;

    if (!origin || !destination || recommendedPrice === undefined || !season) {
      res.status(400).json({
        error: 'Missing required fields: origin, destination, recommendedPrice, and season',
      });
      return;
    }

    const record = await PriceStatisticsModel.savePriceStat({
      origin,
      originName,
      destination,
      destinationName,
      recommendedPrice,
      season,
      airline,
    });

    res.json({ success: true, id: record.id });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all statistics
 * GET /api/statistics
 */
export async function getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { destination } = req.query;

    let countryCode: string | undefined;

    if (destination && typeof destination === 'string') {
      try {
        const airportCode = await convertToAirportCode(destination);
        const airport = await AirportModel.getAirportByCode(airportCode);
        if (airport) {
          countryCode = airport.country || undefined;
          console.log(`[statisticsController] Resolved destination ${destination} to country ${countryCode}`);
        }
      } catch (error) {
        console.warn(`[statisticsController] Failed to resolve country for destination: ${destination}`);
      }
    }

    const [
      totalSearches,
      mostSearchedDestination,
      mostSearchedDuration,
      popularDestinations,
      monthlyStats,
    ] = await Promise.all([
      SearchStatisticsModel.getTotalSearches(),
      SearchStatisticsModel.getMostSearchedDestination(1),
      SearchStatisticsModel.getMostSearchedDuration(1),
      SearchStatisticsModel.getPopularDestinations(5, countryCode),
      SearchStatisticsModel.getMonthlySearchStats(),
    ]);

    res.json({
      totalSearches,
      mostSearchedDestination: mostSearchedDestination[0] || null,
      mostSearchedDuration: mostSearchedDuration[0] || null,
      popularDestinations,
      monthlyStats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get price statistics
 * GET /api/statistics/price
 */
export async function getPriceStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { origin, destination } = req.query;

    const [averagePrice, priceTrend, searchTrend] = await Promise.all([
      PriceStatisticsModel.getAveragePrice(
        origin as string | undefined,
        destination as string | undefined
      ),
      PriceStatisticsModel.getPriceTrend(
        origin as string | undefined,
        destination as string | undefined
      ),
      SearchStatisticsModel.getSearchTrend(
        destination as string | undefined
      ),
    ]);

    res.json({
      averagePrice,
      priceTrend,
      searchTrend, // ✅ เพิ่ม search trend (จำนวนคนค้นหาเพิ่มขึ้น/ลดลง)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get world dashboard summary for the preset +/- date window
 * GET /api/statistics/dashboard-summary?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-summary', req.query);
    const summary = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getWorldSummary({
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
      })
    );

    res.json(summary);
  } catch (error) {
    next(error);
  }
}

/**
 * Get continent cards for the world dashboard
 * GET /api/statistics/dashboard-continents?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardContinents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-continents', req.query);
    const continents = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getWorldContinentCards({
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
      })
    );

    res.json(continents);
  } catch (error) {
    next(error);
  }
}

/**
 * Get continent detail for the drill-down dashboard
 * GET /api/statistics/dashboard-continent-detail?continent=Europe&date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardContinentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { continent, date, window_days, start_date, end_date, include_core, include_seasonal, include_top_routes } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!continent || typeof continent !== 'string') {
      res.status(400).json({
        error: 'Missing continent parameter',
        message: 'continent is required',
      });
      return;
    }

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-continent-detail', req.query);
    const detail = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getContinentDetail({
        continent,
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
        includeCore: typeof include_core === 'string' ? include_core !== 'false' : true,
        includeSeasonal: typeof include_seasonal === 'string' ? include_seasonal !== 'false' : true,
        includeTopRoutes: typeof include_top_routes === 'string' ? include_top_routes !== 'false' : true,
      })
    );

    res.json(detail);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top airports for a specific continent (fast airport-focused query)
 * GET /api/statistics/dashboard-top-airports-continent?continent=Asia&window_days=15&limit=10
 */
export async function getDashboardTopAirportsContinent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { continent, date, window_days, start_date, end_date, limit } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;
    const topLimitRaw = typeof limit === 'string' ? Number.parseInt(limit, 10) : 10;
    const topLimit = Number.isNaN(topLimitRaw) ? 10 : Math.min(Math.max(topLimitRaw, 1), 50);

    if (!continent || typeof continent !== 'string') {
      res.status(400).json({
        error: 'Missing continent parameter',
        message: 'continent is required',
      });
      return;
    }

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-top-airports-continent', req.query);
    const topAirports = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getContinentTopAirports({
        continent,
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
        limit: topLimit,
      })
    );

    res.json(topAirports);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top routes for a specific continent (fast route-focused query)
 * GET /api/statistics/dashboard-top-routes-continent?continent=Asia&window_days=15&limit=5
 */
export async function getDashboardTopRoutesContinent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { continent, date, window_days, start_date, end_date, limit } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;
    const topLimitRaw = typeof limit === 'string' ? Number.parseInt(limit, 10) : 5;
    const topLimit = Number.isNaN(topLimitRaw) ? 5 : Math.min(Math.max(topLimitRaw, 1), 20);

    if (!continent || typeof continent !== 'string') {
      res.status(400).json({
        error: 'Missing continent parameter',
        message: 'continent is required',
      });
      return;
    }

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-top-routes-continent', req.query);
    const topRoutes = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getContinentTopRoutes({
        continent,
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
        limit: topLimit,
      })
    );

    res.json(topRoutes);
  } catch (error) {
    next(error);
  }
}

/**
 * Get average trend chart data for a specific continent
 * GET /api/statistics/dashboard-continent-trends?continent=Asia
 */
export async function getDashboardContinentTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { continent } = req.query;

    if (!continent || typeof continent !== 'string') {
      res.status(400).json({
        error: 'Missing continent parameter',
        message: 'continent is required',
      });
      return;
    }

    const trends = await DashboardSummaryService.getContinentTrendAverages({
      continent,
    });

    res.json(trends);
  } catch (error) {
    next(error);
  }
}

/**
 * Get country overview data for drill-down dashboard
 * GET /api/statistics/dashboard-country-overview?country=Thailand&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
export async function getDashboardCountryOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { country, date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!country || typeof country !== 'string') {
      res.status(400).json({
        error: 'Missing country parameter',
        message: 'country is required',
      });
      return;
    }

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-country-overview', req.query);
    const overview = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getCountryOverview({
        country,
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
      })
    );

    res.json(overview);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top country and airport ranks for the world dashboard
 * GET /api/statistics/dashboard-top-ranks?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardTopRanks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-top-ranks', req.query);
    const topRanks = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getWorldTopRanks({
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
      })
    );

    res.json(topRanks);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top country ranks for the world dashboard
 * GET /api/statistics/dashboard-top-countries?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardTopCountries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-top-countries', req.query);
    const countries = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getWorldTopCountries({
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
      })
    );

    res.json(countries);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top airport ranks for the world dashboard
 * GET /api/statistics/dashboard-top-airports?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardTopAirports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-top-airports', req.query);
    const airports = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getWorldTopAirports({
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
      })
    );

    res.json(airports);
  } catch (error) {
    next(error);
  }
}

/**
 * Get top destinations for the world dashboard
 * GET /api/statistics/dashboard-top-destinations?date=YYYY-MM-DD&window_days=15
 */
export async function getDashboardTopDestinations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!start_date || !end_date) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-top-destinations', req.query);
    const destinations = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getWorldTopDestinations({
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
      })
    );

    res.json(destinations);
  } catch (error) {
    next(error);
  }
}

