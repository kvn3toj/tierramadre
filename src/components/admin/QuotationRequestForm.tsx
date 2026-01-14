/**
 * QuotationRequestForm - Admin form to create quotation requests for providers
 *
 * Allows admin to specify detailed emerald requirements for providers to quote.
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
} from '@mui/material';

// Helper to format number with Colombian thousands separator (dots)
const formatPriceCOP = (value: number): string => {
  if (!value) return '';
  return value.toLocaleString('es-CO');
};

// Helper to parse formatted price string back to number
const parsePriceCOP = (value: string): number => {
  const numericString = value.replace(/\./g, '').replace(/[^\d]/g, '');
  return parseInt(numericString, 10) || 0;
};
import { Send, ArrowLeft, CheckCircle, ImagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { emeraldCore } from '../../design-system/tokens/colors';
import {
  PRODUCT_TYPE_LABELS,
  type ProductType,
  type QuotationRequestFormData,
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

const initialFormData: QuotationRequestFormData = {
  productType: 'piedra_suelta',
  weightMin: 1,
  weightMax: 5,
  colorPreference: '',
  qualityPreference: '',
  budgetMax: 10000000,
  quantity: 1,
  notes: '',
  assignedProvider: undefined,
  referencePhotoUrls: [],
};

// Generate a temporary request ID for media uploads before submission
function generateTempRequestId(): string {
  return `REQ-${Date.now().toString(36).toUpperCase()}`;
}

export default function QuotationRequestForm() {
  const navigate = useNavigate();
  const { user } = useGoogleAuth();
  const [formData, setFormData] = useState<QuotationRequestFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // Temporary ID for media uploads (generated once per form session)
  const [tempRequestId] = useState<string>(() => generateTempRequestId());
  // Display value for budget input (formatted with dots)
  const [budgetDisplay, setBudgetDisplay] = useState(() => formatPriceCOP(initialFormData.budgetMax));

  const handleChange = (field: keyof QuotationRequestFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Handle budget input with thousands formatting
  const handleBudgetChange = (inputValue: string) => {
    const numericValue = parsePriceCOP(inputValue);
    setFormData(prev => ({ ...prev, budgetMax: numericValue }));
    setBudgetDisplay(formatPriceCOP(numericValue));
    setError(null);
  };

  const validateForm = (): boolean => {
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
      const response = await fetch('/api/quotation-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdBy: user?.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/cuentas');
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
          Solicitud Creada
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          La solicitud de cotizacion ha sido enviada al proveedor.
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
            Nueva Solicitud de Cotizacion
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Especifica los requisitos para el proveedor
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

        {/* Budget Max */}
        <TextField
          label="Presupuesto Maximo"
          value={budgetDisplay}
          onChange={(e) => handleBudgetChange(e.target.value)}
          fullWidth
          placeholder="10.000.000"
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          inputProps={{ inputMode: 'numeric' }}
          helperText="Precio maximo en COP"
        />

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
              Sube imagenes, GIFs o videos de referencia para el proveedor
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

        {/* Notes */}
        <TextField
          label="Notas Adicionales"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder="Requisitos especiales, preferencias, etc..."
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
          {submitting ? 'Enviando...' : 'Crear Solicitud'}
        </Button>
      </Stack>
    </Box>
  );
}
