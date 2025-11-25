import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Badge,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  AutoAwesome as AIIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon,
  Collections as BatchIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useEmeralds } from '../hooks/useEmeralds';
import { useAI } from '../hooks/useAI';
import { EmeraldCategory } from '../types';
import { brandColors } from '../theme';
import { storage } from '../utils/storage';
import { compressImage } from '../utils/imageNormalizer';

interface EmeraldUploaderProps {
  onComplete?: () => void;
}

interface BatchItem {
  id: string;
  imageUrl: string;
  suggestedNames: string[];
  selectedName: string;
  customName: string;
  description: string;
  weightCarats: string;
  priceCOP: string;
  lotCode: string;
  category: EmeraldCategory;
}

export default function EmeraldUploader({ onComplete }: EmeraldUploaderProps) {
  const { addEmerald } = useEmeralds();
  const { analyzing, analyzeEmerald, getRandomSuggestions, error: aiError } = useAI();

  // Upload mode: 0 = single, 1 = batch
  const [uploadMode, setUploadMode] = useState(0);

  // Single upload form state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [description, setDescription] = useState('');
  const [weightCarats, setWeightCarats] = useState('');
  const [priceCOP, setPriceCOP] = useState('');
  const [lotCode, setLotCode] = useState('');
  const [category, setCategory] = useState<EmeraldCategory>('loose');

  // Batch upload state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(storage.getApiKey() || '');
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (uploadMode === 0) {
      // Single mode
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        processFile(file);
      }
    } else {
      // Batch mode
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      processBatchFiles(files);
    }
  }, [uploadMode]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadMode === 0) {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    } else {
      const files = Array.from(e.target.files || []);
      processBatchFiles(files);
    }
  };

  const processFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;

      // Compress image to reduce storage size (max 1200px, 85% quality for good PDF export)
      const compressed = await compressImage(base64, 1200, 0.85);
      setImageUrl(compressed);

      // Trigger AI analysis (use original for better analysis)
      const result = await analyzeEmerald(base64);
      if (result) {
        setSuggestedNames(result.names);
        setDescription(result.description);
      }
    };
    reader.readAsDataURL(file);
  };

  const processBatchFiles = async (files: File[]) => {
    setBatchProcessing(true);

    for (const file of files) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      // Compress image to reduce storage size (max 1200px, 85% quality for good PDF export)
      const compressed = await compressImage(base64, 1200, 0.85);

      // Generate suggestions for each image (use original for better analysis)
      const result = await analyzeEmerald(base64);

      const newItem: BatchItem = {
        id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: compressed, // Store compressed version
        suggestedNames: result?.names || getRandomSuggestions(),
        selectedName: '',
        customName: '',
        description: result?.description || '',
        weightCarats: '',
        priceCOP: '',
        lotCode: '',
        category: 'loose',
      };

      setBatchItems(prev => [...prev, newItem]);
    }

    setBatchProcessing(false);
  };

  const handleNameSelect = (name: string) => {
    setSelectedName(name);
    setCustomName('');
  };

  const handleRefreshSuggestions = async () => {
    if (imageUrl) {
      const result = await analyzeEmerald(imageUrl);
      if (result) {
        setSuggestedNames(result.names);
      }
    } else {
      setSuggestedNames(getRandomSuggestions());
    }
  };

  const handleSaveApiKey = () => {
    storage.setApiKey(apiKey);
    setSettingsOpen(false);
  };

  const handleSave = () => {
    if (!imageUrl) {
      alert('Por favor sube una imagen primero');
      return;
    }

    const finalName = customName || selectedName;
    if (!finalName) {
      alert('Por favor selecciona o escribe un nombre');
      return;
    }

    try {
      const saved = addEmerald({
        name: finalName,
        imageUrl,
        aiSuggestedNames: suggestedNames,
        aiDescription: description,
        weightCarats: weightCarats ? parseFloat(weightCarats) : undefined,
        priceCOP: priceCOP ? parseInt(priceCOP.replace(/\D/g, '')) : undefined,
        lotCode: lotCode || undefined,
        category,
        status: 'available',
      });

      console.log('Emerald saved:', saved);

      // Show success message
      alert(`"${finalName}" guardada exitosamente!`);

      // Reset form
      setImageUrl(null);
      setSuggestedNames([]);
      setSelectedName('');
      setCustomName('');
      setDescription('');
      setWeightCarats('');
      setPriceCOP('');
      setLotCode('');
      setCategory('loose');

      // Navigate to gallery
      onComplete?.();
    } catch (error) {
      console.error('Error saving emerald:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';

      if (errorMsg.includes('STORAGE_FULL')) {
        alert('El almacenamiento está lleno. Por favor ve a la Galería y elimina algunas esmeraldas antiguas para liberar espacio.');
      } else {
        alert(`Error al guardar: ${errorMsg}`);
      }
    }
  };

  // Batch item handlers
  const updateBatchItem = (id: string, updates: Partial<BatchItem>) => {
    setBatchItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeBatchItem = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  };

  const refreshBatchItemNames = async (id: string) => {
    const item = batchItems.find(i => i.id === id);
    if (!item) return;

    const result = await analyzeEmerald(item.imageUrl);
    if (result) {
      updateBatchItem(id, { suggestedNames: result.names });
    }
  };

  const saveBatchItem = (item: BatchItem) => {
    const finalName = item.customName || item.selectedName;
    if (!finalName) {
      alert('Por favor selecciona o escribe un nombre para esta esmeralda');
      return;
    }

    addEmerald({
      name: finalName,
      imageUrl: item.imageUrl,
      aiSuggestedNames: item.suggestedNames,
      aiDescription: item.description,
      weightCarats: item.weightCarats ? parseFloat(item.weightCarats) : undefined,
      priceCOP: item.priceCOP ? parseInt(item.priceCOP.replace(/\D/g, '')) : undefined,
      lotCode: item.lotCode || undefined,
      category: item.category,
      status: 'available',
    });

    removeBatchItem(item.id);
  };

  const saveAllBatch = () => {
    const itemsToSave = batchItems.filter(item => item.customName || item.selectedName);
    if (itemsToSave.length === 0) {
      alert('Por favor asigna nombres a al menos una esmeralda');
      return;
    }

    itemsToSave.forEach(item => {
      addEmerald({
        name: item.customName || item.selectedName,
        imageUrl: item.imageUrl,
        aiSuggestedNames: item.suggestedNames,
        aiDescription: item.description,
        weightCarats: item.weightCarats ? parseFloat(item.weightCarats) : undefined,
        priceCOP: item.priceCOP ? parseInt(item.priceCOP.replace(/\D/g, '')) : undefined,
        lotCode: item.lotCode || undefined,
        category: item.category,
        status: 'available',
      });
    });

    setBatchItems(prev => prev.filter(item => !itemsToSave.includes(item)));
    onComplete?.();
  };

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers ? parseInt(numbers).toLocaleString('es-CO') : '';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontFamily: '"Libre Baskerville", serif' }}>
          Subir Esmeraldas
        </Typography>
        <Button
          startIcon={<SettingsIcon />}
          onClick={() => setSettingsOpen(true)}
          size="small"
        >
          API Key
        </Button>
      </Box>

      {/* Upload Mode Tabs */}
      <Tabs
        value={uploadMode}
        onChange={(_, v) => setUploadMode(v)}
        sx={{ mb: 2 }}
      >
        <Tab icon={<UploadIcon />} label="Individual" />
        <Tab
          icon={
            <Badge badgeContent={batchItems.length} color="primary">
              <BatchIcon />
            </Badge>
          }
          label="Lote (Batch)"
        />
      </Tabs>

      {aiError === 'local' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Generador inteligente local activo - 80+ nombres de Tierra Madre
        </Alert>
      )}
      {aiError && aiError !== 'local' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {aiError} - Usando sugerencias locales
        </Alert>
      )}

      {/* Single Upload Mode */}
      {uploadMode === 0 && (
        <Grid container spacing={3}>
          {/* Left: Upload Zone */}
          <Grid item xs={12} md={6}>
            <Paper
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              sx={{
                p: 3,
                border: `2px dashed ${dragOver ? brandColors.emeraldGreen : 'grey'}`,
                bgcolor: dragOver ? `${brandColors.emeraldGreen}10` : 'transparent',
                transition: 'all 0.2s',
                cursor: 'pointer',
                minHeight: 300,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileSelect}
              />

              {imageUrl ? (
                <Box sx={{ width: '100%', textAlign: 'center' }}>
                  <img
                    src={imageUrl}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 250,
                      objectFit: 'contain',
                      borderRadius: 8,
                    }}
                  />
                  <Typography variant="caption" color="grey.500" sx={{ mt: 1, display: 'block' }}>
                    Haz clic para cambiar la imagen
                  </Typography>
                </Box>
              ) : (
                <>
                  <UploadIcon sx={{ fontSize: 60, color: 'grey.500', mb: 2 }} />
                  <Typography variant="h6" color="grey.500">
                    Arrastra una imagen aquí
                  </Typography>
                  <Typography variant="body2" color="grey.600">
                    o haz clic para seleccionar
                  </Typography>
                </>
              )}
            </Paper>

            {analyzing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <CircularProgress size={20} />
                <Typography color="grey.500">Generando nombres...</Typography>
              </Box>
            )}
          </Grid>

          {/* Right: Form */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              {/* AI Suggestions */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AIIcon sx={{ color: brandColors.gold }} />
                  <Typography variant="subtitle2">Nombres sugeridos</Typography>
                  <IconButton size="small" onClick={handleRefreshSuggestions}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {suggestedNames.map((name) => (
                    <Chip
                      key={name}
                      label={name}
                      onClick={() => handleNameSelect(name)}
                      color={selectedName === name ? 'primary' : 'default'}
                      icon={selectedName === name ? <CheckIcon /> : undefined}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                  {suggestedNames.length === 0 && (
                    <Typography variant="caption" color="grey.500">
                      Sube una imagen para recibir sugerencias
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Custom Name */}
              <TextField
                fullWidth
                label="Nombre personalizado"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setSelectedName('');
                }}
                placeholder="O escribe tu propio nombre"
                sx={{ mb: 2 }}
              />

              {/* Description */}
              <TextField
                fullWidth
                label="Descripción"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />

              {/* Metadata */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Peso (quilates)"
                    value={weightCarats}
                    onChange={(e) => setWeightCarats(e.target.value)}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ct</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Código de lote"
                    value={lotCode}
                    onChange={(e) => setLotCode(e.target.value)}
                    placeholder="L:A-105"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Precio (COP)"
                    value={priceCOP}
                    onChange={(e) => setPriceCOP(formatPrice(e.target.value))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Categoría</InputLabel>
                    <Select
                      value={category}
                      label="Categoría"
                      onChange={(e) => setCategory(e.target.value as EmeraldCategory)}
                    >
                      <MenuItem value="loose">Suelta</MenuItem>
                      <MenuItem value="ring">Anillo</MenuItem>
                      <MenuItem value="pendant">Dije</MenuItem>
                      <MenuItem value="earrings">Aretes</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSave}
                disabled={!imageUrl || (!selectedName && !customName)}
                sx={{
                  bgcolor: brandColors.emeraldGreen,
                  '&:hover': { bgcolor: brandColors.emeraldDark },
                }}
              >
                Guardar Esmeralda
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Batch Upload Mode */}
      {uploadMode === 1 && (
        <Box>
          {/* Batch Upload Zone */}
          <Paper
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            sx={{
              p: 3,
              mb: 3,
              border: `2px dashed ${dragOver ? brandColors.emeraldGreen : 'grey'}`,
              bgcolor: dragOver ? `${brandColors.emeraldGreen}10` : 'transparent',
              transition: 'all 0.2s',
              cursor: 'pointer',
              textAlign: 'center',
            }}
            onClick={() => document.getElementById('batch-file-input')?.click()}
          >
            <input
              id="batch-file-input"
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleFileSelect}
            />
            <BatchIcon sx={{ fontSize: 40, color: 'grey.500', mb: 1 }} />
            <Typography variant="h6" color="grey.500">
              Arrastra múltiples imágenes aquí
            </Typography>
            <Typography variant="body2" color="grey.600">
              o haz clic para seleccionar varias fotos
            </Typography>
          </Paper>

          {batchProcessing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CircularProgress size={20} />
              <Typography color="grey.500">Procesando imágenes...</Typography>
            </Box>
          )}

          {/* Batch Items Grid */}
          {batchItems.length > 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  {batchItems.length} esmeralda{batchItems.length > 1 ? 's' : ''} en lote
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={saveAllBatch}
                  sx={{
                    bgcolor: brandColors.emeraldGreen,
                    '&:hover': { bgcolor: brandColors.emeraldDark },
                  }}
                >
                  Guardar Todas ({batchItems.filter(i => i.customName || i.selectedName).length})
                </Button>
              </Box>

              <Grid container spacing={2}>
                {batchItems.map((item) => (
                  <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <Card sx={{ height: '100%' }}>
                      <CardMedia
                        component="img"
                        height="160"
                        image={item.imageUrl}
                        alt="Emerald"
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent sx={{ pb: 1 }}>
                        {/* Name suggestions */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                          <AIIcon sx={{ fontSize: 16, color: brandColors.gold }} />
                          <Typography variant="caption">Sugerencias:</Typography>
                          <IconButton size="small" onClick={() => refreshBatchItemNames(item.id)}>
                            <RefreshIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                          {item.suggestedNames.map((name) => (
                            <Chip
                              key={name}
                              label={name}
                              size="small"
                              onClick={() => updateBatchItem(item.id, { selectedName: name, customName: '' })}
                              color={item.selectedName === name ? 'primary' : 'default'}
                              sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                            />
                          ))}
                        </Box>
                        <TextField
                          fullWidth
                          size="small"
                          label="Nombre"
                          value={item.customName || item.selectedName}
                          onChange={(e) => updateBatchItem(item.id, { customName: e.target.value, selectedName: '' })}
                          sx={{ mb: 1 }}
                        />
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Peso (ct)"
                              value={item.weightCarats}
                              onChange={(e) => updateBatchItem(item.id, { weightCarats: e.target.value })}
                              type="number"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Lote"
                              value={item.lotCode}
                              onChange={(e) => updateBatchItem(item.id, { lotCode: e.target.value })}
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeBatchItem(item.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => saveBatchItem(item)}
                          disabled={!item.customName && !item.selectedName}
                          sx={{
                            bgcolor: brandColors.emeraldGreen,
                            '&:hover': { bgcolor: brandColors.emeraldDark },
                          }}
                        >
                          Guardar
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {batchItems.length === 0 && !batchProcessing && (
            <Typography color="grey.500" textAlign="center" sx={{ py: 4 }}>
              Arrastra múltiples fotos o haz clic arriba para subir un lote de esmeraldas
            </Typography>
          )}
        </Box>
      )}

      {/* API Key Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Configuración de API</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="grey.500" sx={{ mb: 2 }}>
            El generador local funciona sin API. Opcionalmente, puedes agregar una API Key de Google Gemini para análisis avanzado.
          </Typography>
          <TextField
            fullWidth
            label="Gemini API Key (opcional)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            placeholder="AIza..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveApiKey} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
