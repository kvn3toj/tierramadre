/**
 * InvitationPage
 *
 * Handles invitation link validation and grants temporary guest access.
 * Includes a guest contact form (name + email/phone) before granting access.
 * Fixed 24-hour duration with configurable pricing mode.
 *
 * Route: /invite/:shortCode (or /g/:shortCode via redirect)
 * NO JWT - Uses short codes validated against Google Sheets.
 */

import { useEffect, useState } from 'react';
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
  Timer,
  Explore,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useInvitation } from '../hooks/useInvitation';
import { useAuth } from '../hooks/useAuth';
import { brand, typography } from '../design-system';
import { INVITATION_STORAGE_KEYS } from '../types/invitation';
import type { ContactType, PricingMode } from '../types/invitation';

export default function InvitationPage() {
  // Short code from URL (e.g., ABC123)
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // If redirected from a product link with ?invite=, return there after access
  const redirectTo = searchParams.get('redirect');
  const { validateInvitation, registerGuest, isValidating, isRegistering } = useInvitation();
  const { loginAsGuest } = useAuth();

  const [status, setStatus] = useState<'loading' | 'form' | 'valid' | 'expired' | 'error'>('loading');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [pricingMode, setPricingMode] = useState<PricingMode>('with_prices');
  const [invitationId, setInvitationId] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>('');
  const [creatorEmail, setCreatorEmail] = useState<string>('');
  const [inviterWhatsApp, setInviterWhatsApp] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentShortCode, setCurrentShortCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  // Guest form state
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [contactType, setContactType] = useState<ContactType>('email');
  const [formError, setFormError] = useState<string>('');

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
        setTimeRemaining(result.timeRemainingMinutes || (24 * 60));
        setPricingMode(result.pricingMode || 'with_prices');
        setCreatedBy(result.createdBy || '');
        setCreatorEmail(result.creatorEmail || '');
        setInvitationId(result.invitationId || '');
        setCurrentShortCode(result.shortCode || shortCode);
        setExpiresAt(result.expiresAt || '');

        // Fetch inviter's WhatsApp from asesores if we have their email
        if (result.creatorEmail) {
          try {
            const asesoresResponse = await fetch('/api/get-asesores');
            const asesoresData = await asesoresResponse.json();
            if (asesoresData.success && asesoresData.asesores) {
              // Find asesor by name (more reliable than email since email might not match)
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

        // Show the guest registration form
        setStatus('form');
      } else if (result.status === 'expired') {
        setStatus('expired');
        setErrorMessage('Esta invitacion ha expirado');
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Invitacion no valida');
      }
    };

    validate();
  }, [shortCode, validateInvitation]);

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

    // Grant guest access
    loginAsGuest();

    // Store invitation data in sessionStorage (fixed 24-hour duration)
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.EXPIRES, expiresAt);
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.TOKEN, currentShortCode);
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.PRICING_MODE, pricingMode);
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.DURATION_HOURS, '24');
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.INVITATION_ID, invitationId);

    // Store inviter data for WhatsApp contact functionality
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.INVITER_NAME, createdBy);
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.INVITER_EMAIL, creatorEmail);
    if (inviterWhatsApp) {
      sessionStorage.setItem(INVITATION_STORAGE_KEYS.INVITER_WHATSAPP, inviterWhatsApp);
    }

    // Store guest contact for duplicate invitation check
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.GUEST_NAME, guestName.trim());
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.GUEST_CONTACT, guestContact.trim());

    // Clear any stale filter data from previous sessions
    // This ensures guests start with clean filters
    sessionStorage.removeItem('treasure-filters');

    // Update status to show welcome screen
    setStatus('valid');
  };

  const handleExplore = () => {
    // If redirected from a product link, go there; otherwise explore treasure
    navigate(redirectTo || '/treasure', { replace: true });
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

  // Guest registration form
  if (status === 'form') {
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
              Teléfono
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            fullWidth
            label={contactType === 'email' ? 'Tu email' : 'Tu teléfono'}
            type={contactType === 'email' ? 'email' : 'tel'}
            value={guestContact}
            onChange={(e) => setGuestContact(e.target.value)}
            placeholder={contactType === 'email' ? 'ejemplo@email.com' : '+57 300 123 4567'}
            required
            sx={{ mb: 3 }}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              mb: 3,
              p: 1.5,
              bgcolor: 'background.paper',
              borderRadius: 2,
            }}
          >
            <Timer sx={{ color: brand.gold[600], fontSize: 20 }} />
            <Typography variant="body2">
              Tendrás {timeRemaining} minutos para explorar
            </Typography>
          </Box>

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
            {isRegistering ? 'Registrando...' : 'Explorar Colección'}
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
          Explorar Colección
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
