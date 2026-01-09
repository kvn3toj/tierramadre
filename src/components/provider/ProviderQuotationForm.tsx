/**
 * ProviderQuotationForm - Form for providers to submit quotations
 *
 * Can be used to respond to a specific request or submit a general quotation.
 * Designed with iOS HIG compliance.
 *
 * Designed by Aria - Capitana del Concilio de Creación
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Stack,
  Card,
  CardContent,
  Alert,
  alpha,
  CircularProgress,
  InputAdornment,
  useTheme,
} from '@mui/material';
import { Send, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { brand, iosSemanticColors, iosTypographyScale, typography, radius } from '../../design-system';
import {
  PRODUCT_TYPE_LABELS,
  type ProductType,
  type QuotationRequest,
  type ProviderQuotationFormData,
} from '../../types/provider';

// Color options
const COLOR_OPTIONS = [
  'Verde Vivido',
  'Verde Muzo',
  'Verde Gota de Aceite',
  'Verde Claro',
  'Verde Azulado',
  'Verde Amarillento',
];

// Quality options
const QUALITY_OPTIONS = [
  'Fina',
  'Comercial Fina',
  'Comercial SuperFina',
  'Comercial',
  'Media',
];

const initialFormData: ProviderQuotationFormData = {
  productType: 'piedra_suelta',
  description: '',
  weightCarats: 0,
  color: '',
  quality: '',
  priceCOP: 0,
  availability: 1,
  photoUrls: [],
  requestId: undefined,
  notes: '',
};

export default function ProviderQuotationForm() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useGoogleAuth();
  const [formData, setFormData] = useState<ProviderQuotationFormData>(initialFormData);
  const [linkedRequest, setLinkedRequest] = useState<QuotationRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // iOS HIG semantic colors
  const isDark = theme.palette.mode === 'dark';
  const mode = isDark ? 'dark' : 'light';
  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];

  const requestId = searchParams.get('requestId');

  // Load linked request if responding to one
  useEffect(() => {
    const fetchLinkedRequest = async () => {
      if (!requestId) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/quotation-requests?id=${requestId}`);
        const data = await response.json();

        if (data.success && data.request) {
          setLinkedRequest(data.request);
          // Pre-fill form with request specs
          setFormData(prev => ({
            ...prev,
            requestId,
            productType: data.request.productType,
            color: data.request.colorPreference,
            quality: data.request.qualityPreference,
          }));
        }
      } catch (err) {
        console.error('Error fetching request:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkedRequest();
  }, [requestId]);

  const handleChange = (field: keyof ProviderQuotationFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.description.trim()) {
      setError('La descripcion es requerida');
      return false;
    }
    if (formData.weightCarats <= 0) {
      setError('El peso debe ser mayor a 0');
      return false;
    }
    if (!formData.color) {
      setError('Selecciona un color');
      return false;
    }
    if (!formData.quality) {
      setError('Selecciona una calidad');
      return false;
    }
    if (formData.priceCOP <= 0) {
      setError('El precio debe ser mayor a 0');
      return false;
    }
    if (formData.availability <= 0) {
      setError('La disponibilidad debe ser mayor a 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/provider-quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          providerEmail: user?.email,
          providerName: user?.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/provider/inventory');
        }, 2000);
      } else {
        setError(data.error || 'Error al enviar la cotizacion');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: brand.emerald[500] }} />
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', p: 3 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha(brand.emerald[500], 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <CheckCircle size={40} color={brand.emerald[500]} />
        </Box>
        <Typography
          sx={{
            fontSize: iosTypographyScale.title1,
            fontWeight: typography.weight.bold,
            color: labelColor,
            mb: 1,
          }}
        >
          Cotizacion Enviada
        </Typography>
        <Typography
          sx={{
            fontSize: iosTypographyScale.subhead,
            color: secondaryLabelColor,
            textAlign: 'center',
          }}
        >
          Tu cotizacion ha sido enviada exitosamente. El administrador la revisara pronto.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button
          onClick={() => navigate(-1)}
          sx={{ minWidth: 'auto', p: 1, borderRadius: radius.sm }}
        >
          <ArrowLeft size={20} />
        </Button>
        <Box>
          <Typography
            sx={{
              fontSize: iosTypographyScale.title2,
              fontWeight: typography.weight.bold,
              color: labelColor,
            }}
          >
            {linkedRequest ? 'Responder Solicitud' : 'Nueva Cotizacion'}
          </Typography>
          <Typography
            sx={{
              fontSize: iosTypographyScale.caption1,
              color: secondaryLabelColor,
            }}
          >
            {linkedRequest ? `Solicitud #${linkedRequest.id}` : 'Enviar oferta de inventario'}
          </Typography>
        </Box>
      </Box>

      {/* Linked Request Info */}
      {linkedRequest && (
        <Card
          sx={{
            mb: 3,
            bgcolor: alpha(brand.emerald[500], 0.04),
            border: 'none',
            boxShadow: 'none',
            borderRadius: radius.lg,
          }}
        >
          <CardContent sx={{ py: 2 }}>
            <Typography
              sx={{
                fontSize: iosTypographyScale.headline,
                fontWeight: typography.weight.semibold,
                color: labelColor,
                mb: 1,
              }}
            >
              Solicitud de Tierra Madre
            </Typography>
            <Typography
              sx={{
                fontSize: iosTypographyScale.subhead,
                color: secondaryLabelColor,
              }}
            >
              <strong>Tipo:</strong> {PRODUCT_TYPE_LABELS[linkedRequest.productType]}
              {' | '}
              <strong>Peso:</strong> {linkedRequest.weightMin}-{linkedRequest.weightMax} ct
              {' | '}
              <strong>Presupuesto:</strong> ${linkedRequest.budgetMax.toLocaleString('es-CO')}
            </Typography>
            {linkedRequest.notes && (
              <Typography
                sx={{
                  fontSize: iosTypographyScale.subhead,
                  color: secondaryLabelColor,
                  mt: 1,
                }}
              >
                <strong>Notas:</strong> {linkedRequest.notes}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Stack spacing={2.5}>
        {/* Product Type */}
        <TextField
          select
          label="Tipo de Producto"
          value={formData.productType}
          onChange={(e) => handleChange('productType', e.target.value)}
          fullWidth
          disabled={!!linkedRequest}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: radius.md,
            },
          }}
        >
          {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((type) => (
            <MenuItem key={type} value={type}>
              {PRODUCT_TYPE_LABELS[type]}
            </MenuItem>
          ))}
        </TextField>

        {/* Description */}
        <TextField
          label="Descripcion del Producto"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder="Describe las caracteristicas de la esmeralda..."
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: radius.md,
            },
          }}
        />

        {/* Weight */}
        <TextField
          label="Peso (Quilates)"
          type="number"
          value={formData.weightCarats || ''}
          onChange={(e) => handleChange('weightCarats', parseFloat(e.target.value) || 0)}
          fullWidth
          InputProps={{
            endAdornment: <InputAdornment position="end">ct</InputAdornment>,
          }}
          inputProps={{ step: 0.01, min: 0 }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: radius.md,
            },
          }}
        />

        {/* Color */}
        <TextField
          select
          label="Color"
          value={formData.color}
          onChange={(e) => handleChange('color', e.target.value)}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: radius.md,
            },
          }}
        >
          {COLOR_OPTIONS.map((color) => (
            <MenuItem key={color} value={color}>
              {color}
            </MenuItem>
          ))}
        </TextField>

        {/* Quality */}
        <TextField
          select
          label="Calidad"
          value={formData.quality}
          onChange={(e) => handleChange('quality', e.target.value)}
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: radius.md,
            },
          }}
        >
          {QUALITY_OPTIONS.map((quality) => (
            <MenuItem key={quality} value={quality}>
              {quality}
            </MenuItem>
          ))}
        </TextField>

        {/* Price */}
        <TextField
          label="Precio COP"
          type="number"
          value={formData.priceCOP || ''}
          onChange={(e) => handleChange('priceCOP', parseFloat(e.target.value) || 0)}
          fullWidth
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          inputProps={{ min: 0 }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: radius.md,
            },
          }}
        />

        {/* Availability */}
        <TextField
          label="Cantidad Disponible"
          type="number"
          value={formData.availability || ''}
          onChange={(e) => handleChange('availability', parseInt(e.target.value) || 0)}
          fullWidth
          inputProps={{ min: 1 }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: radius.md,
            },
          }}
        />

        {/* Notes */}
        <TextField
          label="Notas Adicionales"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          fullWidth
          multiline
          rows={2}
          placeholder="Informacion adicional, condiciones, etc..."
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: radius.md,
            },
          }}
        />

        {/* Error */}
        {error && (
          <Alert
            severity="error"
            sx={{
              py: 0.5,
              borderRadius: radius.md,
              fontSize: iosTypographyScale.subhead,
            }}
          >
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
            bgcolor: brand.emerald[500],
            '&:hover': { bgcolor: alpha(brand.emerald[500], 0.87) },
            py: 1.5,
            borderRadius: radius.md,
            textTransform: 'none',
            fontSize: iosTypographyScale.body,
            fontWeight: typography.weight.semibold,
          }}
          fullWidth
        >
          {submitting ? 'Enviando...' : 'Enviar Cotizacion'}
        </Button>
      </Stack>
    </Box>
  );
}
