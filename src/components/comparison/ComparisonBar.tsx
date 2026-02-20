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
  Slide,
  Avatar,
  Tooltip,
  alpha,
} from '@mui/material';
import { Scale, Trash2 } from 'lucide-react';
import { TreasureItem } from '../../types';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import { blurValues, cssTransition } from '../../design-system';

interface ComparisonBarProps {
  selectedItems: TreasureItem[];
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
        elevation={4}
        sx={{
          position: 'fixed',
          bottom: 'calc(72px + env(safe-area-inset-bottom))',
          left: 12,
          right: 12,
          zIndex: 1100,
          py: 1.5,
          px: 2,
          borderRadius: 3,
          bgcolor: isLight
            ? alpha(surfacesLight.background.primary, 0.95)
            : alpha(surfacesDark.background.secondary, 0.95),
          backdropFilter: `blur(${blurValues.md})`,
          border: '1px solid',
          borderColor: isLight
            ? alpha(emeraldCore.primary, 0.2)
            : alpha(emeraldCore.primary, 0.15),
          boxShadow: isLight
            ? '0 4px 20px rgba(0, 0, 0, 0.1)'
            : '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        role="region"
        aria-label="Esmeraldas seleccionadas para comparar"
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {/* Icon + Count */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              flexShrink: 0,
            }}
          >
            <Scale size={20} color={emeraldCore.primary} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                whiteSpace: 'nowrap',
              }}
            >
              {count}/4
            </Typography>
          </Box>

          {/* Selected Items - Compact Avatars */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              gap: 0.5,
              overflow: 'hidden',
            }}
          >
            {selectedItems.map((item) => (
              <Tooltip key={item.item} title={item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim()}>
                <Avatar
                  src={item.thumbnailUrl || item.imagen}
                  sx={{
                    width: 40,
                    height: 40,
                    border: '2px solid',
                    borderColor: emeraldCore.primary,
                    cursor: 'pointer',
                    transition: cssTransition.fast,
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                  onClick={() => onRemove(item.item)}
                >
                  {item.nombre.charAt(0)}
                </Avatar>
              </Tooltip>
            ))}
          </Box>

          {/* Clear Button */}
          <IconButton
            onClick={onClear}
            size="small"
            sx={{
              p: 0.75,
              color: 'text.secondary',
              '&:hover': {
                color: 'error.main',
                bgcolor: alpha('#ef4444', 0.1),
              },
            }}
            aria-label="Limpiar selección"
          >
            <Trash2 size={18} />
          </IconButton>

          {/* Compare Button */}
          <Button
            variant="contained"
            onClick={onCompare}
            disabled={!canCompare}
            size="medium"
            sx={{
              bgcolor: emeraldCore.primary,
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1,
              minWidth: 'auto',
              borderRadius: 2,
              fontSize: '0.875rem',
              '&:hover': { bgcolor: emeraldCore.dark },
              '&:disabled': {
                opacity: 0.45,
              },
            }}
          >
            Comparar
          </Button>
        </Box>
      </Paper>
    </Slide>
  );
}
