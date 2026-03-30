'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BUSIEST_AIRPORTS,
  WORLD_TOP_DEP,
  WORLD_TOP_ARR,
  CONTINENTS,
  TOP_AIRLINES_WORLD,
  compareToPriorPeriodPhraseTh,
  fmtWorldKpiDeltaTh,
  getChangeForMode,
  growthCardBadgeClasses,
  growthDeltaTypeFromPct,
  modeLabel,
} from '@/lib/dashboard/drill-down-data';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import { enrichTopAirlinesWithListing } from '@/lib/dashboard/airline-ticker-map';
import { airportInfoFromBusiest } from '@/lib/dashboard/services/drilldown';
import { statisticsApi, type DashboardSummaryResponse } from '@/lib/api/statistics-api';
import { useDrillDown, KPIRow, ChangePill } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';

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

const RANGE_PRESET_DAYS: Record<RangePreset, number> = {
  focus: 15,
  '7': 7,
  '30': 30,
  all: 3650,
  '90': 90,
  '180': 180,
  '365': 365,
};

export function WorldView() {
  const { drillTo, timeMode } = useDrillDown();
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [rangePreset, setRangePreset] = useState<RangePreset>('focus');

  useEffect(() => {
    let mounted = true;
    const today = formatLocalDateInput(new Date());
    const windowDays = RANGE_PRESET_DAYS[rangePreset];

    statisticsApi
      .getDashboardSummary(today, windowDays)
      .then((data) => {
        if (mounted) setSummary(data);
      })
      .catch((error) => {
        console.warn('[WorldView] Failed to load dashboard summary from API, falling back to mock data.', error);
        if (mounted) setSummary(null);
      });

    return () => {
      mounted = false;
    };
  }, [rangePreset]);

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
          delta: `คำนวณจาก ${summary.windowDays * 2 + 1} วัน`,
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

  const summaryStart = summary ? formatDateThai(summary.periodStart) : '21 ต.ค. 2026';
  const summaryEnd = summary ? formatDateThai(summary.periodEnd) : '24 ต.ค. 2026';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold mb-1">ภาพรวมเที่ยวบินทั่วโลก</h2>
          <p className="text-sm text-muted-foreground">
            แสดงข้อมูลสำหรับ <strong>{summaryStart}{'\u2013'}{summaryEnd}</strong> {'\u00B7'} {summary ? 'ดึงจากฐานข้อมูล' : 'ยังใช้ mock สำรองอยู่'} {'\u00B7'} ช่วงปัจจุบัน: {RANGE_PRESET_LABELS[rangePreset]}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-2">
        {(Object.keys(RANGE_PRESET_LABELS) as RangePreset[]).map((preset) => (
          <Button
            key={preset}
            type="button"
            variant={rangePreset === preset ? 'default' : 'outline'}
            size="sm"
            className="h-9 px-3.5 text-xs sm:text-sm"
            onClick={() => setRangePreset(preset)}
          >
            {RANGE_PRESET_LABELS[preset]}
          </Button>
        ))}
      </div>

      <KPIRow items={kpis} />

      {/* Continent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONTINENTS.map((continent) => {
          const continentTone = growthDeltaTypeFromPct(getChangeForMode(continent, timeMode).pct, timeMode);
          return (
            <button
              key={continent.name}
              type="button"
              aria-label={`สำรวจ ${continent.name}`}
              onClick={() => drillTo('continent', { continent })}
              className={`relative overflow-hidden bg-card border rounded-[10px] p-4 sm:p-6 text-left transition-all hover:border-primary hover:-translate-y-1 hover:shadow-lg cursor-pointer group ${
                continent.highlight ? 'border-primary' : 'border-border'
              }`}
            >
              <span
                className={`absolute top-3 right-3 sm:top-4 sm:right-4 text-[12px] sm:text-[14px] font-bold py-0.5 px-2 rounded-full ${growthCardBadgeClasses(continentTone)}`}
              >
                {continent.delta.includes(' (') ? continent.delta.replace(' (', ' เที่ยวบิน (') : continent.delta}
              </span>
              <div className="text-[32px] sm:text-[40px] mb-2 sm:mb-3">{continent.icon}</div>
              <div className="text-base sm:text-lg font-bold mb-1 sm:mb-1.5">{continent.name}</div>
              <div className="text-[14px] sm:text-[16px] text-muted-foreground mb-3 sm:mb-4">{continent.airports}</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <div className="text-xl sm:text-2xl font-bold text-primary">{continent.flights.toLocaleString()}</div>
                <div className="text-[13px] sm:text-[15px] text-muted-foreground">เที่ยวบิน</div>
              </div>
              <div className="text-[13px] sm:text-[14px] text-primary mt-2 sm:mt-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {'\u25B6'} สำรวจ {continent.name}
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
