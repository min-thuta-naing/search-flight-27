import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { serverConfig } from './config/server';
import { initializeTimescaleDB } from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { queryMonitoringMiddleware } from './middleware/queryMonitoringMiddleware';
import { schedulerService } from './preload/scheduler';
import { schedulerService as botSchedulerService } from './services/schedulerService';
import {
  isTodayPresetCached,
  markDashboardPreloadAsCompleted,
  warmDashboardCachesOnStartup,
} from './controllers/statisticsController';

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (typeof value !== 'string') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
}

function parsePositiveIntEnv(value: string | undefined, defaultValue: number): number {
  if (typeof value !== 'string') return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue;
  return Math.floor(parsed);
}

function parseCacheMode(value: string | undefined): 'append' | 'override' {
  return value?.trim().toLowerCase() === 'append' ? 'append' : 'override';
}

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: serverConfig.corsOrigin,
    credentials: true,
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// More lenient rate limit for statistics endpoint (read-only, less critical)
// Apply this FIRST before the general limiter so it takes precedence
const statisticsLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: serverConfig.nodeEnv === 'production' ? 100 : 200, // More lenient in development
  message: 'Too many statistics requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply statistics limiter FIRST (more specific routes should come first)
app.use('/api/statistics', statisticsLimiter);

// General rate limiting for all other API routes
const limiter = rateLimit({
  windowMs: serverConfig.rateLimit.windowMs,
  max: serverConfig.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
});

// Apply general rate limit to all API routes (after the specific one)
app.use('/api/', limiter);

// Performance monitoring — log every request duration, warn on slow ones
app.use(queryMonitoringMiddleware);

// Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer(): Promise<void> {
  try {
    // Initialize TimescaleDB
    await initializeTimescaleDB();

    // Start listening
    app.listen(serverConfig.port, () => {
      console.log(`
🚀 Server is running!
📍 Environment: ${serverConfig.nodeEnv}
🌐 Server: http://localhost:${serverConfig.port}
📡 API: http://localhost:${serverConfig.port}/api
❤️  Health: http://localhost:${serverConfig.port}/api/health
      `);

      const shouldWarmOnStartup = parseBooleanEnv(
        process.env.DASHBOARD_PRELOAD_ON_STARTUP,
        serverConfig.nodeEnv === 'production',
      );

      if (shouldWarmOnStartup) {
        void (async () => {
          // Check if TODAY's '30' preset key is already cached.
          // Old freshness check (hasFreshEntries) was wrong: yesterday's entries are still
          // within TTL but have different start_date/end_date keys, so they never match
          // today's requests. This check is date-aware and only skips when truly up-to-date.
          if (isTodayPresetCached()) {
            console.log('[dashboard-preload] startup warmup skipped; today\'s 30-day preset already cached');
            markDashboardPreloadAsCompleted();
            return;
          }

          // Warm dashboard caches in background after server becomes reachable.
          await warmDashboardCachesOnStartup({
            preloadPresetData: parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_PRELOAD_PRESET, true),
            preloadCountryOverview: parseBooleanEnv(process.env.DASHBOARD_CACHE_REFRESH_PRELOAD_COUNTRY_OVERVIEW, true),
            countryBatchSize: parsePositiveIntEnv(process.env.DASHBOARD_CACHE_REFRESH_COUNTRY_BATCH_SIZE, 15),
            maxCountryRssMb: parsePositiveIntEnv(process.env.DASHBOARD_CACHE_REFRESH_MAX_RSS_MB, 2048),
            cacheMode: parseCacheMode(process.env.DASHBOARD_CACHE_REFRESH_MODE),
          });
        })()
          .then(() => {
            console.log('[dashboard-preload] startup preload check completed');
          })
          .catch((error) => {
            console.warn('[dashboard-preload] failed:', error instanceof Error ? error.message : String(error));
          });
      } else {
        console.log('[dashboard-preload] startup warmup disabled (set DASHBOARD_PRELOAD_ON_STARTUP=true to enable)');
      }
    });

    // ✅ เริ่ม Scheduled Jobs (ถ้าเปิดใช้งาน)
    if (process.env.ENABLE_SCHEDULED_JOBS === 'true') {
      schedulerService.startAll();
      botSchedulerService.startAll();
    } else {
      console.log('⚠️  Scheduled jobs are disabled (set ENABLE_SCHEDULED_JOBS=true in .env to enable)');
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

  startServer();

export default app;

