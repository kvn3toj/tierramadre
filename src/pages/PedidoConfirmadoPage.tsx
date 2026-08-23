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
 */

import { useTheme } from '@mui/material';
import { Box, Typography } from '@mui/material';
import { CheckCircle2, Clock, XCircle, Gem } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useConvexQuery, convexApi, convexReady } from '../lib/convex-safe';
import { formatCurrency } from '../utils/formatting';
import {
  brand,
  lightTokens,
  darkTokens,
  legacyGradients as gradients,
  legacyTypography as typography,
} from '../design-system';

const HOUSE_WHATSAPP = '573113052755';

function whatsappHref(text: string): string {
  return `https://wa.me/${HOUSE_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  return (
    <Box
      sx={{
        // dvh, not vh — see VitrinaPage for why (mobile toolbar height).
        minHeight: '100dvh',
        bgcolor: isLight
          ? lightTokens.background.page
          : darkTokens.background.app,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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

/** Token still resolving, or Convex unconfigured — never render this as an error. */
function LoadingState() {
  return (
    <Shell>
      <StateIcon icon={Gem} color={brand.emerald[300]} />
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Estamos confirmando tu pago
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Esto solo toma un momento.
      </Typography>
    </Shell>
  );
}

function ConfirmandoState({ saleId }: { saleId: string }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const tokens = isLight ? lightTokens : darkTokens;
  return (
    <Shell>
      <StateIcon icon={Clock} color={tokens.status.warning} />
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Estamos confirmando tu pago
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', maxWidth: 340 }}
      >
        Ya recibimos tu pedido <strong>{saleId}</strong>. La confirmación del
        pago puede tardar unos segundos — esta página se actualiza sola, no
        necesitas recargar.
      </Typography>
    </Shell>
  );
}

function ConfirmadaState({
  saleId,
  totalCOP,
}: {
  saleId: string;
  totalCOP: number;
}) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const tokens = isLight ? lightTokens : darkTokens;
  return (
    <Shell>
      <StateIcon icon={CheckCircle2} color={tokens.status.success} />
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        ¡Pago confirmado!
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', mb: 2, maxWidth: 340 }}
      >
        Gracias por tu compra. Guarda el número de tu pedido, te vamos a
        escribir por WhatsApp con los próximos pasos.
      </Typography>
      <Box
        sx={{
          border: `1px solid ${tokens.border?.default ?? brand.slate[200]}`,
          borderRadius: '12px',
          px: 3,
          py: 2,
          minWidth: 220,
        }}
      >
        <Typography
          sx={{
            fontSize: typography.size.xs,
            color: 'text.secondary',
            letterSpacing: typography.letterSpacing.wider,
            textTransform: 'uppercase',
          }}
        >
          Pedido
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {saleId}
        </Typography>
        <Typography
          sx={{
            fontSize: typography.size.xs,
            color: 'text.secondary',
            letterSpacing: typography.letterSpacing.wider,
            textTransform: 'uppercase',
          }}
        >
          Total
        </Typography>
        <Typography variant="h6">{formatCurrency(totalCOP, 'COP')}</Typography>
      </Box>
    </Shell>
  );
}

function CanceladaState({ saleId }: { saleId: string }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const tokens = isLight ? lightTokens : darkTokens;
  return (
    <Shell>
      <StateIcon icon={XCircle} color={tokens.status.error} />
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Este pedido fue cancelado
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', mb: 2, maxWidth: 340 }}
      >
        El pedido <strong>{saleId}</strong> ya no está activo. Si crees que esto
        es un error o quieres volver a intentarlo, escríbenos y con gusto te
        ayudamos.
      </Typography>
      <Box
        component="a"
        href={whatsappHref(`Hola, mi pedido ${saleId} aparece cancelado.`)}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: 'inline-block',
          background: gradients.emerald,
          color: '#fff',
          px: 3,
          py: 1.25,
          borderRadius: '999px',
          fontSize: typography.size.sm,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Escribir por WhatsApp
      </Box>
    </Shell>
  );
}

/** Unknown saleId — neutral, never a stack trace. */
function NotFoundState() {
  return (
    <Shell>
      <StateIcon icon={Gem} color={brand.emerald[300]} />
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        No encontramos ese pedido
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', mb: 2, maxWidth: 340 }}
      >
        Revisa el enlace o escríbenos y con gusto te ayudamos a ubicarlo.
      </Typography>
      <Box
        component="a"
        href={whatsappHref('Hola, no encuentro mi pedido.')}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: 'inline-block',
          background: gradients.emerald,
          color: '#fff',
          px: 3,
          py: 1.25,
          borderRadius: '999px',
          fontSize: typography.size.sm,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Escribir por WhatsApp
      </Box>
    </Shell>
  );
}

/** Route: /pedido-confirmado/:saleId */
export default function PedidoConfirmadoPage() {
  const { saleId = '' } = useParams<{ saleId: string }>();

  // Live Convex subscription — updates automatically when the webhook flips
  // `estado`. `undefined` covers both "still loading" and "Convex not
  // configured for this deployment"; either way this is never an error.
  const sale = useConvexQuery(
    convexApi.sales.estadoPublico,
    convexReady && saleId ? { saleId } : 'skip',
  ) as { saleId: string; estado: string; totalCOP: number } | null | undefined;

  if (sale === undefined) return <LoadingState />;
  if (sale === null) return <NotFoundState />;

  if (sale.estado === 'confirmada') {
    return <ConfirmadaState saleId={sale.saleId} totalCOP={sale.totalCOP} />;
  }
  if (sale.estado === 'cancelada') {
    return <CanceladaState saleId={sale.saleId} />;
  }
  // 'reservada' (or any future/unknown value) — never an error.
  return <ConfirmandoState saleId={sale.saleId} />;
}
