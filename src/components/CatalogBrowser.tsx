/**
 * CatalogBrowser - Sacred catalog showroom
 * Browse and view Tierra Madre PDF catalogs in an immersive experience
 * Uses Cloudinary for fast image-based viewing with PDF.js fallback
 */

import React, { useState } from 'react';
import { Box } from '@mui/material';
import { type CategoryKey } from '../styles/catalogTokens';
import { PDFShowroom } from './PDFShowroom';
import { CloudinaryShowroom, CLOUDINARY_CATALOGS } from './CloudinaryShowroom';
import { CatalogHome } from './CatalogHome';

// Map catalog names to Cloudinary IDs
const NAME_TO_CLOUDINARY_ID: Record<string, string> = {
  'Visión Compartida': 'vision-compartida',
  'Exportadores': 'exportadores',
  'Acceso Total': 'acceso-total',
  'Tierra Madre': 'tierra-madre',
  'Embajadores': 'embajadores',
  'Gifts': 'gifts',
};

// Feature flag: set to true once PDFs are uploaded to Cloudinary
const USE_CLOUDINARY = true;

export const CatalogBrowser: React.FC = () => {
  const [showroom, setShowroom] = useState<{
    open: boolean;
    catalogId: CategoryKey;
    cloudinaryId: string;
    pdfUrl: string;
    name: string;
    useCloudinary: boolean;
  }>({
    open: false,
    catalogId: 'raw',
    cloudinaryId: '',
    pdfUrl: '',
    name: '',
    useCloudinary: false,
  });

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

    // Check if this catalog is available on Cloudinary
    const cloudinaryId = NAME_TO_CLOUDINARY_ID[name];
    const hasCloudinary = Boolean(USE_CLOUDINARY && cloudinaryId && CLOUDINARY_CATALOGS[cloudinaryId]);

    setShowroom({
      open: true,
      catalogId: categoryMap[name] || 'raw',
      cloudinaryId: cloudinaryId || '',
      pdfUrl,
      name,
      useCloudinary: hasCloudinary,
    });
  };

  const handleClose = () => {
    setShowroom(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Landing Page with Catalog Grid */}
      <CatalogHome onCatalogSelect={handleCatalogSelect} />

      {/* Cloudinary-based Showroom (fast, image-based) */}
      {showroom.useCloudinary && (
        <CloudinaryShowroom
          open={showroom.open}
          onClose={handleClose}
          catalogId={showroom.cloudinaryId}
          catalogName={showroom.name}
        />
      )}

      {/* PDF.js-based Showroom (fallback) */}
      {!showroom.useCloudinary && (
        <PDFShowroom
          open={showroom.open}
          onClose={handleClose}
          catalogId={showroom.catalogId}
          pdfUrl={showroom.pdfUrl}
          catalogName={showroom.name}
        />
      )}
    </Box>
  );
};

export default CatalogBrowser;
