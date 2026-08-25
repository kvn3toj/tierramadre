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

import { useEffect, useMemo, useState } from 'react';
import { isPurchasable, type ResaleOffer } from '../../utils/productOffer';
import ResaleBadge from '../../components/treasure/ResaleBadge';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowLeft,
  CreditCard,
  MessageCircle,
  Plus,
  Check,
} from 'lucide-react';
import MediaGallery from '../../components/media/MediaGallery';
import { MediaItem } from '../../components/media/types';
import { TreasureItem } from '../../types';
import {
  FormulaPanel,
  SpecGroups,
  GemStats,
  GemPills,
  RelatoBlock,
  TrustCard,
} from '../treasure/ProductDetail/gemSheet/GemSheetParts';
import PrecioEspecialBadge from '../../components/treasure/PrecioEspecialBadge';
import { convertToProxyUrl } from '../../utils/driveUrl';
import { useThemeMode } from '../../contexts/ThemeContext';
import { getQuietEmerald, qeFont } from '../../design-system';
import { formatWeightLabel } from '../../utils/formatting';
import { useTRM } from '../../hooks/useTRM';
import { VitrinaPricing, formatVitrinaPrice } from '../../utils/vitrinaPrice';
import CheckoutSheet, {
  CheckoutPieza,
} from '../../components/checkout/CheckoutSheet';

function cleanName(nombre: string): string {
  return nombre
    .replace(/^L:.*?\s/, '')
    .replace(/^L:/, '')
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
  /**
   * Present when the piece belongs to an ambassador who has offered it for
   * resale. Changes two things the client must not get wrong: the piece is
   * labelled as theirs, and the CTA is Tierra Mädre brokering — never the
   * ambassador directly.
   */
  resale?: ResaleOffer;
  /**
   * The `:code` from the URL, but ONLY when it resolved to a real `vitrinas`
   * record — i.e. `VitrinaPage`'s `ID_LIST_RE` said this is NOT a bare
   * id-list. That record is what supplies `pricing.multiplier`, which is the
   * whole reason the "Pagar" button may exist here: the server can prove
   * which price this customer was shown. A stateless id-list link (or the
   * grandfathered `/product/:itemId` / `/p/:itemId` routes, which always
   * resolve as an id-list of one) has no record and no chosen markup, so this
   * prop comes through as `undefined` and "Pagar" stays hidden — WhatsApp
   * only. Passed down rather than re-deriving `ID_LIST_RE` here, so the two
   * places can't drift.
   */
  vitrinaToken?: string;
  /**
   * Agrega la pieza al carrito. Opcional: sin esto la vista se comporta como
   * siempre. Lo pasa `VitrinaContent`, que es el dueño único del `useCart()`
   * de esta superficie — ver la nota de `CarritoFlotante`.
   */
  onAddToCart?: (item: TreasureItem) => void;
  /** Si esta pieza ya está en el carrito. */
  isInCart?: boolean;
}

export function PublicProductView({
  product,
  pricing,
  senderPhone,
  contactId,
  onBack,
  resale,
  vitrinaToken,
  onAddToCart,
  isInCart,
}: PublicProductViewProps) {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  const { trmRate } = useTRM();
  const theme = useTheme();
  // md+ (≥900px): iPad landscape & desktop get the editorial two-column layout.
  // Below that (phones, iPad portrait) keep the single column + fixed CTA.
  const isWide = useMediaQuery(theme.breakpoints.up('md'));

  // Any time we land on a different piece, start at the top — the gallery, not
  // mid-spec-sheet. Fixes the "opened scrolled-down" jump when coming from a
  // scrolled grid, and resets between pieces inside a multi-item vitrina.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [product.item]);

  const displayName = useMemo(
    () => cleanName(product.nombre),
    [product.nombre],
  );

  const specLine = useMemo(
    () =>
      [
        // 'carats' so a joya never puts its metal here: SpecGroups renders
        // a "Tipo" row with the same value further down the page
        // (GemSheetParts.tsx), and this line previously showed a weight or
        // nothing — never a metal name.
        formatWeightLabel(product, { jewelryPrefers: 'carats' }),
        product.talla,
        product.procedencia || product.mina,
      ]
        .filter(Boolean)
        .join(' · ')
        .toUpperCase(),
    [product.peso, product.talla, product.procedencia, product.mina],
  );

  const priceLabel = formatVitrinaPrice(product.precioCOP, pricing, trmRate);

  // "Pagar" only exists where the server can prove which price this customer
  // was shown (a real vitrina record — see the `vitrinaToken` prop doc), AND
  // there's an actual figure to charge (`priceLabel` is '' for an unpriced
  // piece, e.g. BR-2's "Consultar precio").
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const canPagar = Boolean(vitrinaToken) && priceLabel !== '';
  const piezas: CheckoutPieza[] = useMemo(
    () => [
      {
        sku: String(product.item),
        nombre: displayName,
        precioCOP: product.precioCOP,
        precioMostrado: priceLabel,
      },
    ],
    [product.item, product.precioCOP, displayName, priceLabel],
  );

  // ---- Gallery: fetch the full Drive gallery, fall back to the legacy image ----
  const [media, setMedia] = useState<MediaItem[]>(() =>
    product.imagen
      ? [
          {
            id: `legacy-${product.item}`,
            url: product.imagen,
            type: product.mediaType === 'video' ? 'video' : 'image',
            thumbnailUrl: product.thumbnailUrl,
            category: 'hero',
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
              type: 'image' | 'video';
              order: number;
            }) => ({
              id: img.id,
              url: img.proxyUrl,
              type: img.type,
              thumbnailUrl: img.thumbnailUrl,
              category: 'hero' as const,
              alt: img.name || `${displayName} - ${(img.order ?? 0) + 1}`,
              order: img.order ?? 0,
            }),
          )
          .sort((a: MediaItem, b: MediaItem) => {
            if (a.type === 'image' && b.type === 'video') return -1;
            if (a.type === 'video' && b.type === 'image') return 1;
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

  // El certificado como ÚLTIMA diapositiva — la misma regla que la ficha
  // interna (ProductDetailPage, 6828e1e): sólo una imagen puede ser
  // diapositiva (un PDF no cabe en un <img>, queda link-only en TrustCard),
  // y va al final para no correr los índices de las fotos. Esta es la
  // superficie que un cliente real recibe por link compartido; hasta ahora el
  // certificado sólo existía acá como link «Ver».
  const mediaConCertificado = useMemo<MediaItem[]>(() => {
    const certUrl = product.certificateUrl?.trim();
    if (!certUrl) return media;
    if (/\.pdf(\?|#|$)/i.test(certUrl)) return media;
    if (media.some((m) => m.category === 'certificate')) return media;
    return [
      ...media,
      {
        id: `certificate-${product.item}`,
        url: convertToProxyUrl(certUrl) ?? certUrl,
        type: 'image',
        category: 'certificate',
        alt: `Certificado de ${displayName || `producto ${product.item}`}`,
        order: 999,
      },
    ];
  }, [media, product.certificateUrl, product.item, displayName]);

  const handleConsult = () => {
    // Deterministic signal to GHL — fired BEFORE window.open and never
    // awaited, so it can't delay or block the WhatsApp CTA (which must open
    // synchronously within this click handler or browsers treat it as an
    // untrusted popup and block it). `keepalive` lets the request finish
    // even though the tab may lose focus to WhatsApp immediately after.
    if (contactId) {
      fetch('/api/vitrina-select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, sku: product.item }),
        keepalive: true,
      }).catch(() => {
        /* best-effort — the WhatsApp CTA below must never depend on this */
      });
    }

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const priceLine = priceLabel ? ` — ${priceLabel}` : '';
    // En reventa el mensaje nombra al dueño, para que quien conteste sepa de
    // entrada que está corredando y con quién.
    const text = resale
      ? `Hola 💚 Me interesa esta pieza de la colección de ${resale.asesorName}:\n\n${displayName}${priceLine}\n\n${shareUrl}`
      : `Hola 💚 Me interesa esta pieza de Tierra Mädre:\n\n${displayName}${priceLine}\n\n${shareUrl}`;
    window.open(
      `https://wa.me/${senderPhone}?text=${encodeURIComponent(text)}`,
      '_blank',
    );
  };

  // ---- Shared fragments (composed differently per layout) -----------------

  const backButton = onBack ? (
    <Box sx={{ py: '10px' }}>
      <IconButton
        onClick={onBack}
        aria-label="Volver"
        sx={{ color: qe.muted, width: 36, height: 36, ml: '-6px' }}
      >
        <ArrowLeft size={18} />
      </IconButton>
    </Box>
  ) : null;

  const galleryBlock = (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '8px',
        overflow: 'hidden',
        border: `1px solid ${qe.border}`,
        bgcolor: qe.well,
      }}
    >
      <MediaGallery media={mediaConCertificado} productName={displayName} />
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
      {/* Procedencia antes que la ficha técnica: el cliente tiene que saber
          de quién es la pieza antes de enamorarse del peso y el color. */}
      {resale && (
        <Box sx={{ mt: '10px' }}>
          <ResaleBadge resale={resale} />
        </Box>
      )}
      {specLine && (
        <Typography
          sx={{
            fontFamily: qeFont.mono,
            fontSize: { xs: 10, md: 10.5 },
            letterSpacing: '0.06em',
            color: qe.subtle,
            mt: '8px',
          }}
        >
          {specLine}
        </Typography>
      )}
    </Box>
  );

  const priceBlock = priceLabel ? (
    <Box sx={{ mt: '18px' }}>
      <Typography
        sx={{
          fontFamily: qeFont.mono,
          fontSize: 9.5,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
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
          mt: '2px',
        }}
      >
        {priceLabel}
      </Typography>
      {/* La promoción vive PEGADA al precio: es lo que la califica. Aquí se
          muestra completa (etiqueta + vigencia legible), no en su forma
          compacta de tarjeta — la ficha sí tiene el ancho para decirlo. */}
      {product.precioEspecial && (
        <Box sx={{ mt: '10px' }}>
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
        textTransform: 'none',
        py: 1.35,
        fontWeight: 700,
        fontSize: '1rem',
        borderRadius: '10px',
        // Emerald-tinted lift (the previous value fed a full shadow string in
        // as a color and silently produced no shadow at all).
        boxShadow: '0 6px 20px -6px rgba(0,175,132,0.45)',
        '&:hover': {
          bgcolor: qe.accentStrong,
          boxShadow: '0 8px 24px -6px rgba(0,175,132,0.55)',
        },
      }}
    >
      Consultar por WhatsApp
    </Button>
  );

  const pagarButton = canPagar ? (
    <Button
      fullWidth
      variant="outlined"
      startIcon={<CreditCard size={20} />}
      onClick={() => setCheckoutOpen(true)}
      sx={{
        borderColor: qe.accent,
        borderWidth: '1.5px',
        color: qe.accent,
        textTransform: 'none',
        py: 1.35,
        fontWeight: 700,
        fontSize: '1rem',
        borderRadius: '10px',
        '&:hover': {
          borderWidth: '1.5px',
          borderColor: qe.accentStrong,
          bgcolor: alpha(qe.accent, 0.08),
        },
      }}
    >
      Pagar
    </Button>
  ) : null;

  // "Agregar" existe donde la pieza se puede cobrar, tenga o no vitrina: es
  // el camino del catálogo público, donde el carrito cobra el precio base.
  // `isPurchasable` en vez de comparar `estado` a mano — un `estado` ausente
  // significa desconocido, no vendido (ver `productOffer.ts`).
  const puedeAgregarse =
    Boolean(onAddToCart) &&
    priceLabel !== '' &&
    product.precioCOP > 0 &&
    isPurchasable(product, resale);

  const agregarButton = puedeAgregarse ? (
    <Button
      fullWidth
      variant={isInCart ? 'text' : 'outlined'}
      disabled={isInCart}
      startIcon={isInCart ? <Check size={18} /> : <Plus size={18} />}
      onClick={() => onAddToCart?.(product)}
      sx={{
        borderColor: alpha(qe.accent, 0.45),
        color: isInCart ? qe.subtle : qe.accent,
        textTransform: 'none',
        py: 1.1,
        fontWeight: 600,
        fontSize: '0.9rem',
        borderRadius: '10px',
        '&.Mui-disabled': { color: qe.subtle },
        '&:hover': {
          borderColor: qe.accentStrong,
          bgcolor: alpha(qe.accent, 0.06),
        },
      }}
    >
      {isInCart ? 'En tu selección' : 'Agregar a mi selección'}
    </Button>
  ) : null;

  const consultTagline = (
    <Typography
      sx={{
        mt: 0.75,
        textAlign: 'center',
        fontSize: 11,
        fontFamily: qeFont.ui,
        color: qe.subtle,
      }}
    >
      Tierra Mädre · Esmeraldas colombianas con ADN de paz
    </Typography>
  );

  // Both CTAs side by side when "Pagar" is available; WhatsApp alone (as
  // before) when it isn't.
  // Tres afordancias como máximo, y nunca tres en la misma fila:
  //  · con vitrina → [Pagar | Consultar] y "Agregar" debajo, secundario:
  //    quien llegó por una vitrina puede cerrar esa pieza sin pasar por el
  //    carrito, que es el flujo que ya existía y funciona.
  //  · sin vitrina → [Agregar | Consultar]: acá el carrito ES el camino al
  //    pago, así que "Agregar" sube a primario.
  const ctaButtons = pagarButton ? (
    <>
      <Box sx={{ display: 'flex', gap: 1.25 }}>
        <Box sx={{ flex: 1 }}>{pagarButton}</Box>
        <Box sx={{ flex: 1 }}>{consultButton}</Box>
      </Box>
      {agregarButton ? <Box sx={{ mt: 1 }}>{agregarButton}</Box> : null}
    </>
  ) : agregarButton ? (
    <Box sx={{ display: 'flex', gap: 1.25 }}>
      <Box sx={{ flex: 1 }}>{agregarButton}</Box>
      <Box sx={{ flex: 1 }}>{consultButton}</Box>
    </Box>
  ) : (
    consultButton
  );

  const checkoutSheet = vitrinaToken ? (
    <CheckoutSheet
      open={checkoutOpen}
      piezas={piezas}
      multiplicador={pricing.multiplier}
      origen={{ tipo: 'vitrina', token: vitrinaToken }}
      onClose={() => setCheckoutOpen(false)}
    />
  ) : null;

  // ---- Wide layout (md+): editorial two-column, sticky gallery + inline CTA --
  if (isWide) {
    return (
      <Box sx={{ bgcolor: qe.base, minHeight: '100%' }}>
        <Box
          sx={{
            maxWidth: 1160,
            mx: 'auto',
            px: { md: 4, lg: 6 },
            pt: { md: 1.5 },
            pb: { md: 8 },
          }}
        >
          {backButton}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { md: '1fr 1fr', lg: '1.05fr 1fr' },
              columnGap: { md: 5, lg: 7 },
              alignItems: 'start',
              pt: onBack ? 0 : { md: 1.5 },
            }}
          >
            {/* Left: gallery stays in view while the specs scroll past it */}
            <Box sx={{ position: 'sticky', top: 24 }}>{galleryBlock}</Box>

            {/* Right: name → price → CTA above the fold, gem sheet below */}
            <Box sx={{ minWidth: 0 }}>
              {titleBlock}
              {priceBlock}
              <Box sx={{ mt: '22px' }}>
                {ctaButtons}
                {consultTagline}
              </Box>
              {specSheet}
            </Box>
          </Box>
        </Box>
        {checkoutSheet}
      </Box>
    );
  }

  // ---- Compact layout (phones + iPad portrait): single column + fixed CTA ----
  return (
    <Box sx={{ bgcolor: qe.base, minHeight: '100%' }}>
      <Box
        sx={{
          maxWidth: 560,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          pb: 'calc(104px + env(safe-area-inset-bottom))',
        }}
      >
        {backButton}

        {/* Hero — same faithful gallery well as the in-app product page */}
        <Box sx={{ pt: onBack ? 0 : '12px' }}>{galleryBlock}</Box>

        {/* Title + spec line */}
        <Box sx={{ mt: '16px' }}>{titleBlock}</Box>

        {/* Per-share price — BEFORE the spec sheet, same order as the wide
            layout. The CTA is sticky here, so with the price at the bottom a
            client could reach "Pagar" without ever having crossed the figure
            (recorrido de UI del 2026-08-24). */}
        {priceBlock}

        {/* Shared gem-sheet body (identical to the in-app product page) */}
        {specSheet}
      </Box>

      {/* Sticky WhatsApp CTA */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          px: 2,
          pt: 1.5,
          pb: 'max(env(safe-area-inset-bottom, 16px), 16px)',
          bgcolor: qe.base,
          borderTop: `1px solid ${qe.border}`,
        }}
      >
        <Stack sx={{ maxWidth: 560, mx: 'auto' }}>
          {ctaButtons}
          {consultTagline}
        </Stack>
      </Box>
      {checkoutSheet}
    </Box>
  );
}

export default PublicProductView;
