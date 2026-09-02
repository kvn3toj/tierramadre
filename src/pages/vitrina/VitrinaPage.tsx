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

import { useEffect, useMemo } from 'react';
import { useResaleOffers } from '../../hooks/useResaleOffers';
import {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import {
  Box,
  Skeleton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Gem } from 'lucide-react';
import { useTreasure } from '../../hooks/useTreasure';
import { useAsesores } from '../../hooks/useAsesores';
import { useTRM } from '../../hooks/useTRM';
import { useConvexQuery, convexApi, convexReady } from '../../lib/convex-safe';
import { TreasureItem } from '../../types';
import GridCard from '../../components/treasure/GridCard';
import { useCart } from '../../hooks/useCart';
import CarritoFlotante from '../../components/checkout/CarritoFlotante';
import {
  guardarOrigenVitrina,
  limpiarOrigen,
} from '../../utils/origenCheckout';
import { enlaceCotizacionVencida } from '../../components/vitrina/mensajeCotizacionVencida';
import { PublicProductView } from './PublicProductView';
import {
  VitrinaPricing,
  DEFAULT_VITRINA_PRICING,
  formatVitrinaPrice,
} from '../../utils/vitrinaPrice';
import {
  brand,
  lightTokens,
  darkTokens,
  legacyGradients as gradients,
  legacyTypography as typography,
} from '../../design-system';
import { HOUSE_WHATSAPP } from '../../constants/contact';
import { translations } from '../../locales';
import type { Language, Translations } from '../../locales';

/**
 * La tabla de textos de esta superficie: el marco que ve el CLIENTE.
 *
 * **No sale de `LanguageContext` a propósito.** El idioma de esta página es el
 * que el asesor eligió al acuñar el enlace (`vitrinas.lang`), no el de quien
 * mira: un asesor que abre su propio enlace en inglés para revisarlo no debe
 * ver cambiar el idioma de su app. Por eso se arma acá y baja por props, y por
 * eso este archivo no llama a `setLanguage` en ninguna parte.
 */
type TextosVitrina = Translations['vitrina'];

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
  const wa = params.get('wa');
  const slug = explicitSlug || params.get('a') || undefined;
  return useMemo(() => {
    if (wa) {
      const digits = wa.replace(/\D/g, '');
      if (digits.length >= 10) return digits;
    }
    if (slug) {
      const found = asesores.find((x) => x.slug === slug);
      const digits = found?.whatsapp?.replace(/\D/g, '');
      if (digits && digits.length >= 10) return digits;
    }
    return HOUSE_WHATSAPP;
  }, [wa, slug, asesores]);
}

function VitrinaShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  return (
    <Box
      sx={{
        // dvh, not vh: on mobile Safari/Chrome the toolbar makes 100vh taller
        // than the visible area, which is what produced the scroll "jump".
        minHeight: '100dvh',
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
          maxWidth: 1120,
          mx: 'auto',
          px: { xs: 1.5, sm: 2.5, md: 3 },
          py: 3,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(auto-fit, minmax(190px, 232px))',
            },
            justifyContent: 'center',
            columnGap: { xs: '12px', sm: '22px' },
            rowGap: { xs: '20px', sm: '34px' },
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <Box key={i}>
              <Skeleton
                variant="rounded"
                sx={{
                  width: '100%',
                  aspectRatio: '1/1.06',
                  borderRadius: '6px',
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

/**
 * Cotización vencida — el link sigue vivo, el precio no.
 *
 * Una vitrina ES una cotización, y una cotización vence. Pero un link vencido
 * que devuelve 404 pierde al cliente justo cuando volvió por su cuenta, que es
 * el momento más barato de recuperarlo. Así que muestra QUÉ estaba mirando y
 * ofrece pedirla de nuevo.
 *
 * **Sin precios.** El registro vencido ya no los entrega (`getByToken` los
 * omite y el grant del catálogo cae a `anon`), y aunque los entregara no
 * habría que mostrarlos: obligaría a honrar un precio que ya no queremos, o a
 * explicarlo antes de saludar.
 */
function VencidaState({
  productos,
  telefono,
  tv,
}: {
  productos: TreasureItem[];
  telefono: string;
  tv: TextosVitrina;
}) {
  const href = enlaceCotizacionVencida(
    telefono,
    productos.map((p) => ({ item: p.item, nombre: p.nombre })),
  );
  return (
    <VitrinaShell>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          py: 6,
          textAlign: 'center',
        }}
      >
        <Gem
          size={44}
          style={{ color: brand.emerald[300], marginBottom: 14 }}
        />
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {tv.expiredTitle}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', maxWidth: 420, mb: 3 }}
        >
          {tv.expiredBody}
        </Typography>

        {productos.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
              justifyContent: 'center',
              maxWidth: 560,
              mb: 3.5,
            }}
          >
            {productos.map((p) => (
              <Box key={p.item} sx={{ width: 92, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 92,
                    height: 92,
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p.imagen ? (
                    <Box
                      component="img"
                      src={p.imagen}
                      alt={p.nombre}
                      loading="lazy"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Gem size={22} style={{ color: brand.emerald[300] }} />
                  )}
                </Box>
                <Typography
                  sx={{
                    mt: 0.75,
                    fontSize: 11.5,
                    color: 'text.secondary',
                    lineHeight: 1.25,
                  }}
                >
                  {p.nombre}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        <Box
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2.5,
            height: 46,
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 15,
            color: '#0b0f0d',
            bgcolor: brand.emerald[300],
            '&:hover': { filter: 'brightness(1.06)' },
          }}
        >
          {tv.expiredCta}
        </Box>
      </Box>
    </VitrinaShell>
  );
}

function NotFoundState({ tv }: { tv: TextosVitrina }) {
  return (
    <VitrinaShell>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          textAlign: 'center',
        }}
      >
        <Gem
          size={48}
          style={{ color: brand.emerald[300], marginBottom: 16 }}
        />
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {tv.unavailableTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {tv.unavailableBody}
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isIdList = ID_LIST_RE.test(code);
  const { treasure, isLoadingSheets } = useTreasure({
    vitrinaToken: isIdList ? undefined : code,
  });
  const { trmRate } = useTRM();
  const [searchParams] = useSearchParams();
  // Present only on links minted by WF-04 (convex/ghl.ts `searchProducts`
  // embeds `?cid=`) — lets the product page tell GHL directly which contact
  // picked which SKU (see PublicProductView + /api/vitrina-select). Absent on
  // staff's manual "Compartir con cliente" links — those just skip that call.
  const contactId = searchParams.get('cid') || undefined;

  // Stateful token → Convex; stateless id-list → skip the query.
  const tokenDoc = useConvexQuery(
    convexApi.vitrinas.getByToken,
    !isIdList && convexReady ? { token: code } : 'skip',
  ) as
    | {
        itemIds: number[];
        senderSlug?: string;
        /** `true` cuando pasó su TTL — ver `convex/_lib/vencimientoVitrina.ts`. */
        vencida?: boolean;
        /**
         * Precio: **ausentes cuando la vitrina venció.** `getByToken` los
         * omite a propósito, así que son opcionales acá y el código que los
         * usa tiene que tolerar su ausencia — es lo que impide mostrar por
         * accidente un precio que ya no honramos.
         */
        currency?: 'COP' | 'USD';
        multiplier?: number;
        /**
         * El idioma que eligió el asesor. **Presente también cuando la vitrina
         * venció** — a diferencia del precio, que `getByToken` sí omite. La
         * pantalla de «cotización vencida» se traduce igual que el resto.
         *
         * Ausente en las vitrinas acuñadas antes de esta rebanada, que se leen
         * como español sin haber migrado una sola fila.
         */
        lang?: Language;
      }
    | null
    | undefined;

  // El idioma del ENLACE, no el de quien mira.
  //
  // Una lista de ids (`/v/324-323-370`, y las rutas heredadas `/product/:id` y
  // `/p/:id`, que resuelven como lista de un id) no tiene registro y por tanto
  // no tiene idioma elegido: español, que es lo que esos enlaces siempre
  // fueron. Un registro sin `lang` — toda vitrina acuñada antes de esta
  // rebanada — también, y por eso no hizo falta migrar ninguna fila.
  const lang: Language = (!isIdList && tokenDoc?.lang) || 'es';
  const tv = translations[lang].vitrina;

  // El `lang` del documento: lo que un lector de pantalla usa para elegir la
  // voz, y el navegador para ofrecer traducción. Se restaura al desmontar
  // porque esta página comparte documento con la app del asesor, que puede
  // estar en otro idioma — abrir el enlace de un cliente no debe dejarle el
  // documento marcado.
  useEffect(() => {
    const el = document.documentElement;
    const previo = el.lang;
    el.lang = lang;
    return () => {
      el.lang = previo;
    };
  }, [lang]);

  // Derive itemIds + pricing + sender from whichever source applies.
  const itemIds = useMemo<number[]>(() => {
    if (isIdList) return parseIds(code);
    return tokenDoc ? tokenDoc.itemIds.map(Number) : [];
  }, [isIdList, code, tokenDoc]);

  // Una vitrina VENCIDA no trae `multiplier` ni `currency` — `getByToken` los
  // omite. Cae al default (x1, COP), que es exactamente lo que significa «no
  // hay markup elegido». No es una precaución de tipos: es la razón por la que
  // la pantalla de vencida no puede mostrar el precio viejo ni por accidente.
  const pricing: VitrinaPricing =
    !isIdList && tokenDoc && tokenDoc.multiplier !== undefined
      ? {
          multiplier: tokenDoc.multiplier,
          currency: tokenDoc.currency ?? 'COP',
        }
      : DEFAULT_VITRINA_PRICING;

  // El dueño ÚNICO del carrito en esta superficie. `useCart` no es un
  // contexto: dos instancias no se enteran de los cambios de la otra, así que
  // la grilla, la vista de pieza y el indicador flotante comparten ésta.
  const { addToCart, isInCart, cartCount } = useCart();

  // El origen de la compra, para que el carrito cobre el precio que esta
  // persona vio. Se guarda SÓLO cuando el `:code` resolvió a un registro real
  // de `vitrinas` — la misma condición que produce el prop `vitrinaToken` de
  // `PublicProductView`. Una lista de ids (`/v/324-323-370`) no tiene registro
  // ni markup elegido, y su carrito debe cobrar el precio base.
  //
  // El multiplicador viaja sólo para MOSTRAR el mismo número que el servidor
  // va a cobrar; el servidor lo re-resuelve desde el registro y jamás confía
  // en éste (ver `resolverMultiplicador`).
  useEffect(() => {
    if (isIdList || !tokenDoc) return;
    // Una vitrina VENCIDA no deja origen. Si lo dejara, el carrito lo mandaría
    // y el servidor rechazaría la orden con `ORIGEN_INVALIDO` — que es la
    // respuesta correcta del servidor, pero deja al cliente sin poder comprar
    // nada en toda la sesión por haber abierto un link viejo. Se limpia, y
    // compra al precio público como cualquiera.
    if (tokenDoc.vencida) {
      limpiarOrigen();
      return;
    }
    guardarOrigenVitrina(code, tokenDoc.multiplier);
  }, [isIdList, tokenDoc, code]);

  const senderPhoneRaw = useSenderPhone(
    !isIdList && tokenDoc ? tokenDoc.senderSlug : undefined,
  );

  // Reventa: la conversación es SIEMPRE con la casa.
  //
  // Esta página es la puerta pública — el enlace que un cliente abre desde
  // WhatsApp sin iniciar sesión. Si la pieza la está revendiendo su dueño,
  // nosotros corredamos, así que el botón tiene que marcarnos a nosotros
  // aunque el enlace traiga `?a=<embajador>` o `?wa=<número>`: esos parámetros
  // los pone quien comparte, y aquí no pueden ganarle a la regla del negocio.
  const { resaleIndex } = useResaleOffers();

  const products = useMemo(
    () =>
      itemIds
        .map((id) => treasure.find((p) => p.item === id))
        .filter(Boolean) as TreasureItem[],
    [itemIds, treasure],
  );

  // The app shell pins `body { overflow: hidden }` globally ("only <main>
  // scrolls"). This public page renders OUTSIDE that shell and has no <main>,
  // so without re-enabling document scroll its content is clipped at the fold
  // and can't scroll in a normal browser tab — which is exactly how clients
  // open the shared WhatsApp link. Restore native scrolling while mounted.
  useEffect(() => {
    const { style } = document.body;
    const prevOverflowY = style.overflowY;
    const prevOverflowX = style.overflowX;
    style.overflowY = 'auto';
    style.overflowX = 'hidden';
    return () => {
      style.overflowY = prevOverflowY;
      style.overflowX = prevOverflowX;
    };
  }, []);

  // Reset scroll on every grid <-> detail transition. Router keeps the scroll
  // offset across in-place navigations, so without this a detail opened from a
  // scrolled grid lands mid-page (and "back" wouldn't return to the top).
  useEffect(() => {
    // instant, not smooth: html sets scroll-behavior:smooth, and we want the
    // new view to appear at the top, not animate up through it.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [itemId]);

  // Token still resolving, or catalog still loading.
  if (!isIdList && tokenDoc === undefined) return <LoadingState />;
  if (!isIdList && tokenDoc === null) return <NotFoundState tv={tv} />;
  if (isLoadingSheets && products.length === 0) return <LoadingState />;
  // Vencida: se espera al catálogo para poder MOSTRAR las piezas. Sin ellas la
  // pantalla no cumple su función —que el cliente reconozca qué estaba
  // mirando— y sería un 404 con mejor copy.
  if (!isIdList && tokenDoc?.vencida) {
    return (
      <VencidaState
        productos={products}
        telefono={senderPhoneRaw || HOUSE_WHATSAPP}
        tv={tv}
      />
    );
  }
  if (products.length === 0) return <NotFoundState tv={tv} />;

  const selected = itemId
    ? products.find((p) => p.item.toString() === itemId) || null
    : products.length === 1
      ? products[0]
      : null;

  const selectedResale = selected ? resaleIndex.get(selected.item) : undefined;
  const senderPhone = selectedResale ? HOUSE_WHATSAPP : senderPhoneRaw;

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
          resale={selectedResale}
          contactId={contactId}
          onBack={onBack}
          vitrinaToken={isIdList ? undefined : code}
          onAddToCart={addToCart}
          isInCart={isInCart(selected.item)}
          tv={tv}
        />
        <CarritoFlotante count={cartCount} />
      </VitrinaShell>
    );
  }

  return (
    <VitrinaShell>
      <Box
        sx={{
          background: gradients.header,
          px: { xs: 2, sm: 3 },
          pt: 'max(env(safe-area-inset-top, 16px), 16px)',
          pb: { xs: 2.5, sm: 3 },
          textAlign: 'center',
        }}
      >
        <Box
          component="img"
          src="/images/logo-horizontal-white.png"
          alt="Tierra Mädre"
          sx={{ height: { xs: 44, sm: 56 }, objectFit: 'contain' }}
        />
        <Typography
          sx={{
            mt: 1,
            fontSize: { xs: typography.size.xs, sm: typography.size.sm },
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: typography.letterSpacing.wider,
            textTransform: 'uppercase',
          }}
        >
          {products.length === 1
            ? tv.captionOne
            : tv.caption.replace('{n}', String(products.length))}
        </Typography>
      </Box>
      <Box
        sx={{
          maxWidth: 1120,
          mx: 'auto',
          px: { xs: 1.5, sm: 2.5, md: 3 },
          py: { xs: 2, sm: 3.5 },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            // Phones fill the row with 2 columns. From sm up, fixed-width tracks
            // (auto-fit collapses the empty ones) so a small curated selection
            // stays centered and intentional instead of clustering left — and
            // iPad portrait naturally lands on 3 columns, not a sparse 2.
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(auto-fit, minmax(190px, 232px))',
            },
            justifyContent: 'center',
            columnGap: { xs: '12px', sm: '22px' },
            rowGap: { xs: '20px', sm: '34px' },
          }}
        >
          {products.map((item) => (
            <Box
              key={item.item}
              sx={{ aspectRatio: { xs: '1 / 1.44', sm: '1 / 1.4' } }}
            >
              <GridCard
                item={item}
                variantOverride="faithful"
                priceOverride={
                  formatVitrinaPrice(item.precioCOP, pricing, trmRate) || null
                }
                isMobile={isMobile}
                onAddToCart={addToCart}
                isInCart={isInCart(item.item)}
                onItemClick={() =>
                  navigate(`/v/${code}/${item.item}${location.search}`)
                }
              />
            </Box>
          ))}
        </Box>
      </Box>
      <CarritoFlotante count={cartCount} />
    </VitrinaShell>
  );
}

/** Route: /v/:code/:itemId? */
export default function VitrinaPage() {
  const { code = '', itemId } = useParams<{ code: string; itemId?: string }>();
  return <VitrinaContent code={code} itemId={itemId} />;
}

/** Route: /product/:itemId — logged-out only, single product, default pricing. */
export function PublicProductPage() {
  const { itemId = '' } = useParams<{ itemId: string }>();
  return <VitrinaContent code={itemId} itemId={itemId} />;
}
