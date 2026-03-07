/**
 * FeedbackDashboard - Admin Feedback Management
 *
 * View, filter, and manage feedback submissions.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Stack,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ImageIcon from '@mui/icons-material/Image';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { emeraldCore } from '../../design-system/tokens/colors';
import { cssTransition, accentColors, primitiveColors } from '../../design-system';
import type { FeedbackItem, FeedbackStatus, FeedbackCategory } from '../../types/feedback';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from '../../types/feedback';

// =============================================================================
// HELPERS
// =============================================================================

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string }> = {
  open: { label: 'Abierto', color: accentColors.info.light },
  in_progress: { label: 'En Progreso', color: accentColors.warning.light },
  resolved: { label: 'Resuelto', color: accentColors.success.light },
  wontfix: { label: 'No se hará', color: primitiveColors.metallic.silver[400] },
  duplicate: { label: 'Duplicado', color: primitiveColors.metallic.silver[600] },
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function FeedbackDashboard() {
  const navigate = useNavigate();
  const { user } = useGoogleAuth();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');

  // Detail modal state
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<FeedbackStatus>('open');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch feedback
  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = statusFilter === 'all'
        ? '/api/feedback'
        : `/api/feedback?status=${statusFilter}`;

      const response = await fetch(url, {
        headers: { 'x-requester-email': user?.email ?? '' },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar feedback');
      }

      setFeedback(data.data || []);
    } catch (err) {
      console.error('Fetch feedback error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar feedback');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Open detail modal
  const handleOpenDetail = useCallback((item: FeedbackItem) => {
    setSelectedFeedback(item);
    setEditStatus(item.status as FeedbackStatus);
    setEditNotes(item.notes || '');
    setIsEditing(false);
  }, []);

  // Close detail modal
  const handleCloseDetail = useCallback(() => {
    setSelectedFeedback(null);
    setIsEditing(false);
  }, []);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!selectedFeedback) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-requester-email': user?.email ?? '' },
        body: JSON.stringify({
          id: selectedFeedback.id,
          status: editStatus,
          notes: editNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar');
      }

      await fetchFeedback();
      handleCloseDetail();
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setIsSaving(false);
    }
  }, [selectedFeedback, editStatus, editNotes, fetchFeedback, handleCloseDetail]);

  // Get category info
  const getCategoryInfo = (category: FeedbackCategory) => {
    return CATEGORY_OPTIONS.find((c) => c.value === category) || CATEGORY_OPTIONS[4];
  };

  // Get priority info
  const getPriorityInfo = (priority: string) => {
    return PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1];
  };

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 600, flex: 1 }}>
          Feedback Dashboard
        </Typography>
        <Tooltip title="Actualizar">
          <IconButton onClick={fetchFeedback} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Status filter */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, value) => value && setStatusFilter(value)}
          size="small"
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="all">Todos</ToggleButton>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <ToggleButton key={key} value={key}>
              {config.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Cargando" />
        </Box>
      )}

      {/* Empty state */}
      {!isLoading && feedback.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No hay feedback {statusFilter !== 'all' ? `con estado "${STATUS_CONFIG[statusFilter]?.label}"` : ''}
          </Typography>
        </Paper>
      )}

      {/* Feedback list */}
      {!isLoading && feedback.length > 0 && (
        <Stack spacing={2}>
          {feedback.map((item) => {
            const categoryInfo = getCategoryInfo(item.category as FeedbackCategory);
            const priorityInfo = getPriorityInfo(item.priority);
            const statusInfo = STATUS_CONFIG[item.status as FeedbackStatus] || STATUS_CONFIG.open;

            return (
              <Paper
                key={item.id}
                onClick={() => handleOpenDetail(item)}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  transition: cssTransition.default,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                  },
                }}
              >
                {/* Header row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: emeraldCore.primary,
                    }}
                  >
                    {item.id}
                  </Typography>
                  <Chip
                    label={statusInfo.label}
                    size="small"
                    sx={{
                      bgcolor: alpha(statusInfo.color, 0.1),
                      color: statusInfo.color,
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={`${categoryInfo.icon} ${categoryInfo.label}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={priorityInfo.label}
                    size="small"
                    sx={{
                      bgcolor: alpha(priorityInfo.color, 0.1),
                      color: priorityInfo.color,
                    }}
                  />
                  {item.hasScreenshot && (
                    <ImageIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  )}
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(item.timestamp)}
                  </Typography>
                </Box>

                {/* Description */}
                <Typography
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    mb: 1,
                  }}
                >
                  {item.description}
                </Typography>

                {/* Footer */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {item.page}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {item.adminName || item.adminEmail}
                  </Typography>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Detail Modal */}
      <Dialog
        open={!!selectedFeedback}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        {selectedFeedback && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {selectedFeedback.id}
              </Typography>
              <Chip
                label={STATUS_CONFIG[selectedFeedback.status as FeedbackStatus]?.label || 'Abierto'}
                size="small"
                sx={{
                  bgcolor: alpha(
                    STATUS_CONFIG[selectedFeedback.status as FeedbackStatus]?.color || '#2196f3',
                    0.1
                  ),
                  color: STATUS_CONFIG[selectedFeedback.status as FeedbackStatus]?.color || '#2196f3',
                }}
              />
              <Box sx={{ flex: 1 }} />
              <IconButton onClick={() => setIsEditing(!isEditing)}>
                <EditIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                {/* Meta info */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Página
                    </Typography>
                    <Typography>{selectedFeedback.page}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Categoría
                    </Typography>
                    <Typography>
                      {getCategoryInfo(selectedFeedback.category as FeedbackCategory).icon}{' '}
                      {getCategoryInfo(selectedFeedback.category as FeedbackCategory).label}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Prioridad
                    </Typography>
                    <Typography sx={{ color: getPriorityInfo(selectedFeedback.priority).color }}>
                      {getPriorityInfo(selectedFeedback.priority).label}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Reportado por
                    </Typography>
                    <Typography>
                      {selectedFeedback.adminName || selectedFeedback.adminEmail}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha
                    </Typography>
                    <Typography>{formatDate(selectedFeedback.timestamp)}</Typography>
                  </Box>
                </Box>

                <Divider />

                {/* Description */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Descripción
                  </Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedFeedback.description}
                  </Typography>
                </Box>

                {/* Screenshot placeholder */}
                {selectedFeedback.hasScreenshot && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Captura de Pantalla
                    </Typography>
                    <Alert severity="info" icon={<ImageIcon />}>
                      La captura está almacenada en Google Sheets.
                      <Button
                        size="small"
                        endIcon={<OpenInNewIcon />}
                        sx={{ ml: 1 }}
                        onClick={() => {
                          // Open sheet in new tab (user would need to configure this URL)
                          window.open('https://docs.google.com/spreadsheets', '_blank');
                        }}
                      >
                        Ver en Sheets
                      </Button>
                    </Alert>
                  </Box>
                )}

                {/* Edit section */}
                {isEditing && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Actualizar Estado
                      </Typography>
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Estado</InputLabel>
                        <Select
                          value={editStatus}
                          label="Estado"
                          onChange={(e) => setEditStatus(e.target.value as FeedbackStatus)}
                        >
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <MenuItem key={key} value={key}>
                              {config.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Notas del desarrollador"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="Añade notas sobre la resolución o comentarios..."
                      />
                    </Box>
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>Cerrar</Button>
              {isEditing && (
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isSaving}
                  sx={{ bgcolor: emeraldCore.primary }}
                >
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
