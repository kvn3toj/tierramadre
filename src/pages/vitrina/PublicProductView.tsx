/**
 * PublicProductView — sandboxed, read-only product page for clients.
 *
 * Rendered on the public `/v/...` routes (and logged-out `/product/:itemId`)
 * OUTSIDE the app shell. It composes the SAME Quiet Emerald product-page
 * components the in-app ProductDetail uses (gallery + gem sheet), so it looks
 * native — but mounts none of the escape-hatch surfaces (cart, favorites,
 * Esmereogénesis, admin data, share/back). The only outbound action is a
 * WhatsApp CTA to the person who shared the link. When the link carries a
 * GHL `contactId` (from WF-04), that same tap also writes the pick straight
 * to the GHL contact (see /api/vitrina-select) instead of relying on María
 * to parse the WhatsApp reply text.
 *
 * Price is the per-share figure (precioCOP × chosen multiplier, in the chosen
 * currency), computed from the link's stored pricing — never a hidden state.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ArrowLeft, MessageCircle } from "lucide-react";
import MediaGallery from "../../components/media/MediaGallery";
import { MediaItem } from "../../components/media/types";
import { TreasureItem } from "../../types";
import {
  FormulaPanel,
  SpecGroups,
  GemStats,
  GemPills,
  RelatoBlock,
  TrustCard,
} from "../treasure/ProductDetail/gemSheet/GemSheetParts";
import PrecioEspecialBadge from "../../components/treasure/PrecioEspecialBadge";
import { useThemeMode } from "../../contexts/ThemeContext";
import { getQuietEmerald, qeFont } from "../../design-system";
import { formatWeightLabel } from "../../utils/formatting";
import { useTRM } from "../../hooks/useTRM";
import { VitrinaPricing, formatVitrinaPrice } from "../../utils/vitrinaPrice";

function cleanName(nombre: string): string {
  return nombre
    .replace(/^L:.*?\s/, "")
    .replace(/^L:/, "")
    .trim();
}

interface PublicProductViewProps {
  product: TreasureItem;
  pricing: VitrinaPricing;
  /** Digits-only WhatsApp number the "Consultar" CTA opens. */
  senderPhone: string;
  /**
   * GHL contact id (from the link's `?cid=`), present only when this Vitrina
   * came from WF-04. When set, tapping "Consultar" also writes the pick
   * straight to that GHL contact (see /api/vitrina-select) — a deterministic
   * signal that doesn't depend on María parsing the WhatsApp reply text.
   */
  contactId?: string;
  /** When provided, shows a back button (inside a multi-product vitrina). */
  onBack?: () => void;
}

export function PublicProductView({
  product,
  pricing,
  senderPhone,
  contactId,
  onBack,
}: PublicProductViewProps) {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const { trmRate } = useTRM();
  const theme = useTheme();
  // md+ (≥900px): iPad landscape & desktop get the editorial two-column layout.
  // Below that (phones, iPad portrait) keep the single column + fixed CTA.
  const isWide = useMediaQuery(theme.breakpoints.up("md"));

  // Any time we land on a different piece, start at the top — the gallery, not
  // mid-spec-sheet. Fixes the "opened scrolled-down" jump when coming from a
  // scrolled grid, and resets between pieces inside a multi-item vitrina.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [product.item]);

  const displayName = useMemo(
    () => cleanName(product.nombre),
    [product.nombre],
  );

  const specLine = useMemo(
    () =>
      [
        formatWeightLabel(product),
        product.talla,
        product.procedencia || product.mina,
      ]
        .filter(Boolean)
        .join(" · ")
        .toUpperCase(),
    [product.peso, product.talla, product.procedencia, product.mina],
  );

  const priceLabel = formatVitrinaPrice(product.precioCOP, pricing, trmRate);

  // ---- Gallery: fetch the full Drive gallery, fall back to the legacy image ----
  const [media, setMedia] = useState<MediaItem[]>(() =>
    product.imagen
      ? [
          {
            id: `legacy-${product.item}`,
            url: product.imagen,
            type: product.mediaType === "video" ? "video" : "image",
            thumbnailUrl: product.thumbnailUrl,
            category: "hero",
            alt: displayName || `Producto ${product.item}`,
            order: 0,
          },
        ]
      : [],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch(`/api/get-drive-images?itemNumber=${product.item}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.success || !data.images?.length) return;
        const items: MediaItem[] = data.images
          .map(
            (img: {
              id: string;
              name: string;
              proxyUrl: string;
              thumbnailUrl: string;
              type: "image" | "video";
              order: number;
            }) => ({
              id: img.id,
              url: img.proxyUrl,
              type: img.type,
              thumbnailUrl: img.thumbnailUrl,
              category: "hero" as const,
              alt: img.name || `${displayName} - ${(img.order ?? 0) + 1}`,
              order: img.order ?? 0,
            }),
          )
          .sort((a: MediaItem, b: MediaItem) => {
            if (a.type === "image" && b.type === "video") return -1;
            if (a.type === "video" && b.type === "image") return 1;
            return a.order - b.order;
          });
        setMedia(items);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [product.item, displayName]);

  const handleConsult = () => {
    // Deterministic signal to GHL — fired BEFORE window.open and never
    // awaited, so it can't delay or block the WhatsApp CTA (which must open
    // synchronously within this click handler or browsers treat it as an
    // untrusted popup and block it). `keepalive` lets the request finish
    // even though the tab may lose focus to WhatsApp immediately after.
    if (contactId) {
      fetch("/api/vitrina-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, sku: product.item }),
        keepalive: true,
      }).catch(() => {
        /* best-effort — the WhatsApp CTA below must never depend on this */
      });
    }

    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const priceLine = priceLabel ? ` — ${priceLabel}` : "";
    const text = `Hola 💚 Me interesa esta pieza de Tierra Mädre:\n\n${displayName}${priceLine}\n\n${shareUrl}`;
    window.open(
      `https://wa.me/${senderPhone}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  // ---- Shared fragments (composed differently per layout) -----------------

  const backButton = onBack ? (
    <Box sx={{ py: "10px" }}>
      <IconButton
        onClick={onBack}
        aria-label="Volver"
        sx={{ color: qe.muted, width: 36, height: 36, ml: "-6px" }}
      >
        <ArrowLeft size={18} />
      </IconButton>
    </Box>
  ) : null;

  const galleryBlock = (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "8px",
        overflow: "hidden",
        border: `1px solid ${qe.border}`,
        bgcolor: qe.well,
      }}
    >
      <MediaGallery media={media} productName={displayName} />
    </Paper>
  );

  const titleBlock = (
    <Box>
      <Typography
        sx={{
          fontFamily: qeFont.serif,
          fontSize: { xs: 30, md: 40 },
          lineHeight: 0.98,
          fontWeight: 500,
          color: qe.text,
        }}
      >
        {displayName}
      </Typography>
      {specLine && (
        <Typography
          sx={{
            fontFamily: qeFont.mono,
            fontSize: { xs: 10, md: 10.5 },
            letterSpacing: "0.06em",
            color: qe.subtle,
            mt: "8px",
          }}
        >
          {specLine}
        </Typography>
      )}
    </Box>
  );

  const priceBlock = priceLabel ? (
    <Box sx={{ mt: "18px" }}>
      <Typography
        sx={{
          fontFamily: qeFont.mono,
          fontSize: 9.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: qe.subtle,
        }}
      >
        Precio
      </Typography>
      <Typography
        sx={{
          fontFamily: qeFont.mono,
          fontSize: { xs: 26, md: 30 },
          fontWeight: 600,
          color: qe.accent,
          fontFeatureSettings: '"tnum"',
          mt: "2px",
        }}
      >
        {priceLabel}
      </Typography>
      {/* La promoción vive PEGADA al precio: es lo que la califica. Aquí se
          muestra completa (etiqueta + vigencia legible), no en su forma
          compacta de tarjeta — la ficha sí tiene el ancho para decirlo. */}
      {product.precioEspecial && (
        <Box sx={{ mt: "10px" }}>
          <PrecioEspecialBadge precioEspecial={product.precioEspecial} />
        </Box>
      )}
    </Box>
  ) : null;

  const specSheet = (
    <>
      <FormulaPanel product={product} />
      <SpecGroups product={product} />
      <GemStats product={product} />
      <GemPills product={product} />
      <RelatoBlock product={product} />
      <TrustCard product={product} />
    </>
  );

  const consultButton = (
    <Button
      fullWidth
      variant="contained"
      startIcon={<MessageCircle size={20} />}
      onClick={handleConsult}
      sx={{
        bgcolor: qe.accent,
        color: qe.onAccent,
        textTransform: "none",
        py: 1.35,
        fontWeight: 700,
        fontSize: "1rem",
        borderRadius: "10px",
        // Emerald-tinted lift (the previous value fed a full shadow string in
        // as a color and silently produced no shadow at all).
        boxShadow: "0 6px 20px -6px rgba(0,175,132,0.45)",
        "&:hover": {
          bgcolor: qe.accentStrong,
          boxShadow: "0 8px 24px -6px rgba(0,175,132,0.55)",
        },
      }}
    >
      Consultar por WhatsApp
    </Button>
  );

  const consultTagline = (
    <Typography
      sx={{
        mt: 0.75,
        textAlign: "center",
        fontSize: 11,
        fontFamily: qeFont.ui,
        color: qe.subtle,
      }}
    >
      Tierra Mädre · Esmeraldas colombianas con ADN de paz
    </Typography>
  );

  // ---- Wide layout (md+): editorial two-column, sticky gallery + inline CTA --
  if (isWide) {
    return (
      <Box sx={{ bgcolor: qe.base, minHeight: "100%" }}>
        <Box
          sx={{
            maxWidth: 1160,
            mx: "auto",
            px: { md: 4, lg: 6 },
            pt: { md: 1.5 },
            pb: { md: 8 },
          }}
        >
          {backButton}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { md: "1fr 1fr", lg: "1.05fr 1fr" },
              columnGap: { md: 5, lg: 7 },
              alignItems: "start",
              pt: onBack ? 0 : { md: 1.5 },
            }}
          >
            {/* Left: gallery stays in view while the specs scroll past it */}
            <Box sx={{ position: "sticky", top: 24 }}>{galleryBlock}</Box>

            {/* Right: name → price → CTA above the fold, gem sheet below */}
            <Box sx={{ minWidth: 0 }}>
              {titleBlock}
              {priceBlock}
              <Box sx={{ mt: "22px" }}>
                {consultButton}
                {consultTagline}
              </Box>
              {specSheet}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // ---- Compact layout (phones + iPad portrait): single column + fixed CTA ----
  return (
    <Box sx={{ bgcolor: qe.base, minHeight: "100%" }}>
      <Box
        sx={{
          maxWidth: 560,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          pb: "calc(104px + env(safe-area-inset-bottom))",
        }}
      >
        {backButton}

        {/* Hero — same faithful gallery well as the in-app product page */}
        <Box sx={{ pt: onBack ? 0 : "12px" }}>{galleryBlock}</Box>

        {/* Title + spec line */}
        <Box sx={{ mt: "16px" }}>{titleBlock}</Box>

        {/* Shared gem-sheet body (identical to the in-app product page) */}
        {specSheet}

        {/* Per-share price */}
        {priceBlock}
      </Box>

      {/* Sticky WhatsApp CTA */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          px: 2,
          pt: 1.5,
          pb: "max(env(safe-area-inset-bottom, 16px), 16px)",
          bgcolor: qe.base,
          borderTop: `1px solid ${qe.border}`,
        }}
      >
        <Stack sx={{ maxWidth: 560, mx: "auto" }}>
          {consultButton}
          {consultTagline}
        </Stack>
      </Box>
    </Box>
  );
}

export default PublicProductView;
