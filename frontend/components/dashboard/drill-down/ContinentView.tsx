'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  CONTINENTS,
  getChangeForMode,
  growthDeltaTypeFromPct,
  growthTextClass,
  parseFirstSignedPercent,
  parsePercentFromDelta,
} from '@/lib/dashboard/drill-down-data';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import { getContinentDetail } from '@/lib/dashboard/services/drilldown';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDrillDown, KPIRow, BackButton, ChangePill } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import type { RangePreset } from './DrillDownDashboard';
import type { CountryData } from '@/types/dashboard';
import type { EurTopRoute } from '@/types/dashboard';

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

type ContinentDetailPayload = Awaited<ReturnType<typeof getContinentDetail>>;
type SeasonalPoint = ContinentDetailPayload['seasonal'][number];
type ContinentDisplayMode = 'wow' | 'mom' | 'yoy';
type ContinentCacheSnapshot = {
  detail: Array<[string, ContinentDetailPayload]>;
  seasonal: Array<[string, SeasonalPoint[]]>;
  topRoutes: Array<[string, EurTopRoute[]]>;
};

const CONTINENT_CACHE_STORAGE_KEY = 'search-flight.drilldown.continent-cache.v2';

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
const continentDetailCache = new Map<string, ContinentDetailPayload>(persistedContinentCache?.detail ?? []);
const continentSeasonalCache = new Map<string, SeasonalPoint[]>(persistedContinentCache?.seasonal ?? []);
const continentTopRoutesCache = new Map<string, EurTopRoute[]>(persistedContinentCache?.topRoutes ?? []);

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

function storeContinentDetail(continentName: string, payload: ContinentDetailPayload) {
  continentDetailCache.set(continentName, payload);
  persistContinentCacheSnapshot();
}

function storeContinentSeasonal(continentName: string, seasonal: SeasonalPoint[]) {
  continentSeasonalCache.set(continentName, seasonal);
  persistContinentCacheSnapshot();
}

function storeContinentTopRoutes(continentName: string, topRoutes: EurTopRoute[]) {
  continentTopRoutesCache.set(continentName, topRoutes);
  persistContinentCacheSnapshot();
}

function parseContinentCountSummary(airportsText: string) {
  const airportMatch = airportsText.match(/([\d,]+)\s*สนามบิน/);
  const countryMatch = airportsText.match(/([\d,]+)\s*ประเทศ/);

  return {
    airportCount: airportMatch ? Number(airportMatch[1].replace(/,/g, '')) || 0 : 0,
    countryCount: countryMatch ? Number(countryMatch[1].replace(/,/g, '')) || 0 : 0,
  };
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
  const continent = selections.continent || CONTINENTS[0];
  const preset = rangePreset;
  const continentWindowDays = resolveContinentWindowDays(preset);
  const continentTimeMode = resolveContinentDisplayMode(preset);
  const topRoutesSectionRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadTopRoutes, setShouldLoadTopRoutes] = useState(() => continentTopRoutesCache.has(buildContinentCacheKey(continent.name, continentWindowDays, false, false, true)));
  const coreCacheKey = buildContinentCacheKey(continent.name, continentWindowDays, true, false, false);
  const seasonalCacheKey = buildContinentCacheKey(continent.name, continentWindowDays, false, true, false);
  const topRoutesCacheKey = buildContinentCacheKey(continent.name, continentWindowDays, false, false, true);
  const [continentPayload, setContinentPayload] = useState<ContinentDetailPayload | null>(() => {
    return continentDetailCache.get(coreCacheKey) || null;
  });
  const [payloadCacheKey, setPayloadCacheKey] = useState<string | null>(() => {
    return continentDetailCache.has(coreCacheKey) ? coreCacheKey : null;
  });
  const [seasonalRows, setSeasonalRows] = useState<SeasonalPoint[] | null>(() => {
    return continentSeasonalCache.get(seasonalCacheKey) || null;
  });
  const [seasonalCacheHitKey, setSeasonalCacheHitKey] = useState<string | null>(() => {
    return continentSeasonalCache.has(seasonalCacheKey) ? seasonalCacheKey : null;
  });
  const [topRouteRows, setTopRouteRows] = useState<EurTopRoute[] | null>(() => {
    return continentTopRoutesCache.get(topRoutesCacheKey) || null;
  });
  const [topRouteCacheHitKey, setTopRouteCacheHitKey] = useState<string | null>(() => {
    return continentTopRoutesCache.has(topRoutesCacheKey) ? topRoutesCacheKey : null;
  });
  const [detailError, setDetailError] = useState<string | null>(null);
  const coreReady = continentPayload != null && payloadCacheKey === coreCacheKey;

  useEffect(() => {
    setShouldLoadTopRoutes(continentTopRoutesCache.has(topRoutesCacheKey));
  }, [topRoutesCacheKey]);

  useEffect(() => {
    if (shouldLoadTopRoutes) {
      return;
    }

    const target = topRoutesSectionRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadTopRoutes(true);
          observer.disconnect();
        }
      },
      { rootMargin: '180px 0px' }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [shouldLoadTopRoutes, topRoutesCacheKey]);

  useEffect(() => {
    let alive = true;
    const cached = continentDetailCache.get(coreCacheKey);

    if (cached) {
      setContinentPayload(cached);
      setPayloadCacheKey(coreCacheKey);
      setDetailError(null);
      return () => {
        alive = false;
      };
    }

    const loadDetail = async () => {
      try {
        setDetailError(null);
        setPayloadCacheKey(null);
        const payload = await getContinentDetail(continent.name, {
          windowDays: continentWindowDays,
          includeCore: true,
          includeSeasonal: false,
          includeTopRoutes: false,
        });
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
  }, [continent.name, continentWindowDays, coreCacheKey]);

  useEffect(() => {
    if (!coreReady || !shouldLoadTopRoutes) {
      return;
    }

    let alive = true;
    const cached = continentSeasonalCache.get(seasonalCacheKey);
    if (cached) {
      setSeasonalRows(cached);
      setSeasonalCacheHitKey(seasonalCacheKey);
      return () => {
        alive = false;
      };
    }

    const loadSeasonal = async () => {
      try {
        setSeasonalCacheHitKey(null);
        const payload = await getContinentDetail(continent.name, {
          windowDays: continentWindowDays,
          includeCore: false,
          includeSeasonal: true,
          includeTopRoutes: false,
        });
        if (!alive) return;
        storeContinentSeasonal(seasonalCacheKey, payload.seasonal);
        setSeasonalRows(payload.seasonal);
        setSeasonalCacheHitKey(seasonalCacheKey);
      } catch (error) {
        if (!alive) return;
        setDetailError(error instanceof Error ? error.message : 'ไม่สามารถโหลดแนวโน้มทวีปได้');
      }
    };

    void loadSeasonal();

    return () => {
      alive = false;
    };
  }, [continent.name, continentWindowDays, coreReady, seasonalCacheKey]);

  useEffect(() => {
    if (!coreReady) {
      return;
    }

    let alive = true;
    const cached = continentTopRoutesCache.get(topRoutesCacheKey);
    if (cached) {
      setTopRouteRows(cached);
      setTopRouteCacheHitKey(topRoutesCacheKey);
      return () => {
        alive = false;
      };
    }

    const loadTopRoutes = async () => {
      try {
        setTopRouteCacheHitKey(null);
        const payload = await getContinentDetail(continent.name, {
          windowDays: continentWindowDays,
          includeCore: false,
          includeSeasonal: false,
          includeTopRoutes: true,
        });
        if (!alive) return;
        storeContinentTopRoutes(topRoutesCacheKey, payload.topRoutes);
        setTopRouteRows(payload.topRoutes);
        setTopRouteCacheHitKey(topRoutesCacheKey);
      } catch (error) {
        if (!alive) return;
        setDetailError(error instanceof Error ? error.message : 'ไม่สามารถโหลดเส้นทางทวีปได้');
      }
    };

    void loadTopRoutes();

    return () => {
      alive = false;
    };
  }, [continent.name, continentWindowDays, coreReady, shouldLoadTopRoutes, topRoutesCacheKey]);

  const payload = continentPayload;
  const hasPayload = coreReady;
  const continentData = hasPayload && payload ? payload.detail : null;
  const detail = continentData;
  const topRoutes = topRouteCacheHitKey === topRoutesCacheKey && topRouteRows ? topRouteRows : [];
  const seasonal = seasonalCacheHitKey === seasonalCacheKey && seasonalRows ? seasonalRows : [];
  const countries = detail?.countries ?? [];
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

  const continentGrowthTone = growthDeltaTypeFromPct(getChangeForMode(continent, continentTimeMode).pct, continentTimeMode);
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
      value: continent.flights.toLocaleString(),
      delta: continent.delta,
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
      value: hasPayload && detail ? (detail.countryCount || '0') : countryCountFromSummary.toLocaleString(),
      delta: hasPayload
        ? `แสดงรายละเอียด ${countries.length} ประเทศ`
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
        ? `${detail.busiestCountry.flag} ${detail.busiestCountry.nameTh}`
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
      label: 'เติบโตเร็วที่สุด',
      value: hasPayload && detail
        ? `${detail.fastestGrowing.flag} ${detail.fastestGrowing.nameTh}`
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
          <h2 className="text-xl font-bold mb-1 break-words">{continent.icon} {continent.name}</h2>
          <p className="text-[15px] text-muted-foreground font-medium break-words">
            คลิกประเทศเพื่อดูสนามบินในภูมิภาค {continent.name} {'\u00B7'} ช่วงปัจจุบัน: {activePresetLabel}
          </p>
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
        {seasonalCacheHitKey === seasonalCacheKey && seasonalRows ? (
          <ContinentSeasonalChart seasonal={seasonal} timeMode={continentTimeMode} />
        ) : (
          <ContinentPanelRingLoader title="แนวโน้ม" />
        )}
        <div ref={topRoutesSectionRef}>
          {topRouteCacheHitKey === topRoutesCacheKey && topRouteRows ? (
            <ContinentTopRoutesPanel rows={topRoutes} timeMode={continentTimeMode} />
          ) : (
            <ContinentPanelRingLoader title="5 อันดับเส้นทาง" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {hasPayload && detail ? countries.map((c) => {
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
              <span className="text-2xl">{c.flag}</span>
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
        }) : Array.from({ length: 4 }).map((_, index) => (
          <ContinentCountryRingCard key={index} />
        ))}
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

function ContinentSeasonalChart({
  seasonal,
  timeMode,
}: {
  seasonal: SeasonalPoint[];
  timeMode: ContinentDisplayMode;
}) {
  const { selections } = useDrillDown();
  const continentName = selections.continent?.name || '';
  const series = useMemo(() => {
    if (seasonal.length >= 12) {
      return seasonal.slice(-12);
    }

    const padded = [...seasonal];
    while (padded.length < 12) {
      padded.unshift({ month: '', flights: 0 });
    }
    return padded;
  }, [seasonal]);
  const peakVal = Math.max(...series.map((point) => point.flights), 0);
  const nowIdx = new Date().getMonth();
  const prevIdx = (nowIdx + 11) % 12;
  const resolveMonthLabel = (month: string, index: number) => {
    const parsed = new Date(`${month}-01T00:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return MONTHS[parsed.getUTCMonth()] || MONTHS[index] || month;
    }

    return MONTHS[index] || month;
  };

  let chartData: Array<{ month: string; value: number; color: string }>;
  let title: string;

  if (timeMode === 'wow') {
    title = `แนวโน้มล่าสุด — ${continentName}`;
    chartData = series.slice(-5).map((v, i) => ({
      month: resolveMonthLabel(v.month, i),
      value: v.flights,
      color: i === 4 ? '#d29922' : v.flights === peakVal ? '#ff9f43' : '#bfdbfe',
    }));
  } else if (timeMode === 'mom') {
    title = `แนวโน้มรายเดือน \u2014 ${continentName} (รายเดือน)`;
    const startIdx = Math.max(0, nowIdx - 2);
    const endIdx = Math.min(11, nowIdx + 2);
    chartData = series
      .map((v, i) => ({
        month: resolveMonthLabel(v.month, i),
        value: v.flights,
        color: i === nowIdx ? '#d29922' : v.flights === peakVal ? '#ff9f43' : i === prevIdx ? '#2563eb' : '#bfdbfe',
        _idx: i,
      }))
      .filter((d) => d._idx >= startIdx && d._idx <= endIdx);
  } else {
    title = `แนวโน้มฤดูกาล \u2014 ${continentName} (รายปี)`;
    chartData = series.map((v, i) => ({
      month: resolveMonthLabel(v.month, i),
      value: v.flights,
      color: i === nowIdx ? '#d29922' : v.flights === peakVal ? '#ff9f43' : '#bfdbfe',
    }));
  }

  return (
    <div className="bg-card border border-border rounded-[10px] p-5">
      <div className="text-[16px] font-bold mb-4">{title}</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{
            top: 8,
            right: 12,
            left: 8,
            bottom: timeMode === 'wow' ? 34 : 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 14, fontWeight: 600 }}
            tickMargin={8}
            interval={0}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 14, fontWeight: 600 }}
            tickMargin={8}
            width={44}
            className="text-muted-foreground"
            unit="k"
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '14px' }}
            formatter={(value: number) => [`${value}k เที่ยวบิน`, '']}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={34}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                opacity={entry.color === '#bfdbfe' ? 0.55 : 0.9}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center text-[14px] font-medium text-muted-foreground mt-2.5">
        {/* <span>ทั้งปี </span> */}
        {/* {'\u00B7'} เที่ยวบินเป็นพันเที่ยว */}
        <span className="flex items-center gap-3">
          <span style={{ color: 'var(--chart-current)' }}>{'\u25A0'} {timeMode === 'wow' ? 'สัปดาห์ปัจจุบัน' : 'เดือนปัจจุบัน'}</span>
          <span style={{ color: 'var(--chart-peak)' }}>{'\u25A0'} {timeMode === 'wow' ? 'สัปดาห์ที่สูงสุด' : 'เดือนที่สูงสุด'}</span>
          {timeMode === 'mom' && (
            <span style={{ color: 'var(--chart-1)' }}>{'\u25A0'} เดือนก่อนหน้า</span>
          )}
          <span style={{ color: timeMode === 'yoy' ? 'var(--chart-mid)' : 'var(--chart-subtle)' }}>{'\u25A0'} อื่นๆ</span>
        </span>
      </div>
    </div>
  );
}

function ContinentTopRoutesPanel({
  rows,
  timeMode,
}: {
  rows: EurTopRoute[];
  timeMode: ContinentDisplayMode;
}) {
  const { selections } = useDrillDown();
  const continentName = selections.continent?.name || '';

  return (
    <div className="bg-card border border-border rounded-[10px] p-5">
      <div className="text-[16px] font-bold mb-4">
        {'🏆'} 5 อันดับเส้นทางตามจำนวนเที่ยวบิน {'\u2014'} {continentName}
      </div>
      {rows.map((r, i) => {
        const { pct, num } = getChangeForMode(r, timeMode);
        return (
          <div key={i} className="flex items-center gap-2 py-2.5 border-b border-border/60 last:border-b-0">
            <span className="text-[14px] text-muted-foreground w-6 text-center shrink-0 font-bold">{i + 1}</span>
            <span className="text-lg shrink-0">{r.fromFlag}</span>
            <span className="text-[15px] font-medium flex-1 min-w-0 truncate">
              {r.from} {'\u2192'} {r.toFlag} {r.to}
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
