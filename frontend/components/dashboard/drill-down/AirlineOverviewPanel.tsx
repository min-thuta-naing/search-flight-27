import Chart from 'chart.js/auto';
import { CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
// Explicitly register required scales and elements for Chart.js
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';

export type AirlineRow = {
  name: string;
  country: string;
  countryCount: number;
  airportCount: number;
  flightCount: number;
};


// Mock data for demonstration (replace with real API call)
const ALL_AIRLINES: AirlineRow[] = [
  { name: 'Thai Airways', country: 'Thailand', countryCount: 25, airportCount: 60, flightCount: 1200 },
  { name: 'Singapore Airlines', country: 'Singapore', countryCount: 30, airportCount: 70, flightCount: 1500 },
  { name: 'Emirates', country: 'UAE', countryCount: 40, airportCount: 90, flightCount: 2000 },
  { name: 'Qatar Airways', country: 'Qatar', countryCount: 35, airportCount: 80, flightCount: 1800 },
  { name: 'Lufthansa', country: 'Germany', countryCount: 38, airportCount: 85, flightCount: 1700 },
  { name: 'ANA', country: 'Japan', countryCount: 20, airportCount: 50, flightCount: 900 },
  { name: 'AirAsia', country: 'Malaysia', countryCount: 18, airportCount: 45, flightCount: 800 },
  // เพิ่ม mock อีกหลายรายการเพื่อทดสอบ infinite scroll
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `Mock Airline ${i + 1}`,
    country: `Country ${i % 10}`,
    countryCount: 10 + (i % 5),
    airportCount: 20 + (i % 7),
    flightCount: 100 + i * 3,
  })),
];

// Mock fetch function (simulate API)
function fetchAirlines({ page, pageSize, search }: { page: number; pageSize: number; search: string }): Promise<{ rows: AirlineRow[]; hasMore: boolean; total: number }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let filtered = ALL_AIRLINES;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(a => a.name.toLowerCase().includes(q) || a.country.toLowerCase().includes(q));
      }
      const total = filtered.length;
      const start = page * pageSize;
      const end = start + pageSize;
      const rows = filtered.slice(start, end);
      resolve({ rows, hasMore: end < total, total });
    }, 400);
  });
}

function getTopAirlines(data: AirlineRow[], topN = 5) {
  return [...data].sort((a, b) => b.flightCount - a.flightCount).slice(0, topN);
}

export default function AirlineOverviewPanel() {
  // --- Infinite scroll state ---
  const PAGE_SIZE = 15;
  const [search, setSearch] = useState("");
  const [airlines, setAirlines] = useState<AirlineRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Load first page or when search changes
  useEffect(() => {
    setAirlines([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    fetchAirlines({ page: 0, pageSize: PAGE_SIZE, search }).then(res => {
      setAirlines(res.rows);
      setHasMore(res.hasMore);
      setTotal(res.total);
      setLoading(false);
    });
  }, [search]);

  // Load more when scroll to bottom
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    fetchAirlines({ page: page + 1, pageSize: PAGE_SIZE, search }).then(res => {
      setAirlines(prev => [...prev, ...res.rows]);
      setHasMore(res.hasMore);
      setPage(prev => prev + 1);
      setLoading(false);
    });
  }, [loading, hasMore, page, search]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new window.IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    }, { threshold: 1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => { if (loaderRef.current) observer.unobserve(loaderRef.current); };
  }, [loaderRef, hasMore, loading, loadMore]);

  // Top 5 bar chart (ใช้ข้อมูลทั้งหมด ไม่ใช่เฉพาะหน้าปัจจุบัน)
  const top5 = useMemo(() => getTopAirlines(
    ALL_AIRLINES.filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.country.toLowerCase().includes(search.toLowerCase())
    ), 5), [search]);

  const barData = {
    labels: top5.map(a => a.name),
    datasets: [
      {
        label: "จำนวนเที่ยวบิน",
        data: top5.map(a => a.flightCount),
        backgroundColor: "#1976d2",
      },
    ],
  };
  const barOptions = {
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { beginAtZero: true },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[5fr_7fr] xl:items-stretch mt-8">
      <div className="order-2 xl:order-1 xl:h-full xl:min-h-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card">
          <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <h3 className="text-[16px] font-bold">ภาพรวมสายการบิน</h3>
              <p className="text-sm text-muted-foreground">Top 5 Airlines ที่มีเที่ยวบินมากที่สุด</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div style={{ width: '100%', height: 260 }}>
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>
      </div>
      <div className="order-1 xl:order-2 xl:h-full xl:min-h-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card">
          <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <h3 className="text-[16px] font-bold">รายชื่อสายการบินทั้งหมด</h3>
              <p className="text-sm text-muted-foreground">ค้นหาด้วยชื่อหรือประเทศหลักที่ให้บริการ</p>
            </div>
            <span className="text-sm text-muted-foreground">{total.toLocaleString()} รายการ</span>
          </div>
          <div className="p-4">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา airline หรือประเทศ"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 mb-3"
            />
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/70" style={{ maxHeight: 260 }}>
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2.5 text-left text-[13px] font-bold text-muted-foreground">Airline Name</th>
                    <th className="px-3 py-2.5 text-left text-[13px] font-bold text-muted-foreground">ประเทศหลักที่ให้บริการ</th>
                    <th className="px-3 py-2.5 text-right text-[13px] font-bold text-muted-foreground">จำนวนประเทศที่ให้บริการ</th>
                    <th className="px-3 py-2.5 text-right text-[13px] font-bold text-muted-foreground">จำนวนสนามบินที่ให้บริการ</th>
                  </tr>
                </thead>
                <tbody>
                  {airlines.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">ไม่พบข้อมูลสายการบิน</td>
                    </tr>
                  )}
                  {airlines.map((a, idx) => (
                    <tr key={a.name + idx} className="border-b border-border/60 last:border-b-0 hover:bg-primary/[0.03]">
                      <td className="px-3 py-2.5 align-top">{a.name}</td>
                      <td className="px-3 py-2.5 align-top">{a.country}</td>
                      <td className="px-3 py-2.5 align-top text-right">{a.countryCount}</td>
                      <td className="px-3 py-2.5 align-top text-right">{a.airportCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={loaderRef} />
              {loading && (
                <div className="py-3 text-center text-muted-foreground text-sm">กำลังโหลด...</div>
              )}
              {!hasMore && !loading && airlines.length > 0 && airlines.length < total && (
                <div className="py-3 text-center text-muted-foreground text-sm">แสดงข้อมูลครบแล้ว</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
