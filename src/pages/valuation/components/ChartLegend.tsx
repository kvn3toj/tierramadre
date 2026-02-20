/**
 * ChartLegend - Interactive legend for multi-origin chart
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { cssTransition } from '../../../design-system';
import { ORIGIN_PRICE_HISTORY, filterDataByYearRange, calculateAppreciation } from '../../../data/emerald-valuation';

interface ChartLegendProps {
  startYear: number;
  endYear: number;
  hoveredOrigin: string | null;
  onHover: (origin: string | null) => void;
  isDarkMode: boolean;
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  startYear,
  endYear,
  hoveredOrigin,
  onHover,
  isDarkMode,
}) => (
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
            transition: cssTransition.default,
            '&:hover': {
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            },
          }}
          onMouseEnter={() => onHover(origin.origin)}
          onMouseLeave={() => onHover(null)}
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
);

export default ChartLegend;
