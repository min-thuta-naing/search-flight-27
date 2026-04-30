'use client';

import { useEffect, useRef, useState } from 'react';
import { getDashboardCacheStatus } from '@/lib/dashboard/services/drilldown';

export type PreloadState = 'idle' | 'running' | 'ready' | 'failed';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const POLL_INTERVAL_MS = 3000;
const OVERALL_TIMEOUT_MS = 180_000;

async function pingBackendHealth() {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    console.debug('[useWorldPreloadGate] backend health', {
      status: response.status,
      ok: response.ok,
    });
  } catch (error) {
    console.warn('[useWorldPreloadGate] backend health ping failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Gates the WorldView until the backend preload is complete.
 *
 * Only the explicit `completed` phase is treated as ready.
 * `inFlightEntries <= 0` is NOT used because the backend clears in-flight
 * entries between batch phases, causing false-positive "ready" states.
 *
 * Transient status fetch errors are swallowed and retried within the overall
 * timeout window, matching the resilient behaviour of usePreloadStatus.
 *
 * Returns `{ presetPreloadState, gateStartedAtMs }`.
 * `gateStartedAtMs` is the epoch ms when polling began — used by WorldView to
 * implement the bypass fallback after PRELOAD_GATE_MAX_WAIT_MS.
 */
export function useWorldPreloadGate(enabled: boolean) {
  const [presetPreloadState, setPresetPreloadState] = useState<PreloadState>('idle');
  const gateStartedAtMsRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;

    let alive = true;
    gateStartedAtMsRef.current = Date.now();
    setPresetPreloadState('running');

    const wait = (ms: number) =>
      new Promise<void>((resolve) => { window.setTimeout(resolve, ms); });

    const waitForReady = async () => {
      await pingBackendHealth();

      const timeoutAt = Date.now() + OVERALL_TIMEOUT_MS;
      while (alive && Date.now() < timeoutAt) {
        try {
          const status = await getDashboardCacheStatus();
          console.debug('[useWorldPreloadGate] preload status', {
            phase: status.preload.phase,
            inFlightEntries: status.queryCache.inFlightEntries,
            cacheEntries: status.queryCache.cacheEntries,
          });

          if (status.preload.phase === 'failed') {
            if (alive) setPresetPreloadState('failed');
            return;
          }

          // Only trust the explicit 'completed' phase.
          // inFlightEntries can drop to 0 between batches and would cause
          // a premature unlock before preload truly finishes.
          if (status.preload.phase === 'completed') {
            if (alive) setPresetPreloadState('ready');
            return;
          }
        } catch (error) {
          console.warn('[useWorldPreloadGate] polling error, retrying', {
            message: error instanceof Error ? error.message : String(error),
          });
          // transient — keep retrying until timeout
        }

        await wait(POLL_INTERVAL_MS);
      }

      if (alive) setPresetPreloadState('failed');
    };

    void waitForReady();

    return () => {
      alive = false;
    };
  }, [enabled]);

  return { presetPreloadState, gateStartedAtMsRef };
}
