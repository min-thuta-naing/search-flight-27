'use client';

import { useEffect, useMemo, useState } from 'react';
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
  parsePercentFromDelta,
  WORLD_TOP_ARR,
  WORLD_TOP_DEP,
} from '@/lib/dashboard/drill-down-data';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import {
  statisticsApi,
  type DashboardSummaryResponse,
  type DashboardContinentCardResponse,
  type DashboardTopRanksResponse,
  type DashboardTopDestinationsResponse,
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
import { cn } from '@/lib/utils';

type RankSortKey = 'label' | 'routeCount' | 'flights' | 'deltaPercent';

const COUNTRY_RANK_PANEL_HEIGHT_CLASS = 'xl:h-[540px]';

type TopCountryViewRow = {
  countryCode: string | null;
  name: string;
  flag?: string;
  airportCount: number;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
};

type TopAirportViewRow = {
  iata: string;
  airportName: string;
  city: string;
  country: string;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
};

const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  focus: '± 15 วัน',
  '7': '7 วัน',
  '30': '30 วัน',
  all: 'ทั้งหมด',
  '90': 'ไตรมาสนี้',
  '180': '6 เดือน',
  '365': '1 ปี',
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

function buildPresetRange(mode: RangePreset, baseDate = new Date()): DateRange {
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

  return { from: subDays(baseDate, 3650), to: baseDate };
}

function formatRangeLabel(range?: DateRange) {
  if (!range?.from) {
    return 'กำลังเลือกช่วงวันที่';
  }

  const from = format(range.from, 'dd/MM/yyyy');
  const to = format(range.to || range.from, 'dd/MM/yyyy');
  return `${from} – ${to}`;
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
  const { drillTo, timeMode, rangePreset, setRangePreset } = useDrillDown();
  const initialPresetRange = useMemo(() => buildPresetRange(rangePreset), [rangePreset]);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => initialPresetRange);
  const [durationMode, setDurationMode] = useState<RangePreset | null>(rangePreset);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [isExtendedRangeOpen, setIsExtendedRangeOpen] = useState(false);
  const [fromCalendarMonth, setFromCalendarMonth] = useState(() => initialPresetRange.from || new Date());
  const [toCalendarMonth, setToCalendarMonth] = useState(() => initialPresetRange.to || initialPresetRange.from || new Date());
  const [dateError, setDateError] = useState(false);
  const [rankSortKey, setRankSortKey] = useState<RankSortKey>('flights');
  const [rankSortDirection, setRankSortDirection] = useState<'asc' | 'desc'>('desc');
  const [topRanks, setTopRanks] = useState<DashboardTopRanksResponse | null>(null);
  const [topRanksLoading, setTopRanksLoading] = useState(true);
  const [topDestinations, setTopDestinations] = useState<DashboardTopDestinationsResponse | null>(null);
  const [topDestinationsLoading, setTopDestinationsLoading] = useState(true);
  const selectPreset = (mode: RangePreset) => {
    setRangePreset(mode);
  };

  useEffect(() => {
    applyPresetRange(
      rangePreset,
      setDateRange,
      setDurationMode,
      setFromCalendarMonth,
      setToCalendarMonth,
      setShowCustomDateRange,
      setIsExtendedRangeOpen,
      setDateError,
    );
  }, [rangePreset]);

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

    const startDate = formatLocalDateInput(dateRange.from);
    const endDate = formatLocalDateInput(dateRange.to || dateRange.from);
    const cacheKey = `${startDate}__${endDate}`;
    const summaryCacheState = getWorldSummaryCacheState(cacheKey);
    const topRanksCacheState = getWorldTopRanksCacheState(cacheKey);
    const topDestinationsCacheState = getWorldTopDestinationsCacheState(cacheKey);
    const cachedSummary = summaryCacheState.value;
    const cachedTopRanks = topRanksCacheState.value;
    const cachedTopDestinations = topDestinationsCacheState.value;
    const shouldRefreshSummary = !cachedSummary || summaryCacheState.stale;
    const shouldRefreshTopRanks = !cachedTopRanks || topRanksCacheState.stale;
    const shouldRefreshTopDestinations = !cachedTopDestinations || topDestinationsCacheState.stale;

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
        console.debug('[WorldView] calling dashboard-summary', { startDate, endDate });
        try {
          const summaryData = await runDrillDownRequest(
            `world:summary:${cacheKey}`,
            () => statisticsApi.getDashboardSummary({ startDate, endDate }),
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
        console.debug('[WorldView] calling dashboard-top-ranks', { startDate, endDate });
        try {
          const topRanksData = await runDrillDownRequest(
            `world:top-ranks:${cacheKey}`,
            () => statisticsApi.getDashboardTopRanks({ startDate, endDate }),
          );
          if (!mounted) return;
          setWorldTopRanksCache(cacheKey, topRanksData);
          setTopRanks(topRanksData);
          console.debug('[WorldView] top ranks fetch success', {
            countries: topRanksData.countries.length,
            airports: topRanksData.airports.length,
          });
        } catch (error) {
          console.warn('[WorldView] Failed to load top ranks from API, falling back to mock data.', {
            status: (error as { status?: number }).status,
            statusText: (error as { statusText?: string }).statusText,
            message: error instanceof Error ? error.message : String(error),
          });
          if (!mounted) return;
          setTopRanks(null);
        } finally {
          if (mounted) {
            setTopRanksLoading(false);
          }
        }
      }

      if (shouldRefreshTopDestinations) {
        console.debug('[WorldView] calling dashboard-top-destinations', { startDate, endDate });
        try {
          const topDestinationsData = await runDrillDownRequest(
            `world:top-destinations:${cacheKey}`,
            () => statisticsApi.getDashboardTopDestinations({ startDate, endDate }),
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
  }, [dateRange]);

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

  const continentRankList = useMemo(() => {
    const direction = rankSortDirection === 'asc' ? 1 : -1;

    return [...renderContinentList].sort((a, b) => {
      if (rankSortKey === 'label') {
        return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }) * direction;
      }

      if (rankSortKey === 'routeCount') {
        return ((a.routeCount ?? 0) - (b.routeCount ?? 0)) * direction;
      }

      if (rankSortKey === 'deltaPercent') {
        return (a.deltaPercent - b.deltaPercent) * direction;
      }

      return (a.flights - b.flights || (a.routeCount ?? 0) - (b.routeCount ?? 0)) * direction;
    });
  }, [rankSortDirection, rankSortKey, renderContinentList]);

  const handleRankSort = (key: RankSortKey) => {
    setRankSortKey((currentKey) => {
      if (currentKey === key) {
        setRankSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
        return currentKey;
      }

      setRankSortDirection(key === 'label' ? 'asc' : 'desc');
      return key;
    });
  };

  const totalFlights = summary?.totalFlights ?? fallbackTotalFlights;
  const activeAirports = summary?.activeAirports ?? fallbackActiveAirports;
  const avgPerDay = summary?.averageFlightsPerDay ?? fallbackAvgPerDay;
  const currentPresetDays = dateRange?.from && dateRange?.to
    ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1
    : 1;
  const previousPresetDaysText = `${currentPresetDays} วันก่อนหน้า`;
  const topCountryRows = useMemo<TopCountryViewRow[]>(() => {
    if (topRanks?.countries?.length) {
      return topRanks.countries;
    }

    return [...COUNTRIES]
      .sort((a, b) => b.flights - a.flights)
      .slice(0, 5)
      .map((country) => ({
        countryCode: null as string | null,
        name: country.name,
        flag: country.flag,
        airportCount: country.airports,
        flights: country.flights,
        previousFlights: Math.max(country.flights - country.deltaN, 0),
        deltaFlights: country.deltaN,
        deltaPercent: parsePercentFromDelta(country.delta) ?? 0,
      }));
  }, [topRanks]);
  const topAirportRows = useMemo<TopAirportViewRow[]>(() => {
    if (topRanks?.airports?.length) {
      return topRanks.airports;
    }

      return [...BUSIEST_AIRPORTS]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((airport) => ({
        iata: airport.iata,
        airportName: airport.city,
        city: airport.city,
        country: airport.country,
        flights: airport.total,
        previousFlights: Math.max(airport.total - airport.yoyN, 0),
        deltaFlights: airport.yoyN,
        deltaPercent: airport.yoy,
      }));
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

  const summaryStatusText = loading
    ? 'กำลังโหลดข้อมูลจากฐานข้อมูล'
    : summary
      ? 'ดึงจากฐานข้อมูล'
      : 'ยังใช้ mock สำรองอยู่';
  const summaryRangeText = formatRangeLabel(dateRange);
  const activePresetLabel = durationMode ? RANGE_PRESET_LABELS[durationMode] : 'กำหนดเอง';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 w-full flex-1">
          <h2 className="text-xl font-bold mb-1">ภาพรวมเที่ยวบินทั่วโลก</h2>
          <p className="text-sm text-muted-foreground">
            แสดงข้อมูลสำหรับ <strong>{summaryRangeText}</strong> {'\u00B7'} {summaryStatusText} {'\u00B7'} ช่วงปัจจุบัน: {activePresetLabel}
          </p>
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
                'inline-flex h-9 items-center gap-1 rounded-md border px-3.5 text-xs sm:text-sm font-medium leading-none transition-colors',
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
                        setDateRange((prev) => ({
                          from: date,
                          to: prev?.to && date && prev.to < date ? date : prev?.to,
                        }));
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
                        setDateRange((prev) => ({ from: prev?.from, to: date }));
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

          <section className={`grid grid-cols-1 gap-4 xl:grid-cols-[7fr_3fr] xl:items-stretch ${COUNTRY_RANK_PANEL_HEIGHT_CLASS}`}>
            <div className="order-2 xl:order-1 xl:h-full xl:min-h-0">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card">
                <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                  <div>
                    <h3 className="text-[16px] font-bold">ภาพรวมทวีป</h3>
                    <p className="text-sm text-muted-foreground">
                      เรียงลำดับตามชื่อทวีป, จำนวนเส้นทางการบิน, เที่ยวบินทั้งหมด หรือ KPI จากช่วงวันที่ที่เลือก
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ชุดข้อมูล `Other` ยังเก็บไว้ใน summary สำหรับ debug mapping แต่จะไม่แสดงในตารางนี้
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">คลิกหัวตารางเพื่อ sort</span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left font-bold text-muted-foreground">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={() => handleRankSort('label')}
                          >
                            <span>ชื่อทวีป</span>
                            <span aria-hidden="true">{rankSortKey === 'label' ? (rankSortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-bold text-muted-foreground">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={() => handleRankSort('routeCount')}
                          >
                            <span>จำนวนเส้นทางการบิน</span>
                            <span aria-hidden="true">{rankSortKey === 'routeCount' ? (rankSortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-bold text-muted-foreground">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={() => handleRankSort('flights')}
                          >
                            <span>เที่ยวบินทั้งหมด</span>
                            <span aria-hidden="true">{rankSortKey === 'flights' ? (rankSortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-bold text-muted-foreground">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={() => handleRankSort('deltaPercent')}
                          >
                            <span>ความเปลี่ยนแปลงจากช่วงที่เลือก</span>
                            <span aria-hidden="true">{rankSortKey === 'deltaPercent' ? (rankSortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                          </button>
                        </th>
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
                              className={`border-b border-border/60 last:border-b-0 transition-colors hover:bg-primary/[0.03] ${isBusiest ? 'bg-primary/[0.02]' : ''}`}
                            >
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  className="flex min-w-0 items-center gap-2 text-left"
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
                                  <span className="text-base sm:text-lg" aria-hidden="true">{continent.icon}</span>
                                  <span className="truncate font-semibold text-foreground">{continent.label}</span>
                                </button>
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
            <div className="order-1 xl:order-2 xl:h-full xl:min-h-0">
              <CountryLookupPanel />
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[2fr_2fr] gap-4">
            <TopCountriesTable rows={topCountryRows} loading={topRanksLoading} />
            <TopAirportsTable rows={topAirportRows} loading={topRanksLoading} />
          </div>
          <TopDestinations data={topDestinations} loading={topDestinationsLoading} />
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
) {
  const range = buildPresetRange(mode);
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

function TopCountriesTable({ rows, loading }: { rows: TopCountryViewRow[]; loading: boolean }) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold flex items-center gap-2">
          {'\u{1F310}'} Top ประเทศ
        </h3>
        <span className="text-[13px] text-muted-foreground">Top 5</span>
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
                <th className="text-[13px] tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">KPI เปลี่ยนแปลง</th>
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
                  return (
                    <tr key={`${country.name}-${country.countryCode ?? index}`} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
                      <td className="py-2.5 px-2.5 font-bold text-muted-foreground w-8 text-[14px] transition-colors">{index + 1}</td>
                      <td className="py-2.5 px-2.5">
                        <div className="min-w-0">
                          <div className="text-[14px] font-extrabold tracking-wide text-primary">
                            {country.countryCode?.toUpperCase() || '--'}
                          </div>
                          <div className="text-[14px] font-semibold text-foreground truncate">
                            {country.name}
                          </div>
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

function TopAirportsTable({ rows, loading }: { rows: TopAirportViewRow[]; loading: boolean }) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold flex items-center gap-2">
          {'\u2708\ufe0f'} Top
        </h3>
        <span className="text-[13px] text-muted-foreground">Top 5</span>
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
                <th className="text-[13px] tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">KPI เปลี่ยนแปลง</th>
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
                        <div className="text-[14px] font-extrabold tracking-wide text-primary">{airport.iata}</div>
                        <div className="text-[14px] font-semibold text-foreground truncate">
                          {formatAirportDisplayName(airport.airportName)}
                        </div>
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
}: {
  data: DashboardTopDestinationsResponse | null;
  loading: boolean;
}) {
  const { timeMode } = useDrillDown();

  const departureRows = useMemo<TopAirportViewRow[]>(() => {
    if (data?.departures?.length) {
      return data.departures;
    }

    return WORLD_TOP_DEP.map((destination) => ({
      iata: destination.iata,
      airportName: destination.name,
      city: destination.name,
      country: '',
      flights: destination.flights,
      previousFlights: Math.max(destination.flights - destination.yoyN, 0),
      deltaFlights: destination.yoyN,
      deltaPercent: destination.yoy,
    }));
  }, [data]);

  const arrivalRows = useMemo<TopAirportViewRow[]>(() => {
    if (data?.arrivals?.length) {
      return data.arrivals;
    }

    return WORLD_TOP_ARR.map((destination) => ({
      iata: destination.iata,
      airportName: destination.name,
      city: destination.name,
      country: '',
      flights: destination.flights,
      previousFlights: Math.max(destination.flights - destination.yoyN, 0),
      deltaFlights: destination.yoyN,
      deltaPercent: destination.yoy,
    }));
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
              <div className="text-[14px] font-extrabold tracking-wide text-primary">{destination.iata}</div>
              <div className="text-[14px] font-semibold text-foreground truncate">{destination.airportName}</div>
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
        <h3 className="text-[16px] font-bold">{'🛫🛬'} 5 อันดับจุดหมายปลายทาง - ขาออก vs ขาเข้า</h3>
        <span className="text-[14px] text-muted-foreground">
          สนามบินที่ให้บริการมากที่สุดทั่วโลก {'\u00B7'} {modeLabel(timeMode)}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-card border border-border rounded-[10px] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <span className="text-[14px] font-bold py-0.5 px-2.5 rounded-full bg-primary/15 text-primary">{'↑'} ขาออก</span>
            <span className="text-[16px] font-bold">5 อันดับจุดหมายขาออก</span>
          </div>
          <div className="overflow-x-auto min-w-0">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">#</th>
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">จุดหมาย</th>
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">เที่ยวบินทั้งหมด</th>
                  <th className="text-[13px] tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">KPI เปลี่ยนแปลง</th>
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
            <span className="text-[16px] font-bold">5 อันดับจุดหมายขาเข้า</span>
          </div>
          <div className="overflow-x-auto min-w-0">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">#</th>
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">จุดหมาย</th>
                  <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">เที่ยวบินทั้งหมด</th>
                  <th className="text-[13px] tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">KPI เปลี่ยนแปลง</th>
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
  const [countries, setCountries] = useState<AirportCountrySummary[]>(() => getCachedAirportCountries() ?? []);
  const [loading, setLoading] = useState(() => getCachedAirportCountries() === null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const cachedCountries = getCachedAirportCountries();

    if (cachedCountries) {
      setCountries(cachedCountries);
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
        setCachedAirportCountries(response.countries ?? []);
        setCountries(response.countries ?? []);
      } catch (err) {
        if (!alive) return;
        const message = err instanceof Error ? err.message : 'ไม่สามารถโหลดรายชื่อประเทศได้';
        setError(message);
        setCountries([]);
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
    const rows = [...countries].sort((a, b) => a.country.localeCompare(b.country, 'en', { sensitivity: 'base' }));

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
  }, [countries, query]);

  const mixedRows = useMemo(
    () =>
      visibleCountries.map((country) => ({
        code: (country.country_code || '--').toUpperCase(),
        name: country.country,
        key: `${country.country_code ?? 'xx'}-${country.country}`,
      })),
    [visibleCountries],
  );

  const isLoading = loading;

  return (
    <div className="flex h-[300px] min-h-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card sm:h-[320px] xl:h-full">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold">รายชื่อประเทศ</h3>
          <p className="text-sm text-muted-foreground">ค้นหาด้วย code หรือชื่อประเทศจากข้อมูลที่มีอยู่ในระบบ</p>
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
                      <div className="text-[14px] font-extrabold tracking-wide text-primary">{row.code}</div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="text-[14px] font-semibold text-foreground">{row.name}</div>
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
