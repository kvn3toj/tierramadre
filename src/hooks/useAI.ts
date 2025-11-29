import { useState, useCallback } from 'react';
import { AIAnalysisResult } from '../types';
import nameData from '../data/existingNames.json';

// LocalStorage key for used names
const USED_NAMES_KEY = 'tierra-madre-used-names';

// Get used names from localStorage
function getUsedNames(): Set<string> {
  try {
    const stored = localStorage.getItem(USED_NAMES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Save used name to localStorage
function saveUsedName(name: string): void {
  try {
    const used = getUsedNames();
    used.add(name);
    localStorage.setItem(USED_NAMES_KEY, JSON.stringify([...used]));
  } catch {
    console.warn('Could not save used name to localStorage');
  }
}

// Export function to mark a name as used (called when emerald is saved)
export function markNameAsUsed(name: string): void {
  saveUsedName(name);
}

// Export function to get count of used names
export function getUsedNamesCount(): number {
  return getUsedNames().size;
}

// Export function to clear used names (for admin/reset purposes)
export function clearUsedNames(): void {
  localStorage.removeItem(USED_NAMES_KEY);
}

const NAMING_PROMPT = `Eres poeta experto en nombrar esmeraldas colombianas para Tierra Madre.
Tagline: "Esencia y Poder"

ANALIZA la imagen cuidadosamente y crea 3 nombres ÚNICOS basados en:

LO QUE VES EN LA PIEDRA:
- Forma: ¿es redonda, ovalada, rectangular, irregular, gota?
- Color: ¿verde intenso, claro, azulado, amarillento?
- Brillo: ¿muy brillante, satinado, opaco?
- Inclusiones: ¿tiene jardín interno, vetas, puntos?
- Tamaño aparente: ¿grande, mediana, pequeña?

INSPÍRATE EN:
- Lo que la piedra te EVOCA visualmente
- Mitología (griega, egipcia, colombiana)
- Naturaleza colombiana (fauna, flora, lugares)
- Cosmos y estrellas
- Emociones y sentimientos
- Realeza y nobleza

REGLAS:
1. Cada nombre debe ser DIFERENTE en estilo
2. Máximo 3 palabras por nombre
3. Español elegante y poético
4. Nombres que nadie haya usado antes

Responde SOLO JSON válido:
{"names":["Nombre1","Nombre2","Nombre3"],"description":"2 oraciones describiendo lo que VES en la piedra","characteristics":["característica visual 1","característica visual 2","característica visual 3"]}`;

const CAPTION_PROMPT = `Escribe un caption para Instagram de Tierra Madre (@tierramadre.co).
Voz de marca: Elegante, místico, orgulloso patrimonio colombiano.
Mensajes clave: "100% Naturales", "ADN de paz", origen ético.

Estructura:
- Gancho emocional
- 2-3 oraciones describiendo la piedra
- Llamado a la acción sutil
- 5-8 hashtags (#TierraMadre #EsmeraldasColombianas)

Máximo 150 palabras, español.
Responde SOLO el caption, sin formato adicional.`;

interface AIHookReturn {
  analyzing: boolean;
  error: string | null;
  analyzeEmerald: (imageBase64: string) => Promise<AIAnalysisResult | null>;
  generateCaption: (emeraldName: string, description: string) => Promise<string | null>;
  getRandomSuggestions: () => string[];
}

export function useAI(): AIHookReturn {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeEmerald = useCallback(async (imageBase64: string): Promise<AIAnalysisResult | null> => {
    setAnalyzing(true);
    setError(null);

    const groqKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!groqKey) {
      // Fallback to smart local generator
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalyzing(false);
      return generateSmartSuggestions();
    }

    try {
      const base64Data = imageBase64.includes('base64,')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.2-90b-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: base64Data },
                },
                {
                  type: 'text',
                  text: NAMING_PROMPT,
                },
              ],
            },
          ],
          temperature: 0.9,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Groq API Error:', errorData);
        // Fallback to local generator
        setAnalyzing(false);
        return generateSmartSuggestions();
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Clean and parse response
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      try {
        const parsed = JSON.parse(cleanedContent) as AIAnalysisResult;
        // Filter out already used names
        const usedNames = getUsedNames();
        const availableNames = parsed.names.filter(name => !usedNames.has(name));

        // If AI returned used names, generate more
        if (availableNames.length < 3) {
          const extraNames = generateUniqueNames(3 - availableNames.length);
          availableNames.push(...extraNames);
        }

        setAnalyzing(false);
        return {
          ...parsed,
          names: availableNames.slice(0, 3),
        };
      } catch {
        // Try to extract names manually
        const namesMatch = cleanedContent.match(/"names"\s*:\s*\[(.*?)\]/s);
        if (namesMatch) {
          const names = namesMatch[1].match(/"([^"]+)"/g)?.map((s: string) => s.replace(/"/g, '')) || [];
          const usedNames = getUsedNames();
          const availableNames = names.filter((name: string) => !usedNames.has(name));

          if (availableNames.length < 3) {
            const extraNames = generateUniqueNames(3 - availableNames.length);
            availableNames.push(...extraNames);
          }

          setAnalyzing(false);
          return {
            names: availableNames.slice(0, 3),
            description: 'Esmeralda colombiana de belleza excepcional.',
            characteristics: ['Verde natural', 'Origen colombiano', 'Calidad premium'],
          };
        }

        setAnalyzing(false);
        return generateSmartSuggestions();
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setError('Usando generador local de nombres');
      setAnalyzing(false);
      return generateSmartSuggestions();
    }
  }, []);

  const generateCaption = useCallback(async (emeraldName: string, description: string): Promise<string | null> => {
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!groqKey) {
      return `${emeraldName} ✨\n\n${description}\n\nDescubre la magia de las esmeraldas colombianas en tierramadre.co\n\n#TierraMadre #EsmeraldasColombianas #Esmeraldas #LujoConAlma #EsenciaYPoder`;
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            {
              role: 'user',
              content: `Esmeralda: ${emeraldName}\nDescripción: ${description}\n\n${CAPTION_PROMPT}`,
            },
          ],
          temperature: 0.8,
          max_tokens: 500,
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch {
      return null;
    }
  }, []);

  return {
    analyzing,
    error,
    analyzeEmerald,
    generateCaption,
    getRandomSuggestions: () => generateSmartSuggestions().names,
  };
}

// Generate a unique name that hasn't been used
function generateUniqueNames(count: number): string[] {
  const usedNames = getUsedNames();
  const names: string[] = [];
  let attempts = 0;
  const maxAttempts = count * 50; // Prevent infinite loop

  while (names.length < count && attempts < maxAttempts) {
    attempts++;
    const name = generateSingleName();
    if (!usedNames.has(name) && !names.includes(name)) {
      names.push(name);
    }
  }

  return names;
}

// Generate a single creative name
function generateSingleName(): string {
  const strategies = [
    generateFromCategory,
    generateWithPrefix,
    generateWithSuffix,
    generateCombination,
    generatePoetic,
  ];

  const strategy = strategies[Math.floor(Math.random() * strategies.length)];
  return strategy();
}

// Strategy 1: Pick from a category
function generateFromCategory(): string {
  const categories = [
    'mythology', 'royalty', 'nature_flora', 'nature_fauna', 'nature_places',
    'cosmic', 'emotional', 'elements', 'gems', 'legendary_places',
    'time', 'abstract', 'colors_descriptive', 'poetic_combinations'
  ] as const;

  const category = categories[Math.floor(Math.random() * categories.length)];
  const items = (nameData as Record<string, string[]>)[category];
  if (!items || items.length === 0) return generateWithPrefix();

  return items[Math.floor(Math.random() * items.length)];
}

// Strategy 2: Prefix + base name
function generateWithPrefix(): string {
  const prefixes = nameData.prefixes;
  const bases = [
    ...nameData.mythology.slice(0, 20),
    ...nameData.nature_fauna.slice(0, 15),
    ...nameData.cosmic.slice(0, 15),
    ...nameData.abstract.slice(0, 15),
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const base = bases[Math.floor(Math.random() * bases.length)];

  return `${prefix} ${base}`;
}

// Strategy 3: Base name + suffix
function generateWithSuffix(): string {
  const suffixes = nameData.suffixes;
  const bases = [
    ...nameData.mythology.slice(0, 20),
    ...nameData.nature_flora.slice(0, 15),
    ...nameData.gems.slice(0, 10),
    ...nameData.emotional.slice(0, 15),
  ];

  const base = bases[Math.floor(Math.random() * bases.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return `${base} ${suffix}`;
}

// Strategy 4: Creative combination
function generateCombination(): string {
  const adjectives = [
    'Dorada', 'Sagrada', 'Mística', 'Eterna', 'Divina', 'Celestial',
    'Ancestral', 'Imperial', 'Radiante', 'Sublime', 'Secreta', 'Encantada'
  ];

  const nouns = [
    ...nameData.nature_fauna.slice(0, 10),
    ...nameData.nature_flora.slice(0, 10),
    ...nameData.cosmic.slice(0, 10),
    ...nameData.gems.slice(0, 10),
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  // Sometimes put adjective first, sometimes after
  return Math.random() > 0.5 ? `${noun} ${adj}` : `${adj} ${noun}`;
}

// Strategy 5: Poetic/compound name
function generatePoetic(): string {
  const poeticParts1 = [
    'Sueño', 'Suspiro', 'Eco', 'Reflejo', 'Danza', 'Canto', 'Vuelo',
    'Abrazo', 'Beso', 'Caricia', 'Secreto', 'Misterio', 'Destello'
  ];

  const poeticParts2 = [
    'del Alba', 'de Luna', 'del Sol', 'del Mar', 'del Bosque',
    'de Estrellas', 'del Tiempo', 'de Jade', 'Esmeralda', 'Ancestral',
    'del Río', 'de la Selva', 'del Páramo', 'de Muzo'
  ];

  const part1 = poeticParts1[Math.floor(Math.random() * poeticParts1.length)];
  const part2 = poeticParts2[Math.floor(Math.random() * poeticParts2.length)];

  return `${part1} ${part2}`;
}

// Smart name generator - main function
function generateSmartSuggestions(): AIAnalysisResult {
  const names = generateUniqueNames(3);

  const descriptions = [
    'Una gema de verde profundo que captura la esencia de las montañas colombianas.',
    'Esmeralda de brillo excepcional, nacida en las entrañas de la tierra madre.',
    'Verde vibrante que evoca los bosques ancestrales del corazón de Colombia.',
    'Piedra de claridad sublime, un tesoro de la naturaleza colombiana.',
    'Gema de tonalidades únicas, portadora del espíritu de la tierra.',
    'Esmeralda de belleza incomparable, herencia de las minas de Muzo.',
    'Verde intenso que refleja la pureza de las aguas del Pacífico.',
    'Joya de luz interior, guardiana de secretos milenarios.',
    'Cristal de poder ancestral, forjado en las profundidades de Boyacá.',
    'Piedra mística que susurra historias de civilizaciones perdidas.',
    'Gema sagrada que brilla con la luz de mil amaneceres tropicales.',
    'Esmeralda regia, digna de coronas y sueños eternos.',
    'Verde que danza entre la luz y la sombra, revelando su alma.',
    'Tesoro colombiano que guarda el ADN de la paz y la prosperidad.',
    'Joya celestial caída del firmamento, atrapada en forma terrenal.',
    'Piedra de transformación, símbolo de renacimiento y esperanza.',
  ];

  const characteristics = [
    ['Verde intenso', 'Brillo excepcional', 'Claridad notable'],
    ['Tonalidad profunda', 'Inclusiones naturales', 'Corte elegante'],
    ['Verde vibrante', 'Alta transparencia', 'Forma armoniosa'],
    ['Color saturado', 'Jardín interno característico', 'Talla precisa'],
    ['Verde azulado', 'Pureza notable', 'Proporciones ideales'],
    ['Saturación perfecta', 'Luz interna brillante', 'Simetría exquisita'],
    ['Verde bosque', 'Cristalización única', 'Peso excepcional'],
    ['Tono sublime', 'Facetas perfectas', 'Origen certificado'],
    ['Verde hierba', 'Transparencia cristalina', 'Forma oval elegante'],
    ['Color musgo', 'Inclusiones tipo jardín', 'Corte esmeralda clásico'],
    ['Verde primavera', 'Brillo sedoso', 'Proporciones áureas'],
    ['Tono selva', 'Fluorescencia sutil', 'Calidad museo'],
  ];

  return {
    names,
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    characteristics: characteristics[Math.floor(Math.random() * characteristics.length)],
  };
}
