/**
 * PrecioEspecialBadge — el indicador de "este precio es especial y temporal".
 *
 * Lo alimenta `TreasureItem.precioEspecial`, que las queries públicas de Convex
 * (`publishedCatalog` / `getPublicByItem` / `getByItem`) denormalizan sobre cada
 * fila. El campo VIENE SOLO SI LA PROMOCIÓN ESTÁ VIGENTE: aquí nunca se parsea
 * texto ni se calcula vencimiento — si el objeto llega, se muestra; si es
 * `undefined`, este componente no renderiza nada.
 *
 * Dos densidades sobre el MISMO Badge del design system (§DS3: el Badge es el
 * único chip de estado, y nunca comunica por color solo):
 *   - `compact` → la tarjeta del grid, donde el espacio es escaso: chip corto
 *     ("Precio especial") con la frase completa —motivo + vencimiento— en el
 *     `aria-label` (lector de pantalla) y en el `title` (hover de escritorio).
 *   - por defecto → la ficha del producto: la etiqueta completa que escribió el
 *     equipo + una línea con la vigencia, visible para todo el mundo.
 *
 * Tono de marca: esto es una cortesía por temporada en una casa de esmeraldas
 * finas, no un remate. El texto de cara al cliente sale de `etiqueta` (dato) y
 * las palabras que agregamos aquí se limitan a la vigencia.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { CalendarClock } from 'lucide-react';
import { Badge } from '../../design-system';
import type { PrecioEspecial } from '../../types';

export interface PrecioEspecialBadgeProps {
  /** El flag que viene del catálogo. Ausente = no hay promoción vigente. */
  precioEspecial?: PrecioEspecial | null;
  /** Densidad de tarjeta: chip corto + vigencia accesible (no visible). */
  compact?: boolean;
  className?: string;
  /** Passthrough al chip (p. ej. bajarle la altura sobre una foto). */
  style?: React.CSSProperties;
}

/** Etiqueta corta para la tarjeta, donde la etiqueta completa no cabe. */
const ETIQUETA_CORTA = 'Precio especial';

/**
 * "2026-08-31" → "31 de agosto" (o "31 de agosto de 2027" cuando cae en otro
 * año que el actual, para que la fecha nunca quede ambigua).
 *
 * La fecha se ancla al mediodía LOCAL a propósito: `new Date('2026-08-31')` se
 * interpreta como medianoche UTC y en Colombia (UTC-5) retrocedería un día.
 * Devuelve `null` si la fecha no es parseable, y entonces el componente
 * simplemente omite la línea de vigencia en vez de imprimir "Invalid Date".
 */
export function formatVigencia(hasta: string, ahora: Date = new Date()) {
  const fecha = new Date(`${hasta}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return null;
  const mismoAno = fecha.getFullYear() === ahora.getFullYear();
  return fecha.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    ...(mismoAno ? {} : { year: 'numeric' }),
  });
}

export function PrecioEspecialBadge({
  precioEspecial,
  compact = false,
  className,
  style,
}: PrecioEspecialBadgeProps) {
  if (!precioEspecial) return null;

  const vigencia = formatVigencia(precioEspecial.hasta);
  const vigenciaLarga = vigencia ? `hasta el ${vigencia}` : null;
  // Frase completa: es el nombre accesible en la tarjeta y el `title` en ambas
  // densidades, así el motivo y el vencimiento viajan siempre juntos.
  const fraseCompleta = [precioEspecial.etiqueta, vigenciaLarga]
    .filter(Boolean)
    .join(', ');

  if (compact) {
    return (
      // El chip se acorta por espacio, pero el lector de pantalla (y el hover
      // de escritorio) reciben la promoción completa, no solo "Precio
      // especial". `role="img"` hace que el conjunto se anuncie UNA vez con
      // `aria-label` en lugar de leer también el texto corto de adentro.
      <Box
        component="span"
        role="img"
        aria-label={fraseCompleta}
        className={className}
        title={fraseCompleta}
        sx={{ display: 'inline-flex', maxWidth: '100%' }}
      >
        <Badge
          tone="accent"
          icon={<CalendarClock />}
          label={ETIQUETA_CORTA}
          style={style}
        />
      </Box>
    );
  }

  return (
    <Box className={className} title={fraseCompleta} style={style}>
      <Badge
        tone="accent"
        icon={<CalendarClock />}
        label={precioEspecial.etiqueta}
      />
      {vigenciaLarga && (
        <Typography
          sx={{
            mt: '6px',
            fontFamily: 'var(--tm-font-ui)',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            color: 'var(--tm-muted)',
          }}
        >
          Vigente {vigenciaLarga}
        </Typography>
      )}
    </Box>
  );
}

export default PrecioEspecialBadge;
