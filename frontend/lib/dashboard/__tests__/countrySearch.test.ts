/**
 * Unit tests for countrySearch.ts filter logic.
 * Run with vitest: `npx vitest run lib/dashboard/__tests__/countrySearch.test.ts`
 */
import { describe, it, expect } from 'vitest';
import { filterCountries, isCodeLikeQuery } from '../countrySearch';
import type { AirportCountrySummary } from '@/lib/api/airport-api';

// Minimal fixture data
const THAILAND: AirportCountrySummary = { country: 'Thailand', country_code: 'TH', airport_count: 40 };
const USA: AirportCountrySummary = { country: 'United States', country_code: 'US', airport_count: 500 };
const VIETNAM: AirportCountrySummary = { country: 'Viet Nam', country_code: 'VN', airport_count: 22 };
const NO_CODE: AirportCountrySummary = { country: 'SomeTerritory', country_code: null, airport_count: 1 };
const EMPTY_COUNTRY: AirportCountrySummary = { country: '', country_code: null, airport_count: 0 };
const NULL_COUNTRY = { country: null, country_code: null, airport_count: 0 } as unknown as AirportCountrySummary;

const ALL = [THAILAND, USA, VIETNAM, NO_CODE, EMPTY_COUNTRY, NULL_COUNTRY];

// --- isCodeLikeQuery ---

describe('isCodeLikeQuery', () => {
  it('returns true for 2-letter uppercase codes', () => {
    expect(isCodeLikeQuery('TH')).toBe(true);
    expect(isCodeLikeQuery('US')).toBe(true);
  });

  it('returns true for 2-letter lowercase codes', () => {
    expect(isCodeLikeQuery('th')).toBe(true);
    expect(isCodeLikeQuery('us')).toBe(true);
  });

  it('returns true for 3-letter codes', () => {
    expect(isCodeLikeQuery('BKK')).toBe(true);
    expect(isCodeLikeQuery('usa')).toBe(true);
  });

  it('returns false for longer strings', () => {
    expect(isCodeLikeQuery('Thailand')).toBe(false);
    expect(isCodeLikeQuery('THAI')).toBe(false);
  });

  it('returns false for single character', () => {
    expect(isCodeLikeQuery('T')).toBe(false);
  });

  it('returns false for non-latin characters', () => {
    expect(isCodeLikeQuery('ไทย')).toBe(false);
  });

  it('ignores internal spaces when classifying', () => {
    // "T H" collapses to "TH" (2 chars) → code-like
    expect(isCodeLikeQuery('T H')).toBe(true);
  });
});

// --- filterCountries ---

describe('filterCountries – empty query', () => {
  it('returns all rows sorted A→Z when query is empty', () => {
    const result = filterCountries([THAILAND, USA, VIETNAM], '');
    expect(result.map((r) => r.country)).toEqual(['Thailand', 'United States', 'Viet Nam']);
  });

  it('returns all rows for whitespace-only query', () => {
    const result = filterCountries([THAILAND, USA], '   ');
    expect(result).toHaveLength(2);
  });
});

describe('filterCountries – 2-letter code search', () => {
  it('finds Thailand by uppercase code TH', () => {
    const result = filterCountries(ALL, 'TH');
    expect(result.some((r) => r.country_code === 'TH')).toBe(true);
  });

  it('finds Thailand by lowercase code th', () => {
    const result = filterCountries(ALL, 'th');
    expect(result.some((r) => r.country_code === 'TH')).toBe(true);
  });

  it('finds United States by code US', () => {
    const result = filterCountries(ALL, 'US');
    expect(result.some((r) => r.country_code === 'US')).toBe(true);
  });

  it('finds United States by lowercase code us', () => {
    const result = filterCountries(ALL, 'us');
    expect(result.some((r) => r.country_code === 'US')).toBe(true);
  });

  it('does not include unrelated countries for a specific 2-letter code', () => {
    const result = filterCountries([THAILAND, USA, VIETNAM], 'VN');
    expect(result).toHaveLength(1);
    expect(result[0].country_code).toBe('VN');
  });

  it('falls back to name prefix for rows with null country_code', () => {
    const result = filterCountries([NO_CODE], 'so');
    expect(result).toHaveLength(1);
  });
});

describe('filterCountries – full name search', () => {
  it('finds Thailand by English name substring', () => {
    const result = filterCountries(ALL, 'Thailand');
    expect(result.some((r) => r.country_code === 'TH')).toBe(true);
  });

  it('name search is case-insensitive', () => {
    expect(filterCountries(ALL, 'thailand')).toEqual(filterCountries(ALL, 'THAILAND'));
  });

  it('finds United States by partial name', () => {
    const result = filterCountries(ALL, 'United');
    expect(result.some((r) => r.country_code === 'US')).toBe(true);
  });

  it('finds Vietnam by display name even when stored as "Viet Nam"', () => {
    // Intl.DisplayNames resolves "VN" → "Vietnam"
    const result = filterCountries([VIETNAM], 'Vietnam');
    expect(result).toHaveLength(1);
  });

  it('ignores leading/trailing spaces in query', () => {
    const trimmed = filterCountries(ALL, 'Thailand');
    const padded = filterCountries(ALL, '  Thailand  ');
    expect(padded).toEqual(trimmed);
  });
});

describe('filterCountries – Thai name search', () => {
  it('finds Thailand when searching with Thai name "ไทย"', () => {
    const result = filterCountries([THAILAND, USA, VIETNAM], 'ไทย');
    expect(result.some((r) => r.country_code === 'TH')).toBe(true);
  });

  it('does not throw for Thai script query', () => {
    expect(() => filterCountries(ALL, 'ประเทศ')).not.toThrow();
  });
});

describe('filterCountries – null / undefined field handling', () => {
  it('does not throw when country_code is null', () => {
    expect(() => filterCountries([NO_CODE], 'so')).not.toThrow();
  });

  it('does not throw when country is empty string', () => {
    expect(() => filterCountries([EMPTY_COUNTRY], 'th')).not.toThrow();
  });

  it('does not throw when country is null (malformed data)', () => {
    expect(() => filterCountries([NULL_COUNTRY], 'th')).not.toThrow();
  });

  it('sort does not crash on null country values', () => {
    expect(() => filterCountries([NULL_COUNTRY, THAILAND, EMPTY_COUNTRY], '')).not.toThrow();
  });
});
