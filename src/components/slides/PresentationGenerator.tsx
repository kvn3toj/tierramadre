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
  BrandCoverTemplate,
  MissionTemplate,
  GlobalValidationTemplate,
  OpportunityTemplate,
  ExpertTemplate,
  ReasonsTemplate,
  CTATemplate,
} from '../templates/MasterclassTemplates';
import { ThankYouTemplate } from '../templates';

// Template mapping for generated slides
const SLIDE_TEMPLATES = [
  { id: 'cover', name: 'Portada', component: BrandCoverTemplate },
  { id: 'mission', name: 'Misión', component: MissionTemplate },
  { id: 'global', name: 'Global', component: GlobalValidationTemplate },
  { id: 'opportunity', name: 'Oportunidad', component: OpportunityTemplate },
  { id: 'expert', name: 'Experto', component: ExpertTemplate },
  { id: 'reasons', name: 'Razones', component: ReasonsTemplate },
  { id: 'cta', name: 'CTA', component: CTATemplate },
  { id: 'thanks', name: 'Gracias', component: ThankYouTemplate },
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

  const generateImageUrl = (description: string, slideIndex: number): string => {
    // Create unique visual themes for different slide types
    const visualThemes = [
      'single large emerald crystal on dark velvet, dramatic spotlight, luxury display',
      'emerald in natural cave setting with mystical golden light rays',
      'world map with emerald markers, luxury travel concept, golden compass',
      'christmas gift boxes with emerald jewelry, festive luxury atmosphere',
      'professional gemologist examining emerald with loupe, warm lighting',
      'comparison of emerald cuts and colors, educational display',
      'elegant hands wearing emerald ring, red carpet glamour',
      'emerald collection on black silk, museum quality display',
      'colombian landscape with emerald mine entrance, sunrise',
      'emerald phoenix rising from flames, mythical luxury art',
      'thank you card with emerald and tropical flowers, gratitude',
    ];

    const theme = visualThemes[slideIndex % visualThemes.length];
    const seed = Date.now() + slideIndex * 1000; // Unique seed per slide

    const basePrompt = `${theme}, ${description}, professional luxury photography, dramatic cinematic lighting, dark elegant background, ultra detailed, 8K quality, rich emerald greens, golden accents`;
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
                <Card sx={{ height: '100%' }}>
                  <Box
                    sx={{
                      aspectRatio: '16/9',
                      bgcolor: 'grey.800',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {slide.imageUrl && (
                      <Box
                        component="img"
                        src={slide.imageUrl}
                        alt={slide.title}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    )}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        bgcolor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {idx + 1}
                    </Box>
                  </Box>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                      {slide.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
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
            return (
              <Box key={slide.id}>
                <Template
                  id={`pres-slide-${idx}`}
                  title={slide.title}
                  backgroundImage={slide.imageUrl}
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
