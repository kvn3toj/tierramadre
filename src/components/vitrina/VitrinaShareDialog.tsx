/**
 * VitrinaShareDialog — staff picks the client-facing pricing, then mints a
 * public share link.
 *
 * Staff choose currency (COP/USD) and a markup multiplier (x1–x4); we create a
 * Convex `vitrinas` token storing {itemIds, currency, multiplier, senderSlug}
 * and hand back a short `/v/<token>` link. The multiplier is stored server-side
 * (not in the URL), so the recipient can neither see nor change the markup.
 *
 * Pricing controls mirror InvitationGenerator; default multiplier is x1
 * (standard retail) per product decision.
 *
 * Google credential renewal: the GIS credential stored at sign-in lives ~1h,
 * but the app session (validated user) outlives it by days — so a staff member
 * who signed in this morning is "logged in" with a dead ID token, and the mint
 * would 401 forever. We check `exp` client-side and, when stale, first try a
 * *silent* renewal (Google One Tap, auto-selecting the existing session — no
 * click required) via `SilentGoogleRenew` below. Only if that's skipped,
 * dismissed, or errors do we fall back to the visible inline GoogleLogin
 * button. `SilentGoogleRenew` mounts its own `GoogleOAuthProvider` (loading
 * the GIS script) only for the few seconds of the renewal attempt, so we
 * don't pay that cost for the common case of a staff member with a fresh
 * token — mirrors the same per-component provider pattern already used in
 * `UserProfileCard`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleLogin,
  GoogleOAuthProvider,
  useGoogleOneTapLogin,
  CredentialResponse,
} from '@react-oauth/google';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from '@mui/material';
import { Check, Copy, Link2, MessageCircle, Pencil, X } from 'lucide-react';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { useTRM } from '../../hooks/useTRM';
import { VitrinaCurrency, formatVitrinaPrice } from '../../utils/vitrinaPrice';
import { brand, fontWeights } from '../../design-system';
import { readFreshAuthToken } from '../../utils/sessionToken';

const STUDIO_BASE_URL = 'https://tierramadre.app';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// A bare item-number list (e.g. "193-192-194") — the stateless Vitrina form.
// Those links have no Convex record, so they can never be edited in place;
// only stateful tokens (e.g. "AB3K9P2Q4R7S") can be corrected via PATCH.
const ID_LIST_RE = /^\d+([-,]\d+)*$/;

/** Pull the token out of a pasted `/v/<code>` URL, or accept a bare code. */
function extractToken(raw: string): string {
  const trimmed = raw.trim();
  const afterSlash = trimmed.split('/v/')[1] ?? trimmed;
  return afterSlash.split(/[/?#]/)[0].trim().toUpperCase();
}

// Google ID token when fresh, else the 30-day app session token (see
// utils/sessionToken.ts) — /api/vitrina accepts both, so the renewal
// fallbacks below only trigger when the user hasn't signed in for a month.
const readFreshIdToken = readFreshAuthToken;

// Silent One Tap renewal (auto_select) is reliably blocked on iOS and in
// Safari — after Google's One Tap cooldown it never displays, so the silent
// attempt just burns its 4s timeout before dead-ending at the visible prompt.
// On these browsers we skip the doomed silent step and show the visible
// re-login button immediately. Detects iOS (any browser) and desktop Safari.
const isIOSSafari =
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent));

/** One silent One Tap attempt: reports exactly once (credential or give-up),
 *  then the parent unmounts it. A timeout guards browsers that never fire
 *  `promptMomentNotification` (e.g. FedCM blocked) so we never hang. */
function SilentRenewAttempt({
  onCredential,
  onGiveUp,
}: {
  onCredential: (credential: string) => void;
  onGiveUp: () => void;
}) {
  const settledRef = useRef(false);
  const settle = (fn: () => void) => {
    if (settledRef.current) return;
    settledRef.current = true;
    fn();
  };

  useEffect(() => {
    const timeout = setTimeout(() => settle(onGiveUp), 4000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useGoogleOneTapLogin({
    onSuccess: (response: CredentialResponse) => {
      if (response.credential) settle(() => onCredential(response.credential!));
      else settle(onGiveUp);
    },
    onError: () => settle(onGiveUp),
    promptMomentNotification: (notification) => {
      if (
        notification.isSkippedMoment() ||
        notification.isDismissedMoment() ||
        notification.isNotDisplayed()
      ) {
        settle(onGiveUp);
      }
    },
    cancel_on_tap_outside: false,
    auto_select: true,
  });

  return null;
}

function SilentGoogleRenew(props: {
  onCredential: (credential: string) => void;
  onGiveUp: () => void;
}) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <SilentRenewAttempt {...props} />
    </GoogleOAuthProvider>
  );
}

interface ShareItem {
  item: number;
  precioCOP?: number;
  nombre?: string;
}

interface VitrinaShareDialogProps {
  open: boolean;
  onClose: () => void;
  items: ShareItem[];
  /** Asesor slug embedded so the client's "Consultar" reaches the sender. */
  senderSlug?: string;
}

export default function VitrinaShareDialog({
  open,
  onClose,
  items,
  senderSlug,
}: VitrinaShareDialogProps) {
  const { trmRate } = useTRM();
  const { signIn } = useGoogleAuth();

  const [currency, setCurrency] = useState<VitrinaCurrency>('COP');
  const [multiplier, setMultiplier] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRenew, setNeedsRenew] = useState(false);
  const [silentRenewing, setSilentRenewing] = useState(false);

  // Editing an already-shared link: staff paste the old token/URL and, on
  // submit, the items currently in `items` (e.g. the corrected cart) replace
  // its contents in place — same URL, fixed selection.
  const [editingExisting, setEditingExisting] = useState(false);
  const [editTokenInput, setEditTokenInput] = useState('');
  const [wasUpdate, setWasUpdate] = useState(false);

  // Live preview off the first priced item, or a 2M sample like the invite UI.
  const previewBaseCOP = useMemo(() => {
    const priced = items.find(
      (i) => typeof i.precioCOP === 'number' && i.precioCOP! > 0,
    );
    return priced?.precioCOP ?? 2_000_000;
  }, [items]);
  const previewLabel = formatVitrinaPrice(
    previewBaseCOP,
    { multiplier, currency },
    trmRate,
  );

  const reset = () => {
    setLink(null);
    setCopied(false);
    setError(null);
    setNeedsRenew(false);
    setSilentRenewing(false);
    setCurrency('COP');
    setMultiplier(1);
    setEditingExisting(false);
    setEditTokenInput('');
    setWasUpdate(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGenerate = async () => {
    if (items.length === 0) {
      setError('No hay piezas para compartir.');
      return;
    }
    if (editingExisting) {
      const token = extractToken(editTokenInput);
      if (!token) {
        setError('Pega el enlace o el código que enviaste al cliente.');
        return;
      }
      if (ID_LIST_RE.test(token)) {
        setError(
          'Ese es un enlace de productos fijos (sin código) y no se puede editar. Genera un enlace nuevo con las piezas correctas.',
        );
        return;
      }
    }
    // Mint/update via the authenticated proxy: it verifies the caller's
    // Google ID token server-side, then writes to Convex. A stale credential
    // guarantees a 401, so try a silent renewal first instead of firing a
    // doomed request.
    const idToken = readFreshIdToken();
    if (!idToken) {
      attemptSilentRenew();
      return;
    }
    await submitWithToken(idToken);
  };

  const submitWithToken = async (idToken: string) =>
    editingExisting ? updateWithToken(idToken) : mintWithToken(idToken);

  const mintWithToken = async (idToken: string) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/vitrina', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          itemIds: items.map((i) => i.item),
          currency,
          multiplier,
          senderSlug,
        }),
      });

      if (res.status === 401) {
        setGenerating(false);
        attemptSilentRenew();
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.token) {
        setError(
          data?.error ||
            'No se pudo generar el enlace. Verifica tu conexión e intenta de nuevo.',
        );
        return;
      }

      const url = `${STUDIO_BASE_URL}/v/${data.token}`;
      setLink(url);
      // Native share on mobile; otherwise the link is shown for manual copy.
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          await navigator.share({
            title: 'Tierra Mädre — Selección para ti',
            text: `Estas piezas son para ti 💚 (${items.length} ${items.length === 1 ? 'pieza' : 'piezas'})`,
            url,
          });
        } catch {
          /* user cancelled — link is shown for manual copy */
        }
      }
    } catch {
      setError(
        'No se pudo generar el enlace. Verifica tu conexión e intenta de nuevo.',
      );
    } finally {
      setGenerating(false);
    }
  };

  /** Correct an already-shared token link in place — same URL, new items. */
  const updateWithToken = async (idToken: string) => {
    const token = extractToken(editTokenInput);
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/vitrina', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          token,
          itemIds: items.map((i) => i.item),
          currency,
          multiplier,
          senderSlug,
        }),
      });

      if (res.status === 401) {
        setGenerating(false);
        attemptSilentRenew();
        return;
      }
      if (res.status === 404) {
        setError(
          'No encontramos ese enlace. Revisa que el código sea correcto (los enlaces de productos fijos, sin código, no se pueden editar).',
        );
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.token) {
        setError(
          data?.error ||
            'No se pudo actualizar el enlace. Verifica tu conexión e intenta de nuevo.',
        );
        return;
      }

      setWasUpdate(true);
      setLink(`${STUDIO_BASE_URL}/v/${data.token}`);
    } catch {
      setError(
        'No se pudo actualizar el enlace. Verifica tu conexión e intenta de nuevo.',
      );
    } finally {
      setGenerating(false);
    }
  };

  // Stale token: try a silent renewal (no click) before bothering the staff
  // member with a visible re-login prompt. On iOS/Safari silent One Tap is
  // blocked, so skip it and go straight to the visible button — no 4s dead-end.
  const attemptSilentRenew = () => {
    if (!GOOGLE_CLIENT_ID || isIOSSafari) {
      setSilentRenewing(false);
      setNeedsRenew(true);
      setError(
        'Tu inicio de sesión de Google necesita un toque para generar el enlace. Continúa con Google aquí abajo.',
      );
      return;
    }
    setNeedsRenew(false);
    setError(null);
    setSilentRenewing(true);
  };

  const handleSilentCredential = async (credential: string) => {
    setSilentRenewing(false);
    try {
      await signIn(credential);
      await submitWithToken(credential);
    } catch {
      setNeedsRenew(true);
      setError('No se pudo renovar la sesión. Intenta de nuevo.');
    }
  };

  const handleSilentGiveUp = () => {
    setSilentRenewing(false);
    setNeedsRenew(true);
    setError(
      'Tu inicio de sesión de Google necesita un toque para generar el enlace. Continúa con Google aquí abajo.',
    );
  };

  // Fresh credential in hand: re-run the full sign-in (re-stores the token,
  // re-validates the user) and immediately retry the mint.
  const handleRenewed = async (response: CredentialResponse) => {
    if (!response.credential) return;
    try {
      await signIn(response.credential);
      setNeedsRenew(false);
      setError(null);
      await handleGenerate();
    } catch {
      setError('No se pudo renovar la sesión. Intenta de nuevo.');
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('No se pudo copiar. Copia el enlace manualmente.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogContent sx={{ p: 3, position: 'relative' }}>
        <IconButton
          onClick={handleClose}
          aria-label="Cerrar"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'text.secondary',
          }}
        >
          <X size={20} />
        </IconButton>

        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: fontWeights.bold }}>
              Compartir con cliente
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              {items.length} {items.length === 1 ? 'pieza' : 'piezas'} · el
              cliente verá solo esta selección, sin iniciar sesión.
            </Typography>
          </Box>

          {!link ? (
            <>
              {/* Toggle: mint a new link vs. correct one already sent */}
              <Button
                size="small"
                onClick={() => {
                  setEditingExisting((v) => !v);
                  setError(null);
                }}
                startIcon={<Pencil size={14} />}
                sx={{
                  alignSelf: 'flex-start',
                  textTransform: 'none',
                  color: editingExisting
                    ? brand.emerald[700]
                    : 'text.secondary',
                  fontWeight: editingExisting
                    ? fontWeights.bold
                    : fontWeights.medium,
                  p: 0,
                  minWidth: 0,
                }}
              >
                {editingExisting
                  ? 'Generar un enlace nuevo en su lugar'
                  : '¿Corrigiendo un enlace ya enviado?'}
              </Button>

              {editingExisting && (
                <Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Enlace o código enviado al cliente"
                    placeholder="https://tierramadre.app/v/AB3K9P2Q4R7S"
                    value={editTokenInput}
                    onChange={(e) => setEditTokenInput(e.target.value)}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
                  >
                    Se actualizará ese mismo enlace con las {items.length}{' '}
                    {items.length === 1 ? 'pieza' : 'piezas'} de arriba. Solo
                    funciona con enlaces con código (no con enlaces de productos
                    fijos como /v/193-192-194).
                  </Typography>
                </Box>
              )}

              {/* Currency */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: fontWeights.medium,
                  }}
                >
                  Moneda
                </Typography>
                <ToggleButtonGroup
                  value={currency}
                  exclusive
                  size="small"
                  fullWidth
                  onChange={(_e, val) => {
                    if (val !== null) setCurrency(val as VitrinaCurrency);
                  }}
                  sx={{ mt: 0.75 }}
                >
                  <ToggleButton value="COP">COP</ToggleButton>
                  <ToggleButton value="USD">USD</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Multiplier */}
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: fontWeights.medium,
                    }}
                  >
                    Multiplicador
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: fontWeights.bold,
                      color: brand.emerald[700],
                    }}
                  >
                    x{multiplier.toFixed(1)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    mt: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                  >
                    x1
                  </Typography>
                  <Slider
                    value={multiplier}
                    onChange={(_e, val) => setMultiplier(val as number)}
                    min={1}
                    max={4}
                    step={0.1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `x${v}`}
                    aria-label="Multiplicador de precio"
                    sx={{
                      color: brand.emerald[700],
                      '& .MuiSlider-thumb': { width: 18, height: 18 },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary' }}
                  >
                    x4
                  </Typography>
                </Box>
              </Box>

              {/* Preview */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(brand.emerald[500], 0.08),
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  El cliente verá (ej.)
                </Typography>
                <Typography
                  sx={{
                    fontWeight: fontWeights.bold,
                    color: brand.emerald[700],
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  {previewLabel || '—'}
                </Typography>
              </Box>

              {error && (
                <Typography variant="caption" sx={{ color: 'error.main' }}>
                  {error}
                </Typography>
              )}

              {silentRenewing ? (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      py: 1.35,
                    }}
                  >
                    <CircularProgress size={18} />
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary' }}
                    >
                      Renovando sesión…
                    </Typography>
                  </Box>
                  <SilentGoogleRenew
                    onCredential={handleSilentCredential}
                    onGiveUp={handleSilentGiveUp}
                  />
                </>
              ) : needsRenew ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.5,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', textAlign: 'center' }}
                  >
                    Un toque para refrescar tu sesión y generamos el enlace al
                    instante.
                  </Typography>
                  <GoogleLogin
                    onSuccess={handleRenewed}
                    onError={() =>
                      setError(
                        'No se pudo renovar la sesión de Google. Intenta de nuevo.',
                      )
                    }
                    theme="filled_black"
                    shape="pill"
                    text="continue_with"
                    locale="es"
                  />
                </Box>
              ) : (
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={generating}
                  onClick={handleGenerate}
                  startIcon={
                    generating ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <Link2 size={18} />
                    )
                  }
                  sx={{
                    bgcolor: brand.emerald[600],
                    py: 1.35,
                    fontWeight: fontWeights.bold,
                    textTransform: 'none',
                    '&:hover': { bgcolor: brand.emerald[700] },
                  }}
                >
                  {generating
                    ? editingExisting
                      ? 'Actualizando…'
                      : 'Generando…'
                    : editingExisting
                      ? 'Actualizar enlace'
                      : 'Generar enlace'}
                </Button>
              )}
            </>
          ) : (
            <>
              {/* Success — the link */}
              {wasUpdate && (
                <Typography
                  variant="body2"
                  sx={{
                    color: brand.emerald[700],
                    fontWeight: fontWeights.medium,
                  }}
                >
                  Enlace actualizado — el mismo link ahora muestra la selección
                  corregida.
                </Typography>
              )}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  wordBreak: 'break-all',
                }}
              >
                <Typography
                  sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                >
                  {link}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={copied ? <Check size={18} /> : <Copy size={18} />}
                  onClick={handleCopy}
                  sx={{
                    textTransform: 'none',
                    borderColor: brand.emerald[500],
                    color: brand.emerald[700],
                  }}
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<MessageCircle size={18} />}
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(link)}`,
                      '_blank',
                    )
                  }
                  sx={{
                    textTransform: 'none',
                    bgcolor: brand.emerald[600],
                    color: '#fff',
                    '&:hover': { bgcolor: brand.emerald[700] },
                  }}
                >
                  WhatsApp
                </Button>
              </Stack>
              {error && (
                <Typography variant="caption" sx={{ color: 'error.main' }}>
                  {error}
                </Typography>
              )}
              <Button
                variant="text"
                size="small"
                onClick={reset}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                {wasUpdate ? 'Editar otro enlace' : 'Generar otro enlace'}
              </Button>
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
