// Core data types for Tierra Madre Studio

export type MediaType = 'image' | 'video';

export interface Emerald {
  id: string;
  name: string;
  imageUrl: string;              // Base64 data URI for images, indexeddb:// reference for videos
  mediaType?: MediaType;         // Type of media (defaults to 'image' for backwards compatibility)
  thumbnailUrl?: string;         // Thumbnail for videos (base64 data URI)
  aiSuggestedNames: string[];
  aiDescription: string;
  weightCarats?: number;
  priceCOP?: number;
  lotCode?: string;              // L:A-XXX, L:II-JA format
  category: EmeraldCategory;
  status: EmeraldStatus;
  // Jewelry-specific fields
  ringSize?: string;             // For rings: 4, 5, 6, 7, 8...
  color?: string;                // Verde Muzo, Verde Chivor, etc.
  quality?: string;              // Premium, Estándar, etc.
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

// Treasure types for official stock
export type TreasureStatus = 'DISPONIBLE' | 'VENDIDA' | 'ASESOR';
export type EmeraldColor = 'Verde Vivido' | 'Verde Muzo' | 'Verde Limón' | 'Verde Menta' | 'Verde Natural' | string;
export type EmeraldQuality = 'Fina' | 'Comercial Fina' | 'Comercial SuperFina' | 'Comercial Superior' | 'Comercial Estándar' | 'Estándar' | string;
export type EmeraldCut = 'Cushion' | 'Corazón' | 'Esmeralda' | 'Óvalo' | 'Redonda' | 'Cuadrada' | 'Lágrima' | string;

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

// All certifications for a treasure item
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

// Image verification and quality types
export type ImageVerificationStatus = 'pending' | 'verified' | 'rejected' | 'needs_review';
export type ImageQualityLevel = 1 | 2 | 3 | 4 | 5;

export interface ImageQualityCheck {
  resolution: {
    width: number;
    height: number;
    isAcceptable: boolean;  // min 1200px for product photos
  };
  fileSize: {
    bytes: number;
    isOptimal: boolean;     // 100KB-5MB range
  };
  brightness: number;       // 0-255, ideal 120-180
  contrast: number;         // 0-100, ideal 40-70
  sharpness: number;        // 0-100, detected blur level
  colorAccuracy: number;    // 0-100, emerald green detection
  overallScore: ImageQualityLevel;
  recommendations: string[];
}

export interface ImageMetadata {
  sourceUrl: string;               // Original source (Drive, Cloudinary, local)
  cloudinaryUrl?: string;          // Optimized CDN URL
  driveUrl?: string;               // Google Drive backup URL
  driveFileId?: string;            // Google Drive file ID
  uploadedAt: string;
  verifiedAt?: string;
  verificationStatus: ImageVerificationStatus;
  qualityCheck?: ImageQualityCheck;
  verifiedBy?: string;             // User who verified
  notes?: string;
}

export interface EmeraldImageGallery {
  primary: ImageMetadata;          // Main product photo
  gallery: ImageMetadata[];        // Additional photos
  hasAllAngles: boolean;           // Has front, back, side views
  hasMacro: boolean;               // Has close-up detail shot
  hasLifestyle: boolean;           // Has in-context/hand shot
}

export interface TreasureItem {
  item: number;
  fechaIngreso: string;
  nombre: string;
  peso: string | number;  // Can be "Plata" for jewelry or carats number
  color: EmeraldColor;
  calidad: EmeraldQuality;
  cantidad: number;
  talla: string;
  medidas: string;
  medidasValores?: string;  // Actual measurement values (Largo x Ancho in mm)
  imagen?: string;
  imageUrl?: string;         // Image URL from Google Sheets API
  mediaType?: MediaType;     // Type of media (image or video)
  thumbnailUrl?: string;     // Thumbnail for videos
  galleryCount?: number;     // Number of media items in gallery
  costoTM?: number;
  precioCOP: number;
  precioInternacional?: number;  // International price from Google Sheets (Column H)
  ubicacion: string;
  asesor: string;
  estado: TreasureStatus;
  caja?: string;
  qr?: string;                      // QR code data (Column P)
  coleccion?: string;               // Collection/Catalog label for grouping (Column Q)
  isJewelry: boolean;  // Computed: true if peso is "Plata" or "Oro 18k"
  metalType?: 'Plata' | 'Oro 18k';

  // Provenance fields
  certifications?: ItemCertifications;
  chainOfCustody?: CustodyRecord[];
  aestheticRating?: AestheticRating;
  demandIndicator?: DemandIndicator;

  // Image verification fields
  imageGallery?: EmeraldImageGallery;
  imageVerificationStatus?: ImageVerificationStatus;
  lastImageVerification?: string;    // ISO date of last verification

  // Location and exclusivity fields
  city?: 'Cali' | 'Bogotá';         // City location for filtering
  isVaultExclusive?: boolean;        // True if item is part of Secret Vault collection
}

