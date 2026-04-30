'use client';

import { useEffect, useRef, useState } from 'react';
import { getDashboardCacheStatus, type DashboardCacheStatusResponse } from '@/lib/dashboard/services/drilldown';

const POLL_INTERVAL_MS = 3000;
// After this many consecutive network/timeout errors the hook gives up and surfaces a failure.
// Each retry is 3 s, so 10 × 3 s = 30 s of transient failures before declaring permanent error.
const MAX_CONSECUTIVE_ERRORS = 10;

/**
 * Polls /dashboard-cache/status while the backend preload phase is 'running'.
 * Transient fetch errors are retried (up to MAX_CONSECUTIVE_ERRORS) so a single
 * network hiccup does not permanently lock the dashboard.
 */
export function usePreloadStatus() {
  const [cacheStatus, setCacheStatus] = useState<DashboardCacheStatusResponse | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const consecutiveErrorsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      if (!cancelled) {
        timeoutId = setTimeout(pollStatus, POLL_INTERVAL_MS);
      }
    };

    const pollStatus = async () => {
      try {
        const status = await getDashboardCacheStatus();
        if (cancelled) return;

        consecutiveErrorsRef.current = 0;
        setCacheStatus(status);

        if (status.preload.phase === 'failed' && status.preload.error) {
          setBootstrapError(status.preload.error);
        } else {
          setBootstrapError(null);
        }

        // 'idle'  → backend warmup hasn't started yet (async after server listen). Keep polling.
        // 'running' → actively in progress. Keep polling.
        // 'completed' / 'failed' → terminal. Stop.
        if (status.preload.phase === 'completed' || status.preload.phase === 'failed') return;
      } catch (error) {
        if (cancelled) return;

        consecutiveErrorsRef.current++;

        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          setBootstrapError(
            error instanceof Error ? error.message : 'Failed to load dashboard preload status',
          );
          return; // permanent stop after too many consecutive failures
        }

        // Transient error — keep retrying
        console.warn('[usePreloadStatus] transient error, retrying', {
          attempt: consecutiveErrorsRef.current,
          message: error instanceof Error ? error.message : String(error),
        });
      }

      scheduleNext();
    };

    void pollStatus();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return { cacheStatus, bootstrapError };
}
