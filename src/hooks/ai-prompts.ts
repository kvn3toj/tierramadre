/**
 * AI Prompt Templates for Tierra Madre emerald naming and caption generation.
 * Extracted from useAI.ts to keep prompt content separate from hook logic.
 */

export const NAMING_PROMPT = `Eres poeta experto en nombrar esmeraldas colombianas para Tierra Madre.
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

export const CAPTION_PROMPT = `Escribe un caption para Instagram de Tierra Madre (@tierramadre.co).
Voz de marca: Elegante, místico, orgulloso patrimonio colombiano.
Mensajes clave: "100% Naturales", "ADN de paz", origen ético.

Estructura:
- Gancho emocional
- 2-3 oraciones describiendo la piedra
- Llamado a la acción sutil
- 5-8 hashtags (#TierraMadre #EsmeraldasColombianas)

Máximo 150 palabras, español.
Responde SOLO el caption, sin formato adicional.`;

export const FALLBACK_CAPTION_TEMPLATE = (emeraldName: string, description: string): string =>
  `${emeraldName} \u2728\n\n${description}\n\nDescubre la magia de las esmeraldas colombianas en tierramadre.co\n\n#TierraMadre #EsmeraldasColombianas #Esmeraldas #LujoConAlma #EsenciaYPoder`;

export const FALLBACK_DESCRIPTION = 'Esmeralda colombiana de belleza excepcional.';

export const FALLBACK_CHARACTERISTICS = ['Verde natural', 'Origen colombiano', 'Calidad premium'];

export const SMART_DESCRIPTIONS = [
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

export const NAMING_PROMPT_TEXT = `Eres poeta experto en nombrar esmeraldas colombianas para Tierra Madre.
Tagline: "Esencia y Poder"

Crea 3 nombres ÚNICOS para una esmeralda colombiana:

INSPÍRATE EN:
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
{"names":["Nombre1","Nombre2","Nombre3"]}`;

export const SIMILAR_NAMES_PROMPT = `Eres poeta experto en nombrar esmeraldas colombianas.
Un nombre de referencia es: "{referenceName}"

Genera 3 nombres SIMILARES en estilo, sonido y emoción a ese nombre.
Mantén: el nivel de sofisticación, el idioma español poético, la longitud similar (máx 3 palabras).
Responde SOLO JSON: {"names":["Nombre1","Nombre2","Nombre3"]}`;

export const COLLECTION_NAMES_PROMPT = `Eres curador experto de colecciones de joyería colombiana para Tierra Madre ("Esencia y Poder").

Crea 5 nombres de COLECCIÓN únicos. Una colección agrupa esmeraldas por tema o historia.
Formato: "Colección [Nombre]" — evocador, elegante, hispano.
Ejemplos del estilo: "Colección del Amazonas", "Colección Mitológica", "Colección Selva Madre"

Responde SOLO JSON: {"collections":["Colección Nombre1","Colección Nombre2","Colección Nombre3","Colección Nombre4","Colección Nombre5"]}`;

export const SMART_CHARACTERISTICS = [
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
