import { useState } from 'react';
import { IOSCard, IOSButton, IOSTextField } from './ios';
import { IOSFilePicker, FileWithPreview } from './ios/input/IOSFilePicker';
import { useEmeralds } from '../hooks/useEmeralds';
import { useAI, markNameAsUsed } from '../hooks/useAI';
import { EmeraldCategory, MediaType } from '../types';
import { compressImage } from '../utils/imageNormalizer';
import { saveVideo, extractVideoThumbnail } from '../utils/videoStorage';

interface EmeraldUploaderProps {
  onComplete?: () => void;
}

interface ProcessedFile {
  imageUrl: string;
  mediaType: MediaType;
  thumbnailUrl?: string;
  suggestedNames: string[];
  description: string;
}

/**
 * EmeraldUploader - iOS Version
 *
 * Complete rewrite using Emerald iOS design system.
 * Features: AI-powered naming, batch upload, camera integration.
 */
export default function EmeraldUploaderIOS({ onComplete }: EmeraldUploaderProps) {
  const { addEmerald } = useEmeralds();
  const { analyzing, analyzeEmerald, getRandomSuggestions, error: aiError } = useAI();

  // Processed file data
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);

  // Form state
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [category, setCategory] = useState<EmeraldCategory>('loose');
  const [weightCarats, setWeightCarats] = useState('');
  const [priceCOP, setPriceCOP] = useState('');
  const [lotCode, setLotCode] = useState('');

  // UI state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Process uploaded file
   */
  const handleFilesSelected = async (files: FileWithPreview[]) => {
    if (files.length === 0) return;

    const fileWithPreview = files[0]; // Single mode for now
    const file = fileWithPreview.file;
    const isVideo = file.type.startsWith('video/');

    setError(null);
    setUploadProgress(10);

    try {
      if (isVideo) {
        // Process video
        setUploadProgress(30);

        const videoId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const videoRef = await saveVideo(videoId, file);

        setUploadProgress(50);

        // Extract thumbnail for AI analysis
        const thumbnail = await extractVideoThumbnail(file, 1);

        setUploadProgress(70);

        // Run AI analysis on thumbnail
        const result = await analyzeEmerald(thumbnail);

        setUploadProgress(100);

        setProcessedFile({
          imageUrl: videoRef,
          mediaType: 'video',
          thumbnailUrl: thumbnail,
          suggestedNames: result?.names || getRandomSuggestions(),
          description: result?.description || '',
        });
      } else {
        // Process image
        setUploadProgress(30);

        const base64 = fileWithPreview.preview;

        setUploadProgress(50);

        // Compress for storage (max 1200px, 85% quality)
        const compressed = await compressImage(base64, 1200, 0.85);

        setUploadProgress(70);

        // Run AI analysis
        const result = await analyzeEmerald(base64);

        setUploadProgress(100);

        setProcessedFile({
          imageUrl: compressed,
          mediaType: 'image',
          suggestedNames: result?.names || getRandomSuggestions(),
          description: result?.description || '',
        });
      }

      // Reset progress after a moment
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Error al procesar el archivo. Por favor intenta de nuevo.');
      setUploadProgress(0);
    }
  };

  /**
   * Refresh AI suggestions
   */
  const handleRefreshSuggestions = async () => {
    if (!processedFile) return;

    try {
      const analyzeUrl = processedFile.thumbnailUrl || processedFile.imageUrl;
      const result = await analyzeEmerald(analyzeUrl);

      if (result) {
        setProcessedFile({
          ...processedFile,
          suggestedNames: result.names,
        });
      }
    } catch (err) {
      console.error('Error refreshing suggestions:', err);
    }
  };

  /**
   * Save emerald
   */
  const handleSave = () => {
    if (!processedFile) {
      setError('Por favor sube una imagen o video primero');
      return;
    }

    const finalName = customName || selectedName;
    if (!finalName) {
      setError('Por favor selecciona o escribe un nombre');
      return;
    }

    try {
      addEmerald({
        name: finalName,
        imageUrl: processedFile.imageUrl,
        mediaType: processedFile.mediaType,
        thumbnailUrl: processedFile.thumbnailUrl,
        aiSuggestedNames: processedFile.suggestedNames,
        aiDescription: processedFile.description,
        weightCarats: weightCarats ? parseFloat(weightCarats) : undefined,
        priceCOP: priceCOP ? parseInt(priceCOP.replace(/\D/g, '')) : undefined,
        lotCode: lotCode || undefined,
        category,
        status: 'available',
      });

      // Mark name as used
      markNameAsUsed(finalName);

      // Show success (you can add IOSToast later)
      alert(`"${finalName}" guardada exitosamente!`);

      // Reset form
      resetForm();

      // Navigate to gallery
      onComplete?.();
    } catch (err) {
      console.error('Error saving emerald:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';

      if (errorMsg.includes('STORAGE_FULL')) {
        setError('El almacenamiento está lleno. Elimina algunas esmeraldas antiguas para liberar espacio.');
      } else {
        setError(`Error al guardar: ${errorMsg}`);
      }
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setProcessedFile(null);
    setSelectedName('');
    setCustomName('');
    setWeightCarats('');
    setPriceCOP('');
    setLotCode('');
    setCategory('loose');
    setError(null);
  };

  const finalName = customName || selectedName;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--surface-primary)',
        padding: 'var(--spacing-lg)',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '34px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-xs)',
            }}
          >
            Subir Esmeralda
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-text)',
              fontSize: '17px',
              color: 'var(--text-secondary)',
            }}
          >
            Captura o selecciona fotos/videos de tus esmeraldas. IA sugerirá nombres únicos.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <IOSCard variant="flat" padding="md" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--status-error)20', borderColor: 'var(--status-error)' }}>
            <p style={{ fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--status-error)', margin: 0 }}>
              {error}
            </p>
          </IOSCard>
        )}

        {/* AI Error Alert */}
        {aiError && (
          <IOSCard variant="flat" padding="md" style={{ marginBottom: 'var(--spacing-md)', backgroundColor: 'var(--status-warning)20', borderColor: 'var(--status-warning)' }}>
            <p style={{ fontFamily: 'var(--font-text)', fontSize: '15px', color: 'var(--status-warning)', margin: 0 }}>
              ⚠️ {aiError}
            </p>
          </IOSCard>
        )}

        {/* File Picker */}
        <IOSCard variant="elevated" padding="lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <IOSFilePicker
            mode="single"
            accept="image/*,video/*"
            maxSizeMB={50}
            enableCamera
            cameraMode="environment"
            showPreview
            uploadProgress={uploadProgress}
            loading={analyzing}
            onFilesSelected={handleFilesSelected}
            onError={setError}
          />
        </IOSCard>

        {/* Form (shows after file upload) */}
        {processedFile && (
          <>
            {/* AI Suggestions */}
            <IOSCard variant="elevated" padding="lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  ✨ Nombres Sugeridos por IA
                </h2>
                <IOSButton variant="plain" size="small" onClick={handleRefreshSuggestions} loading={analyzing}>
                  🔄 Refrescar
                </IOSButton>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                {processedFile.suggestedNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      setSelectedName(name);
                      setCustomName('');
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      border: selectedName === name ? '2px solid var(--brand-primary)' : '1px solid var(--border-default)',
                      backgroundColor: selectedName === name ? 'var(--button-secondary-bg)' : 'var(--surface-secondary)',
                      color: selectedName === name ? 'var(--brand-primary)' : 'var(--text-primary)',
                      fontFamily: 'var(--font-text)',
                      fontSize: '15px',
                      fontWeight: selectedName === name ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all var(--duration-fast) var(--easing-standard)',
                    }}
                  >
                    {name} {selectedName === name && '✓'}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <IOSTextField
                  label="O escribe un nombre personalizado"
                  placeholder="Nombre único para esta esmeralda"
                  value={customName}
                  onChange={setCustomName}
                  clearButton
                />
              </div>
            </IOSCard>

            {/* Details Form */}
            <IOSCard variant="elevated" padding="lg" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-md)',
                }}
              >
                Detalles
              </h2>

              <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {/* Category */}
                <div>
                  <label
                    style={{
                      fontFamily: 'var(--font-text)',
                      fontSize: '15px',
                      color: 'var(--text-secondary)',
                      marginBottom: 'var(--spacing-xs)',
                      display: 'block',
                    }}
                  >
                    Categoría
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    {(['loose', 'ring', 'pendant', 'earrings'] as EmeraldCategory[]).map((cat) => (
                      <IOSButton
                        key={cat}
                        variant={category === cat ? 'filled' : 'tinted'}
                        size="small"
                        onClick={() => setCategory(cat)}
                      >
                        {cat === 'loose' ? 'Suelta' : cat === 'ring' ? 'Anillo' : cat === 'pendant' ? 'Dije' : 'Aretes'}
                      </IOSButton>
                    ))}
                  </div>
                </div>

                {/* Weight & Price */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                  <IOSTextField label="Peso (quilates)" type="number" placeholder="0.00" value={weightCarats} onChange={setWeightCarats} />
                  <IOSTextField label="Precio (COP)" type="text" placeholder="$0" value={priceCOP} onChange={setPriceCOP} />
                </div>

                {/* Lot Code */}
                <IOSTextField label="Código de Lote (opcional)" placeholder="L:A-001" value={lotCode} onChange={setLotCode} />

                {/* AI Description */}
                {processedFile.description && (
                  <div>
                    <label
                      style={{
                        fontFamily: 'var(--font-text)',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        marginBottom: 'var(--spacing-xxs)',
                        display: 'block',
                      }}
                    >
                      Descripción IA
                    </label>
                    <p
                      style={{
                        fontFamily: 'var(--font-text)',
                        fontSize: '15px',
                        color: 'var(--text-tertiary)',
                        fontStyle: 'italic',
                      }}
                    >
                      {processedFile.description}
                    </p>
                  </div>
                )}
              </div>
            </IOSCard>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <IOSButton variant="plain" onClick={resetForm}>
                Cancelar
              </IOSButton>
              <IOSButton variant="filled" onClick={handleSave} disabled={!finalName}>
                💾 Guardar Esmeralda
              </IOSButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
