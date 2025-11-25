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
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { Emerald, EmeraldStatus } from '../types';
import { brandColors } from '../theme';

interface EmeraldCardProps {
  emerald: Emerald;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: EmeraldStatus) => void;
  onSelect?: (emerald: Emerald) => void;
  selected?: boolean;
}

const statusColors: Record<EmeraldStatus, string> = {
  available: brandColors.emeraldGreen,
  sold: '#f44336',
  reserved: brandColors.gold,
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
        border: selected ? `2px solid ${brandColors.emeraldGreen}` : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${brandColors.emeraldGreen}20`,
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height="200"
          image={emerald.imageUrl}
          alt={emerald.name}
          sx={{ objectFit: 'cover' }}
        />
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
            bgcolor: 'rgba(0,0,0,0.5)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
          }}
        >
          <MoreIcon fontSize="small" />
        </IconButton>
      </Box>
      <CardContent>
        <Typography
          variant="h6"
          sx={{
            fontFamily: '"Libre Baskerville", serif',
            fontWeight: 700,
            color: brandColors.gold,
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
            />
          )}
          {emerald.lotCode && (
            <Chip
              label={emerald.lotCode}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        {emerald.priceCOP && (
          <Typography
            variant="body2"
            sx={{ mt: 1, color: 'grey.400', fontWeight: 500 }}
          >
            {formatPrice(emerald.priceCOP)}
          </Typography>
        )}
        {emerald.aiDescription && (
          <Typography
            variant="caption"
            color="grey.500"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mt: 1,
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
