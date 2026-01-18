/**
 * ActionButtons Component
 * Export PDF, print, and new quotation action buttons.
 */

import React from 'react';
import { Box, Button, IconButton, Tooltip, alpha } from '@mui/material';
import { Download, Printer, Copy } from 'lucide-react';
import { brandColors } from '../constants';
import type { ActionButtonsProps } from '../types';

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  handleExportPDF,
  handlePrint,
  handleNewQuotation,
  disabled,
}) => (
  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button
      variant="contained"
      startIcon={<Download size={18} />}
      onClick={handleExportPDF}
      disabled={disabled}
      sx={{
        bgcolor: brandColors.emerald,
        flex: 1,
        textTransform: 'none',
        fontWeight: 700,
        py: 1.25,
        borderRadius: 2,
        boxShadow: `0 4px 16px ${alpha(brandColors.emerald, 0.3)}`,
        '&:hover': {
          bgcolor: brandColors.emeraldDark,
          boxShadow: `0 6px 20px ${alpha(brandColors.emerald, 0.4)}`,
        },
      }}
    >
      Exportar PDF
    </Button>
    <Tooltip title="Imprimir">
      <IconButton
        onClick={handlePrint}
        sx={{
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          color: 'text.secondary',
          '&:hover': {
            bgcolor: alpha(brandColors.emerald, 0.1),
            color: brandColors.emerald,
          },
        }}
      >
        <Printer size={20} />
      </IconButton>
    </Tooltip>
    <Tooltip title="Nueva Cotizacion">
      <IconButton
        onClick={handleNewQuotation}
        sx={{
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          color: 'text.secondary',
          '&:hover': {
            bgcolor: alpha(brandColors.emerald, 0.1),
            color: brandColors.emerald,
          },
        }}
      >
        <Copy size={20} />
      </IconButton>
    </Tooltip>
  </Box>
);

export default ActionButtons;
