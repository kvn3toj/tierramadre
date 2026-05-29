import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, Dialog } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { Search, X, Clock, Check } from "lucide-react";
import { getFoto, fontFamilies, emeraldCore } from "../../../../design-system";
import { useConvexQuery, convexApi } from "../../../../lib/convex-safe";
import type { SpotlightProduct } from "../FotosintesisLayoutContext";
import { KbdKey } from "./KbdKey";
import { convertToProxyUrl } from "../../../../utils/driveUrl";
import {
  toggleSelection,
  removeSelection,
  isSelected,
} from "../utils/saleItemSelection";

interface ProductoSpotlightProps {
  open: boolean;
  onClose: () => void;
  /** When set, shows a scope chip and constrains the result set semantically. */
  scope?: string;
  onSelect: (product: SpotlightProduct) => void;
  /**
   * Multi-select mode: clicking a row toggles it in/out of a running set
   * instead of selecting-and-closing. The operator confirms the whole set via
   * the footer "Listo" button or ⌘↵, which fires `onConfirm`.
   */
  multiSelect?: boolean;
  /** Products to pre-check when opening in multi-select mode. */
  selectedProducts?: SpotlightProduct[];
  /** Fired with the confirmed set in multi-select mode. */
  onConfirm?: (products: SpotlightProduct[]) => void;
}

// Filter group labels (disabled in Slice 1 — surfaced as "próximamente").
const FILTER_GROUPS: { title: string; items: string[] }[] = [
  { title: "Calidad", items: ["AAA", "AA", "A"] },
  { title: "Procedencia", items: ["Muzo", "Chivor", "Coscuez"] },
  { title: "Lote", items: ["B-008", "B-007", "B-006"] },
  { title: "Rango precio", items: ["< 500k", "500k–2M", "> 2M"] },
];

/** Vendible BR-6 states. We filter client-side because `products.list` only
 * accepts a single `estado` literal. */
const VENDIBLE_ESTADOS = new Set(["DISPONIBLE", "ASESOR"]);

function formatCop(value: number | undefined | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Global ⌘K spotlight — search vendible inventory and hand the selected
 * item back to the caller (e.g. VentaPage). Handoff §4.5.
 *
 * Slice 1 surface:
 *  - Live search via `products.list` (filtered client-side to DISPONIBLE/ASESOR)
 *  - Keyboard navigation: ↑/↓, ↵, Esc, ⌘N
 *  - Live region announcing "X de Y resultados"
 *  - Filter groups rendered but disabled ("próximamente")
 */
export function ProductoSpotlight({
  open,
  onClose,
  scope,
  onSelect,
  multiSelect = false,
  selectedProducts,
  onConfirm,
}: ProductoSpotlightProps) {
  const foto = getFoto("light");
  const navigate = useNavigate();
  const titleId = useId();

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [focusIndex, setFocusIndex] = useState(0);
  // Running multi-select set — full product objects so chosen items stay
  // visible and removable even when they fall outside the current search.
  const [selected, setSelected] = useState<SpotlightProduct[]>([]);
  // Assertive announcement for the most recent toggle, so screen-reader users
  // get per-item feedback ("Añadido X" / "Quitado X") on ↵, not just the count.
  const [toggleAnnounce, setToggleAnnounce] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when the modal opens. In multi-select mode we seed the running
  // set from the caller's current selection so re-opening the picker edits
  // (adds/removes) the existing bundle rather than starting from scratch.
  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusIndex(0);
      setSelected(multiSelect ? (selectedProducts ?? []) : []);
      setToggleAnnounce("");
      // Autofocus is best-effort — MUI Dialog handles initial focus.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
    // `selectedProducts` is intentionally read only at open — the running set is
    // local from then on, so we don't want a parent re-render to clobber edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, multiSelect]);

  const confirmSelection = useCallback(() => {
    onConfirm?.(selected);
    onClose();
  }, [onConfirm, selected, onClose]);

  const pickRow = useCallback(
    (row: SpotlightProduct) => {
      if (multiSelect) {
        setSelected((prev) => {
          const next = toggleSelection(prev, row);
          const added = next.length > prev.length;
          setToggleAnnounce(
            `${added ? "Añadido" : "Quitado"} ${row.nombre || row.itemId}`,
          );
          return next;
        });
        return;
      }
      onSelect(row);
      onClose();
    },
    [multiSelect, onSelect, onClose],
  );

  // --- Data fetch ----------------------------------------------------------
  // `products.list` only accepts a single estado at a time. We fetch by
  // DISPONIBLE and ASESOR separately and merge client-side, then apply the
  // search filter (the server already does the search, but a deferred query
  // means we may briefly see stale data — re-filtering keeps it stable).
  const disponibles = useConvexQuery(
    convexApi.products.list,
    open ? { estado: "DISPONIBLE", search: deferredQuery } : "skip",
  );
  const asesor = useConvexQuery(
    convexApi.products.list,
    open ? { estado: "ASESOR", search: deferredQuery } : "skip",
  );

  const results = useMemo<SpotlightProduct[]>(() => {
    if (!open) return [];
    const merged = [...(disponibles ?? []), ...(asesor ?? [])];
    const vendibles = merged.filter((p) =>
      VENDIBLE_ESTADOS.has(p.estado as string),
    );
    // Dedupe by itemId (safety net — should already be partitioned)
    const seen = new Set<string>();
    const deduped: SpotlightProduct[] = [];
    for (const row of vendibles) {
      if (seen.has(row.itemId)) continue;
      seen.add(row.itemId);
      deduped.push({
        itemId: row.itemId,
        nombre: row.nombre ?? "Sin nombre",
        // Drive URLs need the proxy to render as an <img> thumbnail.
        thumbnailUrl: convertToProxyUrl(row.fotoUrl),
        precioCop: row.precioCOP,
        loteId: row.loteId,
        estado: row.estado as string | undefined,
      });
    }
    // Cap at 50 to match the design max-height list.
    return deduped.slice(0, 50);
  }, [open, disponibles, asesor]);

  const loading = open && (disponibles === undefined || asesor === undefined);

  // Clamp the focus index to current results
  useEffect(() => {
    if (focusIndex >= results.length) {
      setFocusIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, focusIndex]);

  // Scroll focused row into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-row-index="${focusIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [focusIndex]);

  // --- Keyboard handling --------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // ⌘N / Ctrl+N — create new
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        onClose();
        navigate("/admin/fotosintesis/lots/new");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(results.length - 1, i + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Enter") {
        // ⌘↵ / Ctrl+↵ — confirm the whole multi-select set.
        if (multiSelect && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          confirmSelection();
          return;
        }
        const picked = results[focusIndex];
        if (picked) {
          e.preventDefault();
          // Multi-select: ↵ toggles the focused row (keep the modal open so the
          // operator can keep building the bundle). Single-select: pick + close.
          pickRow(picked);
        }
        return;
      }
      // Esc is handled by Dialog.onClose
    },
    [results, focusIndex, navigate, multiSelect, confirmSelection, pickRow],
  );

  // --- Render --------------------------------------------------------------
  const baseLiveMessage = loading
    ? "Buscando…"
    : results.length === 0
      ? query
        ? "Sin resultados"
        : "Empezá tipeando"
      : `${focusIndex + 1} de ${results.length} resultados`;
  const liveMessage =
    multiSelect && selected.length > 0
      ? `${baseLiveMessage} · ${selected.length} seleccionado${
          selected.length === 1 ? "" : "s"
        }`
      : baseLiveMessage;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      aria-labelledby={titleId}
      slotProps={{
        backdrop: {
          sx: {
            background: `
              radial-gradient(ellipse at 50% 30%, rgba(0, 140, 98, 0.15) 0%, transparent 60%),
              rgba(11, 16, 14, 0.55)
            `,
            backdropFilter: "saturate(120%) blur(4px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          width: 920,
          maxWidth: "calc(100vw - 48px)",
          margin: 0,
          marginTop: "min(110px, 10vh)",
          marginBottom: "auto",
          alignSelf: "flex-start",
          borderRadius: "18px",
          border: `1px solid ${foto.surfaces.rule}`,
          background: foto.surfaces.canvas,
          boxShadow: `
            0 1px 2px rgba(0, 0, 0, 0.05),
            0 8px 24px rgba(0, 0, 0, 0.15),
            0 36px 80px rgba(0, 0, 0, 0.3)
          `,
          overflow: "hidden",
        },
      }}
      sx={{
        "& .MuiDialog-container": {
          alignItems: "flex-start",
        },
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Header: search input + scope chip + esc */}
      <Box
        id={titleId}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "18px 22px",
          borderBottom: `1px solid ${foto.surfaces.edge}`,
        }}
      >
        <Search
          size={20}
          strokeWidth={1.5}
          color={foto.ink.tertiary}
          aria-hidden
        />
        <Box
          component="input"
          ref={inputRef}
          type="search"
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery((e.target as HTMLInputElement).value);
            setFocusIndex(0);
          }}
          placeholder="Buscar piedras, joyas, insumos…"
          aria-label="Buscar inventario vendible"
          aria-controls="spotlight-results"
          aria-autocomplete="list"
          sx={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: fontFamilies.system,
            fontSize: 19,
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: foto.ink.primary,
            minWidth: 0,
            "::placeholder": { color: foto.ink.mute },
            // Hide the native search "clear" decoration in WebKit
            "&::-webkit-search-cancel-button": { display: "none" },
          }}
        />
        {scope ? (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
              background: foto.accent.soft,
              border: `1px solid ${foto.accent.primary}`,
              color: foto.accent.deep,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}
          >
            {scope}
            <X
              size={12}
              strokeWidth={1.8}
              aria-hidden
              style={{ opacity: 0.7 }}
            />
          </Box>
        ) : null}
        <KbdKey>Esc</KbdKey>
      </Box>

      {/* Body grid */}
      <Box
        sx={{
          display: "grid",
          // Stack the filter sidebar above the results on narrow viewports
          // so the result list fills the modal width. The sidebar is
          // disabled in Slice 1 anyway, so it collapses to a thin header.
          gridTemplateColumns: { xs: "1fr", sm: "210px 1fr" },
          minHeight: { xs: 420, sm: 540 },
          maxHeight: { xs: "70vh", sm: 540 },
          borderBottom: `1px solid ${foto.surfaces.edge}`,
        }}
      >
        {/* Left: filters (disabled this slice) */}
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            padding: "16px 18px",
            borderRight: `1px solid ${foto.surfaces.edge}`,
            background: foto.surfaces.panel,
            overflow: "auto",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: "5px",
              padding: "3px 8px",
              borderRadius: "999px",
              background: foto.surfaces.inset2,
              border: `1px solid ${foto.surfaces.edge}`,
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: foto.ink.tertiary,
            }}
          >
            Próximamente
          </Box>

          {FILTER_GROUPS.map((g) => (
            <Box key={g.title} sx={{ opacity: 0.5 }}>
              <Box
                sx={{
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: foto.ink.tertiary,
                  marginBottom: "8px",
                }}
              >
                {g.title}
              </Box>
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {g.items.map((it) => (
                  <Box
                    key={it}
                    sx={{
                      padding: "5px 8px",
                      borderRadius: "6px",
                      fontSize: 12,
                      color: foto.ink.secondary,
                      cursor: "not-allowed",
                    }}
                  >
                    {it}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Right: results */}
        <Box
          id="spotlight-results"
          ref={listRef}
          role="listbox"
          aria-label="Resultados de búsqueda"
          aria-multiselectable={multiSelect ? "true" : undefined}
          sx={{ overflow: "auto", padding: "8px 0" }}
        >
          {/* Live region — anuncia conteo a SR */}
          <Box
            role="status"
            aria-live="polite"
            sx={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            {liveMessage}
          </Box>

          {/* Assertive region — per-toggle feedback ("Añadido/Quitado X") for
              keyboard SR users, separate from the polite count above. */}
          <Box
            role="status"
            aria-live="assertive"
            sx={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            {toggleAnnounce}
          </Box>

          {/* Multi-select: chosen items pinned at the top — they survive a new
              search and can be removed here even when off-screen in results. */}
          {multiSelect && selected.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                padding: "4px 18px 12px",
                marginBottom: "4px",
                borderBottom: `1px solid ${foto.surfaces.edge}`,
              }}
            >
              {selected.map((p) => (
                <Box
                  key={`chip-${p.itemId}`}
                  component="button"
                  type="button"
                  onClick={() => {
                    setSelected((prev) => removeSelection(prev, p.itemId));
                    setToggleAnnounce(`Quitado ${p.nombre || p.itemId}`);
                  }}
                  aria-label={`Quitar ${p.nombre || p.itemId} (${p.itemId}) de la selección`}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px 4px 10px",
                    borderRadius: "999px",
                    border: `1px solid ${foto.accent.primary}`,
                    background: foto.accent.soft,
                    color: foto.accent.deep,
                    fontSize: 11.5,
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    maxWidth: 220,
                    transition: "background 120ms ease",
                    "&:hover": { background: alpha(foto.accent.primary, 0.14) },
                    "&:focus-visible": {
                      outline: "none",
                      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.nombre}
                  </Box>
                  <X size={12} strokeWidth={2} aria-hidden />
                </Box>
              ))}
            </Box>
          ) : null}

          {loading ? (
            <EmptyState
              icon={
                <Search size={36} strokeWidth={1.2} color={foto.ink.mute} />
              }
              title="Buscando…"
              hint=" "
              fotoInk={foto.ink}
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={
                <Search size={36} strokeWidth={1.2} color={foto.ink.mute} />
              }
              title={
                query
                  ? "Sin resultados"
                  : "Buscá por ID, nombre, color, lote o precio."
              }
              hint={
                query
                  ? "Probá con menos palabras o relajá los filtros."
                  : "Sólo aparecen ítems con estado DISPONIBLE o ASESOR."
              }
              fotoInk={foto.ink}
            />
          ) : (
            results.map((row, i) => {
              const isFocus = i === focusIndex;
              const chosen = multiSelect && isSelected(selected, row.itemId);
              return (
                <Box
                  key={row.itemId}
                  data-row-index={i}
                  role="option"
                  aria-selected={multiSelect ? chosen : isFocus}
                  onMouseEnter={() => setFocusIndex(i)}
                  onClick={() => pickRow(row)}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "44px 1fr auto",
                      sm: "52px auto 1fr auto auto",
                    },
                    gap: "14px",
                    alignItems: "center",
                    padding: "10px 18px",
                    cursor: "pointer",
                    borderLeft: `2px solid ${
                      chosen ? foto.accent.primary : "transparent"
                    }`,
                    background: chosen
                      ? alpha(foto.accent.primary, 0.12)
                      : isFocus
                        ? foto.accent.soft
                        : "transparent",
                    transition: "background 120ms ease",
                  }}
                >
                  {/* Thumb */}
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: "7px",
                      background: foto.surfaces.inset,
                      border: `1px solid ${foto.surfaces.edge}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: foto.ink.mute,
                      fontFamily: fontFamilies.mono,
                      fontSize: 11,
                      letterSpacing: "0.05em",
                      aspectRatio: "1 / 1",
                      overflow: "hidden",
                      position: "relative",
                    }}
                    aria-hidden
                  >
                    {row.thumbnailUrl ? (
                      <Box
                        component="img"
                        src={row.thumbnailUrl}
                        alt=""
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      row.itemId
                    )}
                    {chosen ? (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: alpha(emeraldCore.dark, 0.6),
                          color: "#fff",
                        }}
                      >
                        <Check size={22} strokeWidth={2.4} aria-hidden />
                      </Box>
                    ) : null}
                  </Box>

                  {/* Ct chip */}
                  <Box
                    sx={{
                      display: { xs: "none", sm: "inline-flex" },
                      alignItems: "center",
                      padding: "3px 8px",
                      borderRadius: "999px",
                      background: foto.surfaces.inset,
                      border: `1px solid ${foto.surfaces.edge}`,
                      fontFamily: fontFamilies.mono,
                      fontSize: 10.5,
                      color: foto.ink.secondary,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.itemId}
                  </Box>

                  {/* Name + meta */}
                  <Box sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        letterSpacing: "-0.012em",
                        color: foto.ink.primary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.nombre}
                    </Box>
                    {row.loteId ? (
                      <Box
                        sx={{
                          fontSize: 11,
                          color: foto.ink.tertiary,
                          fontFamily: fontFamilies.mono,
                          marginTop: "2px",
                          letterSpacing: "0.01em",
                        }}
                      >
                        Lote {row.loteId}
                      </Box>
                    ) : null}
                  </Box>

                  {/* Estado badge */}
                  <Box
                    sx={{
                      display: { xs: "none", sm: "inline-flex" },
                      alignItems: "center",
                      gap: "5px",
                      padding: "3px 9px",
                      borderRadius: "999px",
                      background:
                        row.estado === "ASESOR"
                          ? alpha(foto.status.consigned, 0.1)
                          : foto.accent.soft,
                      border: `1px solid ${
                        row.estado === "ASESOR"
                          ? foto.status.consigned
                          : foto.accent.primary
                      }`,
                      color:
                        row.estado === "ASESOR"
                          ? foto.status.consigned
                          : foto.accent.deep,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background:
                          row.estado === "ASESOR"
                            ? foto.status.consigned
                            : emeraldCore.dark,
                      }}
                    />
                    {row.estado === "ASESOR" ? "Asesor" : "Disponible"}
                  </Box>

                  {/* Price */}
                  <Box
                    sx={{
                      fontFamily: fontFamilies.mono,
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 13,
                      fontWeight: 500,
                      color: foto.ink.primary,
                      textAlign: "right",
                      letterSpacing: "-0.005em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatCop(row.precioCop)}
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "12px 22px",
          background: foto.surfaces.panel,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
            fontSize: 11,
            color: foto.ink.tertiary,
            flexWrap: "wrap",
          }}
        >
          <FooterHint keys={["↑", "↓"]} label="navegar" />
          {multiSelect ? (
            <>
              <FooterHint keys={["↵"]} label="marcar" />
              <FooterHint keys={["⌘", "↵"]} label="listo" />
            </>
          ) : (
            <FooterHint keys={["↵"]} label="seleccionar" />
          )}
          <FooterHint keys={["⌘", "N"]} label="crear nuevo" />
          <FooterHint keys={["Esc"]} label="cerrar" />
        </Box>
        {multiSelect ? (
          <Box
            component="button"
            type="button"
            onClick={confirmSelection}
            disabled={selected.length === 0}
            aria-label={`Listo — agregar ${selected.length} ítem${
              selected.length === 1 ? "" : "s"
            } a la venta`}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "9px",
              border: "none",
              background:
                selected.length > 0
                  ? `linear-gradient(180deg, ${foto.accent.primary} 0%, ${foto.accent.deep} 100%)`
                  : foto.surfaces.inset,
              color: selected.length > 0 ? foto.ink.inverse : foto.ink.mute,
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              cursor: selected.length > 0 ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "background 120ms ease, transform 120ms ease",
              "&:hover:not(:disabled)": { transform: "translateY(-1px)" },
            }}
          >
            <Check size={14} strokeWidth={2} aria-hidden />
            {selected.length > 0
              ? `Listo · ${selected.length} ítem${
                  selected.length === 1 ? "" : "s"
                }`
              : "Elegí ítems"}
          </Box>
        ) : (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: 10.5,
              color: foto.ink.tertiary,
              fontStyle: "italic",
            }}
          >
            <Clock size={11} strokeWidth={1.5} aria-hidden />
            Sólo ítems DISPONIBLE o ASESOR (BR-6)
          </Box>
        )}
      </Box>
    </Dialog>
  );
}

interface FooterHintProps {
  keys: string[];
  label: string;
}

function FooterHint({ keys, label }: FooterHintProps) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
      }}
    >
      <Box sx={{ display: "inline-flex", gap: "2px" }}>
        {keys.map((k, i) => (
          <KbdKey key={`${k}-${i}`} size="sm">
            {k}
          </KbdKey>
        ))}
      </Box>
      <span>{label}</span>
    </Box>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  hint: React.ReactNode;
  fotoInk: { secondary: string; tertiary: string };
}

function EmptyState({ icon, title, hint, fotoInk }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "60px 24px",
        textAlign: "center",
        minHeight: 360,
      }}
    >
      {icon}
      <Box
        sx={{
          fontSize: 14,
          fontWeight: 500,
          color: fotoInk.secondary,
          letterSpacing: "-0.005em",
        }}
      >
        {title}
      </Box>
      <Box
        sx={{
          fontSize: 12,
          color: fotoInk.tertiary,
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        {hint}
      </Box>
    </Box>
  );
}

export default ProductoSpotlight;
