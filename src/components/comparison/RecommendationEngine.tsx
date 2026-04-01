/**
 * RecommendationEngine Component
 * AI-powered recommendation system that analyzes emeralds and provides
 * intelligent insights based on user priorities.
 */
import { TreasureItem } from '../../types';
import { formatCarats } from '../../utils/formatting';

export type RecommendationCriteria =
  | 'best_investment'        // Long-term value appreciation
  | 'best_value'             // Best price/quality ratio
  | 'premium_quality'        // Highest quality regardless of price
  | 'largest_size'           // Biggest carat weight
  | 'best_color'             // Superior color grading
  | 'rare_find';             // Unique characteristics

export interface RecommendationScore {
  item: TreasureItem;
  score: number;              // 0-100
  strengths: string[];        // What makes this item stand out
  considerations: string[];   // Things to consider
  valueMetrics: {
    pricePerCarat?: number;
    qualityScore: number;     // 0-100
    colorScore: number;       // 0-100
    sizeScore: number;        // 0-100
    investmentScore: number;  // 0-100 (potential for value growth)
  };
}

export interface ComparisonRecommendation {
  criteria: RecommendationCriteria;
  winner: TreasureItem;
  score: RecommendationScore;
  analysis: string;           // Natural language explanation
  alternatives: RecommendationScore[]; // Other options ranked
}

/**
 * Quality scoring system based on emerald grades
 */
function calculateQualityScore(quality: string): number {
  const qualityMap: Record<string, number> = {
    'Fina': 100,
    'Comercial SuperFina': 90,
    'Comercial Fina': 85,
    'Comercial Superior': 75,
    'Comercial Estándar': 65,
    'Estándar': 50,
  };
  return qualityMap[quality] || 60;
}

/**
 * Color scoring system
 */
function calculateColorScore(color: string): number {
  const colorMap: Record<string, number> = {
    'Verde Vivido': 100,
    'Verde Muzo': 95,
    'Verde Natural': 85,
    'Verde Limón': 80,
    'Verde Menta': 75,
  };
  return colorMap[color] || 70;
}

/**
 * Investment potential score based on multiple factors
 * Higher quality + larger size + rare color = better investment
 */
function calculateInvestmentScore(
  item: TreasureItem,
  allItems: TreasureItem[]
): number {
  const qualityScore = calculateQualityScore(item.calidad);
  const colorScore = calculateColorScore(item.color);

  // Size relative to others (normalized)
  const weights = allItems
    .map(i => (typeof i.peso === 'number' ? i.peso : 0))
    .filter(w => w > 0);
  const weight = typeof item.peso === 'number' ? item.peso : 0;
  const maxWeight = Math.max(...weights, 1);
  const sizeScore = (weight / maxWeight) * 100;

  // Certification bonus
  const certBonus = item.certifications ? 15 : 0;

  // Calculate weighted investment score
  const baseScore = (
    qualityScore * 0.4 +
    colorScore * 0.3 +
    sizeScore * 0.2 +
    certBonus * 0.1
  );

  return Math.min(100, baseScore);
}

/**
 * Calculate value score (price/quality ratio)
 * Lower price + higher quality = better value
 */
function calculateValueScore(
  item: TreasureItem,
  allItems: TreasureItem[]
): number {
  const qualityScore = calculateQualityScore(item.calidad);

  // Price relative to others (normalized, inverted - lower is better)
  const prices = allItems.map(i => i.precioCOP);
  const maxPrice = Math.max(...prices);
  const priceScore = 100 - ((item.precioCOP / maxPrice) * 100);

  // Value = high quality + reasonable price
  return (qualityScore * 0.6) + (priceScore * 0.4);
}

/**
 * Generate strengths based on item analysis
 */
function identifyStrengths(
  item: TreasureItem,
  allItems: TreasureItem[]
): string[] {
  const strengths: string[] = [];
  const qualityScore = calculateQualityScore(item.calidad);
  const colorScore = calculateColorScore(item.color);

  if (qualityScore >= 90) {
    strengths.push('Calidad excepcional');
  }
  if (colorScore >= 90) {
    strengths.push('Color premium superior');
  }

  // Check if largest
  const weights = allItems.map(i => (typeof i.peso === 'number' ? i.peso : 0));
  const weight = typeof item.peso === 'number' ? item.peso : 0;
  if (weight > 0 && weight === Math.max(...weights)) {
    strengths.push('Mayor tamaño del grupo');
  }

  // Check if best price/carat ratio
  const pricePerCarats = allItems.map(i => {
    if (!i.isJewelry && typeof i.peso === 'number' && i.peso > 0) {
      return i.precioCOP / i.peso;
    }
    return Infinity;
  });
  const itemPPC = !item.isJewelry && typeof item.peso === 'number' && item.peso > 0
    ? item.precioCOP / item.peso
    : Infinity;

  if (itemPPC !== Infinity && itemPPC === Math.min(...pricePerCarats)) {
    strengths.push('Mejor relación precio/quilate');
  }

  if (item.certifications?.gemological) {
    strengths.push('Certificación gemológica verificada');
  }

  if (item.aestheticRating && item.aestheticRating.average && item.aestheticRating.average >= 8) {
    strengths.push('Alta calificación estética');
  }

  return strengths.length > 0 ? strengths : ['Características sólidas'];
}

/**
 * Generate considerations (things to think about)
 */
function identifyConsiderations(
  item: TreasureItem,
  allItems: TreasureItem[]
): string[] {
  const considerations: string[] = [];
  const prices = allItems.map(i => i.precioCOP);
  const maxPrice = Math.max(...prices);

  if (item.precioCOP === maxPrice && allItems.length > 1) {
    considerations.push('Precio más alto del grupo');
  }

  if (!item.certifications?.gemological) {
    considerations.push('Considerar certificación gemológica');
  }

  const qualityScore = calculateQualityScore(item.calidad);
  if (qualityScore < 75) {
    considerations.push('Calidad comercial estándar');
  }

  if (item.isJewelry && item.metalType === 'Plata') {
    considerations.push('Joya en plata - menor valor de reventa del metal');
  }

  return considerations.length > 0 ? considerations : ['Sin consideraciones especiales'];
}

/**
 * Build recommendation score for an item
 */
function buildRecommendationScore(
  item: TreasureItem,
  allItems: TreasureItem[],
  criteria: RecommendationCriteria
): RecommendationScore {
  const qualityScore = calculateQualityScore(item.calidad);
  const colorScore = calculateColorScore(item.color);
  const investmentScore = calculateInvestmentScore(item, allItems);

  // Size score (normalized)
  const weights = allItems.map(i => (typeof i.peso === 'number' ? i.peso : 0));
  const weight = typeof item.peso === 'number' ? item.peso : 0;
  const maxWeight = Math.max(...weights, 1);
  const sizeScore = (weight / maxWeight) * 100;

  // Calculate overall score based on criteria
  let score = 0;
  switch (criteria) {
    case 'best_investment':
      score = investmentScore;
      break;
    case 'best_value':
      score = calculateValueScore(item, allItems);
      break;
    case 'premium_quality':
      score = (qualityScore * 0.7) + (colorScore * 0.3);
      break;
    case 'largest_size':
      score = sizeScore;
      break;
    case 'best_color':
      score = colorScore;
      break;
    case 'rare_find':
      score = investmentScore; // Similar to investment for now
      break;
  }

  const pricePerCarat = !item.isJewelry && typeof item.peso === 'number' && item.peso > 0
    ? item.precioCOP / item.peso
    : undefined;

  return {
    item,
    score: Math.round(score),
    strengths: identifyStrengths(item, allItems),
    considerations: identifyConsiderations(item, allItems),
    valueMetrics: {
      pricePerCarat,
      qualityScore: Math.round(qualityScore),
      colorScore: Math.round(colorScore),
      sizeScore: Math.round(sizeScore),
      investmentScore: Math.round(investmentScore),
    },
  };
}

/**
 * Generate natural language analysis
 */
function generateAnalysis(
  winner: RecommendationScore,
  criteria: RecommendationCriteria
): string {
  const item = winner.item;
  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();

  const analyses: Record<RecommendationCriteria, string> = {
    best_investment: `${displayName} muestra el mayor potencial de valorización con un score de inversión de ${winner.valueMetrics.investmentScore}/100. Su combinación de calidad ${item.calidad} y color ${item.color} la posiciona como una excelente opción para apreciación de valor a largo plazo.`,

    best_value: `${displayName} ofrece la mejor relación calidad-precio del grupo. Con una calidad ${item.calidad} y un precio competitivo, representa una compra inteligente que equilibra calidad y presupuesto.`,

    premium_quality: `${displayName} alcanza los más altos estándares de calidad con ${item.calidad} y color ${item.color}. Esta esmeralda representa la excelencia premium del grupo.`,

    largest_size: `${displayName} es la esmeralda de mayor tamaño con ${formatCarats(item.peso)} quilates. Su tamaño excepcional la hace destacar en presencia y valor.`,

    best_color: `${displayName} presenta el mejor color del grupo: ${item.color}. Su tonalidad superior es un factor clave de valor y belleza.`,

    rare_find: `${displayName} destaca por sus características únicas. ${winner.strengths[0] || 'Sus cualidades especiales'} la hacen una pieza distintiva.`,
  };

  return analyses[criteria];
}

/**
 * Main recommendation function
 */
export function generateRecommendation(
  items: TreasureItem[],
  criteria: RecommendationCriteria
): ComparisonRecommendation {
  // Score all items
  const scores = items.map(item =>
    buildRecommendationScore(item, items, criteria)
  );

  // Sort by score (highest first)
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  const winner = sortedScores[0];
  const alternatives = sortedScores.slice(1);

  return {
    criteria,
    winner: winner.item,
    score: winner,
    analysis: generateAnalysis(winner, criteria),
    alternatives,
  };
}
