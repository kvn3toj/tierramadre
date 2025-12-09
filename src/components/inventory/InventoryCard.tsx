/**
 * InventoryCard Component
 * Displays an inventory item in either grid or compact list view.
 * Extracted from InventoryBrowser.tsx for better modularity.
 */
import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Card,
  CardContent,
  alpha,
  useTheme,
  IconButton,
  Button,
  Collapse,
  LinearProgress,
} from '@mui/material';
import {
  Gem,
  Crown,
  ChevronDown,
  MapPin,
  User,
  FileCheck,
  Play,
  Images,
} from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { InventoryItem, TrustScoreBreakdown } from '../../types';
import { getColorDot, getQualityBadge } from '../../utils/formatting';
import { getTrustBadge } from '../../utils/trustScore';
import { TrustBadgeCompact } from '../TrustBadge';
import { PriceDisplay } from '../PriceDisplay';

export interface InventoryCardProps {
  item: InventoryItem;
  isCompact: boolean;
  trustScore: TrustScoreBreakdown;
  onCertClick: () => void;
  onClick: () => void;
}

export function InventoryCard({ item, isCompact, trustScore, onCertClick, onClick }: InventoryCardProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [showDetails] = useState(false);

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();
  const quality = getQualityBadge(item.calidad);
  const colorDot = getColorDot(item.color);
  const isLoose = !item.isJewelry;
  const weight = typeof item.peso === 'number' ? `${item.peso} ct` : item.metalType;
  const trustBadge = getTrustBadge(trustScore.overall);

  // Compact list view
  if (isCompact) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2.5,
          bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
          border: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: '#059669',
            bgcolor: isLight ? '#F0FDF4' : alpha('#059669', 0.08),
          },
        }}
        onClick={onClick}
      >
        {/* Color indicator */}
        <Box
          sx={{
            width: 8,
            height: 40,
            borderRadius: 4,
            bgcolor: colorDot,
            flexShrink: 0,
          }}
        />

        {/* Main info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            {item.color} • {weight}
          </Typography>
        </Box>

        {/* Trust Badge - Compact */}
        <TrustBadgeCompact score={trustScore} />

        {/* Quality badge */}
        <Chip
          label={quality.label}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.6875rem',
            fontWeight: 600,
            bgcolor: quality.bg,
            color: quality.color,
            border: `1px solid ${quality.border}`,
          }}
        />

        {/* Price - Dual display */}
        <Box sx={{ minWidth: 100, textAlign: 'right' }}>
          <PriceDisplay price={item.precioCOP} compact />
        </Box>
      </Paper>
    );
  }

  // Grid card view - Simplified
  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
        '&:hover': {
          borderColor: '#10B981',
          transform: 'translateY(-4px)',
          boxShadow: isLight
            ? '0 20px 40px rgba(0, 0, 0, 0.08)'
            : '0 20px 40px rgba(0, 0, 0, 0.3)',
          '& .price-text': {
            color: '#10B981',
          },
        },
      }}
    >
      {/* Product Image/Video Section */}
      {item.imagen ? (
        <Box
          sx={{
            height: 140,
            position: 'relative',
            overflow: 'hidden',
            bgcolor: isLight ? '#F9FAFB' : '#292524',
          }}
        >
          {item.mediaType === 'video' ? (
            // Video with thumbnail and play icon
            <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
              <img
                src={item.thumbnailUrl || item.imagen}
                alt={item.nombre}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={24} color="white" fill="white" />
              </Box>
            </Box>
          ) : (
            // Image
            <img
              src={item.imagen}
              alt={item.nombre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Gallery count badge if multiple media items */}
          {(item.galleryCount ?? 0) > 1 && (
            <Chip
              icon={<Images size={14} />}
              label={item.galleryCount}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 600,
                height: 24,
                '& .MuiChip-icon': {
                  color: 'white',
                },
              }}
            />
          )}
        </Box>
      ) : (
        // Placeholder for items without media
        <Box
          sx={{
            height: 80,
            bgcolor: isLight ? '#F9FAFB' : '#292524',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Gem size={32} color={isLight ? '#D1D5DB' : '#52525B'} />
        </Box>
      )}

      {/* Minimal header - Small accent bar + icon */}
      <Box
        sx={{
          height: 56,
          bgcolor: isLight ? '#FAFAF9' : '#292524',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          borderBottom: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        }}
      >
        {/* Colored accent bar on left */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: colorDot,
          }}
        />

        {/* Icon based on type */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
            border: '1px solid',
            borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
          }}
        >
          {item.isJewelry ? (
            <Crown size={18} color={isLight ? '#78716C' : '#A8A29E'} />
          ) : (
            <Gem size={18} color={colorDot} />
          )}
        </Box>

        {/* Color tag with dot */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            borderRadius: 1.5,
            bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
            border: '1px solid',
            borderColor: isLight ? '#E5E7EB' : '#3C3C3E',
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: colorDot,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              color: theme.palette.text.secondary,
              fontSize: '0.7rem',
            }}
          >
            {item.color.replace('Verde ', '')}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Item count if multiple */}
        {item.cantidad > 1 && (
          <Chip
            label={`×${item.cantidad}`}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: isLight ? '#1C1917' : '#FAFAF9',
              color: isLight ? '#FAFAF9' : '#1C1917',
              mr: 1,
            }}
          />
        )}

        {/* Quality badge - warm tones */}
        <Chip
          label={quality.label}
          size="small"
          sx={{
            height: 22,
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            bgcolor: quality.bg,
            color: quality.color,
            border: `1px solid ${quality.border}`,
          }}
        />
      </Box>

      <CardContent sx={{ p: 2.5 }}>
        {/* Name */}
        <Typography
          variant="body1"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 0.5,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </Typography>

        {/* Key specs - single line */}
        <Typography
          variant="body2"
          component="div"
          sx={{
            color: theme.palette.text.secondary,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: colorDot,
            }}
          />
          {item.color}
          {isLoose && typeof item.peso === 'number' && (
            <>
              <Box sx={{ color: '#D1D5DB' }}>•</Box>
              {item.peso} ct
            </>
          )}
          {item.isJewelry && item.metalType && (
            <>
              <Box sx={{ color: '#D1D5DB' }}>•</Box>
              {item.metalType}
            </>
          )}
        </Typography>

        {/* Price - Black with green on hover */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <Box className="price-text" sx={{ flex: 1 }}>
            <PriceDisplay price={item.precioCOP} compact />
          </Box>

          <IconButton
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <ChevronDown size={18} />
          </IconButton>
        </Box>

        {/* Expandable details - Progressive disclosure */}
        <Collapse in={showDetails}>
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid',
              borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  Calidad
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                  {item.calidad}
                </Typography>
              </Box>

              {item.talla && item.talla !== '-' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    {item.isJewelry ? 'Talla' : 'Corte'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                    {item.talla}
                  </Typography>
                </Box>
              )}

              {item.medidas && item.medidas !== '-' && item.medidas !== 'Anillo' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    Medidas
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
                    {item.medidas}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <MapPin size={12} color="#9CA3AF" />
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {item.ubicacion}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <User size={12} color="#9CA3AF" />
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  {item.asesor}
                </Typography>
              </Box>

              {/* Product Certification Section */}
              <Box
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    Certificación del Producto
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: trustBadge.color }}
                  >
                    {trustScore.overall}/100
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: '0.65rem',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Autenticidad de la esmeralda (no del vendedor)
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={trustScore.overall}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(trustBadge.color, 0.15),
                    mb: 1.5,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: trustBadge.color,
                      borderRadius: 3,
                    },
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileCheck size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCertClick();
                  }}
                  sx={{
                    width: '100%',
                    borderColor: '#059669',
                    color: '#059669',
                    fontSize: '0.75rem',
                    py: 0.5,
                    '&:hover': {
                      bgcolor: alpha('#059669', 0.08),
                      borderColor: '#047857',
                    },
                  }}
                >
                  Ver Certificaciones
                </Button>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default InventoryCard;
