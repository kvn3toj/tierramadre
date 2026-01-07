/**
 * ValuationPage - Detailed Emerald Valuation Information
 *
 * Comprehensive page showing Colombian emerald investment data,
 * historical events, origin comparisons, and auction records.
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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import {
  ArrowBack,
  TrendingUp,
  EmojiEvents,
  Public,
  Timeline,
  Verified,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { emeraldCore, goldAccent } from '../design-system/tokens/colors';
import { glassDark, glassLight, applyGlass } from '../design-system/tokens/glass';
import { staggerContainer, staggerItem } from '../design-system/tokens/motion';
import {
  EMERALD_VALUATION_DATA,
  HISTORICAL_EVENTS,
  ORIGIN_COMPARISON,
  AUCTION_RECORDS,
  YEAR_RANGES,
  VALUATION_METADATA,
  filterDataByYearRange,
  calculateAppreciation,
  ValuationDataPoint,
} from '../data/emerald-valuation';

// =============================================================================
// CHART CONFIGURATION
// =============================================================================

const CHART_CONFIG = {
  width: 320,
  height: 160,
  padding: { top: 20, right: 20, bottom: 30, left: 20 },
  pointRadius: 5,
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

// =============================================================================
// COMPONENT
// =============================================================================

const ValuationPage: React.FC = () => {
  const muiTheme = useMuiTheme();
  const isDarkMode = muiTheme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState(0); // Default to all data

  const glassEffect = isDarkMode ? glassDark.frosted : glassLight.frosted;
  const glassSubtle = isDarkMode ? glassDark.ultraThin : glassLight.ultraThin;

  const filteredData = useMemo(() => {
    const range = YEAR_RANGES[selectedRange];
    return filterDataByYearRange(EMERALD_VALUATION_DATA, range.startYear, range.endYear);
  }, [selectedRange]);

  const chartPoints = useMemo(() => calculateChartPoints(filteredData), [filteredData]);
  const linePath = useMemo(() => createSmoothPath(chartPoints), [chartPoints]);
  const areaPath = useMemo(() => createAreaPath(chartPoints), [chartPoints]);
  const appreciation = useMemo(() => calculateAppreciation(filteredData), [filteredData]);

  const handleRangeChange = (_: React.MouseEvent<HTMLElement>, newRange: number | null) => {
    if (newRange !== null) setSelectedRange(newRange);
  };

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
        {/* Main Chart Section */}
        <motion.div variants={staggerItem}>
          <Card sx={{ ...applyGlass(glassEffect), borderRadius: 4, mb: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                Precio por Quilate (USD)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Esmeraldas colombianas grado inversión
              </Typography>

              {/* Range Selector */}
              <ToggleButtonGroup
                value={selectedRange}
                exclusive
                onChange={handleRangeChange}
                size="small"
                sx={{
                  mb: 2,
                  '& .MuiToggleButton-root': {
                    fontSize: '0.7rem',
                    py: 0.5,
                    px: 1.5,
                    textTransform: 'none',
                    '&.Mui-selected': {
                      bgcolor: isDarkMode ? 'rgba(0,174,122,0.2)' : 'rgba(0,174,122,0.1)',
                      color: emeraldCore.primary,
                    },
                  },
                }}
              >
                {YEAR_RANGES.map((range, index) => (
                  <ToggleButton key={range.label} value={index}>
                    {range.label.split(' ')[0]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              {/* Chart */}
              <Box sx={{ height: CHART_CONFIG.height + 10, mb: 2 }}>
                <svg
                  viewBox={`0 0 ${CHART_CONFIG.width} ${CHART_CONFIG.height}`}
                  width="100%"
                  height="100%"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="pageAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={emeraldCore.primary} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={emeraldCore.primary} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="pageLineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={emeraldCore.dark} />
                      <stop offset="100%" stopColor={emeraldCore.primary} />
                    </linearGradient>
                  </defs>

                  <motion.path
                    key={`area-${selectedRange}`}
                    d={areaPath}
                    fill="url(#pageAreaGradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  />

                  <motion.path
                    key={`line-${selectedRange}`}
                    d={linePath}
                    fill="none"
                    stroke="url(#pageLineGradient)"
                    strokeWidth={CHART_CONFIG.lineWidth}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />

                  {chartPoints.map((point, index) => (
                    <motion.g key={`point-${point.year}`}>
                      <motion.circle
                        cx={point.x}
                        cy={point.y}
                        r={CHART_CONFIG.pointRadius}
                        fill={isDarkMode ? emeraldCore.light : emeraldCore.dark}
                        stroke={isDarkMode ? 'rgba(30,41,59,0.8)' : 'white'}
                        strokeWidth={2}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                      />
                      {/* Show labels for key years */}
                      {(index === 0 || index === chartPoints.length - 1 || point.event) && (
                        <text
                          x={point.x}
                          y={CHART_CONFIG.height - 5}
                          textAnchor="middle"
                          fill={isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
                          fontSize={10}
                        >
                          {point.year}
                        </text>
                      )}
                    </motion.g>
                  ))}
                </svg>
              </Box>

              {/* Stats Row */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: emeraldCore.primary }}
                  >
                    +{appreciation.percentage.toLocaleString()}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Apreciación total
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: isDarkMode ? goldAccent.light : goldAccent.dark }}
                  >
                    {appreciation.years}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Años
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

        {/* Sources */}
        <motion.div variants={staggerItem}>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Fuentes: {VALUATION_METADATA.sources.join(', ')}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.5 }}
            >
              Última actualización: {VALUATION_METADATA.lastUpdated}
            </Typography>
          </Box>
        </motion.div>
      </motion.div>
    </Box>
  );
};

export default ValuationPage;
