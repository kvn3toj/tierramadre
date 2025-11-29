import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  IconButton,
  alpha,
} from '@mui/material';
import {
  X,
  Award,
  MapPin,
  Heart,
  FileCheck,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { useThemeMode } from '../context/ThemeContext';
import {
  InventoryItem,
  GemologicalCertification,
  ColombianOriginCertification,
  EthicalCertification,
  GemologicalLab,
  ColombianRegion,
} from '../types';

interface CertificationUploadProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem;
  onSave: (certifications: InventoryItem['certifications']) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{ py: 2.5 }}
    >
      {value === index && children}
    </Box>
  );
}

const LABS: GemologicalLab[] = ['GIA', 'IGI', 'CDTEC', 'AGL', 'Gübelin', 'SSEF', 'Other'];
const REGIONS: ColombianRegion[] = ['Muzo', 'Chivor', 'Coscuez', 'Peñas Blancas', 'La Pita', 'Other'];
const CLARITY_GRADES = ['FL', 'IF', 'VVS', 'VS', 'SI', 'I'];
const CUT_GRADES = ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR'];
const TREATMENTS = ['NONE', 'OILED', 'RESIN', 'OTHER'];

export default function CertificationUpload({
  open,
  onClose,
  item,
  onSave,
}: CertificationUploadProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const [activeTab, setActiveTab] = useState(0);

  // Gemological certification state
  const [gemological, setGemological] = useState<Partial<GemologicalCertification>>(
    item.certifications?.gemological || {}
  );

  // Colombian origin state
  const [colombianOrigin, setColombianOrigin] = useState<Partial<ColombianOriginCertification>>(
    item.certifications?.colombianOrigin || { verified: false, region: 'Muzo' }
  );

  // Ethical certification state
  const [ethical, setEthical] = useState<Partial<EthicalCertification>>(
    item.certifications?.ethical || {
      fairTrade: false,
      conflictFree: true,
      environmentalCompliance: false,
    }
  );

  // Certificate image upload
  const [certificateImage, setCertificateImage] = useState<string | undefined>(
    gemological.certificateImage
  );

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCertificateImage(base64);
        setGemological(prev => ({ ...prev, certificateImage: base64 }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSave = () => {
    const certifications: InventoryItem['certifications'] = {};

    // Only include gemological if it has required fields
    if (gemological.lab && gemological.certificateNumber) {
      certifications.gemological = {
        lab: gemological.lab,
        certificateNumber: gemological.certificateNumber,
        reportDate: gemological.reportDate || new Date().toISOString().split('T')[0],
        authenticity: gemological.authenticity || 'PENDING',
        certificateImage: gemological.certificateImage,
        clarity: gemological.clarity as GemologicalCertification['clarity'],
        colorGrade: gemological.colorGrade,
        cutGrade: gemological.cutGrade as GemologicalCertification['cutGrade'],
        treatments: gemological.treatments as GemologicalCertification['treatments'],
        treatmentDetails: gemological.treatmentDetails,
      };
    }

    // Include Colombian origin if verified
    if (colombianOrigin.verified || colombianOrigin.region) {
      certifications.colombianOrigin = {
        verified: colombianOrigin.verified || false,
        region: colombianOrigin.region || 'Muzo',
        mineName: colombianOrigin.mineName,
        certifyingBody: colombianOrigin.certifyingBody,
        certificateNumber: colombianOrigin.certificateNumber,
        verificationDate: colombianOrigin.verificationDate,
      };
    }

    // Include ethical certification
    certifications.ethical = {
      fairTrade: ethical.fairTrade || false,
      conflictFree: ethical.conflictFree !== false, // Default true
      environmentalCompliance: ethical.environmentalCompliance || false,
      certifyingBody: ethical.certifyingBody,
      certificateDate: ethical.certificateDate,
    };

    onSave(certifications);
    onClose();
  };

  const displayName = item.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isLight ? '#FFFFFF' : '#1C1C1E',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
          pb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Certificaciones del Producto
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {displayName} — Estas certificaciones evaluan la esmeralda, no al asesor
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 56,
              },
            }}
          >
            <Tab
              icon={<Award size={18} />}
              iconPosition="start"
              label="Gemologica"
            />
            <Tab
              icon={<MapPin size={18} />}
              iconPosition="start"
              label="Origen"
            />
            <Tab
              icon={<Heart size={18} />}
              iconPosition="start"
              label="Etica"
            />
          </Tabs>
        </Box>

        <Box sx={{ px: 3 }}>
          {/* Gemological Certification Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Certificate Image Upload */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2.5,
                  border: '2px dashed',
                  borderColor: certificateImage
                    ? '#059669'
                    : isLight
                    ? '#E5E7EB'
                    : '#3C3C3E',
                  bgcolor: certificateImage
                    ? alpha('#059669', 0.05)
                    : isLight
                    ? '#F9FAFB'
                    : '#2C2C2E',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#059669',
                  },
                }}
                component="label"
              >
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
                {certificateImage ? (
                  <Box>
                    <Box
                      component="img"
                      src={certificateImage}
                      sx={{
                        maxWidth: '100%',
                        maxHeight: 150,
                        borderRadius: 2,
                        mb: 1,
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#059669' }}>
                      <Check size={14} style={{ verticalAlign: 'middle' }} /> Certificado cargado
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <ImageIcon
                      size={32}
                      color={isLight ? '#9CA3AF' : '#6B7280'}
                      style={{ marginBottom: 8 }}
                    />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Subir imagen del certificado
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      JPG, PNG (max 5MB)
                    </Typography>
                  </Box>
                )}
              </Paper>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Laboratorio</InputLabel>
                  <Select
                    value={gemological.lab || ''}
                    label="Laboratorio"
                    onChange={(e) =>
                      setGemological((prev) => ({ ...prev, lab: e.target.value as GemologicalLab }))
                    }
                  >
                    {LABS.map((lab) => (
                      <MenuItem key={lab} value={lab}>
                        {lab}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  label="No. Certificado"
                  value={gemological.certificateNumber || ''}
                  onChange={(e) =>
                    setGemological((prev) => ({ ...prev, certificateNumber: e.target.value }))
                  }
                  fullWidth
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  label="Fecha del Reporte"
                  type="date"
                  value={gemological.reportDate || ''}
                  onChange={(e) =>
                    setGemological((prev) => ({ ...prev, reportDate: e.target.value }))
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />

                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={gemological.authenticity || 'PENDING'}
                    label="Estado"
                    onChange={(e) =>
                      setGemological((prev) => ({
                        ...prev,
                        authenticity: e.target.value as 'VERIFIED' | 'PENDING' | 'EXPIRED',
                      }))
                    }
                  >
                    <MenuItem value="VERIFIED">Verificado</MenuItem>
                    <MenuItem value="PENDING">Pendiente</MenuItem>
                    <MenuItem value="EXPIRED">Expirado</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mt: 1, color: 'text.secondary' }}
              >
                Caracteristicas Gemologicas
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Claridad</InputLabel>
                  <Select
                    value={gemological.clarity || ''}
                    label="Claridad"
                    onChange={(e) =>
                      setGemological((prev) => ({
                        ...prev,
                        clarity: e.target.value as GemologicalCertification['clarity'],
                      }))
                    }
                  >
                    {CLARITY_GRADES.map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        {grade}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Corte</InputLabel>
                  <Select
                    value={gemological.cutGrade || ''}
                    label="Corte"
                    onChange={(e) =>
                      setGemological((prev) => ({
                        ...prev,
                        cutGrade: e.target.value as GemologicalCertification['cutGrade'],
                      }))
                    }
                  >
                    {CUT_GRADES.map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        {grade.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  label="Grado de Color"
                  value={gemological.colorGrade || ''}
                  onChange={(e) =>
                    setGemological((prev) => ({ ...prev, colorGrade: e.target.value }))
                  }
                  fullWidth
                  placeholder="ej: Medium Green"
                />

                <FormControl fullWidth size="small">
                  <InputLabel>Tratamientos</InputLabel>
                  <Select
                    value={gemological.treatments || ''}
                    label="Tratamientos"
                    onChange={(e) =>
                      setGemological((prev) => ({
                        ...prev,
                        treatments: e.target.value as GemologicalCertification['treatments'],
                      }))
                    }
                  >
                    {TREATMENTS.map((t) => (
                      <MenuItem key={t} value={t}>
                        {t === 'NONE' ? 'Sin tratamiento' : t}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </TabPanel>

          {/* Colombian Origin Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  bgcolor: colombianOrigin.verified
                    ? alpha('#059669', 0.08)
                    : isLight
                    ? '#F9FAFB'
                    : '#2C2C2E',
                  border: '1px solid',
                  borderColor: colombianOrigin.verified
                    ? '#059669'
                    : isLight
                    ? '#E5E7EB'
                    : '#3C3C3E',
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={colombianOrigin.verified || false}
                      onChange={(e) =>
                        setColombianOrigin((prev) => ({ ...prev, verified: e.target.checked }))
                      }
                      color="success"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Origen Colombiano Verificado
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Confirma que la esmeralda proviene de Colombia
                      </Typography>
                    </Box>
                  }
                />
              </Paper>

              <FormControl fullWidth size="small">
                <InputLabel>Region de Origen</InputLabel>
                <Select
                  value={colombianOrigin.region || 'Muzo'}
                  label="Region de Origen"
                  onChange={(e) =>
                    setColombianOrigin((prev) => ({
                      ...prev,
                      region: e.target.value as ColombianRegion,
                    }))
                  }
                >
                  {REGIONS.map((region) => (
                    <MenuItem key={region} value={region}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MapPin size={14} />
                        {region}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="Nombre de la Mina"
                value={colombianOrigin.mineName || ''}
                onChange={(e) =>
                  setColombianOrigin((prev) => ({ ...prev, mineName: e.target.value }))
                }
                fullWidth
                placeholder="ej: Mina La Pita"
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  label="Entidad Certificadora"
                  value={colombianOrigin.certifyingBody || ''}
                  onChange={(e) =>
                    setColombianOrigin((prev) => ({ ...prev, certifyingBody: e.target.value }))
                  }
                  fullWidth
                  placeholder="ej: CDTEC"
                />

                <TextField
                  size="small"
                  label="No. Certificado"
                  value={colombianOrigin.certificateNumber || ''}
                  onChange={(e) =>
                    setColombianOrigin((prev) => ({ ...prev, certificateNumber: e.target.value }))
                  }
                  fullWidth
                />
              </Box>

              <TextField
                size="small"
                label="Fecha de Verificacion"
                type="date"
                value={colombianOrigin.verificationDate || ''}
                onChange={(e) =>
                  setColombianOrigin((prev) => ({ ...prev, verificationDate: e.target.value }))
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </TabPanel>

          {/* Ethical Certification Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Certificaciones eticas y de sostenibilidad para la esmeralda.
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: ethical.conflictFree
                    ? alpha('#059669', 0.08)
                    : isLight
                    ? '#F9FAFB'
                    : '#2C2C2E',
                  border: '1px solid',
                  borderColor: ethical.conflictFree
                    ? '#059669'
                    : isLight
                    ? '#E5E7EB'
                    : '#3C3C3E',
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={ethical.conflictFree !== false}
                      onChange={(e) =>
                        setEthical((prev) => ({ ...prev, conflictFree: e.target.checked }))
                      }
                      color="success"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Libre de Conflictos
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Certifica que la esmeralda no financia conflictos armados
                      </Typography>
                    </Box>
                  }
                />
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: ethical.fairTrade
                    ? alpha('#3B82F6', 0.08)
                    : isLight
                    ? '#F9FAFB'
                    : '#2C2C2E',
                  border: '1px solid',
                  borderColor: ethical.fairTrade
                    ? '#3B82F6'
                    : isLight
                    ? '#E5E7EB'
                    : '#3C3C3E',
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={ethical.fairTrade || false}
                      onChange={(e) =>
                        setEthical((prev) => ({ ...prev, fairTrade: e.target.checked }))
                      }
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Comercio Justo
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Precio justo para mineros y cortadores
                      </Typography>
                    </Box>
                  }
                />
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: ethical.environmentalCompliance
                    ? alpha('#10B981', 0.08)
                    : isLight
                    ? '#F9FAFB'
                    : '#2C2C2E',
                  border: '1px solid',
                  borderColor: ethical.environmentalCompliance
                    ? '#10B981'
                    : isLight
                    ? '#E5E7EB'
                    : '#3C3C3E',
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={ethical.environmentalCompliance || false}
                      onChange={(e) =>
                        setEthical((prev) => ({ ...prev, environmentalCompliance: e.target.checked }))
                      }
                      color="success"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Cumplimiento Ambiental
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Extraccion con practicas sostenibles
                      </Typography>
                    </Box>
                  }
                />
              </Paper>

              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField
                  size="small"
                  label="Entidad Certificadora"
                  value={ethical.certifyingBody || ''}
                  onChange={(e) =>
                    setEthical((prev) => ({ ...prev, certifyingBody: e.target.value }))
                  }
                  fullWidth
                  placeholder="ej: Responsible Jewellery Council"
                />

                <TextField
                  size="small"
                  label="Fecha Certificacion"
                  type="date"
                  value={ethical.certificateDate || ''}
                  onChange={(e) =>
                    setEthical((prev) => ({ ...prev, certificateDate: e.target.value }))
                  }
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Box>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: isLight ? '#E5E7EB' : '#2C2C2E',
        }}
      >
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<FileCheck size={18} />}
          sx={{
            bgcolor: '#059669',
            '&:hover': { bgcolor: '#047857' },
          }}
        >
          Guardar Certificaciones
        </Button>
      </DialogActions>
    </Dialog>
  );
}
