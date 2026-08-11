/**
 * ResaleBadge — "esta pieza es de la colección de un embajador".
 *
 * Una pieza que un embajador compró y decidió volver a ofrecer sigue VENDIDA
 * en los libros de TM: nosotros no la tenemos, la corredamos. El cliente
 * merece saberlo antes de preguntar, no al final de la conversación, y el
 * embajador merece el crédito de que la pieza es suya.
 *
 * Sólo aparece sobre piezas que el embajador ofreció EXPLÍCITAMENTE
 * (`ambassadorCuration.forResale`). El nombre que se muestra sale de
 * `/api/resale-offers`, que publica únicamente ofertas deliberadas — no es el
 * mapa de propiedad, que sigue retirado del catálogo. Sin esa contención,
 * pintar el nombre del dueño en la tarjeta publicaría de quién es cada pieza.
 *
 * Mismo Badge del design system que `PrecioEspecialBadge` (§DS3: el Badge es
 * el único chip de estado), en `tone="neutral"` porque esto informa la
 * procedencia, no promociona.
 */
import React from 'react';
import { Box } from '@mui/material';
import { UserRound } from 'lucide-react';
import { Badge } from '../../design-system';
import type { ResaleOffer } from '../../utils/productOffer';

export interface ResaleBadgeProps {
  /** Ausente = la pieza es de la casa; el componente no renderiza nada. */
  resale?: ResaleOffer;
  /** Densidad de tarjeta: sólo el nombre de pila, frase completa accesible. */
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * "Álvaro Pelaéz" → "Álvaro". En una tarjeta de 9-10px el nombre completo
 * desplaza al precio; el nombre entero viaja en el `aria-label` y el `title`.
 */
function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

export function ResaleBadge({
  resale,
  compact = false,
  className,
  style,
}: ResaleBadgeProps) {
  if (!resale) return null;

  const fraseCompleta = `De la colección de ${resale.asesorName}`;

  if (compact) {
    return (
      // `role="img"` para que el lector de pantalla anuncie la frase completa
      // una sola vez, en vez de leer también el texto corto de adentro.
      <Box
        component="span"
        role="img"
        aria-label={fraseCompleta}
        title={fraseCompleta}
        className={className}
        sx={{ display: 'inline-flex', maxWidth: '100%' }}
      >
        <Badge
          tone="neutral"
          icon={<UserRound />}
          label={`De ${primerNombre(resale.asesorName)}`}
          style={style}
        />
      </Box>
    );
  }

  return (
    <Box className={className} title={fraseCompleta} style={style}>
      <Badge tone="neutral" icon={<UserRound />} label={fraseCompleta} />
    </Box>
  );
}

export default ResaleBadge;
