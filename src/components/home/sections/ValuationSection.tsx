/**
 * ValuationSection Component
 *
 * Professional financial chart showing Colombian emerald appreciation
 * with multi-origin comparison (Colombia vs Zambia vs Brazil).
 *
 * Design: Bloomberg/financial-style with clean axes, grid, and legend.
 *
 * Designed by: Aria + Eunoia + Nira
 */

import React, { useMemo, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { TrendingUp, AutoGraph } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { emeraldCore, goldAccent } from '../../../design-system/tokens/colors';
import { glassDark, glassLight, applyGlass } from '../../../design-system/tokens/glass';
import { fadeInUp } from '../../../design-system/tokens/motion';
import {
  EMERALD_VALUATION_DATA,
  ZAMBIAN_VALUATION_DATA,
  BRAZILIAN_VALUATION_DATA,
  ORIGIN_PRICE_HISTORY,
  filterDataByYearRange,
  calculateAppreciation,
  ValuationDataPoint,
} from '../../../data/emerald-valuation';

// Year range options - compact pill buttons (like financial apps)
const CURRENT_YEAR = 2026;
const MIN_YEAR = 2005;
const TIME_FILTERS = [
  { value: 1, label: '1A' },
  { value: 3, label: '3A' },
  { value: 5, label: '5A' },
  { value: 10, label: '10A' },
  { value: 21, label: 'Max' },
];

// =============================================================================
// CHART CONFIGURATION - Professional financial chart style
// =============================================================================

const CHART_CONFIG = {
  width: 400,
  height: 200,
  padding: { top: 20, right: 50, bottom: 35, left: 50 },
  lineWidth: 2,
};


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface ChartPoint extends ValuationDataPoint {
  x: number;
  y: number;
}

function calculateChartPointsMulti(
  allData: ValuationDataPoint[][],
  startYear: number,
  endYear: number
) {
  const { width, height, padding } = CHART_CONFIG;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find global min/max for consistent Y scale across all origins
  const allPrices = allData.flatMap((data) =>
    data.filter((d) => d.year >= startYear && d.year <= endYear).map((d) => d.price)
  );
  const minPrice = 0; // Start from 0 for professional charts
  const maxPrice = Math.max(...allPrices) * 1.1; // Add 10% padding
  const priceRange = maxPrice - minPrice || 1;

  return allData.map((data) => {
    const filtered = data.filter((d) => d.year >= startYear && d.year <= endYear);
    return filtered.map((point) => ({
      ...point,
      x: padding.left + ((point.year - startYear) / (endYear - startYear)) * chartWidth,
      y: padding.top + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight,
    }));
  });
}

function createLinePath(points: ChartPoint[]) {
  if (points.length < 2) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function formatPriceAxis(price: number): string {
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}k`;
  }
  return `$${price}`;
}

function calculateYAxisTicks(maxPrice: number): number[] {
  // Round up to nice number
  const niceMax = Math.ceil(maxPrice / 20000) * 20000;
  const step = niceMax / 4;
  return [0, step, step * 2, step * 3, niceMax];
}

function calculateXAxisTicks(startYear: number, endYear: number): number[] {
  const range = endYear - startYear;
  if (range <= 5) return [startYear, endYear];
  if (range <= 10) return [startYear, startYear + Math.floor(range / 2), endYear];
  // For longer ranges, show start, middle points, and end
  const step = Math.floor(range / 4);
  return [startYear, startYear + step, startYear + step * 2, startYear + step * 3, endYear];
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ValuationSection: React.FC = () => {
  const muiTheme = useMuiTheme();
  const isDarkMode = muiTheme.palette.mode === 'dark';
  const navigate = useNavigate();
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  // Year range state - default to 5 years
  const [yearsBack, setYearsBack] = useState(5);

  const glassEffect = isDarkMode ? glassDark.frosted : glassLight.frosted;

  // Calculate start/end year from slider value
  const endYear = CURRENT_YEAR;
  const startYear = Math.max(MIN_YEAR, CURRENT_YEAR - yearsBack);

  // Calculate chart data for all origins
  const allOriginData = useMemo(
    () => [EMERALD_VALUATION_DATA, ZAMBIAN_VALUATION_DATA, BRAZILIAN_VALUATION_DATA],
    []
  );

  const chartPointsMulti = useMemo(
    () => calculateChartPointsMulti(allOriginData, startYear, endYear),
    [allOriginData, startYear, endYear]
  );

  // Colombian data for stats
  const colombianFiltered = useMemo(
    () => filterDataByYearRange(EMERALD_VALUATION_DATA, startYear, endYear),
    [startYear, endYear]
  );
  const appreciation = useMemo(() => calculateAppreciation(colombianFiltered), [colombianFiltered]);

  // Calculate max price for Y axis
  const maxPrice = useMemo(() => {
    const allPrices = allOriginData.flatMap((data) =>
      data.filter((d) => d.year >= startYear && d.year <= endYear).map((d) => d.price)
    );
    return Math.max(...allPrices) * 1.1;
  }, [allOriginData, startYear, endYear]);

  const yAxisTicks = useMemo(() => calculateYAxisTicks(maxPrice), [maxPrice]);
  const xAxisTicks = useMemo(() => calculateXAxisTicks(startYear, endYear), [startYear, endYear]);

  // Chart dimensions
  const { width, height, padding } = CHART_CONFIG;
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  return (
    <Box
      ref={ref}
      component="section"
      aria-labelledby="valuation-title"
      sx={{ px: 2, py: 2 }}
    >
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate={isInView ? 'animate' : 'initial'}
      >
        <Card
          sx={{
            ...applyGlass(glassEffect),
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ py: 2.5, px: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Typography
                  id="valuation-title"
                  sx={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'text.primary',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Índice de Precios de Esmeraldas
                </Typography>
                <Typography
                  sx={{
                    fontSize: '12px',
                    color: 'text.secondary',
                    mt: 0.25,
                  }}
                >
                  Precio grado inversión por quilate (USD)
                </Typography>
              </Box>
              <TrendingUp sx={{ fontSize: 20, color: emeraldCore.primary }} />
            </Box>

            {/* Time Filter Pills - Compact like financial apps */}
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                mb: 1.5,
              }}
            >
              {TIME_FILTERS.map((filter) => {
                const isActive = yearsBack === filter.value;
                return (
                  <Box
                    key={filter.value}
                    onClick={() => setYearsBack(filter.value)}
                    sx={{
                      flex: 1,
                      py: 0.5,
                      px: 0.75,
                      borderRadius: 1,
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'white' : 'text.secondary',
                      bgcolor: isActive
                        ? emeraldCore.primary
                        : isDarkMode
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${isActive ? emeraldCore.primary : 'transparent'}`,
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: isActive
                          ? emeraldCore.primary
                          : isDarkMode
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                      },
                    }}
                  >
                    {filter.label}
                  </Box>
                );
              })}
            </Box>

            {/* Professional SVG Chart */}
            <Box
              sx={{
                height: height + 10,
                position: 'relative',
                mb: 2,
              }}
            >
              <svg
                viewBox={`0 0 ${width} ${height}`}
                width="100%"
                height="100%"
                role="img"
                aria-label={`Emerald price comparison chart: Colombia +${appreciation.percentage}% over ${appreciation.years} years`}
                style={{ overflow: 'visible' }}
              >
                {/* Background */}
                <rect
                  x={padding.left}
                  y={padding.top}
                  width={chartWidth}
                  height={chartHeight}
                  fill={isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'}
                />

                {/* Y-axis grid lines and labels */}
                {yAxisTicks.map((tick, index) => {
                  const y = padding.top + chartHeight - (tick / (yAxisTicks[yAxisTicks.length - 1] || 1)) * chartHeight;
                  return (
                    <g key={`y-${index}`}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + chartWidth}
                        y2={y}
                        stroke={isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                        strokeWidth={1}
                        strokeDasharray={index === 0 ? 'none' : '2 2'}
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        textAnchor="end"
                        fill={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                        fontSize={9}
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {formatPriceAxis(tick)}
                      </text>
                    </g>
                  );
                })}

                {/* X-axis labels */}
                {xAxisTicks.map((year) => {
                  const x = padding.left + ((year - startYear) / (endYear - startYear)) * chartWidth;
                  return (
                    <text
                      key={`x-${year}`}
                      x={x}
                      y={height - 8}
                      textAnchor="middle"
                      fill={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                      fontSize={9}
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {year}
                    </text>
                  );
                })}

                {/* Data lines for each origin */}
                {ORIGIN_PRICE_HISTORY.map((origin, originIndex) => {
                  const points = chartPointsMulti[originIndex];
                  if (!points || points.length < 2) return null;
                  const path = createLinePath(points);

                  return (
                    <motion.path
                      key={`line-${origin.origin}-${yearsBack}`}
                      d={path}
                      fill="none"
                      stroke={origin.color}
                      strokeWidth={origin.origin === 'Colombia' ? CHART_CONFIG.lineWidth + 0.5 : CHART_CONFIG.lineWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={origin.origin === 'Colombia' ? 1 : 0.7}
                      initial={{ pathLength: 0 }}
                      animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                      transition={{
                        pathLength: { duration: 1.2, ease: 'easeOut', delay: originIndex * 0.15 },
                      }}
                    />
                  );
                })}

                {/* End point markers */}
                {ORIGIN_PRICE_HISTORY.map((origin, originIndex) => {
                  const points = chartPointsMulti[originIndex];
                  if (!points || points.length === 0) return null;
                  const lastPoint = points[points.length - 1];

                  return (
                    <motion.g
                      key={`endpoint-${origin.origin}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                      transition={{ delay: 1 + originIndex * 0.1, duration: 0.3 }}
                    >
                      <circle
                        cx={lastPoint.x}
                        cy={lastPoint.y}
                        r={4}
                        fill={origin.color}
                        stroke={isDarkMode ? '#1e293b' : 'white'}
                        strokeWidth={2}
                      />
                      {/* Price label at end */}
                      <text
                        x={lastPoint.x + 6}
                        y={lastPoint.y + 3}
                        textAnchor="start"
                        fill={origin.color}
                        fontSize={9}
                        fontWeight={600}
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {formatPriceAxis(lastPoint.price)}
                      </text>
                    </motion.g>
                  );
                })}

                {/* Axis lines */}
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={padding.left}
                  y2={padding.top + chartHeight}
                  stroke={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
                  strokeWidth={1}
                />
                <line
                  x1={padding.left}
                  y1={padding.top + chartHeight}
                  x2={padding.left + chartWidth}
                  y2={padding.top + chartHeight}
                  stroke={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
                  strokeWidth={1}
                />
              </svg>
            </Box>

            {/* Legend */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 2,
                mb: 2,
                flexWrap: 'wrap',
              }}
            >
              {ORIGIN_PRICE_HISTORY.map((origin) => (
                <Box
                  key={origin.origin}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 3,
                      borderRadius: 1,
                      bgcolor: origin.color,
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: 'text.secondary',
                      fontWeight: origin.origin === 'Colombia' ? 600 : 400,
                    }}
                  >
                    {origin.origin}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Stats Row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
                pb: 2,
                borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                pt: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: '11px',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 0.25,
                  }}
                >
                  Retorno {appreciation.years} años
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: emeraldCore.primary,
                    lineHeight: 1,
                  }}
                >
                  +{appreciation.percentage.toLocaleString()}%
                </Typography>
                <Typography
                  sx={{
                    fontSize: '9px',
                    color: 'text.secondary',
                    mt: 0.5,
                    opacity: 0.8,
                  }}
                >
                  Ganancia total acumulada
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  sx={{
                    fontSize: '11px',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 0.25,
                  }}
                >
                  CAGR
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: isDarkMode ? goldAccent.light : goldAccent.dark,
                    lineHeight: 1,
                  }}
                >
                  {(Math.pow(1 + appreciation.percentage / 100, 1 / Math.max(appreciation.years, 1)) * 100 - 100).toFixed(1)}%
                </Typography>
                <Typography
                  sx={{
                    fontSize: '9px',
                    color: 'text.secondary',
                    mt: 0.5,
                    opacity: 0.8,
                  }}
                >
                  Crecimiento anual promedio
                </Typography>
              </Box>
            </Box>

            {/* Footer */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  color: 'text.secondary',
                }}
              >
                Fuentes: Christie's, Sotheby's, Piat, Gemfields
              </Typography>

              <Button
                variant="text"
                size="small"
                endIcon={<AutoGraph sx={{ fontSize: 14 }} />}
                onClick={() => navigate('/valuation')}
                sx={{
                  fontSize: '11px',
                  textTransform: 'none',
                  fontWeight: 600,
                  color: emeraldCore.primary,
                  py: 0.5,
                  px: 1,
                  minWidth: 'auto',
                  '&:hover': {
                    bgcolor: isDarkMode ? 'rgba(0,174,122,0.1)' : 'rgba(0,174,122,0.05)',
                  },
                }}
              >
                Ver Detalles
              </Button>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};

export default ValuationSection;
