/**
 * ProductEntrySection Component
 * Orchestrator for adding products — delegates to TreasureProductSelector
 * (inventory mode) and ManualProductForm (manual entry mode).
 */

import React from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
} from '@mui/material';
import { Package, FileText } from 'lucide-react';
import { brandColors } from '../constants';
import type { ProductEntrySectionProps } from '../types';
import { TreasureProductSelector } from './TreasureProductSelector';
import { ManualProductForm } from './ManualProductForm';

export const ProductEntrySection: React.FC<ProductEntrySectionProps> = ({
  productEntryMode,
  setProductEntryMode,
  availableTreasure,
  selectedItem,
  setSelectedItem,
  handleAddProduct,
  manualProduct,
  setManualProduct,
  handleAddManualProduct,
  isUploadingImage,
  imagePreview,
  setImagePreview,
  isVideoPreview,
  setIsVideoPreview,
  onImageUpload,
  canUseManualEntry = false,
  isEditing,
  onCancelEdit,
}) => (
  <Box sx={{ mb: 2 }}>
    <Typography
      variant="subtitle2"
      sx={{
        color: 'text.primary',
        mb: 1.5,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: 700,
        fontSize: '0.875rem',
      }}
    >
      Agregar Producto
    </Typography>

    {canUseManualEntry ? (
      <ToggleButtonGroup
        value={productEntryMode}
        exclusive
        onChange={(_, value) => value && setProductEntryMode(value)}
        size="small"
        sx={{ mb: 2, width: '100%' }}
      >
        <ToggleButton
          value="treasure"
          sx={{
            flex: 1,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.75rem',
            '&.Mui-selected': {
              bgcolor: alpha(brandColors.emerald, 0.1),
              color: brandColors.emerald,
            },
          }}
        >
          <Package size={14} style={{ marginRight: 6 }} />
          Desde Tesoros
        </ToggleButton>
        <ToggleButton
          value="manual"
          sx={{
            flex: 1,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.75rem',
            '&.Mui-selected': {
              bgcolor: alpha(brandColors.gold, 0.15),
              color: brandColors.gold,
            },
          }}
        >
          <FileText size={14} style={{ marginRight: 6 }} />
          Entrada Manual
        </ToggleButton>
      </ToggleButtonGroup>
    ) : null}

    {productEntryMode === 'treasure' && (
      <TreasureProductSelector
        availableTreasure={availableTreasure}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        handleAddProduct={handleAddProduct}
      />
    )}

    {productEntryMode === 'manual' && canUseManualEntry && (
      <ManualProductForm
        manualProduct={manualProduct}
        setManualProduct={setManualProduct}
        handleAddManualProduct={handleAddManualProduct}
        isUploadingImage={isUploadingImage}
        imagePreview={imagePreview}
        setImagePreview={setImagePreview}
        isVideoPreview={isVideoPreview}
        setIsVideoPreview={setIsVideoPreview}
        onImageUpload={onImageUpload}
        isEditing={isEditing}
        onCancelEdit={onCancelEdit}
      />
    )}
  </Box>
);

export default ProductEntrySection;
