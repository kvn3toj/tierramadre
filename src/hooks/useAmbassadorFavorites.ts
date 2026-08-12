/**
 * useAmbassadorFavorites
 *
 * Thin adapter over `useAmbassadorCuration`, which is where favourites now
 * actually live (server-backed, localStorage as mirror cache).
 *
 * Until 2026-08-11 this hook owned `tm-ambassador-favorites-{slug}` in
 * localStorage and nothing else — so an ambassador's chosen showcase existed
 * only in the browser that chose it. The public API is unchanged so no caller
 * had to move; the persistence underneath it did.
 *
 * `canWrite` gates the network side. Reads stay public: a visitor must see the
 * ambassador's arrangement, that being the entire point of a showcase.
 */

import { useCallback } from 'react';
import { useAmbassadorCuration } from './useAmbassadorCuration';

interface UseAmbassadorFavoritesReturn {
  favorites: string[];
  addFavorite: (itemId: string) => void;
  removeFavorite: (itemId: string) => void;
  reorderFavorites: (newOrder: string[]) => void;
  isFavorite: (itemId: string) => boolean;
}

export function useAmbassadorFavorites(
  slug?: string,
  canWrite = false,
): UseAmbassadorFavoritesReturn {
  const { favorites, setFavorites } = useAmbassadorCuration(slug, canWrite);

  const addFavorite = useCallback(
    (itemId: string) => {
      if (favorites.includes(itemId)) return;
      setFavorites([...favorites, itemId]);
    },
    [favorites, setFavorites],
  );

  const removeFavorite = useCallback(
    (itemId: string) => {
      if (!favorites.includes(itemId)) return;
      setFavorites(favorites.filter((id) => id !== itemId));
    },
    [favorites, setFavorites],
  );

  const reorderFavorites = useCallback(
    (newOrder: string[]) => setFavorites(newOrder),
    [setFavorites],
  );

  const isFavorite = useCallback(
    (itemId: string) => favorites.includes(itemId),
    [favorites],
  );

  return {
    favorites,
    addFavorite,
    removeFavorite,
    reorderFavorites,
    isFavorite,
  };
}

export default useAmbassadorFavorites;
