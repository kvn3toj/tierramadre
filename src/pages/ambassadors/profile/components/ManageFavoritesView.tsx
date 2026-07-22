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
  InputAdornment,
} from '@mui/material';
import { ArrowLeft, Search, X, Plus, Pencil } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { TextField } from '../../../../design-system';
import ProgressiveImage from '../../../../components/shared/ProgressiveImage';
import type { TreasureItem } from '../../../../types';
import { useAmbassadorOverrides } from '../../../../hooks/useAmbassadorOverrides';
import { EditProductOverrideDialog } from './EditProductOverrideDialog';

interface ManageFavoritesViewProps {
  allProducts: TreasureItem[];
  favoriteIds: string[];
  onBack: () => void;
  onAddFavorite: (itemId: string) => void;
  onRemoveFavorite: (itemId: string) => void;
  onReorderFavorites: (newOrder: string[]) => void;
  /** Slug of the ambassador whose collection is being managed. */
  asesorSlug?: string;
}

export function ManageFavoritesView({
  allProducts,
  favoriteIds,
  onBack,
  onAddFavorite,
  onRemoveFavorite,
  onReorderFavorites,
  asesorSlug,
}: ManageFavoritesViewProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // T4: per-ambassador overrides (custom name / price)
  const { getOverride, setOverride, clearOverride } = useAmbassadorOverrides(asesorSlug);
  const [editingProduct, setEditingProduct] = useState<TreasureItem | null>(null);

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
            bgcolor: 'var(--tm-well)',
            border: '1px solid var(--tm-border)',
            color: 'var(--tm-text)',
            width: 44,
            height: 44,
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
            bgcolor: 'var(--tm-accent-strong)',
            color: 'var(--tm-on-accent)',
            '&:hover': { bgcolor: 'var(--tm-accent)' },
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.78rem',
            borderRadius: 'var(--tm-radius-control)',
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
                      width: 96,
                      cursor: 'grab',
                      '&:active': { cursor: 'grabbing' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 96,
                        height: 96,
                        borderRadius: 'var(--tm-radius-well)',
                        overflow: 'hidden',
                        bgcolor: 'var(--tm-well)',
                        border: '1px solid',
                        // An override is announced on the well itself rather
                        // than by a ring on a 20px button.
                        borderColor: getOverride(id)
                          ? 'var(--tm-accent)'
                          : 'var(--tm-border)',
                      }}
                    >
                      <ProgressiveImage
                        src={item.thumbnailUrl || item.imagen}
                        alt={item.nombre}
                        width={96}
                        height={96}
                        layout="thumbnail"
                        quality="eco"
                        enableLQIP={false}
                        showPlaceholderIcon={false}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.6875rem',
                        textAlign: 'center',
                        mt: 0.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--tm-muted)',
                      }}
                    >
                      {item.nombre}
                    </Typography>
                    {/* Actions sit below the piece, at full target size and
                        8px apart, so the destructive one is no longer a 20px
                        neighbour of the edit control. */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 1,
                        mt: 0.5,
                      }}
                    >
                      {asesorSlug && (
                        <IconButton
                          onClick={() => setEditingProduct(item)}
                          aria-label={`Editar nombre y precio de ${item.nombre}`}
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--tm-radius-control)',
                            border: '1px solid var(--tm-border)',
                            color: 'var(--tm-muted)',
                            '&:hover': {
                              color: 'var(--tm-accent)',
                              borderColor: 'var(--tm-accent)',
                            },
                          }}
                        >
                          <Pencil size={16} />
                        </IconButton>
                      )}
                      <IconButton
                        onClick={() => onRemoveFavorite(id)}
                        aria-label={`${t.actions.delete} ${item.nombre}`}
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 'var(--tm-radius-control)',
                          border: '1px solid var(--tm-border)',
                          color: 'var(--tm-muted)',
                          '&:hover': {
                            color: 'var(--tm-danger)',
                            borderColor: 'var(--tm-danger)',
                          },
                        }}
                      >
                        <X size={16} />
                      </IconButton>
                    </Box>
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
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={15} style={{ opacity: 0.4 }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1.5 }}
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
              borderRadius: 'var(--tm-radius-control)',
              border: '1px solid',
              borderColor: 'var(--tm-border)',
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 'var(--tm-radius-well)',
                bgcolor: 'var(--tm-well)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
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
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                #{item.item}
              </Typography>
            </Box>
            <IconButton
              onClick={() => onAddFavorite(String(item.item))}
              aria-label={`${t.actions.add} ${item.nombre}`}
              size="small"
              sx={{
                width: 44,
                height: 44,
                bgcolor: 'var(--tm-accent-wash)',
                color: 'var(--tm-accent)',
                '&:hover': { bgcolor: 'var(--tm-accent-wash-strong)' },
              }}
            >
              <Plus size={16} />
            </IconButton>
          </Box>
        ))}
      </Box>

      {/* T4: per-ambassador product overrides */}
      <EditProductOverrideDialog
        open={editingProduct !== null}
        product={editingProduct}
        currentOverride={editingProduct ? getOverride(editingProduct.item) : undefined}
        onClose={() => setEditingProduct(null)}
        onSave={(patch) => {
          if (!editingProduct) return;
          const result = setOverride(editingProduct.item, patch, editingProduct);
          if (result.ok) {
            setEditingProduct(null);
          }
        }}
        onClear={() => {
          if (!editingProduct) return;
          clearOverride(editingProduct.item);
          setEditingProduct(null);
        }}
      />
    </Box>
  );
}

export default ManageFavoritesView;
