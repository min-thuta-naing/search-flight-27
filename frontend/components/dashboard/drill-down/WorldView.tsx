'use client';

// --- Airline Overview Panel ---
import AirlineOverviewPanel from './AirlineOverviewPanel';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, differenceInCalendarDays, format, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';
import { DateRange, type MonthCaptionProps, useDayPicker } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { airportApi, type AirportCountrySummary } from '@/lib/api/airport-api';
import {
  BUSIEST_AIRPORTS,
  COUNTRIES,
  CONTINENTS,
  fmtWorldKpiDeltaTh,
  getChangeForMode,
  growthDeltaTypeFromPct,
  modeLabel,
} from '@/lib/dashboard/drill-down-data';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import {
  getDashboardDateBounds,
  getDashboardSummary,
  getDashboardTopRanks,
  getDashboardTopCountries,
  getDashboardTopAirports,
  getDashboardTopDestinations,
  type DashboardDateBoundsResponse,
  type DashboardSummaryResponse,
  type DashboardTopRanksResponse,
  type DashboardTopDestinationsResponse,
} from '@/lib/dashboard/services/drilldown';
import { useWorldPreloadGate } from '@/lib/dashboard/preload/useWorldPreloadGate';
import type {
  DashboardContinentCardResponse,
} from '@/lib/api/statistics-api';
import {
  getWorldSummaryCacheState,
  setWorldSummaryCache,
  getWorldTopRanksCacheState,
  setWorldTopRanksCache,
  getWorldTopDestinationsCacheState,
  setWorldTopDestinationsCache,
  getCachedAirportCountries,
  setCachedAirportCountries,
  runDrillDownRequest,
} from '@/lib/dashboard/drill-down-cache';
import { useDrillDown, KPIRow, ChangePill } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import type { RangePreset } from './DrillDownDashboard';
import type { AirportInfo, CountryData } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const COUNTRY_RANK_PANEL_HEIGHT_CLASS = 'lg:h-[540px]';
const COUNTRY_DISPLAY_NAMES = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;
const COUNTRY_DISPLAY_ALIASES: Record<string, string> = {
  CD: 'Kinshasa',
};

type TopCountryViewRow = {
  countryCode: string | null;
  name: string;
  flag?: string;
  continentKey: string;
  continentLabel: string;
  continentIcon: string;
  airportCount: number;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
};

type CountryLookupRow = AirportCountrySummary & {
  displayName: string;
  code: string;
  key: string;
};

type TopAirportViewRow = {
  iata: string;
  airportName: string;
  city: string;
  country: string;
  continentKey: string;
  continentLabel: string;
  continentIcon: string;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
};

const PRELOAD_GATE_MAX_WAIT_MS = 15_000;

const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  focus: '± 15 วัน',
  '7': '7 วัน',
  '30': '30 วัน',
  all: 'ทั้งหมด',
  '90': 'ไตรมาสนี้',
  '180': '6 เดือน',
  '365': '1 ปี',
};

const PRELOADED_PRESET_WINDOW_DAYS: Partial<Record<RangePreset, number>> = {
  focus: 15,
  '7': 7,
  '30': 30,
  '90': 90,
  '180': 180,
  '365': 365,
};

const CALENDAR_MONTH_OPTIONS = Array.from({ length: 12 }, (_, monthIndex) => ({
  value: monthIndex,
  label: format(new Date(2024, monthIndex, 1), 'LLLL', { locale: th }),
}));

const CALENDAR_YEAR_RANGE = (() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, index) => currentYear - 2 + index);
})();

function WorldCalendarCaption({
  calendarMonth,
  displayIndex: _displayIndex,
  ...props
}: MonthCaptionProps) {
  const { goToMonth } = useDayPicker();
  const currentMonth = calendarMonth.date.getMonth();
  const currentYear = calendarMonth.date.getFullYear();

  const handleMonthChange = (value: string) => {
    goToMonth(new Date(currentYear, Number(value), 1));
  };

  const handleYearChange = (value: string) => {
    goToMonth(new Date(Number(value), currentMonth, 1));
  };

  return (
    <div
      {...props}
      className={cn(
        'flex h-8 w-full items-center justify-between gap-2 px-2',
        props.className,
      )}
    >
      <select
        aria-label="เลือกเดือน"
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px]"
        value={String(currentMonth)}
        onChange={(event) => handleMonthChange(event.target.value)}
      >
        {CALENDAR_MONTH_OPTIONS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
      <select
        aria-label="เลือกปี"
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-[96px] shrink-0 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px]"
        value={String(currentYear)}
        onChange={(event) => handleYearChange(event.target.value)}
      >
        {CALENDAR_YEAR_RANGE.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

function parseIsoDateInput(dateInput?: string | null) {
  if (!dateInput) return null;
  const parsed = new Date(`${dateInput.split('T')[0]}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildPresetRange(
  mode: RangePreset,
  baseDate = new Date(),
  bounds?: Pick<DashboardDateBoundsResponse, 'minDate' | 'recommendedEndDate'> | null,
): DateRange | undefined {
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
    return undefined;
  }

  return {
    from: minDate,
    to: recommendedEndDate,
  };
}

function formatRangeLabel(range?: DateRange) {
  if (!range?.from) {
    return 'กำลังเลือกช่วงวันที่';
  }

  const from = format(range.from, 'dd/MM/yyyy');
  const to = format(range.to || range.from, 'dd/MM/yyyy');
  return `${from} – ${to}`;
}

function formatRangeLabelFromIso({ startDate, endDate }: { startDate: string; endDate: string }) {
  const fmt = (iso: string) => iso.split('-').reverse().join('/');
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

function parseContinentAirportCount(value: string) {
  const match = value.match(/([\d,]+)\s*สนามบิน/);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
}

function parseContinentCountryCount(value: string) {
  const match = value.match(/([\d,]+)\s*ประเทศ/);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
}

export function WorldView() {
  const { drillTo, timeMode, rangePreset, setRangePreset, customDateRange, setCustomDateRange } = useDrillDown();
  const [hydratedNow, setHydratedNow] = useState<Date | null>(null);
  const { presetPreloadState, gateStartedAtMsRef } = useWorldPreloadGate(!!hydratedNow);
  const [dashboardDateBounds, setDashboardDateBounds] = useState<DashboardDateBoundsResponse | null>(null);
  const initialPresetRange = useMemo<DateRange | undefined>(
    () => (hydratedNow ? buildPresetRange(rangePreset, hydratedNow, dashboardDateBounds) : undefined),
    [rangePreset, dashboardDateBounds, hydratedNow],
  );
  const initialCacheKey = useMemo(() => {
    if (!initialPresetRange?.from) {
      return null;
    }

    const startDate = formatLocalDateInput(initialPresetRange.from);
    const endDate = formatLocalDateInput(initialPresetRange.to || initialPresetRange.from);
    return `${startDate}__${endDate}`;
  }, [initialPresetRange]);
  const initialSummaryCacheState = useMemo(
    () => (initialCacheKey ? getWorldSummaryCacheState(initialCacheKey) : { value: null, stale: false }),
    [initialCacheKey],
  );
  const initialTopRanksCacheState = useMemo(
    () => (initialCacheKey ? getWorldTopRanksCacheState(initialCacheKey) : { value: null, stale: false }),
    [initialCacheKey],
  );
  const initialTopDestinationsCacheState = useMemo(
    () => (initialCacheKey ? getWorldTopDestinationsCacheState(initialCacheKey) : { value: null, stale: false }),
    [initialCacheKey],
  );
  const [isMounted, setIsMounted] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(() => initialSummaryCacheState.value);
  const [loading, setLoading] = useState(() => !initialSummaryCacheState.value);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => initialPresetRange);
  const [durationMode, setDurationMode] = useState<RangePreset | null>(rangePreset);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [isExtendedRangeOpen, setIsExtendedRangeOpen] = useState(false);
  const [fromCalendarMonth, setFromCalendarMonth] = useState(() => initialPresetRange?.from || new Date());
  const [toCalendarMonth, setToCalendarMonth] = useState(() => initialPresetRange?.to || initialPresetRange?.from || new Date());
  const [dateError, setDateError] = useState(false);
  const [topRanks, setTopRanks] = useState<DashboardTopRanksResponse | null>(() => initialTopRanksCacheState.value);
  const [topRanksLoading, setTopRanksLoading] = useState(() => !initialTopRanksCacheState.value);
  const [topDestinations, setTopDestinations] = useState<DashboardTopDestinationsResponse | null>(() => initialTopDestinationsCacheState.value);
  const [topDestinationsLoading, setTopDestinationsLoading] = useState(() => !initialTopDestinationsCacheState.value);
  const selectPreset = (mode: RangePreset) => {
    setRangePreset(mode);
  };

  useEffect(() => {
    setHydratedNow(new Date());
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let alive = true;

    const loadDashboardDateBounds = async () => {
      try {
        const bounds = await runDrillDownRequest(
          'world:date-bounds',
          () => getDashboardDateBounds(),
        );
        if (!alive) return;
        setDashboardDateBounds(bounds);
      } catch {
        if (!alive) return;
        setDashboardDateBounds(null);
      }
    };

    void loadDashboardDateBounds();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!customDateRange) return;
    setDateRange(customDateRange);
    setDurationMode(null);
    setShowCustomDateRange(true);
    setIsExtendedRangeOpen(false);
    setDateError(false);
    setFromCalendarMonth(customDateRange.from);
    setToCalendarMonth(customDateRange.to);
  }, [customDateRange]);

  useEffect(() => {
    if (customDateRange) return;

    if (rangePreset === 'all' && !dashboardDateBounds?.minDate) {
      setLoading(true);
      setTopRanksLoading(true);
      setTopDestinationsLoading(true);
      return;
    }

    applyPresetRange(
      rangePreset,
      setDateRange,
      setDurationMode,
      setFromCalendarMonth,
      setToCalendarMonth,
      setShowCustomDateRange,
      setIsExtendedRangeOpen,
      setDateError,
      dashboardDateBounds,
    );
  }, [rangePreset, dashboardDateBounds, customDateRange]);

  useEffect(() => {
    let mounted = true;
    setDateError(false);

    if (!dateRange?.from) {
      setDateError(true);
      setLoading(false);
      setTopRanksLoading(false);
      setTopDestinationsLoading(false);
      return () => {
        mounted = false;
      };
    }

    const activePresetWindowDays = durationMode ? PRELOADED_PRESET_WINDOW_DAYS[durationMode] : undefined;
    const isPreloadedPresetMode = !!activePresetWindowDays || durationMode === 'all';
    const startDate = formatLocalDateInput(dateRange.from);
    const endDate = formatLocalDateInput(dateRange.to || dateRange.from);
    const cacheKey = isPreloadedPresetMode
      ? `preset:${durationMode}`
      : `${startDate}__${endDate}`;
    // Preset mode: use UTC-based dates to match the backend preload's buildPresetDateRange().
    // 'all' preset: bounds dates are stored as UTC midnight — use ISO slice to avoid local-timezone off-by-one.
    // Non-preset mode: use local-date strings from the date picker as-is.
    const queryOptions = durationMode === 'all'
      ? {
          startDate: dateRange.from.toISOString().slice(0, 10),
          endDate: (dateRange.to || dateRange.from).toISOString().slice(0, 10),
        }
      : isPreloadedPresetMode && durationMode
        ? buildPresetUtcQueryDates(durationMode as Exclude<RangePreset, 'all'>)
        : { startDate, endDate };
    const summaryCacheState = getWorldSummaryCacheState(cacheKey);
    const topRanksCacheState = getWorldTopRanksCacheState(cacheKey);
    const topDestinationsCacheState = getWorldTopDestinationsCacheState(cacheKey);
    const cachedSummary = summaryCacheState.value;
    const cachedTopRanks = topRanksCacheState.value;
    const cachedTopDestinations = topDestinationsCacheState.value;
    const shouldRefreshSummary = !cachedSummary;
    const shouldRefreshTopRanks = !cachedTopRanks;
    const shouldRefreshTopDestinations = !cachedTopDestinations;
    const elapsedPreloadGateMs = gateStartedAtMsRef.current
      ? Date.now() - gateStartedAtMsRef.current
      : Number.POSITIVE_INFINITY;
    const canBypassPreloadGate = elapsedPreloadGateMs >= PRELOAD_GATE_MAX_WAIT_MS;
    const missingAllSelectedPresetData = shouldRefreshSummary && shouldRefreshTopRanks && shouldRefreshTopDestinations;

    const shouldHoldForPreload =
      presetPreloadState === 'running' &&
      isPreloadedPresetMode &&
      missingAllSelectedPresetData &&
      !canBypassPreloadGate &&
      rangePreset !== 'all';

    if (shouldHoldForPreload) {
      // Hold briefly for backend warm-up to avoid duplicate heavy queries from browser.
      setLoading(true);
      setTopRanksLoading(true);
      setTopDestinationsLoading(true);
      return () => {
        mounted = false;
      };
    }

    if (cachedSummary) {
      console.debug('[WorldView] summary cache hit', { cacheKey });
      setSummary(cachedSummary);
      setLoading(false);
    } else {
      setSummary(null);
      setLoading(true);
    }

    if (cachedTopRanks) {
      console.debug('[WorldView] top ranks cache hit', { cacheKey });
      setTopRanks(cachedTopRanks);
      setTopRanksLoading(false);
    } else {
      setTopRanks(null);
      setTopRanksLoading(true);
    }

    if (cachedTopDestinations) {
      console.debug('[WorldView] top destinations cache hit', { cacheKey });
      setTopDestinations(cachedTopDestinations);
      setTopDestinationsLoading(false);
    } else {
      setTopDestinations(null);
      setTopDestinationsLoading(true);
    }

    if (cachedSummary && cachedTopRanks && cachedTopDestinations && !shouldRefreshSummary && !shouldRefreshTopRanks && !shouldRefreshTopDestinations) {
      console.debug('[WorldView] all dashboard caches ready', { cacheKey });
      return () => {
        mounted = false;
      };
    }

    void (async () => {
      if (shouldRefreshSummary) {
        console.debug('[WorldView] calling dashboard-summary', { cacheKey, queryOptions });
        try {
          const summaryData = await runDrillDownRequest(
            `world:summary:${cacheKey}`,
            () => getDashboardSummary(queryOptions),
          );
          if (!mounted) return;
          setWorldSummaryCache(cacheKey, summaryData);
          setSummary(summaryData);
          console.debug('[WorldView] summary fetch success', {
            totalFlights: summaryData.totalFlights,
            busiestContinent: summaryData.busiestContinent?.label,
          });
        } catch (error) {
          console.warn('[WorldView] Failed to load dashboard data from API, falling back to mock data.', {
            status: (error as { status?: number }).status,
            statusText: (error as { statusText?: string }).statusText,
            message: error instanceof Error ? error.message : String(error),
          });
          if (!mounted) return;
          setSummary(null);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        setLoading(false);
      }

      if (shouldRefreshTopRanks) {
        console.debug('[WorldView] calling dashboard-top-ranks', { cacheKey, queryOptions });
        try {
          const topRanksData = await runDrillDownRequest(
            `world:top-ranks:${cacheKey}`,
            () => getDashboardTopRanks(queryOptions),
          );
          if (!mounted) return;
          setWorldTopRanksCache(cacheKey, topRanksData);
          setTopRanks(topRanksData);
          console.debug('[WorldView] top ranks fetch success', {
            countries: topRanksData.countries.length,
            airports: topRanksData.airports.length,
          });
        } catch (error) {
          console.warn('[WorldView] Failed to load top ranks from API, attempting backend fallback endpoints.', {
            status: (error as { status?: number }).status,
            statusText: (error as { statusText?: string }).statusText,
            message: error instanceof Error ? error.message : String(error),
          });
          if (!mounted) return;
          try {
            const [countriesData, airportsData] = await Promise.all([
              runDrillDownRequest(
                `world:top-countries:${cacheKey}`,
                () => getDashboardTopCountries(queryOptions),
              ),
              runDrillDownRequest(
                `world:top-airports:${cacheKey}`,
                () => getDashboardTopAirports(queryOptions),
              ),
            ]);
            if (!mounted) return;

            const mergedTopRanks: DashboardTopRanksResponse = {
              centerDate: countriesData.centerDate,
              windowDays: countriesData.windowDays,
              periodStart: countriesData.periodStart,
              periodEnd: countriesData.periodEnd,
              comparisonStart: countriesData.comparisonStart,
              comparisonEnd: countriesData.comparisonEnd,
              countries: countriesData.countries,
              airports: airportsData.airports,
            };

            setWorldTopRanksCache(cacheKey, mergedTopRanks);
            setTopRanks(mergedTopRanks);
            console.debug('[WorldView] fallback top ranks fetch success', {
              countries: mergedTopRanks.countries.length,
              airports: mergedTopRanks.airports.length,
            });
          } catch (fallbackError) {
            console.warn('[WorldView] Failed fallback top countries/airports API.', {
              message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            });
            if (!mounted) return;
            // Preserve stale cached rows if available instead of blanking the table.
            if (!cachedTopRanks) {
              setTopRanks(null);
            }
          }
        } finally {
          if (mounted) {
            setTopRanksLoading(false);
          }
        }
      }

      if (shouldRefreshTopDestinations) {
        console.debug('[WorldView] calling dashboard-top-destinations', { cacheKey, queryOptions });
        try {
          const topDestinationsData = await runDrillDownRequest(
            `world:top-destinations:${cacheKey}`,
            () => getDashboardTopDestinations(queryOptions),
          );
          if (!mounted) return;
          setWorldTopDestinationsCache(cacheKey, topDestinationsData);
          setTopDestinations(topDestinationsData);
          console.debug('[WorldView] top destinations fetch success', {
            departures: topDestinationsData.departures.length,
            arrivals: topDestinationsData.arrivals.length,
          });
        } catch (error) {
          console.warn('[WorldView] Failed to load top destinations from API, falling back to mock data.', {
            status: (error as { status?: number }).status,
            statusText: (error as { statusText?: string }).statusText,
            message: error instanceof Error ? error.message : String(error),
          });
          if (!mounted) return;
          setTopDestinations(null);
        } finally {
          if (mounted) {
            setTopDestinationsLoading(false);
          }
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dateRange, presetPreloadState, rangePreset]);

  const fallbackTotalFlights = CONTINENTS.reduce((sum, continent) => sum + continent.flights, 0);
  const fallbackBusiestContinent = [...CONTINENTS].sort((a, b) => b.flights - a.flights)[0];
  const fallbackAvgPerDay = Math.round(fallbackTotalFlights / 4);
  const fallbackActiveAirports = BUSIEST_AIRPORTS.length;
  const fallbackChange = getChangeForMode(fallbackBusiestContinent, timeMode);
  const fallbackGrowthTone = growthDeltaTypeFromPct(fallbackChange.pct, timeMode);
  const fallbackDeltaLine = fmtWorldKpiDeltaTh(
    fallbackChange.pct,
    fallbackChange.num,
    timeMode,
  );
  const continentList: DashboardContinentCardResponse[] = summary
    ? summary.continentBreakdown.map((continent) => ({
        key: continent.key as DashboardContinentCardResponse['key'],
        label: continent.label,
        icon: continent.icon,
        airports: `${continent.airportCount.toLocaleString()} สนามบิน · ${continent.countryCount.toLocaleString()} ประเทศ`,
        airportCount: continent.airportCount,
        countryCount: continent.countryCount,
        routeCount: continent.routeCount,
        flights: continent.flights,
        previousFlights: continent.previousFlights,
        deltaFlights: continent.deltaFlights,
        deltaPercent: continent.deltaPercent,
        delta: `${continent.deltaFlights >= 0 ? '▲' : '▼'} ${continent.deltaFlights >= 0 ? '+' : ''}${continent.deltaFlights.toLocaleString()} (${continent.deltaPercent >= 0 ? '+' : ''}${continent.deltaPercent.toFixed(1)}%)`,
        highlight: summary.busiestContinent.key === continent.key,
        yoy: continent.deltaPercent,
        yoyN: continent.deltaFlights,
        mom: continent.deltaPercent,
        momN: continent.deltaFlights,
        wow: continent.deltaPercent,
        wowN: continent.deltaFlights,
      }))
    : CONTINENTS.map((continent) => ({
        key: continent.name as DashboardContinentCardResponse['key'],
        label: continent.name,
        icon: continent.icon,
        airports: continent.airports,
        airportCount: parseContinentAirportCount(continent.airports),
        countryCount: parseContinentCountryCount(continent.airports),
        routeCount: Math.max(1, Math.round(parseContinentAirportCount(continent.airports) * 2)),
        flights: continent.flights,
        previousFlights: 0,
        deltaFlights: continent.yoyN,
        deltaPercent: continent.yoy,
        delta: continent.delta,
        highlight: !!continent.highlight,
        yoy: continent.yoy,
        yoyN: continent.yoyN,
        mom: continent.mom,
        momN: continent.momN,
        wow: continent.wow,
        wowN: continent.wowN,
      }));
  const renderContinentList = continentList.filter((continent) => continent.key !== 'Other');

  const continentRankList = renderContinentList;

  const totalFlights = summary?.totalFlights ?? fallbackTotalFlights;
  const activeAirports = summary?.activeAirports ?? fallbackActiveAirports;
  const avgPerDay = summary?.averageFlightsPerDay ?? fallbackAvgPerDay;
  const currentPresetDays = dateRange?.from && dateRange?.to
    ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1
    : 1;
  const previousPresetDaysText = `${currentPresetDays} วันก่อนหน้า`;
  const topCountryRows = useMemo<TopCountryViewRow[]>(() => {
    return topRanks?.countries ?? [];
  }, [topRanks]);
  const topAirportRows = useMemo<TopAirportViewRow[]>(() => {
    return topRanks?.airports ?? [];
  }, [topRanks]);

  const kpis: KPIItem[] = summary
    ? [
        {
          label: 'เที่ยวบินทั้งหมด',
          value: totalFlights.toLocaleString(),
          delta: `ช่วงข้อมูล ${formatDateThai(summary.periodStart)} ถึง ${formatDateThai(summary.periodEnd)}`,
          deltaType: 'neutral',
          growthColored: false,
          accentColor: KPI_ACCENT.flights,
        },
        {
          label: 'สนามบินที่มีการใช้งาน',
          value: activeAirports.toLocaleString(),
          delta: 'สนามบินที่ปรากฏในช่วง ±15 วัน',
          deltaType: 'neutral',
          growthColored: false,
          accentColor: KPI_ACCENT.airports,
        },
        {
          label: 'เที่ยวบินเฉลี่ย/วัน',
          value: avgPerDay.toLocaleString(),
          delta: `คำนวณจาก ${dateRange?.from && dateRange?.to ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1 : 1} วัน`,
          deltaType: 'neutral',
          growthColored: false,
          accentColor: KPI_ACCENT.average,
        },
        {
          label: 'ทวีปที่มีปริมาณการบินหนาแน่นที่สุด',
          value: `${summary.busiestContinent.icon} ${summary.busiestContinent.label}`,
          delta: `${summary.busiestContinent.deltaFlights >= 0 ? '▲' : '▼'} ${summary.busiestContinent.deltaFlights >= 0 ? '+' : ''}${summary.busiestContinent.deltaFlights.toLocaleString()} flights · เทียบกับช่วง ${previousPresetDaysText}`,
          deltaType: summary.busiestContinent.deltaFlights >= 0 ? 'up' : 'down',
          accentColor: KPI_ACCENT.highlight,
        },
      ]
    : [
        {
          label: 'เที่ยวบินทั้งหมด',
          value: totalFlights.toLocaleString(),
          delta: fallbackDeltaLine,
          deltaType: fallbackGrowthTone,
          accentColor: KPI_ACCENT.flights,
        },
        {
          label: 'สนามบินที่มีการใช้งาน',
          value: activeAirports.toLocaleString(),
          delta: `จาก ${fallbackActiveAirports} สนามบินที่คึกคักที่สุด`,
          deltaType: 'neutral',
          growthColored: false,
          accentColor: KPI_ACCENT.airports,
        },
        {
          label: 'เที่ยวบินเฉลี่ย/วัน',
          value: avgPerDay.toLocaleString(),
          delta: '≈ คงที่',
          deltaType: 'neutral',
          growthColored: false,
          accentColor: KPI_ACCENT.average,
        },
        {
          label: 'ทวีปที่คึกคักที่สุด',
          value: `${fallbackBusiestContinent.icon} ${fallbackBusiestContinent.name}`,
          delta: `mock สำรอง · ${fallbackDeltaLine} · เทียบกับช่วง ${previousPresetDaysText}`,
          deltaType: fallbackGrowthTone,
          accentColor: KPI_ACCENT.highlight,
        },
      ];

  const mockFallbackStatusText = presetPreloadState === 'running'
    ? 'ยังใช้ mock สำรองอยู่ · กำลังเตรียม preload ทุก preset'
    : presetPreloadState === 'failed'
      ? 'ยังใช้ mock สำรองอยู่ · preload ไม่สำเร็จบางส่วน'
      : 'ยังใช้ mock สำรองอยู่';
  const summaryStatusText = loading
    ? 'กำลังโหลดข้อมูลจากฐานข้อมูล'
    : summary
      ? 'ดึงจากฐานข้อมูล'
      : mockFallbackStatusText;
  const summaryRangeText = isMounted
    ? durationMode && durationMode !== 'all'
      ? formatRangeLabelFromIso(buildPresetUtcQueryDates(durationMode as Exclude<RangePreset, 'all'>))
      : formatRangeLabel(dateRange)
    : 'กำลังเลือกช่วงวันที่';
  const activePresetLabel = durationMode ? RANGE_PRESET_LABELS[durationMode] : 'กำหนดเอง';
  const handleDrillToCountry = (row: TopCountryViewRow) => {
    const continentLabel = row.continentLabel || 'Other';
    const continentIcon = row.continentIcon || '🌐';
    drillTo('country', {
      continent: toContinentSelection(continentLabel, continentIcon) as any,
      country: toCountrySelection(row),
    });
  };
  const handleDrillToAirport = (row: TopAirportViewRow) => {
    const countryName = row.country?.trim() || 'Unknown';
    const continentLabel = row.continentLabel || 'Other';
    const continentIcon = row.continentIcon || '🌐';
    drillTo('airport', {
      continent: toContinentSelection(continentLabel, continentIcon) as any,
      country: {
        flag: '🌐',
        name: countryName,
        airports: 0,
        flights: row.flights,
        delta: '0.0%',
        deltaN: 0,
        bar: 0,
      },
      airport: toAirportSelection(row),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between ">
        <div className="min-w-0 w-full flex-1 flex items-center ">
          <h2 className="text-xl font-extrabold text-left px-3 py-4 sm:text-2xl sm:px-5 sm:py-5 lg:text-3xl lg:p-7">ภาพรวมเที่ยวบินทั่วโลก</h2>
          {/* <p className="text-sm text-muted-foreground">
            แสดงข้อมูลสำหรับ <strong>{summaryRangeText}</strong> {'\u00B7'} {summaryStatusText} {'\u00B7'} ช่วงปัจจุบัน: {activePresetLabel}
          </p> */}
        </div>
        <div className="min-w-0 w-full xl:w-auto xl:max-w-[48rem]">
          <Label className="mb-2 text-sm font-medium text-muted-foreground">ช่วงวันที่ (Start - End)</Label>
          <div className="flex min-h-[52px] max-w-full min-w-0 flex-wrap content-start items-end gap-2.5 border-b border-border/70 pb-1">
            <Button
              type="button"
              variant={durationMode === 'focus' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => selectPreset('focus')}
            >
              ± 15 วัน
            </Button>
            <Button
              type="button"
              variant={durationMode === '7' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => selectPreset('7')}
            >
              7 วัน
            </Button>
            <Button
              type="button"
              variant={durationMode === '30' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => selectPreset('30')}
            >
              30 วัน
            </Button>
            <Button
              type="button"
              variant={durationMode === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => selectPreset('all')}
            >
              ทั้งหมด
            </Button>
            <Popover open={isExtendedRangeOpen} onOpenChange={setIsExtendedRangeOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={durationMode === '90' || durationMode === '180' || durationMode === '365' ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 px-3.5 text-xs sm:text-sm"
                >
                  {durationMode === '90' ? 'ไตรมาสนี้' : durationMode === '180' ? '6 เดือน' : durationMode === '365' ? '1 ปี' : 'รอบเดือน'}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="start">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant={durationMode === '90' ? 'default' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => selectPreset('90')}
                  >
                    ไตรมาสนี้
                  </Button>
                  <Button
                    type="button"
                    variant={durationMode === '180' ? 'default' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => selectPreset('180')}
                  >
                    6 เดือน
                  </Button>
                  <Button
                    type="button"
                    variant={durationMode === '365' ? 'default' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => selectPreset('365')}
                  >
                    1 ปี
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <button
              type="button"
              className={cn(
                'inline-flex h-9 items-center gap-1 rounded-md border px-3.5 text-xs sm:text-sm font-medium leading-none transition-colors sm:ml-auto',
                showCustomDateRange
                  ? 'border-primary/20 bg-muted/30 text-foreground'
                  : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              onClick={() => handleCustomDateToggle(setShowCustomDateRange, setDurationMode, setDateError)}
            >
              <span>กำหนดเอง</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', showCustomDateRange && 'rotate-180')} />
            </button>
          </div>
          <div className="space-y-2 pt-0">
            <div
              className={cn(
                'overflow-hidden transition-all duration-300 ease-in-out',
                showCustomDateRange ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="grid w-full min-w-0 grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'min-w-0 justify-start text-left font-normal h-11 sm:h-12 bg-white border-gray-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/10 px-2.5 sm:px-3',
                        !dateRange?.from && 'text-muted-foreground',
                        dateError && !dateRange?.from && 'border-red-500 ring-1 ring-red-500/20'
                      )}
                    >
                      <span className="truncate">{dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : 'วันเริ่มต้น'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 flight-routes-accent" align="start">
                    <Calendar
                      mode="single"
                      month={fromCalendarMonth}
                      onMonthChange={setFromCalendarMonth}
                      selected={dateRange?.from}
                      captionLayout="label"
                      hideNavigation
                      startMonth={new Date(CALENDAR_YEAR_RANGE[0], 0, 1)}
                      endMonth={new Date(CALENDAR_YEAR_RANGE[CALENDAR_YEAR_RANGE.length - 1], 11, 1)}
                      components={{
                        MonthCaption: WorldCalendarCaption,
                      }}
                      onSelect={(date) => {
                        setDurationMode(null);
                        setDateError(false);
                        if (date) setFromCalendarMonth(date);
                        const prevTo = dateRange?.to;
                        const newTo = prevTo && date && prevTo < date ? date : prevTo;
                        const nextRange = { from: date, to: newTo };
                        setDateRange(nextRange);
                        if (date && newTo) {
                          setCustomDateRange({ from: date, to: newTo });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'min-w-0 justify-start text-left font-normal h-11 sm:h-12 bg-white border-gray-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/10 px-2.5 sm:px-3',
                        !dateRange?.to && 'text-muted-foreground'
                      )}
                    >
                      <span className="truncate">{dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : 'วันสิ้นสุด'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 flight-routes-accent" align="start">
                    <Calendar
                      mode="single"
                      month={toCalendarMonth}
                      onMonthChange={setToCalendarMonth}
                      selected={dateRange?.to}
                      captionLayout="label"
                      hideNavigation
                      startMonth={new Date(CALENDAR_YEAR_RANGE[0], 0, 1)}
                      endMonth={new Date(CALENDAR_YEAR_RANGE[CALENDAR_YEAR_RANGE.length - 1], 11, 1)}
                      components={{
                        MonthCaption: WorldCalendarCaption,
                      }}
                      onSelect={(date) => {
                        setDurationMode(null);
                        setDateError(false);
                        if (date) setToCalendarMonth(date);
                        const nextRange = { from: dateRange?.from, to: date };
                        setDateRange(nextRange);
                        if (dateRange?.from && date) {
                          setCustomDateRange({ from: dateRange.from, to: date });
                        }
                      }}
                      disabled={(date) => (dateRange?.from ? date < dateRange.from : false)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <WorldViewSkeleton />
      ) : (
        <>
          <KPIRow items={kpis} />

          {/* Continent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderContinentList.map((continent) => {
              const continentKey = continent.key as DashboardContinentCardResponse['key'];
              const isBusiest = continent.highlight || summary?.busiestContinent.key === continentKey;
              const continentName = continent.label;
              return (
                <button
                  key={continentKey}
                  type="button"
                  aria-label={`สำรวจ ${continentName}`}
                  onClick={() =>
                    drillTo('continent', {
                      continent: {
                        name: continentName,
                        icon: continent.icon,
                        airports: continent.airports,
                        flights: continent.flights,
                        delta: continent.delta,
                        highlight: isBusiest,
                        yoy: continent.deltaPercent,
                        yoyN: continent.deltaFlights,
                        mom: continent.deltaPercent,
                        momN: continent.deltaFlights,
                        wow: continent.deltaPercent,
                        wowN: continent.deltaFlights,
                      } as any,
                    })
                  }
                  className={`relative overflow-hidden bg-card border rounded-[10px] p-4 sm:p-6 text-left transition-all hover:border-primary hover:-translate-y-1 hover:shadow-lg cursor-pointer group ${
                    isBusiest ? 'border-primary' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-base sm:text-lg font-bold mb-1 sm:mb-1.5 truncate">{continentName}</div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <div className="text-xl sm:text-2xl font-bold text-primary">{continent.flights.toLocaleString()}</div>
                        <div className="text-[13px] sm:text-[15px] text-muted-foreground">เที่ยวบิน</div>
                      </div>
                      <div className="mt-2 text-[13px] sm:text-[14px] text-muted-foreground">
                        {(continent.airportCount || parseContinentAirportCount(continent.airports)).toLocaleString()} สนามบิน · {(continent.countryCount || parseContinentCountryCount(continent.airports)).toLocaleString()} ประเทศ
                      </div>
                    </div>
                    <div className="shrink-0 text-[32px] sm:text-[40px] ml-2" role="img" aria-hidden="true">
                      {continent.icon}
                    </div>
                  </div>
                  <div className="text-[13px] sm:text-[14px] text-primary mt-2 sm:mt-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {'\u25B6'} สำรวจ {continentName}
                  </div>
                </button>
              );
            })}
          </div>

          <section className={`grid grid-cols-1 gap-4 lg:grid-cols-[7fr_3fr] lg:items-stretch ${COUNTRY_RANK_PANEL_HEIGHT_CLASS}`}>
            <div className="order-2 lg:order-1 lg:h-full lg:min-h-0">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card">
                <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                  <div>
                    <h3 className="text-[16px] font-bold">ภาพรวมทวีป</h3>
                    {/* <p className="text-sm text-muted-foreground">เรียงลำดับจาก backend ตามช่วงวันที่ที่เลือก</p> */}
                    {/* <p className="mt-1 text-xs text-muted-foreground">
                      ชุดข้อมูล `Other` ยังเก็บไว้ใน summary สำหรับ debug mapping แต่จะไม่แสดงในตารางนี้
                    </p> */}
                  </div>
                  {/* <span className="text-sm text-muted-foreground">ข้อมูลจัดอันดับจาก backend</span> */}
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left font-bold text-muted-foreground">ทวีป</th>
                        <th className="px-4 py-3 text-right font-bold text-muted-foreground">เส้นทาง</th>
                        <th className="px-4 py-3 text-right font-bold text-muted-foreground">เที่ยวบิน</th>
                        <th className="px-4 py-3 text-right font-bold text-muted-foreground">เปลี่ยนแปลง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10">
                            <div className="flex items-center justify-center gap-3 text-muted-foreground">
                              <span className="h-5 w-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                              <span className="text-sm">กำลังโหลด rank ทวีป</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        continentRankList.map((continent) => {
                          const continentKey = continent.key as DashboardContinentCardResponse['key'];
                          const isBusiest = continent.highlight || summary?.busiestContinent.key === continentKey;
                          const deltaSign = continent.deltaPercent >= 0 ? '+' : '';
                          const deltaArrow = continent.deltaPercent >= 0 ? '▲' : '▼';
                          return (
                            <tr
                              key={continentKey}
                              className={`group cursor-pointer border-b border-border/60 last:border-b-0 transition-colors hover:bg-primary/[0.06] ${isBusiest ? 'bg-primary/[0.02]' : ''}`}
                              onClick={() =>
                                drillTo('continent', {
                                  continent: {
                                    name: continent.label,
                                    icon: continent.icon,
                                    airports: continent.airports,
                                    flights: continent.flights,
                                    delta: continent.delta,
                                    highlight: isBusiest,
                                    yoy: continent.deltaPercent,
                                    yoyN: continent.deltaFlights,
                                    mom: continent.deltaPercent,
                                    momN: continent.deltaFlights,
                                    wow: continent.deltaPercent,
                                    wowN: continent.deltaFlights,
                                  } as any,
                                })
                              }
                            >
                              <td className="relative px-4 py-3">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="text-base sm:text-lg" aria-hidden="true">{continent.icon}</span>
                                  <span className="truncate font-semibold text-foreground">{continent.label}</span>
                                </div>
                                <span
                                  role="tooltip"
                                  className="pointer-events-none absolute left-4 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-border opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                                >
                                  คลิกเพื่อดูรายละเอียดทวีปนี้
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">{(continent.routeCount ?? continent.airportCount).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right tabular-nums font-bold text-primary">{continent.flights.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${continent.deltaPercent >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                  <span aria-hidden="true">{deltaArrow}</span>
                                  <span>{deltaSign}{continent.deltaPercent.toFixed(1)}%</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:h-full lg:min-h-0">
              <CountryLookupPanel />
            </div>
          </section>

          {/* Airline Overview Panel */}
          <AirlineOverviewPanel />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopCountriesTable rows={topCountryRows} loading={topRanksLoading} onSelectCountry={handleDrillToCountry} />
            <TopAirportsTable rows={topAirportRows} loading={topRanksLoading} onSelectAirport={handleDrillToAirport} />
          </div>
          <TopDestinations data={topDestinations} loading={topDestinationsLoading} onSelectAirport={handleDrillToAirport} />
        </>
      )}
    </div>
  );
}

function formatDateThai(dateStr: string) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateStr}T00:00:00.000Z`));
}

function formatLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addUtcDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return formatUtcDate(d);
}

// Mirrors buildPresetDateRange() in statisticsController.ts — must stay in sync.
function buildPresetUtcQueryDates(preset: Exclude<RangePreset, 'all'>): { startDate: string; endDate: string } {
  const today = formatUtcDate(new Date());
  if (preset === 'focus') return { startDate: addUtcDays(today, -15), endDate: addUtcDays(today, 15) };
  if (preset === '7')     return { startDate: today,                  endDate: addUtcDays(today, 6) };
  if (preset === '30')    return { startDate: today,                  endDate: addUtcDays(today, 29) };
  if (preset === '90')    return { startDate: today,                  endDate: addUtcDays(today, 89) };
  if (preset === '180')   return { startDate: today,                  endDate: addUtcDays(today, 179) };
  return { startDate: today, endDate: addUtcDays(today, 364) }; // '365'
}

function renderRankDeltaPill(deltaFlights: number, deltaPercent: number) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${
        deltaPercent >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
      }`}
    >
      <span aria-hidden="true">{deltaFlights >= 0 ? '▲' : '▼'}</span>
      <span>{deltaFlights >= 0 ? '+' : ''}{deltaFlights.toLocaleString()}</span>
      <span>({deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)</span>
    </span>
  );
}

function flagFromCountryCode(code?: string | null) {
  const normalized = (code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return '🌐';
  }

  const first = normalized.codePointAt(0);
  const second = normalized.codePointAt(1);
  if (first == null || second == null) {
    return '🌐';
  }

  return String.fromCodePoint(0x1f1e6 + first - 65, 0x1f1e6 + second - 65);
}

function resolveCountryDisplayName(name: string, countryCode?: string | null) {
  const normalizedName = (name || '').trim();
  const normalizedCode = (countryCode || '').trim().toUpperCase();
  const alias = normalizedCode ? COUNTRY_DISPLAY_ALIASES[normalizedCode] : undefined;

  if (alias) {
    return alias;
  }

  const lookupCode = normalizedCode || (/^[A-Z0-9]{2,3}$/.test(normalizedName.toUpperCase()) ? normalizedName.toUpperCase() : '');
  if (lookupCode && COUNTRY_DISPLAY_NAMES) {
    const displayName = COUNTRY_DISPLAY_NAMES.of(lookupCode);
    if (displayName && displayName !== lookupCode) {
      return displayName;
    }
  }

  return normalizedName || normalizedCode || 'Unknown';
}

function toCountrySelection(row: TopCountryViewRow): CountryData {
  const displayName = resolveCountryDisplayName(row.name, row.countryCode);
  const fallback = COUNTRIES.find((country) => country.name.toLowerCase() === displayName.toLowerCase());
  return {
    flag: fallback?.flag || flagFromCountryCode(row.countryCode),
    name: displayName,
    countryCode: row.countryCode,
    airports: row.airportCount,
    flights: row.flights,
    delta: `${row.deltaPercent >= 0 ? '+' : ''}${row.deltaPercent.toFixed(1)}%`,
    deltaN: row.deltaFlights,
    bar: 100,
  };
}

function buildCountryDrillTarget(
  countryCode: string,
  countryName: string,
  continentLabel?: string,
  continentIcon?: string,
) {
  const displayName = resolveCountryDisplayName(countryName, countryCode);
  const resolvedContinentLabel = continentLabel || 'Other';
  const resolvedContinentIcon = continentIcon || '🌐';

  return {
    continent: toContinentSelection(resolvedContinentLabel, resolvedContinentIcon) as any,
    country: {
      flag: flagFromCountryCode(countryCode),
      name: displayName,
      countryCode,
      airports: 0,
      flights: 0,
      delta: '0.0%',
      deltaN: 0,
      bar: 0,
    },
  };
}

function toAirportSelection(row: TopAirportViewRow): AirportInfo {
  const airportName = row.airportName?.trim() || row.city?.trim() || row.iata;
  const displayName = row.city && row.city !== airportName ? `${airportName}, ${row.city}` : airportName;
  return {
    iata: row.iata,
    name: displayName,
    flights: row.flights,
    routes: Math.max(1, Math.round(row.flights / 12)),
    airlines: Math.max(1, Math.round(row.flights / 60)),
    color: 'var(--chart-1)',
  };
}

function toContinentSelection(label: string, icon = '🌐') {
  return {
    name: label,
    icon,
    airports: '0 สนามบิน · 0 ประเทศ',
    flights: 0,
    delta: '▲ +0 (0.0%)',
    highlight: false,
    yoy: 0,
    yoyN: 0,
    mom: 0,
    momN: 0,
    wow: 0,
    wowN: 0,
  };
}

function formatAirportDisplayName(name: string) {
  return name.replace(/\s+Airport$/i, '').trim();
}

function isCodeLikeQuery(query: string) {
  const compactQuery = query.replace(/\s+/g, '');
  return (
    compactQuery.length >= 2 &&
    compactQuery.length <= 3 &&
    compactQuery === compactQuery.toUpperCase() &&
    /^[A-Z0-9]+$/.test(compactQuery)
  );
}

function applyPresetRange(
  mode: RangePreset,
  setDateRange: (range: DateRange | undefined) => void,
  setDurationMode: (mode: RangePreset | null) => void,
  setFromCalendarMonth: (date: Date) => void,
  setToCalendarMonth: (date: Date) => void,
  setShowCustomDateRange: (show: boolean | ((prev: boolean) => boolean)) => void,
  setIsExtendedRangeOpen: (open: boolean) => void,
  setDateError: (error: boolean) => void,
  bounds?: Pick<DashboardDateBoundsResponse, 'minDate' | 'recommendedEndDate'> | null,
) {
  const range = buildPresetRange(mode, new Date(), bounds);

  if (!range) {
    setDateRange(undefined);
    setDurationMode(mode);
    setDateError(false);
    return;
  }

  const from = range.from || new Date();
  const to = range.to || from;

  setDateRange({ from, to });
  setFromCalendarMonth(from);
  setToCalendarMonth(to);
  setDurationMode(mode);
  setShowCustomDateRange(false);
  setIsExtendedRangeOpen(false);
  setDateError(false);
}

function handleCustomDateToggle(
  setShowCustomDateRange: (show: boolean | ((prev: boolean) => boolean)) => void,
  setDurationMode: (mode: RangePreset | null) => void,
  setDateError: (error: boolean) => void,
) {
  setShowCustomDateRange((prev) => !prev);
  setDurationMode(null);
  setDateError(false);
}

function WorldViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[126px] rounded-[10px] border border-border bg-card p-4 sm:p-6" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[160px] rounded-[10px] border border-border bg-card p-4 sm:p-6" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_2fr] gap-4">
        <div className="h-[340px] rounded-[10px] border border-border bg-card" />
        <div className="h-[340px] rounded-[10px] border border-border bg-card" />
      </div>

      <div className="h-[240px] rounded-[10px] border border-border bg-card" />
    </div>
  );
}

function TopCountriesTable({
  rows,
  loading,
  onSelectCountry,
}: {
  rows: TopCountryViewRow[];
  loading: boolean;
  onSelectCountry: (row: TopCountryViewRow) => void;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold flex items-center gap-2">
          5 อันดับประเทศที่มีเที่ยวบินมากที่สุดโลก
        </h3>
        {/* <span className="text-[13px] text-muted-foreground">Top 5</span> */}
      </div>
      <div className="bg-card border border-border rounded-[10px] overflow-hidden flex-1 min-w-0">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">#</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">ประเทศ</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">สนามบินที่ใช้งาน</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">เที่ยวบินทั้งหมด</th>
                <th className="text-[13px] tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">ความเปลี่ยนแปลง</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <span className="h-5 w-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                      <span className="text-sm">กำลังโหลด top ประเทศ</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    ไม่มีข้อมูลในช่วงวันที่ที่เลือก
                  </td>
                </tr>
              ) : (
                rows.map((country, index) => {
                  const displayName = resolveCountryDisplayName(country.name, country.countryCode);
                  return (
                    <tr key={`${country.name}-${country.countryCode ?? index}`} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
                      <td className="py-2.5 px-2.5 font-bold text-muted-foreground w-8 text-[14px] transition-colors">{index + 1}</td>
                      <td className="py-2.5 px-2.5">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectCountry(country)}
                            className="w-full cursor-pointer text-left"
                            aria-label={`ไปยังประเทศ ${displayName}`}
                            title="คลิกเพื่อไปยังหน้า Country"
                          >
                            <div className="text-[14px] font-extrabold tracking-wide text-primary hover:underline">
                              {country.countryCode?.toUpperCase() || '--'}
                            </div>
                            <div className="text-[14px] font-semibold text-foreground truncate hover:text-primary">
                              {displayName}
                            </div>
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right tabular-nums">{country.airportCount.toLocaleString()}</td>
                      <td className="py-2.5 px-2.5 text-right tabular-nums font-bold text-primary">{country.flights.toLocaleString()}</td>
                      <td className="py-2.5 px-2.5 text-right">
                        {renderRankDeltaPill(country.deltaFlights, country.deltaPercent)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TopAirportsTable({
  rows,
  loading,
  onSelectAirport,
}: {
  rows: TopAirportViewRow[];
  loading: boolean;
  onSelectAirport: (row: TopAirportViewRow) => void;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold flex items-center gap-2">
          5 อันดับสนามบินที่มีเที่ยวบินมากที่สุดในโลก
        </h3>
        {/* <span className="text-[13px] text-muted-foreground">Top 5</span> */}
      </div>
      <div className="bg-card border border-border rounded-[10px] overflow-hidden flex-1 min-w-0">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">#</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">Code</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">เมือง / ประเทศ</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">เที่ยวบินทั้งหมด</th>
                <th className="text-[13px] tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">ความเปลี่ยนแปลง</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <span className="h-5 w-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                      <span className="text-sm">กำลังโหลด top airport</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    ไม่มีข้อมูลในช่วงวันที่ที่เลือก
                  </td>
                </tr>
              ) : (
                rows.map((airport, index) => (
                  <tr key={airport.iata} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
                    <td className="py-2.5 px-2.5 font-bold text-muted-foreground w-8 text-[14px] transition-colors">{index + 1}</td>
                    <td className="py-2.5 px-2.5">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectAirport(airport)}
                          className="w-full cursor-pointer text-left"
                          aria-label={`ไปยังสนามบิน ${airport.iata}`}
                          title="คลิกเพื่อไปยังหน้า Airport"
                        >
                          <div className="text-[14px] font-extrabold tracking-wide text-primary hover:underline">{airport.iata}</div>
                          <div className="text-[14px] font-semibold text-foreground truncate hover:text-primary">
                            {formatAirportDisplayName(airport.airportName)}
                          </div>
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <div className="font-medium truncate">{airport.city}</div>
                      <div className="text-[13px] text-muted-foreground truncate">{airport.country}</div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold tabular-nums text-primary">{airport.flights.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-right">
                      {renderRankDeltaPill(airport.deltaFlights, airport.deltaPercent)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TopDestinations({
  data,
  loading,
  onSelectAirport,
}: {
  data: DashboardTopDestinationsResponse | null;
  loading: boolean;
  onSelectAirport: (row: TopAirportViewRow) => void;
}) {
  const { timeMode } = useDrillDown();

  const departureRows = useMemo<TopAirportViewRow[]>(() => {
    return data?.departures ?? [];
  }, [data]);

  const arrivalRows = useMemo<TopAirportViewRow[]>(() => {
    return data?.arrivals ?? [];
  }, [data]);

  const renderDestRows = (items: TopAirportViewRow[]) =>
    items.map((destination, index) => {
      return (
        <tr key={destination.iata} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
          <td className="py-2.5 px-2.5 font-bold text-muted-foreground w-8 text-[14px] transition-colors">
            {index + 1}
          </td>
          <td className="py-2.5 px-2.5">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onSelectAirport(destination)}
                className="w-full cursor-pointer text-left"
                aria-label={`ไปยังสนามบิน ${destination.iata}`}
                title="คลิกเพื่อไปยังหน้า Airport"
              >
                <div className="text-[14px] font-extrabold tracking-wide text-primary hover:underline">{destination.iata}</div>
                <div className="text-[14px] font-semibold text-foreground truncate hover:text-primary">{destination.airportName}</div>
              </button>
            </div>
          </td>
          <td className="py-2.5 px-2.5 text-right font-bold tabular-nums text-primary">
            {destination.flights.toLocaleString()}
          </td>
          <td className="py-2.5 px-2.5 text-right">
            <ChangePill pct={destination.deltaPercent} num={destination.deltaFlights} active timeMode={timeMode} />
          </td>
        </tr>
      );
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[16px] font-bold"> 5 อันดับจุดหมายปลายทาง - ขาออก vs ขาเข้า</h3>
        <span className="text-[14px] text-muted-foreground">
          {/* สนามบินที่ให้บริการมากที่สุดทั่วโลก {'\u00B7'} {modeLabel(timeMode)} */}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-card border border-border rounded-[10px] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <span className="text-[14px] font-bold py-0.5 px-2.5 rounded-full bg-primary/15 text-primary">{'↑'} ขาออก</span>
            {/* <span className="text-[16px] font-bold">5 อันดับจุดหมายขาออก</span> */}
          </div>
          <div className="overflow-x-auto min-w-0">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">#</th>
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">จุดหมาย</th>
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">เที่ยวบินทั้งหมด</th>
                  <th className="text-[13px] tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">ความเปลี่ยนแปลง</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      กำลังโหลด top ขาออก
                    </td>
                  </tr>
                ) : (
                  renderDestRows(departureRows)
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[10px] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <span className="text-[14px] font-bold py-0.5 px-2.5 rounded-full bg-accent/10 text-accent">{'↓'} ขาเข้า</span>
            {/* <span className="text-[16px] font-bold">5 อันดับจุดหมายขาเข้า</span> */}
          </div>
          <div className="overflow-x-auto min-w-0">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">#</th>
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">จุดหมาย</th>
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">เที่ยวบินทั้งหมด</th>
                  <th className="text-[13px] tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">ความเปลี่ยนแปลง</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      กำลังโหลด top ขาเข้า
                    </td>
                  </tr>
                ) : (
                  renderDestRows(arrivalRows)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function CountryLookupPanel() {
  const { drillTo } = useDrillDown();
  const [airportCountries, setAirportCountries] = useState<AirportCountrySummary[]>(() => getCachedAirportCountries() ?? []);
  const [loading, setLoading] = useState(() => getCachedAirportCountries() === null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const cachedCountries = getCachedAirportCountries();

    if (cachedCountries) {
      setAirportCountries(cachedCountries);
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    const loadCountries = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await airportApi.getAirportCountries();
        if (!alive) return;
        setCachedAirportCountries(response.airportCountries ?? []);
        setAirportCountries(response.airportCountries ?? []);
      } catch (err) {
        if (!alive) return;
        const message = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายชื่อประเทศได้';
        setError(message);
        setAirportCountries([]);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void loadCountries();

    return () => {
      alive = false;
    };
  }, []);

  const visibleCountries = useMemo(() => {
    const normalizedQuery = query.trim();
    const rows = [...airportCountries].sort((a, b) => a.country.localeCompare(b.country, 'en', { sensitivity: 'base' }));

    if (!normalizedQuery) {
      return rows;
    }

    const compactQuery = normalizedQuery.replace(/\s+/g, '');
    const codeSearch = isCodeLikeQuery(normalizedQuery);

    return rows.filter((country) => {
      const code = (country.country_code || '').toUpperCase();
      const name = country.country.toLowerCase();

      if (codeSearch) {
        return code.includes(compactQuery.toUpperCase());
      }

      return name.includes(normalizedQuery.toLowerCase());
    });
  }, [airportCountries, query]);

  const mixedRows = useMemo<CountryLookupRow[]>(
    () =>
      visibleCountries.map((country) => ({
        ...country,
        code: (country.country_code || '--').toUpperCase(),
        displayName: resolveCountryDisplayName(country.country, country.country_code),
        key: `${country.country_code ?? 'xx'}-${country.country}`,
      })),
    [visibleCountries],
  );

  const isLoading = loading;

  return (
    <div className="flex h-[300px] min-h-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card sm:h-[360px] lg:h-full">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold">รายชื่อประเทศ</h3>
          <p className="text-sm text-muted-foreground">ค้นหาด้วย code หรือชื่อประเทศ</p>
        </div>
        <span className="text-sm text-muted-foreground">
          {isLoading ? 'กำลังโหลด' : `${visibleCountries.length.toLocaleString()} รายการ`}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col space-y-3 px-4 py-4 sm:px-5">
        <label className="block">
          <span className="sr-only">ค้นหาประเทศ</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหา code หรือชื่อประเทศ"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </label>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/70">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2.5 text-left text-[13px] font-bold text-muted-foreground">Code</th>
                <th className="px-3 py-2.5 text-left text-[13px] font-bold text-muted-foreground">รายการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={2} className="px-4 py-10">
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <span className="h-5 w-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                      <span className="text-sm">กำลังโหลดรายชื่อประเทศ</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {error}
                  </td>
                </tr>
              ) : mixedRows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    ไม่พบประเทศที่ค้นหา
                  </td>
                </tr>
              ) : (
                mixedRows.map((row) => (
                  <tr key={row.key} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
                    <td className="px-3 py-2.5 align-top">
                      <button
                        type="button"
                        className="w-full cursor-pointer text-left"
                        onClick={() => drillTo('country', buildCountryDrillTarget(row.code, row.displayName, row.continent_label, row.continent_icon))}
                        aria-label={`ไปยังประเทศ ${row.displayName}`}
                        title="คลิกเพื่อไปยังหน้า Country"
                      >
                        <div className="text-[14px] font-extrabold tracking-wide text-primary hover:underline">{row.code}</div>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <button
                        type="button"
                        className="w-full cursor-pointer text-left"
                        onClick={() => drillTo('country', buildCountryDrillTarget(row.code, row.displayName, row.continent_label, row.continent_icon))}
                        aria-label={`ไปยังประเทศ ${row.displayName}`}
                        title="คลิกเพื่อไปยังหน้า Country"
                      >
                        <div className="text-[14px] font-semibold text-foreground hover:text-primary">{row.displayName}</div>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
