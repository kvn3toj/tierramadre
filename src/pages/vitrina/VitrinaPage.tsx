/**
 * VitrinaPage — public, sandboxed product showcase for clients.
 *
 * Routes (in InvitationRouter, above the auth gate & outside IOSLayout):
 *   - /v/:code/:itemId?   → VitrinaPage (default export)
 *   - /product/:itemId    → PublicProductPage (named export), logged-out only
 *
 * `:code` is either:
 *   - a stateful TOKEN (e.g. /v/AB3K9P) → Convex `vitrinas` record supplies the
 *     product ids + the staff-chosen pricing {multiplier, currency, senderSlug};
 *   - a stateless ID-LIST (e.g. /v/324-323-370, or /v/324) → default pricing
 *     (x1, COP = standard retail). Used by the GHL bot + hand-crafted links.
 *
 * One product deep-links to its page; several show a grid → tap → page. There
 * is NO navigation out of this sandbox. The WhatsApp CTA target comes from the
 * token's senderSlug, the ?a=<slug>/?wa=<phone> query, or the house number.
 */

import { useMemo } from "react";
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  Box,
  Skeleton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Gem } from "lucide-react";
import { useTreasure } from "../../hooks/useTreasure";
import { useAsesores } from "../../hooks/useAsesores";
import { useTRM } from "../../hooks/useTRM";
import { useConvexQuery, convexApi, convexReady } from "../../lib/convex-safe";
import { TreasureItem } from "../../types";
import GridCard from "../../components/treasure/GridCard";
import { PublicProductView } from "./PublicProductView";
import {
  VitrinaPricing,
  DEFAULT_VITRINA_PRICING,
  formatVitrinaPrice,
} from "../../utils/vitrinaPrice";
import {
  brand,
  lightTokens,
  darkTokens,
  legacyGradients as gradients,
  legacyTypography as typography,
} from "../../design-system";

const HOUSE_WHATSAPP = "573113052755";

/** A bare item-number or dash/comma-separated list — the stateless form. */
const ID_LIST_RE = /^\d+([-,]\d+)*$/;

function parseIds(raw: string): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const part of raw.split(/[-,]/)) {
    const n = parseInt(part.trim(), 10);
    if (Number.isFinite(n) && n > 0 && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

/** Resolve the WhatsApp number the CTA should open. */
function useSenderPhone(explicitSlug?: string): string {
  const [params] = useSearchParams();
  const { asesores } = useAsesores();
  const wa = params.get("wa");
  const slug = explicitSlug || params.get("a") || undefined;
  return useMemo(() => {
    if (wa) {
      const digits = wa.replace(/\D/g, "");
      if (digits.length >= 10) return digits;
    }
    if (slug) {
      const found = asesores.find((x) => x.slug === slug);
      const digits = found?.whatsapp?.replace(/\D/g, "");
      if (digits && digits.length >= 10) return digits;
    }
    return HOUSE_WHATSAPP;
  }, [wa, slug, asesores]);
}

function VitrinaShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: isLight
          ? lightTokens.background.page
          : darkTokens.background.app,
      }}
    >
      {children}
    </Box>
  );
}

function LoadingState() {
  return (
    <VitrinaShell>
      <Box
        sx={{
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 1.5, sm: 2, md: 3 },
          py: 3,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2,1fr)",
              md: "repeat(3,1fr)",
              lg: "repeat(4,1fr)",
            },
            columnGap: { xs: "12px", md: "24px" },
            rowGap: { xs: "18px", md: "30px" },
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <Box key={i}>
              <Skeleton
                variant="rounded"
                sx={{
                  width: "100%",
                  aspectRatio: "1/1.06",
                  borderRadius: "6px",
                }}
              />
              <Skeleton width="70%" height={18} sx={{ mt: 1 }} />
              <Skeleton width="40%" height={14} sx={{ mt: 0.5 }} />
            </Box>
          ))}
        </Box>
      </Box>
    </VitrinaShell>
  );
}

function NotFoundState() {
  return (
    <VitrinaShell>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          textAlign: "center",
        }}
      >
        <Gem
          size={48}
          style={{ color: brand.emerald[300], marginBottom: 16 }}
        />
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Enlace no disponible
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Este enlace ya no está activo. Escríbenos y con gusto te ayudamos.
        </Typography>
      </Box>
    </VitrinaShell>
  );
}

/** Resolves a token or id-list and renders the grid or a single product page. */
function VitrinaContent({ code, itemId }: { code: string; itemId?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { treasure, isLoadingSheets } = useTreasure();
  const { trmRate } = useTRM();

  const isIdList = ID_LIST_RE.test(code);

  // Stateful token → Convex; stateless id-list → skip the query.
  const tokenDoc = useConvexQuery(
    convexApi.vitrinas.getByToken,
    !isIdList && convexReady ? { token: code } : "skip",
  ) as
    | {
        itemIds: number[];
        currency: "COP" | "USD";
        multiplier: number;
        senderSlug?: string;
      }
    | null
    | undefined;

  // Derive itemIds + pricing + sender from whichever source applies.
  const itemIds = useMemo<number[]>(() => {
    if (isIdList) return parseIds(code);
    return tokenDoc ? tokenDoc.itemIds.map(Number) : [];
  }, [isIdList, code, tokenDoc]);

  const pricing: VitrinaPricing =
    !isIdList && tokenDoc
      ? { multiplier: tokenDoc.multiplier, currency: tokenDoc.currency }
      : DEFAULT_VITRINA_PRICING;

  const senderPhone = useSenderPhone(
    !isIdList && tokenDoc ? tokenDoc.senderSlug : undefined,
  );

  const products = useMemo(
    () =>
      itemIds
        .map((id) => treasure.find((p) => p.item === id))
        .filter(Boolean) as TreasureItem[],
    [itemIds, treasure],
  );

  // Token still resolving, or catalog still loading.
  if (!isIdList && tokenDoc === undefined) return <LoadingState />;
  if (!isIdList && tokenDoc === null) return <NotFoundState />;
  if (isLoadingSheets && products.length === 0) return <LoadingState />;
  if (products.length === 0) return <NotFoundState />;

  const selected = itemId
    ? products.find((p) => p.item.toString() === itemId) || null
    : products.length === 1
      ? products[0]
      : null;

  if (selected) {
    const onBack =
      products.length > 1
        ? () => navigate(`/v/${code}${location.search}`)
        : undefined;
    return (
      <VitrinaShell>
        <PublicProductView
          product={selected}
          pricing={pricing}
          senderPhone={senderPhone}
          onBack={onBack}
        />
      </VitrinaShell>
    );
  }

  return (
    <VitrinaShell>
      <Box
        sx={{
          background: gradients.header,
          px: { xs: 2, sm: 3 },
          pt: "max(env(safe-area-inset-top, 16px), 16px)",
          pb: { xs: 2.5, sm: 3 },
          textAlign: "center",
        }}
      >
        <Box
          component="img"
          src="/images/logo-horizontal-white.png"
          alt="Tierra Mädre"
          sx={{ height: { xs: 44, sm: 56 }, objectFit: "contain" }}
        />
        <Typography
          sx={{
            mt: 1,
            fontSize: { xs: typography.size.xs, sm: typography.size.sm },
            color: "rgba(255,255,255,0.7)",
            letterSpacing: typography.letterSpacing.wider,
            textTransform: "uppercase",
          }}
        >
          Selección para ti · {products.length} piezas
        </Typography>
      </Box>
      <Box
        sx={{
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2,1fr)",
              md: "repeat(3,1fr)",
              lg: "repeat(4,1fr)",
            },
            columnGap: { xs: "12px", md: "24px" },
            rowGap: { xs: "18px", md: "30px" },
          }}
        >
          {products.map((item) => (
            <Box
              key={item.item}
              sx={{ aspectRatio: { xs: "1 / 1.44", md: "1 / 1.34" } }}
            >
              <GridCard
                item={item}
                variantOverride="faithful"
                priceOverride={
                  formatVitrinaPrice(item.precioCOP, pricing, trmRate) || null
                }
                isMobile={isMobile}
                onItemClick={() =>
                  navigate(`/v/${code}/${item.item}${location.search}`)
                }
              />
            </Box>
          ))}
        </Box>
      </Box>
    </VitrinaShell>
  );
}

/** Route: /v/:code/:itemId? */
export default function VitrinaPage() {
  const { code = "", itemId } = useParams<{ code: string; itemId?: string }>();
  return <VitrinaContent code={code} itemId={itemId} />;
}

/** Route: /product/:itemId — logged-out only, single product, default pricing. */
export function PublicProductPage() {
  const { itemId = "" } = useParams<{ itemId: string }>();
  return <VitrinaContent code={itemId} itemId={itemId} />;
}
