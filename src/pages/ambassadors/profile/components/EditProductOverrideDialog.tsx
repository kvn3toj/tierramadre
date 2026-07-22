/**
 * EditProductOverrideDialog
 *
 * Lets a logged-in ambassador customise the display name and/or COP price
 * of a single product within their own collection. Changes are persisted
 * via useAmbassadorOverrides (localStorage MVP).
 *
 * Validation:
 * - Name: trimmed, ≤ 80 chars (OVERRIDE_LIMITS.NAME_MAX_LENGTH).
 * - Price: between 1.0x and 10.0x of the canonical product price.
 *
 * UX:
 * - Both fields prefilled with the current effective value.
 * - "Restaurar valores por defecto" clears both overrides.
 * - Disabled "Guardar" while invalid.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
} from '@mui/material';
import type { TreasureItem } from '../../../../types';
import {
  AmbassadorProductOverride,
  OVERRIDE_LIMITS,
} from '../../../../types/ambassadorOverride';
import { validateOverride } from '../../../../hooks/useAmbassadorOverrides';
import { TextField } from '../../../../design-system';

interface EditProductOverrideDialogProps {
  open: boolean;
  product: TreasureItem | null;
  currentOverride: AmbassadorProductOverride | undefined;
  onClose: () => void;
  onSave: (patch: { customName?: string; customPriceCOP?: number }) => void;
  onClear: () => void;
}

function formatCOP(value: number): string {
  return value.toLocaleString('es-CO');
}

export const EditProductOverrideDialog: React.FC<EditProductOverrideDialogProps> = ({
  open,
  product,
  currentOverride,
  onClose,
  onSave,
  onClear,
}) => {
  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');

  // Reset form on open / product change
  useEffect(() => {
    if (!open || !product) return;
    setName(currentOverride?.customName ?? '');
    setPriceText(
      currentOverride?.customPriceCOP !== undefined
        ? String(Math.round(currentOverride.customPriceCOP))
        : '',
    );
  }, [open, product, currentOverride]);

  const parsedPrice = useMemo(() => {
    const trimmed = priceText.trim();
    if (trimmed.length === 0) return undefined;
    const n = Number(trimmed.replace(/[.\s,]/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }, [priceText]);

  const validation = useMemo(() => {
    if (!product) return { ok: false, errors: [] as ReturnType<typeof validateOverride>['errors'] };
    return validateOverride({
      baseProduct: product,
      customName: name,
      customPriceCOP: parsedPrice === undefined ? undefined : (Number.isNaN(parsedPrice) ? undefined : parsedPrice),
    });
  }, [product, name, parsedPrice]);

  if (!product) return null;

  const basePrice = product.precioCOP;
  const priceMin = typeof basePrice === 'number' ? basePrice * OVERRIDE_LIMITS.PRICE_MIN_MULTIPLIER : null;
  const priceMax = typeof basePrice === 'number' ? basePrice * OVERRIDE_LIMITS.PRICE_MAX_MULTIPLIER : null;

  const nameError = validation.errors.find((e) => e.field === 'customName')?.message;
  const priceError =
    Number.isNaN(parsedPrice as number) && priceText.trim().length > 0
      ? 'Ingresa un número válido'
      : validation.errors.find((e) => e.field === 'customPriceCOP')?.message;

  const canSave = validation.ok && (Number.isFinite(parsedPrice as number) || parsedPrice === undefined);

  const handleSave = () => {
    onSave({
      customName: name,
      customPriceCOP: parsedPrice === undefined || Number.isNaN(parsedPrice) ? undefined : parsedPrice,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Personalizar producto
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Box>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 0.5 }}>
              Producto base
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {product.nombre} · #{product.item}
            </Typography>
            {typeof basePrice === 'number' && (
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                Precio base: ${formatCOP(basePrice)} COP
              </Typography>
            )}
          </Box>

          <TextField
            label="Nombre personalizado (opcional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            inputProps={{ maxLength: OVERRIDE_LIMITS.NAME_MAX_LENGTH + 5 }}
            helperText={
              nameError
                ?? `${name.trim().length}/${OVERRIDE_LIMITS.NAME_MAX_LENGTH} caracteres`
            }
            error={Boolean(nameError)}
          />

          <TextField
            label="Precio personalizado en COP (opcional)"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            fullWidth
            inputMode="numeric"
            placeholder={typeof basePrice === 'number' ? `Ej: ${formatCOP(basePrice)}` : 'Ej: 1000000'}
            helperText={
              priceError
                ?? (priceMin !== null && priceMax !== null
                  ? `Rango permitido: $${formatCOP(Math.round(priceMin))} – $${formatCOP(Math.round(priceMax))} COP`
                  : 'Sin precio base disponible')
            }
            error={Boolean(priceError)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClear} color="inherit" sx={{ textTransform: 'none' }}>
          Restaurar valores por defecto
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canSave}
          sx={{
            textTransform: 'none',
            bgcolor: 'var(--tm-accent-strong)',
            color: 'var(--tm-on-accent)',
            '&:hover': { bgcolor: 'var(--tm-accent)' },
          }}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProductOverrideDialog;
