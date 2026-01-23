/**
 * ProviderQuotationForm - Form for providers to submit quotations
 *
 * Hybrid design: Photo-first like Telegram/WhatsApp + structured fields.
 * Quick chip selectors replace dropdowns for faster mobile entry.
 *
 * Designed by Aria - Capitana del Concilio de Creación
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  CardContent,
  Alert,
  alpha,
  CircularProgress,
  InputAdornment,
  useTheme,
  Chip,
  Collapse,
} from '@mui/material';
import { Send, ArrowLeft, CheckCircle, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { brand, iosSemanticColors, iosTypographyScale, typography, radius } from '../../design-system';
import {
  PRODUCT_TYPE_LABELS,
  type ProductType,
  type QuotationRequest,
  type ProviderQuotationFormData,
} from '../../types/provider';
import QuotationMediaUpload from './QuotationMediaUpload';
import { formatPriceCOP, parsePriceCOP } from '../../utils/priceFormatters';

// Product type options for chips
const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'piedra_suelta', label: 'Gema' },
  { value: 'anillo', label: 'Anillo' },
  { value: 'collar', label: 'Collar' },
  { value: 'pendientes', label: 'Aretes' },
  { value: 'pulsera', label: 'Pulsera' },
];

// Color options - simplified labels for chips
const COLOR_OPTIONS = [
  { value: 'Verde Vivido', label: 'Vivido' },
  { value: 'Verde Muzo', label: 'Muzo' },
  { value: 'Verde Limon', label: 'Limon' },
  { value: 'Verde Menta', label: 'Menta' },
  { value: 'Verde Natural', label: 'Natural' },
];

// Quality options - simplified for chips
const QUALITY_OPTIONS = [
  { value: 'Fina', label: 'Fina' },
  { value: 'Comercial SuperFina', label: 'SuperFina' },
  { value: 'Comercial Superior', label: 'Superior' },
  { value: 'Comercial Fina', label: 'Com. Fina' },
  { value: 'Comercial', label: 'Comercial' },
  { value: 'Estandar', label: 'Estandar' },
];

// Material options for jewelry
const MATERIAL_OPTIONS = [
  { value: 'Oro Amarillo', label: 'Oro Amarillo' },
  { value: 'Oro Blanco', label: 'Oro Blanco' },
  { value: 'Oro Rosa', label: 'Oro Rosa' },
  { value: 'Plata', label: 'Plata' },
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

// Generate a temporary quotation ID for media uploads before submission
function generateTempQuotationId(): string {
  return `QUO-${Date.now().toString(36).toUpperCase()}`;
}

// Chip selector component for quick selection
interface ChipSelectorProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function ChipSelector({ label, options, value, onChange, disabled }: ChipSelectorProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const mode = isDark ? 'dark' : 'light';
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];

  return (
    <Box>
      <Typography
        sx={{
          fontSize: iosTypographyScale.caption1,
          fontWeight: typography.weight.semibold,
          color: secondaryLabelColor,
          mb: 1,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            sx={{
              bgcolor: value === option.value
                ? brand.emerald[500]
                : alpha(brand.emerald[500], 0.08),
              color: value === option.value
                ? '#fff'
                : isDark ? '#fff' : brand.emerald[700],
              fontWeight: value === option.value
                ? typography.weight.semibold
                : typography.weight.medium,
              fontSize: iosTypographyScale.subhead,
              borderRadius: radius.lg,
              border: 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: value === option.value
                  ? brand.emerald[600]
                  : alpha(brand.emerald[500], 0.15),
              },
              '& .MuiChip-label': {
                px: 1.5,
                py: 0.5,
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

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
  const [tempQuotationId] = useState<string>(() => generateTempQuotationId());
  const [priceDisplay, setPriceDisplay] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  // Extended form data for material (jewelry)
  const [material, setMaterial] = useState('');

  // iOS HIG semantic colors
  const isDark = theme.palette.mode === 'dark';
  const mode = isDark ? 'dark' : 'light';
  const labelColor = iosSemanticColors.label[mode];
  const secondaryLabelColor = iosSemanticColors.secondaryLabel[mode];

  const requestId = searchParams.get('requestId');
  const isJewelry = formData.productType !== 'piedra_suelta';

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

  const handlePriceChange = (inputValue: string) => {
    const numericValue = parsePriceCOP(inputValue);
    setFormData(prev => ({ ...prev, priceCOP: numericValue }));
    setPriceDisplay(formatPriceCOP(numericValue));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (formData.photoUrls.length === 0) {
      setError('Agrega al menos una foto o video');
      return false;
    }
    if (formData.priceCOP <= 0) {
      setError('El precio es requerido');
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
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    // Include material in description for jewelry
    const fullDescription = isJewelry && material
      ? `${formData.description} | Material: ${material}`.trim()
      : formData.description;

    try {
      const response = await fetch('/api/provider-quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          description: fullDescription || `${PRODUCT_TYPE_LABELS[formData.productType]} - ${formData.color} - ${formData.quality}`,
          providerEmail: user?.email,
          providerName: user?.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
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

  const handleSendAnother = () => {
    setFormData(initialFormData);
    setPriceDisplay('');
    setMaterial('');
    setShowMoreDetails(false);
    setSuccess(false);
    setError(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: brand.emerald[500] }} />
      </Box>
    );
  }

  // Success screen with "Send Another" option
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
            mb: 4,
          }}
        >
          Tu cotizacion ha sido enviada exitosamente.
        </Typography>

        {/* Quick actions after success */}
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 300 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Camera size={20} />}
            onClick={handleSendAnother}
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
            Enviar Otra
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/provider')}
            sx={{
              borderColor: brand.emerald[500],
              color: brand.emerald[500],
              '&:hover': {
                borderColor: brand.emerald[500],
                bgcolor: alpha(brand.emerald[500], 0.04),
              },
              py: 1.5,
              borderRadius: radius.md,
              textTransform: 'none',
              fontSize: iosTypographyScale.body,
              fontWeight: typography.weight.semibold,
            }}
            fullWidth
          >
            Ir al Dashboard
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
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
            {linkedRequest ? `Solicitud #${linkedRequest.id}` : 'Como en Telegram, pero organizado'}
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
              <strong>Categoria:</strong> {PRODUCT_TYPE_LABELS[linkedRequest.productType]}
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

      <Stack spacing={3}>
        {/* STEP 1: Photo/Video Upload - PROMINENT */}
        <Card
          sx={{
            bgcolor: alpha(brand.emerald[500], 0.04),
            border: `2px dashed ${formData.photoUrls.length > 0 ? brand.emerald[500] : alpha(brand.emerald[500], 0.3)}`,
            boxShadow: 'none',
            borderRadius: radius.lg,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: brand.emerald[500],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={20} color="#fff" />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: iosTypographyScale.headline,
                    fontWeight: typography.weight.bold,
                    color: labelColor,
                  }}
                >
                  Foto o GIF del producto
                </Typography>
                <Typography
                  sx={{
                    fontSize: iosTypographyScale.caption1,
                    color: secondaryLabelColor,
                  }}
                >
                  Como lo enviarias por Telegram
                </Typography>
              </Box>
            </Box>
            <QuotationMediaUpload
              quotationId={tempQuotationId}
              uploadedUrls={formData.photoUrls}
              onUploadComplete={(urls) => handleChange('photoUrls', urls)}
              maxFiles={5}
              disabled={submitting}
            />
          </CardContent>
        </Card>

        {/* STEP 2: Product Type - Chip Selector */}
        <ChipSelector
          label="Tipo de producto"
          options={PRODUCT_TYPE_OPTIONS}
          value={formData.productType}
          onChange={(value) => handleChange('productType', value as ProductType)}
          disabled={!!linkedRequest}
        />

        {/* STEP 3: Price - Big and Clear */}
        <Box>
          <Typography
            sx={{
              fontSize: iosTypographyScale.caption1,
              fontWeight: typography.weight.semibold,
              color: secondaryLabelColor,
              mb: 1,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Precio
          </Typography>
          <TextField
            value={priceDisplay}
            onChange={(e) => handlePriceChange(e.target.value)}
            fullWidth
            placeholder="19.500.000"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              sx: {
                fontSize: iosTypographyScale.title2,
                fontWeight: typography.weight.bold,
              },
            }}
            inputProps={{ inputMode: 'numeric' }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: radius.md,
                bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.02),
              },
            }}
          />
        </Box>

        {/* STEP 4: Color - Chip Selector */}
        <ChipSelector
          label="Color"
          options={COLOR_OPTIONS}
          value={formData.color}
          onChange={(value) => handleChange('color', value)}
        />

        {/* STEP 5: Quality - Chip Selector */}
        <ChipSelector
          label="Calidad"
          options={QUALITY_OPTIONS}
          value={formData.quality}
          onChange={(value) => handleChange('quality', value)}
        />

        {/* STEP 6: Material (only for jewelry) */}
        {isJewelry && (
          <ChipSelector
            label="Material"
            options={MATERIAL_OPTIONS}
            value={material}
            onChange={setMaterial}
          />
        )}

        {/* More Details Toggle */}
        <Button
          onClick={() => setShowMoreDetails(!showMoreDetails)}
          sx={{
            color: secondaryLabelColor,
            textTransform: 'none',
            fontSize: iosTypographyScale.subhead,
            justifyContent: 'flex-start',
            px: 0,
            '&:hover': { bgcolor: 'transparent' },
          }}
          endIcon={showMoreDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        >
          {showMoreDetails ? 'Menos detalles' : 'Mas detalles (opcional)'}
        </Button>

        <Collapse in={showMoreDetails}>
          <Stack spacing={2.5}>
            {/* Weight */}
            <TextField
              label="Peso (quilates)"
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

            {/* Quantity */}
            <TextField
              label="Cantidad disponible"
              type="number"
              value={formData.availability || ''}
              onChange={(e) => handleChange('availability', parseInt(e.target.value) || 1)}
              fullWidth
              inputProps={{ min: 1 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: radius.md,
                },
              }}
            />

            {/* Description */}
            <TextField
              label="Descripcion adicional"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Ej: Manilla con 53 piedras de 3mm, mide 19 cms..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: radius.md,
                },
              }}
            />

            {/* Notes */}
            <TextField
              label="Notas adicionales"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Unica oferta, condiciones especiales..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: radius.md,
                },
              }}
            />
          </Stack>
        </Collapse>

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

        {/* Submit Button */}
        <Button
          variant="contained"
          size="large"
          startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send size={20} />}
          onClick={handleSubmit}
          disabled={submitting || formData.photoUrls.length === 0}
          sx={{
            bgcolor: brand.emerald[500],
            '&:hover': { bgcolor: alpha(brand.emerald[500], 0.87) },
            '&:disabled': {
              bgcolor: alpha(brand.emerald[500], 0.3),
              color: alpha('#fff', 0.6),
            },
            py: 1.75,
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
