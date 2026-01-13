/**
 * FeedbackFAB - Floating Action Button for Dev Feedback
 *
 * Visible to admins, asesores, and embajadores (full access users).
 * Opens the feedback wizard modal to report UI issues.
 */

import { useState } from 'react';
import { Fab, Tooltip, Zoom, Badge } from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import { alpha } from '@mui/material/styles';
import { useAuthContext } from '../../contexts/AuthContext';
import { emeraldCore } from '../../design-system/tokens/colors';
import FeedbackWizard from './FeedbackWizard';

export default function FeedbackFAB() {
  const { accessLevel } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);

  // Render for admins and full access users (asesores/embajadores)
  const canAccessFeedback = accessLevel === 'admin' || accessLevel === 'full';
  if (!canAccessFeedback) {
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
