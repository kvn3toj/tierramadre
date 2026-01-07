/**
 * Home page content data.
 * Extracted from Home.tsx for better separation of concerns.
 */
import React from 'react';
import {
  SelfImprovement,
  TrendingUp,
  HistoryEdu,
  Diamond,
} from '@mui/icons-material';
import { semanticColors, emeraldCore } from '../design-system/tokens/colors';

// Accent colors for knowledge categories
const PURPLE_ACCENT = '#9C27B0';
const ORANGE_ACCENT = semanticColors.warning.main;
const BLUE_ACCENT = semanticColors.info.main;

export interface DailyOracle {
  id: number;
  category: string;
  icon: string;
  title: string;
  content: string;
  source: string;
}

export interface KnowledgeCategory {
  id: string;
  title: string;
  icon: React.ReactElement;
  color: string;
  facts: number;
}

export type MeditationType =
  | 'breathing'
  | 'visual'
  | 'chakra'
  | 'ambient'
  | 'energy-shield'
  | 'guided';

export interface BreathingPattern {
  inhale: number;
  hold: number;
  exhale: number;
  holdAfterExhale?: number;
}

export interface DailyMeditation {
  title: string;
  duration: number;
  description: string;
  type: MeditationType;
  // Type-specific configurations
  breathingPattern?: BreathingPattern;
  chakraColor?: string;
  guidedSteps?: string[];
  ambientFrequency?: number; // Hz for tone generation
}

// Daily Oracle facts - rotates based on day of year
// Simplified content for minimalistic display
export const DAILY_ORACLES: DailyOracle[] = [
  {
    id: 1,
    category: 'spiritual',
    icon: '💚',
    title: 'Chakra del Corazón',
    content: 'Las esmeraldas activan el chakra del corazón, promoviendo amor y compasión.',
    source: 'Tradición védica',
  },
  {
    id: 2,
    category: 'investment',
    icon: '📈',
    title: 'Valor en Alza',
    content: 'Las esmeraldas colombianas han apreciado 12% anual, superando a los diamantes.',
    source: "Sotheby's",
  },
  {
    id: 3,
    category: 'history',
    icon: '⛏️',
    title: 'Minas de Muzo',
    content: 'Más de 500 años de historia, desde los indígenas Muzo hasta hoy.',
    source: 'Smithsoniano',
  },
  {
    id: 4,
    category: 'spiritual',
    icon: '✨',
    title: 'Claridad',
    content: 'Cleopatra meditaba con esmeraldas para tomar decisiones importantes.',
    source: 'Antiguo Egipto',
  },
  {
    id: 5,
    category: 'jewelry',
    icon: '💎',
    title: 'Rareza Única',
    content: '20 veces más raras que los diamantes. Color único por el cromo andino.',
    source: 'GIA',
  },
  {
    id: 6,
    category: 'spiritual',
    icon: '🌙',
    title: 'Luna Llena',
    content: 'Tradición colombiana: cargar esmeraldas bajo la luz lunar.',
    source: 'Tradición ancestral',
  },
  {
    id: 7,
    category: 'investment',
    icon: '👨‍👩‍👧',
    title: 'Legado Familiar',
    content: 'Joyas que pasan de generación en generación sin perder valor.',
    source: "Christie's",
  },
];

// Knowledge categories - Simplified titles
export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  { id: 'spiritual', title: 'Energía', icon: React.createElement(SelfImprovement), color: PURPLE_ACCENT, facts: 12 },
  { id: 'investment', title: 'Valor', icon: React.createElement(TrendingUp), color: semanticColors.success.main, facts: 8 },
  { id: 'history', title: 'Origen', icon: React.createElement(HistoryEdu), color: ORANGE_ACCENT, facts: 15 },
  { id: 'jewelry', title: 'Piedras', icon: React.createElement(Diamond), color: BLUE_ACCENT, facts: 10 },
];

// Daily meditations - different experience each day
// Day 0 = Sunday, Day 6 = Saturday
export const DAILY_MEDITATIONS: DailyMeditation[] = [
  {
    // Sunday - Guided meditation with voice prompts
    title: 'Conexión Ancestral',
    duration: 300,
    description: 'Conecta con la sabiduría de las montañas colombianas',
    type: 'guided',
    guidedSteps: [
      'Cierra los ojos y respira profundamente...',
      'Visualiza las montañas verdes de Colombia...',
      'Siente la energía ancestral de la tierra...',
      'La esmeralda brilla en tu corazón...',
      'Absorbe la sabiduría de generaciones...',
      'Agradece esta conexión sagrada...',
    ],
  },
  {
    // Monday - Breathing with emerald visualization
    title: 'Claridad Interior',
    duration: 180,
    description: 'Respira con la esmeralda para encontrar paz mental',
    type: 'breathing',
    breathingPattern: { inhale: 4, hold: 4, exhale: 4 }, // Box breathing
  },
  {
    // Tuesday - Visual focus meditation
    title: 'Abundancia',
    duration: 300,
    description: 'Contempla la esmeralda y manifiesta prosperidad',
    type: 'visual',
  },
  {
    // Wednesday - Heart chakra activation
    title: 'Amor Propio',
    duration: 240,
    description: 'Activa tu chakra del corazón con energía esmeralda',
    type: 'chakra',
    chakraColor: emeraldCore.primary, // Brand emerald green for heart chakra
  },
  {
    // Thursday - Ambient sounds meditation
    title: 'Gratitud Matutina',
    duration: 120,
    description: 'Comienza el día con sonidos de la naturaleza',
    type: 'ambient',
    ambientFrequency: 528, // Solfeggio frequency - love/healing
  },
  {
    // Friday - Energy shield visualization
    title: 'Protección',
    duration: 180,
    description: 'Crea un escudo energético con luz esmeralda',
    type: 'energy-shield',
  },
  {
    // Saturday - Deep breathing for emotional healing
    title: 'Sanación Emocional',
    duration: 360,
    description: 'Libera emociones con respiración 4-7-8',
    type: 'breathing',
    breathingPattern: { inhale: 4, hold: 7, exhale: 8 }, // 4-7-8 calming breath
  },
];
