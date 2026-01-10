/**
 * ShortLinkRedirect Page
 *
 * Handles /g/:shortCode routes by resolving the short code
 * to the full invitation token and redirecting to InvitationPage.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Paper, Button, Alert } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';
import { brand, typography } from '../design-system';

export default function ShortLinkRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!shortCode) {
      setError('Codigo de invitacion no valido');
      setIsLoading(false);
      return;
    }

    const resolveShortCode = async () => {
      try {
        const response = await fetch(`/api/short-link?code=${encodeURIComponent(shortCode)}`);
        const data = await response.json();

        if (!data.success || !data.invitation) {
          setError('Este enlace ha expirado o no es valido');
          setIsLoading(false);
          return;
        }

        // Check if invitation is already expired
        if (data.invitation.status === 'expired' || data.isExpired) {
          setError('Esta invitacion ha expirado');
          setIsLoading(false);
          return;
        }

        // We need to regenerate the token from the stored invitation data
        // For now, we'll redirect with the invitation ID and let the validation API handle it
        // The short-link API should return enough info to reconstruct the token
        // But since we store the full token in the JWT, we need a different approach

        // The cleanest solution is to store the token in the short-link entry
        // For now, let's fetch the token via a dedicated endpoint
        // Actually, the generate-invitation already creates the JWT and we need to pass it

        // Alternative: Create a new validation flow that uses invitationId from sheets
        // For simplicity, we'll show an error and suggest using the full link

        // Best approach: The short-link API should return a redirect to the full invite URL
        // But since we're client-side, let's construct it from stored data

        // Since we have the invitation data but not the JWT, we'll need to either:
        // 1. Store the JWT in the sheet (not ideal for size)
        // 2. Re-sign a JWT on the server side when resolving short code
        // 3. Use a different validation flow

        // Let's implement option 2 - the short-link API will return a fresh token
        // We need to update the API to handle this

        // For now, if the invitation exists and isn't expired, we have an issue
        // Let me check if the invitation data has what we need...

        // The invitation data from sheets has: invitationId, shortCode, creatorEmail, etc.
        // We can pass the invitationId to a new endpoint that regenerates the token

        // Actually, let's update the short-link API to also return the token if available
        // Or create a resolve-short-link endpoint that generates a new token

        // For this implementation, let's redirect to a special route that validates by invitationId
        // We'll add this capability to validate-invitation API

        // Simplest solution for now: Store token in sheet (we don't have space constraint)
        // But that's not implemented yet. Let's show a helpful error.

        // Actually, looking at the API more carefully:
        // The generate-invitation already stores in sheets WITH the shortCode
        // The validate-invitation uses the JWT token
        // We need to bridge: shortCode -> invitationId -> regenerate JWT

        // Let's add a token regeneration capability
        // For now, redirect with invitation ID and handle in validate-invitation

        // UPDATE: Let's use a different approach -
        // The API already stores creatorEmail, durationHours, pricingMode in sheets
        // We can regenerate a valid JWT from this data

        const regenerateResponse = await fetch('/api/short-link', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invitationId: data.invitation.invitationId,
            regenerateToken: true,
          }),
        });

        const regenData = await regenerateResponse.json();

        if (regenData.success && regenData.token) {
          // Redirect to the full invitation page with the regenerated token
          navigate(`/invite/${regenData.token}`, { replace: true });
        } else {
          // Fallback: If we can't regenerate, use the invitation ID
          // This will work if validate-invitation is updated to accept invitation IDs
          setError('No se pudo procesar el enlace. Por favor solicita uno nuevo.');
          setIsLoading(false);
        }

      } catch (err) {
        console.error('Error resolving short code:', err);
        setError('Error al procesar el enlace');
        setIsLoading(false);
      }
    };

    resolveShortCode();
  }, [shortCode, navigate]);

  if (isLoading) {
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
          Procesando invitacion...
        </Typography>
      </Box>
    );
  }

  if (error) {
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
            Enlace Invalido
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            Por favor solicita un nuevo enlace de invitacion al embajador que te contacto.
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

  return null;
}
