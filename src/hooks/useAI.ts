import { useState, useCallback } from 'react';
import { AIAnalysisResult } from '../types';
import nameData from '../data/existingNames.json';
import {
  NAMING_PROMPT,
  CAPTION_PROMPT,
  FALLBACK_CAPTION_TEMPLATE,
  FALLBACK_DESCRIPTION,
  FALLBACK_CHARACTERISTICS,
  SMART_DESCRIPTIONS,
  SMART_CHARACTERISTICS,
} from './ai-prompts';
import { STORAGE_KEYS } from '../constants/storage-keys';

// LocalStorage key for used names
const USED_NAMES_KEY = STORAGE_KEYS.AI_USED_NAMES;

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
            description: FALLBACK_DESCRIPTION,
            characteristics: FALLBACK_CHARACTERISTICS,
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
      return FALLBACK_CAPTION_TEMPLATE(emeraldName, description);
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

  return {
    names,
    description: SMART_DESCRIPTIONS[Math.floor(Math.random() * SMART_DESCRIPTIONS.length)],
    characteristics: SMART_CHARACTERISTICS[Math.floor(Math.random() * SMART_CHARACTERISTICS.length)],
  };
}
