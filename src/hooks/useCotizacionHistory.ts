/**
 * useCotizacionHistory Hook
 *
 * Manages saved cotizaciones via API (Google Drive + Sheets).
 * Each cotización image is stored in Drive, metadata in Sheets.
 * Cotizaciones are linked to the asesor who created them.
 */

import { useState, useCallback } from 'react';
import { createLogger } from '../utils/logger';
import { readFreshSessionToken } from '../utils/sessionToken';
import { useGlobalLoading } from '../contexts/GlobalLoadingContext';
import type { AiJewelryPreview } from './useCotizacion';

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
  imageUrl: string; // Proxy URL for the image
  driveFileId: string; // Google Drive file ID
  createdAt: string; // ISO date string
  expiryDate?: string; // ISO date string
  /**
   * Full product lines (incl. AI previews). Only populated for cotizaciones
   * saved in the current session — the reload GET returns aggregate data only.
   * Used so a same-session "duplicate" can carry AI previews along.
   */
  products?: CotizacionProductData[];
}

export interface CotizacionProductData {
  itemNumber: number;
  name: string;
  precioCOP: number;
  /** AI jewelry previews (serve-drive-image URLs only — never data: URLs). */
  aiPreviews?: AiJewelryPreview[];
  /** The AI preview chosen to show in the quotation & PDF. */
  selectedPreviewUrl?: string;
  // ── Fields for the public online card view (`/c/:quotationNumber`) ──
  cantidad?: number;
  descripcion?: string;
  certificadoUrl?: string;
  numeroCO?: string;
  imagen?: string;
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
  imageBase64: string; // Base64 encoded PNG image
  products?: CotizacionProductData[]; // Product details for analytics
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
  saveCotizacion: (
    params: SaveCotizacionParams,
  ) => Promise<SavedCotizacion | null>;

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
  const { startLoading, stopLoading } = useGlobalLoading();

  // Fetch cotizaciones for an asesor
  const fetchCotizaciones = useCallback(
    async (email: string): Promise<void> => {
      if (!email) {
        setCotizaciones([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Candado del 2026-08-21 (hallazgo #2). El servidor ya NO lee el
        // `?email=` de la URL —era el IDOR: cambiarlo por el correo de otra
        // asesora entregaba sus clientes— pero se sigue mandando porque no
        // estorba y deja la llamada legible en los logs. Quien manda es el
        // token.
        const sessionToken = readFreshSessionToken();
        const response = await fetch(
          `/api/cotizacion-save?email=${encodeURIComponent(email)}`,
          {
            headers: sessionToken
              ? { Authorization: `Bearer ${sessionToken}` }
              : undefined,
          },
        );

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
        const message =
          err instanceof Error ? err.message : 'Error fetching cotizaciones';
        log.error('Fetch error:', err);
        setError(message);
        setCotizaciones([]);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Save a new cotización
  const saveCotizacion = useCallback(
    async (params: SaveCotizacionParams): Promise<SavedCotizacion | null> => {
      setIsSaving(true);
      setError(null);
      startLoading();

      try {
        // Candado del 2026-08-21 (hallazgo #2): el POST insertaba cotizaciones
        // —con nombre y teléfono de cliente— sin credencial. El `asesorEmail`
        // del cuerpo ya no decide de quién es: el servidor lo toma del token.
        const sessionToken = readFreshSessionToken();
        const response = await fetch('/api/cotizacion-save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken
              ? { Authorization: `Bearer ${sessionToken}` }
              : {}),
          },
          body: JSON.stringify(params),
        });

        // Check if response is ok before parsing JSON
        if (!response.ok) {
          // Try to get error message from response
          try {
            const errorData = await response.json();
            throw new Error(
              errorData.error || `Server error: ${response.status}`,
            );
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
            // Keep full product lines in memory so a same-session duplicate can
            // carry AI previews along (the reload GET returns aggregate data only).
            products: params.products,
          };

          // Add to local state (prepend for most recent first)
          setCotizaciones((prev) => [savedCotizacion, ...prev]);

          return savedCotizacion;
        } else {
          throw new Error(data.error || 'Failed to save cotización');
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error saving cotización';
        log.error('Save error:', err);
        setError(message);
        return null;
      } finally {
        setIsSaving(false);
        stopLoading();
      }
    },
    [startLoading, stopLoading],
  );

  // Delete a cotización (optimistic — remove from UI immediately, rollback on failure)
  const deleteCotizacion = useCallback(
    async (id: string, email: string): Promise<boolean> => {
      setError(null);

      // Optimistic: remove from UI immediately
      let removedItem: SavedCotizacion | undefined;
      let removedIndex = -1;
      setCotizaciones((prev) => {
        removedIndex = prev.findIndex((c) => c.id === id);
        if (removedIndex >= 0) removedItem = prev[removedIndex];
        return prev.filter((c) => c.id !== id);
      });

      try {
        // Candado del 2026-08-21 (hallazgo #2): este DELETE no pedía nada y
        // borraba el PDF de Drive de forma PERMANENTE. Ahora exige sesión, el
        // dueño sale del token, y del otro lado la cotización se anula
        // (papelera + fila marcada) en vez de desaparecer.
        const sessionToken = readFreshSessionToken();
        const response = await fetch(
          `/api/cotizacion-save?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`,
          {
            method: 'DELETE',
            headers: sessionToken
              ? { Authorization: `Bearer ${sessionToken}` }
              : undefined,
          },
        );

        if (!response.ok) {
          try {
            const errorData = await response.json();
            throw new Error(
              errorData.error || `Server error: ${response.status}`,
            );
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
        const message =
          err instanceof Error ? err.message : 'Error deleting cotización';
        log.error('Delete error:', err);
        setError(message);
        // Rollback: restore the removed item at its original position
        if (removedItem) {
          const item = removedItem;
          const idx = removedIndex;
          setCotizaciones((prev) => {
            const restored = [...prev];
            restored.splice(Math.min(idx, restored.length), 0, item);
            return restored;
          });
        }
        return false;
      }
    },
    [],
  );

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
