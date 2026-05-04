'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';
import { DateRange, type MonthCaptionProps, useDayPicker } from 'react-day-picker';

import {
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  COUNTRIES,
  growthDeltaTypeFromPct,
} from '@/lib/dashboard/drill-down-data';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import {
  getCountryOverview,
  getDashboardDateBounds,
  getCountryFlowMap,
  type DashboardDateBoundsResponse,
  type DashboardCountryFlowMapResponse,
} from '@/lib/dashboard/services/drilldown';
import { runDrillDownRequest } from '@/lib/dashboard/drill-down-cache';
import { statisticsApi } from '@/lib/api/statistics-api';
import type {
  DashboardCountryInboundBreakdownResponse,
  DashboardCountryAirlineBreakdownResponse,
  DashboardCountryFlowMapPointResponse,
} from '@/lib/api/statistics-api';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDrillDown, KPIRow, BackButton } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import type { RangePreset } from './DrillDownDashboard';
import type { AirportInfo } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const COUNTRY_DISPLAY_NAMES = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;
const COUNTRY_DISPLAY_ALIASES: Record<string, string> = {
  CD: 'Kinshasa',
};
const COUNTRY_PRESET_LABELS: Record<RangePreset, string> = {
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

function CountryCalendarCaption({
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

function formatLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCountryPresetRange(
  mode: RangePreset,
  baseDate = new Date(),
  bounds?: Pick<DashboardDateBoundsResponse, 'minDate' | 'recommendedEndDate'> | null,
) {
  if (mode === 'focus') return { from: subDays(baseDate, 15), to: addDays(baseDate, 15) };
  if (mode === '7') return { from: baseDate, to: addDays(baseDate, 6) };
  if (mode === '30') return { from: baseDate, to: addDays(baseDate, 29) };
  if (mode === '90') return { from: baseDate, to: addDays(baseDate, 89) };
  if (mode === '180') return { from: baseDate, to: addDays(baseDate, 179) };
  if (mode === '365') return { from: baseDate, to: addDays(baseDate, 364) };

  const minDate = parseIsoDateInput(bounds?.minDate || null);
  const recommendedEndDate = parseIsoDateInput(bounds?.recommendedEndDate || null);
  if (!minDate || !recommendedEndDate) return null;
  return { from: minDate, to: recommendedEndDate };
}

function filterActiveAirports<T extends { flights: number }>(airports: T[]) {
  return airports.filter((airport) => airport.flights > 0);
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
function usePositiveElementSize<T extends HTMLElement>() {
  const elementRef = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const nextWidth = Math.max(0, Math.round(rect.width));
      const nextHeight = Math.max(0, Math.round(rect.height));

      setSize((previous) => {
        if ((nextWidth <= 0 || nextHeight <= 0) && previous.width > 0 && previous.height > 0) {
          // Keep the last valid size to avoid chart teardown during transient layout collapses.
          return previous;
        }

        if (previous.width === nextWidth && previous.height === nextHeight) {
          return previous;
        }

        return {
          width: nextWidth,
          height: nextHeight,
        };
      });
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      return () => {
        window.removeEventListener('resize', updateSize);
      };
    }

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return {
    elementRef,
    width: size.width,
    height: size.height,
    isReady: size.width > 0 && size.height > 0,
  };
}

const AIRPORT_TABLE_INITIAL_ROWS = 5;
const AIRPORT_TABLE_STEP_ROWS = 10;
type CountryFlowMapMode = 'inbound' | 'outbound' | 'both';
const COUNTRY_FLOW_MAP_TOP_N = 10;

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

function CountryPresetBar({
  durationMode,
  isExtendedRangeOpen,
  setIsExtendedRangeOpen,
  showCustomDateRange,
  onToggleCustom,
  onSelect,
}: {
  durationMode: RangePreset | null;
  isExtendedRangeOpen: boolean;
  setIsExtendedRangeOpen: (open: boolean) => void;
  showCustomDateRange: boolean;
  onToggleCustom: () => void;
  onSelect: (preset: RangePreset) => void;
}) {
  return (
    <div className="flex min-h-[52px] max-w-full min-w-0 flex-wrap content-start items-end gap-2.5 border-b border-border/70 pb-1">
      <Button
        type="button"
        variant={durationMode === 'focus' ? 'default' : 'outline'}
        size="sm"
        className="h-9 px-3.5 text-xs sm:text-sm"
        onClick={() => onSelect('focus')}
      >
        ± 15 วัน
      </Button>
      <Button
        type="button"
        variant={durationMode === '7' ? 'default' : 'outline'}
        size="sm"
        className="h-9 px-3.5 text-xs sm:text-sm"
        onClick={() => onSelect('7')}
      >
        7 วัน
      </Button>
      <Button
        type="button"
        variant={durationMode === '30' ? 'default' : 'outline'}
        size="sm"
        className="h-9 px-3.5 text-xs sm:text-sm"
        onClick={() => onSelect('30')}
      >
        30 วัน
      </Button>
      <Button
        type="button"
        variant={durationMode === 'all' ? 'default' : 'outline'}
        size="sm"
        className="h-9 px-3.5 text-xs sm:text-sm"
        onClick={() => onSelect('all')}
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
              onClick={() => onSelect('90')}
            >
              ไตรมาสนี้
            </Button>
            <Button
              type="button"
              variant={durationMode === '180' ? 'default' : 'ghost'}
              size="sm"
              className="justify-start"
              onClick={() => onSelect('180')}
            >
              6 เดือน
            </Button>
            <Button
              type="button"
              variant={durationMode === '365' ? 'default' : 'ghost'}
              size="sm"
              className="justify-start"
              onClick={() => onSelect('365')}
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
        onClick={onToggleCustom}
      >
        <span>กำหนดเอง</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', showCustomDateRange && 'rotate-180')} />
      </button>
    </div>
  );
}

function applyCountryPresetRange(
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
  const range = buildCountryPresetRange(mode, new Date(), bounds);

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

function handleCountryCustomDateToggle(
  setShowCustomDateRange: (show: boolean | ((prev: boolean) => boolean)) => void,
  setDurationMode: (mode: RangePreset | null) => void,
  setDateError: (error: boolean) => void,
) {
  setShowCustomDateRange((prev) => !prev);
  setDurationMode(null);
  setDateError(false);
}

function formatCountryFlowMapCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function clampCountryFlowMapViewportValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCountryFlowMapLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function getClosestCountryFlowMapLongitude(longitude: number, referenceLongitude: number) {
  const normalizedLongitude = normalizeCountryFlowMapLongitude(longitude);
  let closestLongitude = normalizedLongitude;
  let closestDistance = Math.abs(normalizedLongitude - referenceLongitude);

  const shiftedPositive = normalizedLongitude + 360;
  const shiftedPositiveDistance = Math.abs(shiftedPositive - referenceLongitude);
  if (shiftedPositiveDistance < closestDistance) {
    closestLongitude = shiftedPositive;
    closestDistance = shiftedPositiveDistance;
  }

  const shiftedNegative = normalizedLongitude - 360;
  const shiftedNegativeDistance = Math.abs(shiftedNegative - referenceLongitude);
  if (shiftedNegativeDistance < closestDistance) {
    closestLongitude = shiftedNegative;
  }

  return closestLongitude;
}

type CountryFlowMapPlotPoint = DashboardCountryFlowMapPointResponse & {
  plotLongitude: number;
};

function mapCountryFlowMapPlotPoints(
  points: DashboardCountryFlowMapPointResponse[],
  referenceLongitude: number,
): CountryFlowMapPlotPoint[] {
  return points
    .filter((point) => point.latitude != null && point.longitude != null)
    .map((point) => ({
      ...point,
      plotLongitude: getClosestCountryFlowMapLongitude(point.longitude as number, referenceLongitude),
    }));
}

function buildCountryFlowMapViewport(
  points: CountryFlowMapPlotPoint[],
  selectedLatitude: number,
  selectedLongitude: number,
) {
  const latitudes = [selectedLatitude, ...points.map((point) => point.latitude as number)];
  const longitudes = [selectedLongitude, ...points.map((point) => point.plotLongitude)];

  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  const latitudeSpan = Math.max(10, maxLatitude - minLatitude);
  const longitudeSpan = Math.max(16, maxLongitude - minLongitude);

  const latitudePadding = Math.min(18, Math.max(6, latitudeSpan * 0.28));
  const longitudePadding = Math.min(26, Math.max(8, longitudeSpan * 0.24));
  const rightSideBoost = Math.min(22, Math.max(6, longitudeSpan * 0.2));
  const centerWestBias = Math.min(14, Math.max(2.5, longitudeSpan * 0.12));

  const latRangeMin = clampCountryFlowMapViewportValue(minLatitude - latitudePadding, -82, 84);
  const latRangeMax = clampCountryFlowMapViewportValue(maxLatitude + latitudePadding, -82, 84);
  const lonRangeMin = minLongitude - longitudePadding;
  const lonRangeMax = maxLongitude + longitudePadding + rightSideBoost;

  const centerLatitude = clampCountryFlowMapViewportValue((latRangeMin + latRangeMax) / 2, -82, 84);
  const centerLongitude = normalizeCountryFlowMapLongitude(((lonRangeMin + lonRangeMax) / 2) - centerWestBias);
  const spanForScale = Math.max(18, latRangeMax - latRangeMin, lonRangeMax - lonRangeMin);
  const projectionScale = clampCountryFlowMapViewportValue(205 / spanForScale, 0.85, 4.8);

  return {
    centerLatitude,
    centerLongitude,
    projectionScale,
  };
}

function getCountryFlowMapVisiblePoints(
  points: DashboardCountryFlowMapPointResponse[],
  direction: 'inbound' | 'outbound',
  mode: CountryFlowMapMode,
) {
  if (mode !== 'both' && mode !== direction) {
    return [];
  }

  return points
    .filter((point) => point.latitude != null && point.longitude != null)
    .slice()
    .sort((a, b) => b.flights - a.flights)
    .slice(0, COUNTRY_FLOW_MAP_TOP_N);
}

export function CountryView() {
  const { drillTo, selections, timeMode, rangePreset, setRangePreset, customDateRange, setCustomDateRange } = useDrillDown();
  const country = selections.country || COUNTRIES.find(c => c.name === 'N. Macedonia') || COUNTRIES[0];
  const displayCountryName = resolveCountryDisplayName(country.name, country.countryCode);
  const countryQuery = (country.countryCode || country.name).trim();

  const [dateBounds, setDateBounds] = useState<DashboardDateBoundsResponse | null>(null);
  const [allAirports, setAllAirports] = useState<AirportInfo[]>([]);
  const [displayAirports, setDisplayAirports] = useState<AirportInfo[]>([]);
  const [inboundRows, setInboundRows] = useState<DashboardCountryInboundBreakdownResponse[]>([]);
  const [topAirlineName, setTopAirlineName] = useState('');
  const [topAirlineSharePct, setTopAirlineSharePct] = useState<number | undefined>(undefined);
  const [countryFlights, setCountryFlights] = useState(country.flights);
  const [countryDeltaText, setCountryDeltaText] = useState(`${country.deltaN >= 0 ? '▲' : '▼'} ${country.deltaN >= 0 ? '+' : ''}${country.deltaN} เที่ยวบิน (${country.delta})`);
  const [countryDeltaPercent, setCountryDeltaPercent] = useState(0);
  const [countryFlowMapData, setCountryFlowMapData] = useState<DashboardCountryFlowMapResponse | null>(null);
  const [countryFlowMapLoading, setCountryFlowMapLoading] = useState(true);
  const [countryFlowMapError, setCountryFlowMapError] = useState<string | null>(null);
  const [countryFlowMapMode, setCountryFlowMapMode] = useState<CountryFlowMapMode>('both');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [durationMode, setDurationMode] = useState<RangePreset | null>(rangePreset);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [fromCalendarMonth, setFromCalendarMonth] = useState(new Date());
  const [toCalendarMonth, setToCalendarMonth] = useState(new Date());
  const [isExtendedRangeOpen, setIsExtendedRangeOpen] = useState(false);
  const [dateError, setDateError] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const lastFlowMapRequestKeyRef = useRef('');

  const startDate = dateRange?.from ? formatLocalDateInput(dateRange.from) : undefined;
  const endDate = dateRange?.to ? formatLocalDateInput(dateRange.to) : undefined;

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

    if (rangePreset === 'all' && !dateBounds?.minDate) {
      return;
    }

    applyCountryPresetRange(
      rangePreset,
      setDateRange,
      setDurationMode,
      setFromCalendarMonth,
      setToCalendarMonth,
      setShowCustomDateRange,
      setIsExtendedRangeOpen,
      setDateError,
      dateBounds,
    );
  }, [rangePreset, dateBounds, customDateRange]);

  useEffect(() => {
    let alive = true;

    const loadBounds = async () => {
      try {
        const bounds = await runDrillDownRequest('country:date-bounds', () => getDashboardDateBounds());
        if (!alive) return;
        setDateBounds(bounds);
      } catch {
        if (!alive) return;
        setDateBounds(null);
        setLoadError('ไม่สามารถโหลดช่วงวันที่ได้');
        setIsLoading(false);
      }
    };

    void loadBounds();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) {
      if (showCustomDateRange) {
        setDateError(true);
        return;
      }

      if (dateBounds) {
        setLoadError('ไม่สามารถกำหนดช่วงวันที่ได้');
        setIsLoading(false);
      }
      return;
    }

    let alive = true;
    setDateError(false);

    const loadCountryOverview = async () => {
      if (!hasLoadedOnceRef.current) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const payload = await runDrillDownRequest(
          `country:overview:${countryQuery}:${startDate}__${endDate}`,
          () => getCountryOverview(countryQuery, { startDate, endDate, timeoutMs: 60000 }),
        );

        if (!alive) return;

        const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#22c55e'];
        const mappedAirports = payload.airports.map((airport, idx) => ({
          iata: airport.iata,
          name: airport.name,
          flights: airport.flights,
          routes: airport.routes,
          airlines: airport.airlines,
          color: colors[idx % colors.length],
        }));
        setAllAirports(mappedAirports);
        setDisplayAirports(filterActiveAirports(mappedAirports));
        setInboundRows(payload.inbound);
        setTopAirlineName(payload.topAirline.name || '');
        setTopAirlineSharePct(payload.topAirline.sharePercent ?? undefined);
        setCountryFlights(payload.totals.flights);
        setCountryDeltaPercent(payload.totals.deltaPercent);
        setCountryDeltaText(
          `${payload.totals.deltaFlights >= 0 ? '▲' : '▼'} ${payload.totals.deltaFlights >= 0 ? '+' : ''}${payload.totals.deltaFlights.toLocaleString()} เที่ยวบิน (${payload.totals.deltaPercent >= 0 ? '+' : ''}${payload.totals.deltaPercent.toFixed(1)}%)`,
        );
        hasLoadedOnceRef.current = true;
        setIsLoading(false);
      } catch {
        if (!alive) return;
        setAllAirports([]);
        setDisplayAirports([]);
        setInboundRows([]);
        setTopAirlineName('');
        setTopAirlineSharePct(undefined);
        setCountryFlights(0);
        setCountryDeltaPercent(0);
        setCountryDeltaText('ไม่สามารถโหลดข้อมูลประเทศได้');
        setLoadError('ไม่สามารถโหลดข้อมูลประเทศได้');
        hasLoadedOnceRef.current = true;
        setIsLoading(false);
      }
    };

    void loadCountryOverview();

    return () => {
      alive = false;
    };
  }, [country.name, country.countryCode, countryQuery, startDate, endDate, retryToken, showCustomDateRange, dateBounds, dateRange]);

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) {
      if (showCustomDateRange) {
        setDateError(true);
        return;
      }

      if (dateBounds) {
        setCountryFlowMapLoading(false);
      }
      return;
    }

    let alive = true;
    const flowMapRequestKey = `country:flow-map:${countryQuery}:${startDate}__${endDate}`;

    if (lastFlowMapRequestKeyRef.current !== flowMapRequestKey) {
      lastFlowMapRequestKeyRef.current = flowMapRequestKey;
      setCountryFlowMapLoading(true);
    }

    const loadCountryFlowMap = async () => {
      setCountryFlowMapLoading(true);
      setCountryFlowMapError(null);

      try {
        const payload = await runDrillDownRequest(
          flowMapRequestKey,
          () =>
            getCountryFlowMap(countryQuery, {
              startDate,
              endDate,
              timeoutMs: 60000,
            }),
        );

        if (!alive) return;

        setCountryFlowMapData(payload);
        setCountryFlowMapLoading(false);
      } catch {
        if (!alive) return;
        setCountryFlowMapData(null);
        setCountryFlowMapError('ไม่สามารถโหลดแผนที่การบินได้');
        setCountryFlowMapLoading(false);
      }
    };

    void loadCountryFlowMap();

    return () => {
      alive = false;
    };
  }, [countryQuery, startDate, endDate, retryToken, showCustomDateRange, dateBounds, dateRange]);

  const totalRoutes = displayAirports.reduce((s, a) => s + a.routes, 0);

  const countryPct = countryDeltaPercent;
  const countryFlightTone =
    countryPct != null
      ? growthDeltaTypeFromPct(countryPct, timeMode)
      : country.deltaN < 0
        ? 'down'
        : 'neutral';

  const kpis: KPIItem[] = [
    {
      label: 'เที่ยวบินทั้งหมด',
      value: countryFlights.toLocaleString(),
      delta: countryDeltaText,
      deltaType: countryFlightTone,
      accentColor: KPI_ACCENT.flights,
    },
    {
      label: 'สนามบินที่มีการใช้งาน',
      value: displayAirports.length.toString(),
      delta: 'จากทั้งหมด ' + allAirports.length.toLocaleString() + ' สนามบิน',
      deltaType: 'neutral',
      growthColored: false,
      accentColor: KPI_ACCENT.airports,
    },
    {
      label: 'จุดหมายที่ให้บริการ',
      value: `${totalRoutes.toLocaleString()} ${totalRoutes !== 1 ? ' ' : ''}`,
      delta: 'สนามบิน',
      deltaType: 'neutral',
      growthColored: false,
      accentColor: KPI_ACCENT.average,
    },
    {
      label: 'สายการบินหลัก',
      value: topAirlineName,
      delta:
        topAirlineSharePct != null
          ? `ส่วนแบ่งตลาดหลัก ${topAirlineSharePct.toFixed(1)}%`
          : 'ส่วนแบ่งตลาดหลัก',
      deltaType: 'neutral',
      growthColored: false,
      accentColor: KPI_ACCENT.highlight,
    },
  ];

  if (isLoading) {
    return <CountryViewSkeleton countryName={displayCountryName} />;
  }

  if (loadError) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-6">
        <div className="space-y-3">
          <div className="text-xl font-bold break-words">{country.flag} {displayCountryName}</div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
          </div>
          <button
            type="button"
            onClick={() => setRetryToken((value) => value + 1)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            ลองโหลดใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold text-left px-3 py-4 sm:text-2xl sm:px-5 sm:py-5 lg:text-3xl lg:p-7">
                                        <img
  src={`https://www.worldometers.info/images/flags/original/${emojiFlagToCode(country.flag)}.webp`}
  alt={`${country.flag} flag`}
  className="inline-block w-10 h-6"
/> {displayCountryName}</h2>
          {/* <p className="text-[15px] text-muted-foreground font-medium break-words">
            เลือกสนามบินใน {displayCountryName} เพื่อดูข้อมูลวิเคราะห์
          </p> */}
        </div>
        <div className="min-w-0 w-full sm:w-auto sm:min-w-[420px]">
          <div className="mb-2 text-sm font-medium text-muted-foreground">ช่วงวันที่</div>
          <CountryPresetBar
            durationMode={durationMode}
            isExtendedRangeOpen={isExtendedRangeOpen}
            setIsExtendedRangeOpen={setIsExtendedRangeOpen}
            showCustomDateRange={showCustomDateRange}
            onToggleCustom={() => handleCountryCustomDateToggle(setShowCustomDateRange, setDurationMode, setDateError)}
            onSelect={setRangePreset}
          />
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
                        MonthCaption: CountryCalendarCaption,
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
                        MonthCaption: CountryCalendarCaption,
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

      <KPIRow items={kpis} />

      <CountryFlowMapPanel
        countryName={displayCountryName}
        data={countryFlowMapData}
        loading={countryFlowMapLoading}
        error={countryFlowMapError}
        mode={countryFlowMapMode}
        onModeChange={setCountryFlowMapMode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3.5">
        <AirportPieChart displayAirports={displayAirports} />
        <BusiestAirportsPanel airports={allAirports} drillTo={drillTo} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <AirlineMarketSharePanel
          countryName={displayCountryName}
          countryQuery={countryQuery}
          startDate={startDate}
          endDate={endDate}
          topAirport={displayAirports[0] ?? allAirports[0] ?? null}
        />
        <InboundCountriesPanel countryName={displayCountryName} rows={inboundRows} />
      </div>

      <div className="flex justify-center pt-1">
        <BackButton label={`กลับไปยัง ${selections.continent?.name || 'ทวีป'}`} onClick={() => drillTo('continent')} />
      </div>
    </div>
  );
}

function AirportPieChart({ displayAirports }: { displayAirports: AirportInfo[] }) {
  const {
    elementRef: barChartContainerRef,
    width: barChartWidth,
    isReady: isBarChartContainerReady,
  } = usePositiveElementSize<HTMLDivElement>();

  const topAirports = [...displayAirports]
    .sort((a, b) => b.flights - a.flights)
    .slice(0, 5);
  const totalTop5 = topAirports.reduce((sum, airport) => sum + airport.flights, 0);

  const barData = topAirports
    .map((airport) => ({
      iata: airport.iata,
      name: airport.name,
      value: airport.flights,
      color: airport.color,
      pct: ((airport.flights / (totalTop5 || 1)) * 100).toFixed(1),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="bg-card border border-border rounded-[10px] pl-4 pr-2 py-3">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="text-[16px] font-bold">การกระจายปริมาณเที่ยวบินตามสนามบิน</div>
        <div className="text-xs text-muted-foreground font-medium">Top 5</div>
      </div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        {barData.map((airport) => (
          <span key={airport.iata} className="inline-flex items-center gap-1.5">
            {/* <span className="w-2.5 h-2.5 rounded-full" style={{ background: airport.color }} /> */}
            {/* <span className="font-semibold">{airport.iata}</span> */}
            {/* <span>{airport.pct}%</span> */}
          </span>
        ))}
      </div>
      <div ref={barChartContainerRef} className="h-[270px] min-h-[270px] min-w-0 -ml-2">
        {isBarChartContainerReady ? (
          <BarChart
            width={Math.max(300, barChartWidth)}
            height={270}
            data={barData}
            layout="vertical"
            margin={{ top: 6, right: 10, left: 8, bottom: 6 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fontWeight: 600 }}
              tickFormatter={(value: number) => value.toLocaleString()}
              className="text-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="iata"
              width={54}
              tick={{ fontSize: 13, fontWeight: 700 }}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '14px' }}
              labelFormatter={(label) => `สนามบิน ${label}`}
              formatter={(value: number, _name: string, item: any) => [`${value.toLocaleString()} เที่ยวบิน (${item?.payload?.pct || '0.0'}%)`, item?.payload?.name || '']}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
            กำลังเตรียมกราฟ...
          </div>
        )}
      </div>
    </div>
  );
}

function BusiestAirportsPanel({
  airports,
  drillTo,
}: {
  airports: AirportInfo[];
  drillTo: (level: 'airport', selection: { airport: AirportInfo }) => void;
}) {
  const [sortKey, setSortKey] = useState<'iata' | 'name' | 'flights' | 'routes' | 'airlines'>('flights');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleCount, setVisibleCount] = useState(AIRPORT_TABLE_INITIAL_ROWS);
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(AIRPORT_TABLE_INITIAL_ROWS);
  }, [airports]);

  const sorted = useMemo(() => {
    return [...airports].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (sortKey === 'iata') {
        return direction * a.iata.localeCompare(b.iata);
      }
      if (sortKey === 'name') {
        return direction * a.name.localeCompare(b.name);
      }
      if (sortKey === 'flights') {
        return direction * (a.flights - b.flights);
      }
      if (sortKey === 'routes') {
        return direction * (a.routes - b.routes);
      }
      return direction * (a.airlines - b.airlines);
    });
  }, [airports, sortDirection, sortKey]);

  const filtered = useMemo(() => {
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((a) => a.iata.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  }, [sorted, search]);

  const visibleRows = filtered.slice(0, visibleCount);
  const hasMoreRows = visibleCount < filtered.length;

  const handleSort = (key: 'iata' | 'name' | 'flights' | 'routes' | 'airlines') => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'iata' || key === 'name' ? 'asc' : 'desc');
  };

  const sortMarker = (key: 'iata' | 'name' | 'flights' | 'routes' | 'airlines') => {
    if (sortKey !== key) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + AIRPORT_TABLE_STEP_ROWS, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    if (!hasMoreRows) return;
    const root = scrollRef.current;
    const target = loaderRef.current;
    if (!root || !target) return;
    const observer = new window.IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.unobserve(target);
  }, [hasMoreRows, loadMore]);

  return (
    <div className="bg-card border border-border rounded-[10px] p-4 lg:h-[361px] lg:flex lg:flex-col">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[16px] font-bold">สนามบินที่มีเที่ยวบินสูงสุด</div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            แสดง {Math.min(visibleCount, filtered.length).toLocaleString()} / {filtered.length.toLocaleString()}
            {search ? ` (กรองจาก ${sorted.length.toLocaleString()})` : ''}
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(AIRPORT_TABLE_INITIAL_ROWS); }}
            placeholder="ค้นหา IATA หรือชื่อสนามบิน"
            className="w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-border/70">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-card">
                <th className="px-3 py-2.5 text-left">
                  <button type="button" onClick={() => handleSort('iata')} className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                    IATA <span className="text-[11px]">{sortMarker('iata')}</span>
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left">
                  <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                    สนามบิน <span className="text-[11px]">{sortMarker('name')}</span>
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <button type="button" onClick={() => handleSort('flights')} className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                    เที่ยวบิน <span className="text-[11px]">{sortMarker('flights')}</span>
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <button type="button" onClick={() => handleSort('routes')} className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                    เส้นทาง <span className="text-[11px]">{sortMarker('routes')}</span>
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <button type="button" onClick={() => handleSort('airlines')} className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                    สายการบิน <span className="text-[11px]">{sortMarker('airlines')}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    ไม่พบข้อมูลสนามบิน
                  </td>
                </tr>
              ) : (
                visibleRows.map((airport) => (
                  <tr
                    key={airport.iata}
                    role="button"
                    tabIndex={0}
                    onClick={() => drillTo('airport', { airport })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        drillTo('airport', { airport });
                      }
                    }}
                    className="border-b border-border/60 last:border-b-0 cursor-pointer hover:bg-primary/[0.03]"
                  >
                    <td className="px-3 py-2.5 font-extrabold text-primary">{airport.iata}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{airport.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-primary">{airport.flights.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-muted-foreground">{airport.routes}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-muted-foreground">{airport.airlines}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div ref={loaderRef} style={{ height: 1 }} />
          {!hasMoreRows && visibleRows.length > 0 && (
            <div className="py-3 text-center text-muted-foreground text-sm">แสดงข้อมูลครบแล้ว</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CountryViewSkeleton({ countryName }: { countryName: string }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-7 w-64 rounded-md bg-muted" />
          <div className="h-5 w-80 rounded-md bg-muted/70" />
        </div>
        <div className="h-10 w-28 rounded-md bg-muted/70" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[126px] rounded-[10px] border border-border bg-card p-4 sm:p-6" />
        ))}
      </div>

      <div className="h-[530px] rounded-[10px] border border-border bg-card" />

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_1.4fr]">
        <div className="h-[320px] rounded-[10px] border border-border bg-card" />
        <div className="h-[320px] rounded-[10px] border border-border bg-card" />
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div className="h-[260px] rounded-[10px] border border-border bg-card" />
        <div className="h-[260px] rounded-[10px] border border-border bg-card" />
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-[180px] rounded-[10px] border border-border bg-card p-5" />
        ))}
      </div>

      <div className="flex justify-center pt-1">
        <div className="h-10 w-56 rounded-lg bg-muted/70" />
      </div>
    </div>
  );
}

function InboundCountriesPanel({
  countryName,
  rows,
}: {
  countryName: string;
  rows: DashboardCountryInboundBreakdownResponse[];
}) {
  const sorted = [...rows].sort((a, b) => b.flights - a.flights);
  const totalFlights = sorted.reduce((sum, row) => sum + row.flights, 0) || 1;

  return (
    <div className="bg-card border border-border rounded-[10px] p-5 lg:h-[400px] lg:flex lg:flex-col">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[16px] font-bold break-words">
          ประเทศที่บินเข้ามายัง {countryName} มากที่สุด
        </div>
        <div className="text-xs text-muted-foreground">อ้างอิง 5 อันดับล่าสุด</div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-border/70">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted/20">
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">ประเทศ</th>
                <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">เที่ยวบิน</th>
                <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">อัตราส่วน</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    ไม่พบข้อมูลประเทศขาเข้า
                  </td>
                </tr>
              ) : (
                sorted.map((c: DashboardCountryInboundBreakdownResponse, i: number) => {
                  const share = (c.flights / totalFlights) * 100;

                  return (
                    <tr key={c.name} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
                      <td className="px-3 py-2.5 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base"> 
                            <img
  src={`https://www.worldometers.info/images/flags/original/${emojiFlagToCode(c.flag)}.webp`}
  alt={`${c.flag} flag`}
  className="inline-block w-6 h-4"
/>
                          </span>
                          <span className="font-medium text-foreground ">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-bold text-primary">
                        {c.flights.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-muted-foreground">
                        {share.toFixed(1)}%
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
function AirlineMarketSharePanel({
  countryName,
  countryQuery,
  startDate,
  endDate,
  topAirport,
}: {
  countryName: string;
  countryQuery: string;
  startDate: string | undefined;
  endDate: string | undefined;
  topAirport: AirportInfo | null;
}) {
  const { drillTo } = useDrillDown();
  const [rows, setRows] = useState<DashboardCountryAirlineBreakdownResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [sortKey, setSortKey] = useState<'name' | 'flights' | 'share'>('flights');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const handleSort = (key: 'name' | 'flights' | 'share') => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder(key === 'name' ? 'asc' : 'desc');
    }
  };

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortKey === 'name') return dir * a.name.localeCompare(b.name);
      if (sortKey === 'flights') return dir * (a.flights - b.flights);
      return dir * (a.share - b.share);
    });
  }, [rows, sortKey, sortOrder]);

  useEffect(() => {
    if (!countryQuery || !startDate || !endDate) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setVisibleCount(5);

    statisticsApi
      .getDashboardCountryAirlineMarket(countryQuery, { startDate, endDate, timeoutMs: 60000 })
      .then((data) => {
        if (!alive) return;
        setRows(data.rows);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setRows([]);
        setError('ไม่สามารถโหลดข้อมูลสายการบินได้');
        setLoading(false);
      });

    return () => { alive = false; };
  }, [countryQuery, startDate, endDate]);

  const max = Math.max(...rows.map((r) => r.flights), 1);
  const visibleAirlines = sorted.slice(0, visibleCount);
  const hasMoreRows = visibleCount < sorted.length;

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + 10, sorted.length));
  }, [sorted.length]);

  useEffect(() => {
    if (!hasMoreRows) return;
    const root = scrollRef.current;
    const target = loaderRef.current;
    if (!root || !target) return;
    const observer = new window.IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.unobserve(target);
  }, [hasMoreRows, loadMore]);

  return (
    <div className="bg-card border border-border rounded-[10px] p-5 lg:h-[400px] lg:flex lg:flex-col">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[16px] font-bold break-words">
          สายการบินที่ให้บริการใน {countryName}
        </div>
        <div className="text-xs text-muted-foreground">คลิกสายการบินเพื่อดูรายละเอียด</div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-border/70">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                    <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center gap-1 hover:text-foreground">
                      สายการบิน <span className="text-[11px]">{sortKey === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                    <button type="button" onClick={() => handleSort('flights')} className="inline-flex items-center gap-1 hover:text-foreground">
                      เที่ยวบิน <span className="text-[11px]">{sortKey === 'flights' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">Bar</th>
                  <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                    <button type="button" onClick={() => handleSort('share')} className="inline-flex items-center gap-1 hover:text-foreground">
                      ส่วนแบ่ง <span className="text-[11px]">{sortKey === 'share' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      ไม่พบข้อมูลสายการบิน
                    </td>
                  </tr>
                ) : (
                  visibleAirlines.map((airline: DashboardCountryAirlineBreakdownResponse, i: number) => {
                    const barW = ((airline.flights / max) * 100).toFixed(0);
                    const canDrill = Boolean(airline.airlineId);
                    return (
                      <tr
                        key={airline.airlineId ?? `${i}-${airline.name}`}
                        role={canDrill ? 'button' : undefined}
                        tabIndex={canDrill ? 0 : undefined}
                        onClick={() => {
                          if (canDrill) drillTo('airline', { airline: { id: airline.airlineId, name: airline.name }, ...(topAirport ? { airport: topAirport } : {}) });
                        }}
                        onKeyDown={(e) => {
                          if (canDrill && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            drillTo('airline', { airline: { id: airline.airlineId, name: airline.name }, ...(topAirport ? { airport: topAirport } : {}) });
                          }
                        }}
                        className={cn(
                          'border-b border-border/60 last:border-b-0',
                          canDrill ? 'cursor-pointer hover:bg-primary/[0.06]' : 'hover:bg-primary/[0.03]',
                        )}
                      >
                        <td className="px-3 py-2.5 font-bold text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-foreground">{airline.name}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-primary">{airline.flights.toLocaleString()}</td>
                        <td className="px-3 py-2.5">
                          <div className="h-2 w-28 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${barW}%` }} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground font-bold">{airline.share.toFixed(1)}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div ref={loaderRef} style={{ height: 1 }} />
            {!hasMoreRows && visibleAirlines.length > 0 && (
              <div className="py-3 text-center text-muted-foreground text-sm">แสดงข้อมูลครบแล้ว</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CountryFlowMapPanel({
  countryName,
  data,
  loading,
  error,
  mode,
  onModeChange,
}: {
  countryName: string;
  data: DashboardCountryFlowMapResponse | null;
  loading: boolean;
  error: string | null;
  mode: CountryFlowMapMode;
  onModeChange: (mode: CountryFlowMapMode) => void;
}) {
  const inboundPoints = data ? getCountryFlowMapVisiblePoints(data.inbound.points, 'inbound', mode) : [];
  const outboundPoints = data ? getCountryFlowMapVisiblePoints(data.outbound.points, 'outbound', mode) : [];
  const inboundTop = inboundPoints[0];
  const outboundTop = outboundPoints[0];

  return (
    <div className="bg-card border border-border rounded-[10px] p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-[16px] font-bold break-words">Inbound / Outbound Flow Map — {countryName}</div>
          <div className="text-xs text-muted-foreground">
            Top country flow patterns based on the selected date range.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'inbound' ? 'default' : 'outline'}
            className="h-8 px-3 text-xs"
            onClick={() => onModeChange('inbound')}
          >
            Inbound
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'outbound' ? 'default' : 'outline'}
            className="h-8 px-3 text-xs"
            onClick={() => onModeChange('outbound')}
          >
            Outbound
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'both' ? 'default' : 'outline'}
            className="h-8 px-3 text-xs"
            onClick={() => onModeChange('both')}
          >
            Both
          </Button>
        </div>
      </div>

      {data ? (
        <div className="relative">
          {loading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[14px] border border-border/70 bg-background/80 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <div className="text-sm font-medium text-muted-foreground">Loading flow map...</div>
              </div>
            </div>
          ) : null}

          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2.5 py-1 font-semibold text-foreground">
              Inbound {formatCountryFlowMapCount(data.inbound.totalFlights)}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2.5 py-1 font-semibold text-foreground">
              Outbound {formatCountryFlowMapCount(data.outbound.totalFlights)}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2.5 py-1 font-semibold text-foreground">
              Selected {data.country.code || countryName}
            </span>
          </div>

          <div className="overflow-hidden rounded-[14px] border border-border/70 bg-slate-950/95">
            <CountryFlowMapSvg data={data} mode={mode} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
            {inboundTop ? (
              <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1">
                Top inbound: {inboundTop.countryName} ({inboundTop.pct.toFixed(1)}%)
              </span>
            ) : null}
            {outboundTop ? (
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1">
                Top outbound: {outboundTop.countryName} ({outboundTop.pct.toFixed(1)}%)
              </span>
            ) : null}
            {inboundPoints.length === 0 && outboundPoints.length === 0 ? (
              <span className="rounded-full border border-border bg-muted/30 px-3 py-1">
                No flow points available in this range
              </span>
            ) : null}
          </div>
        </div>
      ) : error ? (
        <div className="flex h-[430px] items-center justify-center rounded-[14px] border border-dashed border-border bg-muted/20 px-6 text-center">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">Flow map is unavailable</div>
            <div className="text-sm text-muted-foreground">{error}</div>
          </div>
        </div>
      ) : (
        <div className="flex h-[430px] items-center justify-center rounded-[14px] border border-dashed border-border bg-muted/20 px-6 text-center">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">No flow map data</div>
            <div className="text-sm text-muted-foreground">Try a different date range or refresh the view.</div>
          </div>
        </div>
      )}
    </div>
  );
}

const CountryFlowMapSvg = memo(function CountryFlowMapSvg({
  data,
  mode,
}: {
  data: DashboardCountryFlowMapResponse;
  mode: CountryFlowMapMode;
}) {
  const graphDivRef = useRef<HTMLDivElement | null>(null);
  const plotlyRef = useRef<any>(null);
  const {
    elementRef: mapContainerRef,
    width: mapWidth,
    height: mapHeight,
    isReady: isMapContainerReady,
  } = usePositiveElementSize<HTMLDivElement>();

  const inboundPoints = useMemo(() => mapCountryFlowMapPlotPoints(
    getCountryFlowMapVisiblePoints(data.inbound.points, 'inbound', mode),
    data.country.longitude ?? 0,
  ), [data.country.longitude, data.inbound.points, mode]);
  const outboundPoints = useMemo(() => mapCountryFlowMapPlotPoints(
    getCountryFlowMapVisiblePoints(data.outbound.points, 'outbound', mode),
    data.country.longitude ?? 0,
  ), [data.country.longitude, data.outbound.points, mode]);
  const selectedLatitude = data.country.latitude ?? 15;
  const selectedLongitude = data.country.longitude ?? 0;

  const allFlights = [
    ...inboundPoints.map((point) => point.flights),
    ...outboundPoints.map((point) => point.flights),
  ];
  const maxFlights = Math.max(1, ...allFlights);

  const toLineCoords = (
    points: CountryFlowMapPlotPoint[],
    direction: 'inbound' | 'outbound',
  ) => {
    const latitudes: Array<number | null> = [];
    const longitudes: Array<number | null> = [];

    points.forEach((point) => {
      if (direction === 'inbound') {
        latitudes.push(point.latitude as number, selectedLatitude, null);
        longitudes.push(point.plotLongitude, selectedLongitude, null);
      } else {
        latitudes.push(selectedLatitude, point.latitude as number, null);
        longitudes.push(selectedLongitude, point.plotLongitude, null);
      }
    });

    return { latitudes, longitudes };
  };

  const inboundLine = toLineCoords(inboundPoints, 'inbound');
  const outboundLine = toLineCoords(outboundPoints, 'outbound');

  const inboundSizes = inboundPoints.map((point) => Math.max(8, Math.min(20, 8 + (point.flights / maxFlights) * 12)));
  const outboundSizes = outboundPoints.map((point) => Math.max(8, Math.min(20, 8 + (point.flights / maxFlights) * 12)));
  const viewport = buildCountryFlowMapViewport(
    [...inboundPoints, ...outboundPoints],
    selectedLatitude,
    selectedLongitude,
  );

  const traces = useMemo(() => ([
    {
      type: 'scattergeo',
      mode: 'lines',
      lon: inboundLine.longitudes,
      lat: inboundLine.latitudes,
      line: {
        width: 2.5,
        color: 'rgba(20, 184, 166, 0.55)',
      },
      hoverinfo: 'skip',
      showlegend: false,
    },
    {
      type: 'scattergeo',
      mode: 'lines',
      lon: outboundLine.longitudes,
      lat: outboundLine.latitudes,
      line: {
        width: 2.5,
        color: 'rgba(59, 130, 246, 0.55)',
      },
      hoverinfo: 'skip',
      showlegend: false,
    },
    {
      type: 'scattergeo',
      mode: 'markers',
      lon: inboundPoints.map((point) => point.plotLongitude),
      lat: inboundPoints.map((point) => point.latitude),
      text: inboundPoints.map((point) => `${point.countryName}: ${formatCountryFlowMapCount(point.flights)} flights (${point.pct.toFixed(1)}%)`),
      hovertemplate: '%{text}<extra>Inbound</extra>',
      marker: {
        size: inboundSizes,
        color: '#14b8a6',
        opacity: 0.92,
        line: {
          width: 1.2,
          color: '#ffffff',
        },
      },
      showlegend: false,
    },
    {
      type: 'scattergeo',
      mode: 'markers',
      lon: outboundPoints.map((point) => point.plotLongitude),
      lat: outboundPoints.map((point) => point.latitude),
      text: outboundPoints.map((point) => `${point.countryName}: ${formatCountryFlowMapCount(point.flights)} flights (${point.pct.toFixed(1)}%)`),
      hovertemplate: '%{text}<extra>Outbound</extra>',
      marker: {
        size: outboundSizes,
        color: '#3b82f6',
        opacity: 0.92,
        line: {
          width: 1.2,
          color: '#ffffff',
        },
      },
      showlegend: false,
    },
    {
      type: 'scattergeo',
      mode: 'markers+text',
      lon: [selectedLongitude],
      lat: [selectedLatitude],
      text: [data.country.name],
      textposition: 'top right',
      textfont: {
        size: 12,
        color: '#e2e8f0',
      },
      hovertemplate: `${data.country.name}<extra>Selected country</extra>`,
      marker: {
        size: 16,
        color: '#f59e0b',
        line: {
          width: 2,
          color: '#ffffff',
        },
      },
      showlegend: false,
    },
  ]), [
    data.country.name,
    inboundLine.latitudes,
    inboundLine.longitudes,
    inboundPoints,
    inboundSizes,
    outboundLine.latitudes,
    outboundLine.longitudes,
    outboundPoints,
    outboundSizes,
    selectedLatitude,
    selectedLongitude,
  ]);

  const plotLayout = useMemo(() => ({
    autosize: false,
    width: mapWidth,
    height: mapHeight,
    margin: { t: 0, r: 0, b: 0, l: 0 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    uirevision: 'country-flow-map',
    geo: {
      projection: {
        type: 'natural earth',
        scale: viewport.projectionScale,
      },
      center: {
        lat: viewport.centerLatitude,
        lon: viewport.centerLongitude,
      },
      showland: true,
      landcolor: '#1e293b',
      showocean: true,
      oceancolor: '#0f172a',
      showlakes: true,
      lakecolor: '#0f172a',
      showcountries: true,
      countrycolor: 'rgba(148, 163, 184, 0.45)',
      showcoastlines: true,
      coastlinecolor: 'rgba(148, 163, 184, 0.45)',
      bgcolor: 'rgba(0,0,0,0)',
      lataxis: {
        showgrid: true,
        gridcolor: 'rgba(148, 163, 184, 0.18)',
      },
      lonaxis: {
        showgrid: true,
        gridcolor: 'rgba(148, 163, 184, 0.18)',
      },
    },
  }), [
    mapHeight,
    mapWidth,
    viewport.centerLatitude,
    viewport.centerLongitude,
    viewport.projectionScale,
  ]);

  const plotConfig = useMemo(() => ({
    displayModeBar: false,
    responsive: false,
    scrollZoom: false,
    doubleClick: false,
    showTips: false,
  }), []);

  useEffect(() => {
    if (!isMapContainerReady || !graphDivRef.current) return;

    let cancelled = false;
    const target = graphDivRef.current;

    const renderPlot = async () => {
      try {
        if (!plotlyRef.current) {
          const mod = await import('plotly.js-dist-min');
          plotlyRef.current = (mod as any).default ?? mod;
        }

        if (cancelled || !target) return;

        await Promise.resolve(
          plotlyRef.current.react(target, traces as any, plotLayout as any, plotConfig as any),
        ).catch(() => {
          // Ignore transient Plotly lifecycle races during rapid state updates.
        });
      } catch {
        // Ignore dynamic import/render failures to avoid uncaught promise noise.
      }
    };

    void renderPlot();

    return () => {
      cancelled = true;
    };
  }, [
    isMapContainerReady,
    plotConfig,
    plotLayout,
    traces,
  ]);

  useEffect(() => {
    return () => {
      const target = graphDivRef.current;
      if (!target || !plotlyRef.current) return;

      try {
        plotlyRef.current.purge(target);
      } catch {
        // Ignore purge failures on teardown.
      }
    };
  }, []);

  return (
    <div ref={mapContainerRef} className="h-[430px] w-full min-w-0">
      {isMapContainerReady ? (
        <div ref={graphDivRef} className="h-full w-full" />
      ) : (
        <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
          กำลังเตรียมแผนที่...
        </div>
      )}
    </div>
  );
});
