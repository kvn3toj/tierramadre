// Ambassador Trust Score Calculator
// Rachel's Trust Architecture for SELLER reputation (not product certification)

import {
  AmbassadorProfile,
  AmbassadorTrustScore,
  ReputationMetrics,
  Testimonial,
  AmbassadorBadge,
  AmbassadorBadgeType,
  AMBASSADOR_TRUST_LEVELS
} from '../types/ambassador';

/**
 * Calculate comprehensive trust score for an ambassador
 * Weighted scoring: Transaction (25%) + Satisfaction (30%) + Response (15%) + Expertise (10%) + Authenticity (15%) + Reliability (5%)
 */
export function calculateAmbassadorTrustScore(
  ambassador: AmbassadorProfile,
  metrics: ReputationMetrics,
  reviews: Testimonial[]
): AmbassadorTrustScore {
  const components = {
    transactionHistory: scoreTransactionHistory(metrics),
    customerSatisfaction: scoreCustomerSatisfaction(metrics, reviews),
    responseTime: scoreResponseTime(metrics),
    expertise: scoreExpertise(ambassador),
    authenticity: scoreAuthenticity(metrics),
    reliability: scoreReliability(metrics)
  };

  // Weighted average
  const weights = {
    transactionHistory: 0.25,
    customerSatisfaction: 0.30,
    responseTime: 0.15,
    expertise: 0.10,
    authenticity: 0.15,
    reliability: 0.05
  };

  const overall = Math.round(
    Object.entries(components).reduce(
      (sum, [key, score]) => sum + score * weights[key as keyof typeof weights],
      0
    )
  );

  const confidence = calculateConfidence(metrics, reviews);

  return {
    overall,
    components,
    confidence,
    lastCalculated: new Date().toISOString()
  };
}

/**
 * Transaction History Score (0-100)
 * Based on volume, completion rate, and value
 */
function scoreTransactionHistory(metrics: ReputationMetrics): number {
  const { totalSales, totalRevenue, repeatCustomerRate } = metrics;

  // Volume score (0-40 points)
  const volumeScore = Math.min(
    40,
    (totalSales / 100) * 20 + (totalRevenue / 100000000) * 20 // COP
  );

  // Repeat customer score (0-30 points)
  const loyaltyScore = repeatCustomerRate * 30;

  // Recency score (0-30 points)
  const recencyRatio = metrics.stats30d.sales / Math.max(1, metrics.stats90d.sales / 3);
  const recencyScore = Math.min(30, recencyRatio * 30);

  return Math.round(volumeScore + loyaltyScore + recencyScore);
}

/**
 * Customer Satisfaction Score (0-100)
 * Based on ratings, review count, and sentiment
 */
function scoreCustomerSatisfaction(metrics: ReputationMetrics, _reviews: Testimonial[]): number {
  const { averageRating, totalReviews, ratingDistribution } = metrics;

  if (totalReviews === 0) return 50; // Baseline for new ambassadors

  // Rating score (0-60 points)
  const ratingScore = (averageRating / 5) * 60;

  // Volume bonus (0-20 points)
  const volumeBonus = Math.min(20, (totalReviews / 50) * 20);

  // Distribution penalty (0-20 points) - penalize polarized ratings
  const total = totalReviews;
  const polarization = total > 0 ? (ratingDistribution[5] + ratingDistribution[1]) / total : 0;
  const distributionScore = (1 - polarization * 0.5) * 20;

  return Math.round(ratingScore + volumeBonus + distributionScore);
}

/**
 * Response Time Score (0-100)
 * Fast responders get rewarded
 */
function scoreResponseTime(metrics: ReputationMetrics): number {
  const { avgResponseTime, responseRate } = metrics;

  // Speed score (0-60 points)
  let speedScore = 0;
  if (avgResponseTime < 1) speedScore = 60;
  else if (avgResponseTime < 2) speedScore = 50;
  else if (avgResponseTime < 6) speedScore = 40;
  else if (avgResponseTime < 24) speedScore = 25;
  else speedScore = 10;

  // Response rate score (0-40 points)
  const rateScore = responseRate * 40;

  return Math.round(speedScore + rateScore);
}

/**
 * Expertise Score (0-100)
 * Based on certifications, specialties, experience
 */
function scoreExpertise(ambassador: AmbassadorProfile): number {
  const { certifications, specialties, verificationStatus } = ambassador;

  // Certification score (0-40 points)
  const certScore = Math.min(40, certifications.length * 10);

  // Specialty depth (0-30 points)
  const specialtyScore = Math.min(30, specialties.length * 6);

  // Verification level (0-30 points)
  const verificationScores: Record<string, number> = {
    'unverified': 0,
    'basic': 10,
    'verified': 20,
    'premium': 30
  };
  const verificationScore = verificationScores[verificationStatus.level] || 0;

  return Math.round(certScore + specialtyScore + verificationScore);
}

/**
 * Authenticity Score (0-100)
 * Based on certified products sold
 */
function scoreAuthenticity(metrics: ReputationMetrics): number {
  const { certifiedProductsSold, totalSales } = metrics;

  if (totalSales === 0) return 50; // Baseline

  // Percentage of sales that are certified
  const certificationRate = certifiedProductsSold / totalSales;

  return Math.round(certificationRate * 100);
}

/**
 * Reliability Score (0-100)
 * Based on consistency and dispute resolution
 */
function scoreReliability(metrics: ReputationMetrics): number {
  const { disputeRate, resolutionRate } = metrics;

  // Low disputes = good (0-50 points)
  const disputeScore = (1 - disputeRate) * 50;

  // High resolution rate = good (0-50 points)
  const resolutionScore = resolutionRate * 50;

  return Math.round(disputeScore + resolutionScore);
}

/**
 * Confidence Interval (0-1)
 * How confident are we in this score?
 */
function calculateConfidence(metrics: ReputationMetrics, _reviews: Testimonial[]): number {
  // More data = higher confidence
  const salesConfidence = Math.min(1, metrics.totalSales / 50);
  const reviewConfidence = Math.min(1, _reviews.length / 30);

  // Calculate account age in months (simplified)
  const monthsActive = 6; // Would calculate from joinedDate in real implementation

  const timeConfidence = Math.min(1, monthsActive / 12);

  return Math.round(((salesConfidence + reviewConfidence + timeConfidence) / 3) * 100) / 100;
}

/**
 * Get trust level based on overall score
 */
export function getAmbassadorTrustLevel(score: number) {
  if (score >= AMBASSADOR_TRUST_LEVELS.ELITE.min) return AMBASSADOR_TRUST_LEVELS.ELITE;
  if (score >= AMBASSADOR_TRUST_LEVELS.TRUSTED.min) return AMBASSADOR_TRUST_LEVELS.TRUSTED;
  if (score >= AMBASSADOR_TRUST_LEVELS.ESTABLISHED.min) return AMBASSADOR_TRUST_LEVELS.ESTABLISHED;
  return AMBASSADOR_TRUST_LEVELS.NEWCOMER;
}

/**
 * Get trust score color
 */
export function getAmbassadorTrustColor(score: number): string {
  if (score >= 90) return '#FFD700'; // Gold - Elite
  if (score >= 75) return '#059669'; // Emerald - Trusted
  if (score >= 50) return '#3B82F6'; // Blue - Established
  return '#9CA3AF'; // Gray - Newcomer
}

/**
 * Badge Earning Criteria
 */
interface BadgeCriteria {
  type: AmbassadorBadgeType;
  check: (profile: AmbassadorProfile, metrics: ReputationMetrics) => boolean;
  renewable: boolean;
  expiresAfterDays?: number;
}

const BADGE_CRITERIA: BadgeCriteria[] = [
  {
    type: 'identity-verified',
    check: (p) => p.verificationStatus.level !== 'unverified',
    renewable: false
  },
  {
    type: 'expert-gemologist',
    check: (p) => p.certifications.some(c => c.type === 'gemologist' && c.verified),
    renewable: false
  },
  {
    type: 'top-seller',
    check: (_, m) => m.stats90d.sales >= 50 && m.averageRating >= 4.5,
    renewable: true,
    expiresAfterDays: 90
  },
  {
    type: 'fast-responder',
    check: (_, m) => m.avgResponseTime < 2 && m.responseRate > 0.9,
    renewable: true,
    expiresAfterDays: 30
  },
  {
    type: 'customer-favorite',
    check: (_, m) => {
      const positive = m.ratingDistribution[4] + m.ratingDistribution[5];
      const total = m.totalReviews;
      return total >= 20 && (positive / total) >= 0.95;
    },
    renewable: true,
    expiresAfterDays: 90
  }
];

/**
 * Calculate which badges an ambassador has earned
 */
export function calculateEarnedBadges(
  profile: AmbassadorProfile,
  metrics: ReputationMetrics
): AmbassadorBadge[] {
  const now = new Date().toISOString();

  return BADGE_CRITERIA
    .filter(criteria => criteria.check(profile, metrics))
    .map(criteria => ({
      type: criteria.type,
      earnedAt: now,
      expiresAt: criteria.expiresAfterDays
        ? new Date(Date.now() + criteria.expiresAfterDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      criteria: `Earned on ${new Date().toLocaleDateString('es-CO')}`
    }));
}

/**
 * Create default reputation metrics for new ambassadors
 */
export function createDefaultReputationMetrics(): ReputationMetrics {
  const defaultWindow = { sales: 0, revenue: 0, avgRating: 0, responseTime: 24 };

  return {
    totalSales: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    repeatCustomerRate: 0,
    stats30d: { ...defaultWindow },
    stats90d: { ...defaultWindow },
    statsAllTime: { ...defaultWindow },
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    avgResponseTime: 24,
    responseRate: 0,
    verifiedPurchases: 0,
    certifiedProductsSold: 0,
    disputeRate: 0,
    resolutionRate: 1
  };
}

/**
 * Format trust score for display
 */
export function formatAmbassadorTrustScore(score: number): string {
  const level = getAmbassadorTrustLevel(score);
  return `${score}/100 - ${level.label}`;
}

/**
 * Get improvement suggestions based on trust components
 */
export function getTrustImprovementSuggestions(trustScore: AmbassadorTrustScore): string[] {
  const suggestions: string[] = [];
  const { components } = trustScore;

  if (components.responseTime < 50) {
    suggestions.push('Mejora tu tiempo de respuesta - intenta responder en menos de 2 horas');
  }

  if (components.customerSatisfaction < 60) {
    suggestions.push('Enfocate en la satisfaccion del cliente - pide resenas despues de cada venta');
  }

  if (components.expertise < 40) {
    suggestions.push('Agrega mas certificaciones y especialidades a tu perfil');
  }

  if (components.authenticity < 60) {
    suggestions.push('Vende mas productos certificados para mejorar tu puntuacion de autenticidad');
  }

  if (components.transactionHistory < 50) {
    suggestions.push('Aumenta tu volumen de ventas y enfocate en clientes recurrentes');
  }

  return suggestions;
}
