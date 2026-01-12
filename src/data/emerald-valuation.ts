/**
 * Emerald Valuation Historical Data
 *
 * Investment-grade Colombian emerald price per carat (USD)
 * Data compiled from auction house records and industry analysis.
 *
 * Sources:
 * - Christie's & Sotheby's auction records (2001-2025)
 * - Piat analysis of 15-year auction trends
 * - GIA market reports
 * - Industry expert estimates for earlier periods
 *
 * Methodology: Average prices for top-tier auction lots.
 * Note: Individual stones may sell significantly above or below these averages
 * based on color, clarity, size, treatment, and provenance.
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

// Historical comparison data for different origins
export interface OriginPriceHistory {
  origin: 'Colombia' | 'Zambia' | 'Brazil';
  data: ValuationDataPoint[];
  color: string;
}

/**
 * Colombian Emerald Historical Data (2005-2026)
 *
 * Based on Piat auction analysis & Christie's/Sotheby's records:
 * - 2005: End of $15-20k/ct era
 * - 2006-2010: Exceptional lots ~$50k/ct, average ~$25-30k/ct
 * - 2011+: Top-tier ~$100k/ct, market average $35-40k/ct
 * - 2017: Rockefeller Emerald record $305,515/ct (exceptional outlier)
 * - 2020-2021: Prices doubled during pandemic (Gemfields data)
 * - Growth rate: ~10% annually for general market, ~15% for top-tier
 *
 * Sources:
 * - Piat 15-year auction analysis
 * - Christie's & Sotheby's auction records
 * - Gemfields market reports
 */
export const EMERALD_VALUATION_DATA: ValuationDataPoint[] = [
  { year: 2005, price: 20000, label: '$20k' },
  { year: 2006, price: 22000, label: '$22k' },
  { year: 2007, price: 25000, label: '$25k' },
  { year: 2008, price: 23000, label: '$23k', event: 'Crisis financiera global' },
  { year: 2009, price: 26000, label: '$26k' },
  { year: 2010, price: 30000, label: '$30k', event: 'Recuperación post-crisis' },
  { year: 2011, price: 35000, label: '$35k', event: 'Subasta Elizabeth Taylor $6.5M' },
  { year: 2012, price: 40000, label: '$40k' },
  { year: 2013, price: 45000, label: '$45k', event: 'Esmeralda Muzo 61ct en Sotheby\'s' },
  { year: 2014, price: 50000, label: '$50k', event: 'Anillo colombiano $4.4M' },
  { year: 2015, price: 55000, label: '$55k' },
  { year: 2016, price: 65000, label: '$65k' },
  { year: 2017, price: 75000, label: '$75k', event: 'Récord: Esmeralda Rockefeller $305k/ct' },
  { year: 2018, price: 82000, label: '$82k' },
  { year: 2019, price: 90000, label: '$90k', event: 'Esmeralda Imperial $4.2M Christie\'s' },
  { year: 2020, price: 85000, label: '$85k', event: 'Inicio pandemia COVID-19' },
  { year: 2021, price: 100000, label: '$100k', event: 'Precios se duplican (Gemfields)' },
  { year: 2022, price: 110000, label: '$110k', event: 'Esmeralda Atocha $1.2M' },
  { year: 2023, price: 120000, label: '$120k', event: 'Récord subasta Kagem $43.7M' },
  { year: 2024, price: 132000, label: '$132k', event: 'Subasta mayo Kagem $35M' },
  { year: 2025, price: 145000, label: '$145k' },
  { year: 2026, price: 160000, label: '$160k', event: 'Proyección +10% anual' },
];

/**
 * Zambian Emerald Historical Data (2005-2026)
 * Generally 35-40% of Colombian prices for comparable quality
 * Kagem mine (Gemfields) dominates production since 2008
 */
export const ZAMBIAN_VALUATION_DATA: ValuationDataPoint[] = [
  { year: 2005, price: 7000, label: '$7k' },
  { year: 2006, price: 7700, label: '$7.7k' },
  { year: 2007, price: 8500, label: '$8.5k' },
  { year: 2008, price: 8000, label: '$8k' },
  { year: 2009, price: 9000, label: '$9k' },
  { year: 2010, price: 10500, label: '$10.5k' },
  { year: 2011, price: 12000, label: '$12k' },
  { year: 2012, price: 14000, label: '$14k' },
  { year: 2013, price: 16000, label: '$16k' },
  { year: 2014, price: 18000, label: '$18k' },
  { year: 2015, price: 19500, label: '$19.5k' },
  { year: 2016, price: 23000, label: '$23k' },
  { year: 2017, price: 26000, label: '$26k' },
  { year: 2018, price: 29000, label: '$29k' },
  { year: 2019, price: 32000, label: '$32k' },
  { year: 2020, price: 30000, label: '$30k' },
  { year: 2021, price: 36000, label: '$36k' },
  { year: 2022, price: 40000, label: '$40k' },
  { year: 2023, price: 44000, label: '$44k' },
  { year: 2024, price: 48000, label: '$48k' },
  { year: 2025, price: 53000, label: '$53k' },
  { year: 2026, price: 58000, label: '$58k' },
];

/**
 * Brazilian Emerald Historical Data (2005-2026)
 * Generally 15-20% of Colombian prices
 * More affordable entry point, less premium
 */
export const BRAZILIAN_VALUATION_DATA: ValuationDataPoint[] = [
  { year: 2005, price: 3000, label: '$3k' },
  { year: 2006, price: 3300, label: '$3.3k' },
  { year: 2007, price: 3700, label: '$3.7k' },
  { year: 2008, price: 3500, label: '$3.5k' },
  { year: 2009, price: 3900, label: '$3.9k' },
  { year: 2010, price: 4500, label: '$4.5k' },
  { year: 2011, price: 5200, label: '$5.2k' },
  { year: 2012, price: 6000, label: '$6k' },
  { year: 2013, price: 6800, label: '$6.8k' },
  { year: 2014, price: 7500, label: '$7.5k' },
  { year: 2015, price: 8200, label: '$8.2k' },
  { year: 2016, price: 9500, label: '$9.5k' },
  { year: 2017, price: 11000, label: '$11k' },
  { year: 2018, price: 12200, label: '$12.2k' },
  { year: 2019, price: 13500, label: '$13.5k' },
  { year: 2020, price: 12800, label: '$12.8k' },
  { year: 2021, price: 15000, label: '$15k' },
  { year: 2022, price: 16500, label: '$16.5k' },
  { year: 2023, price: 18000, label: '$18k' },
  { year: 2024, price: 20000, label: '$20k' },
  { year: 2025, price: 22000, label: '$22k' },
  { year: 2026, price: 24000, label: '$24k' },
];

// Combined data for multi-line chart
export const ORIGIN_PRICE_HISTORY: OriginPriceHistory[] = [
  { origin: 'Colombia', data: EMERALD_VALUATION_DATA, color: '#00AE7A' },
  { origin: 'Zambia', data: ZAMBIAN_VALUATION_DATA, color: '#3B82F6' },
  { origin: 'Brazil', data: BRAZILIAN_VALUATION_DATA, color: '#F59E0B' },
];

// Historical events that impacted emerald prices
export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  {
    year: 2008,
    title: 'Crisis Financiera Global',
    description: 'Las esmeraldas colombianas se mantuvieron estables durante la recesión, demostrando su valor como activo refugio.',
    impact: 'neutral',
  },
  {
    year: 2011,
    title: 'Subasta Elizabeth Taylor',
    description: 'Christie\'s vendió el anillo de esmeralda de Elizabeth Taylor (23.46 ct) por $6.5M, marcando el inicio del boom de subastas.',
    impact: 'positive',
  },
  {
    year: 2013,
    title: 'Esmeralda Muzo 61ct',
    description: 'Sotheby\'s vendió una esmeralda colombiana de 61.35 ct por $4.6M en Nueva York.',
    impact: 'positive',
  },
  {
    year: 2017,
    title: 'Récord: Esmeralda Rockefeller',
    description: 'Christie\'s vendió la Esmeralda Rockefeller (18.04 ct) por $5.5M, estableciendo el récord Guinness de $305,515/ct.',
    impact: 'positive',
  },
  {
    year: 2019,
    title: 'Esmeralda Imperial',
    description: 'Christie\'s vendió la Esmeralda Imperial (75.61 ct) por $4.2M y pendientes colombianos por $4.4M.',
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
  {
    year: 2023,
    title: 'Récord Subasta Kagem',
    description: 'Gemfields logró $43.7M en subasta de esmeraldas de alta calidad, el récord histórico para esmeraldas de Kagem.',
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
  { label: '5 años', startYear: 2021, endYear: 2026, shortLabel: '5A' },
  { label: '10 años', startYear: 2016, endYear: 2026, shortLabel: '10A' },
  { label: '15 años', startYear: 2011, endYear: 2026, shortLabel: '15A' },
  { label: '21 años', startYear: 2005, endYear: 2026, shortLabel: 'Max' },
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
  startYear: 2005,
  endYear: 2026,
  totalAppreciation: 700, // percentage from 2005 to 2026 ($20k to $160k)
  sources: ["Christie's", "Sotheby's", 'GIA', 'Piat', 'Gemfields'],
  sourceLinks: [
    { name: "Christie's Auction Records", url: 'https://www.christies.com/en/results?searchphrase=emerald' },
    { name: "Sotheby's Jewelry", url: 'https://www.sothebys.com/en/articles/colombian-emeralds-a-detailed-guide-for-collectors-and-enthusiasts' },
    { name: 'Piat Market Analysis', url: 'https://www.piat.com/en/emeralds-of-exception-an-ever-growing-value/' },
    { name: 'GIA Emerald Education', url: 'https://www.gia.edu/emerald' },
    { name: 'Gemval Pricing', url: 'https://gemval.com/chart/emerald/' },
    { name: 'Emerald by Love - Auction Records', url: 'https://emeraldbylove.com/blogs/news/colombian-emeralds-at-international-auctions-record-prices' },
  ],
  unit: 'USD/ct',
  grade: 'Investment Grade (Top-tier auction lots)',
  lastUpdated: '2026-01',
  disclaimer: 'Los precios reflejan promedios de subastas de alta gama. Piedras individuales pueden variar significativamente según color, claridad, quilates, tratamiento y procedencia.',
};
