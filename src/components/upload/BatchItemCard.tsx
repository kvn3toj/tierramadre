/**
 * BatchItemCard Component
 * Individual card for batch upload items.
 * Extracted from EmeraldUploader.tsx for better modularity.
 */
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Button,
  Grid,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { EmeraldCategory } from '../../types';
import { brand, darkTokens } from '../../design-system';
import MediaPreview from '../MediaPreview';
import { BatchItem } from '../../hooks/useEmeraldUpload';

export interface BatchItemCardProps {
  item: BatchItem;
  onUpdate: (id: string, updates: Partial<BatchItem>) => void;
  onRemove: (id: string) => void;
  onRefreshNames: (id: string) => void;
  onSave: (item: BatchItem) => void;
}

export function BatchItemCard({
  item,
  onUpdate,
  onRemove,
  onRefreshNames,
  onSave,
}: BatchItemCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <Box sx={{ height: 160, overflow: 'hidden', bgcolor: darkTokens.background.app }}>
        {item.mediaType === 'video' ? (
          <MediaPreview
            mediaUrl={item.imageUrl}
            mediaType="video"
            thumbnailUrl={item.thumbnailUrl}
            alt="Video"
            maxHeight={160}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            controls={false}
            muted
          />
        ) : (
          <img
            src={item.imageUrl}
            alt="Emerald"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>
      <CardContent sx={{ pb: 1 }}>
        {/* Name suggestions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <AIIcon sx={{ fontSize: 16, color: brand.gold[500] }} />
          <Typography variant="caption">Sugerencias:</Typography>
          <IconButton size="small" onClick={() => onRefreshNames(item.id)}>
            <RefreshIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          {item.suggestedNames.map((name) => (
            <Chip
              key={name}
              label={name}
              size="small"
              onClick={() => onUpdate(item.id, { selectedName: name, customName: '' })}
              color={item.selectedName === name ? 'primary' : 'default'}
              sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
            />
          ))}
        </Box>
        <TextField
          fullWidth
          size="small"
          label="Nombre"
          value={item.customName || item.selectedName}
          onChange={(e) => onUpdate(item.id, { customName: e.target.value, selectedName: '' })}
          sx={{ mb: 1 }}
        />
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size="small"
              label="Peso (ct)"
              value={item.weightCarats}
              onChange={(e) => onUpdate(item.id, { weightCarats: e.target.value })}
              type="number"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size="small"
              label="Lote"
              value={item.lotCode}
              onChange={(e) => onUpdate(item.id, { lotCode: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoría</InputLabel>
              <Select
                value={item.category}
                label="Categoría"
                onChange={(e) => onUpdate(item.id, { category: e.target.value as EmeraldCategory })}
              >
                <MenuItem value="loose">Gema</MenuItem>
                <MenuItem value="ring">Anillo</MenuItem>
                <MenuItem value="pendant">Dije</MenuItem>
                <MenuItem value="earrings">Aretes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {/* Jewelry-specific fields */}
          {(item.category === 'ring' || item.category === 'earrings' || item.category === 'pendant') && (
            <>
              {item.category === 'ring' && (
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Talla</InputLabel>
                    <Select
                      value={item.ringSize || ''}
                      label="Talla"
                      onChange={(e) => onUpdate(item.id, { ringSize: e.target.value })}
                    >
                      <MenuItem value="4">4</MenuItem>
                      <MenuItem value="5">5</MenuItem>
                      <MenuItem value="6">6</MenuItem>
                      <MenuItem value="7">7</MenuItem>
                      <MenuItem value="8">8</MenuItem>
                      <MenuItem value="9">9</MenuItem>
                      <MenuItem value="10">10</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Color</InputLabel>
                  <Select
                    value={item.color || ''}
                    label="Color"
                    onChange={(e) => onUpdate(item.id, { color: e.target.value })}
                  >
                    <MenuItem value="Verde Muzo">Verde Muzo</MenuItem>
                    <MenuItem value="Verde Chivor">Verde Chivor</MenuItem>
                    <MenuItem value="Verde Vivido">Verde Vivido</MenuItem>
                    <MenuItem value="Verde Natural">Verde Natural</MenuItem>
                    <MenuItem value="Verde Menta">Verde Menta</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Calidad</InputLabel>
                  <Select
                    value={item.quality || ''}
                    label="Calidad"
                    onChange={(e) => onUpdate(item.id, { quality: e.target.value })}
                  >
                    <MenuItem value="Premium">Premium</MenuItem>
                    <MenuItem value="Estándar">Estándar</MenuItem>
                    <MenuItem value="Comercial">Comercial</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
        </Grid>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <IconButton
          size="small"
          color="error"
          onClick={() => onRemove(item.id)}
        >
          <DeleteIcon />
        </IconButton>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => onSave(item)}
          disabled={!item.customName && !item.selectedName}
          sx={{
            bgcolor: brand.emerald[500],
            '&:hover': { bgcolor: brand.emerald[600] },
          }}
        >
          Guardar
        </Button>
      </CardActions>
    </Card>
  );
}

export default BatchItemCard;
