/**
 * JewelryPreviewGenerator
 * ------------------------------------------------------------------
 * Dialog that lets an asesor generate AI visualizations of a selected
 * emerald set into jewelry and worn (ring on a woman's/man's hand,
 * pendant on the neck, earrings on a model) — so the client can imagine
 * the finished piece. The chosen image is attached to the product and
 * shown in the quotation preview + PDF export.
 *
 * Generation runs server-side via /api/generate-jewelry-preview
 * (Google Gemini 2.5 Flash Image). Uses the real product photo as a
 * reference by default, falling back to the emerald's specs.
 */
import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  alpha,
} from "@mui/material";
import {
  Sparkles,
  X,
  Check,
  Hand,
  Gem,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { brandColors } from "../constants";
import {
  CotizacionProduct,
  AiJewelryScene,
  AiJewelryMetal,
  AiJewelryPreview,
} from "../../../hooks/useCotizacion";
import { useJewelryPreview } from "../../../hooks/useJewelryPreview";
import { useTrackingDispatch } from "../../../contexts/TrackingContext";

interface SceneDef {
  key: AiJewelryScene;
  label: string;
  hint: string;
}

const SCENES: SceneDef[] = [
  {
    key: "ring-woman",
    label: "Anillo · mujer",
    hint: "Anillo en mano femenina",
  },
  {
    key: "ring-man",
    label: "Anillo · hombre",
    hint: "Anillo en mano masculina",
  },
  { key: "necklace", label: "Collar", hint: "Dije sobre el cuello" },
  { key: "earrings", label: "Aretes", hint: "Aretes en modelo" },
];

export interface JewelryPreviewGeneratorProps {
  open: boolean;
  onClose: () => void;
  product: CotizacionProduct | null;
  quotationId: string;
  onUpdate: (updates: Partial<CotizacionProduct>) => void;
  /** Preselect a scene (e.g. derived from a provider's product type). */
  initialScene?: AiJewelryScene;
  /** Preselect the setting metal. */
  initialMetal?: AiJewelryMetal;
  /** Where the dialog is used — tagged on the ai_preview_generated event. */
  surface?: "cotizacion" | "provider";
}

export const JewelryPreviewGenerator: React.FC<
  JewelryPreviewGeneratorProps
> = ({
  open,
  onClose,
  product,
  quotationId,
  onUpdate,
  initialScene = "ring-woman",
  initialMetal = "gold",
  surface = "cotizacion",
}) => {
  const { generate, isGenerating, error, setError } = useJewelryPreview();
  const { track } = useTrackingDispatch();

  const hasPhoto = Boolean(product?.imagen);
  const [scene, setScene] = useState<AiJewelryScene>(initialScene);
  const [metal, setMetal] = useState<AiJewelryMetal>(initialMetal);
  const [mode, setMode] = useState<"photo" | "specs">(
    hasPhoto ? "photo" : "specs",
  );

  // Sync defaults + valid mode when the product (or its presets) changes.
  React.useEffect(() => {
    setMode(hasPhoto ? "photo" : "specs");
    setScene(initialScene);
    setMetal(initialMetal);
    setError(null);
  }, [product?.id, hasPhoto, initialScene, initialMetal, setError]);

  const previews = useMemo<AiJewelryPreview[]>(
    () => product?.aiPreviews ?? [],
    [product?.aiPreviews],
  );
  const selectedUrl = product?.selectedPreviewUrl;

  if (!product) return null;

  const handleGenerate = async () => {
    const preview = await generate({
      product,
      quotationId,
      scene,
      metal,
      mode,
    });
    if (!preview) return;
    track("ai_preview_generated", { scene, metal, mode, surface });
    const nextPreviews = [...previews, preview];
    onUpdate({ aiPreviews: nextPreviews, selectedPreviewUrl: preview.url });
  };

  const handleSelect = (url: string) => {
    onUpdate({ selectedPreviewUrl: selectedUrl === url ? undefined : url });
  };

  const handleDelete = (id: string) => {
    const removed = previews.find((p) => p.id === id);
    const next = previews.filter((p) => p.id !== id);
    onUpdate({
      aiPreviews: next,
      selectedPreviewUrl:
        removed && removed.url === selectedUrl ? undefined : selectedUrl,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", gap: 1, pr: 6 }}
      >
        <Sparkles size={18} color={brandColors.gold} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            Visualizar con IA
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            #{product.itemNumber} · {product.name}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Cerrar"
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Source mode */}
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: "text.secondary" }}
        >
          Fuente
        </Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          fullWidth
          size="small"
          onChange={(_, v) => v && setMode(v)}
          sx={{ mt: 0.5, mb: 2 }}
        >
          <ToggleButton value="photo" disabled={!hasPhoto}>
            <ImageIcon size={14} style={{ marginRight: 6 }} />
            Foto real
          </ToggleButton>
          <ToggleButton value="specs">
            <Gem size={14} style={{ marginRight: 6 }} />
            Características
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Scene */}
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: "text.secondary" }}
        >
          Escena
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            mt: 0.5,
            mb: 2,
          }}
        >
          {SCENES.map((s) => {
            const active = scene === s.key;
            return (
              <Box
                key={s.key}
                role="button"
                tabIndex={0}
                onClick={() => setScene(s.key)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && setScene(s.key)
                }
                sx={{
                  cursor: "pointer",
                  borderRadius: 2,
                  border: "1.5px solid",
                  borderColor: active ? brandColors.emerald : "divider",
                  bgcolor: active
                    ? alpha(brandColors.emerald, 0.08)
                    : "transparent",
                  p: 1.25,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  transition: "all 0.15s ease",
                }}
              >
                <Hand
                  size={16}
                  color={active ? brandColors.emerald : brandColors.gray}
                />
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={active ? 700 : 600}
                    sx={{ lineHeight: 1.1 }}
                  >
                    {s.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.6rem" }}
                  >
                    {s.hint}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Metal */}
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: "text.secondary" }}
        >
          Metal del engaste
        </Typography>
        <ToggleButtonGroup
          value={metal}
          exclusive
          fullWidth
          size="small"
          onChange={(_, v) => v && setMetal(v)}
          sx={{ mt: 0.5, mb: 2 }}
        >
          <ToggleButton value="gold">Oro 18k</ToggleButton>
          <ToggleButton value="silver">Plata 925</ToggleButton>
        </ToggleButtonGroup>

        <Button
          fullWidth
          variant="contained"
          onClick={handleGenerate}
          disabled={isGenerating}
          startIcon={
            isGenerating ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Sparkles size={16} />
            )
          }
          sx={{
            bgcolor: brandColors.emerald,
            fontWeight: 700,
            textTransform: "none",
            borderRadius: 2,
            "&:hover": {
              bgcolor: brandColors.emerald,
              filter: "brightness(0.95)",
            },
          }}
        >
          {isGenerating ? "Generando…" : "Generar visualización"}
        </Button>

        {error && (
          <Alert
            severity="error"
            sx={{ mt: 2, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Results */}
        {previews.length > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: "text.secondary" }}
            >
              Visualizaciones ({previews.length}) · toca para usar en la
              cotización
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1,
                mt: 1,
              }}
            >
              {previews.map((p) => {
                const isSelected = p.url === selectedUrl;
                return (
                  <Box
                    key={p.id}
                    sx={{
                      position: "relative",
                      aspectRatio: "1 / 1",
                      borderRadius: 2,
                      overflow: "hidden",
                      border: "2px solid",
                      borderColor: isSelected ? brandColors.emerald : "divider",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSelect(p.url)}
                  >
                    <Box
                      component="img"
                      src={p.url}
                      alt={`Visualización ${p.scene}`}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    {isSelected && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 4,
                          left: 4,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          bgcolor: brandColors.emerald,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Check size={14} color="#fff" />
                      </Box>
                    )}
                    <IconButton
                      size="small"
                      aria-label="Eliminar visualización"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
                      sx={{
                        position: "absolute",
                        bottom: 2,
                        right: 2,
                        bgcolor: alpha("#000", 0.45),
                        color: "#fff",
                        "&:hover": { bgcolor: alpha("#000", 0.65) },
                      }}
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1, fontSize: "0.6rem" }}
            >
              Imagen referencial generada por IA. Puede diferir de la pieza
              final.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Listo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JewelryPreviewGenerator;
