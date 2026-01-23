/**
 * SpecificationsList Component
 * iOS HIG-style list of product specifications.
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Palette, Gem, Ruler, Award, Layers } from 'lucide-react';
import { TreasureItem } from '../../../../types';
import { SpecRow } from './SpecRow';

interface SpecificationsListProps {
  product: TreasureItem;
}

export const SpecificationsList: React.FC<SpecificationsListProps> = ({ product }) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const secondaryTextColor = isLight ? 'rgba(60, 60, 67, 0.6)' : 'rgba(235, 235, 245, 0.6)';

  const weight = typeof product.peso === 'number' ? `${product.peso} ct` : product.metalType;

  // Calculate which row is last to not show border
  const hasTalla = product.talla && product.talla !== '-';
  const hasMedidas = product.medidas && product.medidas !== '-' && product.medidas !== 'Anillo';
  const hasColeccion = Boolean(product.coleccion);

  return (
    <Box sx={{ mb: 2 }}>
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

      {/* Color Row */}
      <SpecRow
        icon={<Palette size={18} />}
        label="Color"
        value={product.color}
      />

      {/* Weight Row */}
      <SpecRow
        icon={<Gem size={18} />}
        label={product.isJewelry ? 'Metal' : 'Peso'}
        value={weight}
      />

      {/* Shape/Talla Row */}
      {hasTalla && (
        <SpecRow
          icon={<Ruler size={18} />}
          label={product.isJewelry ? 'Talla' : 'Corte'}
          value={product.talla!}
        />
      )}

      {/* Measurements Row */}
      {hasMedidas && (
        <SpecRow
          icon={<Ruler size={18} />}
          label="Medidas"
          value={
            product.medidasValores
              ? product.medidasValores.replace(/\n/g, ' x ') + ' mm'
              : product.medidas + ' mm'
          }
        />
      )}

      {/* Quality Row */}
      <SpecRow
        icon={<Award size={18} />}
        label="Calidad"
        value={product.calidad}
        showBorder={hasColeccion}
      />

      {/* Collection Row */}
      {hasColeccion && (
        <SpecRow
          icon={<Layers size={18} />}
          label="Coleccion"
          value={product.coleccion!}
          showBorder={false}
        />
      )}
    </Box>
  );
};

export default SpecificationsList;
