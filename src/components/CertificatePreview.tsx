/**
 * TIERRA MADRE - Certificate Preview & Generator
 * Professional gemstone certificate with GIA-style design
 * Beautiful frontend design first, then export to PDF
 */

import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  InputAdornment,
  Slider,
  Chip,
} from '@mui/material';
import {
  Award,
  Download,
  Settings,
  Gem,
  Shield,
  MapPin,
  Sparkles,
  Eye,
  RefreshCw,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Brand colors
const brandColors = {
  emerald: '#10B981',
  emeraldDark: '#064E3B',
  emeraldLight: '#34D399',
  gold: '#B48E49',
  goldLight: '#D4AF37',
  slate: '#0F172A',
  cream: '#FAF9F6',
  gray: '#64748B',
  lightGray: '#F1F5F9',
};

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Generate certificate number
const generateCertNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Date.now()).slice(-6);
  return `TM-${year}${month}${day}-${random}`;
};

// Color grade options
const colorGrades = [
  { value: 'vivid', label: 'Verde Vívido', en: 'Vivid Green' },
  { value: 'intense', label: 'Verde Intenso', en: 'Intense Green' },
  { value: 'medium', label: 'Verde Medio', en: 'Medium Green' },
  { value: 'light', label: 'Verde Claro', en: 'Light Green' },
];

// Clarity grades
const clarityGrades = [
  { value: 'VVS', label: 'VVS', desc: 'Muy Muy Leve' },
  { value: 'VS', label: 'VS', desc: 'Muy Leve' },
  { value: 'SI', label: 'SI', desc: 'Leve Inclusión' },
  { value: 'I', label: 'I', desc: 'Incluido' },
];

// Cut types
const cutTypes = [
  { value: 'emerald', label: 'Esmeralda', en: 'Emerald Cut' },
  { value: 'oval', label: 'Oval', en: 'Oval Cut' },
  { value: 'round', label: 'Redonda', en: 'Round Cut' },
  { value: 'pear', label: 'Pera', en: 'Pear Cut' },
  { value: 'cushion', label: 'Cojín', en: 'Cushion Cut' },
];

// Treatment options
const treatmentOptions = [
  { value: 'none', label: 'Sin Tratamiento', en: 'None' },
  { value: 'minor', label: 'Aceite Menor', en: 'Minor Oil' },
  { value: 'moderate', label: 'Aceite Moderado', en: 'Moderate Oil' },
  { value: 'significant', label: 'Aceite Significativo', en: 'Significant Oil' },
];

interface CertificateData {
  certNumber: string;
  gemName: string;
  caratWeight: number;
  colorGrade: string;
  clarityGrade: string;
  cutType: string;
  treatment: string;
  origin: string;
  price: number;
  date: string;
  validDays: number;
}

export default function CertificatePreview() {
  const certificateRef = useRef<HTMLDivElement>(null);

  const [certData, setCertData] = useState<CertificateData>({
    certNumber: generateCertNumber(),
    gemName: 'Esmeralda Natural',
    caratWeight: 2.5,
    colorGrade: 'vivid',
    clarityGrade: 'VS',
    cutType: 'emerald',
    treatment: 'minor',
    origin: 'Colombia - Muzo',
    price: 2500000,
    date: new Date().toISOString().split('T')[0],
    validDays: 30,
  });

  // Get label helpers
  const getColorLabel = () => colorGrades.find(c => c.value === certData.colorGrade);
  const getClarityLabel = () => clarityGrades.find(c => c.value === certData.clarityGrade);
  const getCutLabel = () => cutTypes.find(c => c.value === certData.cutType);
  const getTreatmentLabel = () => treatmentOptions.find(t => t.value === certData.treatment);

  // Export to PDF
  const handleExportPDF = async () => {
    if (!certificateRef.current) return;

    const canvas = await html2canvas(certificateRef.current, {
      scale: 2,
      backgroundColor: brandColors.slate,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const xOffset = 10;
    const yOffset = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
    pdf.save(`Certificado_${certData.certNumber}.pdf`);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Regenerate cert number
  const regenerateCertNumber = () => {
    setCertData({ ...certData, certNumber: generateCertNumber() });
  };

  // Calculate expiry date
  const expiryDate = new Date(certData.date);
  expiryDate.setDate(expiryDate.getDate() + certData.validDays);
  const expiryStr = expiryDate.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 0 } }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${brandColors.emeraldDark} 0%, ${brandColors.slate} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={28} color="#FFFFFF" />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                  Certificado de Autenticidad
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Diseña y exporta certificados profesionales estilo GIA
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
        <Paper
          elevation={0}
          sx={{
            flex: '1 1 350px',
            maxWidth: { xs: '100%', md: 400 },
            p: 3,
            borderRadius: 3,
            border: '1px solid #E5E7EB',
            bgcolor: '#FFFFFF',
            maxHeight: 'calc(100vh - 250px)',
            overflowY: 'auto',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Settings size={20} color={brandColors.emerald} />
            <Typography sx={{ fontWeight: 700, color: brandColors.slate }}>
              Configuración del Certificado
            </Typography>
          </Box>

          {/* Basic Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: brandColors.gray, mb: 1.5, fontWeight: 600 }}>
              Información Básica
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="No. Certificado"
                value={certData.certNumber}
                onChange={(e) => setCertData({ ...certData, certNumber: e.target.value })}
                size="small"
              />
              <IconButton onClick={regenerateCertNumber} sx={{ color: brandColors.emerald }}>
                <RefreshCw size={18} />
              </IconButton>
            </Box>

            <TextField
              fullWidth
              label="Nombre de la Gema"
              value={certData.gemName}
              onChange={(e) => setCertData({ ...certData, gemName: e.target.value })}
              size="small"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Origen"
              value={certData.origin}
              onChange={(e) => setCertData({ ...certData, origin: e.target.value })}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MapPin size={16} color={brandColors.gray} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 4Cs Grading */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: brandColors.gray, mb: 1.5, fontWeight: 600 }}>
              Evaluación Gemológica (4Cs)
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: brandColors.gray }}>
                Quilates: {certData.caratWeight} ct
              </Typography>
              <Slider
                value={certData.caratWeight}
                onChange={(_, v) => setCertData({ ...certData, caratWeight: v as number })}
                min={0.1}
                max={20}
                step={0.1}
                sx={{ color: brandColors.emerald }}
              />
            </Box>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Color</InputLabel>
              <Select
                value={certData.colorGrade}
                label="Color"
                onChange={(e) => setCertData({ ...certData, colorGrade: e.target.value })}
              >
                {colorGrades.map((c) => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Claridad</InputLabel>
              <Select
                value={certData.clarityGrade}
                label="Claridad"
                onChange={(e) => setCertData({ ...certData, clarityGrade: e.target.value })}
              >
                {clarityGrades.map((c) => (
                  <MenuItem key={c.value} value={c.value}>{c.label} - {c.desc}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Talla</InputLabel>
              <Select
                value={certData.cutType}
                label="Talla"
                onChange={(e) => setCertData({ ...certData, cutType: e.target.value })}
              >
                {cutTypes.map((c) => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Tratamiento</InputLabel>
              <Select
                value={certData.treatment}
                label="Tratamiento"
                onChange={(e) => setCertData({ ...certData, treatment: e.target.value })}
              >
                {treatmentOptions.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Price & Validity */}
          <Box>
            <Typography variant="subtitle2" sx={{ color: brandColors.gray, mb: 1.5, fontWeight: 600 }}>
              Precio y Validez
            </Typography>

            <TextField
              fullWidth
              label="Precio (COP)"
              type="number"
              value={certData.price}
              onChange={(e) => setCertData({ ...certData, price: Number(e.target.value) })}
              size="small"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label="Fecha de Emisión"
              type="date"
              value={certData.date}
              onChange={(e) => setCertData({ ...certData, date: e.target.value })}
              size="small"
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />

            <Box>
              <Typography variant="caption" sx={{ color: brandColors.gray }}>
                Días de validez: {certData.validDays}
              </Typography>
              <Slider
                value={certData.validDays}
                onChange={(_, v) => setCertData({ ...certData, validDays: v as number })}
                min={7}
                max={90}
                step={1}
                sx={{ color: brandColors.gold }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Certificate Preview */}
        <Box sx={{ flex: '1 1 500px' }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: brandColors.slate,
              minHeight: 700,
            }}
          >
            {/* The Certificate */}
            <Box
              ref={certificateRef}
              sx={{
                bgcolor: brandColors.slate,
                p: 1.5,
                borderRadius: 2,
              }}
            >
              {/* Gold outer border */}
              <Box
                sx={{
                  border: `2px solid ${brandColors.gold}`,
                  borderRadius: 1,
                  p: 0.5,
                }}
              >
                {/* Emerald inner border */}
                <Box
                  sx={{
                    border: `1px solid ${brandColors.emerald}`,
                    borderRadius: 0.5,
                  }}
                >
                  {/* White certificate area */}
                  <Box
                    sx={{
                      bgcolor: brandColors.cream,
                      p: 3,
                      minHeight: 650,
                    }}
                  >
                    {/* Certificate Number (top right) */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.6rem', color: brandColors.gray, letterSpacing: 1 }}>
                          CERTIFICADO No.
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: brandColors.slate }}>
                          {certData.certNumber}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Logo & Brand */}
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          mx: 'auto',
                          mb: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src="/logo-tierra-madre.png"
                          alt="Tierra Madre"
                          style={{ maxWidth: '100%', maxHeight: '100%' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </Box>

                      <Typography
                        sx={{
                          fontSize: '1.5rem',
                          fontWeight: 800,
                          color: brandColors.emeraldDark,
                          letterSpacing: 2,
                        }}
                      >
                        TIERRA MADRE
                      </Typography>
                      <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray, letterSpacing: 3 }}>
                        COLOMBIAN EMERALDS • EST. 2024
                      </Typography>

                      {/* Decorative lines */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Box sx={{ width: 60, height: 1, bgcolor: brandColors.gold }} />
                        <Gem size={12} color={brandColors.emerald} />
                        <Box sx={{ width: 60, height: 1, bgcolor: brandColors.gold }} />
                      </Box>
                    </Box>

                    {/* Title Bar */}
                    <Box
                      sx={{
                        bgcolor: brandColors.emeraldDark,
                        py: 1,
                        px: 2,
                        borderRadius: 0.5,
                        mb: 2,
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          letterSpacing: 2,
                        }}
                      >
                        CERTIFICADO DE AUTENTICIDAD Y COTIZACIÓN
                      </Typography>
                    </Box>

                    {/* Date */}
                    <Typography sx={{ textAlign: 'center', fontSize: '0.65rem', color: brandColors.gray, mb: 2 }}>
                      Fecha de emisión: {new Date(certData.date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>

                    {/* Gem Info Section */}
                    <Box sx={{ borderTop: `1px solid ${brandColors.lightGray}`, pt: 1.5, mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: brandColors.emeraldDark }}>
                          INFORMACIÓN DE LA GEMA
                        </Typography>
                        <Chip
                          label="ORIGEN COLOMBIANO"
                          size="small"
                          sx={{
                            bgcolor: brandColors.emerald,
                            color: '#fff',
                            fontSize: '0.5rem',
                            height: 20,
                            fontWeight: 700,
                          }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {/* Gem Icon */}
                        <Box
                          sx={{
                            width: 50,
                            height: 60,
                            bgcolor: brandColors.emerald,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                          }}
                        >
                          <Sparkles size={24} color="#fff" />
                        </Box>

                        <Box>
                          <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: brandColors.slate }}>
                            {certData.gemName.toUpperCase()}
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: brandColors.gray }}>
                            Esmeralda Natural Colombiana
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <MapPin size={12} color={brandColors.gray} />
                            <Typography sx={{ fontSize: '0.65rem', color: brandColors.gray }}>
                              {certData.origin}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* 4Cs Grid */}
                    <Box sx={{ borderTop: `1px solid ${brandColors.lightGray}`, pt: 1.5, mb: 2 }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: brandColors.emeraldDark, mb: 1 }}>
                        EVALUACIÓN GEMOLÓGICA (4Cs)
                      </Typography>

                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                        {[
                          { label: 'COLOR', value: getColorLabel()?.label || '', sub: getColorLabel()?.en || '' },
                          { label: 'CLARIDAD', value: certData.clarityGrade, sub: getClarityLabel()?.desc || '' },
                          { label: 'TALLA', value: getCutLabel()?.label || '', sub: getCutLabel()?.en || '' },
                          { label: 'QUILATES', value: `${certData.caratWeight} ct`, sub: 'Carat Weight' },
                        ].map((item) => (
                          <Box
                            key={item.label}
                            sx={{
                              bgcolor: brandColors.lightGray,
                              borderRadius: 0.5,
                              p: 1,
                              textAlign: 'center',
                            }}
                          >
                            <Typography sx={{ fontSize: '0.5rem', color: brandColors.gray, fontWeight: 600, letterSpacing: 1 }}>
                              {item.label}
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: brandColors.slate }}>
                              {item.value}
                            </Typography>
                            <Typography sx={{ fontSize: '0.5rem', color: brandColors.gray }}>
                              {item.sub}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* Treatment & Characteristics */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: brandColors.emeraldDark, mb: 0.5 }}>
                          TRATAMIENTO
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.slate }}>
                          {getTreatmentLabel()?.label}
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray }}>
                          {getTreatmentLabel()?.en} - Estándar industria
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: brandColors.emeraldDark, mb: 0.5 }}>
                          CARACTERÍSTICAS
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: brandColors.slate }}>
                          Inclusiones "Jardín"
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray }}>
                          Características naturales únicas
                        </Typography>
                      </Box>
                    </Box>

                    {/* Price Box */}
                    <Box
                      sx={{
                        bgcolor: brandColors.emerald,
                        borderRadius: 1,
                        p: 2,
                        textAlign: 'center',
                        mb: 2,
                      }}
                    >
                      <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', mb: 0.5 }}>
                        VALOR TOTAL DE LA PIEZA
                      </Typography>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                        {formatCurrency(certData.price)}
                      </Typography>
                    </Box>

                    {/* Includes */}
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: brandColors.emeraldDark, mb: 0.5 }}>
                        INCLUYE
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                        {[
                          'Certificado de autenticidad',
                          'Garantía de origen colombiano',
                          'Evaluación gemológica',
                          'Estuche premium',
                        ].map((item) => (
                          <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Shield size={10} color={brandColors.emerald} />
                            <Typography sx={{ fontSize: '0.55rem', color: brandColors.slate }}>
                              {item}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* Validity */}
                    <Box sx={{ borderTop: `1px solid ${brandColors.lightGray}`, pt: 1, mb: 2 }}>
                      <Typography sx={{ textAlign: 'center', fontSize: '0.5rem', color: brandColors.gray }}>
                        Este certificado es válido hasta: {expiryStr}
                      </Typography>
                      <Typography sx={{ textAlign: 'center', fontSize: '0.45rem', color: brandColors.gray }}>
                        Los precios están sujetos a disponibilidad. Certificado verificable en nuestra plataforma.
                      </Typography>
                    </Box>

                    {/* Footer */}
                    <Box
                      sx={{
                        borderTop: `1px solid ${brandColors.gold}`,
                        pt: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      {/* QR Placeholder */}
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          border: `1px solid ${brandColors.lightGray}`,
                          borderRadius: 0.5,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 1fr)',
                          gap: '1px',
                          p: 0.5,
                        }}
                      >
                        {Array(25).fill(0).map((_, i) => (
                          <Box
                            key={i}
                            sx={{
                              bgcolor: (i + Math.floor(i / 5)) % 2 === 0 ? brandColors.slate : 'transparent',
                              borderRadius: '1px',
                            }}
                          />
                        ))}
                      </Box>

                      {/* Contact */}
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography sx={{ fontSize: '0.55rem', color: brandColors.gray }}>
                          www.tierramadre.co • contacto@tierramadre.co • +57 (1) 234 5678
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: brandColors.emeraldDark, mt: 0.5 }}>
                          TIERRA MADRE
                        </Typography>
                      </Box>

                      {/* Seal */}
                      <Box
                        sx={{
                          width: 45,
                          height: 45,
                          borderRadius: '50%',
                          border: `2px solid ${brandColors.gold}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: brandColors.emerald,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Shield size={16} color="#fff" />
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
