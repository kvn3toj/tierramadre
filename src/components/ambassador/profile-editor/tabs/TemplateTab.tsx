// Template Tab - Template type selection, color scheme, module toggles

import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  alpha,
} from '@mui/material';
import {
  Palette,
  Check,
} from 'lucide-react';
import { ColorScheme } from '../../../../types/ambassador';
import { brand, lightTokens, darkTokens } from '../../../../design-system';
import { TemplateTabProps } from '../types';
import { COLOR_PRESETS } from '../constants';

export default function TemplateTab({
  formData,
  setTemplateType,
  setColorScheme,
  updateNestedField,
  isLight,
}: TemplateTabProps) {
  return (
    <Grid container spacing={3}>
      {/* Template Type */}
      <Grid item xs={12}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? lightTokens.border.default : darkTokens.border.default }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Tipo de Plantilla
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box
                  onClick={() => setTemplateType('tm-official')}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '2px solid',
                    borderColor: formData.template.type === 'tm-official' ? brand.emerald[500] : (isLight ? lightTokens.border.default : darkTokens.border.default),
                    bgcolor: formData.template.type === 'tm-official' ? alpha(brand.emerald[500], 0.05) : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: brand.emerald[500],
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Check size={18} color={formData.template.type === 'tm-official' ? brand.emerald[500] : 'transparent'} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Tierra Madre Oficial
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Plantilla oficial con colores de Tierra Madre. Ideal para mantener coherencia con la marca.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 2 }}>
                    {[brand.emerald[500], brand.emerald[900], brand.gold[500]].map(color => (
                      <Box key={color} sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: color }} />
                    ))}
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box
                  onClick={() => setTemplateType('self-brand')}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '2px solid',
                    borderColor: formData.template.type === 'self-brand' ? brand.emerald[500] : (isLight ? lightTokens.border.default : darkTokens.border.default),
                    bgcolor: formData.template.type === 'self-brand' ? alpha(brand.emerald[500], 0.05) : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: brand.emerald[500],
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Check size={18} color={formData.template.type === 'self-brand' ? brand.emerald[500] : 'transparent'} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Marca Personal
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Personaliza colores y estilos para reflejar tu marca personal unica.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 2 }}>
                    <Palette size={24} color={lightTokens.text.muted} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                      Colores personalizables
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Color Scheme (only for self-brand) */}
      {formData.template.type === 'self-brand' && (
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? lightTokens.border.default : darkTokens.border.default }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Esquema de Colores
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Selecciona un preset o personaliza tus colores
              </Typography>

              <Grid container spacing={2}>
                {COLOR_PRESETS.map((preset) => (
                  <Grid item xs={6} sm={4} md={2.4} key={preset.name}>
                    <Box
                      onClick={() => setColorScheme(preset.scheme)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '2px solid',
                        borderColor: formData.template.colorScheme.primary === preset.scheme.primary
                          ? brand.emerald[500]
                          : (isLight ? lightTokens.border.default : darkTokens.border.default),
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: brand.emerald[500] },
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                        {[preset.scheme.primary, preset.scheme.secondary, preset.scheme.accent].map((color, i) => (
                          <Box key={i} sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: color }} />
                        ))}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {preset.name}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Custom Colors */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Personalizar Colores
              </Typography>

              <Grid container spacing={2}>
                {([
                  { key: 'primary' as keyof ColorScheme, label: 'Color Principal' },
                  { key: 'secondary' as keyof ColorScheme, label: 'Color Secundario' },
                  { key: 'accent' as keyof ColorScheme, label: 'Color de Acento' },
                ]).map(({ key, label }) => (
                  <Grid item xs={12} sm={4} key={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <input
                        type="color"
                        value={formData.template.colorScheme[key]}
                        onChange={(e) => {
                          const newScheme = { ...formData.template.colorScheme, [key]: e.target.value };
                          setColorScheme(newScheme);
                        }}
                        style={{
                          width: 40,
                          height: 40,
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {label}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          {formData.template.colorScheme[key]}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Module Toggle */}
      <Grid item xs={12}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? lightTokens.border.default : darkTokens.border.default }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Secciones del Perfil
            </Typography>

            <Grid container spacing={2}>
              {[
                { key: 'aboutMe', label: 'Acerca de Mí', desc: 'Muestra tu biografía' },
                { key: 'portfolio', label: 'Portafolio', desc: 'Galería de trabajos' },
                { key: 'testimonials', label: 'Testimonios', desc: 'Reseñas de clientes' },
                { key: 'certifications', label: 'Certificaciones', desc: 'Tus credenciales' },
                { key: 'featuredProducts', label: 'Productos Destacados', desc: 'Esmeraldas destacadas' },
                { key: 'trustBadges', label: 'Insignias', desc: 'Badges de confianza' },
              ].map(({ key, label, desc }) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={(formData.template.modules as Record<string, boolean>)[key]}
                        onChange={(e) => {
                          const newModules = { ...formData.template.modules, [key]: e.target.checked };
                          updateNestedField('template', 'modules', newModules);
                        }}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: brand.emerald[500],
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            bgcolor: brand.emerald[500],
                          },
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {desc}
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
