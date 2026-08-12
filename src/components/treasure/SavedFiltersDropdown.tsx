/**
 * SavedFiltersDropdown Component
 * Dropdown menu for managing saved filter presets.
 * Allows saving, applying, and deleting filter presets.
 */
import { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  alpha,
  Chip,
} from '@mui/material';
import {
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  Trash2,
  Check,
  X,
  Filter,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import { FilterPreset } from '../../hooks/useSavedFilters';
import { TreasureItem } from '../../types';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import {
  emeraldCore,
  surfacesLight,
  surfacesDark,
} from '../../design-system/tokens/colors';

interface SavedFiltersDropdownProps {
  /** List of saved filter presets */
  presets: FilterPreset[];
  /** Current active preset ID (if any) */
  activePresetId?: string;
  /** Callback to save current filters as a new preset */
  onSavePreset: (name: string) => void;
  /** Callback to apply a preset */
  onApplyPreset: (preset: FilterPreset) => void;
  /** Callback to delete a preset */
  onDeletePreset: (id: string) => void;
  /** Whether there are active filters to save */
  hasActiveFilters: boolean;
  /** Compact mode for smaller screens */
  compact?: boolean;
  /**
   * Recently-viewed pieces, surfaced inside this dropdown rather than as a
   * standalone strip above the grid — mirroring how the mobile search sheet
   * already presents them.
   */
  recentItems?: TreasureItem[];
  onRecentClick?: (item: TreasureItem) => void;
  onClearRecent?: () => void;
}

export default function SavedFiltersDropdown({
  presets,
  activePresetId,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
  hasActiveFilters,
  compact = false,
  recentItems,
  onRecentClick,
  onClearRecent,
}: SavedFiltersDropdownProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrencyFormat();
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const open = Boolean(anchorEl);

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setDeleteConfirmId(null);
  };

  const handleSaveClick = () => {
    handleCloseMenu();
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = () => {
    if (newPresetName.trim()) {
      onSavePreset(newPresetName.trim());
      setNewPresetName('');
      setSaveDialogOpen(false);
    }
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    onApplyPreset(preset);
    handleCloseMenu();
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = (id: string) => {
    onDeletePreset(id);
    setDeleteConfirmId(null);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Count filters in a preset
  const countFilters = (preset: FilterPreset): number => {
    let count = 0;
    const f = preset.filters;
    if (f.search) count++;
    if (f.colorFilter !== 'all') count++;
    if (f.qualityFilter !== 'all') count++;
    if (f.typeFilter !== 'all') count++;
    if (f.statusFilter !== 'all') count++;
    if (f.shapeFilter !== 'all') count++;
    if (f.priceRange[0] > 0 || f.priceRange[1] < 100000000) count++;
    return count;
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={handleOpenMenu}
        variant="outlined"
        size="small"
        startIcon={<Bookmark size={16} />}
        endIcon={<ChevronDown size={14} />}
        // `compact` renders no visible label, so the control needs its name
        // some other way (PRODUCT.md: icon-only buttons always carry an
        // aria-label). `title` gives sighted mouse users the same name on hover.
        aria-label={
          compact
            ? `Búsquedas guardadas${presets.length > 0 ? ` (${presets.length})` : ''}`
            : undefined
        }
        title={compact ? 'Búsquedas guardadas' : undefined}
        sx={{
          borderColor: isLight
            ? surfacesLight.border.default
            : surfacesDark.border.default,
          color: isLight
            ? surfacesLight.text.secondary
            : surfacesDark.text.secondary,
          textTransform: 'none',
          fontWeight: 500,
          minWidth: compact ? 'auto' : 160,
          '&:hover': {
            borderColor: emeraldCore.primary,
            bgcolor: alpha(emeraldCore.primary, 0.05),
          },
        }}
      >
        {compact
          ? ''
          : `Búsquedas${presets.length > 0 ? ` (${presets.length})` : ''}`}
      </Button>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            minWidth: 280,
            maxHeight: 400,
            bgcolor: isLight
              ? surfacesLight.background.primary
              : surfacesDark.background.primary,
            border: '1px solid',
            borderColor: isLight
              ? surfacesLight.border.light
              : surfacesDark.border.default,
            boxShadow: isLight
              ? '0 4px 20px rgba(0, 0, 0, 0.1)'
              : '0 4px 20px rgba(0, 0, 0, 0.4)',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Mis Búsquedas Guardadas
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {presets.length} de 10 guardadas
          </Typography>
        </Box>

        {/* Save New Button */}
        <MenuItem
          onClick={handleSaveClick}
          disabled={!hasActiveFilters}
          sx={{
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              bgcolor: alpha(emeraldCore.primary, 0.1),
            },
            '&.Mui-disabled': {
              opacity: 0.45,
            },
          }}
        >
          <ListItemIcon>
            <BookmarkPlus size={18} color={emeraldCore.primary} />
          </ListItemIcon>
          <ListItemText
            primary={t.treasure.savedFilters.saveSearch}
            secondary={
              hasActiveFilters ? 'Crear nuevo preset' : 'Sin filtros activos'
            }
            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>

        {/* Presets List */}
        {presets.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Filter
              size={32}
              color={
                isLight
                  ? surfacesLight.text.disabled
                  : surfacesDark.text.disabled
              }
            />
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              No tienes búsquedas guardadas
            </Typography>
          </Box>
        ) : (
          presets.map((preset) => (
            <MenuItem
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              selected={preset.id === activePresetId}
              sx={{
                py: 1,
                '&.Mui-selected': {
                  bgcolor: alpha(emeraldCore.primary, 0.1),
                  '&:hover': {
                    bgcolor: alpha(emeraldCore.primary, 0.15),
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {preset.id === activePresetId ? (
                  <Check size={16} color={emeraldCore.primary} />
                ) : (
                  <Bookmark size={16} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {preset.name}
                    </Typography>
                    <Chip
                      label={`${countFilters(preset)} filtros`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        bgcolor: alpha(emeraldCore.primary, 0.1),
                        color: emeraldCore.dark,
                      }}
                    />
                  </Box>
                }
                secondary={formatDate(preset.createdAt)}
                secondaryTypographyProps={{ variant: 'caption' }}
              />

              {/* Delete button with confirmation */}
              {deleteConfirmId === preset.id ? (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConfirm(preset.id);
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    <Check size={14} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(null);
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                </Box>
              ) : (
                <Tooltip title="Eliminar">
                  <IconButton
                    size="small"
                    onClick={(e) => handleDeleteClick(preset.id, e)}
                    sx={{
                      opacity: 0,
                      '.MuiMenuItem-root:hover &': { opacity: 1 },
                      color: 'text.secondary',
                      '&:hover': { color: 'error.main' },
                    }}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </Tooltip>
              )}
            </MenuItem>
          ))
        )}

        {/* Recently viewed — lives here rather than as a standing strip above
            the grid, so it costs no vertical space until asked for. */}
        {recentItems && recentItems.length > 0 && (
          <Box>
            <Box
              sx={{
                px: 2,
                py: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: 'var(--tm-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Visto recientemente ({recentItems.length})
              </Typography>
              {onClearRecent && (
                <Tooltip title="Limpiar vistos recientemente">
                  <IconButton
                    size="small"
                    aria-label="Limpiar vistos recientemente"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearRecent();
                    }}
                    sx={{
                      width: 32,
                      height: 32,
                      color: 'var(--tm-muted)',
                      '&:hover': { color: 'var(--tm-danger)' },
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            {recentItems.slice(0, 6).map((item) => {
              const displayName = item.nombre
                .replace(/^L:.*?\s/, '')
                .replace(/^L:/, '')
                .trim();
              return (
                <MenuItem
                  key={item.item}
                  onClick={() => {
                    onRecentClick?.(item);
                    handleCloseMenu();
                  }}
                  sx={{ gap: 1.25, py: 1 }}
                >
                  <Box
                    component="img"
                    src={item.thumbnailUrl || item.imagen}
                    alt=""
                    loading="lazy"
                    sx={{
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      objectFit: 'cover',
                      borderRadius: 'var(--tm-radius-well)',
                      bgcolor: 'var(--tm-well)',
                    }}
                  />
                  <ListItemText
                    primary={displayName}
                    secondary={formatCurrency(item.precioCOP)}
                    primaryTypographyProps={{
                      noWrap: true,
                      sx: { fontSize: '0.8125rem', fontWeight: 500 },
                    }}
                    secondaryTypographyProps={{
                      sx: {
                        fontSize: '0.75rem',
                        color: 'var(--tm-accent)',
                        fontVariantNumeric: 'tabular-nums',
                      },
                    }}
                  />
                </MenuItem>
              );
            })}
          </Box>
        )}
      </Menu>

      {/* Save Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BookmarkPlus size={20} color={emeraldCore.primary} />
            {t.treasure.savedFilters.save}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Dale un nombre a esta combinación de filtros para encontrarla
            fácilmente.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label={t.treasure.savedFilters.searchName}
            placeholder={t.treasure.savedFilters.exampleName}
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveConfirm();
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: emeraldCore.primary,
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSaveDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveConfirm}
            variant="contained"
            disabled={!newPresetName.trim()}
            sx={{
              bgcolor: emeraldCore.primary,
              '&:hover': { bgcolor: emeraldCore.dark },
            }}
          >
            {t.actions.save}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
