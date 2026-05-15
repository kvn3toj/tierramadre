/**
 * EsmereoCreationSheet
 *
 * Bottom sheet that lets the user pick a duration (3/6/9/12 months) and seeds
 * a new Esmereogénesis plan rooted on the given TreasureItem.
 *
 * Surface + dismiss behaviour live in BottomSheetShell so this file stays
 * focused on the creation logic itself.
 */

import React, { useMemo, useState } from "react";
import { Box, Button, Typography, alpha } from "@mui/material";
import { Sprout } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { DurationMonths } from "../../types/esmereogenesis";
import type { TreasureItem } from "../../types";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useTrackingDispatch } from "../../contexts/TrackingContext";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";
import { calcWeeklySuggested } from "../../data/esmereo-mock";
import { emeraldCore, goldAccent } from "../../design-system/tokens/colors";
import { emeraldGradients } from "../../design-system/tokens/gradients";
import { whiteAlpha, blackAlpha } from "../../design-system/utils/colorUtils";
import { PEARL_SURFACE } from "./tokens";
import { BottomSheetShell } from "./BottomSheetShell";

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
    // Slight delay to let the sheet close animation start.
    setTimeout(() => navigate(`/esmereogenesis/${plan.id}`), 80);
  };

  const productName = product.nombre
    .replace(/^L:.*?\s/, "")
    .replace(/^L:/, "")
    .trim();

  return (
    <BottomSheetShell
      open={open}
      onClose={onClose}
      ariaLabelledBy="esmereo-create-title"
    >
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
          // 2x2 on phones so "12 meses" never gets clipped at 360px width;
          // 1x4 row from sm upward where there's real horizontal real estate.
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(4, 1fr)",
            },
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
    </BottomSheetShell>
  );
};

export default EsmereoCreationSheet;
