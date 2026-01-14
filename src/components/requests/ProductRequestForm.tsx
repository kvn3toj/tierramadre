/**
 * ProductRequestForm - Form for asesores/embajadores to request products
 *
 * Allows asesores and embajadores to submit product requests to admins.
 * Admins will review and decide if they need to contact providers.
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Stack,
  Alert,
  alpha,
  CircularProgress,
  InputAdornment,
  Card,
  CardContent,
  Divider,
} from '@mui/material';

// Helper to format number with Colombian thousands separator (dots)
const formatPriceCOP = (value: number | undefined): string => {
  if (!value) return '';
  return value.toLocaleString('es-CO');
};

// Helper to parse formatted price string back to number
const parsePriceCOP = (value: string): number => {
  const numericString = value.replace(/\./g, '').replace(/[^\d]/g, '');
  return parseInt(numericString, 10) || 0;
};
import { Send, ArrowLeft, CheckCircle, ImagePlus, User, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { emeraldCore } from '../../design-system/tokens/colors';
import {
  PRODUCT_TYPE_LABELS,
  PRIORITY_LABELS,
  type ProductType,
  type RequestPriority,
  type ProductRequestFormData,
} from '../../types/provider';
import QuotationMediaUpload from '../provider/QuotationMediaUpload';

// Color options - from Google Sheet inventory
const COLOR_OPTIONS = [
  'Verde Vivido',
  'Verde Muzo',
  'Verde Limón',
  'Verde Menta',
  'Verde Natural',
  'Cualquiera',
];

// Quality options - from Google Sheet inventory
const QUALITY_OPTIONS = [
  'Fina',
  'Comercial SuperFina',
  'Comercial Superior',
  'Comercial Fina',
  'Comercial Estandar',
  'Comercial',
  'Estandar',
  'Cualquiera',
];

const initialFormData: ProductRequestFormData = {
  productType: 'piedra_suelta',
  description: '',
  weightMin: 1,
  weightMax: 5,
  colorPreference: '',
  qualityPreference: '',
  budgetMin: undefined,
  budgetMax: 10000000,
  quantity: 1,
  clientName: '',
  clientNotes: '',
  priority: 'normal',
  neededBy: '',
  notes: '',
  referencePhotoUrls: [],
};

// Generate a temporary request ID for media uploads before submission
function generateTempRequestId(): string {
  return `PR-${Date.now().toString(36).toUpperCase()}`;
}

export default function ProductRequestForm() {
  const navigate = useNavigate();
  const { user } = useGoogleAuth();
  const [formData, setFormData] = useState<ProductRequestFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tempRequestId] = useState<string>(() => generateTempRequestId());
  // Display values for budget inputs (formatted with dots)
  const [budgetMinDisplay, setBudgetMinDisplay] = useState('');
  const [budgetMaxDisplay, setBudgetMaxDisplay] = useState(() => formatPriceCOP(initialFormData.budgetMax));

  const handleChange = (field: keyof ProductRequestFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Handle budget input with thousands formatting
  const handleBudgetMinChange = (inputValue: string) => {
    const numericValue = parsePriceCOP(inputValue);
    setFormData(prev => ({ ...prev, budgetMin: numericValue || undefined }));
    setBudgetMinDisplay(formatPriceCOP(numericValue || undefined));
    setError(null);
  };

  const handleBudgetMaxChange = (inputValue: string) => {
    const numericValue = parsePriceCOP(inputValue);
    setFormData(prev => ({ ...prev, budgetMax: numericValue }));
    setBudgetMaxDisplay(formatPriceCOP(numericValue));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.description.trim()) {
      setError('Describe el producto que necesitas');
      return false;
    }
    if (formData.weightMin <= 0) {
      setError('El peso minimo debe ser mayor a 0');
      return false;
    }
    if (formData.weightMax <= formData.weightMin) {
      setError('El peso maximo debe ser mayor al minimo');
      return false;
    }
    if (!formData.colorPreference) {
      setError('Selecciona una preferencia de color');
      return false;
    }
    if (!formData.qualityPreference) {
      setError('Selecciona una preferencia de calidad');
      return false;
    }
    if (formData.budgetMax <= 0) {
      setError('El presupuesto debe ser mayor a 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/user-prefs?action=product-request.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requesterEmail: user?.email,
          requesterName: user?.name || user?.email?.split('@')[0],
          requesterRole: 'asesor', // Default to asesor, could be determined from user profile
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/mis-solicitudes');
        }, 2000);
      } else {
        setError(data.error || 'Error al crear la solicitud');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', p: 3 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha(emeraldCore.primary, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <CheckCircle size={40} color={emeraldCore.primary} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Solicitud Enviada
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          Tu solicitud ha sido enviada al equipo de Tierra Madre.
          Te notificaremos cuando haya una respuesta.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button
          onClick={() => navigate(-1)}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <ArrowLeft size={20} />
        </Button>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Solicitar Producto
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Describe el producto que necesitas para tu cliente
          </Typography>
        </Box>
      </Box>

      {/* Form */}
      <Stack spacing={2.5}>
        {/* Product Type */}
        <TextField
          select
          label="Tipo de Producto"
          value={formData.productType}
          onChange={(e) => handleChange('productType', e.target.value)}
          fullWidth
        >
          {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((type) => (
            <MenuItem key={type} value={type}>
              {PRODUCT_TYPE_LABELS[type]}
            </MenuItem>
          ))}
        </TextField>

        {/* Quantity */}
        <TextField
          label="Cantidad"
          type="number"
          value={formData.quantity || 1}
          onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
          fullWidth
          inputProps={{ min: 1 }}
          helperText="Numero de piezas que necesitas"
        />

        {/* Description */}
        <TextField
          label="Descripcion del Producto"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          fullWidth
          multiline
          rows={2}
          placeholder="Ej: Esmeralda verde vivido para anillo de compromiso..."
          required
        />

        {/* Weight Range */}
        <Stack direction="row" spacing={2}>
          <TextField
            label="Peso Minimo (ct)"
            type="number"
            value={formData.weightMin || ''}
            onChange={(e) => handleChange('weightMin', parseFloat(e.target.value) || 0)}
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">ct</InputAdornment>,
            }}
            inputProps={{ step: 0.1, min: 0 }}
          />
          <TextField
            label="Peso Maximo (ct)"
            type="number"
            value={formData.weightMax || ''}
            onChange={(e) => handleChange('weightMax', parseFloat(e.target.value) || 0)}
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">ct</InputAdornment>,
            }}
            inputProps={{ step: 0.1, min: 0 }}
          />
        </Stack>

        {/* Color Preference */}
        <TextField
          select
          label="Preferencia de Color"
          value={formData.colorPreference}
          onChange={(e) => handleChange('colorPreference', e.target.value)}
          fullWidth
        >
          {COLOR_OPTIONS.map((color) => (
            <MenuItem key={color} value={color}>
              {color}
            </MenuItem>
          ))}
        </TextField>

        {/* Quality Preference */}
        <TextField
          select
          label="Preferencia de Calidad"
          value={formData.qualityPreference}
          onChange={(e) => handleChange('qualityPreference', e.target.value)}
          fullWidth
        >
          {QUALITY_OPTIONS.map((quality) => (
            <MenuItem key={quality} value={quality}>
              {quality}
            </MenuItem>
          ))}
        </TextField>

        {/* Budget Range */}
        <Stack direction="row" spacing={2}>
          <TextField
            label="Presupuesto Min (opcional)"
            value={budgetMinDisplay}
            onChange={(e) => handleBudgetMinChange(e.target.value)}
            fullWidth
            placeholder="5.000.000"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            inputProps={{ inputMode: 'numeric' }}
          />
          <TextField
            label="Presupuesto Max"
            value={budgetMaxDisplay}
            onChange={(e) => handleBudgetMaxChange(e.target.value)}
            fullWidth
            placeholder="10.000.000"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            inputProps={{ inputMode: 'numeric' }}
            required
          />
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Client Info Section */}
        <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <User size={18} color={emeraldCore.primary} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Informacion del Cliente (Opcional)
              </Typography>
            </Box>
            <Stack spacing={2}>
              <TextField
                label="Nombre del Cliente"
                value={formData.clientName || ''}
                onChange={(e) => handleChange('clientName', e.target.value)}
                fullWidth
                size="small"
                placeholder="Nombre o referencia del cliente"
              />
              <TextField
                label="Notas del Cliente"
                value={formData.clientNotes || ''}
                onChange={(e) => handleChange('clientNotes', e.target.value)}
                fullWidth
                size="small"
                multiline
                rows={2}
                placeholder="Preferencias especiales, ocasion, etc..."
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Priority and Date */}
        <Stack direction="row" spacing={2}>
          <TextField
            select
            label="Prioridad"
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            fullWidth
          >
            {(Object.keys(PRIORITY_LABELS) as RequestPriority[]).map((p) => (
              <MenuItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Fecha Necesaria"
            type="date"
            value={formData.neededBy || ''}
            onChange={(e) => handleChange('neededBy', e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Calendar size={16} /></InputAdornment>,
            }}
          />
        </Stack>

        {/* Reference Media Upload */}
        <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <ImagePlus size={18} color={emeraldCore.primary} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Fotos de Referencia (Opcional)
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
              Sube imagenes de referencia para ayudarnos a entender mejor lo que buscas
            </Typography>
            <QuotationMediaUpload
              quotationId={tempRequestId}
              uploadedUrls={formData.referencePhotoUrls || []}
              onUploadComplete={(urls) => handleChange('referencePhotoUrls', urls)}
              maxFiles={5}
              disabled={submitting}
            />
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <TextField
          label="Notas Adicionales"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder="Cualquier informacion adicional que nos ayude a encontrar el producto perfecto..."
        />

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ py: 0.5 }}>
            {error}
          </Alert>
        )}

        {/* Submit */}
        <Button
          variant="contained"
          size="large"
          startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send size={20} />}
          onClick={handleSubmit}
          disabled={submitting}
          sx={{
            bgcolor: emeraldCore.primary,
            '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.87) },
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
          fullWidth
        >
          {submitting ? 'Enviando...' : 'Enviar Solicitud'}
        </Button>
      </Stack>
    </Box>
  );
}
