// Trust Score System for Tierra Madre Emerald Inventory
// Based on Rachel's Trust Architecture recommendations

import { InventoryItem, TrustScoreBreakdown, TrustBadge, CertificationStatus } from '../types';

/**
 * Calculate comprehensive trust score for an emerald
 * Weighted scoring: Provenance (25%) + Quality (30%) + Aesthetic (20%) + Market (25%)
 */
export function calculateTrustScore(item: InventoryItem): TrustScoreBreakdown {
  // PROVENANCE SCORE (25%)
  let provenanceScore = 0;

  // Base score for being in official inventory
  provenanceScore += 20;

  // Chain of custody points
  if (item.chainOfCustody && item.chainOfCustody.length > 0) {
    provenanceScore += Math.min(item.chainOfCustody.length * 10, 30);
  }

  // Colombian origin verification
  if (item.certifications?.colombianOrigin?.verified) {
    provenanceScore += 25;
  }

  // Ethical sourcing
  if (item.certifications?.ethical?.conflictFree) {
    provenanceScore += 15;
  }

  // Gemological certification
  if (item.certifications?.gemological?.authenticity === 'VERIFIED') {
    provenanceScore += 10;
  }

  provenanceScore = Math.min(provenanceScore, 100);

  // QUALITY SCORE (30%)
  let qualityScore = 0;

  // Color quality scoring
  const colorScoreMap: Record<string, number> = {
    'Verde Muzo': 100,        // Premium Muzo green
    'Verde Vivido': 90,       // Vivid green
    'Verde Natural': 70,      // Natural green
    'Verde Limón': 60,        // Lime green
    'Verde Menta': 50,        // Mint green
  };
  qualityScore += (colorScoreMap[item.color] || 50) * 0.35;

  // Calidad (quality grade) scoring
  const calidadScoreMap: Record<string, number> = {
    'Fina': 100,
    'Comercial SuperFina': 90,
    'Comercial Fina': 75,
    'Comercial Superior': 65,
    'Comercial Estandar': 50,
    'Estandar': 40,
  };

  // Find matching quality
  let calidadScore = 40;
  for (const [key, score] of Object.entries(calidadScoreMap)) {
    if (item.calidad.includes(key) || item.calidad === key) {
      calidadScore = score;
      break;
    }
  }
  qualityScore += calidadScore * 0.35;

  // Weight bonus (larger stones are rarer)
  if (typeof item.peso === 'number') {
    if (item.peso >= 2) qualityScore += 20;
    else if (item.peso >= 1) qualityScore += 15;
    else if (item.peso >= 0.5) qualityScore += 10;
    else qualityScore += 5;
  } else {
    // Jewelry items get base weight score
    qualityScore += 10;
  }

  // Gemological verification bonus
  if (item.certifications?.gemological?.authenticity === 'VERIFIED') {
    qualityScore += 10;
  }

  qualityScore = Math.min(qualityScore, 100);

  // AESTHETIC SCORE (20%)
  let aestheticScore = 50; // Default baseline

  if (item.aestheticRating) {
    const { fire, saturation, uniqueness, photographability } = item.aestheticRating;
    aestheticScore = ((fire || 5) + (saturation || 5) + (uniqueness || 5) + (photographability || 5)) / 4 * 10;
  } else {
    // Estimate based on quality and color
    if (item.calidad.includes('SuperFina') || item.calidad === 'Fina') {
      aestheticScore += 20;
    }
    if (item.color === 'Verde Muzo' || item.color === 'Verde Vivido') {
      aestheticScore += 15;
    }
  }

  aestheticScore = Math.min(aestheticScore, 100);

  // MARKET SCORE (25%)
  let marketScore = 50; // Baseline

  // Price tier scoring (higher price = more exclusive)
  if (item.precioCOP >= 10000000) marketScore = 95;       // 10M+ COP
  else if (item.precioCOP >= 5000000) marketScore = 85;   // 5M+ COP
  else if (item.precioCOP >= 1000000) marketScore = 70;   // 1M+ COP
  else if (item.precioCOP >= 500000) marketScore = 60;    // 500K+ COP
  else if (item.precioCOP >= 200000) marketScore = 50;    // 200K+ COP
  else marketScore = 40;

  // Demand indicator adjustment
  if (item.demandIndicator === 'HIGH') marketScore = Math.min(marketScore + 15, 100);
  else if (item.demandIndicator === 'LOW') marketScore = Math.max(marketScore - 10, 0);

  // Jewelry premium
  if (item.isJewelry) {
    if (item.metalType === 'Oro 18k') marketScore = Math.min(marketScore + 10, 100);
    else if (item.metalType === 'Plata') marketScore = Math.min(marketScore + 5, 100);
  }

  // WEIGHTED OVERALL SCORE
  const overall = Math.round(
    (provenanceScore * 0.25) +
    (qualityScore * 0.30) +
    (aestheticScore * 0.20) +
    (marketScore * 0.25)
  );

  return {
    provenance: Math.round(provenanceScore),
    quality: Math.round(qualityScore),
    aesthetic: Math.round(aestheticScore),
    market: Math.round(marketScore),
    overall,
  };
}

/**
 * Get certification badge level and styling based on overall score
 * NOTE: This measures the PRODUCT (emerald), NOT the seller/asesor
 */
export function getTrustBadge(score: number): TrustBadge {
  if (score >= 80) {
    return {
      level: 'GOLD',
      color: '#FFD700',
      bgColor: 'rgba(255, 215, 0, 0.15)',
      label: 'Certificacion Oro',
      labelShort: 'Oro',
      icon: 'award',
    };
  }
  if (score >= 60) {
    return {
      level: 'SILVER',
      color: '#94A3B8',
      bgColor: 'rgba(148, 163, 184, 0.15)',
      label: 'Certificacion Plata',
      labelShort: 'Plata',
      icon: 'award',
    };
  }
  if (score >= 40) {
    return {
      level: 'BRONZE',
      color: '#CD7F32',
      bgColor: 'rgba(205, 127, 50, 0.15)',
      label: 'Certificacion Bronce',
      labelShort: 'Bronce',
      icon: 'award',
    };
  }
  return {
    level: 'NONE',
    color: '#9CA3AF',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    label: 'Sin Certificar',
    labelShort: 'Pendiente',
    icon: 'circle-dashed',
  };
}

/**
 * Get certification status summary
 */
export function getCertificationStatus(item: InventoryItem): CertificationStatus {
  const hasGemological = item.certifications?.gemological?.authenticity === 'VERIFIED';
  const hasColombianOrigin = item.certifications?.colombianOrigin?.verified === true;
  const hasEthical = item.certifications?.ethical?.conflictFree === true;
  const hasChainOfCustody = (item.chainOfCustody?.length || 0) > 0;

  const completedCount = [hasGemological, hasColombianOrigin, hasEthical, hasChainOfCustody]
    .filter(Boolean).length;

  return {
    gemological: hasGemological ? 'verified' : 'pending',
    colombianOrigin: hasColombianOrigin ? 'verified' : 'pending',
    ethical: hasEthical ? 'verified' : 'pending',
    chainOfCustody: hasChainOfCustody ? 'verified' : 'pending',
    completeness: Math.round((completedCount / 4) * 100),
    totalVerified: completedCount,
    totalPossible: 4,
  };
}

/**
 * Calculate inventory-wide trust health metrics
 */
export function calculateInventoryTrustHealth(items: InventoryItem[]) {
  if (items.length === 0) {
    return {
      avgTrustScore: 0,
      certificationRate: 0,
      provenanceCompleteness: 0,
      trustDistribution: {
        highTrust: 0,
        mediumTrust: 0,
        lowTrust: 0,
      },
    };
  }

  const scores = items.map(item => calculateTrustScore(item));
  const avgTrustScore = Math.round(
    scores.reduce((sum, s) => sum + s.overall, 0) / scores.length
  );

  // Certification rate (items with gemological verification)
  const certifiedCount = items.filter(
    i => i.certifications?.gemological?.authenticity === 'VERIFIED'
  ).length;
  const certificationRate = Math.round((certifiedCount / items.length) * 100);

  // Provenance completeness (items with chain of custody)
  const withProvenance = items.filter(
    i => i.chainOfCustody && i.chainOfCustody.length > 0
  ).length;
  const provenanceCompleteness = Math.round((withProvenance / items.length) * 100);

  // Trust distribution
  const highTrust = scores.filter(s => s.overall >= 70).length;
  const mediumTrust = scores.filter(s => s.overall >= 40 && s.overall < 70).length;
  const lowTrust = scores.filter(s => s.overall < 40).length;

  return {
    avgTrustScore,
    certificationRate,
    provenanceCompleteness,
    trustDistribution: {
      highTrust,
      mediumTrust,
      lowTrust,
    },
  };
}

/**
 * Format trust score for display
 */
export function formatTrustScore(score: number): string {
  return `${score}/100`;
}

/**
 * Get color for trust score progress bar
 */
export function getTrustScoreColor(score: number): string {
  if (score >= 80) return '#10B981'; // Emerald green
  if (score >= 60) return '#3B82F6'; // Blue
  if (score >= 40) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}
