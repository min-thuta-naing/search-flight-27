'use client';

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
  growthTextClass,
  parsePercentFromDelta,
} from '@/lib/dashboard/drill-down-data';
import { KPI_ACCENT } from '@/lib/dashboard/kpi-colors';
import {
  getCountryAirports,
  getCountryTopAirline,
  getCountryTopAirlineSharePercent,
  getCountryInbound,
  getCountryAirlineMarketShare,
} from '@/lib/dashboard/services/drilldown';
import { useDrillDown, KPIRow, BackButton, TimeToggle } from './DrillDownDashboard';
import type { KPIItem } from './DrillDownDashboard';
import type { AirportInfo, TimeMode } from '@/types/dashboard';

export function CountryView() {
  const { drillTo, selections, timeMode } = useDrillDown();
  const country = selections.country || COUNTRIES.find(c => c.name === 'N. Macedonia') || COUNTRIES[0];

  const displayAirports = getCountryAirports(country.name);
  const topAirlineName = getCountryTopAirline(country.name);
  const topAirlineSharePct = getCountryTopAirlineSharePercent(country.name);

  const totalRoutes = displayAirports.reduce((s, a) => s + a.routes, 0);

  const countryPct = parsePercentFromDelta(country.delta);
  const countryFlightTone =
    countryPct != null
      ? growthDeltaTypeFromPct(countryPct, timeMode)
      : country.deltaN < 0
        ? 'down'
        : 'neutral';

  const kpis: KPIItem[] = [
    {
      label: 'เที่ยวบินทั้งหมด',
      value: country.flights.toLocaleString(),
      delta: `${country.deltaN >= 0 ? '\u25B2' : '\u25BC'} ${country.deltaN >= 0 ? '+' : ''}${country.deltaN} เที่ยวบิน (${country.delta})`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold mb-1 break-words">{country.flag} {country.name}</h2>
          <p className="text-[15px] text-muted-foreground font-medium break-words">
            เลือกสนามบินใน {country.name} เพื่อดูข้อมูลวิเคราะห์
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
        <InboundCountriesPanel countryName={country.name} timeMode={timeMode} />
        <AirlineMarketSharePanel countryName={country.name} timeMode={timeMode} />
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

function InboundCountriesPanel({ countryName, timeMode }: { countryName: string; timeMode: TimeMode }) {
  const sorted = getCountryInbound(countryName);
  const max = sorted[0]?.flights || 1;
  const avgPct = sorted.length ? sorted.reduce((sum, item) => sum + item.pct, 0) / sorted.length : 0;

  return (
    <div className="bg-card border border-border rounded-[10px] p-5 h-full">
      <div className="text-[16px] font-bold mb-4 break-words">
        {'🛬'} 5 อันดับประเทศขาเข้า {'\u2014'} เที่ยวบินที่เข้าสู่ {countryName}
      </div>
      {sorted.map((c, i) => {
        const barW = (c.flights / max * 100).toFixed(0);
        const deltaPct = c.pct - avgPct;
        const relTone = growthDeltaTypeFromPct(deltaPct, timeMode);
        return (
          <div key={c.name} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 py-2 border-b border-border/60 last:border-b-0">
            <div className="flex items-center gap-2.5">
              <span className="text-[14px] text-muted-foreground w-6 text-center shrink-0 font-bold">{i + 1}</span>
              <span className="text-lg shrink-0">{c.flag}</span>
              <span className="text-[15px] font-medium flex-1 min-w-0">{c.name}</span>
            </div>
            <div className="flex items-center gap-2.5 pl-[calc(1.5rem+0.625rem+1.125rem+0.625rem)] sm:pl-0 sm:ml-auto sm:shrink-0">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden shrink-0"><div className="h-full bg-primary rounded-full" style={{ width: `${barW}%` }} /></div>
              <span className="text-[15px] font-bold w-12 text-right shrink-0 tabular-nums">{c.flights.toLocaleString()}</span>
              <span className="text-[14px] text-muted-foreground w-14 text-right shrink-0 font-bold tabular-nums">{c.pct}%</span>
              <span className={`text-[14px] w-14 text-right shrink-0 font-bold tabular-nums ${growthTextClass(relTone)}`}>
                {deltaPct >= 0 ? '▲' : '▼'} {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AirlineMarketSharePanel({ countryName, timeMode }: { countryName: string; timeMode: TimeMode }) {
  const airlines = getCountryAirlineMarketShare(countryName);
  const max = airlines[0]?.flights || 1;

  return (
    <div className="bg-card border border-border rounded-[10px] p-5 h-full">
      <div className="text-[16px] font-bold mb-4 break-words">
        {'✈️'} 5 อันดับสายการบินครองส่วนแบ่งตลาดใน{countryName}
      </div>
      {airlines.map((airline, i) => {
        const barW = (airline.flights / max * 100).toFixed(0);
        const shareTone = growthDeltaTypeFromPct(airline.delta, timeMode);
        return (
          <div key={airline.name} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 py-2 border-b border-border/60 last:border-b-0">
            <div className="flex items-center gap-2.5">
              <span className="text-[14px] text-muted-foreground w-6 text-center shrink-0 font-bold">{i + 1}</span>
              <span className="text-[15px] font-medium flex-1 min-w-0">{airline.name}</span>
            </div>
            <div className="flex items-center gap-2.5 pl-[calc(1.5rem+0.625rem)] sm:pl-0 sm:ml-auto sm:shrink-0">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden shrink-0"><div className="h-full bg-primary rounded-full" style={{ width: `${barW}%` }} /></div>
              <span className="text-[15px] font-bold w-12 text-right shrink-0 tabular-nums">{airline.flights.toLocaleString()}</span>
              <span className="text-[14px] text-muted-foreground w-14 text-right shrink-0 font-bold tabular-nums">{airline.share.toFixed(1)}%</span>
              <span className={`text-[14px] w-14 text-right shrink-0 font-bold tabular-nums ${growthTextClass(shareTone)}`}>
                {airline.delta >= 0 ? '▲' : '▼'} {airline.delta >= 0 ? '+' : ''}{airline.delta.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
