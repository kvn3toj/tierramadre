/**
 * ManageFavoritesView Component
 * Allows ambassador to curate favorites: add/remove/reorder.
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  alpha,
  useTheme,
} from '@mui/material';
import { ArrowLeft, Search, X, Plus } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { useLanguage } from '../../../../contexts/LanguageContext';
import {
  emeraldCore,
  blurValues,
  surfacesLight,
  surfacesDark,
  semanticColors,
} from '../../../../design-system';
import ProgressiveImage from '../../../../components/shared/ProgressiveImage';
import type { TreasureItem } from '../../../../types';

interface ManageFavoritesViewProps {
  allProducts: TreasureItem[];
  favoriteIds: string[];
  onBack: () => void;
  onAddFavorite: (itemId: string) => void;
  onRemoveFavorite: (itemId: string) => void;
  onReorderFavorites: (newOrder: string[]) => void;
}

export function ManageFavoritesView({
  allProducts,
  favoriteIds,
  onBack,
  onAddFavorite,
  onRemoveFavorite,
  onReorderFavorites,
}: ManageFavoritesViewProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const isLight = theme.palette.mode === 'light';
  const [searchQuery, setSearchQuery] = useState('');

  // O(1) lookup map instead of O(n) find() per item
  const productMap = useMemo(() => {
    const map = new Map<string, TreasureItem>();
    for (const p of allProducts) {
      map.set(String(p.item), p);
    }
    return map;
  }, [allProducts]);

  const favoriteItems = useMemo(() => {
    return favoriteIds
      .map(id => productMap.get(id))
      .filter(Boolean) as TreasureItem[];
  }, [favoriteIds, productMap]);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const availableItems = useMemo(() => {
    let items = allProducts.filter(p => !favoriteIdSet.has(String(p.item)));
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        String(p.item).includes(query)
      );
    }
    return items.slice(0, 20);
  }, [allProducts, favoriteIdSet, searchQuery]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <IconButton
          onClick={onBack}
          aria-label={t.actions.back}
          sx={{
            bgcolor: isLight ? alpha('#000', 0.04) : alpha('#fff', 0.06),
            backdropFilter: `blur(${blurValues.md})`,
            width: 36,
            height: 36,
          }}
        >
          <ArrowLeft size={18} />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', flex: 1 }}>
          {t.ambassador.museum?.manageFavorites ?? 'Administrar Favoritas'}
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={onBack}
          sx={{
            bgcolor: emeraldCore.primary,
            '&:hover': { bgcolor: emeraldCore.dark },
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.78rem',
            borderRadius: 2,
          }}
        >
          {t.ambassador.museum?.done ?? 'Listo'}
        </Button>
      </Box>

      {/* Selected Favorites */}
      <Typography
        sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        {t.ambassador.museum?.selected ?? 'Seleccionadas'} ({favoriteIds.length})
      </Typography>

      {favoriteItems.length > 0 ? (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            pb: 1,
            mb: 2.5,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Reorder.Group
            axis="x"
            values={favoriteIds}
            onReorder={onReorderFavorites}
            style={{ display: 'flex', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}
          >
            {favoriteIds.map((id) => {
              const item = productMap.get(id);
              if (!item) return null;
              return (
                <Reorder.Item key={id} value={id} style={{ flexShrink: 0 }}>
                  <Box
                    sx={{
                      position: 'relative',
                      width: 64,
                      cursor: 'grab',
                      '&:active': { cursor: 'grabbing' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '2px solid',
                        borderColor: emeraldCore.primary,
                      }}
                    >
                      <ProgressiveImage
                        src={item.thumbnailUrl || item.imagen}
                        alt={item.nombre}
                        width={64}
                        height={64}
                        layout="thumbnail"
                        quality="eco"
                        enableLQIP={false}
                        showPlaceholderIcon={false}
                      />
                    </Box>
                    <IconButton
                      onClick={() => onRemoveFavorite(id)}
                      aria-label={`${t.actions.delete} ${item.nombre}`}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        bgcolor: semanticColors.error.main,
                        color: semanticColors.error.contrastText,
                        '&:hover': { bgcolor: semanticColors.error.dark },
                        zIndex: 1,
                      }}
                    >
                      <X size={12} />
                    </IconButton>
                    <Typography
                      sx={{
                        fontSize: '0.52rem',
                        textAlign: 'center',
                        mt: 0.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'text.secondary',
                      }}
                    >
                      {item.nombre}
                    </Typography>
                  </Box>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </Box>
      ) : (
        <Box sx={{ py: 3, textAlign: 'center', mb: 2.5 }}>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            {t.ambassador.museum?.addToFavorites ?? 'Agrega esmeraldas a tus favoritas'}
          </Typography>
        </Box>
      )}

      {/* Search Available */}
      <TextField
        fullWidth
        placeholder={t.ambassador.searchCatalog}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={15} style={{ opacity: 0.4 }} />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 1.5,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2.5,
            bgcolor: isLight ? alpha('#000', 0.015) : alpha('#fff', 0.025),
            fontSize: '0.82rem',
          },
        }}
      />

      {/* Available Products */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {availableItems.map((item) => (
          <Box
            key={item.item}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: 2,
              border: '1px solid',
              borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
            }}
          >
            <Box sx={{ width: 44, height: 44, borderRadius: 1.5, overflow: 'hidden', flexShrink: 0 }}>
              <ProgressiveImage
                src={item.thumbnailUrl || item.imagen}
                alt={item.nombre}
                width={44}
                height={44}
                layout="thumbnail"
                quality="eco"
                enableLQIP={false}
                showPlaceholderIcon={false}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.nombre}
              </Typography>
              <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                #{item.item}
              </Typography>
            </Box>
            <IconButton
              onClick={() => onAddFavorite(String(item.item))}
              aria-label={`${t.actions.add} ${item.nombre}`}
              size="small"
              sx={{
                width: 30,
                height: 30,
                bgcolor: alpha(emeraldCore.primary, 0.1),
                color: emeraldCore.primary,
                '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.2) },
              }}
            >
              <Plus size={16} />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default ManageFavoritesView;
