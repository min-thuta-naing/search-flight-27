/**
 * Scheduled Jobs Service
 * รันงานอัตโนมัติตามเวลาที่กำหนด
 */

import * as cron from 'node-cron';
import { refreshDashboardQueryCacheSnapshot } from '../controllers/statisticsController';

type DashboardPreloadPreset = 'all' | 'focus' | '7' | '30' | '90' | '180' | '365';
type CacheMode = 'append' | 'override';

const PRESET_VALUES: DashboardPreloadPreset[] = ['all', 'focus', '7', '30', '90', '180', '365'];

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (typeof value !== 'string') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
}

function parsePresetEnv(value: string | undefined, defaultValue: DashboardPreloadPreset): DashboardPreloadPreset {
  if (!value) return defaultValue;
  const normalized = value.trim() as DashboardPreloadPreset;
  return PRESET_VALUES.includes(normalized) ? normalized : defaultValue;
}

function parsePositiveIntEnv(value: string | undefined, defaultValue: number): number {
  if (typeof value !== 'string') return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue;
  return Math.floor(parsed);
}

function parseCacheModeEnv(value: string | undefined, defaultValue: CacheMode): CacheMode {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === 'append' || normalized === 'override' ? normalized : defaultValue;
}

export class SchedulerService {
  private jobs: cron.ScheduledTask[] = [];
  private dashboardRefreshRunning = false;
  private dashboardRefreshLastRunAt: string | null = null;
  private dashboardRefreshLastResult: { success: boolean; attempted: number; failed: number; message: string } | null = null;

  private async runDashboardRefreshJob(): Promise<void> {
    if (this.dashboardRefreshRunning) {
      console.log('[dashboard-refresh-cron] skipped because another refresh is running');
      return;
    }

    this.dashboardRefreshRunning = true;
    const startedAt = new Date().toISOString();

    const preset = parsePresetEnv(process.env.DASHBOARD_CACHE_REFRESH_PRESET, 'focus');
    const clearFirst = parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_CLEAR_FIRST, true);
    const fullPreload = parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_FULL_PRELOAD, false);
    const preloadPresetData = parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_PRELOAD_PRESET, true);
    const cacheMode = parseCacheModeEnv(process.env.DASHBOARD_CACHE_REFRESH_MODE, 'override');
    const preloadCountryOverview = parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_PRELOAD_COUNTRY_OVERVIEW, true);
    const countryBatchSize = parsePositiveIntEnv(process.env.DASHBOARD_CACHE_REFRESH_COUNTRY_BATCH_SIZE, 15);
    const maxCountryRssMb = parsePositiveIntEnv(process.env.DASHBOARD_CACHE_REFRESH_MAX_RSS_MB, 2048);

    console.log(
      `[dashboard-refresh-cron] start at ${startedAt}; preset=${preset}; mode=${cacheMode}; clearFirst=${clearFirst}; fullPreload=${fullPreload}; preloadPresetData=${preloadPresetData}; preloadCountryOverview=${preloadCountryOverview}; countryBatchSize=${countryBatchSize}; maxCountryRssMb=${maxCountryRssMb}`
    );

    try {
      const result = await refreshDashboardQueryCacheSnapshot({
        clearFirst,
        cacheMode,
        preset,
        fullPreload,
        preloadPresetData,
        preloadCountryOverview,
        countryBatchSize,
        maxCountryRssMb,
      });

      this.dashboardRefreshLastRunAt = new Date().toISOString();
      this.dashboardRefreshLastResult = {
        success: true,
        attempted: result.preload.attempted,
        failed: result.preload.failed,
        message: 'Dashboard cache refresh completed',
      };

      console.log(
        `[dashboard-refresh-cron] done; attempted=${result.preload.attempted}; failed=${result.preload.failed}; cacheEntries=${result.queryCache.cacheEntries}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.dashboardRefreshLastRunAt = new Date().toISOString();
      this.dashboardRefreshLastResult = {
        success: false,
        attempted: 0,
        failed: 0,
        message,
      };
      console.warn(`[dashboard-refresh-cron] failed: ${message}`);
    } finally {
      this.dashboardRefreshRunning = false;
    }
  }

  getDashboardRefreshStatus() {
    return {
      running: this.dashboardRefreshRunning,
      lastRunAt: this.dashboardRefreshLastRunAt,
      lastResult: this.dashboardRefreshLastResult,
      cron: process.env.DASHBOARD_CACHE_REFRESH_CRON || '0 4 * * *',
      timezone: process.env.DASHBOARD_CACHE_REFRESH_TIMEZONE || 'UTC',
      preset: parsePresetEnv(process.env.DASHBOARD_CACHE_REFRESH_PRESET, 'focus'),
      cacheMode: parseCacheModeEnv(process.env.DASHBOARD_CACHE_REFRESH_MODE, 'override'),
      clearFirst: parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_CLEAR_FIRST, true),
      fullPreload: parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_FULL_PRELOAD, false),
      preloadPresetData: parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_PRELOAD_PRESET, true),
      preloadCountryOverview: parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_PRELOAD_COUNTRY_OVERVIEW, true),
      countryBatchSize: parsePositiveIntEnv(process.env.DASHBOARD_CACHE_REFRESH_COUNTRY_BATCH_SIZE, 15),
      maxCountryRssMb: parsePositiveIntEnv(process.env.DASHBOARD_CACHE_REFRESH_MAX_RSS_MB, 2048),
    };
  }

  async runDashboardRefreshNow(): Promise<void> {
    await this.runDashboardRefreshJob();
  }

  /**
   * เริ่ม Scheduled Jobs ทั้งหมด
   */
  startAll(): void {
    console.log('\n📅 Starting scheduled jobs...');
    console.log('='.repeat(60));

    const refreshCron = process.env.DASHBOARD_CACHE_REFRESH_CRON || '0 4 * * *';
    const timezone = process.env.DASHBOARD_CACHE_REFRESH_TIMEZONE || 'UTC';

    if (!cron.validate(refreshCron)) {
      console.warn(`[dashboard-refresh-cron] invalid cron expression: ${refreshCron}`);
    } else {
      const refreshJob = cron.schedule(
        refreshCron,
        () => {
          void this.runDashboardRefreshJob();
        },
        { timezone }
      );
      this.jobs.push(refreshJob);
      console.log(`[dashboard-refresh-cron] enabled: cron="${refreshCron}" timezone="${timezone}"`);

      if (parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_RUN_ON_START, false)) {
        console.log('[dashboard-refresh-cron] run on start enabled');
        void this.runDashboardRefreshJob();
      }
    }

    console.log('='.repeat(60));
    console.log(`✅ Started scheduled jobs\n`);
  }

  /**
   * หยุด Scheduled Jobs ทั้งหมด
   */
  stopAll(): void {
    console.log('🛑 Stopping scheduled jobs...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('✅ All scheduled jobs stopped');
  }
}

export const schedulerService = new SchedulerService();

