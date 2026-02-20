/**
 * NameGeneratorPage
 *
 * Admin-only dedicated page for AI-powered emerald name generation.
 * Features:
 *  - Reference name field → AI generates similar names
 *  - Collection generator → thematic name context
 *  - Temperature slider → creativity control (persisted)
 *  - Photo analysis → vision AI names
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Slider,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  AutoAwesome,
  CameraAlt,
  ContentCopy,
  Refresh,
  ExpandMore,
  Delete,
} from '@mui/icons-material';

import { brand, radius, iosTypographyScale, cssTransition, primitiveSpacing as spacing } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  useAI,
  generateSimilarNames,
  generateCollectionNames,
  generateNamesForCollection,
  getUsedNamesCount,
  clearUsedNames,
} from '../../../hooks/useAI';
import { STORAGE_KEYS } from '../../../constants/storage-keys';

const DEFAULT_TEMPERATURE = 0.7;
const TOOL_COLOR = brand.emerald[500];
const COLLECTION_COLOR = '#8B5CF6';

const NameGeneratorPage: React.FC = () => {
  const { t } = useLanguage();
  const { analyzeEmerald, getRandomSuggestions } = useAI();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Temperature - persisted in localStorage
  const [temperature, setTemperature] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.AI_TEMPERATURE);
    return stored ? parseFloat(stored) : DEFAULT_TEMPERATURE;
  });

  // Names section
  const [referenceName, setReferenceName] = useState('');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [showCopiedSnackbar, setShowCopiedSnackbar] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Collections section
  const [collections, setCollections] = useState<string[]>([]);
  const [isGeneratingCollections, setIsGeneratingCollections] = useState(false);

  // Config section
  const [usedCount, setUsedCount] = useState(getUsedNamesCount);

  const handleTemperatureChange = useCallback((_: Event, value: number | number[]) => {
    const temp = value as number;
    setTemperature(temp);
    localStorage.setItem(STORAGE_KEYS.AI_TEMPERATURE, temp.toString());
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setDescription('');
    try {
      let names: string[];
      if (referenceName.trim()) {
        names = await generateSimilarNames(referenceName.trim(), temperature);
      } else if (activeCollection) {
        names = await generateNamesForCollection(activeCollection, temperature);
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
        names = getRandomSuggestions();
      }
      setGeneratedNames(names);
      setUsedCount(getUsedNamesCount());
    } finally {
      setIsGenerating(false);
    }
  }, [referenceName, activeCollection, temperature, getRandomSuggestions]);

  const handleGenerateCollections = useCallback(async () => {
    setIsGeneratingCollections(true);
    try {
      const cols = await generateCollectionNames(temperature);
      setCollections(cols);
    } finally {
      setIsGeneratingCollections(false);
    }
  }, [temperature]);

  const handleCollectionSelect = useCallback((col: string) => {
    setActiveCollection(prev => prev === col ? null : col);
  }, []);

  const handleCopy = useCallback(async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopiedName(name);
      setShowCopiedSnackbar(true);
      if ('vibrate' in navigator) navigator.vibrate(10);
    } catch {
      // ignore copy errors
    }
  }, []);

  const handleClearUsedNames = useCallback(() => {
    clearUsedNames();
    setUsedCount(0);
    if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]);
  }, []);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    if ('vibrate' in navigator) navigator.vibrate(10);
    setIsAnalyzingImage(true);
    setDescription('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      setPreviewImage(base64);
      try {
        const result = await analyzeEmerald(base64);
        if (result) {
          setGeneratedNames(result.names);
          setDescription(result.description || '');
          setUsedCount(getUsedNamesCount());
        }
      } catch {
        setGeneratedNames(getRandomSuggestions());
      } finally {
        setIsAnalyzingImage(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [analyzeEmerald, getRandomSuggestions]);

  const handleClearImage = useCallback(() => {
    setPreviewImage(null);
    setDescription('');
    if ('vibrate' in navigator) navigator.vibrate(10);
  }, []);

  return (
    <Box sx={{ px: spacing.md, pt: spacing.sm, pb: spacing.xl }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* ────────────────────────────────────────
          Section 1: Nombres (default open)
      ──────────────────────────────────────── */}
      <Accordion defaultExpanded disableGutters elevation={0} sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome sx={{ fontSize: 18, color: TOOL_COLOR }} />
            <Typography fontWeight={700} sx={{ fontSize: iosTypographyScale.body }}>
              Nombres
            </Typography>
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 0 }}>
          {/* Reference name input */}
          <TextField
            label="Nombre de referencia"
            placeholder="ej. Aurora Esmeralda"
            value={referenceName}
            onChange={(e) => setReferenceName(e.target.value)}
            fullWidth
            size="small"
            helperText="La IA generará nombres similares en estilo y emoción"
            sx={{ mb: 2 }}
          />

          {/* Active collection context indicator */}
          {activeCollection && (
            <Box
              sx={{
                mb: 2,
                px: 1.5,
                py: 0.75,
                borderRadius: radius.sm,
                backgroundColor: `${TOOL_COLOR}12`,
                border: `1px solid ${TOOL_COLOR}30`,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Typography variant="caption" sx={{ color: TOOL_COLOR, fontWeight: 500 }}>
                Colección activa:
              </Typography>
              <Typography variant="caption" sx={{ color: TOOL_COLOR }}>
                {activeCollection}
              </Typography>
            </Box>
          )}

          {/* Collection chips from Section 2 (shown here as context selector) */}
          {collections.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{ color: 'var(--text-secondary)', mb: 1, display: 'block' }}
              >
                Selecciona una colección como contexto:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {collections.map((col) => (
                  <Chip
                    key={col}
                    label={col}
                    size="small"
                    onClick={() => handleCollectionSelect(col)}
                    sx={{
                      border: '1px solid',
                      borderColor: activeCollection === col ? TOOL_COLOR : 'var(--border-default)',
                      color: activeCollection === col ? TOOL_COLOR : 'var(--text-secondary)',
                      backgroundColor: activeCollection === col ? `${TOOL_COLOR}15` : 'transparent',
                      fontWeight: activeCollection === col ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={isGenerating || isAnalyzingImage}
              startIcon={
                isGenerating
                  ? <CircularProgress size={18} color="inherit" />
                  : <AutoAwesome />
              }
              sx={{
                flex: 1,
                backgroundColor: TOOL_COLOR,
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                borderRadius: radius.md,
                '&:hover': { backgroundColor: brand.emerald[600] },
                '&.Mui-disabled': { backgroundColor: `${TOOL_COLOR}60`, color: 'white' },
              }}
            >
              {isGenerating
                ? (t.tools.nameGenerator?.generating || 'Generando...')
                : (t.tools.nameGenerator?.generate || 'Generar')}
            </Button>

            <Button
              variant="outlined"
              onClick={handleImageUpload}
              disabled={isGenerating || isAnalyzingImage}
              startIcon={
                isAnalyzingImage
                  ? <CircularProgress size={18} color="inherit" />
                  : <CameraAlt />
              }
              sx={{
                flex: 1,
                borderColor: brand.gold[500],
                color: brand.gold[500],
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                borderRadius: radius.md,
                '&:hover': {
                  backgroundColor: `${brand.gold[500]}10`,
                  borderColor: brand.gold[600],
                },
                '&.Mui-disabled': {
                  borderColor: `${brand.gold[500]}50`,
                  color: `${brand.gold[500]}70`,
                },
              }}
            >
              {isAnalyzingImage
                ? (t.tools.nameGenerator?.analyzing || 'Analizando...')
                : (t.tools.nameGenerator?.uploadPhoto || 'Analizar Foto')}
            </Button>
          </Box>

          {/* Image preview */}
          {previewImage && (
            <Box sx={{ mb: 2, position: 'relative' }}>
              <Box
                component="img"
                src={previewImage}
                alt="Emerald preview"
                sx={{
                  width: '100%',
                  maxHeight: 180,
                  objectFit: 'cover',
                  borderRadius: radius.md,
                  border: `2px solid ${brand.gold[500]}`,
                }}
              />
              <IconButton
                onClick={handleClearImage}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
              {isAnalyzingImage && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: radius.md,
                    color: 'white',
                    gap: 1,
                  }}
                >
                  <CircularProgress size={32} sx={{ color: brand.gold[500] }} />
                  <Typography variant="body2">
                    {t.tools.nameGenerator?.analyzingImage || 'Analizando esmeralda...'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* AI description from vision analysis */}
          {description && !isAnalyzingImage && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                backgroundColor: `${brand.gold[500]}10`,
                borderRadius: radius.md,
                borderLeft: `3px solid ${brand.gold[500]}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: iosTypographyScale.footnote,
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                {description}
              </Typography>
            </Box>
          )}

          {/* Generated names */}
          {generatedNames.length > 0 && !isAnalyzingImage && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1.5,
                  display: 'block',
                }}
              >
                {previewImage
                  ? (t.tools.nameGenerator?.aiSuggestions || 'Sugerencias IA')
                  : (t.tools.nameGenerator?.suggestions || 'Sugerencias')}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {generatedNames.map((name, i) => (
                  <Box
                    key={`${name}-${i}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: spacing.sm,
                      backgroundColor: 'var(--surface-primary)',
                      borderRadius: radius.md,
                      border: '1px solid',
                      borderColor: copiedName === name ? TOOL_COLOR : 'var(--border-default)',
                      transition: cssTransition.default,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: iosTypographyScale.body,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {name}
                    </Typography>
                    <IconButton
                      onClick={() => handleCopy(name)}
                      size="small"
                      sx={{ color: copiedName === name ? TOOL_COLOR : 'var(--text-tertiary)' }}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>

              <Button
                variant="text"
                fullWidth
                onClick={handleGenerate}
                disabled={isGenerating || isAnalyzingImage}
                startIcon={<Refresh />}
                sx={{
                  mt: 2,
                  color: 'var(--text-secondary)',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: 'var(--surface-tertiary)' },
                }}
              >
                {t.tools.nameGenerator?.regenerate || 'Generar otros'}
              </Button>
            </Box>
          )}

          {/* Empty state */}
          {generatedNames.length === 0 && !isGenerating && !isAnalyzingImage && (
            <Box sx={{ textAlign: 'center', py: 3, color: 'var(--text-tertiary)' }}>
              <AutoAwesome sx={{ fontSize: 40, mb: 1.5, opacity: 0.4 }} />
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {t.tools.nameGenerator?.emptyState || 'Genera nombres únicos para esmeraldas'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-quaternary)' }}>
                {t.tools.nameGenerator?.emptyStateHint || 'Sube una foto para nombres personalizados con IA'}
              </Typography>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* ────────────────────────────────────────
          Section 2: Colecciones (collapsed)
      ──────────────────────────────────────── */}
      <Accordion disableGutters elevation={0} sx={{ ...accordionSx, mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome sx={{ fontSize: 18, color: COLLECTION_COLOR }} />
            <Typography fontWeight={700} sx={{ fontSize: iosTypographyScale.body }}>
              Colecciones
            </Typography>
            {collections.length > 0 && (
              <Chip
                label={collections.length}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  backgroundColor: `${COLLECTION_COLOR}20`,
                  color: COLLECTION_COLOR,
                }}
              />
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 0 }}>
          <Button
            variant="contained"
            onClick={handleGenerateCollections}
            disabled={isGeneratingCollections}
            startIcon={
              isGeneratingCollections
                ? <CircularProgress size={18} color="inherit" />
                : <AutoAwesome />
            }
            fullWidth
            sx={{
              backgroundColor: COLLECTION_COLOR,
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              borderRadius: radius.md,
              mb: 2,
              '&:hover': { backgroundColor: '#7C3AED' },
              '&.Mui-disabled': { backgroundColor: `${COLLECTION_COLOR}60`, color: 'white' },
            }}
          >
            {isGeneratingCollections ? 'Generando...' : 'Generar Colecciones'}
          </Button>

          {collections.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {collections.map((col) => (
                <Chip
                  key={col}
                  label={col}
                  onClick={() => handleCollectionSelect(col)}
                  sx={{
                    border: '1px solid',
                    borderColor: activeCollection === col ? TOOL_COLOR : 'var(--border-default)',
                    color: activeCollection === col ? TOOL_COLOR : 'var(--text-primary)',
                    backgroundColor: activeCollection === col ? `${TOOL_COLOR}15` : 'var(--surface-primary)',
                    fontWeight: activeCollection === col ? 600 : 400,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: activeCollection === col ? `${TOOL_COLOR}20` : 'var(--surface-secondary)',
                    },
                  }}
                />
              ))}
            </Box>
          )}

          {collections.length === 0 && !isGeneratingCollections && (
            <Typography
              variant="body2"
              sx={{ color: 'var(--text-tertiary)', textAlign: 'center', py: 2 }}
            >
              Genera colecciones temáticas para agrupar tus esmeraldas
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      {/* ────────────────────────────────────────
          Section 3: Configuración (collapsed)
      ──────────────────────────────────────── */}
      <Accordion disableGutters elevation={0} sx={{ ...accordionSx, mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
          <Typography fontWeight={700} sx={{ fontSize: iosTypographyScale.body }}>
            Configuración
          </Typography>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 0 }}>
          {/* Temperature slider */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" fontWeight={500} sx={{ color: 'var(--text-primary)' }}>
                Creatividad
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: TOOL_COLOR,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {temperature.toFixed(1)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography
                variant="caption"
                sx={{ color: 'var(--text-secondary)', flexShrink: 0, minWidth: 58 }}
              >
                Enfocado
              </Typography>
              <Slider
                value={temperature}
                onChange={handleTemperatureChange}
                min={0.1}
                max={1.5}
                step={0.1}
                sx={{
                  flex: 1,
                  color: TOOL_COLOR,
                  '& .MuiSlider-thumb': {
                    width: 20,
                    height: 20,
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: 'var(--text-secondary)', flexShrink: 0, minWidth: 50, textAlign: 'right' }}
              >
                Creativo
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{ color: 'var(--text-tertiary)', display: 'block', mt: 0.5 }}
            >
              {temperature < 0.5
                ? 'Nombres más curados y consistentes'
                : temperature > 0.8
                  ? 'Nombres más experimentales y creativos'
                  : 'Balance entre creatividad y coherencia'}
            </Typography>
          </Box>

          {/* Used names count + clear */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pt: 2,
              borderTop: '1px solid var(--border-default)',
            }}
          >
            <Box>
              <Typography
                variant="body2"
                sx={{ color: 'var(--text-primary)', fontWeight: 500 }}
              >
                Historial de nombres
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'var(--text-secondary)' }}
              >
                {usedCount} {usedCount === 1 ? 'nombre guardado' : 'nombres guardados'}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearUsedNames}
              disabled={usedCount === 0}
              sx={{
                color: 'var(--text-tertiary)',
                borderColor: 'var(--border-default)',
                textTransform: 'none',
                fontSize: iosTypographyScale.footnote,
                '&:hover': {
                  borderColor: 'var(--text-tertiary)',
                  backgroundColor: 'var(--surface-tertiary)',
                },
                '&.Mui-disabled': {
                  opacity: 0.4,
                },
              }}
            >
              {t.tools.nameGenerator?.clearUsed || 'Limpiar historial'}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Copied snackbar */}
      <Snackbar
        open={showCopiedSnackbar}
        autoHideDuration={2000}
        onClose={() => setShowCopiedSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          sx={{
            backgroundColor: TOOL_COLOR,
            color: 'white',
            '& .MuiAlert-icon': { color: 'white' },
          }}
        >
          {t.tools.nameGenerator?.copied || 'Nombre copiado'}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Shared accordion styles
const accordionSx = {
  border: '1px solid var(--border-default)',
  borderRadius: `${radius.lg} !important`,
  backgroundColor: 'var(--surface-secondary)',
  '&:before': { display: 'none' },
  overflow: 'hidden',
};

const summarySx = {
  px: spacing.md,
  minHeight: 52,
  '& .MuiAccordionSummary-content': { my: 1 },
};

export default NameGeneratorPage;
