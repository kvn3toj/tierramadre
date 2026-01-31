/**
 * Achievement Definitions & XP Level System
 *
 * Pure data and utility functions for the gamification/achievement system.
 * Used by TrackingContext to check and award achievements.
 */

import type { Achievement } from '../../types/analytics';

// =============================================================================
// ACHIEVEMENT DEFINITIONS
// =============================================================================

export const ACHIEVEMENTS: Achievement[] = [
  // Discovery Achievements
  {
    id: 'curador_experto',
    name: 'Curador Experto',
    description: 'Guardar 5 filtros personalizados',
    icon: '🎯',
    xp: 50,
    category: 'discovery',
    condition: { type: 'count', target: 5, metric: 'filters_saved' },
  },
  {
    id: 'coleccionista',
    name: 'Coleccionista',
    description: 'Agregar 10 productos a favoritos',
    icon: '💎',
    xp: 75,
    category: 'discovery',
    condition: { type: 'count', target: 10, metric: 'favorites_added' },
  },
  {
    id: 'estratega',
    name: 'Estratega',
    description: 'Realizar tu primera comparación de productos',
    icon: '⚖️',
    xp: 25,
    category: 'discovery',
    condition: { type: 'count', target: 1, metric: 'comparisons_made' },
  },
  {
    id: 'explorador_total',
    name: 'Explorador Total',
    description: 'Visitar 50 productos diferentes',
    icon: '🗺️',
    xp: 100,
    category: 'discovery',
    condition: { type: 'count', target: 50, metric: 'products_viewed' },
  },
  // Cotización Achievements
  {
    id: 'cerrador_profesional',
    name: 'Cerrador Profesional',
    description: 'Exportar 5 cotizaciones',
    icon: '📋',
    xp: 100,
    category: 'cotizacion',
    condition: { type: 'count', target: 5, metric: 'cotizaciones_exported' },
  },
  {
    id: 'velocista',
    name: 'Velocista',
    description: 'Completar una cotización en menos de 5 minutos',
    icon: '⚡',
    xp: 50,
    category: 'cotizacion',
    condition: { type: 'time', target: 300, metric: 'cotizacion_time' },
  },
  {
    id: 'leyenda_ventas',
    name: 'Leyenda de Ventas',
    description: 'Exportar 50 cotizaciones',
    icon: '👑',
    xp: 500,
    category: 'cotizacion',
    condition: { type: 'count', target: 50, metric: 'cotizaciones_exported' },
  },
  // Simulator Achievements
  {
    id: 'maestro_valor',
    name: 'Maestro del Valor',
    description: 'Realizar 20 simulaciones de precio',
    icon: '💰',
    xp: 75,
    category: 'simulator',
    condition: { type: 'count', target: 20, metric: 'simulations_completed' },
  },
  // Engagement Achievements
  {
    id: 'sabio_oracle',
    name: 'Sabio del Oracle',
    description: '7 días consecutivos visitando el Oracle',
    icon: '🔮',
    xp: 150,
    category: 'streak',
    condition: { type: 'streak', target: 7, metric: 'oracle_streak' },
  },
  {
    id: 'embajador_conectado',
    name: 'Embajador Conectado',
    description: 'Visitar 10 perfiles de colegas',
    icon: '🤝',
    xp: 50,
    category: 'engagement',
    condition: { type: 'count', target: 10, metric: 'ambassador_profiles_viewed' },
  },
  // Streak Achievements
  {
    id: 'constante',
    name: 'Constante',
    description: 'Usar la app 7 días seguidos',
    icon: '🔥',
    xp: 100,
    category: 'streak',
    condition: { type: 'streak', target: 7, metric: 'daily_streak' },
  },
  {
    id: 'imparable',
    name: 'Imparable',
    description: 'Usar la app 30 días seguidos',
    icon: '🚀',
    xp: 300,
    category: 'streak',
    condition: { type: 'streak', target: 30, metric: 'daily_streak' },
  },
];

// =============================================================================
// XP LEVEL THRESHOLDS
// =============================================================================

export const XP_LEVELS = [
  { level: 1, name: 'Aprendiz', minXp: 0 },
  { level: 2, name: 'Conocedor', minXp: 100 },
  { level: 3, name: 'Experto', minXp: 300 },
  { level: 4, name: 'Maestro', minXp: 600 },
  { level: 5, name: 'Gran Maestro', minXp: 1000 },
  { level: 6, name: 'Leyenda', minXp: 1500 },
];

export const getLevelFromXp = (xp: number): { level: number; name: string; progress: number; nextLevelXp: number } => {
  let currentLevel = XP_LEVELS[0];
  let nextLevel = XP_LEVELS[1];

  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) {
      currentLevel = XP_LEVELS[i];
      nextLevel = XP_LEVELS[i + 1] || currentLevel;
      break;
    }
  }

  const xpInCurrentLevel = xp - currentLevel.minXp;
  const xpNeededForNext = nextLevel.minXp - currentLevel.minXp;
  const progress = xpNeededForNext > 0 ? (xpInCurrentLevel / xpNeededForNext) * 100 : 100;

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    progress,
    nextLevelXp: nextLevel.minXp,
  };
};
