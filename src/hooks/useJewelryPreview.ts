/**
 * useJewelryPreview
 * ------------------------------------------------------------------
 * Calls POST /api/generate-jewelry-preview to turn a selected emerald
 * (real product photo and/or its specs) into a photorealistic
 * visualization of the stone set into jewelry and worn.
 *
 * Tracks per-request loading + error state so the UI can show progress
 * for the specific scene/metal being generated.
 */
import { useCallback, useState } from 'react';
import {
  CotizacionProduct,
  AiJewelryScene,
  AiJewelryMetal,
  AiJewelryPreview,
} from './useCotizacion';
import { extractDriveFileId } from '../components/cotizacion/utils';
import { createLogger } from '../utils/logger';

const log = createLogger('useJewelryPreview');

export interface GeneratePreviewArgs {
  product: CotizacionProduct;
  quotationId: string;
  scene: AiJewelryScene;
  metal: AiJewelryMetal;
  mode: 'photo' | 'specs';
}

interface ApiResponse {
  success?: boolean;
  data?: {
    url: string;
    fileId: string | null;
    scene: AiJewelryScene;
    metal: AiJewelryMetal;
    mode: 'photo' | 'specs';
  };
  url?: string;
  fileId?: string | null;
  error?: string;
  message?: string;
}

export function useJewelryPreview() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async ({
      product,
      quotationId,
      scene,
      metal,
      mode,
    }: GeneratePreviewArgs): Promise<AiJewelryPreview | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const referenceFileId = extractDriveFileId(product.imagen);
        const referenceUrl =
          !referenceFileId && product.imagen && /^https?:\/\//i.test(product.imagen)
            ? product.imagen
            : undefined;

        const resp = await fetch('/api/generate-jewelry-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quotationId,
            itemNumber: product.itemNumber,
            productName: product.name,
            scene,
            metal,
            mode,
            referenceFileId: referenceFileId || undefined,
            referenceUrl,
            specs: {
              cut: product.talla,
              measures: product.medidasValores,
              carats: typeof product.peso === 'number' ? String(product.peso) : product.peso,
              color: product.color,
              quality: product.calidad,
            },
          }),
        });

        const json: ApiResponse = await resp.json().catch(() => ({}));

        if (!resp.ok || json.success === false) {
          const msg = json.error || json.message || `Error ${resp.status}`;
          throw new Error(msg);
        }

        // sendSuccess wraps payload in { success, data }; tolerate both shapes.
        const payload = json.data ?? (json as ApiResponse);
        const url = payload.url;
        if (!url) throw new Error('La respuesta no incluyó una imagen.');

        const preview: AiJewelryPreview = {
          id: crypto.randomUUID(),
          scene,
          metal,
          url,
          fileId: payload.fileId ?? null,
          createdAt: Date.now(),
        };
        return preview;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error desconocido';
        log.error('generate failed', msg);
        setError(msg);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { generate, isGenerating, error, setError };
}

export default useJewelryPreview;
