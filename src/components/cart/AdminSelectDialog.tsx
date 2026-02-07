/**
 * AdminSelectDialog Component
 *
 * Dialog for staff (asesores/ambassadors/admins) to select which admin
 * to contact via WhatsApp with their product inquiry.
 */
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  alpha,
  CircularProgress,
} from '@mui/material';
import { X, MessageCircle, User } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../design-system/tokens/colors';

interface AdminInfo {
  name: string;
  whatsapp: string | null;
}

interface AdminSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (adminName: string) => void;
  admins: AdminInfo[];
  isLoading?: boolean;
}

export default function AdminSelectDialog({
  open,
  onClose,
  onSelect,
  admins,
  isLoading = false,
}: AdminSelectDialogProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const handleSelect = (adminName: string) => {
    onSelect(adminName);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MessageCircle size={24} color={emeraldCore.primary} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Seleccionar Admin
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar" size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 4,
            }}
          >
            <CircularProgress size={32} sx={{ color: emeraldCore.primary }} />
          </Box>
        ) : admins.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No se encontraron contactos de administradores
            </Typography>
          </Box>
        ) : (
          <>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 3, pt: 2, pb: 1 }}
            >
              Selecciona a quien enviar tu consulta por WhatsApp:
            </Typography>

            <List sx={{ pt: 0 }}>
              {admins.map((admin) => (
                <ListItemButton
                  key={admin.name}
                  onClick={() => handleSelect(admin.name)}
                  disabled={!admin.whatsapp}
                  sx={{
                    py: 1.5,
                    px: 3,
                    '&:hover': {
                      bgcolor: alpha(emeraldCore.primary, 0.08),
                    },
                    '&.Mui-disabled': {
                      opacity: 0.45,
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: alpha(emeraldCore.primary, 0.15),
                        color: emeraldCore.dark,
                      }}
                    >
                      <User size={20} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={admin.name}
                    secondary={admin.whatsapp ? 'Disponible' : 'Sin WhatsApp'}
                    primaryTypographyProps={{
                      fontWeight: 600,
                    }}
                    secondaryTypographyProps={{
                      color: admin.whatsapp ? 'success.main' : 'text.disabled',
                      fontSize: '0.75rem',
                    }}
                  />
                  {admin.whatsapp && (
                    <MessageCircle
                      size={20}
                      color={emeraldCore.primary}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
