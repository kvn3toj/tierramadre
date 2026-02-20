import {
  Box,
  Typography,
  TextField,
  Paper,
  Switch,
  FormControlLabel,
  alpha,
} from '@mui/material';
import { primitiveColors, accentColors } from '../../../design-system';
import type { EthicalTabProps } from './types';

const emerald = primitiveColors.emerald;

export default function EthicalTab({
  ethical,
  setEthical,
  isLight,
}: EthicalTabProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        Certificaciones éticas y de sostenibilidad para la esmeralda.
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: ethical.conflictFree
            ? alpha(emerald[600], 0.08)
            : isLight
            ? '#F9FAFB'
            : '#2C2C2E',
          border: '1px solid',
          borderColor: ethical.conflictFree
            ? emerald[600]
            : isLight
            ? '#E5E7EB'
            : '#3C3C3E',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={ethical.conflictFree !== false}
              onChange={(e) =>
                setEthical((prev) => ({ ...prev, conflictFree: e.target.checked }))
              }
              color="success"
            />
          }
          label={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Libre de Conflictos
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Certifica que la esmeralda no financia conflictos armados
              </Typography>
            </Box>
          }
        />
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: ethical.fairTrade
            ? alpha(accentColors.info.light, 0.08)
            : isLight
            ? '#F9FAFB'
            : '#2C2C2E',
          border: '1px solid',
          borderColor: ethical.fairTrade
            ? accentColors.info.light
            : isLight
            ? '#E5E7EB'
            : '#3C3C3E',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={ethical.fairTrade || false}
              onChange={(e) =>
                setEthical((prev) => ({ ...prev, fairTrade: e.target.checked }))
              }
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Comercio Justo
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Precio justo para mineros y cortadores
              </Typography>
            </Box>
          }
        />
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: ethical.environmentalCompliance
            ? alpha(emerald[500], 0.08)
            : isLight
            ? '#F9FAFB'
            : '#2C2C2E',
          border: '1px solid',
          borderColor: ethical.environmentalCompliance
            ? emerald[500]
            : isLight
            ? '#E5E7EB'
            : '#3C3C3E',
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={ethical.environmentalCompliance || false}
              onChange={(e) =>
                setEthical((prev) => ({ ...prev, environmentalCompliance: e.target.checked }))
              }
              color="success"
            />
          }
          label={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Cumplimiento Ambiental
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Extraccion con practicas sostenibles
              </Typography>
            </Box>
          }
        />
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <TextField
          size="small"
          label="Entidad Certificadora"
          value={ethical.certifyingBody || ''}
          onChange={(e) =>
            setEthical((prev) => ({ ...prev, certifyingBody: e.target.value }))
          }
          fullWidth
          placeholder="ej: Responsible Jewellery Council"
        />

        <TextField
          size="small"
          label="Fecha Certificación"
          type="date"
          value={ethical.certificateDate || ''}
          onChange={(e) =>
            setEthical((prev) => ({ ...prev, certificateDate: e.target.value }))
          }
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Box>
    </Box>
  );
}
