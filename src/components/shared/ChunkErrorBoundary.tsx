import { Component, ReactNode } from 'react';
import { Box, Typography, Button, CircularProgress, alpha } from '@mui/material';
import { STORAGE_KEYS, SESSION_KEYS } from '../../constants/storage-keys';
import { emeraldCore } from '../../design-system/tokens/colors';

interface ChunkErrorBoundaryProps {
  children: ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  isReloading: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  // Vite chunk load errors
  if (error.name === 'ChunkLoadError') return true;

  // Dynamic import failures
  const message = error.message.toLowerCase();
  if (message.includes('failed to fetch dynamically imported module')) return true;
  if (message.includes('loading chunk')) return true;
  if (message.includes('loading css chunk')) return true;
  if (message.includes('importing a module script failed')) return true;

  // Network errors during import
  if (error.name === 'TypeError' && message.includes('failed to fetch')) return true;

  return false;
}

export class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  state: ChunkErrorBoundaryState = {
    hasError: false,
    isReloading: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ChunkErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[ChunkErrorBoundary] Caught error:', error.name, error.message);

    if (isChunkLoadError(error)) {
      this.handleChunkError();
    }
  }

  handleChunkError = () => {
    const RELOAD_KEY = SESSION_KEYS.CHUNK_RELOAD;
    const lastReload = sessionStorage.getItem(RELOAD_KEY);
    const now = Date.now();

    // Prevent reload loop - only allow one reload per 10 seconds
    if (lastReload && (now - parseInt(lastReload, 10)) < 10000) {
      console.warn('[ChunkErrorBoundary] Reload loop detected, showing manual retry');
      return;
    }

    this.setState({ isReloading: true });
    sessionStorage.setItem(RELOAD_KEY, now.toString());

    // Clear caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }

    // Clear version storage to force re-fetch
    localStorage.removeItem(STORAGE_KEYS.APP_VERSION);

    // Reload with cache bust
    const url = window.location.pathname + '?_refresh=' + now;
    window.location.replace(url);
  };

  handleManualReload = () => {
    sessionStorage.removeItem(SESSION_KEYS.CHUNK_RELOAD);
    this.handleChunkError();
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isReloading) {
        return (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            bgcolor: 'background.default',
            color: 'text.primary',
            gap: 2,
          }}>
            <CircularProgress aria-label="Cargando" sx={{ color: 'primary.main' }} />
            <Typography>Actualizando aplicación...</Typography>
          </Box>
        );
      }

      const isChunk = this.state.error ? isChunkLoadError(this.state.error) : false;

      return (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary',
          gap: 3,
          p: 3,
          textAlign: 'center',
        }}>
          <Typography variant="h5">
            {isChunk ? 'Nueva versión disponible' : 'Algo salió mal'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 400 }}>
            {isChunk
              ? 'Hay una actualización disponible. Por favor recarga la página.'
              : 'Ocurrió un error inesperado. Puedes intentar recargar la página o volver al inicio.'}
          </Typography>
          {!isChunk && this.state.error && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                maxWidth: 400,
                p: 1.5,
                borderRadius: 1,
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                fontFamily: 'monospace',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                window.location.href = '/';
              }}
              sx={{
                textTransform: 'none',
                borderColor: emeraldCore.primary,
                color: emeraldCore.primary,
              }}
            >
              Ir al inicio
            </Button>
            <Button
              variant="contained"
              onClick={this.handleManualReload}
              sx={{
                textTransform: 'none',
                bgcolor: emeraldCore.primary,
                '&:hover': { bgcolor: emeraldCore.dark },
              }}
            >
              Recargar página
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;
