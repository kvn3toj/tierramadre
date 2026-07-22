/**
 * InvitationSummary Component
 *
 * Metric cards + sortable/searchable invitation list with multiplier + actions.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, alpha, IconButton,
  Popover, Slider, Button, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions,
  TextField, InputAdornment, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { Link2, CheckCircle, Clock, XCircle, Send, Ban, Archive, Search, ArrowUpDown } from 'lucide-react';
import { iosTypographyScale, primitiveSpacing as spacing, radius, qeFont } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { SectionHeading } from './SectionHeading';
import type { Invitation } from '../../../hooks/useMyInvitations';

interface InvitationSummaryProps {
  invitations: Invitation[];
  metrics: { total: number; active: number; pending: number; expired: number };
  isLoading: boolean;
  mutatingCodes: Set<string>;
  onUpdateMultiplier: (shortCode: string, multiplier: number) => Promise<boolean>;
  onExpire: (shortCode: string) => Promise<boolean>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

const STATUS_CONFIG = {
  active: { label: 'Activa', color: 'var(--tm-accent)', icon: CheckCircle },
  pending: { label: 'Pendiente', color: 'var(--tm-warning)', icon: Clock },
  expired: { label: 'Expirada', color: 'var(--tm-danger)', icon: XCircle },
};

export function InvitationSummary({
  invitations, metrics, isLoading,
  mutatingCodes, onUpdateMultiplier, onExpire,
}: InvitationSummaryProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { notify } = useNotification();
  const [editAnchor, setEditAnchor] = useState<HTMLElement | null>(null);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(1);
  const [expireCode, setExpireCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const expireTarget = invitations.find(i => i.shortCode === expireCode);

  const filteredInvitations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = q
      ? invitations.filter(
          (inv) =>
            (inv.guestName ?? '').toLowerCase().includes(q) ||
            (inv.guestContact ?? '').toLowerCase().includes(q) ||
            inv.shortCode.toLowerCase().includes(q),
        )
      : invitations;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return (a.guestName ?? a.shortCode).localeCompare(b.guestName ?? b.shortCode);
      }
      if (sortBy === 'status') {
        const order = { active: 0, pending: 1, expired: 2 };
        return (order[a.status] ?? 1) - (order[b.status] ?? 1);
      }
      // date (default): newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [invitations, searchQuery, sortBy]);

  const handleEditOpen = (event: React.MouseEvent<HTMLElement>, inv: Invitation) => {
    setEditAnchor(event.currentTarget);
    setEditCode(inv.shortCode);
    setEditValue(inv.guestMultiplier ?? 1);
  };

  const handleEditSave = async () => {
    if (!editCode) return;
    const ok = await onUpdateMultiplier(editCode, editValue);
    if (!ok) notify(t.profile.updateError, 'error');
    setEditAnchor(null);
    setEditCode(null);
  };

  const handleExpireConfirm = async () => {
    if (!expireCode) return;
    const code = expireCode;
    setExpireCode(null);
    const ok = await onExpire(code);
    if (!ok) notify(t.profile.expireError, 'error');
  };

  if (!isLoading && invitations.length === 0) {
    return (
      <Box>
        <SectionHeading>{t.profile.invitations}</SectionHeading>
        <Box
          sx={{
            p: spacing.lg,
            borderRadius: radius.lg,
            bgcolor: 'var(--tm-accent-wash)',
            border: '1px dashed var(--tm-border)',
            textAlign: 'center',
          }}
        >
          <Archive size={32} style={{ color: 'var(--tm-accent)', marginBottom: 8, opacity: 0.4 }} />
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: iosTypographyScale.footnote }}>
            {t.profile.noInvitations ?? 'No hay invitaciones aún'}
          </Typography>
        </Box>
      </Box>
    );
  }

  const metricCards = [
    { label: t.profile.total, value: metrics.total, icon: Link2, color: 'var(--tm-accent)' },
    { label: t.profile.active, value: metrics.active, icon: CheckCircle, color: 'var(--tm-accent)' },
    { label: t.profile.pending, value: metrics.pending, icon: Clock, color: 'var(--tm-warning)' },
    ...(metrics.expired > 0 ? [{ label: t.profile.expired ?? 'Expiradas', value: metrics.expired, icon: XCircle, color: 'var(--tm-danger)' }] : []),
  ];

  return (
    <Box>
      <SectionHeading>{t.profile.invitations}</SectionHeading>

      {/* Metric Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${metricCards.length}, 1fr)`, gap: spacing.xs, mb: spacing.sm }}>
        {metricCards.map(({ label, value, icon: Icon, color }) => (
          <Box
            key={label}
            sx={{
              p: 1.5,
              borderRadius: radius.md,
              bgcolor: alpha(color, 0.06),
              border: `1px solid ${alpha(color, 0.12)}`,
              textAlign: 'center',
            }}
          >
            <Icon size={16} style={{ color, marginBottom: 4 }} />
            <Typography
              variant="h6"
              sx={{
                fontFamily: qeFont.mono,
                fontWeight: 700,
                fontSize: '1.1rem',
                color,
                lineHeight: 1,
              }}
            >
              {value}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-secondary)' }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Search + Sort Controls */}
      {invitations.length > 2 && (
        <Box sx={{ display: 'flex', gap: spacing.xs, mb: spacing.xs, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Buscar invitado…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              flex: 1,
              '& .MuiInputBase-root': {
                borderRadius: radius.md,
                fontSize: iosTypographyScale.footnote,
                height: 32,
                bgcolor: 'var(--surface-primary)',
              },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--tm-accent-wash)' },
            }}
          />
          <ToggleButtonGroup
            size="small"
            value={sortBy}
            exclusive
            onChange={(_, v) => { if (v) setSortBy(v); }}
            sx={{
              height: 32,
              '& .MuiToggleButton-root': {
                px: 1, py: 0,
                fontSize: iosTypographyScale.caption2,
                fontWeight: 600,
                border: '1px solid var(--tm-border)',
                color: 'var(--text-secondary)',
                textTransform: 'none',
                '&.Mui-selected': { bgcolor: 'var(--tm-accent-wash)', color: 'var(--tm-accent)' },
              },
            }}
          >
            <ToggleButton value="date" aria-label="Ordenar por fecha">
              <ArrowUpDown size={12} style={{ marginRight: 4 }} />Fecha
            </ToggleButton>
            <ToggleButton value="name" aria-label="Ordenar por nombre">
              Nombre
            </ToggleButton>
            <ToggleButton value="status" aria-label="Ordenar por estado">
              Estado
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Invitation List */}
      <Box sx={{ display: 'grid', gap: spacing.xxs }}>
        {filteredInvitations.length === 0 && searchQuery ? (
          <Box sx={{ p: spacing.md, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'var(--text-tertiary)', fontSize: iosTypographyScale.footnote }}>
              Sin resultados para "{searchQuery}"
            </Typography>
          </Box>
        ) : null}
        {filteredInvitations.map((inv) => {
          const statusConf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
          const isEditable = inv.status === 'active' || inv.status === 'pending';
          const isMutating = mutatingCodes.has(inv.shortCode);

          return (
            <Box
              key={inv.invitationId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                p: spacing.sm,
                borderRadius: radius.md,
                bgcolor: 'var(--surface-primary)',
                opacity: isMutating ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <Box
                sx={{
                  width: 28, height: 28,
                  borderRadius: radius.sm,
                  bgcolor: alpha(statusConf.color, 0.1),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Send size={12} style={{ color: statusConf.color }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {inv.guestName ? (
                  <Typography
                    component="span"
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/mi-perfil/invitado/${encodeURIComponent(inv.guestName as string)}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate(`/mi-perfil/invitado/${encodeURIComponent(inv.guestName as string)}`);
                      }
                    }}
                    sx={{
                      display: 'block',
                      fontSize: iosTypographyScale.footnote,
                      fontWeight: 600,
                      color: 'var(--tm-accent)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {inv.guestName}
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: iosTypographyScale.footnote, fontWeight: 500,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {inv.guestContact || inv.shortCode}
                  </Typography>
                )}
              </Box>

              {/* Multiplier chip */}
              <Chip
                label={`x${(inv.guestMultiplier ?? 1).toFixed(1)}`}
                size="small"
                onClick={isEditable ? (e) => handleEditOpen(e, inv) : undefined}
                sx={{
                  height: 20, fontSize: '0.6rem', fontWeight: 700,
                  bgcolor: isEditable ? 'var(--tm-accent-wash)' : 'var(--tm-well)',
                  color: isEditable ? 'var(--tm-accent)' : 'var(--text-tertiary)',
                  border: '1px solid var(--tm-border)',
                  cursor: isEditable ? 'pointer' : 'default',
                  '&:hover': isEditable ? { bgcolor: 'var(--tm-accent-wash)' } : {},
                }}
              />

              <Chip
                label={statusConf.label}
                size="small"
                sx={{
                  height: 20, fontSize: '0.6rem', fontWeight: 600,
                  bgcolor: alpha(statusConf.color, 0.1),
                  color: statusConf.color,
                  border: `1px solid ${alpha(statusConf.color, 0.2)}`,
                }}
              />

              {isEditable && (
                <IconButton
                  size="small"
                  disabled={isMutating}
                  onClick={() => setExpireCode(inv.shortCode)}
                  sx={{
                    width: 24, height: 24, p: 0,
                    color: 'var(--text-tertiary)',
                    '&:hover': { color: 'var(--tm-danger)' },
                  }}
                >
                  <Ban size={13} />
                </IconButton>
              )}

              <Typography
                variant="caption"
                sx={{ fontSize: iosTypographyScale.caption2, color: 'var(--text-tertiary)', flexShrink: 0 }}
              >
                {formatDate(inv.createdAt)}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Multiplier Edit Popover */}
      <Popover
        open={Boolean(editAnchor)}
        anchorEl={editAnchor}
        onClose={() => setEditAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { p: 2, borderRadius: radius.lg, width: 220 } } }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
          {t.profile.multiplier}: x{editValue}
        </Typography>
        <Slider
          value={editValue}
          onChange={(_, v) => setEditValue(v as number)}
          min={1} max={4} step={0.1}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `x${v}`}
          sx={{ color: 'var(--tm-accent)', '& .MuiSlider-thumb': { width: 16, height: 16 } }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
          <Button size="small" onClick={() => setEditAnchor(null)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
            {t.profile.cancel}
          </Button>
          <Button
            size="small" variant="contained"
            disabled={editCode ? mutatingCodes.has(editCode) : false}
            onClick={handleEditSave}
            sx={{
              textTransform: 'none', fontSize: '0.75rem',
              bgcolor: 'var(--tm-accent)', '&:hover': { bgcolor: 'var(--tm-accent-strong)' },
            }}
          >
            {t.profile.save}
          </Button>
        </Box>
      </Popover>

      {/* Expire Confirmation Dialog */}
      <Dialog
        open={Boolean(expireCode)}
        onClose={() => setExpireCode(null)}
        slotProps={{ paper: { sx: { borderRadius: radius.lg } } }}
      >
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
          {t.profile.expireTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.85rem' }}>
            {t.profile.expireConfirm.replace('{name}', expireTarget?.guestName || expireTarget?.guestContact || expireTarget?.shortCode || '')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpireCode(null)} sx={{ textTransform: 'none' }}>
            {t.profile.cancel}
          </Button>
          <Button
            onClick={handleExpireConfirm}
            color="error"
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            {t.profile.expire}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
