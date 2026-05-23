import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Box } from "@mui/material";
import { Camera, X as XIcon } from "lucide-react";
import { getFoto } from "../../../../design-system";

export interface DropzonePhoto {
  /** Stable id for keys + remove. */
  id: string;
  /** Either a Drive URL or a local objectURL. */
  url: string;
  /** Original file — kept for Drive upload after item create. */
  file?: File;
}

interface PhotoDropzoneProps {
  photos: DropzonePhoto[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  /** Slice-2 swap: a sampled hex chroma swatch. */
  chromaHex?: string;
  hint?: React.ReactNode;
}

/**
 * Drag/drop + clipboard paste + click-to-select photo input. Slice-1 version
 * is "good enough to attach a snapshot"; Slice-2 layers on chroma sampling via
 * `useChromaSamples` (handoff §3.9).
 */
export function PhotoDropzone({
  photos,
  onAdd,
  onRemove,
  chromaHex,
  hint,
}: PhotoDropzoneProps) {
  const foto = getFoto("light");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropId = useId();
  const [isDragging, setIsDragging] = useState(false);

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
            Arrastrá imágenes o hacé clic para elegir
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
              key={p.id}
              sx={{
                position: "relative",
                width: 64,
                height: 64,
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
          {chromaHex ? (
            <Box
              aria-label={`Color dominante ${chromaHex}`}
              sx={{
                width: 64,
                height: 64,
                borderRadius: "8px",
                background: chromaHex,
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
              {chromaHex}
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

export default PhotoDropzone;
