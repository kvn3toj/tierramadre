/**
 * EditProfileView Component
 * Form to edit ambassador profile: name, bio, specialty, social links.
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import {
  emeraldCore,
  blurValues,
  surfacesLight,
  surfacesDark,
  cssTransition,
} from '../../../../design-system';
import type { Asesor } from '../../../../hooks/useAsesores';

interface EditProfileViewProps {
  asesor: Asesor;
  photoUrl?: string;
  isUploadingPhoto?: boolean;
  onPhotoEdit: () => void;
  onBack: () => void;
  onSave: (data: { especialidad?: string; whatsapp?: string }) => Promise<void>;
}

export function EditProfileView({
  asesor,
  photoUrl,
  isUploadingPhoto,
  onPhotoEdit,
  onBack,
  onSave,
}: EditProfileViewProps) {
  const theme = useTheme();
  const { t } = useLanguage();
  const { notify } = useNotification();
  const isLight = theme.palette.mode === 'light';

  const [especialidad, setEspecialidad] = useState(asesor.especialidad || '');
  const [whatsapp, setWhatsapp] = useState(asesor.whatsapp || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ especialidad, whatsapp });
      notify(t.common.success, 'success');
      onBack();
    } catch {
      notify(t.ambassador.profile.saveError, 'error');
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
            bgcolor: isLight ? alpha('#000', 0.04) : alpha('#fff', 0.06),
            backdropFilter: `blur(${blurValues.md})`,
            width: 36,
            height: 36,
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
              bgcolor: emeraldCore.primary,
              fontSize: '2.5rem',
              fontWeight: 700,
              opacity: isUploadingPhoto ? 0.6 : 1,
              transition: cssTransition.default,
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
                color: emeraldCore.primary,
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
              width: 32,
              height: 32,
              bgcolor: emeraldCore.primary,
              color: '#fff',
              border: '2px solid',
              borderColor: isLight ? surfacesLight.surface.default : surfacesDark.background.secondary,
              '&:hover': { bgcolor: emeraldCore.dark },
            }}
          >
            <Camera size={16} />
          </IconButton>
        </Box>
      </Box>

      {/* Form */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          label="Nombre"
          value={asesor.name}
          disabled
          fullWidth
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        <TextField
          label="Especialidad / Bio"
          value={especialidad}
          onChange={(e) => setEspecialidad(e.target.value)}
          fullWidth
          size="small"
          multiline
          minRows={2}
          placeholder="Esmeraldas colombianas de alta calidad..."
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        <TextField
          label="WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          fullWidth
          size="small"
          placeholder="+57 300 123 4567"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        <TextField
          label="Email"
          value={asesor.email || ''}
          disabled
          fullWidth
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        <Button
          variant="contained"
          fullWidth
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <Save size={18} />}
          onClick={handleSave}
          disabled={isSaving}
          sx={{
            bgcolor: emeraldCore.primary,
            '&:hover': { bgcolor: emeraldCore.dark },
            textTransform: 'none',
            fontWeight: 600,
            py: 1.25,
            borderRadius: 2.5,
            mt: 1,
          }}
        >
          {isSaving ? (t.actions.saving || 'Guardando...') : (t.ambassador.museum?.save ?? 'Guardar')}
        </Button>
      </Box>
    </Box>
  );
}

export default EditProfileView;
