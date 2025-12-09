/**
 * AddToInventoryModal - Modal to add a new product to inventory after uploading a photo
 */

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
} from '@mui/material';
import { Package, Check, X } from 'lucide-react';
// Design System Tokens
import { emeraldCore } from '../design-system/tokens/colors';

interface AddToInventoryModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl?: string;
  onSuccess?: (itemNumber: number) => void;
}

const COLORES = [
  'Verde Natural',
  'Verde Vivido',
  'Verde Muzo',
  'Verde Menta',
  'Verde Limón',
];

const CALIDADES = [
  'Fina',
  'Comercial SuperFina',
  'Comercial Fina',
  'Comercial Superior',
  'Comercial Estandar',
  'Estandar',
];

const TALLAS = [
  'Esmeralda',
  'Redonda',
  'Ovalo',
  'Cuadrada',
  'Cushion',
  'Corazon',
  'Lagrima',
  'Marquesa',
];

const UBICACIONES = [
  'BOVEDA OFI',
  'ASESOR',
];

export default function AddToInventoryModal({
  open,
  onClose,
  imageUrl,
  onSuccess,
}: AddToInventoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ itemNumber: number; nombre: string } | null>(null);

  // Form fields
  const [nombre, setNombre] = useState('');
  const [peso, setPeso] = useState('');
  const [color, setColor] = useState('Verde Natural');
  const [calidad, setCalidad] = useState('Comercial Fina');
  const [talla, setTalla] = useState('Esmeralda');
  const [medidas, setMedidas] = useState('');
  const [costoTM, setCostoTM] = useState('');
  const [precioCOP, setPrecioCOP] = useState('');
  const [ubicacion, setUbicacion] = useState('BOVEDA OFI');
  const [asesor, setAsesor] = useState('');

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/add-inventory-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          peso: peso || undefined,
          color,
          calidad,
          talla,
          medidas: medidas || undefined,
          costoTM: costoTM ? parseInt(costoTM.replace(/[^\d]/g, '')) : undefined,
          precioCOP: precioCOP ? parseInt(precioCOP.replace(/[^\d]/g, '')) : undefined,
          ubicacion,
          asesor: asesor || undefined,
          imagenUrl: imageUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al agregar al inventario');
      }

      setSuccess({ itemNumber: result.item, nombre: result.nombre });
      onSuccess?.(result.item);

      // Reset form after success
      setTimeout(() => {
        resetForm();
        onClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setPeso('');
    setColor('Verde Natural');
    setCalidad('Comercial Fina');
    setTalla('Esmeralda');
    setMedidas('');
    setCostoTM('');
    setPrecioCOP('');
    setUbicacion('BOVEDA OFI');
    setAsesor('');
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: alpha(emeraldCore.dark, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Package size={20} color={emeraldCore.dark} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Agregar al Inventario
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Registrar nuevo producto en Google Sheets
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: alpha(emeraldCore.dark, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Check size={32} color={emeraldCore.dark} />
            </Box>
            <Typography variant="h6" gutterBottom>
              Producto Agregado
            </Typography>
            <Typography color="text.secondary">
              "{success.nombre}" registrado como #{success.itemNumber}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {imageUrl && (
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Box
                  component="img"
                  src={imageUrl}
                  alt="Preview"
                  sx={{
                    maxWidth: 200,
                    maxHeight: 150,
                    borderRadius: 2,
                    objectFit: 'cover',
                    border: '2px solid',
                    borderColor: 'grey.200',
                  }}
                />
              </Box>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <TextField
                  fullWidth
                  label="Nombre del producto *"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Coraz\u00f3n de la Selva"
                  disabled={loading}
                />
              </Box>

              <TextField
                fullWidth
                label="Peso (quilates)"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="Ej: 2.5"
                disabled={loading}
              />

              <FormControl fullWidth disabled={loading}>
                <InputLabel>Color</InputLabel>
                <Select
                  value={color}
                  label="Color"
                  onChange={(e) => setColor(e.target.value)}
                >
                  {COLORES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={loading}>
                <InputLabel>Calidad</InputLabel>
                <Select
                  value={calidad}
                  label="Calidad"
                  onChange={(e) => setCalidad(e.target.value)}
                >
                  {CALIDADES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={loading}>
                <InputLabel>Talla</InputLabel>
                <Select
                  value={talla}
                  label="Talla"
                  onChange={(e) => setTalla(e.target.value)}
                >
                  {TALLAS.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ gridColumn: '1 / -1' }}>
                <TextField
                  fullWidth
                  label="Medidas"
                  value={medidas}
                  onChange={(e) => setMedidas(e.target.value)}
                  placeholder="Ej: 8.0 x 6.5 x 4.2"
                  disabled={loading}
                />
              </Box>

              <TextField
                fullWidth
                label="Costo TM (COP)"
                value={costoTM}
                onChange={(e) => setCostoTM(e.target.value)}
                placeholder="Ej: 5000000"
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Precio Venta (COP)"
                value={precioCOP}
                onChange={(e) => setPrecioCOP(e.target.value)}
                placeholder="Ej: 8500000"
                disabled={loading}
              />

              <FormControl fullWidth disabled={loading}>
                <InputLabel>Ubicaci\u00f3n</InputLabel>
                <Select
                  value={ubicacion}
                  label="Ubicaci\u00f3n"
                  onChange={(e) => setUbicacion(e.target.value)}
                >
                  {UBICACIONES.map((u) => (
                    <MenuItem key={u} value={u}>{u}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Asesor"
                value={asesor}
                onChange={(e) => setAsesor(e.target.value)}
                placeholder="Ej: M.CAMPUZANO"
                disabled={loading}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      {!success && (
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            startIcon={<X size={18} />}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !nombre.trim()}
            startIcon={loading ? <CircularProgress size={18} /> : <Check size={18} />}
            sx={{
              bgcolor: emeraldCore.dark,
              '&:hover': { bgcolor: emeraldCore.darker },
            }}
          >
            {loading ? 'Guardando...' : 'Agregar al Inventario'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
