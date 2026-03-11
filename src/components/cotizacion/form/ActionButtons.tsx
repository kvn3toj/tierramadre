/**
 * ActionButtons Component
 * Export PDF, share PDF, print, and new quotation action buttons.
 */

import React from 'react';
import { Box, Button, IconButton, Tooltip, alpha, CircularProgress } from '@mui/material';
import { Download, Printer, Copy, Share2 } from 'lucide-react';
import { brandColors } from '../constants';
import type { ActionButtonsProps } from '../types';

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  handleExportPDF,
  handleSharePDF,
  handlePrint,
  handleNewQuotation,
  disabled,
  isExporting = false,
  isSharing = false,
}) => (
  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button
      variant="contained"
      startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <Download size={18} />}
      onClick={handleExportPDF}
      disabled={disabled || isExporting || isSharing}
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
      {isExporting ? 'Exportando...' : 'Exportar PDF'}
    </Button>
    <Tooltip title="Compartir PDF">
      <span>
        <IconButton
          onClick={handleSharePDF}
          disabled={disabled || isExporting || isSharing}
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
          {isSharing ? <CircularProgress size={20} /> : <Share2 size={20} />}
        </IconButton>
      </span>
    </Tooltip>
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
    <Tooltip title="Nueva Cotización">
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
