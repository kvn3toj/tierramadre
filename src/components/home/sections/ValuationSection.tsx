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
import { emeraldAlpha } from '../../../design-system/utils/colorUtils';
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

  const allPrices = allData.flatMap((data) =>
    data.filter((d) => d.year >= startYear && d.year <= endYear).map((d) => d.price)
  );
  const minPrice = 0;
  const maxPrice = Math.max(...allPrices) * 1.1;
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

function createAreaPath(points: ChartPoint[]) {
  if (points.length < 2) return '';
  const { height, padding } = CHART_CONFIG;
  const chartBottom = height - padding.bottom;
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return `${linePath} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`;
}

function formatPriceAxis(price: number): string {
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}k`;
  }
  return `$${price}`;
}

function calculateYAxisTicks(maxPrice: number): number[] {
  const niceMax = Math.ceil(maxPrice / 20000) * 20000;
  const step = niceMax / 4;
  return [0, step, step * 2, step * 3, niceMax];
}

function calculateXAxisTicks(startYear: number, endYear: number): number[] {
  const range = endYear - startYear;
  if (range <= 5) return [startYear, endYear];
  if (range <= 10) return [startYear, startYear + Math.floor(range / 2), endYear];
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

  const [yearsBack, setYearsBack] = useState(5);

  const glassEffect = isDarkMode ? glassDark.frosted : glassLight.frosted;

  const endYear = CURRENT_YEAR;
  const startYear = Math.max(MIN_YEAR, CURRENT_YEAR - yearsBack);

  const allOriginData = useMemo(
    () => [EMERALD_VALUATION_DATA, ZAMBIAN_VALUATION_DATA, BRAZILIAN_VALUATION_DATA],
    []
  );

  const chartPointsMulti = useMemo(
    () => calculateChartPointsMulti(allOriginData, startYear, endYear),
    [allOriginData, startYear, endYear]
  );

  const colombianFiltered = useMemo(
    () => filterDataByYearRange(EMERALD_VALUATION_DATA, startYear, endYear),
    [startYear, endYear]
  );
  const appreciation = useMemo(() => calculateAppreciation(colombianFiltered), [colombianFiltered]);

  const maxPrice = useMemo(() => {
    const allPrices = allOriginData.flatMap((data) =>
      data.filter((d) => d.year >= startYear && d.year <= endYear).map((d) => d.price)
    );
    return Math.max(...allPrices) * 1.1;
  }, [allOriginData, startYear, endYear]);

  const yAxisTicks = useMemo(() => calculateYAxisTicks(maxPrice), [maxPrice]);
  const xAxisTicks = useMemo(() => calculateXAxisTicks(startYear, endYear), [startYear, endYear]);

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
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: isDarkMode
              ? `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`
              : `0 4px 24px rgba(0,0,0,0.08)`,
          }}
        >
          <CardContent sx={{ py: 2.5, px: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
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
                  Indice de Precios de Esmeraldas
                </Typography>
                <Typography
                  sx={{
                    fontSize: '12px',
                    color: 'text.secondary',
                    mt: 0.25,
                  }}
                >
                  Precio grado inversion por quilate (USD)
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDarkMode
                    ? `linear-gradient(135deg, ${emeraldAlpha(0.15)} 0%, ${emeraldAlpha(0.08)} 100%)`
                    : `linear-gradient(135deg, ${emeraldCore.lightest} 0%, rgba(0,174,122,0.06) 100%)`,
                  border: `1px solid ${emeraldAlpha(0.15)}`,
                }}
              >
                <TrendingUp sx={{ fontSize: 18, color: emeraldCore.primary }} />
              </Box>
            </Box>

            {/* Time Filter Pills - Refined with glass effect */}
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                mb: 2,
                p: 0.5,
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderRadius: 2,
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
                      borderRadius: 1.5,
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'white' : 'text.secondary',
                      bgcolor: isActive
                        ? emeraldCore.primary
                        : 'transparent',
                      boxShadow: isActive
                        ? `0 2px 8px ${emeraldAlpha(0.3)}`
                        : 'none',
                      transition: 'all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
                      '&:hover': {
                        bgcolor: isActive
                          ? emeraldCore.primary
                          : isDarkMode
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.04)',
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
                <defs>
                  {/* Gradient fills for area under each line */}
                  {ORIGIN_PRICE_HISTORY.map((origin) => (
                    <linearGradient key={`grad-${origin.origin}`} id={`area-${origin.origin}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={origin.color} stopOpacity={origin.origin === 'Colombia' ? 0.2 : 0.08} />
                      <stop offset="100%" stopColor={origin.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>

                {/* Background */}
                <rect
                  x={padding.left}
                  y={padding.top}
                  width={chartWidth}
                  height={chartHeight}
                  fill={isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'}
                  rx={4}
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
                        stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                        strokeWidth={1}
                        strokeDasharray={index === 0 ? 'none' : '3 3'}
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 3}
                        textAnchor="end"
                        fill={isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'}
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
                      fill={isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'}
                      fontSize={9}
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {year}
                    </text>
                  );
                })}

                {/* Area fills under each line (rendered first, behind lines) */}
                {ORIGIN_PRICE_HISTORY.map((origin, originIndex) => {
                  const points = chartPointsMulti[originIndex];
                  if (!points || points.length < 2) return null;
                  const areaPath = createAreaPath(points);

                  return (
                    <motion.path
                      key={`area-${origin.origin}-${yearsBack}`}
                      d={areaPath}
                      fill={`url(#area-${origin.origin})`}
                      initial={{ opacity: 0 }}
                      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 1, delay: originIndex * 0.15 + 0.5 }}
                    />
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
                      opacity={origin.origin === 'Colombia' ? 1 : 0.6}
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
                      {/* Glow ring for Colombia */}
                      {origin.origin === 'Colombia' && (
                        <circle
                          cx={lastPoint.x}
                          cy={lastPoint.y}
                          r={8}
                          fill="none"
                          stroke={origin.color}
                          strokeWidth={1}
                          opacity={0.3}
                        />
                      )}
                      <circle
                        cx={lastPoint.x}
                        cy={lastPoint.y}
                        r={4}
                        fill={origin.color}
                        stroke={isDarkMode ? '#1e293b' : 'white'}
                        strokeWidth={2}
                      />
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
                  stroke={isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                  strokeWidth={1}
                />
                <line
                  x1={padding.left}
                  y1={padding.top + chartHeight}
                  x2={padding.left + chartWidth}
                  y2={padding.top + chartHeight}
                  stroke={isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                  strokeWidth={1}
                />
              </svg>
            </Box>

            {/* Legend - Refined with better spacing */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 2.5,
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
                    gap: 0.75,
                  }}
                >
                  <Box
                    sx={{
                      width: 14,
                      height: 3,
                      borderRadius: 1.5,
                      bgcolor: origin.color,
                      boxShadow: origin.origin === 'Colombia'
                        ? `0 0 6px ${origin.color}40`
                        : 'none',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '11px',
                      color: 'text.secondary',
                      fontWeight: origin.origin === 'Colombia' ? 600 : 400,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {origin.origin}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Stats Row - Refined with glass card feel */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 1.5,
                mb: 2,
                pt: 2,
                borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
              }}
            >
              {/* Total Return */}
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '10px',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    mb: 0.5,
                    fontWeight: 500,
                  }}
                >
                  Retorno {appreciation.years}A
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1.4rem',
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
                    opacity: 0.7,
                  }}
                >
                  Ganancia total acumulada
                </Typography>
              </Box>

              {/* CAGR */}
              <Box
                sx={{
                  flex: 1,
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '10px',
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    mb: 0.5,
                    fontWeight: 500,
                  }}
                >
                  CAGR
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1.4rem',
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
                    opacity: 0.7,
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
                  opacity: 0.7,
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
                  px: 1.5,
                  minWidth: 'auto',
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: isDarkMode ? emeraldAlpha(0.1) : emeraldAlpha(0.06),
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
