import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import { X, Award, MapPin, Heart, FileCheck } from 'lucide-react';
import { useThemeMode } from '../../../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../../../design-system/tokens/colors';
import {
  TreasureItem,
  GemologicalCertification,
  ColombianOriginCertification,
  EthicalCertification,
} from '../../../types';
import GemologicalTab from './GemologicalTab';
import ColombianOriginTab from './ColombianOriginTab';
import EthicalTab from './EthicalTab';
import type { CertificationUploadProps } from './types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ py: 2.5 }}>
      {value === index && children}
    </Box>
  );
}

export default function CertificationUpload({
  open,
  onClose,
  item,
  onSave,
}: CertificationUploadProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  const [activeTab, setActiveTab] = useState(0);

  const [gemological, setGemological] = useState<Partial<GemologicalCertification>>(
    item.certifications?.gemological || {}
  );

  const [colombianOrigin, setColombianOrigin] = useState<Partial<ColombianOriginCertification>>(
    item.certifications?.colombianOrigin || { verified: false, region: 'Muzo' }
  );

  const [ethical, setEthical] = useState<Partial<EthicalCertification>>(
    item.certifications?.ethical || {
      fairTrade: false,
      conflictFree: true,
      environmentalCompliance: false,
    }
  );

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
    const certifications: TreasureItem['certifications'] = {};

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

    certifications.ethical = {
      fairTrade: ethical.fairTrade || false,
      conflictFree: ethical.conflictFree !== false,
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
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
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
            <Tab icon={<Award size={18} />} iconPosition="start" label="Gemológica" />
            <Tab icon={<MapPin size={18} />} iconPosition="start" label="Origen" />
            <Tab icon={<Heart size={18} />} iconPosition="start" label="Ética" />
          </Tabs>
        </Box>

        <Box sx={{ px: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <GemologicalTab
              gemological={gemological}
              setGemological={setGemological}
              certificateImage={certificateImage}
              onImageUpload={handleImageUpload}
              isLight={isLight}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <ColombianOriginTab
              colombianOrigin={colombianOrigin}
              setColombianOrigin={setColombianOrigin}
              isLight={isLight}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <EthicalTab
              ethical={ethical}
              setEthical={setEthical}
              isLight={isLight}
            />
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
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
            bgcolor: emeraldCore.dark,
            '&:hover': { bgcolor: emeraldCore.darker },
          }}
        >
          Guardar Certificaciones
        </Button>
      </DialogActions>
    </Dialog>
  );
}
