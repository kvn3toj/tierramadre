/**
 * Tierra Madre Design System v3 — TextField Component
 *
 * The ONE text input (DS3 §3.3, §6.1, addendum §B4/§C). Absorbs `IOSTextField`
 * (0 consumers, retired) and the ~185 inline-styled MUI `TextField` sites.
 *
 * Wraps MUI's TextField (not a from-scratch input) so the standard MUI prop
 * API — `onChange(event)`, `multiline`, `InputAdornment`, `type`, RHF
 * `Controller` — keeps working at every migrated call site; only the visual
 * language changes. Inset well, borders-first, no floating-legend chrome.
 */

import React from 'react';
import {
  TextField as MuiTextField,
  TextFieldProps as MuiTextFieldProps,
  IconButton,
  InputAdornment,
  styled,
} from '@mui/material';
import { componentHeights } from '../../tokens/spacing';

// =============================================================================
// TYPES
// =============================================================================

export type TextFieldSize = 'sm' | 'md' | 'lg';

export interface TextFieldProps extends Omit<
  MuiTextFieldProps,
  'variant' | 'size'
> {
  /** Control size. Default 'md' (48px — DS3 §6.3 touch target). */
  size?: TextFieldSize;
  /** Shows an inline clear (×) button when there's a value. Default false. */
  clearable?: boolean;
  /** Called when the clear button is pressed (also fires a synthetic empty onChange). */
  onClear?: () => void;
}

// =============================================================================
// SIZE MAPPING
// =============================================================================

const sizeHeights: Record<TextFieldSize, number> = {
  sm: componentHeights.input.sm,
  md: componentHeights.input.md,
  lg: componentHeights.input.lg,
};

// =============================================================================
// STYLED
// =============================================================================

const StyledTextField = styled(MuiTextField, {
  shouldForwardProp: (prop) => prop !== 'fieldSize',
})<{ fieldSize: TextFieldSize }>(({ fieldSize, multiline }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'var(--tm-well)',
    borderRadius: 'var(--tm-radius-control)',
    fontFamily: 'var(--tm-font-ui)',
    color: 'var(--tm-text)',
    minHeight: multiline ? 'auto' : sizeHeights[fieldSize],
    // DS3 §4: transition color/border only.
    transition:
      'border-color var(--tm-fast) var(--tm-ease), background-color var(--tm-fast) var(--tm-ease), box-shadow var(--tm-fast) var(--tm-ease)',
    '& fieldset': {
      borderColor: 'var(--tm-border)',
      borderWidth: 1,
    },
    '&:hover fieldset': {
      borderColor: 'var(--tm-accent)',
    },
    '&.Mui-focused': {
      boxShadow: 'var(--tm-focus-ring)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--tm-accent)',
      borderWidth: 1,
    },
    '&.Mui-error fieldset': {
      borderColor: 'var(--tm-danger)',
    },
    '&.Mui-disabled': {
      opacity: 0.45,
      cursor: 'not-allowed',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'var(--tm-subtle)',
    fontFamily: 'var(--tm-font-ui)',
    '&.Mui-focused': { color: 'var(--tm-accent)' },
    '&.Mui-error': { color: 'var(--tm-danger)' },
  },
  '& .MuiInputBase-input': {
    color: 'var(--tm-text)',
  },
  '& .MuiFormHelperText-root': {
    color: 'var(--tm-subtle)',
    fontFamily: 'var(--tm-font-ui)',
    marginLeft: 0,
    '&.Mui-error': { color: 'var(--tm-danger)' },
  },
}));

// =============================================================================
// TEXTFIELD COMPONENT
// =============================================================================

export const TextField = React.forwardRef<HTMLDivElement, TextFieldProps>(
  (
    {
      size = 'md',
      clearable = false,
      onClear,
      value,
      InputProps,
      onChange,
      ...props
    },
    ref,
  ) => {
    const hasValue = typeof value === 'string' ? value.length > 0 : !!value;

    const handleClear = () => {
      onClear?.();
      onChange?.({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    const mergedInputProps =
      clearable && hasValue && !props.disabled
        ? {
            ...InputProps,
            endAdornment: (
              <>
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Clear"
                    size="small"
                    onClick={handleClear}
                    onMouseDown={(e) => e.preventDefault()}
                    sx={{ color: 'var(--tm-subtle)' }}
                  >
                    ×
                  </IconButton>
                </InputAdornment>
                {InputProps?.endAdornment}
              </>
            ),
          }
        : InputProps;

    return (
      <StyledTextField
        ref={ref}
        fieldSize={size}
        variant="outlined"
        value={value}
        onChange={onChange}
        InputProps={mergedInputProps}
        {...props}
      />
    );
  },
);

TextField.displayName = 'TextField';

export default TextField;
