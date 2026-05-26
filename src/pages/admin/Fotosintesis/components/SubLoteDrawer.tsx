import { useEffect, useId, useMemo, useState } from "react";
import { Box, Dialog, Switch } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { X as XIcon } from "lucide-react";

import { getFoto, fontFamilies } from "../../../../design-system";
import { useConvexMutation, convexApi } from "../../../../lib/convex-safe";
import { useNotification } from "../../../../contexts/NotificationContext";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { PhotoDropzone, type DropzonePhoto } from "./PhotoDropzone";
import { uploadFotosintesisImages } from "../utils/uploadItemMedia";
import { convertToProxyUrl } from "../../../../utils/driveUrl";

const formatCOP = (n: number): string =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

interface SubLoteDrawerProps {
  open: boolean;
  onClose: () => void;
  parentLoteId: string;
  /** Items belonging to the parent lote — the picker source. */
  items: Doc<"productInventory">[];
  /** When provided, the drawer edits this sub-lote instead of creating one. */
  subLote?: Doc<"subLotes"> | null;
}

/**
 * Create or edit a sub-lote. On edit, the save handler diffs the selected
 * itemIds against the current membership and calls addItems/removeItems for the
 * delta (plus updateMeta when name/notas change) — the server stays the single
 * authority for the derived `unidades`/`totalCostoCOP` figures.
 */
export function SubLoteDrawer({
  open,
  onClose,
  parentLoteId,
  items,
  subLote,
}: SubLoteDrawerProps) {
  const foto = getFoto("light");
  const { notify } = useNotification();
  const titleId = useId();

  const createSubLote = useConvexMutation(convexApi.subLotes.create);
  const addItems = useConvexMutation(convexApi.subLotes.addItems);
  const removeItems = useConvexMutation(convexApi.subLotes.removeItems);
  const updateMeta = useConvexMutation(convexApi.subLotes.updateMeta);
  const setDisplay = useConvexMutation(convexApi.subLotes.setDisplay);

  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Catalog grouping: show this sublote as one bundled card.
  const [heroPhoto, setHeroPhoto] = useState<DropzonePhoto[]>([]);
  const [mostrarComoLote, setMostrarComoLote] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(subLote?.nombre ?? "");
    setNotas(subLote?.notas ?? "");
    setSelected(new Set(subLote?.itemIds ?? []));
    setMostrarComoLote(subLote?.mostrarComoLote ?? false);
    setHeroPhoto(
      subLote?.fotoUrl
        ? [
            {
              id: "existing-hero",
              // Drive URLs only render through the serve-drive-image proxy.
              url: convertToProxyUrl(subLote.fotoUrl) ?? subLote.fotoUrl,
            },
          ]
        : [],
    );
    setError(null);
  }, [open, subLote]);

  const toggle = (itemId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const selectedTotal = useMemo(() => {
    let total = 0;
    for (const it of items) {
      if (selected.has(it.itemId)) total += it.costoBaseCOP ?? 0;
    }
    return total;
  }, [items, selected]);

  const canSubmit = nombre.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      let effectiveSubLoteId: string;
      if (subLote) {
        const nombreNext = nombre.trim();
        const notasNext = notas.trim();
        if (
          nombreNext !== subLote.nombre ||
          (notasNext || undefined) !== (subLote.notas ?? undefined)
        ) {
          await updateMeta({
            subLoteId: subLote.subLoteId,
            nombre: nombreNext,
            notas: notasNext,
          });
        }
        const original = new Set(subLote.itemIds);
        const added = [...selected].filter((id) => !original.has(id));
        const removed = [...original].filter((id) => !selected.has(id));
        if (added.length)
          await addItems({ subLoteId: subLote.subLoteId, itemIds: added });
        if (removed.length)
          await removeItems({ subLoteId: subLote.subLoteId, itemIds: removed });
        effectiveSubLoteId = subLote.subLoteId;
        notify(`Sub-lote ${subLote.subLoteId} actualizado`, "success");
      } else {
        const res = await createSubLote({
          parentLoteId,
          nombre: nombre.trim(),
          notas: notas.trim() || undefined,
          itemIds: [...selected],
        });
        effectiveSubLoteId = res.subLoteId;
        notify(
          `Sub-lote ${res.subLoteId} creado · ${selected.size} ${
            selected.size === 1 ? "ítem" : "ítems"
          }`,
          "success",
        );
      }

      // Persist catalog-grouping (hero photo + show-as-group flag).
      let fotoUrl: string | undefined;
      const pendingHero = heroPhoto.find((p) => p.file);
      if (pendingHero?.file) {
        fotoUrl = await uploadFotosintesisImages(
          [pendingHero.file],
          parentLoteId,
          `sublote-${effectiveSubLoteId}-hero`,
        );
      }
      await setDisplay({
        subLoteId: effectiveSubLoteId,
        ...(fotoUrl !== undefined ? { fotoUrl } : {}),
        mostrarComoLote,
      });

      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos guardar el sub-lote",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputSx = {
    width: "100%",
    fontFamily: fontFamilies.system,
    fontSize: 14,
    color: foto.ink.primary,
    background: foto.surfaces.inset,
    border: `1px solid ${foto.surfaces.rule}`,
    borderRadius: "9px",
    padding: "10px 12px",
    outline: "none",
    "&:focus": { borderColor: foto.accent.primary },
  } as const;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      aria-labelledby={titleId}
      aria-modal
      slotProps={{
        backdrop: {
          sx: {
            background: "rgba(11,16,14,0.32)",
            backdropFilter: "saturate(80%)",
          },
        },
      }}
      PaperProps={{
        sx: {
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          margin: 0,
          width: 560,
          maxWidth: "calc(100vw - 24px)",
          height: "100vh",
          maxHeight: "100vh",
          borderRadius: 0,
          background: foto.surfaces.canvas,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 22px",
          borderBottom: `1px solid ${foto.surfaces.rule}`,
        }}
      >
        <Box>
          <Box
            id={titleId}
            sx={{ fontSize: 17, fontWeight: 600, color: foto.ink.primary }}
          >
            {subLote ? `Editar ${subLote.subLoteId}` : "Nuevo sub-lote"}
          </Box>
          <Box
            sx={{ fontSize: 12, color: foto.ink.tertiary, marginTop: "2px" }}
          >
            agrupando ítems del lote{" "}
            <Box component="span" sx={{ fontFamily: fontFamilies.mono }}>
              {parentLoteId}
            </Box>
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          sx={{
            width: 32,
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderRadius: "8px",
            color: foto.ink.tertiary,
            cursor: "pointer",
            "&:hover": { background: foto.surfaces.inset },
          }}
        >
          <XIcon size={18} />
        </Box>
      </Box>

      {/* Body */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <Box>
          <Box
            component="label"
            sx={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              color: foto.ink.tertiary,
              marginBottom: "6px",
            }}
          >
            Nombre del sub-lote
          </Box>
          <Box
            component="input"
            value={nombre}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNombre(e.target.value)
            }
            placeholder="p. ej. Verdes alta gema"
            sx={inputSx}
          />
        </Box>

        <Box>
          <Box
            component="label"
            sx={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              color: foto.ink.tertiary,
              marginBottom: "6px",
            }}
          >
            Notas (opcional)
          </Box>
          <Box
            component="textarea"
            value={notas}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNotas(e.target.value)
            }
            rows={2}
            sx={{ ...inputSx, resize: "vertical", minHeight: 56 }}
          />
        </Box>

        {/* Catalog grouping — show this sublote as one bundled card */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "14px 16px",
            border: `1px solid ${foto.surfaces.rule}`,
            borderRadius: "12px",
            background: foto.surfaces.inset,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <Box
                sx={{ fontSize: 13, fontWeight: 600, color: foto.ink.primary }}
              >
                Mostrar como grupo en catálogo
              </Box>
              <Box sx={{ fontSize: 11, color: foto.ink.tertiary }}>
                Un card con foto del sub-lote y precio total; la galería muestra
                cada ítem con su precio.
              </Box>
            </Box>
            <Switch
              checked={mostrarComoLote}
              onChange={(e) => setMostrarComoLote(e.target.checked)}
              inputProps={{ "aria-label": "Mostrar como grupo en catálogo" }}
            />
          </Box>
          {mostrarComoLote ? (
            <PhotoDropzone
              photos={heroPhoto}
              onAdd={(files) => {
                const f = files[0];
                if (!f) return;
                heroPhoto.forEach((p) => {
                  if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
                });
                setHeroPhoto([
                  {
                    id: `${f.name}-${f.lastModified}`,
                    url: URL.createObjectURL(f),
                    file: f,
                  },
                ]);
              }}
              onRemove={() => setHeroPhoto([])}
              hint="Foto del sub-lote completo. Se sube a Drive al guardar."
            />
          ) : null}
        </Box>

        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "8px",
            }}
          >
            <Box
              sx={{ fontSize: 11, fontWeight: 600, color: foto.ink.tertiary }}
            >
              Ítems del lote
            </Box>
            <Box sx={{ fontSize: 12, color: foto.ink.secondary }}>
              {selected.size} sel. ·{" "}
              <Box component="span" sx={{ fontFamily: fontFamilies.mono }}>
                {formatCOP(selectedTotal)}
              </Box>
            </Box>
          </Box>

          {items.length === 0 ? (
            <Box
              sx={{
                fontSize: 12.5,
                color: foto.ink.tertiary,
                padding: "16px",
                textAlign: "center",
                border: `1px dashed ${foto.surfaces.rule}`,
                borderRadius: "10px",
              }}
            >
              Este lote todavía no tiene ítems capturados.
            </Box>
          ) : (
            <Box
              component="ul"
              role="list"
              sx={{
                listStyle: "none",
                m: 0,
                p: 0,
                border: `1px solid ${foto.surfaces.rule}`,
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              {items.map((it) => {
                const on = selected.has(it.itemId);
                return (
                  <Box
                    component="li"
                    key={it.itemId}
                    onClick={() => toggle(it.itemId)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      cursor: "pointer",
                      background: on ? foto.accent.soft : "transparent",
                      borderBottom: `1px solid ${foto.surfaces.edge}`,
                      "&:last-of-type": { borderBottom: "none" },
                      "&:hover": {
                        background: on ? foto.accent.soft : foto.surfaces.inset,
                      },
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 18,
                        height: 18,
                        flexShrink: 0,
                        borderRadius: "5px",
                        border: `1.5px solid ${
                          on ? foto.accent.primary : foto.surfaces.rule
                        }`,
                        background: on ? foto.accent.primary : "transparent",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {on ? "✓" : ""}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: foto.ink.primary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {it.nombre || "—"}
                      </Box>
                      <Box
                        sx={{
                          fontSize: 11,
                          color: foto.ink.tertiary,
                          fontFamily: fontFamilies.mono,
                        }}
                      >
                        #{it.itemId} · {formatCOP(it.costoBaseCOP ?? 0)}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          padding: "16px 22px",
          borderTop: `1px solid ${foto.surfaces.rule}`,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {error ? (
          <Box
            role="alert"
            sx={{
              fontSize: 12.5,
              color: foto.status.sold,
              background: alpha(foto.status.sold, 0.08),
              border: `1px solid ${foto.status.sold}`,
              borderRadius: "8px",
              padding: "8px 12px",
            }}
          >
            {error}
          </Box>
        ) : null}
        <Box
          component="button"
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          sx={{
            width: "100%",
            padding: "13px 18px",
            borderRadius: "11px",
            border: "none",
            background: foto.accent.primary,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.55,
            "&:hover:not(:disabled)": { filter: "brightness(1.05)" },
          }}
        >
          {submitting
            ? "Guardando…"
            : subLote
              ? "Guardar cambios"
              : "Crear sub-lote"}
        </Box>
      </Box>
    </Dialog>
  );
}
