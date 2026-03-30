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

type PeriodRow = {
  country_code: string | null;
  country_name: string | null;
  flights: number;
};

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

function sumContinentRows(rows: PeriodRow[]): DashboardContinentSummary[] {
  const grouped = new Map<string, DashboardContinentSummary>();

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

  return [...grouped.values()].sort((a, b) => b.flights - a.flights);
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

export class DashboardSummaryService {
  static async getWorldSummary(
    centerDateInput?: string,
    windowDays = 15,
  ): Promise<DashboardSummaryResponse> {
    const centerDate = centerDateInput
      ? new Date(`${centerDateInput.split('T')[0]}T00:00:00.000Z`)
      : new Date();

    if (Number.isNaN(centerDate.getTime())) {
      throw new Error('Invalid center date provided');
    }

    const { startDate, endDate, comparisonStartDate, comparisonEndDate } = buildInclusiveRange(centerDate, windowDays);
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
}
