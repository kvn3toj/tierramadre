/**
 * useCotizacionHistory Hook
 *
 * Manages saved cotizaciones via API (Google Drive + Sheets).
 * Each cotización image is stored in Drive, metadata in Sheets.
 * Cotizaciones are linked to the asesor who created them.
 */

import { useState, useCallback } from 'react';
import { createLogger } from '../utils/logger';

const log = createLogger('CotizacionHistory');

export interface SavedCotizacion {
  id: string;
  quotationNumber: string;
  asesorEmail: string;
  asesorName: string;
  clientName: string;
  clientPhone?: string;
  productsCount: number;
  total: number;
  imageUrl: string;        // Proxy URL for the image
  driveFileId: string;     // Google Drive file ID
  createdAt: string;       // ISO date string
  expiryDate?: string;     // ISO date string
}

export interface CotizacionProductData {
  itemNumber: number;
  name: string;
  precioCOP: number;
}

export interface SaveCotizacionParams {
  quotationNumber: string;
  asesorEmail: string;
  asesorName: string;
  clientName?: string;
  clientPhone?: string;
  productsCount: number;
  total: number;
  expiryDate?: string;
  imageBase64: string;     // Base64 encoded PNG image
  products?: CotizacionProductData[];  // Product details for analytics
}

export interface UseCotizacionHistoryReturn {
  /** Cotizaciones for the current asesor */
  cotizaciones: SavedCotizacion[];

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;

  /** Fetch cotizaciones for an asesor */
  fetchCotizaciones: (email: string) => Promise<void>;

  /** Save a new cotización */
  saveCotizacion: (params: SaveCotizacionParams) => Promise<SavedCotizacion | null>;

  /** Delete a cotización */
  deleteCotizacion: (id: string, email: string) => Promise<boolean>;

  /** Check if saving is in progress */
  isSaving: boolean;
}

export function useCotizacionHistory(): UseCotizacionHistoryReturn {
  const [cotizaciones, setCotizaciones] = useState<SavedCotizacion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cotizaciones for an asesor
  const fetchCotizaciones = useCallback(async (email: string): Promise<void> => {
    if (!email) {
      setCotizaciones([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cotizacion-save?email=${encodeURIComponent(email)}`);

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setCotizaciones(data.cotizaciones || []);
        log.info(`Fetched ${data.count} cotizaciones for ${email}`);
      } else {
        throw new Error(data.error || 'Failed to fetch cotizaciones');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching cotizaciones';
      log.error('Fetch error:', err);
      setError(message);
      setCotizaciones([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save a new cotización
  const saveCotizacion = useCallback(async (params: SaveCotizacionParams): Promise<SavedCotizacion | null> => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/cotizacion-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to get error message from response
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        } catch {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        log.info(`Saved cotización ${data.quotationNumber}`);

        // Create the saved cotización object
        const savedCotizacion: SavedCotizacion = {
          id: data.id,
          quotationNumber: params.quotationNumber,
          asesorEmail: params.asesorEmail,
          asesorName: params.asesorName,
          clientName: params.clientName || '',
          clientPhone: params.clientPhone,
          productsCount: params.productsCount,
          total: params.total,
          imageUrl: data.imageUrl,
          driveFileId: data.driveFileId,
          createdAt: new Date().toISOString(),
          expiryDate: params.expiryDate,
        };

        // Add to local state (prepend for most recent first)
        setCotizaciones(prev => [savedCotizacion, ...prev]);

        return savedCotizacion;
      } else {
        throw new Error(data.error || 'Failed to save cotización');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error saving cotización';
      log.error('Save error:', err);
      setError(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Delete a cotización (optimistic — remove from UI immediately, rollback on failure)
  const deleteCotizacion = useCallback(async (id: string, email: string): Promise<boolean> => {
    setError(null);

    // Optimistic: remove from UI immediately
    let removedItem: SavedCotizacion | undefined;
    let removedIndex = -1;
    setCotizaciones(prev => {
      removedIndex = prev.findIndex(c => c.id === id);
      if (removedIndex >= 0) removedItem = prev[removedIndex];
      return prev.filter(c => c.id !== id);
    });

    try {
      const response = await fetch(
        `/api/cotizacion-save?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        } catch {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        log.info(`Deleted cotización ${id}`);
        return true;
      } else {
        throw new Error(data.error || 'Failed to delete cotización');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting cotización';
      log.error('Delete error:', err);
      setError(message);
      // Rollback: restore the removed item at its original position
      if (removedItem) {
        const item = removedItem;
        const idx = removedIndex;
        setCotizaciones(prev => {
          const restored = [...prev];
          restored.splice(Math.min(idx, restored.length), 0, item);
          return restored;
        });
      }
      return false;
    }
  }, []);

  return {
    cotizaciones,
    isLoading,
    error,
    fetchCotizaciones,
    saveCotizacion,
    deleteCotizacion,
    isSaving,
  };
}

export default useCotizacionHistory;
