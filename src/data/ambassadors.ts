// Ambassador Sample Data and Storage
// Demo ambassadors for Tierra Madre Studio

import {
  AmbassadorProfile,
  Testimonial
} from '../types/ambassador';

// Storage key
const AMBASSADORS_STORAGE_KEY = 'tierra_madre_ambassadors';
const TESTIMONIALS_STORAGE_KEY = 'tierra_madre_testimonials';

/**
 * Sample Ambassadors for Demo
 */
export const SAMPLE_AMBASSADORS: AmbassadorProfile[] = [
  {
    id: 'amb_001',
    userId: 'user_campuzano',
    slug: 'm-campuzano',
    displayName: 'M. Campuzano',
    tagline: 'Especialista en Esmeraldas de Alta Calidad',
    bio: 'Con amplia experiencia en el mercado de esmeraldas colombianas, me especializo en piedras de calidad comercial superfina y fina. Mi compromiso es ofrecer las mejores esmeraldas de Tierra Madre con total transparencia y confianza.',
    photoUrl: '',
    bannerUrl: '',
    contactMethods: [
      { type: 'whatsapp', value: '+57 310 555 1234', primary: true, verified: true },
      { type: 'email', value: 'campuzano@tierramadre.co', primary: false, verified: true }
    ],
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/tierramadre_esmeraldas', username: '@tierramadre_esmeraldas' }
    ],
    location: { city: 'Bogota', region: 'Cundinamarca', country: 'Colombia' },
    languages: ['es', 'en'],
    timezone: 'America/Bogota',
    specialties: [
      { name: 'Esmeraldas Comerciales', description: 'Piedras de calidad comercial fina y superfina', yearsExperience: 12 },
      { name: 'Joyeria en Plata', description: 'Aretes y anillos en plata con esmeraldas', yearsExperience: 10 }
    ],
    priceRange: 'all',
    expertise: [
      { area: 'loose-stones', level: 'expert', description: 'Especialista en piedras sueltas' },
      { area: 'jewelry', level: 'expert', description: 'Joyeria fina' }
    ],
    certifications: [
      {
        type: 'gemologist',
        name: 'Experto en Esmeraldas Colombianas',
        issuingBody: 'Tierra Madre Academy',
        dateIssued: '2018-03-15',
        verified: true
      }
    ],
    template: {
      type: 'tm-official',
      colorScheme: {
        primary: '#059669',
        secondary: '#064e3b',
        accent: '#fbbf24',
        background: '#ffffff',
        text: '#1f2937'
      },
      layout: 'professional',
      modules: {
        portfolio: true,
        testimonials: true,
        certifications: true,
        aboutMe: true,
        featuredProducts: true,
        recentSales: true,
        trustBadges: true,
        contactForm: true
      },
      featuredProducts: [],
      highlightedTestimonials: []
    },
    trustScore: {
      overall: 92,
      components: {
        transactionHistory: 95,
        customerSatisfaction: 98,
        responseTime: 85,
        expertise: 90,
        authenticity: 88,
        reliability: 95
      },
      confidence: 0.95,
      lastCalculated: new Date().toISOString()
    },
    reputation: {
      totalSales: 245,
      totalRevenue: 680000000,
      averageOrderValue: 2775510,
      repeatCustomerRate: 0.45,
      stats30d: { sales: 18, revenue: 52000000, avgRating: 4.9, responseTime: 1.5 },
      stats90d: { sales: 55, revenue: 155000000, avgRating: 4.85, responseTime: 1.8 },
      statsAllTime: { sales: 245, revenue: 680000000, avgRating: 4.8, responseTime: 2.1 },
      averageRating: 4.8,
      totalReviews: 142,
      ratingDistribution: { 5: 115, 4: 22, 3: 4, 2: 1, 1: 0 },
      avgResponseTime: 1.5,
      responseRate: 0.98,
      verifiedPurchases: 245,
      certifiedProductsSold: 198,
      disputeRate: 0.01,
      resolutionRate: 1.0
    },
    status: 'active',
    verificationStatus: {
      level: 'premium',
      badges: [
        { type: 'identity-verified', earnedAt: '2020-01-15', criteria: 'Documentos verificados' },
        { type: 'top-seller', earnedAt: '2024-10-01', expiresAt: '2025-01-01', criteria: 'Top vendedor Q4 2024' },
        { type: 'customer-favorite', earnedAt: '2024-09-15', expiresAt: '2024-12-15', criteria: '97% resenas positivas' },
        { type: 'fast-responder', earnedAt: '2024-11-01', expiresAt: '2024-12-01', criteria: 'Respuesta < 2 horas' }
      ],
      verifiedAt: '2020-01-15',
      verifiedBy: 'Tierra Madre Admin'
    },
    joinedDate: '2020-01-01',
    lastActive: new Date().toISOString()
  },
  {
    id: 'amb_002',
    userId: 'user_molano',
    slug: 'a-molano',
    displayName: 'A. Molano',
    tagline: 'Tu Asesor de Confianza en Esmeraldas',
    bio: 'Apasionado por las esmeraldas colombianas y comprometido con brindar el mejor servicio. Me especializo en piedras sueltas de diferentes calidades para todos los presupuestos.',
    photoUrl: '',
    bannerUrl: '',
    contactMethods: [
      { type: 'whatsapp', value: '+57 315 777 8899', primary: true, verified: true }
    ],
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/molano_esmeraldas', username: '@molano_esmeraldas' }
    ],
    location: { city: 'Bogota', region: 'Cundinamarca', country: 'Colombia' },
    languages: ['es'],
    timezone: 'America/Bogota',
    specialties: [
      { name: 'Esmeraldas Sueltas', description: 'Amplia variedad de piedras sin montar', yearsExperience: 6 },
      { name: 'Precios Accesibles', description: 'Opciones para todos los presupuestos', yearsExperience: 6 }
    ],
    priceRange: 'mid-range',
    expertise: [
      { area: 'loose-stones', level: 'expert', description: 'Especialista en piedras sueltas' },
      { area: 'retail', level: 'intermediate', description: 'Venta directa al consumidor' }
    ],
    certifications: [],
    template: {
      type: 'tm-official',
      colorScheme: {
        primary: '#059669',
        secondary: '#064e3b',
        accent: '#fbbf24',
        background: '#ffffff',
        text: '#1f2937'
      },
      layout: 'professional',
      modules: {
        portfolio: true,
        testimonials: true,
        certifications: false,
        aboutMe: true,
        featuredProducts: true,
        recentSales: false,
        trustBadges: true,
        contactForm: true
      },
      featuredProducts: [],
      highlightedTestimonials: []
    },
    trustScore: {
      overall: 78,
      components: {
        transactionHistory: 75,
        customerSatisfaction: 88,
        responseTime: 92,
        expertise: 55,
        authenticity: 70,
        reliability: 85
      },
      confidence: 0.82,
      lastCalculated: new Date().toISOString()
    },
    reputation: {
      totalSales: 89,
      totalRevenue: 75000000,
      averageOrderValue: 842697,
      repeatCustomerRate: 0.35,
      stats30d: { sales: 8, revenue: 7500000, avgRating: 4.7, responseTime: 0.8 },
      stats90d: { sales: 22, revenue: 19000000, avgRating: 4.6, responseTime: 0.9 },
      statsAllTime: { sales: 89, revenue: 75000000, avgRating: 4.5, responseTime: 1.0 },
      averageRating: 4.5,
      totalReviews: 52,
      ratingDistribution: { 5: 35, 4: 12, 3: 4, 2: 1, 1: 0 },
      avgResponseTime: 0.8,
      responseRate: 0.95,
      verifiedPurchases: 89,
      certifiedProductsSold: 62,
      disputeRate: 0.02,
      resolutionRate: 0.95
    },
    status: 'active',
    verificationStatus: {
      level: 'verified',
      badges: [
        { type: 'identity-verified', earnedAt: '2022-06-10', criteria: 'Documentos verificados' },
        { type: 'fast-responder', earnedAt: '2024-11-01', expiresAt: '2024-12-01', criteria: 'Respuesta < 1 hora' }
      ],
      verifiedAt: '2022-06-10',
      verifiedBy: 'Tierra Madre Admin'
    },
    joinedDate: '2022-06-01',
    lastActive: new Date().toISOString()
  },
  {
    id: 'amb_003',
    userId: 'user_escobar',
    slug: 'jm-escobar',
    displayName: 'J.M. Escobar',
    tagline: 'Experto en Joyeria con Esmeraldas',
    bio: 'Especialista en joyeria fina con esmeraldas colombianas. Me dedico a crear y seleccionar piezas unicas que resaltan la belleza natural de nuestras piedras preciosas.',
    photoUrl: '',
    bannerUrl: '',
    contactMethods: [
      { type: 'whatsapp', value: '+57 318 444 5566', primary: true, verified: true },
      { type: 'email', value: 'jm.escobar@tierramadre.co', primary: false, verified: true }
    ],
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/escobar_joyeria', username: '@escobar_joyeria' }
    ],
    location: { city: 'Bogota', region: 'Cundinamarca', country: 'Colombia' },
    languages: ['es', 'en'],
    timezone: 'America/Bogota',
    specialties: [
      { name: 'Joyeria Fina', description: 'Anillos y aretes en oro y plata', yearsExperience: 10 },
      { name: 'Disenos Personalizados', description: 'Piezas unicas a medida', yearsExperience: 8 }
    ],
    priceRange: 'luxury',
    expertise: [
      { area: 'jewelry', level: 'expert', description: 'Joyeria de alta calidad' },
      { area: 'custom-design', level: 'expert', description: 'Disenos personalizados' }
    ],
    certifications: [
      {
        type: 'jewelry-designer',
        name: 'Disenador de Joyas Certificado',
        issuingBody: 'Academia de Joyeria Colombiana',
        dateIssued: '2019-09-20',
        verified: true
      }
    ],
    template: {
      type: 'self-brand',
      colorScheme: {
        primary: '#7c3aed',
        secondary: '#5b21b6',
        accent: '#f59e0b',
        background: '#faf5ff',
        text: '#4c1d95'
      },
      layout: 'elegant',
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
    trustScore: {
      overall: 85,
      components: {
        transactionHistory: 70,
        customerSatisfaction: 95,
        responseTime: 80,
        expertise: 95,
        authenticity: 82,
        reliability: 90
      },
      confidence: 0.78,
      lastCalculated: new Date().toISOString()
    },
    reputation: {
      totalSales: 67,
      totalRevenue: 280000000,
      averageOrderValue: 4179104,
      repeatCustomerRate: 0.28,
      stats30d: { sales: 5, revenue: 22000000, avgRating: 5.0, responseTime: 2.5 },
      stats90d: { sales: 15, revenue: 65000000, avgRating: 4.9, responseTime: 2.8 },
      statsAllTime: { sales: 67, revenue: 280000000, avgRating: 4.85, responseTime: 3.0 },
      averageRating: 4.85,
      totalReviews: 41,
      ratingDistribution: { 5: 36, 4: 4, 3: 1, 2: 0, 1: 0 },
      avgResponseTime: 2.5,
      responseRate: 0.92,
      verifiedPurchases: 67,
      certifiedProductsSold: 55,
      disputeRate: 0.0,
      resolutionRate: 1.0
    },
    status: 'active',
    verificationStatus: {
      level: 'verified',
      badges: [
        { type: 'identity-verified', earnedAt: '2021-03-20', criteria: 'Documentos verificados' },
        { type: 'customer-favorite', earnedAt: '2024-10-15', expiresAt: '2025-01-15', criteria: '98% resenas positivas' }
      ],
      verifiedAt: '2021-03-20',
      verifiedBy: 'Tierra Madre Admin'
    },
    joinedDate: '2021-03-15',
    lastActive: new Date().toISOString()
  },
  {
    id: 'amb_004',
    userId: 'user_vikinga',
    slug: 'la-vikinga',
    displayName: 'La Vikinga',
    tagline: 'Esmeraldas con Caracter y Estilo',
    bio: 'Conocida como La Vikinga en el mundo de las esmeraldas. Me especializo en piedras con personalidad unica y colores vibrantes. Cada esmeralda que selecciono cuenta su propia historia.',
    photoUrl: '',
    bannerUrl: '',
    contactMethods: [
      { type: 'whatsapp', value: '+57 320 111 2233', primary: true, verified: true }
    ],
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/lavikinga_esmeraldas', username: '@lavikinga_esmeraldas' }
    ],
    location: { city: 'Bogota', region: 'Cundinamarca', country: 'Colombia' },
    languages: ['es'],
    timezone: 'America/Bogota',
    specialties: [
      { name: 'Esmeraldas Unicas', description: 'Piedras con caracter especial', yearsExperience: 5 },
      { name: 'Verde Muzo', description: 'Especialista en color Verde Muzo', yearsExperience: 5 }
    ],
    priceRange: 'mid-range',
    expertise: [
      { area: 'loose-stones', level: 'intermediate', description: 'Piedras sueltas selectas' },
      { area: 'retail', level: 'intermediate', description: 'Venta directa' }
    ],
    certifications: [],
    template: {
      type: 'self-brand',
      colorScheme: {
        primary: '#dc2626',
        secondary: '#991b1b',
        accent: '#fbbf24',
        background: '#fef2f2',
        text: '#7f1d1d'
      },
      layout: 'modern',
      modules: {
        portfolio: true,
        testimonials: true,
        certifications: false,
        aboutMe: true,
        featuredProducts: true,
        recentSales: false,
        trustBadges: true,
        contactForm: true
      },
      featuredProducts: [],
      highlightedTestimonials: []
    },
    trustScore: {
      overall: 72,
      components: {
        transactionHistory: 65,
        customerSatisfaction: 82,
        responseTime: 75,
        expertise: 60,
        authenticity: 70,
        reliability: 80
      },
      confidence: 0.68,
      lastCalculated: new Date().toISOString()
    },
    reputation: {
      totalSales: 45,
      totalRevenue: 38000000,
      averageOrderValue: 844444,
      repeatCustomerRate: 0.22,
      stats30d: { sales: 4, revenue: 3500000, avgRating: 4.5, responseTime: 3 },
      stats90d: { sales: 12, revenue: 10000000, avgRating: 4.4, responseTime: 3.5 },
      statsAllTime: { sales: 45, revenue: 38000000, avgRating: 4.3, responseTime: 3.5 },
      averageRating: 4.3,
      totalReviews: 28,
      ratingDistribution: { 5: 18, 4: 7, 3: 2, 2: 1, 1: 0 },
      avgResponseTime: 3,
      responseRate: 0.88,
      verifiedPurchases: 45,
      certifiedProductsSold: 32,
      disputeRate: 0.02,
      resolutionRate: 0.95
    },
    status: 'active',
    verificationStatus: {
      level: 'verified',
      badges: [
        { type: 'identity-verified', earnedAt: '2023-02-15', criteria: 'Documentos verificados' }
      ],
      verifiedAt: '2023-02-15',
      verifiedBy: 'Tierra Madre Admin'
    },
    joinedDate: '2023-02-01',
    lastActive: new Date().toISOString()
  },
  {
    id: 'amb_005',
    userId: 'user_gomez',
    slug: 'm-gomez',
    displayName: 'M. Gomez',
    tagline: 'Calidad y Precio Justo',
    bio: 'Me dedico a ofrecer esmeraldas de calidad a precios accesibles. Creo que todos merecen tener una esmeralda colombiana autentica.',
    photoUrl: '',
    bannerUrl: '',
    contactMethods: [
      { type: 'whatsapp', value: '+57 312 888 9900', primary: true, verified: true }
    ],
    socialLinks: [],
    location: { city: 'Bogota', region: 'Cundinamarca', country: 'Colombia' },
    languages: ['es'],
    timezone: 'America/Bogota',
    specialties: [
      { name: 'Esmeraldas Accesibles', description: 'Opciones para todos los presupuestos', yearsExperience: 4 }
    ],
    priceRange: 'budget',
    expertise: [
      { area: 'retail', level: 'intermediate', description: 'Venta directa' }
    ],
    certifications: [],
    template: {
      type: 'tm-official',
      colorScheme: {
        primary: '#059669',
        secondary: '#064e3b',
        accent: '#fbbf24',
        background: '#ffffff',
        text: '#1f2937'
      },
      layout: 'professional',
      modules: {
        portfolio: false,
        testimonials: true,
        certifications: false,
        aboutMe: true,
        featuredProducts: true,
        recentSales: false,
        trustBadges: true,
        contactForm: true
      },
      featuredProducts: [],
      highlightedTestimonials: []
    },
    trustScore: {
      overall: 58,
      components: {
        transactionHistory: 50,
        customerSatisfaction: 72,
        responseTime: 65,
        expertise: 35,
        authenticity: 55,
        reliability: 70
      },
      confidence: 0.55,
      lastCalculated: new Date().toISOString()
    },
    reputation: {
      totalSales: 32,
      totalRevenue: 18000000,
      averageOrderValue: 562500,
      repeatCustomerRate: 0.18,
      stats30d: { sales: 3, revenue: 1800000, avgRating: 4.3, responseTime: 4 },
      stats90d: { sales: 10, revenue: 5500000, avgRating: 4.2, responseTime: 4.5 },
      statsAllTime: { sales: 32, revenue: 18000000, avgRating: 4.1, responseTime: 4.5 },
      averageRating: 4.1,
      totalReviews: 18,
      ratingDistribution: { 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 },
      avgResponseTime: 4,
      responseRate: 0.82,
      verifiedPurchases: 32,
      certifiedProductsSold: 18,
      disputeRate: 0.03,
      resolutionRate: 0.90
    },
    status: 'active',
    verificationStatus: {
      level: 'basic',
      badges: [
        { type: 'identity-verified', earnedAt: '2023-08-01', criteria: 'Documentos verificados' }
      ],
      verifiedAt: '2023-08-01',
      verifiedBy: 'Tierra Madre Admin'
    },
    joinedDate: '2023-08-01',
    lastActive: new Date().toISOString()
  },
  {
    id: 'amb_006',
    userId: 'user_echeverry',
    slug: 'm-echeverry',
    displayName: 'M. Echeverry',
    tagline: 'Pasion por las Esmeraldas Finas',
    bio: 'Especializado en esmeraldas de alta calidad. Trabajo directamente con las mejores fuentes para garantizar piedras excepcionales.',
    photoUrl: '',
    bannerUrl: '',
    contactMethods: [
      { type: 'whatsapp', value: '+57 311 222 3344', primary: true, verified: true }
    ],
    socialLinks: [],
    location: { city: 'Bogota', region: 'Cundinamarca', country: 'Colombia' },
    languages: ['es', 'en'],
    timezone: 'America/Bogota',
    specialties: [
      { name: 'Esmeraldas Finas', description: 'Piedras de calidad premium', yearsExperience: 7 },
      { name: 'Verde Vivido', description: 'Especialista en colores intensos', yearsExperience: 7 }
    ],
    priceRange: 'luxury',
    expertise: [
      { area: 'investment', level: 'intermediate', description: 'Esmeraldas de inversion' },
      { area: 'loose-stones', level: 'expert', description: 'Piedras sueltas premium' }
    ],
    certifications: [],
    template: {
      type: 'tm-official',
      colorScheme: {
        primary: '#059669',
        secondary: '#064e3b',
        accent: '#fbbf24',
        background: '#ffffff',
        text: '#1f2937'
      },
      layout: 'professional',
      modules: {
        portfolio: true,
        testimonials: true,
        certifications: false,
        aboutMe: true,
        featuredProducts: true,
        recentSales: false,
        trustBadges: true,
        contactForm: true
      },
      featuredProducts: [],
      highlightedTestimonials: []
    },
    trustScore: {
      overall: 75,
      components: {
        transactionHistory: 68,
        customerSatisfaction: 85,
        responseTime: 78,
        expertise: 70,
        authenticity: 75,
        reliability: 82
      },
      confidence: 0.72,
      lastCalculated: new Date().toISOString()
    },
    reputation: {
      totalSales: 56,
      totalRevenue: 95000000,
      averageOrderValue: 1696428,
      repeatCustomerRate: 0.30,
      stats30d: { sales: 5, revenue: 9000000, avgRating: 4.6, responseTime: 2.5 },
      stats90d: { sales: 14, revenue: 24000000, avgRating: 4.5, responseTime: 2.8 },
      statsAllTime: { sales: 56, revenue: 95000000, avgRating: 4.5, responseTime: 3 },
      averageRating: 4.5,
      totalReviews: 35,
      ratingDistribution: { 5: 24, 4: 8, 3: 2, 2: 1, 1: 0 },
      avgResponseTime: 2.5,
      responseRate: 0.90,
      verifiedPurchases: 56,
      certifiedProductsSold: 42,
      disputeRate: 0.02,
      resolutionRate: 0.95
    },
    status: 'active',
    verificationStatus: {
      level: 'verified',
      badges: [
        { type: 'identity-verified', earnedAt: '2022-01-15', criteria: 'Documentos verificados' }
      ],
      verifiedAt: '2022-01-15',
      verifiedBy: 'Tierra Madre Admin'
    },
    joinedDate: '2022-01-01',
    lastActive: new Date().toISOString()
  }
];

/**
 * Sample Testimonials
 */
export const SAMPLE_TESTIMONIALS: Testimonial[] = [
  {
    id: 'test_001',
    ambassadorId: 'amb_001',
    customerId: 'cust_001',
    customerName: 'Ana Rodriguez',
    rating: 5,
    title: 'Experiencia excepcional!',
    comment: 'Campuzano me ayudo a encontrar la esmeralda perfecta para el anillo de compromiso de mi prometida. Su conocimiento y paciencia hicieron todo el proceso increible.',
    purchaseDate: '2024-10-15',
    purchaseValue: 8500000,
    verified: true,
    verificationMethod: 'purchase',
    status: 'approved',
    createdAt: '2024-10-20',
    updatedAt: '2024-10-20'
  },
  {
    id: 'test_002',
    ambassadorId: 'amb_001',
    customerId: 'cust_002',
    customerName: 'Roberto Chen',
    rating: 5,
    title: 'Profesionalismo y transparencia',
    comment: 'Como inversionista, valoro mucho la transparencia. Campuzano me explico todo sobre la piedra, su origen, certificaciones y valor de mercado. 100% recomendado.',
    purchaseDate: '2024-09-28',
    purchaseValue: 25000000,
    verified: true,
    verificationMethod: 'purchase',
    response: {
      text: 'Gracias Roberto! Fue un placer asesorarte en tu inversion. Estoy aqui para cualquier consulta futura.',
      date: '2024-10-01'
    },
    status: 'approved',
    createdAt: '2024-10-05',
    updatedAt: '2024-10-05'
  },
  {
    id: 'test_003',
    ambassadorId: 'amb_002',
    customerId: 'cust_003',
    customerName: 'Lucia Fernandez',
    rating: 5,
    title: 'Respuesta super rapida!',
    comment: 'Molano contesto mi mensaje en minutos y me envio videos de varias opciones. Muy profesional y amable.',
    purchaseDate: '2024-11-10',
    purchaseValue: 750000,
    verified: true,
    verificationMethod: 'purchase',
    status: 'approved',
    createdAt: '2024-11-12',
    updatedAt: '2024-11-12'
  },
  {
    id: 'test_004',
    ambassadorId: 'amb_003',
    customerId: 'cust_004',
    customerName: 'Miguel Santos',
    rating: 5,
    title: 'Artista de verdad',
    comment: 'Escobar diseno el anillo mas hermoso que he visto. Mi esposa lloro de la emocion. El proceso de diseno fue colaborativo y el resultado supero nuestras expectativas.',
    purchaseDate: '2024-08-20',
    purchaseValue: 12000000,
    verified: true,
    verificationMethod: 'purchase',
    status: 'approved',
    createdAt: '2024-08-25',
    updatedAt: '2024-08-25'
  },
  {
    id: 'test_005',
    ambassadorId: 'amb_004',
    customerId: 'cust_005',
    customerName: 'Carolina Mejia',
    rating: 5,
    title: 'Piedras con personalidad',
    comment: 'La Vikinga me ayudo a encontrar una esmeralda unica con un verde increible. Su conocimiento y pasion son evidentes.',
    purchaseDate: '2024-09-15',
    purchaseValue: 1200000,
    verified: true,
    verificationMethod: 'purchase',
    status: 'approved',
    createdAt: '2024-09-18',
    updatedAt: '2024-09-18'
  },
  {
    id: 'test_006',
    ambassadorId: 'amb_006',
    customerId: 'cust_006',
    customerName: 'Felipe Gomez',
    rating: 5,
    title: 'Calidad garantizada',
    comment: 'Echeverry me mostro varias opciones de esmeraldas de alta calidad. Quede muy satisfecho con mi compra.',
    purchaseDate: '2024-10-05',
    purchaseValue: 3500000,
    verified: true,
    verificationMethod: 'purchase',
    status: 'approved',
    createdAt: '2024-10-08',
    updatedAt: '2024-10-08'
  }
];

/**
 * Storage Functions
 */
export function loadAmbassadors(): AmbassadorProfile[] {
  try {
    const stored = localStorage.getItem(AMBASSADORS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with sample data
    saveAmbassadors(SAMPLE_AMBASSADORS);
    return SAMPLE_AMBASSADORS;
  } catch {
    return SAMPLE_AMBASSADORS;
  }
}

export function saveAmbassadors(ambassadors: AmbassadorProfile[]): void {
  try {
    localStorage.setItem(AMBASSADORS_STORAGE_KEY, JSON.stringify(ambassadors));
  } catch (error) {
    console.error('Failed to save ambassadors:', error);
  }
}

export function getAmbassadorBySlug(slug: string): AmbassadorProfile | undefined {
  const ambassadors = loadAmbassadors();
  return ambassadors.find(a => a.slug === slug);
}

export function getAmbassadorById(id: string): AmbassadorProfile | undefined {
  const ambassadors = loadAmbassadors();
  return ambassadors.find(a => a.id === id);
}

export function updateAmbassador(updated: AmbassadorProfile): void {
  const ambassadors = loadAmbassadors();
  const index = ambassadors.findIndex(a => a.id === updated.id);
  if (index >= 0) {
    ambassadors[index] = { ...updated, lastActive: new Date().toISOString() };
    saveAmbassadors(ambassadors);
  }
}

export function loadTestimonials(ambassadorId?: string): Testimonial[] {
  try {
    const stored = localStorage.getItem(TESTIMONIALS_STORAGE_KEY);
    if (stored) {
      const all = JSON.parse(stored) as Testimonial[];
      return ambassadorId ? all.filter(t => t.ambassadorId === ambassadorId) : all;
    }
    // Initialize with sample data
    localStorage.setItem(TESTIMONIALS_STORAGE_KEY, JSON.stringify(SAMPLE_TESTIMONIALS));
    return ambassadorId ? SAMPLE_TESTIMONIALS.filter(t => t.ambassadorId === ambassadorId) : SAMPLE_TESTIMONIALS;
  } catch {
    return ambassadorId ? SAMPLE_TESTIMONIALS.filter(t => t.ambassadorId === ambassadorId) : SAMPLE_TESTIMONIALS;
  }
}

/**
 * Get ambassadors sorted by trust score
 */
export function getAmbassadorsByTrustScore(): AmbassadorProfile[] {
  return loadAmbassadors()
    .filter(a => a.status === 'active')
    .sort((a, b) => (b.trustScore?.overall || 0) - (a.trustScore?.overall || 0));
}

/**
 * Get ambassadors filtered by specialty
 */
export function getAmbassadorsBySpecialty(specialty: string): AmbassadorProfile[] {
  return loadAmbassadors()
    .filter(a => a.status === 'active')
    .filter(a => a.specialties.some(s => s.name.toLowerCase().includes(specialty.toLowerCase())));
}

/**
 * Get ambassadors filtered by price range
 */
export function getAmbassadorsByPriceRange(priceRange: AmbassadorProfile['priceRange']): AmbassadorProfile[] {
  return loadAmbassadors()
    .filter(a => a.status === 'active')
    .filter(a => a.priceRange === priceRange || a.priceRange === 'all');
}
