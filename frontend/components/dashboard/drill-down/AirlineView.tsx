'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
  DashboardAirlineDetailTopAirport,
  DashboardAirlineDetailTopCountry,
} from '@/lib/api/statistics-api';
import { useDrillDown, KPIRow, BackButton } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import type { DrillLevel } from '@/types/dashboard';

// ─── helpers ────────────────────────────────────────────────────────────────

function getPreviousLevel(selections: {
  continent?: unknown;
  country?: unknown;
  airport?: unknown;
}): DrillLevel {
  if (selections.airport) return 'airport';
  if (selections.country) return 'country';
  if (selections.continent) return 'continent';
  return 'world';
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 space-y-1">
        <div className="text-[16px] font-bold">{title}</div>
        {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function TopAirportsTable({ rows }: { rows: DashboardAirlineDetailTopAirport[] }) {
  if (!rows.length) {
    return <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">ไม่มีข้อมูลสนามบินปลายทาง</div>;
  }
  const max = rows[0]?.flights || 1;
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/20">
          <tr>
            <th className="px-3 py-2 text-left text-[13px] font-semibold text-muted-foreground">#</th>
            <th className="px-3 py-2 text-left text-[13px] font-semibold text-muted-foreground">Airport</th>
            <th className="px-3 py-2 text-left text-[13px] font-semibold text-muted-foreground">Country</th>
            <th className="px-3 py-2 text-right text-[13px] font-semibold text-muted-foreground">Flights</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.iata} className="border-t border-border/60">
              <td className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2.5">
                <div className="font-medium leading-none">{row.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{row.iata}</div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span>{row.flag}</span>
                  <span className="text-sm">{row.country}</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(row.flights / max) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right tabular-nums font-semibold text-sm">{row.flights.toLocaleString()}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopCountriesTable({ rows, totalFlights }: { rows: DashboardAirlineDetailTopCountry[]; totalFlights: number }) {
  if (!rows.length) {
    return <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">ไม่มีข้อมูลประเทศปลายทาง</div>;
  }
  const max = rows[0]?.flights || 1;
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/20">
          <tr>
            <th className="px-3 py-2 text-left text-[13px] font-semibold text-muted-foreground">#</th>
            <th className="px-3 py-2 text-left text-[13px] font-semibold text-muted-foreground">Country</th>
            <th className="px-3 py-2 text-right text-[13px] font-semibold text-muted-foreground">Flights</th>
            <th className="px-3 py-2 text-right text-[13px] font-semibold text-muted-foreground">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.countryCode || row.countryName} className="border-t border-border/60">
              <td className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span>{row.flag}</span>
                  <span className="font-medium">{row.countryName}</span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(row.flights / max) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right tabular-nums font-semibold text-sm">{row.flights.toLocaleString()}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground text-sm">
                {totalFlights > 0 ? ((row.flights / totalFlights) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
          tooltip: {
            callbacks: { label: (ctx: any) => `${ctx.label}: ${(ctx.raw as number).toLocaleString()}` },
          },
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
  const { drillTo, level, selections } = useDrillDown();
  const airline = selections.airline;

  const filterValue = useMemo(() => {
    if (level === 'continent') return selections.continent?.name ?? '';
    if (level === 'country') return selections.country?.countryCode ?? selections.country?.name ?? '';
    if (level === 'airport') return selections.airport?.iata ?? '';
    return '';
  }, [level, selections]);

  const previousLevel = useMemo(() => getPreviousLevel(selections), [selections]);

  const [detail, setDetail] = useState<DashboardAirlineDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!airline?.id) {
      setLoading(false);
      setError(null);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    statisticsApi.getDashboardAirlineDetail({ airlineId: airline.id, level, filterValue })
      .then((data) => {
        if (!alive) return;
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'โหลดข้อมูลสายการบินไม่สำเร็จ');
        setLoading(false);
      });

    return () => { alive = false; };
  }, [airline?.id, level, filterValue]);

  // ── guard: no airline selected ──────────────────────────────────────────
  if (!airline) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-6">
        <div className="text-lg font-bold">ไม่พบข้อมูลสายการบิน</div>
        <div className="mt-2 text-sm text-muted-foreground">กลับไปเลือกสายการบินอีกครั้ง</div>
        <div className="mt-4">
          <BackButton label="กลับ" onClick={() => drillTo(previousLevel)} />
        </div>
      </div>
    );
  }

  const airlineName = detail?.airlineName || airline.name;
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[10px] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Airline Drill-down
            </div>
            <h2 className="text-2xl font-bold leading-tight">{airlineName}</h2>
            <p className="text-sm text-muted-foreground">
              {level === 'world' && 'ข้อมูลทั่วโลก'}
              {level === 'continent' && `ทวีป: ${selections.continent?.name ?? ''}`}
              {level === 'country' && `ประเทศ: ${selections.country?.name ?? ''}`}
              {level === 'airport' && `สนามบิน: ${selections.airport?.iata ?? ''} · ${selections.airport?.name ?? ''}`}
            </p>
          </div>
          <BackButton
            label={previousLevel === 'world' ? 'กลับสู่ภาพรวมโลก' : previousLevel === 'continent' ? 'กลับสู่ทวีป' : previousLevel === 'country' ? 'กลับสู่ประเทศ' : 'กลับสู่สนามบิน'}
            onClick={() => drillTo(previousLevel)}
          />
        </div>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[126px] rounded-[10px] border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[10px] border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <KPIRow items={kpis} />
      )}

      {/* Content panels */}
      {!loading && !error && detail && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Top destination airports */}
          <Panel
            title="Top 10 สนามบินปลายทาง"
            subtitle={`สนามบินที่ ${airlineName} ให้บริการมากที่สุด`}
          >
            <TopAirportsTable rows={detail.topAirports} />
          </Panel>

          {/* Top destination countries */}
          <Panel
            title="Top 10 ประเทศปลายทาง"
            subtitle={`ประเทศที่ ${airlineName} ให้บริการมากที่สุด`}
          >
            <TopCountriesTable rows={detail.topCountries} totalFlights={detail.totalFlights} />
          </Panel>
        </div>
      )}

      {/* Domestic vs International */}
      {!loading && !error && detail && detail.totalFlights > 0 && (
        <Panel
          title="สัดส่วนในประเทศ vs ระหว่างประเทศ"
          subtitle={`${detail.domesticFlights.toLocaleString()} ในประเทศ · ${detail.internationalFlights.toLocaleString()} ระหว่างประเทศ`}
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div style={{ width: 180, height: 180, flexShrink: 0 }}>
              <DomIntlPie domestic={detail.domesticFlights} international={detail.internationalFlights} />
            </div>
            <div className="flex flex-col gap-3 justify-center">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: 'rgba(59,130,246,0.7)' }} />
                <div>
                  <div className="text-sm font-semibold">Domestic</div>
                  <div className="text-xs text-muted-foreground">
                    {detail.domesticFlights.toLocaleString()} เที่ยวบิน · {detail.totalFlights > 0 ? ((detail.domesticFlights / detail.totalFlights) * 100).toFixed(1) : '0'}%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: 'rgba(251,191,36,0.7)' }} />
                <div>
                  <div className="text-sm font-semibold">International</div>
                  <div className="text-xs text-muted-foreground">
                    {detail.internationalFlights.toLocaleString()} เที่ยวบิน · {intlPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
