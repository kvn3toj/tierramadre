/**
 * PortfolioStats Component
 *
 * Shows 4 stat cards: Total Products, Gems, Jewelry, Available Value.
 * Reuses StatItem with "stacked" variant.
 */

import { useMemo } from 'react';
import { Box, alpha } from '@mui/material';
import { Package, Gem, Crown, DollarSign } from 'lucide-react';
import { StatItem } from '../../../components/ambassador/StatItem';
import { emeraldCore, goldAccent, radius } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useCurrencyFormat } from '../../../contexts/CurrencyContext';
import { SectionHeading } from './SectionHeading';
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
    const disponible = products.filter(
      (p) => p.effectiveEstado === 'DISPONIBLE',
    );
    const looseCount = products.filter((p) => !p.isJewelry).length;
    const jewelryCount = products.filter((p) => p.isJewelry).length;
    const totalValue = disponible.reduce(
      (sum, p) => sum + (p.precioCOP || 0),
      0,
    );

    return {
      total: products.length,
      looseCount,
      jewelryCount,
      totalValue,
      disponibleCount: disponible.length,
    };
  }, [treasure, asesorName]);

  return (
    <Box>
      <SectionHeading>{t.profile.portfolio}</SectionHeading>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: 1,
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
            bgcolor: alpha(emeraldCore.primary, 0.06),
            border: `1px solid ${alpha(emeraldCore.primary, 0.12)}`,
          }}
        >
          <StatItem
            icon={<Gem size={16} />}
            value={String(stats.looseCount)}
            label={t.profile.gems}
            color={emeraldCore.primary}
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
            bgcolor: alpha(emeraldCore.primary, 0.06),
            border: `1px solid ${alpha(emeraldCore.primary, 0.12)}`,
          }}
        >
          <StatItem
            icon={<DollarSign size={16} />}
            value={formatCurrency(stats.totalValue)}
            label={t.profile.availableValue}
            color={emeraldCore.primary}
            variant="stacked"
          />
        </Box>
      </Box>
    </Box>
  );
}
