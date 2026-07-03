/**
 * Floating A/B switch for the Quiet Emerald redesign.
 *
 * Lets the design owner flip the three redesigned screens between the two
 * philosophies (see useRedesignVariant) live, with real data. Deliberately
 * low-key: a small hairline pill anchored above the bottom nav. Rendered inside
 * the redesigned screens (only one route mounts at a time, so no duplicates).
 */

import React from "react";
import { Box, ButtonBase } from "@mui/material";
import { getQuietEmerald, qeFont } from "../../design-system";
import { useThemeMode } from "../../contexts/ThemeContext";
import {
  useRedesignVariant,
  type RedesignVariant,
} from "../../hooks/useRedesignVariant";

const OPTIONS: { value: RedesignVariant; label: string; hint: string }[] = [
  { value: "faithful", label: "A", hint: "Fiel" },
  { value: "literal", label: "B", hint: "Mockup" },
];

export const RedesignVariantToggle: React.FC = () => {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const { variant, setVariant } = useRedesignVariant();

  return (
    <Box
      role="group"
      aria-label="Variante de rediseño"
      sx={{
        position: "fixed",
        left: 16,
        bottom: "calc(96px + env(safe-area-inset-bottom))",
        zIndex: 1400,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        p: "4px",
        borderRadius: "999px",
        bgcolor: qe.surface,
        border: `1px solid ${qe.border}`,
        boxShadow: qe.shadow,
        backdropFilter: "none",
      }}
    >
      <Box
        aria-hidden
        sx={{
          fontFamily: qeFont.mono,
          fontSize: "8.5px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: qe.subtle,
          pl: "8px",
          pr: "2px",
          userSelect: "none",
        }}
      >
        A/B
      </Box>
      {OPTIONS.map((opt) => {
        const active = opt.value === variant;
        return (
          <ButtonBase
            key={opt.value}
            onClick={() => setVariant(opt.value)}
            aria-pressed={active}
            aria-label={`Variante ${opt.label} · ${opt.hint}`}
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: "5px",
              px: "11px",
              py: "6px",
              borderRadius: "999px",
              transition: "background-color 160ms, color 160ms",
              bgcolor: active ? qe.accentStrong : "transparent",
              color: active ? qe.onAccent : qe.muted,
              "&:hover": {
                bgcolor: active ? qe.accentStrong : qe.well,
              },
            }}
          >
            <Box
              component="span"
              sx={{
                fontFamily: qeFont.mono,
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              {opt.label}
            </Box>
            <Box
              component="span"
              sx={{
                fontFamily: qeFont.ui,
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              {opt.hint}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
};

export default RedesignVariantToggle;
