export type ContinentKey =
  | 'Europe'
  | 'Asia-Pacific'
  | 'North America'
  | 'South America'
  | 'Africa'
  | 'Middle East'
  | 'Oceania'
  | 'Other';

export interface ContinentMeta {
  key: ContinentKey;
  label: string;
  icon: string;
}

const CONTINENT_META: Record<ContinentKey, ContinentMeta> = {
  Europe: { key: 'Europe', label: 'Europe', icon: '🏰' },
  'Asia-Pacific': { key: 'Asia-Pacific', label: 'Asia-Pacific', icon: '🌏' },
  'North America': { key: 'North America', label: 'North America', icon: '🌎' },
  'South America': { key: 'South America', label: 'South America', icon: '🌎' },
  Africa: { key: 'Africa', label: 'Africa', icon: '🦁' },
  'Middle East': { key: 'Middle East', label: 'Middle East', icon: '🕌' },
  Oceania: { key: 'Oceania', label: 'Oceania', icon: '🌏' },
  Other: { key: 'Other', label: 'Other', icon: '🌐' },
};

const COUNTRY_CODE_TO_CONTINENT: Record<string, ContinentKey> = {
  // Asia-Pacific
  TH: 'Asia-Pacific',
  JP: 'Asia-Pacific',
  KR: 'Asia-Pacific',
  CN: 'Asia-Pacific',
  TW: 'Asia-Pacific',
  HK: 'Asia-Pacific',
  SG: 'Asia-Pacific',
  VN: 'Asia-Pacific',
  MY: 'Asia-Pacific',
  ID: 'Asia-Pacific',
  PH: 'Asia-Pacific',
  KH: 'Asia-Pacific',
  LA: 'Asia-Pacific',
  MM: 'Asia-Pacific',
  BN: 'Asia-Pacific',
  BD: 'Asia-Pacific',
  IN: 'Asia-Pacific',
  PK: 'Asia-Pacific',
  LK: 'Asia-Pacific',
  NP: 'Asia-Pacific',
  BT: 'Asia-Pacific',

  // Europe
  DE: 'Europe',
  GB: 'Europe',
  FR: 'Europe',
  ES: 'Europe',
  IT: 'Europe',
  NL: 'Europe',
  BE: 'Europe',
  CH: 'Europe',
  AT: 'Europe',
  PL: 'Europe',
  PT: 'Europe',
  SE: 'Europe',
  NO: 'Europe',
  FI: 'Europe',
  DK: 'Europe',
  IE: 'Europe',
  IS: 'Europe',
  GR: 'Europe',
  TR: 'Europe',
  HU: 'Europe',
  CZ: 'Europe',
  SK: 'Europe',
  SI: 'Europe',
  HR: 'Europe',
  RS: 'Europe',
  BA: 'Europe',
  BG: 'Europe',
  RO: 'Europe',
  UA: 'Europe',
  ME: 'Europe',
  MK: 'Europe',
  AL: 'Europe',
  LT: 'Europe',
  LV: 'Europe',
  EE: 'Europe',
  LU: 'Europe',
  MT: 'Europe',
  CY: 'Europe',

  // North America
  US: 'North America',
  CA: 'North America',
  MX: 'North America',
  PR: 'North America',
  PA: 'North America',
  CR: 'North America',
  GT: 'North America',
  HN: 'North America',
  SV: 'North America',
  NI: 'North America',
  JM: 'North America',
  DO: 'North America',
  BS: 'North America',
  BB: 'North America',
  TT: 'North America',

  // South America
  BR: 'South America',
  AR: 'South America',
  CL: 'South America',
  CO: 'South America',
  PE: 'South America',
  UY: 'South America',
  PY: 'South America',
  BO: 'South America',
  EC: 'South America',
  VE: 'South America',
  GY: 'South America',
  SR: 'South America',

  // Africa
  ZA: 'Africa',
  EG: 'Africa',
  MA: 'Africa',
  KE: 'Africa',
  ET: 'Africa',
  NG: 'Africa',
  GH: 'Africa',
  TN: 'Africa',
  DZ: 'Africa',
  SN: 'Africa',
  TZ: 'Africa',
  UG: 'Africa',
  RW: 'Africa',
  ZM: 'Africa',
  ZW: 'Africa',
  MW: 'Africa',
  MU: 'Africa',
  SC: 'Africa',
  MZ: 'Africa',
  AO: 'Africa',

  // Middle East
  AE: 'Middle East',
  SA: 'Middle East',
  QA: 'Middle East',
  OM: 'Middle East',
  BH: 'Middle East',
  KW: 'Middle East',
  JO: 'Middle East',
  IL: 'Middle East',
  LB: 'Middle East',
  IQ: 'Middle East',
  IR: 'Middle East',
  SY: 'Middle East',
  YE: 'Middle East',
  PS: 'Middle East',
  TM: 'Middle East',

  // Oceania
  FJ: 'Oceania',
  PG: 'Oceania',
  NC: 'Oceania',
  SB: 'Oceania',
  VU: 'Oceania',
  TO: 'Oceania',
  WS: 'Oceania',
  KI: 'Oceania',
  NR: 'Oceania',
  TV: 'Oceania',
  AU: 'Oceania',
  NZ: 'Oceania',
};

const COUNTRY_NAME_TO_CONTINENT: Record<string, ContinentKey> = {
  // Asia-Pacific
  thailand: 'Asia-Pacific',
  japan: 'Asia-Pacific',
  'south korea': 'Asia-Pacific',
  korea: 'Asia-Pacific',
  china: 'Asia-Pacific',
  taiwan: 'Asia-Pacific',
  hongkong: 'Asia-Pacific',
  hong_kong: 'Asia-Pacific',
  singapore: 'Asia-Pacific',
  vietnam: 'Asia-Pacific',
  malaysia: 'Asia-Pacific',
  indonesia: 'Asia-Pacific',
  philippines: 'Asia-Pacific',
  cambodia: 'Asia-Pacific',
  laos: 'Asia-Pacific',
  myanmar: 'Asia-Pacific',
  'brunei': 'Asia-Pacific',
  bangladesh: 'Asia-Pacific',
  india: 'Asia-Pacific',
  pakistan: 'Asia-Pacific',
  nepal: 'Asia-Pacific',
  bhutan: 'Asia-Pacific',
  australia: 'Asia-Pacific',
  'new zealand': 'Asia-Pacific',

  // Europe
  germany: 'Europe',
  'united kingdom': 'Europe',
  uk: 'Europe',
  france: 'Europe',
  spain: 'Europe',
  italy: 'Europe',
  netherlands: 'Europe',
  belgium: 'Europe',
  switzerland: 'Europe',
  austria: 'Europe',
  poland: 'Europe',
  portugal: 'Europe',
  sweden: 'Europe',
  norway: 'Europe',
  finland: 'Europe',
  denmark: 'Europe',
  ireland: 'Europe',
  iceland: 'Europe',
  greece: 'Europe',
  turkey: 'Europe',
  hungary: 'Europe',
  czechia: 'Europe',
  'czech republic': 'Europe',
  slovakia: 'Europe',
  slovenia: 'Europe',
  croatia: 'Europe',
  serbia: 'Europe',
  bosnia: 'Europe',
  bulgaria: 'Europe',
  romania: 'Europe',
  ukraine: 'Europe',
  montenegro: 'Europe',
  macedonia: 'Europe',
  albania: 'Europe',
  lithuania: 'Europe',
  latvia: 'Europe',
  estonia: 'Europe',
  luxembourg: 'Europe',
  malta: 'Europe',
  cyprus: 'Europe',

  // North America
  'united states': 'North America',
  usa: 'North America',
  canada: 'North America',
  mexico: 'North America',
  panama: 'North America',
  'costa rica': 'North America',
  guatemala: 'North America',
  honduras: 'North America',
  'el salvador': 'North America',
  nicaragua: 'North America',
  jamaica: 'North America',
  'dominican republic': 'North America',

  // South America
  brazil: 'South America',
  argentina: 'South America',
  chile: 'South America',
  colombia: 'South America',
  peru: 'South America',
  uruguay: 'South America',
  paraguay: 'South America',
  bolivia: 'South America',
  ecuador: 'South America',
  venezuela: 'South America',

  // Africa
  southafrica: 'Africa',
  'south africa': 'Africa',
  egypt: 'Africa',
  morocco: 'Africa',
  kenya: 'Africa',
  ethiopia: 'Africa',
  nigeria: 'Africa',
  ghana: 'Africa',
  tunisia: 'Africa',
  algeria: 'Africa',
  senegal: 'Africa',
  tanzania: 'Africa',
  uganda: 'Africa',
  rwanda: 'Africa',
  zambia: 'Africa',
  zimbabwe: 'Africa',
  malawi: 'Africa',
  mozambique: 'Africa',
  mauritius: 'Africa',

  // Middle East
  uae: 'Middle East',
  'united arab emirates': 'Middle East',
  saudiarabia: 'Middle East',
  'saudi arabia': 'Middle East',
  qatar: 'Middle East',
  oman: 'Middle East',
  bahrain: 'Middle East',
  kuwait: 'Middle East',
  jordan: 'Middle East',
  israel: 'Middle East',
  lebanon: 'Middle East',
  iraq: 'Middle East',
  iran: 'Middle East',
  yemen: 'Middle East',

  // Oceania
  fiji: 'Oceania',
  'papua new guinea': 'Oceania',
  samoa: 'Oceania',
  tonga: 'Oceania',
  'new caledonia': 'Oceania',
  vanuatu: 'Oceania',
  kiribati: 'Oceania',
  tuvalu: 'Oceania',
  nauru: 'Oceania',
};

export function getContinentMeta(countryCode?: string | null, countryName?: string | null): ContinentMeta {
  const normalizedCode = (countryCode || '').trim().toUpperCase();
  if (normalizedCode && COUNTRY_CODE_TO_CONTINENT[normalizedCode]) {
    return CONTINENT_META[COUNTRY_CODE_TO_CONTINENT[normalizedCode]];
  }

  const normalizedName = (countryName || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (normalizedName && COUNTRY_NAME_TO_CONTINENT[normalizedName]) {
    return CONTINENT_META[COUNTRY_NAME_TO_CONTINENT[normalizedName]];
  }

  return CONTINENT_META.Other;
}
