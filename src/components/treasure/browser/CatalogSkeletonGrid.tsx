/**
 * CatalogSkeletonGrid — the catalog's initial-load state.
 * Geometry-matched to PieceCard (well + name/spec/price lines) so the swap
 * to real content is CLS≈0, per the anti-blinking rules in CLAUDE.md.
 */
import { Box } from '@mui/material';
import { Card, Skeleton } from '../../../design-system';

function CatalogCardSkeleton() {
  return (
    <Card variant="outlined">
      <Box sx={{ aspectRatio: '1 / 1', width: '100%' }}>
        <Skeleton variant="rect" width="100%" height="100%" />
      </Box>
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="45%" height={12} />
        <Skeleton variant="text" width="35%" height={16} />
      </Box>
    </Card>
  );
}

export default function CatalogSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 2,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CatalogCardSkeleton key={i} />
      ))}
    </Box>
  );
}
