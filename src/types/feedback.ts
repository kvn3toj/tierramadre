/**
 * Feedback System Types (Enhanced)
 *
 * TypeScript interfaces for admin feedback reporting system.
 * Enhanced with: severity, tags, device info, assignees, and metrics.
 */

import { semanticColors, accentColors } from '../design-system';

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

export type AffectedUsersType = 'single' | 'multiple' | 'all' | 'unknown';

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

  // Steve's Enhancements (AD-AK)
  reproductionSteps?: string; // Steps to reproduce the issue
  affectedUsers?: AffectedUsersType; // Number/type of affected users
  workaround?: string; // Temporary workaround if available
  linkedPR?: string; // GitHub PR link for the fix
  firstResponseAt?: string; // Timestamp of first response/acknowledgment
  firstResponseTime?: number; // Hours until first response
  reopenCount?: number; // Number of times issue was reopened
  satisfactionScore?: 1 | 2 | 3 | 4 | 5 | null; // User satisfaction after resolution

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

export interface SLAMetrics {
  firstResponseTarget: number; // hours
  criticalResolutionTarget: number; // hours
  highResolutionTarget: number; // hours
  avgFirstResponse: number | null;
  avgCriticalResolution: number | null;
  avgHighResolution: number | null;
}

export interface FeedbackMetrics {
  total: number;
  thisWeek: number;
  lastWeek: number;
  weeklyTrend: number; // percentage change
  byStatus: Record<FeedbackStatus, number>;
  byPriority: Record<FeedbackPriority, number>;
  byCategory: Record<string, number>;
  byFeature: Record<string, number>;
  byDevice: Record<DeviceType, number>;
  byAffectedUsers: Record<AffectedUsersType, number>;
  avgResolutionTimeHours: number | null;
  avgFirstResponseTimeHours: number | null;
  avgSatisfactionScore: number | null;
  reopenRate: number; // percentage
  totalReopens: number;
  sla: SLAMetrics;
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
  { value: 'low', label: 'Baja', color: semanticColors.success.main },
  { value: 'medium', label: 'Media', color: semanticColors.warning.main },
  { value: 'high', label: 'Alta', color: semanticColors.error.main },
  { value: 'critical', label: 'Crítica', color: accentColors.purple.light },
];

export interface SeverityOption {
  value: FeedbackSeverity;
  label: string;
  description: string;
  color: string;
}

export const SEVERITY_OPTIONS: SeverityOption[] = [
  { value: 1, label: '1 - Cosmético', description: 'Visual menor, no afecta funcionalidad', color: semanticColors.success.main },
  { value: 2, label: '2 - Menor', description: 'Molesto pero tiene workaround', color: accentColors.success.light },
  { value: 3, label: '3 - Moderado', description: 'Afecta productividad pero funciona', color: semanticColors.warning.main },
  { value: 4, label: '4 - Mayor', description: 'Feature crítico no funciona bien', color: semanticColors.error.main },
  { value: 5, label: '5 - Bloqueante', description: 'No se puede continuar trabajando', color: accentColors.purple.light },
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
  { value: 'open', label: 'Abierto', color: semanticColors.info.main },
  { value: 'in_progress', label: 'En Progreso', color: semanticColors.warning.main },
  { value: 'resolved', label: 'Resuelto', color: semanticColors.success.main },
  { value: 'wontfix', label: 'No se hará', color: '#9CA3AF' },
  { value: 'duplicate', label: 'Duplicado', color: '#64748B' },
];

// Steve's Enhancements
export interface AffectedUsersOption {
  value: AffectedUsersType;
  label: string;
  icon: string;
}

export const AFFECTED_USERS_OPTIONS: AffectedUsersOption[] = [
  { value: 'single', label: 'Usuario único', icon: '👤' },
  { value: 'multiple', label: 'Múltiples usuarios', icon: '👥' },
  { value: 'all', label: 'Todos los usuarios', icon: '🌐' },
  { value: 'unknown', label: 'Desconocido', icon: '❓' },
];

export interface SatisfactionOption {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
  icon: string;
}

export const SATISFACTION_OPTIONS: SatisfactionOption[] = [
  { value: 1, label: 'Muy insatisfecho', icon: '😠' },
  { value: 2, label: 'Insatisfecho', icon: '😟' },
  { value: 3, label: 'Neutral', icon: '😐' },
  { value: 4, label: 'Satisfecho', icon: '😊' },
  { value: 5, label: 'Muy satisfecho', icon: '🤩' },
];
