/**
 * LotePriceBreakdown Component
 *
 * Makes lote/sublote pricing legible. A lote is sold as ONE bundle, but it
 * groups several gems — each with its own value. The plain PriceDisplay only
 * showed a single number that silently swapped between "total" and "this gem"
 * as the gallery changed, which read as ambiguous.
 *
 * This component anchors the TOTAL (stable, never jumps) and lists every piece
 * with its individual price, so the user always knows both "price by item" and
 * "total". The row matching the gallery image in view is highlighted, tying the
 * photo the user is looking at to its price.
 *
 * Heuristics addressed (Nielsen):
 *  - H1 Visibility of system status — labels make explicit what each number is.
 *  - H2 Match with the real world — Spanish labels, money phrased plainly.
 *  - H6 Recognition over recall — no mental math; the breakdown is laid out.
 *  - H8 Aesthetic & minimalist — quiet list, one emerald accent for the active row.
 */

import React, { useMemo } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { useCurrency } from "../../../../contexts/CurrencyContext";
import { usePriceShare } from "../../../../contexts/PriceShareContext";
import { formatFullCurrency } from "../../../../utils/formatting";
import { emeraldCore } from "../../../../design-system/tokens/colors";

export interface LoteBreakdownItem {
  item: number;
  nombre: string;
  precioCOP: number;
}

export interface LotePriceBreakdownProps {
  /** Each gem in the lote, with its individual COP price. */
  items: LoteBreakdownItem[];
  /** Bundle total (COP) — `product.precioCOP`. */
  total: number;
  /**
   * Item number currently shown in the gallery, or null when the bundle hero
   * (the "total" view) is in view. Drives the active-row highlight.
   */
  activeItem?: number | null;
}

/** Strip a leading "L:" lote marker and surrounding whitespace from a name. */
const cleanName = (name: string): string =>
  name
    .replace(/^L:.*?\s/, "")
    .replace(/^L:/, "")
    .trim();

export const LotePriceBreakdown: React.FC<LotePriceBreakdownProps> = ({
  items,
  total,
  activeItem = null,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  const { shouldShowPrices } = usePriceShare();
  const { currency, convertPrice, trmRate, isTrmStale } = useCurrency();

  const isUSD = currency === "USD";
  const secondaryTextColor = isLight
    ? "rgba(60, 60, 67, 0.6)"
    : "rgba(235, 235, 245, 0.6)";
  const rowBorder = isLight
    ? "rgba(60, 60, 67, 0.1)"
    : "rgba(235, 235, 245, 0.1)";
  const activeBg = isLight
    ? `${emeraldCore.primary}12`
    : `${emeraldCore.primary}22`;

  // Pieces that actually carry a price; count drives the "N piezas" badge.
  const pricedItems = useMemo(
    () => items.filter((li) => typeof li.precioCOP === "number"),
    [items],
  );
  const pieceCount = items.length;

  // Coerce missing/NaN sheet values to 0 so we never render "$NaN".
  const fmt = (cop: number) =>
    formatFullCurrency(convertPrice(Number(cop) || 0), currency);

  // PriceShareContext handles provider/guest/preference gating.
  if (!shouldShowPrices) return null;

  return (
    <Stack spacing={1.25} sx={{ width: "100%" }}>
      {/* ── Primary: bundle total (stable anchor) ── */}
      <Box>
        <Typography
          sx={{
            fontSize: "13px",
            fontWeight: 400,
            color: secondaryTextColor,
            letterSpacing: "-0.01em",
            mb: 0.25,
          }}
        >
          Precio del lote
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography
            sx={{
              fontSize: "26px",
              fontWeight: 700,
              color: theme.palette.text.primary,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              fontFeatureSettings: '"tnum"',
            }}
          >
            {fmt(total)}
          </Typography>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              px: 0.75,
              py: 0.125,
              borderRadius: 1,
              bgcolor: activeBg,
              color: emeraldCore.dark,
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {pieceCount} {pieceCount === 1 ? "pieza" : "piezas"}
          </Box>
        </Box>
        {isUSD && (
          <Typography
            sx={{
              fontSize: "11px",
              fontWeight: 400,
              color: secondaryTextColor,
              mt: 0.25,
              fontFeatureSettings: '"tnum"',
            }}
          >
            TRM: {trmRate.toLocaleString("es-CO")}
            {isTrmStale && " · sin conexión"}
          </Typography>
        )}
      </Box>

      {/* ── Per-item breakdown ── */}
      {pricedItems.length > 0 && (
        <Box>
          <Typography
            sx={{
              fontSize: "13px",
              fontWeight: 600,
              color: secondaryTextColor,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              mb: 0.5,
            }}
          >
            Desglose por pieza
          </Typography>

          {items.map((li, i) => {
            const isActive = activeItem != null && li.item === activeItem;
            return (
              <Box
                key={li.item}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.75,
                  px: 0.75,
                  mx: -0.75,
                  borderRadius: 1.5,
                  borderBottom:
                    i < items.length - 1 ? `0.5px solid ${rowBorder}` : "none",
                  bgcolor: isActive ? activeBg : "transparent",
                  transition: "background-color 0.2s ease",
                }}
              >
                {/* Position index */}
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: isActive ? "#FFFFFF" : secondaryTextColor,
                    bgcolor: isActive
                      ? emeraldCore.primary
                      : isLight
                        ? "rgba(60, 60, 67, 0.08)"
                        : "rgba(235, 235, 245, 0.1)",
                  }}
                >
                  {i + 1}
                </Box>

                {/* Name + item number */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: isActive ? 600 : 500,
                      color: theme.palette.text.primary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {cleanName(li.nombre) || `Pieza ${i + 1}`}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{ fontSize: "12px", color: secondaryTextColor }}
                  >
                    #{li.item}
                  </Typography>
                </Box>

                {/* Per-item price */}
                <Typography
                  sx={{
                    flexShrink: 0,
                    fontSize: "14px",
                    fontWeight: 600,
                    color: isActive
                      ? emeraldCore.dark
                      : theme.palette.text.primary,
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  {fmt(li.precioCOP)}
                </Typography>
              </Box>
            );
          })}

          {/* Total row */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              mt: 0.5,
              pt: 1,
              borderTop: `0.5px solid ${rowBorder}`,
            }}
          >
            <Typography
              sx={{
                fontSize: "14px",
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              Total del lote
            </Typography>
            <Typography
              sx={{
                fontSize: "15px",
                fontWeight: 700,
                color: emeraldCore.dark,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {fmt(total)}
            </Typography>
          </Box>
        </Box>
      )}
    </Stack>
  );
};

export default LotePriceBreakdown;
