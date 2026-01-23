/**
 * RequestForm Component
 * Form for creating new product requests.
 */

import React from 'react';
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
import { Send, ImagePlus, User, Calendar } from 'lucide-react';
import { emeraldCore } from '../../../../design-system/tokens/colors';
import {
  PRODUCT_TYPE_LABELS,
  PRIORITY_LABELS,
  type ProductType,
  type RequestPriority,
  type ProductRequestFormData,
} from '../../../../types/provider';
import QuotationMediaUpload from '../../../../components/provider/QuotationMediaUpload';

// Color options
const COLOR_OPTIONS = [
  'Verde Vivido',
  'Verde Muzo',
  'Verde Limon',
  'Verde Menta',
  'Verde Natural',
  'Cualquiera',
];

// Quality options
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

interface RequestFormProps {
  formData: ProductRequestFormData;
  budgetMinDisplay: string;
  budgetMaxDisplay: string;
  tempRequestId: string;
  submitting: boolean;
  error: string | null;
  onFieldChange: (field: keyof ProductRequestFormData, value: unknown) => void;
  onBudgetMinChange: (value: string) => void;
  onBudgetMaxChange: (value: string) => void;
  onSubmit: () => void;
}

export const RequestForm: React.FC<RequestFormProps> = ({
  formData,
  budgetMinDisplay,
  budgetMaxDisplay,
  tempRequestId,
  submitting,
  error,
  onFieldChange,
  onBudgetMinChange,
  onBudgetMaxChange,
  onSubmit,
}) => {
  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2.5}>
        {/* Product Type */}
        <TextField
          select
          label="Categoria de Producto"
          value={formData.productType}
          onChange={(e) => onFieldChange('productType', e.target.value)}
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
          onChange={(e) => onFieldChange('quantity', parseInt(e.target.value) || 1)}
          fullWidth
          inputProps={{ min: 1 }}
          helperText="Numero de piezas que necesitas"
        />

        {/* Description */}
        <TextField
          label="Descripcion del Producto"
          value={formData.description}
          onChange={(e) => onFieldChange('description', e.target.value)}
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
            onChange={(e) => onFieldChange('weightMin', parseFloat(e.target.value) || 0)}
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
            onChange={(e) => onFieldChange('weightMax', parseFloat(e.target.value) || 0)}
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
          onChange={(e) => onFieldChange('colorPreference', e.target.value)}
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
          onChange={(e) => onFieldChange('qualityPreference', e.target.value)}
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
            onChange={(e) => onBudgetMinChange(e.target.value)}
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
            onChange={(e) => onBudgetMaxChange(e.target.value)}
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
                onChange={(e) => onFieldChange('clientName', e.target.value)}
                fullWidth
                size="small"
                placeholder="Nombre o referencia del cliente"
              />
              <TextField
                label="Notas del Cliente"
                value={formData.clientNotes || ''}
                onChange={(e) => onFieldChange('clientNotes', e.target.value)}
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
            onChange={(e) => onFieldChange('priority', e.target.value)}
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
            onChange={(e) => onFieldChange('neededBy', e.target.value)}
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
              onUploadComplete={(urls) => onFieldChange('referencePhotoUrls', urls)}
              maxFiles={5}
              disabled={submitting}
            />
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <TextField
          label="Notas Adicionales"
          value={formData.notes}
          onChange={(e) => onFieldChange('notes', e.target.value)}
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
          onClick={onSubmit}
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
};

export default RequestForm;
