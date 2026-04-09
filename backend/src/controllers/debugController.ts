import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { debugGetContinentMapping } from '../utils/continentMapper';
import { refreshDashboardQueryCacheSnapshot } from './statisticsController';

type AirportRow = {
  code: string;
  name: string;
  city: string | null;
  country_code: string | null;
  country_name: string | null;
  country: string | null;
};

/**
 * Debug: Get continent mapping for a country
 * GET /api/debug/continent-map?countryName=Thailand
 * GET /api/debug/continent-map?countryCode=TH
 */
export async function debugGetContinentMap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { countryName, countryCode } = req.query;

    if (!countryName && !countryCode) {
      res.status(400).json({
        error: 'Missing parameters',
        message: 'Either countryName or countryCode is required',
      });
      return;
    }

    const debug = debugGetContinentMapping(
      typeof countryCode === 'string' ? countryCode : undefined,
      typeof countryName === 'string' ? countryName : undefined,
    );

    const normalizedCountryName = typeof countryName === 'string' ? countryName.trim() : '';
    const normalizedCountryCode = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';

    const airportsResult = await pool.query<AirportRow>(
      `
        SELECT
          code,
          name,
          city,
          country_code,
          country_name,
          country
        FROM airports
        WHERE
          ($1 <> '' AND UPPER(TRIM(country_code)) = $1)
          OR
          ($2 <> '' AND LOWER(TRIM(COALESCE(country_name, country, ''))) = LOWER($2))
        ORDER BY code ASC
      `,
      [normalizedCountryCode, normalizedCountryName],
    );

    const airports = airportsResult.rows.map((row) => ({
      code: row.code,
      name: row.name,
      city: row.city,
    }));

    res.json({
      ...debug,
      airports,
      airportCount: airports.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Debug: Force refresh dashboard JSON cache snapshot
 * POST /api/debug/dashboard-cache/refresh?mode=override&clear=true&preloadPreset=false
 */
export async function debugRefreshDashboardCache(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const clearRaw = typeof req.query.clear === 'string' ? req.query.clear.toLowerCase() : 'true';
    const clearFirst = clearRaw !== 'false';
    const cacheModeRaw = typeof req.query.mode === 'string' ? req.query.mode.toLowerCase() : '';
    const cacheMode = cacheModeRaw === 'append' || cacheModeRaw === 'override' ? cacheModeRaw : undefined;
    const presetRaw = typeof req.query.preset === 'string' ? req.query.preset : 'focus';
    const preset = (['all', 'focus', '7', '30', '90', '180', '365'] as const).includes(presetRaw as any)
      ? (presetRaw as 'all' | 'focus' | '7' | '30' | '90' | '180' | '365')
      : 'focus';
    const fullPreloadRaw = typeof req.query.fullPreload === 'string' ? req.query.fullPreload.toLowerCase() : 'false';
    const fullPreload = fullPreloadRaw === 'true';
    const envDefaultPresetPreload = process.env.DASHBOARD_CACHE_REFRESH_PRELOAD_PRESET?.toLowerCase() !== 'false';
    const preloadPresetRaw = typeof req.query.preloadPreset === 'string'
      ? req.query.preloadPreset.toLowerCase()
      : (envDefaultPresetPreload ? 'true' : 'false');
    const preloadPresetData = preloadPresetRaw !== 'false';
    const preloadCountryOverviewRaw = typeof req.query.preloadCountryOverview === 'string'
      ? req.query.preloadCountryOverview.toLowerCase()
      : 'true';
    const preloadCountryOverview = preloadCountryOverviewRaw !== 'false';
    const countryBatchSizeRaw = typeof req.query.countryBatchSize === 'string'
      ? Number.parseInt(req.query.countryBatchSize, 10)
      : undefined;
    const maxCountryRssMbRaw = typeof req.query.maxCountryRssMb === 'string'
      ? Number.parseInt(req.query.maxCountryRssMb, 10)
      : undefined;

    console.log(
      `[dashboard-preload] debug refresh requested; mode=${cacheMode ?? 'auto'}; clear=${clearFirst}; preset=${preset}; fullPreload=${fullPreload}; preloadPreset=${preloadPresetData}; preloadCountry=${preloadCountryOverview}; countryBatchSize=${countryBatchSizeRaw ?? 'default'}; maxCountryRssMb=${maxCountryRssMbRaw ?? 'default'}`
    );

    const result = await refreshDashboardQueryCacheSnapshot({
      clearFirst,
      cacheMode,
      preset,
      fullPreload,
      preloadPresetData,
      preloadCountryOverview,
      countryBatchSize: Number.isFinite(countryBatchSizeRaw as number) ? countryBatchSizeRaw : undefined,
      maxCountryRssMb: Number.isFinite(maxCountryRssMbRaw as number) ? maxCountryRssMbRaw : undefined,
    });

    res.json({
      success: true,
      message: 'Dashboard JSON cache snapshot refreshed',
      ...result,
    });

    console.log(
      `[dashboard-preload] debug refresh completed; queryCacheEntries=${result.queryCache.cacheEntries}; preloadAttempted=${result.preload.attempted}; preloadFailed=${result.preload.failed}; countryAttempted=${result.countryPreload.attempted}; countryFailed=${result.countryPreload.failed}`
    );
  } catch (error) {
    next(error);
  }
}
