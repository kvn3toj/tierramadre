/**
 * `/tienda/seleccion` — «Mi selección», la lista corta que se comparte.
 *
 * Es el camino de conversión de la tienda HOY, antes de que exista un pago de
 * verdad: quien llega aquí ya eligió, y lo único que falta es que la casa lo
 * sepa. Por eso la acción principal es WhatsApp y no un checkout.
 *
 * La lista se lee como una revisión, no como un catálogo: filas, no tarjetas.
 * Una rejilla invita a seguir mirando; una fila invita a confirmar y mandar.
 *
 * El estado vive en la URL (`?p=`) además de en la sesión, así que un enlace
 * pegado en un chat abre la misma selección en otro teléfono sin backend de
 * por medio — el mismo reparto que ya usa `/v/`.
 */
import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { Bookmark, MessageCircle, Share2, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TiendaShell from './TiendaShell';
import { useSeleccion } from './useTienda';
import ProgressiveImage from '../../components/shared/ProgressiveImage';
import { useLiveRegion } from '../../components/shared/LiveRegion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button, EmptyState, qeType } from '../../design-system';
import { formatPriceCOP } from '../../utils/priceFormatters';
import { imagenDe } from '../../utils/tienda';
import {
  claveDe,
  parseSeleccionParam,
  resolverSeleccion,
  totalCOP,
} from '../../utils/tiendaSeleccion';
import { enlaceSeleccion } from '../../utils/tiendaWhatsApp';

/**
 * El bolsón que convierte el botón en un enlace.
 *
 * Va aparte y `as const` por una razón de tipos, no de estilo: el `Button` de
 * DS3 es un `forwardRef<HTMLButtonElement, ButtonProps>` y pierde la firma
 * polimórfica de MUI, así que un `component="a"` escrito como atributo se
 * ensancha a `string` y deja de encajar en `React.ElementType`. Conservando el
 * literal, el tipo cierra sin ningún `as any` y el render es el mismo ancla.
 * El defecto es del primitivo compartido, no de esta pantalla: el 2026-09-10,
 * `npx tsc --noEmit` señalaba la misma falla en otras llamadas de
 * `src/pages/tienda/`. La cura de raíz es tipar el primitivo como
 * `OverridableComponent`, y eso no se hace desde aquí.
 */
const COMO_ENLACE_EXTERNO = {
  component: 'a',
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;

export default function SeleccionPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { seleccion, count, toggle, clear, replace, serialized } =
    useSeleccion();
  const { announce } = useLiveRegion();

  // Hidratar desde un enlace compartido, UNA sola vez y sólo si no hay nada
  // elegido en esta sesión. La sesión gana a propósito: quien acaba de marcar
  // tres piezas y abre un enlace que le mandaron no debería perder las suyas.
  const hidratado = useRef(false);
  useEffect(() => {
    if (hidratado.current) return;
    hidratado.current = true;
    if (seleccion.length > 0) return;
    const compartida = parseSeleccionParam(searchParams.get('p'));
    if (compartida.length > 0) replace(compartida);
  }, [searchParams, seleccion, replace]);

  const copy = t.tienda.seleccion;
  const filas = resolverSeleccion(seleccion);

  if (filas.length === 0) {
    return (
      <TiendaShell hideSeleccionBar>
        <EmptyState
          icon={Bookmark}
          title={copy.emptyTitle}
          subtitle={copy.emptyBody}
          action={{ label: copy.emptyCta, onClick: () => navigate('/tienda') }}
        />
      </TiendaShell>
    );
  }

  const piezas = filas.map(({ item, producto }) => {
    const nombre = t.tienda.productos[producto.slug].nombre;
    const montura = item.metal ? t.tienda.metales[item.metal] : '';
    return { etiqueta: montura ? `${nombre} · ${montura}` : nombre };
  });

  // El mensaje nombra las piezas y NO lleva precios: decisión heredada de
  // `mensajeCotizacionVencida.ts`. Una cifra dentro del saludo es una cifra que
  // la casa tiene que honrar antes de conversar.
  const whatsapp = enlaceSeleccion(piezas, {
    whatsappMessage: copy.whatsappMessage,
    whatsappMessageOne: copy.whatsappMessageOne,
    whatsappTail: copy.whatsappTail,
  });

  async function compartir() {
    const enlace = `${window.location.origin}/tienda/seleccion?p=${serialized}`;

    // En un teléfono la hoja del sistema es donde de verdad se comparte, así
    // que se intenta primero. Cancelarla lanza AbortError: cancelar no es
    // fallar, y no debe terminar copiando nada ni anunciando nada.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: copy.title, url: enlace });
        return;
      } catch {
        return;
      }
    }

    // `navigator.clipboard` no existe en contextos no seguros; el try/catch
    // cubre tanto eso como el permiso denegado. Esta pantalla nunca lanza.
    try {
      await navigator.clipboard.writeText(enlace);
      announce(copy.linkCopied);
    } catch {
      announce(copy.linkCopyFailed);
    }
  }

  return (
    <TiendaShell hideSeleccionBar>
      <Box sx={{ marginBlockEnd: { xs: '20px', sm: '28px' } }}>
        <Typography
          component="h1"
          sx={{
            ...qeType.display,
            fontSize: 'clamp(1.75rem, 5.5vw, 2.25rem)',
            color: 'var(--tm-text)',
          }}
        >
          {copy.title}
        </Typography>
        <Typography
          sx={{
            ...qeType.spec,
            color: 'var(--tm-muted)',
            marginBlockStart: '8px',
          }}
        >
          {count === 1
            ? copy.countOne
            : copy.count.replace('{n}', String(count))}
        </Typography>
      </Box>

      <Box
        sx={{
          border: '1px solid var(--tm-border)',
          borderRadius: 'var(--tm-radius-card)',
          backgroundColor: 'var(--tm-surface)',
          overflow: 'hidden',
        }}
      >
        <Box component="ul" sx={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {filas.map(({ item, producto, variante }) => {
            const pieza = t.tienda.productos[producto.slug];
            const montura = item.metal ? t.tienda.metales[item.metal] : '';
            const imagen = imagenDe(producto, variante);
            const linea = [
              montura,
              t.tienda.disponibilidad[variante.disponibilidad],
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <Box
                component="li"
                key={claveDe(item)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  paddingInline: { xs: '12px', sm: '16px' },
                  paddingBlock: '12px',
                  '& + &': { borderTop: '1px solid var(--tm-hairline)' },
                }}
              >
                <Box
                  sx={{
                    // La proporción va en el contenedor, nunca un alto fijo:
                    // el hueco queda reservado antes de que la foto decodifique
                    // y la fila no salta.
                    width: { xs: 72, sm: 80 },
                    flexShrink: 0,
                    aspectRatio: '1 / 1',
                    borderRadius: 'var(--tm-radius-well)',
                    border: '1px solid var(--tm-border)',
                    backgroundColor: 'var(--tm-well)',
                    overflow: 'hidden',
                  }}
                >
                  <ProgressiveImage
                    // El key es la RUTA de la foto, no la montura: dos monturas
                    // que comparten foto no remontan (y no destellan).
                    key={imagen ?? producto.slug}
                    src={imagen}
                    alt={pieza.nombre}
                    height="100%"
                    objectFit="cover"
                    layout="thumbnail"
                    enableLQIP={false}
                  />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      ...qeType.title,
                      // Sube en móvil sólo para que el nombre siga por encima
                      // de la montura ahora que ésta respeta el piso de 17px.
                      fontSize: { xs: '1.125rem', sm: '1rem' },
                      color: 'var(--tm-text)',
                    }}
                  >
                    {pieza.nombre}
                  </Typography>
                  <Typography
                    sx={{
                      ...qeType.spec,
                      // Medía 11px a 500px. Esta línea lleva la montura y la
                      // disponibilidad: es exactamente lo que el comprador
                      // revisa antes de mandar el mensaje, no metadato.
                      fontSize: { xs: '1.0625rem', sm: '0.9375rem' },
                      lineHeight: 1.45,
                      color: 'var(--tm-muted)',
                      marginBlockStart: '3px',
                    }}
                  >
                    {linea}
                  </Typography>
                  <Typography
                    sx={{
                      ...qeType.data,
                      fontSize: '1rem',
                      color: 'var(--tm-text)',
                      marginBlockStart: '6px',
                    }}
                  >
                    ${formatPriceCOP(variante.precioCOP)}
                  </Typography>
                </Box>

                <Box
                  component="button"
                  type="button"
                  aria-label={`${copy.remove}: ${pieza.nombre}`}
                  onClick={() => {
                    toggle(item);
                    announce(
                      copy.announceRemoved
                        .replace('{nombre}', pieza.nombre)
                        .replace('{n}', String(count - 1)),
                    );
                  }}
                  sx={{
                    flexShrink: 0,
                    minWidth: 44,
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--tm-muted)',
                    borderRadius: 'var(--tm-radius-control)',
                    // El hover cambia color, nunca geometría: una fila que
                    // crece al pasar por encima re-maqueta la lista entera.
                    transition: 'color var(--tm-fast) var(--tm-ease)',
                    '&:hover': { color: 'var(--tm-text)' },
                    '&:focus-visible': {
                      outline: 'none',
                      boxShadow: 'var(--tm-focus-ring)',
                    },
                  }}
                >
                  <X size={18} strokeWidth={1.75} aria-hidden="true" />
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '16px',
            borderTop: '1px solid var(--tm-border)',
            backgroundColor: 'var(--tm-well)',
            paddingInline: { xs: '12px', sm: '16px' },
            paddingBlock: '14px',
          }}
        >
          <Typography sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}>
            {t.tienda.pago.total}
          </Typography>
          <Typography
            sx={{
              ...qeType.data,
              fontSize: '1.25rem',
              color: 'var(--tm-text)',
            }}
          >
            ${formatPriceCOP(totalCOP(seleccion))}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          marginBlockStart: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: 480,
        }}
      >
        {/* Los tres a `size="lg"` (48px). El defecto por defecto del primitivo
            es md = 40px, por debajo de los 44 del contrato — y éste es el
            bloque de conversión de toda la tienda: el que manda el mensaje no
            puede ser el objetivo más difícil de acertar. La jerarquía la llevan
            la variante y el orden (primary → outlined → plain), no el alto:
            encoger «Vaciar» a md lo dejaría fuera de contrato, y además es el
            botón destructivo, el peor candidato a un objetivo estrecho. */}
        <Button
          {...COMO_ENLACE_EXTERNO}
          href={whatsapp}
          variant="primary"
          size="lg"
          fullWidth
          startIcon={<MessageCircle size={17} strokeWidth={1.75} />}
        >
          {copy.whatsapp}
        </Button>

        <Button
          variant="outlined"
          size="lg"
          fullWidth
          onClick={compartir}
          startIcon={<Share2 size={17} strokeWidth={1.75} />}
        >
          {copy.share}
        </Button>

        <Button variant="plain" size="lg" fullWidth onClick={clear}>
          {copy.clear}
        </Button>
      </Box>

      <Box aria-hidden="true" sx={{ height: 48 }} />
    </TiendaShell>
  );
}
