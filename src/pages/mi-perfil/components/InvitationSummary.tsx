/**
 * InvitationSummary Component
 *
 * 3 metric cards (total, active, pending) + invitation list with multiplier + actions.
 */

import { useState } from 'react';
import {
  Box, Typography, Chip, alpha, IconButton,
  Popover, Slider, Button, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import { Link2, CheckCircle, Clock, XCircle, Send, Ban } from 'lucide-react';
import { emeraldCore, accentColors, iosTypographyScale, primitiveSpacing as spacing, radius, fontFamilies } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotification } from '../../../contexts/NotificationContext';
import type { Invitation } from '../../../hooks/useMyInvitations';

interface InvitationSummaryProps {
  invitations: Invitation[];
  metrics: { total: number; active: number; pending: number };
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
  active: { label: 'Activa', color: accentColors.success.light, icon: CheckCircle },
  pending: { label: 'Pendiente', color: accentColors.warning.light, icon: Clock },
  expired: { label: 'Expirada', color: accentColors.error?.light || '#f44336', icon: XCircle },
};

export function InvitationSummary({
  invitations, metrics, isLoading,
  mutatingCodes, onUpdateMultiplier, onExpire,
}: InvitationSummaryProps) {
  const { t } = useLanguage();
  const { notify } = useNotification();
  const [editAnchor, setEditAnchor] = useState<HTMLElement | null>(null);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(1);
  const [expireCode, setExpireCode] = useState<string | null>(null);
  const expireTarget = invitations.find(i => i.shortCode === expireCode);

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

  if (!isLoading && invitations.length === 0) return null;

  const metricCards = [
    { label: t.profile.total, value: metrics.total, icon: Link2, color: emeraldCore.primary },
    { label: t.profile.active, value: metrics.active, icon: CheckCircle, color: accentColors.success.light },
    { label: t.profile.pending, value: metrics.pending, icon: Clock, color: accentColors.warning.light },
  ];

  return (
    <Box sx={{ mb: spacing.md }}>
      <Typography
        variant="overline"
        sx={{
          fontSize: iosTypographyScale.caption2,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          mb: 1,
          display: 'block',
          px: spacing.xs,
        }}
      >
        {t.profile.invitations.toUpperCase()}
      </Typography>

      {/* Metric Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.xs, mb: spacing.sm }}>
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
                fontFamily: fontFamilies.mono,
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

      {/* Invitation List */}
      <Box sx={{ display: 'grid', gap: spacing.xxs }}>
        {invitations.map((inv) => {
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
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: iosTypographyScale.footnote, fontWeight: 500,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {inv.guestName || inv.guestContact || inv.shortCode}
                </Typography>
              </Box>

              {/* Multiplier chip */}
              <Chip
                label={`x${(inv.guestMultiplier ?? 1).toFixed(1)}`}
                size="small"
                onClick={isEditable ? (e) => handleEditOpen(e, inv) : undefined}
                sx={{
                  height: 20, fontSize: '0.6rem', fontWeight: 700,
                  bgcolor: alpha(emeraldCore.primary, isEditable ? 0.1 : 0.05),
                  color: isEditable ? emeraldCore.primary : 'var(--text-tertiary)',
                  border: `1px solid ${alpha(emeraldCore.primary, isEditable ? 0.2 : 0.08)}`,
                  cursor: isEditable ? 'pointer' : 'default',
                  '&:hover': isEditable ? { bgcolor: alpha(emeraldCore.primary, 0.15) } : {},
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
                    '&:hover': { color: accentColors.error?.light || '#f44336' },
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
          sx={{ color: emeraldCore.primary, '& .MuiSlider-thumb': { width: 16, height: 16 } }}
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
              bgcolor: emeraldCore.primary, '&:hover': { bgcolor: emeraldCore.dark },
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
