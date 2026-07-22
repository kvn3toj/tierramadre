/**
 * Floating A/B switch for the Quiet Emerald redesign.
 *
 * Lets the design owner flip the three redesigned screens between the two
 * philosophies (see useRedesignVariant) live, with real data. Deliberately
 * low-key: a small hairline pill anchored above the bottom nav. Rendered inside
 * the redesigned screens (only one route mounts at a time, so no duplicates).
 */

import React from 'react';
import { Box } from '@mui/material';
import { SegmentedControl } from '../../design-system/components/SegmentedControl';
import {
  useRedesignVariant,
  type RedesignVariant,
} from '../../hooks/useRedesignVariant';

const OPTIONS: { value: RedesignVariant; label: string; hint: string }[] = [
  { value: 'faithful', label: 'A', hint: 'Fiel' },
  { value: 'literal', label: 'B', hint: 'Mockup' },
];

export const RedesignVariantToggle: React.FC = () => {
  const { variant, setVariant } = useRedesignVariant();

  if (!import.meta.env.DEV) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 16,
        bottom: 'calc(96px + env(safe-area-inset-bottom))',
        zIndex: 1400,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <Box
        aria-hidden
        sx={{
          fontFamily: 'var(--tm-font-mono)',
          fontSize: '8.5px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--tm-subtle)',
          userSelect: 'none',
        }}
      >
        A/B
      </Box>
      <SegmentedControl
        ariaLabel="Variante de rediseño"
        value={variant}
        onChange={setVariant}
        options={OPTIONS.map((opt) => ({
          value: opt.value,
          label: (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
              <Box
                component="span"
                sx={{ fontFamily: 'var(--tm-font-mono)', fontSize: '11px' }}
              >
                {opt.label}
              </Box>
              <Box
                component="span"
                sx={{ fontSize: '10px', letterSpacing: '0.02em' }}
              >
                {opt.hint}
              </Box>
            </Box>
          ),
        }))}
      />
    </Box>
  );
};

export default RedesignVariantToggle;
