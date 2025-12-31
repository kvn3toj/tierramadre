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
  Spa,
} from '@mui/icons-material';
import { semanticColors, emeraldCore } from '../design-system/tokens/colors';

// Accent colors for knowledge categories
const PURPLE_ACCENT = '#9C27B0';
const ORANGE_ACCENT = semanticColors.warning.main;
const BLUE_ACCENT = semanticColors.info.main;
const PINK_ACCENT = '#E91E63';

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
export const DAILY_ORACLES: DailyOracle[] = [
  {
    id: 1,
    category: 'spiritual',
    icon: '🧘',
    title: 'El Chakra del Corazón',
    content: 'Las esmeraldas activan el chakra del corazón, promoviendo amor incondicional y compasión. Los antiguos egipcios las usaban para conectar con la energía del amor divino.',
    source: 'Tradición védica',
  },
  {
    id: 2,
    category: 'investment',
    icon: '📈',
    title: 'Inversión Inteligente',
    content: 'Las esmeraldas colombianas han apreciado un 12% anual entre 2015-2024, superando a los diamantes en subastas de joyas de alta gama.',
    source: "Sotheby's Gemstone Report",
  },
  {
    id: 3,
    category: 'history',
    icon: '📜',
    title: 'Las Minas de Muzo',
    content: 'Las minas de Muzo en Colombia han sido trabajadas por más de 500 años, primero por los indígenas Muzo y luego durante la colonia española.',
    source: 'Instituto Smithsoniano',
  },
  {
    id: 4,
    category: 'spiritual',
    icon: '✨',
    title: 'Claridad Mental',
    content: 'Cleopatra meditaba con esmeraldas para manifestar claridad en decisiones importantes. La tradición egipcia asociaba la piedra con la sabiduría divina.',
    source: 'Historia del Antiguo Egipto',
  },
  {
    id: 5,
    category: 'jewelry',
    icon: '💎',
    title: 'Rareza Excepcional',
    content: 'Las esmeraldas colombianas son 20 veces más raras que los diamantes. Su color verde intenso proviene del cromo presente únicamente en las montañas andinas.',
    source: 'GIA - Instituto Gemológico',
  },
  {
    id: 6,
    category: 'meditation',
    icon: '🌿',
    title: 'Ritual de Luna Llena',
    content: 'En la tradición colombiana, las esmeraldas se cargan energéticamente durante la luna llena. Coloca tu piedra bajo la luz lunar para renovar su energía.',
    source: 'Tradición ancestral colombiana',
  },
  {
    id: 7,
    category: 'investment',
    icon: '🏦',
    title: 'Patrimonio Familiar',
    content: 'A diferencia del oro, las esmeraldas no requieren almacenamiento especial y pueden transmitirse de generación en generación como joyas funcionales.',
    source: "Christie's Heritage Report",
  },
];

// Knowledge categories
export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  { id: 'spiritual', title: 'Espiritualidad', icon: React.createElement(SelfImprovement), color: PURPLE_ACCENT, facts: 12 },
  { id: 'investment', title: 'Inversión', icon: React.createElement(TrendingUp), color: semanticColors.success.main, facts: 8 },
  { id: 'history', title: 'Historia', icon: React.createElement(HistoryEdu), color: ORANGE_ACCENT, facts: 15 },
  { id: 'jewelry', title: 'Joyería', icon: React.createElement(Diamond), color: BLUE_ACCENT, facts: 10 },
  { id: 'meditation', title: 'Meditación', icon: React.createElement(Spa), color: PINK_ACCENT, facts: 6 },
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
