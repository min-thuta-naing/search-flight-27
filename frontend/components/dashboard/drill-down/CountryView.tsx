'use client';

import { useEffect, useState } from 'react';
import { addDays, subDays } from 'date-fns';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  COUNTRIES,
  growthDeltaTypeFromPct,
} from '@/lib/dashboard/drill-down-data';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import {
  getCountryOverview,
} from '@/lib/dashboard/services/drilldown';
import { runDrillDownRequest } from '@/lib/dashboard/drill-down-cache';
import {
  statisticsApi,
  type DashboardDateBoundsResponse,
  type DashboardCountryAirportBreakdownResponse,
  type DashboardCountryInboundBreakdownResponse,
  type DashboardCountryAirlineBreakdownResponse,
} from '@/lib/api/statistics-api';
import { useDrillDown, KPIRow, BackButton, TimeToggle } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import type { RangePreset } from './DrillDownDashboard';
import type { AirportInfo } from '@/types/dashboard';

const COUNTRY_DISPLAY_NAMES = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;
const COUNTRY_DISPLAY_ALIASES: Record<string, string> = {
  CD: 'Kinshasa',
};

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

export function CountryView() {
  const { drillTo, selections, timeMode, rangePreset } = useDrillDown();
  const country = selections.country || COUNTRIES.find(c => c.name === 'N. Macedonia') || COUNTRIES[0];
  const displayCountryName = resolveCountryDisplayName(country.name, country.countryCode);
  const countryQuery = (country.countryCode || country.name).trim();

  const [dateBounds, setDateBounds] = useState<DashboardDateBoundsResponse | null>(null);
  const [displayAirports, setDisplayAirports] = useState<AirportInfo[]>([]);
  const [inboundRows, setInboundRows] = useState<DashboardCountryInboundBreakdownResponse[]>([]);
  const [airlineMarketRows, setAirlineMarketRows] = useState<DashboardCountryAirlineBreakdownResponse[]>([]);
  const [topAirlineName, setTopAirlineName] = useState('');
  const [topAirlineSharePct, setTopAirlineSharePct] = useState<number | undefined>(undefined);
  const [countryFlights, setCountryFlights] = useState(country.flights);
  const [countryDeltaText, setCountryDeltaText] = useState(`${country.deltaN >= 0 ? '▲' : '▼'} ${country.deltaN >= 0 ? '+' : ''}${country.deltaN} เที่ยวบิน (${country.delta})`);
  const [countryDeltaPercent, setCountryDeltaPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const presetRange = buildCountryPresetRange(rangePreset, new Date(), dateBounds);
  const startDate = presetRange?.from ? formatLocalDateInput(presetRange.from) : undefined;
  const endDate = presetRange?.to ? formatLocalDateInput(presetRange.to) : undefined;

  useEffect(() => {
    let alive = true;

    const loadBounds = async () => {
      try {
        const bounds = await runDrillDownRequest('country:date-bounds', () => statisticsApi.getDashboardDateBounds());
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
    if (!startDate || !endDate) {
      if (dateBounds) {
        setLoadError('ไม่สามารถกำหนดช่วงวันที่ได้');
        setIsLoading(false);
      }
      return;
    }

    let alive = true;

    const loadCountryOverview = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const payload = await runDrillDownRequest(
          `country:overview:${countryQuery}:${startDate}__${endDate}`,
          () => getCountryOverview(countryQuery, { startDate, endDate, timeoutMs: 60000 }),
        );

        if (!alive) return;

        const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#22c55e'];
        setDisplayAirports(filterActiveAirports(payload.airports).map((airport, idx) => ({
          iata: airport.iata,
          name: airport.name,
          flights: airport.flights,
          routes: airport.routes,
          airlines: airport.airlines,
          color: colors[idx % colors.length],
        })));
        setInboundRows(payload.inbound);
        setAirlineMarketRows(payload.airlineMarket.map((airline, idx) => ({
          ...airline,
          color: colors[idx % colors.length],
        })));
        setTopAirlineName(payload.topAirline.name || '');
        setTopAirlineSharePct(payload.topAirline.sharePercent ?? undefined);
        setCountryFlights(payload.totals.flights);
        setCountryDeltaPercent(payload.totals.deltaPercent);
        setCountryDeltaText(
          `${payload.totals.deltaFlights >= 0 ? '▲' : '▼'} ${payload.totals.deltaFlights >= 0 ? '+' : ''}${payload.totals.deltaFlights.toLocaleString()} เที่ยวบิน (${payload.totals.deltaPercent >= 0 ? '+' : ''}${payload.totals.deltaPercent.toFixed(1)}%)`,
        );
        setIsLoading(false);
      } catch {
        if (!alive) return;
        setDisplayAirports([]);
        setInboundRows([]);
        setAirlineMarketRows([]);
        setTopAirlineName('');
        setTopAirlineSharePct(undefined);
        setCountryFlights(0);
        setCountryDeltaPercent(0);
        setCountryDeltaText('ไม่สามารถโหลดข้อมูลประเทศได้');
        setLoadError('ไม่สามารถโหลดข้อมูลประเทศได้');
        setIsLoading(false);
      }
    };

    void loadCountryOverview();

    return () => {
      alive = false;
    };
  }, [country.name, country.countryCode, countryQuery, startDate, endDate, retryToken]);

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
      delta: 'ตามฐานข้อมูลล่าสุด',
      deltaType: 'neutral',
      growthColored: false,
      accentColor: KPI_ACCENT.airports,
    },
    {
      label: 'จุดหมายที่ให้บริการ',
      value: `${totalRoutes}+`,
      delta: 'ครอบคลุมหลายภูมิภาค',
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
          <h2 className="text-xl font-bold mb-1 break-words">{country.flag} {displayCountryName}</h2>
          <p className="text-[15px] text-muted-foreground font-medium break-words">
            เลือกสนามบินใน {displayCountryName} เพื่อดูข้อมูลวิเคราะห์
          </p>
        </div>
        <div className="shrink-0 self-start sm:self-auto">
          <TimeToggle />
        </div>
      </div>

      <KPIRow items={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3.5">
        <AirportPieChart displayAirports={displayAirports} />
        <BusiestAirportsPanel displayAirports={displayAirports} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <InboundCountriesPanel countryName={displayCountryName} rows={inboundRows} />
        <AirlineMarketSharePanel countryName={displayCountryName} rows={airlineMarketRows} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {displayAirports.map((a) => (
          <button
            key={a.iata}
            type="button"
            onClick={() => drillTo('airport', { airport: a })}
            className="bg-card border rounded-[10px] p-5 text-left transition-all cursor-pointer border-primary shadow-sm hover:-translate-y-0.5"
          >
            <div className="text-4xl font-extrabold tracking-tight mb-1 text-primary">
              {a.iata}
            </div>
            <div className="text-sm text-muted-foreground mb-4">{a.name}</div>
            <div className="flex gap-5">
              <div>
                <div className="text-lg font-bold">{a.flights.toLocaleString()}</div>
                <div className="text-[15px] text-muted-foreground">เที่ยวบิน</div>
              </div>
              <div>
                <div className="text-lg font-bold">{a.routes}</div>
                <div className="text-[15px] text-muted-foreground">จุดหมาย</div>
              </div>
              <div>
                <div className="text-lg font-bold">{a.airlines}</div>
                <div className="text-[15px] text-muted-foreground">สายการบิน</div>
              </div>
            </div>
            <div className="text-[15px] text-primary mt-4 font-bold">{'\u25B6'} ดูข้อมูลวิเคราะห์ทั้งหมด</div>
          </button>
        ))}
      </div>

      <div className="flex justify-center pt-1">
        <BackButton label={`กลับไปยัง ${selections.continent?.name || 'ทวีป'}`} onClick={() => drillTo('continent')} />
      </div>
    </div>
  );
}

function AirportPieChart({ displayAirports }: { displayAirports: AirportInfo[] }) {
  const total = displayAirports.reduce((s, a) => s + a.flights, 0);

  const pieData = displayAirports.map((a) => ({
    name: `${a.iata} (${a.name.split('"')[0].trim()})`,
    value: a.flights,
    color: a.color,
    iata: a.iata,
    pct: ((a.flights / (total || 1)) * 100).toFixed(1),
  }));

  return (
    <div className="bg-card border border-border rounded-[10px] p-6">
      <div className="text-[16px] font-bold mb-5">การกระจายปริมาณเที่ยวบินตามสนามบิน</div>
      <div className="flex items-center gap-6 justify-center">
        <ResponsiveContainer width={170} height={170}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" nameKey="name" stroke="hsl(var(--background))" strokeWidth={2}>
              {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '14px' }} formatter={(value: number, name: string) => [`${value} เที่ยวบิน`, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-3">
          {pieData.map((a) => (
            <div key={a.iata} className="flex items-center gap-2.5 text-[14px] px-3 py-2 rounded-md hover:bg-primary/5 transition-colors">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: a.color }} />
              <span><strong className="text-[15px]">{a.iata}</strong> {'\u00B7'} {a.value.toLocaleString()} เที่ยวบิน</span>
              <span className="font-bold ml-auto pl-4">{a.pct}%</span>
            </div>
          ))}
          <div className="text-center text-xl font-bold mt-2">{total.toLocaleString()} <span className="text-[13px] text-muted-foreground font-normal">เที่ยวบินทั้งหมด</span></div>
        </div>
      </div>
    </div>
  );
}

function BusiestAirportsPanel({ displayAirports }: { displayAirports: AirportInfo[] }) {
  const sorted = [...displayAirports].sort((a, b) => b.flights - a.flights);
  return (
    <div className="bg-card border border-border rounded-[10px] p-6">
      <div className="text-[16px] font-bold mb-5">{'🏆'} สนามบินที่คึกคักที่สุด</div>
      {sorted.map((a, i) => (
        <div key={a.iata} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5 py-3 border-b border-border/60 last:border-b-0">
          <div className="flex items-center gap-3.5">
            <div className="text-2xl font-extrabold text-primary w-8 shrink-0">#{i + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-extrabold text-primary">{a.iata}</div>
              <div className="text-[14px] text-muted-foreground truncate font-medium">{a.name}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-4 sm:shrink-0 pl-11 sm:pl-0 sm:ml-auto">
            <div className="text-center"><div className="text-lg font-bold">{a.flights.toLocaleString()}</div><div className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold">เที่ยวบิน</div></div>
            <div className="text-center"><div className="text-lg font-bold">{a.routes}</div><div className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold">เส้นทาง</div></div>
            <div className="text-center"><div className="text-lg font-bold">{a.airlines}</div><div className="text-[13px] uppercase tracking-wider text-muted-foreground font-bold">สายการบิน</div></div>
          </div>
        </div>
      ))}
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
  const sorted = rows;

  return (
    <div className="bg-card border border-border rounded-[10px] p-5 h-full">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[16px] font-bold break-words">
          {'🛬'} Top Inbound Countries — {countryName}
        </div>
        <div className="text-xs text-muted-foreground">อ้างอิง 5 อันดับล่าสุด</div>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-border/70">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">ประเทศ</th>
              <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">เที่ยวบิน</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  ไม่พบข้อมูลประเทศขาเข้า
                </td>
              </tr>
            ) : (
              sorted.map((c: DashboardCountryInboundBreakdownResponse, i: number) => (
                <tr key={c.name} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
                  <td className="px-3 py-2.5 font-bold text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.flag}</span>
                      <span className="font-medium text-foreground">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-primary">{c.flights.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AirlineMarketSharePanel({
  countryName,
  rows,
}: {
  countryName: string;
  rows: DashboardCountryAirlineBreakdownResponse[];
}) {
  const airlines = rows;
  const max = airlines[0]?.flights || 1;

  return (
    <div className="bg-card border border-border rounded-[10px] p-5 h-full">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[16px] font-bold break-words">
          {'✈️'} Top Airlines Market Share — {countryName}
        </div>
        <div className="text-xs text-muted-foreground">อ้างอิง 5 อันดับล่าสุด</div>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-border/70">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">สายการบิน</th>
              <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">เที่ยวบิน</th>
              <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wide text-muted-foreground">ส่วนแบ่ง</th>
            </tr>
          </thead>
          <tbody>
            {airlines.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  ไม่พบข้อมูลสายการบิน
                </td>
              </tr>
            ) : (
              airlines.map((airline: DashboardCountryAirlineBreakdownResponse, i: number) => {
                const barW = (airline.flights / max * 100).toFixed(0);
                return (
                  <tr key={airline.name} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
                    <td className="px-3 py-2.5 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-medium text-foreground">{airline.name}</span>
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${barW}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-primary">{airline.flights.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground font-bold">{airline.share.toFixed(1)}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
