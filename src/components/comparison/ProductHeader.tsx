/**
 * ProductHeader Component
 * Neutral header showing product avatars - equal treatment for all items.
 */
import { Box, Avatar, Typography, alpha } from '@mui/material';
import { TreasureItem } from '../../types';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';

interface ProductHeaderProps {
  items: TreasureItem[];
}

export default function ProductHeader({ items }: ProductHeaderProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
        borderBottom: '1px solid',
        borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
        px: 2,
        py: 1.25,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          justifyContent: 'space-around',
        }}
      >
        {items.map((item) => {
          const displayName = item.nombre
            .replace(/^L:.*?\s/, '')
            .replace(/^L:/, '')
            .trim();

          return (
            <Box
              key={item.item}
              sx={{
                textAlign: 'center',
                flex: 1,
                maxWidth: 100,
                minWidth: 70,
              }}
            >
              <Avatar
                src={item.thumbnailUrl || item.imagen}
                alt={displayName}
                sx={{
                  width: 44,
                  height: 44,
                  mx: 'auto',
                  border: '2px solid',
                  borderColor: emeraldCore.primary,
                  bgcolor: alpha(emeraldCore.primary, 0.1),
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                {displayName.charAt(0)}
              </Avatar>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  display: 'block',
                  mt: 0.5,
                  color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.7rem',
                }}
              >
                {displayName}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
