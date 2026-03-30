import { pool } from '../config/database';
import { getContinentMeta, type ContinentMeta } from '../utils/continentMapper';

export interface DashboardContinentSummary {
  key: ContinentMeta['key'];
  label: string;
  icon: string;
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

    const [summaryResult, currentContinentResult, previousContinentResult] = await Promise.all([
      pool.query(totalFlightsQuery, [periodStart, periodEnd]),
      pool.query(continentQuery, [periodStart, periodEnd]),
      pool.query(continentQuery, [comparisonStart, comparisonEnd]),
    ]);

    const totalFlights = Number(summaryResult.rows[0]?.total_flights) || 0;
    const activeAirports = Number(summaryResult.rows[0]?.active_airports) || 0;
    const averageFlightsPerDay = Math.round(totalFlights / (windowDays * 2 + 1));

    const continentBreakdown = mergeCurrentAndPrevious(
      currentContinentResult.rows,
      previousContinentResult.rows,
    );

    const busiestContinent = continentBreakdown[0] || {
      key: 'Other' as const,
      label: 'Other',
      icon: '🌐',
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
}
