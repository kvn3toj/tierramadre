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
  Badge,
  alpha,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon,
  Collections as BatchIcon,
} from '@mui/icons-material';
import { Upload, Settings, Image, Layers } from 'lucide-react';
import { useEmeraldUpload } from '../hooks/useEmeraldUpload';
import { EmeraldCategory } from '../types';
import { brandColors } from '../theme';
import { storage } from '../utils/storage';
import MediaPreview from './MediaPreview';
import { BatchItemCard } from './upload';

interface EmeraldUploaderProps {
  onComplete?: () => void;
}

export default function EmeraldUploader({ onComplete }: EmeraldUploaderProps) {
  // Upload hook - handles all upload logic and state
  const {
    singleState,
    setSingleState,
    batchItems,
    batchProcessing,
    analyzing,
    aiError,
    processFile,
    processBatchFiles,
    handleNameSelect,
    handleRefreshSuggestions,
    handleSave,
    updateBatchItem,
    removeBatchItem,
    refreshBatchItemNames,
    saveBatchItem,
    saveAllBatch,
    formatPrice,
    isMediaFile,
  } = useEmeraldUpload();

  // Destructure single state for convenience
  const { imageUrl, mediaType, thumbnailUrl, suggestedNames, selectedName, customName,
          description, weightCarats, priceCOP, lotCode, category, ringSize, color, quality } = singleState;

  // UI-only state
  const [uploadMode, setUploadMode] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(storage.getApiKey() || '');
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const filesArray = Array.from(e.dataTransfer.files).filter(isMediaFile);

    if (filesArray.length === 0) return;

    if (uploadMode === 0) {
      // Individual mode: if multiple files dropped, switch to batch mode
      if (filesArray.length > 1) {
        setUploadMode(1); // Switch to batch mode
        processBatchFiles(filesArray);
      } else {
        processFile(filesArray[0]);
      }
    } else {
      // Batch mode
      processBatchFiles(filesArray);
    }
  }, [uploadMode]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesArray = Array.from(e.target.files || []);

    if (filesArray.length === 0) return;

    if (uploadMode === 0) {
      // Individual mode: if multiple files selected, switch to batch mode
      if (filesArray.length > 1) {
        setUploadMode(1); // Switch to batch mode
        processBatchFiles(filesArray);
      } else {
        processFile(filesArray[0]);
      }
    } else {
      processBatchFiles(filesArray);
    }
  };

  // Note: processFile, processBatchFiles, handleNameSelect, handleRefreshSuggestions,
  // handleSave, updateBatchItem, removeBatchItem, refreshBatchItemNames, saveBatchItem,
  // saveAllBatch, and formatPrice are now provided by useEmeraldUpload hook

  const handleSaveApiKey = () => {
    storage.setApiKey(apiKey);
    setSettingsOpen(false);
  };

  // Local wrapper for handleSave to pass onComplete
  const onSave = () => handleSave(onComplete);

  // Local wrapper for saveAllBatch to pass onComplete
  const onSaveAllBatch = () => saveAllBatch(onComplete);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 3, md: 0 } }}>
      {/* Premium Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}
            >
              <Upload size={28} color="#FFFFFF" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Subir Esmeraldas
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                Agrega nuevas joyas a tu colección
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Settings size={18} />}
            onClick={() => setSettingsOpen(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              fontWeight: 600,
              px: 2.5,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              backdropFilter: 'blur(10px)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)',
              },
            }}
          >
            API Key
          </Button>
        </Box>
      </Paper>

      {/* Upload Mode Tabs - Premium Style */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          bgcolor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          p: 0.5,
          display: 'inline-flex',
        }}
      >
        <Tabs
          value={uploadMode}
          onChange={(_, v) => setUploadMode(v)}
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#6B7280',
              px: 3,
              '&.Mui-selected': {
                color: '#059669',
                bgcolor: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              },
            },
            '& .MuiTabs-indicator': {
              display: 'none',
            },
          }}
        >
          <Tab icon={<Image size={18} />} iconPosition="start" label="Individual" />
          <Tab
            icon={
              <Badge badgeContent={batchItems.length} color="primary" sx={{ '& .MuiBadge-badge': { bgcolor: '#059669' } }}>
                <Layers size={18} />
              </Badge>
            }
            iconPosition="start"
            label="Lote (Batch)"
          />
        </Tabs>
      </Paper>

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
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {/* Left: Upload Zone */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              sx={{
                p: 4,
                borderRadius: 4,
                border: `2px dashed ${dragOver ? '#059669' : '#D1D5DB'}`,
                bgcolor: dragOver ? alpha('#059669', 0.06) : '#FAFAFA',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                minHeight: 340,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': {
                  borderColor: '#059669',
                  bgcolor: alpha('#059669', 0.04),
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById('file-input')?.click();
              }}
            >
              <input
                id="file-input"
                type="file"
                accept="image/*,video/*,.heic,.heif"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />

              {imageUrl ? (
                <Box sx={{ width: '100%', textAlign: 'center' }}>
                  <Box
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      display: 'inline-block',
                    }}
                  >
                    <MediaPreview
                      mediaUrl={imageUrl}
                      mediaType={mediaType}
                      thumbnailUrl={thumbnailUrl || undefined}
                      alt="Preview"
                      maxWidth="100%"
                      maxHeight={280}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#6B7280', mt: 2, display: 'block' }}>
                    Haz clic para cambiar {mediaType === 'video' ? 'el video' : 'la imagen'}
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: 3,
                      bgcolor: alpha('#059669', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Upload size={36} color="#059669" />
                  </Box>
                  <Typography variant="h6" sx={{ color: '#374151', fontWeight: 600, mb: 0.5 }}>
                    Arrastra una imagen aquí
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                    o haz clic para seleccionar
                  </Typography>
                </>
              )}
            </Paper>

            {analyzing && (
              <Paper
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha('#059669', 0.06),
                  border: '1px solid',
                  borderColor: alpha('#059669', 0.2),
                }}
              >
                <CircularProgress size={20} sx={{ color: '#059669' }} />
                <Typography sx={{ color: '#059669', fontWeight: 500 }}>Generando nombres...</Typography>
              </Paper>
            )}
          </Grid>

          {/* Right: Form */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: '1px solid #E5E7EB',
                bgcolor: '#FFFFFF',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
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
                onChange={(e) => setSingleState(prev => ({ ...prev, customName: e.target.value, selectedName: '' }))}
                placeholder="O escribe tu propio nombre"
                sx={{ mb: 2 }}
              />

              {/* Description */}
              <TextField
                fullWidth
                label="Descripción"
                value={description}
                onChange={(e) => setSingleState(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />

              {/* Metadata */}
              <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Peso (quilates)"
                    value={weightCarats}
                    onChange={(e) => setSingleState(prev => ({ ...prev, weightCarats: e.target.value }))}
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
                    onChange={(e) => setSingleState(prev => ({ ...prev, lotCode: e.target.value }))}
                    placeholder="L:A-105"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Precio (COP)"
                    value={priceCOP}
                    onChange={(e) => setSingleState(prev => ({ ...prev, priceCOP: formatPrice(e.target.value) }))}
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
                      onChange={(e) => setSingleState(prev => ({ ...prev, category: e.target.value as EmeraldCategory }))}
                    >
                      <MenuItem value="loose">Gema</MenuItem>
                      <MenuItem value="ring">Anillo</MenuItem>
                      <MenuItem value="pendant">Dije</MenuItem>
                      <MenuItem value="earrings">Aretes</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Jewelry-specific fields */}
              {(category === 'ring' || category === 'earrings' || category === 'pendant') && (
                <Grid container spacing={2} sx={{ mt: 0 }}>
                  {category === 'ring' && (
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth>
                        <InputLabel>Talla de Anillo</InputLabel>
                        <Select
                          value={ringSize}
                          label="Talla de Anillo"
                          onChange={(e) => setSingleState(prev => ({ ...prev, ringSize: e.target.value }))}
                        >
                          <MenuItem value="4">4</MenuItem>
                          <MenuItem value="5">5</MenuItem>
                          <MenuItem value="6">6</MenuItem>
                          <MenuItem value="7">7</MenuItem>
                          <MenuItem value="8">8</MenuItem>
                          <MenuItem value="9">9</MenuItem>
                          <MenuItem value="10">10</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={category === 'ring' ? 4 : 6}>
                    <FormControl fullWidth>
                      <InputLabel>Color</InputLabel>
                      <Select
                        value={color}
                        label="Color"
                        onChange={(e) => setSingleState(prev => ({ ...prev, color: e.target.value }))}
                      >
                        <MenuItem value="Verde Muzo">Verde Muzo</MenuItem>
                        <MenuItem value="Verde Chivor">Verde Chivor</MenuItem>
                        <MenuItem value="Verde Vivido">Verde Vivido</MenuItem>
                        <MenuItem value="Verde Natural">Verde Natural</MenuItem>
                        <MenuItem value="Verde Menta">Verde Menta</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={category === 'ring' ? 4 : 6}>
                    <FormControl fullWidth>
                      <InputLabel>Calidad</InputLabel>
                      <Select
                        value={quality}
                        label="Calidad"
                        onChange={(e) => setSingleState(prev => ({ ...prev, quality: e.target.value }))}
                      >
                        <MenuItem value="Premium">Premium</MenuItem>
                        <MenuItem value="Estándar">Estándar</MenuItem>
                        <MenuItem value="Comercial">Comercial</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={onSave}
                disabled={!imageUrl || (!selectedName && !customName)}
                sx={{
                  bgcolor: brandColors.emeraldGreen,
                  '&:hover': { bgcolor: brandColors.emeraldDark },
                  minHeight: 48,
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
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById('batch-file-input')?.click();
            }}
          >
            <input
              id="batch-file-input"
              type="file"
              accept="image/*,video/*,.heic,.heif"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <BatchIcon sx={{ fontSize: 40, color: 'grey.500', mb: 1 }} />
            <Typography variant="h6" color="grey.500">
              Arrastra múltiples imágenes o videos aquí
            </Typography>
            <Typography variant="body2" color="grey.600">
              o haz clic para seleccionar archivos multimedia
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
                  {batchItems.length} item{batchItems.length > 1 ? 's' : ''} en lote
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={onSaveAllBatch}
                  sx={{
                    bgcolor: brandColors.emeraldGreen,
                    '&:hover': { bgcolor: brandColors.emeraldDark },
                    minHeight: 44,
                  }}
                >
                  Guardar Todas ({batchItems.filter(i => i.customName || i.selectedName).length})
                </Button>
              </Box>

              {/* Batch items grid - using extracted BatchItemCard component */}
              <Grid container spacing={{ xs: 1.5, md: 2 }}>
                {batchItems.map((item) => (
                  <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <BatchItemCard
                      item={item}
                      onUpdate={updateBatchItem}
                      onRemove={removeBatchItem}
                      onRefreshNames={refreshBatchItemNames}
                      onSave={saveBatchItem}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {batchItems.length === 0 && !batchProcessing && (
            <Typography color="grey.500" textAlign="center" sx={{ py: 4 }}>
              Arrastra múltiples fotos/videos o haz clic arriba para subir un lote de contenido
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
