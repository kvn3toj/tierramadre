import { useState } from 'react';
import Layout from './components/Layout';
import Gallery from './components/Gallery';
import EmeraldUploader from './components/EmeraldUploader';
import CalendarGrid from './components/CalendarGrid';
import PDFExport from './components/PDFExport';

export type TabValue = 'upload' | 'gallery' | 'calendar' | 'catalog';

function App() {
  const [currentTab, setCurrentTab] = useState<TabValue>('gallery');

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
      default:
        return <Gallery />;
    }
  };

  return (
    <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
