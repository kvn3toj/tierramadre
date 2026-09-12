/**
 * `/tienda/pedido/:pedidoId` — el desenlace del pago.
 *
 * Una regla manda sobre todas las demás: `reservada` NO es un error. El cobro
 * lo confirma un webhook ASÍNCRONO y el cliente aterriza aquí antes de que
 * caiga, así que la espera es el estado por defecto y también el destino de
 * cualquier valor que no reconozcamos. Es la misma doctrina que
 * `src/pages/PedidoConfirmadoPage.tsx` (líneas 9-16) dejó escrita después de
 * pagarla: decirle a alguien que acaba de pagar que su plata se perdió es
 * exactamente el fallo que esta pantalla existe para evitar.
 *
 * Por eso el desenlace se decide con una lista blanca de dos valores y todo lo
 * demás cae en la espera. Si mañana el esquema gana un estado nuevo, esta
 * página lo recibirá como "confirmando" —incómodo, nunca falso— hasta que
 * alguien decida qué significa.
 *
 * El estado llega por `?estado=` porque este riel es simulado y no hay
 * suscripción viva que mirar. Cuando la haya, lo que cambia es de dónde sale
 * `estado`, no la forma de esta pantalla.
 */
import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  SearchX,
  XCircle,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import TiendaShell from './TiendaShell';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Badge, Button, EmptyState, qeType } from '../../design-system';
import { houseWhatsAppLink } from '../../constants/contact';

type EstadoPedido = 'reservada' | 'confirmada' | 'cancelada';

/**
 * Lista blanca de desenlaces. Nada de `as EstadoPedido` sobre el parámetro
 * crudo: un `?estado=chargeback` escrito a mano llegaría intacto hasta el
 * `switch` y saldría por la rama equivocada.
 */
function leerEstado(valor: string | null): EstadoPedido {
  return valor === 'confirmada' || valor === 'cancelada' ? valor : 'reservada';
}

/**
 * Dos minutos. Pasado ese punto la espera deja de ser normal y ofrecemos una
 * salida humana — que sigue sin ser un error, solo una puerta.
 */
const ESPERA_LARGA_MS = 120_000;

/**
 * `target` viaja por spread porque el Button de DS3 está tipado como
 * `forwardRef<HTMLButtonElement, ButtonProps>`: no es polimórfico, así que TS
 * rechaza los atributos de ancla aunque MUI ya renderiza un `<a>` en cuanto
 * hay `href` y los reenvía en tiempo de ejecución. Cuando el Button gane el
 * tipado polimórfico (hoy rompe también a ProductoPage, SeleccionPage,
 * PagoPage y LegalPage), esto vuelve a ser un `target="_blank"` normal.
 */
const enPestanaNueva = { target: '_blank' } as const;

export default function PedidoPage() {
  const { pedidoId = '' } = useParams<{ pedidoId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

  const estado = leerEstado(searchParams.get('estado'));
  const [esperaLarga, setEsperaLarga] = useState(false);

  useEffect(() => {
    // El reloj solo corre mientras esperamos; y se limpia al desmontar para no
    // llamar a setState sobre una pantalla que el cliente ya abandonó.
    if (estado !== 'reservada') return;
    const reloj = window.setTimeout(
      () => setEsperaLarga(true),
      ESPERA_LARGA_MS,
    );
    return () => window.clearTimeout(reloj);
  }, [estado]);

  const copy = t.tienda.pago;
  const e = copy.estado;
  const whatsapp = houseWhatsAppLink(
    copy.whatsappPedido.replace('{id}', pedidoId),
  );

  // Sin número no hay pedido que consultar. Neutro y con salida, nunca un
  // callejón: quien llega aquí probablemente copió mal el enlace.
  if (!pedidoId) {
    return (
      <TiendaShell hideSeleccionBar>
        <Box sx={{ maxWidth: 520, marginInline: 'auto' }}>
          <EmptyState
            icon={SearchX}
            title={e.notFound}
            subtitle={e.notFoundBody}
          >
            <Box
              sx={{
                marginBlockStart: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate('/tienda')}
              >
                {copy.backToShop}
              </Button>
              <Button
                href={houseWhatsAppLink()}
                rel="noopener noreferrer"
                {...enPestanaNueva}
                variant="outlined"
                size="lg"
                fullWidth
                startIcon={<MessageCircle size={17} strokeWidth={1.75} />}
              >
                {copy.writeUs}
              </Button>
            </Box>
          </EmptyState>
        </Box>
      </TiendaShell>
    );
  }

  const titulo =
    estado === 'confirmada'
      ? e.confirmada
      : estado === 'cancelada'
        ? e.cancelada
        : e.confirmando;
  const cuerpo =
    estado === 'confirmada'
      ? e.confirmadaBody
      : estado === 'cancelada'
        ? e.canceladaBody
        : e.confirmandoBody;

  return (
    <TiendaShell hideSeleccionBar>
      {/* Columna angosta y centrada: esta pantalla es UN mensaje, no una
          superficie por la que se navega. Es el único sitio de la tienda donde
          centrar es lo correcto. */}
      <Box sx={{ maxWidth: 520, marginInline: 'auto', textAlign: 'center' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <Badge tone="neutral" label={copy.simulated} />
        </Box>

        {/* El chip repite las palabras del titular: es el color del desenlace,
            no información nueva. Oculto a lectores de pantalla para que nadie
            escuche el mismo estado dos veces seguidas. */}
        <Box
          aria-hidden="true"
          sx={{
            display: 'flex',
            justifyContent: 'center',
            marginBlockStart: '20px',
          }}
        >
          <Badge
            tone={
              estado === 'confirmada'
                ? 'accent'
                : estado === 'cancelada'
                  ? 'danger'
                  : 'neutral'
            }
            label={titulo}
            icon={
              estado === 'confirmada' ? (
                <CheckCircle2 size={14} strokeWidth={1.75} />
              ) : estado === 'cancelada' ? (
                <XCircle size={14} strokeWidth={1.75} />
              ) : (
                <Clock size={14} strokeWidth={1.75} />
              )
            }
          />
        </Box>

        <Typography
          component="h1"
          sx={{
            ...qeType.display,
            // `display` no trae fontSize a propósito: clamp() en el sitio de uso.
            fontSize: 'clamp(1.75rem, 6vw, 2.25rem)',
            color: 'var(--tm-text)',
            marginBlockStart: '14px',
          }}
        >
          {titulo}
        </Typography>

        <Typography
          sx={{
            ...qeType.body,
            fontSize: '1.0625rem',
            color: 'var(--tm-muted)',
            marginBlockStart: '12px',
            marginInline: 'auto',
            maxWidth: '46ch',
          }}
        >
          {cuerpo}
        </Typography>

        {estado === 'reservada' && (
          <Box
            aria-hidden="true"
            sx={{
              '@keyframes tmPedidoEspera': {
                from: { transform: 'translateX(-100%)' },
                to: { transform: 'translateX(250%)' },
              },
              marginBlockStart: '24px',
              marginInline: 'auto',
              maxWidth: 220,
              height: '2px',
              borderRadius: 'var(--tm-radius-pill)',
              backgroundColor: 'var(--tm-well)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: '40%',
                height: '100%',
                borderRadius: 'inherit',
                backgroundColor: 'var(--tm-accent)',
                ...(prefersReducedMotion
                  ? // Quieto y centrado: la barra sigue leyéndose como "en
                    // curso" sin mover un pixel (WCAG 2.3.3).
                    { marginInline: 'auto' }
                  : {
                      // El bucle no es una transición: a 240ms latiría como una
                      // alarma justo cuando pedimos calma. Se deriva del token
                      // igual, en vez de inventar un número suelto.
                      animation:
                        'tmPedidoEspera calc(var(--tm-base) * 7) var(--tm-ease) infinite',
                    }),
              }}
            />
          </Box>
        )}

        <Box
          sx={{
            marginBlockStart: '28px',
            border: '1px solid var(--tm-border)',
            borderRadius: 'var(--tm-radius-card)',
            backgroundColor: 'var(--tm-surface)',
            paddingBlock: '16px',
            paddingInline: '20px',
          }}
        >
          <Typography sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}>
            {copy.pedido}
          </Typography>
          <Typography
            sx={{
              ...qeType.data,
              fontSize: '1.125rem',
              color: 'var(--tm-text)',
              marginBlockStart: '6px',
              // El número es lo que el cliente nos va a dictar por teléfono:
              // que se parta antes que desbordar la tarjeta.
              overflowWrap: 'anywhere',
            }}
          >
            {pedidoId}
          </Typography>
        </Box>

        {estado === 'reservada' && esperaLarga && (
          // `role="status"` porque este bloque aparece dos minutos después de
          // que la página se leyó: sin región viva, quien usa lector de
          // pantalla nunca se entera de que apareció una salida.
          <Box
            role="status"
            sx={{
              marginBlockStart: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <Typography
              sx={{
                ...qeType.body,
                fontSize: '0.9375rem',
                color: 'var(--tm-muted)',
                marginInline: 'auto',
                maxWidth: '44ch',
              }}
            >
              {e.tardando}
            </Typography>
            <Button
              href={whatsapp}
              rel="noopener noreferrer"
              {...enPestanaNueva}
              variant="outlined"
              size="lg"
              fullWidth
              startIcon={<MessageCircle size={17} strokeWidth={1.75} />}
            >
              {copy.writeUs}
            </Button>
          </Box>
        )}

        {estado === 'cancelada' && (
          // Reintentar primero: el cuerpo ya dijo que no hubo cobro, así que lo
          // siguiente que esta persona quiere es volver a intentarlo.
          <Box
            sx={{
              marginBlockStart: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate('/tienda/pago')}
            >
              {copy.retry}
            </Button>
            <Button
              href={whatsapp}
              rel="noopener noreferrer"
              {...enPestanaNueva}
              variant="outlined"
              size="lg"
              fullWidth
              startIcon={<MessageCircle size={17} strokeWidth={1.75} />}
            >
              {copy.writeUs}
            </Button>
          </Box>
        )}

        {estado === 'confirmada' && (
          <Box sx={{ marginBlockStart: '24px' }}>
            <Button
              variant="plain"
              size="lg"
              onClick={() => navigate('/tienda')}
            >
              {copy.backToShop}
            </Button>
          </Box>
        )}
      </Box>

      <Box aria-hidden="true" sx={{ height: 48 }} />
    </TiendaShell>
  );
}
