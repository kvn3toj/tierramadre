/**
 * InvitationPage
 *
 * Handles invitation link validation and grants temporary guest access.
 * The 1-hour timer starts when this page is loaded (token activated).
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Alert, Paper } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Timer, Explore } from '@mui/icons-material';
import { useInvitation } from '../hooks/useInvitation';
import { useAuth } from '../hooks/useAuth';
import { brand, typography } from '../design-system';

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { validateInvitation, isValidating } = useInvitation();
  const { loginAsGuest } = useAuth();

  const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'error'>('loading');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [createdBy, setCreatedBy] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Enlace de invitacion invalido');
      return;
    }

    const validate = async () => {
      const result = await validateInvitation(token);

      if (result.isValid) {
        setStatus('valid');
        setTimeRemaining(result.timeRemainingMinutes || 60);
        setCreatedBy(result.createdBy || '');

        // Grant guest access
        loginAsGuest();

        // Store invitation expiration in sessionStorage
        if (result.expiresAt) {
          sessionStorage.setItem('invitation-expires', result.expiresAt);
          // Use activated token if available (has expiration baked in), otherwise use original
          sessionStorage.setItem('invitation-token', result.activatedToken || token);
        }
      } else if (result.status === 'expired') {
        setStatus('expired');
        setErrorMessage('Esta invitacion ha expirado');
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Invitacion no valida');
      }
    };

    validate();
  }, [token, validateInvitation, loginAsGuest]);

  const handleExplore = () => {
    navigate('/treasure');
  };

  const handleGoHome = () => {
    navigate('/home');
  };

  if (status === 'loading' || isValidating) {
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
          Validando invitacion...
        </Typography>
      </Box>
    );
  }

  if (status === 'expired' || status === 'error') {
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
        <Paper
          elevation={0}
          sx={{
            p: 4,
            maxWidth: 400,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={typography.weight.bold} gutterBottom>
            {status === 'expired' ? 'Invitacion Expirada' : 'Enlace Invalido'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {errorMessage}
          </Typography>
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            Las invitaciones son validas por 1 hora desde que se abren por primera vez.
            Solicita un nuevo enlace al embajador que te invito.
          </Alert>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            fullWidth
          >
            Ir al Inicio
          </Button>
        </Paper>
      </Box>
    );
  }

  // Valid invitation
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
      <Paper
        elevation={0}
        sx={{
          p: 4,
          maxWidth: 400,
          textAlign: 'center',
          borderRadius: 3,
          border: '1px solid',
          borderColor: brand.emerald[200],
          bgcolor: `${brand.emerald[50]}50`,
        }}
      >
        <CheckCircle sx={{ fontSize: 64, color: brand.emerald[600], mb: 2 }} />
        <Typography variant="h5" fontWeight={typography.weight.bold} gutterBottom>
          Bienvenido a Tierra Madre
        </Typography>
        {createdBy && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Invitado por {createdBy}
          </Typography>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mb: 3,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
          }}
        >
          <Timer sx={{ color: brand.gold[600] }} />
          <Typography variant="body1" fontWeight={typography.weight.semibold}>
            {timeRemaining} minutos restantes
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Tienes acceso temporal para explorar nuestra coleccion exclusiva de esmeraldas colombianas.
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<Explore />}
          onClick={handleExplore}
          fullWidth
          sx={{
            bgcolor: brand.emerald[600],
            '&:hover': { bgcolor: brand.emerald[700] },
            mb: 1,
          }}
        >
          Explorar Coleccion
        </Button>

        <Button
          variant="text"
          onClick={handleGoHome}
          fullWidth
          sx={{ color: 'text.secondary' }}
        >
          Ir al Inicio
        </Button>
      </Paper>
    </Box>
  );
}
