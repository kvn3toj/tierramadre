/**
 * `/tienda/:categoria/:productoSlug` — la ficha de una pieza.
 *
 * Dos acciones, y el orden importa. La principal es pedir la pieza por
 * WhatsApp: convierte hoy, no necesita backend y es como esta casa cierra de
 * verdad. «Comprar» abre el pago SIMULADO, que existe para enseñar el camino
 * completo sin cobrar nada.
 *
 * Una pieza por encima del tope por transacción del proveedor no ofrece
 * comprar: el fallo ocurriría en un dominio ajeno DESPUÉS de que la reserva ya
 * bloqueó la pieza media hora. Ofrecerla para consulta es lo honesto.
 */
import { Box, Typography } from '@mui/material';
import { MessageCircle, SearchX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import TiendaShell from './TiendaShell';
import MetalSelector, { useMetalParam } from './components/MetalSelector';
import SeleccionToggle from './components/SeleccionToggle';
import ProgressiveImage from '../../components/shared/ProgressiveImage';
import { useLanguage } from '../../contexts/LanguageContext';
import { Badge, Button, EmptyState, qeType } from '../../design-system';
import { houseWhatsAppLink } from '../../constants/contact';
import { formatPriceCOP } from '../../utils/priceFormatters';
import {
  findCategoria,
  findProducto,
  imagenDe,
  superaTopeDeTransaccion,
  tieneEjeDeMetal,
  variantFor,
} from '../../utils/tienda';

export default function ProductoPage() {
  const { categoria: categoriaParam, productoSlug } = useParams<{
    categoria: string;
    productoSlug: string;
  }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [metal, setMetal] = useMetalParam();

  const categoria = findCategoria(categoriaParam);
  const producto = findProducto(productoSlug);

  // La pieza tiene que existir Y pertenecer a la colección de la URL: sin lo
  // segundo, /tienda/simbolos/anillo-compromiso respondería como si tal cosa.
  if (!categoria || !producto || producto.categoria !== categoria.key) {
    return (
      <TiendaShell>
        <EmptyState
          icon={SearchX}
          title={t.tienda.notFound.piezaTitle}
          subtitle={t.tienda.notFound.piezaBody}
          action={{
            label: t.tienda.notFound.cta,
            onClick: () => navigate('/tienda'),
          }}
        />
      </TiendaShell>
    );
  }

  const copy = t.tienda.productos[producto.slug];
  const conMetal = tieneEjeDeMetal(producto);
  const variante = variantFor(producto, metal);
  const montura = conMetal ? t.tienda.metales[metal] : '';
  const enStock = variante.disponibilidad === 'en-stock';
  const imagen = imagenDe(producto, variante);
  const sobreElTope = superaTopeDeTransaccion(variante);

  const etiquetaPieza = conMetal ? `${copy.nombre} · ${montura}` : copy.nombre;
  const whatsapp = houseWhatsAppLink(
    `${t.tienda.seleccion.whatsappMessageOne}\n\n• ${etiquetaPieza}`,
  );

  return (
    <TiendaShell>
      <Box
        sx={{
          display: 'grid',
          // Dos columnas desde 768px, no desde el `md` de MUI (900). Un iPad en
          // vertical mide 834 y con el corte en 900 caía en la columna única:
          // 2228px de alto medidos, la pantalla más larga de la tienda, con
          // media ventana vacía al lado de la foto. A 768 la foto todavía sale
          // a ~313px de lado (a 834, ~343px) — más que la miniatura de la
          // rejilla, así que la piedra se sigue leyendo.
          gridTemplateColumns: '1fr',
          gap: '24px',
          '@media (min-width: 768px)': {
            gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 6fr)',
            gap: '32px',
          },
          '@media (min-width: 900px)': { gap: '40px' },
          alignItems: 'start',
        }}
      >
        <Box
          sx={{
            aspectRatio: '1 / 1',
            backgroundColor: 'var(--tm-well)',
            border: '1px solid var(--tm-border)',
            borderRadius: 'var(--tm-radius-card)',
            overflow: 'hidden',
          }}
        >
          <ProgressiveImage
            // El key es la foto, no la montura: dos monturas que comparten
            // foto no remontan (y no destellan); cuando la foto cambia, el
            // remontaje evita mutar el src de un <img> vivo.
            key={imagen ?? producto.slug}
            src={imagen}
            alt={etiquetaPieza}
            height="100%"
            objectFit="cover"
            layout="full"
            priority
            enableLQIP={false}
          />
        </Box>

        <Box>
          <Typography
            component="h1"
            sx={{
              ...qeType.display,
              fontSize: 'clamp(1.875rem, 6vw, 2.5rem)',
              color: 'var(--tm-text)',
            }}
          >
            {copy.nombre}
          </Typography>
          <Typography
            sx={{
              ...qeType.body,
              fontSize: '1.0625rem',
              color: 'var(--tm-muted)',
              marginBlockStart: '8px',
            }}
          >
            {copy.subtitulo}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBlockStart: '20px',
            }}
          >
            <Typography
              sx={{
                ...qeType.data,
                fontSize: '1.5rem',
                color: 'var(--tm-text)',
              }}
            >
              ${formatPriceCOP(variante.precioCOP)}
            </Typography>
            <Badge
              tone={enStock ? 'accent' : 'neutral'}
              dot
              label={t.tienda.disponibilidad[variante.disponibilidad]}
            />
          </Box>

          {conMetal && (
            <Box
              sx={{
                marginBlockStart: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <Typography sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}>
                {t.tienda.montura}
              </Typography>
              <Box sx={{ width: '100%', maxWidth: { xs: 'none', sm: 440 } }}>
                <MetalSelector value={metal} onChange={setMetal} block />
              </Box>
            </Box>
          )}

          <Typography
            sx={{
              ...qeType.body,
              fontSize: '1.0625rem',
              color: 'var(--tm-text)',
              marginBlockStart: '24px',
              maxWidth: '65ch',
            }}
          >
            {copy.descripcion}
          </Typography>

          <Box
            component="ul"
            sx={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              marginBlockStart: '24px',
              border: '1px solid var(--tm-border)',
              borderRadius: 'var(--tm-radius-card)',
              overflow: 'hidden',
            }}
          >
            {copy.detalles.map((detalle) => (
              <Box
                key={detalle}
                component="li"
                sx={{
                  ...qeType.body,
                  // Los detalles son la gemología de la pieza: lo que el
                  // comprador lee para decidir. En el móvil respetan el piso de
                  // 17px del contrato; a partir de sm la fila se densifica.
                  fontSize: { xs: '1.0625rem', sm: '0.9375rem' },
                  color: 'var(--tm-muted)',
                  paddingInline: '16px',
                  paddingBlock: '12px',
                  '& + &': { borderTop: '1px solid var(--tm-hairline)' },
                }}
              >
                {detalle}
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              marginBlockStart: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* `size="lg"` = 48px. El tamaño por defecto del primitivo (md) mide
                40 y queda por debajo de los 44 del contrato; los tres CTA de
                esta columna son objetivos táctiles primarios, así que ninguno
                se queda en md. El arreglo de raíz vive en el token compartido
                `componentHeights.button`, fuera del alcance de esta pantalla. */}
            <Button
              component="a"
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="lg"
              fullWidth
              startIcon={<MessageCircle size={17} strokeWidth={1.75} />}
            >
              {t.tienda.ficha.cta}
            </Button>

            {/* El segundo CTA ya nace en 48px: `SeleccionToggle` fija su propio
                size="lg" desde el 2026-09-10 (verificado leyendo el archivo).
                Por eso aquí no hay ningún envoltorio que le imponga el alto. */}
            <SeleccionToggle
              slug={producto.slug}
              metal={conMetal ? metal : null}
              nombre={copy.nombre}
              block
            />

            {sobreElTope ? (
              <Typography
                sx={{
                  ...qeType.spec,
                  // Medía 11px: por debajo del contrato para una línea que NO
                  // es metadato — dice por qué esta pieza no ofrece comprar.
                  fontSize: { xs: '1.0625rem', sm: '0.9375rem' },
                  lineHeight: 1.5,
                  color: 'var(--tm-muted)',
                  textAlign: 'center',
                  marginBlockStart: '2px',
                }}
              >
                {t.tienda.ficha.sobreElTope}
              </Typography>
            ) : (
              <>
                <Button
                  variant="outlined"
                  size="lg"
                  fullWidth
                  onClick={() =>
                    navigate(
                      `/tienda/pago?p=${producto.slug}${conMetal ? `:${metal}` : ''}`,
                    )
                  }
                >
                  {t.tienda.ficha.comprar}
                </Button>
                <Typography
                  sx={{
                    ...qeType.spec,
                    // «Pago simulado, ninguna tarjeta se cobra» es la promesa
                    // que sostiene el botón de arriba: información de decisión,
                    // no una nota al pie. Medía 11px a 500px de ancho.
                    fontSize: { xs: '1.0625rem', sm: '0.9375rem' },
                    lineHeight: 1.5,
                    color: 'var(--tm-muted)',
                    textAlign: 'center',
                  }}
                >
                  {t.tienda.ficha.comprarAyuda}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Box>
      <Box aria-hidden="true" sx={{ height: 72 }} />
    </TiendaShell>
  );
}
