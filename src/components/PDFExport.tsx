import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { FileText, Download, LayoutGrid, List, Layers, CheckCircle, Image } from 'lucide-react';
import { useEmeralds } from '../hooks/useEmeralds';
import { generateCatalog, downloadPDF } from '../utils/pdfGenerator';
import {
  gradients,
  radius,
  animation,
  getTokens,
  getShadows,
  getHeaderStyles,
} from '../design-system';

export default function PDFExport() {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const tokens = getTokens(mode);
  const shadows = getShadows(mode);
  const headerStyle = getHeaderStyles(mode);
  const brandColor = tokens.interactive.primary;

  const { emeralds } = useEmeralds();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Options state
  const [title, setTitle] = useState('Catálogo de Esmeraldas');
  const [showPrices, setShowPrices] = useState(true);
  const [showWeights, setShowWeights] = useState(true);
  const [showLotCodes, setShowLotCodes] = useState(true);
  const [layout, setLayout] = useState<'grid' | 'list' | 'carousel'>('carousel');
  const [catalogTheme, setCatalogTheme] = useState<'dark' | 'light'>('dark');

  // UI state
  const [generating, setGenerating] = useState(false);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === emeralds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emeralds.map(e => e.id)));
    }
  };

  const handleGenerate = async () => {
    const selectedEmeralds = emeralds.filter(e => selectedIds.has(e.id));
    if (selectedEmeralds.length === 0) {
      alert('Selecciona al menos una esmeralda');
      return;
    }

    setGenerating(true);

    try {
      const pdf = await generateCatalog(selectedEmeralds, {
        title,
        showPrices,
        showWeights,
        showLotCodes,
        layout,
        theme: catalogTheme,
      });

      const filename = `tierra-madre-catalogo-${new Date().toISOString().split('T')[0]}`;
      downloadPDF(pdf, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generando el PDF. Intenta de nuevo.');
    }

    setGenerating(false);
  };

  const selectionProgress = emeralds.length > 0 ? (selectedIds.size / emeralds.length) * 100 : 0;

  if (emeralds.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center', py: 8 }}>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: radius.xl,
            border: `1px solid ${tokens.border.card}`,
            bgcolor: tokens.background.surface,
            boxShadow: shadows.card,
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: radius.xl,
              bgcolor: alpha(brandColor, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <FileText size={48} color={brandColor} strokeWidth={1.5} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: tokens.text.primary, mb: 1 }}>
            No hay esmeraldas para exportar
          </Typography>
          <Typography variant="body1" sx={{ color: tokens.text.secondary, mb: 3 }}>
            Ve a la pestaña "Subir" para agregar esmeraldas a tu colección
          </Typography>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: radius.lg,
              bgcolor: alpha(brandColor, 0.1),
              color: brandColor,
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <Image size={16} />
            0 esmeraldas en galería
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Premium Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: radius.xl,
          overflow: 'hidden',
          boxShadow: shadows.lg,
        }}
      >
        <Box
          sx={{
            p: 3,
            background: headerStyle.background,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Emerald accent line */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: headerStyle.accentLine,
            }}
          />

          {/* Subtle overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 300,
              height: '100%',
              background: headerStyle.overlay,
              pointerEvents: 'none',
            }}
          />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: radius.lg,
                    background: alpha(headerStyle.brandColor, 0.15),
                    border: `1px solid ${alpha(headerStyle.brandColor, 0.3)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={26} color={headerStyle.brandColor} />
                </Box>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: headerStyle.brandColor,
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      fontSize: '0.625rem',
                      display: 'block',
                      mb: 0.25,
                    }}
                  >
                    TM STUDIO
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 600,
                      color: headerStyle.titleColor,
                      fontFamily: '"Libre Baskerville", Georgia, serif',
                      letterSpacing: '-0.02em',
                      fontSize: '1.5rem',
                    }}
                  >
                    Exportar Catálogo
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: headerStyle.subtitleColor,
                      fontWeight: 400,
                      fontSize: '0.875rem',
                    }}
                  >
                    Crea catálogos PDF profesionales de tu colección
                  </Typography>
                </Box>
              </Box>

              {/* Stats */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderRadius: radius.md,
                    background: alpha('#FFFFFF', 0.1),
                    border: `1px solid ${alpha('#FFFFFF', 0.15)}`,
                    textAlign: 'center',
                    minWidth: 72,
                  }}
                >
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                    {selectedIds.size}
                  </Typography>
                  <Typography sx={{ fontSize: '0.625rem', color: alpha('#FFFFFF', 0.7), fontWeight: 500, mt: 0.25 }}>
                    Seleccionadas
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderRadius: radius.md,
                    background: alpha('#FFFFFF', 0.2),
                    border: `1px solid ${alpha('#FFFFFF', 0.25)}`,
                    textAlign: 'center',
                    minWidth: 72,
                  }}
                >
                  <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                    {emeralds.length}
                  </Typography>
                  <Typography sx={{ fontSize: '0.625rem', color: alpha('#FFFFFF', 0.7), fontWeight: 500, mt: 0.25 }}>
                    Disponibles
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Selection Progress */}
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.7), fontWeight: 500 }}>
                  Progreso de selección
                </Typography>
                <Typography variant="caption" sx={{ color: headerStyle.brandColor, fontWeight: 600 }}>
                  {selectionProgress.toFixed(0)}%
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 6,
                  borderRadius: radius.full,
                  bgcolor: alpha('#FFFFFF', 0.15),
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${selectionProgress}%`,
                    borderRadius: radius.full,
                    background: gradients.emerald,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Left: Selection */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: radius.xl,
              border: `1px solid ${tokens.border.card}`,
              bgcolor: tokens.background.surface,
              boxShadow: shadows.card,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: radius.md,
                    bgcolor: alpha(brandColor, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image size={18} color={brandColor} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: tokens.text.primary }}>
                    Seleccionar Esmeraldas
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.text.secondary }}>
                    {selectedIds.size} de {emeralds.length} seleccionadas
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                onClick={handleSelectAll}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  color: brandColor,
                  bgcolor: alpha(brandColor, 0.08),
                  px: 2,
                  borderRadius: radius.md,
                  '&:hover': {
                    bgcolor: alpha(brandColor, 0.15),
                  },
                }}
              >
                {selectedIds.size === emeralds.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </Button>
            </Box>

            <Grid container spacing={2}>
              {emeralds.map((emerald) => {
                const isSelected = selectedIds.has(emerald.id);
                return (
                  <Grid item xs={6} sm={4} md={3} key={emerald.id}>
                    <Card
                      onClick={() => handleToggleSelect(emerald.id)}
                      elevation={0}
                      sx={{
                        cursor: 'pointer',
                        border: isSelected ? `2px solid ${brandColor}` : `2px solid ${tokens.border.card}`,
                        borderRadius: radius.lg,
                        transition: animation.transition.default,
                        position: 'relative',
                        bgcolor: isSelected ? alpha(brandColor, 0.04) : tokens.background.muted,
                        '&:hover': {
                          borderColor: brandColor,
                          transform: 'translateY(-2px)',
                          boxShadow: shadows.cardHover,
                        },
                      }}
                    >
                      {isSelected && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: brandColor,
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1,
                            boxShadow: shadows.emerald,
                          }}
                        >
                          <CheckCircle size={14} color="white" />
                        </Box>
                      )}
                      <CardMedia
                        component="img"
                        height="100"
                        image={emerald.imageUrl}
                        alt={emerald.name}
                        sx={{
                          opacity: isSelected ? 1 : 0.75,
                          transition: 'opacity 0.2s',
                          borderRadius: `${radius.lg} ${radius.lg} 0 0`,
                        }}
                      />
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{
                            fontWeight: isSelected ? 600 : 500,
                            color: isSelected ? brandColor : tokens.text.primary,
                          }}
                        >
                          {emerald.name}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* Right: Options */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              position: 'sticky',
              top: 20,
              borderRadius: radius.xl,
              border: `1px solid ${tokens.border.card}`,
              bgcolor: tokens.background.surface,
              boxShadow: shadows.card,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  bgcolor: alpha(brandColor, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Layers size={18} color={brandColor} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: tokens.text.primary }}>
                Opciones del Catálogo
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Título del catálogo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: radius.md,
                },
              }}
            />

            <Typography variant="subtitle2" sx={{ mb: 1.5, color: tokens.text.primary, fontWeight: 600 }}>
              Diseño del catálogo
            </Typography>
            <ToggleButtonGroup
              value={layout}
              exclusive
              onChange={(_, v) => v && setLayout(v)}
              fullWidth
              sx={{
                mb: 3,
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: radius.md,
                  color: tokens.text.secondary,
                  borderColor: tokens.border.default,
                  '&.Mui-selected': {
                    bgcolor: alpha(brandColor, 0.1),
                    color: brandColor,
                    borderColor: brandColor,
                    '&:hover': {
                      bgcolor: alpha(brandColor, 0.15),
                    },
                  },
                },
              }}
            >
              <ToggleButton value="carousel">
                <Layers size={18} style={{ marginRight: 6 }} /> Carrusel
              </ToggleButton>
              <ToggleButton value="grid">
                <LayoutGrid size={18} style={{ marginRight: 6 }} /> Grilla
              </ToggleButton>
              <ToggleButton value="list">
                <List size={18} style={{ marginRight: 6 }} /> Lista
              </ToggleButton>
            </ToggleButtonGroup>

            {layout === 'carousel' && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: tokens.text.primary, fontWeight: 600 }}>
                  Tema del catálogo
                </Typography>
                <ToggleButtonGroup
                  value={catalogTheme}
                  exclusive
                  onChange={(_, v) => v && setCatalogTheme(v)}
                  fullWidth
                  sx={{
                    mb: 2,
                    '& .MuiToggleButton-root': {
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1.5,
                      borderRadius: radius.md,
                      color: tokens.text.secondary,
                      borderColor: tokens.border.default,
                      '&.Mui-selected': {
                        bgcolor: alpha(brandColor, 0.1),
                        color: brandColor,
                        borderColor: brandColor,
                      },
                    },
                  }}
                >
                  <ToggleButton value="dark">
                    <DarkModeIcon sx={{ mr: 1 }} /> Oscuro
                  </ToggleButton>
                  <ToggleButton value="light">
                    <LightModeIcon sx={{ mr: 1 }} /> Claro
                  </ToggleButton>
                </ToggleButtonGroup>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: radius.lg,
                    bgcolor: alpha(brandColor, 0.06),
                    border: `1px solid ${alpha(brandColor, 0.2)}`,
                  }}
                >
                  <Typography sx={{ fontSize: '0.8125rem', color: brandColor, fontWeight: 500 }}>
                    <strong>Carrusel Premium:</strong> Una página por esmeralda con imagen grande, información completa y branding de Tierra Madre.
                  </Typography>
                </Paper>
              </>
            )}

            <Typography variant="subtitle2" sx={{ mb: 1.5, color: tokens.text.primary, fontWeight: 600 }}>
              Incluir información
            </Typography>
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: radius.lg,
                bgcolor: tokens.background.muted,
                border: `1px solid ${tokens.border.light}`,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showPrices}
                    onChange={(e) => setShowPrices(e.target.checked)}
                    sx={{
                      color: tokens.text.muted,
                      '&.Mui-checked': { color: brandColor },
                    }}
                  />
                }
                label={<Typography sx={{ fontSize: '0.875rem', color: tokens.text.primary }}>Mostrar precios</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showWeights}
                    onChange={(e) => setShowWeights(e.target.checked)}
                    sx={{
                      color: tokens.text.muted,
                      '&.Mui-checked': { color: brandColor },
                    }}
                  />
                }
                label={<Typography sx={{ fontSize: '0.875rem', color: tokens.text.primary }}>Mostrar peso (quilates)</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showLotCodes}
                    onChange={(e) => setShowLotCodes(e.target.checked)}
                    sx={{
                      color: tokens.text.muted,
                      '&.Mui-checked': { color: brandColor },
                    }}
                  />
                }
                label={<Typography sx={{ fontSize: '0.875rem', color: tokens.text.primary }}>Mostrar código de lote</Typography>}
              />
            </Box>

            {selectedIds.size > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: radius.lg,
                  bgcolor: tokens.status.successBg,
                  border: `1px solid ${alpha(tokens.status.success, 0.3)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <CheckCircle size={20} color={tokens.status.success} />
                <Typography sx={{ color: tokens.status.success, fontWeight: 600, fontSize: '0.875rem' }}>
                  {selectedIds.size} esmeralda{selectedIds.size > 1 ? 's' : ''} lista{selectedIds.size > 1 ? 's' : ''} para exportar
                </Typography>
              </Paper>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={generating ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <Download size={20} />}
              onClick={handleGenerate}
              disabled={selectedIds.size === 0 || generating}
              sx={{
                background: gradients.emerald,
                fontWeight: 700,
                py: 1.75,
                borderRadius: radius.lg,
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: shadows.emerald,
                '&:hover': {
                  background: gradients.emeraldSoft,
                  boxShadow: shadows.emeraldLg,
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  bgcolor: tokens.border.default,
                },
                transition: animation.transition.default,
              }}
            >
              {generating ? 'Generando...' : 'Descargar PDF'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
