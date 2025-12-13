/**
 * GoogleLoginButton Component
 *
 * Google Sign-In button using @react-oauth/google.
 * Displays user profile when signed in.
 */

import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Box, Typography, Avatar, Button, CircularProgress } from '@mui/material';
import { Logout } from '@mui/icons-material';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';

interface GoogleLoginButtonProps {
  variant?: 'button' | 'profile';
  onSuccess?: () => void;
  onError?: () => void;
}

export default function GoogleLoginButton({
  variant = 'button',
  onSuccess,
  onError,
}: GoogleLoginButtonProps) {
  const { user, isSignedIn, isLoading, signIn, signOut } = useGoogleAuth();

  const handleSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      try {
        await signIn(response.credential);
        onSuccess?.();
      } catch (error) {
        console.error('Sign in failed:', error);
        onError?.();
      }
    }
  };

  const handleError = () => {
    console.error('Google login failed');
    onError?.();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Show profile when signed in
  if (isSignedIn && user && variant === 'profile') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bgcolor: 'var(--surface-secondary)',
          borderRadius: 2,
        }}
      >
        <Avatar
          src={user.picture}
          alt={user.name}
          sx={{ width: 48, height: 48 }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" fontWeight={600} noWrap>
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user.email}
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<Logout />}
          onClick={signOut}
          sx={{ color: 'text.secondary' }}
        >
          Salir
        </Button>
      </Box>
    );
  }

  // Show compact signed-in state for button variant
  if (isSignedIn && user && variant === 'button') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar
          src={user.picture}
          alt={user.name}
          sx={{ width: 32, height: 32, cursor: 'pointer' }}
          onClick={signOut}
        />
      </Box>
    );
  }

  // Show login button
  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      useOneTap
      theme="filled_black"
      shape="pill"
      text="signin_with"
      locale="es"
    />
  );
}
