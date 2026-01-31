/**
 * Cart System Types
 *
 * Types for the product cart that allows users to collect products
 * before sending a consultation via WhatsApp.
 */

import type { TreasureItem } from './index';
import { SESSION_KEYS } from '../constants/storage-keys';

/**
 * Item stored in cart (includes key product details for WhatsApp messages)
 */
export interface CartItem {
  itemId: number;
  nombre: string;
  item: number;
  precioCOP: number;
  precioInternacional?: number;
  thumbnailUrl?: string;
  addedAt: string;
  // Additional details for professional WhatsApp messages
  peso?: string | number;
  color?: string;
  calidad?: string;
  talla?: string;
  isJewelry?: boolean;
  metalType?: string;
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
export const CART_STORAGE_KEY = SESSION_KEYS.CART;

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
    // Additional details for professional WhatsApp messages
    peso: treasure.peso,
    color: treasure.color,
    calidad: treasure.calidad,
    talla: treasure.talla,
    isJewelry: treasure.isJewelry,
    metalType: treasure.metalType,
  };
}
