/**
 * ConfirmDialog Component
 * Reusable confirmation dialog for destructive actions.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Sheet } from '../../design-system/components/Sheet';
import { Button } from '../../design-system/components/Button';
import { useLanguage } from '../../contexts/LanguageContext';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'error' | 'primary';
  /** Disable confirm (and block backdrop/Esc) while an action is in-flight. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmColor = 'error',
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();
  const finalConfirmLabel = confirmLabel || t.actions.delete;
  const finalCancelLabel = cancelLabel || t.actions.cancel;
  const titleId = 'confirm-dialog-title';

  return (
    <Sheet
      open={open}
      onClose={onCancel}
      ariaLabelledBy={titleId}
      maxWidth={340}
      disableClose={confirmDisabled}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          id={titleId}
          sx={{
            fontFamily: 'var(--tm-font-ui)',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--tm-text)',
            mb: 1,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--tm-font-ui)',
            fontSize: '0.875rem',
            color: 'var(--tm-muted)',
          }}
        >
          {message}
        </Typography>
        <Box
          sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}
        >
          <Button variant="outlined" onClick={onCancel}>
            {finalCancelLabel}
          </Button>
          <Button
            variant={confirmColor === 'error' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {finalConfirmLabel}
          </Button>
        </Box>
      </Box>
    </Sheet>
  );
};

export default ConfirmDialog;
