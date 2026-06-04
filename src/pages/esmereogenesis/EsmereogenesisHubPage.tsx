/**
 * EsmereogenesisHubPage — Bóveda "Tu jardín".
 *
 * Route: /esmereogenesis
 * Re-skinned to the prototype: a featured living-emerald hero (the most-grown
 * active plan) with stage, %, streak and a "Regar" CTA that opens its garden,
 * an overview grid of every plan, the "Adquiridas" bed, and the empty seed
 * state. Settings (sonidos / vibración / reiniciar) live in the header menu.
 */

import { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  Switch,
  Typography,
  Box,
} from "@mui/material";
import {
  Settings,
  Volume2,
  VolumeX,
  Trash2,
  Vibrate,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useNotification } from "../../contexts/NotificationContext";
import { useTrackingDispatch } from "../../contexts/TrackingContext";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";
import { useEsmereoTheme } from "../../contexts/EsmereoThemeContext";
import { EsmereoEmptyState } from "../../components/esmereogenesis/EsmereoEmptyState";
import { EsmereoPlanCard } from "../../components/esmereogenesis/EsmereoPlanCard";
import { LivingEmerald } from "../../components/esmereogenesis/LivingEmerald";
import StageChip from "../../components/esmereogenesis/StageChip";
import EsmereoThemeToggle from "../../components/esmereogenesis/EsmereoThemeToggle";
import {
  TopBar,
  Kicker,
  StreakFlame,
  WaterButton,
} from "../../components/esmereogenesis/BovedaUI";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import { stageForProgress } from "../../data/esmereo-mock";
import "../../components/esmereogenesis/boveda.css";

const EsmereogenesisHubPage = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { track } = useTrackingDispatch();
  const { formatCurrency } = useCurrencyFormat();
  const { mode } = useEsmereoTheme();

  const {
    activePlans,
    completedPlans,
    hasPlans,
    audioEnabled,
    hapticEnabled,
    setAudioEnabled,
    setHapticEnabled,
    resetAll,
  } = useEsmereogenesis();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const confirmReset = () => {
    setResetConfirmOpen(false);
    resetAll();
    notify("Tu jardín se reinició", "info");
    track("esmereo_reset_all", {});
  };

  // Featured = the most-grown active plan (falls back to the first acquired one).
  const featured =
    activePlans.length > 0
      ? [...activePlans].sort(
          (a, b) =>
            b.totalAbonadoCOP / Math.max(1, b.targetCOP) -
            a.totalAbonadoCOP / Math.max(1, a.targetCOP),
        )[0]
      : completedPlans[0];

  const settingsButton = (
    <>
      <EsmereoThemeToggle />
      <IconButton
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        aria-label="Ajustes de Esmereogénesis"
        sx={{ width: 38, height: 38, color: "var(--ink-soft)" }}
      >
        <Settings size={19} strokeWidth={1.6} />
      </IconButton>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 240, mt: 1 } } }}
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
            onClick={() => {
              setMenuAnchor(null);
              setResetConfirmOpen(true);
            }}
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
    </>
  );

  // Empty seed state.
  if (!hasPlans || !featured) {
    return (
      <div
        className="bov-root"
        data-theme={mode}
        style={{ minHeight: "100vh" }}
      >
        <div className="bov-vignette" />
        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 480,
            margin: "0 auto",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
          }}
        >
          <TopBar
            title="Tu jardín"
            sub="Esmereogénesis"
            onBack={() => navigate(-1)}
            right={settingsButton}
          />
          <EsmereoEmptyState />
        </div>
      </div>
    );
  }

  const fProgress =
    featured.targetCOP > 0 ? featured.totalAbonadoCOP / featured.targetCOP : 0;
  const fStage = stageForProgress(fProgress, featured.state);
  const fRemaining = Math.max(0, featured.targetCOP - featured.totalAbonadoCOP);
  const fName = featured.productSnapshot.nombre
    .replace(/^L:.*?\s/, "")
    .replace(/^L:/, "")
    .trim();
  const fComplete =
    featured.state === "completed" || featured.state === "claimed";
  const otherActive = activePlans.filter((p) => p.id !== featured.id);

  return (
    <div
      className="bov-root"
      data-theme={mode}
      style={{
        minHeight: "100vh",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
      }}
    >
      <div className="bov-vignette" />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 480,
          margin: "0 auto",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
        }}
      >
        <TopBar
          title="Tu jardín"
          sub="Esmereogénesis"
          onBack={() => navigate(-1)}
          right={settingsButton}
        />

        {/* Featured hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 4,
          }}
        >
          <div style={{ position: "relative", zIndex: 3, marginBottom: 2 }}>
            <StageChip stage={fStage} />
          </div>
          <LivingEmerald
            imageSrc={featured.productSnapshot.imagen}
            corte={featured.productSnapshot.corte}
            progress={fProgress}
            state={featured.state}
            size={228}
            staged
            isPulsing={!fComplete}
            onPet={() => track("esmereo_gem_petted", { planId: featured.id })}
          />
          <button
            className="tap"
            onClick={() => navigate(`/esmereogenesis/${featured.id}`)}
            aria-label={`Abrir ${fName}`}
            style={{
              textAlign: "center",
              marginTop: -28,
              zIndex: 3,
              position: "relative",
              background: "none",
            }}
          >
            <div
              className="serif"
              style={{ fontSize: 23, color: "var(--ink)" }}
            >
              {fName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-soft)",
                marginTop: 3,
                letterSpacing: "0.02em",
              }}
            >
              {featured.productSnapshot.color || "Esmeralda colombiana"}
            </div>
          </button>
        </div>

        {/* Featured metrics */}
        <div
          style={{
            flexShrink: 0,
            textAlign: "center",
            position: "relative",
            zIndex: 3,
            marginTop: 8,
          }}
          aria-live="polite"
        >
          <div
            className="serif"
            style={{
              fontSize: 72,
              lineHeight: 0.84,
              color: "var(--ink)",
              textShadow: "0 6px 38px rgba(11,92,70,0.6)",
            }}
          >
            {Math.round(fProgress * 100)}
            <span style={{ fontSize: 28, color: "var(--gold-bright)" }}>%</span>
          </div>
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginTop: 5,
            }}
          >
            regada
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 13,
              marginTop: 12,
            }}
          >
            <span
              className="serif"
              style={{ fontSize: 16, color: "var(--ink)" }}
            >
              {formatCurrency(featured.totalAbonadoCOP)}
            </span>
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "var(--ink-faint)",
              }}
            />
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
              meta {formatCurrency(featured.targetCOP)}
            </span>
          </div>
          <div
            style={{ marginTop: 13, display: "flex", justifyContent: "center" }}
          >
            <StreakFlame weeks={featured.streak.currentWeeks} />
          </div>
        </div>

        {/* Regar / Reclamar CTA → opens the garden */}
        <div
          style={{ padding: "18px 24px 0", position: "relative", zIndex: 3 }}
        >
          <WaterButton
            label={fComplete ? "Ver mi esmeralda" : "Regar mi esmeralda"}
            onClick={() => navigate(`/esmereogenesis/${featured.id}`)}
            sub={
              fRemaining > 0
                ? `Faltan ${formatCurrency(fRemaining)}`
                : undefined
            }
          />
        </div>

        {/* Overview grid of the other active plans */}
        {otherActive.length > 0 && (
          <div style={{ padding: "28px 22px 0" }}>
            <Kicker style={{ fontSize: 8.5, marginBottom: 12, paddingLeft: 2 }}>
              Tu jardín
            </Kicker>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {otherActive.map((plan) => (
                <EsmereoPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        )}

        {/* Sembrar nueva */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "26px 22px 0",
          }}
        >
          <button
            className="tap"
            onClick={() => navigate("/treasure")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 20px",
              borderRadius: 999,
              border: "1px solid var(--accent-line)",
              background: "var(--surface)",
              color: "var(--gold-bright)",
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            <Plus size={16} strokeWidth={2} />
            Sembrar nueva Esmereogénesis
          </button>
        </div>

        {/* Adquiridas */}
        {completedPlans.length > 0 && (
          <div style={{ padding: "30px 22px 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  height: 1,
                  flex: 1,
                  background:
                    "linear-gradient(90deg, transparent, var(--accent-line) 100%)",
                }}
              />
              <Kicker style={{ fontSize: 9 }}>Adquiridas</Kicker>
              <span
                style={{
                  height: 1,
                  flex: 1,
                  background:
                    "linear-gradient(90deg, var(--accent-line), transparent 100%)",
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {completedPlans.map((plan) => (
                <EsmereoPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="¿Borrar todo tu jardín?"
        message="Perderás todos tus planes, aportes y rachas. Esta acción no se puede deshacer."
        confirmLabel="Borrar jardín"
        cancelLabel="Cancelar"
        onConfirm={confirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
};

export default EsmereogenesisHubPage;
