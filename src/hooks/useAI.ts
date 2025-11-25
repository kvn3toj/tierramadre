import { useState, useCallback } from 'react';
import { AIAnalysisResult } from '../types';
import { storage } from '../utils/storage';
import existingNames from '../data/existingNames.json';

const NAMING_PROMPT = `Eres especialista en nombrar esmeraldas para Tierra Madre, marca colombiana de esmeraldas.
Tagline: "Esencia y Poder"

Analiza esta esmeralda y sugiere 3 nombres únicos siguiendo estos patrones:
- Mitología: Diosa, Venus, Gaia, Apolo, Cleopatra
- Naturaleza: Amazonas, Pacífico, Madre Selva, Bambú
- Cósmico: Galaxia, Lunera, Firmamento, Hijos del Sol
- Emocional: Amor Eterno, Chispa Divina, Instante Perfecto
- Realeza: La Reina Margot, Las Emperatrices

Responde SOLO en JSON válido sin markdown ni backticks:
{"names":["Nombre1","Nombre2","Nombre3"],"description":"Descripción poética breve en español","characteristics":["color","claridad","características únicas"]}`;

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

    // Check for Gemini API key (free!) first, then Anthropic
    const geminiKey = storage.getApiKey() || import.meta.env.VITE_GEMINI_API_KEY;

    if (!geminiKey) {
      // Use smart local generator - no API needed!
      // Simulate brief "thinking" for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalyzing(false);
      setError('local'); // Signal to UI that we're using local generator
      return generateSmartSuggestions();
    }

    try {
      // Extract base64 data without prefix
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      // Use Google Gemini API (FREE!)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64Data,
                    },
                  },
                  {
                    text: NAMING_PROMPT,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', errorData);
        throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('Gemini Response:', data);

      // Extract text from Gemini response
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Clean up response - remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Parse JSON response
      const parsed = JSON.parse(cleanedContent) as AIAnalysisResult;
      setAnalyzing(false);
      return parsed;
    } catch (err) {
      console.error('AI analysis error:', err);
      setError(err instanceof Error ? err.message : 'Error analyzing image');
      setAnalyzing(false);

      // Return fallback suggestions
      return {
        names: getRandomSuggestions(),
        description: 'Esmeralda colombiana de excepcional belleza.',
        characteristics: ['Verde natural', 'Origen colombiano'],
      };
    }
  }, []);

  const generateCaption = useCallback(async (emeraldName: string, description: string): Promise<string | null> => {
    const geminiKey = storage.getApiKey() || import.meta.env.VITE_GEMINI_API_KEY;

    if (!geminiKey) {
      // Default caption template
      return `${emeraldName} ✨

${description}

Descubre la magia de las esmeraldas colombianas en tierramadre.co

#TierraMadre #EsmeraldasColombianas #Esmeraldas #LujoConAlma #EsenciaYPoder`;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Esmeralda: ${emeraldName}\nDescripción: ${description}\n\n${CAPTION_PROMPT}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 500,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
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
  const categories = ['mythology', 'nature', 'cosmic', 'emotional', 'royalty', 'disney', 'descriptive'] as const;
  const suggestions: string[] = [];
  const usedCategories: string[] = [];

  // Get names from 3 different categories for variety
  while (suggestions.length < 3) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    if (usedCategories.includes(category)) continue;

    const names = existingNames[category] as string[];
    const randomName = names[Math.floor(Math.random() * names.length)];

    if (!suggestions.includes(randomName)) {
      suggestions.push(randomName);
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
  ];

  const characteristics = [
    ['Verde intenso', 'Brillo excepcional', 'Claridad notable'],
    ['Tonalidad profunda', 'Inclusiones naturales', 'Corte elegante'],
    ['Verde vibrante', 'Alta transparencia', 'Forma armoniosa'],
    ['Color saturado', 'Jardín interno característico', 'Talla precisa'],
    ['Verde azulado', 'Pureza notable', 'Proporciones ideales'],
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
