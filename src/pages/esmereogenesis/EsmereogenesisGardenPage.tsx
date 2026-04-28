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
} from '@mui/material';
import {
  ChevronLeft,
  Droplet,
  Sparkles,
  HandHeart,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
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
        minHeight: '100vh',
        background: meshGradients.emerald,
        pb: 6,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 2,
          position: 'sticky',
          top: 0,
          background: alpha('#FFFFFF', 0.4),
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          borderBottom: `1px solid ${alpha(emeraldCore.primary, 0.12)}`,
          zIndex: 10,
        }}
      >
        <IconButton onClick={() => navigate('/esmereogenesis')} aria-label="Volver al jardín">
          <ChevronLeft />
        </IconButton>
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 600,
            color: emeraldCore.dark,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mx: 1,
          }}
        >
          {productName}
        </Typography>
        <IconButton onClick={handleDelete} aria-label="Eliminar plan" sx={{ color: 'text.secondary' }}>
          <Trash2 size={18} />
        </IconButton>
      </Box>

      <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
        {/* LivingEmerald centerpiece with ring */}
        <Box
          sx={{
            position: 'relative',
            width: 'fit-content',
            mx: 'auto',
            mb: 3,
          }}
        >
          <Box sx={{ position: 'relative', width: 320, height: 320 }}>
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
        </Box>

        {/* Numbers */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography
            variant="h2"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 700,
              color: emeraldCore.dark,
              lineHeight: 1,
            }}
          >
            {Math.round(progress * 100)}%
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {formatCurrency(plan.totalAbonadoCOP)} / {formatCurrency(plan.targetCOP)}
          </Typography>
        </Box>

        {!isCompleted ? (
          <>
            {/* Rhythm + streak */}
            <Box
              sx={{
                background: alpha('#FFFFFF', 0.6),
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${alpha(emeraldCore.primary, 0.18)}`,
                borderRadius: 3,
                p: 2.5,
                mb: 3,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: emeraldCore.dark, fontWeight: 700, letterSpacing: 1.4 }}
                >
                  Ritmo sugerido
                </Typography>
                <Typography variant="h6" sx={{ color: emeraldCore.dark, fontWeight: 700 }}>
                  {formatCurrency(plan.weeklySuggestedCOP)} <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>/ semana</Typography>
                </Typography>
              </Box>
              <StreakIndicator weeks={plan.streak.currentWeeks} longest={plan.streak.longestWeeks} />
            </Box>

            {/* Regar CTA */}
            {!aporteOpen ? (
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Button
                  onClick={() => setAporteOpen(true)}
                  variant="contained"
                  size="large"
                  startIcon={<Droplet size={20} />}
                  sx={{
                    background: emeraldGradients.intense,
                    color: '#FFFFFF',
                    py: 1.75,
                    px: 4,
                    minHeight: 56,
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 999,
                    textTransform: 'none',
                    boxShadow: `0 16px 32px ${alpha(emeraldCore.dark, 0.35)}`,
                    '&:hover': { background: emeraldGradients.deep },
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  Regar mi esmeralda
                </Button>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
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
                  background: alpha('#FFFFFF', 0.65),
                  border: `1px solid ${alpha(emeraldCore.primary, 0.25)}`,
                  borderRadius: 3,
                  p: 2.5,
                  mb: 3,
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ color: emeraldCore.dark, fontWeight: 700, letterSpacing: 1.4 }}
                >
                  Cuánto vas a regar
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    color: emeraldCore.dark,
                    mb: 1,
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
                    color: emeraldCore.primary,
                    mb: 2,
                    '& .MuiSlider-markLabel': { fontSize: 12 },
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
                      color: emeraldCore.dark,
                      borderColor: alpha(emeraldCore.primary, 0.3),
                      '&:hover': { borderColor: emeraldCore.primary, bgcolor: alpha(emeraldCore.primary, 0.06) },
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
              background: alpha('#FFFFFF', 0.6),
              border: `1px solid ${alpha(goldAccent.primary, 0.3)}`,
            }}
          >
            <Box
              component={motion.div}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              sx={{ display: 'inline-flex', mb: 1, color: goldAccent.primary }}
            >
              <Sparkles size={28} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 600,
                color: emeraldCore.dark,
                mb: 0.5,
              }}
            >
              Tu Esmeralda ha cobrado vida
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
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

        {/* History */}
        <Box
          sx={{
            background: alpha('#FFFFFF', 0.55),
            border: `1px solid ${alpha(emeraldCore.primary, 0.16)}`,
            borderRadius: 3,
            p: 2.5,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              color: emeraldCore.dark,
              fontWeight: 700,
              letterSpacing: 1.4,
              mb: 1.5,
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
