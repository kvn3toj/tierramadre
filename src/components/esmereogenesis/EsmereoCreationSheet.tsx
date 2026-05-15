/**
 * EsmereoCreationSheet
 *
 * Bottom-positioned dialog that lets the user pick a duration (3/6/9/12 months)
 * and seeds a new Esmereogénesis plan rooted on the given TreasureItem.
 */

import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Typography,
  alpha,
} from "@mui/material";
import { X, Sprout } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { DurationMonths } from "../../types/esmereogenesis";
import type { TreasureItem } from "../../types";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useTrackingDispatch } from "../../contexts/TrackingContext";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";
import { calcWeeklySuggested } from "../../data/esmereo-mock";
import { emeraldCore, goldAccent } from "../../design-system/tokens/colors";
import {
  emeraldGradients,
  meshGradients,
} from "../../design-system/tokens/gradients";
import { whiteAlpha, blackAlpha } from "../../design-system/utils/colorUtils";
import { PEARL_SURFACE } from "./tokens";

const DURATION_OPTIONS: { value: DurationMonths; label: string }[] = [
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 9, label: "9 meses" },
  { value: 12, label: "12 meses" },
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
    track("esmereo_plan_created", {
      itemId: product.item,
      durationMonths: selectedDuration,
      weeklySuggestedCOP: plan.weeklySuggestedCOP,
      totalCOP: plan.targetCOP,
    });
    onClose();
    // Slight delay to let the dialog close animation start
    setTimeout(() => navigate(`/esmereogenesis/${plan.id}`), 80);
  };

  const productName = product.nombre
    .replace(/^L:.*?\s/, "")
    .replace(/^L:/, "")
    .trim();

  return (
    // Drawer anchor="bottom" is the canonical MUI primitive for bottom sheets.
    // It manages scroll-lock, focus trap, transition and safe-area for us
    // without the jumpy layout shift Dialog produced when combined with the
    // global bottom navigation. Paper is constrained in width and gets the
    // organic emerald mesh as its surface.
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      keepMounted
      ModalProps={{
        // Disable MUI's default body padding-right compensation that was
        // pushing the underlying page when the scrollbar was hidden.
        disableScrollLock: false,
      }}
      PaperProps={{
        elevation: 0,
        sx: {
          mx: "auto",
          width: "100%",
          maxWidth: 600,
          maxHeight: "calc(100vh - env(safe-area-inset-top, 0px) - 24px)",
          borderRadius: "24px 24px 0 0",
          background: meshGradients.emerald,
          backgroundColor: emeraldCore.dark,
          // Inner content scrolls if the device is short — sheet itself
          // never expands past the viewport.
          overflowY: "auto",
          overscrollBehavior: "contain",
          // Honour iOS home indicator so the primary CTA never gets eaten.
          pb: "env(safe-area-inset-bottom, 0px)",
          boxShadow: `0 -16px 40px ${blackAlpha(0.45)}`,
        },
      }}
      aria-labelledby="esmereo-create-title"
    >
      <Box sx={{ position: "relative", p: 3, pb: 4 }}>
        {/* Drag handle (decorative) */}
        <Box
          aria-hidden
          sx={{
            width: 44,
            height: 4,
            borderRadius: 2,
            bgcolor: alpha(emeraldCore.primary, 0.25),
            mx: "auto",
            mb: 2,
          }}
        />

        <IconButton
          onClick={onClose}
          aria-label="Cerrar"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "text.secondary",
          }}
        >
          <X size={20} />
        </IconButton>

        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Box
            component={motion.div}
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: emeraldGradients.intense,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              mb: 2,
              boxShadow: `0 12px 28px ${alpha(emeraldCore.dark, 0.3)}`,
            }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sprout size={28} strokeWidth={1.5} />
          </Box>

          <Typography
            id="esmereo-create-title"
            variant="h5"
            sx={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 700,
              color: PEARL_SURFACE,
              mb: 0.5,
              textShadow: `0 2px 14px ${alpha(emeraldCore.dark, 0.6)}`,
            }}
          >
            Sembrar Esmereogénesis
          </Typography>
          <Typography variant="body2" sx={{ color: whiteAlpha(0.78) }}>
            Tu <strong>{productName}</strong> tomará vida con cada aporte
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            sx={{
              display: "block",
              color: emeraldCore.light,
              fontWeight: 700,
              letterSpacing: 1.2,
              mb: 1,
              opacity: 0.85,
            }}
          >
            Duración del cuidado
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1,
            }}
          >
            {DURATION_OPTIONS.map((opt) => {
              const isActive = opt.value === selectedDuration;
              return (
                <Button
                  key={opt.value}
                  onClick={() => setSelectedDuration(opt.value)}
                  variant={isActive ? "contained" : "outlined"}
                  aria-pressed={isActive}
                  sx={{
                    py: 1.25,
                    minHeight: 48,
                    fontWeight: 600,
                    fontSize: 14,
                    textTransform: "none",
                    borderRadius: 2,
                    background: isActive
                      ? emeraldGradients.intense
                      : blackAlpha(0.18),
                    color: isActive ? "#FFFFFF" : emeraldCore.light,
                    borderColor: isActive
                      ? "transparent"
                      : alpha(emeraldCore.light, 0.35),
                    boxShadow: isActive
                      ? `0 6px 16px ${alpha(emeraldCore.dark, 0.4)}`
                      : "none",
                    "&:hover": {
                      background: isActive
                        ? emeraldGradients.deep
                        : alpha(emeraldCore.light, 0.12),
                      borderColor: emeraldCore.light,
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
            border: `1px dashed ${alpha(emeraldCore.light, 0.45)}`,
            bgcolor: blackAlpha(0.22),
            mb: 3,
            textAlign: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: whiteAlpha(0.72) }}>
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
              color: PEARL_SURFACE,
              textShadow: `0 2px 14px ${alpha(emeraldCore.dark, 0.5)}`,
            }}
          >
            {formatCurrency(weeklySuggested)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: whiteAlpha(0.62), display: "block", mt: 0.5 }}
          >
            Total objetivo · {formatCurrency(product.precioCOP)}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Button
            onClick={handleSeed}
            variant="contained"
            size="large"
            startIcon={<Sprout size={18} />}
            sx={{
              background: emeraldGradients.intense,
              color: "#FFFFFF",
              py: 1.5,
              minHeight: 52,
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 2,
              textTransform: "none",
              boxShadow: `0 12px 28px ${alpha(emeraldCore.dark, 0.35)}`,
              "&:hover": { background: emeraldGradients.deep },
              "&:active": { transform: "scale(0.98)" },
            }}
          >
            Sembrar mi Esmereogénesis
          </Button>
          <Typography
            variant="caption"
            sx={{ color: goldAccent.dark, textAlign: "center", mt: 0.5 }}
          >
            No es crédito · No genera deuda · Sin multas
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default EsmereoCreationSheet;
