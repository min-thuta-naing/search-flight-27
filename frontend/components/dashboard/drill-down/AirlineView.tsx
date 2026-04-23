'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';


import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';


import { Pie } from 'react-chartjs-2';
// Minimal PieChartDomesticIntl component for Domestic vs International split

function PieChartDomesticIntl({ domestic, international }: { domestic: number; international: number }) {
  const data = {
    labels: ['Domestic', 'International'],
    datasets: [
      {
        data: [domestic, international],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)', // blue-500
          'rgba(251, 191, 36, 0.7)', // yellow-400
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(251, 191, 36, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };
  const options = {
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${value.toLocaleString()}`;
          },
        },
      },
    },
    cutout: '0%',
    responsive: true,
    maintainAspectRatio: false,
  };
  return <Pie data={data} options={options} />;
}
import { getAirportOverview } from '@/lib/dashboard/services/drilldown';
import { runDrillDownRequest } from '@/lib/dashboard/drill-down-cache';
import { useDrillDown, KPIRow, BackButton } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import type { DashboardAirportOverviewResponse } from '@/lib/api/statistics-api';

function resolveAirlineWindowDays(preset: string) {
  if (preset === 'focus') return 15;
  if (preset === '7') return 7;
  if (preset === '30') return 30;
  if (preset === '90') return 90;
  if (preset === '180') return 180;
  if (preset === '365') return 365;
  return 3650;
}

function formatSignedFlights(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toLocaleString()}`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}


// ไม่มี network, footprint, market ใน DashboardAirportOverviewResponse
// type ใหม่ให้ตรงกับ property ที่มีจริง
type AirlineRoute = {
  iata: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  flights: number;
};
type AirlineCountry = {
  countryCode: string | null;
  countryName: string;
  flag: string;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
  pct: number;
};
type AirlineMarketRow = {
  id: number;
  name: string;
  flights: number;
  sharePercent: number;
};

function AirlineView() {
  const { drillTo, rangePreset, selections } = useDrillDown();
  const airport = selections.airport;
  const airline = selections.airline;
  const [overview, setOverview] = useState<DashboardAirportOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    if (!airport || !airline?.id) {
      setOverview(null);
      setLoading(false);
      setError('Missing airline selection');
      return () => {
        active = false;
      };
    }

    const windowDays = resolveAirlineWindowDays(rangePreset);
    const cacheKey = `airline:overview:v1:${airport.iata}:airline:${airline.id}:preset:${rangePreset}:window:${windowDays}`;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await runDrillDownRequest(cacheKey, () =>
          getAirportOverview(airport.iata, { windowDays })
        );
        if (!active) return;
        setOverview(payload);
      } catch (caught) {
        if (!active) return;
        setOverview(null);
        setError(caught instanceof Error ? caught.message : 'ไม่สามารถโหลดข้อมูลสายการบินได้');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [airport?.iata, airline?.id, rangePreset, reloadKey]);

  // ใช้ topAirline แทน airline
  const airlineName = overview?.topAirline?.name || airline?.name || 'Airline';
  const airportName = overview?.airport.name || airport?.name || 'Airport';
  const countryName = overview?.airport.country || 'Unknown';
  const airportIata = airport?.iata || overview?.airport.code || 'Airport';

  const kpis: KPIItem[] = useMemo(() => {
    if (!overview) return [];

    // ใช้ totals และ topAirline แทน
    const totalTone = overview.totals.deltaFlights < 0 ? 'down' : overview.totals.deltaFlights > 0 ? 'up' : 'neutral';
    // ไม่มีข้อมูล sharePercent, previousSharePercent, rank, totalAirlines ใน overview

    return [
      {
        label: 'เที่ยวบินทั้งหมด',
        value: overview.totals.flights.toLocaleString(),
        delta: `${overview.totals.deltaFlights >= 0 ? '▲' : '▼'} ${formatSignedFlights(overview.totals.deltaFlights)} เที่ยวบิน (${formatSignedPercent(overview.totals.deltaPercent)})`,
        deltaType: totalTone,
        accentColor: KPI_ACCENT.flights,
      },
      {
        label: 'สายการบินที่มีเที่ยวบินมากสุด',
        value: overview.topAirline?.name || '-',
        delta: overview.topAirline ? `${overview.topAirline.flights.toLocaleString()} เที่ยวบิน (${overview.topAirline.sharePercent.toFixed(1)}%)` : '-',
        deltaType: 'neutral',
        accentColor: KPI_ACCENT.highlight,
      },
      {
        label: 'จุดหมายปลายทางสูงสุด',
        value: overview.topDestination?.name || '-',
        delta: overview.topDestination ? `${overview.topDestination.flights.toLocaleString()} เที่ยวบิน (${overview.topDestination.country})` : '-',
        deltaType: 'neutral',
        growthColored: false,
        accentColor: KPI_ACCENT.airports,
      },
      {
        label: 'ชั่วโมงที่มีเที่ยวบินมากสุด',
        value: overview.busiestDepartureHour?.hour != null ? `${overview.busiestDepartureHour.hour}:00` : '-',
        delta: overview.busiestDepartureHour ? `${overview.busiestDepartureHour.flights.toLocaleString()} เที่ยวบิน` : '-',
        deltaType: 'neutral',
        growthColored: false,
        accentColor: KPI_ACCENT.average,
      },
    ];
  }, [overview, airportIata]);

  if (!airport || !airline) {
    return (
      <div className="rounded-[10px] border border-border bg-card p-6">
        <div className="text-lg font-bold">ไม่พบบริบทสายการบิน</div>
        <div className="mt-2 text-sm text-muted-foreground">กลับไปเลือกสายการบินจากหน้า airport อีกครั้ง</div>
        <div className="mt-4">
          <BackButton label="กลับไปที่สนามบิน" onClick={() => drillTo('airport')} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Airline Drill-down
            </div>
            <h2 className="text-2xl font-bold leading-tight">
              {airlineName}
            </h2>
            <p className="text-sm text-muted-foreground">
              มุมมองของ {airlineName} ภายใต้สนามบิน {airportName} · {countryName}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="font-semibold text-foreground">ช่วงข้อมูล</div>
            <div className="mt-1 text-muted-foreground">
              {overview ? `${overview.periodStart} → ${overview.periodEnd}` : 'loading'}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[126px] rounded-[10px] border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[10px] border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            ลองใหม่
          </button>
        </div>
      ) : (
        <KPIRow items={kpis} />
      )}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 space-y-1">
        <div className="text-[16px] font-bold">{title}</div>
        {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

function OverviewLine({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-sm font-semibold">{value}</div>
      </div>
      {note ? <div className="text-xs font-medium text-muted-foreground text-right">{note}</div> : null}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function TopAirlinesTable({
  rows,
  selectedAirlineId,
}: {
  rows: AirlineMarketRow[];
  selectedAirlineId: number;
}) {
  if (!rows.length) {
    return <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">ไม่มีข้อมูลตลาดสายการบิน</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/20">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold">Airline</th>
            <th className="px-3 py-2 text-right font-semibold">Flights</th>
            <th className="px-3 py-2 text-right font-semibold">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = row.id === selectedAirlineId;
            return (
              <tr key={row.id} className={selected ? 'bg-primary/5' : 'border-t border-border/60'}>
                <td className="px-3 py-2 font-semibold text-muted-foreground">-</td>
                <td className="px-3 py-2">
                  <div className="font-medium">
                    {row.name}
                    {selected ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Selected</span> : null}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{row.flights.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{row.sharePercent.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TopRoutesTable({ rows }: { rows: AirlineRoute[] }) {
  if (!rows.length) {
    return <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">ไม่มีข้อมูลเส้นทาง</div>;
  }

  const max = rows[0]?.flights || 1;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/20">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Airport</th>
            <th className="px-3 py-2 text-left font-semibold">Country</th>
            <th className="px-3 py-2 text-right font-semibold">Flights</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.iata} className="border-t border-border/60">
              <td className="px-3 py-2">
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.iata}</div>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span>{row.flag}</span>
                  <span>{row.country}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-3">
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(row.flights / max) * 100}%` }} />
                  </div>
                  <div className="w-14 text-right tabular-nums font-semibold">{row.flights.toLocaleString()}</div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopCountriesTable({ rows }: { rows: AirlineCountry[] }) {
  if (!rows.length) {
    return <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">ไม่มีข้อมูลประเทศปลายทาง</div>;
  }

  const max = rows[0]?.flights || 1;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/20">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Country</th>
            <th className="px-3 py-2 text-right font-semibold">Flights</th>
            <th className="px-3 py-2 text-right font-semibold">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.countryCode || row.countryName}`} className="border-t border-border/60">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span>{row.flag}</span>
                  <span className="font-medium">{row.countryName}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-3">
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(row.flights / max) * 100}%` }} />
                  </div>
                  <div className="w-14 text-right tabular-nums font-semibold">{row.flights.toLocaleString()}</div>
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">-</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StackBar({ domestic, international }: { domestic: number; international: number }) {
  const total = Math.max(domestic + international, 1);
  const domesticWidth = (domestic / total) * 100;
  const internationalWidth = (international / total) * 100;

  return (
    <div className="space-y-2">
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="flex h-full w-full">
          <div className="h-full bg-primary" style={{ width: `${domesticWidth}%` }} />
          <div className="h-full bg-accent" style={{ width: `${internationalWidth}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Domestic</span>
        <span>International</span>
      </div>
    </div>
  );
}
