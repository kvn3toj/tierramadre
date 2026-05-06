/**
 * AdminToolbar — sticky two-row header above the inventory list.
 *
 * Top row:
 *   1. Search input — icon left, result count + clear right; ⌘K / Ctrl+K
 *      focuses; "/" focuses unless already typing in another input
 *   2. Status filter chip-group (signature pip echoed beside each label)
 *
 * Sync controls (last-pull timestamp, Resync button, pending/errored counts)
 * live in the LedgerHero. The toolbar focuses purely on search + scope.
 *
 * Second row (scope filters):
 *   - Colección select (native)
 *   - "Con fotos" toggle
 *   - "Sin precio" toggle
 *
 * Per Interface Design mandate:
 *   Intent — find / scope / verify sync state without leaving the list.
 *   Palette — panel surface; inset surface for inputs; brass-whisper borders.
 *   Depth — borders-only; 1px hairlines between rows + below toolbar.
 *   Surfaces — atelier.surfaces.panel (one notch lighter than canvas).
 *   Typography — atelier.type.meta for inputs; atelier.type.label for chips.
 *   Spacing — atelier.spacing.toolbarHeight; atelier.spacing.rowPaddingX.
 */

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Box, ButtonBase, InputBase, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { getAtelier } from "../../../design-system";
import { type EstadoValue } from "./StatusPip";

type FilterKey = "all" | "available" | "consigned" | "sold";

/** Advanced filter dimensions, mirrored from the customer Treasure Browser. */
export interface AdvancedScopeFilters {
  type: "all" | "loose" | "jewelry";
  color: string | null;
  shape: string | null; // talla
  quality: string | null; // calidad
  category: string | null; // categoria
  cantidad: "all" | "1" | "2+";
  /** [min, max] inclusive in COP, or null = use entire range */
  priceRange: [number, number] | null;
  /** [min, max] inclusive in carats (numeric peso only), or null = use entire range */
  caratRange: [number, number] | null;
}

/** Choices computed from the current mirror, used to populate the selects/inputs. */
export interface AdvancedFilterOptions {
  colors: string[];
  shapes: string[];
  qualities: string[];
  categories: string[];
  /** Min/max COP across all products with a price > 0; both 0 if none. */
  priceMinMax: [number, number];
  /** Min/max carats across all products with numeric peso > 0; both 0 if none. */
  caratMinMax: [number, number];
}

interface AdminToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: FilterKey;
  onFilterChange: (filter: FilterKey) => void;
  /** Selected collection name (null = no collection filter) */
  collection: string | null;
  onCollectionChange: (collection: string | null) => void;
  /** Available collections, sorted alphabetically */
  collections: string[];
  /** Show only products that have at least one Drive thumbnail */
  onlyWithImages: boolean;
  onOnlyWithImagesChange: (value: boolean) => void;
  /** Show only products missing a precioCOP */
  onlyMissingPrice: boolean;
  onOnlyMissingPriceChange: (value: boolean) => void;
  /** Advanced scope filters (color, quality, shape, range, …) */
  advanced: AdvancedScopeFilters;
  onAdvancedChange: <K extends keyof AdvancedScopeFilters>(
    key: K,
    value: AdvancedScopeFilters[K],
  ) => void;
  onAdvancedReset: () => void;
  advancedOptions: AdvancedFilterOptions;
  total: number;
  filteredCount: number;
}

const FILTERS: Array<{
  key: FilterKey;
  label: string;
  estado: EstadoValue | null;
}> = [
  { key: "all", label: "Todo", estado: null },
  { key: "available", label: "Disponibles", estado: "DISPONIBLE" },
  { key: "consigned", label: "Con asesor", estado: "ASESOR" },
  { key: "sold", label: "Vendidas", estado: "VENDIDA" },
];

export function AdminToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  collection,
  onCollectionChange,
  collections,
  onlyWithImages,
  onOnlyWithImagesChange,
  onlyMissingPrice,
  onOnlyMissingPriceChange,
  advanced,
  onAdvancedChange,
  onAdvancedReset,
  advancedOptions,
  total,
  filteredCount,
}: AdminToolbarProps) {
  const theme = useTheme();
  const atelier = getAtelier(theme.palette.mode);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const advancedActiveCount =
    (advanced.type !== "all" ? 1 : 0) +
    (advanced.color ? 1 : 0) +
    (advanced.shape ? 1 : 0) +
    (advanced.quality ? 1 : 0) +
    (advanced.category ? 1 : 0) +
    (advanced.cantidad !== "all" ? 1 : 0) +
    (advanced.priceRange ? 1 : 0) +
    (advanced.caratRange ? 1 : 0);

  // Keyboard shortcuts: ⌘K / Ctrl+K and "/" to focus the search field.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingElsewhere =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (e.key === "/" && !isTypingElsewhere) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isFilteredView =
    filter !== "all" ||
    !!collection ||
    onlyWithImages ||
    onlyMissingPrice ||
    !!search.trim();
  const showCount = isFilteredView && filteredCount !== total;

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 2,
        backgroundColor: atelier.surfaces.panel,
        borderBottom: `1px solid ${atelier.surfaces.edgeStrong}`,
      }}
    >
      {/* TOP ROW — search + status filter (sync moved to hero) */}
      <Box
        sx={{
          px: `${atelier.spacing.rowPaddingX}px`,
          py: "14px",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 1fr) auto" },
          gap: { xs: 1.5, md: 2 },
          alignItems: "center",
        }}
      >
        {/* Search */}
        <Box
          sx={{
            backgroundColor: atelier.surfaces.inset,
            border: `1px solid ${atelier.surfaces.edge}`,
            borderRadius: "4px",
            px: "10px",
            py: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "border-color 120ms linear",
            "&:focus-within": {
              borderColor: atelier.focus.ring,
              outline: `2px solid ${atelier.focus.ringSoft}`,
              outlineOffset: "0",
            },
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 24 24"
            aria-hidden
            sx={{
              width: "14px",
              height: "14px",
              color: atelier.ink.tertiary,
              flexShrink: 0,
            }}
          >
            <circle
              cx="11"
              cy="11"
              r="6"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M16 16L20 20"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </Box>
          <InputBase
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onSearchChange(e.target.value)
            }
            placeholder="Buscar por número, nombre, color, calidad, ubicación, colección…"
            fullWidth
            inputRef={searchInputRef}
            inputProps={{ "aria-label": "Buscar producto en inventario" }}
            sx={{
              ...atelier.type.meta,
              color: atelier.ink.primary,
              "& input::placeholder": {
                color: atelier.ink.muted,
                opacity: 1,
              },
              "& input:focus": { outline: "none" },
            }}
          />
          {showCount && (
            <Typography
              component="span"
              sx={{
                ...atelier.type.data,
                fontSize: "11px",
                color: atelier.ink.tertiary,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              aria-live="polite"
            >
              {filteredCount.toLocaleString("es-CO")} /{" "}
              {total.toLocaleString("es-CO")}
            </Typography>
          )}
          {search && (
            <ButtonBase
              onClick={() => {
                onSearchChange("");
                searchInputRef.current?.focus();
              }}
              disableRipple
              aria-label="Limpiar búsqueda"
              sx={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                color: atelier.ink.tertiary,
                flexShrink: 0,
                transition: atelier.motion.rowHover,
                "&:hover": {
                  backgroundColor: atelier.surfaces.rowHover,
                  color: atelier.ink.primary,
                },
                "&:focus-visible": {
                  outline: `2px solid ${atelier.focus.ring}`,
                  outlineOffset: "2px",
                },
              }}
            >
              <Box
                component="svg"
                viewBox="0 0 24 24"
                sx={{ width: "12px", height: "12px" }}
                aria-hidden
              >
                <path
                  d="M6 6L18 18M6 18L18 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </Box>
            </ButtonBase>
          )}
          {!search && (
            <Box
              component="kbd"
              aria-hidden
              sx={{
                ...atelier.type.label,
                fontSize: "10px",
                color: atelier.ink.muted,
                border: `1px solid ${atelier.surfaces.edge}`,
                borderRadius: "3px",
                px: "5px",
                py: "1px",
                lineHeight: 1.4,
                whiteSpace: "nowrap",
                flexShrink: 0,
                backgroundColor: atelier.surfaces.panel,
              }}
            >
              ⌘K
            </Box>
          )}
        </Box>

        {/* Status filter chip-group */}
        <Box
          role="radiogroup"
          aria-label="Filtrar por estado"
          sx={{
            display: "inline-flex",
            gap: 0,
            border: `1px solid ${atelier.surfaces.edgeStrong}`,
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          {FILTERS.map((f, i) => {
            const isSelected = filter === f.key;
            return (
              <ButtonBase
                key={f.key}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onFilterChange(f.key)}
                disableRipple
                sx={{
                  ...atelier.type.label,
                  color: isSelected
                    ? atelier.ink.primary
                    : atelier.ink.tertiary,
                  backgroundColor: isSelected
                    ? atelier.surfaces.rowActive
                    : "transparent",
                  px: "12px",
                  py: "8px",
                  borderLeft:
                    i === 0
                      ? "none"
                      : `1px solid ${atelier.surfaces.edgeStrong}`,
                  transition: atelier.motion.rowHover,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  "&:hover": {
                    backgroundColor: atelier.surfaces.rowHover,
                  },
                  "&:focus-visible": {
                    outline: `2px solid ${atelier.focus.ring}`,
                    outlineOffset: "-2px",
                  },
                }}
              >
                {f.estado !== null && (
                  <FilterPip estado={f.estado} muted={!isSelected} />
                )}
                {f.label}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      {/* SECOND ROW — scope filters */}
      <Box
        sx={{
          px: `${atelier.spacing.rowPaddingX}px`,
          py: "8px",
          borderTop: `1px solid ${atelier.surfaces.edge}`,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Typography
          component="span"
          sx={{
            ...atelier.type.label,
            color: atelier.ink.tertiary,
            mr: "4px",
          }}
        >
          Alcance
        </Typography>

        <CollectionSelect
          collection={collection}
          collections={collections}
          onChange={onCollectionChange}
          atelier={atelier}
        />

        <ToggleChip
          label="Con fotos"
          active={onlyWithImages}
          onChange={onOnlyWithImagesChange}
          atelier={atelier}
        />

        <ToggleChip
          label="Sin precio"
          active={onlyMissingPrice}
          onChange={onOnlyMissingPriceChange}
          atelier={atelier}
        />

        {/* Disclosure → advanced filters panel */}
        <ButtonBase
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          aria-controls="atelier-advanced-filters"
          disableRipple
          sx={{
            ...atelier.type.label,
            color:
              advancedActiveCount > 0
                ? atelier.ink.primary
                : atelier.ink.tertiary,
            backgroundColor:
              advancedActiveCount > 0
                ? atelier.surfaces.rowActive
                : atelier.surfaces.inset,
            border: `1px solid ${advancedActiveCount > 0 ? atelier.brass.soft : atelier.surfaces.edge}`,
            borderRadius: "4px",
            px: "10px",
            py: "5px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            transition: atelier.motion.rowHover,
            "&:hover": {
              backgroundColor: atelier.surfaces.rowHover,
              borderColor: atelier.brass.soft,
            },
            "&:focus-visible": {
              outline: `2px solid ${atelier.focus.ring}`,
              outlineOffset: "2px",
            },
          }}
        >
          Más filtros
          {advancedActiveCount > 0 && (
            <Box
              component="span"
              aria-label={`${advancedActiveCount} filtro${
                advancedActiveCount === 1 ? "" : "s"
              } activo${advancedActiveCount === 1 ? "" : "s"}`}
              sx={{
                ...atelier.type.data,
                fontSize: "10px",
                lineHeight: 1.4,
                color: atelier.ink.inverse,
                backgroundColor: atelier.focus.ring,
                borderRadius: "2px",
                px: "5px",
                minWidth: "16px",
                textAlign: "center",
              }}
            >
              {advancedActiveCount}
            </Box>
          )}
          <Box
            component="svg"
            viewBox="0 0 24 24"
            aria-hidden
            sx={{
              width: "10px",
              height: "10px",
              color: atelier.ink.tertiary,
              transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Box>
        </ButtonBase>

        {/* Active filters → "Limpiar" button */}
        {(collection ||
          onlyWithImages ||
          onlyMissingPrice ||
          filter !== "all" ||
          search ||
          advancedActiveCount > 0) && (
          <ButtonBase
            onClick={() => {
              onCollectionChange(null);
              onOnlyWithImagesChange(false);
              onOnlyMissingPriceChange(false);
              onFilterChange("all");
              onSearchChange("");
              onAdvancedReset();
            }}
            disableRipple
            sx={{
              ...atelier.type.label,
              color: atelier.ink.tertiary,
              ml: "auto",
              px: "10px",
              py: "6px",
              borderRadius: "4px",
              transition: atelier.motion.rowHover,
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              textDecorationColor: atelier.brass.soft,
              "&:hover": {
                color: atelier.ink.primary,
                textDecorationColor: atelier.ink.primary,
              },
              "&:focus-visible": {
                outline: `2px solid ${atelier.focus.ring}`,
                outlineOffset: "2px",
              },
            }}
          >
            Limpiar filtros
          </ButtonBase>
        )}
      </Box>

      {/* THIRD ROW (collapsible) — advanced scope filters */}
      {showAdvanced && (
        <AdvancedFiltersPanel
          advanced={advanced}
          onChange={onAdvancedChange}
          options={advancedOptions}
          atelier={atelier}
        />
      )}
    </Box>
  );
}

export type { FilterKey };

/**
 * FilterPip — single 6×6 square in the row's status color.
 * A compact echo of the StatusPip signature.
 */
function FilterPip({ estado, muted }: { estado: EstadoValue; muted: boolean }) {
  return (
    <Box
      role="presentation"
      aria-hidden
      sx={(theme) => {
        const atelier = getAtelier(theme.palette.mode);
        const color =
          estado === "DISPONIBLE"
            ? atelier.status.available.pip
            : estado === "VENDIDA"
              ? atelier.status.sold.pip
              : atelier.status.consigned.pip;
        return {
          width: "6px",
          height: "6px",
          borderRadius: "1px",
          backgroundColor: color,
          opacity: muted ? 0.4 : 1,
          transition: atelier.motion.pip,
        };
      }}
    />
  );
}

/**
 * CollectionSelect — atelier-styled native select.
 *
 * Native <select> for accessibility + keyboard nav out of the box.
 * Border + parchment inset surface; emerald focus ring.
 */
function CollectionSelect({
  collection,
  collections,
  onChange,
  atelier,
}: {
  collection: string | null;
  collections: string[];
  onChange: (value: string | null) => void;
  atelier: ReturnType<typeof getAtelier>;
}) {
  return (
    <Box
      component="label"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <Typography
        component="span"
        sx={{
          ...atelier.type.label,
          color: collection ? atelier.ink.primary : atelier.ink.tertiary,
        }}
      >
        Colección
      </Typography>
      <Box
        sx={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <Box
          component="select"
          value={collection ?? ""}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onChange(e.target.value ? e.target.value : null)
          }
          aria-label="Filtrar por colección"
          sx={{
            ...atelier.type.meta,
            color: atelier.ink.primary,
            backgroundColor: collection
              ? atelier.surfaces.rowActive
              : atelier.surfaces.inset,
            border: `1px solid ${collection ? atelier.brass.soft : atelier.surfaces.edge}`,
            borderRadius: "4px",
            pl: "10px",
            pr: "26px",
            py: "5px",
            cursor: "pointer",
            appearance: "none",
            transition: "border-color 120ms linear",
            "&:hover": {
              borderColor: atelier.brass.soft,
            },
            "&:focus": {
              outline: `2px solid ${atelier.focus.ring}`,
              outlineOffset: "0",
              borderColor: atelier.focus.ring,
            },
          }}
        >
          <option value="">Todas</option>
          {collections.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Box>
        <Box
          component="svg"
          viewBox="0 0 24 24"
          aria-hidden
          sx={{
            position: "absolute",
            right: "8px",
            width: "10px",
            height: "10px",
            color: atelier.ink.tertiary,
            pointerEvents: "none",
          }}
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Box>
      </Box>
    </Box>
  );
}

/**
 * ToggleChip — small toggle in atelier ledger style. Used for "Con fotos",
 * "Sin precio", and any boolean scope refinement.
 */
function ToggleChip({
  label,
  active,
  onChange,
  atelier,
}: {
  label: string;
  active: boolean;
  onChange: (value: boolean) => void;
  atelier: ReturnType<typeof getAtelier>;
}) {
  return (
    <ButtonBase
      role="switch"
      aria-checked={active}
      onClick={() => onChange(!active)}
      disableRipple
      sx={{
        ...atelier.type.label,
        color: active ? atelier.ink.primary : atelier.ink.tertiary,
        backgroundColor: active
          ? atelier.surfaces.rowActive
          : atelier.surfaces.inset,
        border: `1px solid ${active ? atelier.brass.soft : atelier.surfaces.edge}`,
        borderRadius: "4px",
        px: "10px",
        py: "5px",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        transition: atelier.motion.rowHover,
        "&:hover": {
          backgroundColor: atelier.surfaces.rowHover,
          borderColor: atelier.brass.soft,
        },
        "&:focus-visible": {
          outline: `2px solid ${atelier.focus.ring}`,
          outlineOffset: "2px",
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: "10px",
          height: "10px",
          borderRadius: "2px",
          border: `1px solid ${active ? atelier.focus.ring : atelier.surfaces.edgeStrong}`,
          backgroundColor: active ? atelier.focus.ring : "transparent",
          flexShrink: 0,
        }}
      />
      {label}
    </ButtonBase>
  );
}

/**
 * AdvancedFiltersPanel — collapsible third row mirroring the dimensions
 * available on the customer Treasure Browser:
 * tipo (suelta/joyería), color, talla, calidad, categoría, cantidad,
 * rango de precio, rango de peso.
 *
 * Native <select>s and number inputs only (no sliders) — atelier favors
 * tabular density over chrome.
 */
function AdvancedFiltersPanel({
  advanced,
  onChange,
  options,
  atelier,
}: {
  advanced: AdvancedScopeFilters;
  onChange: <K extends keyof AdvancedScopeFilters>(
    key: K,
    value: AdvancedScopeFilters[K],
  ) => void;
  options: AdvancedFilterOptions;
  atelier: ReturnType<typeof getAtelier>;
}) {
  return (
    <Box
      id="atelier-advanced-filters"
      role="group"
      aria-label="Filtros avanzados"
      sx={{
        px: `${atelier.spacing.rowPaddingX}px`,
        py: "12px",
        borderTop: `1px solid ${atelier.surfaces.edge}`,
        backgroundColor: atelier.surfaces.canvas,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px 16px",
        alignItems: "end",
      }}
    >
      {/* Tipo (loose / jewelry) */}
      <FilterField label="Tipo" atelier={atelier}>
        <Box
          role="radiogroup"
          aria-label="Filtrar por tipo"
          sx={{
            display: "inline-flex",
            border: `1px solid ${atelier.surfaces.edge}`,
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          {(
            [
              { key: "all", label: "Todo" },
              { key: "loose", label: "Sueltas" },
              { key: "jewelry", label: "Joyería" },
            ] as const
          ).map((opt, i) => {
            const isSelected = advanced.type === opt.key;
            return (
              <ButtonBase
                key={opt.key}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange("type", opt.key)}
                disableRipple
                sx={{
                  ...atelier.type.label,
                  color: isSelected
                    ? atelier.ink.primary
                    : atelier.ink.tertiary,
                  backgroundColor: isSelected
                    ? atelier.surfaces.rowActive
                    : "transparent",
                  px: "10px",
                  py: "6px",
                  borderLeft:
                    i === 0 ? "none" : `1px solid ${atelier.surfaces.edge}`,
                  transition: atelier.motion.rowHover,
                  "&:hover": { backgroundColor: atelier.surfaces.rowHover },
                  "&:focus-visible": {
                    outline: `2px solid ${atelier.focus.ring}`,
                    outlineOffset: "-2px",
                  },
                }}
              >
                {opt.label}
              </ButtonBase>
            );
          })}
        </Box>
      </FilterField>

      {/* Color */}
      <FilterField label="Color" atelier={atelier}>
        <NativeSelect
          value={advanced.color ?? ""}
          onChange={(v) => onChange("color", v || null)}
          ariaLabel="Filtrar por color"
          atelier={atelier}
        >
          <option value="">Todos</option>
          {options.colors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </FilterField>

      {/* Calidad */}
      <FilterField label="Calidad" atelier={atelier}>
        <NativeSelect
          value={advanced.quality ?? ""}
          onChange={(v) => onChange("quality", v || null)}
          ariaLabel="Filtrar por calidad"
          atelier={atelier}
        >
          <option value="">Todas</option>
          {options.qualities.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </NativeSelect>
      </FilterField>

      {/* Talla */}
      <FilterField label="Talla" atelier={atelier}>
        <NativeSelect
          value={advanced.shape ?? ""}
          onChange={(v) => onChange("shape", v || null)}
          ariaLabel="Filtrar por talla"
          atelier={atelier}
        >
          <option value="">Todas</option>
          {options.shapes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
      </FilterField>

      {/* Categoría */}
      <FilterField label="Categoría" atelier={atelier}>
        <NativeSelect
          value={advanced.category ?? ""}
          onChange={(v) => onChange("category", v || null)}
          ariaLabel="Filtrar por categoría"
          atelier={atelier}
        >
          <option value="">Todas</option>
          {options.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
      </FilterField>

      {/* Cantidad */}
      <FilterField label="Cantidad" atelier={atelier}>
        <Box
          role="radiogroup"
          aria-label="Filtrar por cantidad"
          sx={{
            display: "inline-flex",
            border: `1px solid ${atelier.surfaces.edge}`,
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          {(
            [
              { key: "all", label: "Todas" },
              { key: "1", label: "1" },
              { key: "2+", label: "2+" },
            ] as const
          ).map((opt, i) => {
            const isSelected = advanced.cantidad === opt.key;
            return (
              <ButtonBase
                key={opt.key}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange("cantidad", opt.key)}
                disableRipple
                sx={{
                  ...atelier.type.label,
                  color: isSelected
                    ? atelier.ink.primary
                    : atelier.ink.tertiary,
                  backgroundColor: isSelected
                    ? atelier.surfaces.rowActive
                    : "transparent",
                  px: "10px",
                  py: "6px",
                  borderLeft:
                    i === 0 ? "none" : `1px solid ${atelier.surfaces.edge}`,
                  transition: atelier.motion.rowHover,
                  "&:hover": { backgroundColor: atelier.surfaces.rowHover },
                  "&:focus-visible": {
                    outline: `2px solid ${atelier.focus.ring}`,
                    outlineOffset: "-2px",
                  },
                }}
              >
                {opt.label}
              </ButtonBase>
            );
          })}
        </Box>
      </FilterField>

      {/* Rango de precio (COP) */}
      <FilterField
        label="Precio · COP"
        atelier={atelier}
        hint={
          options.priceMinMax[1] > 0
            ? `${options.priceMinMax[0].toLocaleString("es-CO")} – ${options.priceMinMax[1].toLocaleString("es-CO")}`
            : undefined
        }
      >
        <RangeInputs
          range={advanced.priceRange}
          bounds={options.priceMinMax}
          onChange={(r) => onChange("priceRange", r)}
          ariaLabelMin="Precio mínimo"
          ariaLabelMax="Precio máximo"
          atelier={atelier}
        />
      </FilterField>

      {/* Rango de peso (carats) */}
      <FilterField
        label="Peso · ct"
        atelier={atelier}
        hint={
          options.caratMinMax[1] > 0
            ? `${options.caratMinMax[0].toFixed(2)} – ${options.caratMinMax[1].toFixed(2)}`
            : undefined
        }
      >
        <RangeInputs
          range={advanced.caratRange}
          bounds={options.caratMinMax}
          step="0.01"
          onChange={(r) => onChange("caratRange", r)}
          ariaLabelMin="Peso mínimo (ct)"
          ariaLabelMax="Peso máximo (ct)"
          atelier={atelier}
        />
      </FilterField>
    </Box>
  );
}

/** Cell — label on top, control below. Used inside AdvancedFiltersPanel. */
function FilterField({
  label,
  hint,
  atelier,
  children,
}: {
  label: string;
  hint?: string;
  atelier: ReturnType<typeof getAtelier>;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}
    >
      <Typography
        component="span"
        sx={{
          ...atelier.type.label,
          color: atelier.ink.tertiary,
          display: "inline-flex",
          alignItems: "baseline",
          gap: "6px",
        }}
      >
        {label}
        {hint && (
          <Typography
            component="span"
            sx={{
              ...atelier.type.meta,
              fontSize: "10px",
              color: atelier.ink.muted,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {hint}
          </Typography>
        )}
      </Typography>
      {children}
    </Box>
  );
}

/** Atelier-styled native select with consistent appearance. */
function NativeSelect({
  value,
  onChange,
  ariaLabel,
  children,
  atelier,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
  atelier: ReturnType<typeof getAtelier>;
}) {
  const isActive = value !== "";
  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: "100%",
      }}
    >
      <Box
        component="select"
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          onChange(e.target.value)
        }
        aria-label={ariaLabel}
        sx={{
          ...atelier.type.meta,
          width: "100%",
          color: atelier.ink.primary,
          backgroundColor: isActive
            ? atelier.surfaces.rowActive
            : atelier.surfaces.inset,
          border: `1px solid ${isActive ? atelier.brass.soft : atelier.surfaces.edge}`,
          borderRadius: "4px",
          pl: "10px",
          pr: "26px",
          py: "5px",
          cursor: "pointer",
          appearance: "none",
          transition: "border-color 120ms linear",
          "&:hover": { borderColor: atelier.brass.soft },
          "&:focus": {
            outline: `2px solid ${atelier.focus.ring}`,
            outlineOffset: "0",
            borderColor: atelier.focus.ring,
          },
        }}
      >
        {children}
      </Box>
      <Box
        component="svg"
        viewBox="0 0 24 24"
        aria-hidden
        sx={{
          position: "absolute",
          right: "8px",
          width: "10px",
          height: "10px",
          color: atelier.ink.tertiary,
          pointerEvents: "none",
        }}
      >
        <path
          d="M6 9L12 15L18 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Box>
    </Box>
  );
}

/** Min/max number inputs that produce a [min, max] tuple or null. */
function RangeInputs({
  range,
  bounds,
  step = "1",
  onChange,
  ariaLabelMin,
  ariaLabelMax,
  atelier,
}: {
  range: [number, number] | null;
  bounds: [number, number];
  step?: string;
  onChange: (range: [number, number] | null) => void;
  ariaLabelMin: string;
  ariaLabelMax: string;
  atelier: ReturnType<typeof getAtelier>;
}) {
  const [minVal, maxVal] = range ?? bounds;
  const isActive = range !== null;

  const handleMin = (raw: string) => {
    const next = raw === "" ? bounds[0] : Number(raw);
    if (!Number.isFinite(next)) return;
    if (next === bounds[0] && maxVal === bounds[1]) {
      onChange(null);
    } else {
      onChange([next, maxVal]);
    }
  };
  const handleMax = (raw: string) => {
    const next = raw === "" ? bounds[1] : Number(raw);
    if (!Number.isFinite(next)) return;
    if (minVal === bounds[0] && next === bounds[1]) {
      onChange(null);
    } else {
      onChange([minVal, next]);
    }
  };

  const fieldSx = {
    ...atelier.type.data,
    fontSize: "12px",
    color: atelier.ink.primary,
    backgroundColor: isActive
      ? atelier.surfaces.rowActive
      : atelier.surfaces.inset,
    border: `1px solid ${isActive ? atelier.brass.soft : atelier.surfaces.edge}`,
    borderRadius: "4px",
    px: "8px",
    py: "5px",
    width: "100%",
    minWidth: 0,
    transition: "border-color 120ms linear",
    "&:focus": {
      outline: `2px solid ${atelier.focus.ring}`,
      outlineOffset: "0",
      borderColor: atelier.focus.ring,
    },
  } as const;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: "6px",
        alignItems: "center",
      }}
    >
      <Box
        component="input"
        type="number"
        inputMode="decimal"
        step={step}
        value={isActive ? minVal : ""}
        placeholder={bounds[0].toString()}
        aria-label={ariaLabelMin}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          handleMin(e.target.value)
        }
        sx={fieldSx}
      />
      <Typography
        component="span"
        aria-hidden
        sx={{ ...atelier.type.label, color: atelier.ink.muted }}
      >
        —
      </Typography>
      <Box
        component="input"
        type="number"
        inputMode="decimal"
        step={step}
        value={isActive ? maxVal : ""}
        placeholder={bounds[1].toString()}
        aria-label={ariaLabelMax}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          handleMax(e.target.value)
        }
        sx={fieldSx}
      />
    </Box>
  );
}
