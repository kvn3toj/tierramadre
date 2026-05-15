/**
 * EsmereogenesisHubPage
 *
 * Route: /esmereogenesis
 * Top-level hub for all the user's plans.
 * Shows empty state, active garden grid, completed sealed cards, and a settings menu.
 */

import React, { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ChevronLeft,
  Settings,
  Plus,
  Volume2,
  VolumeX,
  Trash2,
  Vibrate,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useNotification } from "../../contexts/NotificationContext";
import { useTrackingDispatch } from "../../contexts/TrackingContext";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";
import { EsmereoEmptyState } from "../../components/esmereogenesis/EsmereoEmptyState";
import { EsmereoPlanCard } from "../../components/esmereogenesis/EsmereoPlanCard";
import { StreakIndicator } from "../../components/esmereogenesis/StreakIndicator";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import { emeraldCore, goldAccent } from "../../design-system/tokens/colors";
import {
  emeraldGradients,
  meshGradients,
} from "../../design-system/tokens/gradients";
import { whiteAlpha } from "../../design-system/utils/colorUtils";
import { useEsmereoThemeTokens } from "../../hooks/useEsmereoThemeTokens";

const EsmereogenesisHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { track } = useTrackingDispatch();
  const { formatCurrency } = useCurrencyFormat();
  const theme = useTheme();
  // sm (≥600px) is the design-system breakpoint where the garden grid switches
  // from the phone 2-col layout to a fluid auto-fill that uses real tablet
  // width. Using the theme breakpoint keeps the rule aligned with the rest of
  // the app and lets MUI's SSR-safe matcher resolve it.
  const isWide = useMediaQuery(theme.breakpoints.up("sm"));
  const {
    isLight,
    headerBg,
    cardBg,
    titleColor,
    overlineColor,
    headlineColor,
    bodyColor,
    accentColor,
    cardBorder,
    headerBorder,
    cardShadow,
    progressTrack,
  } = useEsmereoThemeTokens();

  const {
    activePlans,
    completedPlans,
    hubMetrics,
    hasPlans,
    audioEnabled,
    hapticEnabled,
    setAudioEnabled,
    setHapticEnabled,
    resetAll,
  } = useEsmereogenesis();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleReset = () => {
    setMenuAnchor(null);
    setResetConfirmOpen(true);
  };
  const confirmReset = () => {
    setResetConfirmOpen(false);
    resetAll();
    notify("Tu jardín se reinició", "info");
    track("esmereo_reset_all", {});
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: meshGradients.emerald,
        pb: 6,
      }}
    >
      {/* Header — feature identity strip. Theme-aware glass: pearl-mint in
          light mode, deep emerald in dark mode. Title stays serif & high
          contrast for either surface. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          pt: "calc(env(safe-area-inset-top, 0px) + 12px)",
          pb: 1.5,
          position: "sticky",
          top: 0,
          background: headerBg,
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
          borderBottom: `1px solid ${headerBorder}`,
          boxShadow: isLight
            ? `0 1px 0 ${whiteAlpha(0.32)} inset`
            : `0 1px 0 ${alpha(emeraldCore.light, 0.12)} inset`,
          zIndex: 10,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          aria-label="Volver"
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
            textShadow: isLight
              ? "none"
              : `0 2px 12px ${alpha(emeraldCore.dark, 0.6)}`,
          }}
        >
          Esmereogénesis
        </Typography>
        <IconButton
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          aria-label="Ajustes de Esmereogénesis"
          sx={{ color: titleColor }}
        >
          <Settings />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 240, mt: 1 } }}
        >
          <MenuItem
            onClick={() => setAudioEnabled(!audioEnabled)}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <Typography variant="body2">Sonidos</Typography>
            </Box>
            <Switch checked={audioEnabled} size="small" />
          </MenuItem>
          <MenuItem
            onClick={() => setHapticEnabled(!hapticEnabled)}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Vibrate size={18} />
              <Typography variant="body2">Vibración</Typography>
            </Box>
            <Switch checked={hapticEnabled} size="small" />
          </MenuItem>
          {hasPlans && (
            <MenuItem
              onClick={handleReset}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                color: "error.main",
              }}
            >
              <Trash2 size={18} />
              <Typography variant="body2">Reiniciar jardín</Typography>
            </MenuItem>
          )}
        </Menu>
      </Box>

      {!hasPlans ? (
        <EsmereoEmptyState />
      ) : (
        <Box
          sx={{
            maxWidth: 960,
            mx: "auto",
            px: { xs: 2, md: 3 },
            pt: 3,
            // Reserve room for the bottom navigation + iOS home indicator.
            pb: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
          }}
        >
          {/* Global metrics card — theme-aware glass + typography. */}
          <Box
            component={motion.section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            sx={{
              background: cardBg,
              backdropFilter: "blur(18px) saturate(160%)",
              WebkitBackdropFilter: "blur(18px) saturate(160%)",
              border: `1px solid ${cardBorder}`,
              borderRadius: 3,
              p: { xs: 2.25, md: 3 },
              mb: 3,
              boxShadow: cardShadow,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 1.5,
                flexWrap: "wrap",
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
                  Tu jardín
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: '"Playfair Display", serif',
                    fontWeight: 700,
                    color: headlineColor,
                    lineHeight: 1.15,
                    textShadow: isLight
                      ? "none"
                      : `0 2px 14px ${alpha(emeraldCore.dark, 0.5)}`,
                  }}
                >
                  {hubMetrics.activeCount}{" "}
                  {hubMetrics.activeCount === 1 ? "esmeralda" : "esmeraldas"} en
                  proceso
                </Typography>
              </Box>
              <StreakIndicator weeks={hubMetrics.globalStreak} />
            </Box>

            {/* Global progress signifier — each stat reads on its own row. */}
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 1,
                  mb: 0.75,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: bodyColor,
                    fontWeight: 600,
                    letterSpacing: 0.4,
                  }}
                >
                  {formatCurrency(hubMetrics.totalAbonadoCOP)} aportado
                  {hubMetrics.totalTargetCOP > 0
                    ? ` · meta ${formatCurrency(hubMetrics.totalTargetCOP)}`
                    : ""}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: accentColor,
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {Math.round(hubMetrics.globalProgress * 100)}%
                </Typography>
              </Box>
              <Box
                aria-hidden
                sx={{
                  height: 6,
                  borderRadius: 999,
                  bgcolor: progressTrack,
                  overflow: "hidden",
                  border: isLight
                    ? "none"
                    : `1px solid ${alpha(emeraldCore.light, 0.12)}`,
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${Math.max(2, Math.round(hubMetrics.globalProgress * 100))}%`,
                    background: emeraldGradients.intense,
                    borderRadius: 999,
                    transition: "width 0.6s ease-out",
                    boxShadow: isLight
                      ? `0 0 8px ${alpha(emeraldCore.primary, 0.35)}`
                      : `0 0 12px ${alpha(emeraldCore.light, 0.45)}`,
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Active garden grid. With 3+ plans the cards adopt an offset
              composition — alternating vertical lift + a hair of rotation —
              so the hub reads as a planted garden, not a spreadsheet. Below
              that count, the offsets disappear: 1-2 plans look stranded if
              rotated. Honours prefers-reduced-motion via the inline check. */}
          {activePlans.length > 0 && (
            <Box
              sx={{
                display: "grid",
                // 2 cols on phones, fluid auto-fill once we hit a tablet width.
                gridTemplateColumns: isWide
                  ? "repeat(auto-fill, minmax(200px, 1fr))"
                  : "repeat(2, minmax(0, 1fr))",
                gap: { xs: 1.5, md: 2 },
                mb: 3,
                // Extra vertical breathing so the offset cards don't clip
                // against the section above/below them.
                pt: activePlans.length >= 3 ? 1.5 : 0,
                pb: activePlans.length >= 3 ? 1.5 : 0,
              }}
            >
              {activePlans.map((plan, index) => {
                const compose = activePlans.length >= 3;
                // Three offset positions cycled by index — gives a deliberate
                // rhythm rather than randomness, which would look glitchy on
                // re-render. Reduced-motion users get flat layout.
                const liftPx = compose ? [0, -10, 6, -4, 10, -8][index % 6] : 0;
                const rotateDeg = compose
                  ? [-0.8, 1.1, -0.4, 0.7, -1.0, 0.5][index % 6]
                  : 0;
                return (
                  <Box
                    key={plan.id}
                    sx={{
                      transform: `translateY(${liftPx}px) rotate(${rotateDeg}deg)`,
                      transition: "transform 0.4s ease-out",
                      "@media (prefers-reduced-motion: reduce)": {
                        transform: "none",
                      },
                    }}
                  >
                    <EsmereoPlanCard plan={plan} />
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Sembrar nueva — promoted to a contained pill so it carries the
              weight of the next intentional action when the garden already
              exists, instead of disappearing as a faded outline. */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: completedPlans.length > 0 ? 4 : 2,
            }}
          >
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate("/treasure")}
              sx={{
                color: "#FFFFFF",
                background: emeraldGradients.intense,
                py: 1.25,
                px: 3.25,
                minHeight: 48,
                fontWeight: 700,
                borderRadius: 999,
                textTransform: "none",
                letterSpacing: 0.2,
                boxShadow: `0 10px 24px ${alpha(emeraldCore.dark, 0.28)}`,
                "&:hover": {
                  background: emeraldGradients.deep,
                  boxShadow: `0 14px 30px ${alpha(emeraldCore.dark, 0.36)}`,
                },
                "&:active": { transform: "scale(0.98)" },
              }}
            >
              Sembrar nueva Esmereogénesis
            </Button>
          </Box>

          {/* Completed section — separated by a soft gold rule so it reads as
              a different garden bed (ceremonial, not a continuation grid). */}
          {completedPlans.length > 0 && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 2,
                  pl: 1,
                }}
              >
                <Box
                  sx={{
                    height: 1,
                    flex: 1,
                    background: `linear-gradient(90deg, transparent 0%, ${alpha(goldAccent.primary, 0.55)} 100%)`,
                  }}
                />
                <Typography
                  variant="overline"
                  sx={{
                    color: goldAccent.dark,
                    fontWeight: 700,
                    letterSpacing: 1.6,
                    whiteSpace: "nowrap",
                  }}
                >
                  Adquiridas
                </Typography>
                <Box
                  sx={{
                    height: 1,
                    flex: 1,
                    background: `linear-gradient(90deg, ${alpha(goldAccent.primary, 0.55)} 0%, transparent 100%)`,
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: isWide
                    ? "repeat(auto-fill, minmax(200px, 1fr))"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: { xs: 1.5, md: 2 },
                }}
              >
                {completedPlans.map((plan) => (
                  <EsmereoPlanCard key={plan.id} plan={plan} />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
      {/* Destructive confirmation — focus-managed, styled, a11y-correct.
          Replaces window.confirm which broke focus trap + bypassed theme. */}
      <ConfirmDialog
        open={resetConfirmOpen}
        title="¿Borrar todo tu jardín?"
        message="Perderás todos tus planes, aportes y rachas. Esta acción no se puede deshacer."
        confirmLabel="Borrar jardín"
        cancelLabel="Cancelar"
        onConfirm={confirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </Box>
  );
};

export default EsmereogenesisHubPage;
