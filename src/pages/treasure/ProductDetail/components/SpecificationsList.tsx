/**
 * SpecificationsList Component
 * iOS HIG-style list of product specifications.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  Palette,
  Gem,
  Ruler,
  Award,
  Hash,
  Diamond,
  Box as BoxIcon,
  Layers,
  Sparkles,
  Star,
} from 'lucide-react';
import { TreasureItem } from '../../../../types';
import { SpecRow } from './SpecRow';
import { formatWeightLabel } from '../../../../utils/formatting';
import { formatMedidas } from '../medidas';

interface SpecificationsListProps {
  product: TreasureItem;
}

export const SpecificationsList: React.FC<SpecificationsListProps> = ({
  product,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const secondaryTextColor = isLight
    ? 'rgba(60, 60, 67, 0.6)'
    : 'rgba(235, 235, 245, 0.6)';

  // Derived from the shared helper so a peso of 0 (joyas, insumos,
  // unweighed pieces) no longer opens a "0.00 ct" row. `typeof peso ===
  // "number"` admitted 0 and was the source of that bug.
  const gemWeightLabel = formatWeightLabel(product, {
    jewelryPrefers: 'carats',
  });
  const hasGemWeight = gemWeightLabel !== '';
  const hasTalla =
    product.talla &&
    product.talla !== '-' &&
    product.talla !== '0' &&
    String(product.talla) !== '0';
  // Shared with the gem sheet so both surfaces resolve the medidas/medidasValores
  // split identically — including skipping a bare format label ("Largo x Ancho"),
  // which the old `medidasValores || medidas` precedence would happily render.
  const formattedMedidas = formatMedidas(product) ?? '';
  const hasMedidas = formattedMedidas !== '';
  // Trimmed to match `isEmptySpecValue` in SpecRow. A whitespace-only
  // value would otherwise pass Boolean(), draw a divider, and then be
  // dropped by the row itself — leaving an orphaned separator line.
  const hasMaterial = Boolean(product.metalType?.trim());
  const hasColeccion = Boolean(product.coleccion?.trim());

  // ── Fotosíntesis gem-grade fields (absent-safe) ──
  const tipoEsmeralda = product.tipoEsmeralda?.trim();
  // Only show "Tipo" when it adds info beyond the categoría already shown in
  // the header (the capture flow often mirrors categoría = tipoEsmeralda).
  const hasTipo =
    Boolean(tipoEsmeralda) &&
    tipoEsmeralda!.toLowerCase() !==
      (product.categoria ?? '').trim().toLowerCase();
  const hasRareza =
    typeof product.nivelRareza === 'number' &&
    Number.isFinite(product.nivelRareza) &&
    product.nivelRareza > 0;
  const hasCalificacion =
    typeof product.calificacion === 'number' &&
    Number.isFinite(product.calificacion) &&
    product.calificacion > 0;

  // Build group 2 rows to determine visibility
  const group2Rows = [
    hasMaterial,
    product.isJewelry && hasGemWeight, // Peso for jewelry (total piece weight)
    product.isJewelry && hasTalla, // Talla (ring size) for jewelry
    false, // Longitud - future field
  ];
  const hasGroup2 = group2Rows.some(Boolean);

  return (
    <Box sx={{ mb: 2 }}>
      {/* === Group 1: Gem Specifications === */}
      <Typography
        sx={{
          fontSize: '13px',
          fontWeight: 600,
          color: secondaryTextColor,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          mb: 0.5,
        }}
      >
        Especificaciones
      </Typography>

      {/* Gema (Ct) */}
      {hasGemWeight && (
        <SpecRow
          icon={<Gem size={18} />}
          label="Gema (Ct)"
          value={gemWeightLabel}
        />
      )}

      {/* Color */}
      <SpecRow
        icon={<Palette size={18} />}
        label="Color"
        value={product.color}
      />

      {/* Calidad */}
      <SpecRow
        icon={<Award size={18} />}
        label="Calidad"
        value={product.calidad}
      />

      {/* Tipo (Fotosíntesis) */}
      {hasTipo && (
        <SpecRow icon={<Gem size={18} />} label="Tipo" value={tipoEsmeralda!} />
      )}

      {/* Rareza (Fotosíntesis) */}
      {hasRareza && (
        <SpecRow
          icon={<Sparkles size={18} />}
          label="Rareza"
          value={product.nivelRareza}
        />
      )}

      {/* Calificación (Fotosíntesis) */}
      {hasCalificacion && (
        <SpecRow
          icon={<Star size={18} />}
          label="Calificación"
          value={product.calificacion}
        />
      )}

      {/* Corte */}
      {hasTalla && !product.isJewelry && (
        <SpecRow
          icon={<Diamond size={18} />}
          label="Corte"
          value={product.talla!}
        />
      )}

      {/* Cantidad */}
      {product.cantidad > 0 && (
        <SpecRow
          icon={<Hash size={18} />}
          label="Cantidad"
          value={product.cantidad}
        />
      )}

      {/* Medida */}
      {hasMedidas && (
        <SpecRow
          icon={<Ruler size={18} />}
          label="Medida"
          value={formattedMedidas}
          showBorder={hasGroup2 || hasColeccion}
        />
      )}

      {/* === Group 2: Physical / Jewelry Specifications === */}
      {hasGroup2 && (
        <Box sx={{ mt: 1.5 }}>
          {/* Material */}
          {hasMaterial && (
            <SpecRow
              icon={<BoxIcon size={18} />}
              label="Material"
              value={product.metalType!}
            />
          )}

          {/* Talla (ring size for jewelry) */}
          {product.isJewelry && hasTalla && (
            <SpecRow
              icon={<Ruler size={18} />}
              label="Talla"
              value={product.talla!}
              showBorder={hasColeccion}
            />
          )}
        </Box>
      )}

      {/* Collection Row */}
      {hasColeccion && (
        <SpecRow
          icon={<Layers size={18} />}
          label="Colección"
          value={product.coleccion!.replace(/^COLECCION\b/i, 'COLECCIÓN')}
          showBorder={false}
        />
      )}
    </Box>
  );
};

export default SpecificationsList;
