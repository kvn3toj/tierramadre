/**
 * EntityPicker — drop-menu picker over an already-loaded list of entities,
 * with an inline "Crear nuevo …" row at the bottom of the dropdown.
 *
 * Built on MUI Autocomplete so we get combobox semantics + keyboard nav for
 * free, then fully restyled to match the Fotosíntesis editorial atelier
 * (no MUI chrome leaks). Intended to replace single-purpose "click button →
 * open create-only drawer" anti-patterns across the flow (proveedor, cliente
 * final, and later procedencia / color / nombre with `freeSolo`).
 *
 * Closed state: a card-like input showing the selected entity's name + a
 * one-line meta row (e.g. "NIT 900.123.456-7 · gemas").
 * Open state: a search field with a typeahead-filtered list; the last entry
 * is always "+ Crear «<typed>» …", which fires `onCreateRequest(typed)` —
 * typically opening the existing creation drawer pre-filled with the typed
 * value.
 */

import {
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Autocomplete, Box, TextField } from "@mui/material";
import { ChevronDown, Plus, Search } from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";

// ─── Types ────────────────────────────────────────────────────────────────

/** Sentinel that represents the inline "Crear nuevo" row inside the dropdown. */
interface CreateSentinel {
  __create: true;
  typed: string;
}

function isCreateSentinel<T>(
  x: T | CreateSentinel | null,
): x is CreateSentinel {
  return (
    !!x &&
    typeof x === "object" &&
    "__create" in (x as object) &&
    (x as CreateSentinel).__create === true
  );
}

export interface EntityPickerProps<T> {
  /** Uppercase label rendered above the picker via <FieldLabel>. Pass null to suppress. */
  label?: ReactNode;
  /** Placeholder shown inside the search input. */
  placeholder?: string;
  /** Options already loaded by the parent (Convex `list` query, etc.). */
  options: readonly T[];
  /** True while the parent's query is hydrating — disables interaction + shows hint. */
  loading?: boolean;
  /** Currently selected entity (or null if none). */
  value: T | null;
  /** Fired with the picked option, or null when the user clears the selection. */
  onChange: (next: T | null) => void;
  /** Stable identity extractor — used as the React key and for equality. */
  getOptionId: (option: T) => string;
  /** Primary label for an option (one-line, used inside dropdown rows and the input). */
  getOptionLabel: (option: T) => string;
  /** Optional second-line meta inside dropdown rows ("NIT … · gemas"). */
  getOptionMeta?: (option: T) => string | null;
  /** Optional avatar character (initial / emoji). */
  getOptionAvatar?: (option: T) => string | null;
  /**
   * Called when the user picks "+ Crear «typed» …". Receives the trimmed
   * input value so the caller can pre-fill its creation drawer.
   * Omit to disable the inline-create row.
   */
  onCreateRequest?: (typed: string) => void;
  /** Override the inline-create row copy. Default: `Crear «{typed}»`. */
  createLabel?: (typed: string) => string;
  /** Empty-state copy when the list has zero matches AND inline-create is disabled. */
  noOptionsText?: string;
  /** Error message rendered below the picker (e.g. "Falta proveedor"). */
  error?: string | null;
  /** Optional id wired to the input + label for assistive tech. */
  id?: string;
  /** Width override — defaults to 100%. */
  fullWidth?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

export function EntityPicker<T>({
  label,
  placeholder = "Buscar…",
  options,
  loading = false,
  value,
  onChange,
  getOptionId,
  getOptionLabel,
  getOptionMeta,
  getOptionAvatar,
  onCreateRequest,
  createLabel,
  noOptionsText = "Sin resultados",
  error,
  id,
  fullWidth = true,
}: EntityPickerProps<T>) {
  const foto = getFoto("light");

  // Track the textual input separately from the selection — required for the
  // synthetic create row, which is built from inputValue rather than an option.
  const [inputValue, setInputValue] = useState("");

  // Inject a synthetic "+ Crear …" row at the end of every filtered result list
  // when inline-create is enabled AND there is non-empty typed text.
  const filterOptions = useCallback(
    (raw: readonly (T | CreateSentinel)[], state: { inputValue: string }) => {
      const needle = state.inputValue.trim().toLowerCase();
      const filtered = needle
        ? raw.filter((opt) => {
            if (isCreateSentinel(opt)) return false;
            const label = getOptionLabel(opt as T).toLowerCase();
            const meta = getOptionMeta?.(opt as T)?.toLowerCase() ?? "";
            return label.includes(needle) || meta.includes(needle);
          })
        : raw.filter((opt) => !isCreateSentinel(opt));

      if (onCreateRequest && state.inputValue.trim().length > 0) {
        filtered.push({
          __create: true,
          typed: state.inputValue.trim(),
        } satisfies CreateSentinel);
      }
      return filtered;
    },
    [getOptionLabel, getOptionMeta, onCreateRequest],
  );

  const handleChange = useCallback(
    (_e: SyntheticEvent, next: T | CreateSentinel | null) => {
      if (isCreateSentinel(next)) {
        onCreateRequest?.(next.typed);
        // Clear typed text so reopening doesn't immediately re-suggest creation
        // for the same string (parent should set value via its own flow).
        setInputValue("");
        return;
      }
      onChange(next);
    },
    [onChange, onCreateRequest],
  );

  // Stable getOptionLabel that also handles the synthetic create row safely
  // (Autocomplete calls this against `value` even for non-string values).
  const safeGetOptionLabel = useCallback(
    (opt: T | CreateSentinel | string): string => {
      if (typeof opt === "string") return opt;
      if (isCreateSentinel(opt)) return opt.typed;
      return getOptionLabel(opt);
    },
    [getOptionLabel],
  );

  const isOptionEqualToValue = useCallback(
    (opt: T | CreateSentinel, val: T | CreateSentinel) => {
      if (isCreateSentinel(opt) || isCreateSentinel(val)) return false;
      return getOptionId(opt as T) === getOptionId(val as T);
    },
    [getOptionId],
  );

  // Memoize the option style recipes so the dropdown re-renders cheap.
  const optionRowSx = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 14px !important",
      cursor: "pointer",
      borderRadius: 0,
      transition: "background 100ms ease",
      '&[aria-selected="true"]': {
        background: foto.accent.soft,
      },
      "&.Mui-focused, &:hover": {
        background: foto.surfaces.inset,
      },
    }),
    [foto.accent.soft, foto.surfaces.inset],
  );

  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
      {label ? (
        <Box
          component="label"
          htmlFor={id}
          sx={{
            display: "block",
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: foto.ink.tertiary,
            marginBottom: "6px",
          }}
        >
          {label}
        </Box>
      ) : null}

      <Autocomplete<T | CreateSentinel, false, false, false>
        id={id}
        options={options as (T | CreateSentinel)[]}
        value={value as T | CreateSentinel | null}
        inputValue={inputValue}
        onInputChange={(_e, next, reason) => {
          // Don't echo the selected option's label back into the search box —
          // we want a clean field every time the dropdown reopens so the
          // operator types fresh.
          if (reason === "reset") {
            setInputValue("");
            return;
          }
          setInputValue(next);
        }}
        onChange={handleChange}
        getOptionLabel={safeGetOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
        filterOptions={filterOptions}
        loading={loading}
        loadingText="Cargando…"
        noOptionsText={
          onCreateRequest ? "Escribí para buscar o crear" : noOptionsText
        }
        clearOnBlur
        selectOnFocus
        handleHomeEndKeys
        openOnFocus
        // Render the input as a card-like surface that matches the rest of
        // the Fotosíntesis form fields. We override every MUI default that
        // would leak through.
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={value ? "" : placeholder}
            error={!!error}
            slotProps={{
              input: {
                ...params.InputProps,
                startAdornment: (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      marginRight: "4px",
                      color: foto.ink.tertiary,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    {value && getOptionAvatar ? (
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: foto.accent.primary,
                          color: foto.ink.inverse,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: fontFamilies.serif,
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {getOptionAvatar(value)}
                      </Box>
                    ) : (
                      <Search size={14} strokeWidth={2} />
                    )}
                  </Box>
                ),
                endAdornment: (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      color: foto.ink.tertiary,
                      flexShrink: 0,
                      marginLeft: "4px",
                    }}
                    aria-hidden
                  >
                    <ChevronDown size={16} strokeWidth={2} />
                  </Box>
                ),
              },
            }}
            sx={{
              width: "100%",
              "& .MuiOutlinedInput-root": {
                background: foto.surfaces.inset,
                borderRadius: "9px",
                padding: "8px 12px",
                fontFamily: fontFamilies.system,
                fontSize: "13.5px",
                color: foto.ink.primary,
                transition: "border-color 120ms ease, box-shadow 120ms ease",
                "& fieldset": {
                  borderColor: error ? foto.status.sold : foto.surfaces.rule,
                  borderWidth: 1,
                },
                "&:hover fieldset": {
                  borderColor: error
                    ? foto.status.sold
                    : foto.surfaces.edgeStrong,
                },
                "&.Mui-focused fieldset": {
                  borderColor: error ? foto.status.sold : foto.accent.primary,
                  borderWidth: 1,
                  boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                },
              },
              "& .MuiOutlinedInput-input": {
                padding: "5px 4px !important",
                fontFamily: fontFamilies.system,
                fontSize: "13.5px",
                color: foto.ink.primary,
                "&::placeholder": {
                  color: foto.ink.mute,
                  opacity: 1,
                },
              },
            }}
          />
        )}
        renderOption={(props, option) => {
          // MUI passes us a `key` inside props; pull it out to keep React happy.
          const { key, ...liProps } = props as typeof props & { key?: string };

          if (isCreateSentinel(option)) {
            return (
              <Box
                component="li"
                key={`__create::${option.typed}`}
                {...liProps}
                sx={{
                  ...optionRowSx,
                  borderTop: `1px solid ${foto.surfaces.rule}`,
                  background: foto.surfaces.canvas,
                  color: foto.accent.deep,
                  fontWeight: 600,
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: foto.accent.soft,
                    color: foto.accent.deep,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  <Plus size={14} strokeWidth={2.5} />
                </Box>
                <Box sx={{ minWidth: 0, fontSize: "12.5px" }}>
                  {createLabel
                    ? createLabel(option.typed)
                    : `Crear «${option.typed}»`}
                </Box>
              </Box>
            );
          }

          const opt = option as T;
          const meta = getOptionMeta?.(opt) ?? null;
          const avatar = getOptionAvatar?.(opt) ?? null;
          return (
            <Box
              component="li"
              key={getOptionId(opt)}
              {...liProps}
              sx={optionRowSx}
            >
              {avatar ? (
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: foto.surfaces.canvas,
                    border: `1px solid ${foto.surfaces.rule}`,
                    color: foto.ink.secondary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: fontFamilies.serif,
                    fontSize: 12,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  {avatar}
                </Box>
              ) : null}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box
                  sx={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: foto.ink.primary,
                    letterSpacing: "-0.005em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getOptionLabel(opt)}
                </Box>
                {meta ? (
                  <Box
                    sx={{
                      fontSize: 11,
                      color: foto.ink.tertiary,
                      marginTop: "2px",
                      fontFamily: fontFamilies.mono,
                      fontVariantNumeric: "tabular-nums",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {meta}
                  </Box>
                ) : null}
              </Box>
            </Box>
          );
        }}
        slotProps={{
          paper: {
            sx: {
              marginTop: "6px",
              borderRadius: "10px",
              border: `1px solid ${foto.surfaces.rule}`,
              boxShadow: "0 14px 40px rgba(11,16,14,0.12)",
              overflow: "hidden",
            },
          },
          listbox: {
            sx: {
              padding: 0,
              maxHeight: 320,
              "& .MuiAutocomplete-option": {
                padding: 0,
              },
            },
          },
        }}
      />

      {/* Selected meta below the input — keeps the closed state legible
          without fighting MUI's input chrome. */}
      {value && getOptionMeta?.(value) ? (
        <Box
          sx={{
            marginTop: "6px",
            fontSize: 11,
            color: foto.ink.tertiary,
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
            paddingLeft: "2px",
          }}
        >
          {getOptionMeta(value)}
        </Box>
      ) : null}

      {error ? (
        <Box
          role="alert"
          sx={{
            marginTop: "6px",
            fontSize: 11.5,
            color: foto.status.sold,
            lineHeight: 1.4,
          }}
        >
          {error}
        </Box>
      ) : null}
    </Box>
  );
}

export default EntityPicker;
