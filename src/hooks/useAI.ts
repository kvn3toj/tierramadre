import { useState, useCallback } from 'react';
import { AIAnalysisResult } from '../types';
import existingNames from '../data/existingNames.json';

const NAMING_PROMPT = `Eres poeta y experto en nombrar esmeraldas para Tierra Madre, marca colombiana premium.
Tagline: "Esencia y Poder"

OBSERVA CUIDADOSAMENTE la imagen y crea 3 nombres ÚNICOS e INVENTIVOS basados en:
- Lo que VES: forma, color, brillo, inclusiones, corte
- Inspiración de estas categorías (pero inventa nombres NUEVOS, no uses estos ejemplos):
  * Mitología griega/romana/egipcia/colombiana
  * Naturaleza colombiana: ríos, selvas, flores, aves
  * Cosmos: estrellas, constelaciones, fenómenos celestes
  * Emociones: momentos, sentimientos, estados del alma
  * Realeza: títulos, joyas históricas
  * Elementos: agua, fuego, tierra, luz
  * Piedras preciosas personificadas

REGLAS IMPORTANTES:
1. INVENTA nombres completamente NUEVOS - sé creativo y poético
2. Cada nombre debe ser diferente en estilo/categoría
3. Inspírate en lo que VES en la piedra específica
4. Usa español elegante, pueden ser 1-3 palabras

Responde SOLO JSON válido (sin markdown, sin backticks):
{"names":["NombreCreativo1","NombreCreativo2","NombreCreativo3"],"description":"Descripción poética de 2 oraciones basada en lo que ves","characteristics":["detalle visual 1","detalle visual 2","detalle visual 3"]}`;

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

    // Use Groq API with vision model
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!groqKey) {
      // Fallback to local generator
      await new Promise(resolve => setTimeout(resolve, 800));
      setAnalyzing(false);
      return generateSmartSuggestions();
    }

    try {
      // Extract base64 data with proper format for Groq
      const base64Data = imageBase64.includes('base64,')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      // Use Groq API with Llama Vision model
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Data,
                  },
                },
                {
                  type: 'text',
                  text: NAMING_PROMPT,
                },
              ],
            },
          ],
          temperature: 0.95,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Groq API Error:', errorData);
        throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('Groq Response:', data);

      // Extract text from Groq response
      const content = data.choices?.[0]?.message?.content || '';

      // Clean up response - remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Try to parse JSON response with fallback
      try {
        const parsed = JSON.parse(cleanedContent) as AIAnalysisResult;
        setAnalyzing(false);
        return parsed;
      } catch (parseError) {
        console.warn('JSON parse failed, trying to extract data manually:', parseError);

        // Try to extract names from the response even if JSON is malformed
        const namesMatch = cleanedContent.match(/"names"\s*:\s*\[(.*?)\]/s);
        const descMatch = cleanedContent.match(/"description"\s*:\s*"([^"]+)"/);

        if (namesMatch) {
          const namesStr = namesMatch[1];
          const names = namesStr.match(/"([^"]+)"/g)?.map((s: string) => s.replace(/"/g, '')) || getRandomSuggestions();
          const description = descMatch ? descMatch[1] : 'Esmeralda colombiana de belleza excepcional.';

          setAnalyzing(false);
          return {
            names: names.slice(0, 3),
            description,
            characteristics: ['Verde natural', 'Origen colombiano', 'Calidad premium'],
          };
        }

        // Final fallback to local generator
        setAnalyzing(false);
        return generateSmartSuggestions();
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setError(err instanceof Error ? err.message : 'Error analyzing image - usando sugerencias locales');
      setAnalyzing(false);

      // Return fallback suggestions
      return generateSmartSuggestions();
    }
  }, []);

  const generateCaption = useCallback(async (emeraldName: string, description: string): Promise<string | null> => {
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!groqKey) {
      // Default caption template
      return `${emeraldName} ✨

${description}

Descubre la magia de las esmeraldas colombianas en tierramadre.co

#TierraMadre #EsmeraldasColombianas #Esmeraldas #LujoConAlma #EsenciaYPoder`;
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

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error('Caption generation error:', err);
      return null;
    }
  }, []);

  return {
    analyzing,
    error,
    analyzeEmerald,
    generateCaption,
    getRandomSuggestions,
  };
}

// Smart name generator - no API needed!
function generateSmartSuggestions(): AIAnalysisResult {
  const categories = [
    'mythology', 'royalty', 'nature', 'cosmic', 'emotional',
    'elements', 'gems', 'places', 'time', 'abstract', 'descriptive'
  ] as const;
  const suggestions: string[] = [];
  const usedCategories: string[] = [];
  const usedNames = new Set<string>();

  // Get names from 3 different categories for variety
  while (suggestions.length < 3 && usedCategories.length < categories.length) {
    // Shuffle and pick a random unused category
    const availableCategories = categories.filter(c => !usedCategories.includes(c));
    const category = availableCategories[Math.floor(Math.random() * availableCategories.length)];

    const names = existingNames[category] as string[] | undefined;
    if (!names || names.length === 0) {
      usedCategories.push(category);
      continue;
    }

    // Shuffle names within category for more randomness
    const shuffledNames = [...names].sort(() => Math.random() - 0.5);
    const randomName = shuffledNames.find(name => !usedNames.has(name));

    if (randomName) {
      suggestions.push(randomName);
      usedNames.add(randomName);
      usedCategories.push(category);
    } else {
      usedCategories.push(category);
    }
  }

  // Generate a poetic description
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
    names: suggestions,
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    characteristics: characteristics[Math.floor(Math.random() * characteristics.length)],
  };
}

// Legacy function for backwards compatibility
function getRandomSuggestions(): string[] {
  return generateSmartSuggestions().names;
}
