/**
 * FeedbackFAB - Floating Action Button for Admin Feedback
 *
 * Visible only to admins. Opens the feedback wizard modal.
 */

import { useState } from 'react';
import { Fab, Tooltip, Zoom, Badge } from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import { alpha } from '@mui/material/styles';
import { useIsAdmin } from '../../hooks/usePermissions';
import { emeraldCore } from '../../design-system/tokens/colors';
import FeedbackWizard from './FeedbackWizard';

export default function FeedbackFAB() {
  const isAdmin = useIsAdmin();
  const [isOpen, setIsOpen] = useState(false);

  // Only render for admins
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Zoom in={!isOpen}>
        <Tooltip title="Reportar problema de UI" placement="left" arrow>
          <Fab
            onClick={() => setIsOpen(true)}
            sx={{
              position: 'fixed',
              bottom: { xs: 80, sm: 24 }, // Above bottom nav on mobile
              right: 24,
              zIndex: 1200,
              bgcolor: emeraldCore.dark,
              color: 'white',
              '&:hover': {
                bgcolor: emeraldCore.darker,
              },
              boxShadow: `0 4px 20px ${alpha(emeraldCore.dark, 0.4)}`,
              // Subtle pulse animation to draw attention
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  boxShadow: `0 4px 20px ${alpha(emeraldCore.dark, 0.4)}`,
                },
                '50%': {
                  boxShadow: `0 4px 30px ${alpha(emeraldCore.dark, 0.6)}`,
                },
                '100%': {
                  boxShadow: `0 4px 20px ${alpha(emeraldCore.dark, 0.4)}`,
                },
              },
            }}
            aria-label="Report UI issue"
          >
            <Badge
              badgeContent="DEV"
              color="warning"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 16,
                  minWidth: 28,
                  top: -8,
                  right: -8,
                },
              }}
            >
              <BugReportIcon />
            </Badge>
          </Fab>
        </Tooltip>
      </Zoom>

      <FeedbackWizard open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
