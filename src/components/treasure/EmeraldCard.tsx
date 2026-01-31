import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  PlayCircleOutline as VideoIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { Emerald, EmeraldStatus } from '../../types';
import { useThemeMode } from '../../contexts/ThemeContext';
import MediaPreview from '../shared/MediaPreview';
// Design System Tokens
import { emeraldCore, goldAccent, semanticColors, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { cardShadows } from '../../design-system/tokens/shadows';

interface EmeraldCardProps {
  emerald: Emerald;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: EmeraldStatus) => void;
  onSelect?: (emerald: Emerald) => void;
  selected?: boolean;
}

const statusColors: Record<EmeraldStatus, string> = {
  available: emeraldCore.primary,
  sold: semanticColors.error.main,
  reserved: goldAccent.primary,
};

const statusLabels: Record<EmeraldStatus, string> = {
  available: 'Disponible',
  sold: 'Vendido',
  reserved: 'Reservado',
};

export default function EmeraldCard({
  emerald,
  onDelete,
  onStatusChange,
  onSelect,
  selected,
}: EmeraldCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { mode } = useThemeMode();
  const theme = useTheme();
  const isLight = mode === 'light';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete?.(emerald.id);
  };

  const handleStatusChange = (status: EmeraldStatus) => {
    handleMenuClose();
    onStatusChange?.(emerald.id, status);
  };

  const formatPrice = (price?: number) => {
    if (!price) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card
      onClick={() => onSelect?.(emerald)}
      sx={{
        cursor: onSelect ? 'pointer' : 'default',
        border: selected ? `2px solid ${emeraldCore.primary}` : 'none',
        boxShadow: cardShadows.resting,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: cardShadows.emeraldHover,
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {emerald.mediaType === 'video' ? (
          <Box sx={{ height: 200, overflow: 'hidden', bgcolor: 'background.default', position: 'relative' }}>
            <MediaPreview
              mediaUrl={emerald.mediaData}
              mediaType="video"
              thumbnailUrl={emerald.thumbnailUrl}
              alt={emerald.name}
              maxHeight={200}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              controls={false}
              muted
            />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            >
              <VideoIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.8)' }} />
            </Box>
          </Box>
        ) : (
          <CardMedia
            component="img"
            height="200"
            image={emerald.mediaData}
            alt={emerald.name}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            sx={{
              objectFit: 'cover',
              userSelect: 'none',
              WebkitUserDrag: 'none',
              pointerEvents: 'none',
            }}
          />
        )}
        <Chip
          label={statusLabels[emerald.status]}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: statusColors[emerald.status],
            color: 'white',
            fontWeight: 600,
          }}
        />
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            bgcolor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)',
            color: isLight ? '#374151' : '#E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            '&:hover': { bgcolor: isLight ? '#FFFFFF' : 'rgba(0,0,0,0.8)' },
          }}
        >
          <MoreIcon fontSize="small" />
        </IconButton>
      </Box>
      <CardContent sx={{ bgcolor: theme.palette.background.paper }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Libre Baskerville", serif',
            fontWeight: 700,
            color: emeraldCore.primary,
            fontSize: '1rem',
          }}
        >
          {emerald.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          {emerald.weightCarats && (
            <Chip
              label={`${emerald.weightCarats} ct`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
                color: theme.palette.text.primary
              }}
            />
          )}
          {emerald.lotCode && (
            <Chip
              label={emerald.lotCode}
              size="small"
              variant="outlined"
              sx={{
                borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
                color: theme.palette.text.primary
              }}
            />
          )}
        </Box>
        {emerald.priceCOP && (
          <Typography
            variant="body2"
            sx={{ mt: 1, color: theme.palette.text.primary, fontWeight: 600 }}
          >
            {formatPrice(emerald.priceCOP)}
          </Typography>
        )}
        {emerald.aiDescription && (
          <Typography
            variant="caption"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mt: 1,
              color: theme.palette.text.secondary,
            }}
          >
            {emerald.aiDescription}
          </Typography>
        )}
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleStatusChange('available')}>
          <Chip
            label="Disponible"
            size="small"
            sx={{ bgcolor: statusColors.available, color: 'white', mr: 1 }}
          />
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('reserved')}>
          <Chip
            label="Reservado"
            size="small"
            sx={{ bgcolor: statusColors.reserved, color: 'white', mr: 1 }}
          />
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('sold')}>
          <Chip
            label="Vendido"
            size="small"
            sx={{ bgcolor: statusColors.sold, color: 'white', mr: 1 }}
          />
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Eliminar
        </MenuItem>
      </Menu>
    </Card>
  );
}
