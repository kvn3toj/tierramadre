/**
 * PortfolioStats Component
 *
 * Shows 4 stat cards: Total Products, Gems, Jewelry, Available Value.
 * Reuses StatItem with "stacked" variant.
 */

import { useMemo } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { Package, Gem, Crown, DollarSign } from 'lucide-react';
import { StatItem } from '../../../components/ambassador/StatItem';
import { emeraldCore, goldAccent, accentColors, iosTypographyScale, primitiveSpacing as spacing, radius } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useCurrencyFormat } from '../../../contexts/CurrencyContext';
import type { TreasureItem } from '../../../types';
import { getAsesorProducts } from '../../../utils/asesorProductOwnership';

interface PortfolioStatsProps {
  asesorName: string;
  treasure: TreasureItem[];
}

export function PortfolioStats({ asesorName, treasure }: PortfolioStatsProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrencyFormat();

  const stats = useMemo(() => {
    const products = getAsesorProducts(treasure, asesorName);
    const disponible = products.filter(p => p.effectiveEstado === 'DISPONIBLE');
    const looseCount = products.filter(p => !p.isJewelry).length;
    const jewelryCount = products.filter(p => p.isJewelry).length;
    const totalValue = disponible.reduce((sum, p) => sum + (p.precioCOP || 0), 0);

    return {
      total: products.length,
      looseCount,
      jewelryCount,
      totalValue,
      disponibleCount: disponible.length,
    };
  }, [treasure, asesorName]);

  return (
    <Box sx={{ mb: spacing.md }}>
      <Typography
        variant="overline"
        sx={{
          fontSize: iosTypographyScale.caption2,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          mb: 1,
          display: 'block',
          px: spacing.xs,
        }}
      >
        {t.profile.portfolio.toUpperCase()}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: spacing.xs,
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: radius.md,
            bgcolor: alpha(emeraldCore.primary, 0.06),
            border: `1px solid ${alpha(emeraldCore.primary, 0.12)}`,
          }}
        >
          <StatItem
            icon={<Package size={16} />}
            value={String(stats.total)}
            label={t.profile.totalProducts}
            color={emeraldCore.primary}
            variant="stacked"
          />
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: radius.md,
            bgcolor: alpha(accentColors.info.light, 0.06),
            border: `1px solid ${alpha(accentColors.info.light, 0.12)}`,
          }}
        >
          <StatItem
            icon={<Gem size={16} />}
            value={String(stats.looseCount)}
            label={t.profile.gems}
            color={accentColors.info.light}
            variant="stacked"
          />
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: radius.md,
            bgcolor: alpha(goldAccent.primary, 0.06),
            border: `1px solid ${alpha(goldAccent.primary, 0.12)}`,
          }}
        >
          <StatItem
            icon={<Crown size={16} />}
            value={String(stats.jewelryCount)}
            label={t.profile.jewelry}
            color={goldAccent.primary}
            variant="stacked"
          />
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: radius.md,
            bgcolor: alpha(accentColors.success.light, 0.06),
            border: `1px solid ${alpha(accentColors.success.light, 0.12)}`,
          }}
        >
          <StatItem
            icon={<DollarSign size={16} />}
            value={formatCurrency(stats.totalValue)}
            label={t.profile.availableValue}
            color={accentColors.success.light}
            variant="stacked"
          />
        </Box>
      </Box>
    </Box>
  );
}
