/**
 * Media Gallery Types - Tierra Madre Treasure
 */

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  category: 'hero' | 'certificate' | 'detail' | 'context' | 'angle' | 'video';
  label?: string;
  alt: string;
  order: number;
}

export interface ProductMedia {
  productId: number;
  items: MediaItem[];
  updatedAt: string;
}

export const CATEGORY_LABELS: Record<MediaItem['category'], string> = {
  hero: 'Vista Principal',
  certificate: 'Certificado',
  detail: 'Detalle Macro',
  context: 'Referencia de Tamaño',
  angle: 'Ángulo Alternativo',
  video: 'Video 360°',
};

export const CATEGORY_ORDER: MediaItem['category'][] = [
  'hero',
  'certificate',
  'detail',
  'context',
  'angle',
  'video',
];
