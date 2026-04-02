/**
 * Centralized mock data for drill-down dashboard.
 * All data is plain objects — NO JSX allowed in this file.
 *
 * When connecting to a real API, replace the service layer
 * (services/drilldown.ts) — this file can be deleted entirely.
 */

import type {
  ContinentDetailData,
  AirportInfo,
  InboundCountry,
  CountryData,
  CountryAirlineShare,
} from '@/types/dashboard';
import { COUNTRIES, MK_AIRPORTS, MK_INBOUND_COUNTRIES } from '../drill-down-data';

// ============================================================
// Continent-level detail data (keyed by continent name)
// ============================================================
export const COUNTRY_AIRPORTS: Record<string, AirportInfo[]> = {
  // Asia-Pacific
  'ไทย': [
    { iata: 'BKK', name: 'Suvarnabhumi Airport', flights: 8420, routes: 120, airlines: 85, color: '#2563eb' },
    { iata: 'DMK', name: 'Don Mueang Int\'l Airport', flights: 2220, routes: 45, airlines: 12, color: '#d29922' },
  ],
  'ญี่ปุ่น': [
    { iata: 'HND', name: 'Tokyo Haneda Airport', flights: 10380, routes: 95, airlines: 42, color: '#2563eb' },
    { iata: 'NRT', name: 'Narita Int\'l Airport', flights: 2070, routes: 110, airlines: 68, color: '#d29922' },
  ],
  'เกาหลีใต้': [
    { iata: 'ICN', name: 'Incheon Int\'l Airport', flights: 6540, routes: 130, airlines: 72, color: '#2563eb' },
    { iata: 'GMP', name: 'Gimpo Int\'l Airport', flights: 1670, routes: 25, airlines: 8, color: '#d29922' },
  ],
  'สิงคโปร์': [
    { iata: 'SIN', name: 'Changi Airport', flights: 7840, routes: 160, airlines: 95, color: '#2563eb' },
  ],
  'เวียดนาม': [
    { iata: 'SGN', name: 'Tan Son Nhat Int\'l Airport', flights: 3120, routes: 95, airlines: 48, color: '#2563eb' },
    { iata: 'HAN', name: 'Noi Bai Int\'l Airport', flights: 2000, routes: 72, airlines: 32, color: '#d29922' },
  ],
  // Europe
  'เยอรมนี': [
    { iata: 'FRA', name: 'Frankfurt Airport', flights: 4240, routes: 150, airlines: 88, color: '#2563eb' },
    { iata: 'MUC', name: 'Munich Airport', flights: 2000, routes: 90, airlines: 45, color: '#d29922' },
  ],
  'สหราชอาณาจักร': [
    { iata: 'LHR', name: 'London Heathrow Airport', flights: 12490, routes: 180, airlines: 95, color: '#2563eb' },
    { iata: 'LGW', name: 'London Gatwick Airport', flights: 5810, routes: 110, airlines: 42, color: '#d29922' },
  ],
  'ฝรั่งเศส': [
    { iata: 'CDG', name: 'Paris Charles de Gaulle', flights: 9870, routes: 160, airlines: 92, color: '#2563eb' },
    { iata: 'ORY', name: 'Paris Orly Airport', flights: 2200, routes: 50, airlines: 18, color: '#d29922' },
  ],
  'สเปน': [
    { iata: 'MAD', name: 'Adolfo Suárez Madrid–Barajas', flights: 2820, routes: 120, airlines: 65, color: '#2563eb' },
    { iata: 'BCN', name: 'Barcelona–El Prat Airport', flights: 2000, routes: 95, airlines: 54, color: '#d29922' },
  ],
  'อิตาลี': [
    { iata: 'FCO', name: 'Rome Fiumicino Airport', flights: 3100, routes: 130, airlines: 72, color: '#2563eb' },
    { iata: 'MXP', name: 'Milan Malpensa Airport', flights: 1340, routes: 85, airlines: 48, color: '#d29922' },
  ],
  'เนเธอร์แลนด์': [
    { iata: 'AMS', name: 'Amsterdam Schiphol', flights: 3100, routes: 170, airlines: 90, color: '#2563eb' },
  ],
  'ตุรกี': [
    { iata: 'IST', name: 'Istanbul Airport', flights: 2200, routes: 140, airlines: 65, color: '#2563eb' },
    { iata: 'SAW', name: 'Sabiha Gökçen Airport', flights: 780, routes: 60, airlines: 18, color: '#d29922' },
  ],
  'โปแลนด์': [
    { iata: 'WAW', name: 'Warsaw Chopin Airport', flights: 1100, routes: 75, airlines: 32, color: '#2563eb' },
    { iata: 'KRK', name: 'Kraków Airport', flights: 540, routes: 45, airlines: 18, color: '#d29922' },
  ],
  'เซอร์เบีย': [
    { iata: 'BEG', name: 'Belgrade Nikola Tesla', flights: 620, routes: 55, airlines: 22, color: '#2563eb' },
    { iata: 'INI', name: 'Niš Constantine Airport', flights: 200, routes: 12, airlines: 4, color: '#d29922' },
  ],
  'ออสเตรีย': [
    { iata: 'VIE', name: 'Vienna Int\'l Airport', flights: 760, routes: 110, airlines: 55, color: '#2563eb' },
  ],
  'สวิตเซอร์แลนด์': [
    { iata: 'ZRH', name: 'Zürich Airport', flights: 480, routes: 95, airlines: 48, color: '#2563eb' },
    { iata: 'GVA', name: 'Geneva Airport', flights: 230, routes: 60, airlines: 28, color: '#d29922' },
  ],
  'มาซิโดเนียเหนือ': MK_AIRPORTS,
  // North America
  'สหรัฐฯ': [
    { iata: 'ATL', name: 'Hartsfield–Jackson Atlanta', flights: 15420, routes: 210, airlines: 18, color: '#2563eb' },
    { iata: 'DFW', name: 'Dallas/Fort Worth Int\'l', flights: 13560, routes: 190, airlines: 24, color: '#d29922' },
  ],
  'แคนาดา': [
    { iata: 'YYZ', name: 'Toronto Pearson Int\'l', flights: 3200, routes: 140, airlines: 52, color: '#2563eb' },
    { iata: 'YVR', name: 'Vancouver Int\'l Airport', flights: 2200, routes: 85, airlines: 38, color: '#d29922' },
  ],
  'เม็กซิโก': [
    { iata: 'MEX', name: 'Mexico City Int\'l Airport', flights: 2100, routes: 95, airlines: 28, color: '#2563eb' },
    { iata: 'CUN', name: 'Cancún Int\'l Airport', flights: 1100, routes: 65, airlines: 22, color: '#d29922' },
  ],
  // Middle East
  'สหรัฐอาหรับฯ': [
    { iata: 'DXB', name: 'Dubai Int\'l Airport', flights: 2400, routes: 180, airlines: 95, color: '#2563eb' },
    { iata: 'AUH', name: 'Abu Dhabi Int\'l Airport', flights: 1080, routes: 90, airlines: 42, color: '#d29922' },
  ],
  'ซาอุดีอาระเบีย': [
    { iata: 'RUH', name: 'King Khalid Int\'l Airport', flights: 1200, routes: 75, airlines: 28, color: '#2563eb' },
    { iata: 'JED', name: 'King Abdulaziz Int\'l Airport', flights: 1190, routes: 80, airlines: 32, color: '#d29922' },
  ],
  'กาตาร์': [
    { iata: 'DOH', name: 'Hamad Int\'l Airport', flights: 1120, routes: 140, airlines: 45, color: '#2563eb' },
  ],
  'โอมาน': [
    { iata: 'MCT', name: 'Muscat Int\'l Airport', flights: 520, routes: 55, airlines: 22, color: '#2563eb' },
  ],
  'บาห์เรน': [
    { iata: 'BAH', name: 'Bahrain Int\'l Airport', flights: 380, routes: 40, airlines: 18, color: '#2563eb' },
  ],
  'คูเวต': [
    { iata: 'KWI', name: 'Kuwait Int\'l Airport', flights: 350, routes: 45, airlines: 20, color: '#2563eb' },
  ],
  // South America
  'บราซิล': [
    { iata: 'GRU', name: 'São Paulo–Guarulhos Int\'l', flights: 1600, routes: 120, airlines: 38, color: '#2563eb' },
    { iata: 'GIG', name: 'Rio de Janeiro–Galeão Int\'l', flights: 1040, routes: 65, airlines: 22, color: '#d29922' },
  ],
  'อาร์เจนตินา': [
    { iata: 'EZE', name: 'Buenos Aires Ezeiza Int\'l', flights: 820, routes: 55, airlines: 24, color: '#2563eb' },
    { iata: 'AEP', name: 'Buenos Aires Aeroparque', flights: 360, routes: 30, airlines: 8, color: '#d29922' },
  ],
  'โคลอมเบีย': [
    { iata: 'BOG', name: 'Bogotá El Dorado Int\'l', flights: 680, routes: 60, airlines: 20, color: '#2563eb' },
    { iata: 'MDE', name: 'Medellín José María Córdova', flights: 200, routes: 25, airlines: 8, color: '#d29922' },
  ],
  'ชิลี': [
    { iata: 'SCL', name: 'Santiago Arturo Merino Int\'l', flights: 620, routes: 50, airlines: 18, color: '#2563eb' },
  ],
  'เปรู': [
    { iata: 'LIM', name: 'Lima Jorge Chávez Int\'l', flights: 500, routes: 45, airlines: 16, color: '#2563eb' },
  ],
  // Africa
  'แอฟริกาใต้': [
    { iata: 'JNB', name: 'Johannesburg O.R. Tambo Int\'l', flights: 320, routes: 55, airlines: 22, color: '#2563eb' },
    { iata: 'CPT', name: 'Cape Town Int\'l Airport', flights: 200, routes: 35, airlines: 14, color: '#d29922' },
  ],
  'อียิปต์': [
    { iata: 'CAI', name: 'Cairo Int\'l Airport', flights: 280, routes: 65, airlines: 28, color: '#2563eb' },
    { iata: 'HRG', name: 'Hurghada Int\'l Airport', flights: 100, routes: 30, airlines: 12, color: '#d29922' },
  ],
  'โมร็อกโก': [
    { iata: 'CMN', name: 'Casablanca Mohammed V Int\'l', flights: 210, routes: 50, airlines: 18, color: '#2563eb' },
    { iata: 'RAK', name: 'Marrakech Menara Airport', flights: 100, routes: 35, airlines: 14, color: '#d29922' },
  ],
  'เคนยา': [
    { iata: 'NBO', name: 'Nairobi Jomo Kenyatta Int\'l', flights: 210, routes: 40, airlines: 18, color: '#2563eb' },
  ],
  'เอธิโอเปีย': [
    { iata: 'ADD', name: 'Addis Ababa Bole Int\'l', flights: 265, routes: 65, airlines: 12, color: '#2563eb' },
  ],
  'ไนจีเรีย': [
    { iata: 'LOS', name: 'Lagos Murtala Muhammed Int\'l', flights: 130, routes: 30, airlines: 14, color: '#2563eb' },
    { iata: 'ABV', name: 'Abuja Nnamdi Azikiwe Int\'l', flights: 50, routes: 12, airlines: 6, color: '#d29922' },
  ],
};

// ============================================================
// Country-level: top airline per country
// ============================================================
export const COUNTRY_TOP_AIRLINES: Record<string, string> = {
  'ไทย': 'Thai Airways', 'ญี่ปุ่น': 'JAL', 'เกาหลีใต้': 'Korean Air',
  'สิงคโปร์': 'Singapore Airlines', 'เยอรมนี': 'Lufthansa', 'สหราชอาณาจักร': 'British Airways',
  'ฝรั่งเศส': 'Air France', 'สเปน': 'Iberia', 'อิตาลี': 'ITA Airways',
  'เนเธอร์แลนด์': 'KLM', 'ตุรกี': 'Turkish Airlines', 'โปแลนด์': 'LOT',
  'เซอร์เบีย': 'Air Serbia', 'ออสเตรีย': 'Austrian Airlines', 'สวิตเซอร์แลนด์': 'SWISS',
  'มาซิโดเนียเหนือ': 'Wizz Air',
  'สหรัฐฯ': 'American Airlines', 'แคนาดา': 'Air Canada', 'เม็กซิโก': 'Aeroméxico',
  'สหรัฐอาหรับฯ': 'Emirates', 'ซาอุดีอาระเบีย': 'Saudia', 'กาตาร์': 'Qatar Airways',
  'โอมาน': 'Oman Air', 'บาห์เรน': 'Gulf Air', 'คูเวต': 'Kuwait Airways',
  'บราซิล': 'LATAM Brasil', 'อาร์เจนตินา': 'Aerolíneas Argentinas',
  'โคลอมเบีย': 'Avianca', 'ชิลี': 'LATAM Chile', 'เปรู': 'LATAM Perú',
  'แอฟริกาใต้': 'South African Airways', 'อียิปต์': 'EgyptAir',
  'โมร็อกโก': 'Royal Air Maroc', 'เคนยา': 'Kenya Airways',
  'เอธิโอเปีย': 'Ethiopian Airlines', 'ไนจีเรีย': 'Air Peace',
};

// ============================================================
// Country-level: top airline market share by country
// ============================================================
export const COUNTRY_AIRLINE_MARKET: Record<string, CountryAirlineShare[]> = {
  'เยอรมนี': [
    { name: 'Lufthansa', flights: 850, share: 13.6, delta: 1.8, color: '#0f62a8' },
    { name: 'Eurowings', flights: 720, share: 11.5, delta: -0.6, color: '#1f77d0' },
    { name: 'Ryanair', flights: 640, share: 10.3, delta: 0.9, color: '#2e86de' },
    { name: 'Turkish Airlines', flights: 580, share: 9.3, delta: -0.4, color: '#4da3f0' },
    { name: 'easyJet', flights: 520, share: 8.3, delta: 0.5, color: '#67b2f7' },
  ],
  'สหราชอาณาจักร': [
    { name: 'British Airways', flights: 910, share: 14.1, delta: 1.2, color: '#0f62a8' },
    { name: 'easyJet', flights: 860, share: 13.3, delta: 0.7, color: '#1f77d0' },
    { name: 'Ryanair', flights: 780, share: 12.0, delta: 1.1, color: '#2e86de' },
    { name: 'Jet2', flights: 520, share: 8.0, delta: -0.3, color: '#4da3f0' },
    { name: 'Wizz Air', flights: 420, share: 6.5, delta: 0.4, color: '#67b2f7' },
  ],
};

// ============================================================
// Country-level: inbound countries by country name
// ============================================================
export const COUNTRY_INBOUND: Record<string, InboundCountry[]> = {
  // Asia-Pacific
  'ไทย': [
    { name: 'จีน', flag: '🇨🇳', flights: 2450, pct: 23.0 },
    { name: 'ญี่ปุ่น', flag: '🇯🇵', flights: 1840, pct: 17.3 },
    { name: 'สิงคโปร์', flag: '🇸🇬', flights: 1200, pct: 11.3 },
    { name: 'เกาหลีใต้', flag: '🇰🇷', flights: 980, pct: 9.2 },
    { name: 'มาเลเซีย', flag: '🇲🇾', flights: 850, pct: 8.0 },
  ],
  'ญี่ปุ่น': [
    { name: 'เกาหลีใต้', flag: '🇰🇷', flights: 3200, pct: 25.7 },
    { name: 'จีน', flag: '🇨🇳', flights: 2800, pct: 22.5 },
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 1900, pct: 15.3 },
    { name: 'ไต้หวัน', flag: '🇹🇼', flights: 1400, pct: 11.2 },
    { name: 'ไทย', flag: '🇹🇭', flights: 980, pct: 7.9 },
  ],
  'เกาหลีใต้': [
    { name: 'ญี่ปุ่น', flag: '🇯🇵', flights: 2100, pct: 25.6 },
    { name: 'จีน', flag: '🇨🇳', flights: 1800, pct: 21.9 },
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 1200, pct: 14.6 },
    { name: 'เวียดนาม', flag: '🇻🇳', flights: 900, pct: 11.0 },
    { name: 'ไทย', flag: '🇹🇭', flights: 650, pct: 7.9 },
  ],
  'สิงคโปร์': [
    { name: 'มาเลเซีย', flag: '🇲🇾', flights: 2100, pct: 26.8 },
    { name: 'อินโดนีเซีย', flag: '🇮🇩', flights: 1600, pct: 20.4 },
    { name: 'ออสเตรเลีย', flag: '🇦🇺', flights: 1100, pct: 14.0 },
    { name: 'อินเดีย', flag: '🇮🇳', flights: 800, pct: 10.2 },
    { name: 'ไทย', flag: '🇹🇭', flights: 680, pct: 8.7 },
  ],
  // Europe
  'เยอรมนี': [
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 850, pct: 13.6 },
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 720, pct: 11.5 },
    { name: 'ฝรั่งเศส', flag: '🇫🇷', flights: 640, pct: 10.3 },
    { name: 'สเปน', flag: '🇪🇸', flights: 580, pct: 9.3 },
    { name: 'อิตาลี', flag: '🇮🇹', flights: 520, pct: 8.3 },
  ],
  'สหราชอาณาจักร': [
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 1800, pct: 15.2 },
    { name: 'สเปน', flag: '🇪🇸', flights: 1400, pct: 11.8 },
    { name: 'ฝรั่งเศส', flag: '🇫🇷', flights: 1100, pct: 9.3 },
    { name: 'เยอรมนี', flag: '🇩🇪', flights: 950, pct: 8.0 },
    { name: 'ไอร์แลนด์', flag: '🇮🇪', flights: 820, pct: 6.9 },
  ],
  'ฝรั่งเศส': [
    { name: 'เยอรมนี', flag: '🇩🇪', flights: 640, pct: 12.3 },
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 580, pct: 11.2 },
    { name: 'สเปน', flag: '🇪🇸', flights: 520, pct: 10.0 },
    { name: 'อิตาลี', flag: '🇮🇹', flights: 480, pct: 9.2 },
    { name: 'โมร็อกโก', flag: '🇲🇦', flights: 420, pct: 8.1 },
  ],
  'สเปน': [
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 1200, pct: 24.9 },
    { name: 'เยอรมนี', flag: '🇩🇪', flights: 680, pct: 14.1 },
    { name: 'ฝรั่งเศส', flag: '🇫🇷', flights: 520, pct: 10.8 },
    { name: 'อิตาลี', flag: '🇮🇹', flights: 380, pct: 7.9 },
    { name: 'เนเธอร์แลนด์', flag: '🇳🇱', flights: 310, pct: 6.4 },
  ],
  'อิตาลี': [
    { name: 'เยอรมนี', flag: '🇩🇪', flights: 580, pct: 13.1 },
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 520, pct: 11.7 },
    { name: 'ฝรั่งเศส', flag: '🇫🇷', flights: 480, pct: 10.8 },
    { name: 'สเปน', flag: '🇪🇸', flights: 350, pct: 7.9 },
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 300, pct: 6.8 },
  ],
  // North America
  'สหรัฐฯ': [
    { name: 'แคนาดา', flag: '🇨🇦', flights: 4200, pct: 14.9 },
    { name: 'เม็กซิโก', flag: '🇲🇽', flights: 3800, pct: 13.5 },
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 2400, pct: 8.5 },
    { name: 'ญี่ปุ่น', flag: '🇯🇵', flights: 1600, pct: 5.7 },
    { name: 'เยอรมนี', flag: '🇩🇪', flights: 1200, pct: 4.3 },
  ],
  'แคนาดา': [
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 2800, pct: 51.9 },
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 480, pct: 8.9 },
    { name: 'เม็กซิโก', flag: '🇲🇽', flights: 340, pct: 6.3 },
    { name: 'ฝรั่งเศส', flag: '🇫🇷', flights: 260, pct: 4.8 },
    { name: 'เยอรมนี', flag: '🇩🇪', flights: 220, pct: 4.1 },
  ],
  'เม็กซิโก': [
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 2200, pct: 68.8 },
    { name: 'แคนาดา', flag: '🇨🇦', flights: 340, pct: 10.6 },
    { name: 'โคลอมเบีย', flag: '🇨🇴', flights: 180, pct: 5.6 },
    { name: 'สเปน', flag: '🇪🇸', flights: 120, pct: 3.8 },
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 80, pct: 2.5 },
  ],
  // Middle East
  'สหรัฐอาหรับฯ': [
    { name: 'อินเดีย', flag: '🇮🇳', flights: 820, pct: 23.6 },
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 480, pct: 13.8 },
    { name: 'ปากีสถาน', flag: '🇵🇰', flights: 380, pct: 10.9 },
    { name: 'ซาอุดีอาระเบีย', flag: '🇸🇦', flights: 320, pct: 9.2 },
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 280, pct: 8.0 },
  ],
  'ซาอุดีอาระเบีย': [
    { name: 'อียิปต์', flag: '🇪🇬', flights: 520, pct: 21.8 },
    { name: 'สหรัฐอาหรับฯ', flag: '🇦🇪', flights: 380, pct: 15.9 },
    { name: 'อินเดีย', flag: '🇮🇳', flights: 340, pct: 14.2 },
    { name: 'จอร์แดน', flag: '🇯🇴', flights: 260, pct: 10.9 },
    { name: 'ตุรกี', flag: '🇹🇷', flights: 220, pct: 9.2 },
  ],
  'กาตาร์': [
    { name: 'อินเดีย', flag: '🇮🇳', flights: 280, pct: 25.0 },
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 160, pct: 14.3 },
    { name: 'ฟิลิปปินส์', flag: '🇵🇭', flights: 120, pct: 10.7 },
    { name: 'สหรัฐอาหรับฯ', flag: '🇦🇪', flights: 100, pct: 8.9 },
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 90, pct: 8.0 },
  ],
  // South America
  'บราซิล': [
    { name: 'อาร์เจนตินา', flag: '🇦🇷', flights: 480, pct: 18.2 },
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 420, pct: 15.9 },
    { name: 'ชิลี', flag: '🇨🇱', flights: 280, pct: 10.6 },
    { name: 'โปรตุเกส', flag: '🇵🇹', flights: 260, pct: 9.8 },
    { name: 'โคลอมเบีย', flag: '🇨🇴', flights: 200, pct: 7.6 },
  ],
  'อาร์เจนตินา': [
    { name: 'บราซิล', flag: '🇧🇷', flights: 320, pct: 27.1 },
    { name: 'ชิลี', flag: '🇨🇱', flights: 180, pct: 15.3 },
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 160, pct: 13.6 },
    { name: 'อุรุกวัย', flag: '🇺🇾', flights: 120, pct: 10.2 },
    { name: 'สเปน', flag: '🇪🇸', flights: 100, pct: 8.5 },
  ],
  'โคลอมเบีย': [
    { name: 'สหรัฐฯ', flag: '🇺🇸', flights: 280, pct: 31.8 },
    { name: 'เม็กซิโก', flag: '🇲🇽', flights: 140, pct: 15.9 },
    { name: 'ปานามา', flag: '🇵🇦', flights: 100, pct: 11.4 },
    { name: 'สเปน', flag: '🇪🇸', flights: 80, pct: 9.1 },
    { name: 'เอกวาดอร์', flag: '🇪🇨', flights: 60, pct: 6.8 },
  ],
  // Africa
  'แอฟริกาใต้': [
    { name: 'เอธิโอเปีย', flag: '🇪🇹', flights: 80, pct: 15.4 },
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 70, pct: 13.5 },
    { name: 'สหรัฐอาหรับฯ', flag: '🇦🇪', flights: 60, pct: 11.5 },
    { name: 'เคนยา', flag: '🇰🇪', flights: 50, pct: 9.6 },
    { name: 'เยอรมนี', flag: '🇩🇪', flights: 40, pct: 7.7 },
  ],
  'อียิปต์': [
    { name: 'ซาอุดีอาระเบีย', flag: '🇸🇦', flights: 90, pct: 23.7 },
    { name: 'สหรัฐอาหรับฯ', flag: '🇦🇪', flights: 60, pct: 15.8 },
    { name: 'ตุรกี', flag: '🇹🇷', flights: 50, pct: 13.2 },
    { name: 'เยอรมนี', flag: '🇩🇪', flights: 40, pct: 10.5 },
    { name: 'สหราชอาณาจักร', flag: '🇬🇧', flights: 35, pct: 9.2 },
  ],
  'โมร็อกโก': [
    { name: 'ฝรั่งเศส', flag: '🇫🇷', flights: 90, pct: 29.0 },
    { name: 'สเปน', flag: '🇪🇸', flights: 60, pct: 19.4 },
    { name: 'Belgium', flag: '🇧🇪', flights: 40, pct: 12.9 },
    { name: 'เนเธอร์แลนด์', flag: '🇳🇱', flights: 30, pct: 9.7 },
    { name: 'อิตาลี', flag: '🇮🇹', flights: 25, pct: 8.1 },
  ],
  'มาซิโดเนียเหนือ': MK_INBOUND_COUNTRIES,
};

// ============================================================
// Airport-level: monthly flight data
// ============================================================
export const AIRPORT_MONTHLY = [38, 35, 48, 55, 62, 71, 78, 76, 64, 73, 50, 44];
export const AIRPORT_MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const AIRPORT_CURRENT_MONTH_IDX = 9;
