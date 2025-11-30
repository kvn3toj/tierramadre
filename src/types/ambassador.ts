// Ambassador Mini-Webs Type System
// Rachel's Trust Architecture for Seller Profiles

/**
 * Ambassador Profile - Foundation of seller trust
 * Combines personal branding with verifiable trust signals
 */
export interface AmbassadorProfile {
  // Identity
  id: string;
  userId: string;
  slug: string; // URL-friendly: /ambassador/maria-esmeraldas

  // Personal Branding
  displayName: string;
  tagline: string; // "Especialista en Esmeraldas de Inversion"
  bio: string;
  photoUrl: string;
  bannerUrl?: string;
  logo?: string; // For self-branding template

  // Contact & Social
  contactMethods: ContactMethod[];
  socialLinks: SocialLink[];
  location: AmbassadorLocation;
  languages: Language[];
  timezone: string;

  // Specialization
  specialties: Specialty[];
  priceRange: PriceRange;
  expertise: ExpertiseArea[];
  certifications: AmbassadorCertification[];

  // Template Configuration
  template: TemplateConfig;

  // Trust Metrics (READ-ONLY, calculated)
  trustScore?: AmbassadorTrustScore;
  reputation?: ReputationMetrics;

  // Status
  status: 'active' | 'inactive' | 'suspended';
  verificationStatus: VerificationLevel;
  joinedDate: string;
  lastActive: string;
}

/**
 * Template System - Dual-track branding strategy
 */
export interface TemplateConfig {
  type: 'tm-official' | 'self-brand';

  // Theme Customization
  colorScheme: ColorScheme;
  layout: LayoutVariation;

  // Content Modules (toggle on/off)
  modules: {
    portfolio: boolean;
    testimonials: boolean;
    certifications: boolean;
    aboutMe: boolean;
    featuredProducts: boolean;
    recentSales: boolean;
    trustBadges: boolean;
    contactForm: boolean;
  };

  // Featured Content
  featuredProducts: string[]; // Product IDs
  highlightedTestimonials: string[]; // Review IDs
}

/**
 * Trust Score - Multi-dimensional reputation for SELLERS
 * Different from product certification - this measures the PERSON
 */
export interface AmbassadorTrustScore {
  overall: number; // 0-100 composite score

  // Trust Dimensions
  components: {
    transactionHistory: number; // Completion rate, volume
    customerSatisfaction: number; // Review ratings
    responseTime: number; // Communication speed
    expertise: number; // Certifications, experience
    authenticity: number; // Product certifications sold
    reliability: number; // Consistency over time
  };

  // Confidence Interval
  confidence: number; // 0-1, based on data volume
  lastCalculated: string;
}

/**
 * Reputation Metrics - Verifiable Performance Data
 */
export interface ReputationMetrics {
  // Transaction Stats
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  repeatCustomerRate: number;

  // Time-based Performance
  stats30d: PerformanceWindow;
  stats90d: PerformanceWindow;
  statsAllTime: PerformanceWindow;

  // Customer Satisfaction
  averageRating: number; // 1-5 stars
  totalReviews: number;
  ratingDistribution: RatingDistribution;

  // Responsiveness
  avgResponseTime: number; // hours
  responseRate: number; // % of inquiries answered

  // Trust Signals
  verifiedPurchases: number;
  certifiedProductsSold: number;
  disputeRate: number; // % of sales with disputes
  resolutionRate: number; // % of disputes resolved favorably
}

export interface PerformanceWindow {
  sales: number;
  revenue: number;
  avgRating: number;
  responseTime: number;
}

/**
 * Testimonial/Review System
 */
export interface Testimonial {
  id: string;
  ambassadorId: string;
  customerId: string;
  customerName: string; // Anonymizable
  customerPhoto?: string;

  // Review Content
  rating: number; // 1-5
  title: string;
  comment: string;
  photos?: string[];

  // Context
  productId?: string; // Which emerald
  purchaseDate: string;
  purchaseValue: number;

  // Verification
  verified: boolean; // Linked to actual transaction
  verificationMethod: 'purchase' | 'manual' | 'imported';

  // Ambassador Response
  response?: {
    text: string;
    date: string;
  };

  // Status
  status: 'pending' | 'approved' | 'flagged';
  moderationNotes?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Portfolio Item - Showcase Past Work
 */
export interface PortfolioItem {
  id: string;
  ambassadorId: string;

  // Content
  title: string;
  description: string;
  images: string[];
  category: 'ring' | 'pendant' | 'earrings' | 'loose' | 'custom';

  // Product Link (if still available)
  productId?: string;
  soldPrice?: number;
  soldDate?: string;

  // Story
  clientStory?: string; // "Made for anniversary gift"
  specialFeatures: string[];

  featured: boolean;
  order: number; // Display order
}

/**
 * Verification & Badges
 */
export interface VerificationLevel {
  level: 'unverified' | 'basic' | 'verified' | 'premium';
  badges: AmbassadorBadge[];
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface AmbassadorBadge {
  type: AmbassadorBadgeType;
  earnedAt: string;
  expiresAt?: string;
  criteria: string; // What they did to earn it
}

export type AmbassadorBadgeType =
  | 'identity-verified'
  | 'expert-gemologist'
  | 'top-seller'
  | 'fast-responder'
  | 'customer-favorite'
  | 'certified-trainer'
  | 'founders-circle';

/**
 * Supporting Types
 */
export interface ContactMethod {
  type: 'whatsapp' | 'phone' | 'email' | 'telegram' | 'instagram';
  value: string;
  primary: boolean;
  verified: boolean;
}

export interface SocialLink {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'website';
  url: string;
  username?: string;
}

export interface AmbassadorLocation {
  city: string;
  region?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export type Language = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it' | 'zh' | 'ja';

export interface Specialty {
  name: string;
  description: string;
  yearsExperience?: number;
  icon?: string;
}

export type PriceRange = 'budget' | 'mid-range' | 'luxury' | 'investment' | 'all';

export interface ExpertiseArea {
  area: 'loose-stones' | 'jewelry' | 'investment' | 'custom-design' | 'wholesale' | 'retail';
  level: 'beginner' | 'intermediate' | 'expert';
  description?: string;
}

export interface AmbassadorCertification {
  type: 'gemologist' | 'appraiser' | 'jewelry-designer' | 'sales-expert' | 'other';
  name: string;
  issuingBody: string;
  dateIssued: string;
  expiryDate?: string;
  certificateUrl?: string;
  verified: boolean;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export type LayoutVariation =
  | 'professional' // Traditional business card style
  | 'modern' // Bold, visual-first
  | 'elegant' // Luxury feel
  | 'minimal'; // Clean and simple

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

/**
 * Template Presets
 */
export const TEMPLATE_PRESETS = {
  'tm-official': {
    name: 'Tierra Madre Official',
    description: 'Consistencia de marca con paleta verde esmeralda',
    colorScheme: {
      primary: '#059669',
      secondary: '#064e3b',
      accent: '#fbbf24',
      background: '#ffffff',
      text: '#1f2937'
    },
    layout: 'professional' as LayoutVariation,
    restrictions: {
      logoUpload: false,
      colorCustomization: 'limited',
      layoutChange: false
    }
  },
  'self-brand': {
    name: 'Marca Personal',
    description: 'Personalizacion completa con tu identidad',
    colorScheme: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#f59e0b',
      background: '#f9fafb',
      text: '#111827'
    },
    layout: 'modern' as LayoutVariation,
    restrictions: {
      logoUpload: true,
      colorCustomization: 'full',
      layoutChange: true
    }
  }
};

/**
 * Badge Display Info
 */
export const AMBASSADOR_BADGE_INFO: Record<AmbassadorBadgeType, { name: string; icon: string; description: string }> = {
  'identity-verified': {
    name: 'Identidad Verificada',
    icon: '✓',
    description: 'Documentos de identidad confirmados por Tierra Madre'
  },
  'expert-gemologist': {
    name: 'Gemologo Certificado',
    icon: '💎',
    description: 'Certificacion profesional en gemologia'
  },
  'top-seller': {
    name: 'Vendedor Destacado',
    icon: '⭐',
    description: 'Top 10% en ventas del ultimo trimestre'
  },
  'fast-responder': {
    name: 'Respuesta Rapida',
    icon: '⚡',
    description: 'Responde consultas en menos de 2 horas'
  },
  'customer-favorite': {
    name: 'Favorito de Clientes',
    icon: '❤️',
    description: '95%+ de resenas positivas'
  },
  'certified-trainer': {
    name: 'Capacitador Certificado',
    icon: '🎓',
    description: 'Entrenador oficial de Tierra Madre'
  },
  'founders-circle': {
    name: 'Circulo Fundador',
    icon: '🏆',
    description: 'Miembro fundador de la comunidad'
  }
};

/**
 * Trust Level Labels
 */
export const AMBASSADOR_TRUST_LEVELS = {
  ELITE: { min: 90, label: 'Elite', color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.15)' },
  TRUSTED: { min: 75, label: 'Confiable', color: '#059669', bgColor: 'rgba(5, 150, 105, 0.15)' },
  ESTABLISHED: { min: 50, label: 'Establecido', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  NEWCOMER: { min: 0, label: 'Nuevo', color: '#9CA3AF', bgColor: 'rgba(156, 163, 175, 0.15)' }
};

/**
 * Create default ambassador profile
 */
export function createDefaultAmbassadorProfile(userId: string, displayName: string): AmbassadorProfile {
  const slug = displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return {
    id: `amb_${Date.now()}`,
    userId,
    slug,
    displayName,
    tagline: '',
    bio: '',
    photoUrl: '',
    contactMethods: [],
    socialLinks: [],
    location: { city: '', country: 'Colombia' },
    languages: ['es'],
    timezone: 'America/Bogota',
    specialties: [],
    priceRange: 'all',
    expertise: [],
    certifications: [],
    template: {
      type: 'tm-official',
      colorScheme: TEMPLATE_PRESETS['tm-official'].colorScheme,
      layout: 'professional',
      modules: {
        portfolio: true,
        testimonials: true,
        certifications: true,
        aboutMe: true,
        featuredProducts: true,
        recentSales: false,
        trustBadges: true,
        contactForm: true
      },
      featuredProducts: [],
      highlightedTestimonials: []
    },
    status: 'active',
    verificationStatus: {
      level: 'unverified',
      badges: []
    },
    joinedDate: new Date().toISOString(),
    lastActive: new Date().toISOString()
  };
}
