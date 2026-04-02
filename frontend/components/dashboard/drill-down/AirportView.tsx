'use client';

import { useState, useId } from 'react';
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
import { buildWowWeeklyBarData, buildWowWeeklyTrendPoints, weeklyTotalsFromDailyRows } from '@/lib/dashboard/week-chart';
import { getAirportDetail } from '@/lib/dashboard/services/drilldown';
import { useDrillDown, KPIRow, BackButton, TimeToggle } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import type { TimeMode } from '@/types/dashboard';

type AirportDetail = ReturnType<typeof getAirportDetail>;

export function AirportView() {
  const { drillTo, timeMode, selections } = useDrillDown();
  const airport = selections.airport || MK_AIRPORTS[0];

  // Fetch per selected airport — currently returns the same mock data
  // but the architecture is ready for a per-airport API lookup.
  const detail = getAirportDetail(airport.iata);
  const { routes: ROUTES, hourTotal: HOUR_TOTAL, daily: DAILY } = detail;
  const countryForTone = selections.country;
  const countryPct = countryForTone ? parsePercentFromDelta(countryForTone.delta) : null;
  const countryTone =
    countryPct != null
      ? growthDeltaTypeFromPct(countryPct, timeMode)
      : countryForTone && countryForTone.deltaN < 0
        ? 'down'
        : 'neutral';

  // Derive KPIs from data
  const topRoute = ROUTES.length > 0 ? ROUTES.reduce((a, b) => a.flights > b.flights ? a : b) : null;
  const hourEntries = Object.entries(HOUR_TOTAL).map(([h, f]) => ({ hour: Number(h), flights: f }));
  const busiestHour = hourEntries.reduce((a, b) => a.flights > b.flights ? a : b);
  const totalDailyFlights = DAILY.reduce((s, d) => s + d.flights, 0);

  const kpis: KPIItem[] = [
    { label: 'เที่ยวบินขาออกทั้งหมด', value: airport.flights.toLocaleString(), delta: `\u25B2 ช่วง ${DAILY.length} วัน`, deltaType: 'neutral', growthColored: false, accentColor: KPI_ACCENT.flights },
    { label: 'เฉลี่ยต่อวัน', value: Math.round(totalDailyFlights / DAILY.length).toString(), delta: 'ตามรายงานล่าสุด', deltaType: 'neutral', growthColored: false, accentColor: KPI_ACCENT.airports },
    { label: 'จุดหมายยอดนิยม', value: topRoute ? topRoute.city : '-', delta: topRoute ? `${topRoute.flights} เที่ยวบิน \u00B7 ${topRoute.flag}` : '-', deltaType: 'neutral', growthColored: false, accentColor: KPI_ACCENT.average },
    { label: 'ชั่วโมงที่คึกคักที่สุด', value: `${busiestHour.hour.toString().padStart(2, '0')}:00`, delta: `${busiestHour.flights} เที่ยวบินขาออก`, deltaType: 'neutral', growthColored: false, accentColor: KPI_ACCENT.highlight },
  ];

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
            {airport.flights} ขาออก {'\u00B7'} {airport.routes} จุดหมาย {'\u00B7'} {airport.airlines} สายการบิน
          </p>
        </div>
        <div className="shrink-0 self-start lg:self-auto">
          <TimeToggle />
        </div>
      </div>

      <KPIRow items={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <TrendSparkChart timeMode={timeMode} detail={detail} />
        <SeasonalTrendChart timeMode={timeMode} detail={detail} />
      </div>

      <TopDestinationsPanel detail={detail} />
      <InvestmentPanel timeMode={timeMode} detail={detail} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <AirlineSharePanel detail={detail} />
        <HourDistributionPanel timeMode={timeMode} detail={detail} />
      </div>

      <div className="flex justify-center pt-1">
        <BackButton label="กลับไปยังประเทศ" onClick={() => drillTo('country')} />
      </div>
    </div>
  );
}

function TrendSparkChart({ timeMode, detail }: { timeMode: TimeMode; detail: AirportDetail }) {
  const gradientId = useId();
  const { daily: DAILY, monthly: MONTHLY, monthLabels: AP_MONTHS } = detail;
  const now = new Date();
  const nowIdx = now.getMonth();
  const nowYear = now.getFullYear();

  // WoW: 5 weeks (±2 from current), Thai brief ranges; totals scaled from daily sample avg × 7
  const wowData = buildWowWeeklyTrendPoints(DAILY);

  // MoM: ±2 months around calendar “เดือนนี้” (not a fixed mock month)
  const startIdx = Math.max(0, nowIdx - 2);
  const endIdx = Math.min(11, nowIdx + 2);
  const momData = MONTHLY
    .map((v, i) => ({ day: AP_MONTHS[i], flights: v, _idx: i }))
    .filter((d) => d._idx >= startIdx && d._idx <= endIdx);

  // YoY: all 12 months
  const yoyData = AP_MONTHS.map((m, i) => ({ day: m, flights: MONTHLY[i] }));

  const tData = timeMode === 'wow' ? wowData : timeMode === 'mom' ? momData : yoyData;
  const peak = Math.max(...tData.map((d) => d.flights));
  const total = tData.reduce((s, d) => s + d.flights, 0);
  const peakEntry = tData.find((d) => d.flights === peak)!;

  const minVal = Math.min(...tData.map((d) => d.flights));
  const yDomain: [number, number] = [Math.floor(minVal * 0.9), Math.ceil(peak * 1.1)];

  const subtitle = timeMode === 'wow'
    ? 'ภาพรวมรายสัปดาห์ (\u00B12 สัปดาห์)'
    : timeMode === 'mom'
      ? 'ภาพรวมรายเดือน (±2 เดือน)'
      : 'ภาพรวมรายปี';

  const dateRange = timeMode === 'wow'
    ? `${wowData[0]?.day} \u2013 ${wowData[wowData.length - 1]?.day} · 5 สัปดาห์`
    : timeMode === 'mom'
      ? `${momData[0]?.day} \u2013 ${momData[momData.length - 1]?.day} ${nowYear}`
      : `ม.ค. \u2013 ธ.ค. ${nowYear}`;

  // Center week index matches buildWowWeeklyBarData / buildWowWeeklyTrendPoints (±2 from current Monday).
  const wowCurrentIdx = 2;
  const currentPeriodDetail =
    timeMode === 'wow'
      ? wowData[wowCurrentIdx]?.day
      : `${AP_MONTHS[nowIdx] ?? ''} ${nowYear}`.trim();

  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-[10px] p-4 hover:border-primary hover:-translate-y-0.5 transition-all">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-base uppercase tracking-wider text-muted-foreground">{subtitle}</div>
          <div className="text-[15px] font-bold">แนวโน้มเที่ยวบิน</div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-bold leading-none">{total.toLocaleString()}</div>
          <div className="text-[13px] text-accent font-semibold mt-1">{'\u25B2'} คงที่</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" minHeight={180} height={192}>
        <AreaChart
          data={tData}
          margin={{
            top: 10,
            right: 12,
            left: 4,
            bottom: timeMode === 'wow' ? 36 : 8,
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
            tickMargin={timeMode === 'wow' ? 10 : 8}
            interval={timeMode === 'yoy' ? 1 : 0}
            className="text-muted-foreground"
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 13, fontWeight: 600 }}
            className="text-muted-foreground"
            tickCount={5}
            width={48}
          />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '14px' }} formatter={(value: number) => [`${value} เที่ยวบิน`, '']} />
          <Area type="monotone" dataKey="flights" stroke="#2563eb" strokeWidth={2.5} fill={`url(#${gradientId})`} />
          {(timeMode === 'mom' || timeMode === 'yoy') && (
            <ReferenceDot
              x={AP_MONTHS[nowIdx]}
              y={MONTHLY[nowIdx]}
              r={6}
              fill="#d29922"
              stroke="#fff"
              strokeWidth={2}
            />
          )}
          <ReferenceDot x={peakEntry.day} y={peak} r={7} fill="#ff9f43" stroke="#fff" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between text-[15px] font-medium text-muted-foreground mt-2.5">
        <span>{dateRange}</span>
        <span className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          <span className="text-primary font-bold">{'\u25CF'} แนวโน้ม</span>
          <span style={{ color: 'var(--chart-current)' }} className="font-bold">
            {'\u25CF'} {timeMode === 'wow' ? 'สัปดาห์นี้' : 'เดือนนี้'}
            {currentPeriodDetail ? ` \u00B7 ${currentPeriodDetail}` : ''}
          </span>
          <span style={{ color: 'var(--chart-peak)' }} className="font-bold">{'\u25CF'} {timeMode === 'wow' ? 'สัปดาห์สูงสุด' : 'เดือนสูงสุด'}</span>
        </span>
      </div>
    </div>
  );
}

function SeasonalTrendChart({ timeMode, detail }: { timeMode: TimeMode; detail: AirportDetail }) {
  const { daily: DAILY, monthly: MONTHLY, monthLabels: AP_MONTHS } = detail;
  const now = new Date();
  const nowIdx = now.getMonth();

  let chartData: Array<{ month: string; value: number; color: string }>;
  let title: string;
  const peakVal = Math.max(...MONTHLY);
  const prevIdx = (nowIdx + 11) % 12;

  if (timeMode === 'wow') {
    title = 'แนวโน้มรายสัปดาห์ (WoW)';
    chartData = buildWowWeeklyBarData(weeklyTotalsFromDailyRows(DAILY));
  } else if (timeMode === 'mom') {
    title = 'แนวโน้มรายเดือน (MoM)';
    const startIdx = Math.max(0, nowIdx - 2);
    const endIdx = Math.min(11, nowIdx + 2);
    chartData = MONTHLY
      .map((v, i) => ({
        month: AP_MONTHS[i],
        value: v,
        color: i === nowIdx ? '#d29922' : v === peakVal ? '#ff9f43' : i === prevIdx ? '#2563eb' : '#bfdbfe',
        _idx: i,
      }))
      .filter((d) => d._idx >= startIdx && d._idx <= endIdx);
  } else {
    title = 'แนวโน้มฤดูกาล (รายปี)';
    chartData = MONTHLY.map((v, i) => ({
      month: AP_MONTHS[i],
      value: v,
      color: i === nowIdx ? '#d29922' : v === peakVal ? '#ff9f43' : '#bfdbfe',
    }));
  }

  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-[10px] p-4 hover:border-primary hover:-translate-y-0.5 transition-all">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--chart-3)]" />
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[16px] font-bold">{title}</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" minHeight={200} height={208}>
        <BarChart
          data={chartData}
          margin={{
            top: 12,
            right: 12,
            left: 4,
            bottom:
              timeMode === 'wow' ? 44 : timeMode === 'mom' ? 20 : 28,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 13, fontWeight: 600 }}
            tickMargin={timeMode === 'wow' ? 10 : 8}
            interval={timeMode === 'yoy' ? 1 : 0}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 13, fontWeight: 600 }}
            width={48}
            tickCount={5}
            className="text-muted-foreground"
          />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '14px' }} formatter={(value: number) => [`${value} เที่ยวบิน`, '']} />
          <Bar
            dataKey="value"
            radius={[5, 5, 0, 0]}
            maxBarSize={timeMode === 'yoy' ? 32 : timeMode === 'mom' ? 42 : 48}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} opacity={entry.color === '#bfdbfe' ? 0.55 : 0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-between text-[15px] font-medium text-muted-foreground mt-2">
        <span>
          {timeMode === 'wow'
            ? '5 สัปดาห์ · \u00B12 สัปดาห์จากสัปดาห์ปัจจุบัน'
            : timeMode === 'mom'
              ? '\u00B12 เดือนจากเดือนปัจจุบัน · เที่ยวบินต่อเดือน'
              : `ทั้งปี ${'\u00B7'} เที่ยวบินต่อเดือน`}
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <span style={{ color: 'var(--chart-current)' }} className="font-bold">{'\u25A0'} {timeMode === 'wow' ? 'สัปดาห์ปัจจุบัน' : 'เดือนปัจจุบัน'}</span>
          <span style={{ color: 'var(--chart-peak)' }} className="font-bold">{'\u25A0'} {timeMode === 'wow' ? 'สัปดาห์ที่สูงสุด' : 'เดือนที่สูงสุด'}</span>
          {timeMode === 'mom' && (
            <span style={{ color: 'var(--chart-1)' }} className="font-bold">{'\u25A0'} เดือนก่อนหน้า</span>
          )}
          <span style={{ color: timeMode === 'yoy' ? 'var(--chart-mid)' : 'var(--chart-subtle)' }} className="font-bold">{'\u25A0'} อื่นๆ</span>
        </span>
      </div>
    </div>
  );
}

function TopDestinationsPanel({ detail }: { detail: AirportDetail }) {
  const { routes: ROUTES, arrivals: ARRIVALS } = detail;
  const top5dep = ROUTES.slice(0, 5);
  const maxDep = top5dep[0].flights;
  const maxArr = ARRIVALS[0].flights;

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
          <div className="text-[14px] text-muted-foreground">21{'\u2013'}24 ต.ค. 2026 {'\u00B7'} 5 อันดับแรกแต่ละทิศทาง</div>
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
          {ARRIVALS.map((r, i) => renderRow(r, i, maxArr))}
        </div>
      </div>
    </div>
  );
}

function InvestmentPanel({ timeMode, detail }: { timeMode: TimeMode; detail: AirportDetail }) {
  const { investRoutes: INVEST_ROUTES } = detail;
  const modeKey = timeMode;
  const modeShort = timeMode.toUpperCase();

  const scored = INVEST_ROUTES.map((r) => ({ ...r, _score: calcInvestScore(r, timeMode) }))
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

function AirlineSharePanel({ detail }: { detail: AirportDetail }) {
  const { airlines: AIRLINES } = detail;
  const max = AIRLINES[0].count;
  return (
    <div className="bg-card border border-border rounded-[10px] p-4">
      <div className="text-[15px] font-bold mb-3.5">ส่วนแบ่งตลาดสายการบิน</div>
      {AIRLINES.map((a) => (
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

function HourDistributionPanel({ timeMode, detail }: { timeMode: TimeMode; detail: AirportDetail }) {
  const { hourTotal: HOUR_TOTAL, hourTotalArr: HOUR_TOTAL_ARR } = detail;
  const [view, setView] = useState<'both' | 'dep' | 'arr'>('both');
  const subtitle = timeMode === 'wow' ? 'รายสัปดาห์' : timeMode === 'mom' ? 'รายเดือน' : 'รายปี';

  const scale = timeMode === 'wow' ? 1 : timeMode === 'mom' ? 4 : 52;
  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    dep: (HOUR_TOTAL[h] || 0) * scale,
    arr: (HOUR_TOTAL_ARR[h] || 0) * scale,
  }));

  const chartData = hours.map((h) => ({
    hour: h.hour,
    hourLabel: `${h.hour.toString().padStart(2, '0')}:00`,
    dep: h.dep,
    arr: h.arr,
  }));

  const xTickHours = new Set([0, 3, 6, 9, 12, 15, 18, 21, 23]);

  const viewButtons: { key: 'both' | 'dep' | 'arr'; label: string }[] = [
    { key: 'both', label: 'ทั้งหมด' },
    { key: 'dep', label: 'ขาออก' },
    { key: 'arr', label: 'ขาเข้า' },
  ];

  return (
    <div className="bg-card border border-border rounded-[10px] p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="text-[15px] font-bold">เที่ยวบินตามชั่วโมง</div>
          <div className="text-[14px] text-muted-foreground font-medium">{subtitle}</div>
        </div>
        <div className="flex border border-border rounded-md overflow-hidden">
          {viewButtons.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setView(b.key)}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                view === b.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {b.label}
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
            {(view === 'both' || view === 'dep') && (
              <Bar dataKey="dep" name="ขาออก" stackId={view === 'both' ? 'hour' : undefined} fill="var(--chart-1)" radius={view === 'both' ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
            )}
            {(view === 'both' || view === 'arr') && (
              <Bar dataKey="arr" name="ขาเข้า" stackId={view === 'both' ? 'hour' : undefined} fill="var(--chart-2)" radius={view === 'both' ? [4, 4, 0, 0] : [4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {view === 'both' && (
        <div className="flex gap-4 mt-2 text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> ขาออก</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent" /> ขาเข้า</span>
        </div>
      )}
    </div>
  );
}
