// Basic Info Tab - Profile photo, personal info, location, languages

import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Camera,
  MapPin,
  Languages,
} from 'lucide-react';
import { Language } from '../../../../types/ambassador';
import { brand, lightTokens, darkTokens } from '../../../../design-system';
import { BasicTabProps } from '../types';

export default function BasicTab({
  formData,
  updateField,
  updateNestedField,
  isLight,
}: BasicTabProps) {
  return (
    <Grid container spacing={3}>
      {/* Profile Photo */}
      <Grid item xs={12} md={4}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? lightTokens.border.default : darkTokens.border.default }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Foto de Perfil
            </Typography>
            <Avatar
              src={formData.photoUrl}
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 2,
                bgcolor: brand.emerald[500],
                fontSize: '3rem',
              }}
            >
              {formData.displayName.charAt(0)}
            </Avatar>
            <Button
              variant="outlined"
              startIcon={<Camera size={16} />}
              size="small"
              sx={{ textTransform: 'none' }}
            >
              Cambiar Foto
            </Button>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              JPG, PNG. Max 2MB
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Basic Details */}
      <Grid item xs={12} md={8}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? lightTokens.border.default : darkTokens.border.default }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Información Personal
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre para mostrar"
                  value={formData.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  helperText="Como apareceras en el directorio"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tagline / Eslogan"
                  value={formData.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  helperText="Una frase corta que te describe"
                  placeholder="Ej: Especialista en Esmeraldas de Alta Calidad"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Biografia"
                  value={formData.bio}
                  onChange={(e) => updateField('bio', e.target.value)}
                  helperText={`${formData.bio.length}/500 caracteres`}
                  inputProps={{ maxLength: 500 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Location */}
        <Card sx={{ mt: 2, borderRadius: 3, border: '1px solid', borderColor: isLight ? lightTokens.border.default : darkTokens.border.default }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <MapPin size={18} color={brand.emerald[500]} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Ubicación
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  value={formData.location.city}
                  onChange={(e) => updateNestedField('location', 'city', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Region/Departamento"
                  value={formData.location.region}
                  onChange={(e) => updateNestedField('location', 'region', e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Languages */}
        <Card sx={{ mt: 2, borderRadius: 3, border: '1px solid', borderColor: isLight ? lightTokens.border.default : darkTokens.border.default }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Languages size={18} color={brand.emerald[500]} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Idiomas
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(['es', 'en', 'pt', 'fr', 'de', 'it'] as Language[]).map((lang) => {
                const labels: Record<Language, string> = {
                  es: 'Espanol',
                  en: 'Ingles',
                  pt: 'Portugues',
                  fr: 'Frances',
                  de: 'Aleman',
                  it: 'Italiano',
                  zh: 'Chino',
                  ja: 'Japones',
                };
                const isSelected = formData.languages.includes(lang);
                return (
                  <Chip
                    key={lang}
                    label={labels[lang]}
                    onClick={() => {
                      const newLangs: Language[] = isSelected
                        ? formData.languages.filter(l => l !== lang)
                        : [...formData.languages, lang];
                      updateField('languages', newLangs);
                    }}
                    color={isSelected ? 'primary' : 'default'}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      ...(isSelected && {
                        bgcolor: brand.emerald[500],
                        '&:hover': { bgcolor: brand.emerald[600] },
                      }),
                    }}
                  />
                );
              })}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
