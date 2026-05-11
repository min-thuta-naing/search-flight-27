/**
 * Pure, framework-free helpers for CountryLookupPanel search/filter logic.
 * Extracted here so they can be unit-tested without a React environment.
 */

import type { AirportCountrySummary } from '@/lib/api/airport-api';

const DISPLAY_NAMES_EN =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

const DISPLAY_NAMES_TH =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['th'], { type: 'region' })
    : null;

const DISPLAY_ALIASES: Record<string, string> = {
  CD: 'Kinshasa',
};

/**
 * Resolve the display name for a country given its raw name and ISO code.
 * Uses Intl.DisplayNames so "Viet Nam" → "Vietnam", etc.
 */
export function resolveDisplayName(rawName: string, countryCode?: string | null): string {
  const name = (rawName ?? '').trim();
  const code = (countryCode ?? '').trim().toUpperCase();
  if (code && DISPLAY_ALIASES[code]) return DISPLAY_ALIASES[code];
  const lookupCode = code || (/^[A-Z0-9]{2,3}$/.test(name.toUpperCase()) ? name.toUpperCase() : '');
  if (lookupCode && DISPLAY_NAMES_EN) {
    const resolved = DISPLAY_NAMES_EN.of(lookupCode);
    if (resolved && resolved !== lookupCode) return resolved;
  }
  return name || code || 'Unknown';
}

/**
 * Returns true when the trimmed query looks like a 2–3 character country/airport code
 * (letters or digits, any case). E.g. "TH", "th", "US", "us".
 */
export function isCodeLikeQuery(query: string): boolean {
  const compact = query.replace(/\s+/g, '');
  return compact.length >= 2 && compact.length <= 3 && /^[A-Za-z0-9]+$/.test(compact);
}

/**
 * Filter and sort an array of AirportCountrySummary rows by a search query.
 *
 * Rules:
 *  - Empty / whitespace query → return all rows (sorted A→Z by name).
 *  - 2–3 latin/digit chars → code-first search: exact/prefix match on ISO code,
 *    falling back to name-prefix match (handles rows where code is missing).
 *  - Longer / non-latin query → substring match on English name, Intl display name,
 *    and Thai display name (ไทย → Thailand).
 *  - null/undefined country or country_code fields are handled gracefully.
 */
export function filterCountries(
  countries: AirportCountrySummary[],
  query: string,
): AirportCountrySummary[] {
  const sorted = [...countries].sort((a, b) => {
    return (a.country ?? '').localeCompare(b.country ?? '', 'en', { sensitivity: 'base' });
  });

  const normalizedQuery = query.trim();
  if (!normalizedQuery) return sorted;

  const compact = normalizedQuery.replace(/\s+/g, '');
  const upperCompact = compact.toUpperCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const codeSearch = isCodeLikeQuery(normalizedQuery);

  return sorted.filter((row) => {
    const code = (row.country_code ?? '').trim().toUpperCase();
    const isValidIso = /^[A-Z]{2,3}$/.test(code);
    const rawName = (row.country ?? '').toLowerCase();
    const displayName = resolveDisplayName(row.country ?? '', row.country_code).toLowerCase();
    const thaiName = (isValidIso && DISPLAY_NAMES_TH ? DISPLAY_NAMES_TH.of(code) ?? '' : '').toLowerCase();

    if (codeSearch) {
      const codeMatch = isValidIso && (code === upperCompact || code.startsWith(upperCompact));
      const namePrefixMatch = rawName.startsWith(lowerQuery) || displayName.startsWith(lowerQuery);
      return codeMatch || namePrefixMatch;
    }

    return (
      rawName.includes(lowerQuery) ||
      displayName.includes(lowerQuery) ||
      (thaiName.length > 0 && thaiName.includes(lowerQuery))
    );
  });
}
