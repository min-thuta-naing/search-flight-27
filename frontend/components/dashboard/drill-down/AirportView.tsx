'use client';

import { useEffect, useMemo, useState, useId } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';
import { type MonthCaptionProps, useDayPicker } from 'react-day-picker';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceDot,
} from 'recharts';
import {
  MK_AIRPORTS,
  calcInvestScore,
  getInvestTier,
  growthCardBadgeClasses,
  growthDeltaTypeFromPct,
  growthPillSurfaceClasses,
  parsePercentFromDelta,
} from '@/lib/dashboard/drill-down-data';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import { getAirportDetail, getAirportOverview, getAirportTrends } from '@/lib/dashboard/services/drilldown';
import { runDrillDownRequest } from '@/lib/dashboard/drill-down-cache';
import { FlightRoutesChart } from '@/components/flight-routes-chart';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDrillDown, KPIRow, BackButton } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import type { RangePreset } from './DrillDownDashboard';
import type { TimeMode } from '@/types/dashboard';
import type { DashboardAirportOverviewResponse } from '@/lib/api/statistics-api';
import type { AirportTrendSeries } from '@/lib/dashboard/services/drilldown';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

type AirportDetail = ReturnType<typeof getAirportDetail>;

function resolveAirportWindowDays(preset: RangePreset) {
  if (preset === 'focus') return 15;
  if (preset === '7') return 7;
  if (preset === '30') return 30;
  if (preset === '90') return 90;
  if (preset === '180') return 180;
  if (preset === '365') return 365;
  return 3650;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatSignedFlights(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toLocaleString()}`;
}

function hasCompleteAirportTrendPreload(detail: Pick<AirportDetail, 'daily' | 'monthly' | 'monthLabels'>) {
  const monthlyReady = detail.monthly.length === 12 && detail.monthly.every((value) => Number.isFinite(Number(value)));
  const labelsReady = detail.monthLabels.length === 12;
  const dailyReady = detail.daily.length >= 28 && detail.daily.every((row) => Number.isFinite(Number(row.flights)));
  return monthlyReady && labelsReady && dailyReady;
}

const AIRPORT_PRESET_LABELS: Record<RangePreset, string> = {
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

function AirportCalendarCaption({
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
  if (mode === 'focus') return { from: subDays(baseDate, 15), to: addDays(baseDate, 15) };
  if (mode === '7') return { from: subDays(baseDate, 6), to: baseDate };
  if (mode === '30') return { from: subDays(baseDate, 29), to: baseDate };
  if (mode === '90') return { from: subDays(baseDate, 89), to: baseDate };
  if (mode === '180') return { from: subDays(baseDate, 179), to: baseDate };
  if (mode === '365') return { from: subDays(baseDate, 364), to: baseDate };
  return { from: subDays(baseDate, 365), to: baseDate };
}

function toDateKey(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function AirportView() {
  const { drillTo, timeMode, rangePreset, setRangePreset, selections } = useDrillDown();
  const airport = selections.airport || MK_AIRPORTS[0];
  const [airportOverview, setAirportOverview] = useState<DashboardAirportOverviewResponse | null>(null);
  const [airportTrend, setAirportTrend] = useState<AirportTrendSeries | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [kpiReloadKey, setKpiReloadKey] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [durationMode, setDurationMode] = useState<RangePreset | null>(rangePreset);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [isExtendedRangeOpen, setIsExtendedRangeOpen] = useState(false);
  const [fromCalendarMonth, setFromCalendarMonth] = useState(() => new Date());
  const [toCalendarMonth, setToCalendarMonth] = useState(() => new Date());
  const [dateError, setDateError] = useState(false);

  // Fetch per selected airport — currently returns the same mock data
  // but the architecture is ready for a per-airport API lookup.
  const detail = getAirportDetail(airport.iata);
  const trendPreloadComplete = hasCompleteAirportTrendPreload(detail);

  useEffect(() => {
    let active = true;
    if (trendPreloadComplete) {
      setAirportTrend(null);
      return () => {
        active = false;
      };
    }

    const cacheKey = `airport:trend:v1:${airport.iata}`;
    void (async () => {
      try {
        const payload = await runDrillDownRequest<AirportTrendSeries>(cacheKey, () =>
          getAirportTrends(airport.iata)
        );
        if (!active) return;
        setAirportTrend(payload);
      } catch {
        if (!active) return;
        setAirportTrend(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [airport.iata, trendPreloadComplete]);

  useEffect(() => {
    let active = true;
    const windowDays = resolveAirportWindowDays(rangePreset);
    const cacheKey = `airport:kpi:v4:${airport.iata}:preset:${rangePreset}:window:${windowDays}`;

    void (async () => {
      setKpiError(null);
      setKpiLoading(true);
      try {
        const payload = await runDrillDownRequest<DashboardAirportOverviewResponse>(cacheKey, () =>
          getAirportOverview(airport.iata, { windowDays })
        );
        if (!active) return;
        setAirportOverview(payload);
      } catch (error) {
        if (!active) return;
        setAirportOverview(null);
        setKpiError(error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูล KPI สนามบินได้');
      } finally {
        if (active) {
          setKpiLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [airport.iata, rangePreset, kpiReloadKey]);

  const countryForTone = selections.country;
  const countryPct = countryForTone ? parsePercentFromDelta(countryForTone.delta) : null;
  const countryTone =
    countryPct != null
      ? growthDeltaTypeFromPct(countryPct, timeMode)
      : countryForTone && countryForTone.deltaN < 0
        ? 'down'
        : 'neutral';

  const presetLabel = AIRPORT_PRESET_LABELS[rangePreset] ?? AIRPORT_PRESET_LABELS.focus;
  const baseAirportFlights = Math.max(1, Number(airport.flights) || 1);
  const activeAirportFlights = airportOverview?.totals.flights ?? (Number(airport.flights) || 0);
  const presetScale = useMemo(() => {
    const ratio = activeAirportFlights / baseAirportFlights;
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return 1;
    }
    return Math.max(0.1, Math.min(ratio, 50));
  }, [activeAirportFlights, baseAirportFlights]);

  const kpis: KPIItem[] = useMemo(() => {
    if (!airportOverview) {
      return [];
    }

    const totals = airportOverview.totals;
    const totalTone = totals.deltaFlights < 0 ? 'down' : totals.deltaFlights > 0 ? 'up' : 'neutral';
    const averageFlightsPerDay = totals.daysInPeriod > 0
      ? Math.round(totals.flights / totals.daysInPeriod)
      : 0;
    const topDestination = airportOverview.topDestination;
    const topAirline = airportOverview.topAirline;

    return [
      {
        label: 'เที่ยวบินทั้งหมด',
        value: totals.flights.toLocaleString(),
        delta: `${totals.deltaFlights >= 0 ? '\u25B2' : '\u25BC'} ${formatSignedFlights(totals.deltaFlights)} เที่ยวบิน (${formatSignedPercent(totals.deltaPercent)})`,
        deltaType: totalTone,
        accentColor: KPI_ACCENT.flights,
      },
      {
        label: 'เฉลี่ยต่อวัน',
        value: averageFlightsPerDay.toLocaleString(),
        delta: `เฉลี่ยจาก ${totals.daysInPeriod} วัน`,
        deltaType: 'neutral',
        growthColored: false,
        accentColor: KPI_ACCENT.airports,
      },
      {
        label: 'จุดหมายยอดนิยม',
        value: topDestination ? `${topDestination.name.replace(/\s+Airport$/i, '')} (${topDestination.country})` : '-',
        delta: topDestination ? `${topDestination.flights.toLocaleString()} เที่ยวบินขาออก \u00B7 ${topDestination.flag}` : '-',
        deltaType: 'neutral',
        growthColored: false,
        accentColor: KPI_ACCENT.average,
      },
      {
        label: 'สายการบินหลัก',
        value: topAirline ? topAirline.name : '-',
        delta: topAirline ? `${topAirline.flights.toLocaleString()} เที่ยวบิน` : '-',
        deltaType: 'neutral',
        growthColored: false,
        accentColor: KPI_ACCENT.highlight,
      },
    ];
  }, [airportOverview]);

  const trendSeries = useMemo(
    () => (airportTrend
      ? {
          daily: airportTrend.daily,
          monthly: airportTrend.monthly,
          monthLabels: airportTrend.monthLabels,
        }
      : {
        daily: detail.daily.map((row) => {
          const departureFlights = Math.round(row.flights * 0.5);
          const arrivalFlights = row.flights - departureFlights;
          return {
            date: row.date,
            departureFlights,
            arrivalFlights,
            flights: row.flights,
            delta: row.delta,
          };
        }),
        monthly: detail.monthly.map((flights, index) => {
          const departureFlights = Math.round(flights * 0.5);
          const arrivalFlights = flights - departureFlights;
          return {
            month: index + 1,
            departureFlights,
            arrivalFlights,
            flights,
          };
        }),
          monthLabels: detail.monthLabels,
        }),
    [airportTrend, detail.daily, detail.monthly, detail.monthLabels],
  );

  const airportDataRange = useMemo<DateRange | undefined>(() => {
    const dates = trendSeries.daily
      .map((row) => new Date(row.date))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (!dates.length) {
      return undefined;
    }

    let minDate = dates[0];
    let maxDate = dates[0];
    for (const current of dates) {
      if (current < minDate) minDate = current;
      if (current > maxDate) maxDate = current;
    }

    return { from: minDate, to: maxDate };
  }, [trendSeries.daily]);

  useEffect(() => {
    const presetAnchorDate = airportDataRange?.to ?? new Date();
    const nextRange = rangePreset === 'all'
      ? airportDataRange
      : buildPresetRange(rangePreset, presetAnchorDate) ?? airportDataRange;

    setDateRange(nextRange);
    setDurationMode(rangePreset);
    setShowCustomDateRange(false);
    setIsExtendedRangeOpen(false);
    setDateError(false);

    if (nextRange?.from) {
      setFromCalendarMonth(nextRange.from);
      setToCalendarMonth(nextRange.to || nextRange.from);
    }
  }, [rangePreset, airportDataRange]);

  const routeChartDateRange = dateRange ?? airportDataRange;

  const routeChartData = useMemo(() => {
    const from = routeChartDateRange?.from;
    const to = routeChartDateRange?.to;

    if (!from || !to) {
      return trendSeries.daily
        .map((row) => ({
          date: row.date,
          flights: row.departureFlights,
          flightsCompare: row.arrivalFlights,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());

    const byDate = new Map(
      trendSeries.daily.map((row) => [
        row.date,
        {
          flights: Number(row.departureFlights) || 0,
          flightsCompare: Number(row.arrivalFlights) || 0,
        },
      ]),
    );

    const filled: Array<{ date: string; flights: number; flightsCompare: number }> = [];
    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      const key = toDateKey(cursor);
      const value = byDate.get(key);
      filled.push({
        date: key,
        flights: value?.flights || 0,
        flightsCompare: value?.flightsCompare || 0,
      });
    }

    return filled;
  }, [routeChartDateRange?.from, routeChartDateRange?.to, trendSeries.daily]);

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h2 className="min-w-0 text-xl font-bold break-words">
              {'🛫'} {airport.iata} {'\u2014'} {airport.name}
            </h2>
            {selections.country && (
              <span
                className={`inline-flex max-w-full shrink-0 flex-wrap items-center gap-x-1 text-[13px] font-bold break-words rounded-full py-0.5 px-3 ${growthCardBadgeClasses(countryTone)}`}
              >
                {selections.country.deltaN >= 0 ? '\u25B2' : '\u25BC'} {selections.country.deltaN >= 0 ? '+' : ''}
                {selections.country.deltaN} เที่ยวบิน ({selections.country.delta})
              </span>
            )}
          </div>
          <p className="text-[15px] text-muted-foreground break-words">
            {activeAirportFlights.toLocaleString()} เที่ยวบิน {'\u00B7'} {airport.routes} จุดหมาย {'\u00B7'} {airport.airlines} สายการบิน
          </p>
        </div>
        <div className="min-w-0 w-full xl:w-auto xl:max-w-[48rem]">
          <Label className="mb-2 text-sm font-medium text-muted-foreground">ช่วงวันที่</Label>
          <div className="flex min-h-[52px] max-w-full min-w-0 flex-wrap content-start items-end gap-2.5 border-b border-border/70 pb-1">
            <Button
              type="button"
              variant={rangePreset === 'focus' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => setRangePreset('focus')}
            >
              ± 15 วัน
            </Button>
            <Button
              type="button"
              variant={rangePreset === '7' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => setRangePreset('7')}
            >
              7 วัน
            </Button>
            <Button
              type="button"
              variant={rangePreset === '30' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => setRangePreset('30')}
            >
              30 วัน
            </Button>
            <Button
              type="button"
              variant={rangePreset === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => setRangePreset('all')}
            >
              ทั้งหมด
            </Button>
            <Popover open={isExtendedRangeOpen} onOpenChange={setIsExtendedRangeOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={rangePreset === '90' || rangePreset === '180' || rangePreset === '365' ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 px-3.5 text-xs sm:text-sm"
                >
                  {rangePreset === '90' ? 'ไตรมาสนี้' : rangePreset === '180' ? '6 เดือน' : rangePreset === '365' ? '1 ปี' : 'รอบเดือน'}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="start">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant={rangePreset === '90' ? 'default' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setRangePreset('90')}
                  >
                    ไตรมาสนี้
                  </Button>
                  <Button
                    type="button"
                    variant={rangePreset === '180' ? 'default' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setRangePreset('180')}
                  >
                    6 เดือน
                  </Button>
                  <Button
                    type="button"
                    variant={rangePreset === '365' ? 'default' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setRangePreset('365')}
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
              onClick={() => {
                setShowCustomDateRange((prev) => !prev);
                setDurationMode(null);
                setDateError(false);
              }}
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
                      components={{
                        MonthCaption: AirportCalendarCaption,
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
                      components={{
                        MonthCaption: AirportCalendarCaption,
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

      {kpiLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 animate-pulse">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[126px] rounded-[10px] border border-border bg-card p-4" />
          ))}
        </div>
      ) : kpiError ? (
        <div className="rounded-[10px] border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{kpiError}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            onClick={() => setKpiReloadKey((current) => current + 1)}
          >
            ลองใหม่
          </button>
        </div>
      ) : (
        <KPIRow items={kpis} />
      )}

      <FlightRoutesChart
        chartData={routeChartData}
        dateRange={routeChartDateRange}
        compareMode={true}
        isDeparture={true}
        chartHeightClass="h-[208px]"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <TrendSparkChart trend={trendSeries} />
        <SeasonalTrendChart trend={trendSeries} />
      </div>

      <TopDestinationsPanel detail={detail} scale={presetScale} subtitle={presetLabel} />
      <InvestmentPanel timeMode={timeMode} detail={detail} scale={presetScale} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <AirlineSharePanel detail={detail} scale={presetScale} />
        <HourDistributionPanel timeMode={timeMode} detail={detail} scale={presetScale} />
      </div>

      <div className="flex justify-center pt-1">
        <BackButton label="กลับไปยังประเทศ" onClick={() => drillTo('country')} />
      </div>
    </div>
  );
}

function TrendSparkChart(
  {
    trend,
  }: {
    trend: {
      daily: Array<{ date: string; departureFlights: number; arrivalFlights: number; flights: number }>;
      monthly: Array<{ month: number; departureFlights: number; arrivalFlights: number; flights: number }>;
      monthLabels: string[];
    };
  },
) {
  const gradientId = useId();
  const { monthly: MONTHLY, monthLabels: AP_MONTHS } = trend;
  const [activeSeries, setActiveSeries] = useState<'all' | 'dep' | 'arr'>('all');

  const getSeriesTone = (series: 'dep' | 'arr') => {
    const isMuted = activeSeries !== 'all' && activeSeries !== series;
    const baseColor = series === 'dep' ? 'var(--chart-1)' : 'var(--chart-2)';

    return {
      stroke: isMuted ? 'hsl(215 16% 68%)' : `hsl(${series === 'dep' ? '221 83% 53%' : '142 76% 36%'})`,
      fillOpacity: isMuted ? 0.1 : 0.18,
      dotFill: isMuted ? 'hsl(215 16% 68%)' : baseColor,
      lineColorCss: isMuted ? 'hsl(215 16% 68%)' : baseColor,
    };
  };

  const legendButtons: Array<{ key: 'all' | 'dep' | 'arr'; label: string }> = [
    { key: 'dep', label: 'ขาออก' },
    { key: 'arr', label: 'ขาเข้า' },
    { key: 'all', label: 'รวม' },
  ];

  // Mirror flight-routes-chart behavior: trim only leading/trailing zero periods.
  const trimZeroEdges = <T extends { total: number }>(rows: T[]): T[] => {
    if (!rows.length) return rows;

    let firstIndex = -1;
    let lastIndex = -1;

    for (let idx = 0; idx < rows.length; idx += 1) {
      if ((rows[idx]?.total || 0) > 0) {
        if (firstIndex === -1) firstIndex = idx;
        lastIndex = idx;
      }
    }

    if (firstIndex === -1) {
      return rows;
    }
    return rows.slice(firstIndex, lastIndex + 1);
  };

  // For monthly axes, keep month categories but avoid drawing values for zero months.
  const toRenderableMonthly = <T extends { day: string; dep: number; arr: number; total: number }>(rows: T[]) =>
    rows.map((row) => ({
      ...row,
      dep: row.dep === 0 ? null : row.dep,
      arr: row.arr === 0 ? null : row.arr,
      total: row.total === 0 ? null : row.total,
    }));

  const now = new Date();
  const nowIdx = now.getMonth();
  const nowYear = now.getFullYear();

  // YoY: all 12 months
  const yoyDataRaw = AP_MONTHS.map((m, i) => ({
    day: m,
    dep: MONTHLY[i]?.departureFlights || 0,
    arr: MONTHLY[i]?.arrivalFlights || 0,
    total: MONTHLY[i]?.flights || 0,
  }));

  const yoyData = toRenderableMonthly(trimZeroEdges(yoyDataRaw));

  const tData = yoyData;
  const plottedValues = tData
    .map((row) => (activeSeries === 'all' ? row.total : activeSeries === 'dep' ? row.dep : row.arr))
    .filter((v): v is number => typeof v === 'number');
  const peak = plottedValues.length ? Math.max(...plottedValues) : 0;
  const total = plottedValues.reduce((s, v) => s + v, 0);
  const peakEntry =
    tData.find((row) => {
      const value = activeSeries === 'all' ? row.total : activeSeries === 'dep' ? row.dep : row.arr;
      return value === peak;
    }) || tData[0] || { day: '-', total: 0 };

  const minVal = plottedValues.length ? Math.min(...plottedValues) : 0;
  const yDomain: [number, number] = [Math.floor(minVal * 0.9), Math.ceil(peak * 1.1)];

  const subtitle = 'ภาพรวมรายปี';
  const dateRange = `ม.ค. \u2013 ธ.ค. ${nowYear}`;
  const currentPeriodDetail = `${AP_MONTHS[nowIdx] ?? ''} ${nowYear}`.trim();

  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-[10px] p-4 hover:border-primary hover:-translate-y-0.5 transition-all">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <div className="text-base uppercase tracking-wider text-muted-foreground">{subtitle}</div>
          <div className="text-[15px] font-bold">แนวโน้มเที่ยวบิน</div>
        </div>
        <div className="text-right space-y-2">
          <div>
            <div className="text-[22px] font-bold leading-none">{total.toLocaleString()}</div>
            <div className="text-[13px] text-accent font-semibold mt-1">{'\u25B2'} คงที่</div>
          </div>
          <div className="inline-flex rounded-md border border-border overflow-hidden bg-background">
            {legendButtons.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSeries(item.key)}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  activeSeries === item.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" minHeight={180} height={192}>
        <AreaChart
          data={tData}
          margin={{
            top: 10,
            right: 12,
            left: 4,
            bottom: 8,
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 13, fontWeight: 600 }}
            tickMargin={8}
            interval={1}
            className="text-muted-foreground"
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 13, fontWeight: 600 }}
            className="text-muted-foreground"
            tickCount={5}
            width={48}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '14px' }}
            formatter={(value: number, name: string) => [`${value} เที่ยวบิน`, name]}
          />
          {activeSeries === 'all' ? (
            <Area
              type="monotone"
              dataKey="total"
              name="รวม"
              connectNulls={false}
              stroke="hsl(212 76% 35%)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
            />
          ) : (
            <>
              <Area
                type="monotone"
                dataKey="dep"
                name="ขาออก"
                connectNulls={false}
                stroke={getSeriesTone('dep').stroke}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                fillOpacity={getSeriesTone('dep').fillOpacity}
              />
              <Area
                type="monotone"
                dataKey="arr"
                name="ขาเข้า"
                connectNulls={false}
                stroke={getSeriesTone('arr').stroke}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                fillOpacity={getSeriesTone('arr').fillOpacity}
              />
            </>
          )}
          <ReferenceDot
            x={AP_MONTHS[nowIdx]}
            y={activeSeries === 'all'
              ? MONTHLY[nowIdx]?.flights || 0
              : activeSeries === 'dep'
                ? MONTHLY[nowIdx]?.departureFlights || 0
                : MONTHLY[nowIdx]?.arrivalFlights || 0}
            r={6}
            fill="#d29922"
            stroke="#fff"
            strokeWidth={2}
          />
          <ReferenceDot x={peakEntry.day} y={peak} r={7} fill="#ff9f43" stroke="#fff" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between text-[15px] font-medium text-muted-foreground mt-2.5">
        <span>{dateRange}</span>
        <span className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          {activeSeries === 'all' ? (
            <span style={{ color: 'hsl(212 76% 35%)' }} className="font-bold">{'\u25CF'} รวม</span>
          ) : (
            <>
              <span style={{ color: getSeriesTone('dep').lineColorCss }} className="font-bold">{'\u25CF'} ขาออก</span>
              <span style={{ color: getSeriesTone('arr').lineColorCss }} className="font-bold">{'\u25CF'} ขาเข้า</span>
            </>
          )}
          <span style={{ color: 'var(--chart-current)' }} className="font-bold">
            {'\u25CF'} เดือนนี้
            {currentPeriodDetail ? ` \u00B7 ${currentPeriodDetail}` : ''}
          </span>
          <span style={{ color: 'var(--chart-peak)' }} className="font-bold">{'\u25CF'} เดือนสูงสุด</span>
        </span>
      </div>
    </div>
  );
}

function SeasonalTrendChart(
  {
    trend,
  }: {
    trend: {
      daily: Array<{ date: string; departureFlights: number; arrivalFlights: number; flights: number }>;
      monthly: Array<{ month: number; departureFlights: number; arrivalFlights: number; flights: number }>;
      monthLabels: string[];
    };
  },
) {
  const { monthly: MONTHLY, monthLabels: AP_MONTHS } = trend;
  const [activeSeries, setActiveSeries] = useState<'all' | 'dep' | 'arr'>('all');
  const now = new Date();
  const nowIdx = now.getMonth();

  const trimZeroEdges = <T extends { total: number }>(rows: T[]): T[] => {
    if (!rows.length) return rows;
    let firstIndex = -1;
    let lastIndex = -1;
    for (let idx = 0; idx < rows.length; idx += 1) {
      if ((rows[idx]?.total || 0) > 0) {
        if (firstIndex === -1) firstIndex = idx;
        lastIndex = idx;
      }
    }
    if (firstIndex === -1) return rows;
    return rows.slice(firstIndex, lastIndex + 1);
  };

  const chartData: Array<{
    month: string;
    dep: number;
    arr: number;
    total: number;
    _idx: number;
  }> = trimZeroEdges(MONTHLY.map((v, i) => ({
    month: AP_MONTHS[i],
    dep: v.departureFlights,
    arr: v.arrivalFlights,
    total: v.flights,
    _idx: i,
  })));
  const title = 'แนวโน้มฤดูกาล (รายปี)';

  const activeValues = chartData.map((row) => (activeSeries === 'all' ? row.total : activeSeries === 'dep' ? row.dep : row.arr));
  const peakVal = activeValues.length ? Math.max(...activeValues) : 0;

  const depActiveFill = '#2563eb';
  const arrActiveFill = '#16a34a';
  const mutedFill = '#b6bfcd';
  const combinedFill = '#1f4f8a';
  const activeBarKey = `${activeSeries}-yoy`;

  const lowerSeriesKey: 'dep' | 'arr' = activeSeries === 'arr' ? 'arr' : 'dep';
  const upperSeriesKey: 'dep' | 'arr' = lowerSeriesKey === 'dep' ? 'arr' : 'dep';
  const lowerSeriesLabel = lowerSeriesKey === 'dep' ? 'ขาออก' : 'ขาเข้า';
  const upperSeriesLabel = upperSeriesKey === 'dep' ? 'ขาออก' : 'ขาเข้า';
  const lowerSeriesFill = lowerSeriesKey === 'dep' ? depActiveFill : arrActiveFill;

  const seriesButtons: Array<{ key: 'arr' | 'dep' | 'all'; label: string }> = [
    { key: 'arr', label: 'ขาเข้า' },
    { key: 'dep', label: 'ขาออก' },
    { key: 'all', label: 'รวม' },
  ];

  const makeSwapShape = (direction: 'left' | 'right', layer: 'lower' | 'upper') => {
    const fromX = direction === 'left' ? -14 : 14;
    const fromY = layer === 'lower' ? 8 : -8;
    return (props: any) => {
      const {
        x,
        y,
        width,
        height,
        fill,
        opacity,
        radius,
      } = props;

      if (!width || !height) {
        return <g />;
      }

      const topRadius = Array.isArray(radius) ? Number(radius[0] || 0) : 0;
      const path = topRadius > 0
        ? `M ${x} ${y + height}
           L ${x} ${y + topRadius}
           Q ${x} ${y} ${x + topRadius} ${y}
           L ${x + width - topRadius} ${y}
           Q ${x + width} ${y} ${x + width} ${y + topRadius}
           L ${x + width} ${y + height}
           Z`
        : `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;

      return (
        <g>
          <path d={path} fill={fill} opacity={opacity}>
            <animateTransform
              attributeName="transform"
              type="translate"
              from={`${fromX} ${fromY}`}
              to="0 0"
              dur="320ms"
              calcMode="spline"
              keySplines="0.25 0.8 0.25 1"
              fill="freeze"
            />
          </path>
        </g>
      );
    };
  };

  const lowerShape = makeSwapShape(lowerSeriesKey === 'dep' ? 'left' : 'right', 'lower');
  const upperShape = makeSwapShape(lowerSeriesKey === 'dep' ? 'right' : 'left', 'upper');

  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-[10px] p-4 hover:border-primary hover:-translate-y-0.5 transition-all">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--chart-3)]" />
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[16px] font-bold">{title}</div>
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden bg-background">
          {seriesButtons.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveSeries(item.key)}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeSeries === item.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" minHeight={200} height={208}>
        <BarChart
          data={chartData}
          margin={{
            top: 12,
            right: 12,
            left: 4,
            bottom: 28,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 13, fontWeight: 600 }}
            tickMargin={8}
            interval={1}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 13, fontWeight: 600 }}
            width={48}
            tickCount={5}
            className="text-muted-foreground"
          />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '14px' }} formatter={(value: number) => [`${value} เที่ยวบิน`, '']} />
          {activeSeries === 'all' ? (
            <Bar
              key={activeBarKey}
              dataKey="total"
              name="รวม"
              radius={[5, 5, 0, 0]}
              maxBarSize={32}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry._idx === nowIdx ? '#d29922' : entry.total === peakVal ? '#ff9f43' : combinedFill}
                  opacity={0.9}
                />
              ))}
            </Bar>
          ) : (
            <>
              <Bar
                key={`${activeBarKey}-base`}
                dataKey={lowerSeriesKey}
                name={lowerSeriesLabel}
                stackId="seasonal"
                radius={[0, 0, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
                shape={lowerShape}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={lowerSeriesFill}
                    opacity={0.92}
                  />
                ))}
              </Bar>
              <Bar
                key={`${activeBarKey}-top`}
                dataKey={upperSeriesKey}
                name={upperSeriesLabel}
                stackId="seasonal"
                radius={[5, 5, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
                shape={upperShape}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={mutedFill}
                    opacity={0.55}
                  />
                ))}
              </Bar>
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-between text-[15px] font-medium text-muted-foreground mt-2">
        <span>{`ทั้งปี ${'\u00B7'} เที่ยวบินต่อเดือน`}</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {activeSeries === 'all' ? (
            <span style={{ color: combinedFill }} className="font-bold">{'\u25A0'} รวม</span>
          ) : (
            <>
              <span style={{ color: activeSeries === 'arr' ? arrActiveFill : mutedFill }} className="font-bold">{'\u25A0'} ขาเข้า</span>
              <span style={{ color: activeSeries === 'dep' ? depActiveFill : mutedFill }} className="font-bold">{'\u25A0'} ขาออก</span>
            </>
          )}
          <span style={{ color: '#d29922' }} className="font-bold">{'\u25A0'} เดือนปัจจุบัน</span>
          <span style={{ color: '#ff9f43' }} className="font-bold">{'\u25A0'} เดือนที่สูงสุด</span>
        </span>
      </div>
    </div>
  );
}

function TopDestinationsPanel({ detail, scale, subtitle }: { detail: AirportDetail; scale: number; subtitle: string }) {
  const { routes: ROUTES, arrivals: ARRIVALS } = detail;
  const top5dep = ROUTES.slice(0, 5).map((row) => ({ ...row, flights: Math.max(1, Math.round(row.flights * scale)) }));
  const topArrivals = ARRIVALS.map((row) => ({ ...row, flights: Math.max(1, Math.round(row.flights * scale)) }));
  const maxDep = top5dep[0]?.flights || 1;
  const maxArr = topArrivals[0]?.flights || 1;

  const renderRow = (r: typeof ROUTES[0], i: number, maxF: number) => {
    const barW = ((r.flights / maxF) * 100).toFixed(0);
    return (
      <div key={r.city + i} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 py-2 border-b border-border/60 last:border-b-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-muted-foreground w-6 text-center shrink-0 font-bold">{i + 1}</span>
          <span className="text-lg shrink-0">{r.flag}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold truncate">{r.city} <span className="text-[11px] text-muted-foreground font-medium">{'\u00B7'} {r.country}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-[calc(1.5rem+0.5rem+1.125rem+0.5rem)] sm:pl-0 sm:ml-auto sm:shrink-0">
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden shrink-0">
            <div className="h-full rounded-full" style={{ width: `${barW}%`, background: r.color }} />
          </div>
          <span className="text-[15px] font-bold w-10 text-right shrink-0 tabular-nums">{r.flights}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-[10px]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[16px] font-bold">จุดหมายปลายทางยอดนิยม</div>
          <div className="text-[14px] text-muted-foreground">{subtitle} {'\u00B7'} 5 อันดับแรกแต่ละทิศทาง</div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <span className="text-[14px] font-bold py-0.5 px-2.5 rounded-full bg-primary/15 text-primary">{'\u2191'} ขาออก</span>
          <span className="text-[14px] font-bold py-0.5 px-2.5 rounded-full bg-accent/10 text-accent">{'\u2193'} ขาเข้า</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[14px] font-bold py-0.5 px-2.5 rounded-full bg-primary/15 text-primary">{'\u2191'} ขาออก</span>
            <span className="text-[15px] text-muted-foreground font-semibold">5 อันดับเส้นทางขาออก</span>
          </div>
          {top5dep.map((r, i) => renderRow(r, i, maxDep))}
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[14px] font-bold py-0.5 px-2.5 rounded-full bg-accent/10 text-accent">{'\u2193'} ขาเข้า</span>
            <span className="text-[15px] text-muted-foreground font-semibold">5 อันดับเส้นทางขาเข้า</span>
          </div>
          {topArrivals.map((r, i) => renderRow(r, i, maxArr))}
        </div>
      </div>
    </div>
  );
}

function InvestmentPanel({ timeMode, detail, scale }: { timeMode: TimeMode; detail: AirportDetail; scale: number }) {
  const { investRoutes: INVEST_ROUTES } = detail;
  const modeKey = timeMode;
  const modeShort = timeMode.toUpperCase();

  const scaledRoutes = INVEST_ROUTES.map((r) => ({
    ...r,
    flights: Math.max(1, Math.round(r.flights * scale)),
  }));

  const scored = scaledRoutes.map((r) => ({ ...r, _score: calcInvestScore(r, timeMode) }))
    .sort((a, b) => b._score - a._score);

  const factors = [
    { label: `การเติบโต ${modeShort}`, weight: '40%', active: true },
    { label: 'ความต้องการที่ยังไม่ถูกตอบสนอง', weight: '35%', active: false },
    { label: 'ความง่ายในการเข้าสู่ตลาด', weight: '15%', active: false },
    { label: 'ความสม่ำเสมอของแนวโน้ม', weight: '10%', active: false },
  ];

  return (
    <div className="bg-card border border-border rounded-[10px] p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-base font-bold">{'💡'} โอกาสการลงทุน {'\u2014'} จัดอันดับตามคะแนน {modeShort}</div>
          <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
            เส้นทางที่มีอุปสงค์ยังไม่ถูกตอบสนอง: กำลังเติบโต แต่ยังให้บริการน้อย การแข่งขันต่ำ แนวโน้มต่อเนื่อง
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-muted rounded-lg mb-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground mr-1">คะแนน =</span>
        {factors.map((f, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-[13px] font-bold border whitespace-nowrap ${
              f.active ? 'bg-primary/15 border-primary text-primary' : 'bg-card border-border text-muted-foreground'
            }`}>
              {f.active && '📊 '}{f.label} <span className="opacity-70">{'\u00D7'}{f.weight}</span>
            </span>
            {i < factors.length - 1 && <span className="text-border">+</span>}
          </span>
        ))}
      </div>

      {scored.map((r, i) => {
        const tier = getInvestTier(r._score);
        const scoreColor = r._score >= 75 ? '#16a34a' : r._score >= 58 ? '#2563eb' : r._score >= 42 ? '#ca8a04' : '#6b7280';
        return (
          <div key={r.city} className="flex items-start gap-2.5 py-3 border-b border-border/60 last:border-b-0">
            <span className="text-sm text-muted-foreground w-5 text-center shrink-0 pt-0.5">{i + 1}</span>
            <span className="text-xl shrink-0 pt-0.5">{r.flag}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold">{r.city}</span>
                <span className="text-sm text-muted-foreground">{r.country}</span>
                <span className="ml-auto text-[13px] font-bold py-1 px-2.5 rounded-full whitespace-nowrap" style={{ background: `${tier.color}15`, color: tier.color }}>
                  {tier.label}
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap mt-1.5 mb-1">
                {(['wow', 'mom', 'yoy'] as const).map((mode) => {
                  const val = r[mode];
                  const isActive = mode === modeKey;
                  return (
                    <span key={mode} className={`text-[13px] font-semibold py-1 px-2.5 rounded border whitespace-nowrap ${
                      isActive
                        ? 'bg-primary/12 border-primary text-primary text-sm font-bold'
                        : `${growthPillSurfaceClasses(growthDeltaTypeFromPct(val, mode))} border-border`
                    }`}>
                      {mode.toUpperCase()} {val > 0 ? '+' : ''}{val}%
                    </span>
                  );
                })}
              </div>
              <div className="text-[13px] text-muted-foreground">{'\u2708'} {r.flights} เที่ยวบิน {'\u00B7'} {r.airlines} สายการบิน {'\u00B7'} {r.airlineNames}</div>
              <div className="text-[13px] text-muted-foreground mt-0.5 italic opacity-80">{r.note}</div>
              <div className="text-sm text-primary font-semibold mt-1.5">{'\u2192'} {tier.action}</div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 min-w-[72px] pt-0.5">
              <span className="text-[28px] font-extrabold leading-none" style={{ color: scoreColor }}>{r._score}</span>
              <span className="text-[13px] text-muted-foreground text-right">/100</span>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-400" style={{ width: `${r._score}%`, background: scoreColor }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AirlineSharePanel({ detail, scale }: { detail: AirportDetail; scale: number }) {
  const { airlines: AIRLINES } = detail;
  const airlines = AIRLINES.map((row) => ({ ...row, count: Math.max(1, Math.round(row.count * scale)) }));
  const max = airlines[0]?.count || 1;
  return (
    <div className="bg-card border border-border rounded-[10px] p-4">
      <div className="text-[15px] font-bold mb-3.5">ส่วนแบ่งตลาดสายการบิน</div>
      {airlines.map((a) => (
        <div key={a.name} className="flex items-center gap-3 mb-2.5 min-w-0">
          <div className="text-[15px] font-medium text-muted-foreground w-28 sm:w-36 shrink-0 truncate" title={a.name}>
            {a.name}
          </div>
          <div className="flex-1 min-w-0 h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(a.count / max * 100).toFixed(0)}%`, background: a.color }} />
          </div>
          <div className="text-[15px] font-semibold text-muted-foreground min-w-11 text-right shrink-0 tabular-nums">{a.count}</div>
        </div>
      ))}
    </div>
  );
}

function HourDistributionPanel({ timeMode, detail, scale }: { timeMode: TimeMode; detail: AirportDetail; scale: number }) {
  const { rangePreset, setRangePreset } = useDrillDown();
  const { hourTotal: HOUR_TOTAL, hourTotalArr: HOUR_TOTAL_ARR } = detail;
  const subtitle = AIRPORT_PRESET_LABELS[rangePreset] ?? AIRPORT_PRESET_LABELS.focus;

  const modeScale = timeMode === 'wow' ? 1 : timeMode === 'mom' ? 4 : 52;
  const appliedScale = modeScale * scale;
  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    dep: Math.round((HOUR_TOTAL[h] || 0) * appliedScale),
    arr: Math.round((HOUR_TOTAL_ARR[h] || 0) * appliedScale),
  }));

  const chartData = hours.map((h) => ({
    hour: h.hour,
    hourLabel: `${h.hour.toString().padStart(2, '0')}:00`,
    dep: h.dep,
    arr: h.arr,
  }));

  const xTickHours = new Set([0, 3, 6, 9, 12, 15, 18, 21, 23]);

  const presetButtons: Array<{ key: RangePreset; label: string }> = [
    { key: 'focus', label: '± 15 วัน' },
    { key: '7', label: '7 วัน' },
    { key: '30', label: '30 วัน' },
    { key: 'all', label: 'ทั้งหมด' },
    { key: '90', label: 'ไตรมาสนี้' },
    { key: '180', label: '6 เดือน' },
    { key: '365', label: '1 ปี' },
  ];

  return (
    <div className="bg-card border border-border rounded-[10px] p-4">
      <div className="flex flex-col gap-2 mb-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[15px] font-bold">เที่ยวบินตามชั่วโมง</div>
          <div className="text-[14px] text-muted-foreground font-medium">{subtitle}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presetButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              onClick={() => setRangePreset(button.key)}
              className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${
                rangePreset === button.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
      <div className="text-[14px] font-medium text-muted-foreground mb-2">
        แกน X แสดงเวลาในแต่ละชั่วโมง (00:00 - 23:00)
      </div>
      <div className="h-[250px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 6, right: 10, left: 8, bottom: 22 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis
              dataKey="hourLabel"
              interval={0}
              tickMargin={8}
              tick={{ fontSize: 13, fontWeight: 600 }}
              tickFormatter={(value: string) => {
                const hour = Number(value.slice(0, 2));
                return xTickHours.has(hour) ? value : '';
              }}
              className="text-muted-foreground"
              label={{
                value: 'เวลา (ชั่วโมง)',
                position: 'insideBottom',
                dy: 14,
                style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600 },
              }}
            />
            <YAxis
              tick={{ fontSize: 13, fontWeight: 600 }}
              tickFormatter={(value: number) => value.toLocaleString()}
              tickCount={5}
              width={56}
              className="text-muted-foreground"
              label={{
                value: 'จำนวนเที่ยวบิน',
                angle: -90,
                position: 'insideLeft',
                dx: -8,
                style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              labelFormatter={(label) => `เวลา ${label}`}
              formatter={(value: number, name: string) => [`${value.toLocaleString()} เที่ยวบิน`, name]}
            />
            <Bar dataKey="dep" name="ขาออก" stackId="hour" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="arr" name="ขาเข้า" stackId="hour" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-sm font-medium text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> ขาออก</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent" /> ขาเข้า</span>
      </div>
    </div>
  );
}
