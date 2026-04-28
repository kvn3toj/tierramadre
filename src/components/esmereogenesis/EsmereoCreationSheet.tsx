/**
 * EsmereoCreationSheet
 *
 * Bottom-positioned dialog that lets the user pick a duration (3/6/9/12 months)
 * and seeds a new Esmereogénesis plan rooted on the given TreasureItem.
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Slide,
  Typography,
  alpha,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { X, Sprout } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { DurationMonths } from '../../types/esmereogenesis';
import type { TreasureItem } from '../../types';
import { useEsmereogenesis } from '../../contexts/EsmereogenesisContext';
import { useTrackingDispatch } from '../../contexts/TrackingContext';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { calcWeeklySuggested } from '../../data/esmereo-mock';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import { emeraldGradients, meshGradients } from '../../design-system/tokens/gradients';

const SlideUp = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const DURATION_OPTIONS: { value: DurationMonths; label: string }[] = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 9, label: '9 meses' },
  { value: 12, label: '12 meses' },
];

interface EsmereoCreationSheetProps {
  open: boolean;
  onClose: () => void;
  product: TreasureItem;
}

export const EsmereoCreationSheet: React.FC<EsmereoCreationSheetProps> = ({
  open,
  onClose,
  product,
}) => {
  const navigate = useNavigate();
  const { createPlan } = useEsmereogenesis();
  const { track } = useTrackingDispatch();
  const { formatCurrency } = useCurrencyFormat();
  const [selectedDuration, setSelectedDuration] = useState<DurationMonths>(6);

  const weeklySuggested = useMemo(
    () => calcWeeklySuggested(product.precioCOP, selectedDuration),
    [product.precioCOP, selectedDuration],
  );

  const handleSeed = () => {
    const plan = createPlan(product, selectedDuration);
    track('esmereo_plan_created', {
      itemId: product.item,
      durationMonths: selectedDuration,
      weeklySuggestedCOP: plan.weeklySuggestedCOP,
      totalCOP: plan.targetCOP,
    });
    onClose();
    // Slight delay to let the dialog close animation start
    setTimeout(() => navigate(`/esmereogenesis/${plan.id}`), 80);
  };

  const productName = product.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={SlideUp}
      keepMounted
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          bottom: 0,
          m: 0,
          width: '100%',
          maxWidth: 600,
          borderRadius: '24px 24px 0 0',
          background: meshGradients.emerald,
          overflow: 'hidden',
        },
      }}
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-end' } }}
      aria-labelledby="esmereo-create-title"
    >
      <Box sx={{ position: 'relative', p: 3, pb: 4 }}>
        {/* Drag handle (decorative) */}
        <Box
          aria-hidden
          sx={{
            width: 44,
            height: 4,
            borderRadius: 2,
            bgcolor: alpha(emeraldCore.primary, 0.25),
            mx: 'auto',
            mb: 2,
          }}
        />

        <IconButton
          onClick={onClose}
          aria-label="Cerrar"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: 'text.secondary',
          }}
        >
          <X size={20} />
        </IconButton>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component={motion.div}
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: emeraldGradients.intense,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              mb: 2,
              boxShadow: `0 12px 28px ${alpha(emeraldCore.dark, 0.3)}`,
            }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sprout size={28} strokeWidth={1.5} />
          </Box>

          <Typography
            id="esmereo-create-title"
            variant="h5"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 600,
              color: emeraldCore.dark,
              mb: 0.5,
            }}
          >
            Sembrar Esmereogénesis
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Tu <strong>{productName}</strong> tomará vida con cada aporte
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              color: emeraldCore.dark,
              fontWeight: 700,
              letterSpacing: 1.2,
              mb: 1,
            }}
          >
            Duración del cuidado
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
            }}
          >
            {DURATION_OPTIONS.map((opt) => {
              const isActive = opt.value === selectedDuration;
              return (
                <Button
                  key={opt.value}
                  onClick={() => setSelectedDuration(opt.value)}
                  variant={isActive ? 'contained' : 'outlined'}
                  aria-pressed={isActive}
                  sx={{
                    py: 1.25,
                    minHeight: 48,
                    fontWeight: 600,
                    fontSize: 14,
                    textTransform: 'none',
                    borderRadius: 2,
                    background: isActive ? emeraldGradients.intense : 'transparent',
                    color: isActive ? '#FFFFFF' : emeraldCore.dark,
                    borderColor: isActive ? 'transparent' : alpha(emeraldCore.primary, 0.3),
                    boxShadow: isActive ? `0 6px 16px ${alpha(emeraldCore.dark, 0.3)}` : 'none',
                    '&:hover': {
                      background: isActive
                        ? emeraldGradients.deep
                        : alpha(emeraldCore.primary, 0.08),
                      borderColor: emeraldCore.primary,
                    },
                  }}
                >
                  {opt.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px dashed ${alpha(emeraldCore.primary, 0.4)}`,
            bgcolor: alpha('#FFFFFF', 0.4),
            mb: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Aporte sugerido semanal
          </Typography>
          <Typography
            variant="h5"
            component={motion.div}
            key={`${selectedDuration}-${weeklySuggested}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 700,
              color: emeraldCore.dark,
            }}
          >
            {formatCurrency(weeklySuggested)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Total objetivo · {formatCurrency(product.precioCOP)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            onClick={handleSeed}
            variant="contained"
            size="large"
            startIcon={<Sprout size={18} />}
            sx={{
              background: emeraldGradients.intense,
              color: '#FFFFFF',
              py: 1.5,
              minHeight: 52,
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 12px 28px ${alpha(emeraldCore.dark, 0.35)}`,
              '&:hover': { background: emeraldGradients.deep },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            Sembrar mi Esmereogénesis
          </Button>
          <Typography
            variant="caption"
            sx={{ color: goldAccent.dark, textAlign: 'center', mt: 0.5 }}
          >
            No es crédito · No genera deuda · Sin multas
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
};

export default EsmereoCreationSheet;
