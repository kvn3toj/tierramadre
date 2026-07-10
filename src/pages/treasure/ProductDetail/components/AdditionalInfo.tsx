/**
 * AdditionalInfo Component
 * Additional product information including admin-only fields and QR code.
 */

import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { MapPin, User, Calendar, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { TreasureItem } from '../../../../types';
import { emeraldCore } from '../../../../design-system/tokens/colors';
import { SpecRow } from './SpecRow';

// Base URL for the Tierra Madre Studio app
const STUDIO_BASE_URL = 'https://tierramadre.app';

interface AdditionalInfoProps {
  product: TreasureItem;
  isAdmin: boolean;
}

export const AdditionalInfo: React.FC<AdditionalInfoProps> = ({
  product,
  isAdmin,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const secondaryTextColor = isLight
    ? 'rgba(60, 60, 67, 0.6)'
    : 'rgba(235, 235, 245, 0.6)';

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
        Información Adicional
      </Typography>

      {/* Admin-only fields: Location, Advisor, Date — meaningless for a
          grouped lote/sublote bundle card (isLote), which has no single
          ubicación/asesor/fecha, so they're omitted rather than shown blank. */}
      {isAdmin && !product.isLote && (
        <>
          <SpecRow
            icon={<MapPin size={18} />}
            label="Ubicación"
            value={product.ubicacion}
          />
          <SpecRow
            icon={<User size={18} />}
            label="Asesor"
            value={product.asesor}
          />
          <SpecRow
            icon={<Calendar size={18} />}
            label="Fecha de Ingreso"
            value={product.fechaIngreso}
          />
        </>
      )}

      {/* QR Code Row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 36,
          py: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: secondaryTextColor,
          }}
        >
          <QrCode size={18} />
          <Typography
            sx={{ fontSize: '15px', color: theme.palette.text.primary }}
          >
            Código QR
          </Typography>
        </Box>
        <Paper
          elevation={0}
          sx={{
            p: 1,
            borderRadius: 1.5,
            bgcolor: '#FFFFFF',
            display: 'inline-block',
          }}
        >
          <QRCodeSVG
            value={
              // A lote/sublote bundle card's `item` is a synthetic hash key
              // (mapGroupToTreasureItem), not a real productInventory.itemId —
              // scanning it against products.getByItem would always miss.
              // Route bundles through /grupo/:groupId instead, which resolves
              // via the same real id ProductDetailPage already uses to load them.
              product.isLote && product.groupId
                ? `${STUDIO_BASE_URL}/grupo/${product.groupId}`
                : `${STUDIO_BASE_URL}/product/${product.item}`
            }
            size={56}
            level="H"
            fgColor={emeraldCore.darkest}
            bgColor="#FFFFFF"
            style={{ display: 'block' }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default AdditionalInfo;
