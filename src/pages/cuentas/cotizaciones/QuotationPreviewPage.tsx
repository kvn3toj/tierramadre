/**
 * TIERRA MADRE - Quotation Preview & Generator
 * Professional price quotation with certificate-style design
 * Beautiful frontend design first, then export to PDF
 */

import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import { FileText, Download, Eye, ArrowLeft } from 'lucide-react';
import { documentShadows } from '../../../design-system/tokens';
import { blurValues } from '../../../design-system';
import { exportQuotationToPdf } from '../../../utils/pdf';
import { brandColors } from '../../../components/cotizacion/constants';
import { createLogger } from '../../../utils/logger';
import { QuotationCertificate, QuotationConfig } from './components';
import type { QuotationData } from './components';

const log = createLogger('QuotationPreview');

// Generate quotation number
const generateQuotationNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Date.now()).slice(-5);
  return `COT-${year}${month}${day}-${random}`;
};

// Default quotation data
const defaultQuotationData: QuotationData = {
  quotationNumber: generateQuotationNumber(),
  productName: 'Esmeralda Natural Colombiana',
  caratWeight: 2.5,
  investments: [
    { id: 'emerald', label: 'Valor de la Esmeralda', value: 500000 },
    { id: 'gold', label: 'Oro (Estructura)', value: 0 },
    { id: 'silver', label: 'Plata (Estructura)', value: 320000 },
    { id: 'setting', label: 'Engaste', value: 60000 },
    { id: 'certification', label: 'Certificación', value: 0 },
    { id: 'packaging', label: 'Empaque', value: 0 },
  ],
  customItems: [],
  totalInvestment: 880000,
  priceFactor: 2.5,
  salePrice: 2200000,
  margin: 60,
  roi: 150,
  profit: 1320000,
  pricePerCarat: 880000,
  date: new Date().toISOString().split('T')[0],
  validDays: 15,
  clientName: '',
  notes: '',
};

export default function QuotationPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const quotationRef = useRef<HTMLDivElement>(null);

  // Snackbar state for export feedback
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Get data from navigation state or use defaults
  const passedData = location.state?.quotationData;

  const [quotationData, setQuotationData] = useState<QuotationData>(() => {
    if (passedData) {
      return {
        ...defaultQuotationData,
        ...passedData,
        quotationNumber: passedData.quotationNumber || generateQuotationNumber(),
        date: passedData.date || new Date().toISOString().split('T')[0],
      };
    }
    return defaultQuotationData;
  });

  // Export to PDF using shared utility
  const handleExportPDF = async () => {
    if (!quotationRef.current) return;

    const result = await exportQuotationToPdf(
      quotationRef.current,
      quotationData.quotationNumber
    );

    if (result.success) {
      setSnackbar({
        open: true,
        message: `✅ Cotización ${quotationData.quotationNumber} exportada exitosamente`,
        severity: 'success',
      });
    } else {
      setSnackbar({
        open: true,
        message: '❌ Error al exportar la cotización. Intenta de nuevo.',
        severity: 'error',
      });
      log.error('PDF export error:', result.error);
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Regenerate quotation number
  const regenerateQuotationNumber = () => {
    setQuotationData({ ...quotationData, quotationNumber: generateQuotationNumber() });
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 0 } }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${brandColors.emeraldDark} 0%, ${brandColors.textPrimary} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <IconButton
                onClick={() => navigate('/simulator')}
                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}
              >
                <ArrowLeft size={24} />
              </IconButton>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: `blur(${blurValues.sm})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={28} color="#FFFFFF" />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                  Cotización de Venta
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Diseña y exporta cotizaciones profesionales
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="contained"
                startIcon={<Eye size={18} />}
                onClick={handlePrint}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
              >
                Imprimir
              </Button>
              <Button
                variant="contained"
                startIcon={<Download size={18} />}
                onClick={handleExportPDF}
                sx={{
                  bgcolor: brandColors.emerald,
                  '&:hover': { bgcolor: brandColors.emeraldLight },
                }}
              >
                Exportar PDF
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Configuration Panel */}
        <QuotationConfig
          quotationData={quotationData}
          setQuotationData={setQuotationData}
          onRegenerateNumber={regenerateQuotationNumber}
        />

        {/* Quotation Preview */}
        <Box sx={{ flex: '1 1 500px' }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: brandColors.background,
              border: `1px solid ${brandColors.border}`,
              boxShadow: documentShadows.paper,
              minHeight: 700,
            }}
          >
            <QuotationCertificate
              ref={quotationRef}
              quotationData={quotationData}
            />
          </Paper>
        </Box>
      </Box>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: '100%',
            fontWeight: 600,
            borderRadius: 2,
            boxShadow: documentShadows.elevated,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
