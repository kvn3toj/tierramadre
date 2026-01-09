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
  notes: string;
  status: RequestStatus;
  assignedProvider?: string;   // Provider email (optional)
  responseId?: string;         // Link to provider response
  createdBy: string;           // Admin email
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
  notes: string;
  assignedProvider?: string;
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
  piedra_suelta: 'Piedra Suelta',
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
