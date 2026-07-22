/**
 * FilterSheet — the ONE filter overlay (DS v3, Fase 3 P0).
 *
 * Composes Sheet (85dvh mobile bottom-sheet / desktop centered modal) with a
 * fixed footer: "Limpiar" + live "Ver N resultados" count + an active-filter
 * counter badge. Replaces IOSFilterSheet, which was a misnamed inline
 * Collapse with no real overlay, focus trap, or Escape dismissal.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Sheet } from '../Sheet';
import { Button } from '../Button';

export interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  /** Sheet heading — rendered as the element ariaLabelledBy points at. */
  title: string;
  /** Filter controls (sections, chips, sliders, etc.) */
  children: React.ReactNode;
  /** Live count of results the current filter combination yields. */
  resultCount: number;
  /** Number of currently active filters, shown as a counter next to "Limpiar". */
  activeFilterCount: number;
  onClear: () => void;
  /** Closes the sheet and applies filters (filters already apply live in most
   * consumers — this is the primary "done" action for mobile). */
  onApply: () => void;
}

const TITLE_ID = 'filter-sheet-title';

export const FilterSheet: React.FC<FilterSheetProps> = ({
  open,
  onClose,
  title,
  children,
  resultCount,
  activeFilterCount,
  onClear,
  onApply,
}) => {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      ariaLabelledBy={TITLE_ID}
      maxWidth={480}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'inherit',
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 8px',
            flexShrink: 0,
          }}
        >
          <Typography
            id={TITLE_ID}
            component="h2"
            sx={{
              fontFamily: 'var(--tm-font-ui)',
              fontWeight: 600,
              fontSize: '1.0625rem',
              color: 'var(--tm-text)',
            }}
          >
            {title}
          </Typography>
          {activeFilterCount > 0 && (
            <Box
              aria-hidden
              sx={{
                minWidth: 20,
                height: 20,
                padding: '0 6px',
                borderRadius: 'var(--tm-radius-pill)',
                backgroundColor: 'var(--tm-accent-wash)',
                color: 'var(--tm-accent)',
                fontFamily: 'var(--tm-font-mono)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeFilterCount}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '8px 20px 20px',
            flex: 1,
            minHeight: 0,
          }}
        >
          {children}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            padding: '12px 20px',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid var(--tm-border)',
            backgroundColor: 'var(--tm-surface)',
            flexShrink: 0,
          }}
        >
          <Button
            variant="plain"
            size="md"
            onClick={onClear}
            disabled={activeFilterCount === 0}
          >
            Limpiar{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
          <Box sx={{ flex: 1 }}>
            <Button variant="primary" size="md" fullWidth onClick={onApply}>
              Ver {resultCount.toLocaleString()} resultado
              {resultCount === 1 ? '' : 's'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Sheet>
  );
};

export default FilterSheet;
