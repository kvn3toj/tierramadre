/**
 * Comparison Components Barrel Export
 */
export { default as ComparisonMobileView } from './ComparisonMobileView';
export { default as ProductHeader } from './ProductHeader';
export { default as AttributeCard } from './AttributeCard';
export { default as PriorityFilter } from './PriorityFilter';
export { default as ComparisonBarChart } from './ComparisonBarChart';
export { default as RadarChart } from './RadarChart';
export { default as ValueMatrix } from './ValueMatrix';
export { default as RecommendationCard } from './RecommendationCard';
export type { ComparisonPriority } from './PriorityFilter';
export type {
  RecommendationCriteria,
  RecommendationScore,
  ComparisonRecommendation,
} from './RecommendationEngine';
export { generateRecommendation } from './RecommendationEngine';
