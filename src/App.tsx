import { useState, useCallback } from 'react';
import Layout from './components/Layout';
import Gallery from './components/Gallery';
import EmeraldUploader from './components/EmeraldUploader';
import CalendarGrid from './components/CalendarGrid';
import PDFExport from './components/PDFExport';
import ImageNormalizer from './components/ImageNormalizer';
import ReceiptGenerator from './components/ReceiptGenerator';
import PinLock from './components/PinLock';
import { SlidePreview } from './components/slides';

export type TabValue = 'upload' | 'gallery' | 'calendar' | 'catalog' | 'normalizer' | 'slides' | 'receipts';

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
