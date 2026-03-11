/**
 * InvestmentForm Component
 * Handles investment input fields and carat weight for price simulation.
 * Extracted from PriceSimulator.tsx for better modularity.
 */

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Collapse,
  alpha,
} from '@mui/material';
import {
  Gem,
  Plus,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { studioColors, studioCardStyles } from '../../design-system';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { getInvestmentIcon } from './index';

// =============================================================================
// TYPES
// =============================================================================

export interface Investment {
  id: string;
  label: string;
  value: number;
  unit?: string;
  placeholder?: string;
}

export interface CustomItem {
  label: string;
  value: number;
}

export interface CaratWeightInputProps {
  caratWeight: number;
  setCaratWeight: (weight: number) => void;
}

export interface InvestmentSectionProps {
  investments: Investment[];
  updateInvestment: (id: string, value: number) => void;
  customItems: CustomItem[];
  updateCustomItem: (index: number, field: 'label' | 'value', value: string | number) => void;
  addCustomItem: () => void;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  resetValues: () => void;
  totalInvestment: number;
}

// =============================================================================
// CARAT WEIGHT INPUT
// =============================================================================

export const CaratWeightInput: React.FC<CaratWeightInputProps> = ({ caratWeight, setCaratWeight }) => {
  const { t } = useLanguage();

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
        <Gem size={16} color={studioColors.emerald} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: studioColors.textPrimary }}>
          {t.priceSimulator.weightInCarats}
        </Typography>
      <Tooltip title="Ingresa el peso total en quilates para calcular el precio por quilate">
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Info size={14} color={studioColors.textMuted} />
        </Box>
      </Tooltip>
    </Box>
    <TextField
      fullWidth
      size="small"
      type="number"
      value={caratWeight || ''}
      onChange={(e) => setCaratWeight(Number(e.target.value) || 0)}
      placeholder="Ej: 2.5"
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Typography sx={{ fontSize: '0.75rem', color: studioColors.emerald, fontWeight: 600 }}>
                ct
              </Typography>
            </InputAdornment>
          ),
        },
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          bgcolor: studioColors.surface,
          fontSize: '0.875rem',
          '& fieldset': { borderColor: studioColors.border },
          '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.4) },
          '&.Mui-focused fieldset': { borderColor: studioColors.emerald },
        },
      }}
    />
    </Box>
  );
};

// =============================================================================
// INVESTMENT SECTION
// =============================================================================

export const InvestmentSection: React.FC<InvestmentSectionProps> = ({
  investments,
  updateInvestment,
  customItems,
  updateCustomItem,
  addCustomItem,
  showAdvanced,
  setShowAdvanced,
  resetValues,
  totalInvestment,
}) => {
  const { formatFullCurrency: formatCurrency } = useCurrencyFormat();
  return (
  <>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
      <Typography variant="subtitle1" sx={{ ...studioCardStyles.sectionTitle }}>
        Inversion
      </Typography>
      <Tooltip title="Reiniciar valores">
        <IconButton size="small" onClick={resetValues} sx={{ color: studioColors.textMuted }}>
          <RotateCcw size={16} />
        </IconButton>
      </Tooltip>
    </Box>

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {investments.map((item) => (
        <Box key={item.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
            <Box sx={{ color: studioColors.textSecondary }}>{getInvestmentIcon(item.id)}</Box>
            <Typography variant="body2" sx={{ fontWeight: 500, color: studioColors.textPrimary, flex: 1 }}>
              {item.label}
            </Typography>
            {item.unit && (
              <Chip
                label={item.unit}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  bgcolor: alpha(studioColors.emerald, 0.1),
                  color: studioColors.emerald,
                }}
              />
            )}
          </Box>
          <TextField
            fullWidth
            size="small"
            type="number"
            value={item.value || ''}
            onChange={(e) => updateInvestment(item.id, Number(e.target.value) || 0)}
            placeholder={item.placeholder}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography sx={{ fontSize: '0.875rem', color: studioColors.textMuted }}>$</Typography>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: studioColors.surface,
                fontSize: '0.875rem',
                '& fieldset': { borderColor: studioColors.border },
                '&:hover fieldset': { borderColor: alpha(studioColors.emerald, 0.4) },
                '&.Mui-focused fieldset': { borderColor: studioColors.emerald },
              },
            }}
          />
        </Box>
      ))}
    </Box>

    {/* Custom Items */}
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 1,
        }}
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: studioColors.textSecondary }}>
          Costos adicionales
        </Typography>
        {showAdvanced ? <ChevronUp size={18} color={studioColors.textSecondary} /> : <ChevronDown size={18} color={studioColors.textSecondary} />}
      </Box>

      <Collapse in={showAdvanced}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {customItems.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                size="small"
                value={item.label}
                onChange={(e) => updateCustomItem(index, 'label', e.target.value)}
                placeholder="Concepto"
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: studioColors.surface,
                    fontSize: '0.875rem',
                    '& fieldset': { borderColor: studioColors.border },
                  },
                }}
              />
              <TextField
                size="small"
                type="number"
                value={item.value || ''}
                onChange={(e) => updateCustomItem(index, 'value', Number(e.target.value) || 0)}
                placeholder="0"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontSize: '0.875rem', color: studioColors.textMuted }}>$</Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: 150,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: studioColors.surface,
                    fontSize: '0.875rem',
                    '& fieldset': { borderColor: studioColors.border },
                  },
                }}
              />
            </Box>
          ))}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              color: studioColors.emerald,
              '&:hover': { color: studioColors.emeraldLight },
            }}
            onClick={addCustomItem}
          >
            <Plus size={16} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Agregar costo
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>

    <Divider sx={{ borderColor: studioColors.border, my: 2.5 }} />

    {/* Total Investment */}
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: studioColors.textPrimary }}>
        Total Inversion
      </Typography>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: studioColors.textPrimary,
          fontFamily: 'monospace',
        }}
      >
        {formatCurrency(totalInvestment)}
      </Typography>
    </Box>
  </>
  );
};

export default InvestmentSection;
