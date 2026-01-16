/**
 * ProductRequestsHub - Unified view for product requests
 *
 * Combines ProductRequestForm and MyProductRequests into a single view
 * with tabs for easy navigation between creating and viewing requests.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Stack,
  Alert,
  alpha,
  CircularProgress,
  InputAdornment,
  Card,
  CardContent,
  Divider,
  Chip,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Send,
  ArrowLeft,
  CheckCircle,
  ImagePlus,
  User,
  Calendar,
  FileText,
  Clock,
  XCircle,
  Plus,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { emeraldCore } from '../../design-system/tokens/colors';
import {
  PRODUCT_TYPE_LABELS,
  PRIORITY_LABELS,
  PRODUCT_REQUEST_STATUS_LABELS,
  type ProductType,
  type RequestPriority,
  type ProductRequestFormData,
  type ProductRequest,
  type ProductRequestStatus,
} from '../../types/provider';
import QuotationMediaUpload from '../provider/QuotationMediaUpload';

// Helper to format number with Colombian thousands separator (dots)
const formatPriceCOP = (value: number | undefined): string => {
  if (!value) return '';
  return value.toLocaleString('es-CO');
};

// Helper to parse formatted price string back to number
const parsePriceCOP = (value: string): number => {
  const numericString = value.replace(/\./g, '').replace(/[^\d]/g, '');
  return parseInt(numericString, 10) || 0;
};

// Color options - from Google Sheet inventory
const COLOR_OPTIONS = [
  'Verde Vivido',
  'Verde Muzo',
  'Verde Limón',
  'Verde Menta',
  'Verde Natural',
  'Cualquiera',
];

// Quality options - from Google Sheet inventory
const QUALITY_OPTIONS = [
  'Fina',
  'Comercial SuperFina',
  'Comercial Superior',
  'Comercial Fina',
  'Comercial Estandar',
  'Comercial',
  'Estandar',
  'Cualquiera',
];

const initialFormData: ProductRequestFormData = {
  productType: 'piedra_suelta',
  description: '',
  weightMin: 1,
  weightMax: 5,
  colorPreference: '',
  qualityPreference: '',
  budgetMin: undefined,
  budgetMax: 10000000,
  quantity: 1,
  clientName: '',
  clientNotes: '',
  priority: 'normal',
  neededBy: '',
  notes: '',
  referencePhotoUrls: [],
};

// Generate a temporary request ID for media uploads before submission
function generateTempRequestId(): string {
  return `PR-${Date.now().toString(36).toUpperCase()}`;
}

type ViewTab = 'list' | 'form';

export default function ProductRequestsHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useGoogleAuth();

  // Tab state - check URL param or default to 'list'
  const initialTab = searchParams.get('tab') === 'nueva' ? 'form' : 'list';
  const [activeTab, setActiveTab] = useState<ViewTab>(initialTab);

  // Form state
  const [formData, setFormData] = useState<ProductRequestFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tempRequestId] = useState<string>(() => generateTempRequestId());
  const [budgetMinDisplay, setBudgetMinDisplay] = useState('');
  const [budgetMaxDisplay, setBudgetMaxDisplay] = useState(() => formatPriceCOP(initialFormData.budgetMax));

  // List state
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ProductRequestStatus>('all');

  // Fetch requests on mount
  useEffect(() => {
    if (user?.email) {
      fetchMyRequests();
    }
  }, [user?.email]);

  // Update URL when tab changes
  const handleTabChange = (_: React.SyntheticEvent, newTab: ViewTab) => {
    setActiveTab(newTab);
    if (newTab === 'form') {
      setSearchParams({ tab: 'nueva' });
    } else {
      setSearchParams({});
    }
  };

  const fetchMyRequests = async () => {
    try {
      const response = await fetch(`/api/product-requests?email=${encodeURIComponent(user?.email || '')}`);
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Form handlers
  const handleChange = (field: keyof ProductRequestFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleBudgetMinChange = (inputValue: string) => {
    const numericValue = parsePriceCOP(inputValue);
    setFormData(prev => ({ ...prev, budgetMin: numericValue || undefined }));
    setBudgetMinDisplay(formatPriceCOP(numericValue || undefined));
    setError(null);
  };

  const handleBudgetMaxChange = (inputValue: string) => {
    const numericValue = parsePriceCOP(inputValue);
    setFormData(prev => ({ ...prev, budgetMax: numericValue }));
    setBudgetMaxDisplay(formatPriceCOP(numericValue));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.description.trim()) {
      setError('Describe el producto que necesitas');
      return false;
    }
    if (formData.weightMin <= 0) {
      setError('El peso minimo debe ser mayor a 0');
      return false;
    }
    if (formData.weightMax <= formData.weightMin) {
      setError('El peso maximo debe ser mayor al minimo');
      return false;
    }
    if (!formData.colorPreference) {
      setError('Selecciona una preferencia de color');
      return false;
    }
    if (!formData.qualityPreference) {
      setError('Selecciona una preferencia de calidad');
      return false;
    }
    if (formData.budgetMax <= 0) {
      setError('El presupuesto debe ser mayor a 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/product-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requesterEmail: user?.email,
          requesterName: user?.name || user?.email?.split('@')[0],
          requesterRole: 'asesor',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Reset form
        setFormData(initialFormData);
        setBudgetMinDisplay('');
        setBudgetMaxDisplay(formatPriceCOP(initialFormData.budgetMax));
        // Refresh list and switch to it
        await fetchMyRequests();
        setTimeout(() => {
          setSuccess(false);
          setActiveTab('list');
          setSearchParams({});
        }, 2000);
      } else {
        setError(data.error || 'Error al crear la solicitud');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Error de conexion. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // List helpers
  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const getStatusColor = (status: ProductRequestStatus) => {
    switch (status) {
      case 'pendiente': return '#f59e0b';
      case 'aprobada': return emeraldCore.primary;
      case 'enviada_proveedor': return '#3b82f6';
      case 'rechazada': return '#ef4444';
      case 'completada': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: ProductRequestStatus) => {
    switch (status) {
      case 'pendiente': return Clock;
      case 'aprobada': return CheckCircle;
      case 'enviada_proveedor': return Send;
      case 'rechazada': return XCircle;
      case 'completada': return CheckCircle;
      default: return FileText;
    }
  };

  const getPriorityColor = (priority: RequestPriority) => {
    switch (priority) {
      case 'muy_urgente': return '#ef4444';
      case 'urgente': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatBudget = (amount: number) => {
    if (!amount) return '-';
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  // Success state after submission
  if (success) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', p: 3 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha(emeraldCore.primary, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <CheckCircle size={40} color={emeraldCore.primary} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Solicitud Enviada
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          Tu solicitud ha sido enviada al equipo de Tierra Madre.
          Te notificaremos cuando haya una respuesta.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box sx={{ p: 2, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button
            onClick={() => navigate(-1)}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <ArrowLeft size={20} />
          </Button>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Solicitudes
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Solicita productos para tus clientes
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          px: 2,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 48,
          },
          '& .Mui-selected': {
            color: emeraldCore.primary,
          },
          '& .MuiTabs-indicator': {
            bgcolor: emeraldCore.primary,
          },
        }}
      >
        <Tab
          icon={<FileText size={18} />}
          iconPosition="start"
          label={`Mis Solicitudes (${requests.length})`}
          value="list"
        />
        <Tab
          icon={<Plus size={18} />}
          iconPosition="start"
          label="Nueva Solicitud"
          value="form"
        />
      </Tabs>

      {/* List View */}
      {activeTab === 'list' && (
        <Box>
          {/* Status Filter Tabs */}
          <Tabs
            value={statusFilter}
            onChange={(_, v) => setStatusFilter(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              mt: 1,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                minWidth: 'auto',
                px: 1.5,
                fontSize: '0.8rem',
              },
              '& .Mui-selected': {
                color: emeraldCore.primary,
              },
              '& .MuiTabs-indicator': {
                bgcolor: emeraldCore.primary,
                height: 2,
              },
            }}
          >
            <Tab label="Todas" value="all" />
            <Tab label={`Pendientes (${requests.filter(r => r.status === 'pendiente').length})`} value="pendiente" />
            <Tab label="Aprobadas" value="aprobada" />
            <Tab label="Completadas" value="completada" />
          </Tabs>

          {/* Request List */}
          <Box sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress sx={{ color: emeraldCore.primary }} />
              </Box>
            ) : filteredRequests.length === 0 ? (
              <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <ShoppingBag size={48} color={emeraldCore.primary} style={{ marginBottom: 16, opacity: 0.5 }} />
                  <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                    {statusFilter === 'all'
                      ? 'No has enviado ninguna solicitud aun'
                      : `No tienes solicitudes ${PRODUCT_REQUEST_STATUS_LABELS[statusFilter].toLowerCase()}s`
                    }
                  </Typography>
                  {statusFilter === 'all' && (
                    <Button
                      variant="contained"
                      startIcon={<Plus size={18} />}
                      onClick={() => {
                        setActiveTab('form');
                        setSearchParams({ tab: 'nueva' });
                      }}
                      sx={{
                        bgcolor: emeraldCore.primary,
                        '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.87) },
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Crear Primera Solicitud
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={2}>
                {filteredRequests.map((request) => {
                  const StatusIcon = getStatusIcon(request.status);

                  return (
                    <Card
                      key={request.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: 'none',
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        {/* Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              {PRODUCT_TYPE_LABELS[request.productType]}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {formatDate(request.createdAt)}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {request.priority !== 'normal' && (
                              <Chip
                                icon={<AlertTriangle size={12} />}
                                label={PRIORITY_LABELS[request.priority]}
                                size="small"
                                sx={{
                                  bgcolor: alpha(getPriorityColor(request.priority), 0.1),
                                  color: getPriorityColor(request.priority),
                                  fontWeight: 600,
                                  '& .MuiChip-icon': { color: 'inherit' },
                                }}
                              />
                            )}
                            <Chip
                              icon={<StatusIcon size={14} />}
                              label={PRODUCT_REQUEST_STATUS_LABELS[request.status]}
                              size="small"
                              sx={{
                                bgcolor: alpha(getStatusColor(request.status), 0.1),
                                color: getStatusColor(request.status),
                                fontWeight: 600,
                                '& .MuiChip-icon': { color: 'inherit' },
                              }}
                            />
                          </Stack>
                        </Box>

                        {/* Description */}
                        <Typography
                          variant="body2"
                          sx={{
                            mb: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {request.description}
                        </Typography>

                        {/* Specs */}
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5, gap: 0.5 }}>
                          <Chip
                            label={`${request.weightMin}-${request.weightMax} ct`}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: 'divider' }}
                          />
                          {request.colorPreference && (
                            <Chip
                              label={request.colorPreference}
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: 'divider' }}
                            />
                          )}
                          {request.qualityPreference && (
                            <Chip
                              label={request.qualityPreference}
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: 'divider' }}
                            />
                          )}
                          <Chip
                            label={`x${request.quantity}`}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: 'divider' }}
                          />
                          <Chip
                            label={`Max ${formatBudget(request.budgetMax)}`}
                            size="small"
                            sx={{
                              bgcolor: alpha(emeraldCore.primary, 0.1),
                              color: emeraldCore.primary,
                              fontWeight: 600,
                            }}
                          />
                        </Stack>

                        {/* Client Info */}
                        {request.clientName && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                            Cliente: {request.clientName}
                          </Typography>
                        )}

                        {/* Needed By */}
                        {request.neededBy && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                            Necesario para: {formatDate(request.neededBy)}
                          </Typography>
                        )}

                        {/* Admin Response */}
                        {request.adminResponse && (
                          <Box sx={{ mt: 1, p: 1.5, bgcolor: alpha(emeraldCore.primary, 0.05), borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                              Respuesta de Tierra Madre:
                            </Typography>
                            <Typography variant="body2">{request.adminResponse}</Typography>
                            {request.respondedAt && (
                              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                                {formatDate(request.respondedAt)}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Box>
      )}

      {/* Form View */}
      {activeTab === 'form' && (
        <Box sx={{ p: 2 }}>
          <Stack spacing={2.5}>
            {/* Product Type */}
            <TextField
              select
              label="Categoría de Producto"
              value={formData.productType}
              onChange={(e) => handleChange('productType', e.target.value)}
              fullWidth
            >
              {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((type) => (
                <MenuItem key={type} value={type}>
                  {PRODUCT_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </TextField>

            {/* Quantity */}
            <TextField
              label="Cantidad"
              type="number"
              value={formData.quantity || 1}
              onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
              fullWidth
              inputProps={{ min: 1 }}
              helperText="Número de piezas que necesitas"
            />

            {/* Description */}
            <TextField
              label="Descripción del Producto"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Ej: Esmeralda verde vivido para anillo de compromiso..."
              required
            />

            {/* Weight Range */}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Peso Mínimo (ct)"
                type="number"
                value={formData.weightMin || ''}
                onChange={(e) => handleChange('weightMin', parseFloat(e.target.value) || 0)}
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">ct</InputAdornment>,
                }}
                inputProps={{ step: 0.1, min: 0 }}
              />
              <TextField
                label="Peso Máximo (ct)"
                type="number"
                value={formData.weightMax || ''}
                onChange={(e) => handleChange('weightMax', parseFloat(e.target.value) || 0)}
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">ct</InputAdornment>,
                }}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Stack>

            {/* Color Preference */}
            <TextField
              select
              label="Preferencia de Color"
              value={formData.colorPreference}
              onChange={(e) => handleChange('colorPreference', e.target.value)}
              fullWidth
            >
              {COLOR_OPTIONS.map((color) => (
                <MenuItem key={color} value={color}>
                  {color}
                </MenuItem>
              ))}
            </TextField>

            {/* Quality Preference */}
            <TextField
              select
              label="Preferencia de Calidad"
              value={formData.qualityPreference}
              onChange={(e) => handleChange('qualityPreference', e.target.value)}
              fullWidth
            >
              {QUALITY_OPTIONS.map((quality) => (
                <MenuItem key={quality} value={quality}>
                  {quality}
                </MenuItem>
              ))}
            </TextField>

            {/* Budget Range */}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Presupuesto Min (opcional)"
                value={budgetMinDisplay}
                onChange={(e) => handleBudgetMinChange(e.target.value)}
                fullWidth
                placeholder="5.000.000"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                inputProps={{ inputMode: 'numeric' }}
              />
              <TextField
                label="Presupuesto Max"
                value={budgetMaxDisplay}
                onChange={(e) => handleBudgetMaxChange(e.target.value)}
                fullWidth
                placeholder="10.000.000"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                inputProps={{ inputMode: 'numeric' }}
                required
              />
            </Stack>

            <Divider sx={{ my: 1 }} />

            {/* Client Info Section */}
            <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <User size={18} color={emeraldCore.primary} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Información del Cliente (Opcional)
                  </Typography>
                </Box>
                <Stack spacing={2}>
                  <TextField
                    label="Nombre del Cliente"
                    value={formData.clientName || ''}
                    onChange={(e) => handleChange('clientName', e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Nombre o referencia del cliente"
                  />
                  <TextField
                    label="Notas del Cliente"
                    value={formData.clientNotes || ''}
                    onChange={(e) => handleChange('clientNotes', e.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    placeholder="Preferencias especiales, ocasion, etc..."
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Priority and Date */}
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Prioridad"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                fullWidth
              >
                {(Object.keys(PRIORITY_LABELS) as RequestPriority[]).map((p) => (
                  <MenuItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Fecha Necesaria"
                type="date"
                value={formData.neededBy || ''}
                onChange={(e) => handleChange('neededBy', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Calendar size={16} /></InputAdornment>,
                }}
              />
            </Stack>

            {/* Reference Media Upload */}
            <Card sx={{ bgcolor: alpha(emeraldCore.primary, 0.04), border: 'none', boxShadow: 'none' }}>
              <CardContent sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <ImagePlus size={18} color={emeraldCore.primary} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Fotos de Referencia (Opcional)
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  Sube imagenes de referencia para ayudarnos a entender mejor lo que buscas
                </Typography>
                <QuotationMediaUpload
                  quotationId={tempRequestId}
                  uploadedUrls={formData.referencePhotoUrls || []}
                  onUploadComplete={(urls) => handleChange('referencePhotoUrls', urls)}
                  maxFiles={5}
                  disabled={submitting}
                />
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <TextField
              label="Notas Adicionales"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Cualquier informacion adicional que nos ayude a encontrar el producto perfecto..."
            />

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                {error}
              </Alert>
            )}

            {/* Submit */}
            <Button
              variant="contained"
              size="large"
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send size={20} />}
              onClick={handleSubmit}
              disabled={submitting}
              sx={{
                bgcolor: emeraldCore.primary,
                '&:hover': { bgcolor: alpha(emeraldCore.primary, 0.87) },
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
              }}
              fullWidth
            >
              {submitting ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
