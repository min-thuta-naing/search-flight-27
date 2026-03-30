'use client';

import { useEffect, useState } from 'react';
import { addDays, differenceInCalendarDays, format, subDays } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BUSIEST_AIRPORTS,
  WORLD_TOP_DEP,
  WORLD_TOP_ARR,
  CONTINENTS,
  TOP_AIRLINES_WORLD,
  compareToPriorPeriodPhraseTh,
  fmtWorldKpiDeltaTh,
  getChangeForMode,
  growthDeltaTypeFromPct,
  modeLabel,
} from '@/lib/dashboard/drill-down-data';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import { enrichTopAirlinesWithListing } from '@/lib/dashboard/airline-ticker-map';
import { airportInfoFromBusiest } from '@/lib/dashboard/services/drilldown';
import {
  statisticsApi,
  type DashboardSummaryResponse,
  type DashboardContinentCardResponse,
} from '@/lib/api/statistics-api';
import { useDrillDown, KPIRow, ChangePill } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import { cn } from '@/lib/utils';

type RangePreset = 'focus' | '7' | '30' | 'all' | '90' | '180' | '365';

const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  focus: '± 15 วัน',
  '7': '7 วัน',
  '30': '30 วัน',
  all: 'ทั้งหมด',
  '90': 'ไตรมาสนี้',
  '180': '6 เดือน',
  '365': '1 ปี',
};

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

  return { from: subDays(baseDate, 1), to: addDays(baseDate, 365) };
}

function formatRangeLabel(range?: DateRange) {
  if (!range?.from) {
    return 'กำลังเลือกช่วงวันที่';
  }

  const from = format(range.from, 'dd/MM/yyyy');
  const to = format(range.to || range.from, 'dd/MM/yyyy');
  return `${from} – ${to}`;
}

export function WorldView() {
  const { drillTo, timeMode } = useDrillDown();
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [continentCards, setContinentCards] = useState<DashboardContinentCardResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => buildPresetRange('focus'));
  const [durationMode, setDurationMode] = useState<RangePreset | null>('focus');
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [isExtendedRangeOpen, setIsExtendedRangeOpen] = useState(false);
  const [fromCalendarMonth, setFromCalendarMonth] = useState(() => subDays(new Date(), 15));
  const [toCalendarMonth, setToCalendarMonth] = useState(() => addDays(new Date(), 15));
  const [dateError, setDateError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setDateError(false);

    if (!dateRange?.from) {
      setDateError(true);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const startDate = formatLocalDateInput(dateRange.from);
    const endDate = formatLocalDateInput(dateRange.to || dateRange.from);

    Promise.all([
      statisticsApi.getDashboardSummary({ startDate, endDate }),
      statisticsApi.getDashboardContinents({ startDate, endDate }),
    ])
      .then(([summaryData, continentData]) => {
        if (!mounted) return;
        setSummary(summaryData);
        setContinentCards(continentData.continents);
        setLoading(false);
      })
      .catch((error) => {
        console.warn('[WorldView] Failed to load dashboard data from API, falling back to mock data.', error);
        if (!mounted) return;
        setSummary(null);
        setContinentCards(null);
        setLoading(false);
      });

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
  const continentList: DashboardContinentCardResponse[] = continentCards ?? CONTINENTS.map((continent) => ({
    key: continent.name as DashboardContinentCardResponse['key'],
    label: continent.name,
    icon: continent.icon,
    airports: continent.airports,
    airportCount: 0,
    countryCount: 0,
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

  const totalFlights = summary?.totalFlights ?? fallbackTotalFlights;
  const activeAirports = summary?.activeAirports ?? fallbackActiveAirports;
  const avgPerDay = summary?.averageFlightsPerDay ?? fallbackAvgPerDay;

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
          label: 'ทวีปที่คึกคักที่สุด',
          value: `${summary.busiestContinent.icon} ${summary.busiestContinent.label}`,
          delta: `${summary.busiestContinent.deltaFlights >= 0 ? '▲' : '▼'} ${summary.busiestContinent.deltaFlights >= 0 ? '+' : ''}${summary.busiestContinent.deltaFlights.toLocaleString()} (${summary.busiestContinent.deltaPercent >= 0 ? '+' : ''}${summary.busiestContinent.deltaPercent.toFixed(1)}%) · ${summary.busiestContinent.previousFlights.toLocaleString()} ก่อนหน้า`,
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
          delta: `${fallbackDeltaLine} · ${compareToPriorPeriodPhraseTh(timeMode)}`,
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
              onClick={() => applyPresetRange('focus', setDateRange, setDurationMode, setFromCalendarMonth, setToCalendarMonth, setShowCustomDateRange, setIsExtendedRangeOpen, setDateError)}
            >
              ± 15 วัน
            </Button>
            <Button
              type="button"
              variant={durationMode === '7' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => applyPresetRange('7', setDateRange, setDurationMode, setFromCalendarMonth, setToCalendarMonth, setShowCustomDateRange, setIsExtendedRangeOpen, setDateError)}
            >
              7 วัน
            </Button>
            <Button
              type="button"
              variant={durationMode === '30' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => applyPresetRange('30', setDateRange, setDurationMode, setFromCalendarMonth, setToCalendarMonth, setShowCustomDateRange, setIsExtendedRangeOpen, setDateError)}
            >
              30 วัน
            </Button>
            <Button
              type="button"
              variant={durationMode === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-3.5 text-xs sm:text-sm"
              onClick={() => applyPresetRange('all', setDateRange, setDurationMode, setFromCalendarMonth, setToCalendarMonth, setShowCustomDateRange, setIsExtendedRangeOpen, setDateError)}
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
                    onClick={() => applyPresetRange('90', setDateRange, setDurationMode, setFromCalendarMonth, setToCalendarMonth, setShowCustomDateRange, setIsExtendedRangeOpen, setDateError)}
                  >
                    ไตรมาสนี้
                  </Button>
                  <Button
                    type="button"
                    variant={durationMode === '180' ? 'default' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => applyPresetRange('180', setDateRange, setDurationMode, setFromCalendarMonth, setToCalendarMonth, setShowCustomDateRange, setIsExtendedRangeOpen, setDateError)}
                  >
                    6 เดือน
                  </Button>
                  <Button
                    type="button"
                    variant={durationMode === '365' ? 'default' : 'ghost'}
                    size="sm"
                    className="justify-start"
                    onClick={() => applyPresetRange('365', setDateRange, setDurationMode, setFromCalendarMonth, setToCalendarMonth, setShowCustomDateRange, setIsExtendedRangeOpen, setDateError)}
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
            {continentList.map((continent) => {
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

          <div className="grid grid-cols-1 xl:grid-cols-[2fr_2fr] gap-4">
            <BusiestAirportsTable />
            <TopAirlinesTable />
          </div>
          <TopDestinations />
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

function BusiestAirportsTable() {
  const { timeMode, drillTo } = useDrillDown();

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold flex items-center gap-2">
          {'🏆'} 5 อันดับสนามบินที่คึกคักที่สุดในโลก
        </h3>
      </div>
      <div className="bg-card border border-border rounded-[10px] overflow-hidden flex-1 min-w-0">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">#</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">สนามบิน</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">เมือง / ประเทศ</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">รวม</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">ขาออก</th>
                <th className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">ขาเข้า</th>
                <th className="text-[13px] tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">
                  {timeMode === 'wow' ? 'รายสัปดาห์' : timeMode === 'mom' ? 'รายเดือน' : 'รายปี'}
                </th>
              </tr>
            </thead>
            <tbody>
              {BUSIEST_AIRPORTS.map((airport) => {
                const { pct, num } = getChangeForMode(airport, timeMode);
                return (
                  <tr
                    key={airport.iata}
                    onClick={() => drillTo('airport', { airport: airportInfoFromBusiest(airport) })}
                    className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03] cursor-pointer group/row"
                  >
                    <td className="py-2.5 px-2.5 font-bold text-muted-foreground w-8 text-[14px] group-hover/row:text-primary transition-colors">{airport.rank}</td>
                    <td className="py-2.5 px-2.5">
                      <span className="font-extrabold text-primary tracking-tight">{airport.iata}</span>{' '}
                      <span className="text-base">{airport.flag}</span>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <div className="font-medium">{airport.city}</div>
                      <div className="text-[13px] text-muted-foreground">{airport.country}</div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold tabular-nums">{airport.total.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-right tabular-nums">{airport.dep.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-right tabular-nums">{airport.arr.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-right"><ChangePill pct={pct} num={num} active timeMode={timeMode} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TopAirlinesTable() {
  const { timeMode } = useDrillDown();
  const topAirlines = enrichTopAirlinesWithListing(TOP_AIRLINES_WORLD);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold flex items-center gap-2">
          {'✈️'} 5 อันดับสายการบินทั่วโลก
        </h3>
        <span className="text-[14px] text-muted-foreground">ตามจำนวนเที่ยวบิน</span>
      </div>
      <div className="bg-card border border-border rounded-[10px] overflow-hidden">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full min-w-[640px] border-collapse text-sm table-fixed">
            <thead>
              <tr className="border-b border-border">
                <th className="w-7 max-w-7 px-1 text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 text-center">#</th>
                <th className="w-[27%] text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">สายการบิน</th>
                <th className="w-[9%] text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">Ticker</th>
                <th className="w-[28%] text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-left">ตลาดหลักทรัพย์</th>
                <th className="w-[18%] text-[13px] uppercase tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">เที่ยวบิน</th>
                <th className="w-[18%] min-w-[7.5rem] text-[13px] tracking-wider text-muted-foreground font-bold py-2.5 px-2.5 text-right">
                  {timeMode === 'wow' ? 'รายสัปดาห์' : timeMode === 'mom' ? 'รายเดือน' : 'รายปี'}
                </th>
              </tr>
            </thead>
            <tbody>
              {topAirlines.map((airline) => {
                const { pct, num } = getChangeForMode(airline, timeMode);
                return (
                  <tr key={airline.iata} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
                    <td className="w-7 max-w-7 px-1 py-2.5 text-center font-bold tabular-nums text-muted-foreground text-[14px] align-middle">{airline.rank}</td>
                    <td className="py-2.5 px-2.5 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{airline.flag}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-[15px] whitespace-normal break-words leading-tight">{airline.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold tabular-nums text-[14px] align-middle">{airline.ticker || '-'}</td>
                    <td className="py-2.5 px-2.5 text-[13px] text-muted-foreground align-middle">
                      <span className="block whitespace-normal break-words leading-tight" title={airline.exchange || '-'}>
                        {airline.exchange || '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold tabular-nums text-[15px] align-middle">{airline.flights.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-right align-middle">
                      <ChangePill pct={pct} num={num} active timeMode={timeMode} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TopDestinations() {
  const { timeMode } = useDrillDown();

  const renderDest = (items: typeof WORLD_TOP_DEP) =>
    items.map((destination, index) => {
      const { pct, num } = getChangeForMode(destination, timeMode);
      return (
        <div key={destination.iata} className="flex items-center gap-2 py-1.5 border-b border-border/60 last:border-b-0">
          <span className="text-[14px] text-muted-foreground w-5 text-center shrink-0">{index + 1}</span>
          <span className="text-base shrink-0">{destination.icon}</span>
          <span className="text-[15px] font-medium flex-1 min-w-0 truncate">
            <strong>{destination.iata}</strong> {destination.name}
          </span>
          <span className="text-[14px] text-muted-foreground w-14 text-right shrink-0 tabular-nums">
            {(destination.flights / 1000).toFixed(1)}k
          </span>
          <ChangePill pct={pct} num={num} active timeMode={timeMode} />
        </div>
      );
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[16px] font-bold">{'🛫🛬'} 5 อันดับจุดหมายปลายทาง - ขาออก vs ขาเข้า</h3>
        <span className="text-[14px] text-muted-foreground">
          สนามบินที่ให้บริการมากที่สุดทั่วโลก {'\u00B7'} {modeLabel(timeMode)}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-card border border-border rounded-[10px] p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[14px] font-bold py-0.5 px-2.5 rounded-full bg-primary/15 text-primary">{'↑'} ขาออก</span>
            <span className="text-[16px] font-bold">5 อันดับจุดหมายขาออก</span>
          </div>
          {renderDest(WORLD_TOP_DEP)}
        </div>
        <div className="bg-card border border-border rounded-[10px] p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[14px] font-bold py-0.5 px-2.5 rounded-full bg-accent/10 text-accent">{'↓'} ขาเข้า</span>
            <span className="text-[16px] font-bold">5 อันดับจุดหมายขาเข้า</span>
          </div>
          {renderDest(WORLD_TOP_ARR)}
        </div>
      </div>
    </div>
  );
}
