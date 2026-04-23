'use client';

import Chart from 'chart.js/auto';
import { CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import { statisticsApi } from '@/lib/api/statistics-api';
import type { DashboardAirlinesRowResponse } from '@/lib/api/statistics-api';
import { useDrillDown } from './DrillDownDashboard';

export type AirlineRow = DashboardAirlinesRowResponse;

export default function AirlineOverviewPanel() {
  const { drillTo, level, selections } = useDrillDown();

  // Compute geo filter based on the current drill-down level
  const filterValue = useMemo(() => {
    if (level === 'continent') return selections.continent?.name ?? '';
    if (level === 'country') return selections.country?.countryCode ?? selections.country?.name ?? '';
    if (level === 'airport') return selections.airport?.iata ?? '';
    return '';
  }, [level, selections]);

  const PAGE_SIZE = 15;
  const [search, setSearch] = useState('');
  const [airlines, setAirlines] = useState<AirlineRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Load first page whenever search or geo context changes
  useEffect(() => {
    let alive = true;
    setAirlines([]);
    setPage(0);
    setHasMore(true);
    setError(null);
    setLoading(true);

    statisticsApi.getDashboardAirlines({ page: 0, pageSize: PAGE_SIZE, search, level, filterValue }).then((res) => {
      if (!alive) return;
      setAirlines(res.rows);
      setHasMore(res.hasMore);
      setTotal(res.total);
      setLoading(false);
    }).catch((err) => {
      if (!alive) return;
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
      setLoading(false);
    });

    return () => { alive = false; };
  }, [search, level, filterValue]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    let alive = true;
    setLoading(true);

    statisticsApi.getDashboardAirlines({ page: page + 1, pageSize: PAGE_SIZE, search, level, filterValue }).then((res) => {
      if (!alive) return;
      setAirlines((prev) => [...prev, ...res.rows]);
      setHasMore(res.hasMore);
      setPage((prev) => prev + 1);
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setLoading(false);
    });

    return () => { alive = false; };
  }, [loading, hasMore, page, search, level, filterValue]);

  // Observe the loader div relative to the scroll container, not the viewport
  useEffect(() => {
    if (!hasMore || loading) return;
    const root = scrollContainerRef.current;
    const target = loaderRef.current;
    if (!root || !target) return;

    const observer = new window.IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.unobserve(target);
  }, [hasMore, loading, loadMore]);

  // Top 5 from the loaded sorted list (API returns rows ordered by flightCount DESC)
  const top5 = useMemo(() => airlines.slice(0, 5), [airlines]);

  const barData = {
    labels: top5.map((a) => a.name),
    datasets: [
      {
        label: 'จำนวนเที่ยวบิน',
        data: top5.map((a) => a.flightCount),
        backgroundColor: top5.map((_, i) => i === 0 ? '#1976d2' : '#42a5f5'),
        hoverBackgroundColor: '#0d47a1',
      },
    ],
  };

  const barOptions = useMemo(() => ({
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.raw.toLocaleString()} เที่ยวบิน`,
        },
      },
    },
    scales: { x: { beginAtZero: true } },
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0) {
        const clicked = top5[elements[0].index];
        if (clicked) drillTo('airline', { airline: { id: clicked.id, name: clicked.name } });
      }
    },
    onHover: (event: any, elements: any[]) => {
      const target = event.native?.target as HTMLCanvasElement | undefined;
      if (target) target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
  }), [top5, drillTo]);

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[5fr_7fr] xl:items-stretch mt-8">
      {/* Bar chart — Top 5 */}
      <div className="order-2 xl:order-1 xl:h-full xl:min-h-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card">
          <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <h3 className="text-[16px] font-bold">ภาพรวมสายการบิน</h3>
              <p className="text-sm text-muted-foreground">Top 5 Airlines ที่มีเที่ยวบินมากที่สุด · คลิกแท่งเพื่อดูรายละเอียด</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {top5.length > 0 ? (
              <div style={{ width: '100%', height: 260 }}>
                <Bar data={barData} options={barOptions} />
              </div>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                {loading ? 'กำลังโหลด...' : 'ไม่พบข้อมูล'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Infinite-scroll table */}
      <div className="order-1 xl:order-2 xl:h-full xl:min-h-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card">
          <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <h3 className="text-[16px] font-bold">รายชื่อสายการบินทั้งหมด</h3>
              <p className="text-sm text-muted-foreground">ค้นหาด้วยชื่อหรือประเทศหลักที่ให้บริการ · คลิกแถวเพื่อดูรายละเอียด</p>
            </div>
            <span className="text-sm text-muted-foreground">{total.toLocaleString()} รายการ</span>
          </div>
          <div className="p-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา airline หรือประเทศ"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 mb-3"
            />

            {error && (
              <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div
              ref={scrollContainerRef}
              className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/70"
              style={{ maxHeight: 260 }}
            >
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2.5 text-left text-[13px] font-bold text-muted-foreground">Airline Name</th>
                    <th className="px-3 py-2.5 text-left text-[13px] font-bold text-muted-foreground">ประเทศหลักที่ให้บริการ</th>
                    <th className="px-3 py-2.5 text-right text-[13px] font-bold text-muted-foreground">จำนวนประเทศ</th>
                    <th className="px-3 py-2.5 text-right text-[13px] font-bold text-muted-foreground">จำนวนสนามบิน</th>
                  </tr>
                </thead>
                <tbody>
                  {airlines.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        ไม่พบข้อมูลสายการบิน
                      </td>
                    </tr>
                  )}
                  {airlines.map((a, idx) => (
                    <tr
                      key={`${a.id}-${idx}`}
                      className="border-b border-border/60 last:border-b-0 cursor-pointer hover:bg-primary/5 transition-colors"
                      title={`คลิกเพื่อดูรายละเอียด ${a.name}`}
                      onClick={() => drillTo('airline', { airline: { id: a.id, name: a.name } })}
                    >
                      <td className="px-3 py-2.5 align-top font-medium">{a.name}</td>
                      <td className="px-3 py-2.5 align-top text-muted-foreground">{a.country}</td>
                      <td className="px-3 py-2.5 align-top text-right tabular-nums">{a.countryCount}</td>
                      <td className="px-3 py-2.5 align-top text-right tabular-nums">{a.airportCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={loaderRef} style={{ height: 1 }} />
              {loading && (
                <div className="py-3 text-center text-muted-foreground text-sm">กำลังโหลด...</div>
              )}
              {!hasMore && !loading && airlines.length > 0 && (
                <div className="py-3 text-center text-muted-foreground text-sm">แสดงข้อมูลครบแล้ว</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
