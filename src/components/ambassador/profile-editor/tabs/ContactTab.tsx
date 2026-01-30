// Contact Tab - Contact methods management

import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Phone,
  Mail,
  Instagram,
  Plus,
  Trash2,
} from 'lucide-react';
import { lightTokens, darkTokens } from '../../../../design-system';
import { ContactTabProps } from '../types';

export default function ContactTab({
  formData,
  updateContactMethod,
  addContactMethod,
  removeContactMethod,
  isLight,
}: ContactTabProps) {
  const contactIcons: Record<string, React.ReactNode> = {
    whatsapp: <Phone size={16} />,
    email: <Mail size={16} />,
    instagram: <Instagram size={16} />,
    phone: <Phone size={16} />,
  };

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? lightTokens.border.default : darkTokens.border.default }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Metodos de Contacto
          </Typography>
          <Button
            startIcon={<Plus size={16} />}
            onClick={addContactMethod}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Agregar
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {formData.contactMethods.map((contact, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                p: 2,
                bgcolor: isLight ? lightTokens.background.muted : darkTokens.background.surface,
                borderRadius: 2,
              }}
            >
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={contact.type}
                  label="Tipo"
                  onChange={(e) => updateContactMethod(index, 'type', e.target.value)}
                >
                  <MenuItem value="whatsapp">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone size={14} /> WhatsApp
                    </Box>
                  </MenuItem>
                  <MenuItem value="email">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Mail size={14} /> Email
                    </Box>
                  </MenuItem>
                  <MenuItem value="instagram">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Instagram size={14} /> Instagram
                    </Box>
                  </MenuItem>
                  <MenuItem value="phone">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone size={14} /> Teléfono
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                placeholder={
                  contact.type === 'whatsapp' ? '+57 300 123 4567' :
                  contact.type === 'email' ? 'correo@ejemplo.com' :
                  contact.type === 'instagram' ? '@usuario' : 'Número'
                }
                value={contact.value}
                onChange={(e) => updateContactMethod(index, 'value', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, color: 'text.secondary' }}>
                      {contactIcons[contact.type]}
                    </Box>
                  ),
                }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={contact.primary}
                    onChange={(e) => updateContactMethod(index, 'primary', e.target.checked)}
                    size="small"
                  />
                }
                label="Principal"
                sx={{ minWidth: 100 }}
              />

              <Chip
                label={contact.verified ? 'Verificado' : 'Pendiente'}
                size="small"
                color={contact.verified ? 'success' : 'default'}
                sx={{ minWidth: 90 }}
              />

              <IconButton
                onClick={() => removeContactMethod(index)}
                size="small"
                color="error"
                disabled={formData.contactMethods.length <= 1}
              >
                <Trash2 size={16} />
              </IconButton>
            </Box>
          ))}
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          El metodo marcado como "Principal" sera el que se use para el boton de contacto.
        </Alert>
      </CardContent>
    </Card>
  );
}
