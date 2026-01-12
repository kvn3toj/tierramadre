/**
 * Cart System Types
 *
 * Types for the product cart that allows users to collect products
 * before sending a consultation via WhatsApp.
 */

import type { TreasureItem } from './index';

/**
 * Item stored in cart (minimal data for sessionStorage efficiency)
 */
export interface CartItem {
  itemId: number;
  nombre: string;
  item: number;
  precioCOP: number;
  precioInternacional?: number;
  thumbnailUrl?: string;
  addedAt: string;
}

/**
 * Full cart state
 */
export interface CartState {
  items: CartItem[];
  lastUpdated: string;
}

/**
 * Session storage key for cart data
 * Using sessionStorage so cart clears when browser closes
 */
export const CART_STORAGE_KEY = 'tierramadre-cart';

/**
 * Convert TreasureItem to CartItem for storage
 */
export function treasureToCartItem(treasure: TreasureItem): CartItem {
  return {
    itemId: treasure.item,
    nombre: treasure.nombre.replace(/^L:.*?\s/, '').replace(/^L:/, '').trim(),
    item: treasure.item,
    precioCOP: treasure.precioCOP,
    precioInternacional: treasure.precioInternacional,
    thumbnailUrl: treasure.imagen || treasure.thumbnailUrl,
    addedAt: new Date().toISOString(),
  };
}
