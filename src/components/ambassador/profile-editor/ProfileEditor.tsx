// Ambassador Profile Editor Component
// Allows ambassadors to customize their mini-web profiles

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Alert,
  useTheme,
} from '@mui/material';
import {
  User,
  Save,
  Eye,
  Palette,
  Phone,
  X,
  Check,
  Award,
} from 'lucide-react';
import { brand } from '../../../design-system';
import { ProfileEditorProps, EditorTab } from './types';
import { useProfileForm } from './useProfileForm';
import BasicTab from './tabs/BasicTab';
import ContactTab from './tabs/ContactTab';
import TemplateTab from './tabs/TemplateTab';
import SpecialtiesTab from './tabs/SpecialtiesTab';

export default function ProfileEditor({
  ambassador,
  onSave,
  onPreview,
  onCancel,
}: ProfileEditorProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const [activeTab, setActiveTab] = useState<EditorTab>('basic');

  const {
    formData,
    hasChanges,
    saveStatus,
    updateField,
    updateNestedField,
    updateContactMethod,
    addContactMethod,
    removeContactMethod,
    addSpecialty,
    updateSpecialty,
    removeSpecialty,
    setTemplateType,
    setColorScheme,
    handleSave,
  } = useProfileForm(ambassador, onSave);

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
              bgcolor: brand.emerald[500],
              '&:hover': { bgcolor: brand.emerald[600] },
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
          '& .Mui-selected': { color: brand.emerald[500] },
          '& .MuiTabs-indicator': { bgcolor: brand.emerald[500] },
        }}
      >
        <Tab icon={<User size={18} />} iconPosition="start" label="Información Básica" value="basic" />
        <Tab icon={<Phone size={18} />} iconPosition="start" label="Contacto" value="contact" />
        <Tab icon={<Palette size={18} />} iconPosition="start" label="Plantilla" value="template" />
        <Tab icon={<Award size={18} />} iconPosition="start" label="Especialidades" value="specialties" />
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <BasicTab
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
