/**
 * QuotationConfig Component
 * Configuration panel for quotation settings.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Divider,
  InputAdornment,
  Slider,
} from '@mui/material';
import { Settings, RefreshCw } from 'lucide-react';
import { brandColors } from '../../../../components/cotizacion/constants';
import { TextField } from '../../../../design-system/components/TextField';
import type { QuotationData } from './QuotationCertificate';

interface QuotationConfigProps {
  quotationData: QuotationData;
  setQuotationData: (data: QuotationData) => void;
  onRegenerateNumber: () => void;
}

export const QuotationConfig: React.FC<QuotationConfigProps> = ({
  quotationData,
  setQuotationData,
  onRegenerateNumber,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 350px',
        maxWidth: { xs: '100%', md: 400 },
        p: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        maxHeight: 'calc(100vh - 250px)',
        overflowY: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Settings size={20} color={brandColors.emerald} />
        <Typography sx={{ fontWeight: 700, color: brandColors.textPrimary }}>
          Configuración de Cotización
        </Typography>
      </Box>

      {/* Basic Info */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: brandColors.gray, mb: 1.5, fontWeight: 600 }}
        >
          Información de Cotización
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            label="No. Cotización"
            value={quotationData.quotationNumber}
            onChange={(e) =>
              setQuotationData({
                ...quotationData,
                quotationNumber: e.target.value,
              })
            }
            size="sm"
          />
          <IconButton
            onClick={onRegenerateNumber}
            sx={{ color: brandColors.emerald }}
          >
            <RefreshCw size={18} />
          </IconButton>
        </Box>

        <TextField
          fullWidth
          label="Nombre del Producto"
          value={quotationData.productName}
          onChange={(e) =>
            setQuotationData({ ...quotationData, productName: e.target.value })
          }
          size="sm"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Cliente (Opcional)"
          value={quotationData.clientName}
          onChange={(e) =>
            setQuotationData({ ...quotationData, clientName: e.target.value })
          }
          size="sm"
          placeholder="Nombre del cliente"
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Pricing */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: brandColors.gray, mb: 1.5, fontWeight: 600 }}
        >
          Precios
        </Typography>

        <TextField
          fullWidth
          label="Inversión Total"
          type="number"
          value={quotationData.totalInvestment}
          onChange={(e) => {
            const newTotal = Number(e.target.value);
            const newSalePrice = newTotal * quotationData.priceFactor;
            setQuotationData({
              ...quotationData,
              totalInvestment: newTotal,
              salePrice: newSalePrice,
              profit: newSalePrice - newTotal,
            });
          }}
          size="sm"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />

        <TextField
          fullWidth
          label="Precio de Venta"
          type="number"
          value={quotationData.salePrice}
          onChange={(e) => {
            const newSalePrice = Number(e.target.value);
            setQuotationData({
              ...quotationData,
              salePrice: newSalePrice,
              profit: newSalePrice - quotationData.totalInvestment,
              margin:
                ((newSalePrice - quotationData.totalInvestment) /
                  newSalePrice) *
                100,
            });
          }}
          size="sm"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: brandColors.gray }}>
            Quilates: {quotationData.caratWeight} ct
          </Typography>
          <Slider
            value={quotationData.caratWeight}
            onChange={(_, v) =>
              setQuotationData({ ...quotationData, caratWeight: v as number })
            }
            min={0.1}
            max={20}
            step={0.1}
            sx={{ color: brandColors.emerald }}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Validity */}
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ color: brandColors.gray, mb: 1.5, fontWeight: 600 }}
        >
          Validez
        </Typography>

        <TextField
          fullWidth
          label="Fecha de Emisión"
          type="date"
          value={quotationData.date}
          onChange={(e) =>
            setQuotationData({ ...quotationData, date: e.target.value })
          }
          size="sm"
          sx={{ mb: 2 }}
          InputLabelProps={{ shrink: true }}
        />

        <Box>
          <Typography variant="caption" sx={{ color: brandColors.gray }}>
            Días de validez: {quotationData.validDays}
          </Typography>
          <Slider
            value={quotationData.validDays}
            onChange={(_, v) =>
              setQuotationData({ ...quotationData, validDays: v as number })
            }
            min={3}
            max={60}
            step={1}
            sx={{ color: brandColors.gold }}
          />
        </Box>

        <TextField
          fullWidth
          label="Notas (Opcional)"
          value={quotationData.notes}
          onChange={(e) =>
            setQuotationData({ ...quotationData, notes: e.target.value })
          }
          size="sm"
          multiline
          rows={2}
          sx={{ mt: 2 }}
          placeholder="Notas adicionales..."
        />
      </Box>
    </Paper>
  );
};

export default QuotationConfig;
