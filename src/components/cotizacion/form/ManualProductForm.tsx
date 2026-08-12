/**
 * ManualProductForm Component
 * Form for manually entering product details with image/video upload.
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  InputAdornment,
  Grid,
  Divider,
  alpha,
} from '@mui/material';
import {
  Plus,
  Check,
  Gem,
  ShoppingBag,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Video,
} from 'lucide-react';
import { brandColors } from '../constants';
import { cssTransition } from '../../../design-system';
import { TextField } from '../../../design-system/components/TextField';
import type { ManualProductFormProps } from '../types';

/** Format number with dot thousand separators: 542000 → 542.000 */
const formatThousands = (value: string | number): string => {
  const str =
    typeof value === 'number' ? (value > 0 ? value.toString() : '') : value;
  const digits = str.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/** Strip non-digits: 542.000 → 542000 */
const parseThousands = (value: string): string => value.replace(/\D/g, '');

export const ManualProductForm: React.FC<ManualProductFormProps> = ({
  manualProduct,
  setManualProduct,
  handleAddManualProduct,
  isUploadingImage,
  imagePreview,
  setImagePreview,
  isVideoPreview,
  setIsVideoPreview,
  onImageUpload,
  isEditing = false,
  onCancelEdit,
}) => (
  <Box
    sx={{
      bgcolor: 'action.hover',
      p: 2,
      borderRadius: 2,
      mb: 3,
      border: '1px solid',
      borderColor: 'divider',
    }}
  >
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
              border: '2px dashed',
              borderColor: imagePreview ? brandColors.emerald : 'divider',
              bgcolor: imagePreview
                ? 'transparent'
                : alpha(brandColors.emerald, 0.02),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isUploadingImage ? 'wait' : 'pointer',
              overflow: 'hidden',
              position: 'relative',
              transition: cssTransition.default,
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
              <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
                <Upload size={20} color="currentColor" />
                <Typography
                  sx={{ fontSize: '0.6rem', color: 'inherit', mt: 0.5 }}
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
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
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
                  sx={{ fontSize: '0.65rem', color: 'text.disabled' }}
                >
                  {isVideoPreview
                    ? 'Videos pueden tomar unos segundos'
                    : 'Procesando imagen'}
                </Typography>
              </Box>
            ) : imagePreview ? (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
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
                <Typography
                  sx={{ fontSize: '0.7rem', color: 'text.secondary' }}
                >
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
            onClick={() =>
              setManualProduct({ ...manualProduct, isJewelry: false })
            }
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
              border: '2px solid',
              borderColor: !manualProduct.isJewelry
                ? brandColors.emerald
                : 'divider',
              bgcolor: !manualProduct.isJewelry
                ? alpha(brandColors.emerald, 0.08)
                : 'transparent',
              transition: cssTransition.default,
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
                  : 'action.selected',
                color: !manualProduct.isJewelry
                  ? brandColors.emerald
                  : 'text.disabled',
              }}
            >
              <Gem size={18} color="currentColor" />
            </Box>
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: !manualProduct.isJewelry ? 600 : 500,
                color: !manualProduct.isJewelry
                  ? brandColors.emerald
                  : 'text.secondary',
              }}
            >
              Esmeralda
            </Typography>
          </Box>

          <Box
            onClick={() =>
              setManualProduct({ ...manualProduct, isJewelry: true })
            }
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
              border: '2px solid',
              borderColor: manualProduct.isJewelry
                ? brandColors.gold
                : 'divider',
              bgcolor: manualProduct.isJewelry
                ? alpha(brandColors.gold, 0.08)
                : 'transparent',
              transition: cssTransition.default,
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
                  : 'action.selected',
                color: manualProduct.isJewelry
                  ? brandColors.gold
                  : 'text.disabled',
              }}
            >
              <ShoppingBag size={18} color="currentColor" />
            </Box>
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: manualProduct.isJewelry ? 600 : 500,
                color: manualProduct.isJewelry
                  ? brandColors.gold
                  : 'text.secondary',
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
          size="sm"
          placeholder={
            manualProduct.isJewelry
              ? 'Ej: Anillo Esperanza Oro 18k'
              : 'Ej: Esmeralda Corazón Verde'
          }
          error={manualProduct.name !== '' && manualProduct.name.length < 2}
          helperText={
            manualProduct.name !== '' && manualProduct.name.length < 2
              ? 'El nombre debe tener al menos 2 caracteres'
              : !manualProduct.name
                ? 'Requerido para agregar el producto'
                : ''
          }
        />
      </Grid>

      {manualProduct.isJewelry ? (
        <>
          {/* ═══ Gem Specifications (Group 1) ═══ */}
          {/* Row 1: Peso gema (ct) | Color — matches Gema(Ct), Color */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Peso gema (ct)"
              value={manualProduct.peso}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, peso: e.target.value })
              }
              size="sm"
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
              size="sm"
              placeholder="Ej: Verde Intenso"
            />
          </Grid>
          {/* Row 2: Calidad | Cantidad de gemas — matches Calidad, Cantidad */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Calidad"
              value={manualProduct.calidad}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, calidad: e.target.value })
              }
              size="sm"
              placeholder="Ej: AAA"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Cantidad de gemas"
              type="number"
              value={manualProduct.cantidadGemas}
              onChange={(e) =>
                setManualProduct({
                  ...manualProduct,
                  cantidadGemas: e.target.value,
                })
              }
              size="sm"
              placeholder="Ej: 1"
              inputProps={{ min: 1 }}
            />
          </Grid>
          {/* Row 3: Medida | Diseño */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Medida"
              value={manualProduct.medida}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, medida: e.target.value })
              }
              size="sm"
              placeholder="Ej: 8x6mm"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Diseño"
              value={manualProduct.diseno}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, diseno: e.target.value })
              }
              size="sm"
              placeholder="Ej: Clásico, Moderno"
            />
          </Grid>

          {/* ═══ Visual Separator: Jewelry Specifications (Group 2) ═══ */}
          <Grid item xs={12}>
            <Divider sx={{ mt: 1, mb: 0 }} />
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mt: 1.5,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontWeight: 600,
                fontSize: '0.65rem',
              }}
            >
              Especificaciones de joya
            </Typography>
          </Grid>

          {/* Row 4: Tipo de metal | Talla — matches Material, Talla */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Tipo de metal"
              value={manualProduct.metalType}
              onChange={(e) =>
                setManualProduct({
                  ...manualProduct,
                  metalType: e.target.value,
                })
              }
              size="sm"
              placeholder="Ej: Oro 18k, Plata 925"
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
              size="sm"
              placeholder="Ej: Talla 7, 45cm"
            />
          </Grid>
          {/* Row 5: Calidad del metal | Gramaje */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Calidad del metal"
              value={manualProduct.calidadMetal}
              onChange={(e) =>
                setManualProduct({
                  ...manualProduct,
                  calidadMetal: e.target.value,
                })
              }
              size="sm"
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
              size="sm"
              placeholder="Ej: 5.2"
            />
          </Grid>
          {/* Row 6: Peso total (ct) */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Peso total (ct)"
              value={manualProduct.pesoTotal}
              onChange={(e) =>
                setManualProduct({
                  ...manualProduct,
                  pesoTotal: e.target.value,
                })
              }
              size="sm"
              placeholder="Ej: 3.5"
            />
          </Grid>
          {/* Row 7: Precio por CT */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Precio por CT"
              value={formatThousands(manualProduct.precioPorCt)}
              onChange={(e) =>
                setManualProduct({
                  ...manualProduct,
                  precioPorCt: parseThousands(e.target.value),
                })
              }
              size="sm"
              placeholder="Ej: 500.000"
              inputProps={{ inputMode: 'numeric' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
            />
          </Grid>
        </>
      ) : (
        <>
          {/* Row 1: Peso (ct) | Color — matches Gema(Ct), Color */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Peso (ct)"
              value={manualProduct.peso}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, peso: e.target.value })
              }
              size="sm"
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
              size="sm"
              placeholder="Ej: Verde Intenso"
            />
          </Grid>
          {/* Row 2: Calidad | Corte — matches Calidad, Corte */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Calidad"
              value={manualProduct.calidad}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, calidad: e.target.value })
              }
              size="sm"
              placeholder="Ej: AAA"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Corte"
              value={manualProduct.talla}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, talla: e.target.value })
              }
              size="sm"
              placeholder="Ej: Ovalo"
            />
          </Grid>
          {/* Row 3: Cantidad de gemas | Medida — matches Cantidad, Medida */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Cantidad de gemas"
              type="number"
              value={manualProduct.cantidadGemas}
              onChange={(e) =>
                setManualProduct({
                  ...manualProduct,
                  cantidadGemas: e.target.value,
                })
              }
              size="sm"
              placeholder="Ej: 1"
              inputProps={{ min: 1 }}
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
              size="sm"
              placeholder="Ej: 8x6mm"
            />
          </Grid>
          {/* Row 4: Peso total (ct) | Diseño — additional fields */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Peso total (ct)"
              value={manualProduct.pesoTotal}
              onChange={(e) =>
                setManualProduct({
                  ...manualProduct,
                  pesoTotal: e.target.value,
                })
              }
              size="sm"
              placeholder="Ej: 3.5"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Diseño"
              value={manualProduct.diseno}
              onChange={(e) =>
                setManualProduct({ ...manualProduct, diseno: e.target.value })
              }
              size="sm"
              placeholder="Ej: Facetado"
            />
          </Grid>
          {/* Row 5: Precio por CT */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Precio por CT"
              value={formatThousands(manualProduct.precioPorCt)}
              onChange={(e) =>
                setManualProduct({
                  ...manualProduct,
                  precioPorCt: parseThousands(e.target.value),
                })
              }
              size="sm"
              placeholder="Ej: 500.000"
              inputProps={{ inputMode: 'numeric' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
              }}
            />
          </Grid>
        </>
      )}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Precio COP *"
          value={
            manualProduct.precioCOP > 0
              ? formatThousands(manualProduct.precioCOP)
              : ''
          }
          onChange={(e) =>
            setManualProduct({
              ...manualProduct,
              precioCOP: parseInt(parseThousands(e.target.value), 10) || 0,
            })
          }
          size="sm"
          placeholder="Ej: 1.500.000"
          inputProps={{ inputMode: 'numeric' }}
          error={
            manualProduct.precioCOP !== undefined &&
            manualProduct.precioCOP <= 0 &&
            manualProduct.name !== ''
          }
          helperText={
            manualProduct.precioCOP !== undefined &&
            manualProduct.precioCOP <= 0 &&
            manualProduct.name !== ''
              ? 'Ingresa un precio mayor a 0'
              : ''
          }
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
        />
      </Grid>
    </Grid>
    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
      {isEditing && onCancelEdit && (
        <Button
          variant="outlined"
          onClick={onCancelEdit}
          sx={{
            flex: '0 0 auto',
            textTransform: 'none',
            fontWeight: 600,
            py: 1.25,
            borderRadius: 2,
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'text.disabled',
              bgcolor: 'action.hover',
            },
          }}
        >
          Cancelar
        </Button>
      )}
      <Button
        fullWidth
        variant="contained"
        startIcon={
          isUploadingImage ? (
            <Loader2
              size={18}
              style={{ animation: 'spin 1s linear infinite' }}
            />
          ) : isEditing ? (
            <Check size={18} />
          ) : (
            <Plus size={18} />
          )
        }
        onClick={handleAddManualProduct}
        disabled={
          !manualProduct.name ||
          manualProduct.precioCOP <= 0 ||
          isUploadingImage
        }
        sx={{
          bgcolor: isEditing ? brandColors.emerald : brandColors.gold,
          color: '#FFFFFF',
          textTransform: 'none',
          fontWeight: 600,
          py: 1.25,
          borderRadius: 2,
          '&:hover': {
            bgcolor: isEditing ? brandColors.emeraldDark : brandColors.goldDark,
          },
          '&.Mui-disabled': {
            opacity: 0.45,
          },
        }}
      >
        {isUploadingImage
          ? 'Subiendo imagen...'
          : isEditing
            ? 'Actualizar Producto'
            : 'Agregar Producto Manual'}
      </Button>
    </Box>
  </Box>
);

export default ManualProductForm;
