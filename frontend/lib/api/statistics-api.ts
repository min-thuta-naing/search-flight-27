// Statistics API client

import { apiClient } from './client';
import type { ContinentDetailData, EurTopRoute } from '@/types/dashboard';

export interface SearchStatRequest {
  origin: string;
  originName?: string;
  destination: string;
  destinationName?: string;
  durationRange?: string;
  tripType?: 'one-way' | 'round-trip' | null;
}

export interface PriceStatRequest {
  origin: string;
  originName?: string;
  destination: string;
  destinationName?: string;
  recommendedPrice: number;
  season: 'high' | 'normal' | 'low';
  airline?: string;
}

export interface StatisticsResponse {
  totalSearches: number;
  mostSearchedDestination: {
    destination: string;
    destination_name: string | null;
    count: number;
  } | null;
  mostSearchedDuration: {
    duration_range: string;
    count: number;
  } | null;
  popularDestinations: Array<{
    destination: string;
    destination_name: string | null;
    count: number;
  }>;
  monthlyStats: Array<{
    month: number;
    month_name: string;
    count: number;
  }>;
}

export interface PriceStatisticsResponse {
  averagePrice: number | null;
  priceTrend: {
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  } | null;
  searchTrend?: {  // ✅ เพิ่ม search trend
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  } | null;
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
  busiestContinent: {
    key: string;
    label: string;
    icon: string;
    airportCount: number;
    countryCount: number;
    routeCount: number;
    flights: number;
    previousFlights: number;
    deltaFlights: number;
    deltaPercent: number;
  };
  continentBreakdown: Array<{
    key: string;
    label: string;
    icon: string;
    airportCount: number;
    countryCount: number;
    routeCount: number;
    flights: number;
    previousFlights: number;
    deltaFlights: number;
    deltaPercent: number;
  }>;
}

export interface DashboardContinentCardResponse {
  key: string;
  label: string;
  icon: string;
  airports: string;
  airportCount: number;
  countryCount: number;
  routeCount?: number;
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

export interface DashboardContinentsResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  continents: DashboardContinentCardResponse[];
}

export interface DashboardTopCountryRankResponse {
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

export interface DashboardTopAirportRankResponse {
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
  countries: DashboardTopCountryRankResponse[];
  airports: DashboardTopAirportRankResponse[];
}

export interface DashboardTopCountriesResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  countries: DashboardTopCountryRankResponse[];
}

export interface DashboardTopAirportsResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  airports: DashboardTopAirportRankResponse[];
}

export interface DashboardTopDestinationsResponse {
  centerDate: string;
  windowDays: number;
  periodStart: string;
  periodEnd: string;
  comparisonStart: string;
  comparisonEnd: string;
  departures: DashboardTopAirportRankResponse[];
  arrivals: DashboardTopAirportRankResponse[];
}

export interface DashboardCountryAirportBreakdownResponse {
  iata: string;
  name: string;
  flights: number;
  routes: number;
  airlines: number;
}

export interface DashboardCountryInboundBreakdownResponse {
  flag: string;
  name: string;
  flights: number;
  pct: number;
}

export interface DashboardCountryAirlineBreakdownResponse {
  name: string;
  flights: number;
  share: number;
  delta: number;
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
  airports: DashboardCountryAirportBreakdownResponse[];
  inbound: DashboardCountryInboundBreakdownResponse[];
  airlineMarket: DashboardCountryAirlineBreakdownResponse[];
  topAirline: {
    name: string;
    sharePercent: number | null;
  };
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

export interface DashboardAirportTrendDailyPointResponse {
  date: string;
  departureFlights: number;
  arrivalFlights: number;
  flights: number;
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
  daily: DashboardAirportTrendDailyPointResponse[];
  monthly: Array<{
    month: number;
    departureFlights: number;
    arrivalFlights: number;
    flights: number;
  }>;
}

export interface DashboardAirportInsightRouteResponse {
  iata: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  flights: number;
}

export interface DashboardAirportInsightAirlineResponse {
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
  topDepartureRoutes: DashboardAirportInsightRouteResponse[];
  topArrivalRoutes: DashboardAirportInsightRouteResponse[];
  airlineShare: DashboardAirportInsightAirlineResponse[];
  hourlyDistribution: {
    departure: number[];
    arrival: number[];
  };
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
  detail: ContinentDetailData;
  topRoutes: EurTopRoute[];
}

export interface DashboardContinentTopAirportRankResponse extends DashboardTopAirportRankResponse {
  departureFlights: number;
  arrivalFlights: number;
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
    key: string;
    label: string;
    icon: string;
  };
  airports: DashboardContinentTopAirportRankResponse[];
}

export interface DashboardContinentTopRouteRankResponse {
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
    key: string;
    label: string;
    icon: string;
  };
  routes: DashboardContinentTopRouteRankResponse[];
}

export type DashboardContinentTrendMode = 'day' | 'month' | 'year';

export interface DashboardContinentTrendPointResponse {
  key: string;
  label: string;
  inboundAvg: number;
  outboundAvg: number;
  totalAvg: number;
  highlight: boolean;
}

export interface DashboardContinentTrendModeDataResponse {
  mode: DashboardContinentTrendMode;
  status: 'ready' | 'unavailable';
  message: string | null;
  points: DashboardContinentTrendPointResponse[];
}

export interface DashboardContinentTrendsResponse {
  continent: {
    key: string;
    label: string;
    icon: string;
  };
  generatedAt: string;
  modes: {
    day: DashboardContinentTrendModeDataResponse;
    month: DashboardContinentTrendModeDataResponse;
    year: DashboardContinentTrendModeDataResponse;
  };
}

export interface DashboardDateBoundsResponse {
  minDate: string | null;
  maxDate: string | null;
  recommendedEndDate: string;
}

export interface DashboardCacheStatusResponse {
  success: boolean;
  queryCache: {
    cacheEntries: number;
    inFlightEntries: number;
  };
  memoryCache: {
    continentDetail: number;
    continentTopAirports: number;
    continentTopRoutes: number;
    continentTrends: number;
    continentAirportCodes: number;
    flightPathColumns: number;
    flightPathColumnTypes: number;
  };
  preload: {
    phase: 'idle' | 'running' | 'completed' | 'failed';
    startedAt: string | null;
    finishedAt: string | null;
    attempted: number;
    failed: number;
    durationMs: number;
    durationMinutes: number;
    error: string | null;
  };
  totalEntries: number;
}

export interface DashboardQueryOptions {
  date?: string;
  windowDays?: number;
  startDate?: string;
  endDate?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  includeCore?: boolean;
  includeSeasonal?: boolean;
  includeTopRoutes?: boolean;
}

export class StatisticsApi {
  /**
   * Save a search query to the database
   */
  async saveSearch(search: SearchStatRequest, signal?: AbortSignal): Promise<{ success: boolean; id: number }> {
    return apiClient.post<{ success: boolean; id: number }>('/statistics/search', search, { signal });
  }

  /**
   * Save a price recommendation to the database
   */
  async savePriceStat(priceStat: PriceStatRequest, signal?: AbortSignal): Promise<{ success: boolean; id: number }> {
    return apiClient.post<{ success: boolean; id: number }>('/statistics/price', priceStat, { signal });
  }

  /**
   * Get all statistics
   */
  async getStatistics(destination?: string, signal?: AbortSignal): Promise<StatisticsResponse> {
    return apiClient.get<StatisticsResponse>('/statistics', { destination }, { signal });
  }

  /**
   * Get price statistics
   */
  async getPriceStatistics(origin?: string, destination?: string, signal?: AbortSignal): Promise<PriceStatisticsResponse> {
    return apiClient.get<PriceStatisticsResponse>('/statistics/price', {
      origin,
      destination,
    }, { signal });
  }

  /**
   * Get global min/max data bounds for dashboard preset calculations.
   */
  async getDashboardDateBounds(signal?: AbortSignal): Promise<DashboardDateBoundsResponse> {
    return apiClient.get<DashboardDateBoundsResponse>('/statistics/dashboard-date-bounds', {}, { signal });
  }

  /**
   * Get current backend dashboard cache status.
   */
  async getDashboardCacheStatus(signal?: AbortSignal): Promise<DashboardCacheStatusResponse> {
    return apiClient.get<DashboardCacheStatusResponse>('/statistics/dashboard-cache/status', {}, { signal, timeoutMs: 5000 });
  }

  /**
   * Get world dashboard summary from flight data
   */
  async getDashboardSummary(options: DashboardQueryOptions = {}): Promise<DashboardSummaryResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
    } = options;

    return apiClient.get<DashboardSummaryResponse>('/statistics/dashboard-summary', {
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
    }, { signal });
  }

  /**
   * Get continent cards for the world dashboard
   */
  async getDashboardContinents(options: DashboardQueryOptions = {}): Promise<DashboardContinentsResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
    } = options;

    return apiClient.get<DashboardContinentsResponse>('/statistics/dashboard-continents', {
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
    }, { signal });
  }

  /**
   * Get continent detail for the drill-down dashboard
   */
  async getDashboardContinentDetail(
    continent: string,
    options: DashboardQueryOptions = {},
  ): Promise<DashboardContinentDetailResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
      timeoutMs = 60000,
      includeCore = true,
      includeSeasonal = true,
      includeTopRoutes = true,
    } = options;

    return apiClient.get<DashboardContinentDetailResponse>('/statistics/dashboard-continent-detail', {
      continent,
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
      include_core: includeCore,
      include_seasonal: includeSeasonal,
      include_top_routes: includeTopRoutes,
    }, { signal, timeoutMs });
  }

  /**
   * Get top airports for a specific continent using an airport-focused query
   */
  async getDashboardTopAirportsContinent(
    continent: string,
    options: DashboardQueryOptions & { limit?: number } = {},
  ): Promise<DashboardContinentTopAirportsResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
      timeoutMs = 60000,
      limit = 10,
    } = options;

    return apiClient.get<DashboardContinentTopAirportsResponse>('/statistics/dashboard-top-airports-continent', {
      continent,
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
      limit,
    }, { signal, timeoutMs });
  }

  /**
   * Get top routes for a specific continent using a route-focused query
   */
  async getDashboardTopRoutesContinent(
    continent: string,
    options: DashboardQueryOptions & { limit?: number } = {},
  ): Promise<DashboardContinentTopRoutesResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
      timeoutMs = 60000,
      limit = 5,
    } = options;

    return apiClient.get<DashboardContinentTopRoutesResponse>('/statistics/dashboard-top-routes-continent', {
      continent,
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
      limit,
    }, { signal, timeoutMs });
  }

  /**
   * Get continent trend averages prepared by backend for day/month/year chart modes
   */
  async getDashboardContinentTrends(
    continent: string,
    options: Pick<DashboardQueryOptions, 'signal' | 'timeoutMs'> = {},
  ): Promise<DashboardContinentTrendsResponse> {
    const {
      signal,
      timeoutMs = 60000,
    } = options;

    return apiClient.get<DashboardContinentTrendsResponse>('/statistics/dashboard-continent-trends', {
      continent,
    }, { signal, timeoutMs });
  }

  /**
   * Get top country and airport ranks for the world dashboard
   */
  async getDashboardTopRanks(options: DashboardQueryOptions = {}): Promise<DashboardTopRanksResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
    } = options;

    return apiClient.get<DashboardTopRanksResponse>('/statistics/dashboard-top-ranks', {
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
    }, { signal });
  }

  /**
   * Get country overview for drill-down dashboard.
   */
  async getDashboardCountryOverview(
    country: string,
    options: DashboardQueryOptions = {},
  ): Promise<DashboardCountryOverviewResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
      timeoutMs = 60000,
    } = options;

    return apiClient.get<DashboardCountryOverviewResponse>('/statistics/dashboard-country-overview', {
      country,
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
    }, { signal, timeoutMs });
  }

  /**
   * Get airport overview KPI payload for airport drill-down dashboard.
   */
  async getDashboardAirportOverview(
    airport: string,
    options: DashboardQueryOptions = {},
  ): Promise<DashboardAirportOverviewResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
      timeoutMs = 60000,
    } = options;

    return apiClient.get<DashboardAirportOverviewResponse>('/statistics/dashboard-airport-overview', {
      airport,
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
    }, { signal, timeoutMs });
  }

  /**
   * Get airport insights payload for airport drill-down panels.
   */
  async getDashboardAirportInsights(
    airport: string,
    options: DashboardQueryOptions & { routeLimit?: number; airlineLimit?: number } = {},
  ): Promise<DashboardAirportInsightsResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
      timeoutMs = 60000,
      routeLimit = 5,
      airlineLimit = 8,
    } = options;

    return apiClient.get<DashboardAirportInsightsResponse>('/statistics/dashboard-airport-insights', {
      airport,
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
      route_limit: routeLimit,
      airline_limit: airlineLimit,
    }, { signal, timeoutMs });
  }

  /**
   * Get airport trend series for airport drill-down trend charts.
   */
  async getDashboardAirportTrends(
    airport: string,
    options: Pick<DashboardQueryOptions, 'date' | 'signal' | 'timeoutMs'> = {},
  ): Promise<DashboardAirportTrendsResponse> {
    const {
      date,
      signal,
      timeoutMs = 60000,
    } = options;

    return apiClient.get<DashboardAirportTrendsResponse>('/statistics/dashboard-airport-trends', {
      airport,
      date,
    }, { signal, timeoutMs });
  }

  /**
   * Get top countries for the world dashboard
   */
  async getDashboardTopCountries(options: DashboardQueryOptions = {}): Promise<DashboardTopCountriesResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
    } = options;

    return apiClient.get<DashboardTopCountriesResponse>('/statistics/dashboard-top-countries', {
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
    }, { signal });
  }

  /**
   * Get top airports for the world dashboard
   */
  async getDashboardTopAirports(options: DashboardQueryOptions = {}): Promise<DashboardTopAirportsResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
    } = options;

    return apiClient.get<DashboardTopAirportsResponse>('/statistics/dashboard-top-airports', {
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
    }, { signal });
  }

  /**
   * Get top destinations for the world dashboard
   */
  async getDashboardTopDestinations(options: DashboardQueryOptions = {}): Promise<DashboardTopDestinationsResponse> {
    const {
      date,
      windowDays = 15,
      startDate,
      endDate,
      signal,
    } = options;

    return apiClient.get<DashboardTopDestinationsResponse>('/statistics/dashboard-top-destinations', {
      date,
      window_days: windowDays,
      start_date: startDate,
      end_date: endDate,
    }, { signal });
  }
}

export const statisticsApi = new StatisticsApi();

