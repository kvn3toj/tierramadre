/**
 * Una familia en la rejilla, montada sobre `PieceCard`.
 *
 * PieceCard es la tarjeta canónica del catálogo: aquí sólo se compone, no se
 * reimplementa. La tarjeta NAVEGA; elegir es un control aparte, en la esquina
 * del pozo. Convertir toda la tarjeta en casilla obligaría a un modo de
 * selección explícito, y con cinco familias eso es más ceremonia que ayuda.
 *
 * El `key` de la imagen es la ruta de la foto, NO la montura: así, cuando dos
 * monturas comparten foto (que es el caso del fixture), React no remonta y no
 * hay destello. Cuando la foto sí cambia, el remontaje es justo lo que evita
 * mutar el `src` de un `<img>` vivo.
 */
import { Box, Typography } from '@mui/material';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProgressiveImage from '../../../components/shared/ProgressiveImage';
import { useLanguage } from '../../../contexts/LanguageContext';
import { PieceCard, qeType } from '../../../design-system';
import { formatPriceCOP } from '../../../utils/priceFormatters';
import { imagenDe, tieneEjeDeMetal, variantFor } from '../../../utils/tienda';
import type { MetalKey, StoreProduct } from '../../../types/tienda';
import { useSeleccion } from '../useTienda';

export interface TiendaPieceCardProps {
  producto: StoreProduct;
  metal: MetalKey;
  /** Se propaga a la ficha para que la montura elegida no se pierda al saltar. */
  search: string;
}

export default function TiendaPieceCard({
  producto,
  metal,
  search,
}: TiendaPieceCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isSelected, toggle } = useSeleccion();

  const conMetal = tieneEjeDeMetal(producto);
  const variante = variantFor(producto, metal);
  const montura = conMetal ? t.tienda.metales[metal] : '';
  const imagen = imagenDe(producto, variante);
  const copy = t.tienda.productos[producto.slug];

  const item = { slug: producto.slug, metal: conMetal ? metal : null };
  const elegida = isSelected(item);

  return (
    <PieceCard
      variant="well"
      name={copy.nombre}
      specLine={montura || copy.subtitulo}
      ariaLabel={
        conMetal
          ? `${copy.nombre} · ${montura} · ${formatPriceCOP(variante.precioCOP)}`
          : `${copy.nombre} · ${formatPriceCOP(variante.precioCOP)}`
      }
      onClick={() =>
        navigate(`/tienda/${producto.categoria}/${producto.slug}${search}`)
      }
      media={
        <ProgressiveImage
          key={imagen ?? producto.slug}
          src={imagen}
          alt={conMetal ? `${copy.nombre} · ${montura}` : copy.nombre}
          aspectRatio="1 / 1"
          objectFit="cover"
          layout="grid"
          enableLQIP={false}
        />
      }
      overlays={
        <Box
          component="button"
          type="button"
          aria-pressed={elegida}
          aria-label={
            elegida
              ? `${t.tienda.seleccion.remove}: ${copy.nombre}`
              : `${t.tienda.seleccion.add}: ${copy.nombre}`
          }
          onClick={(e: React.MouseEvent) => {
            // La tarjeta entera navega; este control no debe hacerlo.
            e.stopPropagation();
            toggle(item);
          }}
          sx={{
            // El botón mide 44 (el piso del contrato); el chip PINTADO sigue
            // midiendo 36. Lo que crece es el área de toque, no la tinta: el
            // anclaje retrocede 8 → 4 justo los 4px que el botón engordó por
            // lado, así que el chip visible cae exactamente donde caía antes
            // y la composición de la tarjeta no se mueve ni un píxel.
            // El pozo tiene `overflow: hidden`, pero el botón cabe entero
            // dentro de él — no hay recorte que quitarle al toque.
            position: 'absolute',
            top: 4,
            insetInlineEnd: 4,
            width: 44,
            height: 44,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            border: 'none',
            background: 'transparent',
            // Los estados viven en el chip, no en la caja invisible: si el
            // anillo de foco se dibujara en los 44 se vería un halo flotando
            // alrededor de un chip de 36.
            '&:focus-visible': { outline: 'none' },
            '&:hover > span': {
              borderColor: 'var(--tm-accent)',
              color: 'var(--tm-accent)',
            },
            '&:focus-visible > span': { boxShadow: 'var(--tm-focus-ring)' },
            '&:active > span': { opacity: 0.85 },
          }}
        >
          <Box
            component="span"
            aria-hidden="true"
            sx={{
              width: 36,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--tm-radius-pill)',
              border: '1px solid',
              borderColor: elegida ? 'var(--tm-accent)' : 'var(--tm-border)',
              backgroundColor: elegida
                ? 'var(--tm-accent-wash)'
                : 'var(--tm-surface)',
              color: elegida ? 'var(--tm-accent)' : 'var(--tm-muted)',
              transition:
                'color var(--tm-fast) var(--tm-ease), border-color var(--tm-fast) var(--tm-ease), background-color var(--tm-fast) var(--tm-ease), opacity var(--tm-fast) var(--tm-ease)',
            }}
          >
            {elegida ? (
              <BookmarkCheck size={17} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Bookmark size={17} strokeWidth={1.75} aria-hidden="true" />
            )}
          </Box>
        </Box>
      }
      price={
        <Typography
          component="span"
          sx={{
            ...qeType.data,
            fontSize: '0.9375rem',
            color: 'var(--tm-text)',
            whiteSpace: 'nowrap',
          }}
        >
          ${formatPriceCOP(variante.precioCOP)}
        </Typography>
      }
    />
  );
}
