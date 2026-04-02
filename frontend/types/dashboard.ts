// ============================================================
// Dashboard Types — based on FlightDashboard_Implementation_Plan.md
// ============================================================

// --- Filter Types ---
export interface FilterState {
  continent: string;
  country: string;
  city: string;
  airport: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  continents: FilterOption[];
  countries: FilterOption[];
  cities: FilterOption[];
  airports: FilterOption[];
}

// --- Overview Tab Types ---
export interface OverviewSummary {
  airportName: string;
  airportNameTh: string;
  iataCode: string;
  totalFlights: number;
  mainAirport: string;
  peakSeasonRange: string;
  growthRate: number;
}

export interface DailyTrendPoint {
  date: string;
  departures: number;
  arrivals: number;
  total: number;
}

export interface SeasonalData {
  month: string;
  monthShort: string;
  flights: number;
  season: 'peak' | 'low';
}

export interface SeasonSummary {
  peakRange: string;
  peakFlights: number;
  lowRange: string;
  lowFlights: number;
}

// --- Flight Analysis Tab Types ---
export type GroupByMode = 'airport' | 'airline';

export interface MonthlyTrendSeries {
  code: string;
  name: string;
  color: string;
}

export interface MonthlyTrendPoint {
  month: string;
  [key: string]: number | string; // dynamic keys for each airport/airline code
}

export interface MarketShareItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
  [key: string]: string | number;
}

export interface FlightRatio {
  category: 'domestic' | 'international';
  label: string;
  value: number;
  percentage: number;
  color: string;
  [key: string]: string | number;
}

export interface Top5RouteItem {
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  flights: number;
  growthRate: number;
}

export interface Top5Data {
  popular: Top5RouteItem[];
  growing: Top5RouteItem[];
  totalArrivals: number;
  totalDepartures: number;
  arrivalGrowth: number;
  departureGrowth: number;
}

// --- Drill-Down Dashboard Types ---
export type DrillLevel = 'world' | 'continent' | 'country' | 'airport';
export type TimeMode = 'wow' | 'mom' | 'yoy';

export interface KPICard {
  label: string;
  value: string;
  delta: string;
  deltaType: 'up' | 'down' | 'neutral';
  accentColor: string;
}

export interface BusiestAirport {
  rank: number;
  iata: string;
  city: string;
  country: string;
  flag: string;
  dep: number;
  arr: number;
  total: number;
  yoy: number;
  yoyN: number;
  mom: number;
  momN: number;
  wow: number;
  wowN: number;
}

/** World continent row — `delta` is display copy; growth coloring uses wow/mom/yoy + timeMode thresholds. */
export interface ContinentData {
  name: string;
  icon: string;
  airports: string;
  flights: number;
  delta: string;
  highlight?: boolean;
  yoy: number;
  yoyN: number;
  mom: number;
  momN: number;
  wow: number;
  wowN: number;
}

export interface CountryData {
  flag: string;
  name: string;
  airports: number;
  flights: number;
  delta: string;
  deltaN: number;
  bar: number;
  highlight?: boolean;
}

export interface RouteData {
  city: string;
  country: string;
  x: number;
  y: number;
  flights: number;
  flag: string;
  airlines: string;
  color: string;
}

export interface AirlineData {
  name: string;
  count: number;
  color: string;
}

export interface CountryAirlineShare {
  name: string;
  flights: number;
  share: number;
  delta: number;
  color: string;
}

export interface DailyData {
  date: string;
  flights: number;
  delta: number | null;
}

/** Shared shape for entities that carry WoW / MoM / YoY growth numbers. */
export interface TimeModeMetrics {
  yoy: number;
  yoyN: number;
  mom: number;
  momN: number;
  wow: number;
  wowN: number;
}

export interface WorldDestination extends TimeModeMetrics {
  name: string;
  icon: string;
  iata: string;
  flights: number;
}

export interface TopAirlineWorld {
  rank: number;
  name: string;
  flag: string;
  iata: string;
  ticker?: string;
  exchange?: string;
  flights: number;
  yoy: number;
  yoyN: number;
  mom: number;
  momN: number;
  wow: number;
  wowN: number;
}

export interface RouteRank {
  name: string;
  icon: string;
  routes: number;
  flights: number;
  yoy: number;
  yoyN: number;
  mom: number;
  momN: number;
  wow: number;
  wowN: number;
}

export interface EurTopRoute extends TimeModeMetrics {
  from: string;
  to: string;
  fromFlag: string;
  toFlag: string;
  flights: number;
}

export interface MKAirport {
  iata: string;
  name: string;
  flights: number;
  routes: number;
  airlines: number;
  color: string;
}

/** Generalized airport info (same shape as MKAirport, used across all countries) */
export type AirportInfo = MKAirport;

/** Per-continent detail data — plain objects, no JSX */
export interface ContinentDetailData {
  countryCount: string;
  busiestCountry: { flag: string; nameTh: string };
  busiestDelta: string;
  fastestGrowing: { flag: string; nameTh: string };
  fastestDelta: string;
  countries: CountryData[];
}

export interface InboundCountry {
  name: string;
  flag: string;
  flights: number;
  pct: number;
}

export interface InvestRoute {
  city: string;
  country: string;
  flag: string;
  flights: number;
  airlines: number;
  airlineNames: string;
  yoy: number;
  mom: number;
  wow: number;
  note: string;
}

export interface BreadcrumbItem {
  label: string;
  level: DrillLevel;
}

// --- LLM Takeaway ---
export interface TakeawayRequest {
  filters: FilterState;
  tab: 'overview' | 'analysis';
}

export interface TakeawayResponse {
  insights: string[];
  generatedAt: string;
  cached: boolean;
}
