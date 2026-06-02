/**
 * EsmereoEmptyState
 *
 * Shown in the hub when the user has no Esmereogénesis plans yet.
 * Plays a gentle floating-seed loop while inviting the user to explore the catalog.
 */

import React from "react";
import { Box, Button, Typography, alpha } from "@mui/material";
import { motion } from "framer-motion";
import { Sprout, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { emeraldCore, goldAccent } from "../../design-system/tokens/colors";
import {
  emeraldGradients,
  radialGradients,
} from "../../design-system/tokens/gradients";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useNotification } from "../../contexts/NotificationContext";
import { useTreasure } from "../../hooks/useTreasure";

interface EsmereoEmptyStateProps {
  onSeedDemo?: () => void;
}

export const EsmereoEmptyState: React.FC<EsmereoEmptyStateProps> = ({
  onSeedDemo,
}) => {
  const navigate = useNavigate();
  const { seedDemo } = useEsmereogenesis();
  const { treasure, isLoadingSheets, isLoadingThumbnails } = useTreasure();
  const { notify } = useNotification();

  const catalogLoading = isLoadingSheets || isLoadingThumbnails;
  // Mirrors pickDemoItems' filter in esmereo-mock.ts so the button's enabled
  // state matches what seedDemo can actually do. Keep the two in sync.
  const hasSeedableTreasure = treasure.some(
    (it) => !!it.imagen && it.precioCOP > 0 && it.estado === "DISPONIBLE",
  );

  const handleSeedDemo = () => {
    const created = seedDemo(treasure);
    onSeedDemo?.();
    if (created.length === 0) {
      // Cold catalog (no seedable items yet) — don't sit there looking broken.
      notify(
        "Aún estamos cargando el catálogo. Inténtalo en un momento.",
        "info",
      );
      return;
    }
    // Optional auto-navigate to first demo plan would be nice but keep user in hub.
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        py: { xs: 6, md: 8 },
        px: 3,
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: 200,
          height: 200,
          mb: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Halo */}
        <Box
          component={motion.div}
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: radialGradients.hoverGlow,
            filter: "blur(8px)",
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Floating seed */}
        <Box
          component={motion.div}
          sx={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: emeraldGradients.intense,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            boxShadow: `0 20px 40px ${alpha(emeraldCore.dark, 0.35)}, 0 0 30px ${alpha(emeraldCore.primary, 0.5)}`,
          }}
          animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sprout size={44} strokeWidth={1.5} />
        </Box>
      </Box>

      <Typography
        variant="h4"
        sx={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 600,
          color: emeraldCore.dark,
          mb: 1,
        }}
      >
        Tu jardín de esmeraldas espera
      </Typography>

      <Typography
        variant="body1"
        sx={{ color: "text.secondary", mb: 4, lineHeight: 1.6, maxWidth: 380 }}
      >
        Esmereogénesis es un método de ahorro con propósito. Elige una esmeralda
        del catálogo y comienza a darle vida con cada aporte que le dediques.
      </Typography>

      <Button
        variant="contained"
        onClick={() => navigate("/treasure")}
        startIcon={<Compass size={18} />}
        sx={{
          background: emeraldGradients.intense,
          color: "#FFFFFF",
          py: 1.5,
          px: 3,
          minHeight: 48,
          borderRadius: 2,
          textTransform: "none",
          fontWeight: 600,
          boxShadow: `0 12px 28px ${alpha(emeraldCore.dark, 0.3)}`,
          "&:hover": { background: emeraldGradients.deep },
          "&:active": { transform: "scale(0.98)" },
        }}
      >
        Explorar el catálogo
      </Button>

      <Box sx={{ mt: 3, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            height: 1,
            width: 32,
            bgcolor: alpha(emeraldCore.primary, 0.25),
          }}
        />
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          o
        </Typography>
        <Box
          sx={{
            height: 1,
            width: 32,
            bgcolor: alpha(emeraldCore.primary, 0.25),
          }}
        />
      </Box>

      <Button
        variant="text"
        onClick={handleSeedDemo}
        disabled={catalogLoading || !hasSeedableTreasure}
        sx={{
          mt: 2,
          color: goldAccent.dark,
          textTransform: "none",
          fontWeight: 600,
          "&:hover": { bgcolor: alpha(goldAccent.primary, 0.08) },
          "&.Mui-disabled": { color: alpha(goldAccent.dark, 0.5) },
        }}
      >
        {catalogLoading
          ? "Cargando el catálogo…"
          : "Cargar jardín de demostración"}
      </Button>

      <Typography
        variant="caption"
        sx={{ color: "text.secondary", mt: 1, opacity: 0.7 }}
      >
        (Solo para previsualizar la experiencia)
      </Typography>
    </Box>
  );
};

export default EsmereoEmptyState;
