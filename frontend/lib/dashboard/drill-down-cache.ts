import type { AirportCountrySummary } from '@/lib/api/airport-api';
import type {
  DashboardContinentDetailResponse,
  DashboardSummaryResponse,
  DashboardTopDestinationsResponse,
  DashboardTopRanksResponse,
} from '@/lib/api/statistics-api';

type CacheEntry<T> = {
  value: T;
  cachedAt: number;
};

const DRILLDOWN_CACHE_TTL_MS = 15 * 60 * 1000;
const DRILLDOWN_CACHE_STALE_AFTER_MS = 3 * 60 * 1000;

type CacheReadState<T> = {
  value: T | null;
  stale: boolean;
};

const cacheMetrics = {
  hit: 0,
  miss: 0,
  staleHit: 0,
};

const worldSummaryCache = new Map<string, CacheEntry<DashboardSummaryResponse>>();
const worldTopRanksCache = new Map<string, CacheEntry<DashboardTopRanksResponse>>();
const worldTopDestinationsCache = new Map<string, CacheEntry<DashboardTopDestinationsResponse>>();

function normalizeCacheEntry<T>(input: CacheEntry<T> | T): CacheEntry<T> {
  if (
    typeof input === 'object' &&
    input !== null &&
    'value' in (input as Record<string, unknown>) &&
    'cachedAt' in (input as Record<string, unknown>)
  ) {
    const candidate = input as CacheEntry<T>;
    if (typeof candidate.cachedAt === 'number') {
      return candidate;
    }
  }

  // Backward compatibility for older persisted payload-only cache snapshots.
  return {
    value: input as T,
    cachedAt: Date.now(),
  };
}

function recordCacheMetric(metric: keyof typeof cacheMetrics) {
  cacheMetrics[metric] += 1;
}

function readTimedCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  return readTimedCacheState(cache, key).value;
}

function readTimedCacheState<T>(cache: Map<string, CacheEntry<T>>, key: string): CacheReadState<T> {
  const entry = cache.get(key);
  if (!entry) {
    recordCacheMetric('miss');
    return { value: null, stale: false };
  }

  const ageMs = Date.now() - entry.cachedAt;

  if (ageMs > DRILLDOWN_CACHE_TTL_MS) {
    cache.delete(key);
    recordCacheMetric('miss');
    return { value: null, stale: false };
  }

  const stale = ageMs > DRILLDOWN_CACHE_STALE_AFTER_MS;
  recordCacheMetric(stale ? 'staleHit' : 'hit');
  return {
    value: entry.value,
    stale,
  };
}

function writeTimedCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  cache.set(key, {
    value,
    cachedAt: Date.now(),
  });
}

export function getWorldSummaryCache(key: string) {
  return readTimedCache(worldSummaryCache, key);
}

export function getWorldSummaryCacheState(key: string) {
  return readTimedCacheState(worldSummaryCache, key);
}

export function setWorldSummaryCache(key: string, value: DashboardSummaryResponse) {
  writeTimedCache(worldSummaryCache, key, value);
}

export function getWorldTopRanksCache(key: string) {
  return readTimedCache(worldTopRanksCache, key);
}

export function getWorldTopRanksCacheState(key: string) {
  return readTimedCacheState(worldTopRanksCache, key);
}

export function setWorldTopRanksCache(key: string, value: DashboardTopRanksResponse) {
  writeTimedCache(worldTopRanksCache, key, value);
}

export function getWorldTopDestinationsCache(key: string) {
  return readTimedCache(worldTopDestinationsCache, key);
}

export function getWorldTopDestinationsCacheState(key: string) {
  return readTimedCacheState(worldTopDestinationsCache, key);
}

export function setWorldTopDestinationsCache(key: string, value: DashboardTopDestinationsResponse) {
  writeTimedCache(worldTopDestinationsCache, key, value);
}

const inFlightRequests = new Map<string, Promise<unknown>>();

export function runDrillDownRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const inFlight = inFlightRequests.get(key) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  const request = factory().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, request as Promise<unknown>);
  return request;
}

let cachedAirportCountries: AirportCountrySummary[] | null = null;

export function getCachedAirportCountries() {
  return cachedAirportCountries;
}

export function setCachedAirportCountries(countries: AirportCountrySummary[] | null) {
  cachedAirportCountries = countries;
}

type ContinentCacheSnapshot = {
  detail: Array<[string, CacheEntry<DashboardContinentDetailResponse> | DashboardContinentDetailResponse]>;
  seasonal: Array<[string, CacheEntry<DashboardContinentDetailResponse['seasonal']> | DashboardContinentDetailResponse['seasonal']]>;
  topRoutes: Array<[string, CacheEntry<DashboardContinentDetailResponse['topRoutes']> | DashboardContinentDetailResponse['topRoutes']]>;
};

const CONTINENT_CACHE_STORAGE_KEY = 'search-flight.drilldown.continent-cache.v2';

function readContinentCacheSnapshot(): ContinentCacheSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(CONTINENT_CACHE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ContinentCacheSnapshot>;
    return {
      detail: Array.isArray(parsed.detail) ? parsed.detail : [],
      seasonal: Array.isArray(parsed.seasonal) ? parsed.seasonal : [],
      topRoutes: Array.isArray(parsed.topRoutes) ? parsed.topRoutes : [],
    };
  } catch {
    return null;
  }
}

const persistedContinentCache = readContinentCacheSnapshot();

const continentDetailCache = new Map<string, CacheEntry<DashboardContinentDetailResponse>>(
  (persistedContinentCache?.detail ?? []).map(([key, value]) => [key, normalizeCacheEntry(value)]),
);

const continentSeasonalCache = new Map<
  string,
  CacheEntry<DashboardContinentDetailResponse['seasonal']>
>((persistedContinentCache?.seasonal ?? []).map(([key, value]) => [key, normalizeCacheEntry(value)]));

const continentTopRoutesCache = new Map<
  string,
  CacheEntry<DashboardContinentDetailResponse['topRoutes']>
>((persistedContinentCache?.topRoutes ?? []).map(([key, value]) => [key, normalizeCacheEntry(value)]));

function persistContinentCacheSnapshot() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const snapshot: ContinentCacheSnapshot = {
      detail: Array.from(continentDetailCache.entries()),
      seasonal: Array.from(continentSeasonalCache.entries()),
      topRoutes: Array.from(continentTopRoutesCache.entries()),
    };

    window.sessionStorage.setItem(CONTINENT_CACHE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage write failures and keep the in-memory cache usable.
  }
}

export function getContinentDetailCache(cacheKey: string) {
  const cached = readTimedCache(continentDetailCache, cacheKey);
  if (!cached) {
    persistContinentCacheSnapshot();
  }
  return cached;
}

export function getContinentDetailCacheState(cacheKey: string) {
  const state = readTimedCacheState(continentDetailCache, cacheKey);
  if (!state.value) {
    persistContinentCacheSnapshot();
  }
  return state;
}

export function storeContinentDetail(cacheKey: string, payload: DashboardContinentDetailResponse) {
  writeTimedCache(continentDetailCache, cacheKey, payload);
  persistContinentCacheSnapshot();
}

export function getContinentSeasonalCache(cacheKey: string) {
  const cached = readTimedCache(continentSeasonalCache, cacheKey);
  if (!cached) {
    persistContinentCacheSnapshot();
  }
  return cached;
}

export function getContinentSeasonalCacheState(cacheKey: string) {
  const state = readTimedCacheState(continentSeasonalCache, cacheKey);
  if (!state.value) {
    persistContinentCacheSnapshot();
  }
  return state;
}

export function storeContinentSeasonal(
  cacheKey: string,
  seasonal: DashboardContinentDetailResponse['seasonal'],
) {
  writeTimedCache(continentSeasonalCache, cacheKey, seasonal);
  persistContinentCacheSnapshot();
}

export function getContinentTopRoutesCache(cacheKey: string) {
  const cached = readTimedCache(continentTopRoutesCache, cacheKey);
  if (!cached) {
    persistContinentCacheSnapshot();
  }
  return cached;
}

export function getContinentTopRoutesCacheState(cacheKey: string) {
  const state = readTimedCacheState(continentTopRoutesCache, cacheKey);
  if (!state.value) {
    persistContinentCacheSnapshot();
  }
  return state;
}

export function storeContinentTopRoutes(
  cacheKey: string,
  topRoutes: DashboardContinentDetailResponse['topRoutes'],
) {
  writeTimedCache(continentTopRoutesCache, cacheKey, topRoutes);
  persistContinentCacheSnapshot();
}

export function getDrillDownCacheMetrics() {
  return {
    ...cacheMetrics,
  };
}
