/**
 * Feedback System Types (Enhanced)
 *
 * TypeScript interfaces for admin feedback reporting system.
 * Enhanced with: severity, tags, device info, assignees, and metrics.
 */

// =============================================================================
// ENUMS
// =============================================================================

export type FeedbackCategory =
  | 'bug'
  | 'feature'
  | 'ux'
  | 'performance'
  | 'content'
  | 'other';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'wontfix' | 'duplicate';

export type FeedbackSeverity = 1 | 2 | 3 | 4 | 5; // 1=cosmetic, 5=blocker

export type FeedbackFeature =
  | 'inventory'
  | 'cotizacion'
  | 'ambassadors'
  | 'accounts'
  | 'home'
  | 'vault'
  | 'admin'
  | 'guide'
  | 'other';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

// =============================================================================
// MAIN INTERFACES
// =============================================================================

export interface FeedbackItem {
  // Core identification
  id: string;
  timestamp: string;
  version?: string;
  environment?: string;

  // Context
  page: string;
  component: string;
  feature?: FeedbackFeature;
  userFlow?: string;

  // Classification
  category: FeedbackCategory;
  priority: FeedbackPriority;
  severity?: FeedbackSeverity;
  tags?: string;

  // Details
  title?: string;
  description: string;
  expectedBehavior?: string;
  actualBehavior?: string;

  // Media
  screenshot: string; // Base64 encoded image or "[BASE64_OMITTED]"
  hasScreenshot?: boolean; // Set by API when screenshot is omitted
  highlightBox?: HighlightBox | null;

  // Device info
  deviceType?: DeviceType;
  browser?: string;
  os?: string;

  // Author
  adminEmail: string;
  adminName: string;

  // Tracking
  status: FeedbackStatus;
  assignee?: string;
  resolvedAt?: string;
  resolutionTime?: number; // Hours to resolve
  notes?: string;
  relatedIds?: string;

  // Computed (by API)
  ageHours?: number; // Hours since creation (for open items)
  _rowIndex?: number; // Sheet row index
}

export interface FeedbackSubmission {
  // Context
  page: string;
  component?: string;
  feature?: FeedbackFeature;
  userFlow?: string;

  // Classification
  category: FeedbackCategory;
  priority: FeedbackPriority;
  severity?: FeedbackSeverity;
  tags?: string;

  // Details
  title?: string;
  description: string;
  expectedBehavior?: string;
  actualBehavior?: string;

  // Media
  screenshot?: string;
  highlightBox?: HighlightBox;

  // Version info
  version?: string;
  environment?: string;
}

export interface HighlightBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// =============================================================================
// METRICS
// =============================================================================

export interface FeedbackMetrics {
  total: number;
  thisWeek: number;
  byStatus: Record<FeedbackStatus, number>;
  byPriority: Record<FeedbackPriority, number>;
  byCategory: Record<string, number>;
  byFeature: Record<string, number>;
  byDevice: Record<DeviceType, number>;
  avgResolutionTimeHours: number | null;
  oldestOpenId: string | null;
  oldestOpenTimestamp: string | null;
}

// =============================================================================
// WIZARD STATE
// =============================================================================

export type WizardStep = 'capture' | 'annotate' | 'categorize' | 'describe' | 'success';

export interface FeedbackWizardState {
  step: WizardStep;
  screenshot: string | null;
  highlightBox: HighlightBox | null;
  category: FeedbackCategory | null;
  priority: FeedbackPriority;
  description: string;
  isSubmitting: boolean;
  submittedId: string | null;
  error: string | null;
}

// =============================================================================
// CONTEXT
// =============================================================================

export interface FeedbackContextType {
  isOpen: boolean;
  openFeedback: () => void;
  closeFeedback: () => void;
  wizardState: FeedbackWizardState;
  setStep: (step: WizardStep) => void;
  setScreenshot: (screenshot: string) => void;
  setHighlightBox: (box: HighlightBox | null) => void;
  setCategory: (category: FeedbackCategory) => void;
  setPriority: (priority: FeedbackPriority) => void;
  setDescription: (description: string) => void;
  submitFeedback: () => Promise<void>;
  resetWizard: () => void;
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface FeedbackSubmitResponse {
  success: boolean;
  id?: string;
  row?: number;
  error?: string;
  message?: string;
}

export interface FeedbackListResponse {
  success: boolean;
  data?: FeedbackItem[];
  error?: string;
}

// =============================================================================
// CATEGORY CONFIG
// =============================================================================

export interface CategoryOption {
  value: FeedbackCategory;
  label: string;
  icon: string;
  description: string;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: 'bug',
    label: 'Bug',
    icon: '🐛',
    description: 'Error, fallo o comportamiento inesperado',
  },
  {
    value: 'feature',
    label: 'Feature',
    icon: '✨',
    description: 'Nueva funcionalidad o mejora solicitada',
  },
  {
    value: 'ux',
    label: 'UX/UI',
    icon: '🎨',
    description: 'Problema de diseño, usabilidad o experiencia',
  },
  {
    value: 'performance',
    label: 'Performance',
    icon: '⚡',
    description: 'Lentitud, lag o problemas de carga',
  },
  {
    value: 'content',
    label: 'Contenido',
    icon: '📝',
    description: 'Error de texto, traducción o datos',
  },
  {
    value: 'other',
    label: 'Otro',
    icon: '❓',
    description: 'Cualquier otro tipo de feedback',
  },
];

export interface PriorityOption {
  value: FeedbackPriority;
  label: string;
  color: string;
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: 'low', label: 'Baja', color: '#4caf50' },
  { value: 'medium', label: 'Media', color: '#ff9800' },
  { value: 'high', label: 'Alta', color: '#f44336' },
  { value: 'critical', label: 'Crítica', color: '#9c27b0' },
];

export interface SeverityOption {
  value: FeedbackSeverity;
  label: string;
  description: string;
  color: string;
}

export const SEVERITY_OPTIONS: SeverityOption[] = [
  { value: 1, label: '1 - Cosmético', description: 'Visual menor, no afecta funcionalidad', color: '#4caf50' },
  { value: 2, label: '2 - Menor', description: 'Molesto pero tiene workaround', color: '#8bc34a' },
  { value: 3, label: '3 - Moderado', description: 'Afecta productividad pero funciona', color: '#ff9800' },
  { value: 4, label: '4 - Mayor', description: 'Feature crítico no funciona bien', color: '#f44336' },
  { value: 5, label: '5 - Bloqueante', description: 'No se puede continuar trabajando', color: '#9c27b0' },
];

export interface FeatureOption {
  value: FeedbackFeature;
  label: string;
  icon: string;
}

export const FEATURE_OPTIONS: FeatureOption[] = [
  { value: 'inventory', label: 'Inventario/Tesoros', icon: '💎' },
  { value: 'cotizacion', label: 'Cotizaciones', icon: '📋' },
  { value: 'ambassadors', label: 'Embajadores', icon: '👥' },
  { value: 'accounts', label: 'Cuentas', icon: '💰' },
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'vault', label: 'Bóveda', icon: '🔐' },
  { value: 'admin', label: 'Admin', icon: '⚙️' },
  { value: 'guide', label: 'Guía', icon: '📖' },
  { value: 'other', label: 'Otro', icon: '📁' },
];

export const STATUS_OPTIONS: { value: FeedbackStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Abierto', color: '#2196f3' },
  { value: 'in_progress', label: 'En Progreso', color: '#ff9800' },
  { value: 'resolved', label: 'Resuelto', color: '#4caf50' },
  { value: 'wontfix', label: 'No se hará', color: '#9e9e9e' },
  { value: 'duplicate', label: 'Duplicado', color: '#607d8b' },
];
