/**
 * PortfolioStats Component
 *
 * Shows 4 stat tiles: Total Products, Gems, Jewelry, Available Value.
 */

import { useMemo } from 'react';
import { Box } from '@mui/material';
import { Package, Gem, Crown, DollarSign } from 'lucide-react';
import { MetricCard } from '../../../design-system';
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
        <MetricCard
          icon={Package}
          value={String(stats.total)}
          label={t.profile.totalProducts}
          compact
        />
        <MetricCard
          icon={Gem}
          value={String(stats.looseCount)}
          label={t.profile.gems}
          compact
        />
        <MetricCard
          icon={Crown}
          value={String(stats.jewelryCount)}
          label={t.profile.jewelry}
          compact
        />
        <MetricCard
          icon={DollarSign}
          value={formatCurrency(stats.totalValue)}
          label={t.profile.availableValue}
          compact
        />
      </Box>
    </Box>
  );
}
