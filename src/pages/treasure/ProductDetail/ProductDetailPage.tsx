/**
 * ProductDetail Component
 * Detailed product view with gallery, specifications, and actions.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  useTheme,
  Snackbar,
  Skeleton,
  IconButton,
} from "@mui/material";
import { ChevronLeft, Package, Crown, Heart } from "lucide-react";

import { useShare } from "../../../hooks/useShare";
import { useHaptics } from "../../../hooks/useHaptics";
import { useProductView } from "../../../hooks/useProductView";
import { useCart } from "../../../hooks/useCart";
import { useWhatsAppContact } from "../../../hooks/useWhatsAppContact";
import { useFavorites } from "../../../hooks/useFavorites";
import { treasureToCartItem } from "../../../types/cart";
import AdminSelectDialog from "../../../components/cart/AdminSelectDialog";
import { useThemeMode } from "../../../contexts/ThemeContext";
import { usePriceShare } from "../../../contexts/PriceShareContext";
import { useIsAdmin, useIsProvider } from "../../../hooks/usePermissions";
import { useIsGuest } from "../../../hooks/useAuth";
import { useTreasure } from "../../../hooks/useTreasure";
import { MemberBenefitsTeaser } from "../../../components/guest";
import { MediaGallery } from "../../../components/media";
import type { MediaItem } from "../../../components/media/types";
import { PriceDisplay } from "../../../components/price-simulator/PriceDisplay";
import { createLogger } from "../../../utils/logger";
import { convertToProxyUrl } from "../../../utils/driveUrl";
import {
  surfacesLight,
  surfacesDark,
  goldAccent,
  emeraldCore,
} from "../../../design-system/tokens/colors";
import { buttonGradients } from "../../../design-system/tokens/gradients";
import { accentColors, lightTokens, zIndex } from "../../../design-system";
import {
  SpecificationsList,
  AdditionalInfo,
  ProductActions,
  LotePriceBreakdown,
  CertificateSection,
  CharacteristicsSection,
  ProvenanceSection,
  PricePerCarat,
} from "./components";
import { useConvexQuery, convexApi } from "../../../lib/convex-safe";
import { EsmereogenesisCTA } from "../../../components/esmereogenesis/EsmereogenesisCTA";
import Breadcrumbs from "../../../components/shared/Breadcrumbs";
import { scrollMainTo } from "../../../utils/mainScroll";
import { activeLotePiece, resolveLoteDetail } from "./loteDetail";

const log = createLogger("ProductDetail");

export default function ProductDetail() {
  const { itemId, groupId } = useParams<{
    itemId?: string;
    groupId?: string;
  }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const isAdmin = useIsAdmin();
  const isGuest = useIsGuest();
  const isProvider = useIsProvider();
  const { shouldShowPrices } = usePriceShare();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  const { treasure, updateMediaItems, getMediaItems, isLoadingSheets } =
    useTreasure();
  const { shareProduct, isNativeShareSupported } = useShare();
  const { trigger: triggerHaptic } = useHaptics();
  const { addToCart, isInCart, cartCount } = useCart();
  const { openWhatsAppToInviter, openWhatsAppToAdmin, admins, hasInviter } =
    useWhatsAppContact();

  // Current gallery image index (drives the per-item price on lote bundles)
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Scroll to top + reset gallery when navigating to this page
  useEffect(() => {
    scrollMainTo({ top: 0 });
    setGalleryIndex(0);
  }, [itemId, groupId]);

  // Find the product — by groupId for grouped lote/sublote cards, else by item.
  const product = useMemo(() => {
    if (groupId) return treasure.find((item) => item.groupId === groupId);
    return treasure.find((item) => item.item.toString() === itemId);
  }, [treasure, itemId, groupId]);

  // Get display name early for use in effects
  const displayName = useMemo(() => {
    if (!product) return "";
    return product.nombre
      .replace(/^L:.*?\s/, "")
      .replace(/^L:/, "")
      .trim();
  }, [product]);

  // ── Admin-only Convex doc (R5) ──
  // syncStatus/syncError/preponderancia/procedencia/loteId are INTERNAL and must
  // NOT be added to the public, anonymously-subscribed `publishedCatalog` query
  // (that would leak them to every catalog visitor's WebSocket payload). Instead
  // we fetch the full admin doc here and ONLY when the viewer is an admin —
  // `"skip"` keeps the subscription (and its reactive payload) off for everyone
  // else. Single items only: grouped lote/sublote cards (`groupId` route) have
  // no single itemId, so we skip and provenance/sync simply don't surface there.
  const adminItemId =
    isAdmin && !groupId && product && !product.isLote
      ? product.item.toString()
      : undefined;
  const adminDoc = useConvexQuery(
    convexApi.products.get,
    adminItemId ? { itemId: adminItemId } : "skip",
  ) as
    | {
        procedencia?: string;
        loteId?: string;
        preponderancia?: number;
        syncStatus?: "synced" | "pending" | "error";
        syncError?: string;
      }
    | null
    | undefined;

  // Overlay the admin-only provenance/sync fields onto the product so the
  // sections below can read them. Reactive: an AI edit to any of these fields
  // updates `adminDoc` and re-renders live. Non-admins get `product` untouched
  // (adminDoc is undefined because the query is skipped).
  const adminProduct = useMemo(() => {
    if (!product) return product;
    if (!adminDoc) return product;
    return {
      ...product,
      procedencia: adminDoc.procedencia,
      loteId: adminDoc.loteId,
      preponderancia: adminDoc.preponderancia,
      syncStatus: adminDoc.syncStatus,
      syncError: adminDoc.syncError,
    };
  }, [product, adminDoc]);

  // Grouped lote/sublote: build gallery media + an aligned price array in one
  // pass so indices stay in sync even when some items lack a photo. Index 0 =
  // bundle hero (total price); index k = the k-th item that has a photo.
  const loteMedia = useMemo(() => {
    if (!product?.isLote || !product.loteItems) return null;
    const media: MediaItem[] = [];
    const prices: number[] = [];
    // `itemKeys[i]` = the lote item shown at gallery slot i, or null for the
    // bundle hero (slot 0). Lets the price breakdown highlight the row whose
    // photo is currently in view.
    const itemKeys: (number | null)[] = [];
    if (product.imagen) {
      media.push({
        id: `lote-hero-${product.groupId}`,
        url: product.imagen, // already proxied in useTreasure
        type: "image",
        category: "hero",
        alt: `${displayName} — lote completo`,
        order: 0,
      });
      prices.push(product.precioCOP); // total
      itemKeys.push(null);
    }
    product.loteItems.forEach((li, i) => {
      if (!li.imagen) return;
      media.push({
        id: `lote-item-${li.item}`,
        url: convertToProxyUrl(li.imagen) ?? li.imagen,
        type: "image",
        category: "detail",
        alt: `${li.nombre} (#${li.item})`,
        order: i + 1,
      });
      prices.push(li.precioCOP);
      itemKeys.push(li.item);
    });
    if (prices.length === 0) prices.push(product.precioCOP);
    return { media, prices, itemKeys };
  }, [product, displayName]);

  // The lote piece whose photo is currently in the gallery, or null when the
  // bundle hero (slot 0) is in view. Drives the per-piece detail swap below.
  const activeLoteItem = useMemo(
    () => activeLotePiece(product, loteMedia?.itemKeys, galleryIndex),
    [product, loteMedia, galleryIndex],
  );

  // What the descriptive sections (title, metadata, specifications) render.
  // When a single piece's photo is in view, we overlay that piece's own specs
  // onto the bundle so the detail below matches the image; otherwise we show
  // the bundle itself. Pricing breakdown, QR, favorites and cart actions stay
  // bundle-scoped (the lote is bought as one), so they keep using `product`.
  const detail = useMemo(
    () => (product ? resolveLoteDetail(product, activeLoteItem) : undefined),
    [product, activeLoteItem],
  );

  // Cleaned title for the piece (or bundle) currently in view.
  const detailName = useMemo(() => {
    if (!detail) return "";
    return detail.nombre
      .replace(/^L:.*?\s/, "")
      .replace(/^L:/, "")
      .trim();
  }, [detail]);

  // Track product view (once per session, fire-and-forget)
  useProductView({
    itemId: product?.item || 0,
    productName: displayName,
    enabled: !!product && !isLoadingSheets,
  });

  // Stable refs for treasure functions whose identity changes on every
  // galleries update — avoids infinite fetch loop in the effect below.
  const getMediaItemsRef = useRef(getMediaItems);
  const updateMediaItemsRef = useRef(updateMediaItems);
  useEffect(() => {
    getMediaItemsRef.current = getMediaItems;
    updateMediaItemsRef.current = updateMediaItems;
  }, [getMediaItems, updateMediaItems]);

  // Load media items for the product from Google Drive folder
  useEffect(() => {
    // Grouped lote/sublote: photos come from the lote card itself (hero + each
    // item), not the Drive-folder API. Set them directly and skip the fetch.
    if (product?.isLote) {
      setMediaItems(loteMedia?.media ?? []);
      return;
    }
    if (product) {
      let isCancelled = false;

      const loadMedia = async () => {
        // Only show cached Drive items immediately — these have the same
        // IDs/URLs the API will return, so no gallery reset on arrival.
        // Legacy item is reserved as a fallback if the API fails.
        const localItems = getMediaItemsRef.current
          ? getMediaItemsRef.current(product.item)
          : [];
        if (localItems.length > 0) {
          setMediaItems(localItems);
        } else if (product.imagen) {
          // Show legacy image immediately as placeholder while API loads.
          // This ensures the gallery never starts empty (no empty→populated jump).
          setMediaItems([
            {
              id: `legacy-${product.item}`,
              url: product.imagen,
              type: product.mediaType === "video" ? "video" : "image",
              thumbnailUrl: product.thumbnailUrl,
              category: "hero" as const,
              alt: displayName || `Producto ${product.item}`,
              order: 0,
            },
          ]);
        }

        try {
          const response = await fetch(
            `/api/get-drive-images?itemNumber=${product.item}`,
          );
          if (isCancelled) return;

          const data = await response.json();

          if (data.success && data.images && data.images.length > 0) {
            const driveItems: MediaItem[] = data.images.map(
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
                alt: img.name || `${displayName} - ${img.order + 1}`,
                order: img.order,
              }),
            );

            const sortedItems = [...driveItems].sort((a, b) => {
              if (a.type === "image" && b.type === "video") return -1;
              if (a.type === "video" && b.type === "image") return 1;
              return a.order - b.order;
            });

            if (!isCancelled) {
              setMediaItems((prev) => {
                if (
                  prev.length === sortedItems.length &&
                  prev.every((p, i) => p.url === sortedItems[i].url)
                ) {
                  return prev;
                }
                return sortedItems;
              });
              if (updateMediaItemsRef.current) {
                updateMediaItemsRef.current(product.item, driveItems);
              }
            }
          } else if (!isCancelled && localItems.length === 0) {
            // API returned nothing and no cache — fall back to legacy image
            if (product.imagen) {
              setMediaItems([
                {
                  id: `legacy-${product.item}`,
                  url: product.imagen,
                  type: product.mediaType === "video" ? "video" : "image",
                  thumbnailUrl: product.thumbnailUrl,
                  category: "hero",
                  alt: displayName || `Producto ${product.item}`,
                  order: 0,
                },
              ]);
            }
          }
        } catch (error) {
          if (!isCancelled) {
            log.error("Error fetching Drive images:", error);

            // On error with no cache, fall back to legacy image
            if (localItems.length === 0 && product.imagen) {
              setMediaItems([
                {
                  id: `legacy-${product.item}`,
                  url: product.imagen,
                  type: product.mediaType === "video" ? "video" : "image",
                  thumbnailUrl: product.thumbnailUrl,
                  category: "hero",
                  alt: displayName || `Producto ${product.item}`,
                  order: 0,
                },
              ]);
            }
          }
        }
      };

      loadMedia();

      return () => {
        isCancelled = true;
      };
    }
  }, [product, displayName, loteMedia]);

  // Handle share product
  const handleShareProduct = useCallback(async () => {
    if (!product) return;

    triggerHaptic("light");
    const result = await shareProduct(product);

    if (result.success) {
      triggerHaptic("success");
      if (result.method === "clipboard") {
        log.debug("Product link copied to clipboard");
      }
    }
  }, [product, shareProduct, triggerHaptic]);

  // Handle add to cart
  const handleAddToCart = useCallback(() => {
    if (!product) return;

    if (isInCart(product.item)) {
      navigate("/cart");
      return;
    }

    addToCart(product);
    triggerHaptic("success");
    setSnackbarMessage("Producto agregado a tu seleccion");
    setSnackbarOpen(true);
  }, [product, isInCart, addToCart, triggerHaptic, navigate]);

  // Handle contact action
  const handleContact = useCallback(async () => {
    if (!product) return;

    triggerHaptic("light");

    if (isGuest) {
      if (!hasInviter) {
        setSnackbarMessage("No se encontro el contacto de tu invitador");
        setSnackbarOpen(true);
        return;
      }
      const cartItem = treasureToCartItem(product);
      await openWhatsAppToInviter([cartItem]);
    } else {
      setAdminDialogOpen(true);
    }
  }, [product, isGuest, hasInviter, openWhatsAppToInviter, triggerHaptic]);

  // Handle admin selected (for staff contact flow)
  const handleAdminSelected = useCallback(
    async (adminName: string) => {
      if (!product) return;
      const cartItem = treasureToCartItem(product);
      await openWhatsAppToAdmin([cartItem], adminName);
    },
    [product, openWhatsAppToAdmin],
  );

  // Show skeleton loading state matching actual layout
  if (isLoadingSheets && !product) {
    return (
      <Box
        sx={{ maxWidth: 1400, mx: "auto", px: { xs: 0, sm: 3, md: 4 }, pb: 3 }}
      >
        <Box sx={{ px: { xs: 2, sm: 0 }, mb: 1 }}>
          <Skeleton width={160} height={20} sx={{ borderRadius: 1 }} />
        </Box>
        <Grid container spacing={{ xs: 1.5, md: 3 }}>
          {/* Image skeleton */}
          <Grid item xs={12} md={6}>
            <Skeleton
              variant="rounded"
              sx={{
                width: "100%",
                aspectRatio: "1/1",
                borderRadius: { xs: 0, sm: 3 },
              }}
            />
            {/* Thumbnail strip skeleton */}
            <Box sx={{ display: "flex", gap: 1, mt: 1, px: { xs: 2, sm: 0 } }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  width={64}
                  height={64}
                  sx={{ borderRadius: 1.5, flexShrink: 0 }}
                />
              ))}
            </Box>
          </Grid>
          {/* Specs skeleton */}
          <Grid item xs={12} md={6}>
            <Box sx={{ px: { xs: 2, sm: 0 }, pt: { xs: 1, md: 0 } }}>
              <Skeleton width="70%" height={32} sx={{ mb: 1 }} />
              <Skeleton width="40%" height={24} sx={{ mb: 2 }} />
              <Skeleton width="50%" height={36} sx={{ mb: 3 }} />
              {[0, 1, 2, 3, 4].map((i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1.5,
                  }}
                >
                  <Skeleton width="30%" height={20} />
                  <Skeleton width="40%" height={20} />
                </Box>
              ))}
              <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
                <Skeleton
                  variant="rounded"
                  width="50%"
                  height={48}
                  sx={{ borderRadius: 3 }}
                />
                <Skeleton
                  variant="rounded"
                  width="50%"
                  height={48}
                  sx={{ borderRadius: 3 }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box
        sx={{
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: 8,
          textAlign: "center",
        }}
      >
        <Package
          size={64}
          color={surfacesLight.text.secondary}
          style={{ marginBottom: 16, opacity: 0.5 }}
        />
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Producto no encontrado
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.secondary, mb: 3 }}
        >
          El producto que buscas no existe o ha sido eliminado.
        </Typography>
        <Button
          variant="contained"
          startIcon={<ChevronLeft size={18} />}
          onClick={() => navigate("/treasure")}
          sx={{
            background: buttonGradients.primary,
            color: lightTokens.text.inverse,
          }}
        >
          Volver a Tesoros
        </Button>
      </Box>
    );
  }

  const isAvailable = product.estado === "DISPONIBLE";
  // Descriptive sections (title, metadata, specs) follow the piece in view;
  // `detail` is only undefined when `product` is, which the guard above rules
  // out, so `info` is always a concrete item here.
  const info = detail ?? product;
  const separatorColor = isLight
    ? "rgba(60, 60, 67, 0.12)"
    : "rgba(235, 235, 245, 0.12)";
  const secondaryTextColor = isLight
    ? "rgba(60, 60, 67, 0.6)"
    : "rgba(235, 235, 245, 0.6)";

  return (
    <Box
      sx={{
        maxWidth: 1400,
        mx: "auto",
        px: { xs: 0, sm: 3, md: 4 },
        pb: { xs: "calc(12px + env(safe-area-inset-bottom))", sm: 3 },
      }}
    >
      <Grid container spacing={{ xs: 1.5, md: 3 }}>
        {/* Left Column - Image & Gallery */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid",
              borderColor: isLight
                ? surfacesLight.border.light
                : surfacesDark.border.light,
              bgcolor: isLight
                ? surfacesLight.background.primary
                : surfacesDark.background.primary,
              position: "relative",
            }}
          >
            {/* Breadcrumb overlay on image */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: zIndex.base + 10,
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)",
                px: { xs: 1.5, sm: 2 },
                pt: { xs: 0.75, sm: 1 },
                pb: 4,
                borderRadius: "12px 12px 0 0",
              }}
            >
              <Breadcrumbs
                items={[
                  { label: "Tesoros", path: "/treasure" },
                  { label: displayName || `Producto ${itemId}` },
                ]}
                overlayMode
              />
            </Box>
            <MediaGallery
              media={mediaItems}
              productName={displayName}
              onIndexChange={product.isLote ? setGalleryIndex : undefined}
            />
          </Paper>
        </Grid>

        {/* Right Column - Product Details */}
        <Grid item xs={12} md={6}>
          <Box sx={{ px: { xs: 2, sm: 0 } }}>
            {/* Header - iOS Large Title Style */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "28px",
                    fontWeight: 700,
                    color: theme.palette.text.primary,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.15,
                    mb: 0.5,
                    flex: 1,
                  }}
                >
                  {detailName || displayName}
                </Typography>
                {/* Favorite button */}
                {!isProvider && product && (
                  <IconButton
                    onClick={() => {
                      toggleFavorite(product.item);
                      triggerHaptic("light");
                    }}
                    aria-label={
                      isFavorite(product.item)
                        ? "Quitar de favoritos"
                        : "Agregar a favoritos"
                    }
                    sx={{
                      mt: 0.25,
                      flexShrink: 0,
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: isFavorite(product.item)
                          ? `${emeraldCore.primary}15`
                          : isLight
                            ? "rgba(0,0,0,0.04)"
                            : "rgba(255,255,255,0.08)",
                      },
                    }}
                  >
                    <Heart
                      size={22}
                      fill={
                        isFavorite(product.item) ? emeraldCore.primary : "none"
                      }
                      color={
                        isFavorite(product.item)
                          ? emeraldCore.primary
                          : theme.palette.text.secondary
                      }
                      strokeWidth={isFavorite(product.item) ? 0 : 1.5}
                    />
                  </IconButton>
                )}
              </Box>

              {/* Inline metadata */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  flexWrap: "wrap",
                  mb: 1.5,
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontSize: "13px",
                    color: secondaryTextColor,
                    fontWeight: 500,
                  }}
                >
                  #{info.item}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    color: secondaryTextColor,
                    fontSize: "13px",
                    opacity: 0.5,
                  }}
                >
                  ·
                </Typography>
                {info.isJewelry && (
                  <Crown size={14} color={goldAccent.primary} />
                )}
                <Typography
                  component="span"
                  sx={{
                    fontSize: "13px",
                    color: secondaryTextColor,
                    fontWeight: 400,
                  }}
                >
                  {info.categoria || (info.isJewelry ? "Joyeria" : "Gema")}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    color: secondaryTextColor,
                    fontSize: "13px",
                    opacity: 0.5,
                  }}
                >
                  ·
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "13px",
                    color: isAvailable
                      ? "rgb(52, 199, 89)"
                      : secondaryTextColor,
                    fontWeight: 500,
                  }}
                >
                  {isAvailable ? "Disponible" : "Vendido"}
                </Typography>
                {info.cantidad > 1 && (
                  <>
                    <Typography
                      component="span"
                      sx={{
                        color: secondaryTextColor,
                        fontSize: "13px",
                        opacity: 0.5,
                      }}
                    >
                      ·
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "13px",
                        color: accentColors.purple.light,
                        fontWeight: 500,
                      }}
                    >
                      Lote x{info.cantidad}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Price display — a lote shows a stable total plus an itemized
                  breakdown (price by item + total), with the row matching the
                  gallery image highlighted. Single items show the plain price. */}
              {shouldShowPrices &&
                (product.isLote && product.loteItems ? (
                  <LotePriceBreakdown
                    items={product.loteItems}
                    total={product.precioCOP}
                    activeItem={loteMedia?.itemKeys[galleryIndex] ?? null}
                  />
                ) : (
                  <>
                    <PriceDisplay
                      price={product.precioCOP}
                      precioInternacional={product.precioInternacional}
                    />
                    {/* Price-per-carat — secondary line under the headline
                        price. Self-hides for jewelry / multi-piece / no-weight
                        rows (R6); computed from base COP then converted once
                        (R2). */}
                    <PricePerCarat
                      precioCOP={product.precioCOP}
                      peso={product.peso}
                      cantidad={product.cantidad}
                    />
                  </>
                ))}
            </Box>

            {/* Separator */}
            <Box sx={{ height: "0.5px", bgcolor: separatorColor, my: 2 }} />

            {/* Specifications — follow the piece whose photo is in view */}
            <SpecificationsList product={info} />

            {/* Características — PUBLIC Fotosíntesis disclosures (origin, mine,
                treatment, jewelry detail, evocative description). Reads `info`
                so it follows the in-view piece for lote bundles. Absent-safe:
                self-hides for legacy/sparse items. */}
            <CharacteristicsSection product={info} />

            {/* Certificate — self-hides when there's no certificateUrl and no
                structured certifications (absent-safe). Shown to all roles: the
                certificate is a marketing asset, the URL is already public via
                the published catalog projection. */}
            <CertificateSection product={product} />

            {/* Provenance / lot info + sync status — ADMIN-ONLY (R5). Reads the
                admin-overlaid product (procedencia/loteId/preponderancia/sync
                from the admin-only products.get doc). Self-hides for non-admins,
                lote bundle cards, and items with no provenance/sync to show.
                NOTE: per-piece provenance for lote/sublote members is NOT
                surfaced in this iteration — bundles show no provenance. */}
            <ProvenanceSection
              product={adminProduct ?? product}
              isAdmin={isAdmin}
            />

            {/* Separator */}
            <Box sx={{ height: "0.5px", bgcolor: separatorColor, my: 2 }} />

            {/* Additional Info */}
            <AdditionalInfo product={product} isAdmin={isAdmin} />

            {/* CTA Buttons (hidden for providers) — Esmereogénesis CTA is
                rendered via the middleSlot so it sits between the primary
                "Agregar a Selección" and the secondary Compartir/Consultar
                row, per spec §8.3. */}
            {!isProvider && (
              <ProductActions
                isAvailable={isAvailable}
                isInCart={product ? isInCart(product.item) : false}
                cartCount={cartCount}
                isNativeShareSupported={isNativeShareSupported}
                onAddToCart={handleAddToCart}
                onShare={handleShareProduct}
                onContact={handleContact}
                middleSlot={
                  product ? (
                    <EsmereogenesisCTA
                      product={product}
                      disabled={!isAvailable}
                    />
                  ) : null
                }
              />
            )}

            {/* Member Benefits Teaser - Only for Guest Users */}
            {isGuest && (
              <Box sx={{ mt: 3 }}>
                <MemberBenefitsTeaser
                  variant="compact"
                  onUnlockClick={() => navigate("/")}
                />
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Admin Selection Dialog (for staff) */}
      <AdminSelectDialog
        open={adminDialogOpen}
        onClose={() => setAdminDialogOpen(false)}
        onSelect={handleAdminSelected}
        admins={admins}
      />

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{
          "& .MuiSnackbarContent-root": {
            bgcolor: emeraldCore.dark,
            color: "#FFFFFF",
          },
        }}
      />
    </Box>
  );
}
