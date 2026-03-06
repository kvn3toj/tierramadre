/**
 * InvestmentFormSection Component
 * Form section for investment items and custom costs.
 */

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  alpha,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  Plus,
  Trash2,
  RotateCcw,
  Gem,
  Award,
  CircleDollarSign,
  Sparkles,
  FileCheck,
  Gift,
  DollarSign,
} from 'lucide-react';
import { brandColors } from '../constants';
import { useCotizacionFormat } from '../../../hooks/useCotizacion';
import type { InvestmentFormSectionProps } from '../types';

/**
 * Get icon for investment type
 */
const getInvestmentIcon = (iconId: string) => {
  const icons: Record<string, React.ReactNode> = {
    emerald: <Gem size={16} color={brandColors.emerald} />,
    gold: <Award size={16} color={brandColors.gold} />,
    silver: <CircleDollarSign size={16} color={brandColors.textMuted} />,
    setting: <Sparkles size={16} color={brandColors.emerald} />,
    certification: <FileCheck size={16} color={brandColors.emeraldDark} />,
    packaging: <Gift size={16} color={brandColors.gold} />,
  };
  return icons[iconId] || <DollarSign size={16} color={brandColors.gray} />;
};

export const InvestmentFormSection: React.FC<InvestmentFormSectionProps> = ({
  investments,
  handleInvestmentChange,
  handleResetInvestments,
  customCosts,
  handleRemoveCustomCost,
  newCustomLabel,
  setNewCustomLabel,
  newCustomValue,
  setNewCustomValue,
  handleAddCustomCost,
  totalInvestment,
}) => {
  const { formatPrice: formatCurrency } = useCotizacionFormat();
  return (
  <Box sx={{ mb: 3 }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          color: 'text.primary',
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontWeight: 700,
          fontSize: '0.875rem',
        }}
      >
        Inversión
      </Typography>
      <Tooltip title="Reiniciar inversión">
        <IconButton
          size="small"
          onClick={handleResetInvestments}
          sx={{
            color: 'text.disabled',
            '&:hover': { color: brandColors.emerald },
          }}
        >
          <RotateCcw size={16} />
        </IconButton>
      </Tooltip>
    </Box>

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {investments.map((inv) => (
        <Box key={inv.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            {getInvestmentIcon(inv.icon)}
            <Typography
              variant="body2"
              sx={{ color: 'text.primary', fontWeight: 500 }}
            >
              {inv.label}
            </Typography>
          </Box>
          <TextField
            size="small"
            type="number"
            value={inv.value || ''}
            onChange={(e) =>
              handleInvestmentChange(inv.id, parseFloat(e.target.value) || 0)
            }
            sx={{ width: 140 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Box>
      ))}
    </Box>

    <Accordion
      sx={{
        bgcolor: 'transparent',
        boxShadow: 'none',
        '&:before': { display: 'none' },
        mt: 2,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: 'text.primary' }} />}
        sx={{
          bgcolor: 'action.hover',
          borderRadius: 1,
          minHeight: 40,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: 'text.primary', fontWeight: 600 }}
        >
          Costos adicionales{' '}
          {customCosts.length > 0 && `(${customCosts.length})`}
        </Typography>
      </AccordionSummary>
      <AccordionDetails
        sx={{
          bgcolor: 'action.hover',
          borderRadius: 1,
          mt: 0.5,
          p: 2,
        }}
      >
        {customCosts.map((cost) => (
          <Box
            key={cost.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: '1px solid',
              borderBottomColor: 'divider',
            }}
          >
            <Typography variant="body2">{cost.label}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ color: brandColors.emerald, fontWeight: 600 }}
              >
                {formatCurrency(cost.value)}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleRemoveCustomCost(cost.id)}
                sx={{
                  color: 'text.disabled',
                  '&:hover': { color: brandColors.error },
                }}
              >
                <Trash2 size={14} />
              </IconButton>
            </Box>
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <TextField
            size="small"
            label="Otro"
            value={newCustomLabel}
            onChange={(e) => setNewCustomLabel(e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            value={newCustomValue || ''}
            onChange={(e) => setNewCustomValue(parseFloat(e.target.value) || 0)}
            sx={{ width: 120 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </Box>
        <Button
          fullWidth
          variant="text"
          startIcon={<Plus size={16} />}
          onClick={handleAddCustomCost}
          disabled={!newCustomLabel || newCustomValue <= 0}
          sx={{
            mt: 1.5,
            color: brandColors.emerald,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Agregar costo
        </Button>
      </AccordionDetails>
    </Accordion>

    {totalInvestment > 0 && (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 2,
          p: 1.5,
          bgcolor: alpha(brandColors.emerald, 0.08),
          borderRadius: 1.5,
          border: `1px solid ${alpha(brandColors.emerald, 0.2)}`,
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: 'text.primary' }}
        >
          Total Inversión
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: brandColors.emerald }}>
          {formatCurrency(totalInvestment)}
        </Typography>
      </Box>
    )}
  </Box>
  );
};

export default InvestmentFormSection;
