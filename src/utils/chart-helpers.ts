/**
 * Chart Helper Functions
 *
 * Shared utilities for emerald valuation charts.
 * Used by both ValuationSection and ValuationPage.
 */

import { ValuationDataPoint } from '../data/emerald-valuation';

export interface ChartPoint extends ValuationDataPoint {
  x: number;
  y: number;
}

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartConfig {
  width: number;
  height: number;
  padding: ChartPadding;
  lineWidth: number;
}

/**
 * Calculate chart points for multiple data series
 */
export function calculateChartPointsMulti(
  allData: ValuationDataPoint[][],
  startYear: number,
  endYear: number,
  config: ChartConfig
): ChartPoint[][] {
  const { width, height, padding } = config;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allPrices = allData.flatMap((data) =>
    data.filter((d) => d.year >= startYear && d.year <= endYear).map((d) => d.price)
  );
  const minPrice = 0;
  const maxPrice = Math.max(...allPrices) * 1.1;
  const priceRange = maxPrice - minPrice || 1;
  const yearRange = endYear - startYear || 1;

  return allData.map((data) => {
    const filtered = data.filter((d) => d.year >= startYear && d.year <= endYear);
    return filtered.map((point) => ({
      ...point,
      x: padding.left + ((point.year - startYear) / yearRange) * chartWidth,
      y: padding.top + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight,
    }));
  });
}

/**
 * Create SVG path string from chart points
 */
export function createLinePath(points: ChartPoint[]): string {
  if (points.length < 2) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/**
 * Format price for axis labels (e.g., $20k, $100k)
 */
export function formatPriceAxis(price: number): string {
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}k`;
  return `$${price}`;
}

/**
 * Calculate nice Y-axis tick values
 */
export function calculateYAxisTicks(maxPrice: number, divisions = 5): number[] {
  const niceMax = Math.ceil(maxPrice / 20000) * 20000;
  const step = niceMax / divisions;
  return Array.from({ length: divisions + 1 }, (_, i) => step * i);
}

/**
 * Calculate X-axis tick values based on year range
 */
export function calculateXAxisTicks(startYear: number, endYear: number): number[] {
  const range = endYear - startYear;

  // Short range: show every year
  if (range <= 3) {
    return Array.from({ length: range + 1 }, (_, i) => startYear + i);
  }

  // Medium range: show ~5 ticks
  if (range <= 10) {
    const step = Math.ceil(range / 5);
    const ticks: number[] = [];
    for (let y = startYear; y <= endYear; y += step) ticks.push(y);
    if (ticks[ticks.length - 1] !== endYear) ticks.push(endYear);
    return ticks;
  }

  // Long range: show exactly 6 ticks
  const step = Math.floor(range / 5);
  return [
    startYear,
    startYear + step,
    startYear + step * 2,
    startYear + step * 3,
    startYear + step * 4,
    endYear,
  ];
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 */
export function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (years <= 0 || startValue <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Get chart dimensions from config
 */
export function getChartDimensions(config: ChartConfig) {
  return {
    chartWidth: config.width - config.padding.left - config.padding.right,
    chartHeight: config.height - config.padding.top - config.padding.bottom,
  };
}
