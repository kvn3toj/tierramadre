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
  CardActionArea,
  CardMedia,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Palette as PaletteIcon,
  Image as ImageIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { brandColors } from '../../theme';
import { useEmeralds } from '../../hooks/useEmeralds';

// Slide template types
type SlideTemplate = 'purpose' | 'cover' | 'product' | 'stats' | 'quote' | 'team' | 'contact';

// Logo position options
type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none';

interface LogoPositionOption {
  id: LogoPosition;
  label: string;
  icon: string;
}

const LOGO_POSITIONS: LogoPositionOption[] = [
  { id: 'none', label: 'Sin Logo', icon: '⊘' },
  { id: 'top-left', label: 'Arriba Izq', icon: '↖' },
  { id: 'top-right', label: 'Arriba Der', icon: '↗' },
  { id: 'bottom-left', label: 'Abajo Izq', icon: '↙' },
  { id: 'bottom-right', label: 'Abajo Der', icon: '↘' },
];

interface SlideData {
  id: string;
  template: SlideTemplate;
  title: string;
  subtitle?: string;
  mainText?: string;
  accentText?: string;
  footer?: string;
  imageDescription?: string;
  imageUrl?: string;
  logoPosition?: LogoPosition;
}

interface TemplateOption {
  id: SlideTemplate;
  name: string;
  description: string;
  icon: string;
}

const TEMPLATES: TemplateOption[] = [
  { id: 'cover', name: 'Portada', description: 'Slide de apertura con logo y tagline', icon: '🎬' },
  { id: 'purpose', name: 'Propósito', description: 'Misión o visión con imagen impactante', icon: '🎯' },
  { id: 'product', name: 'Producto', description: 'Showcase de esmeralda con detalles', icon: '💎' },
  { id: 'stats', name: 'Estadísticas', description: 'Números y métricas clave', icon: '📊' },
  { id: 'quote', name: 'Cita', description: 'Testimonio o frase inspiradora', icon: '💬' },
  { id: 'team', name: 'Equipo', description: 'Presentación del equipo', icon: '👥' },
  { id: 'contact', name: 'Contacto', description: 'Información de contacto y cierre', icon: '📧' },
];

const AI_PROMPT_SUGGESTIONS = [
  'Slide sobre el origen de las esmeraldas colombianas',
  'Slide de estadísticas: Colombia produce el 70% de esmeraldas del mundo',
  'Slide con cita sobre la belleza de las esmeraldas',
  'Slide de presentación del proceso de extracción ético',
  'Slide sobre certificaciones y garantías de autenticidad',
];

export default function SlideEditor() {
  const { emeralds } = useEmeralds();
  const [selectedTemplate, setSelectedTemplate] = useState<SlideTemplate | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSlide, setGeneratedSlide] = useState<SlideData | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('top-left');

  const handleGenerateWithAI = async () => {
    if (!prompt.trim()) {
      setError('Por favor, describe el contenido de la diapositiva');
      return;
    }

    setGenerating(true);
    setError(null);

    const groqKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!groqKey) {
      // Fallback: generate locally without AI
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGeneratedSlide({
        id: Date.now().toString(),
        template: selectedTemplate || 'purpose',
        title: 'TÍTULO GENERADO',
        subtitle: 'Subtítulo basado en tu descripción',
        mainText: prompt,
        accentText: 'TIERRA MADRE',
        footer: '@tierramadre.co | www.tierramadre.co',
        logoPosition,
      });
      setGenerating(false);
      return;
    }

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
              content: `Eres un experto en crear contenido para presentaciones de Tierra Madre, marca premium de esmeraldas colombianas.
Tagline: "Esencia y Poder". Tono: Elegante, místico, orgulloso del patrimonio colombiano.

Genera contenido para una diapositiva en formato JSON:
{"template":"purpose","title":"TÍTULO MAYÚSCULAS","subtitle":"subtítulo corto","mainText":"texto principal","accentText":"frase destacada","imageDescription":"descripción de imagen"}

Responde SOLO JSON válido, sin markdown.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Groq API Error:', errorData);
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Clean and parse JSON
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      try {
        const parsed = JSON.parse(cleanedContent);

        setGeneratedSlide({
          id: Date.now().toString(),
          template: parsed.template || selectedTemplate || 'purpose',
          title: parsed.title || 'TIERRA MADRE',
          subtitle: parsed.subtitle,
          mainText: parsed.mainText,
          accentText: parsed.accentText,
          imageDescription: parsed.imageDescription,
          footer: '@tierramadre.co | www.tierramadre.co',
          logoPosition,
        });
      } catch (parseError) {
        // Fallback: try to extract data manually from malformed JSON
        console.warn('JSON parse failed, using fallback:', parseError);

        const titleMatch = cleanedContent.match(/"title"\s*:\s*"([^"]+)"/);
        const subtitleMatch = cleanedContent.match(/"subtitle"\s*:\s*"([^"]+)"/);
        const accentMatch = cleanedContent.match(/"accentText"\s*:\s*"([^"]+)"/);
        const imageDescMatch = cleanedContent.match(/"imageDescription"\s*:\s*"([^"]+)"/);

        setGeneratedSlide({
          id: Date.now().toString(),
          template: selectedTemplate || 'purpose',
          title: titleMatch?.[1] || 'TIERRA MADRE',
          subtitle: subtitleMatch?.[1] || prompt.substring(0, 50),
          mainText: prompt,
          accentText: accentMatch?.[1] || 'ESENCIA Y PODER',
          imageDescription: imageDescMatch?.[1] || 'Esmeralda colombiana brillante',
          footer: '@tierramadre.co | www.tierramadre.co',
          logoPosition,
        });
      }
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : 'Error generando contenido');
    }

    setGenerating(false);
  };

  const handleSaveSlide = () => {
    if (generatedSlide) {
      setSlides([...slides, generatedSlide]);
      setGeneratedSlide(null);
      setPrompt('');
      setSelectedTemplate(null);
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const handleSelectImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    if (generatedSlide) {
      setGeneratedSlide({ ...generatedSlide, imageUrl });
    }
    setImageDialogOpen(false);
  };

  const handleGenerateImage = async () => {
    if (!generatedSlide?.imageDescription) {
      setError('Primero genera el contenido del slide para obtener una descripción de imagen');
      return;
    }

    setGeneratingImage(true);
    setError(null);

    try {
      // Create a detailed prompt for emerald images
      const imagePrompt = `Colombian emerald gemstone, ${generatedSlide.imageDescription}, professional jewelry photography, dramatic lighting, dark background, luxury, high-end, detailed macro shot, green precious stone, elegant`;

      // Pollinations.ai is free and doesn't require API key
      const encodedPrompt = encodeURIComponent(imagePrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&nologo=true`;

      // Pre-load the image to ensure it's ready
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Error loading image'));
        img.src = imageUrl;
      });

      setSelectedImage(imageUrl);
      setGeneratedSlide({ ...generatedSlide, imageUrl });
    } catch (err) {
      console.error('Image generation error:', err);
      setError('Error generando imagen. Intenta de nuevo.');
    }

    setGeneratingImage(false);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontFamily: '"Libre Baskerville", serif' }}>
        Crear Nueva Diapositiva
      </Typography>

      <Grid container spacing={3}>
        {/* Left: Template Selection & Prompt */}
        <Grid item xs={12} md={7}>
          {/* Template Selection */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PaletteIcon fontSize="small" />
              Selecciona un template (opcional)
            </Typography>
            <Grid container spacing={1}>
              {TEMPLATES.map((template) => (
                <Grid item xs={6} sm={4} md={3} key={template.id}>
                  <Card
                    sx={{
                      border: selectedTemplate === template.id
                        ? `2px solid ${brandColors.emeraldGreen}`
                        : '2px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <CardActionArea onClick={() => setSelectedTemplate(template.id)}>
                      <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                        <Typography variant="h5">{template.icon}</Typography>
                        <Typography variant="caption" display="block">
                          {template.name}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Logo Position Selection */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ImageIcon fontSize="small" />
              Posición del Logo
            </Typography>
            <Grid container spacing={1}>
              {LOGO_POSITIONS.map((pos) => (
                <Grid item xs={4} sm={2.4} key={pos.id}>
                  <Card
                    sx={{
                      border: logoPosition === pos.id
                        ? `2px solid ${brandColors.emeraldGreen}`
                        : '2px solid transparent',
                      transition: 'all 0.2s',
                      bgcolor: logoPosition === pos.id ? 'rgba(80, 200, 120, 0.1)' : 'transparent',
                    }}
                  >
                    <CardActionArea onClick={() => setLogoPosition(pos.id)}>
                      <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                        <Typography variant="h6">{pos.icon}</Typography>
                        <Typography variant="caption" display="block" sx={{ fontSize: '10px' }}>
                          {pos.label}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {logoPosition !== 'none' && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  component="img"
                  src="/logo-tierra-madre.png"
                  alt="Logo Preview"
                  sx={{ height: 32, width: 'auto', borderRadius: 1 }}
                />
                <Typography variant="caption" color="grey.500">
                  Logo Tierra Madre
                </Typography>
              </Box>
            )}
          </Paper>

          {/* AI Prompt Input */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AIIcon fontSize="small" sx={{ color: brandColors.emeraldGreen }} />
              Describe tu diapositiva
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Ejemplo: Crea una diapositiva sobre el origen de las esmeraldas colombianas, mencionando las minas de Muzo y Chivor como las más importantes del mundo..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* Suggestions */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="grey.500" sx={{ mb: 1, display: 'block' }}>
                Sugerencias:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {AI_PROMPT_SUGGESTIONS.map((suggestion, i) => (
                  <Chip
                    key={i}
                    label={suggestion}
                    size="small"
                    variant="outlined"
                    onClick={() => handleUseSuggestion(suggestion)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <AIIcon />}
              onClick={handleGenerateWithAI}
              disabled={generating || !prompt.trim()}
              sx={{
                bgcolor: brandColors.emeraldGreen,
                '&:hover': { bgcolor: brandColors.emeraldDark },
              }}
            >
              {generating ? 'Generando con IA...' : 'Generar Diapositiva con IA'}
            </Button>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Right: Preview & Generated Content */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Vista Previa
            </Typography>

            {generatedSlide ? (
              <>
                {/* Mini Preview */}
                <Box
                  sx={{
                    width: '100%',
                    aspectRatio: '16/9',
                    bgcolor: '#1a1a1f',
                    borderRadius: 1,
                    p: 3,
                    mb: 2,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Simulated slide preview */}
                  <Typography
                    sx={{
                      fontFamily: '"Libre Baskerville", serif',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'white',
                      textTransform: 'uppercase',
                      mb: 1,
                    }}
                  >
                    {generatedSlide.title}
                  </Typography>
                  {generatedSlide.subtitle && (
                    <Typography
                      sx={{
                        fontFamily: 'Roboto',
                        fontSize: '12px',
                        color: 'grey.400',
                        mb: 1,
                      }}
                    >
                      {generatedSlide.subtitle}
                    </Typography>
                  )}
                  {generatedSlide.accentText && (
                    <Typography
                      sx={{
                        fontFamily: '"Libre Baskerville", serif',
                        fontSize: '24px',
                        fontWeight: 700,
                        color: brandColors.emeraldLight,
                      }}
                    >
                      {generatedSlide.accentText}
                    </Typography>
                  )}

                  {/* Image or Emerald glow effect */}
                  {generatedSlide.imageUrl || selectedImage ? (
                    <Box
                      component="img"
                      src={generatedSlide.imageUrl || selectedImage || ''}
                      alt="Slide image"
                      sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        width: '45%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.9,
                        maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        position: 'absolute',
                        right: -20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 80,
                        height: 100,
                        background: `radial-gradient(ellipse, ${brandColors.emeraldGreen}40 0%, transparent 70%)`,
                        filter: 'blur(20px)',
                      }}
                    />
                  )}

                  {/* Logo overlay based on position */}
                  {logoPosition !== 'none' && (
                    <Box
                      component="img"
                      src="/logo-tierra-madre.png"
                      alt="Tierra Madre Logo"
                      sx={{
                        position: 'absolute',
                        width: 48,
                        height: 'auto',
                        zIndex: 10,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                        ...(logoPosition === 'top-left' && { top: 12, left: 12 }),
                        ...(logoPosition === 'top-right' && { top: 12, right: 12 }),
                        ...(logoPosition === 'bottom-left' && { bottom: 12, left: 12 }),
                        ...(logoPosition === 'bottom-right' && { bottom: 12, right: 12 }),
                      }}
                    />
                  )}
                </Box>

                {/* Generated Content Details */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="grey.500">Template:</Typography>
                  <Chip
                    label={TEMPLATES.find(t => t.id === generatedSlide.template)?.name || generatedSlide.template}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>

                {generatedSlide.imageDescription && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="grey.500" display="block">
                      Imagen sugerida por IA:
                    </Typography>
                    <Typography variant="body2" color="grey.300" sx={{ mb: 1 }}>
                      {generatedSlide.imageDescription}
                    </Typography>
                  </Box>
                )}

                {/* Image Selection */}
                <Box sx={{ mb: 2 }}>
                  {/* AI Image Generation Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={generatingImage ? <CircularProgress size={18} color="inherit" /> : <AIIcon />}
                    onClick={handleGenerateImage}
                    disabled={generatingImage || !generatedSlide.imageDescription}
                    sx={{
                      mb: 1,
                      bgcolor: '#7C3AED',
                      '&:hover': { bgcolor: '#6D28D9' },
                    }}
                  >
                    {generatingImage ? 'Generando imagen...' : 'Generar Imagen con IA (Gratis)'}
                  </Button>

                  <Typography variant="caption" color="grey.500" display="block" sx={{ mb: 1, textAlign: 'center' }}>
                    — o —
                  </Typography>

                  {/* Gallery Selection Button */}
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ImageIcon />}
                    onClick={() => setImageDialogOpen(true)}
                    size="small"
                  >
                    {selectedImage || generatedSlide.imageUrl ? 'Cambiar desde Galería' : 'Seleccionar de Galería'}
                  </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSlide}
                    sx={{
                      bgcolor: brandColors.emeraldGreen,
                      '&:hover': { bgcolor: brandColors.emeraldDark },
                    }}
                  >
                    Guardar Slide
                  </Button>
                  <Tooltip title="Regenerar">
                    <IconButton onClick={handleGenerateWithAI} disabled={generating}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: '16/9',
                  bgcolor: 'grey.900',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <AddIcon sx={{ fontSize: 40, color: 'grey.600' }} />
                <Typography color="grey.600" variant="body2">
                  Describe tu slide para generar
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Saved Slides */}
          {slides.length > 0 && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Slides Guardados ({slides.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {slides.map((slide, index) => (
                  <Chip
                    key={slide.id}
                    label={`${index + 1}. ${slide.title.substring(0, 15)}...`}
                    size="small"
                    onDelete={() => setSlides(slides.filter(s => s.id !== slide.id))}
                  />
                ))}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Image Selection Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Seleccionar Imagen de la Galería
          <IconButton onClick={() => setImageDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {emeralds.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ImageIcon sx={{ fontSize: 60, color: 'grey.500', mb: 2 }} />
              <Typography color="grey.500">
                No hay imágenes en tu galería.
              </Typography>
              <Typography variant="body2" color="grey.600">
                Ve a la pestaña "Subir" para agregar esmeraldas.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {emeralds.map((emerald) => (
                <Grid item xs={6} sm={4} md={3} key={emerald.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: selectedImage === emerald.imageUrl ? `3px solid ${brandColors.emeraldGreen}` : '3px solid transparent',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'scale(1.02)' },
                    }}
                    onClick={() => handleSelectImage(emerald.imageUrl)}
                  >
                    <CardMedia
                      component="img"
                      height="120"
                      image={emerald.imageUrl}
                      alt={emerald.name}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="caption" noWrap>
                        {emerald.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
