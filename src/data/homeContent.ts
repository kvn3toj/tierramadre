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

export interface DailyMeditation {
  title: string;
  duration: number;
  description: string;
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
  { id: 'spiritual', title: 'Espiritualidad', icon: React.createElement(SelfImprovement), color: '#9C27B0', facts: 12 },
  { id: 'investment', title: 'Inversión', icon: React.createElement(TrendingUp), color: '#4CAF50', facts: 8 },
  { id: 'history', title: 'Historia', icon: React.createElement(HistoryEdu), color: '#FF9800', facts: 15 },
  { id: 'jewelry', title: 'Joyería', icon: React.createElement(Diamond), color: '#2196F3', facts: 10 },
  { id: 'meditation', title: 'Meditación', icon: React.createElement(Spa), color: '#E91E63', facts: 6 },
];

// Daily meditations
export const DAILY_MEDITATIONS: DailyMeditation[] = [
  { title: 'Claridad Interior', duration: 180, description: 'Conecta con la energía de la esmeralda para encontrar paz mental' },
  { title: 'Abundancia', duration: 300, description: 'Meditación guiada para manifestar prosperidad' },
  { title: 'Amor Propio', duration: 240, description: 'Activa tu chakra del corazón con visualización verde' },
  { title: 'Gratitud Matutina', duration: 120, description: 'Comienza el día con intención positiva' },
  { title: 'Protección', duration: 180, description: 'Crea un escudo energético con luz esmeralda' },
  { title: 'Sanación Emocional', duration: 360, description: 'Libera emociones bloqueadas con respiración consciente' },
  { title: 'Conexión Ancestral', duration: 300, description: 'Conecta con la sabiduría de las montañas colombianas' },
];
