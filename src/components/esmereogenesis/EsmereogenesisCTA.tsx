/**
 * EsmereogenesisCTA
 *
 * Special call-to-action injected into the product detail page that lets the
 * user start (or continue) an Esmereogénesis plan rooted on the current item.
 *
 * Behavior:
 *   - No active plan → opens EsmereoCreationSheet
 *   - Active plan → navigates to /esmereogenesis/:planId
 *   - Completed plan → navigates to plan with "Reclamada" badge
 */

import React, { useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Sprout, HandHeart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TreasureItem } from '../../types';
import { useEsmereogenesis } from '../../contexts/EsmereogenesisContext';
import { EsmereoCreationSheet } from './EsmereoCreationSheet';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';

interface EsmereogenesisCTAProps {
  product: TreasureItem;
  /** Hide if the product is sold/unavailable */
  disabled?: boolean;
}

export const EsmereogenesisCTA: React.FC<EsmereogenesisCTAProps> = ({ product, disabled }) => {
  const navigate = useNavigate();
  const { getActivePlanForItem, getLatestPlanForItem } = useEsmereogenesis();
  const { formatCurrency } = useCurrencyFormat();
  const [creationOpen, setCreationOpen] = useState(false);

  const activePlan = getActivePlanForItem(product.item);
  const latestPlan = getLatestPlanForItem(product.item);
  const completed = !activePlan && latestPlan && (latestPlan.state === 'completed' || latestPlan.state === 'claimed')
    ? latestPlan
    : null;

  const progress = activePlan ? activePlan.totalAbonadoCOP / activePlan.targetCOP : 0;

  if (disabled) return null;

  const handleClick = () => {
    if (activePlan) {
      navigate(`/esmereogenesis/${activePlan.id}`);
    } else if (completed) {
      navigate(`/esmereogenesis/${completed.id}`);
    } else {
      setCreationOpen(true);
    }
  };

  let icon: React.ReactNode = <Sparkles size={20} />;
  let title = 'Esmereogénesis';
  let subtitle = 'Adquiérela ahorrando con propósito · No es crédito';
  let progressBadge: React.ReactNode = null;

  if (activePlan) {
    icon = <Sprout size={20} />;
    title = 'Continuar Esmereogénesis';
    subtitle = `Ya has aportado ${formatCurrency(activePlan.totalAbonadoCOP)}`;
    progressBadge = (
      <Box
        sx={{
          ml: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          background: alpha('#FFFFFF', 0.2),
          color: '#FFFFFF',
          px: 1,
          py: 0.5,
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {Math.round(progress * 100)}%
      </Box>
    );
  } else if (completed) {
    icon = <HandHeart size={20} />;
    title = completed.state === 'claimed' ? 'Reclamada · ver detalles' : 'Adquirida · reclamar';
    subtitle = 'Tu Esmereogénesis ha cobrado vida';
  }

  return (
    <>
      {/* Visual stance: glassy emerald-tinted surface with a gold breathing
          accent — distinct enough from the primary "Agregar a Selección"
          (solid emerald gradient) so they read as siblings, not rivals. */}
      <Box
        component={motion.button}
        onClick={handleClick}
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        aria-label={title}
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          width: '100%',
          minHeight: 60,
          py: 1.25,
          px: 2,
          borderRadius: 2,
          border: `1px solid ${alpha(goldAccent.primary, 0.45)}`,
          color: '#FFFFFF',
          background: `linear-gradient(135deg, ${alpha(emeraldCore.dark, 0.92)} 0%, ${alpha(emeraldCore.primary, 0.85)} 60%, ${alpha(emeraldCore.dark, 0.92)} 100%)`,
          cursor: 'pointer',
          textAlign: 'left',
          font: 'inherit',
          overflow: 'hidden',
          boxShadow: `0 8px 22px ${alpha(emeraldCore.dark, 0.22)}, 0 0 0 1px ${alpha(goldAccent.primary, 0.08)} inset`,
          '&:focus-visible': {
            outline: `2px solid ${goldAccent.primary}`,
            outlineOffset: 2,
          },
          '&:before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(120deg, ${alpha(goldAccent.primary, 0)} 0%, ${alpha(goldAccent.primary, 0.18)} 50%, ${alpha(goldAccent.primary, 0)} 100%)`,
            transform: 'translateX(-100%)',
            animation: 'esmereoShine 6s ease-in-out infinite',
            pointerEvents: 'none',
          },
          '@keyframes esmereoShine': {
            '0%, 35%': { transform: 'translateX(-100%)' },
            '70%': { transform: 'translateX(100%)' },
            '100%': { transform: 'translateX(100%)' },
          },
          '@media (prefers-reduced-motion: reduce)': {
            '&:before': { animation: 'none', display: 'none' },
          },
        }}
      >
        <Box
          component={motion.span}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `radial-gradient(circle, ${alpha(goldAccent.primary, 0.35)} 0%, ${alpha(goldAccent.primary, 0)} 70%)`,
            color: goldAccent.light,
            flexShrink: 0,
            boxShadow: `0 0 12px ${alpha(goldAccent.primary, 0.45)}`,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: 'inherit',
              lineHeight: 1.2,
              letterSpacing: 0.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: alpha('#FFFFFF', 0.78),
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </Typography>
        </Box>
        {progressBadge}
        <Box sx={{ color: alpha('#FFFFFF', 0.85), flexShrink: 0 }}>
          <ArrowRight size={18} />
        </Box>
      </Box>

      <EsmereoCreationSheet
        open={creationOpen}
        onClose={() => setCreationOpen(false)}
        product={product}
      />
    </>
  );
};

export default EsmereogenesisCTA;
