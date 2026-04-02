'use client';

import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import type { DrillLevel, TimeMode, ContinentData, CountryData, AirportInfo } from '@/types/dashboard';
import { growthDeltaTypeFromPct, growthPillSurfaceClasses, growthTextClass } from '@/lib/dashboard/drill-down-data';
import { readSharedRangePreset, writeSharedRangePreset } from '@/lib/dashboard/range-preset-store';
import { WorldView } from './WorldView';
import { ContinentView } from './ContinentView';
import { CountryView } from './CountryView';
import { AirportView } from './AirportView';

// ── Context for drill-down state ──
interface SelectionState {
  continent?: ContinentData;
  country?: CountryData;
  airport?: AirportInfo;
}

export type RangePreset = 'focus' | '7' | '30' | 'all' | '90' | '180' | '365';

interface DrillDownContextValue {
  level: DrillLevel;
  timeMode: TimeMode;
  rangePreset: RangePreset;
  drillTo: (level: DrillLevel, selection?: SelectionState) => void;
  setTimeMode: (mode: TimeMode) => void;
  setRangePreset: (preset: RangePreset) => void;
  selections: SelectionState;
}

const DrillDownContext = createContext<DrillDownContextValue>({
  level: 'world',
  timeMode: 'yoy',
  rangePreset: 'focus',
  drillTo: () => {},
  setTimeMode: () => {},
  setRangePreset: () => {},
  selections: {},
});

export function useDrillDown() {
  return useContext(DrillDownContext);
}

// ── Main component ──
export function DrillDownDashboard() {
  const [level, setLevel] = useState<DrillLevel>('world');
  const [timeMode, setTimeMode] = useState<TimeMode>('yoy');
  const [rangePreset, setRangePreset] = useState<RangePreset>('focus');
  const [selections, setSelections] = useState<SelectionState>({});

  const LEVEL_ORDER: DrillLevel[] = ['world', 'continent', 'country', 'airport'];

  const drillTo = useCallback((newLevel: DrillLevel, selection?: SelectionState) => {
    setLevel(newLevel);
    setSelections((prev) => {
      const newIdx = LEVEL_ORDER.indexOf(newLevel);
      // When drilling backwards, clear forward selections
      const cleaned: SelectionState = {};
      if (newIdx >= 1 && prev.continent) cleaned.continent = prev.continent;
      if (newIdx >= 2 && prev.country) cleaned.country = prev.country;
      if (newIdx >= 3 && prev.airport) cleaned.airport = prev.airport;
      // Merge in any new selection
      return { ...cleaned, ...selection };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const stored = readSharedRangePreset('focus');
    if (stored !== rangePreset) {
      setRangePreset(stored);
    }
    // Run once on mount to avoid SSR/CSR mismatch from sessionStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeSharedRangePreset(rangePreset);
  }, [rangePreset]);

  return (
    <DrillDownContext.Provider value={{ level, timeMode, rangePreset, drillTo, setTimeMode, setRangePreset, selections }}>
      <div className="space-y-4">
        {/* Title centered */}
        {/* <h1 className="text-xl font-bold text-center">ภาพรวมการค้นหาเที่ยวบิน</h1> */}

        {/* Status line centered */}
        <div className="flex justify-center">
          <StatusLine />
        </div>

        {/* Level views */}
        {level === 'world' && <WorldView />}
        {level === 'continent' && <ContinentView />}
        {level === 'country' && <CountryView />}
        {level === 'airport' && <AirportView />}
      </div>
    </DrillDownContext.Provider>
  );
}

// ── Time Toggle ──
export function TimeToggle() {
  const { timeMode, setTimeMode } = useDrillDown();
  const modes: { key: TimeMode; label: string }[] = [
    { key: 'wow', label: 'รายสัปดาห์' },
    { key: 'mom', label: 'รายเดือน' },
    { key: 'yoy', label: 'รายปี' },
  ];

  return (
    <div className="flex w-full sm:w-auto border border-border rounded-lg overflow-hidden">
      {modes.map((m) => (
        <button
          key={m.key}
          type="button"
          aria-pressed={timeMode === m.key}
          onClick={() => setTimeMode(m.key)}
          className={`flex-1 sm:flex-initial min-w-0 px-3 sm:px-4 py-2 sm:py-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-0 ${
            timeMode === m.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// -- Status Line (Circle Stepper) --
function StatusLine() {
  const { level, drillTo, selections } = useDrillDown();

  const steps = [
    {
      id: 'world' as DrillLevel,
      display: '\u0e42\u0e25\u0e01',
      icon: '\u{1F30E}',
      step: 1,
    },
    {
      id: 'continent' as DrillLevel,
      display: selections.continent?.name || '\u0e17\u0e27\u0e35\u0e1b',
      icon: selections.continent?.icon || '\u{1F310}',
      step: 2,
    },
    {
      id: 'country' as DrillLevel,
      display: selections.country?.name || '\u0e1b\u0e23\u0e30\u0e40\u0e17\u0e28',
      icon: selections.country?.flag || '\u{1F3F3}\uFE0F',
      step: 3,
    },
    {
      id: 'airport' as DrillLevel,
      display: selections.airport?.iata || '\u0e2a\u0e19\u0e32\u0e21\u0e1a\u0e34\u0e19',
      icon: '\u{1F6EB}',
      step: 4,
    },
  ];

  const LEVELS: DrillLevel[] = ['world', 'continent', 'country', 'airport'];
  const currentIdx = LEVELS.indexOf(level);

  return (
    <div className="w-full px-2 sm:px-4">
      <div className="rounded-xl bg-slate-100/80 px-2 py-2 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex w-full items-center justify-center overflow-x-auto [scrollbar-width:thin]">
          <div className="flex min-w-max items-center gap-2">
            {steps.map((step, i) => {
              const isActive = i === currentIdx;
              const isPast = i < currentIdx;
              const isClickable = isPast;

              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && drillTo(step.id)}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : isPast
                        ? 'border-slate-200 bg-white text-slate-700 hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                  } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-pressed={isActive}
                >
                  <span className="text-base leading-none" role="img" aria-hidden="true">
                    {step.icon}
                  </span>
                  <span className="whitespace-nowrap">{step.display}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- KPI Row (shared) --
// ── KPI Row (shared) ──
export interface KPIItem {
  label: string;
  value: string;
  delta: string;
  deltaType: 'up' | 'down' | 'neutral';
  /** When false, delta line uses muted text (non-growth KPIs). Default true. */
  growthColored?: boolean;
  accentColor: string;
  /** When set, the card is a button (e.g. drill-down); stronger hover shadow. */
  onClick?: () => void;
  /** Announced when `onClick` is set (e.g. drill-down target). */
  actionLabel?: string;
}

function KPIRowCard({ item }: { item: KPIItem }) {
  const body = (
    <>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: item.accentColor }} />
      <div className="text-[14px] uppercase tracking-wider text-muted-foreground mb-2.5">{item.label}</div>
      <div className="text-2xl font-bold leading-none mb-1.5 break-words">{item.value}</div>
      <div
        className={`text-[13px] font-semibold ${
          item.growthColored === false
            ? 'text-muted-foreground'
            : growthTextClass(
                item.deltaType === 'up' ? 'up' : item.deltaType === 'down' ? 'down' : 'neutral',
              )
        }`}
      >
        {item.delta}
      </div>
    </>
  );

  const staticHover = 'hover:border-primary hover:-translate-y-0.5';
  const interactiveHover =
    'cursor-pointer hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_0_0_4px_rgba(37,99,235,0.14),0_10px_22px_rgba(37,99,235,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  const shell =
    'relative w-full min-w-0 overflow-hidden bg-card border border-border rounded-[10px] p-4 text-left transition-all';

  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        aria-label={item.actionLabel ?? item.label}
        className={`${shell} ${interactiveHover}`}
      >
        {body}
      </button>
    );
  }

  return <div className={`${shell} ${staticHover}`}>{body}</div>;
}

export function KPIRow({ items }: { items: KPIItem[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {items.map((item, i) => (
        <KPIRowCard key={item.label} item={item} />
      ))}
    </div>
  );
}

// ── Back Button ──
export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex max-w-full items-center justify-center gap-1.5 whitespace-normal break-words bg-muted border border-border rounded-lg px-3.5 py-2 text-center text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer mb-4"
    >
      {'\u2190'} {label}
    </button>
  );
}

// ── Change Pill ──
export function ChangePill({
  pct,
  num,
  active = false,
  timeMode,
}: {
  pct: number;
  num: number;
  active?: boolean;
  timeMode: TimeMode;
}) {
  const kind = growthDeltaTypeFromPct(pct, timeMode);
  const cls = growthPillSurfaceClasses(kind);
  const sign = num >= 0 ? '+' : '';
  const arrow = num >= 0 ? '\u25B2' : '\u25BC';

  return (
    <span
      className={`inline-block rounded-full whitespace-nowrap font-bold ${cls} ${
        active ? 'text-xs py-1 px-2.5' : 'text-[10px] py-0.5 px-2 opacity-50'
      }`}
    >
      {arrow} {sign}{num.toLocaleString()} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
    </span>
  );
}

