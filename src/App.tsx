import { useState, useCallback } from 'react';
import { Dialog, DialogContent, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { X } from 'lucide-react';
import Layout from './components/Layout';
import Gallery from './components/Gallery';
import EmeraldUploader from './components/EmeraldUploader';
import CalendarGrid from './components/CalendarGrid';
import PDFExport from './components/PDFExport';
import ImageNormalizer from './components/ImageNormalizer';
import ReceiptGenerator from './components/ReceiptGenerator';
import PriceSimulator from './components/PriceSimulator';
import PinLock from './components/PinLock';
import { SlidePreview } from './components/slides';
import { CatalogBrowser } from './components/CatalogBrowser';
import InventoryBrowser from './components/InventoryBrowser';
import { AmbassadorDirectory, AmbassadorProfile } from './components/ambassador';
import { AmbassadorProfile as AmbassadorProfileType } from './types/ambassador';

// Primary tabs (always visible) + secondary tabs (in "More" menu)
export type TabValue = 'gallery' | 'upload' | 'catalog' | 'calendar' | 'slides' | 'normalizer' | 'receipts' | 'biblioteca' | 'simulator' | 'inventory' | 'ambassadors';

// Tab categories for navigation logic
export const PRIMARY_TABS: TabValue[] = ['gallery', 'upload', 'inventory', 'ambassadors', 'catalog', 'calendar'];
export const SECONDARY_TABS: TabValue[] = ['slides', 'normalizer', 'receipts', 'biblioteca', 'simulator'];

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [currentTab, setCurrentTab] = useState<TabValue>('gallery');
  const [isUnlocked, setIsUnlocked] = useState(() => {
    // Check if already authenticated in this session
    return sessionStorage.getItem('tierra-madre-auth') === 'true';
  });
  const [selectedAmbassador, setSelectedAmbassador] = useState<AmbassadorProfileType | null>(null);

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true);
  }, []);

  const handleViewAmbassadorProfile = useCallback((ambassador: AmbassadorProfileType) => {
    setSelectedAmbassador(ambassador);
  }, []);

  const handleCloseAmbassadorProfile = useCallback(() => {
    setSelectedAmbassador(null);
  }, []);

  const handleContactAmbassador = useCallback((ambassador: AmbassadorProfileType) => {
    // Find WhatsApp contact
    const whatsapp = ambassador.contactMethods.find(c => c.type === 'whatsapp');
    if (whatsapp) {
      const message = encodeURIComponent(`Hola ${ambassador.displayName}, me gustaría conocer más sobre tus esmeraldas en Tierra Madre.`);
      window.open(`https://wa.me/${whatsapp.value.replace(/\D/g, '')}?text=${message}`, '_blank');
    } else {
      // Fallback to email
      const email = ambassador.contactMethods.find(c => c.type === 'email');
      if (email) {
        window.open(`mailto:${email.value}?subject=Consulta desde Tierra Madre`, '_blank');
      }
    }
  }, []);

  const renderContent = () => {
    switch (currentTab) {
      case 'upload':
        return <EmeraldUploader onComplete={() => setCurrentTab('gallery')} />;
      case 'gallery':
        return <Gallery />;
      case 'calendar':
        return <CalendarGrid />;
      case 'catalog':
        return <PDFExport />;
      case 'normalizer':
        return <ImageNormalizer />;
      case 'slides':
        return <SlidePreview />;
      case 'receipts':
        return <ReceiptGenerator />;
      case 'biblioteca':
        return <CatalogBrowser />;
      case 'simulator':
        return <PriceSimulator />;
      case 'inventory':
        return <InventoryBrowser />;
      case 'ambassadors':
        return (
          <AmbassadorDirectory
            onViewProfile={handleViewAmbassadorProfile}
            onContact={handleContactAmbassador}
          />
        );
      default:
        return <Gallery />;
    }
  };

  // Show PIN lock screen if not authenticated
  if (!isUnlocked) {
    return <PinLock onUnlock={handleUnlock} />;
  }

  return (
    <>
      <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
        {renderContent()}
      </Layout>

      {/* Ambassador Profile Dialog */}
      <Dialog
        open={!!selectedAmbassador}
        onClose={handleCloseAmbassadorProfile}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 4,
            maxHeight: isMobile ? '100%' : '90vh',
          },
        }}
      >
        <IconButton
          onClick={handleCloseAmbassadorProfile}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            zIndex: 10,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': { bgcolor: 'background.paper' },
          }}
        >
          <X size={20} />
        </IconButton>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          {selectedAmbassador && (
            <AmbassadorProfile
              ambassador={selectedAmbassador}
              onBack={handleCloseAmbassadorProfile}
              onContact={handleContactAmbassador}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default App;
