/**
 * ChunkErrorBoundary
 *
 * Catches lazy-route / dynamic-import failures (e.g. new deploy while session open)
 * and auto-reloads once; pairs with `lazyWithRetry` in the shell. Network/API failures
 * from `fetchWithRetry` are surfaced via `fetchFailureBridge` + NotificationContext.
 */
import { Component, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  alpha,
} from '@mui/material';
import { STORAGE_KEYS, SESSION_KEYS } from '../../constants/storage-keys';
import { emeraldCore } from '../../design-system/tokens/colors';
import { isChunkLoadError } from '../../utils/chunkErrors';

/** How many automatic reloads to spend before showing the manual screen. */
const MAX_AUTO_RELOADS = 2;

interface ChunkErrorBoundaryProps {
  children: ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  isReloading: boolean;
  error: Error | null;
  /**
   * Whether a genuinely different build is live. `null` while unknown.
   * Decides the copy: a chunk can fail because the deploy moved (true) or
   * because the connection dropped (false) — the user needs to be told which.
   */
  newVersionLive: boolean | null;
}

/**
 * Is a different build actually live right now?
 *
 * The old code assumed every chunk failure meant a new deploy and said so. On a
 * phone the far more common cause is a dropped request, and telling someone to
 * reload for a "new version" that does not exist sends them round the loop
 * again. Comparing the running version against the deployed one costs one
 * request and makes the message true.
 */
async function isNewVersionLive(): Promise<boolean> {
  try {
    const running = (window as unknown as { __TM_VERSION__?: string })
      .__TM_VERSION__;
    if (!running) return false;
    const res = await fetch(`/version.json?cb=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const { version } = (await res.json()) as { version?: string };
    return Boolean(version) && version !== running;
  } catch {
    // If we cannot even reach version.json the network is the problem, which is
    // itself the answer: this is not a new deploy.
    return false;
  }
}

export class ChunkErrorBoundary extends Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  state: ChunkErrorBoundaryState = {
    hasError: false,
    isReloading: false,
    error: null,
    newVersionLive: null,
  };

  static getDerivedStateFromError(
    error: Error,
  ): Partial<ChunkErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(
      '[ChunkErrorBoundary] Caught error:',
      error.name,
      error.message,
    );

    if (isChunkLoadError(error)) {
      void this.handleChunkError();
    }
  }

  /**
   * Auto-recover by reloading, at most MAX_AUTO_RELOADS times.
   *
   * The old guard was a 10-second window: a second failure inside 10s went
   * straight to the dead-end screen. Since a reload plus a failing import takes
   * well under 10 seconds, the *first* retry always landed inside the window —
   * so in practice the app got one attempt and then gave up, and the manual
   * button restarted the same doomed cycle. A bounded counter spends a fixed
   * number of real attempts instead of racing a clock.
   */
  handleChunkError = async () => {
    const RELOAD_KEY = SESSION_KEYS.CHUNK_RELOAD;
    const attempts =
      parseInt(sessionStorage.getItem(RELOAD_KEY) ?? '0', 10) || 0;

    if (attempts >= MAX_AUTO_RELOADS) {
      console.warn(
        `[ChunkErrorBoundary] ${attempts} reloads already spent; showing manual retry`,
      );
      // Tell the user which failure this actually is before they act on it.
      void isNewVersionLive().then((newVersionLive) =>
        this.setState({ newVersionLive }),
      );
      return;
    }

    this.setState({ isReloading: true });
    sessionStorage.setItem(RELOAD_KEY, String(attempts + 1));

    // AWAIT the cache clear. Previously this fired and the reload happened on
    // the next line, so the deletes routinely lost the race and the reload
    // could be served the very assets we were trying to drop.
    if ('caches' in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      } catch {
        // A failed cache clear must not block recovery.
      }
    }

    localStorage.removeItem(STORAGE_KEYS.APP_VERSION);

    // Preserve search and hash. It used to reload `pathname` alone, which threw
    // away query state — including the vitrina token the catalog authenticates
    // with, turning a chunk error into a lost session.
    const { pathname, search, hash } = window.location;
    const params = new URLSearchParams(search);
    params.set('_refresh', String(Date.now()));
    window.location.replace(`${pathname}?${params.toString()}${hash}`);
  };

  /** Manual retry: spend one more attempt, deliberately, at the user's request. */
  handleManualReload = () => {
    sessionStorage.setItem(SESSION_KEYS.CHUNK_RELOAD, '0');
    void this.handleChunkError();
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isReloading) {
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100vh',
              bgcolor: 'background.default',
              color: 'text.primary',
              gap: 2,
            }}
          >
            <CircularProgress
              aria-label="Cargando"
              sx={{ color: 'primary.main' }}
            />
            <Typography>Actualizando aplicación...</Typography>
          </Box>
        );
      }

      const isChunk = this.state.error
        ? isChunkLoadError(this.state.error)
        : false;

      // A chunk failure has two very different causes and the user can only act
      // on one of them. `newVersionLive` is the probe result: true = the deploy
      // really moved, false = the request died and reloading again will not
      // help until the connection does, null = still checking.
      const title = !isChunk
        ? 'Algo salió mal'
        : this.state.newVersionLive
          ? 'Nueva versión disponible'
          : 'No pudimos cargar esta sección';

      const detail = !isChunk
        ? 'Ocurrió un error inesperado. Puedes intentar recargar la página o volver al inicio.'
        : this.state.newVersionLive
          ? 'Hay una actualización disponible. Por favor recarga la página.'
          : 'La conexión se interrumpió mientras cargábamos esta parte de la app. Revisa tu señal y vuelve a intentarlo.';

      return (
        <Box
          sx={{
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
          }}
        >
          <Typography variant="h5">{title}</Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', maxWidth: 400 }}
          >
            {detail}
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
