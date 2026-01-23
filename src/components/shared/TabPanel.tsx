/**
 * TabPanel Component
 * iOS HIG styled tab panel with fade animation.
 * Extracted from AdminAnalyticsPage.
 */

import React from 'react';
import { Box } from '@mui/material';

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  /** Enable fade-in animation (default: true) */
  animated?: boolean;
}

const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  index,
  animated = true,
}) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    id={`tabpanel-${index}`}
    aria-labelledby={`tab-${index}`}
    sx={{
      pt: 2,
      animation: animated && value === index ? 'fadeIn 0.2s ease-out' : undefined,
      '@keyframes fadeIn': {
        from: { opacity: 0, transform: 'translateY(4px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
    }}
  >
    {value === index && children}
  </Box>
);

export default TabPanel;
