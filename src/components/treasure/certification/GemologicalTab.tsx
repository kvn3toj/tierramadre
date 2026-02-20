import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  alpha,
} from '@mui/material';
import { Image as ImageIcon, Check } from 'lucide-react';
import { emeraldCore, surfacesLight, surfacesDark } from '../../../design-system/tokens/colors';
import { cssTransition } from '../../../design-system';
import { GemologicalCertification, GemologicalLab } from '../../../types';
import { LABS, CLARITY_GRADES, CUT_GRADES, TREATMENTS } from './constants';
import type { GemologicalTabProps } from './types';

export default function GemologicalTab({
  gemological,
  setGemological,
  certificateImage,
  onImageUpload,
  isLight,
}: GemologicalTabProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Certificate Image Upload */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2.5,
          border: '2px dashed',
          borderColor: certificateImage
            ? emeraldCore.dark
            : isLight
            ? surfacesLight.border.light
            : surfacesDark.border.default,
          bgcolor: certificateImage
            ? alpha(emeraldCore.dark, 0.05)
            : isLight
            ? surfacesLight.background.secondary
            : surfacesDark.background.secondary,
          textAlign: 'center',
          cursor: 'pointer',
          transition: cssTransition.default,
          '&:hover': {
            borderColor: emeraldCore.dark,
          },
        }}
        component="label"
      >
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={onImageUpload}
        />
        {certificateImage ? (
          <Box>
            <Box
              component="img"
              src={certificateImage}
              sx={{
                maxWidth: '100%',
                maxHeight: 150,
                borderRadius: 2,
                mb: 1,
              }}
            />
            <Typography variant="caption" sx={{ color: emeraldCore.dark }}>
              <Check size={14} style={{ verticalAlign: 'middle' }} /> Certificado cargado
            </Typography>
          </Box>
        ) : (
          <Box>
            <ImageIcon
              size={32}
              color={isLight ? '#9CA3AF' : '#6B7280'}
              style={{ marginBottom: 8 }}
            />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Subir imagen del certificado
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              JPG, PNG (max 5MB)
            </Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Laboratorio</InputLabel>
          <Select
            value={gemological.lab || ''}
            label="Laboratorio"
            onChange={(e) =>
              setGemological((prev) => ({ ...prev, lab: e.target.value as GemologicalLab }))
            }
          >
            {LABS.map((lab) => (
              <MenuItem key={lab} value={lab}>
                {lab}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="No. Certificado"
          value={gemological.certificateNumber || ''}
          onChange={(e) =>
            setGemological((prev) => ({ ...prev, certificateNumber: e.target.value }))
          }
          fullWidth
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          size="small"
          label="Fecha del Reporte"
          type="date"
          value={gemological.reportDate || ''}
          onChange={(e) =>
            setGemological((prev) => ({ ...prev, reportDate: e.target.value }))
          }
          fullWidth
          InputLabelProps={{ shrink: true }}
        />

        <FormControl fullWidth size="small">
          <InputLabel>Estado</InputLabel>
          <Select
            value={gemological.authenticity || 'PENDING'}
            label="Estado"
            onChange={(e) =>
              setGemological((prev) => ({
                ...prev,
                authenticity: e.target.value as 'VERIFIED' | 'PENDING' | 'EXPIRED',
              }))
            }
          >
            <MenuItem value="VERIFIED">Verificado</MenuItem>
            <MenuItem value="PENDING">Pendiente</MenuItem>
            <MenuItem value="EXPIRED">Expirado</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 600, mt: 1, color: 'text.secondary' }}
      >
        Características Gemológicas
      </Typography>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Claridad</InputLabel>
          <Select
            value={gemological.clarity || ''}
            label="Claridad"
            onChange={(e) =>
              setGemological((prev) => ({
                ...prev,
                clarity: e.target.value as GemologicalCertification['clarity'],
              }))
            }
          >
            {CLARITY_GRADES.map((grade) => (
              <MenuItem key={grade} value={grade}>
                {grade}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Corte</InputLabel>
          <Select
            value={gemological.cutGrade || ''}
            label="Corte"
            onChange={(e) =>
              setGemological((prev) => ({
                ...prev,
                cutGrade: e.target.value as GemologicalCertification['cutGrade'],
              }))
            }
          >
            {CUT_GRADES.map((grade) => (
              <MenuItem key={grade} value={grade}>
                {grade.replace('_', ' ')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          size="small"
          label="Grado de Color"
          value={gemological.colorGrade || ''}
          onChange={(e) =>
            setGemological((prev) => ({ ...prev, colorGrade: e.target.value }))
          }
          fullWidth
          placeholder="ej: Medium Green"
        />

        <FormControl fullWidth size="small">
          <InputLabel>Tratamientos</InputLabel>
          <Select
            value={gemological.treatments || ''}
            label="Tratamientos"
            onChange={(e) =>
              setGemological((prev) => ({
                ...prev,
                treatments: e.target.value as GemologicalCertification['treatments'],
              }))
            }
          >
            {TREATMENTS.map((t) => (
              <MenuItem key={t} value={t}>
                {t === 'NONE' ? 'Sin tratamiento' : t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}
