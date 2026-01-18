/**
 * SettingsAccordion Component
 * Collapsible section for quotation configuration settings.
 */

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { Settings, RefreshCw } from 'lucide-react';
import { brandColors } from '../constants';
import type { SettingsAccordionProps } from '../types';

export const SettingsAccordion: React.FC<SettingsAccordionProps> = ({
  quotationNumber,
  setQuotationNumber,
  regenerateQuotationNumber,
  businessSettings,
  setBusinessSettings,
}) => (
  <Accordion
    defaultExpanded={false}
    sx={{
      bgcolor: 'transparent',
      boxShadow: 'none',
      '&:before': { display: 'none' },
      mb: 2,
    }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon sx={{ color: brandColors.textPrimary }} />}
      sx={{
        bgcolor: brandColors.surfaceElevated,
        borderRadius: 1,
        minHeight: 44,
        '& .MuiAccordionSummary-content': { my: 1 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings size={16} color={brandColors.emerald} />
        <Typography
          variant="body2"
          sx={{ color: brandColors.textPrimary, fontWeight: 600 }}
        >
          Configuracion de Cotizacion
        </Typography>
      </Box>
    </AccordionSummary>
    <AccordionDetails
      sx={{
        bgcolor: brandColors.surfaceElevated,
        borderRadius: 1,
        mt: 0.5,
        p: 2,
      }}
    >
      <Grid container spacing={1.5}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              label="No. Cotizacion"
              value={quotationNumber}
              onChange={(e) => setQuotationNumber(e.target.value)}
              size="small"
            />
            <IconButton
              onClick={regenerateQuotationNumber}
              sx={{ color: brandColors.emerald }}
            >
              <RefreshCw size={18} />
            </IconButton>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Telefono de Contacto"
            value={businessSettings.contactPhone}
            onChange={(e) =>
              setBusinessSettings({ ...businessSettings, contactPhone: e.target.value })
            }
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email de Contacto"
            value={businessSettings.contactEmail}
            onChange={(e) =>
              setBusinessSettings({ ...businessSettings, contactEmail: e.target.value })
            }
            size="small"
          />
        </Grid>
      </Grid>
    </AccordionDetails>
  </Accordion>
);

export default SettingsAccordion;
