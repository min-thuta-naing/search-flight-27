import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type ContinentKey =
  | string;

export interface ContinentMeta {
  key: ContinentKey;
  label: string;
  icon: string;
}

const CONTINENT_ICON_OVERRIDES: Record<string, string> = {
  europe: '🏰',
  asia: '🌏',
  'asia-pacific': '🌏',
  'north america': '🌎',
  'south america': '🌎',
  africa: '🦁',
  'middle east': '🕌',
  oceania: '🌏',
  caribbean: '🏝️',
  'central america': '🌎',
  other: '🌐',
};

const CONTINENT_CSV_PATH = process.env.COUNTRY_CONTINENT_CSV_PATH
  ? process.env.COUNTRY_CONTINENT_CSV_PATH
  : join(process.cwd(), 'data', 'mappings', 'country_airports_summary.csv');

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  usa: 'united states',
  uk: 'united kingdom',
  uae: 'united arab emirates',
  'antigua and barbuda': 'antigua barbuda',
  "cote d ivoire": "cote d'ivoire",
  'saint vincent and grenadines': 'saint vincent grenadines',
  'sao tome and principe': 'sao tome principe',
};

let countryToContinentMap: Map<string, ContinentKey> | null = null;
let countryToCsvContinentMap: Map<string, string> | null = null;
let isoCountryDisplayNames: Intl.DisplayNames | null = null;
let csvLoadWarningShown = false;

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCountryName(value: string): string {
  const normalized = normalizeText(value);
  return COUNTRY_NAME_ALIASES[normalized] || normalized;
}

function csvContinentToKey(rawContinent: string): ContinentKey {
  const label = (rawContinent || '').trim();
  return label || 'Other';
}

function buildContinentMeta(continentKey: ContinentKey): ContinentMeta {
  const label = (continentKey || '').trim() || 'Other';
  const normalized = normalizeText(label);
  const icon = CONTINENT_ICON_OVERRIDES[normalized] || CONTINENT_ICON_OVERRIDES.other;

  return {
    key: label,
    label,
    icon,
  };
}

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  values.push(current);
  return values;
}

function resolveContinentCsvPath(): string | null {
  if (existsSync(CONTINENT_CSV_PATH)) {
    return CONTINENT_CSV_PATH;
  }
  return null;
}

function loadCountryToContinentMap(): Map<string, ContinentKey> {
  if (countryToContinentMap) {
    return countryToContinentMap;
  }

  const map = new Map<string, ContinentKey>();
  const rawContinentMap = new Map<string, string>();
  const csvPath = resolveContinentCsvPath();

  if (!csvPath) {
    if (!csvLoadWarningShown) {
      console.warn('[continentMapper] country_airports_summary.csv not found; defaulting unknown countries to Other');
      csvLoadWarningShown = true;
    }
    countryToContinentMap = map;
    countryToCsvContinentMap = rawContinentMap;
    return map;
  }

  try {
    const content = readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

    // Skip header row: ทวีป,Country,Airports,AirportsCount
    for (let i = 1; i < lines.length; i += 1) {
      const columns = parseCsvRow(lines[i]);
      if (columns.length < 2) continue;

      const continentKey = csvContinentToKey(columns[0]);
      const csvContinent = columns[0]?.trim() || '';
      const countryName = normalizeCountryName(columns[1]);

      if (!countryName) continue;
      map.set(countryName, continentKey);
      rawContinentMap.set(countryName, csvContinent);
    }
  } catch (error) {
    if (!csvLoadWarningShown) {
      console.warn('[continentMapper] failed to load CSV mapping:', error instanceof Error ? error.message : String(error));
      csvLoadWarningShown = true;
    }
  }

  countryToContinentMap = map;
  countryToCsvContinentMap = rawContinentMap;
  return map;
}

function countryNameFromIsoCode(countryCode: string): string | null {
  if (!isoCountryDisplayNames) {
    try {
      isoCountryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      return null;
    }
  }

  try {
    const label = isoCountryDisplayNames.of(countryCode);
    if (!label) return null;
    return normalizeCountryName(label);
  } catch {
    return null;
  }
}

function lookupContinentByCountryName(countryName?: string | null): ContinentKey | null {
  const normalized = normalizeCountryName(countryName || '');
  if (!normalized) return null;

  const mapping = loadCountryToContinentMap();
  return mapping.get(normalized) || null;
}

function lookupCsvContinentByCountryName(countryName?: string | null): string | null {
  const normalized = normalizeCountryName(countryName || '');
  if (!normalized) return null;

  loadCountryToContinentMap();
  return countryToCsvContinentMap?.get(normalized) || null;
}

export function getContinentMeta(countryCode?: string | null, countryName?: string | null): ContinentMeta {
  const byCountryName = lookupContinentByCountryName(countryName);
  if (byCountryName) {
    return buildContinentMeta(byCountryName);
  }

  const normalizedCode = (countryCode || '').trim().toUpperCase();
  if (normalizedCode) {
    const derivedCountryName = countryNameFromIsoCode(normalizedCode);
    if (derivedCountryName) {
      const byCodeDerivedName = loadCountryToContinentMap().get(derivedCountryName);
      if (byCodeDerivedName) {
        return buildContinentMeta(byCodeDerivedName);
      }
    }
  }

  return buildContinentMeta('Other');
}

export function getContinentMetaFromKey(continentKey: string): ContinentMeta {
  return buildContinentMeta(continentKey);
}
