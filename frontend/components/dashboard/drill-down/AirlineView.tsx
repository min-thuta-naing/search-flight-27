'use client';

import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';
import { type DateRange, type MonthCaptionProps, useDayPicker } from 'react-day-picker';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';
ChartJS.register(ArcElement, ChartTooltip, ChartLegend);
import { Pie } from 'react-chartjs-2';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import { statisticsApi } from '@/lib/api/statistics-api';
import type {
  DashboardAirlineDetailResponse,
  DashboardAirlineAirportRow,
  DashboardAirlineCountryRow,
} from '@/lib/api/statistics-api';
import { FlightRoutesChart } from '@/components/flight-routes-chart';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDrillDown, KPIRow, BackButton } from './DrillDownDashboard';
import type { KPIItem, RangePreset } from './DrillDownDashboard';
import type { DrillLevel } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const INIT_SIZE = 9;
const LOAD_MORE_SIZE = 10;

// ─── calendar caption ────────────────────────────────────────────────────────

const CALENDAR_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2024, i, 1), 'LLLL', { locale: th }),
}));
const CALENDAR_YEAR_RANGE = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => y - 2 + i);
})();

function AirlineCalendarCaption({ calendarMonth, displayIndex: _displayIndex, ...props }: MonthCaptionProps) {
  const { goToMonth } = useDayPicker();
  const m = calendarMonth.date.getMonth();
  const y = calendarMonth.date.getFullYear();
  return (
    <div {...props} className={cn('flex h-8 w-full items-center justify-between gap-2 px-2', props.className)}>
      <select
        aria-label="เลือกเดือน"
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px]"
        value={String(m)}
        onChange={(e) => goToMonth(new Date(y, Number(e.target.value), 1))}
      >
        {CALENDAR_MONTH_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select
        aria-label="เลือกปี"
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-[96px] shrink-0 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px]"
        value={String(y)}
        onChange={(e) => goToMonth(new Date(Number(e.target.value), m, 1))}
      >
        {CALENDAR_YEAR_RANGE.map((yr) => (
          <option key={yr} value={yr}>{yr}</option>
        ))}
      </select>
    </div>
  );
}

// ─── date helpers ────────────────────────────────────────────────────────────

const AIRLINE_PRESET_LABELS: Record<RangePreset, string> = {
  focus: '± 15 วัน', '7': '7 วัน', '30': '30 วัน', all: 'ทั้งหมด',
  '90': 'ไตรมาสนี้', '180': '6 เดือน', '365': '1 ปี',
};

function buildAirlinePresetRange(mode: RangePreset, baseDate = new Date()): DateRange | undefined {
  if (mode === 'all') return undefined;
  if (mode === 'focus') return { from: subDays(baseDate, 15), to: addDays(baseDate, 15) };
  if (mode === '7') return { from: subDays(baseDate, 6), to: baseDate };
  if (mode === '30') return { from: subDays(baseDate, 29), to: baseDate };
  if (mode === '90') return { from: subDays(baseDate, 89), to: baseDate };
  if (mode === '180') return { from: subDays(baseDate, 179), to: baseDate };
  if (mode === '365') return { from: subDays(baseDate, 364), to: baseDate };
  return undefined;
}

function formatDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── drill helpers ───────────────────────────────────────────────────────────

// ─── sub-components ──────────────────────────────────────────────────────────

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mb-4 space-y-0.5">
        <div className="text-[15px] font-semibold tracking-tight">{title}</div>
        {subtitle && <div className="text-[12px] text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function InfiniteAirportTable({
  rows, loading, hasMore, loaderRef, scrollRef, emptyText = 'ไม่มีข้อมูลสนามบิน',
}: {
  rows: DashboardAirlineAirportRow[];
  loading: boolean;
  hasMore: boolean;
  loaderRef: React.RefObject<HTMLDivElement>;
  scrollRef: React.RefObject<HTMLDivElement>;
  emptyText?: string;
}) {
  if (!rows.length && !loading) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  const max = rows[0]?.flights || 1;
  return (
    <div ref={scrollRef} className="max-h-[340px] overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border bg-muted/30">
            <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">#</th>
            <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Airport</th>
            <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Country</th>
            <th className="px-3 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Flights</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.iata}-${i}`} className="border-t border-border/50 transition-colors hover:bg-muted/30">
              <td className="px-3 py-2.5 text-xs font-semibold text-muted-foreground/70">{i + 1}</td>
              <td className="px-3 py-2.5">
                <div className="font-medium leading-none">{row.name}</div>
                <div className="mt-0.5 text-xs font-mono text-muted-foreground">{row.iata}</div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span>{row.flag}</span>
                  <span className="text-sm text-foreground/80">{row.country}</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${(row.flights / max) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right tabular-nums text-sm font-semibold">
                    {row.flights.toLocaleString()}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div ref={loaderRef} style={{ height: 1 }} />
      {loading && <div className="py-3 text-center text-sm text-muted-foreground">กำลังโหลด...</div>}
      {!hasMore && !loading && rows.length > 0 && (
        <div className="py-2.5 text-center text-xs text-muted-foreground/60">— แสดงข้อมูลครบแล้ว —</div>
      )}
    </div>
  );
}

function InfiniteCountryTable({
  rows, totalFlights, loading, hasMore, loaderRef, scrollRef,
}: {
  rows: DashboardAirlineCountryRow[];
  totalFlights: number;
  loading: boolean;
  hasMore: boolean;
  loaderRef: React.RefObject<HTMLDivElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!rows.length && !loading) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        ไม่มีข้อมูลประเทศปลายทาง
      </div>
    );
  }
  const max = rows[0]?.flights || 1;
  return (
    <div ref={scrollRef} className="max-h-[340px] overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border bg-muted/30">
            <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">#</th>
            <th className="px-3 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Country</th>
            <th className="px-3 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Flights</th>
            <th className="px-3 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.countryCode || row.countryName}-${i}`} className="border-t border-border/50 transition-colors hover:bg-muted/30">
              <td className="px-3 py-2.5 text-xs font-semibold text-muted-foreground/70">{i + 1}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span>{row.flag}</span>
                  <span className="font-medium text-foreground/90">{row.countryName}</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${(row.flights / max) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right tabular-nums text-sm font-semibold">
                    {row.flights.toLocaleString()}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-sm font-medium text-muted-foreground">
                {totalFlights > 0 ? ((row.flights / totalFlights) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div ref={loaderRef} style={{ height: 1 }} />
      {loading && <div className="py-3 text-center text-sm text-muted-foreground">กำลังโหลด...</div>}
      {!hasMore && !loading && rows.length > 0 && (
        <div className="py-2.5 text-center text-xs text-muted-foreground/60">— แสดงข้อมูลครบแล้ว —</div>
      )}
    </div>
  );
}

function DomIntlPie({ domestic, international }: { domestic: number; international: number }) {
  const data = {
    labels: ['Domestic', 'International'],
    datasets: [{
      data: [domestic, international],
      backgroundColor: ['rgba(59,130,246,0.7)', 'rgba(251,191,36,0.7)'],
      borderColor: ['rgba(59,130,246,1)', 'rgba(251,191,36,1)'],
      borderWidth: 2,
    }],
  };
  return (
    <Pie
      data={data}
      options={{
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${(ctx.raw as number).toLocaleString()}` } },
        },
        cutout: '0%',
        responsive: true,
        maintainAspectRatio: false,
      }}
    />
  );
}

// ─── main view ───────────────────────────────────────────────────────────────

export function AirlineView() {
  const { drillTo, selections, rangePreset, setRangePreset, queryScope } = useDrillDown();
  const airline = selections.airline;

  // ── Date range state ─────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [durationMode, setDurationMode] = useState<RangePreset | null>(rangePreset);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [isExtendedRangeOpen, setIsExtendedRangeOpen] = useState(false);
  const [fromCalendarMonth, setFromCalendarMonth] = useState(() => new Date());
  const [toCalendarMonth, setToCalendarMonth] = useState(() => new Date());
  const [dateError, setDateError] = useState(false);

  useEffect(() => {
    const nextRange = buildAirlinePresetRange(rangePreset);
    setDateRange(nextRange);
    setDurationMode(rangePreset);
    setShowCustomDateRange(false);
    setIsExtendedRangeOpen(false);
    setDateError(false);
    if (nextRange?.from) {
      setFromCalendarMonth(nextRange.from);
      setToCalendarMonth(nextRange.to || nextRange.from);
    }
  }, [rangePreset]);

  const startDate = dateRange?.from ? formatDateInput(dateRange.from) : undefined;
  const endDate = dateRange?.to ? formatDateInput(dateRange.to) : undefined;

  // ── Main detail (KPI cards + pie chart summary numbers) ──────────────────
  const [detail, setDetail] = useState<DashboardAirlineDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!airline?.id) { setLoading(false); setError(null); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    statisticsApi
      .getDashboardAirlineDetail({ airlineId: airline.id, level: queryScope.level, filterValue: queryScope.value, startDate, endDate })
      .then((data) => { if (!alive) return; setDetail(data); setLoading(false); })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'โหลดข้อมูลสายการบินไม่สำเร็จ');
        setLoading(false);
      });
    return () => { alive = false; };
  }, [airline?.id, queryScope.level, queryScope.value, startDate, endDate]);

  // ── Trend data (for FlightRoutesChart) ──────────────────────────────────
  const [trendRows, setTrendRows] = useState<Array<{ date: string; flights: number; departureFlights: number; arrivalFlights: number }>>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    if (!airline?.id) { setTrendLoading(false); return; }
    let alive = true;
    setTrendLoading(true);
    setTrendRows([]);
    statisticsApi
      .getDashboardAirlineTrend({ airlineId: airline.id, level: queryScope.level, filterValue: queryScope.value, startDate, endDate })
      .then((data) => { if (!alive) return; setTrendRows(data.rows); setTrendLoading(false); })
      .catch(() => { if (!alive) return; setTrendLoading(false); });
    return () => { alive = false; };
  }, [airline?.id, queryScope.level, queryScope.value, startDate, endDate]);

  // ── Origin airports infinite scroll ─────────────────────────────────────
  const [originRows, setOriginRows] = useState<DashboardAirlineAirportRow[]>([]);
  const [originLoaded, setOriginLoaded] = useState(0);
  const [originHasMore, setOriginHasMore] = useState(true);
  const [originLoading, setOriginLoading] = useState(false);
  const originLoaderRef = useRef<HTMLDivElement | null>(null);
  const originScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!airline?.id) return;
    let alive = true;
    setOriginRows([]);
    setOriginLoaded(0);
    setOriginHasMore(true);
    setOriginLoading(true);
    statisticsApi
      .getDashboardAirlineOriginAirports({ airlineId: airline.id, level: queryScope.level, filterValue: queryScope.value, offset: 0, pageSize: INIT_SIZE, startDate, endDate })
      .then((res) => {
        if (!alive) return;
        setOriginRows(res.rows);
        setOriginLoaded(res.rows.length);
        setOriginHasMore(res.hasMore);
        setOriginLoading(false);
      })
      .catch(() => { if (!alive) return; setOriginLoading(false); });
    return () => { alive = false; };
  }, [airline?.id, queryScope.level, queryScope.value, startDate, endDate]);

  const loadMoreOrigin = useCallback(() => {
    if (originLoading || !originHasMore || !airline?.id) return;
    setOriginLoading(true);
    statisticsApi
      .getDashboardAirlineOriginAirports({ airlineId: airline.id, level: queryScope.level, filterValue: queryScope.value, offset: originLoaded, pageSize: LOAD_MORE_SIZE, startDate, endDate })
      .then((res) => {
        setOriginRows((prev) => [...prev, ...res.rows]);
        setOriginLoaded((prev) => prev + res.rows.length);
        setOriginHasMore(res.hasMore);
        setOriginLoading(false);
      })
      .catch(() => { setOriginLoading(false); });
  }, [airline?.id, queryScope.level, queryScope.value, originLoading, originHasMore, originLoaded, startDate, endDate]);

  useEffect(() => {
    if (!originHasMore || originLoading) return;
    const root = originScrollRef.current;
    const target = originLoaderRef.current;
    if (!root || !target) return;
    const observer = new window.IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreOrigin(); },
      { root, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.unobserve(target);
  }, [originHasMore, originLoading, loadMoreOrigin]);

  // ── Destination airports infinite scroll ────────────────────────────────
  const [destRows, setDestRows] = useState<DashboardAirlineAirportRow[]>([]);
  const [destLoaded, setDestLoaded] = useState(0);
  const [destHasMore, setDestHasMore] = useState(true);
  const [destLoading, setDestLoading] = useState(false);
  const destLoaderRef = useRef<HTMLDivElement | null>(null);
  const destScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!airline?.id) return;
    let alive = true;
    setDestRows([]);
    setDestLoaded(0);
    setDestHasMore(true);
    setDestLoading(true);
    statisticsApi
      .getDashboardAirlineDestAirports({ airlineId: airline.id, level: queryScope.level, filterValue: queryScope.value, offset: 0, pageSize: INIT_SIZE, startDate, endDate })
      .then((res) => {
        if (!alive) return;
        setDestRows(res.rows);
        setDestLoaded(res.rows.length);
        setDestHasMore(res.hasMore);
        setDestLoading(false);
      })
      .catch(() => { if (!alive) return; setDestLoading(false); });
    return () => { alive = false; };
  }, [airline?.id, queryScope.level, queryScope.value, startDate, endDate]);

  const loadMoreDest = useCallback(() => {
    if (destLoading || !destHasMore || !airline?.id) return;
    setDestLoading(true);
    statisticsApi
      .getDashboardAirlineDestAirports({ airlineId: airline.id, level: queryScope.level, filterValue: queryScope.value, offset: destLoaded, pageSize: LOAD_MORE_SIZE, startDate, endDate })
      .then((res) => {
        setDestRows((prev) => [...prev, ...res.rows]);
        setDestLoaded((prev) => prev + res.rows.length);
        setDestHasMore(res.hasMore);
        setDestLoading(false);
      })
      .catch(() => { setDestLoading(false); });
  }, [airline?.id, queryScope.level, queryScope.value, destLoading, destHasMore, destLoaded, startDate, endDate]);

  useEffect(() => {
    if (!destHasMore || destLoading) return;
    const root = destScrollRef.current;
    const target = destLoaderRef.current;
    if (!root || !target) return;
    const observer = new window.IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreDest(); },
      { root, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.unobserve(target);
  }, [destHasMore, destLoading, loadMoreDest]);

  // ── Destination countries infinite scroll ───────────────────────────────
  const [countryRows, setCountryRows] = useState<DashboardAirlineCountryRow[]>([]);
  const [countryLoaded, setCountryLoaded] = useState(0);
  const [countryHasMore, setCountryHasMore] = useState(true);
  const [countryLoading, setCountryLoading] = useState(false);
  const countryLoaderRef = useRef<HTMLDivElement | null>(null);
  const countryScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!airline?.id) return;
    let alive = true;
    setCountryRows([]);
    setCountryLoaded(0);
    setCountryHasMore(true);
    setCountryLoading(true);
    statisticsApi
      .getDashboardAirlineDestCountries({ airlineId: airline.id, level: queryScope.level, filterValue: queryScope.value, offset: 0, pageSize: INIT_SIZE, startDate, endDate })
      .then((res) => {
        if (!alive) return;
        setCountryRows(res.rows);
        setCountryLoaded(res.rows.length);
        setCountryHasMore(res.hasMore);
        setCountryLoading(false);
      })
      .catch(() => { if (!alive) return; setCountryLoading(false); });
    return () => { alive = false; };
  }, [airline?.id, queryScope.level, queryScope.value, startDate, endDate]);

  const loadMoreCountries = useCallback(() => {
    if (countryLoading || !countryHasMore || !airline?.id) return;
    setCountryLoading(true);
    statisticsApi
      .getDashboardAirlineDestCountries({ airlineId: airline.id, level: queryScope.level, filterValue: queryScope.value, offset: countryLoaded, pageSize: LOAD_MORE_SIZE, startDate, endDate })
      .then((res) => {
        setCountryRows((prev) => [...prev, ...res.rows]);
        setCountryLoaded((prev) => prev + res.rows.length);
        setCountryHasMore(res.hasMore);
        setCountryLoading(false);
      })
      .catch(() => { setCountryLoading(false); });
  }, [airline?.id, queryScope.level, queryScope.value, countryLoading, countryHasMore, countryLoaded, startDate, endDate]);

  useEffect(() => {
    if (!countryHasMore || countryLoading) return;
    const root = countryScrollRef.current;
    const target = countryLoaderRef.current;
    if (!root || !target) return;
    const observer = new window.IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreCountries(); },
      { root, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.unobserve(target);
  }, [countryHasMore, countryLoading, loadMoreCountries]);

  // ── Computed values ──────────────────────────────────────────────────────
  const chartData = useMemo(
    () => trendRows.map((d) => ({ date: d.date, flights: d.departureFlights, flightsCompare: d.arrivalFlights })),
    [trendRows],
  );

  const chartDateRange = useMemo(() => {
    if (trendRows.length < 2) return undefined;
    return { from: new Date(trendRows[0].date), to: new Date(trendRows[trendRows.length - 1].date) };
  }, [trendRows]);

  const airlineName = detail?.airlineName || airline?.name || '';
  const total = detail?.totalFlights ?? 0;
  const intlPct = total > 0 ? ((detail?.internationalFlights ?? 0) / total * 100) : 0;

  const kpis: KPIItem[] = useMemo((): KPIItem[] => {
    if (!detail) return [];
    return [
      {
        label: 'เที่ยวบินทั้งหมด',
        value: detail.totalFlights.toLocaleString(),
        delta: `${detail.airportCount.toLocaleString()} สนามบิน · ${detail.countryCount.toLocaleString()} ประเทศ`,
        deltaType: 'neutral',
        growthColored: false,
        accentColor: KPI_ACCENT.flights,
      },
      {
        label: 'สนามบินที่ให้บริการ',
        value: detail.airportCount.toLocaleString(),
        delta: detail.topAirports[0]
          ? `อันดับ 1: ${detail.topAirports[0].iata} · ${detail.topAirports[0].flights.toLocaleString()} เที่ยวบิน`
          : '-',
        deltaType: 'neutral',
        growthColored: false,
        accentColor: KPI_ACCENT.airports,
      },
      {
        label: 'ประเทศที่ให้บริการ',
        value: detail.countryCount.toLocaleString(),
        delta: detail.topCountries[0]
          ? `อันดับ 1: ${detail.topCountries[0].flag} ${detail.topCountries[0].countryName}`
          : '-',
        deltaType: 'neutral',
        growthColored: false,
        accentColor: KPI_ACCENT.highlight,
      },
      {
        label: 'เที่ยวบินระหว่างประเทศ',
        value: `${intlPct.toFixed(1)}%`,
        delta: `${detail.internationalFlights.toLocaleString()} ระหว่างประเทศ · ${detail.domesticFlights.toLocaleString()} ในประเทศ`,
        deltaType: 'neutral',
        growthColored: false,
        accentColor: KPI_ACCENT.average,
      },
    ];
  }, [detail, intlPct]);

  // ── Guard: no airline selected ───────────────────────────────────────────
  if (!airline) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="text-base font-semibold">ไม่พบข้อมูลสายการบิน</div>
        <div className="mt-1.5 text-sm text-muted-foreground">กลับไปเลือกสายการบินอีกครั้ง</div>
        <div className="mt-4">
          <BackButton label="กลับ" onClick={() => drillTo(queryScope.level)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header row: title left, date range right — matches AirportView layout */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        {/* Left: title + subtitle + back button */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">
            Airline Drill-down
          </div>
          <h2 className="text-xl font-bold break-words">{airlineName}</h2>
          <p className="text-[15px] text-muted-foreground mt-1">
            {queryScope.level === 'world' && 'ข้อมูลทั่วโลก'}
            {queryScope.level === 'continent' && `ทวีป: ${selections.continent?.name ?? ''}`}
            {queryScope.level === 'country' && `ประเทศ: ${selections.country?.name ?? ''}`}
            {queryScope.level === 'airport' && `สนามบิน: ${selections.airport?.iata ?? ''} · ${selections.airport?.name ?? ''}`}
          </p>
          <div className="mt-3">
            <BackButton
              label={
                queryScope.level === 'world' ? 'กลับสู่ภาพรวมโลก'
                : queryScope.level === 'continent' ? 'กลับสู่ทวีป'
                : queryScope.level === 'country' ? 'กลับสู่ประเทศ'
                : 'กลับสู่สนามบิน'
              }
              onClick={() => drillTo(queryScope.level)}
            />
          </div>
        </div>

        {/* Right: date range picker */}
        <div className="min-w-0 w-full xl:w-auto xl:max-w-[48rem]">
          <Label className="mb-2 text-sm font-medium text-muted-foreground">ช่วงวันที่</Label>
          {/* Preset buttons */}
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
                  : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
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

          {/* Custom date pickers */}
          <div className="space-y-2 pt-0">
            <div
              className={cn(
                'overflow-hidden transition-all duration-300 ease-in-out',
                showCustomDateRange ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0',
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
                        dateError && !dateRange?.from && 'border-red-500 ring-1 ring-red-500/20',
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
                      components={{ MonthCaption: AirlineCalendarCaption }}
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
                        !dateRange?.to && 'text-muted-foreground',
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
                      components={{ MonthCaption: AirlineCalendarCaption }}
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

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[126px] animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <KPIRow items={kpis} />
      )}

      {/* Row 1: Daily Flight Frequency line chart */}
      {!trendLoading && (
        chartData.length > 0 ? (
          <FlightRoutesChart
            chartData={chartData}
            dateRange={chartDateRange}
            compareMode={true}
            isDeparture={true}
            chartHeightClass="h-[220px] sm:h-[240px]"
          />
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">
            ไม่มีข้อมูลเที่ยวบินรายวันสำหรับสายการบินนี้
          </div>
        )
      )}
      {trendLoading && (
        <div className="h-[240px] animate-pulse rounded-xl border border-border bg-card" />
      )}

      {/* Row 2: Origin Airports | Destination Airports */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Origin Airports" subtitle={`สนามบินต้นทางของ ${airlineName}`}>
          <InfiniteAirportTable
            rows={originRows}
            loading={originLoading}
            hasMore={originHasMore}
            loaderRef={originLoaderRef as React.RefObject<HTMLDivElement>}
            scrollRef={originScrollRef as React.RefObject<HTMLDivElement>}
            emptyText="ไม่มีข้อมูลสนามบินต้นทาง"
          />
        </Panel>

        <Panel title="Destination Airports" subtitle={`สนามบินปลายทางของ ${airlineName}`}>
          <InfiniteAirportTable
            rows={destRows}
            loading={destLoading}
            hasMore={destHasMore}
            loaderRef={destLoaderRef as React.RefObject<HTMLDivElement>}
            scrollRef={destScrollRef as React.RefObject<HTMLDivElement>}
            emptyText="ไม่มีข้อมูลสนามบินปลายทาง"
          />
        </Panel>
      </div>

      {/* Row 3: Domestic vs International Pie | Destination Countries */}
      {!loading && !error && detail && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel
            title="สัดส่วนในประเทศ vs ระหว่างประเทศ"
            subtitle={`${detail.domesticFlights.toLocaleString()} ในประเทศ · ${detail.internationalFlights.toLocaleString()} ระหว่างประเทศ`}
          >
            {detail.totalFlights > 0 ? (
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                {/* Pie — fixed size so it stays proportional */}
                <div className="mx-auto shrink-0 sm:mx-0" style={{ width: 200, height: 200 }}>
                  <DomIntlPie domestic={detail.domesticFlights} international={detail.internationalFlights} />
                </div>

                {/* Rich legend — fills remaining horizontal space */}
                <div className="flex w-full flex-1 flex-col gap-4 sm:pl-1">
                  {/* Total callout */}
                  <div className="rounded-lg bg-muted/40 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total Flights</div>
                    <div className="mt-0.5 text-2xl font-bold tabular-nums">{total.toLocaleString()}</div>
                  </div>

                  {/* Domestic */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: 'rgba(59,130,246,0.85)' }} />
                        <span className="font-semibold">Domestic</span>
                      </div>
                      <span className="tabular-nums font-bold">
                        {total > 0 ? ((detail.domesticFlights / total) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${total > 0 ? (detail.domesticFlights / total) * 100 : 0}%`,
                          background: 'rgba(59,130,246,0.85)',
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{detail.domesticFlights.toLocaleString()} เที่ยวบิน</div>
                  </div>

                  {/* International */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: 'rgba(251,191,36,0.85)' }} />
                        <span className="font-semibold">International</span>
                      </div>
                      <span className="tabular-nums font-bold">{intlPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${intlPct}%`, background: 'rgba(251,191,36,0.85)' }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{detail.internationalFlights.toLocaleString()} เที่ยวบิน</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            )}
          </Panel>

          <Panel title="Destination Countries" subtitle={`ประเทศปลายทางของ ${airlineName}`}>
            <InfiniteCountryTable
              rows={countryRows}
              totalFlights={total}
              loading={countryLoading}
              hasMore={countryHasMore}
              loaderRef={countryLoaderRef}
              scrollRef={countryScrollRef}
            />
          </Panel>
        </div>
      )}
    </div>
  );
}
