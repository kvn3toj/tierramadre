/**
 * PedidoConfirmadoPage — public, unauthenticated post-payment landing.
 *
 * Route: /pedido-confirmado/:saleId (see InvitationRouter in App.tsx, above
 * the auth gate). Both payment rails redirect here after checkout —
 * `api/_lib/checkoutLink.ts` builds the URL from `saleId` — so whoever lands
 * here has just paid (or tried to) and may have no session at all.
 *
 * THE ONE THING THIS PAGE MUST NOT DO: treat `estado === 'reservada'` as an
 * error. Payment is confirmed by a webhook (mp-webhook → `ghl.markOrderPaid`)
 * ASYNCHRONOUSLY — the customer routinely arrives here before it lands, so
 * the sale still reads "reservada" for a few seconds. `useConvexQuery` is a
 * live subscription (websocket), not a one-shot fetch: once the webhook
 * patches the row to "confirmada" this view updates on its own, no manual
 * polling required. Telling a paying customer their money vanished is the
 * exact failure this page exists to avoid.
 *
 * THE OTHER FAILURE, added after the fact: the webhook may never land at all
 * (rotated events secret, unregistered prod webhook, Wompi outage). The live
 * subscription has no timeout of its own, so without `CONFIRMANDO_AVISO_MS`
 * below the customer sits on "estamos confirmando" forever with no way out.
 * The wait never becomes an error — it grows an exit (a WhatsApp line that
 * carries the order number), and the headline never changes tone.
 *
 * Idioma: la redirección de Wompi no trae el idioma, así que se resuelve con
 * `resolverLangPedido` (query → handoff de sessionStorage → contexto → 'es');
 * ver `src/utils/langPedido.ts`. `LanguageProvider`/`ThemeProvider` viven por
 * encima de `InvitationRouter` en `src/main.tsx`, así que ambos hooks son
 * legítimos en esta ruta pública.
 */

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { CheckCircle2, Clock, XCircle, Gem } from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import { useConvexQuery, convexApi, convexReady } from '../lib/convex-safe';
import { formatCurrency } from '../utils/formatting';
import {
  Button,
  Card,
  getQuietEmerald,
  type ButtonProps,
} from '../design-system';
import { useThemeMode } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { translations, type Translations } from '../locales';
import {
  resolverLangPedido,
  leerLangPedidoGuardado,
} from '../utils/langPedido';
import { houseWhatsAppLink as whatsappHref } from '../constants/contact';

/** El bloque `checkout` del idioma resuelto — baja por props, no se re-deriva. */
type TextosCheckout = Translations['checkout'];

/**
 * Cuánto esperamos antes de ofrecer una salida humana. Dos minutos: el webhook
 * normal aterriza en segundos, así que a los dos minutos ya no es lentitud.
 * Exportado porque el test lo adelanta con timers falsos — un número copiado
 * en el test se desincroniza del de la página.
 */
export const CONFIRMANDO_AVISO_MS = 2 * 60 * 1000;

/**
 * Pinta una plantilla con `{saleId}` dejando el número en <strong>.
 * Se parte la cadena en vez de inyectar HTML: el texto viene de i18n y nunca
 * pasa por `dangerouslySetInnerHTML`.
 */
function conSaleId(plantilla: string, saleId: string) {
  const partes = plantilla.split('{saleId}');
  if (partes.length === 1) return plantilla;
  return (
    <>
      {partes[0]}
      <strong>{saleId}</strong>
      {partes.slice(1).join('{saleId}')}
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const qe = getQuietEmerald(mode);
  return (
    <Box
      sx={{
        // dvh, not vh — see VitrinaPage for why (mobile toolbar height).
        minHeight: '100dvh',
        bgcolor: 'var(--tm-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          // El logo es blanco: la banda se pinta con el tinta del tema (el
          // único sitio de la página donde el token va como valor JS, porque
          // en claro y en oscuro tiene que seguir siendo oscuro).
          backgroundColor: qe.text,
          borderBottom: '1px solid var(--tm-hairline)',
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
      </Box>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          py: 5,
          textAlign: 'center',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function StateIcon({
  icon: Icon,
  color,
}: {
  icon: typeof CheckCircle2;
  color: string;
}) {
  return <Icon size={48} style={{ color, marginBottom: 16 }} />;
}

function Titular({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="h6"
      sx={{
        fontFamily: 'var(--tm-font-serif)',
        fontWeight: 500,
        color: 'var(--tm-text)',
        mb: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

function Cuerpo({
  children,
  mb = 0,
}: {
  children: React.ReactNode;
  mb?: number;
}) {
  return (
    <Typography variant="body2" sx={{ color: 'var(--tm-muted)', maxWidth: 340, mb }}>
      {children}
    </Typography>
  );
}

/** Rótulo de dato: mono, versalitas, DS3 §2. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="span"
      sx={{
        display: 'block',
        fontFamily: 'var(--tm-font-mono)',
        fontSize: '0.6875rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--tm-subtle)',
      }}
    >
      {children}
    </Typography>
  );
}

/** Valor de dato: mono con `tnum`, para que las cifras se alineen. */
function Valor({ children, mb = 0 }: { children: React.ReactNode; mb?: number }) {
  return (
    <Typography
      sx={{
        fontFamily: 'var(--tm-font-mono)',
        fontFeatureSettings: '"tnum"',
        fontSize: '1.0625rem',
        fontWeight: 600,
        color: 'var(--tm-text)',
        mb,
      }}
    >
      {children}
    </Typography>
  );
}

/**
 * El `Button` de DS3 SÍ acepta `component="a"` (lo hereda de MUI) y renderiza
 * un `<a>` de verdad, pero su tipo de props no es genérico, así que TypeScript
 * no admite `target`/`rel` junto con él. Se estrecha aquí, en un solo sitio,
 * en vez de anidar un `<button>` dentro de un `<a>` — que sería HTML inválido
 * y dos roles interactivos donde el lector de pantalla espera uno.
 */
const BotonEnlace = Button as React.ComponentType<
  ButtonProps & { component: 'a' } & React.AnchorHTMLAttributes<HTMLAnchorElement>
>;

/** El único CTA de la página: un enlace con la piel del botón DS3. */
function BotonWhatsApp({
  mensaje,
  etiqueta,
}: {
  mensaje: string;
  etiqueta: string;
}) {
  return (
    <BotonEnlace
      variant="primary"
      component="a"
      href={whatsappHref(mensaje)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {etiqueta}
    </BotonEnlace>
  );
}

/** Token still resolving, or Convex unconfigured — never render this as an error. */
function LoadingState({ tc }: { tc: TextosCheckout }) {
  return (
    <Shell>
      <StateIcon icon={Gem} color="var(--tm-subtle)" />
      <Titular>{tc.pedidoConfirmingTitle}</Titular>
      <Cuerpo>{tc.pedidoLoadingBody}</Cuerpo>
    </Shell>
  );
}

function ConfirmandoState({
  saleId,
  tc,
}: {
  saleId: string;
  tc: TextosCheckout;
}) {
  const [tardando, setTardando] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setTardando(true), CONFIRMANDO_AVISO_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <Shell>
      <StateIcon icon={Clock} color="var(--tm-warning)" />
      <Titular>{tc.pedidoConfirmingTitle}</Titular>
      <Cuerpo>{conSaleId(tc.pedidoConfirmingBody, saleId)}</Cuerpo>
      {tardando && (
        <>
          <Cuerpo mb={2}>
            {tc.pedidoSlowLine.replace('{saleId}', saleId)}
          </Cuerpo>
          <BotonWhatsApp
            mensaje={tc.pedidoWhatsAppSlow.replace('{saleId}', saleId)}
            etiqueta={tc.pedidoWhatsApp}
          />
        </>
      )}
    </Shell>
  );
}

function ConfirmadaState({
  saleId,
  totalCOP,
  tc,
}: {
  saleId: string;
  totalCOP: number;
  tc: TextosCheckout;
}) {
  return (
    <Shell>
      <StateIcon icon={CheckCircle2} color="var(--tm-accent)" />
      <Titular>{tc.pedidoConfirmedTitle}</Titular>
      <Cuerpo mb={2}>{tc.pedidoConfirmedBody}</Cuerpo>
      <Card variant="outlined" sx={{ px: 3, py: 2, minWidth: 220 }}>
        <Rotulo>{tc.pedidoLabel}</Rotulo>
        <Valor mb={1}>{saleId}</Valor>
        <Rotulo>{tc.pedidoTotalLabel}</Rotulo>
        {/* Siempre COP: `sales.estadoPublico` devuelve {saleId, estado,
            totalCOP} y NINGÚN dato de la moneda que vio el cliente. */}
        <Valor>{formatCurrency(totalCOP, 'COP')}</Valor>
      </Card>
    </Shell>
  );
}

function CanceladaState({
  saleId,
  tc,
}: {
  saleId: string;
  tc: TextosCheckout;
}) {
  return (
    <Shell>
      <StateIcon icon={XCircle} color="var(--tm-danger)" />
      <Titular>{tc.pedidoCancelledTitle}</Titular>
      <Cuerpo mb={2}>{conSaleId(tc.pedidoCancelledBody, saleId)}</Cuerpo>
      <BotonWhatsApp
        mensaje={tc.pedidoWhatsAppCancelled.replace('{saleId}', saleId)}
        etiqueta={tc.pedidoWhatsApp}
      />
    </Shell>
  );
}

/** Unknown saleId — neutral, never a stack trace. */
function NotFoundState({ tc }: { tc: TextosCheckout }) {
  return (
    <Shell>
      <StateIcon icon={Gem} color="var(--tm-subtle)" />
      <Titular>{tc.pedidoNotFoundTitle}</Titular>
      <Cuerpo mb={2}>{tc.pedidoNotFoundBody}</Cuerpo>
      <BotonWhatsApp
        mensaje={tc.pedidoWhatsAppNotFound}
        etiqueta={tc.pedidoWhatsApp}
      />
    </Shell>
  );
}

/** Route: /pedido-confirmado/:saleId */
export default function PedidoConfirmadoPage() {
  const { saleId = '' } = useParams<{ saleId: string }>();
  const location = useLocation();
  const { language } = useLanguage();
  const lang = resolverLangPedido(
    location.search,
    leerLangPedidoGuardado(),
    language,
  );
  const tc = translations[lang].checkout;

  // Live Convex subscription — updates automatically when the webhook flips
  // `estado`. `undefined` covers both "still loading" and "Convex not
  // configured for this deployment"; either way this is never an error.
  const sale = useConvexQuery(
    convexApi.sales.estadoPublico,
    convexReady && saleId ? { saleId } : 'skip',
  ) as { saleId: string; estado: string; totalCOP: number } | null | undefined;

  if (sale === undefined) return <LoadingState tc={tc} />;
  if (sale === null) return <NotFoundState tc={tc} />;

  if (sale.estado === 'confirmada') {
    return (
      <ConfirmadaState
        saleId={sale.saleId}
        totalCOP={sale.totalCOP}
        tc={tc}
      />
    );
  }
  if (sale.estado === 'cancelada') {
    return <CanceladaState saleId={sale.saleId} tc={tc} />;
  }
  // 'reservada' (or any future/unknown value) — never an error.
  return <ConfirmandoState saleId={sale.saleId} tc={tc} />;
}
