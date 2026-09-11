/**
 * Una puerta de la Tienda.
 *
 * Anatomía deliberadamente igual a la de `PieceCard`: pozo de imagen arriba,
 * bloque de texto debajo. Es la lectura de catálogo de subasta (la lámina, y
 * bajo ella el lote), coherente con las tarjetas a las que la puerta lleva, y
 * evita el degradado sobre la foto: sin scrim no hay contraste que se rompa al
 * cambiar a modo oscuro.
 *
 * Es un `<Link>` real, no un `role="button"`: se puede abrir en pestaña nueva,
 * el lector de pantalla lo anuncia como enlace y Enter funciona sin handler.
 */
import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProgressiveImage from '../../../components/shared/ProgressiveImage';
import { useLanguage } from '../../../contexts/LanguageContext';
import { qeType } from '../../../design-system';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import type { TiendaCategoria } from '../../../types/tienda';

export interface DoorCardProps {
  categoria: TiendaCategoria;
  /** Orden de entrada; escalona la aparición de las dos puertas. */
  index: number;
}

export default function DoorCard({ categoria, index }: DoorCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const copy = t.tienda.categorias[categoria.key];

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.24 }}
    >
      <Box
        component={Link}
        to={`/tienda/${categoria.key}`}
        aria-label={`${copy.nombre}. ${copy.resumen}.`}
        sx={{
          display: 'block',
          textDecoration: 'none',
          borderRadius: 'var(--tm-radius-card)',
          '&:focus-visible': { outline: 'none', boxShadow: 'var(--tm-focus-ring)' },
          // Sólo color y opacidad cambian al pasar por encima: nada se mueve,
          // nada cambia de tamaño, ninguna sombra aparece donde no había.
          '&:hover .tienda-door-well': { borderColor: 'var(--tm-accent)' },
          '&:hover .tienda-door-meta': { color: 'var(--tm-accent)' },
          '&:active': { opacity: 0.85 },
        }}
      >
        <Box
          className="tienda-door-well"
          sx={{
            // La proporción vive en el contenedor, nunca una altura fija: la
            // caja queda reservada antes de que la imagen decodifique.
            aspectRatio: { xs: '3 / 2', sm: '1 / 1' },
            backgroundColor: 'var(--tm-well)',
            border: '1px solid var(--tm-border)',
            borderRadius: 'var(--tm-radius-card)',
            overflow: 'hidden',
            transition: 'border-color var(--tm-fast) var(--tm-ease)',
          }}
        >
          <ProgressiveImage
            src={categoria.imagen}
            alt=""
            height="100%"
            objectFit="cover"
            layout="full"
            priority
            enableLQIP={false}
            showPlaceholderIcon={false}
          />
        </Box>

        <Box sx={{ paddingBlockStart: '14px' }}>
          <Typography
            component="h2"
            sx={{
              ...qeType.title,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              color: 'var(--tm-text)',
            }}
          >
            {copy.nombre}
          </Typography>
          <Typography
            className="tienda-door-meta"
            sx={{
              ...qeType.spec,
              color: 'var(--tm-muted)',
              marginBlockStart: '6px',
              transition: 'color var(--tm-fast) var(--tm-ease)',
            }}
          >
            {copy.resumen}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
}
