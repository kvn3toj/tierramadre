/**
 * ComparisonMobileView Component
 * Intelligent comparison view with AI-powered recommendations and visualizations.
 */
import { useState } from 'react';
import { Box, Typography, Chip, Tabs, Tab } from '@mui/material';
import { Radar, Grid3x3, Lightbulb } from 'lucide-react';
import { InventoryItem } from '../../types';
import { useThemeMode } from '../../contexts/ThemeContext';
import { formatCurrency, getColorDot, getQualityBadge } from '../../utils/formatting';
import { surfacesLight, surfacesDark, emeraldCore } from '../../design-system/tokens/colors';
import ProductHeader from './ProductHeader';
import AttributeCard from './AttributeCard';
import PriorityFilter, { ComparisonPriority } from './PriorityFilter';
import ComparisonBarChart from './ComparisonBarChart';
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

// Define attribute order based on priority
const attributesByPriority: Record<ComparisonPriority, string[]> = {
  todos: ['precio', 'peso', 'precioquilate', 'color', 'calidad', 'talla', 'medidas'],
  inversion: ['precio', 'precioquilate', 'peso', 'calidad', 'color', 'talla', 'medidas'],
  tamano: ['peso', 'medidas', 'precio', 'precioquilate', 'calidad', 'color', 'talla'],
  calidad: ['calidad', 'color', 'talla', 'peso', 'precio', 'precioquilate', 'medidas'],
};

type ViewMode = 'attributes' | 'visuals' | 'recommendations';

export default function ComparisonMobileView({ items }: ComparisonMobileViewProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const [priority, setPriority] = useState<ComparisonPriority>('todos');
  const [viewMode, setViewMode] = useState<ViewMode>('recommendations');

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

  // Render attribute card by key
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

  // Get ordered attributes based on priority
  const orderedAttributes = attributesByPriority[priority];

  // Map priority to recommendation criteria
  const priorityToCriteria: Record<ComparisonPriority, RecommendationCriteria> = {
    todos: 'best_value',
    inversion: 'best_investment',
    tamano: 'largest_size',
    calidad: 'premium_quality',
  };

  // Generate recommendation based on selected priority only
  const currentRecommendation = generateRecommendation(items, priorityToCriteria[priority]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sticky Product Header */}
      <ProductHeader items={items} />

      {/* View Mode Tabs */}
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
            minHeight: 42,
            '& .MuiTab-root': {
              minHeight: 42,
              fontSize: '0.65rem',
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
            value="recommendations"
            label="Recomendaciones"
            icon={<Lightbulb size={14} />}
            iconPosition="start"
          />
          <Tab
            value="visuals"
            label="Visuales"
            icon={<Radar size={14} />}
            iconPosition="start"
          />
          <Tab
            value="attributes"
            label="Atributos"
            icon={<Grid3x3 size={14} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Priority Filter (only for attributes and recommendations) */}
      {(viewMode === 'attributes' || viewMode === 'recommendations') && (
        <PriorityFilter priority={priority} onPriorityChange={setPriority} />
      )}

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
        {/* Recommendations View */}
        {viewMode === 'recommendations' && (
          <Box>
            <RecommendationCard recommendation={currentRecommendation} />
          </Box>
        )}

        {/* Visuals View */}
        {viewMode === 'visuals' && (
          <Box>
            <RadarChart items={items} />
            <ValueMatrix items={items} />
            <ComparisonBarChart items={items} />
          </Box>
        )}

        {/* Attributes View */}
        {viewMode === 'attributes' && (
          <Box sx={{ p: 1 }}>
            {orderedAttributes.map((key) => renderAttribute(key))}
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
          {viewMode === 'recommendations'
            ? 'Recomendaciones basadas en análisis inteligente'
            : viewMode === 'visuals'
            ? 'Visualización de datos multidimensional'
            : 'Comparación de datos • Cada esmeralda es única'}
        </Typography>
      </Box>
    </Box>
  );
}
