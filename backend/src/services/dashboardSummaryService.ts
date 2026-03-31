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
        (SELECT COUNT(*)::int
         FROM (
           SELECT 1 FROM departure_flight_paths WHERE departure_date >= $1 AND departure_date <= $2
           UNION ALL
           SELECT 1 FROM arrival_flight_paths WHERE departure_date >= $1 AND departure_date <= $2
         ) all_flights
        ) AS total_flights,
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
        SELECT dep_airport AS airport_code
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
        SELECT dep_airport AS airport_code
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
}
