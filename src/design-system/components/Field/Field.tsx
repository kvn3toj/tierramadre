/**
 * Field — the label + help + error wrapper (DS v3, addendum §B4).
 *
 * Enforces `label[for]` association (DS3 §7: "form fields always labeled").
 * `TextField` already carries its own label/helperText/error via MUI: use
 * `Field` around controls that don't — `Select`, `DatePicker`, checkbox/radio
 * groups, `SegmentedControl`, etc.
 */
import React, { useId } from 'react';
import { Box } from '@mui/material';

export interface FieldProps {
  /** Field label — always visible, paired to the control via `htmlFor`. */
  label: string;
  /**
   * id of the control this label points to. Auto-generated and passed to
   * `children` (as a render prop) when omitted.
   */
  htmlFor?: string;
  /** Marks the field required (appends a visual + aria cue). */
  required?: boolean;
  /** Error message — takes precedence over `help` and colors the label. */
  error?: string;
  /** Helper text shown when there's no error. */
  help?: string;
  /** The control. Render-prop form receives the resolved `id` to attach. */
  children: React.ReactNode | ((id: string) => React.ReactNode);
  className?: string;
  style?: React.CSSProperties;
}

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  required = false,
  error,
  help,
  children,
  className,
  style,
}) => {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const message = error || help;

  return (
    <Box
      className={className}
      style={style}
      sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
    >
      <Box
        component="label"
        htmlFor={id}
        sx={{
          fontFamily: 'var(--tm-font-ui)',
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: error ? 'var(--tm-danger)' : 'var(--tm-muted)',
        }}
      >
        {label}
        {required && (
          <Box component="span" aria-hidden sx={{ color: 'var(--tm-danger)' }}>
            {' '}
            *
          </Box>
        )}
      </Box>

      {typeof children === 'function' ? children(id) : children}

      {message && (
        <Box
          component="span"
          role={error ? 'alert' : undefined}
          sx={{
            fontFamily: 'var(--tm-font-ui)',
            fontSize: '0.75rem',
            color: error ? 'var(--tm-danger)' : 'var(--tm-subtle)',
          }}
        >
          {message}
        </Box>
      )}
    </Box>
  );
};

export default Field;
