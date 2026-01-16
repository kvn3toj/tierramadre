/**
 * Comparison Components Barrel Export
 * Simplified structure with 2-tab comparison: Resumen + Detalles
 */

// Main entry components
export { default as ComparisonBar } from './ComparisonBar';
export { default as ComparisonModal } from './ComparisonModal';

// Detail components
export { default as ComparisonMobileView } from './ComparisonMobileView';
export { default as ProductHeader } from './ProductHeader';
export { default as AttributeCard } from './AttributeCard';
export { default as RadarChart } from './RadarChart';
export { default as ValueMatrix } from './ValueMatrix';
export { default as RecommendationCard } from './RecommendationCard';
export type {
  RecommendationCriteria,
  RecommendationScore,
  ComparisonRecommendation,
} from './RecommendationEngine';
export { generateRecommendation } from './RecommendationEngine';
