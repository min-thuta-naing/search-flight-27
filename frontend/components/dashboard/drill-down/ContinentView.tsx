'use client';

import { useEffect, useState } from 'react';
import { addDays, subDays } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  getContinentDetailCacheState,
  getContinentTrendsCacheState,
  getContinentTopAirportsCacheState,
  getContinentTopRouteRanksCacheState,
  storeContinentDetail,
  storeContinentTrends,
  storeContinentTopAirports,
  storeContinentTopRouteRanks,
  runDrillDownRequest,
} from '@/lib/dashboard/drill-down-cache';
import {
  CONTINENTS,
  getChangeForMode,
  growthDeltaTypeFromPct,
  growthTextClass,
  parseFirstSignedPercent,
  parsePercentFromDelta,
} from '@/lib/dashboard/drill-down-data';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import { getContinentDetail, getContinentTopAirports, getContinentTopRoutes, getContinentTrends, getDashboardDateBounds, type DashboardDateBoundsResponse } from '@/lib/dashboard/services/drilldown';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDrillDown, KPIRow, BackButton, ChangePill } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import type { RangePreset } from './DrillDownDashboard';
import type { CountryData } from '@/types/dashboard';
import type {
  DashboardContinentTrendMode,
  DashboardContinentTrendsResponse,
  DashboardContinentTopAirportRankResponse,
  DashboardContinentTopRouteRankResponse,
} from '@/lib/api/statistics-api';

type ContinentDetailPayload = Awaited<ReturnType<typeof getContinentDetail>>;
type ContinentTrendsPayload = Awaited<ReturnType<typeof getContinentTrends>>;
type ContinentTopAirportsPayload = Awaited<ReturnType<typeof getContinentTopAirports>>;
type ContinentTopRoutesPayload = Awaited<ReturnType<typeof getContinentTopRoutes>>;
type ContinentDisplayMode = 'wow' | 'mom' | 'yoy';
type ContinentTopAirportRow = DashboardContinentTopAirportRankResponse;
type ContinentTopRouteRow = DashboardContinentTopRouteRankResponse;

const CONTINENT_PRESET_LABELS: Record<RangePreset, string> = {
  focus: '± 15 วัน',
  '7': '7 วัน',
  '30': '30 วัน',
  all: 'ทั้งหมด',
  '90': 'ไตรมาสนี้',
  '180': '6 เดือน',
  '365': '1 ปี',
};

function resolveContinentWindowDays(preset: RangePreset) {
  if (preset === 'focus') return 30;
  if (preset === '7') return 7;
  if (preset === '30') return 30;
  if (preset === '90') return 90;
  if (preset === '180') return 180;
  if (preset === '365') return 365;
  return 3650;
}
function emojiFlagToCode(flag: string): string {
  // แปลง emoji ธงเป็น country code เช่น 🇹🇭 → "th"
  const codePoints = [...flag].map(char => char.codePointAt(0)! - 0x1F1E6);
  const countryCode = String.fromCharCode(
    codePoints[0] + 65,
    codePoints[1] + 65
  );
  return countryCode.toLowerCase();
}
function resolveContinentDisplayMode(preset: RangePreset): ContinentDisplayMode {
  if (preset === 'focus' || preset === '7') return 'wow';
  if (preset === '30' || preset === '90' || preset === '180') return 'mom';
  return 'yoy';
}

function buildContinentCacheKey(
  continentName: string,
  windowDays: number,
  includeCore: boolean,
  includeSeasonal: boolean,
  includeTopRoutes: boolean,
) {
  return [
    continentName,
    `window:${windowDays}`,
    `core:${includeCore ? 1 : 0}`,
    `seasonal:${includeSeasonal ? 1 : 0}`,
    `routes:${includeTopRoutes ? 1 : 0}`,
  ].join('|');
}

function parseContinentCountSummary(airportsText: string) {
  const airportMatch = airportsText.match(/([\d,]+)\s*สนามบิน/);
  const countryMatch = airportsText.match(/([\d,]+)\s*ประเทศ/);

  return {
    airportCount: airportMatch ? Number(airportMatch[1].replace(/,/g, '')) || 0 : 0,
    countryCount: countryMatch ? Number(countryMatch[1].replace(/,/g, '')) || 0 : 0,
  };
}

function parseIsoDateInput(dateInput?: string | null) {
  if (!dateInput) return null;
  const parsed = new Date(`${dateInput.split('T')[0]}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildContinentRangeCacheKey(
  continentName: string,
  startDate: string,
  endDate: string,
  includeCore: boolean,
  includeSeasonal: boolean,
  includeTopRoutes: boolean,
) {
  return [
    continentName,
    `range:${startDate}__${endDate}`,
    `core:${includeCore ? 1 : 0}`,
    `seasonal:${includeSeasonal ? 1 : 0}`,
    `routes:${includeTopRoutes ? 1 : 0}`,
  ].join('|');
}

function buildWorldLikePresetRange(
  mode: RangePreset,
  baseDate = new Date(),
  bounds?: Pick<DashboardDateBoundsResponse, 'minDate' | 'recommendedEndDate'> | null,
) {
  if (mode === 'focus') {
    return { from: subDays(baseDate, 15), to: addDays(baseDate, 15) };
  }

  if (mode === '7') {
    return { from: baseDate, to: addDays(baseDate, 6) };
  }

  if (mode === '30') {
    return { from: baseDate, to: addDays(baseDate, 29) };
  }

  if (mode === '90') {
    return { from: baseDate, to: addDays(baseDate, 89) };
  }

  if (mode === '180') {
    return { from: baseDate, to: addDays(baseDate, 179) };
  }

  if (mode === '365') {
    return { from: baseDate, to: addDays(baseDate, 364) };
  }

  const minDate = parseIsoDateInput(bounds?.minDate || null);
  const recommendedEndDate = parseIsoDateInput(bounds?.recommendedEndDate || null);

  if (!minDate || !recommendedEndDate) {
    return null;
  }

  return { from: minDate, to: recommendedEndDate };
}

/** Match KPI ref to grid row, or minimal row so drill-down always works for any continent. */
function resolveCountryRow(ref: { flag: string; nameTh: string }, countries: CountryData[]): CountryData {
  const found = countries.find((c) => c.name === ref.nameTh || c.flag === ref.flag);
  if (found) return found;
  return {
    flag: ref.flag,
    name: ref.nameTh,
    airports: 0,
    flights: 0,
    delta: '\u2014',
    deltaN: 0,
    bar: 0,
  };
}

function ContinentPresetBar({
  preset,
  onSelect,
}: {
  preset: RangePreset;
  onSelect: (preset: RangePreset) => void;
}) {
  return (
    <div className="flex min-h-[52px] max-w-full min-w-0 flex-wrap content-start items-end gap-2.5 border-b border-border/70 pb-1">
      <Button
        type="button"
        variant={preset === 'focus' ? 'default' : 'outline'}
        size="sm"
        className="h-9 px-3.5 text-xs sm:text-sm"
        onClick={() => onSelect('focus')}
      >
        ± 15 วัน
      </Button>
      <Button
        type="button"
        variant={preset === '7' ? 'default' : 'outline'}
        size="sm"
        className="h-9 px-3.5 text-xs sm:text-sm"
        onClick={() => onSelect('7')}
      >
        7 วัน
      </Button>
      <Button
        type="button"
        variant={preset === '30' ? 'default' : 'outline'}
        size="sm"
        className="h-9 px-3.5 text-xs sm:text-sm"
        onClick={() => onSelect('30')}
      >
        30 วัน
      </Button>
      <Button
        type="button"
        variant={preset === 'all' ? 'default' : 'outline'}
        size="sm"
        className="h-9 px-3.5 text-xs sm:text-sm"
        onClick={() => onSelect('all')}
      >
        ทั้งหมด
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={preset === '90' || preset === '180' || preset === '365' ? 'default' : 'outline'}
            size="sm"
            className="h-9 px-3.5 text-xs sm:text-sm"
          >
            {preset === '90' ? 'ไตรมาสนี้' : preset === '180' ? '6 เดือน' : preset === '365' ? '1 ปี' : 'รอบเดือน'}
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant={preset === '90' ? 'default' : 'ghost'}
              size="sm"
              className="justify-start"
              onClick={() => onSelect('90')}
            >
              ไตรมาสนี้
            </Button>
            <Button
              type="button"
              variant={preset === '180' ? 'default' : 'ghost'}
              size="sm"
              className="justify-start"
              onClick={() => onSelect('180')}
            >
              6 เดือน
            </Button>
            <Button
              type="button"
              variant={preset === '365' ? 'default' : 'ghost'}
              size="sm"
              className="justify-start"
              onClick={() => onSelect('365')}
            >
              1 ปี
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ContinentView() {
  const { drillTo, selections, rangePreset, setRangePreset } = useDrillDown();
  const [search, setSearch] = useState('');
  const continent = selections.continent || CONTINENTS[0];
  const [dashboardDateBounds, setDashboardDateBounds] = useState<DashboardDateBoundsResponse | null>(null);
  const preset = rangePreset;
  const presetRange = buildWorldLikePresetRange(preset, new Date(), dashboardDateBounds);
  const startDate = presetRange?.from ? formatLocalDateInput(presetRange.from) : null;
  const endDate = presetRange?.to ? formatLocalDateInput(presetRange.to) : null;
  const hasExplicitRange = Boolean(startDate && endDate);
  const continentWindowDays = resolveContinentWindowDays(preset);
  const continentTimeMode = resolveContinentDisplayMode(preset);
  const coreCacheKey = hasExplicitRange && startDate && endDate
    ? buildContinentRangeCacheKey(continent.name, startDate, endDate, true, false, false)
    : buildContinentCacheKey(continent.name, continentWindowDays, true, false, false);
  const trendCacheKey = `trend:${continent.name}`;
  const [continentPayload, setContinentPayload] = useState<ContinentDetailPayload | null>(() => {
    return getContinentDetailCacheState(coreCacheKey).value;
  });
  const [payloadCacheKey, setPayloadCacheKey] = useState<string | null>(() => {
    return getContinentDetailCacheState(coreCacheKey).value ? coreCacheKey : null;
  });
  const [trendPayload, setTrendPayload] = useState<ContinentTrendsPayload | null>(() => {
    return getContinentTrendsCacheState(trendCacheKey).value;
  });
  const [trendCacheHitKey, setTrendCacheHitKey] = useState<string | null>(() => {
    return getContinentTrendsCacheState(trendCacheKey).value ? trendCacheKey : null;
  });
  const topAirportsQueryKey = hasExplicitRange && startDate && endDate
    ? `${continent.name}|range:${startDate}__${endDate}|limit:10`
    : `${continent.name}|window:${continentWindowDays}|limit:10`;
  const topRoutesRankQueryKey = hasExplicitRange && startDate && endDate
    ? `${continent.name}|range:${startDate}__${endDate}|limit:5`
    : `${continent.name}|window:${continentWindowDays}|limit:5`;
  const [topAirportRows, setTopAirportRows] = useState<ContinentTopAirportRow[] | null>(() => {
    return getContinentTopAirportsCacheState(topAirportsQueryKey).value;
  });
  const [topAirportCacheHitKey, setTopAirportCacheHitKey] = useState<string | null>(() => {
    return getContinentTopAirportsCacheState(topAirportsQueryKey).value ? topAirportsQueryKey : null;
  });
  const [topRouteRankRows, setTopRouteRankRows] = useState<ContinentTopRouteRow[] | null>(() => {
    return getContinentTopRouteRanksCacheState(topRoutesRankQueryKey).value;
  });
  const [topRouteRankCacheHitKey, setTopRouteRankCacheHitKey] = useState<string | null>(() => {
    return getContinentTopRouteRanksCacheState(topRoutesRankQueryKey).value ? topRoutesRankQueryKey : null;
  });
  const [detailError, setDetailError] = useState<string | null>(null);
  const [trendsFailed, setTrendsFailed] = useState(false);
  const [topRoutesFailed, setTopRoutesFailed] = useState(false);
  const coreReady = continentPayload != null && payloadCacheKey === coreCacheKey;

  useEffect(() => {
    let alive = true;

    const loadBounds = async () => {
      try {
        const bounds = await runDrillDownRequest(
          'continent:date-bounds',
          () => getDashboardDateBounds(),
        );
        if (!alive) return;
        setDashboardDateBounds(bounds);
      } catch {
        if (!alive) return;
        setDashboardDateBounds(null);
      }
    };

    void loadBounds();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const cacheState = getContinentDetailCacheState(coreCacheKey);
    const cached = cacheState.value;

    if (cached) {
      setContinentPayload(cached);
      setPayloadCacheKey(coreCacheKey);
      setDetailError(null);
      if (!cacheState.stale) {
        return () => {
          alive = false;
        };
      }
    } else {
      setPayloadCacheKey(null);
    }

    const loadDetail = async () => {
      try {
        setDetailError(null);
        const payload = await runDrillDownRequest(
          `continent:core:${coreCacheKey}`,
          () => getContinentDetail(
            continent.name,
            hasExplicitRange && startDate && endDate
              ? {
                  startDate,
                  endDate,
                  includeCore: true,
                  includeSeasonal: false,
                  includeTopRoutes: false,
                }
              : {
                  windowDays: continentWindowDays,
                  includeCore: true,
                  includeSeasonal: false,
                  includeTopRoutes: false,
                },
          ),
        );
        if (!alive) return;
        storeContinentDetail(coreCacheKey, payload);
        setContinentPayload(payload);
        setPayloadCacheKey(coreCacheKey);
      } catch (error) {
        if (!alive) return;
        setDetailError(error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลทวีปได้');
      }
    };

    void loadDetail();

    return () => {
      alive = false;
    };
  }, [continent.name, continentWindowDays, coreCacheKey, hasExplicitRange, startDate, endDate]);

  useEffect(() => {
    let alive = true;
    const cacheState = getContinentTrendsCacheState(trendCacheKey);
    const cached = cacheState.value;

    if (cached) {
      setTrendPayload(cached);
      setTrendCacheHitKey(trendCacheKey);
      if (!cacheState.stale) {
        return () => {
          alive = false;
        };
      }
    } else {
      setTrendCacheHitKey(null);
    }

    setTrendsFailed(false);
    const loadTrends = async () => {
      try {
        const payload = await runDrillDownRequest(
          `continent:trends:${trendCacheKey}`,
          () => getContinentTrends(continent.name, {
            timeoutMs: 45000,
          }),
        );
        if (!alive) return;
        storeContinentTrends(trendCacheKey, payload);
        setTrendPayload(payload);
        setTrendCacheHitKey(trendCacheKey);
      } catch (error) {
        if (!alive) return;
        setTrendsFailed(true);
        setDetailError(error instanceof Error ? error.message : 'ไม่สามารถโหลดแนวโน้มทวีปได้');
      }
    };

    void loadTrends();

    return () => {
      alive = false;
    };
  }, [continent.name, trendCacheKey]);

  useEffect(() => {
    const cacheState = getContinentTopAirportsCacheState(topAirportsQueryKey);
    const cached = cacheState.value;
    if (cached) {
      setTopAirportRows(cached);
      setTopAirportCacheHitKey(topAirportsQueryKey);
    } else {
      setTopAirportCacheHitKey(null);
    }
  }, [topAirportsQueryKey]);

  useEffect(() => {
    const cacheState = getContinentTopRouteRanksCacheState(topRoutesRankQueryKey);
    const cached = cacheState.value;
    if (cached) {
      setTopRouteRankRows(cached);
      setTopRouteRankCacheHitKey(topRoutesRankQueryKey);
    } else {
      setTopRouteRankCacheHitKey(null);
    }
  }, [topRoutesRankQueryKey]);

  useEffect(() => {
    if (!coreReady) {
      return;
    }

    let alive = true;
    const cacheState = getContinentTopAirportsCacheState(topAirportsQueryKey);
    const cached = cacheState.value;

    if (cached) {
      setTopAirportRows(cached);
      setTopAirportCacheHitKey(topAirportsQueryKey);
      if (!cacheState.stale) {
        return () => {
          alive = false;
        };
      }
    } else {
      setTopAirportCacheHitKey(null);
    }

    const loadTopAirports = async () => {
      try {
        const payload: ContinentTopAirportsPayload = await runDrillDownRequest(
          `continent:top-airports:${topAirportsQueryKey}`,
          () => getContinentTopAirports(
            continent.name,
            hasExplicitRange && startDate && endDate
              ? {
                  startDate,
                  endDate,
                  limit: 10,
                  timeoutMs: 45000,
                }
              : {
                  windowDays: continentWindowDays,
                  limit: 10,
                  timeoutMs: 45000,
                },
          ),
        );
        if (!alive) return;
        const rows = payload.airports;
        storeContinentTopAirports(topAirportsQueryKey, rows);
        setTopAirportRows(rows);
        setTopAirportCacheHitKey(topAirportsQueryKey);
      } catch (error) {
        if (!alive) return;
        setTopAirportRows([]);
      }
    };

    void loadTopAirports();

    return () => {
      alive = false;
    };
  }, [continent.name, continentWindowDays, coreReady, topAirportsQueryKey, hasExplicitRange, startDate, endDate]);

  useEffect(() => {
    if (!coreReady) {
      return;
    }

    let alive = true;
    const cacheState = getContinentTopRouteRanksCacheState(topRoutesRankQueryKey);
    const cached = cacheState.value;

    if (cached) {
      setTopRouteRankRows(cached);
      setTopRouteRankCacheHitKey(topRoutesRankQueryKey);
      if (!cacheState.stale) {
        return () => {
          alive = false;
        };
      }
    } else {
      setTopRouteRankCacheHitKey(null);
    }

    setTopRoutesFailed(false);
    const loadTopRoutesRank = async () => {
      try {
        const payload: ContinentTopRoutesPayload = await runDrillDownRequest(
          `continent:top-routes:${topRoutesRankQueryKey}`,
          () => getContinentTopRoutes(
            continent.name,
            hasExplicitRange && startDate && endDate
              ? {
                  startDate,
                  endDate,
                  limit: 5,
                  timeoutMs: 45000,
                }
              : {
                  windowDays: continentWindowDays,
                  limit: 5,
                  timeoutMs: 45000,
                },
          ),
        );
        if (!alive) return;
        const rows = payload.routes;
        storeContinentTopRouteRanks(topRoutesRankQueryKey, rows);
        setTopRouteRankRows(rows);
        setTopRouteRankCacheHitKey(topRoutesRankQueryKey);
      } catch {
        if (!alive) return;
        setTopRouteRankRows([]);
        setTopRoutesFailed(true);
        setTopRouteRankCacheHitKey(topRoutesRankQueryKey);
      }
    };

    void loadTopRoutesRank();

    return () => {
      alive = false;
    };
  }, [continent.name, continentWindowDays, coreReady, topRoutesRankQueryKey, hasExplicitRange, startDate, endDate]);

  const payload = continentPayload;
  const hasPayload = coreReady;
  const continentData = hasPayload && payload ? payload.detail : null;
  const detail = continentData;
  const trends = trendCacheHitKey === trendCacheKey ? trendPayload : null;
  const resolvedTopAirportRows = topAirportCacheHitKey === topAirportsQueryKey && topAirportRows ? topAirportRows : [];
  const resolvedTopRouteRankRows = topRouteRankCacheHitKey === topRoutesRankQueryKey && topRouteRankRows ? topRouteRankRows : [];
  const countries = detail?.countries ?? [];
  const filteredCountries = search
    ? countries.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : countries;
  const totalFlightsValue = hasPayload && detail ? detail.totalFlights : continent.flights;
  const parsedCountSummary = parseContinentCountSummary(continent.airports);
  const airportCountFromSummary = parsedCountSummary.airportCount;
  const countryCountFromSummary = parsedCountSummary.countryCount;

  const topByFlights = countries.length
    ? [...countries].sort((a, b) => b.flights - a.flights)[0]
    : undefined;
  const topByAirports = countries.length
    ? [...countries].sort((a, b) => b.airports - a.airports)[0]
    : undefined;
  const busiestResolved = detail ? resolveCountryRow(detail.busiestCountry, countries) : undefined;
  const fastestResolved = detail ? resolveCountryRow(detail.fastestGrowing, countries) : undefined;

  /** Avoid two identical drill targets when the same country leads flights and airport count. */
  const airportsCardSameAsFlightsCard =
    !!topByFlights &&
    !!topByAirports &&
    topByFlights.name === topByAirports.name;

  const continentGrowthTone = hasPayload && detail
    ? growthDeltaTypeFromPct(detail.totalDeltaPercent, continentTimeMode)
    : growthDeltaTypeFromPct(getChangeForMode(continent, continentTimeMode).pct, continentTimeMode);
  const busiestPct = detail ? parseFirstSignedPercent(detail.busiestDelta) : null;
  const fastestPct = detail ? parseFirstSignedPercent(detail.fastestDelta) : null;
  const busiestKpiTone =
    busiestPct != null ? growthDeltaTypeFromPct(busiestPct, continentTimeMode) : 'neutral';
  const fastestKpiTone =
    fastestPct != null ? growthDeltaTypeFromPct(fastestPct, continentTimeMode) : 'neutral';
  const activePresetLabel = CONTINENT_PRESET_LABELS[preset];

  const kpis: KPIItem[] = [
    {
      label: 'เที่ยวบินทั้งหมด',
      value: totalFlightsValue.toLocaleString(),
      delta: hasPayload && detail ? detail.totalDeltaText : continent.delta,
      deltaType: continentGrowthTone,
      accentColor: KPI_ACCENT.flights,
      ...(hasPayload && topByFlights
        ? {
            onClick: () => drillTo('country', { country: topByFlights }),
            actionLabel: `ไปยังประเทศ ${topByFlights.name} (เที่ยวบินสูงสุดในรายการนี้)`,
          }
        : {}),
    },
    {
      label: 'ประเทศที่เปิดน่านฟ้า',
      value: hasPayload && detail ? (detail.countryCount || '0' ) : countryCountFromSummary.toLocaleString(),
      delta: hasPayload
        ? ` ประเทศ `
        : `สรุปจาก ${airportCountFromSummary.toLocaleString()} สนามบิน`,
      deltaType: 'neutral',
      growthColored: false,
      accentColor: KPI_ACCENT.airports,
      ...(hasPayload && topByAirports && !airportsCardSameAsFlightsCard
        ? {
            onClick: () => drillTo('country', { country: topByAirports }),
            actionLabel: `ไปยังประเทศ ${topByAirports.name} (สนามบินมากที่สุดในรายการนี้)`,
          }
        : {}),
    },
    {
      label: 'ประเทศที่คึกคักที่สุด',
      value: hasPayload && detail
        ? ` ${detail.busiestCountry.nameTh}`
        : `${continent.icon} ${continent.name}`,
      delta: hasPayload && detail ? detail.busiestDelta : 'กำลังโหลดรายละเอียดจากฐานข้อมูล',
      deltaType: hasPayload ? busiestKpiTone : 'neutral',
      growthColored: hasPayload && busiestPct != null,
      accentColor: KPI_ACCENT.average,
      ...(hasPayload && busiestResolved
        ? {
            onClick: () => drillTo('country', { country: busiestResolved }),
            actionLabel: `ไปยังประเทศ ${detail?.busiestCountry.nameTh || continent.name} (คึกคักที่สุด)`,
          }
        : {}),
    },
    {
      label: 'เติบโตมากที่สุด',
      value: hasPayload && detail
        ? `${detail.fastestGrowing.nameTh}`
        : `${continent.icon} ${continent.name}`,
      delta: hasPayload && detail ? detail.fastestDelta : 'กำลังโหลดรายละเอียดจากฐานข้อมูล',
      deltaType: hasPayload ? fastestKpiTone : 'neutral',
      growthColored: hasPayload && fastestPct != null,
      accentColor: KPI_ACCENT.highlight,
      ...(hasPayload && fastestResolved
        ? {
            onClick: () => drillTo('country', { country: fastestResolved }),
            actionLabel: `ไปยังประเทศ ${detail?.fastestGrowing.nameTh || continent.name} (เติบโตเร็วที่สุด)`,
          }
        : {}),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold text-left px-3 py-4 sm:text-2xl sm:px-5 sm:py-5 lg:text-3xl lg:p-7">ทวีป {continent.name}</h2>
          {/* <p className="text-[15px] text-muted-foreground font-medium break-words">
            คลิกประเทศเพื่อดูสนามบินในภูมิภาค {continent.name} {'\u00B7'} ช่วงปัจจุบัน: {activePresetLabel}
          </p> */}
        </div>
        <div className="min-w-0 w-full xl:w-auto xl:max-w-[48rem]">
          <div className="mb-2 text-sm font-medium text-muted-foreground">ช่วงวันที่</div>
          <ContinentPresetBar preset={preset} onSelect={setRangePreset} />
        </div>
      </div>

      {detailError && (
        <div className="rounded-[10px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {detailError}
        </div>
      )}

      <KPIRow items={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {trendsFailed ? (
          <ContinentPanelNoData title="แนวโน้ม" message="ไม่สามารถโหลดข้อมูลแนวโน้มได้" />
        ) : trends ? (
          <ContinentAverageTrendChart trends={trends} />
        ) : (
          <ContinentPanelRingLoader title="แนวโน้ม" />
        )}
        <div>
          {topRoutesFailed ? (
            <ContinentPanelNoData title="5 อันดับเส้นทาง" message="ไม่สามารถโหลดข้อมูลเส้นทางได้" />
          ) : topRouteRankCacheHitKey === topRoutesRankQueryKey ? (
            <ContinentTopRoutesPanel rows={resolvedTopRouteRankRows} timeMode={continentTimeMode} />
          ) : (
            <ContinentPanelRingLoader title="5 อันดับเส้นทาง" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {hasPayload && detail
            ? `${filteredCountries.length.toLocaleString()}${search ? ` / ${countries.length.toLocaleString()}` : ''} ประเทศ`
            : 'กำลังโหลด...'}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาประเทศ"
          className="w-full sm:w-52 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {hasPayload && detail ? filteredCountries.length > 0 ? filteredCountries.map((c) => {
          const rowPct = parsePercentFromDelta(c.delta);
          const rowTone =
            rowPct != null
              ? growthDeltaTypeFromPct(rowPct, continentTimeMode)
              : c.deltaN < 0
                ? 'down'
                : 'neutral';
          return (
          <button
            key={c.name}
            type="button"
            aria-label={`ดูข้อมูล ${c.name}`}
            onClick={() => drillTo('country', { country: c })}
            className={`bg-card border rounded-[10px] p-4 text-left transition-all hover:border-primary hover:-translate-y-0.5 cursor-pointer ${
              c.highlight ? 'border-primary bg-primary/5' : 'border-border shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-3 min-w-0">
              <span className="text-2xl">
                              <img
                src={`https://www.worldometers.info/images/flags/original/${emojiFlagToCode(c.flag)}.webp`}
                alt={`${c.flag} flag`}
                className="inline-block w-6 h-4"
              />
              </span>
              <span className="text-[15px] font-semibold truncate">{c.name}</span>
              <span className="ml-auto bg-muted border border-border rounded-full text-[14px] py-0.5 px-2.5 text-muted-foreground font-medium whitespace-nowrap">
                {c.airports} สนามบิน
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-0.5 min-w-0">
              <span className="text-[24px] font-bold tabular-nums">{c.flights.toLocaleString()}</span>
              <span className="text-[15px] text-muted-foreground font-medium shrink-0">เที่ยวบิน</span>
            </div>
            <div className={`text-[14px] mt-1.5 font-bold ${growthTextClass(rowTone)}`}>
              {c.deltaN >= 0 ? '\u25B2' : '\u25BC'} {c.deltaN >= 0 ? '+' : ''}{c.deltaN.toLocaleString()} เที่ยวบิน ({c.delta})
            </div>
            <div className="mt-3.5 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${c.bar}%` }} />
            </div>
          </button>
        );
        }) : (
          <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
            ไม่พบประเทศที่ตรงกับ &ldquo;{search}&rdquo;
          </div>
        ) : Array.from({ length: 4 }).map((_, index) => (
          <ContinentCountryRingCard key={index} />
        ))}
      </div>

      <div>
        {topAirportCacheHitKey === topAirportsQueryKey ? (
          <ContinentTopAirportTable
            rows={resolvedTopAirportRows}
            continentName={continent.name}
            presetLabel={activePresetLabel}
          />
        ) : (
          <ContinentPanelRingLoader title="Top Flight Airports" />
        )}
      </div>

      <div className="flex justify-center pt-1">
        <BackButton label="กลับไปยังโลก" onClick={() => drillTo('world')} />
      </div>
    </div>
  );
}

function ContinentKpiRingLoader() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-card border border-border rounded-[10px] p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-24 rounded bg-muted/70" />
              <div className="h-7 w-28 rounded bg-muted/70" />
              <div className="h-3.5 w-3/4 rounded bg-muted/70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContinentPanelNoData({ title, message }: { title: string; message?: string }) {
  return (
    <div className="bg-card border border-border rounded-[10px] p-5">
      <div className="text-[16px] font-bold mb-4">{title}</div>
      <div className="flex h-[220px] items-center justify-center rounded-[10px] border border-border/70 bg-muted/20">
        <span className="text-sm text-muted-foreground">{message ?? 'ไม่พบข้อมูลสำหรับช่วงเวลานี้'}</span>
      </div>
    </div>
  );
}

function ContinentPanelRingLoader({ title }: { title: string }) {
  return (
    <div className="bg-card border border-border rounded-[10px] p-5">
      <div className="text-[16px] font-bold mb-4">{title}</div>
      <div className="flex h-[220px] items-center justify-center rounded-[10px] border border-border/70 bg-muted/20">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span>กำลังโหลดข้อมูล</span>
        </div>
      </div>
    </div>
  );
}

function ContinentCountryRingCard() {
  return (
    <div className="bg-card border border-border rounded-[10px] p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <div className="h-4 w-28 rounded bg-muted/70" />
        <div className="ml-auto h-6 w-20 rounded-full bg-muted/70" />
      </div>
      <div className="flex items-baseline gap-2 mb-0.5 min-w-0">
        <div className="h-7 w-24 rounded bg-muted/70" />
        <div className="h-4 w-16 rounded bg-muted/70" />
      </div>
      <div className="mt-1.5 h-4 w-40 rounded bg-muted/70" />
      <div className="mt-3.5 h-1.5 rounded-full bg-muted/70" />
    </div>
  );
}

function ContinentAverageTrendChart({ trends }: { trends: DashboardContinentTrendsResponse }) {
  const [mode, setMode] = useState<DashboardContinentTrendMode>('day');
  const modePayload = trends.modes[mode];
  const modeDescription = mode === 'day'
    ? 'เฉลี่ยรายช่วงเวลา 4 ชั่วโมง'
    : mode === 'month'
      ? 'เฉลี่ยรายเดือน'
      : 'เฉลี่ยรายปี';
  const chartData = modePayload.points.map((point) => ({
    label: point.label,
    inboundAvg: point.inboundAvg,
    outboundAvg: point.outboundAvg,
    highlight: point.highlight,
  }));

  return (
    <div className="bg-card border border-border rounded-[10px] p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[16px] font-bold">ค่าเฉลี่ยเที่ยวบิน เข้า - ออก ตามช่วงเวลาใน {trends.continent.label}</div>
          <div className="text-xs text-muted-foreground">โหมดปัจจุบัน: {modeDescription}</div>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
          <Button
            type="button"
            size="sm"
            variant={mode === 'day' ? 'default' : 'ghost'}
            className="h-8 px-3 text-xs"
            onClick={() => setMode('day')}
          >
            วัน
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'month' ? 'default' : 'ghost'}
            className="h-8 px-3 text-xs"
            onClick={() => setMode('month')}
          >
            เดือน
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'year' ? 'default' : 'ghost'}
            className="h-8 px-3 text-xs"
            onClick={() => setMode('year')}
          >
            ปี
          </Button>
        </div>
      </div>

      {modePayload.status === 'unavailable' ? (
        <div className="flex h-[220px] items-center justify-center rounded-[10px] border border-border/70 bg-muted/20 text-sm text-muted-foreground">
          {modePayload.message || 'ข้อมูลยังไม่พร้อมให้บริการ'}
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 8, bottom: 10 }}
              barCategoryGap={14}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fontWeight: 600 }}
                tickMargin={8}
                interval={0}
                minTickGap={10}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12, fontWeight: 600 }}
                tickMargin={8}
                width={52}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                formatter={(value: number, key: string) => [
                  `${value.toLocaleString()} เที่ยวบิน/ช่วง`,
                  key === 'inboundAvg' ? 'ขาเข้า' : 'ขาออก',
                ]}
              />
              <Bar dataKey="inboundAvg" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {chartData.map((entry, i) => (
                  <Cell key={`in-${i}`} fill={entry.highlight ? '#0ea5e9' : '#7dd3fc'} />
                ))}
              </Bar>
              <Bar dataKey="outboundAvg" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {chartData.map((entry, i) => (
                  <Cell key={`out-${i}`} fill={entry.highlight ? '#f59e0b' : '#fcd34d'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-sky-300" />ขาเข้า</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" />ขาออก</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" />ช่วงที่เฉลี่ยสูงสุด</span>
          </div>
        </>
      )}
    </div>
  );
}

function ContinentTopRoutesPanel({
  rows,
  timeMode,
}: {
  rows: ContinentTopRouteRow[];
  timeMode: ContinentDisplayMode;
}) {
  const { selections } = useDrillDown();
  const continentName = selections.continent?.name || '';

  return (
    <div className="bg-card border border-border rounded-[10px] p-5">
      <div className="text-[16px] font-bold mb-4">
       อันดับเส้นทางเที่ยวบินสูงสุดใน {continentName}
      </div>
      {rows.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
          ไม่พบข้อมูลเส้นทางสำหรับช่วงเวลานี้
        </div>
      ) : rows.map((r, i) => {
        const pct = r.deltaPercent;
        const num = r.deltaFlights;
        return (
          <div key={i} className="flex items-center gap-2 py-2.5 border-b border-border/60 last:border-b-0">
            <span className="text-[14px] text-muted-foreground w-6 text-center shrink-0 font-bold">{i + 1}</span>
            <span className="text-lg shrink-0">✈️</span>
            <span className="text-[15px] font-medium flex-1 min-w-0 truncate">
              {r.routeText}
            </span>
            <span className="text-[14px] text-muted-foreground w-16 text-right shrink-0 tabular-nums font-bold">
              {r.flights.toLocaleString()}
            </span>
            <ChangePill pct={pct} num={num} active timeMode={timeMode} />
          </div>
        );
      })}
    </div>
  );
}

function ContinentTopAirportTable({
  rows,
  continentName,
  presetLabel,
}: {
  rows: ContinentTopAirportRow[];
  continentName: string;
  presetLabel: string;
}) {
  return (
    <div className="bg-card border border-border rounded-[10px] p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[16px] font-bold">
          {'✈️'} Top Flight Airports — {continentName}
        </div>
        <div className="text-xs text-muted-foreground">ช่วงข้อมูล: {presetLabel}</div>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-border/70">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Airport</th>
              <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">รวมเที่ยวบิน</th>
              <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">ขาออก</th>
              <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">ขาเข้า</th>
              <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">เทียบช่วงก่อนหน้า</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  ไม่พบข้อมูลสนามบินสำหรับช่วงวันที่ที่เลือก
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.iata}-${index}`} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
                  <td className="px-3 py-2.5 font-bold text-muted-foreground">{index + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-[13px] font-extrabold tracking-wide text-primary">{row.iata}</div>
                      <div className="truncate font-medium text-foreground">{row.airportName}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-primary">{row.flights.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.departureFlights.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.arrivalFlights.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.deltaText}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* <div className="mt-2 text-xs text-muted-foreground">
        หมายเหตุ: ตารางนี้ดึงจาก endpoint Top Airport ของทวีปโดยตรงตามช่วงวันที่ที่เลือก
      </div> */}
    </div>
  );
}
