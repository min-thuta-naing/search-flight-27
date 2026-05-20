const FILTER_STORAGE_KEY = 'search-flight.dashboard-filter.v1';

interface PersistedCustomRange {
  startDate: string;
  endDate: string;
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function readPersistedCustomRange(): { from: Date; to: Date } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCustomRange;
    const from = new Date(`${parsed.startDate}T00:00:00.000Z`);
    const to = new Date(`${parsed.endDate}T00:00:00.000Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
    return { from, to };
  } catch {
    return null;
  }
}

export function writePersistedCustomRange(range: { from: Date; to: Date } | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!range) {
      window.sessionStorage.removeItem(FILTER_STORAGE_KEY);
      return;
    }
    const entry: PersistedCustomRange = {
      startDate: formatIsoDate(range.from),
      endDate: formatIsoDate(range.to),
    };
    window.sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage write failures.
  }
}
