/**
 * NotesSection - Displays quotation notes and validity information.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { brandColors, quotationStyles } from '../constants';

// =============================================================================
// NotesSection
// =============================================================================

export interface NotesSectionProps {
  notes: string;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ notes }) => (
  <Box sx={{
    mb: 3,
    p: 1.5,
    bgcolor: quotationStyles.surfaceTint,
    borderRadius: 2,
    border: `1px solid ${quotationStyles.borderLight}`,
  }}>
    <Typography sx={{
      fontSize: '0.55rem',
      fontWeight: 600,
      color: brandColors.emerald,
      mb: 0.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    }}>
      Notas
    </Typography>
    <Typography sx={{ fontSize: '0.6rem', color: brandColors.textPrimary, lineHeight: 1.6 }}>
      {notes}
    </Typography>
  </Box>
);

// =============================================================================
// ValiditySection
// =============================================================================

export interface ValiditySectionProps {
  expiryStr: string;
  footerNote: string;
}

export const ValiditySection: React.FC<ValiditySectionProps> = ({ expiryStr, footerNote }) => (
  <Box sx={{
    textAlign: 'center',
    mb: 1.5,
    py: 1,
    px: 1.5,
    bgcolor: quotationStyles.surfaceMuted,
    borderRadius: 2,
    border: `1px solid ${quotationStyles.borderLight}`,
  }}>
    <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray }}>
      Esta cotización es válida hasta
    </Typography>
    <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: brandColors.textPrimary, mt: 0.25 }}>
      {expiryStr}
    </Typography>
    <Typography sx={{
      fontSize: '0.4rem',
      color: brandColors.gray,
      mt: 0.75,
      lineHeight: 1.4,
      maxWidth: 300,
      mx: 'auto',
    }}>
      {footerNote}
    </Typography>
  </Box>
);

// =============================================================================
// CertificationLogosSection
// =============================================================================

export const CertificationLogosSection: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2.5,
      mb: 1.5,
      py: 1.5,
    }}
  >
    <Box
      component="img"
      src="/certification-logo-1.png"
      alt="Certification 1"
      sx={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        objectFit: 'cover',
      }}
    />
    <Box
      component="img"
      src="/certification-logo-2.png"
      alt="Certification 2"
      sx={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        objectFit: 'cover',
      }}
    />
    <Box
      component="img"
      src="/certification-logo-3.png"
      alt="Certification 3"
      sx={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        objectFit: 'cover',
      }}
    />
  </Box>
);
