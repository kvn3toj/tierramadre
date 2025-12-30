/**
 * UserProfileCard Component
 *
 * Displays user profile with Google account info.
 * Shows login prompt if not signed in.
 */

import { Box, Card, CardContent, Typography, Avatar, Button, Chip } from '@mui/material';
import { Person } from '@mui/icons-material';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { alpha } from '@mui/material/styles';
import { createLogger } from '../../utils/logger';

const log = createLogger('Auth');

// Check if Google Client ID is configured
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 10);

export default function UserProfileCard() {
  const { user, isSignedIn, signIn, signOut, preferences } = useGoogleAuth();

  const handleSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      try {
        await signIn(response.credential);
      } catch (error) {
        log.error('Sign in failed:', error);
      }
    }
  };

  // Signed in state
  if (isSignedIn && user) {
    return (
      <Card
        sx={{
          bgcolor: 'var(--surface-secondary)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Header with gradient */}
        <Box
          sx={{
            height: 80,
            background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
            position: 'relative',
          }}
        />

        <CardContent sx={{ pt: 0, mt: -5 }}>
          {/* Avatar */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Avatar
              src={user.picture}
              alt={user.name}
              sx={{
                width: 80,
                height: 80,
                border: '4px solid var(--surface-secondary)',
                boxShadow: 2,
              }}
            />
          </Box>

          {/* Name & Email */}
          <Typography variant="h6" align="center" fontWeight={600}>
            {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            {user.email}
          </Typography>

          {/* Stats */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              mt: 2,
              mb: 2,
            }}
          >
            {preferences.favoriteProducts && (
              <Chip
                size="small"
                label={`${preferences.favoriteProducts.length} favoritos`}
                sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1) }}
              />
            )}
            {preferences.savedFacts && (
              <Chip
                size="small"
                label={`${preferences.savedFacts.length} guardados`}
                sx={{ bgcolor: (theme) => alpha(theme.palette.info.main, 0.1) }}
              />
            )}
          </Box>

          {/* Sign out button */}
          <Button
            fullWidth
            variant="outlined"
            onClick={signOut}
            sx={{ mt: 1 }}
          >
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not signed in - show login prompt or coming soon
  // Don't render if Google is not configured
  if (!isGoogleConfigured) {
    return null;
  }

  return (
    <Card
      sx={{
        bgcolor: 'var(--surface-secondary)',
        borderRadius: 3,
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <Person sx={{ fontSize: 32, color: 'primary.main' }} />
        </Box>

        <Typography variant="h6" gutterBottom fontWeight={600}>
          Inicia Sesión
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sincroniza tus favoritos y preferencias en todos tus dispositivos
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => log.error('Login failed')}
            theme="filled_black"
            shape="pill"
            text="signin_with"
            locale="es"
          />
        </Box>
      </CardContent>
    </Card>
  );
}
