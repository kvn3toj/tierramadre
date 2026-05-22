import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Box } from "@mui/material";
import { Camera, X as XIcon } from "lucide-react";
import { getFoto } from "../../../../design-system";
import { extractDominantHex } from "../../../../hooks/useChromaSamples";

export interface DropzonePhoto {
  /** Stable id for keys + remove. */
  id: string;
  /** Either a Drive URL or a local objectURL. */
  url: string;
}

interface PhotoDropzoneProps {
  photos: DropzonePhoto[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  /**
   * Slice-2: parent can pass a pre-sampled hex (e.g. from existing
   * thumbnails cache) to skip the in-component sampling. If omitted, the
   * dropzone samples the first photo client-side via `extractDominantHex`.
   */
  chromaHex?: string;
  hint?: React.ReactNode;
  /**
   * Window-level clipboard listener so Maritza can paste a screenshot
   * straight into the active dropzone. Default ON in Slice 2 — disable for
   * pages that already have their own paste handling.
   */
  enablePaste?: boolean;
}

/**
 * Drag/drop + clipboard paste + click-to-select photo input.
 *
 * Slice 2 layers on:
 *  - Window-level `paste` listener so a Cmd-V dumps the clipboard image
 *    into the active dropzone (handoff §4.2 estado).
 *  - Client-side chroma sampling on the first photo so the wizard can
 *    surface the dominant hex as a swatch (handoff §3.9).
 */
export function PhotoDropzone({
  photos,
  onAdd,
  onRemove,
  chromaHex,
  hint,
  enablePaste = true,
}: PhotoDropzoneProps) {
  const foto = getFoto("light");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropId = useId();
  const instanceId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [sampledHex, setSampledHex] = useState<string | null>(null);

  const acceptFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const files: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList.item(i);
      if (f && f.type.startsWith("image/")) files.push(f);
    }
    if (files.length > 0) onAdd(files);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFiles(e.dataTransfer.files);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    acceptFiles(e.target.files);
    e.target.value = "";
  };

  // Clipboard paste — global listener so the user can paste from anywhere
  // on the page when a photo is on the clipboard. Skips when an input is
  // focused unless the input is *this* dropzone's hidden file picker.
  useEffect(() => {
    if (!enablePaste) return;
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const target = e.target as HTMLElement | null;
      // Allow paste when nothing is focused or when focus is on body.
      // Skip when focus is in a text input/textarea so Maritza's typing
      // isn't hijacked by a "your clipboard had an image" surprise.
      if (target && target !== document.body) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        onAdd(files);
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [enablePaste, onAdd]);

  // Chroma sampling — only fires for the first photo and only if the parent
  // didn't pass an override hex. Uses the same primitives as the catalog's
  // useChromaSamples (1×1 canvas sample, gracefully handles tainted images).
  useEffect(() => {
    if (chromaHex) return;
    if (photos.length === 0) {
      setSampledHex(null);
      return;
    }
    if (typeof Image === "undefined") return;
    const first = photos[0];
    if (!first?.url) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        setSampledHex(extractDominantHex(data[0], data[1], data[2]));
      } catch {
        // tainted canvas / decode error — skip; no swatch shown.
      }
    };
    img.onerror = () => {
      if (!cancelled) setSampledHex(null);
    };
    img.src = first.url;
    return () => {
      cancelled = true;
    };
  }, [photos, chromaHex]);

  const displayHex = chromaHex ?? sampledHex ?? null;

  return (
    <Box>
      <Box
        role="button"
        tabIndex={0}
        aria-label="Subir fotos"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px",
          borderRadius: "11px",
          background: isDragging ? foto.accent.soft : foto.surfaces.inset,
          border: `1px dashed ${
            isDragging ? foto.accent.primary : foto.surfaces.rule
          }`,
          cursor: "pointer",
          transition: "background 120ms ease, border-color 120ms ease",
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            background: foto.surfaces.canvas,
            border: `1px solid ${foto.surfaces.edge}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: foto.ink.tertiary,
            flexShrink: 0,
          }}
        >
          <Camera size={18} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              fontSize: 12.5,
              color: foto.ink.primary,
              fontWeight: 500,
            }}
          >
            Arrastrá, pegá (⌘V) o hacé clic para elegir
          </Box>
          {hint ? (
            <Box
              sx={{
                fontSize: 10.5,
                color: foto.ink.tertiary,
                marginTop: "2px",
              }}
            >
              {hint}
            </Box>
          ) : null}
        </Box>
      </Box>
      <input
        ref={inputRef}
        id={dropId}
        type="file"
        accept="image/*"
        multiple
        onChange={onChange}
        style={{ display: "none" }}
      />

      {photos.length > 0 ? (
        <Box
          sx={{
            display: "flex",
            gap: "8px",
            marginTop: "10px",
            flexWrap: "wrap",
          }}
        >
          {photos.map((p) => (
            <Box
              key={`${instanceId}-${p.id}`}
              sx={{
                position: "relative",
                width: 64,
                height: 64,
                aspectRatio: "1/1",
                borderRadius: "8px",
                overflow: "hidden",
                border: `1px solid ${foto.surfaces.rule}`,
                background: foto.surfaces.inset,
              }}
            >
              <Box
                component="img"
                src={p.url}
                alt=""
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <Box
                component="button"
                type="button"
                aria-label="Quitar foto"
                onClick={() => onRemove(p.id)}
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 20,
                  height: 20,
                  border: "none",
                  borderRadius: "50%",
                  background: "rgba(11,16,14,0.7)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <XIcon size={12} />
              </Box>
            </Box>
          ))}
          {displayHex ? (
            <Box
              aria-label={`Color dominante ${displayHex}`}
              title={`Color dominante ${displayHex}`}
              sx={{
                width: 64,
                height: 64,
                aspectRatio: "1/1",
                borderRadius: "8px",
                background: displayHex,
                border: `1px solid ${foto.surfaces.rule}`,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                fontSize: 9.5,
                color: foto.ink.inverse,
                paddingBottom: "4px",
                fontWeight: 600,
                textShadow: "0 0 4px rgba(0,0,0,0.4)",
                textTransform: "uppercase",
              }}
            >
              {displayHex}
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

export default PhotoDropzone;
