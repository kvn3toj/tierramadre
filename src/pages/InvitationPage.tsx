/**
 * InvitationPage
 *
 * Handles invitation link validation and grants temporary guest access.
 * Requires PIN verification + IP binding before granting access.
 * Includes a guest contact form (name + email/phone) for unregistered guests.
 * Fixed 24-hour duration with configurable pricing mode.
 *
 * Route: /invite/:shortCode (or /g/:shortCode via redirect)
 * NO JWT - Uses short codes validated against Google Sheets.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Alert,
  Paper,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Explore,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import { useInvitation } from '../hooks/useInvitation';
import { useAuth } from '../hooks/useAuth';
import { brand, typography } from '../design-system';
import { INVITATION_STORAGE_KEYS } from '../types/invitation';
import type { ContactType, PricingMode } from '../types/invitation';

type PageStatus = 'loading' | 'pin' | 'form' | 'valid' | 'expired' | 'error' | 'ip-blocked';

const MAX_PIN_ATTEMPTS = 5;

export default function InvitationPage() {
  // Short code from URL (e.g., ABC123)
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // If redirected from a product link with ?invite=, return there after access
  const redirectTo = searchParams.get('redirect');
  const { validateInvitation, verifyPin, registerGuest, isValidating, isVerifyingPin, isRegistering } = useInvitation();
  const { loginAsGuest } = useAuth();

  const [status, setStatus] = useState<PageStatus>('loading');
  const [pricingMode, setPricingMode] = useState<PricingMode>('with_prices');
  const [invitationId, setInvitationId] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>('');
  const [creatorEmail, setCreatorEmail] = useState<string>('');
  const [inviterWhatsApp, setInviterWhatsApp] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentShortCode, setCurrentShortCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  // PIN state
  const [pinValue, setPinValue] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinError, setPinError] = useState<string>('');
  // Track guest name from validation (pre-registered) vs form
  const [preRegisteredGuestName, setPreRegisteredGuestName] = useState<string>('');
  const [preRegisteredGuestContact, setPreRegisteredGuestContact] = useState<string>('');

  // Guest form state
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [contactType, setContactType] = useState<ContactType>('email');
  const [formError, setFormError] = useState<string>('');

  // Ref to track PIN input
  const pinInputRef = useRef<HTMLInputElement>(null);

  /**
   * Consolidated grant access helper — writes session/local storage and sets valid status
   */
  const grantAccess = useCallback((overrides?: { guestName?: string; guestContact?: string }) => {
    loginAsGuest();

    const resolvedGuestName = overrides?.guestName || guestName.trim() || preRegisteredGuestName;
    const resolvedGuestContact = overrides?.guestContact || guestContact.trim() || preRegisteredGuestContact;

    const invitationData: Record<string, string> = {
      [INVITATION_STORAGE_KEYS.EXPIRES]: expiresAt,
      [INVITATION_STORAGE_KEYS.TOKEN]: currentShortCode,
      [INVITATION_STORAGE_KEYS.PRICING_MODE]: pricingMode,
      [INVITATION_STORAGE_KEYS.DURATION_HOURS]: '24',
      [INVITATION_STORAGE_KEYS.INVITATION_ID]: invitationId,
      [INVITATION_STORAGE_KEYS.INVITER_NAME]: createdBy,
      [INVITATION_STORAGE_KEYS.INVITER_EMAIL]: creatorEmail,
      [INVITATION_STORAGE_KEYS.GUEST_NAME]: resolvedGuestName,
      [INVITATION_STORAGE_KEYS.GUEST_CONTACT]: resolvedGuestContact,
      [INVITATION_STORAGE_KEYS.PIN_VERIFIED]: 'true',
    };
    if (inviterWhatsApp) {
      invitationData[INVITATION_STORAGE_KEYS.INVITER_WHATSAPP] = inviterWhatsApp;
    }

    for (const [key, value] of Object.entries(invitationData)) {
      sessionStorage.setItem(key, value);
    }
    localStorage.setItem('tm_guest_invitation', JSON.stringify(invitationData));
    sessionStorage.removeItem('treasure-filters');

    setStatus('valid');
  }, [loginAsGuest, guestName, guestContact, preRegisteredGuestName, preRegisteredGuestContact, expiresAt, currentShortCode, pricingMode, invitationId, createdBy, creatorEmail, inviterWhatsApp]);

  useEffect(() => {
    if (!shortCode) {
      setStatus('error');
      setErrorMessage('Enlace de invitacion invalido');
      return;
    }

    const validate = async () => {
      // Validate using short code (Google Sheets lookup)
      const result = await validateInvitation(shortCode);

      if (result.isValid) {
        // Store invitation info (fixed 24-hour duration)
        const resolvedPricingMode = result.pricingMode || 'with_prices';
        const resolvedCreatedBy = result.createdBy || '';
        const resolvedCreatorEmail = result.creatorEmail || '';
        const resolvedInvitationId = result.invitationId || '';
        const resolvedShortCode = result.shortCode || shortCode;
        const resolvedExpiresAt = result.expiresAt || '';

        setPricingMode(resolvedPricingMode);
        setCreatedBy(resolvedCreatedBy);
        setCreatorEmail(resolvedCreatorEmail);
        setInvitationId(resolvedInvitationId);
        setCurrentShortCode(resolvedShortCode);
        setExpiresAt(resolvedExpiresAt);

        // Track pre-registered guest info
        if (result.guestName) {
          setPreRegisteredGuestName(result.guestName);
          setPreRegisteredGuestContact(result.guestContact || '');
        }

        // Fetch inviter's WhatsApp from asesores if we have their email
        if (result.creatorEmail) {
          try {
            const asesoresResponse = await fetch('/api/get-asesores');
            const asesoresData = await asesoresResponse.json();
            if (asesoresData.success && asesoresData.asesores) {
              const inviter = asesoresData.asesores.find(
                (a: { name: string; email?: string }) =>
                  a.name.toLowerCase().includes((result.createdBy || '').toLowerCase()) ||
                  (a.email && a.email.toLowerCase() === result.creatorEmail?.toLowerCase())
              );
              if (inviter?.whatsapp) {
                setInviterWhatsApp(inviter.whatsapp);
              }
            }
          } catch (error) {
            console.warn('Could not fetch inviter WhatsApp:', error);
          }
        }

        // If IP is already bound AND we have PIN_VERIFIED in sessionStorage (tab refresh),
        // skip PIN screen entirely
        if (result.isPinBound && sessionStorage.getItem(INVITATION_STORAGE_KEYS.PIN_VERIFIED)) {
          // Already verified on this device — grant access directly
          // Use setTimeout to let state settle before grantAccess reads them
          // We set state above but grantAccess uses the callback closure values,
          // so we need to handle it differently for this path
          loginAsGuest();

          const invitationData: Record<string, string> = {
            [INVITATION_STORAGE_KEYS.EXPIRES]: resolvedExpiresAt,
            [INVITATION_STORAGE_KEYS.TOKEN]: resolvedShortCode,
            [INVITATION_STORAGE_KEYS.PRICING_MODE]: resolvedPricingMode,
            [INVITATION_STORAGE_KEYS.DURATION_HOURS]: '24',
            [INVITATION_STORAGE_KEYS.INVITATION_ID]: resolvedInvitationId,
            [INVITATION_STORAGE_KEYS.INVITER_NAME]: resolvedCreatedBy,
            [INVITATION_STORAGE_KEYS.INVITER_EMAIL]: resolvedCreatorEmail,
            [INVITATION_STORAGE_KEYS.GUEST_NAME]: result.guestName || '',
            [INVITATION_STORAGE_KEYS.GUEST_CONTACT]: result.guestContact || '',
            [INVITATION_STORAGE_KEYS.PIN_VERIFIED]: 'true',
          };

          for (const [key, value] of Object.entries(invitationData)) {
            sessionStorage.setItem(key, value);
          }
          localStorage.setItem('tm_guest_invitation', JSON.stringify(invitationData));
          sessionStorage.removeItem('treasure-filters');

          setStatus('valid');
          return;
        }

        // Always require PIN verification
        setStatus('pin');
      } else if (result.status === 'expired') {
        setStatus('expired');
        setErrorMessage('Esta invitacion ha expirado');
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Invitacion no valida');
      }
    };

    validate();
  }, [shortCode, validateInvitation, loginAsGuest]);

  const handlePinSubmit = async () => {
    if (!shortCode || !pinValue || pinValue.length !== 4) {
      setPinError('Ingresa un PIN de 4 digitos');
      return;
    }

    if (pinAttempts >= MAX_PIN_ATTEMPTS) {
      setPinError('Demasiados intentos. Solicita una nueva invitacion.');
      return;
    }

    setPinError('');
    const result = await verifyPin(shortCode, pinValue);

    if (result.pinVerified) {
      // PIN correct + IP OK
      if (result.guestName || preRegisteredGuestName) {
        // Pre-registered guest — skip form, grant access
        grantAccess({
          guestName: result.guestName || preRegisteredGuestName,
          guestContact: result.guestContact || preRegisteredGuestContact,
        });
      } else {
        // No guest info yet — show registration form
        setStatus('form');
      }
    } else if (result.isIpBlocked) {
      setStatus('ip-blocked');
    } else if (result.isPinWrong) {
      const newAttempts = pinAttempts + 1;
      setPinAttempts(newAttempts);
      setPinValue('');
      if (newAttempts >= MAX_PIN_ATTEMPTS) {
        setPinError('Demasiados intentos. Solicita una nueva invitacion.');
      } else {
        setPinError(`PIN incorrecto. ${MAX_PIN_ATTEMPTS - newAttempts} intentos restantes.`);
      }
      pinInputRef.current?.focus();
    } else {
      setPinError(result.error || 'Error al verificar PIN');
    }
  };

  const validateForm = (): boolean => {
    if (!guestName.trim()) {
      setFormError('Por favor ingresa tu nombre');
      return false;
    }

    if (!guestContact.trim()) {
      setFormError(`Por favor ingresa tu ${contactType === 'email' ? 'email' : 'telefono'}`);
      return false;
    }

    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestContact)) {
        setFormError('Por favor ingresa un email valido');
        return false;
      }
    }

    if (contactType === 'phone') {
      const phoneRegex = /^[\d\s\-+()]{7,20}$/;
      if (!phoneRegex.test(guestContact)) {
        setFormError('Por favor ingresa un telefono valido');
        return false;
      }
    }

    setFormError('');
    return true;
  };

  const handleGuestSubmit = async () => {
    if (!validateForm()) return;

    // Register guest info in Google Sheets
    if (invitationId) {
      const success = await registerGuest({
        invitationId,
        guestName: guestName.trim(),
        guestContact: guestContact.trim(),
        contactType,
      });

      if (!success) {
        // Continue anyway - registration is for tracking, not blocking
        console.warn('Guest registration failed, continuing...');
      }
    }

    grantAccess();
  };

  const handleExplore = () => {
    // If redirected from a product link, go there; otherwise explore treasure
    navigate(redirectTo || '/treasure', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/home');
  };

  // --- RENDER ---

  // Centered page wrapper
  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
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
      {children}
    </Box>
  );

  if (status === 'loading' || isValidating) {
    return (
      <PageWrapper>
        <CircularProgress sx={{ color: brand.emerald[600], mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Validando invitacion...
        </Typography>
      </PageWrapper>
    );
  }

  if (status === 'expired' || status === 'error') {
    return (
      <PageWrapper>
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
      </PageWrapper>
    );
  }

  // IP blocked screen
  if (status === 'ip-blocked') {
    return (
      <PageWrapper>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            maxWidth: 400,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'error.light',
          }}
        >
          <BlockIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={typography.weight.bold} gutterBottom>
            Acceso Restringido
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Esta invitacion esta vinculada a otro dispositivo o red.
            Solo puede usarse desde el dispositivo donde se verifico por primera vez.
          </Typography>
          <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
            Si necesitas acceso, solicita una nueva invitacion a tu embajador.
          </Alert>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            fullWidth
          >
            Ir al Inicio
          </Button>
        </Paper>
      </PageWrapper>
    );
  }

  // PIN entry screen
  if (status === 'pin') {
    const isLockedOut = pinAttempts >= MAX_PIN_ATTEMPTS;

    return (
      <PageWrapper>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid',
            borderColor: brand.emerald[200],
            bgcolor: `${brand.emerald[50]}50`,
          }}
        >
          <LockIcon sx={{ fontSize: 48, color: brand.emerald[600], mb: 1 }} />
          <Typography variant="h5" fontWeight={typography.weight.bold} gutterBottom>
            Ingresa tu PIN
          </Typography>
          {createdBy && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Invitado por {createdBy}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Ingresa el PIN de 4 digitos que te compartio tu embajador.
          </Typography>

          {pinError && (
            <Alert severity={isLockedOut ? 'error' : 'warning'} sx={{ mb: 2, textAlign: 'left' }}>
              {pinError}
            </Alert>
          )}

          <TextField
            fullWidth
            value={pinValue}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPinValue(val);
            }}
            inputRef={pinInputRef}
            placeholder="0000"
            disabled={isLockedOut}
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 4,
              style: {
                textAlign: 'center',
                fontSize: '2rem',
                fontFamily: 'monospace',
                letterSpacing: '0.5em',
                fontWeight: 700,
              },
              autoComplete: 'one-time-code',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pinValue.length === 4 && !isLockedOut) {
                handlePinSubmit();
              }
            }}
            sx={{ mb: 3 }}
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={pinValue.length !== 4 || isVerifyingPin || isLockedOut}
            onClick={handlePinSubmit}
            startIcon={isVerifyingPin ? <CircularProgress size={20} /> : <LockIcon />}
            sx={{
              bgcolor: brand.emerald[600],
              '&:hover': { bgcolor: brand.emerald[700] },
            }}
          >
            {isVerifyingPin ? 'Verificando...' : 'Confirmar PIN'}
          </Button>
        </Paper>
      </PageWrapper>
    );
  }

  // Guest registration form
  if (status === 'form') {
    return (
      <PageWrapper>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            maxWidth: 400,
            width: '100%',
            borderRadius: 3,
            border: '1px solid',
            borderColor: brand.emerald[200],
            bgcolor: `${brand.emerald[50]}50`,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <CheckCircle sx={{ fontSize: 48, color: brand.emerald[600], mb: 1 }} />
            <Typography variant="h5" fontWeight={typography.weight.bold} gutterBottom>
              Bienvenido a Tierra Madre
            </Typography>
            {createdBy && (
              <Typography variant="body2" color="text.secondary">
                Invitado por {createdBy}
              </Typography>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Para explorar nuestra coleccion, por favor dejanos tus datos de contacto.
          </Typography>

          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Tu nombre"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
            sx={{ mb: 2 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Forma de contacto preferida
          </Typography>

          <ToggleButtonGroup
            exclusive
            value={contactType}
            onChange={(_, value) => value && setContactType(value)}
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="email" sx={{ flex: 1 }}>
              <EmailIcon sx={{ mr: 1 }} fontSize="small" />
              Email
            </ToggleButton>
            <ToggleButton value="phone" sx={{ flex: 1 }}>
              <PhoneIcon sx={{ mr: 1 }} fontSize="small" />
              Telefono
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            fullWidth
            label={contactType === 'email' ? 'Tu email' : 'Tu telefono'}
            type={contactType === 'email' ? 'email' : 'tel'}
            value={guestContact}
            onChange={(e) => setGuestContact(e.target.value)}
            placeholder={contactType === 'email' ? 'ejemplo@email.com' : '+57 300 123 4567'}
            required
            sx={{ mb: 3 }}
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={isRegistering}
            onClick={handleGuestSubmit}
            startIcon={isRegistering ? <CircularProgress size={20} /> : <Explore />}
            sx={{
              bgcolor: brand.emerald[600],
              '&:hover': { bgcolor: brand.emerald[700] },
            }}
          >
            {isRegistering ? 'Registrando...' : 'Explorar Coleccion'}
          </Button>
        </Paper>
      </PageWrapper>
    );
  }

  // Valid invitation — welcome screen
  return (
    <PageWrapper>
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

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Tienes acceso para explorar nuestra coleccion exclusiva de esmeraldas colombianas.
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
    </PageWrapper>
  );
}
