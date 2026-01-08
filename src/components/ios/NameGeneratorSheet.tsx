/**
 * NameGeneratorSheet Component
 *
 * Admin-only name generator for emeralds
 * - Uses AI (Groq) or local generation strategies
 * - Upload photo for AI-powered name suggestions
 * - Shows used names count
 * - Allows regeneration
 * - Copy to clipboard functionality
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Backdrop,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { Close, Refresh, ContentCopy, AutoAwesome, CameraAlt, Delete } from '@mui/icons-material';

import { spacing } from '../../design-system/tokens/primitives/spacing';
import { easingCurves, durations } from '../../design-system/tokens/primitives/motion';
import { floatingLayers, liquidSaturation, specularHighlights } from '../../design-system/tokens/liquid-glass';
import { floatingLayerShadows } from '../../design-system/tokens/shadows';
import { brand, radius, iosTypographyScale } from '../../design-system';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLiquidGlassSafe } from '../../contexts/LiquidGlassContext';
import { useAI, getUsedNamesCount, clearUsedNames } from '../../hooks/useAI';

export interface NameGeneratorSheetProps {
  open: boolean;
  onClose: () => void;
}

const NameGeneratorSheet: React.FC<NameGeneratorSheetProps> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const { effectiveConfig } = useLiquidGlassSafe();
  const { getRandomSuggestions, analyzeEmerald } = useAI();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [generatedNames, setGeneratedNames] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [showCopiedSnackbar, setShowCopiedSnackbar] = useState(false);
  const [usedCount, setUsedCount] = useState(getUsedNamesCount);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Generate new names
  const handleGenerate = useCallback(() => {
    setIsGenerating(true);

    // Small delay for UX feedback
    setTimeout(() => {
      const names = getRandomSuggestions();
      setGeneratedNames(names);
      setUsedCount(getUsedNamesCount());
      setIsGenerating(false);
    }, 300);
  }, [getRandomSuggestions]);

  // Copy name to clipboard
  const handleCopy = useCallback(async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopiedName(name);
      setShowCopiedSnackbar(true);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Clear used names (admin action)
  const handleClearUsedNames = useCallback(() => {
    clearUsedNames();
    setUsedCount(0);

    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  }, []);

  // Handle image upload for AI analysis
  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Process uploaded image
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    setIsAnalyzingImage(true);
    setDescription('');

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewImage(base64);

      // Analyze with AI
      try {
        const result = await analyzeEmerald(base64);
        if (result) {
          setGeneratedNames(result.names);
          setDescription(result.description || '');
          setUsedCount(getUsedNamesCount());
        }
      } catch (err) {
        console.error('Error analyzing image:', err);
        // Fallback to random names
        const names = getRandomSuggestions();
        setGeneratedNames(names);
      } finally {
        setIsAnalyzingImage(false);
      }
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    event.target.value = '';
  }, [analyzeEmerald, getRandomSuggestions]);

  // Clear uploaded image
  const handleClearImage = useCallback(() => {
    setPreviewImage(null);
    setDescription('');
    setGeneratedNames([]);

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  // Liquid Glass styles for the sheet
  const sheetStyles = useMemo(() => {
    if (!effectiveConfig.blur) {
      return {
        backgroundColor: 'var(--surface-secondary)',
        backdropFilter: 'none',
        boxShadow: 'var(--shadow-lg)',
      };
    }

    const layer = floatingLayers.overlay;

    return {
      backgroundColor: 'rgba(var(--surface-secondary-rgb), 0.85)',
      backdropFilter: `blur(${layer.blur}) saturate(${liquidSaturation.intense})`,
      WebkitBackdropFilter: `blur(${layer.blur}) saturate(${liquidSaturation.intense})`,
      boxShadow: floatingLayerShadows.overlay,
    };
  }, [effectiveConfig.blur]);

  // Specular highlight for sheet header
  const headerSpecularStyles = useMemo(() => {
    if (!effectiveConfig.specular) return {};

    return {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '5%',
        right: '5%',
        height: '1px',
        background: specularHighlights.gradients.subtle,
        borderRadius: '1px',
      },
    };
  }, [effectiveConfig.specular]);

  const toolColor = brand.emerald[500];

  return (
    <>
      <Backdrop
        open={open}
        onClick={onClose}
        sx={{
          zIndex: 1200,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: effectiveConfig.blur ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: effectiveConfig.blur ? 'blur(16px)' : 'none',
          transition: effectiveConfig.animations
            ? `opacity ${durations.liquidNormal} ${easingCurves.liquidInOut}`
            : 'none',
        }}
      />

      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-generator-title"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1201,
          ...sheetStyles,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          maxHeight: '70vh',
          overflowY: 'auto',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: effectiveConfig.animations
            ? `transform ${durations.liquidNormal} ${easingCurves.liquidSpring}`
            : 'transform 0.3s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom)',
          willChange: 'transform',
          ...headerSpecularStyles,

          '@supports not (backdrop-filter: blur(10px))': {
            backgroundColor: 'var(--surface-secondary)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'transform 0.2s ease-out',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--surface-secondary)',
            zIndex: 1,
            paddingTop: spacing.sm,
            paddingX: spacing.md,
            paddingBottom: spacing.sm,
            borderBottom: '0.5px solid var(--border-default)',
          }}
        >
          {/* Handle Bar */}
          <Box
            sx={{
              width: '36px',
              height: '5px',
              backgroundColor: 'var(--border-default)',
              borderRadius: '2.5px',
              margin: '0 auto',
              marginBottom: spacing.sm,
            }}
          />

          {/* Title and Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: '40px',
                  height: '40px',
                  borderRadius: radius.md,
                  background: `linear-gradient(135deg, ${toolColor}20 0%, ${toolColor}10 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AutoAwesome sx={{ fontSize: 24, color: toolColor }} />
              </Box>
              <Box>
                <Typography
                  id="name-generator-title"
                  variant="h2"
                  sx={{
                    fontSize: iosTypographyScale.title2,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {t.tools.nameGenerator?.label || 'Generador de Nombres'}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: iosTypographyScale.footnote,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {usedCount} {t.tools.nameGenerator?.usedNames || 'nombres usados'}
                </Typography>
              </Box>
            </Box>

            <IconButton
              onClick={onClose}
              aria-label={t.actions.close}
              sx={{
                color: 'var(--text-secondary)',
                '&:hover': { backgroundColor: 'var(--surface-tertiary)' },
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ padding: spacing.md }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Action Buttons Row */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
            {/* Generate Random Names Button */}
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={isGenerating || isAnalyzingImage}
              startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
              sx={{
                flex: 1,
                backgroundColor: toolColor,
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                borderRadius: radius.md,
                '&:hover': {
                  backgroundColor: brand.emerald[600],
                },
                '&:disabled': {
                  backgroundColor: `${toolColor}80`,
                  color: 'white',
                },
              }}
            >
              {isGenerating
                ? (t.tools.nameGenerator?.generating || 'Generando...')
                : (t.tools.nameGenerator?.generate || 'Generar')}
            </Button>

            {/* Upload Photo Button */}
            <Button
              variant="outlined"
              onClick={handleImageUpload}
              disabled={isGenerating || isAnalyzingImage}
              startIcon={isAnalyzingImage ? <CircularProgress size={20} color="inherit" /> : <CameraAlt />}
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
                '&:disabled': {
                  borderColor: `${brand.gold[500]}50`,
                  color: `${brand.gold[500]}80`,
                },
              }}
            >
              {isAnalyzingImage
                ? (t.tools.nameGenerator?.analyzing || 'Analizando...')
                : (t.tools.nameGenerator?.uploadPhoto || 'Analizar Foto')}
            </Button>
          </Box>

          {/* Image Preview */}
          {previewImage && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                <Box
                  component="img"
                  src={previewImage}
                  alt="Emerald preview"
                  sx={{
                    width: '100%',
                    maxHeight: 200,
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
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
                {isAnalyzingImage && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: radius.md,
                    }}
                  >
                    <Box sx={{ textAlign: 'center', color: 'white' }}>
                      <CircularProgress size={32} sx={{ color: brand.gold[500] }} />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {t.tools.nameGenerator?.analyzingImage || 'Analizando esmeralda...'}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* AI Description */}
          {description && !isAnalyzingImage && (
            <Box
              sx={{
                mb: 3,
                p: 2,
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

          {/* Generated Names */}
          {generatedNames.length > 0 && !isAnalyzingImage && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: iosTypographyScale.footnote,
                  color: 'var(--text-secondary)',
                  mb: 1.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {previewImage
                  ? (t.tools.nameGenerator?.aiSuggestions || 'Sugerencias IA')
                  : (t.tools.nameGenerator?.suggestions || 'Sugerencias')}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {generatedNames.map((name, index) => (
                  <Box
                    key={`${name}-${index}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: spacing.sm,
                      backgroundColor: 'var(--surface-primary)',
                      borderRadius: radius.md,
                      border: '1px solid',
                      borderColor: copiedName === name ? toolColor : 'var(--border-default)',
                      transition: `all ${durations.liquidFast} ${easingCurves.liquidInOut}`,
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
                      sx={{
                        color: copiedName === name ? toolColor : 'var(--text-tertiary)',
                        '&:hover': { backgroundColor: `${toolColor}15` },
                      }}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>

              {/* Regenerate */}
              <Button
                variant="text"
                fullWidth
                onClick={previewImage ? () => handleFileChange({ target: { files: null } } as any) : handleGenerate}
                disabled={isGenerating || isAnalyzingImage}
                startIcon={<Refresh />}
                sx={{
                  mt: 2,
                  color: 'var(--text-secondary)',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'var(--surface-tertiary)',
                  },
                }}
              >
                {t.tools.nameGenerator?.regenerate || 'Generar otros'}
              </Button>
            </Box>
          )}

          {/* Empty State */}
          {generatedNames.length === 0 && !isGenerating && !isAnalyzingImage && !previewImage && (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                color: 'var(--text-tertiary)',
              }}
            >
              <AutoAwesome sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t.tools.nameGenerator?.emptyState || 'Genera nombres únicos para esmeraldas'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-quaternary)' }}>
                {t.tools.nameGenerator?.emptyStateHint || 'Sube una foto para nombres personalizados con IA'}
              </Typography>
            </Box>
          )}

          {/* Admin: Clear Used Names */}
          {usedCount > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid var(--border-default)' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearUsedNames}
                sx={{
                  color: 'var(--text-tertiary)',
                  borderColor: 'var(--border-default)',
                  textTransform: 'none',
                  fontSize: iosTypographyScale.footnote,
                  '&:hover': {
                    borderColor: 'var(--text-tertiary)',
                    backgroundColor: 'var(--surface-tertiary)',
                  },
                }}
              >
                {t.tools.nameGenerator?.clearUsed || 'Limpiar historial de nombres'}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Copied Snackbar */}
      <Snackbar
        open={showCopiedSnackbar}
        autoHideDuration={2000}
        onClose={() => setShowCopiedSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          sx={{
            backgroundColor: toolColor,
            color: 'white',
            '& .MuiAlert-icon': { color: 'white' },
          }}
        >
          {t.tools.nameGenerator?.copied || 'Nombre copiado'}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NameGeneratorSheet;
