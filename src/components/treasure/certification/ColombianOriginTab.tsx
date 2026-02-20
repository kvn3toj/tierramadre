import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Switch,
  FormControlLabel,
  alpha,
} from '@mui/material';
import { MapPin } from 'lucide-react';
import { ColombianRegion } from '../../../types';
import { REGIONS } from './constants';
import { primitiveColors } from '../../../design-system';
import type { ColombianOriginTabProps } from './types';

const emerald = primitiveColors.emerald;

export default function ColombianOriginTab({
  colombianOrigin,
  setColombianOrigin,
  isLight,
}: ColombianOriginTabProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 2.5,
          bgcolor: colombianOrigin.verified
            ? alpha(emerald[600], 0.08)
            : isLight
            ? '#F9FAFB'
            : '#2C2C2E',
          border: '1px solid',
          borderColor: colombianOrigin.verified
            ? emerald[600]
            : isLight
            ? '#E5E7EB'
            : '#3C3C3E',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={colombianOrigin.verified || false}
              onChange={(e) =>
                setColombianOrigin((prev) => ({ ...prev, verified: e.target.checked }))
              }
              color="success"
            />
          }
          label={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Origen Colombiano Verificado
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Confirma que la esmeralda proviene de Colombia
              </Typography>
            </Box>
          }
        />
      </Paper>

      <FormControl fullWidth size="small">
        <InputLabel>Region de Origen</InputLabel>
        <Select
          value={colombianOrigin.region || 'Muzo'}
          label="Region de Origen"
          onChange={(e) =>
            setColombianOrigin((prev) => ({
              ...prev,
              region: e.target.value as ColombianRegion,
            }))
          }
        >
          {REGIONS.map((region) => (
            <MenuItem key={region} value={region}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapPin size={14} />
                {region}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        label="Nombre de la Mina"
        value={colombianOrigin.mineName || ''}
        onChange={(e) =>
          setColombianOrigin((prev) => ({ ...prev, mineName: e.target.value }))
        }
        fullWidth
        placeholder="ej: Mina La Pita"
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          size="small"
          label="Entidad Certificadora"
          value={colombianOrigin.certifyingBody || ''}
          onChange={(e) =>
            setColombianOrigin((prev) => ({ ...prev, certifyingBody: e.target.value }))
          }
          fullWidth
          placeholder="ej: CDTEC"
        />

        <TextField
          size="small"
          label="No. Certificado"
          value={colombianOrigin.certificateNumber || ''}
          onChange={(e) =>
            setColombianOrigin((prev) => ({ ...prev, certificateNumber: e.target.value }))
          }
          fullWidth
        />
      </Box>

      <TextField
        size="small"
        label="Fecha de Verificacion"
        type="date"
        value={colombianOrigin.verificationDate || ''}
        onChange={(e) =>
          setColombianOrigin((prev) => ({ ...prev, verificationDate: e.target.value }))
        }
        fullWidth
        InputLabelProps={{ shrink: true }}
      />
    </Box>
  );
}
