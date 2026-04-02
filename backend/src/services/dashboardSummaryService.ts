import { pool } from '../config/database';
import { getContinentMeta, type ContinentMeta } from '../utils/continentMapper';

export interface DashboardContinentSummary {
  key: ContinentMeta['key'];
  label: string;
  icon: string;
  airportCount: number;
  countryCount: number;
  routeCount: number;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
}

export interface DashboardContinentCard {
  key: ContinentMeta['key'];
  label: string;
  icon: string;
  airports: string;
  airportCount: number;
  countryCount: number;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
  delta: string;
  highlight: boolean;
  yoy: number;
  yoyN: number;
  mom: number;
  momN: number;
  wow: number;
  wowN: number;
}

export interface DashboardSummaryResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  totalFlights: number;
  activeAirports: number;
  averageFlightsPerDay: number;
  busiestContinent: DashboardContinentSummary;
  continentBreakdown: DashboardContinentSummary[];
}

export interface DashboardContinentCardsResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  continents: DashboardContinentCard[];
}

export interface DashboardTopCountryRank {
  countryCode: string | null;
  name: string;
  airportCount: number;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
}

export interface DashboardTopAirportRank {
  iata: string;
  airportName: string;
  city: string;
  country: string;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
}

export interface DashboardTopRanksResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  countries: DashboardTopCountryRank[];
  airports: DashboardTopAirportRank[];
}

export interface DashboardTopCountriesResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  countries: DashboardTopCountryRank[];
}

export interface DashboardTopAirportsResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  airports: DashboardTopAirportRank[];
}

export interface DashboardTopDestinationsResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  departures: DashboardTopAirportRank[];
  arrivals: DashboardTopAirportRank[];
}

export interface DashboardContinentDetailRoute {
  from: string;
  to: string;
  fromFlag: string;
  toFlag: string;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
  yoy: number;
  yoyN: number;
  mom: number;
  momN: number;
  wow: number;
  wowN: number;
}

export interface DashboardContinentDetailResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  seasonal: Array<{
    month: string;
    flights: number;
  }>;
  detail: {
    countryCount: string;
    busiestCountry: { flag: string; nameTh: string };
    busiestDelta: string;
    fastestGrowing: { flag: string; nameTh: string };
    fastestDelta: string;
    countries: Array<{
      flag: string;
      name: string;
      airports: number;
      flights: number;
      delta: string;
      deltaN: number;
      bar: number;
      highlight?: boolean;
    }>;
  };
  topRoutes: DashboardContinentDetailRoute[];
}

export interface DashboardContinentTopAirportRank {
  iata: string;
  airportName: string;
  city: string;
  country: string;
  flights: number;
  departureFlights: number;
  arrivalFlights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
  deltaText: string;
}

export interface DashboardContinentTopAirportsResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  continent: {
    key: ContinentMeta['key'];
    label: string;
    icon: string;
  };
  airports: DashboardContinentTopAirportRank[];
}

export interface DashboardContinentTopRouteRank {
  routeText: string;
  fromAirport: string;
  toAirport: string;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
  deltaText: string;
}

export interface DashboardContinentTopRoutesResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  continent: {
    key: ContinentMeta['key'];
    label: string;
    icon: string;
  };
  routes: DashboardContinentTopRouteRank[];
}

export type DashboardContinentTrendMode = 'day' | 'month' | 'year';

export interface DashboardContinentTrendPoint {
  key: string;
  label: string;
  inboundAvg: number;
  outboundAvg: number;
  totalAvg: number;
  highlight: boolean;
}

export interface DashboardContinentTrendModeData {
  mode: DashboardContinentTrendMode;
  status: 'ready' | 'unavailable';
  message: string | null;
  points: DashboardContinentTrendPoint[];
}

export interface DashboardContinentTrendsResponse {
  continent: {
    key: ContinentMeta['key'];
    label: string;
    icon: string;
  };
  generatedAt: string;
  modes: {
    day: DashboardContinentTrendModeData;
    month: DashboardContinentTrendModeData;
    year: DashboardContinentTrendModeData;
  };
}

type PeriodRow = {
  country_code: string | null;
  country_name: string | null;
  flights: number;
};

type AirportRow = {
  country_code: string | null;
  country_name: string | null;
  country: string | null;
};

type RouteRow = {
  country_code: string | null;
  country_name: string | null;
  route_id: number | string | null;
};

type CountryRankRow = {
  country_code: string | null;
  country_name: string | null;
  flights: number;
  airport_count: number;
};

type AirportRankRow = {
  airport_code: string | null;
  airport_name: string | null;
  city: string | null;
  country_code: string | null;
  country_name: string | null;
  flights: number;
};

interface WorldRangeInput {
  centerDateInput?: string;
  windowDays?: number;
  startDateInput?: string;
  endDateInput?: string;
}

interface ContinentDetailInput extends WorldRangeInput {
  continent: string;
  includeCore?: boolean;
  includeSeasonal?: boolean;
  includeTopRoutes?: boolean;
}

interface ContinentTopAirportsInput extends WorldRangeInput {
  continent: string;
  limit?: number;
}

interface ContinentTopRoutesInput extends WorldRangeInput {
  continent: string;
  limit?: number;
}

interface ContinentTrendAveragesInput {
  continent: string;
}

const CONTINENT_ORDER: ContinentMeta[] = [
  { key: 'Europe', label: 'Europe', icon: '🏰' },
  { key: 'Asia-Pacific', label: 'Asia-Pacific', icon: '🌏' },
  { key: 'North America', label: 'North America', icon: '🌎' },
  { key: 'South America', label: 'South America', icon: '🌎' },
  { key: 'Africa', label: 'Africa', icon: '🦁' },
  { key: 'Middle East', label: 'Middle East', icon: '🕌' },
  { key: 'Oceania', label: 'Oceania', icon: '🌏' },
  { key: 'Other', label: 'Other', icon: '🌐' },
];

const CONTINENT_DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const continentDetailCache = new Map<string, { expiresAt: number; payload: DashboardContinentDetailResponse }>();
const CONTINENT_TOP_AIRPORTS_CACHE_TTL_MS = 5 * 60 * 1000;
const continentTopAirportsCache = new Map<string, { expiresAt: number; payload: DashboardContinentTopAirportsResponse }>();
const CONTINENT_TOP_ROUTES_CACHE_TTL_MS = 5 * 60 * 1000;
const continentTopRoutesCache = new Map<string, { expiresAt: number; payload: DashboardContinentTopRoutesResponse }>();
const CONTINENT_TRENDS_CACHE_TTL_MS = 5 * 60 * 1000;
const continentTrendsCache = new Map<string, { expiresAt: number; payload: DashboardContinentTrendsResponse }>();
const CONTINENT_AIRPORT_CODES_CACHE_TTL_MS = 60 * 60 * 1000;
const continentAirportCodesCache = new Map<string, { expiresAt: number; codes: string[] }>();
const FLIGHT_PATH_COLUMN_CACHE_TTL_MS = 60 * 60 * 1000;
const flightPathColumnCache = new Map<string, { expiresAt: number; exists: boolean }>();
const FLIGHT_PATH_COLUMN_TYPES_CACHE_TTL_MS = 60 * 60 * 1000;
const flightPathColumnTypesCache = new Map<string, { expiresAt: number; types: string[] }>();

function formatDateForQuery(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildInclusiveRange(centerDate: Date, windowDays: number) {
  const startDate = new Date(centerDate);
  startDate.setUTCDate(startDate.getUTCDate() - windowDays);
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(centerDate);
  endDate.setUTCDate(endDate.getUTCDate() + windowDays);
  endDate.setUTCHours(23, 59, 59, 999);

  const comparisonEndDate = new Date(startDate);
  comparisonEndDate.setUTCDate(comparisonEndDate.getUTCDate() - 1);
  comparisonEndDate.setUTCHours(23, 59, 59, 999);

  const comparisonStartDate = new Date(startDate);
  comparisonStartDate.setUTCDate(comparisonStartDate.getUTCDate() - (windowDays * 2 + 1));
  comparisonStartDate.setUTCHours(0, 0, 0, 0);

  return {
    startDate,
    endDate,
    comparisonStartDate,
    comparisonEndDate,
  };
}

function parseDateInput(dateInput?: string) {
  if (!dateInput) {
    return null;
  }

  const date = new Date(`${dateInput.split('T')[0]}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildExplicitRange(startDateInput: string, endDateInput: string) {
  const startDate = parseDateInput(startDateInput);
  const endDate = parseDateInput(endDateInput);

  if (!startDate || !endDate) {
    throw new Error('Invalid start_date or end_date provided');
  }

  if (endDate < startDate) {
    throw new Error('end_date must be greater than or equal to start_date');
  }

  const daysSpan = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  const comparisonEndDate = new Date(startDate);
  comparisonEndDate.setUTCDate(comparisonEndDate.getUTCDate() - 1);
  comparisonEndDate.setUTCHours(23, 59, 59, 999);

  const comparisonStartDate = new Date(startDate);
  comparisonStartDate.setUTCDate(comparisonStartDate.getUTCDate() - daysSpan);
  comparisonStartDate.setUTCHours(0, 0, 0, 0);

  return {
    startDate,
    endDate,
    comparisonStartDate,
    comparisonEndDate,
    windowDays: Math.max(1, Math.floor((daysSpan - 1) / 2)),
  };
}

function resolveWorldRange(input: WorldRangeInput) {
  if (input.startDateInput && input.endDateInput) {
    return buildExplicitRange(input.startDateInput, input.endDateInput);
  }

  const centerDate = input.centerDateInput
    ? parseDateInput(input.centerDateInput)
    : new Date();

  if (!centerDate) {
    throw new Error('Invalid center date provided');
  }

  return {
    ...buildInclusiveRange(centerDate, input.windowDays ?? 15),
    windowDays: input.windowDays ?? 15,
  };
}

function resolveCenterDate(input: WorldRangeInput, startDate: Date, endDate: Date) {
  if (input.startDateInput && input.endDateInput) {
    return new Date((startDate.getTime() + endDate.getTime()) / 2);
  }

  if (input.centerDateInput) {
    return parseDateInput(input.centerDateInput) || new Date();
  }

  return new Date();
}

function sumContinentRows(rows: PeriodRow[]): DashboardContinentSummary[] {
  const grouped = new Map<string, DashboardContinentSummary>();

    for (const meta of CONTINENT_ORDER) {
      grouped.set(meta.key, {
        key: meta.key,
        label: meta.label,
        icon: meta.icon,
        airportCount: 0,
        countryCount: 0,
        routeCount: 0,
        flights: 0,
        previousFlights: 0,
        deltaFlights: 0,
        deltaPercent: 0,
    });
  }

  for (const row of rows) {
    const meta = getContinentMeta(row.country_code, row.country_name);
      const existing = grouped.get(meta.key) || {
        key: meta.key,
        label: meta.label,
        icon: meta.icon,
        airportCount: 0,
        countryCount: 0,
        routeCount: 0,
        flights: 0,
        previousFlights: 0,
        deltaFlights: 0,
        deltaPercent: 0,
    };
    existing.flights += Number(row.flights) || 0;
    grouped.set(meta.key, existing);
  }

  return CONTINENT_ORDER
    .map((meta) => grouped.get(meta.key)!)
    .sort((a, b) => b.flights - a.flights);
}

function mergeCurrentAndPrevious(
  currentRows: PeriodRow[],
  previousRows: PeriodRow[],
): DashboardContinentSummary[] {
  const current = sumContinentRows(currentRows);
  const previous = sumContinentRows(previousRows);

  const previousMap = new Map(previous.map((row) => [row.key, row]));

  return current.map((row) => {
    const prev = previousMap.get(row.key);
    const previousFlights = prev?.flights || 0;
    const deltaFlights = row.flights - previousFlights;
    const deltaPercent = previousFlights > 0
      ? (deltaFlights / previousFlights) * 100
      : row.flights > 0
        ? 100
        : 0;

    return {
      ...row,
      previousFlights,
      deltaFlights,
      deltaPercent,
      airportCount: 0,
      countryCount: 0,
      routeCount: 0,
    };
  });
}

function normalizeCountryKey(countryCode: string | null, countryName: string | null, country: string | null) {
  return (
    (countryCode || '').trim().toUpperCase()
    || (countryName || country || 'Other').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
  );
}

function countryFlagFromCode(countryCode: string | null) {
  const code = (countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return '🌐';
  }

  const first = code.codePointAt(0);
  const second = code.codePointAt(1);
  if (first == null || second == null) {
    return '🌐';
  }

  return String.fromCodePoint(0x1f1e6 + first - 65, 0x1f1e6 + second - 65);
}

async function getContinentAirportCodes(continentKey: ContinentMeta['key']): Promise<string[]> {
  const cached = continentAirportCodesCache.get(continentKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.codes;
  }

  const result = await pool.query(`
    SELECT code, country_code, country_name, country
    FROM airports
    WHERE code IS NOT NULL AND TRIM(code) <> ''
  `);

  const codes = Array.from(
    new Set(
      (result.rows as Array<{ code: string | null; country_code: string | null; country_name: string | null; country: string | null }>)
        .filter((row) => getContinentMeta(row.country_code, row.country_name || row.country).key === continentKey)
        .map((row) => (row.code || '').trim().toUpperCase())
        .filter((code) => Boolean(code)),
    ),
  );

  continentAirportCodesCache.set(continentKey, {
    expiresAt: Date.now() + CONTINENT_AIRPORT_CODES_CACHE_TTL_MS,
    codes,
  });

  return codes;
}

async function hasFlightPathColumn(columnName: string): Promise<boolean> {
  const cacheKey = columnName.trim().toLowerCase();
  const cached = flightPathColumnCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.exists;
  }

  try {
    const result = await pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('departure_flight_paths', 'arrival_flight_paths')
          AND column_name = $1
      `,
      [cacheKey],
    );

    const exists = (Number(result.rows[0]?.count) || 0) >= 2;
    flightPathColumnCache.set(cacheKey, {
      expiresAt: Date.now() + FLIGHT_PATH_COLUMN_CACHE_TTL_MS,
      exists,
    });
    return exists;
  } catch {
    // If schema introspection is unavailable, disable the dependent mode instead of failing the request.
    return false;
  }
}

async function getFlightPathColumnTypes(columnName: string): Promise<string[]> {
  const cacheKey = columnName.trim().toLowerCase();
  const cached = flightPathColumnTypesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.types;
  }

  try {
    const result = await pool.query(
      `
        SELECT DISTINCT data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('departure_flight_paths', 'arrival_flight_paths')
          AND column_name = $1
      `,
      [cacheKey],
    );

    const types = (result.rows as Array<{ data_type: string }>).map((row) => String(row.data_type || '').toLowerCase()).filter(Boolean);
    flightPathColumnTypesCache.set(cacheKey, {
      expiresAt: Date.now() + FLIGHT_PATH_COLUMN_TYPES_CACHE_TTL_MS,
      types,
    });
    return types;
  } catch {
    return [];
  }
}

function resolveContinentMetaFromInput(continentInput: string) {
  const normalized = continentInput.trim().toLowerCase();
  const thaiAliases: Record<string, ContinentMeta['key']> = {
    'ยุโรป': 'Europe',
    'เอเชีย': 'Asia-Pacific',
    'อเมริกาเหนือ': 'North America',
    'อเมริกาใต้': 'South America',
    'แอฟริกา': 'Africa',
    'ตะวันออกกลาง': 'Middle East',
    'โอเชียเนีย': 'Oceania',
    'อื่นๆ': 'Other',
    'other': 'Other',
  };

  const byKey = CONTINENT_ORDER.find((meta) => meta.key.toLowerCase() === normalized);
  if (byKey) {
    return byKey;
  }

  const byLabel = CONTINENT_ORDER.find((meta) => meta.label.toLowerCase() === normalized);
  if (byLabel) {
    return byLabel;
  }

  const thaiMatch = thaiAliases[continentInput.trim()] || thaiAliases[normalized];
  if (thaiMatch) {
    return CONTINENT_ORDER.find((meta) => meta.key === thaiMatch) || CONTINENT_ORDER[0];
  }

  return CONTINENT_ORDER.find((meta) => meta.key === 'Europe') || CONTINENT_ORDER[0];
}

function sumAirportRows(rows: AirportRow[]) {
  const grouped = new Map<
    ContinentMeta['key'],
    {
      airportCount: number;
      countryKeys: Set<string>;
      meta: ContinentMeta;
    }
  >();

  for (const meta of CONTINENT_ORDER) {
    grouped.set(meta.key, {
      airportCount: 0,
      countryKeys: new Set<string>(),
      meta,
    });
  }

  for (const row of rows) {
    const meta = getContinentMeta(row.country_code, row.country_name || row.country);
    const existing = grouped.get(meta.key);
    if (!existing) {
      continue;
    }

    existing.airportCount += 1;
    existing.countryKeys.add(normalizeCountryKey(row.country_code, row.country_name, row.country));
  }

  return grouped;
}

function sumRouteRows(rows: RouteRow[]) {
  const grouped = new Map<
    ContinentMeta['key'],
    {
      routeIds: Set<string>;
      meta: ContinentMeta;
    }
  >();

  for (const meta of CONTINENT_ORDER) {
    grouped.set(meta.key, {
      routeIds: new Set<string>(),
      meta,
    });
  }

  for (const row of rows) {
    const routeId = row.route_id == null ? '' : String(row.route_id).trim();
    if (!routeId) {
      continue;
    }

    const meta = getContinentMeta(row.country_code, row.country_name);
    const existing = grouped.get(meta.key);
    if (!existing) {
      continue;
    }

    existing.routeIds.add(routeId);
  }

  return grouped;
}

function formatDeltaLine(deltaFlights: number, deltaPercent: number) {
  const deltaSign = deltaFlights >= 0 ? '+' : '';
  const pctSign = deltaPercent >= 0 ? '+' : '';
  return `${deltaFlights >= 0 ? '▲' : '▼'} ${deltaSign}${deltaFlights.toLocaleString()} (${pctSign}${deltaPercent.toFixed(1)}%)`;
}

export class DashboardSummaryService {
  static async getWorldSummary(
    input: WorldRangeInput = {},
  ): Promise<DashboardSummaryResponse> {
    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);

    const totalFlightsQuery = `
      WITH flight_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      )
      SELECT
        (SELECT COUNT(*)::int FROM flight_rows) AS total_flights,
        (SELECT COUNT(DISTINCT airport_code)::int
         FROM flight_rows
         WHERE airport_code IS NOT NULL AND airport_code <> ''
        ) AS active_airports
    `;

    const airportsQuery = `
      SELECT
        country_code,
        country_name,
        country
      FROM airports
    `;

    const routesQuery = `
      SELECT
        a.country_code,
        COALESCE(a.country_name, a.country, a.code) AS country_name,
        flight_rows.route_id
      FROM (
        SELECT route_id, dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT route_id, arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT route_id, dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT route_id, arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      ) flight_rows
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(flight_rows.airport_code))
    `;

    const continentQuery = `
      SELECT
        a.country_code,
        COALESCE(a.country_name, a.country, a.code) AS country_name,
        COUNT(*)::int AS flights
      FROM (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      ) flight_rows
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(flight_rows.airport_code))
      GROUP BY a.country_code, COALESCE(a.country_name, a.country, a.code)
    `;

    const [summaryResult, currentContinentResult, previousContinentResult, airportsResult, routesResult] = await Promise.all([
      pool.query(totalFlightsQuery, [periodStart, periodEnd]),
      pool.query(continentQuery, [periodStart, periodEnd]),
      pool.query(continentQuery, [comparisonStart, comparisonEnd]),
      pool.query(airportsQuery),
      pool.query(routesQuery, [periodStart, periodEnd]),
    ]);

    const totalFlights = Number(summaryResult.rows[0]?.total_flights) || 0;
    const activeAirports = Number(summaryResult.rows[0]?.active_airports) || 0;
    const averageFlightsPerDay = Math.round(totalFlights / (windowDays * 2 + 1));
    const airportMap = sumAirportRows(airportsResult.rows);
    const routeMap = sumRouteRows(routesResult.rows);

    const continentBreakdown = mergeCurrentAndPrevious(
      currentContinentResult.rows,
      previousContinentResult.rows,
    ).map((row) => {
      const airportSummary = airportMap.get(row.key);
      const routeSummary = routeMap.get(row.key);

      return {
        ...row,
        airportCount: airportSummary?.airportCount || 0,
        countryCount: airportSummary?.countryKeys.size || 0,
        routeCount: routeSummary?.routeIds.size || 0,
      };
    });

    const busiestContinent = continentBreakdown[0] || {
      key: 'Other' as const,
      label: 'Other',
      icon: '🌐',
      airportCount: 0,
      countryCount: 0,
      routeCount: 0,
      flights: 0,
      previousFlights: 0,
      deltaFlights: 0,
      deltaPercent: 0,
    };

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      totalFlights,
      activeAirports,
      averageFlightsPerDay,
      busiestContinent,
      continentBreakdown,
    };
  }

  static async getWorldContinentCards(
    input: WorldRangeInput = {},
  ): Promise<DashboardContinentCardsResponse> {
    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);

    const airportsQuery = `
      SELECT
        country_code,
        country_name,
        country
      FROM airports
    `;

    const continentQuery = `
      SELECT
        a.country_code,
        COALESCE(a.country_name, a.country, a.code) AS country_name,
        COUNT(*)::int AS flights
      FROM (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      ) flight_rows
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(flight_rows.airport_code))
      GROUP BY a.country_code, COALESCE(a.country_name, a.country, a.code)
    `;

    const [currentContinentResult, previousContinentResult, airportsResult] = await Promise.all([
      pool.query(continentQuery, [periodStart, periodEnd]),
      pool.query(continentQuery, [comparisonStart, comparisonEnd]),
      pool.query(airportsQuery),
    ]);

    const current = mergeCurrentAndPrevious(
      currentContinentResult.rows,
      previousContinentResult.rows,
    );
    const airportMap = sumAirportRows(airportsResult.rows);

    const continents = current
      .map((row) => {
        const airportSummary = airportMap.get(row.key);
        const airportCount = airportSummary?.airportCount || 0;
        const countryCount = airportSummary?.countryKeys.size || 0;

        return {
          key: row.key,
          label: row.label,
          icon: row.icon,
          airports: `${airportCount.toLocaleString()} สนามบิน · ${countryCount.toLocaleString()} ประเทศ`,
          airportCount,
          countryCount,
          flights: row.flights,
          previousFlights: row.previousFlights,
          deltaFlights: row.deltaFlights,
          deltaPercent: row.deltaPercent,
          delta: formatDeltaLine(row.deltaFlights, row.deltaPercent),
          highlight: false,
          yoy: row.deltaPercent,
          yoyN: row.deltaFlights,
          mom: row.deltaPercent,
          momN: row.deltaFlights,
          wow: row.deltaPercent,
          wowN: row.deltaFlights,
        } satisfies DashboardContinentCard;
      })
      .filter((row) => row.key !== 'Other')
      .filter((row) => row.airportCount > 0 || row.flights > 0)
      .sort((a, b) => b.flights - a.flights || b.airportCount - a.airportCount)
      .map((row, index) => ({
        ...row,
        highlight: index === 0,
      }));

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      continents,
    };
  }

  static async getWorldTopRanks(
    input: WorldRangeInput = {},
  ): Promise<DashboardTopRanksResponse> {
    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);

    const countryQuery = `
      WITH flight_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      )
      SELECT
        a.country_code AS country_code,
        COALESCE(a.country_name, a.country, a.code, 'Other') AS country_name,
        COUNT(*)::int AS flights,
        COUNT(DISTINCT a.code)::int AS airport_count
      FROM flight_rows
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(flight_rows.airport_code))
      GROUP BY
        a.country_code,
        COALESCE(a.country_name, a.country, a.code, 'Other')
      ORDER BY flights DESC, airport_count DESC, country_name ASC
    `;

    const airportQuery = `
      WITH flight_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      )
      SELECT
        UPPER(TRIM(a.code)) AS airport_code,
        COALESCE(a.name, a.code) AS airport_name,
        COALESCE(a.city, a.name, a.code) AS city,
        COALESCE(a.country_name, a.country, 'Other') AS country_name,
        COALESCE(a.country_code, a.country, NULL) AS country_code,
        COUNT(*)::int AS flights
      FROM flight_rows
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(flight_rows.airport_code))
      WHERE a.code IS NOT NULL
      GROUP BY
        UPPER(TRIM(a.code)),
        COALESCE(a.name, a.code),
        COALESCE(a.city, a.name, a.code),
        COALESCE(a.country_name, a.country, 'Other'),
        COALESCE(a.country_code, a.country, NULL)
      ORDER BY flights DESC, airport_code ASC
    `;

    const [currentCountriesResult, previousCountriesResult, currentAirportsResult, previousAirportsResult] = await Promise.all([
      pool.query(countryQuery, [periodStart, periodEnd]),
      pool.query(countryQuery, [comparisonStart, comparisonEnd]),
      pool.query(airportQuery, [periodStart, periodEnd]),
      pool.query(airportQuery, [comparisonStart, comparisonEnd]),
    ]);

    const previousCountryMap = new Map<string, number>();
    for (const row of previousCountriesResult.rows as CountryRankRow[]) {
      const key = normalizeCountryKey(row.country_code, row.country_name, row.country_name);
      previousCountryMap.set(key, Number(row.flights) || 0);
    }

    const countries = (currentCountriesResult.rows as CountryRankRow[])
      .map((row) => {
        const key = normalizeCountryKey(row.country_code, row.country_name, row.country_name);
        const flights = Number(row.flights) || 0;
        const previousFlights = previousCountryMap.get(key) || 0;
        const deltaFlights = flights - previousFlights;
        const deltaPercent = previousFlights > 0
          ? (deltaFlights / previousFlights) * 100
          : flights > 0
            ? 100
            : 0;

        return {
          countryCode: row.country_code,
          name: row.country_name || 'Other',
          airportCount: Number(row.airport_count) || 0,
          flights,
          previousFlights,
          deltaFlights,
          deltaPercent,
        } satisfies DashboardTopCountryRank;
      })
      .filter((row) => row.name !== 'Other' && row.flights > 0)
      .sort((a, b) => b.flights - a.flights || b.airportCount - a.airportCount || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
      .slice(0, 5);

    const previousAirportMap = new Map<string, number>();
    for (const row of previousAirportsResult.rows as AirportRankRow[]) {
      const key = (row.airport_code || '').trim().toUpperCase();
      if (!key) {
        continue;
      }

      previousAirportMap.set(key, Number(row.flights) || 0);
    }

    const airports = (currentAirportsResult.rows as AirportRankRow[])
      .map((row) => {
        const iata = (row.airport_code || '').trim().toUpperCase();
        const flights = Number(row.flights) || 0;
        const previousFlights = previousAirportMap.get(iata) || 0;
        const deltaFlights = flights - previousFlights;
        const deltaPercent = previousFlights > 0
          ? (deltaFlights / previousFlights) * 100
          : flights > 0
            ? 100
            : 0;

        return {
          iata,
          airportName: row.airport_name || iata,
          city: row.city || row.airport_name || iata,
          country: row.country_name || row.country_code || 'Other',
          flights,
          previousFlights,
          deltaFlights,
          deltaPercent,
        } satisfies DashboardTopAirportRank;
      })
      .filter((row) => row.iata && row.country !== 'Other' && row.flights > 0)
      .sort((a, b) => b.flights - a.flights || a.iata.localeCompare(b.iata, 'en', { sensitivity: 'base' }))
      .slice(0, 5);

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      countries,
      airports,
    };
  }

  static async getWorldTopCountries(
    input: WorldRangeInput = {},
  ): Promise<DashboardTopCountriesResponse> {
    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);

    const countryQuery = `
      WITH flight_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      )
      SELECT
        a.country_code AS country_code,
        COALESCE(a.country_name, a.country, a.code, 'Other') AS country_name,
        COUNT(*)::int AS flights,
        COUNT(DISTINCT a.code)::int AS airport_count
      FROM flight_rows
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(flight_rows.airport_code))
      GROUP BY
        a.country_code,
        COALESCE(a.country_name, a.country, a.code, 'Other')
      ORDER BY flights DESC, airport_count DESC, country_name ASC
    `;

    const [currentCountriesResult, previousCountriesResult] = await Promise.all([
      pool.query(countryQuery, [periodStart, periodEnd]),
      pool.query(countryQuery, [comparisonStart, comparisonEnd]),
    ]);

    const previousCountryMap = new Map<string, number>();
    for (const row of previousCountriesResult.rows as CountryRankRow[]) {
      const key = normalizeCountryKey(row.country_code, row.country_name, row.country_name);
      previousCountryMap.set(key, Number(row.flights) || 0);
    }

    const countries = (currentCountriesResult.rows as CountryRankRow[])
      .map((row) => {
        const key = normalizeCountryKey(row.country_code, row.country_name, row.country_name);
        const flights = Number(row.flights) || 0;
        const previousFlights = previousCountryMap.get(key) || 0;
        const deltaFlights = flights - previousFlights;
        const deltaPercent = previousFlights > 0
          ? (deltaFlights / previousFlights) * 100
          : flights > 0
            ? 100
            : 0;

        return {
          countryCode: row.country_code,
          name: row.country_name || 'Other',
          airportCount: Number(row.airport_count) || 0,
          flights,
          previousFlights,
          deltaFlights,
          deltaPercent,
        } satisfies DashboardTopCountryRank;
      })
      .filter((row) => row.name !== 'Other' && row.flights > 0)
      .sort((a, b) => b.flights - a.flights || b.airportCount - a.airportCount || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
      .slice(0, 5);

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      countries,
    };
  }

  static async getWorldTopAirports(
    input: WorldRangeInput = {},
  ): Promise<DashboardTopAirportsResponse> {
    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);

    const airportQuery = `
      WITH flight_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      )
      SELECT
        UPPER(TRIM(a.code)) AS airport_code,
        COALESCE(a.name, a.code) AS airport_name,
        COALESCE(a.city, a.name, a.code) AS city,
        COALESCE(a.country_name, a.country, 'Other') AS country_name,
        COALESCE(a.country_code, a.country, NULL) AS country_code,
        COUNT(*)::int AS flights
      FROM flight_rows
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(flight_rows.airport_code))
      WHERE a.code IS NOT NULL
      GROUP BY
        UPPER(TRIM(a.code)),
        COALESCE(a.name, a.code),
        COALESCE(a.city, a.name, a.code),
        COALESCE(a.country_name, a.country, 'Other'),
        COALESCE(a.country_code, a.country, NULL)
      ORDER BY flights DESC, airport_code ASC
    `;

    const [currentAirportsResult, previousAirportsResult] = await Promise.all([
      pool.query(airportQuery, [periodStart, periodEnd]),
      pool.query(airportQuery, [comparisonStart, comparisonEnd]),
    ]);

    const previousAirportMap = new Map<string, number>();
    for (const row of previousAirportsResult.rows as AirportRankRow[]) {
      const key = (row.airport_code || '').trim().toUpperCase();
      if (!key) {
        continue;
      }

      previousAirportMap.set(key, Number(row.flights) || 0);
    }

    const airports = (currentAirportsResult.rows as AirportRankRow[])
      .map((row) => {
        const iata = (row.airport_code || '').trim().toUpperCase();
        const flights = Number(row.flights) || 0;
        const previousFlights = previousAirportMap.get(iata) || 0;
        const deltaFlights = flights - previousFlights;
        const deltaPercent = previousFlights > 0
          ? (deltaFlights / previousFlights) * 100
          : flights > 0
            ? 100
            : 0;

        return {
          iata,
          airportName: row.airport_name || iata,
          city: row.city || row.airport_name || iata,
          country: row.country_name || row.country_code || 'Other',
          flights,
          previousFlights,
          deltaFlights,
          deltaPercent,
        } satisfies DashboardTopAirportRank;
      })
      .filter((row) => row.iata && row.country !== 'Other' && row.flights > 0)
      .sort((a, b) => b.flights - a.flights || a.iata.localeCompare(b.iata, 'en', { sensitivity: 'base' }))
      .slice(0, 5);

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      airports,
    };
  }

  static async getWorldTopDestinations(
    input: WorldRangeInput = {},
  ): Promise<DashboardTopDestinationsResponse> {
    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);

    const buildQuery = (column: 'dep_airport' | 'arr_airport') => `
      WITH flight_rows AS (
        SELECT ${column} AS airport_code
        FROM ${column === 'dep_airport' ? 'departure_flight_paths' : 'arrival_flight_paths'}
        WHERE departure_date >= $1 AND departure_date <= $2
      )
      SELECT
        UPPER(TRIM(a.code)) AS airport_code,
        COALESCE(a.name, a.code) AS airport_name,
        COALESCE(a.city, a.name, a.code) AS city,
        COALESCE(a.country_name, a.country, 'Other') AS country_name,
        COALESCE(a.country_code, a.country, NULL) AS country_code,
        COUNT(*)::int AS flights
      FROM flight_rows
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(flight_rows.airport_code))
      WHERE a.code IS NOT NULL
      GROUP BY
        UPPER(TRIM(a.code)),
        COALESCE(a.name, a.code),
        COALESCE(a.city, a.name, a.code),
        COALESCE(a.country_name, a.country, 'Other'),
        COALESCE(a.country_code, a.country, NULL)
      ORDER BY flights DESC, airport_code ASC
    `;

    const [currentDeparturesResult, previousDeparturesResult, currentArrivalsResult, previousArrivalsResult] = await Promise.all([
      pool.query(buildQuery('dep_airport'), [periodStart, periodEnd]),
      pool.query(buildQuery('dep_airport'), [comparisonStart, comparisonEnd]),
      pool.query(buildQuery('arr_airport'), [periodStart, periodEnd]),
      pool.query(buildQuery('arr_airport'), [comparisonStart, comparisonEnd]),
    ]);

    const buildRows = (currentRows: AirportRankRow[], previousRows: AirportRankRow[]) => {
      const previousMap = new Map<string, number>();

      for (const row of previousRows) {
        const key = (row.airport_code || '').trim().toUpperCase();
        if (!key) continue;
        previousMap.set(key, Number(row.flights) || 0);
      }

      return currentRows
        .map((row) => {
          const iata = (row.airport_code || '').trim().toUpperCase();
          const flights = Number(row.flights) || 0;
          const previousFlights = previousMap.get(iata) || 0;
          const deltaFlights = flights - previousFlights;
          const deltaPercent = previousFlights > 0
            ? (deltaFlights / previousFlights) * 100
            : flights > 0
              ? 100
              : 0;

          return {
            iata,
            airportName: row.airport_name || iata,
            city: row.city || row.airport_name || iata,
            country: row.country_name || row.country_code || 'Other',
            flights,
            previousFlights,
            deltaFlights,
            deltaPercent,
          } satisfies DashboardTopAirportRank;
        })
        .filter((row) => row.iata && row.country !== 'Other' && row.flights > 0)
        .sort((a, b) => b.flights - a.flights || a.iata.localeCompare(b.iata, 'en', { sensitivity: 'base' }))
        .slice(0, 5);
    };

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      departures: buildRows(currentDeparturesResult.rows as AirportRankRow[], previousDeparturesResult.rows as AirportRankRow[]),
      arrivals: buildRows(currentArrivalsResult.rows as AirportRankRow[], previousArrivalsResult.rows as AirportRankRow[]),
    };
  }

  static async getContinentDetail(
    input: ContinentDetailInput,
  ): Promise<DashboardContinentDetailResponse> {
    const continentMeta = resolveContinentMetaFromInput(input.continent);
    const includeCore = input.includeCore ?? true;
    const includeSeasonal = input.includeSeasonal ?? true;
    const includeTopRoutes = input.includeTopRoutes ?? true;
    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);
    const cacheKey = [
      continentMeta.key,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      includeCore ? 'core:1' : 'core:0',
      includeSeasonal ? 'seasonal:1' : 'seasonal:0',
      includeTopRoutes ? 'routes:1' : 'routes:0',
    ].join('|');

    const cached = continentDetailCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const continentAirportCodes = await getContinentAirportCodes(continentMeta.key);
    if (!continentAirportCodes.length) {
      const emptyPayload: DashboardContinentDetailResponse = {
        centerDate: formatDateForQuery(centerDate),
        windowDays,
        periodStart,
        periodEnd,
        comparisonStart,
        comparisonEnd,
        seasonal: [],
        detail: {
          countryCount: '0',
          busiestCountry: {
            flag: countryFlagFromCode(null),
            nameTh: continentMeta.label,
          },
          busiestDelta: 'ยังไม่มีข้อมูล',
          fastestGrowing: {
            flag: countryFlagFromCode(null),
            nameTh: continentMeta.label,
          },
          fastestDelta: 'ยังไม่มีข้อมูล',
          countries: [],
        },
        topRoutes: [],
      };

      continentDetailCache.set(cacheKey, {
        expiresAt: Date.now() + CONTINENT_DETAIL_CACHE_TTL_MS,
        payload: emptyPayload,
      });

      return emptyPayload;
    }

    const continentAirportCodesParam = continentAirportCodes;
    const seasonalEndDate = new Date(endDate);
    const seasonalStartDate = new Date(Date.UTC(seasonalEndDate.getUTCFullYear(), seasonalEndDate.getUTCMonth() - 11, 1));
    seasonalStartDate.setUTCHours(0, 0, 0, 0);
    seasonalEndDate.setUTCMonth(seasonalEndDate.getUTCMonth() + 1, 0);
    seasonalEndDate.setUTCHours(23, 59, 59, 999);
    const seasonalStart = formatDateForQuery(seasonalStartDate);
    const seasonalEnd = formatDateForQuery(seasonalEndDate);

    const countryQuery = `
      WITH continent_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS airport_code
        FROM airports
        WHERE UPPER(TRIM(code)) = ANY($3::text[])
      ),
      flight_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      )
      SELECT
        a.country_code AS country_code,
        COALESCE(a.country_name, a.country, a.code, 'Other') AS country_name,
        COUNT(*)::int AS flights,
        COUNT(DISTINCT a.code)::int AS airport_count
      FROM flight_rows
      JOIN continent_airports ca ON UPPER(TRIM(flight_rows.airport_code)) = ca.airport_code
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(flight_rows.airport_code))
      GROUP BY
        a.country_code,
        COALESCE(a.country_name, a.country, a.code, 'Other')
      ORDER BY flights DESC, airport_count DESC, country_name ASC
    `;

    const routeQuery = `
      WITH continent_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS airport_code
        FROM airports
        WHERE UPPER(TRIM(code)) = ANY($3::text[])
      ),
      flight_rows AS (
        SELECT dep_airport AS from_airport, arr_airport AS to_airport
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS from_airport, arr_airport AS to_airport
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      )
      SELECT
        UPPER(TRIM(fr.from_airport)) AS from_code,
        UPPER(TRIM(fr.to_airport)) AS to_code,
        COALESCE(dep.name, dep.code) AS from_name,
        COALESCE(dep.city, dep.name, dep.code) AS from_city,
        COALESCE(dep.country_code, dep.country, NULL) AS from_country_code,
        COALESCE(dep.country_name, dep.country, 'Other') AS from_country_name,
        COALESCE(arr.name, arr.code) AS to_name,
        COALESCE(arr.city, arr.name, arr.code) AS to_city,
        COALESCE(arr.country_code, arr.country, NULL) AS to_country_code,
        COALESCE(arr.country_name, arr.country, 'Other') AS to_country_name,
        COUNT(*)::int AS flights
      FROM flight_rows fr
      JOIN continent_airports dep_codes ON UPPER(TRIM(fr.from_airport)) = dep_codes.airport_code
      JOIN continent_airports arr_codes ON UPPER(TRIM(fr.to_airport)) = arr_codes.airport_code
      LEFT JOIN airports dep ON UPPER(TRIM(dep.code)) = UPPER(TRIM(fr.from_airport))
      LEFT JOIN airports arr ON UPPER(TRIM(arr.code)) = UPPER(TRIM(fr.to_airport))
      WHERE dep.code IS NOT NULL
        AND arr.code IS NOT NULL
      GROUP BY
        UPPER(TRIM(fr.from_airport)),
        UPPER(TRIM(fr.to_airport)),
        COALESCE(dep.name, dep.code),
        COALESCE(dep.city, dep.name, dep.code),
        COALESCE(dep.country_code, dep.country, NULL),
        COALESCE(dep.country_name, dep.country, 'Other'),
        COALESCE(arr.name, arr.code),
        COALESCE(arr.city, arr.name, arr.code),
        COALESCE(arr.country_code, arr.country, NULL),
        COALESCE(arr.country_name, arr.country, 'Other')
      ORDER BY flights DESC, from_code ASC, to_code ASC
    `;

    const seasonalQuery = `
      WITH continent_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS airport_code
        FROM airports
        WHERE UPPER(TRIM(code)) = ANY($3::text[])
      ),
      flight_rows AS (
        SELECT departure_date AS flight_date, dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT departure_date AS flight_date, arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT departure_date AS flight_date, dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT departure_date AS flight_date, arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      )
      SELECT
        date_trunc('month', flight_date)::date AS month,
        a.country_code AS country_code,
        COALESCE(a.country_name, a.country, 'Other') AS country_name,
        COUNT(*)::int AS flights
      FROM flight_rows
      JOIN continent_airports ca ON UPPER(TRIM(flight_rows.airport_code)) = ca.airport_code
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(flight_rows.airport_code))
      WHERE a.code IS NOT NULL
      GROUP BY
        date_trunc('month', flight_date)::date,
        a.country_code,
        COALESCE(a.country_name, a.country, 'Other')
      ORDER BY month ASC
    `;

    if (!includeCore) {
      const [seasonalResult, currentRoutesResult, previousRoutesResult] = await Promise.all([
        includeSeasonal
          ? pool.query(seasonalQuery, [seasonalStart, seasonalEnd, continentAirportCodesParam])
          : Promise.resolve({ rows: [] } as { rows: Array<{ month: Date | string; country_code: string | null; country_name: string | null; flights: number }> }),
        includeTopRoutes
          ? pool.query(routeQuery, [periodStart, periodEnd, continentAirportCodesParam])
          : Promise.resolve({ rows: [] } as { rows: Array<Record<string, any>> }),
        includeTopRoutes
          ? pool.query(routeQuery, [comparisonStart, comparisonEnd, continentAirportCodesParam])
          : Promise.resolve({ rows: [] } as { rows: Array<Record<string, any>> }),
      ]);

      const seasonalBuckets = new Map<string, number>();
      const seasonalCursor = new Date(seasonalStartDate);
      for (let i = 0; i < 12; i += 1) {
        const key = formatDateForQuery(seasonalCursor).slice(0, 7);
        seasonalBuckets.set(key, 0);
        seasonalCursor.setUTCMonth(seasonalCursor.getUTCMonth() + 1);
      }

      for (const row of seasonalResult.rows as Array<{ month: Date | string; country_code: string | null; country_name: string | null; flights: number }>) {
        const meta = getContinentMeta(row.country_code, row.country_name);
        if (meta.key !== continentMeta.key) {
          continue;
        }

        const monthValue = row.month instanceof Date ? row.month : new Date(row.month);
        const monthKey = formatDateForQuery(monthValue).slice(0, 7);
        const current = seasonalBuckets.get(monthKey);
        if (current != null) {
          seasonalBuckets.set(monthKey, current + (Number(row.flights) || 0));
        }
      }

      const seasonal = includeSeasonal
        ? Array.from(seasonalBuckets.entries()).map(([month, flights]) => ({ month, flights }))
        : [];

      const routePreviousMap = new Map<string, number>();
      if (includeTopRoutes) {
        for (const row of previousRoutesResult.rows as Array<Record<string, any>>) {
          const fromCode = (row.from_code || '').trim().toUpperCase();
          const toCode = (row.to_code || '').trim().toUpperCase();
          if (!fromCode || !toCode) {
            continue;
          }
          routePreviousMap.set(`${fromCode}__${toCode}`, Number(row.flights) || 0);
        }
      }

      const topRoutes = includeTopRoutes
        ? (currentRoutesResult.rows as Array<Record<string, any>>)
            .map((row) => {
              const fromCountryMeta = getContinentMeta(row.from_country_code, row.from_country_name);
              const toCountryMeta = getContinentMeta(row.to_country_code, row.to_country_name);
              if (fromCountryMeta.key !== continentMeta.key || toCountryMeta.key !== continentMeta.key) {
                return null;
              }

              const fromCode = (row.from_code || '').trim().toUpperCase();
              const toCode = (row.to_code || '').trim().toUpperCase();
              if (!fromCode || !toCode) {
                return null;
              }

              const key = `${fromCode}__${toCode}`;
              const flights = Number(row.flights) || 0;
              const previousFlights = routePreviousMap.get(key) || 0;
              const deltaFlights = flights - previousFlights;
              const deltaPercent = previousFlights > 0
                ? (deltaFlights / previousFlights) * 100
                : flights > 0
                  ? 100
                  : 0;
              const deltaSign = deltaFlights >= 0 ? '+' : '';
              const deltaArrow = deltaFlights >= 0 ? '▲' : '▼';

              return {
                from: `${row.from_city || row.from_name || fromCode} ${fromCode}`,
                to: `${row.to_city || row.to_name || toCode} ${toCode}`,
                fromFlag: countryFlagFromCode(row.from_country_code),
                toFlag: countryFlagFromCode(row.to_country_code),
                flights,
                previousFlights,
                deltaFlights,
                deltaPercent,
                yoy: deltaPercent,
                yoyN: deltaFlights,
                mom: deltaPercent,
                momN: deltaFlights,
                wow: deltaPercent,
                wowN: deltaFlights,
                sortText: `${deltaArrow} ${deltaSign}${deltaFlights.toLocaleString()} (${deltaPercent.toFixed(1)}%)`,
              };
            })
            .filter((row): row is NonNullable<typeof row> => Boolean(row))
            .sort((a, b) => b.flights - a.flights || a.from.localeCompare(b.from, 'en', { sensitivity: 'base' }))
            .slice(0, 5)
            .map(({ sortText, ...row }) => row)
        : [];

      const emptyDetail = {
        countryCount: '0',
        busiestCountry: {
          flag: countryFlagFromCode(null),
          nameTh: continentMeta.label,
        },
        busiestDelta: 'ยังไม่มีข้อมูล',
        fastestGrowing: {
          flag: countryFlagFromCode(null),
          nameTh: continentMeta.label,
        },
        fastestDelta: 'ยังไม่มีข้อมูล',
        countries: [],
      };

      const partialPayload: DashboardContinentDetailResponse = {
        centerDate: formatDateForQuery(centerDate),
        windowDays,
        periodStart,
        periodEnd,
        comparisonStart,
        comparisonEnd,
        seasonal,
        detail: emptyDetail,
        topRoutes,
      };

      continentDetailCache.set(cacheKey, {
        expiresAt: Date.now() + CONTINENT_DETAIL_CACHE_TTL_MS,
        payload: partialPayload,
      });

      return partialPayload;
    }

    const [currentCountriesResult, previousCountriesResult] = await Promise.all([
      pool.query(countryQuery, [periodStart, periodEnd, continentAirportCodesParam]),
      pool.query(countryQuery, [comparisonStart, comparisonEnd, continentAirportCodesParam]),
    ]);

    const previousCountryMap = new Map<string, number>();
    for (const row of previousCountriesResult.rows as CountryRankRow[]) {
      const meta = getContinentMeta(row.country_code, row.country_name);
      if (meta.key !== continentMeta.key) {
        continue;
      }
      const key = normalizeCountryKey(row.country_code, row.country_name, row.country_name);
      previousCountryMap.set(key, Number(row.flights) || 0);
    }

    const currentCountryRows = (currentCountriesResult.rows as CountryRankRow[])
      .map((row) => {
        const meta = getContinentMeta(row.country_code, row.country_name);
        if (meta.key !== continentMeta.key) {
          return null;
        }

        const key = normalizeCountryKey(row.country_code, row.country_name, row.country_name);
        const flights = Number(row.flights) || 0;
        const previousFlights = previousCountryMap.get(key) || 0;
        const deltaFlights = flights - previousFlights;
        const deltaPercent = previousFlights > 0
          ? (deltaFlights / previousFlights) * 100
          : flights > 0
            ? 100
            : 0;

        return {
          key,
          countryCode: row.country_code,
          countryName: row.country_name || 'Other',
          airportCount: Number(row.airport_count) || 0,
          flights,
          previousFlights,
          deltaFlights,
          deltaPercent,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter((row) => row.countryName !== 'Other' && row.flights > 0);

    const countryCount = currentCountryRows.length;
    const busiestCountryRow = [...currentCountryRows].sort((a, b) => b.flights - a.flights || b.airportCount - a.airportCount)[0];
    const fastestGrowingRow = [...currentCountryRows].sort((a, b) => b.deltaPercent - a.deltaPercent || b.deltaFlights - a.deltaFlights)[0];
    const maxFlights = Math.max(...currentCountryRows.map((row) => row.flights), 1);

    const countryRows = currentCountryRows
      .map((row) => ({
        flag: countryFlagFromCode(row.countryCode),
        name: row.countryName,
        airports: row.airportCount,
        flights: row.flights,
        delta: `${row.deltaPercent >= 0 ? '+' : ''}${row.deltaPercent.toFixed(1)}%`,
        deltaN: row.deltaFlights,
        bar: Math.round((row.flights / maxFlights) * 100),
        highlight: busiestCountryRow ? row.key === busiestCountryRow.key : false,
      }))
      .sort((a, b) => b.flights - a.flights || b.airports - a.airports || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

    const routePreviousMap = new Map<string, number>();
    const topRoutes: DashboardContinentDetailRoute[] = [];
    if (includeTopRoutes) {
      const [currentRoutesResult, previousRoutesResult] = await Promise.all([
        pool.query(routeQuery, [periodStart, periodEnd, continentAirportCodesParam]),
        pool.query(routeQuery, [comparisonStart, comparisonEnd, continentAirportCodesParam]),
      ]);

      for (const row of previousRoutesResult.rows as Array<Record<string, any>>) {
        const fromCode = (row.from_code || '').trim().toUpperCase();
        const toCode = (row.to_code || '').trim().toUpperCase();
        if (!fromCode || !toCode) {
          continue;
        }
        const key = `${fromCode}__${toCode}`;
        routePreviousMap.set(key, Number(row.flights) || 0);
      }

      const topRouteRows = (currentRoutesResult.rows as Array<Record<string, any>>)
        .map((row) => {
          const fromCountryMeta = getContinentMeta(row.from_country_code, row.from_country_name);
          const toCountryMeta = getContinentMeta(row.to_country_code, row.to_country_name);
          if (fromCountryMeta.key !== continentMeta.key || toCountryMeta.key !== continentMeta.key) {
            return null;
          }

          const fromCode = (row.from_code || '').trim().toUpperCase();
          const toCode = (row.to_code || '').trim().toUpperCase();
          if (!fromCode || !toCode) {
            return null;
          }

          const key = `${fromCode}__${toCode}`;
          const flights = Number(row.flights) || 0;
          const previousFlights = routePreviousMap.get(key) || 0;
          const deltaFlights = flights - previousFlights;
          const deltaPercent = previousFlights > 0
            ? (deltaFlights / previousFlights) * 100
            : flights > 0
              ? 100
              : 0;
          const deltaSign = deltaFlights >= 0 ? '+' : '';
          const deltaArrow = deltaFlights >= 0 ? '▲' : '▼';

          const fromLabel = `${row.from_city || row.from_name || fromCode} ${fromCode}`;
          const toLabel = `${row.to_city || row.to_name || toCode} ${toCode}`;

          return {
            from: fromLabel,
            to: toLabel,
            fromFlag: countryFlagFromCode(row.from_country_code),
            toFlag: countryFlagFromCode(row.to_country_code),
            flights,
            previousFlights,
            deltaFlights,
            deltaPercent,
            yoy: deltaPercent,
            yoyN: deltaFlights,
            mom: deltaPercent,
            momN: deltaFlights,
            wow: deltaPercent,
            wowN: deltaFlights,
            sortText: `${deltaArrow} ${deltaSign}${deltaFlights.toLocaleString()} (${deltaPercent.toFixed(1)}%)`,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .sort((a, b) => b.flights - a.flights || a.from.localeCompare(b.from, 'en', { sensitivity: 'base' }))
        .slice(0, 5)
        .map(({ sortText, ...row }) => row);

      topRoutes.push(...topRouteRows);
    }

    const seasonal: DashboardContinentDetailResponse['seasonal'] = [];
    if (includeSeasonal) {
      const seasonalResult = await pool.query(seasonalQuery, [seasonalStart, seasonalEnd, continentAirportCodesParam]);
      const seasonalBuckets = new Map<string, number>();
      const seasonalCursor = new Date(seasonalStartDate);
      for (let i = 0; i < 12; i += 1) {
        const key = formatDateForQuery(seasonalCursor).slice(0, 7);
        seasonalBuckets.set(key, 0);
        seasonalCursor.setUTCMonth(seasonalCursor.getUTCMonth() + 1);
      }

      for (const row of seasonalResult.rows as Array<{ month: Date | string; country_code: string | null; country_name: string | null; flights: number }>) {
        const meta = getContinentMeta(row.country_code, row.country_name);
        if (meta.key !== continentMeta.key) {
          continue;
        }

        const monthValue = row.month instanceof Date ? row.month : new Date(row.month);
        const monthKey = formatDateForQuery(monthValue).slice(0, 7);
        const current = seasonalBuckets.get(monthKey);
        if (current != null) {
          seasonalBuckets.set(monthKey, current + (Number(row.flights) || 0));
        }
      }

      seasonal.push(...Array.from(seasonalBuckets.entries()).map(([month, flights]) => ({
        month,
        flights,
      })));
    }

    const busiestDelta = busiestCountryRow
      ? `${busiestCountryRow.deltaFlights >= 0 ? '+' : ''}${busiestCountryRow.deltaFlights.toLocaleString()} เที่ยวบิน · ${busiestCountryRow.flights.toLocaleString()} ทั้งหมด`
      : 'ยังไม่มีข้อมูล';
    const fastestDelta = fastestGrowingRow
      ? `${fastestGrowingRow.deltaFlights >= 0 ? '▲' : '▼'} ${fastestGrowingRow.deltaFlights >= 0 ? '+' : ''}${fastestGrowingRow.deltaFlights.toLocaleString()} เที่ยวบิน (${fastestGrowingRow.deltaPercent.toFixed(1)}%)`
      : 'ยังไม่มีข้อมูล';

    const payload = {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      seasonal,
      detail: {
        countryCount: countryCount.toLocaleString(),
        busiestCountry: {
          flag: countryFlagFromCode(busiestCountryRow?.countryCode ?? null),
          nameTh: busiestCountryRow?.countryName || continentMeta.label,
        },
        busiestDelta,
        fastestGrowing: {
          flag: countryFlagFromCode(fastestGrowingRow?.countryCode ?? null),
          nameTh: fastestGrowingRow?.countryName || continentMeta.label,
        },
        fastestDelta,
        countries: countryRows,
      },
      topRoutes,
    };

    continentDetailCache.set(cacheKey, {
      expiresAt: Date.now() + CONTINENT_DETAIL_CACHE_TTL_MS,
      payload,
    });

    return payload;
  }

  static async getContinentTopAirports(
    input: ContinentTopAirportsInput,
  ): Promise<DashboardContinentTopAirportsResponse> {
    const continentMeta = resolveContinentMetaFromInput(input.continent);
    const topLimit = Math.min(Math.max(input.limit ?? 10, 1), 50);
    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);
    const cacheKey = [continentMeta.key, periodStart, periodEnd, comparisonStart, comparisonEnd, `limit:${topLimit}`].join('|');

    const cached = continentTopAirportsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const continentAirportCodes = await getContinentAirportCodes(continentMeta.key);
    if (!continentAirportCodes.length) {
      return {
        centerDate: formatDateForQuery(centerDate),
        windowDays,
        periodStart,
        periodEnd,
        comparisonStart,
        comparisonEnd,
        continent: {
          key: continentMeta.key,
          label: continentMeta.label,
          icon: continentMeta.icon,
        },
        airports: [],
      };
    }

    const topAirportQuery = `
      WITH continent_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS airport_code
        FROM airports
        WHERE UPPER(TRIM(code)) = ANY($3::text[])
      ),
      current_rows AS (
        SELECT dep_airport AS airport_code, 1 AS dep_count, 0 AS arr_count
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code, 0 AS dep_count, 1 AS arr_count
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS airport_code, 1 AS dep_count, 0 AS arr_count
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT arr_airport AS airport_code, 0 AS dep_count, 1 AS arr_count
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      ),
      previous_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $4 AND departure_date <= $5
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $4 AND departure_date <= $5
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $4 AND departure_date <= $5
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $4 AND departure_date <= $5
      ),
      current_agg AS (
        SELECT
          UPPER(TRIM(cr.airport_code)) AS airport_code,
          COUNT(*)::int AS flights,
          SUM(cr.dep_count)::int AS departure_flights,
          SUM(cr.arr_count)::int AS arrival_flights
        FROM current_rows cr
        JOIN continent_airports ca ON UPPER(TRIM(cr.airport_code)) = ca.airport_code
        WHERE cr.airport_code IS NOT NULL AND TRIM(cr.airport_code) <> ''
        GROUP BY UPPER(TRIM(cr.airport_code))
      ),
      previous_agg AS (
        SELECT
          UPPER(TRIM(pr.airport_code)) AS airport_code,
          COUNT(*)::int AS flights
        FROM previous_rows pr
        JOIN continent_airports ca ON UPPER(TRIM(pr.airport_code)) = ca.airport_code
        WHERE pr.airport_code IS NOT NULL AND TRIM(pr.airport_code) <> ''
        GROUP BY UPPER(TRIM(pr.airport_code))
      )
      SELECT
        current_agg.airport_code,
        COALESCE(a.name, a.code, current_agg.airport_code) AS airport_name,
        COALESCE(a.city, a.name, a.code, current_agg.airport_code) AS city,
        COALESCE(a.country_name, a.country, 'Other') AS country_name,
        current_agg.flights,
        current_agg.departure_flights,
        current_agg.arrival_flights,
        COALESCE(previous_agg.flights, 0)::int AS previous_flights
      FROM current_agg
      LEFT JOIN previous_agg ON previous_agg.airport_code = current_agg.airport_code
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = current_agg.airport_code
      ORDER BY current_agg.flights DESC, current_agg.airport_code ASC
      LIMIT $6
    `;

    const topAirportsResult = await pool.query(topAirportQuery, [
      periodStart,
      periodEnd,
      continentAirportCodes,
      comparisonStart,
      comparisonEnd,
      topLimit,
    ]);

    const airports = (topAirportsResult.rows as Array<Record<string, any>>)
      .map((row) => {
        const flights = Number(row.flights) || 0;
        const previousFlights = Number(row.previous_flights) || 0;
        const deltaFlights = flights - previousFlights;
        const deltaPercent = previousFlights > 0
          ? (deltaFlights / previousFlights) * 100
          : flights > 0
            ? 100
            : 0;
        const deltaText = `${deltaFlights >= 0 ? '+' : ''}${deltaFlights.toLocaleString()} flight`;

        return {
          iata: String(row.airport_code || '').trim().toUpperCase(),
          airportName: String(row.airport_name || row.airport_code || '').trim(),
          city: String(row.city || row.airport_name || row.airport_code || '').trim(),
          country: String(row.country_name || 'Other').trim(),
          flights,
          departureFlights: Number(row.departure_flights) || 0,
          arrivalFlights: Number(row.arrival_flights) || 0,
          previousFlights,
          deltaFlights,
          deltaPercent,
          deltaText,
        } satisfies DashboardContinentTopAirportRank;
      })
      .filter((row) => row.iata && row.flights > 0);

    const payload: DashboardContinentTopAirportsResponse = {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      continent: {
        key: continentMeta.key,
        label: continentMeta.label,
        icon: continentMeta.icon,
      },
      airports,
    };

    continentTopAirportsCache.set(cacheKey, {
      expiresAt: Date.now() + CONTINENT_TOP_AIRPORTS_CACHE_TTL_MS,
      payload,
    });

    return payload;
  }

  static async getContinentTopRoutes(
    input: ContinentTopRoutesInput,
  ): Promise<DashboardContinentTopRoutesResponse> {
    const continentMeta = resolveContinentMetaFromInput(input.continent);
    const topLimit = Math.min(Math.max(input.limit ?? 5, 1), 20);
    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);
    const cacheKey = [continentMeta.key, periodStart, periodEnd, comparisonStart, comparisonEnd, `limit:${topLimit}`].join('|');

    const cached = continentTopRoutesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const continentAirportCodes = await getContinentAirportCodes(continentMeta.key);
    if (!continentAirportCodes.length) {
      return {
        centerDate: formatDateForQuery(centerDate),
        windowDays,
        periodStart,
        periodEnd,
        comparisonStart,
        comparisonEnd,
        continent: {
          key: continentMeta.key,
          label: continentMeta.label,
          icon: continentMeta.icon,
        },
        routes: [],
      };
    }

    const topRoutesQuery = `
      WITH continent_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS airport_code
        FROM airports
        WHERE UPPER(TRIM(code)) = ANY($3::text[])
      ),
      current_rows AS (
        SELECT dep_airport AS from_airport, arr_airport AS to_airport
        FROM departure_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
        UNION ALL
        SELECT dep_airport AS from_airport, arr_airport AS to_airport
        FROM arrival_flight_paths
        WHERE departure_date >= $1 AND departure_date <= $2
      ),
      current_agg AS (
        SELECT
          UPPER(TRIM(cr.from_airport)) AS from_code,
          UPPER(TRIM(cr.to_airport)) AS to_code,
          COUNT(*)::int AS flights
        FROM current_rows cr
        JOIN continent_airports from_codes ON UPPER(TRIM(cr.from_airport)) = from_codes.airport_code
        JOIN continent_airports to_codes ON UPPER(TRIM(cr.to_airport)) = to_codes.airport_code
        WHERE cr.from_airport IS NOT NULL AND TRIM(cr.from_airport) <> ''
          AND cr.to_airport IS NOT NULL AND TRIM(cr.to_airport) <> ''
        GROUP BY UPPER(TRIM(cr.from_airport)), UPPER(TRIM(cr.to_airport))
      ),
      top_current AS (
        SELECT from_code, to_code, flights
        FROM current_agg
        ORDER BY flights DESC, from_code ASC, to_code ASC
        LIMIT $6
      ),
      previous_rows AS (
        SELECT dep_airport AS from_airport, arr_airport AS to_airport
        FROM departure_flight_paths
        WHERE departure_date >= $4 AND departure_date <= $5
        UNION ALL
        SELECT dep_airport AS from_airport, arr_airport AS to_airport
        FROM arrival_flight_paths
        WHERE departure_date >= $4 AND departure_date <= $5
      ),
      previous_agg AS (
        SELECT
          UPPER(TRIM(pr.from_airport)) AS from_code,
          UPPER(TRIM(pr.to_airport)) AS to_code,
          COUNT(*)::int AS flights
        FROM previous_rows pr
        JOIN top_current tc
          ON UPPER(TRIM(pr.from_airport)) = tc.from_code
         AND UPPER(TRIM(pr.to_airport)) = tc.to_code
        GROUP BY UPPER(TRIM(pr.from_airport)), UPPER(TRIM(pr.to_airport))
      )
      SELECT
        tc.from_code,
        tc.to_code,
        tc.flights,
        COALESCE(pa.flights, 0)::int AS previous_flights,
        COALESCE(dep.name, dep.code, tc.from_code) AS from_name,
        COALESCE(dep.city, dep.name, dep.code, tc.from_code) AS from_city,
        COALESCE(arr.name, arr.code, tc.to_code) AS to_name,
        COALESCE(arr.city, arr.name, arr.code, tc.to_code) AS to_city
      FROM top_current tc
      LEFT JOIN previous_agg pa
        ON pa.from_code = tc.from_code
       AND pa.to_code = tc.to_code
      LEFT JOIN airports dep ON UPPER(TRIM(dep.code)) = tc.from_code
      LEFT JOIN airports arr ON UPPER(TRIM(arr.code)) = tc.to_code
      ORDER BY tc.flights DESC, tc.from_code ASC, tc.to_code ASC
    `;

    const topRoutesResult = await pool.query(topRoutesQuery, [
      periodStart,
      periodEnd,
      continentAirportCodes,
      comparisonStart,
      comparisonEnd,
      topLimit,
    ]);

    const routes = (topRoutesResult.rows as Array<Record<string, any>>)
      .map((row) => {
        const flights = Number(row.flights) || 0;
        const previousFlights = Number(row.previous_flights) || 0;
        const deltaFlights = flights - previousFlights;
        const deltaPercent = previousFlights > 0
          ? (deltaFlights / previousFlights) * 100
          : flights > 0
            ? 100
            : 0;

        const fromCode = String(row.from_code || '').trim().toUpperCase();
        const toCode = String(row.to_code || '').trim().toUpperCase();
        const fromLabel = `${String(row.from_city || row.from_name || fromCode).trim()} (${fromCode})`;
        const toLabel = `${String(row.to_city || row.to_name || toCode).trim()} (${toCode})`;

        return {
          routeText: `from ${fromLabel} to ${toLabel}`,
          fromAirport: fromLabel,
          toAirport: toLabel,
          flights,
          previousFlights,
          deltaFlights,
          deltaPercent,
          deltaText: `${deltaFlights >= 0 ? '+' : ''}${deltaFlights.toLocaleString()} flight`,
        } satisfies DashboardContinentTopRouteRank;
      })
      .filter((row) => row.flights > 0);

    const payload: DashboardContinentTopRoutesResponse = {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      continent: {
        key: continentMeta.key,
        label: continentMeta.label,
        icon: continentMeta.icon,
      },
      routes,
    };

    continentTopRoutesCache.set(cacheKey, {
      expiresAt: Date.now() + CONTINENT_TOP_ROUTES_CACHE_TTL_MS,
      payload,
    });

    return payload;
  }

  static async getContinentTrendAverages(
    input: ContinentTrendAveragesInput,
  ): Promise<DashboardContinentTrendsResponse> {
    const continentMeta = resolveContinentMetaFromInput(input.continent);
    const cacheKey = `${continentMeta.key}|v4`;

    const cached = continentTrendsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const continentAirportCodes = await getContinentAirportCodes(continentMeta.key);
    if (!continentAirportCodes.length) {
      const emptyPayload: DashboardContinentTrendsResponse = {
        continent: {
          key: continentMeta.key,
          label: continentMeta.label,
          icon: continentMeta.icon,
        },
        generatedAt: new Date().toISOString(),
        modes: {
          day: {
            mode: 'day',
            status: 'unavailable',
            message: 'ข้อมูลยังไม่พร้อมให้บริการ',
            points: [],
          },
          month: {
            mode: 'month',
            status: 'unavailable',
            message: 'ข้อมูลยังไม่พร้อมให้บริการ',
            points: [],
          },
          year: {
            mode: 'year',
            status: 'unavailable',
            message: 'ข้อมูลยังไม่พร้อมให้บริการ',
            points: [],
          },
        },
      };

      continentTrendsCache.set(cacheKey, {
        expiresAt: Date.now() + CONTINENT_TRENDS_CACHE_TTL_MS,
        payload: emptyPayload,
      });

      return emptyPayload;
    }

    const dayAverageQuery = `
      WITH flight_events AS (
        SELECT
          departure_date::date AS flight_date,
          COALESCE(EXTRACT(HOUR FROM departure_time)::int, 0) AS hour_num,
          CASE
            WHEN dep_airport IS NOT NULL
              AND TRIM(dep_airport) <> ''
              AND UPPER(TRIM(dep_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END AS outbound_count,
          CASE
            WHEN arr_airport IS NOT NULL
              AND TRIM(arr_airport) <> ''
              AND UPPER(TRIM(arr_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END AS inbound_count
        FROM departure_flight_paths
        WHERE departure_date IS NOT NULL
          AND (
            (dep_airport IS NOT NULL AND TRIM(dep_airport) <> '' AND UPPER(TRIM(dep_airport)) = ANY($1::text[]))
            OR
            (arr_airport IS NOT NULL AND TRIM(arr_airport) <> '' AND UPPER(TRIM(arr_airport)) = ANY($1::text[]))
          )

        UNION ALL

        SELECT
          departure_date::date AS flight_date,
          COALESCE(EXTRACT(HOUR FROM departure_time)::int, 0) AS hour_num,
          CASE
            WHEN dep_airport IS NOT NULL
              AND TRIM(dep_airport) <> ''
              AND UPPER(TRIM(dep_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END AS outbound_count,
          CASE
            WHEN arr_airport IS NOT NULL
              AND TRIM(arr_airport) <> ''
              AND UPPER(TRIM(arr_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END AS inbound_count
        FROM arrival_flight_paths
        WHERE departure_date IS NOT NULL
          AND (
            (dep_airport IS NOT NULL AND TRIM(dep_airport) <> '' AND UPPER(TRIM(dep_airport)) = ANY($1::text[]))
            OR
            (arr_airport IS NOT NULL AND TRIM(arr_airport) <> '' AND UPPER(TRIM(arr_airport)) = ANY($1::text[]))
          )
      ),
      day_span AS (
        SELECT GREATEST(COUNT(DISTINCT flight_date)::numeric, 1) AS days_count
        FROM flight_events
      ),
      bucketed AS (
        SELECT
          FLOOR(hour_num / 4.0)::int AS bucket_idx,
          SUM(inbound_count)::numeric AS inbound_total,
          SUM(outbound_count)::numeric AS outbound_total
        FROM flight_events
        GROUP BY FLOOR(hour_num / 4.0)::int
      ),
      bucket_grid AS (
        SELECT generate_series(0, 5)::int AS bucket_idx
      )
      SELECT
        LPAD((bg.bucket_idx * 4)::text, 2, '0') || ':00 - ' || LPAD(((bg.bucket_idx + 1) * 4)::text, 2, '0') || ':00' AS hour_bucket,
        ROUND(COALESCE(b.inbound_total, 0) / ds.days_count, 2)::float AS inbound_avg,
        ROUND(COALESCE(b.outbound_total, 0) / ds.days_count, 2)::float AS outbound_avg
      FROM bucket_grid bg
      CROSS JOIN day_span ds
      LEFT JOIN bucketed b ON b.bucket_idx = bg.bucket_idx
      ORDER BY bg.bucket_idx ASC
    `;

    const monthAverageQueryTypedDate = `
      WITH flight_events AS (
        SELECT
          EXTRACT(YEAR FROM departure_date)::int AS year_num,
          EXTRACT(MONTH FROM departure_date)::int AS month_num,
          CASE
            WHEN dep_airport IS NOT NULL
              AND TRIM(dep_airport) <> ''
              AND UPPER(TRIM(dep_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END::numeric AS outbound_total,
          CASE
            WHEN arr_airport IS NOT NULL
              AND TRIM(arr_airport) <> ''
              AND UPPER(TRIM(arr_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END::numeric AS inbound_total
        FROM departure_flight_paths
        WHERE departure_date IS NOT NULL
          AND (
            (dep_airport IS NOT NULL AND TRIM(dep_airport) <> '' AND UPPER(TRIM(dep_airport)) = ANY($1::text[]))
            OR
            (arr_airport IS NOT NULL AND TRIM(arr_airport) <> '' AND UPPER(TRIM(arr_airport)) = ANY($1::text[]))
          )

        UNION ALL

        SELECT
          EXTRACT(YEAR FROM departure_date)::int AS year_num,
          EXTRACT(MONTH FROM departure_date)::int AS month_num,
          CASE
            WHEN dep_airport IS NOT NULL
              AND TRIM(dep_airport) <> ''
              AND UPPER(TRIM(dep_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END::numeric AS outbound_total,
          CASE
            WHEN arr_airport IS NOT NULL
              AND TRIM(arr_airport) <> ''
              AND UPPER(TRIM(arr_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END::numeric AS inbound_total
        FROM arrival_flight_paths
        WHERE departure_date IS NOT NULL
          AND (
            (dep_airport IS NOT NULL AND TRIM(dep_airport) <> '' AND UPPER(TRIM(dep_airport)) = ANY($1::text[]))
            OR
            (arr_airport IS NOT NULL AND TRIM(arr_airport) <> '' AND UPPER(TRIM(arr_airport)) = ANY($1::text[]))
          )
      ),
      monthly_totals AS (
        SELECT
          year_num,
          month_num,
          SUM(inbound_total)::numeric AS inbound_total,
          SUM(outbound_total)::numeric AS outbound_total
        FROM flight_events
        GROUP BY year_num, month_num
      ),
      month_avg AS (
        SELECT
          month_num,
          ROUND(AVG(inbound_total), 2)::float AS inbound_avg,
          ROUND(AVG(outbound_total), 2)::float AS outbound_avg
        FROM monthly_totals
        GROUP BY month_num
      ),
      month_grid AS (
        SELECT generate_series(1, 12)::int AS month_num
      )
      SELECT
        mg.month_num,
        ROUND(COALESCE(ma.inbound_avg, 0), 2)::float AS inbound_avg,
        ROUND(COALESCE(ma.outbound_avg, 0), 2)::float AS outbound_avg
      FROM month_grid mg
      LEFT JOIN month_avg ma ON ma.month_num = mg.month_num
      ORDER BY mg.month_num ASC
    `;

    const monthAverageQueryTextDate = `
      WITH departure_events AS (
        SELECT
          TO_DATE(SUBSTRING(departure_date::text, 1, 10), 'YYYY-MM-DD') AS parsed_date,
          dep_airport,
          arr_airport
        FROM departure_flight_paths
        WHERE departure_date::text ~ '^\\d{4}-\\d{2}-\\d{2}'
      ),
      arrival_events AS (
        SELECT
          TO_DATE(SUBSTRING(departure_date::text, 1, 10), 'YYYY-MM-DD') AS parsed_date,
          dep_airport,
          arr_airport
        FROM arrival_flight_paths
        WHERE departure_date::text ~ '^\\d{4}-\\d{2}-\\d{2}'
      ),
      flight_events AS (
        SELECT
          EXTRACT(YEAR FROM parsed_date)::int AS year_num,
          EXTRACT(MONTH FROM parsed_date)::int AS month_num,
          CASE
            WHEN dep_airport IS NOT NULL
              AND TRIM(dep_airport) <> ''
              AND UPPER(TRIM(dep_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END::numeric AS outbound_total,
          CASE
            WHEN arr_airport IS NOT NULL
              AND TRIM(arr_airport) <> ''
              AND UPPER(TRIM(arr_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END::numeric AS inbound_total
        FROM departure_events
        WHERE
          (dep_airport IS NOT NULL AND TRIM(dep_airport) <> '' AND UPPER(TRIM(dep_airport)) = ANY($1::text[]))
          OR
          (arr_airport IS NOT NULL AND TRIM(arr_airport) <> '' AND UPPER(TRIM(arr_airport)) = ANY($1::text[]))

        UNION ALL

        SELECT
          EXTRACT(YEAR FROM parsed_date)::int AS year_num,
          EXTRACT(MONTH FROM parsed_date)::int AS month_num,
          CASE
            WHEN dep_airport IS NOT NULL
              AND TRIM(dep_airport) <> ''
              AND UPPER(TRIM(dep_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END::numeric AS outbound_total,
          CASE
            WHEN arr_airport IS NOT NULL
              AND TRIM(arr_airport) <> ''
              AND UPPER(TRIM(arr_airport)) = ANY($1::text[])
            THEN 1 ELSE 0
          END::numeric AS inbound_total
        FROM arrival_events
        WHERE
          (dep_airport IS NOT NULL AND TRIM(dep_airport) <> '' AND UPPER(TRIM(dep_airport)) = ANY($1::text[]))
          OR
          (arr_airport IS NOT NULL AND TRIM(arr_airport) <> '' AND UPPER(TRIM(arr_airport)) = ANY($1::text[]))
      ),
      monthly_totals AS (
        SELECT
          year_num,
          month_num,
          SUM(inbound_total)::numeric AS inbound_total,
          SUM(outbound_total)::numeric AS outbound_total
        FROM flight_events
        GROUP BY year_num, month_num
      ),
      month_avg AS (
        SELECT
          month_num,
          ROUND(AVG(inbound_total), 2)::float AS inbound_avg,
          ROUND(AVG(outbound_total), 2)::float AS outbound_avg
        FROM monthly_totals
        GROUP BY month_num
      ),
      month_grid AS (
        SELECT generate_series(1, 12)::int AS month_num
      )
      SELECT
        mg.month_num,
        ROUND(COALESCE(ma.inbound_avg, 0), 2)::float AS inbound_avg,
        ROUND(COALESCE(ma.outbound_avg, 0), 2)::float AS outbound_avg
      FROM month_grid mg
      LEFT JOIN month_avg ma ON ma.month_num = mg.month_num
      ORDER BY mg.month_num ASC
    `;

    const departureTimeAvailable = await hasFlightPathColumn('departure_time');

    let dayRows: Array<Record<string, any>> = [];
    let dayStatus: 'ready' | 'unavailable' = departureTimeAvailable ? 'ready' : 'unavailable';
    let dayMessage: string | null = departureTimeAvailable ? null : 'ข้อมูลยังไม่พร้อมให้บริการ';

    let monthRows: Array<Record<string, any>> = [];
    const monthStatus: 'ready' | 'unavailable' = 'unavailable';
    const monthMessage: string | null = 'ข้อมูลยังไม่พร้อมให้บริการ';

    if (departureTimeAvailable) {
      try {
        const dayResult = await pool.query(dayAverageQuery, [continentAirportCodes]);
        dayRows = dayResult.rows as Array<Record<string, any>>;
      } catch {
        dayStatus = 'unavailable';
        dayMessage = 'ข้อมูลยังไม่พร้อมให้บริการ';
      }
    }

    const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const dayPointsRaw = dayRows.map((row) => {
      const inboundAvg = Number(row.inbound_avg) || 0;
      const outboundAvg = Number(row.outbound_avg) || 0;
      return {
        key: String(row.hour_bucket || '00:00'),
        label: String(row.hour_bucket || '00:00'),
        inboundAvg,
        outboundAvg,
        totalAvg: inboundAvg + outboundAvg,
        highlight: false,
      } satisfies DashboardContinentTrendPoint;
    });
    const dayMax = Math.max(...dayPointsRaw.map((point) => point.totalAvg), 0);
    const dayPoints = dayPointsRaw.map((point) => ({
      ...point,
      highlight: dayMax > 0 && point.totalAvg === dayMax,
    }));

    const monthPointsRaw = monthRows.map((row) => {
      const monthNum = Number(row.month_num) || 1;
      const inboundAvg = Number(row.inbound_avg) || 0;
      const outboundAvg = Number(row.outbound_avg) || 0;
      return {
        key: String(monthNum),
        label: monthLabels[Math.max(0, Math.min(11, monthNum - 1))] || String(monthNum),
        inboundAvg,
        outboundAvg,
        totalAvg: inboundAvg + outboundAvg,
        highlight: false,
      } satisfies DashboardContinentTrendPoint;
    });
    const monthMax = Math.max(...monthPointsRaw.map((point) => point.totalAvg), 0);
    const monthPoints = monthPointsRaw.map((point) => ({
      ...point,
      highlight: monthMax > 0 && point.totalAvg === monthMax,
    }));

    const payload: DashboardContinentTrendsResponse = {
      continent: {
        key: continentMeta.key,
        label: continentMeta.label,
        icon: continentMeta.icon,
      },
      generatedAt: new Date().toISOString(),
      modes: {
        day: {
          mode: 'day',
          status: dayStatus,
          message: dayMessage,
          points: dayStatus === 'ready' ? dayPoints : [],
        },
        month: {
          mode: 'month',
          status: monthStatus,
          message: monthMessage,
          points: [],
        },
        year: {
          mode: 'year',
          status: 'unavailable',
          message: 'ข้อมูลยังไม่พร้อมให้บริการ',
          points: [],
        },
      },
    };

    continentTrendsCache.set(cacheKey, {
      expiresAt: Date.now() + CONTINENT_TRENDS_CACHE_TTL_MS,
      payload,
    });

    return payload;
  }
}
