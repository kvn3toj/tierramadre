/**
 * VirtualGrid Component
 * Wrapper for virtualized grid rendering.
 * Uses standard MUI Grid for now with pagination for performance.
 * Future: integrate react-window for windowed rendering.
 */
import React from 'react';
import { Box } from '@mui/material';
import { InventoryItem, TrustScoreBreakdown } from '../../types';

interface VirtualGridProps {
  items: InventoryItem[];
  trustScores: Map<number, TrustScoreBreakdown>;
  favorites: number[];
  onItemClick: (item: InventoryItem) => void;
  onCertClick: (item: InventoryItem) => void;
  onToggleFavorite: (itemId: number) => void;
  renderCard: (props: {
    item: InventoryItem;
    trustScore: TrustScoreBreakdown;
    isFavorite: boolean;
    onItemClick: () => void;
    onCertClick: () => void;
    onToggleFavorite: () => void;
  }) => React.ReactNode;
}

/**
 * VirtualGrid renders items using the provided renderCard function.
 * Currently uses CSS Grid with pagination for performance.
 */
export default function VirtualGrid({
  items,
  trustScores,
  favorites,
  onItemClick,
  onCertClick,
  onToggleFavorite,
  renderCard,
}: VirtualGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 2.5,
      }}
    >
      {items.map((item) => {
        const trustScore = trustScores.get(item.item) || {
          provenance: 0,
          quality: 0,
          aesthetic: 0,
          market: 0,
          overall: 0,
        };
        const isFavorite = favorites.includes(item.item);

        return (
          <Box key={item.item}>
            {renderCard({
              item,
              trustScore,
              isFavorite,
              onItemClick: () => onItemClick(item),
              onCertClick: () => onCertClick(item),
              onToggleFavorite: () => onToggleFavorite(item.item),
            })}
          </Box>
        );
      })}
    </Box>
  );
}
