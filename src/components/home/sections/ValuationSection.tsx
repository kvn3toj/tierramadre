/**
 * ValuationSection Component
 *
 * Elegant line chart showing Colombian emerald appreciation over time.
 * Expanded design with animated SVG path and year range selector.
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
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { TrendingUp, AutoGraph } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { emeraldCore, goldAccent } from '../../../design-system/tokens/colors';
import { glassDark, glassLight, applyGlass } from '../../../design-system/tokens/glass';
import { fadeInUp, duration } from '../../../design-system/tokens/motion';
import {
  EMERALD_VALUATION_DATA,
  YEAR_RANGES,
  filterDataByYearRange,
  calculateAppreciation,
  ValuationDataPoint,
} from '../../../data/emerald-valuation';

// =============================================================================
// CHART CONFIGURATION - iOS HIG inspired dimensions
// Based on Apple Human Interface Guidelines:
// - Aspect ratio ~2.5:1 for compact financial charts
// - Minimum 44pt touch targets for data points
// - 8pt+ padding between elements
// - Width fills container for responsive design
// =============================================================================

const CHART_CONFIG = {
  width: 400, // Full width utilization
  height: 180, // Taller for better visibility
  padding: { top: 28, right: 12, bottom: 30, left: 36 }, // Reduced side padding
  pointRadius: 6,
  lineWidth: 2.5,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateChartPoints(data: ValuationDataPoint[]) {
  const { width, height, padding } = CHART_CONFIG;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minPrice = Math.min(...data.map((d) => d.price));
  const maxPrice = Math.max(...data.map((d) => d.price));
  const priceRange = maxPrice - minPrice || 1;

  return data.map((point, index) => ({
    ...point,
    x: padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding.top + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight,
  }));
}

function createSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;

    path += ` Q ${current.x + (midX - current.x) * 0.5} ${current.y}, ${midX} ${(current.y + next.y) / 2}`;
    path += ` Q ${midX + (next.x - midX) * 0.5} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
}

function createAreaPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return '';
  const linePath = createSmoothPath(points);
  const { height, padding } = CHART_CONFIG;
  const bottomY = height - padding.bottom;

  return `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
}

function formatPriceLabel(price: number): string {
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(0)}k`;
  }
  return `$${price}`;
}

function calculatePriceMarkers(data: ValuationDataPoint[]) {
  const { padding, height } = CHART_CONFIG;
  const chartHeight = height - padding.top - padding.bottom;

  const minPrice = Math.min(...data.map((d) => d.price));
  const maxPrice = Math.max(...data.map((d) => d.price));
  const midPrice = (maxPrice + minPrice) / 2;

  return [
    { price: maxPrice, y: padding.top, label: formatPriceLabel(maxPrice) },
    { price: midPrice, y: padding.top + chartHeight / 2, label: formatPriceLabel(midPrice) },
    { price: minPrice, y: padding.top + chartHeight, label: formatPriceLabel(minPrice) },
  ];
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

  // Year range state - default to 5 years (index 0)
  const [selectedRange, setSelectedRange] = useState(0);
  // Hover state for tooltips
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const glassEffect = isDarkMode ? glassDark.frosted : glassLight.frosted;

  // Filter data based on selected range
  const filteredData = useMemo(() => {
    const range = YEAR_RANGES[selectedRange];
    return filterDataByYearRange(EMERALD_VALUATION_DATA, range.startYear, range.endYear);
  }, [selectedRange]);

  const chartPoints = useMemo(() => calculateChartPoints(filteredData), [filteredData]);
  const linePath = useMemo(() => createSmoothPath(chartPoints), [chartPoints]);
  const areaPath = useMemo(() => createAreaPath(chartPoints), [chartPoints]);
  const appreciation = useMemo(() => calculateAppreciation(filteredData), [filteredData]);
  const priceMarkers = useMemo(() => calculatePriceMarkers(filteredData), [filteredData]);

  const lastPoint = filteredData[filteredData.length - 1];
  const firstPoint = filteredData[0];
  const pathLength = 500;

  const handleRangeChange = (_: React.MouseEvent<HTMLElement>, newRange: number | null) => {
    if (newRange !== null) {
      setSelectedRange(newRange);
    }
  };

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
            borderRadius: '22px', // iOS-style smooth corner radius
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: `linear-gradient(to bottom, ${emeraldCore.primary}, ${emeraldCore.dark})`,
              borderRadius: '22px 0 0 22px',
            },
          }}
        >
          <CardContent sx={{ py: 2.5, px: 2 }}>
            {/* Header - iOS HIG: 17pt semibold for titles */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp
                  sx={{
                    fontSize: 22,
                    color: emeraldCore.primary,
                  }}
                />
                <Typography
                  id="valuation-title"
                  sx={{
                    fontSize: '17px', // iOS HIG primary text
                    fontWeight: 600,
                    color: 'text.primary',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Inversión que trasciende
                </Typography>
              </Box>
            </Box>
            <Typography
              sx={{
                fontSize: '13px', // iOS HIG secondary text
                color: 'text.secondary',
                display: 'block',
                mb: 2,
                opacity: 0.8,
              }}
            >
              Precio por quilate - Esmeraldas colombianas grado inversión
            </Typography>

            {/* Year Range Selector - iOS HIG: 44pt minimum touch targets */}
            <ToggleButtonGroup
              value={selectedRange}
              exclusive
              onChange={handleRangeChange}
              size="small"
              sx={{
                mb: 2,
                display: 'flex',
                borderRadius: '12px',
                overflow: 'hidden',
                '& .MuiToggleButton-root': {
                  flex: 1,
                  fontSize: '13px', // iOS HIG secondary text
                  minHeight: '36px', // Comfortable touch target
                  py: 1,
                  px: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                  color: 'text.secondary',
                  border: 'none',
                  borderRight: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  '&:last-child': {
                    borderRight: 'none',
                  },
                  '&.Mui-selected': {
                    bgcolor: isDarkMode ? 'rgba(0,174,122,0.25)' : 'rgba(0,174,122,0.12)',
                    color: emeraldCore.primary,
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: isDarkMode ? 'rgba(0,174,122,0.35)' : 'rgba(0,174,122,0.18)',
                    },
                  },
                },
              }}
            >
              {YEAR_RANGES.map((range, index) => (
                <ToggleButton key={range.label} value={index}>
                  {range.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            {/* SVG Chart - expanded to fill card width */}
            <Box
              sx={{
                height: CHART_CONFIG.height + 20,
                position: 'relative',
                mb: 1.5,
                mx: -2, // Negative margin to extend to card edges
              }}
            >
              <svg
                viewBox={`0 0 ${CHART_CONFIG.width} ${CHART_CONFIG.height}`}
                width="100%"
                height="100%"
                role="img"
                aria-label={`Gráfica de valorización de esmeraldas colombianas mostrando un incremento del ${appreciation.percentage}% en ${appreciation.years} años`}
                style={{ overflow: 'visible' }}
              >
                {/* Gradient definitions */}
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={emeraldCore.primary} stopOpacity={0.4} />
                    <stop offset="50%" stopColor={emeraldCore.primary} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={emeraldCore.primary} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={emeraldCore.dark} />
                    <stop offset="50%" stopColor={emeraldCore.primary} />
                    <stop offset="100%" stopColor={emeraldCore.light} />
                  </linearGradient>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Horizontal grid lines - enhanced visibility */}
                {[0.25, 0.5, 0.75].map((ratio) => (
                  <line
                    key={ratio}
                    x1={CHART_CONFIG.padding.left}
                    y1={CHART_CONFIG.padding.top + (CHART_CONFIG.height - CHART_CONFIG.padding.top - CHART_CONFIG.padding.bottom) * ratio}
                    x2={CHART_CONFIG.width - CHART_CONFIG.padding.right}
                    y2={CHART_CONFIG.padding.top + (CHART_CONFIG.height - CHART_CONFIG.padding.top - CHART_CONFIG.padding.bottom) * ratio}
                    stroke={isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}
                    strokeWidth={1}
                  />
                ))}

                {/* Y-axis price labels - floating markers */}
                {priceMarkers.map((marker, index) => (
                  <motion.text
                    key={`y-label-${index}-${selectedRange}`}
                    x={CHART_CONFIG.padding.left - 5}
                    y={marker.y + 4}
                    textAnchor="end"
                    fill={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'}
                    fontSize={9}
                    fontWeight={500}
                    fontFamily="inherit"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: 1.1 + index * 0.1, duration: 0.3 }}
                  >
                    {marker.label}
                  </motion.text>
                ))}

                {/* Area fill */}
                <motion.path
                  key={`area-${selectedRange}`}
                  d={areaPath}
                  fill="url(#areaGradient)"
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: duration.slow, delay: 0.3 }}
                />

                {/* Animated line with glow */}
                <motion.path
                  key={`line-${selectedRange}`}
                  d={linePath}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth={CHART_CONFIG.lineWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                  transition={{
                    pathLength: { duration: 1, ease: 'easeOut' },
                    opacity: { duration: 0.2 },
                  }}
                  style={{
                    strokeDasharray: pathLength,
                    strokeDashoffset: pathLength,
                  }}
                />

                {/* Data points with hover tooltips */}
                {chartPoints.map((point, index) => {
                  const isHovered = hoveredPoint === index;
                  const tooltipWidth = 58;
                  const tooltipHeight = 32;

                  return (
                    <motion.g
                      key={`point-${point.year}-${selectedRange}`}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredPoint(index)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Point glow */}
                      <motion.circle
                        cx={point.x}
                        cy={point.y}
                        r={CHART_CONFIG.pointRadius + 6}
                        fill={emeraldCore.primary}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={isInView ? { opacity: isHovered ? 0.3 : 0.15, scale: 1 } : { opacity: 0, scale: 0 }}
                        transition={{
                          delay: 0.8 + index * 0.1,
                          duration: 0.3,
                        }}
                      />
                      {/* Point */}
                      <motion.circle
                        cx={point.x}
                        cy={point.y}
                        r={CHART_CONFIG.pointRadius}
                        fill={isDarkMode ? emeraldCore.light : emeraldCore.dark}
                        stroke={isDarkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.95)'}
                        strokeWidth={2.5}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={isInView ? { opacity: 1, scale: isHovered ? 1.2 : 1 } : { opacity: 0, scale: 0 }}
                        transition={{
                          delay: 0.8 + index * 0.1,
                          duration: 0.3,
                          type: 'spring',
                          stiffness: 300,
                          damping: 20,
                        }}
                      />
                      {/* Hover hitbox - 44pt minimum touch target per iOS HIG */}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={22} // 44pt diameter (22pt radius) per iOS HIG
                        fill="transparent"
                      />
                      {/* Tooltip on hover */}
                      {isHovered && (
                        <motion.g
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {/* Tooltip background */}
                          <rect
                            x={point.x - tooltipWidth / 2}
                            y={point.y - tooltipHeight - 14}
                            width={tooltipWidth}
                            height={tooltipHeight}
                            rx={6}
                            fill={isDarkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.98)'}
                            stroke={emeraldCore.primary}
                            strokeWidth={1}
                            filter="url(#glow)"
                          />
                          {/* Year */}
                          <text
                            x={point.x}
                            y={point.y - tooltipHeight - 14 + 13}
                            textAnchor="middle"
                            fill={isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'}
                            fontSize={9}
                            fontWeight={500}
                            fontFamily="inherit"
                          >
                            {point.year}
                          </text>
                          {/* Price */}
                          <text
                            x={point.x}
                            y={point.y - tooltipHeight - 14 + 26}
                            textAnchor="middle"
                            fill={emeraldCore.primary}
                            fontSize={11}
                            fontWeight={700}
                            fontFamily="inherit"
                          >
                            {point.label || formatPriceLabel(point.price)}
                          </text>
                        </motion.g>
                      )}
                    </motion.g>
                  );
                })}

                {/* Growth badge at curve midpoint */}
                {chartPoints.length > 1 && (() => {
                  const midIndex = Math.floor(chartPoints.length / 2);
                  const midPoint = chartPoints[midIndex];
                  const badgeWidth = 52;
                  const badgeHeight = 18;

                  return (
                    <motion.g
                      key={`growth-badge-${selectedRange}`}
                      initial={{ opacity: 0, y: -8 }}
                      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
                      transition={{ delay: 1.5, duration: 0.4 }}
                    >
                      {/* Connector line */}
                      <line
                        x1={midPoint.x}
                        y1={midPoint.y - 10}
                        x2={midPoint.x}
                        y2={midPoint.y - 22}
                        stroke={emeraldCore.primary}
                        strokeWidth={1.5}
                        strokeDasharray="2 2"
                        opacity={0.5}
                      />
                      {/* Badge background */}
                      <rect
                        x={midPoint.x - badgeWidth / 2}
                        y={midPoint.y - 22 - badgeHeight}
                        width={badgeWidth}
                        height={badgeHeight}
                        rx={9}
                        fill={isDarkMode ? 'rgba(0,174,122,0.25)' : 'rgba(0,174,122,0.15)'}
                        stroke={emeraldCore.primary}
                        strokeWidth={1}
                        opacity={0.95}
                      />
                      {/* Percentage text */}
                      <text
                        x={midPoint.x}
                        y={midPoint.y - 22 - badgeHeight / 2 + 4}
                        textAnchor="middle"
                        fill={emeraldCore.primary}
                        fontSize={11}
                        fontWeight={700}
                        fontFamily="inherit"
                      >
                        +{appreciation.percentage}%
                      </text>
                    </motion.g>
                  );
                })()}

                {/* Year labels */}
                {chartPoints.length > 0 && (
                  <>
                    {/* Start year */}
                    <motion.text
                      key={`start-${selectedRange}`}
                      x={chartPoints[0].x}
                      y={CHART_CONFIG.height - 5}
                      textAnchor="middle"
                      fill={isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'}
                      fontSize={11}
                      fontWeight={500}
                      fontFamily="inherit"
                      initial={{ opacity: 0 }}
                      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ delay: 1.2, duration: 0.3 }}
                    >
                      {firstPoint?.year}
                    </motion.text>
                    {/* End year */}
                    <motion.text
                      key={`end-${selectedRange}`}
                      x={chartPoints[chartPoints.length - 1].x}
                      y={CHART_CONFIG.height - 5}
                      textAnchor="middle"
                      fill={isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'}
                      fontSize={11}
                      fontWeight={500}
                      fontFamily="inherit"
                      initial={{ opacity: 0 }}
                      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ delay: 1.2, duration: 0.3 }}
                    >
                      {lastPoint?.year}
                    </motion.text>
                  </>
                )}

                {/* Start price label */}
                {chartPoints.length > 0 && (
                  <motion.text
                    key={`start-price-${selectedRange}`}
                    x={chartPoints[0].x - 5}
                    y={chartPoints[0].y + 4}
                    textAnchor="end"
                    fill={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'}
                    fontSize={10}
                    fontWeight={500}
                    fontFamily="inherit"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: 1.3, duration: 0.3 }}
                  >
                    {firstPoint?.label}
                  </motion.text>
                )}

                {/* End price label - More prominent */}
                {chartPoints.length > 0 && (
                  <motion.g
                    key={`price-group-${selectedRange}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                    transition={{ delay: 1.3, duration: 0.4 }}
                  >
                    <motion.text
                      x={chartPoints[chartPoints.length - 1].x + 8}
                      y={chartPoints[chartPoints.length - 1].y + 5}
                      textAnchor="start"
                      fill={isDarkMode ? goldAccent.light : goldAccent.dark}
                      fontSize={14}
                      fontWeight={700}
                      fontFamily="inherit"
                    >
                      {lastPoint?.label}
                    </motion.text>
                  </motion.g>
                )}
              </svg>

              {/* Screen reader data table - visually hidden */}
              <Box
                component="table"
                sx={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              >
                <caption>Precio por quilate de esmeraldas colombianas</caption>
                <thead>
                  <tr>
                    <th>Año</th>
                    <th>Precio USD/ct</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((point) => (
                    <tr key={point.year}>
                      <td>{point.year}</td>
                      <td>${point.price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>

            {/* Stats Row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
                pb: 2,
                borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    color: isDarkMode ? emeraldCore.light : emeraldCore.dark,
                    lineHeight: 1,
                    fontSize: '2rem',
                  }}
                >
                  +{appreciation.percentage.toLocaleString()}%
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 500,
                  }}
                >
                  en {appreciation.years} años
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: isDarkMode ? 'rgba(0,174,122,0.15)' : 'rgba(0,174,122,0.08)',
                }}
              >
                <TrendingUp sx={{ fontSize: 14, color: emeraldCore.primary }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: emeraldCore.primary,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}
                >
                  ~{Math.round(appreciation.percentage / Math.max(appreciation.years, 1))}%/año
                </Typography>
              </Box>
            </Box>

            {/* Footer with sources and Learn More button */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                }}
              >
                Fuentes: Christie's, Sotheby's, GIA
              </Typography>

              <Button
                variant="contained"
                size="small"
                startIcon={<AutoGraph sx={{ fontSize: 16 }} />}
                onClick={() => navigate('/valuation')}
                sx={{
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: emeraldCore.primary,
                  color: 'white',
                  py: 0.75,
                  px: 2,
                  borderRadius: 2,
                  boxShadow: `0 2px 8px ${isDarkMode ? 'rgba(0,174,122,0.4)' : 'rgba(0,174,122,0.3)'}`,
                  '&:hover': {
                    bgcolor: emeraldCore.dark,
                    boxShadow: `0 4px 12px ${isDarkMode ? 'rgba(0,174,122,0.5)' : 'rgba(0,174,122,0.4)'}`,
                  },
                }}
              >
                Aprender más
              </Button>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};

export default ValuationSection;
