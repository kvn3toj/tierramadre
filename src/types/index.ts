// Core data types for Tierra Madre Studio

export interface Emerald {
  id: string;
  name: string;
  imageUrl: string;              // Base64 data URI
  aiSuggestedNames: string[];
  aiDescription: string;
  weightCarats?: number;
  priceCOP?: number;
  lotCode?: string;              // L:A-XXX, L:II-JA format
  category: EmeraldCategory;
  status: EmeraldStatus;
  createdAt: string;
  updatedAt: string;
}

export type EmeraldCategory = 'loose' | 'ring' | 'pendant' | 'earrings';
export type EmeraldStatus = 'available' | 'sold' | 'reserved';

export interface InstagramPost {
  id: string;
  emeraldId: string;
  caption: string;
  hashtags: string[];
  scheduledDate: string;
  status: PostStatus;
  gridPosition?: number;         // 0-8 for 3x3 grid
}

export type PostStatus = 'draft' | 'scheduled' | 'posted';

export type NamingCategory =
  | 'mythology'    // Diosa, Venus, Gaia, Apolo
  | 'royalty'      // La Reina Margot, Las Emperatrices
  | 'nature'       // Amazonas, Pacífico, Bambú
  | 'cosmic'       // Galaxia, Lunera, Firmamento
  | 'emotional'    // Amor Eterno, Chispa Divina
  | 'disney';      // Rapunzel, Aurora, Bella

export interface AIAnalysisResult {
  names: string[];
  description: string;
  characteristics: string[];
}

export interface AppState {
  emeralds: Emerald[];
  posts: InstagramPost[];
  settings: {
    anthropicApiKey?: string;
  };
}

export interface CatalogItem {
  emeraldId: string;
  showPrice: boolean;
  showWeight: boolean;
  order: number;
}

// Receipt types
export interface ReceiptProduct {
  id: string;
  name: string;
  description?: string;
  weightCarats?: number;
  priceUSD: number;
}

export interface ReceiptData {
  id: string;
  receiptNumber: string;
  date: string;
  client: {
    name: string;
    phone?: string;
    email?: string;
    document?: string;
  };
  products: ReceiptProduct[];
  subtotal: number;
  discount?: number;
  discountPercent?: number;
  tax?: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'crypto';
  notes?: string;
  createdAt: string;
}

// Inventory types for official stock
export type InventoryStatus = 'DISPONIBLE' | 'VENDIDA' | 'ASESOR';
export type EmeraldColor = 'Verde Vivido' | 'Verde Muzo' | 'Verde Limón' | 'Verde Menta' | 'Verde Natural' | string;
export type EmeraldQuality = 'Fina' | 'Comercial Fina' | 'Comercial SuperFina' | 'Comercial Superior' | 'Comercial Estandar' | 'Estandar' | string;
export type EmeraldCut = 'Cushion' | 'Corazon' | 'Esmeralda' | 'Ovalo' | 'Redonda' | 'Cuadrada' | 'lagrima' | string;

// Colombian emerald regions
export type ColombianRegion = 'Muzo' | 'Chivor' | 'Coscuez' | 'Peñas Blancas' | 'La Pita' | 'Other';

// Chain of custody role types
export type CustodyRole = 'MINER' | 'CUTTER' | 'POLISHER' | 'DEALER' | 'SELLER';

// Gemological lab types
export type GemologicalLab = 'GIA' | 'IGI' | 'CDTEC' | 'AGL' | 'Gübelin' | 'SSEF' | 'Other';

// Demand indicator for market scoring
export type DemandIndicator = 'HIGH' | 'MEDIUM' | 'LOW';

// Chain of custody record for provenance tracking
export interface CustodyRecord {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  role: CustodyRole;
  location: string;
  verificationMethod: 'SIGNATURE' | 'PHOTO' | 'DOCUMENT';
  notes?: string;
}

// Gemological certification details
export interface GemologicalCertification {
  lab: GemologicalLab;
  certificateNumber: string;
  reportDate: string;
  authenticity: 'VERIFIED' | 'PENDING' | 'EXPIRED';
  certificateImage?: string;  // Base64 or URL
  clarity?: 'FL' | 'IF' | 'VVS' | 'VS' | 'SI' | 'I';
  colorGrade?: string;
  cutGrade?: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'FAIR';
  treatments?: 'NONE' | 'OILED' | 'RESIN' | 'OTHER';
  treatmentDetails?: string;
}

// Colombian origin certification
export interface ColombianOriginCertification {
  verified: boolean;
  region: ColombianRegion;
  mineName?: string;
  certifyingBody?: string;
  certificateNumber?: string;
  verificationDate?: string;
}

// Ethical sourcing certification
export interface EthicalCertification {
  fairTrade: boolean;
  conflictFree: boolean;
  environmentalCompliance: boolean;
  certifyingBody?: string;
  certificateDate?: string;
}

// All certifications for an inventory item
export interface ItemCertifications {
  gemological?: GemologicalCertification;
  colombianOrigin?: ColombianOriginCertification;
  ethical?: EthicalCertification;
}

// Aesthetic rating (1-10 scale)
export interface AestheticRating {
  fire: number;           // Brilliance/sparkle
  saturation: number;     // Color saturation
  uniqueness: number;     // Unique characteristics
  photographability: number; // Marketing appeal
  average?: number;       // Computed average
}

// Trust score breakdown
export interface TrustScoreBreakdown {
  provenance: number;     // 0-100, weighted 25%
  quality: number;        // 0-100, weighted 30%
  aesthetic: number;      // 0-100, weighted 20%
  market: number;         // 0-100, weighted 25%
  overall: number;        // Weighted average
}

// Trust badge levels
export type TrustLevel = 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE';

// Trust badge display info
export interface TrustBadge {
  level: TrustLevel;
  color: string;
  bgColor: string;
  label: string;
  labelShort: string;
  icon: string;
}

// Certification status summary
export interface CertificationStatus {
  gemological: 'verified' | 'pending' | 'expired';
  colombianOrigin: 'verified' | 'pending';
  ethical: 'verified' | 'pending';
  chainOfCustody: 'verified' | 'pending';
  completeness: number;   // 0-100 percentage
  totalVerified: number;
  totalPossible: number;
}

export interface InventoryItem {
  item: number;
  fechaIngreso: string;
  nombre: string;
  peso: string | number;  // Can be "Plata" for jewelry or carats number
  color: EmeraldColor;
  calidad: EmeraldQuality;
  cantidad: number;
  talla: string;
  medidas: string;
  imagen?: string;
  costoTM?: number;
  precioCOP: number;
  ubicacion: string;
  asesor: string;
  estado: InventoryStatus;
  caja?: string;
  isJewelry: boolean;  // Computed: true if peso is "Plata" or "Oro 18k"
  metalType?: 'Plata' | 'Oro 18k';

  // Trust & Provenance fields (Rachel's Trust Architecture)
  certifications?: ItemCertifications;
  chainOfCustody?: CustodyRecord[];
  aestheticRating?: AestheticRating;
  demandIndicator?: DemandIndicator;
  trustScore?: TrustScoreBreakdown;  // Cached trust score
  lastTrustUpdate?: string;          // ISO date of last trust calculation
}
