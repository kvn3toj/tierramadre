/**
 * Home page content data.
 * Extracted from Home.tsx for better separation of concerns.
 *
 * Oracle quotes about Colombian emeralds - wisdom, history, and mystique.
 */
import { emeraldCore } from '../design-system/tokens/colors';

export interface OracleQuote {
  id: number;
  icon: string;
  content: string;
  source: string;
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
  breathingPattern?: BreathingPattern;
  chakraColor?: string;
  guidedSteps?: string[];
  ambientFrequency?: number;
}

// =============================================================================
// ORACLE QUOTES - Extensive collection of emerald wisdom
// Random quote shown on each Home visit
// =============================================================================

export const ORACLE_QUOTES: OracleQuote[] = [
  // --- SPIRITUAL & MYSTICAL ---
  {
    id: 1,
    icon: '💚',
    content: 'La esmeralda es la piedra del corazón. Quien la porta, abre las puertas del amor incondicional.',
    source: 'Tradición védica',
  },
  {
    id: 2,
    icon: '✨',
    content: 'Cleopatra adornaba su palacio con esmeraldas, creyendo que traían eterna juventud y sabiduría divina.',
    source: 'Antiguo Egipto',
  },
  {
    id: 3,
    icon: '🌙',
    content: 'Las esmeraldas absorben la luz de la luna llena. Los ancestros Muzo las dejaban bajo el cielo nocturno para recargar su energía.',
    source: 'Tradición Muzo',
  },
  {
    id: 4,
    icon: '🔮',
    content: 'En la antigua Roma, Nerón observaba las luchas de gladiadores a través de una esmeralda para calmar su vista y su espíritu.',
    source: 'Historia romana',
  },
  {
    id: 5,
    icon: '💫',
    content: 'La esmeralda colombiana vibra en la frecuencia del chakra del corazón, sanando heridas emocionales del pasado.',
    source: 'Cristaloterapia',
  },
  {
    id: 6,
    icon: '🌿',
    content: 'Los Incas consideraban la esmeralda como lágrimas de la diosa de la fertilidad, símbolo de vida eterna.',
    source: 'Mitología Inca',
  },
  {
    id: 7,
    icon: '⚡',
    content: 'Se dice que la esmeralda revela la verdad: cambia de tono cuando hay falsedad cerca de quien la porta.',
    source: 'Leyenda medieval',
  },
  {
    id: 8,
    icon: '🕊️',
    content: 'La piedra de Venus. Los alquimistas la asociaban con el amor, la armonía y la abundancia espiritual.',
    source: 'Tradición alquímica',
  },

  // --- HISTORY & ORIGIN ---
  {
    id: 9,
    icon: '⛏️',
    content: 'Las minas de Muzo producen esmeraldas desde hace más de 500 años. Los indígenas las llamaban "fuego verde".',
    source: 'Smithsoniano',
  },
  {
    id: 10,
    icon: '🏔️',
    content: 'Colombia produce el 70% de las esmeraldas más finas del mundo. El verde de los Andes es incomparable.',
    source: 'GIA',
  },
  {
    id: 11,
    icon: '👑',
    content: 'La corona de los Andes, creada en 1599, contiene 453 esmeraldas colombianas. Hoy vale más de 10 millones de dólares.',
    source: 'Museo Metropolitano',
  },
  {
    id: 12,
    icon: '🗺️',
    content: 'Los conquistadores españoles encontraron esmeraldas tan grandes que no creyeron fueran reales. Las destruyeron buscando "verdaderas".',
    source: 'Crónicas de Indias',
  },
  {
    id: 13,
    icon: '📜',
    content: 'Chivor y Muzo: dos minas legendarias separadas por montañas, unidas por la misma magia verde.',
    source: 'Historia colombiana',
  },
  {
    id: 14,
    icon: '🌎',
    content: 'Las esmeraldas colombianas se formaron hace 65 millones de años, cuando los Andes emergían del mar.',
    source: 'Geología andina',
  },
  {
    id: 15,
    icon: '⚔️',
    content: 'Los Muzo defendieron sus minas durante 20 años contra los españoles. El verde era sagrado.',
    source: 'Historia precolombina',
  },

  // --- VALUE & INVESTMENT ---
  {
    id: 16,
    icon: '📈',
    content: 'Las esmeraldas de alta calidad han apreciado 12% anual en la última década, superando a los diamantes.',
    source: "Sotheby's",
  },
  {
    id: 17,
    icon: '💎',
    content: 'Una esmeralda de 1 quilate puede valer más que un diamante del mismo peso. El color lo es todo.',
    source: "Christie's",
  },
  {
    id: 18,
    icon: '🏆',
    content: 'La esmeralda Rockefeller se vendió por $5.5 millones en 2017. 18 quilates de perfección colombiana.',
    source: "Christie's",
  },
  {
    id: 19,
    icon: '💰',
    content: 'Las esmeraldas sin tratamiento son cada vez más raras. Su valor aumenta exponencialmente cada año.',
    source: 'Mercado de gemas',
  },
  {
    id: 20,
    icon: '👨‍👩‍👧',
    content: 'Una esmeralda es un legado. Pasa de generación en generación ganando historia y valor.',
    source: 'Tradición familiar',
  },
  {
    id: 21,
    icon: '🔒',
    content: 'En tiempos de incertidumbre económica, las gemas de color son refugio de valor tangible.',
    source: 'Análisis financiero',
  },

  // --- JEWELRY & CRAFTSMANSHIP ---
  {
    id: 22,
    icon: '💍',
    content: 'Jackie Kennedy recibió un anillo de compromiso con esmeralda de 2.84 quilates. Elegancia atemporal.',
    source: 'Historia del diseño',
  },
  {
    id: 23,
    icon: '👗',
    content: 'Elizabeth Taylor coleccionaba esmeraldas colombianas. Decía que ninguna otra gema capturaba así la luz.',
    source: 'Colección Taylor',
  },
  {
    id: 24,
    icon: '🎨',
    content: 'El "jardín" de una esmeralda son sus inclusiones naturales. Cada piedra cuenta una historia única de millones de años.',
    source: 'Arte gemológico',
  },
  {
    id: 25,
    icon: '⭐',
    content: 'El corte esmeralda fue diseñado específicamente para esta gema, maximizando su color y protegiendo sus esquinas.',
    source: 'Historia de la joyería',
  },
  {
    id: 26,
    icon: '🌟',
    content: 'Las esmeraldas colombianas son 20 veces más raras que los diamantes. El cromo andino crea su verde único.',
    source: 'GIA',
  },

  // --- COLOMBIAN PRIDE ---
  {
    id: 27,
    icon: '🇨🇴',
    content: 'Colombia: donde la tierra guarda fuego verde. Cada esmeralda es un pedazo de los Andes.',
    source: 'Orgullo colombiano',
  },
  {
    id: 28,
    icon: '🌄',
    content: 'De Boyacá al mundo. Las esmeraldas colombianas adornan coronas, museos y corazones en los cinco continentes.',
    source: 'Herencia boyacense',
  },
  {
    id: 29,
    icon: '💪',
    content: 'Detrás de cada esmeralda hay manos colombianas. Generaciones de familias mineras que guardan el secreto del verde.',
    source: 'Comunidad minera',
  },
  {
    id: 30,
    icon: '🌺',
    content: 'El verde de Colombia no solo está en sus montañas, sino en las gemas que el mundo entero desea.',
    source: 'Identidad nacional',
  },

  // --- WISDOM & PHILOSOPHY ---
  {
    id: 31,
    icon: '🧘',
    content: 'La esmeralda enseña paciencia. Millones de años para formarse, una vida para apreciarla.',
    source: 'Filosofía de las gemas',
  },
  {
    id: 32,
    icon: '💭',
    content: 'Poseer una esmeralda es guardar un secreto de la tierra. Un misterio verde que solo tú conoces.',
    source: 'Reflexión personal',
  },
  {
    id: 33,
    icon: '🌱',
    content: 'Como la naturaleza, la esmeralda perfecta no existe. Sus "imperfecciones" son su autenticidad.',
    source: 'Sabiduría gemológica',
  },
  {
    id: 34,
    icon: '♾️',
    content: 'La esmeralda simboliza la renovación. Cada vez que la miras, ves algo nuevo en su profundidad verde.',
    source: 'Simbolismo antiguo',
  },
  {
    id: 35,
    icon: '🎁',
    content: 'Regalar una esmeralda es desear abundancia, amor y prosperidad a quien la recibe.',
    source: 'Tradición de regalos',
  },

  // --- CURIOUS FACTS ---
  {
    id: 36,
    icon: '🔬',
    content: 'El verde de la esmeralda viene del cromo y vanadio atrapados hace millones de años. Química convertida en belleza.',
    source: 'Ciencia gemológica',
  },
  {
    id: 37,
    icon: '📊',
    content: 'Solo 1 de cada millón de cristales de berilo tiene la calidad para ser una esmeralda de joyería.',
    source: 'Estadística minera',
  },
  {
    id: 38,
    icon: '🌡️',
    content: 'Las esmeraldas se formaron a 200°C bajo tierra, en venas de cuarzo y calcita. Fuego verde del interior de la Tierra.',
    source: 'Geología',
  },
  {
    id: 39,
    icon: '👁️',
    content: 'El color verde de la esmeralda es el más relajante para el ojo humano. Por eso los joyeros la usan para descansar la vista.',
    source: 'Oftalmología',
  },
  {
    id: 40,
    icon: '🎭',
    content: 'La palabra "esmeralda" viene del griego "smaragdos": piedra verde. Simple y perfecto.',
    source: 'Etimología',
  },
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
