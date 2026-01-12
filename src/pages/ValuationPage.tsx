/**
 * ValuationPage - Detailed Emerald Valuation Information
 *
 * Comprehensive page showing Colombian emerald investment data,
 * historical events, origin comparisons, and auction records.
 * Now with professional multi-origin comparison chart and slider.
 *
 * Designed by: Aria + Nira + Eunoia
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  Tooltip,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import {
  ArrowBack,
  TrendingUp,
  EmojiEvents,
  Public,
  Timeline,
  Verified,
  Info,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { emeraldCore, goldAccent } from '../design-system/tokens/colors';
import { glassDark, glassLight, applyGlass } from '../design-system/tokens/glass';
import { staggerContainer, staggerItem } from '../design-system/tokens/motion';
import {
  EMERALD_VALUATION_DATA,
  ZAMBIAN_VALUATION_DATA,
  BRAZILIAN_VALUATION_DATA,
  ORIGIN_PRICE_HISTORY,
  HISTORICAL_EVENTS,
  ORIGIN_COMPARISON,
  AUCTION_RECORDS,
  VALUATION_METADATA,
  filterDataByYearRange,
  calculateAppreciation,
  ValuationDataPoint,
} from '../data/emerald-valuation';

// =============================================================================
// CHART CONFIGURATION - Larger for detail page
// =============================================================================

const CHART_CONFIG = {
  width: 400,
  height: 280,
  padding: { top: 30, right: 60, bottom: 45, left: 55 },
  lineWidth: 2.5,
};

const CURRENT_YEAR = 2026;
const MIN_YEAR = 2005;
const MIN_YEARS = 1; // Now supports 1 year since we have yearly data
const YEAR_MARKS = [
  { value: 1, label: '1A' },
  { value: 5, label: '5A' },
  { value: 10, label: '10A' },
  { value: 21, label: 'Max' },
];

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

function formatPriceAxis(price: number): string {
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}k`;
  return `$${price}`;
}

function calculateYAxisTicks(maxPrice: number): number[] {
  const niceMax = Math.ceil(maxPrice / 20000) * 20000;
  const step = niceMax / 5;
  return [0, step, step * 2, step * 3, step * 4, niceMax];
}

function calculateXAxisTicks(startYear: number, endYear: number): number[] {
  const range = endYear - startYear;
  if (range <= 3) {
    const ticks = [];
    for (let y = startYear; y <= endYear; y++) ticks.push(y);
    return ticks;
  }
  if (range <= 10) {
    const step = Math.ceil(range / 5);
    const ticks = [];
    for (let y = startYear; y <= endYear; y += step) ticks.push(y);
    if (ticks[ticks.length - 1] !== endYear) ticks.push(endYear);
    return ticks;
  }
  const step = Math.floor(range / 5);
  return [startYear, startYear + step, startYear + step * 2, startYear + step * 3, startYear + step * 4, endYear];
}

// =============================================================================
// COMPONENT
// =============================================================================

const ValuationPage: React.FC = () => {
  const muiTheme = useMuiTheme();
  const isDarkMode = muiTheme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [yearsBack, setYearsBack] = useState(21);
  const [hoveredOrigin, setHoveredOrigin] = useState<string | null>(null);

  const glassEffect = isDarkMode ? glassDark.frosted : glassLight.frosted;
  const glassSubtle = isDarkMode ? glassDark.ultraThin : glassLight.ultraThin;

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

  const handleSliderChange = (_: Event, newValue: number | number[]) => {
    setYearsBack(newValue as number);
  };

  const { width, height, padding } = CHART_CONFIG;
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  // Calculate CAGR
  const cagr = appreciation.years > 0
    ? (Math.pow(1 + appreciation.percentage / 100, 1 / appreciation.years) * 100 - 100).toFixed(1)
    : '0';

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        pb: 12,
        bgcolor: isDarkMode ? 'background.default' : '#F9FAFB',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          ...applyGlass(glassEffect),
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
            Valorización de Esmeraldas
          </Typography>
          <TrendingUp sx={{ color: emeraldCore.primary }} />
        </Box>
      </Box>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{ padding: '16px' }}
      >
        {/* Main Chart Section - Enhanced */}
        <motion.div variants={staggerItem}>
          <Card sx={{ ...applyGlass(glassEffect), borderRadius: 4, mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Comparación de Precios
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Precio por quilate según origen - Grado inversión
                  </Typography>
                </Box>
                <Tooltip title="CAGR = Tasa de Crecimiento Anual Compuesta. El retorno anual promedio si el crecimiento fuera perfectamente uniforme cada año.">
                  <IconButton size="small" sx={{ mt: -0.5 }}>
                    <Info sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Time Range Slider - Enhanced UX */}
              <Box
                sx={{
                  px: 2,
                  py: 2,
                  mb: 3,
                  borderRadius: 2,
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{ fontSize: '13px', color: 'text.secondary', fontWeight: 500 }}>
                    Período de Análisis
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      bgcolor: isDarkMode ? 'rgba(0,174,122,0.15)' : 'rgba(0,174,122,0.1)',
                    }}
                  >
                    <Typography sx={{ fontSize: '14px', fontWeight: 700, color: emeraldCore.primary }}>
                      {startYear} - {endYear}
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
                      ({yearsBack} años)
                    </Typography>
                  </Box>
                </Box>
                <Slider
                  value={yearsBack}
                  onChange={handleSliderChange}
                  min={MIN_YEARS}
                  max={21}
                  step={1}
                  marks={YEAR_MARKS}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${v} años`}
                  sx={{
                    color: emeraldCore.primary,
                    height: 8,
                    '& .MuiSlider-thumb': {
                      width: 24,
                      height: 24,
                      bgcolor: emeraldCore.primary,
                      boxShadow: `0 2px 8px ${isDarkMode ? 'rgba(0,174,122,0.4)' : 'rgba(0,174,122,0.3)'}`,
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: 'white',
                      },
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: `0 0 0 10px ${isDarkMode ? 'rgba(0,174,122,0.2)' : 'rgba(0,174,122,0.15)'}`,
                      },
                    },
                    '& .MuiSlider-track': {
                      bgcolor: emeraldCore.primary,
                      border: 'none',
                    },
                    '& .MuiSlider-rail': {
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                      opacity: 1,
                    },
                    '& .MuiSlider-mark': {
                      bgcolor: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)',
                      width: 3,
                      height: 12,
                      borderRadius: 1,
                    },
                    '& .MuiSlider-markActive': {
                      bgcolor: 'white',
                    },
                    '& .MuiSlider-markLabel': {
                      fontSize: '11px',
                      color: 'text.secondary',
                      fontWeight: 500,
                    },
                    '& .MuiSlider-valueLabel': {
                      bgcolor: emeraldCore.dark,
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: 1,
                    },
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '10px',
                    color: 'text.secondary',
                    textAlign: 'center',
                    mt: 1,
                    opacity: 0.7,
                  }}
                >
                  Desliza para ajustar el rango de tiempo del análisis
                </Typography>
              </Box>

              {/* Professional Multi-Origin Chart */}
              <Box sx={{ height: height + 20, mb: 2 }}>
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  width="100%"
                  height="100%"
                  style={{ overflow: 'visible' }}
                >
                  {/* Chart background */}
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
                          strokeDasharray={index === 0 ? 'none' : '3 3'}
                        />
                        <text
                          x={padding.left - 10}
                          y={y + 4}
                          textAnchor="end"
                          fill={isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                          fontSize={10}
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {formatPriceAxis(tick)}
                        </text>
                      </g>
                    );
                  })}

                  {/* X-axis labels */}
                  {xAxisTicks.map((year) => {
                    const x = padding.left + ((year - startYear) / (endYear - startYear || 1)) * chartWidth;
                    return (
                      <text
                        key={`x-${year}`}
                        x={x}
                        y={height - 10}
                        textAnchor="middle"
                        fill={isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                        fontSize={10}
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
                    const isHovered = hoveredOrigin === origin.origin;
                    const isOtherHovered = hoveredOrigin && hoveredOrigin !== origin.origin;

                    return (
                      <motion.path
                        key={`line-${origin.origin}-${yearsBack}`}
                        d={path}
                        fill="none"
                        stroke={origin.color}
                        strokeWidth={origin.origin === 'Colombia' ? CHART_CONFIG.lineWidth + 1 : CHART_CONFIG.lineWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={isOtherHovered ? 0.3 : isHovered ? 1 : origin.origin === 'Colombia' ? 1 : 0.7}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: 'easeOut', delay: originIndex * 0.2 }}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredOrigin(origin.origin)}
                        onMouseLeave={() => setHoveredOrigin(null)}
                      />
                    );
                  })}

                  {/* Data points and end labels */}
                  {ORIGIN_PRICE_HISTORY.map((origin, originIndex) => {
                    const points = chartPointsMulti[originIndex];
                    if (!points || points.length === 0) return null;
                    const lastPoint = points[points.length - 1];
                    const firstPoint = points[0];
                    const isHovered = hoveredOrigin === origin.origin;

                    return (
                      <g key={`points-${origin.origin}`}>
                        {/* Start point */}
                        <motion.circle
                          cx={firstPoint.x}
                          cy={firstPoint.y}
                          r={isHovered ? 5 : 3}
                          fill={origin.color}
                          stroke={isDarkMode ? '#1e293b' : 'white'}
                          strokeWidth={2}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.2 + originIndex * 0.1 }}
                        />
                        {/* End point */}
                        <motion.circle
                          cx={lastPoint.x}
                          cy={lastPoint.y}
                          r={isHovered ? 6 : 4}
                          fill={origin.color}
                          stroke={isDarkMode ? '#1e293b' : 'white'}
                          strokeWidth={2}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.4 + originIndex * 0.1 }}
                        />
                        {/* End price label */}
                        <motion.text
                          x={lastPoint.x + 8}
                          y={lastPoint.y + 4}
                          textAnchor="start"
                          fill={origin.color}
                          fontSize={11}
                          fontWeight={600}
                          fontFamily="system-ui, -apple-system, sans-serif"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.6 + originIndex * 0.1 }}
                        >
                          {formatPriceAxis(lastPoint.price)}
                        </motion.text>
                      </g>
                    );
                  })}

                  {/* Axis lines */}
                  <line
                    x1={padding.left}
                    y1={padding.top}
                    x2={padding.left}
                    y2={padding.top + chartHeight}
                    stroke={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
                    strokeWidth={1}
                  />
                  <line
                    x1={padding.left}
                    y1={padding.top + chartHeight}
                    x2={padding.left + chartWidth}
                    y2={padding.top + chartHeight}
                    stroke={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
                    strokeWidth={1}
                  />
                </svg>
              </Box>

              {/* Interactive Legend */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 3,
                  mb: 3,
                  flexWrap: 'wrap',
                }}
              >
                {ORIGIN_PRICE_HISTORY.map((origin) => {
                  const originData = filterDataByYearRange(origin.data, startYear, endYear);
                  const originAppreciation = calculateAppreciation(originData);
                  const isHovered = hoveredOrigin === origin.origin;

                  return (
                    <Box
                      key={origin.origin}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 2,
                        cursor: 'pointer',
                        bgcolor: isHovered
                          ? isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                          : 'transparent',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        },
                      }}
                      onMouseEnter={() => setHoveredOrigin(origin.origin)}
                      onMouseLeave={() => setHoveredOrigin(null)}
                    >
                      <Box
                        sx={{
                          width: 16,
                          height: 4,
                          borderRadius: 2,
                          bgcolor: origin.color,
                        }}
                      />
                      <Box>
                        <Typography
                          sx={{
                            fontSize: '12px',
                            fontWeight: origin.origin === 'Colombia' ? 600 : 500,
                            color: isHovered ? origin.color : 'text.primary',
                          }}
                        >
                          {origin.origin}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '10px',
                            color: origin.color,
                            fontWeight: 600,
                          }}
                        >
                          +{originAppreciation.percentage}%
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {/* Stats Grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: '10px',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      mb: 0.5,
                    }}
                  >
                    Retorno Colombia
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '1.75rem',
                      fontWeight: 700,
                      color: emeraldCore.primary,
                      lineHeight: 1,
                    }}
                  >
                    +{appreciation.percentage}%
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: '10px',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      mb: 0.5,
                    }}
                  >
                    CAGR
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '1.75rem',
                      fontWeight: 700,
                      color: isDarkMode ? goldAccent.light : goldAccent.dark,
                      lineHeight: 1,
                    }}
                  >
                    {cagr}%
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: '10px',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      mb: 0.5,
                    }}
                  >
                    Período
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '1.75rem',
                      fontWeight: 700,
                      color: 'text.primary',
                      lineHeight: 1,
                    }}
                  >
                    {appreciation.years} años
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* Price Context / Understanding the Data */}
        <motion.div variants={staggerItem}>
          <Card sx={{ ...applyGlass(glassSubtle), borderRadius: 4, mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Info sx={{ color: emeraldCore.primary }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Entendiendo los Datos
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Estos precios representan <strong>resultados de subastas de primer nivel</strong> para esmeraldas
                grado inversión, compilados de datos de ventas de Christie's, Sotheby's y análisis de mercado de Piat.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDarkMode ? 'rgba(0,174,122,0.1)' : 'rgba(0,174,122,0.05)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: emeraldCore.primary }}>
                    ¿Qué es "Grado Inversión"?
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Color excepcional, alta claridad, mínimo tratamiento, excelente corte y procedencia verificada.
                    Típicamente 3+ quilates con documentación de GIA o laboratorios similares.
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    ¿Por qué el Premium Colombiano?
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Las esmeraldas colombianas tienen precios 2-4x mayores debido a su único efecto óptico "gota de aceite",
                    su tono verde-amarillo cálido, y siglos de prestigio en joyería fina.
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Precio de Mercado vs Retail
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Los precios de joyería retail incluyen márgenes significativos (50-300%). Estos precios de subasta
                    reflejan valores de mercado mayorista para piedras sueltas excepcionales.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* Historical Events */}
        <motion.div variants={staggerItem}>
          <Card sx={{ ...applyGlass(glassSubtle), borderRadius: 4, mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Timeline sx={{ color: emeraldCore.primary }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Eventos Históricos
                </Typography>
              </Box>

              {HISTORICAL_EVENTS.map((event, index) => (
                <Box
                  key={event.year}
                  sx={{
                    mb: index < HISTORICAL_EVENTS.length - 1 ? 2 : 0,
                    pl: 2,
                    borderLeft: `2px solid ${
                      event.impact === 'positive'
                        ? emeraldCore.primary
                        : event.impact === 'negative'
                          ? '#EF4444'
                          : 'rgba(128,128,128,0.5)'
                    }`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label={event.year}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        height: 20,
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {event.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {event.description}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Origin Comparison */}
        <motion.div variants={staggerItem}>
          <Card sx={{ ...applyGlass(glassSubtle), borderRadius: 4, mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Public sx={{ color: emeraldCore.primary }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Comparación por Origen (2025)
                </Typography>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Origen</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        Comercial
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        Inversión
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ORIGIN_COMPARISON.map((row) => (
                      <TableRow key={row.origin}>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{row.flag}</span>
                            <span>{row.origin}</span>
                            {row.origin === 'Colombia' && (
                              <Verified sx={{ fontSize: 14, color: emeraldCore.primary }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                          ${row.commercial.min.toLocaleString()}-${row.commercial.max.toLocaleString()}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: row.origin === 'Colombia' ? 600 : 400,
                            color: row.origin === 'Colombia' ? emeraldCore.primary : 'inherit',
                          }}
                        >
                          ${row.investment.min.toLocaleString()}-${row.investment.max.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}
              >
                Las esmeraldas colombianas comandan un premium de 2-4x sobre otras fuentes
              </Typography>
            </CardContent>
          </Card>
        </motion.div>

        {/* Auction Records */}
        <motion.div variants={staggerItem}>
          <Card sx={{ ...applyGlass(glassSubtle), borderRadius: 4, mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EmojiEvents sx={{ color: goldAccent.primary }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Récords en Subastas
                </Typography>
              </Box>

              {AUCTION_RECORDS.map((record, index) => (
                <Box
                  key={record.name}
                  sx={{
                    p: 1.5,
                    mb: index < AUCTION_RECORDS.length - 1 ? 1.5 : 0,
                    borderRadius: 2,
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {record.name}
                    </Typography>
                    <Chip
                      label={record.year}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {record.house} • {record.carats} ct
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: goldAccent.primary }}
                    >
                      ${record.price.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: emeraldCore.primary, fontWeight: 500 }}
                  >
                    ${record.pricePerCarat.toLocaleString()}/ct
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sources with Links */}
        <motion.div variants={staggerItem}>
          <Card sx={{ ...applyGlass(glassSubtle), borderRadius: 4, mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Fuentes y Metodología
              </Typography>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                {VALUATION_METADATA.disclaimer}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {VALUATION_METADATA.sourceLinks.map((source) => (
                  <Box
                    key={source.name}
                    component="a"
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      color: emeraldCore.primary,
                      textDecoration: 'none',
                      fontSize: '0.8rem',
                      py: 0.5,
                      px: 1,
                      borderRadius: 1,
                      transition: 'background-color 0.2s',
                      '&:hover': {
                        bgcolor: isDarkMode ? 'rgba(0,174,122,0.1)' : 'rgba(0,174,122,0.05)',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    <Verified sx={{ fontSize: 14 }} />
                    {source.name}
                  </Box>
                ))}
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 2, textAlign: 'center' }}
              >
                Última actualización: {VALUATION_METADATA.lastUpdated}
              </Typography>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </Box>
  );
};

export default ValuationPage;
