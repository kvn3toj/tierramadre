/**
 * `/tienda/la-casa` — la única página de la tienda que no vende una pieza.
 *
 * El argumento de una esmeralda es la procedencia, y quien llega por un enlace
 * lee esto antes de mirar un precio: no es relleno institucional, es la prueba
 * de que hay una casa detrás. Por eso ocupa el ancho entero con una fotografía
 * y luego se estrecha a una columna de lectura, en vez de repartir el texto en
 * tarjetas: la confianza se construye leyendo seguido, no picoteando.
 *
 * La maqueta es asimétrica a propósito. Título y entrada quedan en una columna
 * angosta a la izquierda y el cuerpo en otra más ancha a su derecha, con el
 * hueco entre ambas haciendo de margen. Centrar la prosa la volvería un cartel;
 * el registro de esta casa es editorial, alineado a la izquierda, como la ficha
 * de pieza.
 */
import type { ComponentType } from 'react';
import { Box, Typography } from '@mui/material';
import { MessageCircle } from 'lucide-react';
import TiendaShell from './TiendaShell';
import ProgressiveImage from '../../components/shared/ProgressiveImage';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button, qeType, type ButtonProps } from '../../design-system';
import { houseWhatsAppLink } from '../../constants/contact';

/**
 * El Button de DS3 declara sus props como `Omit<MuiButtonProps, …>`, y esa
 * forma pierde la firma polimórfica de MUI: `component="a"` funciona en
 * ejecución pero no tipa (el mismo TS2322 está abierto hoy en ProductoPage y
 * en SeleccionBar). El arreglo de verdad va en el componente del sistema; aquí
 * sólo se declara la variante ancla, para no dejar el destino en un onClick —
 * un enlace tiene que poder abrirse en pestaña nueva y copiarse.
 */
type BotonAnclaProps = Omit<ButtonProps, 'component'> & {
  component: 'a';
  href: string;
  target?: string;
  rel?: string;
};
const BotonAncla = Button as ComponentType<BotonAnclaProps>;

/**
 * Foto de portada. Constante y no dato de catálogo: esta página habla de la
 * casa, no de una pieza en venta, y ligarla al inventario haría que agotar un
 * lote cambiara la portada del relato.
 */
const FOTO_PORTADA = '/gallery/gems/_MG_2995.JPG';

export default function LaCasaPage() {
  const { t } = useLanguage();
  const copy = t.tienda.laCasa;

  return (
    <TiendaShell>
      <Box
        sx={{
          // La proporción vive en el contenedor y cambia con el ancho: apaisada
          // en escritorio, más alta en teléfono para que la piedra no quede en
          // una franja. Nunca una altura fija — el hueco queda reservado antes
          // de que la foto decodifique, que es lo que evita el salto.
          aspectRatio: { xs: '4 / 3', sm: '16 / 9', md: '21 / 9' },
          backgroundColor: 'var(--tm-well)',
          border: '1px solid var(--tm-border)',
          borderRadius: 'var(--tm-radius-card)',
          overflow: 'hidden',
        }}
      >
        <ProgressiveImage
          // El key es la ruta de la imagen: si algún día cambia la portada, el
          // remontaje evita mutar el src de un <img> vivo.
          key={FOTO_PORTADA}
          src={FOTO_PORTADA}
          alt={copy.title}
          height="100%"
          objectFit="cover"
          layout="full"
          priority
          enableLQIP={false}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 3fr) minmax(0, 5fr)',
          },
          // El espacio entre columnas es el margen de esta página: por eso es
          // ancho en escritorio y no se rellena con nada.
          columnGap: { md: '56px' },
          rowGap: { xs: '20px', sm: '24px' },
          alignItems: 'start',
          marginBlockStart: { xs: '28px', sm: '40px' },
        }}
      >
        <Box component="header">
          <Typography
            component="h1"
            sx={{
              ...qeType.display,
              // `display` no trae fontSize a propósito: clamp() en el sitio de uso.
              fontSize: 'clamp(2rem, 7vw, 2.75rem)',
              color: 'var(--tm-text)',
            }}
          >
            {copy.title}
          </Typography>
          <Typography
            sx={{
              ...qeType.body,
              fontSize: '1.0625rem',
              color: 'var(--tm-muted)',
              marginBlockStart: '12px',
              maxWidth: '34ch',
            }}
          >
            {copy.lead}
          </Typography>
        </Box>

        <Box>
          {/* 68ch es medida de lectura, no de caja: por encima de ~75 el ojo
              pierde el renglón al volver, y este es el texto que decide si
              alguien se queda. */}
          <Typography
            sx={{
              ...qeType.body,
              fontSize: '1.0625rem',
              lineHeight: 1.75,
              color: 'var(--tm-text)',
              maxWidth: '68ch',
            }}
          >
            {copy.body1}
          </Typography>
          <Typography
            sx={{
              ...qeType.body,
              fontSize: '1.0625rem',
              lineHeight: 1.75,
              color: 'var(--tm-text)',
              maxWidth: '68ch',
              marginBlockStart: '20px',
            }}
          >
            {copy.body2}
          </Typography>

          <Box
            sx={{
              // Un filete de un píxel separa el relato de la acción. La
              // profundidad de esta casa es de bordes: nada de sombra sobre un
              // bloque que está quieto.
              borderTop: '1px solid var(--tm-hairline)',
              marginBlockStart: { xs: '28px', sm: '36px' },
              paddingBlockStart: { xs: '24px', sm: '28px' },
            }}
          >
            <BotonAncla
              component="a"
              href={houseWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="lg"
              startIcon={<MessageCircle size={18} strokeWidth={1.75} />}
              // Ancho completo en teléfono para que el destino sea cómodo con
              // el pulgar; en escritorio se ajusta al texto y deja aire.
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {copy.contact}
            </BotonAncla>
          </Box>
        </Box>
      </Box>

      {/* Aire final: la barra flotante de selección no debe apoyarse sobre el
          último renglón del relato. */}
      <Box aria-hidden="true" sx={{ height: 72 }} />
    </TiendaShell>
  );
}
