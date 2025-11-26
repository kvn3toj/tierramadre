// ============================================================================
// TIERRA MADRE STUDIO - SLIDE TEMPLATES
// Based on Destellos_Verdes.pdf and Presentation.pdf designs
// ============================================================================

export { default as ProductCatalogTemplate, ProductCatalogTemplate as ProductCatalog } from './ProductCatalogTemplate';
export type { ProductSpec } from './ProductCatalogTemplate';

export { default as CatalogCoverTemplate, CatalogCoverTemplate as CatalogCover } from './CatalogCoverTemplate';

export { default as ThankYouTemplate, ThankYouTemplate as ThankYou } from './ThankYouTemplate';

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
  | 'contact';

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
