import type { NextFunction, Request, Response } from 'express';

const SLOW_QUERY_THRESHOLD_MS = 500;
const WARN_QUERY_THRESHOLD_MS = 200;

export function queryMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startMs = Date.now();
  const { method, path: reqPath } = req;

  res.on('finish', () => {
    const durationMs = Date.now() - startMs;
    const { statusCode } = res;

    const logEntry = {
      event: 'request',
      method,
      path: reqPath,
      statusCode,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
      console.warn(JSON.stringify({ ...logEntry, level: 'SLOW', threshold: SLOW_QUERY_THRESHOLD_MS }));
    } else if (durationMs >= WARN_QUERY_THRESHOLD_MS) {
      console.warn(JSON.stringify({ ...logEntry, level: 'WARN', threshold: WARN_QUERY_THRESHOLD_MS }));
    } else {
      console.log(JSON.stringify({ ...logEntry, level: 'INFO' }));
    }
  });

  next();
}

export function logCacheHit(endpoint: string, key: string): void {
  console.log(JSON.stringify({ event: 'cache_hit', endpoint, key, timestamp: new Date().toISOString() }));
}

export function logCacheMiss(endpoint: string, key: string): void {
  console.log(JSON.stringify({ event: 'cache_miss', endpoint, key, timestamp: new Date().toISOString() }));
}

export function logSlowQuery(query: string, durationMs: number, params?: unknown[]): void {
  if (durationMs >= WARN_QUERY_THRESHOLD_MS) {
    const level = durationMs >= SLOW_QUERY_THRESHOLD_MS ? 'SLOW' : 'WARN';
    console.warn(
      JSON.stringify({
        event: 'slow_query',
        level,
        durationMs,
        query: query.slice(0, 200),
        params,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
