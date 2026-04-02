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
    key: 'Europe' | 'Asia-Pacific' | 'North America' | 'South America' | 'Africa' | 'Middle East' | 'Oceania' | 'Other';
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
    key: 'Europe' | 'Asia-Pacific' | 'North America' | 'South America' | 'Africa' | 'Middle East' | 'Oceania' | 'Other';
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
  key: 'Europe' | 'Asia-Pacific' | 'North America' | 'South America' | 'Africa' | 'Middle East' | 'Oceania' | 'Other';
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

