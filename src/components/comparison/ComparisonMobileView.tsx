/**
 * ComparisonMobileView Component
 * Unified comparison page with priority selector, recommendation, visuals, and compact attributes
 */
import { useState } from 'react';
import { Box, Typography, Chip, alpha, Collapse } from '@mui/material';
import {
  BarChart3,
  Radar as RadarIcon,
  TrendingUp,
  DollarSign,
  Gem,
  Award,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { TreasureItem } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import {
  getColorDot,
  getQualityBadge,
  formatWeightLabel,
} from '../../utils/formatting';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { surfacesLight, surfacesDark } from '../../design-system/tokens/colors';
import {
  accentColors,
  cssTransition,
  Badge,
  getQuietEmerald,
  qeAccent,
  whiteAlpha,
} from '../../design-system';
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
  items: TreasureItem[];
}

type VisualMode = 'radar' | 'matrix';

// Priority options with educational descriptions
type ComparisonPriority =
  | 'best_value'
  | 'best_investment'
  | 'largest_size'
  | 'premium_quality';

const priorityConfig: Record<
  ComparisonPriority,
  {
    label: string;
    icon: typeof TrendingUp;
    criteria: RecommendationCriteria;
    description: string;
    gradient: string;
  }
> = {
  best_value: {
    label: 'Mejor Valor',
    icon: Gem,
    criteria: 'best_value',
    description: 'Alta calidad a precio razonable • Compra inteligente HOY',
    // static context: no theme mode available (module-level config, outside React render)
    gradient: `linear-gradient(135deg, ${qeAccent.light.pure} 0%, ${qeAccent.light.accent} 100%)`,
  },
  best_investment: {
    label: 'Inversión',
    icon: TrendingUp,
    criteria: 'best_investment',
    description: 'Apreciación a largo plazo • Calidad + Tamaño + Rareza',
    gradient: `linear-gradient(135deg, ${accentColors.purple.light} 0%, ${accentColors.purple.dark} 100%)`,
  },
  largest_size: {
    label: 'Tamaño',
    icon: DollarSign,
    criteria: 'largest_size',
    description: 'Mayor quilataje • Presencia y valor por tamaño',
    gradient: `linear-gradient(135deg, ${accentColors.cyan.light} 0%, ${accentColors.cyan.dark} 100%)`,
  },
  premium_quality: {
    label: 'Calidad',
    icon: Award,
    criteria: 'premium_quality',
    description: 'Excelencia premium • Los más altos estándares',
    gradient: `linear-gradient(135deg, ${accentColors.warning.light} 0%, ${accentColors.warning.dark} 100%)`,
  },
};

export default function ComparisonMobileView({
  items,
}: ComparisonMobileViewProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrencyFormat();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const qe = getQuietEmerald(mode);
  const [visualMode, setVisualMode] = useState<VisualMode>('radar');
  const [priority, setPriority] = useState<ComparisonPriority>('best_value');
  const [attributesExpanded, setAttributesExpanded] = useState(false);
  const [showPriorityHelp, setShowPriorityHelp] = useState(false);

  // Check if any item has price per carat (loose stones)
  const hasLooseStones = items.some(
    (i) => !i.isJewelry && typeof i.peso === 'number' && i.peso > 0,
  );

  // Calculate price per carat for display
  const pricePerCarats = items.map((i) => {
    if (!i.isJewelry && typeof i.peso === 'number' && i.peso > 0) {
      return i.precioCOP / i.peso;
    }
    return 0;
  });

  // Generate recommendation based on selected priority
  const currentRecommendation = generateRecommendation(
    items,
    priorityConfig[priority].criteria,
  );

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
              formatWeightLabel(item, { fallback: '-' }),
            )}
            type="numeric"
          />
        );
      case 'precioquilate':
        if (!hasLooseStones) return null;
        return (
          <AttributeCard
            key="precioquilate"
            label={t.comparison.pricePerCarat}
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
                <Badge
                  key={item.item}
                  tone={quality.tone}
                  label={quality.label}
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
            values={items.map(
              (item) => item.medidasValores || item.medidas || '-',
            )}
            type="text"
          />
        );
      default:
        return null;
    }
  };

  // All attributes for details view
  const allAttributes = [
    'precio',
    'peso',
    'precioquilate',
    'color',
    'calidad',
    'talla',
    'medidas',
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sticky Product Header */}
      <ProductHeader items={items} />

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
        {/* UNIFIED COMPARISON PAGE */}
        <Box>
          {/* Priority Selector with Help */}
          <Box
            sx={{
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: isLight
                ? surfacesLight.border.light
                : surfacesDark.border.light,
              bgcolor: isLight
                ? surfacesLight.background.primary
                : surfacesDark.background.secondary,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                ¿Qué te interesa comparar?
              </Typography>
              <Info
                size={14}
                color={qe.accent} // Jewelry-Not-Paint: icon carries its own onClick (interactive control)
                style={{ cursor: 'pointer' }}
                onClick={() => setShowPriorityHelp(!showPriorityHelp)}
              />
            </Box>

            {/* Help Tooltip */}
            <Collapse in={showPriorityHelp}>
              <Box
                sx={{
                  mb: 1,
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: alpha(qe.accentPure, 0.08),
                  border: `1px solid ${alpha(qe.accentPure, 0.2)}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    color: qe.accent,
                    lineHeight: 1.4,
                    mb: 0.5,
                    fontWeight: 600,
                  }}
                >
                  Mejor Valor vs Inversión:
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.55rem',
                    color: 'text.secondary',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Mejor Valor:</strong> Compra inteligente HOY. Alta
                  calidad a precio razonable (60% calidad + 40% precio bajo).
                  <br />
                  <strong>Inversión:</strong> Apreciación FUTURA. Rareza y
                  potencial (40% calidad + 30% color + 20% tamaño + 10%
                  certificación).
                </Typography>
              </Box>
            </Collapse>

            {/* Priority Chips */}
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {(Object.keys(priorityConfig) as ComparisonPriority[]).map(
                (key) => {
                  const config = priorityConfig[key];
                  const Icon = config.icon;
                  const isActive = priority === key;
                  return (
                    <Box
                      key={key}
                      sx={{
                        position: 'relative',
                        flex:
                          key === 'best_value' || key === 'best_investment'
                            ? '1 1 45%'
                            : '0 1 auto',
                      }}
                    >
                      <Chip
                        icon={<Icon size={13} />}
                        label={config.label}
                        onClick={() => setPriority(key)}
                        sx={{
                          width: '100%',
                          background: isActive
                            ? config.gradient
                            : 'transparent',
                          color: isActive ? whiteAlpha(1) : 'text.primary',
                          border: isActive
                            ? 'none'
                            : `1px solid ${alpha(qe.accent, 0.3)}`, // Jewelry-Not-Paint: border on a clickable chip
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          height: 28,
                          cursor: 'pointer',
                          transition: cssTransition.default,
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: `0 2px 8px ${alpha(qe.accent, 0.2)}`, // Jewelry-Not-Paint: hover shadow on a clickable chip
                          },
                        }}
                      />
                      {isActive && (
                        <Typography
                          sx={{
                            fontSize: '0.5rem',
                            color: 'text.secondary',
                            textAlign: 'center',
                            mt: 0.25,
                            lineHeight: 1.2,
                          }}
                        >
                          {config.description}
                        </Typography>
                      )}
                    </Box>
                  );
                },
              )}
            </Box>
          </Box>

          {/* Recommendation Card */}
          <RecommendationCard recommendation={currentRecommendation} />

          {/* Visual Chart Toggle */}
          <Box
            sx={{
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: isLight
                ? surfacesLight.border.light
                : surfacesDark.border.light,
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
              Visualización
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Chip
                icon={<RadarIcon size={14} />}
                label="Radar"
                onClick={() => setVisualMode('radar')}
                sx={{
                  flex: 1,
                  // Jewelry-Not-Paint: bgcolor/color/border on a clickable chip
                  bgcolor: visualMode === 'radar' ? qe.accent : 'transparent',
                  color: visualMode === 'radar' ? whiteAlpha(1) : qe.accent,
                  border: `1px solid ${qe.accent}`,
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor:
                      visualMode === 'radar'
                        ? qe.accentStrong
                        : alpha(qe.accent, 0.08),
                  },
                }}
              />
              <Chip
                icon={<BarChart3 size={14} />}
                label="Matriz"
                onClick={() => setVisualMode('matrix')}
                sx={{
                  flex: 1,
                  // Jewelry-Not-Paint: bgcolor/color/border on a clickable chip
                  bgcolor: visualMode === 'matrix' ? qe.accent : 'transparent',
                  color: visualMode === 'matrix' ? whiteAlpha(1) : qe.accent,
                  border: `1px solid ${qe.accent}`,
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor:
                      visualMode === 'matrix'
                        ? qe.accentStrong
                        : alpha(qe.accent, 0.08),
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

          {/* Expandable Compact Attributes */}
          <Box
            sx={{
              borderTop: '1px solid',
              borderColor: isLight
                ? surfacesLight.border.light
                : surfacesDark.border.light,
            }}
          >
            <Box
              onClick={() => setAttributesExpanded(!attributesExpanded)}
              sx={{
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                bgcolor: isLight
                  ? surfacesLight.background.primary
                  : surfacesDark.background.secondary,
                '&:hover': {
                  bgcolor: alpha(qe.accent, 0.04), // Jewelry-Not-Paint: hover fill on a clickable row
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                Todos los Atributos ({allAttributes.length})
              </Typography>
              {attributesExpanded ? (
                <ChevronUp size={16} color={qe.accentPure} />
              ) : (
                <ChevronDown size={16} color={qe.accentPure} />
              )}
            </Box>

            <Collapse in={attributesExpanded}>
              <Box sx={{ p: 1 }}>
                {allAttributes.map((key) => renderAttribute(key))}
              </Box>
            </Collapse>
          </Box>
        </Box>
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
          Comparación inteligente basada en análisis multidimensional • Cada
          esmeralda es única
        </Typography>
      </Box>
    </Box>
  );
}
