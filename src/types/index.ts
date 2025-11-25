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
