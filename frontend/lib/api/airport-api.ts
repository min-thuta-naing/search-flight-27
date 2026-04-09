// Airport API client

import { apiClient } from './client'

export interface Airport {
  id: number
  code: string
  name: string
  city: string | null
  country: string | null
  country_code: string | null
  country_name: string | null
  airport_type: string | null
  latitude: number | null
  longitude: number | null
  has_flight?: boolean
  created_at?: string
  updated_at?: string
}

export interface AirportCountrySummary {
  country: string
  country_code: string | null
  airport_count: number
  continent_key: string
  continent_label: string
  continent_icon: string
}

export interface AirportCountriesResponse {
  countries: AirportCountrySummary[]
  totalCountries: number
  totalAirports: number
}

export class AirportApi {
  /**
   * Search airports and cities. Returns items and total matching count.
   */
  async searchAirports(
    keyword: string,
    subType: 'AIRPORT' | 'CITY' = 'AIRPORT'
  ): Promise<{ data: Airport[]; total: number }> {
    const res = await apiClient.get<{ data: Airport[]; total: number }>('/airports/search', {
      keyword,
      subType,
    })
    return { data: res?.data ?? [], total: res?.total ?? 0 }
  }

  /**
   * Get airport countries summary for lazy-loading dropdowns.
   */
  async getAirportCountries(): Promise<AirportCountriesResponse> {
    return apiClient.get<AirportCountriesResponse>('/airports/countries')
  }

  /**
   * Get all airports for a single country.
   */
  async getAirportsByCountry(country: string): Promise<{ country: string; airports: Airport[]; total: number }> {
    return apiClient.get<{ country: string; airports: Airport[]; total: number }>('/airports/by-country', {
      country,
    })
  }

  /**
   * Get popular airports
   */
  async getPopularAirports(limit: number = 10): Promise<Airport[]> {
    return apiClient.get<Airport[]>('/airports/popular', { limit })
  }

  /**
   * Get airport details by code
   */
  async getAirportDetails(code: string): Promise<Airport> {
    return apiClient.get<Airport>(`/airports/${code.toUpperCase()}`)
  }

  /**
   * Get total number of airports in the system
   */
  async getTotalCount(): Promise<number> {
    const res = await apiClient.get<{ total: number }>('/airports/count')
    return res?.total ?? 0
  }
}

export const airportApi = new AirportApi()

