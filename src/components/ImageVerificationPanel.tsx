/**
 * ImageVerificationPanel
 * Visual verification and quality control for emerald product photos
 *
 * Features:
 * - Side-by-side photo preview with metadata
 * - Quality scoring with visual indicators
 * - Verification checklist
 * - Approve/Reject/Review workflow
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Grid,
  Rating,
  TextField,
  LinearProgress,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  Tooltip,
  Fade,
  alpha,
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Cancel,
  Warning,
  Refresh,
  ZoomIn,
  ZoomOut,
  OpenInNew,
  ContentCopy,
  Photo,
  CameraAlt,
  Lightbulb,
  AspectRatio,
  Storage,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import {
  ImageQualityCheck,
  ImageQualityLevel,
  ImageVerificationStatus,
  InventoryItem,
} from '../types';
import {
  analyzeImageQuality,
  isValidImageUrl,
  getQualityLabel,
  getQualityColor,
  getDriveDirectUrl,
} from '../utils/imageVerification';
// Hook available for API-based verification:
// import { useImageVerification } from '../hooks/useImageVerification';

// Styled components
const ImagePreview = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
  backgroundColor: alpha(theme.palette.common.black, 0.03),
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  '& img': {
    width: '100%',
    height: 'auto',
    display: 'block',
    transition: 'transform 0.3s ease',
  },
}));

const QualityBadge = styled(Box)<{ score: ImageQualityLevel }>(({ score }) => ({
  position: 'absolute',
  top: 12,
  right: 12,
  padding: '6px 12px',
  borderRadius: 20,
  backgroundColor: alpha(getQualityColor(score), 0.9),
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.85rem',
  boxShadow: `0 2px 8px ${alpha(getQualityColor(score), 0.4)}`,
}));

const MetricItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
}));

const MetricValue = styled(Typography)<{ metricStatus: 'good' | 'warning' | 'bad' }>(
  ({ metricStatus }) => ({
    fontWeight: 600,
    color:
      metricStatus === 'good'
        ? '#10b981'
        : metricStatus === 'warning'
        ? '#f59e0b'
        : '#ef4444',
  })
);

interface ImageVerificationPanelProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  imageUrl?: string;
  onVerify?: (
    itemId: number,
    status: ImageVerificationStatus,
    qualityCheck: ImageQualityCheck,
    notes: string
  ) => void;
}

interface PhotoChecklist {
  hasMacro: boolean;
  hasLifestyle: boolean;
  hasCloseUp: boolean;
  allAngles: boolean;
  whiteBg: boolean;
  lightingOk: boolean;
}

export const ImageVerificationPanel: React.FC<ImageVerificationPanelProps> = ({
  open,
  onClose,
  item,
  imageUrl: propImageUrl,
  onVerify,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [qualityCheck, setQualityCheck] = useState<ImageQualityCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<PhotoChecklist>({
    hasMacro: false,
    hasLifestyle: false,
    hasCloseUp: false,
    allAngles: false,
    whiteBg: false,
    lightingOk: false,
  });
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get image URL from item or prop
  const imageUrl = propImageUrl || item?.imageUrl || item?.imagen || '';

  // Analyze image when panel opens or image changes
  const analyzeImage = useCallback(async () => {
    if (!imageUrl) {
      setError('No image URL provided');
      return;
    }

    // Handle Google Drive URLs
    let urlToAnalyze = imageUrl;
    if (imageUrl.includes('drive.google.com')) {
      urlToAnalyze = getDriveDirectUrl(imageUrl);
    }

    if (!isValidImageUrl(urlToAnalyze)) {
      setError('Invalid image URL format');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeImageQuality(urlToAnalyze);
      setQualityCheck(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageUrl]);

  useEffect(() => {
    if (open && imageUrl) {
      analyzeImage();
      setImageLoaded(false);
    }
  }, [open, imageUrl, analyzeImage]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQualityCheck(null);
      setError(null);
      setNotes('');
      setChecklist({
        hasMacro: false,
        hasLifestyle: false,
        hasCloseUp: false,
        allAngles: false,
        whiteBg: false,
        lightingOk: false,
      });
      setZoom(1);
    }
  }, [open]);

  // Handle verification actions
  const handleVerify = (status: ImageVerificationStatus) => {
    if (!item || !qualityCheck) return;
    onVerify?.(item.item, status, qualityCheck, notes);
    onClose();
  };

  // Calculate checklist completion
  const checklistComplete =
    Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(checklist).length;

  // Get metric status
  const getMetricStatus = (
    value: number,
    min: number,
    max: number
  ): 'good' | 'warning' | 'bad' => {
    if (value >= min && value <= max) return 'good';
    if (value >= min * 0.8 || value <= max * 1.2) return 'warning';
    return 'bad';
  };

  // Copy URL to clipboard
  const copyUrl = () => {
    navigator.clipboard.writeText(imageUrl);
  };

  // Open image in new tab
  const openInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  if (!item && !propImageUrl) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Photo sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Image Verification
            </Typography>
            {item && (
              <Typography variant="body2" color="text.secondary">
                #{item.item} - {item.nombre}
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Image Preview Section */}
          <Grid item xs={12} md={7}>
            <ImagePreview>
              {!imageLoaded && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha('#000', 0.05),
                  }}
                >
                  <CircularProgress size={40} />
                </Box>
              )}
              <img
                src={
                  imageUrl.includes('drive.google.com')
                    ? getDriveDirectUrl(imageUrl)
                    : imageUrl
                }
                alt={item?.nombre || 'Emerald'}
                style={{
                  transform: `scale(${zoom})`,
                  opacity: imageLoaded ? 1 : 0,
                }}
                onLoad={() => setImageLoaded(true)}
                onError={() => setError('Failed to load image')}
              />
              {qualityCheck && imageLoaded && (
                <QualityBadge score={qualityCheck.overallScore}>
                  <Rating
                    value={qualityCheck.overallScore}
                    max={5}
                    readOnly
                    size="small"
                    sx={{
                      '& .MuiRating-iconFilled': { color: '#fff' },
                      '& .MuiRating-iconEmpty': { color: alpha('#fff', 0.3) },
                    }}
                  />
                  {getQualityLabel(qualityCheck.overallScore)}
                </QualityBadge>
              )}
            </ImagePreview>

            {/* Image Controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mt: 2,
              }}
            >
              <Tooltip title="Zoom Out">
                <IconButton
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  disabled={zoom <= 0.5}
                  size="small"
                >
                  <ZoomOut />
                </IconButton>
              </Tooltip>
              <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </Typography>
              <Tooltip title="Zoom In">
                <IconButton
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  disabled={zoom >= 3}
                  size="small"
                >
                  <ZoomIn />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <Tooltip title="Re-analyze">
                <IconButton onClick={analyzeImage} disabled={isAnalyzing} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="Copy URL">
                <IconButton onClick={copyUrl} size="small">
                  <ContentCopy />
                </IconButton>
              </Tooltip>
              <Tooltip title="Open in New Tab">
                <IconButton onClick={openInNewTab} size="small">
                  <OpenInNew />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>

          {/* Quality Metrics Section */}
          <Grid item xs={12} md={5}>
            {isAnalyzing ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography color="text.secondary">
                  Analyzing image quality...
                </Typography>
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : qualityCheck ? (
              <Fade in>
                <Box>
                  {/* Quality Score */}
                  <Box
                    sx={{
                      textAlign: 'center',
                      mb: 3,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: alpha(getQualityColor(qualityCheck.overallScore), 0.1),
                    }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      Overall Quality Score
                    </Typography>
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 700,
                        color: getQualityColor(qualityCheck.overallScore),
                      }}
                    >
                      {qualityCheck.overallScore}/5
                    </Typography>
                    <Rating
                      value={qualityCheck.overallScore}
                      max={5}
                      readOnly
                      size="large"
                    />
                  </Box>

                  {/* Detailed Metrics */}
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}
                  >
                    Quality Metrics
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                    <MetricItem>
                      <AspectRatio sx={{ color: 'text.secondary' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Resolution
                        </Typography>
                        <MetricValue
                          variant="body1"
                          metricStatus={qualityCheck.resolution.isAcceptable ? 'good' : 'bad'}
                        >
                          {qualityCheck.resolution.width} x {qualityCheck.resolution.height}
                        </MetricValue>
                      </Box>
                      {qualityCheck.resolution.isAcceptable ? (
                        <CheckCircle sx={{ color: '#10b981' }} />
                      ) : (
                        <Cancel sx={{ color: '#ef4444' }} />
                      )}
                    </MetricItem>

                    <MetricItem>
                      <Storage sx={{ color: 'text.secondary' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          File Size
                        </Typography>
                        <MetricValue
                          variant="body1"
                          metricStatus={qualityCheck.fileSize.isOptimal ? 'good' : 'warning'}
                        >
                          {(qualityCheck.fileSize.bytes / 1024).toFixed(0)} KB
                        </MetricValue>
                      </Box>
                      {qualityCheck.fileSize.isOptimal ? (
                        <CheckCircle sx={{ color: '#10b981' }} />
                      ) : (
                        <Warning sx={{ color: '#f59e0b' }} />
                      )}
                    </MetricItem>

                    <MetricItem>
                      <Lightbulb sx={{ color: 'text.secondary' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Brightness
                        </Typography>
                        <MetricValue
                          variant="body1"
                          metricStatus={getMetricStatus(qualityCheck.brightness, 120, 180)}
                        >
                          {Math.round(qualityCheck.brightness)}
                        </MetricValue>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(qualityCheck.brightness / 255) * 100}
                        sx={{ width: 60, height: 6, borderRadius: 3 }}
                      />
                    </MetricItem>

                    <MetricItem>
                      <CameraAlt sx={{ color: 'text.secondary' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Sharpness
                        </Typography>
                        <MetricValue
                          variant="body1"
                          metricStatus={getMetricStatus(qualityCheck.sharpness, 40, 100)}
                        >
                          {qualityCheck.sharpness}%
                        </MetricValue>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={qualityCheck.sharpness}
                        sx={{ width: 60, height: 6, borderRadius: 3 }}
                      />
                    </MetricItem>

                    <MetricItem>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: '#10b981',
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Emerald Color Detection
                        </Typography>
                        <MetricValue
                          variant="body1"
                          metricStatus={getMetricStatus(qualityCheck.colorAccuracy, 10, 100)}
                        >
                          {qualityCheck.colorAccuracy}%
                        </MetricValue>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={qualityCheck.colorAccuracy}
                        color="success"
                        sx={{ width: 60, height: 6, borderRadius: 3 }}
                      />
                    </MetricItem>
                  </Box>

                  {/* Recommendations */}
                  {qualityCheck.recommendations.length > 0 && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Recommendations:
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {qualityCheck.recommendations.map((rec, i) => (
                          <li key={i}>
                            <Typography variant="body2">{rec}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  {/* Photo Checklist */}
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}
                  >
                    Photo Checklist ({checklistComplete}/{checklistTotal})
                  </Typography>
                  <FormGroup sx={{ mb: 3 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checklist.hasMacro}
                          onChange={(e) =>
                            setChecklist((c) => ({ ...c, hasMacro: e.target.checked }))
                          }
                        />
                      }
                      label="Macro (extreme detail shot)"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checklist.hasLifestyle}
                          onChange={(e) =>
                            setChecklist((c) => ({ ...c, hasLifestyle: e.target.checked }))
                          }
                        />
                      }
                      label="Lifestyle (in-context/hand shot)"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checklist.hasCloseUp}
                          onChange={(e) =>
                            setChecklist((c) => ({ ...c, hasCloseUp: e.target.checked }))
                          }
                        />
                      }
                      label="Close-up (cuts and clarity visible)"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checklist.allAngles}
                          onChange={(e) =>
                            setChecklist((c) => ({ ...c, allAngles: e.target.checked }))
                          }
                        />
                      }
                      label="All angles (minimum 4 views)"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checklist.whiteBg}
                          onChange={(e) =>
                            setChecklist((c) => ({ ...c, whiteBg: e.target.checked }))
                          }
                        />
                      }
                      label="Clean white background"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checklist.lightingOk}
                          onChange={(e) =>
                            setChecklist((c) => ({ ...c, lightingOk: e.target.checked }))
                          }
                        />
                      }
                      label="Professional lighting"
                    />
                  </FormGroup>

                  {/* Notes */}
                  <TextField
                    label="Verification Notes"
                    multiline
                    rows={3}
                    fullWidth
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about the image quality..."
                    sx={{ mb: 2 }}
                  />
                </Box>
              </Fade>
            ) : (
              <Alert severity="info">
                Click "Re-analyze" to check image quality
              </Alert>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          color="warning"
          startIcon={<Warning />}
          onClick={() => handleVerify('needs_review')}
          disabled={!qualityCheck}
        >
          Needs Review
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Cancel />}
          onClick={() => handleVerify('rejected')}
          disabled={!qualityCheck}
        >
          Reject
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          onClick={() => handleVerify('verified')}
          disabled={!qualityCheck || (qualityCheck?.overallScore || 0) < 3}
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageVerificationPanel;
