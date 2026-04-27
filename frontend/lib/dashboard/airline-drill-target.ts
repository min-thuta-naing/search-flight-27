'use client';

import { getAirportOverview } from '@/lib/dashboard/services/drilldown';
import { runDrillDownRequest } from '@/lib/dashboard/drill-down-cache';
import type { AirportInfo } from '@/types/dashboard';

export type AirlineDrillTarget = {
  airport: AirportInfo;
  airline: {
    id: number;
    name: string;
  };
};

export async function getTopAirlineDrillTarget(
  airport: AirportInfo,
  windowDays: number,
): Promise<AirlineDrillTarget | null> {
  const cacheKey = `airline-drill-target:v1:${airport.iata}:window:${windowDays}`;
  const payload = await runDrillDownRequest(cacheKey, () =>
    getAirportOverview(airport.iata, { windowDays })
  );

  if (!payload.topAirline?.id) {
    return null;
  }

  return {
    airport,
    airline: {
      id: payload.topAirline.id,
      name: payload.topAirline.name,
    },
  };
}
