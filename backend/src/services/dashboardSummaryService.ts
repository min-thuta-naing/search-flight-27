import { pool } from '../config/database';
import { getContinentMeta, getContinentMetaFromKey, type ContinentMeta } from '../utils/continentMapper';

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
  continentKey: string;
  continentLabel: string;
  continentIcon: string;
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
  continentKey: string;
  continentLabel: string;
  continentIcon: string;
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

export interface DashboardCountryAirportBreakdown {
  iata: string;
  name: string;
  flights: number;
  routes: number;
  airlines: number;
}

export interface DashboardCountryInboundBreakdown {
  flag: string;
  name: string;
  flights: number;
  pct: number;
}

export interface DashboardCountryAirlineBreakdown {
  airlineId: number;
  name: string;
  flights: number;
  share: number;
  delta: number;
}

export interface DashboardAirportOverviewResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  airport: {
    code: string;
    name: string;
    city: string | null;
    country: string | null;
    countryCode: string | null;
  };
  totals: {
    flights: number;
    previousFlights: number;
    deltaFlights: number;
    deltaPercent: number;
    daysInPeriod: number;
  };
  topDestination: {
    iata: string;
    name: string;
    city: string;
    country: string;
    flag: string;
    flights: number;
  } | null;
  topAirline: {
    id: number;
    name: string;
    flights: number;
    sharePercent: number;
  } | null;
  busiestDepartureHour: {
    hour: number;
    flights: number;
  };
}

export interface DashboardAirportTrendDailyPoint {
  date: string;
  departureFlights: number;
  arrivalFlights: number;
  flights: number;
  cancelledFlights: number;
  deltaPercent: number | null;
}

export interface DashboardAirportTrendsResponse {
  centerDate: string;
  airport: {
    code: string;
    name: string;
    city: string | null;
    country: string | null;
    countryCode: string | null;
  };
  daily: DashboardAirportTrendDailyPoint[];
  monthly: Array<{
    month: number;
    departureFlights: number;
    arrivalFlights: number;
    flights: number;
    cancelledFlights: number;
  }>;
}

export interface DashboardAirportInsightRoute {
  iata: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  flights: number;
}

export interface DashboardAirportInsightAirline {
  id: number;
  name: string;
  flights: number;
  sharePercent: number;
}

export interface DashboardAirportInsightsResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  airport: {
    code: string;
    name: string;
    city: string | null;
    country: string | null;
    countryCode: string | null;
  };
  topDepartureRoutes: DashboardAirportInsightRoute[];
  topArrivalRoutes: DashboardAirportInsightRoute[];
  airlineShare: DashboardAirportInsightAirline[];
  hourlyDistribution: {
    departure: number[];
    arrival: number[];
  };
}

export interface DashboardCountryOverviewResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  country: {
    name: string;
    code: string | null;
  };
  totals: {
    flights: number;
    previousFlights: number;
    deltaFlights: number;
    deltaPercent: number;
  };
  airports: DashboardCountryAirportBreakdown[];
  inbound: DashboardCountryInboundBreakdown[];
  airlineMarket: DashboardCountryAirlineBreakdown[];
  topAirline: {
    name: string;
    sharePercent: number | null;
  };
}

export interface DashboardCountryFlowMapPoint {
  countryCode: string | null;
  countryName: string;
  flag: string;
  latitude: number | null;
  longitude: number | null;
  airportCount: number;
  flights: number;
  previousFlights: number;
  deltaFlights: number;
  deltaPercent: number;
  pct: number;
}

export interface DashboardCountryFlowMapDirection {
  totalFlights: number;
  previousFlights: number;
  points: DashboardCountryFlowMapPoint[];
}

export interface DashboardCountryFlowMapResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  country: {
    name: string;
    code: string | null;
    airportCount: number;
    latitude: number | null;
    longitude: number | null;
  };
  inbound: DashboardCountryFlowMapDirection;
  outbound: DashboardCountryFlowMapDirection;
}
export interface DashboardDataBoundsResponse {
  minDate: string | null;
  maxDate: string | null;
  recommendedEndDate: string;
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
    totalFlights: number;
    totalDeltaFlights: number;
    totalDeltaPercent: number;
    totalDeltaText: string;
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

interface CountryOverviewInput extends WorldRangeInput {
  country: string;
}

interface AirportOverviewInput extends WorldRangeInput {
  airportCode: string;
}

interface AirportInsightsInput extends WorldRangeInput {
  airportCode: string;
  routeLimit?: number;
  airlineLimit?: number;
}

interface AirportTrendsInput extends WorldRangeInput {
  airportCode: string;
}

const CONTINENT_ORDER: string[] = [
  'Europe',
  'Asia',
  'North America',
  'South America',
  'Africa',
  'Middle East',
  'Oceania',
  'Caribbean',
  'Central America',
  'Other',
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

export function getDashboardMemoryCacheStats() {
  return {
    continentDetail: continentDetailCache.size,
    continentTopAirports: continentTopAirportsCache.size,
    continentTopRoutes: continentTopRoutesCache.size,
    continentTrends: continentTrendsCache.size,
    continentAirportCodes: continentAirportCodesCache.size,
    flightPathColumns: flightPathColumnCache.size,
    flightPathColumnTypes: flightPathColumnTypesCache.size,
  };
}

export async function getAirportCodesForContinent(continentInput: string): Promise<string[]> {
  const meta = resolveContinentMetaFromInput(continentInput);
  return getContinentAirportCodes(meta.key);
}

export function clearDashboardMemoryCache() {
  const cleared = {
    continentDetail: continentDetailCache.size,
    continentTopAirports: continentTopAirportsCache.size,
    continentTopRoutes: continentTopRoutesCache.size,
    continentTrends: continentTrendsCache.size,
    continentAirportCodes: continentAirportCodesCache.size,
    flightPathColumns: flightPathColumnCache.size,
    flightPathColumnTypes: flightPathColumnTypesCache.size,
  };

  continentDetailCache.clear();
  continentTopAirportsCache.clear();
  continentTopRoutesCache.clear();
  continentTrendsCache.clear();
  continentAirportCodesCache.clear();
  flightPathColumnCache.clear();
  flightPathColumnTypesCache.clear();

  return {
    ...cleared,
    totalCleared: Object.values(cleared).reduce((sum, count) => sum + count, 0),
  };
}

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

  for (const key of CONTINENT_ORDER) {
    const meta = getContinentMetaFromKey(key);
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

  return Array.from(grouped.values())
    .filter((row) => row.flights > 0 || row.key === 'Other')
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

function buildCountryFlowMapDirectionQuery(direction: 'inbound' | 'outbound') {
  const counterpartAirportColumn = direction === 'inbound' ? 'dep_airport' : 'arr_airport';
  const selectedAirportColumn = direction === 'inbound' ? 'arr_airport' : 'dep_airport';

  return `
    WITH country_airports AS (
      SELECT DISTINCT UPPER(TRIM(code)) AS code
      FROM airports
      WHERE code IS NOT NULL
        AND TRIM(code) <> ''
        AND (
          UPPER(TRIM(country_code)) = $1
          OR UPPER(TRIM(country)) = $1
          OR TRIM(country_name) ILIKE $2
        )
    ),
    country_centroids AS (
      SELECT
        COALESCE(country_code, country_name, country, 'Other') AS country_key,
        COALESCE(country_code, country, NULL) AS country_code,
        COALESCE(country_name, country, 'Other') AS country_name,
        AVG(latitude)::float AS latitude,
        AVG(longitude)::float AS longitude,
        COUNT(*)::int AS airport_count
      FROM airports
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
      GROUP BY
        COALESCE(country_code, country_name, country, 'Other'),
        COALESCE(country_code, country, NULL),
        COALESCE(country_name, country, 'Other')
    ),
    current_rows AS (
      SELECT ${counterpartAirportColumn} AS counterpart_airport
      FROM departure_flight_paths
      WHERE departure_date >= $3 AND departure_date <= $4
        AND ${selectedAirportColumn} IN (SELECT code FROM country_airports)
        AND ${counterpartAirportColumn} NOT IN (SELECT code FROM country_airports)
      UNION ALL
      SELECT ${counterpartAirportColumn} AS counterpart_airport
      FROM arrival_flight_paths
      WHERE departure_date >= $3 AND departure_date <= $4
        AND ${selectedAirportColumn} IN (SELECT code FROM country_airports)
        AND ${counterpartAirportColumn} NOT IN (SELECT code FROM country_airports)
    ),
    previous_rows AS (
      SELECT ${counterpartAirportColumn} AS counterpart_airport
      FROM departure_flight_paths
      WHERE departure_date >= $5 AND departure_date <= $6
        AND ${selectedAirportColumn} IN (SELECT code FROM country_airports)
        AND ${counterpartAirportColumn} NOT IN (SELECT code FROM country_airports)
      UNION ALL
      SELECT ${counterpartAirportColumn} AS counterpart_airport
      FROM arrival_flight_paths
      WHERE departure_date >= $5 AND departure_date <= $6
        AND ${selectedAirportColumn} IN (SELECT code FROM country_airports)
        AND ${counterpartAirportColumn} NOT IN (SELECT code FROM country_airports)
    ),
    current_agg AS (
      SELECT
        COALESCE(a.country_code, a.country_name, a.country, 'Other') AS country_key,
        COALESCE(a.country_code, a.country, NULL) AS country_code,
        COALESCE(a.country_name, a.country, 'Other') AS country_name,
        COUNT(*)::int AS flights
      FROM current_rows cr
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(cr.counterpart_airport))
      WHERE cr.counterpart_airport IS NOT NULL AND TRIM(cr.counterpart_airport) <> ''
      GROUP BY
        COALESCE(a.country_code, a.country_name, a.country, 'Other'),
        COALESCE(a.country_code, a.country, NULL),
        COALESCE(a.country_name, a.country, 'Other')
    ),
    previous_agg AS (
      SELECT
        COALESCE(a.country_code, a.country_name, a.country, 'Other') AS country_key,
        COUNT(*)::int AS flights
      FROM previous_rows cr
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(cr.counterpart_airport))
      WHERE cr.counterpart_airport IS NOT NULL AND TRIM(cr.counterpart_airport) <> ''
      GROUP BY COALESCE(a.country_code, a.country_name, a.country, 'Other')
    )
    SELECT
      c.country_code,
      c.country_name,
      cc.latitude,
      cc.longitude,
      cc.airport_count,
      c.flights,
      COALESCE(p.flights, 0)::int AS previous_flights
    FROM current_agg c
    LEFT JOIN previous_agg p ON p.country_key = c.country_key
    LEFT JOIN country_centroids cc ON cc.country_key = c.country_key
    WHERE c.country_name <> 'Other'
    ORDER BY c.flights DESC, c.country_name ASC
    LIMIT 20
  `;
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
  const input = continentInput.trim();
  const normalized = input.toLowerCase();
  const aliases: Record<string, string> = {
    'เอเชีย': 'Asia',
    'asia-pacific': 'Asia',
    'อเมริกาเหนือ': 'North America',
    'อเมริกาใต้': 'South America',
    'แอฟริกา': 'Africa',
    'ยุโรป': 'Europe',
    'ตะวันออกกลาง': 'Middle East',
    'โอเชียเนีย': 'Oceania',
    'แคริบเบียน': 'Caribbean',
    'อเมริกากลาง': 'Central America',
    'อื่นๆ': 'Other',
    other: 'Other',
  };

  return getContinentMetaFromKey(aliases[input] || aliases[normalized] || input || 'Other');
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

  for (const key of CONTINENT_ORDER) {
    const meta = getContinentMetaFromKey(key);
    grouped.set(meta.key, {
      airportCount: 0,
      countryKeys: new Set<string>(),
      meta,
    });
  }

  for (const row of rows) {
    const meta = getContinentMeta(row.country_code, row.country_name || row.country);
    const existing = grouped.get(meta.key) || {
      airportCount: 0,
      countryKeys: new Set<string>(),
      meta,
    };

    existing.airportCount += 1;
    existing.countryKeys.add(normalizeCountryKey(row.country_code, row.country_name, row.country));
    grouped.set(meta.key, existing);
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

  for (const key of CONTINENT_ORDER) {
    const meta = getContinentMetaFromKey(key);
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
    const existing = grouped.get(meta.key) || {
      routeIds: new Set<string>(),
      meta,
    };

    existing.routeIds.add(routeId);
    grouped.set(meta.key, existing);
  }

  return grouped;
}

function formatDeltaLine(deltaFlights: number, deltaPercent: number) {
  const deltaSign = deltaFlights >= 0 ? '+' : '';
  const pctSign = deltaPercent >= 0 ? '+' : '';
  return `${deltaFlights >= 0 ? '▲' : '▼'} ${deltaSign}${deltaFlights.toLocaleString()} (${pctSign}${deltaPercent.toFixed(1)}%)`;
}

export class DashboardSummaryService {
  static async getDashboardDataBounds(): Promise<DashboardDataBoundsResponse> {
    const boundsQuery = `
      WITH all_bounds AS (
        SELECT MIN(departure_date::date) AS min_date, MAX(departure_date::date) AS max_date
        FROM departure_flight_paths
        UNION ALL
        SELECT MIN(departure_date::date) AS min_date, MAX(departure_date::date) AS max_date
        FROM arrival_flight_paths
      )
      SELECT
        MIN(min_date)::date AS min_date,
        MAX(max_date)::date AS max_date
      FROM all_bounds
    `;

    const { rows } = await pool.query<{ min_date: Date | string | null; max_date: Date | string | null }>(boundsQuery);
    const row = rows[0] ?? { min_date: null, max_date: null };

    const today = new Date();
    const recommendedEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    recommendedEnd.setUTCDate(recommendedEnd.getUTCDate() + 365);

    return {
      minDate: row.min_date ? formatDateForQuery(new Date(row.min_date)) : null,
      maxDate: row.max_date ? formatDateForQuery(new Date(row.max_date)) : null,
      recommendedEndDate: formatDateForQuery(recommendedEnd),
    };
  }

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

    const topCountriesQuery = `
      WITH current_rows AS (
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
      ),
      current_agg AS (
        SELECT
          a.country_code AS country_code,
          COALESCE(a.country_name, a.country, a.code, 'Other') AS country_name,
          COUNT(*)::int AS flights,
          COUNT(DISTINCT a.code)::int AS airport_count
        FROM current_rows
        LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(current_rows.airport_code))
        GROUP BY a.country_code, COALESCE(a.country_name, a.country, a.code, 'Other')
      ),
      top_current AS (
        SELECT country_code, country_name, flights, airport_count
        FROM current_agg
        WHERE country_name <> 'Other' AND flights > 0
        ORDER BY flights DESC, airport_count DESC, country_name ASC
        LIMIT 5
      ),
      previous_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
      ),
      previous_agg AS (
        SELECT
          a.country_code AS country_code,
          COALESCE(a.country_name, a.country, a.code, 'Other') AS country_name,
          COUNT(*)::int AS flights
        FROM previous_rows
        LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(previous_rows.airport_code))
        GROUP BY a.country_code, COALESCE(a.country_name, a.country, a.code, 'Other')
      )
      SELECT
        tc.country_code,
        tc.country_name,
        tc.airport_count,
        tc.flights,
        COALESCE(pa.flights, 0)::int AS previous_flights
      FROM top_current tc
      LEFT JOIN previous_agg pa
        ON pa.country_name = tc.country_name
       AND pa.country_code IS NOT DISTINCT FROM tc.country_code
      ORDER BY tc.flights DESC, tc.airport_count DESC, tc.country_name ASC
    `;

    const topAirportsQuery = `
      WITH current_rows AS (
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
      ),
      current_agg AS (
        SELECT
          UPPER(TRIM(a.code)) AS airport_code,
          COALESCE(a.name, a.code) AS airport_name,
          COALESCE(a.city, a.name, a.code) AS city,
          COALESCE(a.country_name, a.country, 'Other') AS country_name,
          COALESCE(a.country_code, a.country, NULL) AS country_code,
          COUNT(*)::int AS flights
        FROM current_rows
        LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(current_rows.airport_code))
        WHERE a.code IS NOT NULL
        GROUP BY
          UPPER(TRIM(a.code)),
          COALESCE(a.name, a.code),
          COALESCE(a.city, a.name, a.code),
          COALESCE(a.country_name, a.country, 'Other'),
          COALESCE(a.country_code, a.country, NULL)
      ),
      top_current AS (
        SELECT airport_code, airport_name, city, country_name, country_code, flights
        FROM current_agg
        WHERE airport_code <> '' AND country_name <> 'Other' AND flights > 0
        ORDER BY flights DESC, airport_code ASC
        LIMIT 5
      ),
      previous_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
      ),
      previous_agg AS (
        SELECT
          UPPER(TRIM(a.code)) AS airport_code,
          COUNT(*)::int AS flights
        FROM previous_rows
        LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(previous_rows.airport_code))
        WHERE a.code IS NOT NULL
        GROUP BY UPPER(TRIM(a.code))
      )
      SELECT
        tc.airport_code,
        tc.airport_name,
        tc.city,
        tc.country_name,
        tc.country_code,
        tc.flights,
        COALESCE(pa.flights, 0)::int AS previous_flights
      FROM top_current tc
      LEFT JOIN previous_agg pa ON pa.airport_code = tc.airport_code
      ORDER BY tc.flights DESC, tc.airport_code ASC
    `;

    const [countriesResult, airportsResult] = await Promise.all([
      pool.query(topCountriesQuery, [periodStart, periodEnd, comparisonStart, comparisonEnd]),
      pool.query(topAirportsQuery, [periodStart, periodEnd, comparisonStart, comparisonEnd]),
    ]);

    const countries = (countriesResult.rows as Array<{ country_code: string | null; country_name: string | null; airport_count: number; flights: number; previous_flights: number }>)
      .map((row) => {
        const flights = Number(row.flights) || 0;
        const previousFlights = Number(row.previous_flights) || 0;
        const deltaFlights = flights - previousFlights;
        const deltaPercent = previousFlights > 0
          ? (deltaFlights / previousFlights) * 100
          : flights > 0
            ? 100
            : 0;
        const continentMeta = getContinentMeta(row.country_code, row.country_name);

        return {
          countryCode: row.country_code,
          name: row.country_name || 'Other',
          continentKey: continentMeta.key,
          continentLabel: continentMeta.label,
          continentIcon: continentMeta.icon,
          airportCount: Number(row.airport_count) || 0,
          flights,
          previousFlights,
          deltaFlights,
          deltaPercent,
        } satisfies DashboardTopCountryRank;
      })
      .filter((row) => row.name !== 'Other' && row.flights > 0);

    const airports = (airportsResult.rows as Array<{ airport_code: string | null; airport_name: string | null; city: string | null; country_name: string | null; country_code: string | null; flights: number; previous_flights: number }>)
      .map((row) => {
        const iata = (row.airport_code || '').trim().toUpperCase();
        const flights = Number(row.flights) || 0;
        const previousFlights = Number(row.previous_flights) || 0;
        const deltaFlights = flights - previousFlights;
        const deltaPercent = previousFlights > 0
          ? (deltaFlights / previousFlights) * 100
          : flights > 0
            ? 100
            : 0;
        const continentMeta = getContinentMeta(row.country_code, row.country_name);

        return {
          iata,
          airportName: row.airport_name || iata,
          city: row.city || row.airport_name || iata,
          country: row.country_name || row.country_code || 'Other',
          continentKey: continentMeta.key,
          continentLabel: continentMeta.label,
          continentIcon: continentMeta.icon,
          flights,
          previousFlights,
          deltaFlights,
          deltaPercent,
        } satisfies DashboardTopAirportRank;
      })
      .filter((row) => row.iata && row.country !== 'Other' && row.flights > 0);

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
        const continentMeta = getContinentMeta(row.country_code, row.country_name);

        return {
          countryCode: row.country_code,
          name: row.country_name || 'Other',
          continentKey: continentMeta.key,
          continentLabel: continentMeta.label,
          continentIcon: continentMeta.icon,
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
        const continentMeta = getContinentMeta(row.country_code, row.country_name);

        return {
          iata,
          airportName: row.airport_name || iata,
          city: row.city || row.airport_name || iata,
          country: row.country_name || row.country_code || 'Other',
          continentKey: continentMeta.key,
          continentLabel: continentMeta.label,
          continentIcon: continentMeta.icon,
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

    const buildTopDestinationQuery = (column: 'dep_airport' | 'arr_airport') => `
      WITH current_rows AS (
        SELECT ${column} AS airport_code
        FROM ${column === 'dep_airport' ? 'departure_flight_paths' : 'arrival_flight_paths'}
        WHERE departure_date >= $1 AND departure_date <= $2
      ),
      current_agg AS (
        SELECT
          UPPER(TRIM(a.code)) AS airport_code,
          COALESCE(a.name, a.code) AS airport_name,
          COALESCE(a.city, a.name, a.code) AS city,
          COALESCE(a.country_name, a.country, 'Other') AS country_name,
          COALESCE(a.country_code, a.country, NULL) AS country_code,
          COUNT(*)::int AS flights
        FROM current_rows
        LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(current_rows.airport_code))
        WHERE a.code IS NOT NULL
        GROUP BY
          UPPER(TRIM(a.code)),
          COALESCE(a.name, a.code),
          COALESCE(a.city, a.name, a.code),
          COALESCE(a.country_name, a.country, 'Other'),
          COALESCE(a.country_code, a.country, NULL)
      ),
      top_current AS (
        SELECT airport_code, airport_name, city, country_name, country_code, flights
        FROM current_agg
        WHERE airport_code <> '' AND country_name <> 'Other' AND flights > 0
        ORDER BY flights DESC, airport_code ASC
        LIMIT 5
      ),
      previous_rows AS (
        SELECT ${column} AS airport_code
        FROM ${column === 'dep_airport' ? 'departure_flight_paths' : 'arrival_flight_paths'}
        WHERE departure_date >= $3 AND departure_date <= $4
      ),
      previous_agg AS (
        SELECT
          UPPER(TRIM(a.code)) AS airport_code,
          COUNT(*)::int AS flights
        FROM previous_rows
        LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(previous_rows.airport_code))
        WHERE a.code IS NOT NULL
        GROUP BY UPPER(TRIM(a.code))
      )
      SELECT
        tc.airport_code,
        tc.airport_name,
        tc.city,
        tc.country_name,
        tc.country_code,
        tc.flights,
        COALESCE(pa.flights, 0)::int AS previous_flights
      FROM top_current tc
      LEFT JOIN previous_agg pa ON pa.airport_code = tc.airport_code
      ORDER BY tc.flights DESC, tc.airport_code ASC
    `;

    const [departuresResult, arrivalsResult] = await Promise.all([
      pool.query(buildTopDestinationQuery('dep_airport'), [periodStart, periodEnd, comparisonStart, comparisonEnd]),
      pool.query(buildTopDestinationQuery('arr_airport'), [periodStart, periodEnd, comparisonStart, comparisonEnd]),
    ]);

    const buildRows = (rows: Array<{
      airport_code: string | null;
      airport_name: string | null;
      city: string | null;
      country_name: string | null;
      country_code: string | null;
      flights: number;
      previous_flights: number;
    }>) => {
      return rows
        .map((row) => {
          const iata = (row.airport_code || '').trim().toUpperCase();
          const flights = Number(row.flights) || 0;
          const previousFlights = Number(row.previous_flights) || 0;
          const deltaFlights = flights - previousFlights;
          const deltaPercent = previousFlights > 0
            ? (deltaFlights / previousFlights) * 100
            : flights > 0
              ? 100
              : 0;
          const continentMeta = getContinentMeta(row.country_code, row.country_name);

          return {
            iata,
            airportName: row.airport_name || iata,
            city: row.city || row.airport_name || iata,
            country: row.country_name || row.country_code || 'Other',
            continentKey: continentMeta.key,
            continentLabel: continentMeta.label,
            continentIcon: continentMeta.icon,
            flights,
            previousFlights,
            deltaFlights,
            deltaPercent,
          } satisfies DashboardTopAirportRank;
        })
        .filter((row) => row.iata && row.country !== 'Other' && row.flights > 0);
    };

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      departures: buildRows(departuresResult.rows as Array<{ airport_code: string | null; airport_name: string | null; city: string | null; country_name: string | null; country_code: string | null; flights: number; previous_flights: number }>),
      arrivals: buildRows(arrivalsResult.rows as Array<{ airport_code: string | null; airport_name: string | null; city: string | null; country_name: string | null; country_code: string | null; flights: number; previous_flights: number }>),
    };
  }

  static async getAirportOverview(
    input: AirportOverviewInput,
  ): Promise<DashboardAirportOverviewResponse> {
    const airportCode = (input.airportCode || '').trim().toUpperCase();
    if (!airportCode) {
      throw new Error('airportCode is required');
    }

    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);
    const daysInPeriod = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);

    const scopeQuery = `
      WITH current_departures AS (
        SELECT 1 AS hit
        FROM departure_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND UPPER(TRIM(dep_airport)) = $1
        UNION ALL
        SELECT 1 AS hit
        FROM arrival_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND UPPER(TRIM(dep_airport)) = $1
      ),
      current_arrivals AS (
        SELECT 1 AS hit
        FROM departure_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND UPPER(TRIM(arr_airport)) = $1
        UNION ALL
        SELECT 1 AS hit
        FROM arrival_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND UPPER(TRIM(arr_airport)) = $1
      ),
      previous_departures AS (
        SELECT 1 AS hit
        FROM departure_flight_paths
        WHERE departure_date >= $4 AND departure_date <= $5
          AND UPPER(TRIM(dep_airport)) = $1
        UNION ALL
        SELECT 1 AS hit
        FROM arrival_flight_paths
        WHERE departure_date >= $4 AND departure_date <= $5
          AND UPPER(TRIM(dep_airport)) = $1
      ),
      previous_arrivals AS (
        SELECT 1 AS hit
        FROM departure_flight_paths
        WHERE departure_date >= $4 AND departure_date <= $5
          AND UPPER(TRIM(arr_airport)) = $1
        UNION ALL
        SELECT 1 AS hit
        FROM arrival_flight_paths
        WHERE departure_date >= $4 AND departure_date <= $5
          AND UPPER(TRIM(arr_airport)) = $1
      )
      SELECT
        (
          (SELECT COUNT(*)::int FROM current_departures)
          +
          (SELECT COUNT(*)::int FROM current_arrivals)
        ) AS current_flights,
        (
          (SELECT COUNT(*)::int FROM previous_departures)
          +
          (SELECT COUNT(*)::int FROM previous_arrivals)
        ) AS previous_flights
    `;

    const topDestinationQuery = `
      WITH outbound_rows AS (
        SELECT UPPER(TRIM(arr_airport)) AS destination_airport
        FROM departure_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND UPPER(TRIM(dep_airport)) = $1
        UNION ALL
        SELECT UPPER(TRIM(arr_airport)) AS destination_airport
        FROM arrival_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND UPPER(TRIM(dep_airport)) = $1
      ),
      destination_agg AS (
        SELECT destination_airport, COUNT(*)::int AS flights
        FROM outbound_rows
        WHERE destination_airport IS NOT NULL AND destination_airport <> ''
        GROUP BY destination_airport
      )
      SELECT
        da.destination_airport,
        da.flights,
        COALESCE(a.name, da.destination_airport) AS airport_name,
        COALESCE(a.city, a.name, da.destination_airport) AS city,
        COALESCE(a.country_name, a.country, 'Other') AS country_name,
        COALESCE(a.country_code, a.country, NULL) AS country_code
      FROM destination_agg da
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = da.destination_airport
      ORDER BY da.flights DESC, da.destination_airport ASC
      LIMIT 1
    `;

    const topAirlineQuery = `
      WITH airport_rows AS (
        SELECT airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND (
            UPPER(TRIM(dep_airport)) = $1
            OR UPPER(TRIM(arr_airport)) = $1
          )
        UNION ALL
        SELECT airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND (
            UPPER(TRIM(dep_airport)) = $1
            OR UPPER(TRIM(arr_airport)) = $1
          )
      ),
      airline_agg AS (
        SELECT airline_id, COUNT(*)::int AS flights
        FROM airport_rows
        WHERE airline_id IS NOT NULL
        GROUP BY airline_id
      ),
      totals AS (
        SELECT COALESCE(SUM(flights), 0)::int AS total_flights
        FROM airline_agg
      )
      SELECT
        aa.airline_id,
        aa.flights,
        COALESCE(al.name, CONCAT('Airline #', aa.airline_id::text)) AS airline_name,
        CASE
          WHEN totals.total_flights > 0 THEN (aa.flights::numeric / totals.total_flights::numeric) * 100
          ELSE 0
        END AS share_percent
      FROM airline_agg aa
      LEFT JOIN airlines al ON al.id = aa.airline_id
      CROSS JOIN totals
      ORDER BY aa.flights DESC, aa.airline_id ASC
      LIMIT 1
    `;

    const departureTimeAvailable = await hasFlightPathColumn('departure_time');
    const busiestHourQuery = departureTimeAvailable
      ? `
          WITH outbound_rows AS (
            SELECT COALESCE(EXTRACT(HOUR FROM departure_time)::int, 0) AS hour_num
            FROM departure_flight_paths
            WHERE departure_date >= $2 AND departure_date <= $3
              AND UPPER(TRIM(dep_airport)) = $1
            UNION ALL
            SELECT COALESCE(EXTRACT(HOUR FROM departure_time)::int, 0) AS hour_num
            FROM arrival_flight_paths
            WHERE departure_date >= $2 AND departure_date <= $3
              AND UPPER(TRIM(dep_airport)) = $1
          )
          SELECT hour_num, COUNT(*)::int AS flights
          FROM outbound_rows
          GROUP BY hour_num
          ORDER BY COUNT(*) DESC, hour_num ASC
          LIMIT 1
        `
      : null;

    const airportMetaQuery = `
      SELECT
        UPPER(TRIM(code)) AS airport_code,
        COALESCE(name, UPPER(TRIM(code))) AS airport_name,
        city,
        COALESCE(country_name, country, NULL) AS country_name,
        COALESCE(country_code, country, NULL) AS country_code
      FROM airports
      WHERE UPPER(TRIM(code)) = $1
      LIMIT 1
    `;

    const [scopeResult, topDestinationResult, topAirlineResult, airportMetaResult, busiestHourResult] = await Promise.all([
      pool.query(scopeQuery, [airportCode, periodStart, periodEnd, comparisonStart, comparisonEnd]),
      pool.query(topDestinationQuery, [airportCode, periodStart, periodEnd]),
      pool.query(topAirlineQuery, [airportCode, periodStart, periodEnd]),
      pool.query(airportMetaQuery, [airportCode]),
      busiestHourQuery ? pool.query(busiestHourQuery, [airportCode, periodStart, periodEnd]) : Promise.resolve({ rows: [] } as any),
    ]);

    const scopeRow = (scopeResult.rows[0] || {}) as {
      current_flights?: number;
      previous_flights?: number;
    };

    const currentFlights = Number(scopeRow.current_flights) || 0;
    const previousFlights = Number(scopeRow.previous_flights) || 0;
    const deltaFlights = currentFlights - previousFlights;
    const deltaPercent = previousFlights > 0
      ? (deltaFlights / previousFlights) * 100
      : currentFlights > 0
        ? 100
        : 0;

    const airportMetaRow = (airportMetaResult.rows[0] || {}) as {
      airport_code?: string | null;
      airport_name?: string | null;
      city?: string | null;
      country_name?: string | null;
      country_code?: string | null;
    };

    const topDestinationRow = (topDestinationResult.rows[0] || null) as {
      destination_airport?: string | null;
      flights?: number;
      airport_name?: string | null;
      city?: string | null;
      country_name?: string | null;
      country_code?: string | null;
    } | null;

    const topAirlineRow = (topAirlineResult.rows[0] || null) as {
      airline_id?: number;
      airline_name?: string | null;
      flights?: number;
      share_percent?: number;
    } | null;

    const busiestHourRow = (busiestHourResult.rows[0] || {}) as {
      hour_num?: number;
      flights?: number;
    };

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      airport: {
        code: airportCode,
        name: (airportMetaRow.airport_name || airportCode).trim(),
        city: airportMetaRow.city || null,
        country: airportMetaRow.country_name || null,
        countryCode: airportMetaRow.country_code || null,
      },
      totals: {
        flights: currentFlights,
        previousFlights,
        deltaFlights,
        deltaPercent,
        daysInPeriod,
      },
      topDestination: topDestinationRow
        ? {
            iata: (topDestinationRow.destination_airport || '').trim().toUpperCase(),
            name: (topDestinationRow.airport_name || topDestinationRow.destination_airport || '').trim(),
            city: (topDestinationRow.city || topDestinationRow.airport_name || topDestinationRow.destination_airport || '').trim(),
            country: topDestinationRow.country_name || topDestinationRow.country_code || 'Other',
            flag: countryFlagFromCode(topDestinationRow.country_code || null),
            flights: Number(topDestinationRow.flights) || 0,
          }
        : null,
      topAirline: topAirlineRow
        ? {
            id: Number(topAirlineRow.airline_id) || 0,
            name: (topAirlineRow.airline_name || 'Unknown Airline').trim(),
            flights: Number(topAirlineRow.flights) || 0,
            sharePercent: Number(topAirlineRow.share_percent) || 0,
          }
        : null,
      busiestDepartureHour: {
        hour: Number(busiestHourRow.hour_num) || 0,
        flights: Number(busiestHourRow.flights) || 0,
      },
    };
  }

  static async getAirportInsights(
    input: AirportInsightsInput,
  ): Promise<DashboardAirportInsightsResponse> {
    const airportCode = (input.airportCode || '').trim().toUpperCase();
    if (!airportCode) {
      throw new Error('airportCode is required');
    }

    const routeLimit = Math.min(Math.max(input.routeLimit ?? 5, 1), 20);
    const airlineLimit = Math.min(Math.max(input.airlineLimit ?? 8, 1), 20);

    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);

    const airportMetaQuery = `
      SELECT
        UPPER(TRIM(code)) AS airport_code,
        COALESCE(name, UPPER(TRIM(code))) AS airport_name,
        city,
        COALESCE(country_name, country, NULL) AS country_name,
        COALESCE(country_code, country, NULL) AS country_code
      FROM airports
      WHERE UPPER(TRIM(code)) = $1
      LIMIT 1
    `;

    const topDepartureRoutesQuery = `
      WITH route_rows AS (
        SELECT UPPER(TRIM(arr_airport)) AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND UPPER(TRIM(dep_airport)) = $1
        UNION ALL
        SELECT UPPER(TRIM(arr_airport)) AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND UPPER(TRIM(dep_airport)) = $1
      ),
      agg AS (
        SELECT airport_code, COUNT(*)::int AS flights
        FROM route_rows
        WHERE airport_code IS NOT NULL AND airport_code <> ''
        GROUP BY airport_code
      )
      SELECT
        agg.airport_code,
        agg.flights,
        COALESCE(a.name, agg.airport_code) AS airport_name,
        COALESCE(a.city, a.name, agg.airport_code) AS city,
        COALESCE(a.country_name, a.country, 'Other') AS country_name,
        COALESCE(a.country_code, a.country, NULL) AS country_code
      FROM agg
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = agg.airport_code
      ORDER BY agg.flights DESC, agg.airport_code ASC
      LIMIT $4
    `;

    const topArrivalRoutesQuery = `
      WITH route_rows AS (
        SELECT UPPER(TRIM(dep_airport)) AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND UPPER(TRIM(arr_airport)) = $1
        UNION ALL
        SELECT UPPER(TRIM(dep_airport)) AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND UPPER(TRIM(arr_airport)) = $1
      ),
      agg AS (
        SELECT airport_code, COUNT(*)::int AS flights
        FROM route_rows
        WHERE airport_code IS NOT NULL AND airport_code <> ''
        GROUP BY airport_code
      )
      SELECT
        agg.airport_code,
        agg.flights,
        COALESCE(a.name, agg.airport_code) AS airport_name,
        COALESCE(a.city, a.name, agg.airport_code) AS city,
        COALESCE(a.country_name, a.country, 'Other') AS country_name,
        COALESCE(a.country_code, a.country, NULL) AS country_code
      FROM agg
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = agg.airport_code
      ORDER BY agg.flights DESC, agg.airport_code ASC
      LIMIT $4
    `;

    const airlineShareQuery = `
      WITH airport_rows AS (
        SELECT airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND (
            UPPER(TRIM(dep_airport)) = $1
            OR UPPER(TRIM(arr_airport)) = $1
          )
        UNION ALL
        SELECT airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $2 AND departure_date <= $3
          AND (
            UPPER(TRIM(dep_airport)) = $1
            OR UPPER(TRIM(arr_airport)) = $1
          )
      ),
      airline_agg AS (
        SELECT airline_id, COUNT(*)::int AS flights
        FROM airport_rows
        WHERE airline_id IS NOT NULL
        GROUP BY airline_id
      ),
      totals AS (
        SELECT COALESCE(SUM(flights), 0)::int AS total_flights
        FROM airline_agg
      )
      SELECT
        aa.airline_id,
        aa.flights,
        COALESCE(al.name, CONCAT('Airline #', aa.airline_id::text)) AS airline_name,
        CASE
          WHEN totals.total_flights > 0 THEN (aa.flights::numeric / totals.total_flights::numeric) * 100
          ELSE 0
        END AS share_percent
      FROM airline_agg aa
      LEFT JOIN airlines al ON al.id = aa.airline_id
      CROSS JOIN totals
      ORDER BY aa.flights DESC, aa.airline_id ASC
      LIMIT $4
    `;

    const departureTimeAvailable = await hasFlightPathColumn('departure_time');
    const hourlyDepartureQuery = departureTimeAvailable
      ? `
          WITH hourly_rows AS (
            SELECT COALESCE(EXTRACT(HOUR FROM departure_time)::int, 0) AS hour_num
            FROM departure_flight_paths
            WHERE departure_date >= $2 AND departure_date <= $3
              AND UPPER(TRIM(dep_airport)) = $1
            UNION ALL
            SELECT COALESCE(EXTRACT(HOUR FROM departure_time)::int, 0) AS hour_num
            FROM arrival_flight_paths
            WHERE departure_date >= $2 AND departure_date <= $3
              AND UPPER(TRIM(dep_airport)) = $1
          )
          SELECT hour_num, COUNT(*)::int AS flights
          FROM hourly_rows
          GROUP BY hour_num
        `
      : null;

    const hourlyArrivalQuery = departureTimeAvailable
      ? `
          WITH hourly_rows AS (
            SELECT COALESCE(EXTRACT(HOUR FROM departure_time)::int, 0) AS hour_num
            FROM departure_flight_paths
            WHERE departure_date >= $2 AND departure_date <= $3
              AND UPPER(TRIM(arr_airport)) = $1
            UNION ALL
            SELECT COALESCE(EXTRACT(HOUR FROM departure_time)::int, 0) AS hour_num
            FROM arrival_flight_paths
            WHERE departure_date >= $2 AND departure_date <= $3
              AND UPPER(TRIM(arr_airport)) = $1
          )
          SELECT hour_num, COUNT(*)::int AS flights
          FROM hourly_rows
          GROUP BY hour_num
        `
      : null;

    const [airportMetaResult, topDepartureResult, topArrivalResult, airlineShareResult, hourlyDepartureResult, hourlyArrivalResult] = await Promise.all([
      pool.query(airportMetaQuery, [airportCode]),
      pool.query(topDepartureRoutesQuery, [airportCode, periodStart, periodEnd, routeLimit]),
      pool.query(topArrivalRoutesQuery, [airportCode, periodStart, periodEnd, routeLimit]),
      pool.query(airlineShareQuery, [airportCode, periodStart, periodEnd, airlineLimit]),
      hourlyDepartureQuery ? pool.query(hourlyDepartureQuery, [airportCode, periodStart, periodEnd]) : Promise.resolve({ rows: [] } as any),
      hourlyArrivalQuery ? pool.query(hourlyArrivalQuery, [airportCode, periodStart, periodEnd]) : Promise.resolve({ rows: [] } as any),
    ]);

    const airportMetaRow = (airportMetaResult.rows[0] || {}) as {
      airport_code?: string | null;
      airport_name?: string | null;
      city?: string | null;
      country_name?: string | null;
      country_code?: string | null;
    };

    const mapRoutes = (rows: Array<any>): DashboardAirportInsightRoute[] => rows.map((row) => ({
      iata: (row.airport_code || '').trim().toUpperCase(),
      name: (row.airport_name || row.airport_code || '').trim(),
      city: (row.city || row.airport_name || row.airport_code || '').trim(),
      country: row.country_name || row.country_code || 'Other',
      flag: countryFlagFromCode(row.country_code || null),
      flights: Number(row.flights) || 0,
    }));

    const departureByHour = Array.from({ length: 24 }, () => 0);
    for (const row of hourlyDepartureResult.rows as Array<{ hour_num?: number; flights?: number }>) {
      const hour = Number(row.hour_num);
      if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
        departureByHour[hour] = Number(row.flights) || 0;
      }
    }

    const arrivalByHour = Array.from({ length: 24 }, () => 0);
    for (const row of hourlyArrivalResult.rows as Array<{ hour_num?: number; flights?: number }>) {
      const hour = Number(row.hour_num);
      if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
        arrivalByHour[hour] = Number(row.flights) || 0;
      }
    }

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      airport: {
        code: airportCode,
        name: (airportMetaRow.airport_name || airportCode).trim(),
        city: airportMetaRow.city || null,
        country: airportMetaRow.country_name || null,
        countryCode: airportMetaRow.country_code || null,
      },
      topDepartureRoutes: mapRoutes(topDepartureResult.rows as Array<any>),
      topArrivalRoutes: mapRoutes(topArrivalResult.rows as Array<any>),
      airlineShare: (airlineShareResult.rows as Array<any>).map((row) => ({
        id: Number(row.airline_id) || 0,
        name: (row.airline_name || 'Unknown Airline').trim(),
        flights: Number(row.flights) || 0,
        sharePercent: Number(row.share_percent) || 0,
      })),
      hourlyDistribution: {
        departure: departureByHour,
        arrival: arrivalByHour,
      },
    };
  }

  static async getAirportTrends(
    input: AirportTrendsInput,
  ): Promise<DashboardAirportTrendsResponse> {
    const airportCode = (input.airportCode || '').trim().toUpperCase();
    if (!airportCode) {
      throw new Error('airportCode is required');
    }

    const centerDate = input.centerDateInput
      ? parseDateInput(input.centerDateInput)
      : new Date();

    if (!centerDate) {
      throw new Error('Invalid center date provided');
    }

    const centerDateKey = formatDateForQuery(centerDate);
    const centerYear = centerDate.getUTCFullYear();

    const airportMetaQuery = `
      SELECT
        UPPER(TRIM(code)) AS airport_code,
        COALESCE(name, UPPER(TRIM(code))) AS airport_name,
        city,
        COALESCE(country_name, country, NULL) AS country_name,
        COALESCE(country_code, country, NULL) AS country_code
      FROM airports
      WHERE UPPER(TRIM(code)) = $1
      LIMIT 1
    `;

    const dailyTrendQuery = `
      WITH dep_rows AS (
        SELECT departure_date::date AS flight_date
        FROM departure_flight_paths
        WHERE departure_date::date >= ($2::date - INTERVAL '34 day')
          AND departure_date::date <= $2::date
          AND UPPER(TRIM(dep_airport)) = $1
        UNION ALL
        SELECT departure_date::date AS flight_date
        FROM arrival_flight_paths
        WHERE departure_date::date >= ($2::date - INTERVAL '34 day')
          AND departure_date::date <= $2::date
          AND UPPER(TRIM(dep_airport)) = $1
      ),
      arr_rows AS (
        SELECT departure_date::date AS flight_date
        FROM departure_flight_paths
        WHERE departure_date::date >= ($2::date - INTERVAL '34 day')
          AND departure_date::date <= $2::date
          AND UPPER(TRIM(arr_airport)) = $1
        UNION ALL
        SELECT departure_date::date AS flight_date
        FROM arrival_flight_paths
        WHERE departure_date::date >= ($2::date - INTERVAL '34 day')
          AND departure_date::date <= $2::date
          AND UPPER(TRIM(arr_airport)) = $1
      ),
      cancelled_rows AS (
        SELECT departure_date::date AS flight_date
        FROM departure_flight_paths
        WHERE departure_date::date >= ($2::date - INTERVAL '34 day')
          AND departure_date::date <= $2::date
          AND (UPPER(TRIM(dep_airport)) = $1 OR UPPER(TRIM(arr_airport)) = $1)
          AND status = 'cancelled'
        UNION ALL
        SELECT departure_date::date AS flight_date
        FROM arrival_flight_paths
        WHERE departure_date::date >= ($2::date - INTERVAL '34 day')
          AND departure_date::date <= $2::date
          AND (UPPER(TRIM(dep_airport)) = $1 OR UPPER(TRIM(arr_airport)) = $1)
          AND status = 'cancelled'
      ),
      dep_by_day AS (
        SELECT flight_date, COUNT(*)::int AS dep_flights
        FROM dep_rows
        GROUP BY flight_date
      ),
      arr_by_day AS (
        SELECT flight_date, COUNT(*)::int AS arr_flights
        FROM arr_rows
        GROUP BY flight_date
      ),
      cancelled_by_day AS (
        SELECT flight_date, COUNT(*)::int AS cancelled_flights
        FROM cancelled_rows
        GROUP BY flight_date
      ),
      all_days AS (
        SELECT flight_date FROM dep_by_day
        UNION
        SELECT flight_date FROM arr_by_day
      ),
      merged AS (
        SELECT
          d.flight_date,
          COALESCE(dep.dep_flights, 0)::int AS departure_flights,
          COALESCE(arr.arr_flights, 0)::int AS arrival_flights,
          (COALESCE(dep.dep_flights, 0) + COALESCE(arr.arr_flights, 0))::int AS flights,
          COALESCE(c.cancelled_flights, 0)::int AS cancelled_flights
        FROM all_days d
        LEFT JOIN dep_by_day dep ON dep.flight_date = d.flight_date
        LEFT JOIN arr_by_day arr ON arr.flight_date = d.flight_date
        LEFT JOIN cancelled_by_day c ON c.flight_date = d.flight_date
      ),
      with_lag AS (
        SELECT
          flight_date,
          departure_flights,
          arrival_flights,
          flights,
          cancelled_flights,
          LAG(flights) OVER (ORDER BY flight_date ASC) AS prev_flights
        FROM merged
      )
      SELECT
        flight_date,
        departure_flights,
        arrival_flights,
        flights,
        cancelled_flights,
        CASE
          WHEN prev_flights IS NULL OR prev_flights = 0 THEN NULL
          ELSE ((flights - prev_flights)::numeric / prev_flights::numeric) * 100
        END AS delta_percent
      FROM with_lag
      ORDER BY flight_date ASC
    `;

    const monthlyTrendQuery = `
      WITH dep_rows AS (
        SELECT EXTRACT(MONTH FROM departure_date)::int AS month_num
        FROM departure_flight_paths
        WHERE departure_date::date >= make_date($2, 1, 1)
          AND departure_date::date < make_date($2 + 1, 1, 1)
          AND UPPER(TRIM(dep_airport)) = $1
        UNION ALL
        SELECT EXTRACT(MONTH FROM departure_date)::int AS month_num
        FROM arrival_flight_paths
        WHERE departure_date::date >= make_date($2, 1, 1)
          AND departure_date::date < make_date($2 + 1, 1, 1)
          AND UPPER(TRIM(dep_airport)) = $1
      ),
      arr_rows AS (
        SELECT EXTRACT(MONTH FROM departure_date)::int AS month_num
        FROM departure_flight_paths
        WHERE departure_date::date >= make_date($2, 1, 1)
          AND departure_date::date < make_date($2 + 1, 1, 1)
          AND UPPER(TRIM(arr_airport)) = $1
        UNION ALL
        SELECT EXTRACT(MONTH FROM departure_date)::int AS month_num
        FROM arrival_flight_paths
        WHERE departure_date::date >= make_date($2, 1, 1)
          AND departure_date::date < make_date($2 + 1, 1, 1)
          AND UPPER(TRIM(arr_airport)) = $1
      ),
      cancelled_rows AS (
        SELECT EXTRACT(MONTH FROM departure_date)::int AS month_num
        FROM departure_flight_paths
        WHERE departure_date::date >= make_date($2, 1, 1)
          AND departure_date::date < make_date($2 + 1, 1, 1)
          AND (UPPER(TRIM(dep_airport)) = $1 OR UPPER(TRIM(arr_airport)) = $1)
          AND status = 'cancelled'
        UNION ALL
        SELECT EXTRACT(MONTH FROM departure_date)::int AS month_num
        FROM arrival_flight_paths
        WHERE departure_date::date >= make_date($2, 1, 1)
          AND departure_date::date < make_date($2 + 1, 1, 1)
          AND (UPPER(TRIM(dep_airport)) = $1 OR UPPER(TRIM(arr_airport)) = $1)
          AND status = 'cancelled'
      ),
      dep_counts AS (
        SELECT month_num, COUNT(*)::int AS departure_flights
        FROM dep_rows
        GROUP BY month_num
      ),
      arr_counts AS (
        SELECT month_num, COUNT(*)::int AS arrival_flights
        FROM arr_rows
        GROUP BY month_num
      ),
      cancelled_counts AS (
        SELECT month_num, COUNT(*)::int AS cancelled_flights
        FROM cancelled_rows
        GROUP BY month_num
      )
      SELECT
        m.month_num,
        COALESCE(dep.departure_flights, 0)::int AS departure_flights,
        COALESCE(arr.arrival_flights, 0)::int AS arrival_flights,
        (COALESCE(dep.departure_flights, 0) + COALESCE(arr.arrival_flights, 0))::int AS flights,
        COALESCE(cancelled.cancelled_flights, 0)::int AS cancelled_flights
      FROM generate_series(1, 12) AS m(month_num)
      LEFT JOIN dep_counts dep ON dep.month_num = m.month_num
      LEFT JOIN arr_counts arr ON arr.month_num = m.month_num
      LEFT JOIN cancelled_counts cancelled ON cancelled.month_num = m.month_num
      ORDER BY m.month_num ASC
    `;

    const [airportMetaResult, dailyResult, monthlyResult] = await Promise.all([
      pool.query(airportMetaQuery, [airportCode]),
      pool.query(dailyTrendQuery, [airportCode, centerDateKey]),
      pool.query(monthlyTrendQuery, [airportCode, centerYear]),
    ]);

    const airportMetaRow = (airportMetaResult.rows[0] || {}) as {
      airport_code?: string | null;
      airport_name?: string | null;
      city?: string | null;
      country_name?: string | null;
      country_code?: string | null;
    };

    const daily = (dailyResult.rows as Array<{
      flight_date: Date | string;
      departure_flights: number;
      arrival_flights: number;
      flights: number;
      cancelled_flights: number;
      delta_percent: number | null;
    }>).map((row) => ({
      date: formatDateForQuery(new Date(row.flight_date)),
      departureFlights: Number(row.departure_flights) || 0,
      arrivalFlights: Number(row.arrival_flights) || 0,
      flights: Number(row.flights) || 0,
      cancelledFlights: Number(row.cancelled_flights) || 0,
      deltaPercent: row.delta_percent == null ? null : Number(row.delta_percent),
    }));

    const monthly = (monthlyResult.rows as Array<{ month_num: number; departure_flights: number; arrival_flights: number; flights: number; cancelled_flights: number }>).map((row) => ({
      month: Number(row.month_num) || 0,
      departureFlights: Number(row.departure_flights) || 0,
      arrivalFlights: Number(row.arrival_flights) || 0,
      flights: Number(row.flights) || 0,
      cancelledFlights: Number(row.cancelled_flights) || 0,
    }));

    return {
      centerDate: centerDateKey,
      airport: {
        code: airportCode,
        name: (airportMetaRow.airport_name || airportCode).trim(),
        city: airportMetaRow.city || null,
        country: airportMetaRow.country_name || null,
        countryCode: airportMetaRow.country_code || null,
      },
      daily,
      monthly,
    };
  }

  static async getCountryOverview(
    input: CountryOverviewInput,
  ): Promise<DashboardCountryOverviewResponse> {
    const countryInput = (input.country || '').trim();
    if (!countryInput) {
      throw new Error('country is required');
    }

    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);
    const normalizedCode = countryInput.toUpperCase();

    const countryScopeQuery = `
      WITH country_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS code
        FROM airports
        WHERE code IS NOT NULL
          AND TRIM(code) <> ''
          AND (
            UPPER(TRIM(country_code)) = $1
            OR UPPER(TRIM(country)) = $1
            OR TRIM(country_name) ILIKE $2
          )
      ),
      current_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND arr_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND arr_airport IN (SELECT code FROM country_airports)
      ),
      previous_rows AS (
        SELECT dep_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM departure_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND arr_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT dep_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT arr_airport AS airport_code
        FROM arrival_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND arr_airport IN (SELECT code FROM country_airports)
      )
      SELECT
        (SELECT COUNT(*)::int FROM current_rows) AS current_flights,
        (SELECT COUNT(*)::int FROM previous_rows) AS previous_flights,
        (SELECT COUNT(*)::int FROM country_airports) AS airport_count
    `;

    const airportsQuery = `
      WITH country_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS code
        FROM airports
        WHERE code IS NOT NULL
          AND TRIM(code) <> ''
          AND city IS NOT NULL
          AND TRIM(city) <> ''
          AND (
            UPPER(TRIM(country_code)) = $1
            OR UPPER(TRIM(country)) = $1
            OR TRIM(country_name) ILIKE $2
          )
      ),
      current_rows AS (
        SELECT dep_airport AS airport_code, arr_airport AS counterpart_airport, airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT arr_airport AS airport_code, dep_airport AS counterpart_airport, airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND arr_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT dep_airport AS airport_code, arr_airport AS counterpart_airport, airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT arr_airport AS airport_code, dep_airport AS counterpart_airport, airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND arr_airport IN (SELECT code FROM country_airports)
      )
      SELECT
        ca.code AS airport_code,
        COALESCE(a.name, a.code, ca.code) AS airport_name,
        COUNT(cr.airport_code)::int AS flights,
        COUNT(DISTINCT cr.counterpart_airport)::int AS routes,
        COUNT(DISTINCT cr.airline_id)::int AS airlines
      FROM country_airports ca
      LEFT JOIN current_rows cr ON UPPER(TRIM(cr.airport_code)) = ca.code
      LEFT JOIN airports a ON UPPER(TRIM(a.code)) = ca.code
      GROUP BY ca.code, COALESCE(a.name, a.code, ca.code)
      ORDER BY COUNT(cr.airport_code) DESC, ca.code ASC
    `;

    const inboundQuery = `
      WITH country_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS code
        FROM airports
        WHERE code IS NOT NULL
          AND TRIM(code) <> ''
          AND (
            UPPER(TRIM(country_code)) = $1
            OR UPPER(TRIM(country)) = $1
            OR TRIM(country_name) ILIKE $2
          )
      ),
      current_rows AS (
        SELECT dep_airport AS origin_airport
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND arr_airport IN (SELECT code FROM country_airports)
          AND dep_airport NOT IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT dep_airport AS origin_airport
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND arr_airport IN (SELECT code FROM country_airports)
          AND dep_airport NOT IN (SELECT code FROM country_airports)
      ),
      current_agg AS (
        SELECT
          COALESCE(a.country_code, a.country, NULL) AS origin_country_code,
          COALESCE(a.country_name, a.country, 'Other') AS origin_country_name,
          COUNT(*)::int AS flights
        FROM current_rows cr
        LEFT JOIN airports a ON UPPER(TRIM(a.code)) = UPPER(TRIM(cr.origin_airport))
        WHERE cr.origin_airport IS NOT NULL AND TRIM(cr.origin_airport) <> ''
        GROUP BY COALESCE(a.country_code, a.country, NULL), COALESCE(a.country_name, a.country, 'Other')
      ),
      top_current AS (
        SELECT origin_country_code, origin_country_name, flights
        FROM current_agg
        WHERE origin_country_name <> 'Other'
        ORDER BY flights DESC, origin_country_name ASC
        LIMIT 5
      ),
      total_current AS (
        SELECT COALESCE(SUM(flights), 0)::int AS total_flights
        FROM current_agg
      )
      SELECT
        tc.origin_country_code,
        tc.origin_country_name,
        tc.flights,
        CASE
          WHEN t.total_flights > 0 THEN (tc.flights::numeric / t.total_flights::numeric) * 100
          ELSE 0
        END AS pct
      FROM top_current tc
      CROSS JOIN total_current t
      ORDER BY tc.flights DESC, tc.origin_country_name ASC
    `;

    const airlineQuery = `
      WITH country_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS code
        FROM airports
        WHERE code IS NOT NULL
          AND TRIM(code) <> ''
          AND (
            UPPER(TRIM(country_code)) = $1
            OR UPPER(TRIM(country)) = $1
            OR TRIM(country_name) ILIKE $2
          )
      ),
      current_rows AS (
        SELECT airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND arr_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND arr_airport IN (SELECT code FROM country_airports)
      ),
      current_agg AS (
        SELECT airline_id, COUNT(*)::int AS flights
        FROM current_rows
        GROUP BY airline_id
      ),
      current_ranked AS (
        SELECT airline_id, flights
        FROM current_agg
        ORDER BY flights DESC, airline_id ASC
      ),
      previous_rows AS (
        SELECT airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND arr_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND arr_airport IN (SELECT code FROM country_airports)
      ),
      previous_agg AS (
        SELECT airline_id, COUNT(*)::int AS flights
        FROM previous_rows
        GROUP BY airline_id
      ),
      totals AS (
        SELECT
          (SELECT COALESCE(SUM(flights), 0)::int FROM current_agg) AS current_total,
          (SELECT COALESCE(SUM(flights), 0)::int FROM previous_agg) AS previous_total
      )
      SELECT
        tc.airline_id,
        tc.flights,
        COALESCE(pa.flights, 0)::int AS previous_flights,
        COALESCE(al.name, CONCAT('Airline #', tc.airline_id::text)) AS airline_name,
        CASE
          WHEN totals.current_total > 0 THEN (tc.flights::numeric / totals.current_total::numeric) * 100
          ELSE 0
        END AS share,
        CASE
          WHEN totals.previous_total > 0 THEN (COALESCE(pa.flights, 0)::numeric / totals.previous_total::numeric) * 100
          ELSE 0
        END AS previous_share
      FROM current_ranked tc
      LEFT JOIN previous_agg pa ON pa.airline_id = tc.airline_id
      LEFT JOIN airlines al ON al.id = tc.airline_id
      CROSS JOIN totals
      ORDER BY tc.flights DESC, tc.airline_id ASC
    `;

    const baseParams = [normalizedCode, `%${countryInput}%`, periodStart, periodEnd];
    const comparisonParams = [normalizedCode, `%${countryInput}%`, periodStart, periodEnd, comparisonStart, comparisonEnd];

    const [countryScopeResult, airportsResult, inboundResult, airlineResult] = await Promise.all([
      pool.query(countryScopeQuery, comparisonParams),
      pool.query(airportsQuery, baseParams),
      pool.query(inboundQuery, baseParams),
      pool.query(airlineQuery, comparisonParams),
    ]);

    const scopeRow = (countryScopeResult.rows[0] || {}) as {
      current_flights?: number;
      previous_flights?: number;
      airport_count?: number;
    };

    const currentFlights = Number(scopeRow.current_flights) || 0;
    const previousFlights = Number(scopeRow.previous_flights) || 0;
    const deltaFlights = currentFlights - previousFlights;
    const deltaPercent = previousFlights > 0
      ? (deltaFlights / previousFlights) * 100
      : currentFlights > 0
        ? 100
        : 0;

    const airports = (airportsResult.rows as Array<{
      airport_code: string | null;
      airport_name: string | null;
      flights: number;
      routes: number;
      airlines: number;
    }>).map((row) => ({
      iata: (row.airport_code || '').trim().toUpperCase(),
      name: (row.airport_name || row.airport_code || '').trim(),
      flights: Number(row.flights) || 0,
      routes: Number(row.routes) || 0,
      airlines: Number(row.airlines) || 0,
    })).filter((row) => row.iata);

    const inbound = (inboundResult.rows as Array<{
      origin_country_code: string | null;
      origin_country_name: string | null;
      flights: number;
      pct: number;
    }>).map((row) => ({
      flag: countryFlagFromCode(row.origin_country_code),
      name: row.origin_country_name || 'Other',
      flights: Number(row.flights) || 0,
      pct: Number(row.pct) || 0,
    })).filter((row) => row.name !== 'Other' && row.flights > 0);

    const airlineMarket = (airlineResult.rows as Array<{
      airline_id: number;
      airline_name: string | null;
      flights: number;
      share: number;
      previous_share: number;
    }>).map((row) => {
      const share = Number(row.share) || 0;
      const previousShare = Number(row.previous_share) || 0;
      return {
        airlineId: Number(row.airline_id),
        name: (row.airline_name || 'Unknown Airline').trim(),
        flights: Number(row.flights) || 0,
        share,
        delta: share - previousShare,
      } satisfies DashboardCountryAirlineBreakdown;
    }).filter((row) => row.flights > 0);

    const topAirline = airlineMarket[0]
      ? { name: airlineMarket[0].name, sharePercent: airlineMarket[0].share }
      : { name: 'Local Carrier', sharePercent: null };

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      country: {
        name: countryInput,
        code: normalizedCode.length <= 3 ? normalizedCode : null,
      },
      totals: {
        flights: currentFlights,
        previousFlights,
        deltaFlights,
        deltaPercent,
      },
      airports,
      inbound,
      airlineMarket,
      topAirline,
    };
  }

  static async getCountryAirlineMarket(
    input: CountryOverviewInput,
  ): Promise<DashboardCountryAirlineBreakdown[]> {
    const countryInput = (input.country || '').trim();
    if (!countryInput) throw new Error('country is required');

    const { startDate, endDate, comparisonStartDate, comparisonEndDate } = resolveWorldRange(input);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);
    const normalizedCode = countryInput.toUpperCase();

    const airlineQuery = `
      WITH country_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS code
        FROM airports
        WHERE code IS NOT NULL
          AND TRIM(code) <> ''
          AND (
            UPPER(TRIM(country_code)) = $1
            OR UPPER(TRIM(country)) = $1
            OR TRIM(country_name) ILIKE $2
          )
      ),
      current_rows AS (
        SELECT airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND arr_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $3 AND departure_date <= $4
          AND arr_airport IN (SELECT code FROM country_airports)
      ),
      current_agg AS (
        SELECT airline_id, COUNT(*)::int AS flights
        FROM current_rows
        GROUP BY airline_id
      ),
      current_ranked AS (
        SELECT airline_id, flights
        FROM current_agg
        ORDER BY flights DESC, airline_id ASC
      ),
      previous_rows AS (
        SELECT airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM departure_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND arr_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND dep_airport IN (SELECT code FROM country_airports)
        UNION ALL
        SELECT airline_id
        FROM arrival_flight_paths
        WHERE departure_date >= $5 AND departure_date <= $6
          AND arr_airport IN (SELECT code FROM country_airports)
      ),
      previous_agg AS (
        SELECT airline_id, COUNT(*)::int AS flights
        FROM previous_rows
        GROUP BY airline_id
      ),
      totals AS (
        SELECT
          (SELECT COALESCE(SUM(flights), 0)::int FROM current_agg) AS current_total,
          (SELECT COALESCE(SUM(flights), 0)::int FROM previous_agg) AS previous_total
      )
      SELECT
        tc.airline_id,
        tc.flights,
        COALESCE(pa.flights, 0)::int AS previous_flights,
        COALESCE(al.name, CONCAT('Airline #', tc.airline_id::text)) AS airline_name,
        CASE
          WHEN totals.current_total > 0 THEN (tc.flights::numeric / totals.current_total::numeric) * 100
          ELSE 0
        END AS share,
        CASE
          WHEN totals.previous_total > 0 THEN (COALESCE(pa.flights, 0)::numeric / totals.previous_total::numeric) * 100
          ELSE 0
        END AS previous_share
      FROM current_ranked tc
      LEFT JOIN previous_agg pa ON pa.airline_id = tc.airline_id
      LEFT JOIN airlines al ON al.id = tc.airline_id
      CROSS JOIN totals
      ORDER BY tc.flights DESC, tc.airline_id ASC
    `;

    const params = [normalizedCode, `%${countryInput}%`, periodStart, periodEnd, comparisonStart, comparisonEnd];
    const result = await pool.query(airlineQuery, params);

    return (result.rows as Array<{
      airline_id: number;
      airline_name: string | null;
      flights: number;
      share: number;
      previous_share: number;
    }>).map((row) => {
      const share = Number(row.share) || 0;
      const previousShare = Number(row.previous_share) || 0;
      return {
        airlineId: Number(row.airline_id),
        name: (row.airline_name || 'Unknown Airline').trim(),
        flights: Number(row.flights) || 0,
        share,
        delta: share - previousShare,
      } satisfies DashboardCountryAirlineBreakdown;
    }).filter((row) => row.flights > 0);
  }

  static async getCountryFlowMap(
    input: CountryOverviewInput,
  ): Promise<DashboardCountryFlowMapResponse> {
    const countryInput = (input.country || '').trim();
    if (!countryInput) {
      throw new Error('country is required');
    }

    const { startDate, endDate, comparisonStartDate, comparisonEndDate, windowDays } = resolveWorldRange(input);
    const centerDate = resolveCenterDate(input, startDate, endDate);
    const periodStart = formatDateForQuery(startDate);
    const periodEnd = formatDateForQuery(endDate);
    const comparisonStart = formatDateForQuery(comparisonStartDate);
    const comparisonEnd = formatDateForQuery(comparisonEndDate);
    const normalizedCode = countryInput.toUpperCase();
    const namePattern = `%${countryInput}%`;

    const countryMetaQuery = `
      WITH country_airports AS (
        SELECT DISTINCT UPPER(TRIM(code)) AS code
        FROM airports
        WHERE code IS NOT NULL
          AND TRIM(code) <> ''
          AND (
            UPPER(TRIM(country_code)) = $1
            OR UPPER(TRIM(country)) = $1
            OR TRIM(country_name) ILIKE $2
          )
      )
      SELECT
        COUNT(*)::int AS airport_count,
        ROUND(AVG(latitude)::numeric, 6)::float AS latitude,
        ROUND(AVG(longitude)::numeric, 6)::float AS longitude,
        COALESCE(MAX(country_code), MAX(country), NULL) AS country_code,
        COALESCE(MAX(country_name), MAX(country), 'Other') AS country_name
      FROM airports
      WHERE code IN (SELECT code FROM country_airports)
    `;

    const inboundQuery = buildCountryFlowMapDirectionQuery('inbound');
    const outboundQuery = buildCountryFlowMapDirectionQuery('outbound');

    const [countryMetaResult, inboundResult, outboundResult] = await Promise.all([
      pool.query(countryMetaQuery, [normalizedCode, namePattern]),
      pool.query(inboundQuery, [normalizedCode, namePattern, periodStart, periodEnd, comparisonStart, comparisonEnd]),
      pool.query(outboundQuery, [normalizedCode, namePattern, periodStart, periodEnd, comparisonStart, comparisonEnd]),
    ]);

    const countryMetaRow = (countryMetaResult.rows[0] || {}) as {
      airport_count?: number;
      latitude?: number | null;
      longitude?: number | null;
      country_code?: string | null;
      country_name?: string | null;
    };

    const mapRows = (rows: Array<{
      country_code: string | null;
      country_name: string | null;
      latitude: number | null;
      longitude: number | null;
      airport_count: number | null;
      flights: number;
      previous_flights: number;
    }>) => {
      const totalFlights = rows.reduce((sum, row) => sum + (Number(row.flights) || 0), 0);
      const previousTotalFlights = rows.reduce((sum, row) => sum + (Number(row.previous_flights) || 0), 0);

      return {
        totalFlights,
        previousFlights: previousTotalFlights,
        points: rows.map((row) => {
          const flights = Number(row.flights) || 0;
          const previousFlights = Number(row.previous_flights) || 0;
          const deltaFlights = flights - previousFlights;
          const deltaPercent = previousFlights > 0
            ? (deltaFlights / previousFlights) * 100
            : flights > 0
              ? 100
              : 0;

          return {
            countryCode: row.country_code || null,
            countryName: row.country_name || 'Other',
            flag: countryFlagFromCode(row.country_code),
            latitude: row.latitude ?? null,
            longitude: row.longitude ?? null,
            airportCount: Number(row.airport_count) || 0,
            flights,
            previousFlights,
            deltaFlights,
            deltaPercent,
            pct: totalFlights > 0 ? (flights / totalFlights) * 100 : 0,
          } satisfies DashboardCountryFlowMapPoint;
        }),
      } satisfies DashboardCountryFlowMapDirection;
    };

    return {
      centerDate: formatDateForQuery(centerDate),
      windowDays,
      periodStart,
      periodEnd,
      comparisonStart,
      comparisonEnd,
      country: {
        name: countryMetaRow.country_name || countryInput,
        code: countryMetaRow.country_code || (normalizedCode.length <= 3 ? normalizedCode : null),
        airportCount: Number(countryMetaRow.airport_count) || 0,
        latitude: countryMetaRow.latitude ?? null,
        longitude: countryMetaRow.longitude ?? null,
      },
      inbound: mapRows(inboundResult.rows as Array<{
        country_code: string | null;
        country_name: string | null;
        latitude: number | null;
        longitude: number | null;
        airport_count: number | null;
        flights: number;
        previous_flights: number;
      }>),
      outbound: mapRows(outboundResult.rows as Array<{
        country_code: string | null;
        country_name: string | null;
        latitude: number | null;
        longitude: number | null;
        airport_count: number | null;
        flights: number;
        previous_flights: number;
      }>),
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
          totalFlights: 0,
          totalDeltaFlights: 0,
          totalDeltaPercent: 0,
          totalDeltaText: '+0 (0.0%)',
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
        totalFlights: 0,
        totalDeltaFlights: 0,
        totalDeltaPercent: 0,
        totalDeltaText: '+0 (0.0%)',
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
    const totalFlights = currentCountryRows.reduce((sum, row) => sum + row.flights, 0);
    const previousTotalFlights = currentCountryRows.reduce((sum, row) => sum + row.previousFlights, 0);
    const totalDeltaFlights = totalFlights - previousTotalFlights;
    const totalDeltaPercent = previousTotalFlights > 0
      ? (totalDeltaFlights / previousTotalFlights) * 100
      : totalFlights > 0
        ? 100
        : 0;
    const totalDeltaText = `${totalDeltaFlights >= 0 ? '▲' : '▼'} ${totalDeltaFlights >= 0 ? '+' : ''}${totalDeltaFlights.toLocaleString()} (${totalDeltaPercent >= 0 ? '+' : ''}${totalDeltaPercent.toFixed(1)}%)`;
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
        totalFlights,
        totalDeltaFlights,
        totalDeltaPercent,
        totalDeltaText,
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

    // Match each table to the leading airport column that already has an index:
    //   departure_flight_paths(dep_airport, departure_date)
    //   arrival_flight_paths(arr_airport, arrival_date)
    // getContinentAirportCodes() already returns normalized uppercase codes, so
    // we can compare directly without UPPER(TRIM(...)) and keep the predicates index-friendly.
    const dayAverageQuery = `
      WITH flight_events AS (
        SELECT
          departure_date AS flight_date,
          COALESCE(EXTRACT(HOUR FROM departure_time)::int, 0) AS hour_num,
          1 AS outbound_count,
          0 AS inbound_count
        FROM departure_flight_paths
        WHERE dep_airport = ANY($1::text[])

        UNION ALL

        SELECT
          departure_date AS flight_date,
          COALESCE(EXTRACT(HOUR FROM departure_time)::int, 0) AS hour_num,
          0 AS outbound_count,
          1 AS inbound_count
        FROM arrival_flight_paths
        WHERE arr_airport = ANY($1::text[])
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
