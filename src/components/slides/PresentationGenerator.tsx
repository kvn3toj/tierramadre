import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Stack,
  Collapse,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  PlayArrow as GenerateIcon,
} from '@mui/icons-material';
import { colors } from '../brand';
import { generateMultiSlidePDF } from '../../utils/slidePdfGenerator';
import {
  LuxuryCoverTemplate,
  LuxuryMissionTemplate,
  LuxuryOpportunityTemplate,
  LuxuryDifferentiatorsTemplate,
  LuxuryThankYouTemplate,
} from '../templates/LuxuryMasterclassTemplates';
import SmartSlideImage from './SmartSlideImage';

// Template mapping for generated slides - Using Luxury templates for ShowRoom quality
const SLIDE_TEMPLATES = [
  { id: 'cover', name: 'Portada', component: LuxuryCoverTemplate },
  { id: 'mission', name: 'Misión', component: LuxuryMissionTemplate },
  { id: 'differentiators', name: 'Diferenciadores', component: LuxuryDifferentiatorsTemplate },
  { id: 'opportunity', name: 'Oportunidad', component: LuxuryOpportunityTemplate },
  { id: 'content', name: 'Contenido', component: LuxuryMissionTemplate },
  { id: 'reasons', name: 'Razones', component: LuxuryDifferentiatorsTemplate },
  { id: 'cta', name: 'CTA', component: LuxuryOpportunityTemplate },
  { id: 'thanks', name: 'Gracias', component: LuxuryThankYouTemplate },
] as const;

interface GeneratedSlide {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  templateId: string;
}

interface GenerationProgress {
  total: number;
  current: number;
  currentName: string;
  status: 'idle' | 'generating' | 'completed' | 'error';
}

const EXAMPLE_PROMPTS = [
  {
    label: '10 Razones Esmeraldas',
    prompt: `1. Portada: ¿POR QUÉ ES BUEN NEGOCIO COMERCIALIZAR Y EXPORTAR ESMERALDAS? - Presentación ejecutiva para inversionistas
2. Alto valor por unidad: Las esmeraldas son uno de los minerales más caros del mundo. Un quilate puede valer más que el oro. Bajos costos logísticos, perfecto para exportación premium.
3. Demanda internacional estable: Mercados en Estados Unidos, Hong Kong, China, Europa, Dubái e India. Alta rotación con buena calidad. Sin límites geográficos.
4. Colombia es líder mundial: Prestigio internacional por color y transparencia únicos. Mayor valor por marca de origen. Segmento más alto del mercado.
5. Altos márgenes de ganancia: Utilidades del 20% al 300% dependiendo de calidad, certificación y tallado. Gran rentabilidad vs otros productos de exportación.
6. Mercado diversificado: Esmeralda en bruto, tallada y joyas terminadas. Puedes ganar en varios escalones del mismo negocio.
7. Producto compacto: No se dañan, no requieren refrigeración, no pierden valor. Cero desperdicio, cero deterioro, cero pérdida de inventario.
8. Mercado de lujo creciente: Alta joyería, inversión en gemas, coleccionistas y fondos privados. Mercado potente y global.
9. Aumento del valor en el tiempo: Las esmeraldas se valorizan con los años. Es también una inversión patrimonial.
10. Flexibilidad en el negocio: Comprar, intermediar, tallar, certificar, exportar, vender. Oportunidades en todos los niveles con diferentes capitales.
11. Barrera de entrada alta: Conocimiento especializado en clasificación, certificación y rutas de exportación protege al experto. Menos competencia = más margen.
12. Conclusión: Alto valor + Alta demanda + Márgenes amplios + Poca competencia + Fácil almacenamiento + Mercado de lujo = NEGOCIO PERFECTO`,
  },
  {
    label: 'Masterclass Diciembre',
    prompt: `1. Portada: TIERRA MADRE con esmeralda impactante, @tierramadre.co y www.tierramadre.co
2. Misión: "Expandimos la esencia y el poder de la esmeralda colombiana" en ambiente místico tipo caverna de Aladín
3. Validación Global: Países visitados - Mónaco, París, Suiza, España, Dubai - confirmando el valor mundial de la gema
4. Oportunidad: Viene diciembre, es el momento de hacer negocio con la Esmeralda
5. Experto: Presentación del líder de la Confederación de Esmeralderos de Colombia
6. 5 Razones: Las cinco razones por las cuales todo colombiano debería tener una esmeralda
7. CTA: Lotes disponibles para la promoción de diciembre`,
  },
  {
    label: 'Colección Fénix',
    prompt: `1. Portada: Colección FENIX - Renacimiento en Verde
2. Filosofía: El fénix renace, como cada esmeralda única
3. Piezas destacadas: Las 5 esmeraldas más exclusivas
4. Certificación: Garantía de origen colombiano
5. Inversión: Oportunidad única de temporada
6. Contacto: Información y reservas`,
  },
  {
    label: 'Instagram Carousel',
    prompt: `1. Hook: ¿Sabías que Colombia produce el 70% de las esmeraldas del mundo?
2. Color: El verde Muzo - el más codiciado del planeta
3. Claridad: Cómo identificar una esmeralda de calidad
4. Origen: De las minas de Boyacá al mundo
5. CTA: Descubre tu esmeralda ideal - Link en bio`,
  },
];

export default function PresentationGenerator() {
  const [prompt, setPrompt] = useState('');
  const [slides, setSlides] = useState<GeneratedSlide[]>([]);
  const [progress, setProgress] = useState<GenerationProgress>({
    total: 0,
    current: 0,
    currentName: '',
    status: 'idle',
  });
  const [error, setError] = useState<string | null>(null);
  const [renderForExport, setRenderForExport] = useState(false);

  const parsePromptToSlides = (text: string): string[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const slideDescriptions: string[] = [];

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)/);
      if (match) {
        slideDescriptions.push(match[1].trim());
      }
    }

    return slideDescriptions;
  };

  const generateImageUrl = (_description: string, slideIndex: number): string => {
    // ShowRoom-quality visual themes matching LuxuryMasterclass style
    const visualThemes = [
      // Cover - Impactante
      'single stunning colombian emerald gemstone floating with sparkles and light rays on pure black background, luxury jewelry photography, dramatic spotlight, ultra detailed 8K',
      // Value/Business - Profesional
      'multiple emerald gemstones arranged on black velvet with golden price tags, museum quality display, dramatic spotlight lighting, investment concept',
      // International Market - Global
      'elegant dark world map with golden connection lines between continents, emerald green accents on sophisticated dark background, luxury travel concept',
      // Colombian Pride - Origen
      'macro photography of colombian emerald crystal showing beautiful internal gardens and inclusions, scientific documentation style, dramatic lighting on dark background',
      // Profit Margins - Success
      'luxurious emerald jewelry pieces on display pedestals in high-end boutique setting, golden accents, dramatic cinematic lighting',
      // Diversified Market - Variety
      'comparison display of raw emerald rough stone, precision cut emerald, and finished emerald jewelry piece, educational luxury display, dark elegant background',
      // Compact Product - Storage
      'elegant emerald collection in velvet-lined wooden box, safe deposit aesthetic, dramatic spotlight on black background, security and value concept',
      // Luxury Market - High End
      'red carpet glamour setting with emerald necklace on display stand, paparazzi lights effect, luxury fashion photography, dramatic spotlight',
      // Value Over Time - Investment
      'vintage antique emerald jewelry next to modern emerald piece showing timeless value, museum display aesthetic, dramatic lighting',
      // Flexibility - Opportunity
      'colombian emerald mine landscape at golden hour sunrise, workers silhouettes, misty mountains, documentary photography style, inspiring',
      // Barrier to Entry - Expertise
      'professional gemologist examining emerald with loupe in sophisticated laboratory, warm accent lighting on dark background, expertise concept',
      // Conclusion - Thank You
      'single large emerald with tropical colombian flowers arrangement, gratitude concept, elegant dark background with soft emerald green glow',
    ];

    const theme = visualThemes[slideIndex % visualThemes.length];
    const seed = 2024 + slideIndex * 1000; // Consistent seed per slide for reproducibility

    const basePrompt = `${theme}, professional luxury photography, dramatic cinematic lighting, dark elegant background, ultra detailed, 8K quality, sharp focus`;
    const encodedPrompt = encodeURIComponent(basePrompt);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&nologo=true&seed=${seed}`;
  };

  const generatePresentation = async () => {
    if (!prompt.trim()) {
      setError('Por favor ingresa una descripción de tu presentación');
      return;
    }

    const slideDescriptions = parsePromptToSlides(prompt);

    if (slideDescriptions.length === 0) {
      setError('No se detectaron slides. Usa formato numerado: 1. Slide uno, 2. Slide dos');
      return;
    }

    setError(null);
    setSlides([]);
    setProgress({
      total: slideDescriptions.length,
      current: 0,
      currentName: '',
      status: 'generating',
    });

    const generatedSlides: GeneratedSlide[] = [];
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;

    for (let i = 0; i < slideDescriptions.length; i++) {
      const description = slideDescriptions[i];
      const templateIndex = i % SLIDE_TEMPLATES.length;

      setProgress(prev => ({
        ...prev,
        current: i + 1,
        currentName: description.substring(0, 40) + '...',
      }));

      try {
        let slideContent = {
          title: description.split(':')[0]?.toUpperCase() || `SLIDE ${i + 1}`,
          content: description,
        };

        // Use Groq AI if available
        if (groqKey) {
          try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`,
              },
              body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                  {
                    role: 'system',
                    content: `Eres experto en crear contenido para Tierra Madre, marca de esmeraldas colombianas.
Genera contenido profesional para un slide. Responde SOLO JSON válido:
{"title":"TÍTULO CORTO","content":"contenido principal del slide"}`,
                  },
                  { role: 'user', content: description },
                ],
                temperature: 0.7,
                max_tokens: 200,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const content = data.choices?.[0]?.message?.content || '';
              const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

              try {
                const parsed = JSON.parse(cleaned);
                slideContent = {
                  title: parsed.title || slideContent.title,
                  content: parsed.content || slideContent.content,
                };
              } catch {
                // Use fallback
              }
            }
          } catch {
            // Use fallback content
          }
        }

        // Generate AI image with unique theme per slide
        const imageUrl = generateImageUrl(description, i);

        generatedSlides.push({
          id: `slide-gen-${i}`,
          title: slideContent.title,
          content: slideContent.content,
          imageUrl,
          templateId: SLIDE_TEMPLATES[templateIndex].id,
        });

        // Update slides progressively
        setSlides([...generatedSlides]);

        // Rate limiting delay
        if (i < slideDescriptions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch (err) {
        console.error(`Error generating slide ${i + 1}:`, err);
      }
    }

    setProgress(prev => ({ ...prev, status: 'completed' }));
  };

  const handleExportAll = async () => {
    if (slides.length === 0) return;

    setRenderForExport(true);
    setError(null);

    // Wait for slides to render
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const slideIds = slides.map((_, idx) => `pres-slide-${idx}`);
      await generateMultiSlidePDF(slideIds, {
        filename: 'tierra-madre-presentacion',
        quality: 1.0,
        scale: 2,
      });
    } catch (err) {
      setError('Error exportando la presentación');
      console.error(err);
    }

    setRenderForExport(false);
  };

  const handleReset = () => {
    setPrompt('');
    setSlides([]);
    setProgress({ total: 0, current: 0, currentName: '', status: 'idle' });
    setError(null);
  };

  const isGenerating = progress.status === 'generating';
  const hasSlides = slides.length > 0;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontFamily: '"Libre Baskerville", serif', display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon sx={{ color: colors.emeraldDeep }} />
        Generador de Presentaciones
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Describe tu presentación y la IA creará todos los slides con imágenes
      </Typography>

      {/* Example Templates */}
      <Collapse in={!hasSlides && !isGenerating}>
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.900' }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Plantillas de ejemplo:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {EXAMPLE_PROMPTS.map((example) => (
              <Chip
                key={example.label}
                label={example.label}
                onClick={() => setPrompt(example.prompt)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: colors.emeraldDeep, color: 'white' },
                }}
              />
            ))}
          </Stack>
        </Paper>
      </Collapse>

      {/* Prompt Input */}
      <Collapse in={!hasSlides}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe tu presentación usando formato numerado:

1. Portada: Título y descripción
2. Misión: Mensaje principal
3. Contenido: Información clave
4. CTA: Llamada a la acción

Cada número será un slide separado.`}
            disabled={isGenerating}
            sx={{
              '& .MuiInputBase-root': {
                fontFamily: 'monospace',
                fontSize: '0.9rem',
              },
            }}
          />

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <GenerateIcon />}
              onClick={generatePresentation}
              disabled={isGenerating || !prompt.trim()}
              sx={{
                bgcolor: colors.emeraldDeep,
                '&:hover': { bgcolor: colors.mysticalDark },
              }}
            >
              {isGenerating ? 'Generando...' : 'Generar Presentación'}
            </Button>
          </Box>
        </Paper>
      </Collapse>

      {/* Generation Progress */}
      <Collapse in={isGenerating}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Generando Presentación...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Slide {progress.current} de {progress.total}: {progress.currentName}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(progress.current / progress.total) * 100}
            sx={{ height: 8, borderRadius: 4, mb: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {Math.round((progress.current / progress.total) * 100)}% completado
          </Typography>
        </Paper>
      </Collapse>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Generated Slides Grid */}
      <Collapse in={hasSlides}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Slides Generados ({slides.length})
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
              >
                Nueva Presentación
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleExportAll}
                sx={{
                  bgcolor: '#C9A962',
                  '&:hover': { bgcolor: '#9A7B3C' },
                }}
              >
                Descargar PDF ({slides.length} slides)
              </Button>
            </Stack>
          </Box>

          <Grid container spacing={2}>
            {slides.map((slide, idx) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={slide.id}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: '#0A0A0A',
                    border: '1px solid rgba(10,77,60,0.3)',
                    '&:hover': {
                      border: '1px solid #0A4D3C',
                      boxShadow: '0 0 20px rgba(10,77,60,0.3)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Box
                    sx={{
                      aspectRatio: '16/9',
                      bgcolor: '#0D1B1E',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {slide.imageUrl && (
                      <SmartSlideImage
                        src={slide.imageUrl}
                        alt={slide.title}
                        slideIndex={idx}
                      />
                    )}
                    {/* ShowRoom-style vignette overlay */}
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Emerald accent bar */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: 3,
                        height: '100%',
                        bgcolor: '#0A4D3C',
                        boxShadow: '0 0 10px rgba(10,77,60,0.5)',
                      }}
                    />
                    {/* Slide number badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 12,
                        bgcolor: 'rgba(10,77,60,0.9)',
                        color: '#2E9B7D',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        border: '1px solid rgba(46,155,125,0.3)',
                      }}
                    >
                      {idx + 1}
                    </Box>
                    {/* Corner decorations */}
                    <Box sx={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderTop: '1px solid rgba(255,255,255,0.15)', borderRight: '1px solid rgba(255,255,255,0.15)' }} />
                    <Box sx={{ position: 'absolute', bottom: 6, left: 6, width: 20, height: 20, borderBottom: '1px solid rgba(255,255,255,0.15)', borderLeft: '1px solid rgba(255,255,255,0.15)' }} />
                  </Box>
                  <CardContent sx={{ p: 2, bgcolor: '#0A0A0A' }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        color: '#2E9B7D',
                        fontFamily: '"Cormorant Garamond", serif',
                        letterSpacing: '0.05em',
                        fontSize: '0.9rem',
                      }}
                      noWrap
                    >
                      {slide.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        color: 'rgba(255,255,255,0.6)',
                        fontFamily: '"Montserrat", sans-serif',
                        fontSize: '0.7rem',
                        lineHeight: 1.4,
                        mt: 0.5,
                      }}
                    >
                      {slide.content}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Collapse>

      {/* Hidden render container for PDF export */}
      {renderForExport && (
        <Box
          sx={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            zIndex: -1,
          }}
        >
          {slides.map((slide, idx) => {
            const templateIndex = idx % SLIDE_TEMPLATES.length;
            const Template = SLIDE_TEMPLATES[templateIndex].component;
            const templateId = SLIDE_TEMPLATES[templateIndex].id;

            // Map props based on template type
            const templateProps: Record<string, unknown> = {
              id: `pres-slide-${idx}`,
            };

            // Cover template
            if (templateId === 'cover') {
              templateProps.title = slide.title;
              templateProps.subtitle = slide.content;
            }
            // Mission template (uses mission prop for quote)
            else if (templateId === 'mission' || templateId === 'content') {
              templateProps.mission = slide.content;
            }
            // Opportunity template
            else if (templateId === 'opportunity' || templateId === 'cta') {
              templateProps.title = slide.title;
              templateProps.content = slide.content;
            }
            // Differentiators template
            else if (templateId === 'differentiators' || templateId === 'reasons') {
              templateProps.title = slide.title;
            }
            // Thank you template
            else if (templateId === 'thanks') {
              templateProps.message = slide.title;
              templateProps.contact = '@tierramadre.co | www.tierramadre.co';
            }
            // Default fallback
            else {
              templateProps.title = slide.title;
            }

            return (
              <Box key={slide.id}>
                <Template {...templateProps} />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
