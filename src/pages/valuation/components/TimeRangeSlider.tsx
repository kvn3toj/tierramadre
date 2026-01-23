/**
 * TimeRangeSlider - Time period selection for valuation chart
 */

import React from 'react';
import { Box, Typography, Slider } from '@mui/material';
import { emeraldCore } from '../../../design-system/tokens/colors';

interface TimeRangeMark {
  value: number;
  label: string;
}

interface TimeRangeSliderProps {
  yearsBack: number;
  onChange: (event: Event, value: number | number[]) => void;
  startYear: number;
  endYear: number;
  minYears: number;
  maxYears: number;
  marks: TimeRangeMark[];
  isDarkMode: boolean;
}

export const TimeRangeSlider: React.FC<TimeRangeSliderProps> = ({
  yearsBack,
  onChange,
  startYear,
  endYear,
  minYears,
  maxYears,
  marks,
  isDarkMode,
}) => (
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
        Periodo de Analisis
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
          ({yearsBack} anos)
        </Typography>
      </Box>
    </Box>
    <Slider
      value={yearsBack}
      onChange={onChange}
      min={minYears}
      max={maxYears}
      step={1}
      marks={marks}
      valueLabelDisplay="auto"
      valueLabelFormat={(v) => `${v} anos`}
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
      Desliza para ajustar el rango de tiempo del analisis
    </Typography>
  </Box>
);

export default TimeRangeSlider;
