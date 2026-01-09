/**
 * QuotationRequestForm - Admin form to create quotation requests for providers
 *
 * Allows admin to specify detailed emerald requirements for providers to quote.
 */

import { useState, useEffect } from 'react';
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
import { Send, ArrowLeft, CheckCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { emeraldCore } from '../../design-system/tokens/colors';
import {
  PRODUCT_TYPE_LABELS,
  type ProductType,
  type QuotationRequestFormData,
  type ProviderProfile,
} from '../../types/provider';

// Color options
const COLOR_OPTIONS = [
  'Verde Vivido',
  'Verde Muzo',
  'Verde Gota de Aceite',
  'Verde Claro',
  'Verde Azulado',
  'Verde Amarillento',
  'Cualquiera',
];

// Quality options
const QUALITY_OPTIONS = [
  'Fina',
  'Comercial Fina',
  'Comercial SuperFina',
  'Comercial',
  'Media',
  'Cualquiera',
];

const initialFormData: QuotationRequestFormData = {
  productType: 'piedra_suelta',
  weightMin: 1,
  weightMax: 5,
  colorPreference: '',
  qualityPreference: '',
  budgetMax: 10000000,
  notes: '',
  assignedProvider: undefined,
};

export default function QuotationRequestForm() {
  const navigate = useNavigate();
  const { user } = useGoogleAuth();
  const [formData, setFormData] = useState<QuotationRequestFormData>(initialFormData);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load available providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/providers');
        const data = await response.json();

        if (data.success) {
          setProviders(data.providers || []);
        }
      } catch (err) {
        console.error('Error fetching providers:', err);
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchProviders();
  }, []);

  const handleChange = (field: keyof QuotationRequestFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

        {/* Budget Max */}
        <TextField
          label="Presupuesto Maximo"
          type="number"
          value={formData.budgetMax || ''}
          onChange={(e) => handleChange('budgetMax', parseFloat(e.target.value) || 0)}
          fullWidth
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          inputProps={{ min: 0 }}
          helperText="Precio maximo en COP"
        />

        {/* Assign to Provider (Optional) */}
        <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Users size={18} color={emeraldCore.primary} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Asignar a Proveedor (Opcional)
              </Typography>
            </Box>
            <TextField
              select
              value={formData.assignedProvider || ''}
              onChange={(e) => handleChange('assignedProvider', e.target.value || undefined)}
              fullWidth
              size="small"
              disabled={loadingProviders}
              SelectProps={{
                displayEmpty: true,
              }}
            >
              <MenuItem value="">
                <em>Todos los proveedores</em>
              </MenuItem>
              {providers.map((provider) => (
                <MenuItem key={provider.id} value={provider.email}>
                  {provider.name} ({provider.specialty})
                </MenuItem>
              ))}
            </TextField>
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
