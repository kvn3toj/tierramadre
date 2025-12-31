/**
 * Feedback System Types
 *
 * TypeScript interfaces for admin feedback reporting system.
 */

// =============================================================================
// ENUMS
// =============================================================================

export type FeedbackCategory =
  | 'button'
  | 'layout'
  | 'text'
  | 'performance'
  | 'other';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'wontfix';

// =============================================================================
// MAIN INTERFACES
// =============================================================================

export interface FeedbackItem {
  id: string;
  timestamp: string;
  page: string;
  component: string;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  description: string;
  screenshot: string; // Base64 encoded image or "[BASE64_OMITTED]"
  hasScreenshot?: boolean; // Set by API when screenshot is omitted
  adminEmail: string;
  adminName: string;
  status: FeedbackStatus;
  resolvedAt?: string;
  notes?: string;
}

export interface FeedbackSubmission {
  page: string;
  component?: string;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  description: string;
  screenshot: string;
  highlightBox?: HighlightBox;
}

export interface HighlightBox {
  x: number;
  y: number;
  width: number;
  height: number;
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
    value: 'button',
    label: 'Botón',
    icon: '🔘',
    description: 'Botón sin acción, mal posicionado o con mal diseño',
  },
  {
    value: 'layout',
    label: 'Layout',
    icon: '📐',
    description: 'Problema de espaciado, alineación o estructura',
  },
  {
    value: 'text',
    label: 'Texto',
    icon: '✏️',
    description: 'Error de contenido, tipografía o traducción',
  },
  {
    value: 'performance',
    label: 'Rendimiento',
    icon: '⚡',
    description: 'Lentitud, lag o problemas de carga',
  },
  {
    value: 'other',
    label: 'Otro',
    icon: '❓',
    description: 'Cualquier otro tipo de problema',
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
