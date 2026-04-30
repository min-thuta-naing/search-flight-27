import { Request, Response, NextFunction } from 'express';
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { SearchStatisticsModel, PriceStatisticsModel } from '../models/SearchStatistics';
import { AirportModel } from '../models/Airport';
import { convertToAirportCode } from '../utils/airportCodeConverter';
import { DashboardSummaryService, clearDashboardMemoryCache, getDashboardMemoryCacheStats, getAirportCodesForContinent } from '../services/dashboardSummaryService';
import { getContinentMeta } from '../utils/continentMapper';
import { pool } from '../config/database';

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

function normalizeQueryText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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

export function markDashboardPreloadAsCompleted(override?: { attempted?: number; failed?: number }) {
  const now = new Date().toISOString();
  const attempted = override?.attempted ?? 0;
  const failed = override?.failed ?? 0;

  setDashboardPreloadStatus({
    phase: 'completed',
    startedAt: now,
    finishedAt: now,
    attempted,
    failed,
    durationMs: 0,
    durationMinutes: 0,
    error: null,
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
  const payload = JSON.stringify(snapshot, null, 2);

  await writeFile(tempFile, payload, 'utf8');

  const isRecoverableRenameError = (error: unknown) => {
    const code = (error as { code?: string })?.code;
    return code === 'EPERM' || code === 'EEXIST' || code === 'EBUSY' || code === 'EACCES';
  };

  try {
    // Best path on most platforms: atomic-ish swap from tmp to live file.
    await rename(tempFile, DASHBOARD_CACHE_FILE);
    return;
  } catch (error) {
    if (!isRecoverableRenameError(error)) {
      throw error;
    }
  }

  // Windows can reject rename when destination exists or is transiently locked.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await rm(DASHBOARD_CACHE_FILE, { force: true });
      await rename(tempFile, DASHBOARD_CACHE_FILE);
      return;
    } catch (error) {
      if (!isRecoverableRenameError(error)) {
        throw error;
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
  }

  // Last resort: write directly and clean temp file so API request does not fail.
  await writeFile(DASHBOARD_CACHE_FILE, payload, 'utf8');
  await rm(tempFile, { force: true });
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

export async function getDashboardQueryCacheFreshness() {
  const entries = await readDashboardQueryCacheSnapshot();
  const now = Date.now();
  const totalEntries = Object.keys(entries).length;
  const freshEntries = Object.values(entries).filter((entry) => entry.expiresAt > now).length;

  return {
    totalEntries,
    freshEntries,
    hasFreshEntries: freshEntries > 0,
    ttlHours: DASHBOARD_QUERY_CACHE_TTL_MS / (60 * 60 * 1000),
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
    `airport=${toQueryValue(query.airport)}`,
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

function normalizeCountryBatchSize(value: unknown, fallback = 15): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(20, Math.floor(parsed));
}

function normalizeRssLimitMb(value: unknown, fallback = 2048): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(16384, Math.floor(parsed));
}

async function getAllCountryNames(): Promise<string[]> {
  const countriesResult = await pool.query<{ country_name: string }>(
    `
      SELECT DISTINCT
        TRIM(COALESCE(NULLIF(a.country_name, ''), NULLIF(a.country, ''), NULLIF(a.country_code, ''))) AS country_name
      FROM airports a
      WHERE a.code IS NOT NULL
        AND TRIM(a.code) <> ''
        AND TRIM(COALESCE(NULLIF(a.country_name, ''), NULLIF(a.country, ''), NULLIF(a.country_code, ''))) <> ''
      ORDER BY country_name ASC
    `,
  );

  return countriesResult.rows
    .map((row) => row.country_name?.trim())
    .filter((name): name is string => Boolean(name));
}

function getProcessRssMb(): number {
  return Math.round(process.memoryUsage().rss / (1024 * 1024));
}

type PreloadCacheMode = 'append' | 'override';

async function preloadCountryOverviewsForRange(options: {
  startDate: string;
  endDate: string;
  countryBatchSize: number;
  maxCountryRssMb: number;
  cacheMode: PreloadCacheMode;
}) {
  const { startDate, endDate, countryBatchSize, maxCountryRssMb, cacheMode } = options;
  console.log(
    `[dashboard-preload] country preload start; mode=${cacheMode}; range=${startDate}->${endDate}; batchSize=${countryBatchSize}; rssLimit=${maxCountryRssMb}MB`
  );
  const countryNames = await getAllCountryNames();

  let attempted = 0;
  let failed = 0;
  let batches = 0;
  let stoppedByRss = false;
  let cacheAliasWrites = 0;
  const failedCountries: Array<{ country: string; error: string }> = [];

  for (let index = 0; index < countryNames.length; index += countryBatchSize) {
    const batch = countryNames.slice(index, index + countryBatchSize);
    batches += 1;

    const batchResults = await Promise.all(
      batch.map(async (countryName) => {
        const queryWithWindow = {
          country: countryName,
          window_days: '15',
          start_date: startDate,
          end_date: endDate,
        } as Request['query'];

        const queryWithoutWindow = {
          country: countryName,
          start_date: startDate,
          end_date: endDate,
        } as Request['query'];

        try {
          const cacheKeyWithWindow = buildDashboardQueryCacheKey('dashboard-country-overview', queryWithWindow);
          const payload = await getOrSetDashboardQueryCache(cacheKeyWithWindow, () =>
            DashboardSummaryService.getCountryOverview({
              country: countryName,
              windowDays: 15,
              startDateInput: startDate,
              endDateInput: endDate,
            })
          );

          // Mirror to the key shape used by endpoint calls that pass only start/end (no window_days).
          const cacheKeyWithoutWindow = buildDashboardQueryCacheKey('dashboard-country-overview', queryWithoutWindow);
          if (cacheKeyWithoutWindow !== cacheKeyWithWindow) {
            await writeDashboardQueryCache(cacheKeyWithoutWindow, payload);
          }

          return { ok: true as const, country: countryName };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { ok: false as const, country: countryName, error: errorMessage };
        }
      })
    );

    attempted += batch.length;
    const batchFailures = batchResults.filter((result) => !result.ok);
    failed += batchFailures.length;
    cacheAliasWrites += batch.length - batchFailures.length;

    for (const failure of batchFailures) {
      if (failedCountries.length >= 20) {
        break;
      }
      failedCountries.push({ country: failure.country, error: failure.error });
    }

    await waitForDashboardCacheWrites();
    const cleared = clearDashboardMemoryCache();

    const currentRssMb = getProcessRssMb();
    console.log(
      `[dashboard-preload] country batch ${batches} done; mode=${cacheMode}; countries=${batch.length}; memory-cleared=${cleared.totalCleared}; rss=${currentRssMb}MB; limit=${maxCountryRssMb}MB`
    );

    if (currentRssMb >= maxCountryRssMb) {
      stoppedByRss = true;
      console.log(`[dashboard-preload] country preload stopped by RSS guard at ${currentRssMb}MB`);
      break;
    }
  }

  return {
    attempted,
    failed,
    countries: countryNames.length,
    countryBatchSize,
    batches,
    maxCountryRssMb,
    stoppedByRss,
    cacheAliasWrites,
    source: 'database-active-countries' as const,
    failedCountries,
  };
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

export async function warmDashboardCachesOnStartup(options?: {
  preloadPresetData?: boolean;
  preloadCountryOverview?: boolean;
  countryBatchSize?: number;
  maxCountryRssMb?: number;
  cacheMode?: PreloadCacheMode;
}): Promise<{ attempted: number; failed: number; presetPreloadEnabled: boolean; countryPreloadEnabled: boolean }> {
  let attempted = 0;
  let failed = 0;
  const preloadPresetData = options?.preloadPresetData ?? true;
  const preloadCountryOverview = options?.preloadCountryOverview ?? true;
  const countryBatchSize = normalizeCountryBatchSize(options?.countryBatchSize, 15);
  const maxCountryRssMb = normalizeRssLimitMb(options?.maxCountryRssMb, 1024);
  const cacheMode = options?.cacheMode ?? 'override';
  const startedAt = beginDashboardPreload();
  console.log(`[dashboard-preload] start at ${startedAt}`);

  try {
    const boundsKey = buildDashboardQueryCacheKey('dashboard-date-bounds', {} as Request['query']);
    const bounds = await getOrSetDashboardQueryCache(boundsKey, () => DashboardSummaryService.getDashboardDataBounds());

    if (!bounds.minDate || !bounds.recommendedEndDate) {
      finishDashboardPreload('completed', attempted, failed);
      console.log('[dashboard-preload] completed without date bounds');
      return {
        attempted,
        failed,
        presetPreloadEnabled: preloadPresetData,
        countryPreloadEnabled: preloadCountryOverview,
      };
    }

    const now = new Date();
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    if (preloadPresetData) {
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
    } else {
      console.log('[dashboard-preload] preset preload disabled; skipping world preset warmup');
    }

    if (preloadCountryOverview) {
      const result = await preloadCountryOverviewsForRange({
        startDate: bounds.minDate,
        endDate: bounds.recommendedEndDate,
        countryBatchSize,
        maxCountryRssMb,
        cacheMode,
      });
      attempted += result.attempted;
      failed += result.failed;
      setDashboardPreloadStatus({ attempted, failed });
      console.log(`[dashboard-preload] country preload done; mode=${result.source}; attempted=${result.attempted}; failed=${result.failed}; batches=${result.batches}`);
    } else {
      console.log('[dashboard-preload] country preload disabled; skipping country warmup');
    }

    finishDashboardPreload('completed', attempted, failed);
    console.log(`[dashboard-preload] completed in ${dashboardPreloadStatus.durationMinutes.toFixed(2)} min; attempted=${attempted}; failed=${failed}; dumped-to=${DASHBOARD_CACHE_FILE}`);
    return { attempted, failed, presetPreloadEnabled: preloadPresetData, countryPreloadEnabled: preloadCountryOverview };
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
  preloadPresetData?: boolean;
  cacheMode?: PreloadCacheMode;
  preloadCountryOverview?: boolean;
  countryBatchSize?: number;
  maxCountryRssMb?: number;
}) {
  const clearFirst = options?.clearFirst ?? true;
  const preset = options?.preset ?? 'focus';
  const fullPreload = options?.fullPreload ?? false;
  const preloadPresetData = options?.preloadPresetData ?? true;
  const cacheMode = options?.cacheMode ?? (clearFirst ? 'override' : 'append');
  const preloadCountryOverview = options?.preloadCountryOverview ?? true;
  const countryBatchSize = normalizeCountryBatchSize(options?.countryBatchSize, 15);
  const maxCountryRssMb = normalizeRssLimitMb(options?.maxCountryRssMb, 2048);
  const effectiveClearFirst = cacheMode === 'override' ? true : clearFirst;
  let cleared = {
    queryCache: { cacheEntries: 0, inFlightEntries: 0, totalCleared: 0 },
    memoryCache: { totalCleared: 0 },
  };
  let countryPreload = {
    enabled: preloadCountryOverview,
    attempted: 0,
    failed: 0,
    countries: 0,
    countryBatchSize,
    maxCountryRssMb,
    batches: 0,
    stoppedByRss: false,
    cacheAliasWrites: 0,
    source: 'database-active-countries' as const,
    failedCountries: [] as Array<{ country: string; error: string }>,
    skipped: false,
  };

  console.log(
    `[dashboard-preload] refresh start; mode=${cacheMode}; clearFirst=${effectiveClearFirst}; preset=${preset}; fullPreload=${fullPreload}; preloadPreset=${preloadPresetData}; preloadCountry=${preloadCountryOverview}; countryBatchSize=${countryBatchSize}; maxCountryRssMb=${maxCountryRssMb}`
  );

  if (effectiveClearFirst) {
    const queryCache = await clearDashboardQueryCacheStore();
    const memoryCache = clearDashboardMemoryCache();
    cleared = {
      queryCache,
      memoryCache,
    };
    console.log(
      `[dashboard-preload] cache cleared; query=${queryCache.totalCleared}; memory=${memoryCache.totalCleared}`
    );
  } else {
    console.log('[dashboard-preload] cache clear skipped (append mode or clear=false)');
  }

  let preload: { attempted: number; failed: number };

  if (fullPreload) {
    console.log('[dashboard-preload] entering full preload flow');
    const fullPreloadResult = await warmDashboardCachesOnStartup({
      preloadPresetData,
      preloadCountryOverview,
      countryBatchSize,
      maxCountryRssMb,
      cacheMode,
    });
    preload = {
      attempted: fullPreloadResult.attempted,
      failed: fullPreloadResult.failed,
    };
    console.log(
      `[dashboard-preload] full preload flow done; attempted=${preload.attempted}; failed=${preload.failed}`
    );
  } else {
    console.log('[dashboard-preload] entering targeted preload flow');
    const boundsKey = buildDashboardQueryCacheKey('dashboard-date-bounds', {} as Request['query']);
    const bounds = await getOrSetDashboardQueryCache(boundsKey, () => DashboardSummaryService.getDashboardDataBounds());

    if (!bounds.minDate || !bounds.recommendedEndDate) {
      preload = { attempted: 0, failed: 0 };
    } else {
      const now = new Date();
      const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      let attempted = 0;
      let failed = 0;

      if (preloadPresetData) {
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

        for (const task of tasks) {
          attempted += 1;
          try {
            const cacheKey = buildDashboardQueryCacheKey(task.scope, query);
            console.log(`[dashboard-preload] preset task start: ${task.scope}`);
            await getOrSetDashboardQueryCache(cacheKey, task.run);
            console.log(`[dashboard-preload] preset task done: ${task.scope}`);
          } catch {
            failed += 1;
            console.warn(`[dashboard-preload] preset task failed: ${task.scope}`);
          }
        }
      } else {
        console.log('[dashboard-preload] preset preload skipped by flag');
      }

      const { startDate, endDate } = buildPresetDateRange(preset, bounds.minDate, bounds.recommendedEndDate, utcToday);

      if (preloadCountryOverview) {
        console.log('[dashboard-preload] country preload phase start');
        const result = await preloadCountryOverviewsForRange({
          startDate,
          endDate,
          countryBatchSize,
          maxCountryRssMb,
          cacheMode,
        });
        countryPreload = {
          enabled: true,
          attempted: result.attempted,
          failed: result.failed,
          countries: result.countries,
          countryBatchSize: result.countryBatchSize,
          maxCountryRssMb: result.maxCountryRssMb,
          batches: result.batches,
          stoppedByRss: result.stoppedByRss,
          cacheAliasWrites: result.cacheAliasWrites,
          source: result.source,
          failedCountries: result.failedCountries,
          skipped: false,
        };
        console.log(
          `[dashboard-preload] country preload phase done; attempted=${result.attempted}; failed=${result.failed}; batches=${result.batches}; stoppedByRss=${result.stoppedByRss}`
        );
      } else {
        countryPreload = {
          enabled: false,
          attempted: 0,
          failed: 0,
          countries: 0,
          countryBatchSize,
          maxCountryRssMb,
          batches: 0,
          stoppedByRss: false,
          cacheAliasWrites: 0,
          source: 'database-active-countries',
          failedCountries: [],
          skipped: true,
        };
        console.log('[dashboard-preload] country preload skipped by flag');
      }

      await waitForDashboardCacheWrites();
      preload = { attempted, failed };
    }
  }

  const queryCache = await getDashboardQueryCacheStats();
  const memoryCache = getDashboardMemoryCacheStats();

  return {
    clearFirst,
    cacheMode,
    preset,
    fullPreload,
    preloadPresetData,
    preloadCountryOverview,
    countryBatchSize,
    maxCountryRssMb,
    cleared,
    preload,
    countryPreload,
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
    const normalizedStartDate = normalizeQueryText(start_date);
    const normalizedEndDate = normalizeQueryText(end_date);
    const normalizedDate = normalizeQueryText(date);
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!country || typeof country !== 'string') {
      res.status(400).json({
        error: 'Missing country parameter',
        message: 'country is required',
      });
      return;
    }

    if (!normalizedStartDate || !normalizedEndDate) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const normalizedQuery = {
      ...req.query,
      date: normalizedDate,
      start_date: normalizedStartDate,
      end_date: normalizedEndDate,
    };
    const cacheKey = buildDashboardQueryCacheKey('dashboard-country-overview', normalizedQuery);
    const overview = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getCountryOverview({
        country,
        centerDateInput: normalizedDate,
        windowDays,
        startDateInput: normalizedStartDate,
        endDateInput: normalizedEndDate,
      })
    );

    res.json(overview);
  } catch (error) {
    next(error);
  }
}

/**
 * Get country flow map data for drill-down dashboard
 * GET /api/statistics/dashboard-country-flow-map?country=Thailand&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
export async function getDashboardCountryFlowMap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { country, date, window_days, start_date, end_date } = req.query;
    const normalizedStartDate = normalizeQueryText(start_date);
    const normalizedEndDate = normalizeQueryText(end_date);
    const normalizedDate = normalizeQueryText(date);
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!country || typeof country !== 'string') {
      res.status(400).json({
        error: 'Missing country parameter',
        message: 'country is required',
      });
      return;
    }

    if (!normalizedStartDate || !normalizedEndDate) {
      if (Number.isNaN(windowDays) || windowDays < 1 || windowDays > 3650) {
        res.status(400).json({
          error: 'Invalid window_days parameter',
          message: 'window_days must be a number between 1 and 3650',
        });
        return;
      }
    }

    const normalizedQuery = {
      ...req.query,
      date: normalizedDate,
      start_date: normalizedStartDate,
      end_date: normalizedEndDate,
    };
    const cacheKey = buildDashboardQueryCacheKey('dashboard-country-flow-map', normalizedQuery);
    const flowMap = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getCountryFlowMap({
        country,
        centerDateInput: normalizedDate,
        windowDays,
        startDateInput: normalizedStartDate,
        endDateInput: normalizedEndDate,
      })
    );

    res.json(flowMap);
  } catch (error) {
    next(error);
  }
}

/**
 * Get airport overview KPI data for airport drill-down dashboard
 * GET /api/statistics/dashboard-airport-overview?airport=BKK&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
export async function getDashboardAirportOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { airport, date, window_days, start_date, end_date } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;

    if (!airport || typeof airport !== 'string') {
      res.status(400).json({
        error: 'Missing airport parameter',
        message: 'airport is required',
      });
      return;
    }

    const airportCode = airport.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,4}$/.test(airportCode)) {
      res.status(400).json({
        error: 'Invalid airport parameter',
        message: 'airport must be an airport code (3-4 alphanumeric characters)',
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

    const cacheKey = buildDashboardQueryCacheKey('dashboard-airport-overview-v3', {
      ...req.query,
      airport: airportCode,
    });
    const overview = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getAirportOverview({
        airportCode,
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
 * Get airport insights data for airport drill-down panels
 * GET /api/statistics/dashboard-airport-insights?airport=BKK&window_days=30&route_limit=5&airline_limit=8
 */
export async function getDashboardAirportInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { airport, date, window_days, start_date, end_date, route_limit, airline_limit } = req.query;
    const windowDays = typeof window_days === 'string' ? Number.parseInt(window_days, 10) : 15;
    const routeLimit = typeof route_limit === 'string' ? Number.parseInt(route_limit, 10) : 5;
    const airlineLimit = typeof airline_limit === 'string' ? Number.parseInt(airline_limit, 10) : 8;

    if (!airport || typeof airport !== 'string') {
      res.status(400).json({
        error: 'Missing airport parameter',
        message: 'airport is required',
      });
      return;
    }

    const airportCode = airport.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,4}$/.test(airportCode)) {
      res.status(400).json({
        error: 'Invalid airport parameter',
        message: 'airport must be an airport code (3-4 alphanumeric characters)',
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

    const cacheKey = buildDashboardQueryCacheKey('dashboard-airport-insights-v1', {
      ...req.query,
      airport: airportCode,
    });
    const insights = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getAirportInsights({
        airportCode,
        centerDateInput: typeof date === 'string' ? date : undefined,
        windowDays,
        startDateInput: typeof start_date === 'string' ? start_date : undefined,
        endDateInput: typeof end_date === 'string' ? end_date : undefined,
        routeLimit: Number.isNaN(routeLimit) ? 5 : routeLimit,
        airlineLimit: Number.isNaN(airlineLimit) ? 8 : airlineLimit,
      })
    );

    res.json(insights);
  } catch (error) {
    next(error);
  }
}

/**
 * Get airport trend data for airport drill-down charts
 * GET /api/statistics/dashboard-airport-trends?airport=BKK&date=YYYY-MM-DD
 */
export async function getDashboardAirportTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { airport, date } = req.query;

    if (!airport || typeof airport !== 'string') {
      res.status(400).json({
        error: 'Missing airport parameter',
        message: 'airport is required',
      });
      return;
    }

    const airportCode = airport.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,4}$/.test(airportCode)) {
      res.status(400).json({
        error: 'Invalid airport parameter',
        message: 'airport must be an airport code (3-4 alphanumeric characters)',
      });
      return;
    }

    const cacheKey = buildDashboardQueryCacheKey('dashboard-airport-trends-v1', {
      ...req.query,
      airport: airportCode,
    });
    const trends = await getOrSetDashboardQueryCache(cacheKey, () =>
      DashboardSummaryService.getAirportTrends({
        airportCode,
        centerDateInput: typeof date === 'string' ? date : undefined,
      })
    );

    res.json(trends);
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

type DashboardAirlineAggRow = {
  id: number;
  name: string;
  country: string;
  countryCount: number;
  airportCount: number;
  flightCount: number;
};

function airlineFlagEmoji(countryCode: string): string {
  const code = (countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '\u{1F310}';
  const a = code.codePointAt(0);
  const b = code.codePointAt(1);
  if (a == null || b == null) return '\u{1F310}';
  return String.fromCodePoint(0x1f1e6 + a - 65, 0x1f1e6 + b - 65);
}

type AirlineFullDataRouteRow = {
  dep_iata: string;
  arr_iata: string;
  flights: number;
  arr_name: string;
  arr_city: string;
  arr_cc: string;
  arr_country: string;
  dep_name: string;
  dep_cc: string;
  dep_country: string;
  airline_name: string;
};

type AirlineAirportItem = {
  iata: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  flights: number;
};

type AirlineCountryItem = {
  countryCode: string;
  countryName: string;
  flag: string;
  flights: number;
  pct: number;
};

type AirlineFullDataCached = {
  airlineId: number;
  airlineName: string;
  totalFlights: number;
  airportCount: number;
  countryCount: number;
  domesticFlights: number;
  internationalFlights: number;
  allOriginAirports: AirlineAirportItem[];
  allDestAirports: AirlineAirportItem[];
  allDestCountries: AirlineCountryItem[];
};

type AirlineTrendPoint = {
  date: string;
  flights: number;
  departureFlights: number;
  arrivalFlights: number;
};

async function getOrSetAirlineFullData(
  airlineId: number,
  level: string,
  filterValue: string,
  startDate?: string,
  endDate?: string,
): Promise<AirlineFullDataCached> {
  const cacheKey = `dashboard-airline-full|id=${airlineId}|level=${level}|filter=${filterValue.toUpperCase().trim()}|start=${startDate || ''}|end=${endDate || ''}`;
  return getOrSetDashboardQueryCache<AirlineFullDataCached>(cacheKey, async () => {
    let geoWhere = '';
    const queryParams: (number | string | string[])[] = [airlineId];

    if (filterValue && level !== 'world') {
      if (level === 'airport') {
        // Filter by departure airport so originAgg={scope} and destAgg=all destinations from it.
        // Filtering by arrival would pin arr_iata to the scope, collapsing destAgg to one row.
        geoWhere = `AND UPPER(TRIM(dfp.dep_airport)) = $2`;
        queryParams.push(filterValue.toUpperCase().trim());
      } else if (level === 'country') {
        geoWhere = `AND (
          UPPER(TRIM(ap_dep.country_code)) = $2
          OR UPPER(TRIM(ap_dep.country)) = $2
          OR UPPER(TRIM(ap_dep.country_name)) = $2
        )`;
        queryParams.push(filterValue.toUpperCase().trim());
      } else if (level === 'continent') {
        const codes = await getAirportCodesForContinent(filterValue);
        if (codes.length > 0) {
          geoWhere = `AND UPPER(TRIM(dfp.dep_airport)) = ANY($2::text[])`;
          queryParams.push(codes);
        }
      }
    }

    let dateWhere = '';
    if (startDate) {
      dateWhere += ` AND dfp.departure_date >= $${queryParams.length + 1}::date`;
      queryParams.push(startDate);
    }
    if (endDate) {
      dateWhere += ` AND dfp.departure_date <= $${queryParams.length + 1}::date`;
      queryParams.push(endDate);
    }

    const sql = `
      SELECT
        UPPER(TRIM(dfp.dep_airport))                                                                  AS dep_iata,
        UPPER(TRIM(dfp.arr_airport))                                                                  AS arr_iata,
        COUNT(*)::int                                                                                 AS flights,
        MAX(COALESCE(NULLIF(TRIM(ap_arr.name), ''), dfp.arr_airport))                               AS arr_name,
        MAX(COALESCE(NULLIF(TRIM(ap_arr.city), ''), NULLIF(TRIM(ap_arr.name), ''), dfp.arr_airport)) AS arr_city,
        MAX(COALESCE(NULLIF(TRIM(ap_arr.country_code), ''), NULLIF(TRIM(ap_arr.country), ''), ''))  AS arr_cc,
        MAX(COALESCE(NULLIF(TRIM(ap_arr.country_name), ''), NULLIF(TRIM(ap_arr.country), ''), 'Unknown')) AS arr_country,
        MAX(COALESCE(NULLIF(TRIM(ap_dep.name), ''), dfp.dep_airport))                               AS dep_name,
        MAX(COALESCE(NULLIF(TRIM(ap_dep.country_code), ''), NULLIF(TRIM(ap_dep.country), ''), ''))  AS dep_cc,
        MAX(COALESCE(NULLIF(TRIM(ap_dep.country_name), ''), NULLIF(TRIM(ap_dep.country), ''), 'Unknown')) AS dep_country,
        MAX(al.name)                                                                                  AS airline_name
      FROM departure_flight_paths dfp
      JOIN airlines al ON al.id = dfp.airline_id
      LEFT JOIN airports ap_arr ON UPPER(TRIM(ap_arr.code)) = UPPER(TRIM(dfp.arr_airport))
      LEFT JOIN airports ap_dep ON UPPER(TRIM(ap_dep.code)) = UPPER(TRIM(dfp.dep_airport))
      WHERE dfp.airline_id = $1
      ${geoWhere}
      ${dateWhere}
      GROUP BY UPPER(TRIM(dfp.dep_airport)), UPPER(TRIM(dfp.arr_airport))
      ORDER BY COUNT(*) DESC
    `;

    const { rows } = await pool.query<AirlineFullDataRouteRow>(sql, queryParams);

    const airlineName = rows[0]?.airline_name || `Airline #${airlineId}`;
    let totalFlights = 0;
    let domesticFlights = 0;

    const originAgg = new Map<string, AirlineAirportItem>();
    const destAgg = new Map<string, AirlineAirportItem>();
    const countryAgg = new Map<string, { countryCode: string; countryName: string; flights: number }>();

    for (const r of rows) {
      const f = Number(r.flights) || 0;
      totalFlights += f;

      if (r.dep_cc && r.arr_cc && r.dep_cc.toUpperCase() === r.arr_cc.toUpperCase()) {
        domesticFlights += f;
      }

      if (r.dep_iata) {
        const a = originAgg.get(r.dep_iata);
        if (a) { a.flights += f; }
        else originAgg.set(r.dep_iata, { iata: r.dep_iata, name: r.dep_name || r.dep_iata, country: r.dep_country || 'Unknown', countryCode: r.dep_cc || '', flag: '', flights: f });
      }

      if (r.arr_iata) {
        const a = destAgg.get(r.arr_iata);
        if (a) { a.flights += f; }
        else destAgg.set(r.arr_iata, { iata: r.arr_iata, name: r.arr_name || r.arr_iata, country: r.arr_country || 'Unknown', countryCode: r.arr_cc || '', flag: '', flights: f });
      }

      const ck = r.arr_cc || r.arr_country || 'Unknown';
      const c = countryAgg.get(ck);
      if (c) { c.flights += f; }
      else countryAgg.set(ck, { countryCode: r.arr_cc || '', countryName: r.arr_country || 'Unknown', flights: f });
    }

    const allOriginAirports = Array.from(originAgg.values())
      .sort((a, b) => b.flights - a.flights)
      .map((a) => ({ ...a, flag: airlineFlagEmoji(a.countryCode) }));

    const allDestAirports = Array.from(destAgg.values())
      .sort((a, b) => b.flights - a.flights)
      .map((a) => ({ ...a, flag: airlineFlagEmoji(a.countryCode) }));

    const allDestCountries = Array.from(countryAgg.values())
      .sort((a, b) => b.flights - a.flights)
      .map((c) => ({
        ...c,
        flag: airlineFlagEmoji(c.countryCode),
        pct: totalFlights > 0 ? (c.flights / totalFlights) * 100 : 0,
      }));

    return {
      airlineId,
      airlineName,
      totalFlights,
      airportCount: destAgg.size,
      countryCount: countryAgg.size,
      domesticFlights,
      internationalFlights: totalFlights - domesticFlights,
      allOriginAirports,
      allDestAirports,
      allDestCountries,
    };
  });
}

/**
 * Get paginated airline overview for the dashboard airlines panel.
 * Cache strategy: full aggregation is cached per (level, filterValue); pagination
 * and search are handled in-memory so infinite-scroll never hits the database.
 * GET /api/statistics/dashboard-airlines?page=0&pageSize=15&search=&level=world&filterValue=
 *   level: world | continent | country | airport
 *   filterValue: continent name | country code/name | IATA code
 */
export async function getDashboardAirlines(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pageRaw = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : 0;
    const pageSizeRaw = typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : 15;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const level = typeof req.query.level === 'string' ? req.query.level.trim() : 'world';
    const filterValue = typeof req.query.filterValue === 'string' ? req.query.filterValue.trim() : '';

    const page = Number.isNaN(pageRaw) || pageRaw < 0 ? 0 : pageRaw;
    const pageSize = Number.isNaN(pageSizeRaw) || pageSizeRaw < 1 ? 15 : Math.min(pageSizeRaw, 100);
    const offset = page * pageSize;

    // Cache key covers only the data shape — page/search are resolved in memory
    const cacheKey = `dashboard-airlines|level=${level}|filter=${filterValue.toUpperCase().trim()}`;

    const allAirlines = await getOrSetDashboardQueryCache<DashboardAirlineAggRow[]>(cacheKey, async () => {
      // Build geo WHERE clause for airline_agg only; home_country is always global
      let geoWhere = '';
      let queryParams: (string | string[])[] = [];

      if (filterValue && level !== 'world') {
        if (level === 'airport') {
          geoWhere = `WHERE UPPER(TRIM(dfp.arr_airport)) = $1`;
          queryParams = [filterValue.toUpperCase().trim()];
        } else if (level === 'country') {
          geoWhere = `WHERE (
            UPPER(TRIM(ap.country_code)) = $1
            OR UPPER(TRIM(ap.country)) = $1
            OR UPPER(TRIM(ap.country_name)) = $1
          )`;
          queryParams = [filterValue.toUpperCase().trim()];
        } else if (level === 'continent') {
          const codes = await getAirportCodesForContinent(filterValue);
          if (codes.length > 0) {
            geoWhere = `WHERE UPPER(TRIM(dfp.arr_airport)) = ANY($1::text[])`;
            queryParams = [codes];
          }
        }
      }

      const sql = `
        WITH airline_agg AS (
          SELECT
            dfp.airline_id,
            COUNT(*)::int                                        AS flight_count,
            COUNT(DISTINCT UPPER(TRIM(dfp.arr_airport)))::int    AS airport_count,
            COUNT(DISTINCT COALESCE(
              NULLIF(TRIM(ap.country_name), ''),
              NULLIF(TRIM(ap.country), '')
            ))::int                                              AS country_count
          FROM departure_flight_paths dfp
          LEFT JOIN airports ap ON UPPER(TRIM(ap.code)) = UPPER(TRIM(dfp.arr_airport))
          ${geoWhere}
          GROUP BY dfp.airline_id
        ),
        home_country AS (
          SELECT DISTINCT ON (src.airline_id)
            src.airline_id,
            COALESCE(
              NULLIF(TRIM(ap.country_name), ''),
              NULLIF(TRIM(ap.country), ''),
              'Unknown'
            ) AS country
          FROM (
            SELECT airline_id, dep_airport, COUNT(*)::int AS cnt
            FROM departure_flight_paths
            GROUP BY airline_id, dep_airport
          ) src
          LEFT JOIN airports ap ON UPPER(TRIM(ap.code)) = UPPER(TRIM(src.dep_airport))
          ORDER BY src.airline_id, src.cnt DESC
        )
        SELECT
          al.id,
          al.name,
          COALESCE(hc.country, 'Unknown')      AS country,
          COALESCE(agg.country_count, 0)        AS "countryCount",
          COALESCE(agg.airport_count, 0)        AS "airportCount",
          COALESCE(agg.flight_count, 0)         AS "flightCount"
        FROM airlines al
        JOIN airline_agg agg ON agg.airline_id = al.id
        LEFT JOIN home_country hc ON hc.airline_id = al.id
        ORDER BY agg.flight_count DESC, al.name ASC
      `;

      const result = await pool.query<{
        id: number; name: string; country: string;
        countryCount: number; airportCount: number; flightCount: number;
      }>(sql, queryParams);

      return result.rows.map((r) => ({
        id: Number(r.id),
        name: String(r.name),
        country: String(r.country),
        countryCount: Number(r.countryCount),
        airportCount: Number(r.airportCount),
        flightCount: Number(r.flightCount),
      }));
    });

    // In-memory search → paginate (DB already sorted by flightCount DESC, name ASC)
    const searchLower = search.toLowerCase();
    const filtered = search
      ? allAirlines.filter(
          (a) => a.name.toLowerCase().includes(searchLower) || a.country.toLowerCase().includes(searchLower),
        )
      : allAirlines;

    const rows = filtered.slice(offset, offset + pageSize);

    res.json({
      rows,
      total: filtered.length,
      page,
      pageSize,
      hasMore: offset + rows.length < filtered.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get full detail for a single airline drill-down view.
 * Delegates to getOrSetAirlineFullData so the same cache is shared with paginated endpoints.
 * GET /api/statistics/dashboard-airline-detail?airlineId=1&level=world&filterValue=
 */
export async function getDashboardAirlineDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const airlineIdRaw = typeof req.query.airlineId === 'string' ? Number.parseInt(req.query.airlineId, 10) : NaN;
    const level = typeof req.query.level === 'string' ? req.query.level.trim() : 'world';
    const filterValue = typeof req.query.filterValue === 'string' ? req.query.filterValue.trim() : '';
    const startDate = typeof req.query.start_date === 'string' && req.query.start_date.trim() ? req.query.start_date.trim() : undefined;
    const endDate = typeof req.query.end_date === 'string' && req.query.end_date.trim() ? req.query.end_date.trim() : undefined;

    if (Number.isNaN(airlineIdRaw) || airlineIdRaw < 1) {
      res.status(400).json({ error: 'airlineId must be a positive integer' });
      return;
    }

    const full = await getOrSetAirlineFullData(airlineIdRaw, level, filterValue, startDate, endDate);

    res.json({
      airlineId: full.airlineId,
      airlineName: full.airlineName,
      totalFlights: full.totalFlights,
      airportCount: full.airportCount,
      countryCount: full.countryCount,
      domesticFlights: full.domesticFlights,
      internationalFlights: full.internationalFlights,
      topAirports: full.allDestAirports.slice(0, 10),
      topCountries: full.allDestCountries.slice(0, 10),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get daily flight frequency trend for an airline.
 * GET /api/statistics/dashboard-airline-trend?airlineId=1&level=world&filterValue=
 */
export async function getDashboardAirlineTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const airlineIdRaw = typeof req.query.airlineId === 'string' ? Number.parseInt(req.query.airlineId, 10) : NaN;
    const level = typeof req.query.level === 'string' ? req.query.level.trim() : 'world';
    const filterValue = typeof req.query.filterValue === 'string' ? req.query.filterValue.trim() : '';
    const startDate = typeof req.query.start_date === 'string' && req.query.start_date.trim() ? req.query.start_date.trim() : undefined;
    const endDate = typeof req.query.end_date === 'string' && req.query.end_date.trim() ? req.query.end_date.trim() : undefined;

    if (Number.isNaN(airlineIdRaw) || airlineIdRaw < 1) {
      res.status(400).json({ error: 'airlineId must be a positive integer' });
      return;
    }

    const airlineId = airlineIdRaw;
    const cacheKey = `dashboard-airline-trend|id=${airlineId}|level=${level}|filter=${filterValue.toUpperCase().trim()}|start=${startDate || ''}|end=${endDate || ''}`;

    const trend = await getOrSetDashboardQueryCache<AirlineTrendPoint[]>(cacheKey, async () => {
      const queryParams: (number | string | string[])[] = [airlineId];
      const fv = filterValue.toUpperCase().trim();

      let dateWhere = '';
      if (startDate) {
        dateWhere += ` AND dfp.departure_date >= $${queryParams.length + 1}::date`;
        queryParams.push(startDate);
      }
      if (endDate) {
        dateWhere += ` AND dfp.departure_date <= $${queryParams.length + 1}::date`;
        queryParams.push(endDate);
      }

      let sql = '';

      if (level === 'airport' && fv) {
        queryParams.push(fv);
        const p = queryParams.length;
        sql = `
          SELECT
            DATE(dfp.departure_date)::text AS date,
            COUNT(*) FILTER (WHERE UPPER(TRIM(dfp.dep_airport)) = $${p})::int AS "departureFlights",
            COUNT(*) FILTER (WHERE UPPER(TRIM(dfp.arr_airport)) = $${p})::int AS "arrivalFlights",
            COUNT(*)::int AS flights
          FROM departure_flight_paths dfp
          WHERE dfp.airline_id = $1
            AND (UPPER(TRIM(dfp.dep_airport)) = $${p} OR UPPER(TRIM(dfp.arr_airport)) = $${p})
            ${dateWhere}
          GROUP BY DATE(dfp.departure_date)
          ORDER BY DATE(dfp.departure_date) ASC
        `;
      } else if (level === 'country' && fv) {
        queryParams.push(fv);
        const p = queryParams.length;
        sql = `
          SELECT
            DATE(dfp.departure_date)::text AS date,
            COUNT(*) FILTER (
              WHERE UPPER(TRIM(dep_ap.country_code)) = $${p}
                 OR UPPER(TRIM(dep_ap.country)) = $${p}
                 OR UPPER(TRIM(dep_ap.country_name)) = $${p}
            )::int AS "departureFlights",
            COUNT(*) FILTER (
              WHERE UPPER(TRIM(arr_ap.country_code)) = $${p}
                 OR UPPER(TRIM(arr_ap.country)) = $${p}
                 OR UPPER(TRIM(arr_ap.country_name)) = $${p}
            )::int AS "arrivalFlights",
            COUNT(*)::int AS flights
          FROM departure_flight_paths dfp
          LEFT JOIN airports dep_ap ON UPPER(TRIM(dep_ap.code)) = UPPER(TRIM(dfp.dep_airport))
          LEFT JOIN airports arr_ap ON UPPER(TRIM(arr_ap.code)) = UPPER(TRIM(dfp.arr_airport))
          WHERE dfp.airline_id = $1
            AND (
              UPPER(TRIM(dep_ap.country_code)) = $${p} OR UPPER(TRIM(dep_ap.country)) = $${p} OR UPPER(TRIM(dep_ap.country_name)) = $${p}
              OR UPPER(TRIM(arr_ap.country_code)) = $${p} OR UPPER(TRIM(arr_ap.country)) = $${p} OR UPPER(TRIM(arr_ap.country_name)) = $${p}
            )
            ${dateWhere}
          GROUP BY DATE(dfp.departure_date)
          ORDER BY DATE(dfp.departure_date) ASC
        `;
      } else if (level === 'continent' && fv) {
        const codes = await getAirportCodesForContinent(filterValue);
        if (codes.length > 0) {
          queryParams.push(codes);
          const p = queryParams.length;
          sql = `
            SELECT
              DATE(dfp.departure_date)::text AS date,
              COUNT(*) FILTER (WHERE UPPER(TRIM(dfp.dep_airport)) = ANY($${p}::text[]))::int AS "departureFlights",
              COUNT(*) FILTER (WHERE UPPER(TRIM(dfp.arr_airport)) = ANY($${p}::text[]))::int AS "arrivalFlights",
              COUNT(*)::int AS flights
            FROM departure_flight_paths dfp
            WHERE dfp.airline_id = $1
              AND (UPPER(TRIM(dfp.dep_airport)) = ANY($${p}::text[]) OR UPPER(TRIM(dfp.arr_airport)) = ANY($${p}::text[]))
              ${dateWhere}
            GROUP BY DATE(dfp.departure_date)
            ORDER BY DATE(dfp.departure_date) ASC
          `;
        } else {
          sql = `
            SELECT
              DATE(dfp.departure_date)::text AS date,
              COUNT(*)::int AS "departureFlights",
              0::int AS "arrivalFlights",
              COUNT(*)::int AS flights
            FROM departure_flight_paths dfp
            WHERE dfp.airline_id = $1
              ${dateWhere}
            GROUP BY DATE(dfp.departure_date)
            ORDER BY DATE(dfp.departure_date) ASC
          `;
        }
      } else {
        // world level: departure/arrival relative to airline's home country (top dep country by count)
        sql = `
          WITH airline_home AS (
            SELECT
              UPPER(TRIM(COALESCE(NULLIF(dep_ap.country_code, ''), NULLIF(dep_ap.country, ''), dep_ap.country_name))) AS cc,
              UPPER(TRIM(COALESCE(NULLIF(dep_ap.country, ''), NULLIF(dep_ap.country_code, ''), dep_ap.country_name))) AS cn,
              UPPER(TRIM(COALESCE(NULLIF(dep_ap.country_name, ''), NULLIF(dep_ap.country, ''), dep_ap.country_code))) AS cnn
            FROM departure_flight_paths dfp
            LEFT JOIN airports dep_ap ON UPPER(TRIM(dep_ap.code)) = UPPER(TRIM(dfp.dep_airport))
            WHERE dfp.airline_id = $1
              AND dep_ap.country_code IS NOT NULL
            GROUP BY dep_ap.country_code, dep_ap.country, dep_ap.country_name
            ORDER BY COUNT(*) DESC
            LIMIT 1
          )
          SELECT
            DATE(dfp.departure_date)::text AS date,
            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM airline_home h
                WHERE (h.cc <> '' AND UPPER(TRIM(dep_ap.country_code)) = h.cc)
                   OR (h.cn <> '' AND UPPER(TRIM(dep_ap.country)) = h.cn)
                   OR (h.cnn <> '' AND UPPER(TRIM(dep_ap.country_name)) = h.cnn)
              )
            )::int AS "departureFlights",
            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM airline_home h
                WHERE (h.cc <> '' AND UPPER(TRIM(arr_ap.country_code)) = h.cc)
                   OR (h.cn <> '' AND UPPER(TRIM(arr_ap.country)) = h.cn)
                   OR (h.cnn <> '' AND UPPER(TRIM(arr_ap.country_name)) = h.cnn)
              )
            )::int AS "arrivalFlights",
            COUNT(*)::int AS flights
          FROM departure_flight_paths dfp
          LEFT JOIN airports dep_ap ON UPPER(TRIM(dep_ap.code)) = UPPER(TRIM(dfp.dep_airport))
          LEFT JOIN airports arr_ap ON UPPER(TRIM(arr_ap.code)) = UPPER(TRIM(dfp.arr_airport))
          WHERE dfp.airline_id = $1
            ${dateWhere}
          GROUP BY DATE(dfp.departure_date)
          ORDER BY DATE(dfp.departure_date) ASC
        `;
      }

      const { rows } = await pool.query<{ date: string; flights: number; departureFlights: number; arrivalFlights: number }>(sql, queryParams);
      return rows.map((r) => ({
        date: String(r.date),
        flights: Number(r.flights) || 0,
        departureFlights: Number(r.departureFlights) || 0,
        arrivalFlights: Number(r.arrivalFlights) || 0,
      }));
    });

    res.json({ rows: trend });
  } catch (error) {
    next(error);
  }
}

/**
 * Get paginated origin airports for an airline (cache-then-slice).
 * GET /api/statistics/dashboard-airline-origin-airports?airlineId=1&level=world&filterValue=&offset=0&pageSize=9
 */
export async function getDashboardAirlineOriginAirports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const airlineIdRaw = typeof req.query.airlineId === 'string' ? Number.parseInt(req.query.airlineId, 10) : NaN;
    const level = typeof req.query.level === 'string' ? req.query.level.trim() : 'world';
    const filterValue = typeof req.query.filterValue === 'string' ? req.query.filterValue.trim() : '';
    const offsetRaw = typeof req.query.offset === 'string' ? Number.parseInt(req.query.offset, 10) : 0;
    const pageSizeRaw = typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : 10;
    const startDate = typeof req.query.start_date === 'string' && req.query.start_date.trim() ? req.query.start_date.trim() : undefined;
    const endDate = typeof req.query.end_date === 'string' && req.query.end_date.trim() ? req.query.end_date.trim() : undefined;

    if (Number.isNaN(airlineIdRaw) || airlineIdRaw < 1) {
      res.status(400).json({ error: 'airlineId must be a positive integer' });
      return;
    }

    const offset = Number.isNaN(offsetRaw) || offsetRaw < 0 ? 0 : offsetRaw;
    const pageSize = Number.isNaN(pageSizeRaw) || pageSizeRaw < 1 ? 10 : Math.min(pageSizeRaw, 100);

    const full = await getOrSetAirlineFullData(airlineIdRaw, level, filterValue, startDate, endDate);
    const all = full.allOriginAirports;
    const rows = all.slice(offset, offset + pageSize);

    res.json({ rows, total: all.length, offset, pageSize, hasMore: offset + rows.length < all.length });
  } catch (error) {
    next(error);
  }
}

/**
 * Get paginated destination airports for an airline (cache-then-slice).
 * GET /api/statistics/dashboard-airline-dest-airports?airlineId=1&level=world&filterValue=&offset=0&pageSize=9
 */
export async function getDashboardAirlineDestAirports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const airlineIdRaw = typeof req.query.airlineId === 'string' ? Number.parseInt(req.query.airlineId, 10) : NaN;
    const level = typeof req.query.level === 'string' ? req.query.level.trim() : 'world';
    const filterValue = typeof req.query.filterValue === 'string' ? req.query.filterValue.trim() : '';
    const offsetRaw = typeof req.query.offset === 'string' ? Number.parseInt(req.query.offset, 10) : 0;
    const pageSizeRaw = typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : 10;
    const startDate = typeof req.query.start_date === 'string' && req.query.start_date.trim() ? req.query.start_date.trim() : undefined;
    const endDate = typeof req.query.end_date === 'string' && req.query.end_date.trim() ? req.query.end_date.trim() : undefined;

    if (Number.isNaN(airlineIdRaw) || airlineIdRaw < 1) {
      res.status(400).json({ error: 'airlineId must be a positive integer' });
      return;
    }

    const offset = Number.isNaN(offsetRaw) || offsetRaw < 0 ? 0 : offsetRaw;
    const pageSize = Number.isNaN(pageSizeRaw) || pageSizeRaw < 1 ? 10 : Math.min(pageSizeRaw, 100);

    const full = await getOrSetAirlineFullData(airlineIdRaw, level, filterValue, startDate, endDate);
    const all = full.allDestAirports;
    const rows = all.slice(offset, offset + pageSize);

    res.json({ rows, total: all.length, offset, pageSize, hasMore: offset + rows.length < all.length });
  } catch (error) {
    next(error);
  }
}

/**
 * Get paginated destination countries for an airline (cache-then-slice).
 * GET /api/statistics/dashboard-airline-dest-countries?airlineId=1&level=world&filterValue=&offset=0&pageSize=9
 */
export async function getDashboardAirlineDestCountries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const airlineIdRaw = typeof req.query.airlineId === 'string' ? Number.parseInt(req.query.airlineId, 10) : NaN;
    const level = typeof req.query.level === 'string' ? req.query.level.trim() : 'world';
    const filterValue = typeof req.query.filterValue === 'string' ? req.query.filterValue.trim() : '';
    const offsetRaw = typeof req.query.offset === 'string' ? Number.parseInt(req.query.offset, 10) : 0;
    const pageSizeRaw = typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : 10;
    const startDate = typeof req.query.start_date === 'string' && req.query.start_date.trim() ? req.query.start_date.trim() : undefined;
    const endDate = typeof req.query.end_date === 'string' && req.query.end_date.trim() ? req.query.end_date.trim() : undefined;

    if (Number.isNaN(airlineIdRaw) || airlineIdRaw < 1) {
      res.status(400).json({ error: 'airlineId must be a positive integer' });
      return;
    }

    const offset = Number.isNaN(offsetRaw) || offsetRaw < 0 ? 0 : offsetRaw;
    const pageSize = Number.isNaN(pageSizeRaw) || pageSizeRaw < 1 ? 10 : Math.min(pageSizeRaw, 100);

    const full = await getOrSetAirlineFullData(airlineIdRaw, level, filterValue, startDate, endDate);
    const all = full.allDestCountries;
    const rows = all.slice(offset, offset + pageSize);

    res.json({ rows, total: all.length, offset, pageSize, hasMore: offset + rows.length < all.length });
  } catch (error) {
    next(error);
  }
}

/**
 * Get an airline's home base (top origin airport, country, continent).
 * Used by the UI to pre-populate StatusLine hierarchy when drilling directly to an airline.
 * GET /api/statistics/dashboard-airline-home-base?airlineId=1
 */
export async function getDashboardAirlineHomeBase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const airlineIdRaw = typeof req.query.airlineId === 'string' ? Number.parseInt(req.query.airlineId, 10) : NaN;
    if (Number.isNaN(airlineIdRaw) || airlineIdRaw < 1) {
      res.status(400).json({ error: 'airlineId must be a positive integer' });
      return;
    }

    const full = await getOrSetAirlineFullData(airlineIdRaw, 'world', '');
    const topOrigin = full.allOriginAirports[0];

    if (!topOrigin) {
      res.json({ iata: null, airportName: null, countryCode: null, countryName: null, flag: null, continentName: null, continentIcon: null });
      return;
    }

    const continentMeta = getContinentMeta(topOrigin.countryCode || null, topOrigin.country || null);

    res.json({
      iata: topOrigin.iata,
      airportName: topOrigin.name,
      countryCode: topOrigin.countryCode,
      countryName: topOrigin.country,
      flag: topOrigin.flag,
      continentName: continentMeta.label,
      continentIcon: continentMeta.icon,
    });
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
