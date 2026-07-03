/**
 * VitrinaShareDialog — staff picks the client-facing pricing, then mints a
 * public share link.
 *
 * Staff choose currency (COP/USD) and a markup multiplier (x1–x4); we create a
 * Convex `vitrinas` token storing {itemIds, currency, multiplier, senderSlug}
 * and hand back a short `/v/<token>` link. The multiplier is stored server-side
 * (not in the URL), so the recipient can neither see nor change the markup.
 *
 * Pricing controls mirror InvitationGenerator; default multiplier is x1
 * (standard retail) per product decision.
 */

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from "@mui/material";
import { Check, Copy, Link2, MessageCircle, X } from "lucide-react";
import { useTRM } from "../../hooks/useTRM";
import { VitrinaCurrency, formatVitrinaPrice } from "../../utils/vitrinaPrice";
import { brand, fontWeights } from "../../design-system";
import { STORAGE_KEYS } from "../../constants/storage-keys";

const STUDIO_BASE_URL = "https://tierramadre.app";

interface ShareItem {
  item: number;
  precioCOP?: number;
  nombre?: string;
}

interface VitrinaShareDialogProps {
  open: boolean;
  onClose: () => void;
  items: ShareItem[];
  /** Asesor slug embedded so the client's "Consultar" reaches the sender. */
  senderSlug?: string;
}

export default function VitrinaShareDialog({
  open,
  onClose,
  items,
  senderSlug,
}: VitrinaShareDialogProps) {
  const { trmRate } = useTRM();

  const [currency, setCurrency] = useState<VitrinaCurrency>("COP");
  const [multiplier, setMultiplier] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live preview off the first priced item, or a 2M sample like the invite UI.
  const previewBaseCOP = useMemo(() => {
    const priced = items.find(
      (i) => typeof i.precioCOP === "number" && i.precioCOP! > 0,
    );
    return priced?.precioCOP ?? 2_000_000;
  }, [items]);
  const previewLabel = formatVitrinaPrice(
    previewBaseCOP,
    { multiplier, currency },
    trmRate,
  );

  const reset = () => {
    setLink(null);
    setCopied(false);
    setError(null);
    setCurrency("COP");
    setMultiplier(1);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGenerate = async () => {
    if (items.length === 0) {
      setError("No hay piezas para compartir.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      // Mint via the authenticated proxy: it verifies the caller's Google ID
      // token server-side, then creates the tamper-proof token in Convex.
      const idToken = (() => {
        try {
          return localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN) || "";
        } catch {
          return "";
        }
      })();
      const res = await fetch("/api/vitrina", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          itemIds: items.map((i) => i.item),
          currency,
          multiplier,
          senderSlug,
        }),
      });

      if (res.status === 401) {
        setError("Tu sesión expiró. Vuelve a iniciar sesión y reintenta.");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.token) {
        setError(
          data?.error ||
            "No se pudo generar el enlace. Verifica tu conexión e intenta de nuevo.",
        );
        return;
      }

      const url = `${STUDIO_BASE_URL}/v/${data.token}`;
      setLink(url);
      // Native share on mobile; otherwise the link is shown for manual copy.
      if (typeof navigator !== "undefined" && "share" in navigator) {
        try {
          await navigator.share({
            title: "Tierra Mädre — Selección para ti",
            text: `Estas piezas son para ti 💚 (${items.length} ${items.length === 1 ? "pieza" : "piezas"})`,
            url,
          });
        } catch {
          /* user cancelled — link is shown for manual copy */
        }
      }
    } catch {
      setError(
        "No se pudo generar el enlace. Verifica tu conexión e intenta de nuevo.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("No se pudo copiar. Copia el enlace manualmente.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogContent sx={{ p: 3, position: "relative" }}>
        <IconButton
          onClick={handleClose}
          aria-label="Cerrar"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "text.secondary",
          }}
        >
          <X size={20} />
        </IconButton>

        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: fontWeights.bold }}>
              Compartir con cliente
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mt: 0.5 }}
            >
              {items.length} {items.length === 1 ? "pieza" : "piezas"} · el
              cliente verá solo esta selección, sin iniciar sesión.
            </Typography>
          </Box>

          {!link ? (
            <>
              {/* Currency */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: fontWeights.medium,
                  }}
                >
                  Moneda
                </Typography>
                <ToggleButtonGroup
                  value={currency}
                  exclusive
                  size="small"
                  fullWidth
                  onChange={(_e, val) => {
                    if (val !== null) setCurrency(val as VitrinaCurrency);
                  }}
                  sx={{ mt: 0.75 }}
                >
                  <ToggleButton value="COP">COP</ToggleButton>
                  <ToggleButton value="USD">USD</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Multiplier */}
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: fontWeights.medium,
                    }}
                  >
                    Multiplicador
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: fontWeights.bold,
                      color: brand.emerald[700],
                    }}
                  >
                    x{multiplier.toFixed(1)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mt: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    x1
                  </Typography>
                  <Slider
                    value={multiplier}
                    onChange={(_e, val) => setMultiplier(val as number)}
                    min={1}
                    max={4}
                    step={0.1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `x${v}`}
                    aria-label="Multiplicador de precio"
                    sx={{
                      color: brand.emerald[700],
                      "& .MuiSlider-thumb": { width: 18, height: 18 },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    x4
                  </Typography>
                </Box>
              </Box>

              {/* Preview */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: alpha(brand.emerald[500], 0.08),
                }}
              >
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  El cliente verá (ej.)
                </Typography>
                <Typography
                  sx={{
                    fontWeight: fontWeights.bold,
                    color: brand.emerald[700],
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  {previewLabel || "—"}
                </Typography>
              </Box>

              {error && (
                <Typography variant="caption" sx={{ color: "error.main" }}>
                  {error}
                </Typography>
              )}

              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={generating}
                onClick={handleGenerate}
                startIcon={
                  generating ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Link2 size={18} />
                  )
                }
                sx={{
                  bgcolor: brand.emerald[600],
                  py: 1.35,
                  fontWeight: fontWeights.bold,
                  textTransform: "none",
                  "&:hover": { bgcolor: brand.emerald[700] },
                }}
              >
                {generating ? "Generando…" : "Generar enlace"}
              </Button>
            </>
          ) : (
            <>
              {/* Success — the link */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  wordBreak: "break-all",
                }}
              >
                <Typography
                  sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                >
                  {link}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={copied ? <Check size={18} /> : <Copy size={18} />}
                  onClick={handleCopy}
                  sx={{
                    textTransform: "none",
                    borderColor: brand.emerald[500],
                    color: brand.emerald[700],
                  }}
                >
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<MessageCircle size={18} />}
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(link)}`,
                      "_blank",
                    )
                  }
                  sx={{
                    textTransform: "none",
                    bgcolor: brand.emerald[600],
                    color: "#fff",
                    "&:hover": { bgcolor: brand.emerald[700] },
                  }}
                >
                  WhatsApp
                </Button>
              </Stack>
              {error && (
                <Typography variant="caption" sx={{ color: "error.main" }}>
                  {error}
                </Typography>
              )}
              <Button
                variant="text"
                size="small"
                onClick={reset}
                sx={{ textTransform: "none", color: "text.secondary" }}
              >
                Generar otro enlace
              </Button>
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
