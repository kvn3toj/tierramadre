/**
 * ShortLinkRedirect Page
 *
 * Handles /g/:shortCode routes by redirecting to /invite/:shortCode
 * This is just a simple redirect - the actual validation happens in InvitationPage.
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { brand } from '../design-system';

export default function ShortLinkRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (shortCode) {
      // Simply redirect to the invite page with the short code
      navigate(`/invite/${shortCode}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [shortCode, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <CircularProgress sx={{ color: brand.emerald[600], mb: 2 }} />
      <Typography variant="body1" color="text.secondary">
        Cargando invitacion...
      </Typography>
    </Box>
  );
}
