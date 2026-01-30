// Specialties Tab - Manage expertise areas

import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
} from '@mui/material';
import {
  Plus,
  Trash2,
  Award,
} from 'lucide-react';
import { lightTokens, darkTokens } from '../../../../design-system';
import { SpecialtiesTabProps } from '../types';

export default function SpecialtiesTab({
  formData,
  addSpecialty,
  updateSpecialty,
  removeSpecialty,
  isLight,
}: SpecialtiesTabProps) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? lightTokens.border.default : darkTokens.border.default }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Especialidades
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Agrega tus areas de experiencia
            </Typography>
          </Box>
          <Button
            startIcon={<Plus size={16} />}
            onClick={addSpecialty}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Agregar
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {formData.specialties.map((specialty, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                bgcolor: isLight ? lightTokens.background.muted : darkTokens.background.surface,
                borderRadius: 2,
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nombre"
                    value={specialty.name}
                    onChange={(e) => updateSpecialty(index, 'name', e.target.value)}
                    placeholder="Ej: Esmeraldas de Muzo"
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Descripción"
                    value={specialty.description}
                    onChange={(e) => updateSpecialty(index, 'description', e.target.value)}
                    placeholder="Breve descripción..."
                  />
                </Grid>
                <Grid item xs={8} sm={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Anos"
                    value={specialty.yearsExperience || ''}
                    onChange={(e) => updateSpecialty(index, 'yearsExperience', parseInt(e.target.value) || 0)}
                    inputProps={{ min: 0, max: 50 }}
                  />
                </Grid>
                <Grid item xs={4} sm={1}>
                  <IconButton
                    onClick={() => removeSpecialty(index)}
                    size="small"
                    color="error"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          ))}
        </Box>

        {formData.specialties.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              bgcolor: isLight ? lightTokens.background.muted : darkTokens.background.surface,
              borderRadius: 2,
            }}
          >
            <Award size={32} style={{ color: lightTokens.text.muted, marginBottom: 8 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No tienes especialidades agregadas
            </Typography>
            <Button
              startIcon={<Plus size={16} />}
              onClick={addSpecialty}
              size="small"
              sx={{ mt: 1, textTransform: 'none' }}
            >
              Agregar primera especialidad
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
