/**
 * ComparisonMobileView Component
 * Simplified intelligent comparison with 2-tab structure: Resumen + Detalles
 * Users can select their comparison priority to get personalized recommendations
 */
import { useState } from 'react';
import { Box, Typography, Chip, Tabs, Tab, alpha } from '@mui/material';
import { Sparkles, List, BarChart3, Radar as RadarIcon, TrendingUp, DollarSign, Gem, Award } from 'lucide-react';
import { InventoryItem } from '../../types';
import { useThemeMode } from '../../contexts/ThemeContext';
import { formatCurrency, getColorDot, getQualityBadge } from '../../utils/formatting';
import { surfacesLight, surfacesDark, emeraldCore } from '../../design-system/tokens/colors';
import ProductHeader from './ProductHeader';
import AttributeCard from './AttributeCard';
import RadarChart from './RadarChart';
import ValueMatrix from './ValueMatrix';
import RecommendationCard from './RecommendationCard';
import {
  generateRecommendation,
  RecommendationCriteria,
} from './RecommendationEngine';

interface ComparisonMobileViewProps {
  items: InventoryItem[];
}

type ViewMode = 'summary' | 'details';
type VisualMode = 'radar' | 'matrix';

// Priority options for user selection
type ComparisonPriority = 'best_value' | 'best_investment' | 'largest_size' | 'premium_quality';

const priorityConfig: Record<ComparisonPriority, {
  label: string;
  icon: typeof TrendingUp;
  criteria: RecommendationCriteria;
}> = {
  best_value: {
    label: 'Mejor Valor',
    icon: Gem,
    criteria: 'best_value',
  },
  best_investment: {
    label: 'Inversión',
    icon: TrendingUp,
    criteria: 'best_investment',
  },
  largest_size: {
    label: 'Tamaño',
    icon: DollarSign,
    criteria: 'largest_size',
  },
  premium_quality: {
    label: 'Calidad',
    icon: Award,
    criteria: 'premium_quality',
  },
};

export default function ComparisonMobileView({ items }: ComparisonMobileViewProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [visualMode, setVisualMode] = useState<VisualMode>('radar');
  const [priority, setPriority] = useState<ComparisonPriority>('best_value');

  // Check if any item has price per carat (loose stones)
  const hasLooseStones = items.some(
    (i) => !i.isJewelry && typeof i.peso === 'number' && i.peso > 0
  );

  // Calculate price per carat for display
  const pricePerCarats = items.map((i) => {
    if (!i.isJewelry && typeof i.peso === 'number' && i.peso > 0) {
      return i.precioCOP / i.peso;
    }
    return 0;
  });

  // Generate recommendation based on selected priority
  const currentRecommendation = generateRecommendation(items, priorityConfig[priority].criteria);

  // Helper: Render attribute card by key
  const renderAttribute = (key: string) => {
    switch (key) {
      case 'precio':
        return (
          <AttributeCard
            key="precio"
            label="Precio"
            values={items.map((item) => formatCurrency(item.precioCOP))}
            type="numeric"
          />
        );
      case 'peso':
        return (
          <AttributeCard
            key="peso"
            label="Peso"
            values={items.map((item) =>
              typeof item.peso === 'number'
                ? `${item.peso} ct`
                : item.metalType || '-'
            )}
            type="numeric"
          />
        );
      case 'precioquilate':
        if (!hasLooseStones) return null;
        return (
          <AttributeCard
            key="precioquilate"
            label="Precio/Quilate"
            values={items.map((item, idx) => {
              if (
                item.isJewelry ||
                typeof item.peso !== 'number' ||
                item.peso === 0
              ) {
                return 'N/A';
              }
              return formatCurrency(pricePerCarats[idx]);
            })}
            type="numeric"
          />
        );
      case 'color':
        return (
          <AttributeCard
            key="color"
            label="Color"
            values={items.map((item) => (
              <Box
                key={item.item}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: getColorDot(item.color),
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '0.7rem' }}>{item.color}</span>
              </Box>
            ))}
            type="color"
          />
        );
      case 'calidad':
        return (
          <AttributeCard
            key="calidad"
            label="Calidad"
            values={items.map((item) => {
              const quality = getQualityBadge(item.calidad);
              return (
                <Chip
                  key={item.item}
                  label={quality.label}
                  size="small"
                  sx={{
                    bgcolor: quality.bg,
                    color: quality.color,
                    border: `1px solid ${quality.border}`,
                    fontWeight: 600,
                    fontSize: '0.6rem',
                    height: 20,
                  }}
                />
              );
            })}
            type="badge"
          />
        );
      case 'talla':
        return (
          <AttributeCard
            key="talla"
            label="Talla/Corte"
            values={items.map((item) => item.talla || '-')}
            type="text"
          />
        );
      case 'medidas':
        return (
          <AttributeCard
            key="medidas"
            label="Medidas"
            values={items.map((item) => item.medidasValores || item.medidas || '-')}
            type="text"
          />
        );
      default:
        return null;
    }
  };

  // All attributes for details view
  const allAttributes = ['precio', 'peso', 'precioquilate', 'color', 'calidad', 'talla', 'medidas'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sticky Product Header */}
      <ProductHeader items={items} />

      {/* 2-Tab Structure */}
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
          bgcolor: isLight
            ? surfacesLight.background.primary
            : surfacesDark.background.primary,
        }}
      >
        <Tabs
          value={viewMode}
          onChange={(_, newValue) => setViewMode(newValue)}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'none',
              color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
              '&.Mui-selected': {
                color: emeraldCore.primary,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: emeraldCore.primary,
              height: 3,
            },
          }}
        >
          <Tab
            value="summary"
            label="Resumen"
            icon={<Sparkles size={16} />}
            iconPosition="start"
          />
          <Tab
            value="details"
            label="Detalles"
            icon={<List size={16} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Scrollable Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          bgcolor: isLight
            ? surfacesLight.background.secondary
            : surfacesDark.background.primary,
        }}
      >
        {/* SUMMARY TAB */}
        {viewMode === 'summary' && (
          <Box>
            {/* Priority Selector */}
            <Box
              sx={{
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light,
                bgcolor: isLight
                  ? surfacesLight.background.primary
                  : surfacesDark.background.secondary,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                  mb: 1,
                }}
              >
                ¿Qué te interesa comparar?
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {(Object.keys(priorityConfig) as ComparisonPriority[]).map((key) => {
                  const config = priorityConfig[key];
                  const Icon = config.icon;
                  const isActive = priority === key;
                  return (
                    <Chip
                      key={key}
                      icon={<Icon size={13} />}
                      label={config.label}
                      onClick={() => setPriority(key)}
                      sx={{
                        bgcolor: isActive ? emeraldCore.primary : 'transparent',
                        color: isActive ? '#fff' : emeraldCore.primary,
                        border: `1px solid ${emeraldCore.primary}`,
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        height: 28,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: isActive ? emeraldCore.dark : alpha(emeraldCore.primary, 0.08),
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            {/* Recommendation Card (based on selected priority) */}
            <RecommendationCard recommendation={currentRecommendation} />
          </Box>
        )}

        {/* DETAILS TAB */}
        {viewMode === 'details' && (
          <Box>
            {/* Visual Chart Toggle */}
            <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.light }}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Chip
                  icon={<RadarIcon size={14} />}
                  label="Radar"
                  onClick={() => setVisualMode('radar')}
                  sx={{
                    bgcolor: visualMode === 'radar' ? emeraldCore.primary : 'transparent',
                    color: visualMode === 'radar' ? '#fff' : emeraldCore.primary,
                    border: `1px solid ${emeraldCore.primary}`,
                    fontWeight: 600,
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: visualMode === 'radar' ? emeraldCore.dark : alpha(emeraldCore.primary, 0.08),
                    },
                  }}
                />
                <Chip
                  icon={<BarChart3 size={14} />}
                  label="Matriz"
                  onClick={() => setVisualMode('matrix')}
                  sx={{
                    bgcolor: visualMode === 'matrix' ? emeraldCore.primary : 'transparent',
                    color: visualMode === 'matrix' ? '#fff' : emeraldCore.primary,
                    border: `1px solid ${emeraldCore.primary}`,
                    fontWeight: 600,
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: visualMode === 'matrix' ? emeraldCore.dark : alpha(emeraldCore.primary, 0.08),
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Selected Visual Chart */}
            {visualMode === 'radar' ? (
              <RadarChart items={items} />
            ) : (
              <ValueMatrix items={items} />
            )}

            {/* All Attributes */}
            <Box sx={{ p: 1 }}>
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: emeraldCore.dark,
                  mb: 1,
                  px: 0.25,
                }}
              >
                Todos los Atributos
              </Typography>
              {allAttributes.map((key) => renderAttribute(key))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          py: 0.75,
          px: 1.5,
          borderTop: '1px solid',
          borderColor: isLight
            ? surfacesLight.border.light
            : surfacesDark.border.light,
          bgcolor: isLight
            ? surfacesLight.background.primary
            : surfacesDark.background.primary,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontSize: '0.55rem' }}
        >
          {viewMode === 'summary'
            ? 'Resumen inteligente basado en análisis multidimensional'
            : 'Detalles completos de comparación • Cada esmeralda es única'}
        </Typography>
      </Box>
    </Box>
  );
}
