/**
 * ProductRequestsHub - Unified view for product requests
 *
 * Combines request form and list into a single view
 * with tabs for easy navigation.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Tab,
  Tabs,
} from '@mui/material';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleAuth } from '../../../contexts/GoogleAuthContext';
import { emeraldCore } from '../../../design-system/tokens/colors';
import { iosTypographyScale } from '../../../design-system';
import {
  type ProductRequestFormData,
  type ProductRequest,
  type ProductRequestStatus,
} from '../../../types/provider';
import { formatPriceCOP } from '../../../utils/priceFormatters';
import { RequestList, RequestForm, SubmitSuccess } from './components';

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

function generateTempRequestId(): string {
  return `PR-${Date.now().toString(36).toUpperCase()}`;
}

type ViewTab = 'list' | 'form';

export default function ProductRequestsHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useGoogleAuth();

  // Tab state
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
  const handleFieldChange = (field: keyof ProductRequestFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleBudgetMinChange = (inputValue: string) => {
    const numericStr = inputValue.replace(/[^\d]/g, '');
    const numericValue = numericStr ? parseInt(numericStr, 10) : undefined;
    setFormData(prev => ({ ...prev, budgetMin: numericValue }));
    setBudgetMinDisplay(formatPriceCOP(numericValue));
    setError(null);
  };

  const handleBudgetMaxChange = (inputValue: string) => {
    const numericStr = inputValue.replace(/[^\d]/g, '');
    const numericValue = numericStr ? parseInt(numericStr, 10) : 0;
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
        setFormData(initialFormData);
        setBudgetMinDisplay('');
        setBudgetMaxDisplay(formatPriceCOP(initialFormData.budgetMax));
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

  const handleCreateNew = () => {
    setActiveTab('form');
    setSearchParams({ tab: 'nueva' });
  };

  // Success state
  if (success) {
    return <SubmitSuccess />;
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
            <Typography variant="h5" sx={{ fontSize: iosTypographyScale.title2, fontWeight: 700, mb: 0.5 }}>
              Solicitudes
            </Typography>
            <Typography variant="body2" sx={{ fontSize: iosTypographyScale.subhead, color: 'text.secondary' }}>
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
        <RequestList
          requests={requests}
          loading={loading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onCreateNew={handleCreateNew}
        />
      )}

      {/* Form View */}
      {activeTab === 'form' && (
        <RequestForm
          formData={formData}
          budgetMinDisplay={budgetMinDisplay}
          budgetMaxDisplay={budgetMaxDisplay}
          tempRequestId={tempRequestId}
          submitting={submitting}
          error={error}
          onFieldChange={handleFieldChange}
          onBudgetMinChange={handleBudgetMinChange}
          onBudgetMaxChange={handleBudgetMaxChange}
          onSubmit={handleSubmit}
        />
      )}
    </Box>
  );
}
