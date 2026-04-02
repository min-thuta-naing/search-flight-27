/** Thai short month labels (aligned with drill-down charts). */
const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

/** Monday 00:00 local of the ISO-style week containing `d` (week starts Monday). */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Brief range for one week, e.g. `17–23 มี.ค.` or `30 มี.ค.–5 เม.ย.` */
export function formatThaiBriefWeekRange(weekStartMonday: Date): string {
  const end = new Date(weekStartMonday);
  end.setDate(end.getDate() + 6);
  const d0 = weekStartMonday.getDate();
  const d1 = end.getDate();
  const m0 = weekStartMonday.getMonth();
  const m1 = end.getMonth();
  if (m0 === m1) {
    return `${d0}\u2013${d1} ${THAI_MONTHS_SHORT[m0]}`;
  }
  return `${d0} ${THAI_MONTHS_SHORT[m0]}\u2013${d1} ${THAI_MONTHS_SHORT[m1]}`;
}

export type WeeklyBarDatum = { month: string; value: number; color: string };

const WOW_CURRENT_INDEX = 2;

/**
 * Five weekly bars: offsets -2, -1, 0, +1, +2 from the Monday of the current week.
 * X labels use brief Thai date ranges. Colors match continent/airport seasonal charts.
 */
export function buildWowWeeklyBarData(
  valuesFiveWeeks: readonly number[],
  referenceDate: Date = new Date(),
): WeeklyBarDatum[] {
  if (valuesFiveWeeks.length !== 5) {
    throw new Error('buildWowWeeklyBarData: expected exactly 5 weekly values');
  }
  const monday = startOfWeekMonday(referenceDate);
  const peakVal = Math.max(...valuesFiveWeeks);
  return [-2, -1, 0, 1, 2].map((offset, i) => {
    const ws = new Date(monday);
    ws.setDate(ws.getDate() + offset * 7);
    const label = formatThaiBriefWeekRange(ws);
    const v = valuesFiveWeeks[i]!;
    const isCurrent = i === WOW_CURRENT_INDEX;
    const color = isCurrent ? '#d29922' : v === peakVal ? '#ff9f43' : '#bfdbfe';
    return { month: label, value: v, color };
  });
}

/** Relative shape for 5 weeks (peak at current week) — multiplies `avgDailyFlights * 7`. */
const WOW_WEEKLY_SHAPE = [0.95, 0.97, 1.04, 0.99, 0.98] as const;

/** Mock weekly totals from sample daily rows (avg daily × 7 × shape). */
export function weeklyTotalsFromDailyRows(dailyRows: readonly { flights: number }[]): number[] {
  if (!dailyRows.length) {
    return [16, 17, 19, 18, 17];
  }
  const avg = dailyRows.reduce((s, d) => s + d.flights, 0) / dailyRows.length;
  const base = Math.round(avg * 7);
  return WOW_WEEKLY_SHAPE.map((r) => Math.round(base * r));
}

/** Area/line chart rows: Thai week range on X (`day`), flights on Y — ±2 weeks, aligned with bar WoW. */
export function buildWowWeeklyTrendPoints(
  dailyRows: readonly { flights: number }[],
  referenceDate: Date = new Date(),
): { day: string; flights: number }[] {
  const values = weeklyTotalsFromDailyRows(dailyRows);
  return buildWowWeeklyBarData(values, referenceDate).map((b) => ({
    day: b.month,
    flights: b.value,
  }));
}
