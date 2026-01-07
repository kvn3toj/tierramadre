/**
 * Emerald Valuation Historical Data
 *
 * Investment-grade Colombian emerald price per carat (USD)
 * Sources: Christie's, Sotheby's, GIA, Gemval, Piat
 */

export interface ValuationDataPoint {
  year: number;
  price: number;
  label?: string;
  event?: string;
}

export interface HistoricalEvent {
  year: number;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

// Complete historical data from 1980 to 2025
export const EMERALD_VALUATION_DATA: ValuationDataPoint[] = [
  { year: 1980, price: 5000, label: '$5k', event: 'Post-war baseline' },
  { year: 1985, price: 7000, label: '$7k' },
  { year: 1990, price: 10000, label: '$10k', event: 'Green War peace treaty' },
  { year: 1995, price: 14000, label: '$14k' },
  { year: 2000, price: 16000, label: '$16k' },
  { year: 2005, price: 18000, label: '$18k' },
  { year: 2010, price: 50000, label: '$50k', event: 'Post-crisis recovery' },
  { year: 2015, price: 75000, label: '$75k' },
  { year: 2017, price: 100000, label: '$100k', event: 'Rockefeller Emerald record' },
  { year: 2020, price: 110000, label: '$110k' },
  { year: 2022, price: 140000, label: '$140k', event: 'Pandemic surge' },
  { year: 2025, price: 162000, label: '$162k' },
];

// Historical events that impacted emerald prices
export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  {
    year: 1990,
    title: 'Tratado de Paz de la Guerra Verde',
    description: 'La Iglesia Católica medió un acuerdo de paz que terminó el conflicto violento por las minas de esmeraldas en Boyacá. Esto trajo estabilidad a la producción.',
    impact: 'positive',
  },
  {
    year: 2008,
    title: 'Crisis Financiera Global',
    description: 'Las esmeraldas colombianas se mantuvieron estables durante la recesión, demostrando su valor como activo refugio.',
    impact: 'neutral',
  },
  {
    year: 2017,
    title: 'Récord: Esmeralda Rockefeller',
    description: 'Christie\'s vendió la Esmeralda Rockefeller (18.04 ct) por $5.5M, estableciendo el récord Guinness de $305,515/ct.',
    impact: 'positive',
  },
  {
    year: 2020,
    title: 'Pandemia COVID-19',
    description: 'A pesar de la pandemia, las esmeraldas de alta calidad duplicaron su precio por quilate en 12 meses según datos de Gemfields.',
    impact: 'positive',
  },
  {
    year: 2022,
    title: 'Esmeralda del Atocha',
    description: 'Una esmeralda de 400 años del naufragio español se vendió por $1.2M ($228,000/ct) en Sotheby\'s.',
    impact: 'positive',
  },
];

// Comparison data: Colombian vs other origins (2025 prices)
export const ORIGIN_COMPARISON = [
  {
    origin: 'Colombia',
    flag: '🇨🇴',
    commercial: { min: 2500, max: 9000 },
    fine: { min: 10000, max: 25000 },
    investment: { min: 50000, max: 162000 },
    premium: '100%',
  },
  {
    origin: 'Zambia',
    flag: '🇿🇲',
    commercial: { min: 1000, max: 5000 },
    fine: { min: 6000, max: 10000 },
    investment: { min: 15000, max: 30000 },
    premium: '20-40%',
  },
  {
    origin: 'Brasil',
    flag: '🇧🇷',
    commercial: { min: 50, max: 500 },
    fine: { min: 500, max: 1500 },
    investment: { min: 1500, max: 2000 },
    premium: '5-10%',
  },
];

// Notable auction records
export const AUCTION_RECORDS = [
  {
    name: 'Esmeralda Rockefeller',
    year: 2017,
    house: "Christie's",
    carats: 18.04,
    price: 5511500,
    pricePerCarat: 305515,
    buyer: 'Harry Winston',
  },
  {
    name: 'Anillo Elizabeth Taylor',
    year: 2011,
    house: "Christie's",
    carats: 23.46,
    price: 6578500,
    pricePerCarat: 280329,
    buyer: 'Private collector',
  },
  {
    name: 'Esmeralda Atocha (400 años)',
    year: 2022,
    house: "Sotheby's",
    carats: 5.27,
    price: 1200000,
    pricePerCarat: 227703,
    buyer: 'Private collector',
  },
  {
    name: 'Anillo Muzo 61ct',
    year: 2023,
    house: "Sotheby's",
    carats: 61.35,
    price: 4600000,
    pricePerCarat: 75000,
    buyer: 'Private collector',
  },
];

// Year range options for the selector (ordered from shortest to longest)
export const YEAR_RANGES = [
  { label: '5 años', startYear: 2020, endYear: 2025, shortLabel: '5A' },
  { label: '10 años', startYear: 2015, endYear: 2025, shortLabel: '10A' },
  { label: '20 años', startYear: 2005, endYear: 2025, shortLabel: '20A' },
  { label: '45 años', startYear: 1980, endYear: 2025, shortLabel: '45A' },
];

// Helper function to filter data by year range
export function filterDataByYearRange(
  data: ValuationDataPoint[],
  startYear: number,
  endYear: number
): ValuationDataPoint[] {
  return data.filter((point) => point.year >= startYear && point.year <= endYear);
}

// Helper function to calculate appreciation
export function calculateAppreciation(
  data: ValuationDataPoint[]
): { percentage: number; years: number } {
  if (data.length < 2) return { percentage: 0, years: 0 };
  const first = data[0];
  const last = data[data.length - 1];
  const percentage = Math.round(((last.price - first.price) / first.price) * 100);
  const years = last.year - first.year;
  return { percentage, years };
}

export const VALUATION_METADATA = {
  startYear: 1980,
  endYear: 2025,
  totalAppreciation: 3140, // percentage from 1980 to 2025
  sources: ["Christie's", "Sotheby's", 'GIA', 'Gemval', 'Piat'],
  unit: 'USD/ct',
  grade: 'Investment Grade',
  lastUpdated: '2025-01',
};
