/**
 * EsmereogenesisGardenPage
 *
 * Route: /esmereogenesis/:planId
 * The full immersive garden for a single plan. Orchestrates:
 *   - LivingEmerald + ProgressGardenRing (visual centerpiece)
 *   - Suggested rhythm + streak readout
 *   - "Regar mi esmeralda" CTA → triggers AbonoCinematic
 *   - Completed state → "Reclamar tu Esmeralda" → ClaimSheet
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Slider,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ChevronLeft,
  Droplet,
  Sparkles,
  HandHeart,
  Trash2,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useEsmereogenesis } from '../../contexts/EsmereogenesisContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { useAbonoSimulation } from '../../hooks/useAbonoSimulation';
import { LivingEmerald } from '../../components/esmereogenesis/LivingEmerald';
import { ProgressGardenRing } from '../../components/esmereogenesis/ProgressGardenRing';
import { StreakIndicator } from '../../components/esmereogenesis/StreakIndicator';
import { AporteHistoryTimeline } from '../../components/esmereogenesis/AporteHistoryTimeline';
import { ClaimSheet } from '../../components/esmereogenesis/ClaimSheet';
import { AbonoCinematic } from '../../components/esmereogenesis/AbonoCinematic';
import { emeraldCore, goldAccent } from '../../design-system/tokens/colors';
import { emeraldGradients, meshGradients } from '../../design-system/tokens/gradients';
import type { EsmereoPlan } from '../../types/esmereogenesis';

const VISIBLE_HISTORY = 4;

interface CinematicData {
  plan: EsmereoPlan;
  amount: number;
  isCompletion: boolean;
  previousProgress: number;
}

const EsmereogenesisGardenPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { formatCurrency } = useCurrencyFormat();
  const { getPlanById, deletePlan } = useEsmereogenesis();
  const { trigger, isProcessing } = useAbonoSimulation();
  const reducedMotion = useReducedMotion();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  // Theme-aware tokens — consistent recipe with the Hub so both routes share
  // a coherent palette in either mode.
  const headerBg = isLight
    ? `linear-gradient(180deg, ${alpha(emeraldCore.light, 0.16)} 0%, ${alpha(emeraldCore.primary, 0.08)} 100%), ${alpha('#F4FAF6', 0.78)}`
    : `linear-gradient(180deg, ${alpha(emeraldCore.dark, 0.78)} 0%, ${alpha(emeraldCore.dark, 0.62)} 100%)`;
  const cardBg = isLight
    ? `linear-gradient(135deg, ${alpha(emeraldCore.light, 0.18)} 0%, ${alpha(emeraldCore.primary, 0.1)} 100%), ${alpha('#F4FAF6', 0.78)}`
    : `linear-gradient(135deg, ${alpha(emeraldCore.primary, 0.32)} 0%, ${alpha(emeraldCore.dark, 0.55)} 100%)`;
  const sliderCardBg = isLight
    ? `linear-gradient(135deg, ${alpha(emeraldCore.light, 0.22)} 0%, ${alpha(emeraldCore.primary, 0.14)} 100%), ${alpha('#F4FAF6', 0.82)}`
    : `linear-gradient(135deg, ${alpha(emeraldCore.primary, 0.32)} 0%, ${alpha(emeraldCore.dark, 0.6)} 100%)`;
  const completedCardBg = isLight
    ? `linear-gradient(135deg, ${alpha(goldAccent.light, 0.22)} 0%, ${alpha(emeraldCore.light, 0.18)} 100%), ${alpha('#F8FBF6', 0.82)}`
    : `linear-gradient(135deg, ${alpha(emeraldCore.primary, 0.32)} 0%, ${alpha(emeraldCore.dark, 0.65)} 100%)`;
  const cardBorder = isLight ? alpha(emeraldCore.primary, 0.3) : alpha(emeraldCore.light, 0.22);
  const headerBorder = isLight ? alpha(emeraldCore.primary, 0.24) : alpha(emeraldCore.light, 0.18);
  const cardShadow = isLight
    ? `0 10px 26px ${alpha(emeraldCore.dark, 0.18)}, 0 1px 0 ${alpha('#FFFFFF', 0.42)} inset`
    : `0 10px 26px ${alpha('#000000', 0.32)}, 0 1px 0 ${alpha(emeraldCore.light, 0.16)} inset`;
  const titleColor = isLight ? emeraldCore.dark : '#F4FAF6';
  const overlineColor = isLight ? emeraldCore.dark : emeraldCore.light;
  const headlineColor = isLight ? emeraldCore.dark : '#F4FAF6';
  const bodyColor = isLight ? alpha(emeraldCore.dark, 0.78) : alpha('#FFFFFF', 0.78);
  const mutedColor = isLight ? alpha(emeraldCore.dark, 0.6) : alpha('#FFFFFF', 0.62);
  const accentColor = isLight ? emeraldCore.primary : emeraldCore.light;

  const plan = planId ? getPlanById(planId) : undefined;

  const [aporteOpen, setAporteOpen] = useState(false);
  const [aporteAmount, setAporteAmount] = useState<number>(0);
  const [cinematic, setCinematic] = useState<CinematicData | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);

  // Sync slider value with current remaining whenever plan progress changes
  useEffect(() => {
    if (!plan) return;
    const remainingNow = plan.targetCOP - plan.totalAbonadoCOP;
    const initial = Math.min(plan.weeklySuggestedCOP, Math.max(10_000, remainingNow));
    setAporteAmount(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id, plan?.totalAbonadoCOP, plan?.weeklySuggestedCOP, plan?.targetCOP]);

  // Redirect if plan disappears
  useEffect(() => {
    if (planId && !plan) {
      notify('Esa Esmereogénesis no existe', 'warning');
      navigate('/esmereogenesis', { replace: true });
    }
  }, [planId, plan, navigate, notify]);

  const progress = useMemo(
    () => (plan && plan.targetCOP > 0 ? plan.totalAbonadoCOP / plan.targetCOP : 0),
    [plan],
  );

  const remaining = useMemo(
    () => (plan ? Math.max(0, plan.targetCOP - plan.totalAbonadoCOP) : 0),
    [plan],
  );

  const isCompleted = plan?.state === 'completed' || plan?.state === 'claimed';
  const isClaimed = plan?.state === 'claimed';

  if (!plan) return null;

  const productName = plan.productSnapshot.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();

  const handleAporteConfirm = async () => {
    if (aporteAmount <= 0 || aporteAmount > remaining) {
      notify('Ajusta el monto antes de regar tu esmeralda', 'warning');
      return;
    }
    const previousProgress = progress;
    const willComplete = plan.totalAbonadoCOP + aporteAmount >= plan.targetCOP;
    const isSuggested = aporteAmount === plan.weeklySuggestedCOP;
    const result = await trigger({
      planId: plan.id,
      amountCOP: aporteAmount,
      type: isSuggested ? 'suggested' : 'free',
    });
    if (!result) {
      notify('No pudimos procesar el aporte. Intenta de nuevo.', 'error');
      return;
    }
    setCinematic({
      plan: result.plan,
      amount: aporteAmount,
      isCompletion: result.justCompleted || willComplete,
      previousProgress,
    });
    setAporteOpen(false);
  };

  const handleCinematicComplete = () => {
    setCinematic(null);
    setAporteOpen(false);
    // Slider value will auto-reset via the useEffect that watches plan.totalAbonadoCOP
  };

  const handleDelete = () => {
    if (window.confirm('¿Eliminar esta Esmereogénesis? Perderás el progreso.')) {
      deletePlan(plan.id);
      notify('Esmereogénesis eliminada', 'info');
      navigate('/esmereogenesis', { replace: true });
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        background: meshGradients.emerald,
        // Honour bottom navigation + iOS home indicator so the timeline never
        // hides behind the global tab bar.
        pb: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
      }}
    >
      {/* Header — feature identity strip, theme-aware glass. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          pt: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          pb: 1.5,
          position: 'sticky',
          top: 0,
          background: headerBg,
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          borderBottom: `1px solid ${headerBorder}`,
          boxShadow: isLight
            ? `0 1px 0 ${alpha('#FFFFFF', 0.32)} inset`
            : `0 1px 0 ${alpha(emeraldCore.light, 0.12)} inset`,
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={() => navigate('/esmereogenesis')}
          aria-label="Volver al jardín"
          sx={{ color: titleColor }}
        >
          <ChevronLeft />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            color: titleColor,
            letterSpacing: 0.4,
            textShadow: isLight ? 'none' : `0 2px 12px ${alpha(emeraldCore.dark, 0.6)}`,
          }}
        >
          Esmereogénesis
        </Typography>
        <IconButton
          onClick={handleDelete}
          aria-label="Eliminar plan"
          sx={{ color: alpha(titleColor, 0.78) }}
        >
          <Trash2 size={18} />
        </IconButton>
      </Box>

      <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
        {/* Hero — product name as the protagonist, sits between the feature
            strip ("Esmereogénesis") and the LivingEmerald so the gem feels
            named, owned, personal. */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          sx={{ textAlign: 'center', mb: { xs: 2.5, md: 3 } }}
        >
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              color: overlineColor,
              fontWeight: 700,
              letterSpacing: 2,
              opacity: isLight ? 0.85 : 0.72,
              mb: 0.5,
            }}
          >
            Tu esmeralda
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 700,
              fontStyle: 'italic',
              color: headlineColor,
              fontSize: { xs: 32, sm: 40, md: 44 },
              lineHeight: 1.1,
              letterSpacing: -0.4,
              textShadow: isLight
                ? `0 2px 12px ${alpha(emeraldCore.primary, 0.18)}`
                : `0 4px 22px ${alpha(emeraldCore.dark, 0.6)}`,
            }}
          >
            {productName}
          </Typography>
        </Box>

        {/* Centerpiece — LivingEmerald + ring + numbers welded into a single
            stat group so the ring, the gem and the percentage read as one
            coherent ceremony, not three stacked widgets. */}
        <Box
          component={motion.section}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: { xs: 3, md: 4 },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              // Fluid sizing so the ring breathes on phones (≤360 px) without
              // blowing past the viewport, and never goes bigger than the spec.
              width: 'clamp(260px, 78vw, 320px)',
              aspectRatio: '1 / 1',
              mb: 2,
            }}
          >
            <ProgressGardenRing
              progress={progress}
              size={320}
              strokeWidth={10}
              isComplete={isCompleted}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LivingEmerald
                imageSrc={plan.productSnapshot.imagen}
                progress={progress}
                state={plan.state}
                size="lg"
                isPulsing={!isCompleted}
              />
            </Box>
          </Box>

          {/* Numbers — overline + dramatic % + amount stay tight to the gem
              so they read as the gem's own caption rather than dead space. */}
          <Typography
            variant="overline"
            sx={{
              color: overlineColor,
              fontWeight: 700,
              letterSpacing: 1.6,
              opacity: isLight ? 0.85 : 0.78,
              mb: 0.25,
            }}
          >
            {isCompleted ? 'Eclosionada' : 'Tu progreso'}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 700,
              color: headlineColor,
              lineHeight: 0.95,
              fontSize: { xs: 56, sm: 64, md: 72 },
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: -1,
              textShadow: isLight
                ? `0 4px 18px ${alpha(emeraldCore.primary, 0.18)}`
                : `0 4px 22px ${alpha(emeraldCore.dark, 0.7)}`,
            }}
          >
            {Math.round(progress * 100)}%
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: bodyColor,
              mt: 0.75,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 0.2,
              textAlign: 'center',
            }}
          >
            {formatCurrency(plan.totalAbonadoCOP)}{' '}
            <Box component="span" sx={{ opacity: 0.7 }}>
              / {formatCurrency(plan.targetCOP)}
            </Box>
          </Typography>
        </Box>

        {!isCompleted ? (
          <>
            {/* Rhythm + streak — theme-aware glass. */}
            <Box
              sx={{
                background: cardBg,
                backdropFilter: 'blur(16px) saturate(160%)',
                WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                border: `1px solid ${cardBorder}`,
                borderRadius: 3,
                p: { xs: 2, md: 2.5 },
                mb: { xs: 2.5, md: 3 },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1.5, sm: 2 },
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                boxShadow: cardShadow,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: overlineColor,
                    fontWeight: 700,
                    letterSpacing: 1.4,
                    opacity: isLight ? 0.85 : 0.78,
                  }}
                >
                  Ritmo sugerido
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: headlineColor,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.2,
                    textShadow: isLight ? 'none' : `0 2px 12px ${alpha(emeraldCore.dark, 0.5)}`,
                  }}
                >
                  {formatCurrency(plan.weeklySuggestedCOP)}{' '}
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ color: mutedColor, fontWeight: 500 }}
                  >
                    / semana
                  </Typography>
                </Typography>
              </Box>
              <Box sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>
                <StreakIndicator
                  weeks={plan.streak.currentWeeks}
                  longest={plan.streak.longestWeeks}
                />
              </Box>
            </Box>

            {/* Regar CTA — wrapped in an emerald glow halo so it reads as
                the sacred act of the page, not just another pill button. */}
            {!aporteOpen ? (
              <Box
                sx={{
                  position: 'relative',
                  textAlign: 'center',
                  mb: { xs: 3, md: 4 },
                }}
              >
                {/* Soft ambient halo behind the button */}
                <Box
                  aria-hidden
                  component={motion.div}
                  animate={
                    reducedMotion
                      ? undefined
                      : { scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }
                  }
                  transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 'min(78%, 320px)',
                    height: 64,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: 999,
                    background: `radial-gradient(ellipse at center, ${alpha(emeraldCore.primary, 0.45)} 0%, ${alpha(emeraldCore.primary, 0)} 70%)`,
                    filter: 'blur(18px)',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
                <Button
                  onClick={() => setAporteOpen(true)}
                  variant="contained"
                  size="large"
                  startIcon={<Droplet size={22} />}
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    background: emeraldGradients.intense,
                    color: '#FFFFFF',
                    py: 2,
                    px: { xs: 4, sm: 5 },
                    minHeight: 60,
                    fontSize: 17,
                    fontWeight: 700,
                    borderRadius: 999,
                    textTransform: 'none',
                    letterSpacing: 0.3,
                    boxShadow: `0 18px 40px ${alpha(emeraldCore.dark, 0.4)}, 0 0 0 1px ${alpha('#FFFFFF', 0.12)} inset`,
                    '&:hover': {
                      background: emeraldGradients.deep,
                      boxShadow: `0 22px 46px ${alpha(emeraldCore.dark, 0.45)}, 0 0 0 1px ${alpha('#FFFFFF', 0.16)} inset`,
                    },
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  Regar mi esmeralda
                </Button>
                <Typography
                  variant="caption"
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'block',
                    color: mutedColor,
                    mt: 1.25,
                    fontWeight: 500,
                  }}
                >
                  Aporte sugerido {formatCurrency(plan.weeklySuggestedCOP)} · monto editable
                </Typography>
              </Box>
            ) : (
              <Box
                component={motion.div}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                sx={{
                  background: sliderCardBg,
                  backdropFilter: 'blur(16px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 3,
                  p: 2.5,
                  mb: 3,
                  boxShadow: cardShadow,
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: overlineColor,
                    fontWeight: 700,
                    letterSpacing: 1.4,
                    opacity: isLight ? 0.85 : 0.85,
                  }}
                >
                  Cuánto vas a regar
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    color: headlineColor,
                    mb: 1,
                    textShadow: isLight ? 'none' : `0 2px 14px ${alpha(emeraldCore.dark, 0.6)}`,
                  }}
                >
                  {formatCurrency(aporteAmount)}
                </Typography>
                <Slider
                  value={aporteAmount}
                  min={Math.min(10_000, remaining)}
                  max={remaining}
                  step={Math.max(10_000, Math.round(plan.weeklySuggestedCOP / 5))}
                  onChange={(_, value) => setAporteAmount(typeof value === 'number' ? value : value[0])}
                  marks={[
                    { value: plan.weeklySuggestedCOP, label: 'Sugerido' },
                    { value: remaining, label: 'Restante' },
                  ]}
                  sx={{
                    color: accentColor,
                    mb: 2,
                    '& .MuiSlider-rail': {
                      opacity: 0.4,
                      bgcolor: isLight ? alpha(emeraldCore.dark, 0.18) : alpha('#000000', 0.5),
                    },
                    '& .MuiSlider-markLabel': { fontSize: 12, color: mutedColor },
                    '& .MuiSlider-mark': {
                      bgcolor: isLight ? alpha(emeraldCore.dark, 0.45) : alpha('#FFFFFF', 0.4),
                    },
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setAporteOpen(false);
                      setAporteAmount(plan.weeklySuggestedCOP);
                    }}
                    sx={{
                      flex: 1,
                      py: 1.25,
                      minHeight: 48,
                      borderRadius: 2,
                      textTransform: 'none',
                      color: titleColor,
                      borderColor: alpha(accentColor, 0.45),
                      '&:hover': {
                        borderColor: accentColor,
                        bgcolor: alpha(accentColor, 0.1),
                      },
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleAporteConfirm}
                    disabled={isProcessing}
                    startIcon={<Droplet size={18} />}
                    sx={{
                      flex: 2,
                      py: 1.25,
                      minHeight: 48,
                      background: emeraldGradients.intense,
                      color: '#FFFFFF',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      boxShadow: `0 8px 18px ${alpha(emeraldCore.dark, 0.3)}`,
                      '&:hover': { background: emeraldGradients.deep },
                    }}
                  >
                    Regar {formatCurrency(aporteAmount)}
                  </Button>
                </Box>
              </Box>
            )}
          </>
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              mb: 3,
              p: 3,
              borderRadius: 3,
              // Eclosionada — theme-aware, gold-rimmed glass for the ceremony.
              background: completedCardBg,
              backdropFilter: 'blur(18px) saturate(160%)',
              WebkitBackdropFilter: 'blur(18px) saturate(160%)',
              border: `1px solid ${alpha(goldAccent.primary, 0.55)}`,
              boxShadow: isLight
                ? `0 14px 32px ${alpha(emeraldCore.dark, 0.18)}, 0 0 24px ${alpha(goldAccent.primary, 0.18)}, 0 0 0 1px ${alpha(goldAccent.primary, 0.22)} inset`
                : `0 14px 32px ${alpha('#000000', 0.4)}, 0 0 24px ${alpha(goldAccent.primary, 0.18)}, 0 0 0 1px ${alpha(goldAccent.primary, 0.22)} inset`,
            }}
          >
            <Box
              component={motion.div}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              sx={{
                display: 'inline-flex',
                mb: 1,
                color: goldAccent.primary,
                filter: `drop-shadow(0 0 12px ${alpha(goldAccent.primary, 0.6)})`,
              }}
            >
              <Sparkles size={28} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontStyle: 'italic',
                color: headlineColor,
                mb: 0.5,
                textShadow: isLight ? 'none' : `0 2px 14px ${alpha(emeraldCore.dark, 0.6)}`,
              }}
            >
              Tu Esmeralda ha cobrado vida
            </Typography>
            <Typography variant="body2" sx={{ color: bodyColor, mb: 2 }}>
              {isClaimed
                ? 'Ya solicitaste su entrega. Tu asesor te contactará pronto.'
                : 'Coordina con tu asesor para recibir tu Esmeralda Tierra Madre.'}
            </Typography>
            {!isClaimed && (
              <Button
                variant="contained"
                size="large"
                startIcon={<HandHeart size={18} />}
                onClick={() => setClaimOpen(true)}
                sx={{
                  background: emeraldGradients.intense,
                  color: '#FFFFFF',
                  py: 1.5,
                  px: 3,
                  minHeight: 52,
                  fontWeight: 700,
                  borderRadius: 999,
                  textTransform: 'none',
                  boxShadow: `0 12px 28px ${alpha(emeraldCore.dark, 0.35)}`,
                  '&:hover': { background: emeraldGradients.deep },
                }}
              >
                Reclamar tu Esmeralda
              </Button>
            )}
          </Box>
        )}

        {/* History — theme-aware glass. */}
        <Box
          sx={{
            background: cardBg,
            backdropFilter: 'blur(14px) saturate(150%)',
            WebkitBackdropFilter: 'blur(14px) saturate(150%)',
            border: `1px solid ${cardBorder}`,
            borderRadius: 3,
            p: 2.5,
            boxShadow: cardShadow,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              color: overlineColor,
              fontWeight: 700,
              letterSpacing: 1.4,
              mb: 1.5,
              opacity: isLight ? 0.85 : 0.85,
            }}
          >
            Tus aportes ({plan.aportes.length})
          </Typography>
          <AporteHistoryTimeline aportes={plan.aportes} limit={VISIBLE_HISTORY} />
        </Box>
      </Box>

      {/* Cinematic overlay */}
      {cinematic && (
        <AbonoCinematic
          plan={cinematic.plan}
          aporteAmount={cinematic.amount}
          isCompletion={cinematic.isCompletion}
          previousProgress={cinematic.previousProgress}
          open={true}
          onComplete={handleCinematicComplete}
        />
      )}

      {/* Claim sheet */}
      <ClaimSheet open={claimOpen} onClose={() => setClaimOpen(false)} plan={plan} />
    </Box>
  );
};

export default EsmereogenesisGardenPage;
