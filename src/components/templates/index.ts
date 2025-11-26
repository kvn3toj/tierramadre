// ============================================================================
// TIERRA MADRE STUDIO - SLIDE TEMPLATES
// Based on Destellos_Verdes.pdf and Presentation.pdf designs
// ============================================================================

export { default as ProductCatalogTemplate, ProductCatalogTemplate as ProductCatalog } from './ProductCatalogTemplate';
export type { ProductSpec } from './ProductCatalogTemplate';

export { default as CatalogCoverTemplate, CatalogCoverTemplate as CatalogCover } from './CatalogCoverTemplate';

export { default as ThankYouTemplate, ThankYouTemplate as ThankYou } from './ThankYouTemplate';

// Masterclass Templates - "El Poder de la Esmeralda Colombiana"
export {
  BrandCoverTemplate,
  MissionTemplate,
  GlobalValidationTemplate,
  OpportunityTemplate,
  ExpertTemplate,
  DifferentiatorsTemplate,
  CelebritiesTemplate,
  ReasonsTemplate,
  EthicalChainTemplate,
  CTATemplate,
  MasterclassTemplates,
} from './MasterclassTemplates';

// Slide dimensions (16:9 presentation format)
export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

// Template types for the editor
export type TemplateType =
  | 'catalogCover'
  | 'productCatalog'
  | 'thankYou'
  | 'purpose'
  | 'stats'
  | 'quote'
  | 'team'
  | 'contact'
  // Masterclass templates
  | 'brandCover'
  | 'mission'
  | 'globalValidation'
  | 'opportunity'
  | 'expert'
  | 'differentiators'
  | 'celebrities'
  | 'reasons'
  | 'ethicalChain'
  | 'cta';

// Template metadata
export const CATALOG_TEMPLATES = [
  {
    id: 'catalogCover' as const,
    name: 'Portada Catálogo',
    description: 'Portada estilo Colección FENIX con nombre y preview',
    icon: '📕',
    category: 'cover',
  },
  {
    id: 'productCatalog' as const,
    name: 'Producto Catálogo',
    description: 'Ficha de producto con foto, specs y precio',
    icon: '💎',
    category: 'product',
  },
  {
    id: 'thankYou' as const,
    name: 'Gracias / Cierre',
    description: 'Slide de cierre con fondo de naturaleza',
    icon: '🌿',
    category: 'closing',
  },
] as const;

// Masterclass Template metadata
export const MASTERCLASS_TEMPLATES = [
  { id: 'brandCover' as const, name: 'Portada de Marca', description: 'Título principal TIERRA MADRE', icon: '🏛️', category: 'cover' },
  { id: 'mission' as const, name: 'Misión', description: 'Declaración de misión en caja dorada', icon: '🎯', category: 'content' },
  { id: 'globalValidation' as const, name: 'Validación Global', description: 'Destinos internacionales visitados', icon: '🌍', category: 'content' },
  { id: 'opportunity' as const, name: 'Oportunidad', description: 'Llamado a la oportunidad de negocio', icon: '💰', category: 'content' },
  { id: 'expert' as const, name: 'Experto', description: 'Presentación del experto con foto', icon: '👤', category: 'content' },
  { id: 'differentiators' as const, name: 'Diferenciadores', description: 'Por qué vale más la esmeralda', icon: '⚡', category: 'content' },
  { id: 'celebrities' as const, name: 'Celebridades', description: 'Social proof con famosas', icon: '⭐', category: 'content' },
  { id: 'reasons' as const, name: '5 Razones', description: 'Lista de razones numeradas', icon: '📋', category: 'content' },
  { id: 'ethicalChain' as const, name: 'Cadena Ética', description: 'De la mina a tus manos', icon: '🤝', category: 'content' },
  { id: 'cta' as const, name: 'Colección Fénix', description: 'Llamado a la acción con productos', icon: '🔥', category: 'cta' },
] as const;
