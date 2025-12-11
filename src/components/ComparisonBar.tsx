/**
 * ComparisonBar Component
 * Sticky bottom bar showing selected items for comparison.
 * Allows users to manage selection and open comparison modal.
 */
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Chip,
  Slide,
  Avatar,
  Tooltip,
  alpha,
} from '@mui/material';
import { X, Scale, Trash2 } from 'lucide-react';
import { InventoryItem } from '../types';
import { useThemeMode } from '../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../design-system/tokens/colors';

interface ComparisonBarProps {
  selectedItems: InventoryItem[];
  onRemove: (itemId: number) => void;
  onClear: () => void;
  onCompare: () => void;
}

export default function ComparisonBar({
  selectedItems,
  onRemove,
  onClear,
  onCompare,
}: ComparisonBarProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const count = selectedItems.length;
  const canCompare = count >= 2;

  return (
    <Slide direction="up" in={count > 0} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          p: 2,
          borderRadius: '16px 16px 0 0',
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
          borderTop: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
        }}
        role="region"
        aria-label="Esmeraldas seleccionadas para comparar"
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 150 }}>
            <Scale size={20} color={emeraldCore.primary} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                Comparar
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {count} de 4 seleccionadas
              </Typography>
            </Box>
          </Box>

          {/* Selected Items */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              py: 0.5,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: isLight ? surfacesLight.border.default : surfacesDark.border.default,
                borderRadius: 2,
              },
            }}
          >
            {selectedItems.map((item) => {
              const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();

              return (
                <Chip
                  key={item.item}
                  avatar={
                    item.imagen ? (
                      <Avatar
                        src={item.thumbnailUrl || item.imagen}
                        alt={displayName}
                        sx={{ width: 28, height: 28 }}
                      />
                    ) : undefined
                  }
                  label={
                    <Box sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {displayName}
                    </Box>
                  }
                  onDelete={() => onRemove(item.item)}
                  deleteIcon={
                    <Tooltip title="Quitar">
                      <X size={14} />
                    </Tooltip>
                  }
                  sx={{
                    bgcolor: alpha(emeraldCore.primary, 0.1),
                    color: emeraldCore.dark,
                    border: '1px solid',
                    borderColor: alpha(emeraldCore.primary, 0.3),
                    '& .MuiChip-deleteIcon': {
                      color: emeraldCore.dark,
                      '&:hover': { color: emeraldCore.darker },
                    },
                    '& .MuiChip-avatar': {
                      border: '2px solid',
                      borderColor: emeraldCore.primary,
                    },
                  }}
                />
              );
            })}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title="Limpiar selección">
              <IconButton
                onClick={onClear}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main' },
                }}
                aria-label="Limpiar selección"
              >
                <Trash2 size={18} />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              onClick={onCompare}
              disabled={!canCompare}
              startIcon={<Scale size={18} />}
              sx={{
                bgcolor: emeraldCore.primary,
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                borderRadius: 2,
                '&:hover': { bgcolor: emeraldCore.dark },
                '&:disabled': {
                  bgcolor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
                  color: 'text.disabled',
                },
              }}
            >
              Comparar {count >= 2 ? `(${count})` : ''}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Slide>
  );
}
