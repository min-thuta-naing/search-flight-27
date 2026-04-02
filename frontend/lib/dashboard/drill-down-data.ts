import type {
  BusiestAirport,
  ContinentData,
  CountryData,
  RouteData,
  AirlineData,
  DailyData,
  WorldDestination,
  TopAirlineWorld,
  EurTopRoute,
  MKAirport,
  InboundCountry,
  InvestRoute,
  DrillLevel,
  TimeMode,
  TimeModeMetrics,
} from '@/types/dashboard';

// ============================================================
// SKP coordinates (for route map)
// ============================================================
export const SKP = { x: 346, y: 316 };

// ============================================================
// Routes from SKP
// ============================================================
export const ROUTES: RouteData[] = [
  { city: 'Istanbul', country: 'ตุรกี', x: 423, y: 329, flights: 40, flag: '\u{1F1F9}\u{1F1F7}', airlines: 'Turkish \u00B7 Pegasus \u00B7 AJet', color: '#ffd32a' },
  { city: 'Zurich', country: 'สวิตเซอร์แลนด์', x: 213, y: 234, flights: 20, flag: '\u{1F1E8}\u{1F1ED}', airlines: 'Edelweiss \u00B7 Wizz Air', color: '#ff9f43' },
  { city: 'Belgrade', country: 'เซอร์เบีย', x: 337, y: 274, flights: 16, flag: '\u{1F1F7}\u{1F1F8}', airlines: 'Air Serbia', color: '#ff9f43' },
  { city: 'Vienna', country: 'ออสเตรีย', x: 295, y: 224, flights: 14, flag: '\u{1F1E6}\u{1F1F9}', airlines: 'Austrian \u00B7 Wizz Air', color: '#ff9f43' },
  { city: 'Frankfurt', country: 'เยอรมนี', x: 215, y: 198, flights: 11, flag: '\u{1F1E9}\u{1F1EA}', airlines: 'Lufthansa \u00B7 Wizz Air', color: '#48dbfb' },
  { city: 'Zagreb', country: 'Croatia', x: 291, y: 261, flights: 10, flag: '\u{1F1ED}\u{1F1F7}', airlines: 'Croatia Airlines', color: '#48dbfb' },
  { city: 'Mulhouse', country: 'สวิตเซอร์แลนด์', x: 202, y: 233, flights: 10, flag: '\u{1F1E8}\u{1F1ED}', airlines: 'Wizz Air', color: '#48dbfb' },
  { city: 'Dortmund', country: 'เยอรมนี', x: 203, y: 176, flights: 8, flag: '\u{1F1E9}\u{1F1EA}', airlines: 'Wizz Air', color: '#48dbfb' },
  { city: 'Memmingen', country: 'เยอรมนี', x: 230, y: 229, flights: 8, flag: '\u{1F1E9}\u{1F1EA}', airlines: 'Wizz Air', color: '#48dbfb' },
  { city: 'Izmir', country: 'ตุรกี', x: 406, y: 367, flights: 8, flag: '\u{1F1F9}\u{1F1F7}', airlines: 'Pegasus', color: '#48dbfb' },
  { city: 'Warsaw', country: 'โปแลนด์', x: 342, y: 166, flights: 8, flag: '\u{1F1F5}\u{1F1F1}', airlines: 'LOT \u00B7 Wizz Air', color: '#48dbfb' },
  { city: 'Antalya', country: 'ตุรกี', x: 444, y: 389, flights: 6, flag: '\u{1F1F9}\u{1F1F7}', airlines: 'SunExpress', color: '#54a0ff' },
  { city: 'Malm\u00F6', country: 'Sweden', x: 259, y: 118, flights: 6, flag: '\u{1F1F8}\u{1F1EA}', airlines: 'Wizz Air', color: '#54a0ff' },
  { city: 'Berlin', country: 'เยอรมนี', x: 263, y: 162, flights: 6, flag: '\u{1F1E9}\u{1F1EA}', airlines: 'Wizz Air', color: '#54a0ff' },
  { city: 'Ljubljana', country: 'Slovenia', x: 275, y: 253, flights: 6, flag: '\u{1F1F8}\u{1F1EE}', airlines: 'Wizz Air', color: '#54a0ff' },
  { city: 'Hahn', country: 'เยอรมนี', x: 200, y: 200, flights: 6, flag: '\u{1F1E9}\u{1F1EA}', airlines: 'Wizz Air', color: '#54a0ff' },
  { city: 'Paris', country: 'ฝรั่งเศส', x: 149, y: 214, flights: 6, flag: '\u{1F1EB}\u{1F1F7}', airlines: 'Wizz Air', color: '#54a0ff' },
  { city: 'Brussels', country: 'Belgium', x: 170, y: 191, flights: 4, flag: '\u{1F1E7}\u{1F1EA}', airlines: 'Wizz Air', color: '#54a0ff' },
  { city: 'Bratislava', country: 'Slovakia', x: 303, y: 224, flights: 4, flag: '\u{1F1F8}\u{1F1F0}', airlines: 'Wizz Air', color: '#54a0ff' },
  { city: 'Eindhoven', country: 'เนเธอร์แลนด์', x: 180, y: 178, flights: 4, flag: '\u{1F1F3}\u{1F1F1}', airlines: 'Wizz Air', color: '#54a0ff' },
];

// Reference cities for route map context
export const REF_CITIES = [
  { name: 'London', x: 120, y: 176 }, { name: 'Madrid', x: 86, y: 337 },
  { name: 'Rome', x: 251, y: 318 }, { name: 'Athens', x: 370, y: 374 },
  { name: 'Budapest', x: 322, y: 234 }, { name: 'Prague', x: 274, y: 197 },
  { name: 'Amsterdam', x: 175, y: 163 }, { name: 'Stockholm', x: 310, y: 59 },
  { name: 'Copenhagen', x: 255, y: 115 }, { name: 'Larnaca', x: 473, y: 418 },
];

// ============================================================
// Airlines at SKP
// ============================================================
export const AIRLINES: AirlineData[] = [
  { name: 'Wizz Air', count: 143, color: '#e91e8c' },
  { name: 'Pegasus', count: 24, color: '#ff6b35' },
  { name: 'Air Serbia', count: 16, color: '#003c8f' },
  { name: 'Turkish Airlines', count: 16, color: '#e30a17' },
  { name: 'Austrian', count: 14, color: '#cc0000' },
  { name: 'AJet', count: 12, color: '#2196f3' },
  { name: 'Lufthansa', count: 11, color: '#ffcc00' },
  { name: 'Croatia Airlines', count: 10, color: '#d62b33' },
  { name: 'Others', count: 46, color: '#555' },
];

// ============================================================
// Hourly distribution
// ============================================================
export const HOUR_TOTAL: Record<number, number> = {
  0: 18, 1: 7, 2: 8, 3: 2, 4: 9, 5: 11, 6: 14, 7: 8, 8: 7, 9: 2,
  10: 5, 11: 24, 12: 21, 13: 11, 14: 12, 15: 17, 16: 15, 17: 14,
  18: 12, 19: 29, 20: 27, 21: 3, 22: 5, 23: 11,
};

export const HOUR_TOTAL_ARR: Record<number, number> = {
  0: 12, 1: 5, 2: 6, 3: 3, 4: 7, 5: 9, 6: 11, 7: 10, 8: 13, 9: 6,
  10: 8, 11: 19, 12: 17, 13: 14, 14: 16, 15: 20, 16: 18, 17: 16,
  18: 15, 19: 22, 20: 24, 21: 8, 22: 7, 23: 9,
};

// ============================================================
// Daily breakdown
// ============================================================
export const DAILY: DailyData[] = [
  { date: 'Oct 21', flights: 74, delta: null },
  { date: 'Oct 22', flights: 71, delta: -4.1 },
  { date: 'Oct 23', flights: 75, delta: +5.6 },
  { date: 'Oct 24', flights: 72, delta: -4.0 },
];

// ============================================================
// World: Busiest airports
// ============================================================
export const BUSIEST_AIRPORTS: BusiestAirport[] = [
  { rank: 1, iata: 'ATL', city: 'Atlanta', country: 'สหรัฐฯ', flag: '\u{1F1FA}\u{1F1F8}', dep: 15420, arr: 15380, total: 30800, yoy: +3.2, yoyN: +954, mom: +1.1, momN: +334, wow: +0.4, wowN: +123 },
  { rank: 2, iata: 'DXB', city: 'Dubai', country: 'สหรัฐอาหรับฯ', flag: '\u{1F1E6}\u{1F1EA}', dep: 14210, arr: 14190, total: 28400, yoy: +5.8, yoyN: +1556, mom: +2.3, momN: +638, wow: +1.0, wowN: +282 },
  { rank: 3, iata: 'DFW', city: 'Dallas', country: 'สหรัฐฯ', flag: '\u{1F1FA}\u{1F1F8}', dep: 13560, arr: 13500, total: 27060, yoy: +2.4, yoyN: +634, mom: +0.6, momN: +161, wow: +0.2, wowN: +54 },
  { rank: 4, iata: 'LHR', city: 'London', country: 'สหราชอาณาจักร', flag: '\u{1F1EC}\u{1F1E7}', dep: 12490, arr: 12510, total: 25000, yoy: +1.9, yoyN: +466, mom: -0.3, momN: -75, wow: -0.1, wowN: -25 },
  { rank: 5, iata: 'HND', city: 'Tokyo', country: 'ญี่ปุ่น', flag: '\u{1F1EF}\u{1F1F5}', dep: 12380, arr: 12340, total: 24720, yoy: +4.1, yoyN: +974, mom: +1.5, momN: +366, wow: +0.6, wowN: +148 },
];

// ============================================================
// World: Top 5 airlines globally
// ============================================================
export const TOP_AIRLINES_WORLD: TopAirlineWorld[] = [
  { rank: 1, name: 'American Airlines', flag: '\u{1F1FA}\u{1F1F8}', iata: 'AA', flights: 18420, yoy: +2.1, yoyN: +378, mom: +0.8, momN: +146, wow: +0.3, wowN: +55 },
  { rank: 2, name: 'Delta Air Lines', flag: '\u{1F1FA}\u{1F1F8}', iata: 'DL', flights: 16890, yoy: +3.4, yoyN: +555, mom: +1.2, momN: +201, wow: +0.5, wowN: +84 },
  { rank: 3, name: 'United Airlines', flag: '\u{1F1FA}\u{1F1F8}', iata: 'UA', flights: 15640, yoy: +1.9, yoyN: +292, mom: +0.5, momN: +78, wow: +0.1, wowN: +16 },
  { rank: 4, name: 'Ryanair', flag: '\u{1F1EA}\u{1F1FA}', iata: 'FR', flights: 14280, yoy: +5.6, yoyN: +756, mom: +2.4, momN: +335, wow: +1.1, wowN: +155 },
  { rank: 5, name: 'Southwest Airlines', flag: '\u{1F1FA}\u{1F1F8}', iata: 'WN', flights: 13510, yoy: -0.8, yoyN: -109, mom: -0.3, momN: -41, wow: -0.2, wowN: -27 },
];

// ============================================================
// World: Top 5 departure/arrival destinations
// ============================================================
export const WORLD_TOP_DEP: WorldDestination[] = [
  { name: 'London Heathrow', icon: '\u{1F1EC}\u{1F1E7}', iata: 'LHR', flights: 12490, yoy: +1.9, yoyN: +233, wow: +0.2, wowN: +25, mom: +0.5, momN: +62 },
  { name: 'Dubai Intl', icon: '\u{1F1E6}\u{1F1EA}', iata: 'DXB', flights: 11840, yoy: +5.2, yoyN: +586, wow: +0.9, wowN: +106, mom: +2.1, momN: +243 },
  { name: 'Los Angeles Intl', icon: '\u{1F1FA}\u{1F1F8}', iata: 'LAX', flights: 10920, yoy: +2.8, yoyN: +297, wow: +0.3, wowN: +33, mom: +0.8, momN: +87 },
  { name: 'Tokyo Haneda', icon: '\u{1F1EF}\u{1F1F5}', iata: 'HND', flights: 10380, yoy: +4.1, yoyN: +409, wow: +0.5, wowN: +52, mom: +1.3, momN: +134 },
  { name: 'Paris CDG', icon: '\u{1F1EB}\u{1F1F7}', iata: 'CDG', flights: 9870, yoy: +1.2, yoyN: +117, wow: +0.1, wowN: +10, mom: +0.3, momN: +30 },
];

export const WORLD_TOP_ARR: WorldDestination[] = [
  { name: 'London Heathrow', icon: '\u{1F1EC}\u{1F1E7}', iata: 'LHR', flights: 12510, yoy: +2.0, yoyN: +245, wow: +0.3, wowN: +38, mom: +0.6, momN: +75 },
  { name: 'Dubai Intl', icon: '\u{1F1E6}\u{1F1EA}', iata: 'DXB', flights: 11960, yoy: +5.5, yoyN: +624, wow: +1.0, wowN: +119, mom: +2.2, momN: +258 },
  { name: 'Bangkok Suvarn.', icon: '\u{1F1F9}\u{1F1ED}', iata: 'BKK', flights: 10640, yoy: +7.8, yoyN: +770, wow: +1.2, wowN: +126, mom: +3.0, momN: +310 },
  { name: 'Istanbul Airport', icon: '\u{1F1F9}\u{1F1F7}', iata: 'IST', flights: 10210, yoy: +6.1, yoyN: +586, wow: +0.8, wowN: +81, mom: +2.4, momN: +239 },
  { name: 'Singapore Changi', icon: '\u{1F1F8}\u{1F1EC}', iata: 'SIN', flights: 9480, yoy: +4.3, yoyN: +391, wow: +0.4, wowN: +38, mom: +1.5, momN: +141 },
];

// ============================================================
// Continent: Continents grid
// ============================================================
export const CONTINENTS: ContinentData[] = [
  { name: 'ยุโรป', icon: '\u{1F3F0}', airports: '1,847 สนามบิน \u00B7 52 ประเทศ', flights: 42100, delta: '\u25B2 +1,544 (+3.8%)', highlight: true, yoy: 3.8, yoyN: 1544, mom: 1.2, momN: 500, wow: 0.4, wowN: 168 },
  { name: 'เอเซีย', icon: '\u{26E9}\uFE0F', airports: '2,340 สนามบิน \u00B7 38 ประเทศ', flights: 38520, delta: '\u25B2 +1,870 (+5.1%)', yoy: 5.1, yoyN: 1870, mom: 2.1, momN: 793, wow: 0.8, wowN: 307 },
  { name: 'อเมริกาเหนือ', icon: '\u{1F5FD}', airports: '1,987 สนามบิน \u00B7 3 ประเทศ', flights: 28440, delta: '\u25B2 +337 (+1.2%)', yoy: 1.2, yoyN: 337, mom: 0.4, momN: 113, wow: 0.1, wowN: 28 },
  { name: 'ตะวันออกกลาง', icon: '\u{1F54C}', airports: '412 สนามบิน \u00B7 16 ประเทศ', flights: 8240, delta: '\u25B2 +517 (+6.7%)', yoy: 6.7, yoyN: 517, mom: 2.8, momN: 224, wow: 1.2, wowN: 98 },
  { name: 'อเมริกาใต้', icon: '\u{1F3D4}\uFE0F', airports: '823 สนามบิน \u00B7 12 ประเทศ', flights: 5820, delta: '\u25BC -53 (-0.9%)', yoy: -0.9, yoyN: -53, mom: -0.3, momN: -17, wow: -0.1, wowN: -6 },
  { name: 'แอฟริกา', icon: '\u{1F981}', airports: '653 สนามบิน \u00B7 54 ประเทศ', flights: 1710, delta: '\u25B2 +38 (+2.3%)', yoy: 2.3, yoyN: 38, mom: 0.6, momN: 10, wow: 0.2, wowN: 3 },
];

// ============================================================

// ============================================================
export const COUNTRIES: CountryData[] = [
  { flag: '\u{1F1E9}\u{1F1EA}', name: 'เยอรมนี', airports: 46, flights: 6240, delta: '+2.1%', deltaN: +128, bar: 100 },
  { flag: '\u{1F1EC}\u{1F1E7}', name: 'สหราชอาณาจักร', airports: 38, flights: 5810, delta: '+1.4%', deltaN: +80, bar: 93 },
  { flag: '\u{1F1EB}\u{1F1F7}', name: 'ฝรั่งเศส', airports: 42, flights: 5200, delta: '+0.8%', deltaN: +41, bar: 83 },
  { flag: '\u{1F1EA}\u{1F1F8}', name: 'สเปน', airports: 31, flights: 4820, delta: '+4.2%', deltaN: +194, bar: 77 },
  { flag: '\u{1F1EE}\u{1F1F9}', name: 'อิตาลี', airports: 35, flights: 4440, delta: '+3.1%', deltaN: +133, bar: 71 },
  { flag: '\u{1F1F3}\u{1F1F1}', name: 'เนเธอร์แลนด์', airports: 8, flights: 3100, delta: '+2.5%', deltaN: +76, bar: 50 },
  { flag: '\u{1F1F9}\u{1F1F7}', name: 'ตุรกี', airports: 22, flights: 2980, delta: '+6.8%', deltaN: +190, bar: 48 },
  { flag: '\u{1F1F5}\u{1F1F1}', name: 'โปแลนด์', airports: 11, flights: 1640, delta: '+5.2%', deltaN: +81, bar: 26 },
  { flag: '\u{1F1F7}\u{1F1F8}', name: 'เซอร์เบีย', airports: 3, flights: 820, delta: '+8.1%', deltaN: +61, bar: 13 },
  { flag: '\u{1F1E6}\u{1F1F9}', name: 'ออสเตรีย', airports: 5, flights: 760, delta: '+1.9%', deltaN: +14, bar: 12 },
  { flag: '\u{1F1E8}\u{1F1ED}', name: 'สวิตเซอร์แลนด์', airports: 4, flights: 710, delta: '+2.2%', deltaN: +15, bar: 11 },
  { flag: '\u{1F1F2}\u{1F1F0}', name: 'มาซิโดเนียเหนือ', airports: 2, flights: 292, delta: '+12.4%', deltaN: +32, bar: 5, highlight: true },
];

// ============================================================
// Country: N. Macedonia airports
// ============================================================
export const MK_AIRPORTS: MKAirport[] = [
  { iata: 'SKP', name: 'Skopje Int\'l "Alexander the Great"', flights: 292, routes: 50, airlines: 14, color: '#2563eb' },
  { iata: 'OHD', name: 'Ohrid "St. Paul the Apostle"', flights: 18, routes: 8, airlines: 3, color: '#d29922' },
];
export const MK_TOTAL = MK_AIRPORTS.reduce((s, a) => s + a.flights, 0);

// ============================================================
// Country: Top 5 inbound countries; MK is short for Macedonia 
// ============================================================
export const MK_INBOUND_COUNTRIES: InboundCountry[] = [
  { name: 'ตุรกี', flag: '\u{1F1F9}\u{1F1F7}', flights: 54, pct: 37.2 },
  { name: 'สวิตเซอร์แลนด์', flag: '\u{1F1E8}\u{1F1ED}', flights: 20, pct: 13.8 },
  { name: 'เซอร์เบีย', flag: '\u{1F1F7}\u{1F1F8}', flights: 14, pct: 9.7 },
  { name: 'ออสเตรีย', flag: '\u{1F1E6}\u{1F1F9}', flights: 15, pct: 10.3 },
  { name: 'เยอรมนี', flag: '\u{1F1E9}\u{1F1EA}', flights: 42, pct: 29.0 },
];

// ============================================================
// Airport: Top 5 arrivals
// ============================================================
export const ARRIVALS: RouteData[] = [
  { city: 'Istanbul', country: 'ตุรกี', x: 0, y: 0, flights: 38, flag: '\u{1F1F9}\u{1F1F7}', airlines: 'Turkish \u00B7 Pegasus', color: '#ffd32a' },
  { city: 'Zurich', country: 'สวิตเซอร์แลนด์', x: 0, y: 0, flights: 19, flag: '\u{1F1E8}\u{1F1ED}', airlines: 'Edelweiss \u00B7 Wizz Air', color: '#ff9f43' },
  { city: 'Vienna', country: 'ออสเตรีย', x: 0, y: 0, flights: 15, flag: '\u{1F1E6}\u{1F1F9}', airlines: 'Austrian', color: '#ff9f43' },
  { city: 'Belgrade', country: 'เซอร์เบีย', x: 0, y: 0, flights: 14, flag: '\u{1F1F7}\u{1F1F8}', airlines: 'Air Serbia', color: '#ff9f43' },
  { city: 'Frankfurt', country: 'เยอรมนี', x: 0, y: 0, flights: 10, flag: '\u{1F1E9}\u{1F1EA}', airlines: 'Lufthansa', color: '#48dbfb' },
];

// ============================================================
// Airport: Investment opportunities (Thai language)
// ============================================================
export const INVEST_ROUTES: InvestRoute[] = [
  {
    city: '\u0E25\u0E32\u0E23\u0E4C\u0E19\u0E32\u0E01\u0E32', country: '\u0E44\u0E0B\u0E1B\u0E23\u0E31\u0E2A', flag: '\u{1F1E8}\u{1F1FE}',
    flights: 2, airlines: 1, airlineNames: 'Wizz Air',
    yoy: +48.0, mom: +18.5, wow: +9.2,
    note: '\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E15\u0E32\u0E21\u0E24\u0E14\u0E39\u0E01\u0E32\u0E25\u0E17\u0E35\u0E48\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E08\u0E32\u0E01\u0E0A\u0E32\u0E27\u0E15\u0E48\u0E32\u0E07\u0E0A\u0E32\u0E15\u0E34\u0E41\u0E25\u0E30\u0E19\u0E31\u0E01\u0E17\u0E48\u0E2D\u0E07\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E2A\u0E39\u0E07 \u0E21\u0E35\u0E2A\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1A\u0E34\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27 \u2014 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E41\u0E23\u0E07\u0E01\u0E14\u0E14\u0E31\u0E19\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19',
  },
  {
    city: '\u0E0B\u0E31\u0E19\u0E40\u0E14\u0E1F\u0E22\u0E2D\u0E23\u0E4C', country: '\u0E19\u0E2D\u0E23\u0E4C\u0E40\u0E27\u0E22\u0E4C', flag: '\u{1F1F3}\u{1F1F4}',
    flights: 2, airlines: 1, airlineNames: 'Wizz Air',
    yoy: +40.0, mom: +12.0, wow: +5.5,
    note: '\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E1C\u0E39\u0E49\u0E2D\u0E1E\u0E22\u0E1E\u0E2A\u0E41\u0E01\u0E19\u0E14\u0E34\u0E40\u0E19\u0E40\u0E27\u0E35\u0E22 \u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E40\u0E17\u0E35\u0E22\u0E1A\u0E01\u0E31\u0E1A\u0E2A\u0E19\u0E32\u0E21\u0E1A\u0E34\u0E19\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E15\u0E47\u0E2D\u0E01\u0E42\u0E2E\u0E25\u0E4C\u0E21/\u0E2D\u0E2D\u0E2A\u0E42\u0E25',
  },
  {
    city: '\u0E42\u0E1A\u0E42\u0E25\u0E0D\u0E0D\u0E32', country: '\u0E2D\u0E34\u0E15\u0E32\u0E25\u0E35', flag: '\u{1F1EE}\u{1F1F9}',
    flights: 2, airlines: 1, airlineNames: 'Wizz Air',
    yoy: +35.0, mom: +14.0, wow: +6.8,
    note: '\u0E08\u0E38\u0E14\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E2D\u0E34\u0E15\u0E32\u0E25\u0E35\u0E15\u0E2D\u0E19\u0E40\u0E2B\u0E19\u0E37\u0E2D \u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1A\u0E34\u0E19\u0E14\u0E31\u0E49\u0E07\u0E40\u0E14\u0E34\u0E21 \u0E17\u0E33\u0E1C\u0E25\u0E07\u0E32\u0E19\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E01\u0E27\u0E48\u0E32\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E2A\u0E39\u0E48\u0E42\u0E23\u0E21/\u0E21\u0E34\u0E25\u0E32\u0E19',
  },
  {
    city: '\u0E1A\u0E39\u0E14\u0E32\u0E40\u0E1B\u0E2A\u0E15\u0E4C', country: '\u0E2E\u0E31\u0E07\u0E01\u0E32\u0E23\u0E35', flag: '\u{1F1ED}\u{1F1FA}',
    flights: 2, airlines: 2, airlineNames: 'Wizz Air \u00B7 Ryanair',
    yoy: +25.0, mom: +9.5, wow: +3.2,
    note: '\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E01\u0E32\u0E23\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E2A\u0E2D\u0E07\u0E1D\u0E48\u0E32\u0E22\u0E40\u0E15\u0E34\u0E1A\u0E42\u0E15\u0E02\u0E36\u0E49\u0E19 \u0E41\u0E21\u0E49\u0E21\u0E35 2 \u0E2A\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1A\u0E34\u0E19\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E15\u0E48\u0E04\u0E27\u0E32\u0E21\u0E16\u0E35\u0E48\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E1A\u0E34\u0E19\u0E22\u0E31\u0E07\u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23',
  },
  {
    city: '\u0E40\u0E08\u0E19\u0E35\u0E27\u0E32', country: '\u0E2A\u0E27\u0E34\u0E15\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C', flag: '\u{1F1E8}\u{1F1ED}',
    flights: 2, airlines: 1, airlineNames: 'Wizz Air',
    yoy: +22.0, mom: +8.0, wow: +2.8,
    note: '\u0E1C\u0E2A\u0E21\u0E1C\u0E2A\u0E32\u0E19\u0E19\u0E31\u0E01\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E18\u0E38\u0E23\u0E01\u0E34\u0E08\u0E41\u0E25\u0E30\u0E0A\u0E32\u0E27\u0E15\u0E48\u0E32\u0E07\u0E0A\u0E32\u0E15\u0E34 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1A\u0E34\u0E19\u0E14\u0E31\u0E49\u0E07\u0E40\u0E14\u0E34\u0E21\u0E1A\u0E19\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E19\u0E35\u0E49',
  },
];

// ============================================================
// Investment scoring helpers
// ============================================================
// TODO: Replace with dynamic threshold from API (e.g. max route flights,
// median, or percentile-based benchmark for the selected airport).
// Currently hardcoded to the busiest SKP route as a mock baseline.
const INVEST_REF_FLIGHTS = 40;

export function calcInvestScore(r: InvestRoute, timeMode: TimeMode): number {
  const g = timeMode === 'wow' ? r.wow : timeMode === 'mom' ? r.mom : r.yoy;
  const growthScore = Math.min(Math.max(g, 0) / 60 * 100, 100);
  const underserviceScore = Math.min((1 - r.flights / INVEST_REF_FLIGHTS) * 100, 100);
  const entryScore = r.airlines === 1 ? 100 : r.airlines === 2 ? 55 : 25;
  const allUp = r.wow > 0 && r.mom > 0 && r.yoy > 0;
  const consistencyScore = allUp ? 100 : (r.wow > 0 || r.mom > 0) ? 50 : 0;
  return Math.round(growthScore * 0.40 + underserviceScore * 0.35 + entryScore * 0.15 + consistencyScore * 0.10);
}

export function getInvestTier(score: number) {
  if (score >= 75) return { label: '\u{1F525} \u0E40\u0E23\u0E48\u0E07\u0E14\u0E48\u0E27\u0E19', cls: 'invest-prime', color: '#16a34a', action: '\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E40\u0E02\u0E49\u0E32\u0E15\u0E25\u0E32\u0E14\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19 \u2014 \u0E40\u0E1B\u0E34\u0E14\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E1A\u0E34\u0E19 3-4 \u0E40\u0E17\u0E35\u0E48\u0E22\u0E27/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E47\u0E19\u0E1C\u0E39\u0E49\u0E1A\u0E38\u0E01\u0E40\u0E1A\u0E34\u0E01\u0E01\u0E48\u0E2D\u0E19\u0E04\u0E39\u0E48\u0E41\u0E02\u0E48\u0E07' };
  if (score >= 58) return { label: '\u{1F4C8} \u0E41\u0E19\u0E30\u0E19\u0E33', cls: 'invest-strong', color: '#2563eb', action: '\u0E42\u0E2D\u0E01\u0E32\u0E2A\u0E14\u0E35 \u2014 \u0E40\u0E23\u0E34\u0E48\u0E21 2 \u0E40\u0E17\u0E35\u0E48\u0E22\u0E27/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C \u0E41\u0E25\u0E49\u0E27\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E43\u0E19 8 \u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C' };
  if (score >= 42) return { label: '\u26A1 \u0E15\u0E34\u0E14\u0E15\u0E32\u0E21', cls: 'invest-watch', color: '#ca8a04', action: '\u0E42\u0E21\u0E40\u0E21\u0E19\u0E15\u0E31\u0E21\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19 \u2014 \u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2D\u0E35\u0E01 1-2 \u0E23\u0E2D\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E43\u0E08\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E17\u0E35\u0E48\u0E22\u0E27\u0E1A\u0E34\u0E19' };
  return { label: '\u{1F440} \u0E23\u0E2D\u0E14\u0E39\u0E01\u0E48\u0E2D\u0E19', cls: 'invest-early', color: '#6b7280', action: '\u0E1E\u0E1A\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23 \u2014 \u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E23\u0E32\u0E22\u0E44\u0E15\u0E23\u0E21\u0E32\u0E2A \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07' };
}

// ============================================================
// Time mode helper
// ============================================================
export function getChangeForMode(item: TimeModeMetrics, timeMode: TimeMode) {
  if (timeMode === 'wow') return { pct: item.wow, num: item.wowN };
  if (timeMode === 'mom') return { pct: item.mom, num: item.momN };
  return { pct: item.yoy, num: item.yoyN };
}

export type GrowthDeltaKind = 'up' | 'down' | 'neutral';

export function growthDeltaTypeFromPct(pct: number, _timeMode: TimeMode): GrowthDeltaKind {
  if (pct < 0) return 'down';
  return 'up';
}

/** First signed percentage in text, e.g. "(+7.2%)" or "+3.8%". */
export function parseFirstSignedPercent(text: string): number | null {
  const paren = text.match(/\(([+-]?\d+(?:\.\d+)?)%\)/);
  if (paren) return parseFloat(paren[1]);
  const plain = text.match(/([+-]?\d+(?:\.\d+)?)%/);
  if (plain) return parseFloat(plain[1]);
  return null;
}

/** Parse trailing % from country-style deltas like "+2.1%". */
export function parsePercentFromDelta(delta: string): number | null {
  return parseFirstSignedPercent(delta);
}

export function growthTextClass(kind: GrowthDeltaKind): string {
  if (kind === 'up') return 'text-[#16a34a]';
  if (kind === 'down') return 'text-destructive';
  return 'text-primary';
}

export function growthCardBadgeClasses(kind: GrowthDeltaKind): string {
  if (kind === 'up') return 'bg-[#16a34a]/15 text-[#16a34a]';
  if (kind === 'down') return 'bg-destructive/15 text-destructive';
  return 'bg-primary/15 text-primary';
}

export function growthPillSurfaceClasses(kind: GrowthDeltaKind): string {
  if (kind === 'up') return 'bg-[#16a34a]/10 text-[#16a34a]';
  if (kind === 'down') return 'bg-destructive/10 text-destructive';
  return 'bg-primary/10 text-primary';
}

/** Solid bar fill for compact charts (e.g. route growth bars). */
export function growthBarFillClasses(kind: GrowthDeltaKind): string {
  if (kind === 'up') return 'bg-[#16a34a]';
  if (kind === 'down') return 'bg-destructive';
  return 'bg-primary';
}

export function modeLabel(timeMode: TimeMode) {
  if (timeMode === 'wow') return 'การเปลี่ยนแปลง รายสัปดาห์';
  if (timeMode === 'mom') return 'การเปลี่ยนแปลง รายเดือน';
  return 'การเปลี่ยนแปลง รายปี';
}

/** Matches the time toggle: what “previous period” means for copy. */
export function compareToPriorPeriodPhraseTh(timeMode: TimeMode): string {
  if (timeMode === 'wow') return 'เทียบกับสัปดาห์ที่แล้ว';
  if (timeMode === 'mom') return 'เทียบกับเดือนที่แล้ว';
  return 'เทียบกับปีที่แล้ว';
}

/** World / summary KPI line: Δ flights, %, and period wording (aligned with `getChangeForMode`). */
export function fmtWorldKpiDeltaTh(pct: number, num: number, timeMode: TimeMode): string {
  const sign = num >= 0 ? '+' : '';
  const arrow = num >= 0 ? '\u25B2' : '\u25BC';
  return `${arrow} ${sign}${num.toLocaleString()} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%) ${compareToPriorPeriodPhraseTh(timeMode)}`;
}
