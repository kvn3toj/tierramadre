import { useState, useCallback } from 'react';
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

// Primary tabs (always visible) + secondary tabs (in "More" menu)
export type TabValue = 'gallery' | 'upload' | 'catalog' | 'calendar' | 'slides' | 'normalizer' | 'receipts' | 'biblioteca' | 'simulator';

// Tab categories for navigation logic
export const PRIMARY_TABS: TabValue[] = ['gallery', 'upload', 'catalog', 'calendar'];
export const SECONDARY_TABS: TabValue[] = ['slides', 'normalizer', 'receipts', 'biblioteca', 'simulator'];

function App() {
  const [currentTab, setCurrentTab] = useState<TabValue>('gallery');
  const [isUnlocked, setIsUnlocked] = useState(() => {
    // Check if already authenticated in this session
    return sessionStorage.getItem('tierra-madre-auth') === 'true';
  });

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true);
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
      default:
        return <Gallery />;
    }
  };

  // Show PIN lock screen if not authenticated
  if (!isUnlocked) {
    return <PinLock onUnlock={handleUnlock} />;
  }

  return (
    <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
