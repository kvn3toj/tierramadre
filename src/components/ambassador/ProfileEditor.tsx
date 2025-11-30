// Ambassador Profile Editor Component
// Allows ambassadors to customize their mini-web profiles

import { useState, useCallback } from 'react';
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
  IconButton,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import {
  User,
  Camera,
  Save,
  Eye,
  Palette,
  Phone,
  Mail,
  Instagram,
  Plus,
  Trash2,
  Check,
  X,
  Award,
  MapPin,
  Languages,
} from 'lucide-react';
import { AmbassadorProfile, ContactMethod, ColorScheme, Language } from '../../types/ambassador';

// Template type for editor
type TemplateType = 'tm-official' | 'self-brand';

interface ProfileEditorProps {
  ambassador: AmbassadorProfile;
  onSave: (profile: AmbassadorProfile) => void;
  onPreview?: () => void;
  onCancel?: () => void;
}

type EditorTab = 'basic' | 'contact' | 'template' | 'specialties';

// Preset color schemes
const COLOR_PRESETS: { name: string; scheme: ColorScheme }[] = [
  {
    name: 'Tierra Madre',
    scheme: {
      primary: '#059669',
      secondary: '#064e3b',
      accent: '#fbbf24',
      background: '#ffffff',
      text: '#1f2937',
    },
  },
  {
    name: 'Muzo Verde',
    scheme: {
      primary: '#047857',
      secondary: '#065f46',
      accent: '#10b981',
      background: '#f0fdf4',
      text: '#14532d',
    },
  },
  {
    name: 'Elegante Dorado',
    scheme: {
      primary: '#b45309',
      secondary: '#92400e',
      accent: '#fbbf24',
      background: '#fffbeb',
      text: '#78350f',
    },
  },
  {
    name: 'Royal Azul',
    scheme: {
      primary: '#1d4ed8',
      secondary: '#1e40af',
      accent: '#60a5fa',
      background: '#eff6ff',
      text: '#1e3a8a',
    },
  },
  {
    name: 'Noche Elegante',
    scheme: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#fbbf24',
      background: '#1c1c1e',
      text: '#e5e7eb',
    },
  },
];

export default function ProfileEditor({
  ambassador,
  onSave,
  onPreview,
  onCancel,
}: ProfileEditorProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  // Form state
  const [formData, setFormData] = useState<AmbassadorProfile>({ ...ambassador });
  const [activeTab, setActiveTab] = useState<EditorTab>('basic');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Update form field
  const updateField = useCallback(<K extends keyof AmbassadorProfile>(
    field: K,
    value: AmbassadorProfile[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Update nested field
  const updateNestedField = useCallback(<K extends keyof AmbassadorProfile>(
    parentField: K,
    childField: string,
    value: unknown
  ) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...(prev[parentField] as object),
        [childField]: value,
      },
    }));
    setHasChanges(true);
  }, []);

  // Handle contact method changes
  const updateContactMethod = useCallback((index: number, field: keyof ContactMethod, value: unknown) => {
    setFormData(prev => {
      const contacts = [...prev.contactMethods];
      contacts[index] = { ...contacts[index], [field]: value };
      return { ...prev, contactMethods: contacts };
    });
    setHasChanges(true);
  }, []);

  const addContactMethod = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      contactMethods: [
        ...prev.contactMethods,
        { type: 'whatsapp', value: '', primary: false, verified: false },
      ],
    }));
    setHasChanges(true);
  }, []);

  const removeContactMethod = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      contactMethods: prev.contactMethods.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  // Handle specialty changes
  const addSpecialty = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      specialties: [
        ...prev.specialties,
        { name: '', description: '', yearsExperience: 0 },
      ],
    }));
    setHasChanges(true);
  }, []);

  const updateSpecialty = useCallback((index: number, field: string, value: unknown) => {
    setFormData(prev => {
      const specialties = [...prev.specialties];
      specialties[index] = { ...specialties[index], [field]: value };
      return { ...prev, specialties };
    });
    setHasChanges(true);
  }, []);

  const removeSpecialty = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  // Handle template type change
  const setTemplateType = useCallback((type: TemplateType) => {
    updateNestedField('template', 'type', type);
  }, [updateNestedField]);

  // Handle color scheme change
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    updateNestedField('template', 'colorScheme', scheme);
  }, [updateNestedField]);

  // Handle save
  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      onSave(formData);
      setSaveStatus('saved');
      setHasChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [formData, onSave]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            Editar Perfil
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Personaliza tu Mini-Web de asesor
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onCancel && (
            <Button
              variant="outlined"
              startIcon={<X size={18} />}
              onClick={onCancel}
              sx={{ textTransform: 'none' }}
            >
              Cancelar
            </Button>
          )}
          {onPreview && (
            <Button
              variant="outlined"
              startIcon={<Eye size={18} />}
              onClick={onPreview}
              sx={{ textTransform: 'none' }}
            >
              Vista Previa
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={saveStatus === 'saving' ? null : <Save size={18} />}
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            sx={{
              bgcolor: '#059669',
              '&:hover': { bgcolor: '#047857' },
              textTransform: 'none',
            }}
          >
            {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado!' : 'Guardar'}
          </Button>
        </Box>
      </Box>

      {/* Status Alerts */}
      {saveStatus === 'saved' && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<Check size={18} />}>
          Perfil guardado correctamente
        </Alert>
      )}
      {saveStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al guardar. Intenta de nuevo.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 48,
          },
          '& .Mui-selected': { color: '#059669' },
          '& .MuiTabs-indicator': { bgcolor: '#059669' },
        }}
      >
        <Tab icon={<User size={18} />} iconPosition="start" label="Informacion Basica" value="basic" />
        <Tab icon={<Phone size={18} />} iconPosition="start" label="Contacto" value="contact" />
        <Tab icon={<Palette size={18} />} iconPosition="start" label="Plantilla" value="template" />
        <Tab icon={<Award size={18} />} iconPosition="start" label="Especialidades" value="specialties" />
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <BasicInfoTab
          formData={formData}
          updateField={updateField}
          updateNestedField={updateNestedField}
          isLight={isLight}
        />
      )}

      {activeTab === 'contact' && (
        <ContactTab
          formData={formData}
          updateContactMethod={updateContactMethod}
          addContactMethod={addContactMethod}
          removeContactMethod={removeContactMethod}
          isLight={isLight}
        />
      )}

      {activeTab === 'template' && (
        <TemplateTab
          formData={formData}
          setTemplateType={setTemplateType}
          setColorScheme={setColorScheme}
          updateNestedField={updateNestedField}
          isLight={isLight}
        />
      )}

      {activeTab === 'specialties' && (
        <SpecialtiesTab
          formData={formData}
          addSpecialty={addSpecialty}
          updateSpecialty={updateSpecialty}
          removeSpecialty={removeSpecialty}
          isLight={isLight}
        />
      )}
    </Box>
  );
}

// Basic Info Tab
function BasicInfoTab({
  formData,
  updateField,
  updateNestedField,
  isLight,
}: {
  formData: AmbassadorProfile;
  updateField: <K extends keyof AmbassadorProfile>(field: K, value: AmbassadorProfile[K]) => void;
  updateNestedField: <K extends keyof AmbassadorProfile>(parent: K, child: string, value: unknown) => void;
  isLight: boolean;
}) {
  return (
    <Grid container spacing={3}>
      {/* Profile Photo */}
      <Grid item xs={12} md={4}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
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
                bgcolor: '#059669',
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
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Informacion Personal
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
        <Card sx={{ mt: 2, borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <MapPin size={18} color="#059669" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Ubicacion
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
        <Card sx={{ mt: 2, borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Languages size={18} color="#059669" />
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
                        bgcolor: '#059669',
                        '&:hover': { bgcolor: '#047857' },
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

// Contact Tab
function ContactTab({
  formData,
  updateContactMethod,
  addContactMethod,
  removeContactMethod,
  isLight,
}: {
  formData: AmbassadorProfile;
  updateContactMethod: (index: number, field: keyof ContactMethod, value: unknown) => void;
  addContactMethod: () => void;
  removeContactMethod: (index: number) => void;
  isLight: boolean;
}) {
  const contactIcons: Record<string, React.ReactNode> = {
    whatsapp: <Phone size={16} />,
    email: <Mail size={16} />,
    instagram: <Instagram size={16} />,
    phone: <Phone size={16} />,
  };

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
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
                bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
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
                      <Phone size={14} /> Telefono
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
                  contact.type === 'instagram' ? '@usuario' : 'Numero'
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

// Template Tab
function TemplateTab({
  formData,
  setTemplateType,
  setColorScheme,
  updateNestedField,
  isLight,
}: {
  formData: AmbassadorProfile;
  setTemplateType: (type: TemplateType) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  updateNestedField: <K extends keyof AmbassadorProfile>(parent: K, child: string, value: unknown) => void;
  isLight: boolean;
}) {
  return (
    <Grid container spacing={3}>
      {/* Template Type */}
      <Grid item xs={12}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
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
                    borderColor: formData.template.type === 'tm-official' ? '#059669' : (isLight ? '#E5E7EB' : '#2C2C2E'),
                    bgcolor: formData.template.type === 'tm-official' ? alpha('#059669', 0.05) : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#059669',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Check size={18} color={formData.template.type === 'tm-official' ? '#059669' : 'transparent'} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Tierra Madre Oficial
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Plantilla oficial con colores de Tierra Madre. Ideal para mantener coherencia con la marca.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 2 }}>
                    {['#059669', '#064e3b', '#fbbf24'].map(color => (
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
                    borderColor: formData.template.type === 'self-brand' ? '#059669' : (isLight ? '#E5E7EB' : '#2C2C2E'),
                    bgcolor: formData.template.type === 'self-brand' ? alpha('#059669', 0.05) : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#059669',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Check size={18} color={formData.template.type === 'self-brand' ? '#059669' : 'transparent'} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Marca Personal
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Personaliza colores y estilos para reflejar tu marca personal unica.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 2 }}>
                    <Palette size={24} color="#9CA3AF" />
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
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
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
                          ? '#059669'
                          : (isLight ? '#E5E7EB' : '#2C2C2E'),
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: '#059669' },
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
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Secciones del Perfil
            </Typography>

            <Grid container spacing={2}>
              {[
                { key: 'aboutMe', label: 'Acerca de Mi', desc: 'Muestra tu biografia' },
                { key: 'portfolio', label: 'Portafolio', desc: 'Galeria de trabajos' },
                { key: 'testimonials', label: 'Testimonios', desc: 'Resenas de clientes' },
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
                            color: '#059669',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            bgcolor: '#059669',
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

// Specialties Tab
function SpecialtiesTab({
  formData,
  addSpecialty,
  updateSpecialty,
  removeSpecialty,
  isLight,
}: {
  formData: AmbassadorProfile;
  addSpecialty: () => void;
  updateSpecialty: (index: number, field: string, value: unknown) => void;
  removeSpecialty: (index: number) => void;
  isLight: boolean;
}) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: isLight ? '#E5E7EB' : '#2C2C2E' }}>
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
                bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
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
                    label="Descripcion"
                    value={specialty.description}
                    onChange={(e) => updateSpecialty(index, 'description', e.target.value)}
                    placeholder="Breve descripcion..."
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
              bgcolor: isLight ? '#F9FAFB' : '#2C2C2E',
              borderRadius: 2,
            }}
          >
            <Award size={32} style={{ color: '#9CA3AF', marginBottom: 8 }} />
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
