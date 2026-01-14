/**
 * Provider Types for Quotation System
 *
 * Types for provider portal, quotation requests, and provider quotations.
 */

// Product types for quotations
export type ProductType = 'piedra_suelta' | 'anillo' | 'collar' | 'pendientes' | 'pulsera';

// Status for quotation requests
export type RequestStatus = 'pendiente' | 'respondida' | 'cancelada';

// Status for provider quotations
export type QuotationStatus = 'disponible' | 'reservado' | 'vendido';

// Provider profile status
export type ProviderStatus = 'ACTIVO' | 'INACTIVO';

/**
 * Quotation Request (Admin to Provider)
 * Admin creates requests for specific emerald specifications
 */
export interface QuotationRequest {
  id: string;
  createdAt: string;
  productType: ProductType;
  weightMin: number;           // Min carats
  weightMax: number;           // Max carats
  colorPreference: string;     // Verde Vivido, Verde Muzo, etc.
  qualityPreference: string;   // Fina, Comercial Fina, etc.
  budgetMax: number;           // COP
  quantity: number;            // How many pieces needed
  notes: string;
  status: RequestStatus;
  assignedProvider?: string;   // Provider email (optional)
  responseId?: string;         // Link to provider response
  createdBy: string;           // Admin email
  referencePhotoUrls?: string[]; // Reference images/videos from admin
}

/**
 * Provider Quotation (Provider to Admin)
 * Provider submits available inventory or responds to requests
 */
export interface ProviderQuotation {
  id: string;
  providerEmail: string;
  providerName?: string;       // Provider company name
  createdAt: string;
  productType: ProductType;
  description: string;
  weightCarats: number;
  color: string;
  quality: string;
  priceCOP: number;
  availability: number;        // Quantity available
  photoUrls: string[];         // Google Drive URLs
  requestId?: string;          // If responding to a request
  status: QuotationStatus;
  notes: string;
  viewedByAdmin: boolean;
}

/**
 * Provider Profile
 * Whitelisted provider information
 */
export interface ProviderProfile {
  id: string;
  name: string;                // Company name
  email: string;               // Whitelisted email
  contactPerson: string;       // Contact person name
  whatsapp: string;            // Contact phone
  specialty: string;           // Stone type specialty
  status: ProviderStatus;
  registeredAt: string;
}

/**
 * Form data for creating quotation requests
 */
export interface QuotationRequestFormData {
  productType: ProductType;
  weightMin: number;
  weightMax: number;
  colorPreference: string;
  qualityPreference: string;
  budgetMax: number;
  quantity: number;            // How many pieces needed
  notes: string;
  assignedProvider?: string;
  referencePhotoUrls?: string[]; // Reference images/videos from admin
}

/**
 * Form data for provider quotation submission
 */
export interface ProviderQuotationFormData {
  productType: ProductType;
  description: string;
  weightCarats: number;
  color: string;
  quality: string;
  priceCOP: number;
  availability: number;
  photoUrls: string[];
  requestId?: string;
  notes: string;
}

// Product type labels for UI
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  piedra_suelta: 'Gemas',
  anillo: 'Anillo',
  collar: 'Collar',
  pendientes: 'Pendientes',
  pulsera: 'Pulsera',
};

// Request status labels for UI
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pendiente: 'Pendiente',
  respondida: 'Respondida',
  cancelada: 'Cancelada',
};

// Quotation status labels for UI
export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
};

// ============================================
// Product Requests (Asesor/Embajador → Admin)
// ============================================

// Status for product requests from asesores to admin
export type ProductRequestStatus = 'pendiente' | 'aprobada' | 'enviada_proveedor' | 'rechazada' | 'completada';

// Priority levels for requests
export type RequestPriority = 'normal' | 'urgente' | 'muy_urgente';

/**
 * Product Request (Asesor/Embajador to Admin)
 * Asesores and embajadores request products they need for their clients.
 * Admin reviews and decides if provider needs to be contacted.
 */
export interface ProductRequest {
  id: string;
  createdAt: string;
  // Requester info
  requesterEmail: string;
  requesterName: string;
  requesterRole: 'asesor' | 'embajador';
  // Product details
  productType: ProductType;
  description: string;
  weightMin: number;           // Min carats
  weightMax: number;           // Max carats
  colorPreference: string;     // Verde Vivido, etc.
  qualityPreference: string;   // Fina, Comercial Fina, etc.
  budgetMin?: number;          // COP - optional min budget
  budgetMax: number;           // COP
  quantity: number;            // How many pieces needed
  // Client info (optional)
  clientName?: string;
  clientNotes?: string;
  // Request metadata
  priority: RequestPriority;
  neededBy?: string;           // ISO date when needed
  notes: string;
  referencePhotoUrls?: string[]; // Reference images
  // Status tracking
  status: ProductRequestStatus;
  // Admin response
  adminResponse?: string;
  respondedBy?: string;        // Admin email who responded
  respondedAt?: string;        // ISO date
  // Link to quotation request if forwarded to provider
  linkedQuotationId?: string;
}

/**
 * Form data for creating product requests
 */
export interface ProductRequestFormData {
  productType: ProductType;
  description: string;
  weightMin: number;
  weightMax: number;
  colorPreference: string;
  qualityPreference: string;
  budgetMin?: number;
  budgetMax: number;
  quantity: number;
  clientName?: string;
  clientNotes?: string;
  priority: RequestPriority;
  neededBy?: string;
  notes: string;
  referencePhotoUrls?: string[];
}

// Product request status labels for UI
export const PRODUCT_REQUEST_STATUS_LABELS: Record<ProductRequestStatus, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  enviada_proveedor: 'Enviada a Proveedor',
  rechazada: 'Rechazada',
  completada: 'Completada',
};

// Priority labels for UI
export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  normal: 'Normal',
  urgente: 'Urgente',
  muy_urgente: 'Muy Urgente',
};
