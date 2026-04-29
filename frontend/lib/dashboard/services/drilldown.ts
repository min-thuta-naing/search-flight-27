/**
 * Service layer for drill-down dashboard data.
 *
 * All data access goes through these functions. Currently backed
 * by mock data — swap implementations here when connecting to a
 * real API without touching any component code.
 */

import type {
  ContinentData,
  CountryData,
  AirportInfo,
  BusiestAirport,
  InboundCountry,
  CountryAirlineShare,
} from '@/types/dashboard';
import { statisticsApi } from '@/lib/api/statistics-api';
export type {
  DashboardDateBoundsResponse,
  DashboardCacheStatusResponse,
  DashboardSummaryResponse,
  DashboardTopRanksResponse,
  DashboardCountryOverviewResponse,
  DashboardCountryFlowMapResponse,
  DashboardAirportOverviewResponse,
  DashboardAirportInsightsResponse,
  DashboardTopCountriesResponse,
  DashboardTopAirportsResponse,
  DashboardTopDestinationsResponse,
} from '@/lib/api/statistics-api';
import {
  ROUTES,
  ARRIVALS,
  AIRLINES,
  HOUR_TOTAL,
  HOUR_TOTAL_ARR,
  DAILY,
  INVEST_ROUTES,
  MK_AIRPORTS,
  MK_INBOUND_COUNTRIES,
} from '../drill-down-data';
import {
  COUNTRY_AIRPORTS,
  COUNTRY_TOP_AIRLINES,
  COUNTRY_AIRLINE_MARKET,
  COUNTRY_INBOUND,
  AIRPORT_MONTHLY,
  AIRPORT_MONTH_LABELS,
  AIRPORT_CURRENT_MONTH_IDX,
} from '../mock/drilldown-details';

// ── Continent level ──

export async function getContinentDetail(
  continentName: string,
  options?: Parameters<typeof statisticsApi.getDashboardContinentDetail>[1],
) {
  return statisticsApi.getDashboardContinentDetail(continentName, options);
}

export async function getContinentTopAirports(
  continentName: string,
  options?: Parameters<typeof statisticsApi.getDashboardTopAirportsContinent>[1],
) {
  return statisticsApi.getDashboardTopAirportsContinent(continentName, options);
}

export async function getContinentTopRoutes(
  continentName: string,
  options?: Parameters<typeof statisticsApi.getDashboardTopRoutesContinent>[1],
) {
  return statisticsApi.getDashboardTopRoutesContinent(continentName, options);
}

export async function getContinentTrends(
  continentName: string,
  options?: Parameters<typeof statisticsApi.getDashboardContinentTrends>[1],
) {
  return statisticsApi.getDashboardContinentTrends(continentName, options);
}

export async function getCountryOverview(
  countryName: string,
  options?: Parameters<typeof statisticsApi.getDashboardCountryOverview>[1],
) {
  return statisticsApi.getDashboardCountryOverview(countryName, options);
}

export async function getCountryFlowMap(
  countryName: string,
  options?: Parameters<typeof statisticsApi.getDashboardCountryFlowMap>[1],
) {
  return statisticsApi.getDashboardCountryFlowMap(countryName, options);
}

// ── Dashboard/World level (date bounds, cache, summaries, ranks, rankings) ──

export async function getDashboardDateBounds(
  signal?: AbortSignal,
) {
  return statisticsApi.getDashboardDateBounds(signal);
}

export async function getDashboardCacheStatus(
  signal?: AbortSignal,
) {
  return statisticsApi.getDashboardCacheStatus(signal);
}

export async function getDashboardSummary(
  options?: Parameters<typeof statisticsApi.getDashboardSummary>[0],
) {
  return statisticsApi.getDashboardSummary(options);
}

export async function getDashboardTopRanks(
  options?: Parameters<typeof statisticsApi.getDashboardTopRanks>[0],
) {
  return statisticsApi.getDashboardTopRanks(options);
}

export async function getDashboardTopCountries(
  options?: Parameters<typeof statisticsApi.getDashboardTopCountries>[0],
) {
  return statisticsApi.getDashboardTopCountries(options);
}

export async function getDashboardTopAirports(
  options?: Parameters<typeof statisticsApi.getDashboardTopAirports>[0],
) {
  return statisticsApi.getDashboardTopAirports(options);
}

export async function getDashboardTopDestinations(
  options?: Parameters<typeof statisticsApi.getDashboardTopDestinations>[0],
) {
  return statisticsApi.getDashboardTopDestinations(options);
}

// ── Country level ──

export function getCountryAirports(countryName: string): AirportInfo[] {
  return COUNTRY_AIRPORTS[countryName] || MK_AIRPORTS;
}

export function getCountryTopAirline(countryName: string): string {
  return COUNTRY_TOP_AIRLINES[countryName] || 'Local Carrier';
}

/** Market share % for the designated top airline, if present in `getCountryAirlineMarketShare` rows. */
export function getCountryTopAirlineSharePercent(countryName: string): number | undefined {
  const topName = getCountryTopAirline(countryName);
  const rows = getCountryAirlineMarketShare(countryName);
  return rows.find((r) => r.name === topName)?.share;
}

export function getCountryInbound(countryName: string): InboundCountry[] {
  return COUNTRY_INBOUND[countryName] || MK_INBOUND_COUNTRIES;
}

export function getCountryAirlineMarketShare(countryName: string): CountryAirlineShare[] {
  const byCountry = COUNTRY_AIRLINE_MARKET[countryName];
  if (byCountry && byCountry.length) return byCountry;

  // Fallback from airport-level airline mix when country-specific market is unavailable.
  const top5 = AIRLINES
    .filter((airline) => airline.name.toLowerCase() !== 'others')
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const total = AIRLINES.reduce((sum, airline) => sum + airline.count, 0) || 1;
  const avgShare = top5.length
    ? top5.reduce((sum, airline) => sum + (airline.count / total) * 100, 0) / top5.length
    : 0;

  return top5.map((airline) => {
    const share = (airline.count / total) * 100;
    return {
      name: airline.name,
      flights: airline.count,
      share: Number(share.toFixed(1)),
      delta: Number((share - avgShare).toFixed(1)),
      color: airline.color,
    };
  });
}

export async function getAirportOverview(
  airportCode: string,
  options?: Parameters<typeof statisticsApi.getDashboardAirportOverview>[1],
) {
  return statisticsApi.getDashboardAirportOverview(airportCode, options);
}

export async function getAirportInsights(
  airportCode: string,
  options?: Parameters<typeof statisticsApi.getDashboardAirportInsights>[1],
) {
  return statisticsApi.getDashboardAirportInsights(airportCode, options);
}

const THAI_MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'] as const;

export interface AirportTrendSeries {
  daily: Array<{ date: string; departureFlights: number; arrivalFlights: number; flights: number; cancelledFlights: number; delta: number | null }>;
  monthly: Array<{ month: number; departureFlights: number; arrivalFlights: number; flights: number; cancelledFlights: number }>;
  monthLabels: string[];
}

export async function getAirportTrends(
  airportCode: string,
  options?: Parameters<typeof statisticsApi.getDashboardAirportTrends>[1],
): Promise<AirportTrendSeries> {
  const response = await statisticsApi.getDashboardAirportTrends(airportCode, options);
  const monthly = Array.from({ length: 12 }, (_, idx) => {
    const monthNumber = idx + 1;
    const point = response.monthly.find((row) => row.month === monthNumber);
    return point
      ? {
          month: monthNumber,
          departureFlights: point.departureFlights ?? Math.round(point.flights * 0.5),
          arrivalFlights: point.arrivalFlights ?? (point.flights - Math.round(point.flights * 0.5)),
          flights: point.flights,
          cancelledFlights: point.cancelledFlights ?? 0,
        }
      : {
          month: monthNumber,
          departureFlights: 0,
          arrivalFlights: 0,
          flights: 0,
          cancelledFlights: 0,
        };
  });

  return {
    daily: response.daily.map((point) => ({
      date: point.date,
      departureFlights: point.departureFlights ?? Math.round(point.flights * 0.5),
      arrivalFlights: point.arrivalFlights ?? (point.flights - Math.round(point.flights * 0.5)),
      flights: point.flights,
      cancelledFlights: point.cancelledFlights ?? 0,
      delta: point.deltaPercent,
    })),
    monthly,
    monthLabels: [...THAI_MONTH_LABELS],
  };
}

// ── Airport level ──

/**
 * Fetch detail data for a specific airport.
 * Currently returns the same mock dataset for all airports —
 * parameterized by `iata` so the real API can be wired in later.
 */
export function getAirportDetail(_iata?: string) {
  // Future: look up per-airport data by IATA code
  return {
    routes: ROUTES,
    arrivals: ARRIVALS,
    airlines: AIRLINES,
    hourTotal: HOUR_TOTAL,
    hourTotalArr: HOUR_TOTAL_ARR,
    daily: DAILY,
    investRoutes: INVEST_ROUTES,
    monthly: AIRPORT_MONTHLY,
    monthLabels: AIRPORT_MONTH_LABELS,
  };
}

/** Build an AirportInfo from a BusiestAirport record (world-level shortcut). */
export function airportInfoFromBusiest(a: BusiestAirport): AirportInfo {
  return {
    iata: a.iata,
    name: `${a.city}, ${a.country}`,
    flights: a.total,
    routes: Math.round(a.total / 8),
    airlines: Math.round(a.total / 50),
    color: 'var(--chart-1)',
  };
}
