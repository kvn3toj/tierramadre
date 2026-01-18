/**
 * ProductEntrySection Component
 * Form section for adding products from treasure or manual entry.
 */

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  Avatar,
  Chip,
  alpha,
} from '@mui/material';
import {
  Plus,
  Package,
  FileText,
  Gem,
  ShoppingBag,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Video,
} from 'lucide-react';
import { brandColors } from '../constants';
import { formatCotizacionCurrency, getPesoDisplay } from '../../../hooks/useCotizacion';
import type { ProductEntrySectionProps } from '../types';

const formatCurrency = formatCotizacionCurrency;

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
}) => (
  <Box sx={{ mb: 2 }}>
    <Typography
      variant="subtitle2"
      sx={{
        color: brandColors.textPrimary,
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
      <>
        <Autocomplete
          size="small"
          options={availableTreasure}
          getOptionLabel={(option) => `#${option.item} - ${option.nombre}`}
          value={selectedItem}
          onChange={(_, item) => setSelectedItem(item)}
          filterOptions={(options, { inputValue }) => {
            const term = inputValue.toLowerCase();
            return options.filter(
              (o) =>
                o.nombre.toLowerCase().includes(term) ||
                o.item.toString().includes(term) ||
                o.color.toLowerCase().includes(term)
            );
          }}
          renderOption={(props, option) => (
            <Box
              component="li"
              {...props}
              sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1 }}
            >
              <Avatar
                src={option.imagen}
                variant="rounded"
                sx={{ width: 48, height: 48, bgcolor: brandColors.lightGray }}
              >
                {option.isJewelry ? <ShoppingBag size={20} /> : <Gem size={20} />}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  #{option.item} - {option.nombre}
                </Typography>
                <Typography variant="caption" color="grey.500">
                  {getPesoDisplay(option)} • {option.color} • {option.talla}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant="body2"
                  sx={{ color: brandColors.emerald, fontWeight: 700 }}
                >
                  {formatCurrency(option.precioCOP)}
                </Typography>
                <Chip
                  label={option.isJewelry ? 'Joya' : 'Gema'}
                  size="small"
                  sx={{
                    fontSize: '0.65rem',
                    height: 20,
                    bgcolor: option.isJewelry
                      ? alpha(brandColors.gold, 0.15)
                      : alpha(brandColors.emerald, 0.15),
                    color: option.isJewelry ? brandColors.gold : brandColors.emerald,
                  }}
                />
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Buscar en inventario"
              placeholder="Nombre, numero, color..."
            />
          )}
          noOptionsText="No hay productos disponibles"
          sx={{ mb: 2 }}
        />
        <Button
          fullWidth
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={handleAddProduct}
          disabled={!selectedItem}
          sx={{
            bgcolor: brandColors.emerald,
            color: brandColors.white,
            textTransform: 'none',
            fontWeight: 600,
            py: 1.5,
            borderRadius: 2,
            mb: 3,
            boxShadow: selectedItem
              ? `0 4px 12px ${alpha(brandColors.emerald, 0.3)}`
              : 'none',
            '&:hover': {
              bgcolor: brandColors.emeraldDark,
              boxShadow: `0 6px 16px ${alpha(brandColors.emerald, 0.4)}`,
            },
            '&:disabled': {
              bgcolor: brandColors.borderSubtle,
              color: brandColors.textMuted,
            },
          }}
        >
          Agregar del Inventario
        </Button>
      </>
    )}

    {productEntryMode === 'manual' && canUseManualEntry && (
      <Box sx={{ bgcolor: brandColors.surfaceElevated, p: 2, borderRadius: 2, mb: 3 }}>
        <Grid container spacing={1.5}>
          {/* Image Upload Section */}
          <Grid item xs={12}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
            >
              Imagen del producto (opcional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {/* Image Preview / Upload Zone */}
              <Box
                component="label"
                htmlFor="manual-product-image"
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                  border: `2px dashed ${imagePreview ? brandColors.emerald : brandColors.borderSubtle}`,
                  bgcolor: imagePreview ? 'transparent' : alpha(brandColors.emerald, 0.02),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isUploadingImage ? 'wait' : 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  '&:hover': {
                    borderColor: brandColors.emerald,
                    bgcolor: alpha(brandColors.emerald, 0.05),
                  },
                }}
              >
                <input
                  id="manual-product-image"
                  type="file"
                  accept="image/*,video/*,.gif,.mp4,.mov,.webm"
                  hidden
                  disabled={isUploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImageUpload(file);
                    }
                    e.target.value = '';
                  }}
                />
                {isUploadingImage ? (
                  <Loader2
                    size={24}
                    color={brandColors.emerald}
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                ) : imagePreview ? (
                  isVideoPreview ? (
                    <Box
                      component="video"
                      src={imagePreview}
                      muted
                      playsInline
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="Preview"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <Upload size={20} color={brandColors.gray} />
                    <Typography
                      sx={{ fontSize: '0.6rem', color: brandColors.gray, mt: 0.5 }}
                    >
                      Foto/Video
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Media Info / Actions */}
              <Box sx={{ flex: 1 }}>
                {isUploadingImage ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Loader2
                        size={14}
                        color={brandColors.emerald}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: brandColors.emerald,
                          fontWeight: 600,
                        }}
                      >
                        Subiendo...
                      </Typography>
                    </Box>
                    <Typography
                      sx={{ fontSize: '0.65rem', color: brandColors.textMuted }}
                    >
                      {isVideoPreview
                        ? 'Videos pueden tomar unos segundos'
                        : 'Procesando imagen'}
                    </Typography>
                  </Box>
                ) : imagePreview ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {isVideoPreview ? (
                        <Video size={14} color={brandColors.emerald} />
                      ) : (
                        <ImageIcon size={14} color={brandColors.emerald} />
                      )}
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: brandColors.emerald,
                          fontWeight: 600,
                        }}
                      >
                        {isVideoPreview ? 'Video cargado' : 'Imagen cargada'}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<X size={14} />}
                      onClick={() => {
                        setImagePreview(null);
                        setIsVideoPreview(false);
                        setManualProduct({
                          ...manualProduct,
                          imagen: undefined,
                          videoUrl: undefined,
                        });
                      }}
                      sx={{
                        fontSize: '0.7rem',
                        color: brandColors.error,
                        textTransform: 'none',
                        p: 0.5,
                        minWidth: 'auto',
                        '&:hover': { bgcolor: alpha(brandColors.error, 0.1) },
                      }}
                    >
                      Eliminar
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                      Arrastra o haz clic para subir
                    </Typography>
                    <Typography
                      sx={{ fontSize: '0.65rem', color: 'text.disabled', mt: 0.25 }}
                    >
                      JPG, PNG, GIF, MP4 (max 100MB)
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Product Type Toggle - Gem vs Jewelry */}
          <Grid item xs={12}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mb: 1 }}
            >
              Tipo de producto
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box
                onClick={() => setManualProduct({ ...manualProduct, isJewelry: false })}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  py: 1.25,
                  px: 2,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: `2px solid ${!manualProduct.isJewelry ? brandColors.emerald : brandColors.borderSubtle}`,
                  bgcolor: !manualProduct.isJewelry
                    ? alpha(brandColors.emerald, 0.08)
                    : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: brandColors.emerald,
                    bgcolor: alpha(brandColors.emerald, 0.05),
                  },
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: !manualProduct.isJewelry
                      ? alpha(brandColors.emerald, 0.15)
                      : alpha(brandColors.gray, 0.1),
                  }}
                >
                  <Gem
                    size={18}
                    color={!manualProduct.isJewelry ? brandColors.emerald : brandColors.gray}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: !manualProduct.isJewelry ? 600 : 500,
                    color: !manualProduct.isJewelry ? brandColors.emerald : 'text.secondary',
                  }}
                >
                  Esmeralda
                </Typography>
              </Box>

              <Box
                onClick={() => setManualProduct({ ...manualProduct, isJewelry: true })}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  py: 1.25,
                  px: 2,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: `2px solid ${manualProduct.isJewelry ? brandColors.gold : brandColors.borderSubtle}`,
                  bgcolor: manualProduct.isJewelry
                    ? alpha(brandColors.gold, 0.08)
                    : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: brandColors.gold,
                    bgcolor: alpha(brandColors.gold, 0.05),
                  },
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: manualProduct.isJewelry
                      ? alpha(brandColors.gold, 0.15)
                      : alpha(brandColors.gray, 0.1),
                  }}
                >
                  <ShoppingBag
                    size={18}
                    color={manualProduct.isJewelry ? brandColors.gold : brandColors.gray}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: manualProduct.isJewelry ? 600 : 500,
                    color: manualProduct.isJewelry ? brandColors.gold : 'text.secondary',
                  }}
                >
                  Joya
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nombre del producto *"
              value={manualProduct.name}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, name: e.target.value })
              }
              size="small"
              placeholder={
                manualProduct.isJewelry
                  ? 'Ej: Anillo Esperanza Oro 18k'
                  : 'Ej: Esmeralda Corazon Verde'
              }
            />
          </Grid>

          {/* New fields for both modes */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Peso total (ct)"
              value={manualProduct.pesoTotal}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, pesoTotal: e.target.value })
              }
              size="small"
              placeholder="Ej: 3.5"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Cantidad de gemas"
              type="number"
              value={manualProduct.cantidadGemas}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, cantidadGemas: e.target.value })
              }
              size="small"
              placeholder="Ej: 1"
              inputProps={{ min: 1 }}
            />
          </Grid>

          {manualProduct.isJewelry ? (
            <>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tipo de metal"
                  value={manualProduct.metalType}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, metalType: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: Oro 18k, Plata 925"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Calidad del metal"
                  value={manualProduct.calidadMetal}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, calidadMetal: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: 18k, 14k, 925"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Gramaje"
                  value={manualProduct.gramaje}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, gramaje: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: 5.2"
                />
              </Grid>
              {/* Emerald fields for the gem in the jewel */}
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Peso Metal (gr)"
                  value={manualProduct.peso}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, peso: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: 2.5"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Color"
                  value={manualProduct.color}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, color: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: Verde Intenso"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Calidad"
                  value={manualProduct.calidad}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, calidad: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: AAA"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Talla"
                  value={manualProduct.talla}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, talla: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: Ovalo"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Medida"
                  value={manualProduct.medida}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, medida: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: Talla 7, 45cm"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Diseno"
                  value={manualProduct.diseno}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, diseno: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: Clasico, Moderno"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Precio por CT"
                  value={manualProduct.precioPorCt}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, precioPorCt: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: $500,000"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Peso (ct)"
                  value={manualProduct.peso}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, peso: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: 2.5"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Color"
                  value={manualProduct.color}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, color: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: Verde Intenso"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Calidad"
                  value={manualProduct.calidad}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, calidad: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: AAA"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Talla"
                  value={manualProduct.talla}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, talla: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: Ovalo"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Medida"
                  value={manualProduct.medida}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, medida: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: 8x6mm"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Diseno"
                  value={manualProduct.diseno}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, diseno: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: Facetado"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Precio por CT"
                  value={manualProduct.precioPorCt}
                  onChange={(e) =>
                    setManualProduct({ ...manualProduct, precioPorCt: e.target.value })
                  }
                  size="small"
                  placeholder="Ej: $500,000"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Precio COP *"
              type="number"
              value={manualProduct.precioCOP || ''}
              onChange={(e) =>
                setManualProduct({
                  ...manualProduct,
                  precioCOP: parseFloat(e.target.value) || 0,
                })
              }
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Grid>
        </Grid>
        <Button
          fullWidth
          variant="contained"
          startIcon={
            isUploadingImage ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Plus size={18} />
            )
          }
          onClick={handleAddManualProduct}
          disabled={!manualProduct.name || manualProduct.precioCOP <= 0 || isUploadingImage}
          sx={{
            mt: 2,
            bgcolor: brandColors.gold,
            color: brandColors.white,
            textTransform: 'none',
            fontWeight: 600,
            py: 1.25,
            borderRadius: 2,
            '&:hover': { bgcolor: brandColors.goldDark },
            '&.Mui-disabled': {
              bgcolor: alpha(brandColors.gold, 0.3),
              color: 'rgba(255,255,255,0.6)',
            },
          }}
        >
          {isUploadingImage ? 'Subiendo imagen...' : 'Agregar Producto Manual'}
        </Button>
      </Box>
    )}
  </Box>
);

export default ProductEntrySection;
