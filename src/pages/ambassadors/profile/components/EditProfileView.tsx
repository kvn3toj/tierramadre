/**
 * EditProfileView Component
 * Form to edit ambassador profile: name, bio, specialty, social links.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Avatar,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { TextField } from '../../../../design-system';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import {} from '../../../../design-system';
import type { Asesor } from '../../../../hooks/useAsesores';
import {
  HANDLE_REJECTION_MESSAGES,
  normalizeHandle,
  recommendHandle,
  validateHandle,
} from '../../../../utils/ambassadorHandle';

/** Bare host the vanity handle hangs off, shown in the field preview. */
const HANDLE_DOMAIN = 'tierramadre.app';

interface EditProfileViewProps {
  asesor: Asesor;
  photoUrl?: string;
  isUploadingPhoto?: boolean;
  /** Current vanity handle, or undefined while it is still loading. */
  handle?: string;
  onPhotoEdit: () => void;
  onBack: () => void;
  onSave: (data: {
    especialidad?: string;
    whatsapp?: string;
    handle?: string;
  }) => Promise<void>;
}

export function EditProfileView({
  asesor,
  photoUrl,
  isUploadingPhoto,
  handle,
  onPhotoEdit,
  onBack,
  onSave,
}: EditProfileViewProps) {
  const { t } = useLanguage();
  const { notify } = useNotification();

  const [especialidad, setEspecialidad] = useState(asesor.especialidad || '');
  const [whatsapp, setWhatsapp] = useState(asesor.whatsapp || '');
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill with the saved handle, or recommend one from the display name
  // ("Andres Mauricio Escobar Ramirez" → "andres") so the field is never a
  // blank box the ambassador has to invent an answer for.
  const recommended = useMemo(
    () => recommendHandle(asesor.name),
    [asesor.name],
  );
  const [handleDraft, setHandleDraft] = useState(handle ?? recommended);
  const [handleTouched, setHandleTouched] = useState(false);

  // The saved handle is fetched after mount, so the initializer above may
  // have run with `undefined`. Adopt it when it lands — but never over
  // something the ambassador has already typed.
  useEffect(() => {
    if (handle && !handleTouched) setHandleDraft(handle);
  }, [handle, handleTouched]);

  // Only surface an error once they have typed something — an empty field
  // on first paint should read as optional, not as a mistake.
  const handleError = useMemo(() => {
    if (!handleDraft) return null;
    const result = validateHandle(handleDraft);
    return result.valid ? null : HANDLE_REJECTION_MESSAGES[result.reason];
  }, [handleDraft]);

  const handleSave = async () => {
    if (handleError) {
      notify(handleError, 'error');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        especialidad,
        whatsapp,
        // Omit rather than send empty: an absent handle means "leave it
        // alone", which keeps this form from clearing a handle set elsewhere.
        ...(handleDraft ? { handle: handleDraft } : {}),
      });
      notify(t.common.success, 'success');
      onBack();
    } catch (err) {
      // The handle store answers 409 with a human message when the name is
      // taken; show it instead of the generic failure copy.
      const message = err instanceof Error ? err.message : '';
      notify(message || t.ambassador.profile.saveError, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton
          onClick={onBack}
          aria-label={t.actions.back}
          sx={{
            bgcolor: 'var(--tm-well)',
            border: '1px solid var(--tm-border)',
            color: 'var(--tm-text)',
            width: 44,
            height: 44,
          }}
        >
          <ArrowLeft size={18} />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          {t.ambassador.museum?.editProfile ?? 'Editar Perfil'}
        </Typography>
      </Box>

      {/* Avatar with edit overlay */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar
            src={photoUrl || asesor.photoUrl}
            sx={{
              width: 96,
              height: 96,
              bgcolor: 'var(--tm-accent-strong)',
              color: 'var(--tm-on-accent)',
              fontSize: '2.5rem',
              fontWeight: 700,
              opacity: isUploadingPhoto ? 0.6 : 1,
              transition: 'opacity var(--tm-base) var(--tm-ease)',
            }}
          >
            {asesor.name.charAt(0).toUpperCase()}
          </Avatar>
          {isUploadingPhoto && (
            <CircularProgress
              size={28}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                mt: '-14px',
                ml: '-14px',
                color: 'var(--tm-accent)',
              }}
            />
          )}
          <IconButton
            onClick={onPhotoEdit}
            disabled={isUploadingPhoto}
            size="small"
            aria-label="Cambiar foto"
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 44,
              height: 44,
              bgcolor: 'var(--tm-accent-strong)',
              color: 'var(--tm-on-accent)',
              border: '2px solid',
              borderColor: 'var(--tm-surface)',
              '&:hover': { bgcolor: 'var(--tm-accent)' },
            }}
          >
            <Camera size={16} />
          </IconButton>
        </Box>
      </Box>

      {/* Form */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField label="Nombre" value={asesor.name} disabled fullWidth />

        <TextField
          label="Especialidad / Bio"
          value={especialidad}
          onChange={(e) => setEspecialidad(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          placeholder="Esmeraldas colombianas de alta calidad..."
        />

        <TextField
          label="WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          fullWidth
          placeholder="+57 300 123 4567"
        />

        <Box>
          <TextField
            label="Tu enlace personal"
            value={handleDraft}
            onChange={(e) => {
              setHandleTouched(true);
              // Normalize as they type so the preview below is always the
              // real URL, never something that would be silently rewritten
              // on save.
              setHandleDraft(normalizeHandle(e.target.value));
            }}
            fullWidth
            error={Boolean(handleError)}
            placeholder={recommended}
            inputProps={{
              autoCapitalize: 'none',
              autoCorrect: 'off',
              spellCheck: false,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.75,
              px: 0.5,
              color: handleError ? 'var(--tm-danger)' : 'var(--tm-text-muted)',
            }}
          >
            {handleError ??
              `${handleDraft || recommended}.${HANDLE_DOMAIN} lleva a tu perfil`}
          </Typography>
        </Box>

        <TextField
          label="Email"
          value={asesor.email || ''}
          disabled
          fullWidth
        />

        <Button
          variant="contained"
          fullWidth
          startIcon={
            isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Save size={18} />
            )
          }
          onClick={handleSave}
          disabled={isSaving}
          sx={{
            bgcolor: 'var(--tm-accent-strong)',
            color: 'var(--tm-on-accent)',
            '&:hover': { bgcolor: 'var(--tm-accent)' },
            textTransform: 'none',
            fontWeight: 600,
            py: 1.25,
            borderRadius: 'var(--tm-radius-control)',
            mt: 1,
          }}
        >
          {isSaving
            ? t.actions.saving || 'Guardando...'
            : (t.ambassador.museum?.save ?? 'Guardar')}
        </Button>
      </Box>
    </Box>
  );
}

export default EditProfileView;
