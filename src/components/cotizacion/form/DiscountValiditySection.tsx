/**
 * DiscountValiditySection Component
 * Form section for discount percentage, validity days, and notes.
 */

import React from 'react';
import { Box, Typography, TextField, Slider, InputAdornment, Grid } from '@mui/material';
import { brandColors } from '../constants';
import type { DiscountValiditySectionProps } from '../types';

export const DiscountValiditySection: React.FC<DiscountValiditySectionProps> = ({
  discountPercent,
  setDiscountPercent,
  validDays,
  setValidDays,
  notes,
  setNotes,
}) => (
  <Grid container spacing={1.5} sx={{ mb: 3 }}>
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        label="Descuento %"
        type="number"
        value={discountPercent || ''}
        onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
        size="small"
        InputProps={{
          endAdornment: <InputAdornment position="end">%</InputAdornment>,
        }}
      />
    </Grid>
    <Grid item xs={12} sm={6}>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Días de validez: {validDays}
        </Typography>
        <Slider
          value={validDays}
          onChange={(_, v) => setValidDays(v as number)}
          min={3}
          max={60}
          step={1}
          sx={{ color: brandColors.gold }}
        />
      </Box>
    </Grid>
    <Grid item xs={12}>
      <TextField
        fullWidth
        label="Notas adicionales"
        multiline
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        size="small"
      />
    </Grid>
  </Grid>
);

export default DiscountValiditySection;
