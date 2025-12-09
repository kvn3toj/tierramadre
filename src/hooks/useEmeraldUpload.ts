/**
 * useEmeraldUpload Hook
 * Handles single and batch emerald upload operations.
 * Extracted from EmeraldUploader.tsx for better modularity.
 */
import { useState, useCallback } from 'react';
import { useEmeralds } from './useEmeralds';
import { useAI, markNameAsUsed } from './useAI';
import { EmeraldCategory, MediaType } from '../types';
import { compressImage } from '../utils/imageNormalizer';
import { saveVideo, extractVideoThumbnail } from '../utils/videoStorage';
import { isVideoFile, isMediaFile } from '../utils/fileTypeDetection';

export interface BatchItem {
  id: string;
  imageUrl: string;
  mediaType: MediaType;
  thumbnailUrl?: string;
  suggestedNames: string[];
  selectedName: string;
  customName: string;
  description: string;
  weightCarats: string;
  priceCOP: string;
  lotCode: string;
  category: EmeraldCategory;
  ringSize?: string;
  color?: string;
  quality?: string;
}

export interface SingleUploadState {
  imageUrl: string | null;
  mediaType: MediaType;
  thumbnailUrl: string | null;
  suggestedNames: string[];
  selectedName: string;
  customName: string;
  description: string;
  weightCarats: string;
  priceCOP: string;
  lotCode: string;
  category: EmeraldCategory;
  ringSize: string;
  color: string;
  quality: string;
}

export interface UseEmeraldUploadReturn {
  // Single upload state
  singleState: SingleUploadState;
  setSingleState: React.Dispatch<React.SetStateAction<SingleUploadState>>;

  // Batch upload state
  batchItems: BatchItem[];
  setBatchItems: React.Dispatch<React.SetStateAction<BatchItem[]>>;
  batchProcessing: boolean;

  // AI state
  analyzing: boolean;
  aiError: string | null;

  // Upload handlers
  processFile: (file: File) => Promise<void>;
  processBatchFiles: (files: File[]) => Promise<void>;
  handleDrop: (e: React.DragEvent, uploadMode: number) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>, uploadMode: number) => void;

  // Single upload actions
  handleNameSelect: (name: string) => void;
  handleRefreshSuggestions: () => Promise<void>;
  handleSave: (onComplete?: () => void) => void;
  resetSingleForm: () => void;

  // Batch actions
  updateBatchItem: (id: string, updates: Partial<BatchItem>) => void;
  removeBatchItem: (id: string) => void;
  refreshBatchItemNames: (id: string) => Promise<void>;
  saveBatchItem: (item: BatchItem) => void;
  saveAllBatch: (onComplete?: () => void) => void;

  // Utilities
  formatPrice: (value: string) => string;
  isMediaFile: (file: File) => boolean;
}

const initialSingleState: SingleUploadState = {
  imageUrl: null,
  mediaType: 'image',
  thumbnailUrl: null,
  suggestedNames: [],
  selectedName: '',
  customName: '',
  description: '',
  weightCarats: '',
  priceCOP: '',
  lotCode: '',
  category: 'loose',
  ringSize: '',
  color: '',
  quality: '',
};

export function useEmeraldUpload(): UseEmeraldUploadReturn {
  const { addEmerald } = useEmeralds();
  const { analyzing, analyzeEmerald, getRandomSuggestions, error: aiError } = useAI();

  // Single upload form state
  const [singleState, setSingleState] = useState<SingleUploadState>(initialSingleState);

  // Batch upload state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  const processFile = useCallback(async (file: File) => {
    const isVideo = isVideoFile(file);

    if (isVideo) {
      try {
        const videoId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const videoRef = await saveVideo(videoId, file);
        const thumbnail = await extractVideoThumbnail(file, 1);

        const result = await analyzeEmerald(thumbnail);

        setSingleState(prev => ({
          ...prev,
          imageUrl: videoRef,
          mediaType: 'video',
          thumbnailUrl: thumbnail,
          suggestedNames: result?.names || [],
          description: result?.description || '',
        }));
      } catch (error) {
        console.error('Error processing video:', error);
        alert('Error al procesar el video. Por favor intenta de nuevo.');
      }
    } else {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const compressed = await compressImage(base64, 1200, 0.85);
        const result = await analyzeEmerald(base64);

        setSingleState(prev => ({
          ...prev,
          imageUrl: compressed,
          mediaType: 'image',
          thumbnailUrl: null,
          suggestedNames: result?.names || [],
          description: result?.description || '',
        }));
      };
      reader.readAsDataURL(file);
    }
  }, [analyzeEmerald]);

  const processBatchFiles = useCallback(async (files: File[]) => {
    setBatchProcessing(true);

    for (const file of files) {
      const isVideo = isVideoFile(file);

      if (isVideo) {
        try {
          const videoId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const videoRef = await saveVideo(videoId, file);
          const thumbnail = await extractVideoThumbnail(file, 1);
          const result = await analyzeEmerald(thumbnail);

          const newItem: BatchItem = {
            id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: videoRef,
            mediaType: 'video',
            thumbnailUrl: thumbnail,
            suggestedNames: result?.names || getRandomSuggestions(),
            selectedName: '',
            customName: '',
            description: result?.description || '',
            weightCarats: '',
            priceCOP: '',
            lotCode: '',
            category: 'loose',
            ringSize: '',
            color: '',
            quality: '',
          };

          setBatchItems(prev => [...prev, newItem]);
        } catch (error) {
          console.error('Error processing video in batch:', error);
        }
      } else {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        const compressed = await compressImage(base64, 1200, 0.85);
        const result = await analyzeEmerald(base64);

        const newItem: BatchItem = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          imageUrl: compressed,
          mediaType: 'image',
          suggestedNames: result?.names || getRandomSuggestions(),
          selectedName: '',
          customName: '',
          description: result?.description || '',
          weightCarats: '',
          priceCOP: '',
          lotCode: '',
          category: 'loose',
          ringSize: '',
          color: '',
          quality: '',
        };

        setBatchItems(prev => [...prev, newItem]);
      }
    }

    setBatchProcessing(false);
  }, [analyzeEmerald, getRandomSuggestions]);

  const handleDrop = useCallback((e: React.DragEvent, uploadMode: number) => {
    e.preventDefault();
    const filesArray = Array.from(e.dataTransfer.files).filter(isMediaFile);

    if (filesArray.length === 0) return;

    if (uploadMode === 0) {
      if (filesArray.length > 1) {
        processBatchFiles(filesArray);
        return { switchToBatch: true };
      } else {
        processFile(filesArray[0]);
      }
    } else {
      processBatchFiles(filesArray);
    }
  }, [processFile, processBatchFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, uploadMode: number) => {
    const filesArray = Array.from(e.target.files || []);

    if (filesArray.length === 0) return;

    if (uploadMode === 0) {
      if (filesArray.length > 1) {
        processBatchFiles(filesArray);
        return { switchToBatch: true };
      } else {
        processFile(filesArray[0]);
      }
    } else {
      processBatchFiles(filesArray);
    }
  }, [processFile, processBatchFiles]);

  const handleNameSelect = useCallback((name: string) => {
    setSingleState(prev => ({
      ...prev,
      selectedName: name,
      customName: '',
    }));
  }, []);

  const handleRefreshSuggestions = useCallback(async () => {
    if (singleState.imageUrl) {
      const result = await analyzeEmerald(singleState.imageUrl);
      if (result) {
        setSingleState(prev => ({ ...prev, suggestedNames: result.names }));
      }
    } else {
      setSingleState(prev => ({ ...prev, suggestedNames: getRandomSuggestions() }));
    }
  }, [singleState.imageUrl, analyzeEmerald, getRandomSuggestions]);

  const resetSingleForm = useCallback(() => {
    setSingleState(initialSingleState);
  }, []);

  const handleSave = useCallback((onComplete?: () => void) => {
    const { imageUrl, mediaType, thumbnailUrl, suggestedNames, selectedName, customName, description, weightCarats, priceCOP, lotCode, category, ringSize, color, quality } = singleState;

    if (!imageUrl) {
      alert('Por favor sube una imagen o video primero');
      return;
    }

    const finalName = customName || selectedName;
    if (!finalName) {
      alert('Por favor selecciona o escribe un nombre');
      return;
    }

    try {
      addEmerald({
        name: finalName,
        imageUrl,
        mediaType,
        thumbnailUrl: thumbnailUrl || undefined,
        aiSuggestedNames: suggestedNames,
        aiDescription: description,
        weightCarats: weightCarats ? parseFloat(weightCarats) : undefined,
        priceCOP: priceCOP ? parseInt(priceCOP.replace(/\D/g, '')) : undefined,
        lotCode: lotCode || undefined,
        category,
        ringSize: ringSize || undefined,
        color: color || undefined,
        quality: quality || undefined,
        status: 'available',
      });

      markNameAsUsed(finalName);
      const mediaLabel = mediaType === 'video' ? 'video' : 'esmeralda';
      alert(`"${finalName}" ${mediaLabel} guardada exitosamente!`);
      resetSingleForm();
      onComplete?.();
    } catch (error) {
      console.error('Error saving emerald:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';

      if (errorMsg.includes('STORAGE_FULL')) {
        alert('El almacenamiento está lleno. Por favor ve a la Galería y elimina algunas esmeraldas antiguas para liberar espacio.');
      } else {
        alert(`Error al guardar: ${errorMsg}`);
      }
    }
  }, [singleState, addEmerald, resetSingleForm]);

  // Batch item handlers
  const updateBatchItem = useCallback((id: string, updates: Partial<BatchItem>) => {
    setBatchItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const removeBatchItem = useCallback((id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const refreshBatchItemNames = useCallback(async (id: string) => {
    const item = batchItems.find(i => i.id === id);
    if (!item) return;

    const result = await analyzeEmerald(item.imageUrl);
    if (result) {
      updateBatchItem(id, { suggestedNames: result.names });
    }
  }, [batchItems, analyzeEmerald, updateBatchItem]);

  const saveBatchItem = useCallback((item: BatchItem) => {
    const finalName = item.customName || item.selectedName;
    if (!finalName) {
      alert('Por favor selecciona o escribe un nombre para este item');
      return;
    }

    addEmerald({
      name: finalName,
      imageUrl: item.imageUrl,
      mediaType: item.mediaType,
      thumbnailUrl: item.thumbnailUrl,
      aiSuggestedNames: item.suggestedNames,
      aiDescription: item.description,
      weightCarats: item.weightCarats ? parseFloat(item.weightCarats) : undefined,
      priceCOP: item.priceCOP ? parseInt(item.priceCOP.replace(/\D/g, '')) : undefined,
      lotCode: item.lotCode || undefined,
      category: item.category,
      status: 'available',
    });

    markNameAsUsed(finalName);
    removeBatchItem(item.id);
  }, [addEmerald, removeBatchItem]);

  const saveAllBatch = useCallback((onComplete?: () => void) => {
    const itemsToSave = batchItems.filter(item => item.customName || item.selectedName);
    if (itemsToSave.length === 0) {
      alert('Por favor asigna nombres a al menos un item');
      return;
    }

    itemsToSave.forEach(item => {
      const finalName = item.customName || item.selectedName;
      addEmerald({
        name: finalName,
        imageUrl: item.imageUrl,
        mediaType: item.mediaType,
        thumbnailUrl: item.thumbnailUrl,
        aiSuggestedNames: item.suggestedNames,
        aiDescription: item.description,
        weightCarats: item.weightCarats ? parseFloat(item.weightCarats) : undefined,
        priceCOP: item.priceCOP ? parseInt(item.priceCOP.replace(/\D/g, '')) : undefined,
        lotCode: item.lotCode || undefined,
        category: item.category,
        ringSize: item.ringSize || undefined,
        color: item.color || undefined,
        quality: item.quality || undefined,
        status: 'available',
      });
      markNameAsUsed(finalName);
    });

    setBatchItems(prev => prev.filter(item => !itemsToSave.includes(item)));
    onComplete?.();
  }, [batchItems, addEmerald]);

  const formatPrice = useCallback((value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers ? parseInt(numbers).toLocaleString('es-CO') : '';
  }, []);

  return {
    singleState,
    setSingleState,
    batchItems,
    setBatchItems,
    batchProcessing,
    analyzing,
    aiError,
    processFile,
    processBatchFiles,
    handleDrop,
    handleFileSelect,
    handleNameSelect,
    handleRefreshSuggestions,
    handleSave,
    resetSingleForm,
    updateBatchItem,
    removeBatchItem,
    refreshBatchItemNames,
    saveBatchItem,
    saveAllBatch,
    formatPrice,
    isMediaFile,
  };
}

export default useEmeraldUpload;
