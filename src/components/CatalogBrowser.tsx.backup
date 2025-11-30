/**
 * CatalogBrowser - Sacred catalog showroom
 * Browse and view Tierra Madre PDF catalogs in an immersive experience
 * Features interactive landing page with clickable navigation
 */

import React, { useState } from 'react';
import { Box } from '@mui/material';
import { type CategoryKey } from '../styles/catalogTokens';
import { PDFShowroom } from './PDFShowroom';
import { CatalogHome } from './CatalogHome';

export const CatalogBrowser: React.FC = () => {
  const [showroom, setShowroom] = useState<{
    open: boolean;
    catalogId: CategoryKey;
    pdfUrl: string;
    name: string;
  }>({ open: false, catalogId: 'raw', pdfUrl: '', name: '' });

  const handleCatalogSelect = (pdfUrl: string, name: string) => {
    // Map name to category ID for theming
    const categoryMap: Record<string, CategoryKey> = {
      'Visión Compartida': 'process',
      'Exportadores': 'trust',
      'Acceso Total': 'raw',
      'Tierra Madre': 'power',
      'Embajadores': 'power',
      'Gifts': 'gifts',
    };

    setShowroom({
      open: true,
      catalogId: categoryMap[name] || 'raw',
      pdfUrl,
      name,
    });
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Landing Page with Circular Navigation */}
      <CatalogHome onCatalogSelect={handleCatalogSelect} />

      {/* PDF Showroom Modal */}
      <PDFShowroom
        open={showroom.open}
        onClose={() => setShowroom(prev => ({ ...prev, open: false }))}
        catalogId={showroom.catalogId}
        pdfUrl={showroom.pdfUrl}
        catalogName={showroom.name}
      />
    </Box>
  );
};

export default CatalogBrowser;
