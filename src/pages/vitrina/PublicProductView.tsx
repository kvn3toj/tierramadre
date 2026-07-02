/**
 * PublicProductView — sandboxed, read-only product page for clients.
 *
 * Rendered on the public `/v/...` routes (and logged-out `/product/:itemId`)
 * OUTSIDE the app shell. It composes the SAME Quiet Emerald product-page
 * components the in-app ProductDetail uses (gallery + gem sheet), so it looks
 * native — but mounts none of the escape-hatch surfaces (cart, favorites,
 * Esmereogénesis, admin data, share/back). The only outbound action is a
 * WhatsApp CTA to the person who shared the link.
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
import { useThemeMode } from "../../contexts/ThemeContext";
import { getQuietEmerald, qeFont } from "../../design-system";
import { formatCarats } from "../../utils/formatting";
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
  /** When provided, shows a back button (inside a multi-product vitrina). */
  onBack?: () => void;
}

export function PublicProductView({
  product,
  pricing,
  senderPhone,
  onBack,
}: PublicProductViewProps) {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const { trmRate } = useTRM();

  const displayName = useMemo(
    () => cleanName(product.nombre),
    [product.nombre],
  );

  const specLine = useMemo(
    () =>
      [
        typeof product.peso === "number"
          ? `${formatCarats(product.peso)} ct`
          : "",
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
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const priceLine = priceLabel ? ` — ${priceLabel}` : "";
    const text = `Hola 💚 Me interesa esta pieza de Tierra Mädre:\n\n${displayName}${priceLine}\n\n${shareUrl}`;
    window.open(
      `https://wa.me/${senderPhone}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

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
        {onBack && (
          <Box sx={{ py: "10px" }}>
            <IconButton
              onClick={onBack}
              aria-label="Volver"
              sx={{ color: qe.muted, width: 36, height: 36, ml: "-6px" }}
            >
              <ArrowLeft size={18} />
            </IconButton>
          </Box>
        )}

        {/* Hero — same faithful gallery well as the in-app product page */}
        <Box sx={{ pt: onBack ? 0 : "12px" }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "6px",
              overflow: "hidden",
              border: `1px solid ${qe.border}`,
              bgcolor: qe.well,
            }}
          >
            <MediaGallery media={media} productName={displayName} />
          </Paper>
        </Box>

        {/* Title + spec line */}
        <Box sx={{ mt: "16px" }}>
          <Typography
            sx={{
              fontFamily: qeFont.serif,
              fontSize: 30,
              lineHeight: 0.96,
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
                fontSize: 10,
                letterSpacing: "0.06em",
                color: qe.subtle,
                mt: "7px",
              }}
            >
              {specLine}
            </Typography>
          )}
        </Box>

        {/* Shared gem-sheet body (identical to the in-app product page) */}
        <FormulaPanel product={product} />
        <SpecGroups product={product} />
        <GemStats product={product} />
        <GemPills product={product} />
        <RelatoBlock product={product} />
        <TrustCard product={product} />

        {/* Per-share price */}
        {priceLabel && (
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
                fontSize: 26,
                fontWeight: 600,
                color: qe.accent,
                fontFeatureSettings: '"tnum"',
                mt: "2px",
              }}
            >
              {priceLabel}
            </Typography>
          </Box>
        )}
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
              boxShadow: `0 4px 14px ${qe.shadow}`,
              "&:hover": { bgcolor: qe.accentStrong },
            }}
          >
            Consultar por WhatsApp
          </Button>
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
        </Stack>
      </Box>
    </Box>
  );
}

export default PublicProductView;
