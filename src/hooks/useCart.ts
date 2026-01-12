/**
 * useCart Hook
 *
 * Manages shopping cart state with sessionStorage persistence.
 * Cart clears when browser session ends.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TreasureItem } from '../types';
import type { CartItem, CartState } from '../types/cart';
import { CART_STORAGE_KEY, treasureToCartItem } from '../types/cart';

interface UseCartReturn {
  cartItems: CartItem[];
  isInCart: (itemId: number) => boolean;
  addToCart: (product: TreasureItem) => void;
  removeFromCart: (itemId: number) => void;
  clearCart: () => void;
  cartCount: number;
  getCartTotal: () => { cop: number; usd: number };
}

export function useCart(): UseCartReturn {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = sessionStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const data: CartState = JSON.parse(stored);
        return data.items || [];
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
    return [];
  });

  // Persist to sessionStorage whenever cart changes
  useEffect(() => {
    try {
      const data: CartState = {
        items: cartItems,
        lastUpdated: new Date().toISOString(),
      };
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }, [cartItems]);

  // Check if an item is in cart
  const isInCart = useCallback(
    (itemId: number) => cartItems.some((item) => item.itemId === itemId),
    [cartItems]
  );

  // Add product to cart
  const addToCart = useCallback((product: TreasureItem) => {
    setCartItems((prev) => {
      // Don't add duplicates
      if (prev.some((item) => item.itemId === product.item)) {
        return prev;
      }
      return [...prev, treasureToCartItem(product)];
    });
  }, []);

  // Remove from cart
  const removeFromCart = useCallback((itemId: number) => {
    setCartItems((prev) => prev.filter((item) => item.itemId !== itemId));
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Count of items in cart
  const cartCount = useMemo(() => cartItems.length, [cartItems]);

  // Calculate cart totals
  const getCartTotal = useCallback(() => {
    return cartItems.reduce(
      (totals, item) => ({
        cop: totals.cop + (item.precioCOP || 0),
        usd: totals.usd + (item.precioInternacional || 0),
      }),
      { cop: 0, usd: 0 }
    );
  }, [cartItems]);

  return {
    cartItems,
    isInCart,
    addToCart,
    removeFromCart,
    clearCart,
    cartCount,
    getCartTotal,
  };
}

export default useCart;
