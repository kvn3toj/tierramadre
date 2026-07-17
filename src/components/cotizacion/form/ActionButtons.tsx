/**
 * ActionButtons Component
 * Export PDF, share PDF, print, and new quotation action buttons.
 */

import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  alpha,
  CircularProgress,
} from '@mui/material';
import { Download, Printer, Copy, Share2, ImageDown } from 'lucide-react';
import { qeTokens } from '../../../design-system';
import type { ActionButtonsProps } from '../types';

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  handleExportPDF,
  handleSharePDF,
  handlePrint,
  handleNewQuotation,
  handleShareCards,
  disabled,
  isExporting = false,
  isSharing = false,
  isSharingCards = false,
}) => (
  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button
      variant="contained"
      startIcon={
        isExporting ? (
          <CircularProgress size={18} color="inherit" />
        ) : (
          <Download size={18} />
        )
      }
      onClick={handleExportPDF}
      disabled={disabled || isExporting || isSharing}
      sx={{
        // Quiet Emerald: flat accent-strong fill, no colored shadow.
        bgcolor: qeTokens.light.accentStrong,
        color: qeTokens.light.onAccent,
        flex: 1,
        minHeight: 46,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: 13,
        borderRadius: '8px',
        boxShadow: 'none',
        '&:hover': {
          bgcolor: qeTokens.light.accent,
          boxShadow: 'none',
        },
      }}
    >
      {isExporting ? 'Generando...' : 'Generar PDF'}
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
              bgcolor: alpha(qeTokens.light.accent, 0.1),
              color: qeTokens.light.accent,
            },
          }}
        >
          {isSharing ? <CircularProgress size={20} /> : <Share2 size={20} />}
        </IconButton>
      </span>
    </Tooltip>
    {handleShareCards && (
      <Tooltip title="Compartir tarjeta (imagen 1080×1920)">
        <span>
          <IconButton
            onClick={handleShareCards}
            disabled={disabled || isExporting || isSharing || isSharingCards}
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: alpha(qeTokens.light.accent, 0.1),
                color: qeTokens.light.accent,
              },
            }}
          >
            {isSharingCards ? (
              <CircularProgress size={20} />
            ) : (
              <ImageDown size={20} />
            )}
          </IconButton>
        </span>
      </Tooltip>
    )}
    <Tooltip title="Imprimir">
      <IconButton
        onClick={handlePrint}
        sx={{
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          color: 'text.secondary',
          '&:hover': {
            bgcolor: alpha(qeTokens.light.accent, 0.1),
            color: qeTokens.light.accent,
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
            bgcolor: alpha(qeTokens.light.accent, 0.1),
            color: qeTokens.light.accent,
          },
        }}
      >
        <Copy size={20} />
      </IconButton>
    </Tooltip>
  </Box>
);

export default ActionButtons;
