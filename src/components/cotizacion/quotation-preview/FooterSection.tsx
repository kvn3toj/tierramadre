/**
 * FooterSection - Quotation footer with business contact information.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { brandColors, quotationStyles } from '../constants';
import { BusinessSettings } from '../../../hooks/useCotizacion';

export interface FooterSectionProps {
  businessSettings: BusinessSettings;
}

export const FooterSection: React.FC<FooterSectionProps> = ({ businessSettings }) => (
  <Box
    sx={{
      borderTop: `1px solid ${quotationStyles.borderLight}`,
      pt: 1.5,
      textAlign: 'center',
    }}
  >
    <Typography sx={{ fontSize: '0.55rem', color: brandColors.textPrimary, fontWeight: 500 }}>
      {businessSettings.contactPhone}
    </Typography>
    <Typography sx={{ fontSize: '0.45rem', color: brandColors.gray, mt: 0.25, letterSpacing: '0.02em' }}>
      {businessSettings.appUrl}
    </Typography>
    <Typography sx={{ fontSize: '0.5rem', color: brandColors.emerald, mt: 0.25, letterSpacing: '0.02em' }}>
      {businessSettings.contactEmail}
    </Typography>
  </Box>
);
