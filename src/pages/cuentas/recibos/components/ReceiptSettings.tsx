/**
 * ReceiptSettings Component
 * Business settings accordion for receipt configuration.
 */

import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { Settings } from 'lucide-react';
import { surfacesLight } from '../../../../design-system/tokens/colors';
import { ReceiptData } from '../../../../types';
import { BusinessSettings, DocumentType } from '../constants/receiptThemes';

interface ReceiptSettingsProps {
  documentType: DocumentType;
  setDocumentType: (type: DocumentType) => void;
  businessSettings: BusinessSettings;
  setBusinessSettings: (settings: BusinessSettings) => void;
  receipt: Partial<ReceiptData>;
  setReceipt: (receipt: Partial<ReceiptData>) => void;
}

export const ReceiptSettings: React.FC<ReceiptSettingsProps> = ({
  documentType,
  setDocumentType,
  businessSettings,
  setBusinessSettings,
  receipt,
  setReceipt,
}) => {
  return (
    <Accordion
      sx={{
        bgcolor: 'transparent',
        boxShadow: 'none',
        '&:before': { display: 'none' },
        mb: 2,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: surfacesLight.text.secondary }} />}
        sx={{
          bgcolor: surfacesLight.background.secondary,
          borderRadius: 1,
          minHeight: 44,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings size={16} color={surfacesLight.text.secondary} />
          <Typography variant="body2" sx={{ color: surfacesLight.text.secondary, fontWeight: 500 }}>
            {documentType === 'invoice' ? 'Configuración de la Factura' : 'Configuración del Recibo'}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: surfacesLight.background.secondary, borderRadius: 1, mt: 0.5, p: 2 }}>
        <Grid container spacing={{ xs: 1.5, md: 2 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de Documento</InputLabel>
              <Select
                value={documentType}
                label="Tipo de Documento"
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              >
                <MenuItem value="receipt">{businessSettings.documentTypeLabels.receipt}</MenuItem>
                <MenuItem value="invoice">{businessSettings.documentTypeLabels.invoice}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nombre del Documento"
              value={businessSettings.documentTypeLabels[documentType]}
              onChange={(e) => setBusinessSettings({
                ...businessSettings,
                documentTypeLabels: {
                  ...businessSettings.documentTypeLabels,
                  [documentType]: e.target.value,
                },
              })}
              size="small"
              placeholder={documentType === 'receipt' ? 'Ej: Recibo de Compra' : 'Ej: Factura'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={documentType === 'invoice' ? 'Número de Factura' : 'Número de Recibo'}
              value={receipt.receiptNumber || ''}
              onChange={(e) => setReceipt({ ...receipt, receiptNumber: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Fecha"
              type="date"
              value={receipt.date || ''}
              onChange={(e) => setReceipt({ ...receipt, date: e.target.value })}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Teléfono de Contacto"
              value={businessSettings.contactPhone}
              onChange={(e) => setBusinessSettings({ ...businessSettings, contactPhone: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email de Contacto"
              value={businessSettings.contactEmail}
              onChange={(e) => setBusinessSettings({ ...businessSettings, contactEmail: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="NIT"
              value={businessSettings.nit}
              onChange={(e) => setBusinessSettings({ ...businessSettings, nit: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Mensaje Final"
              value={businessSettings.footerMessage}
              onChange={(e) => setBusinessSettings({ ...businessSettings, footerMessage: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nota Legal"
              value={businessSettings.footerNote}
              onChange={(e) => setBusinessSettings({ ...businessSettings, footerNote: e.target.value })}
              size="small"
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default ReceiptSettings;
