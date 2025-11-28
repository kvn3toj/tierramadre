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
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  GridView as GridIcon,
  ViewList as ListIcon,
  ViewCarousel as CarouselIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useEmeralds } from '../hooks/useEmeralds';
import { generateCatalog, downloadPDF } from '../utils/pdfGenerator';
import { brandColors } from '../theme';

export default function PDFExport() {
  const { emeralds } = useEmeralds();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Options state
  const [title, setTitle] = useState('Catálogo de Esmeraldas');
  const [showPrices, setShowPrices] = useState(true);
  const [showWeights, setShowWeights] = useState(true);
  const [showLotCodes, setShowLotCodes] = useState(true);
  const [layout, setLayout] = useState<'grid' | 'list' | 'carousel'>('carousel');

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
      });

      const filename = `tierra-madre-catalogo-${new Date().toISOString().split('T')[0]}`;
      downloadPDF(pdf, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generando el PDF. Intenta de nuevo.');
    }

    setGenerating(false);
  };

  if (emeralds.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 2,
        }}
      >
        <PdfIcon sx={{ fontSize: 80, color: brandColors.emeraldGreen, opacity: 0.5 }} />
        <Typography variant="h5" color="grey.500">
          No hay esmeraldas para exportar
        </Typography>
        <Typography variant="body2" color="grey.600">
          Ve a la pestaña "Subir" para agregar esmeraldas
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontFamily: '"Libre Baskerville", serif' }}>
        Exportar Catálogo PDF
      </Typography>

      <Grid container spacing={3}>
        {/* Left: Selection */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Seleccionar esmeraldas ({selectedIds.size} de {emeralds.length})
              </Typography>
              <Button
                size="small"
                onClick={handleSelectAll}
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
                      sx={{
                        cursor: 'pointer',
                        border: isSelected ? `2px solid ${brandColors.emeraldGreen}` : '2px solid transparent',
                        transition: 'all 0.2s',
                        position: 'relative',
                      }}
                    >
                      {isSelected && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: brandColors.emeraldGreen,
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1,
                          }}
                        >
                          <CheckIcon sx={{ fontSize: 16, color: 'white' }} />
                        </Box>
                      )}
                      <CardMedia
                        component="img"
                        height="100"
                        image={emerald.imageUrl}
                        alt={emerald.name}
                        sx={{ opacity: isSelected ? 1 : 0.7 }}
                      />
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="caption" noWrap>
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
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Opciones del catálogo
            </Typography>

            <TextField
              fullWidth
              label="Título del catálogo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Diseño
            </Typography>
            <ToggleButtonGroup
              value={layout}
              exclusive
              onChange={(_, v) => v && setLayout(v)}
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="carousel">
                <CarouselIcon sx={{ mr: 1 }} /> Carrusel
              </ToggleButton>
              <ToggleButton value="grid">
                <GridIcon sx={{ mr: 1 }} /> Grilla
              </ToggleButton>
              <ToggleButton value="list">
                <ListIcon sx={{ mr: 1 }} /> Lista
              </ToggleButton>
            </ToggleButtonGroup>

            {layout === 'carousel' && (
              <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                <strong>Carrusel Premium:</strong> Una página por esmeralda con imagen grande, información completa y branding de Tierra Madre.
              </Alert>
            )}

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Incluir información
            </Typography>
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showPrices}
                    onChange={(e) => setShowPrices(e.target.checked)}
                  />
                }
                label="Mostrar precios"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showWeights}
                    onChange={(e) => setShowWeights(e.target.checked)}
                  />
                }
                label="Mostrar peso (quilates)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showLotCodes}
                    onChange={(e) => setShowLotCodes(e.target.checked)}
                  />
                }
                label="Mostrar código de lote"
              />
            </Box>

            {selectedIds.size > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {selectedIds.size} esmeralda{selectedIds.size > 1 ? 's' : ''} seleccionada{selectedIds.size > 1 ? 's' : ''}
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={generating ? <CircularProgress size={20} /> : <DownloadIcon />}
              onClick={handleGenerate}
              disabled={selectedIds.size === 0 || generating}
              sx={{
                bgcolor: brandColors.emeraldGreen,
                '&:hover': { bgcolor: brandColors.emeraldDark },
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
