import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Box, Dialog, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronRight, Plus } from "lucide-react";
import { getFoto, fontFamilies } from "../../../design-system";
import { useConvexQuery, convexApi } from "../../../lib/convex-safe";
import { FOTO_TOPBAR_HEIGHT } from "./components/FotoTopbar";
import { WORKBENCH_ENABLED } from "./workbench/featureFlag";

/**
 * Fotosíntesis Directory — Slice 1 (read-only).
 *
 * Three tabs (proveedores / embajadores / clientes), a debounced search,
 * a list pane and a sticky right drawer with a contact's ficha. On
 * narrow viewports the drawer is rendered as a fullscreen Dialog.
 * Spec: docs/specs/2026-05-21-fotosintesis-v2-handoff.md §4.7
 */

type TabKey = "proveedores" | "embajadores" | "clientes";

interface ContactRow {
  id: string;
  name: string;
  initials: string;
  contactPrimary: string;
  contactSecondary?: string;
  tipoLabel: string;
  metaLine: string;
  meta: { label: string; value: string }[];
}

export default function FotosintesisDirectorioPage() {
  const foto = getFoto("light");
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>("proveedores");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Synchronous init — avoids a "desktop-then-mobile" flash on first paint
  // for narrow viewports (CLAUDE.md anti-blinking guidance).
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1199px)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1199px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Reset selection when switching tabs.
  useEffect(() => {
    setSelectedId(null);
  }, [tab]);

  const providers = useConvexQuery(convexApi.providers.list, {});
  const clients = useConvexQuery(convexApi.clients.list, {});

  const embajadores = useMemo(
    () => (clients ?? []).filter((c) => c.tipo === "embajador"),
    [clients],
  );
  const finales = useMemo(
    () => (clients ?? []).filter((c) => c.tipo === "final"),
    [clients],
  );

  const proveedoresRows: ContactRow[] = useMemo(
    () =>
      (providers ?? []).map((p) => ({
        id: p._id,
        name: p.nombreORazonSocial,
        initials: initialsOf(p.nombreORazonSocial),
        contactPrimary: p.nit
          ? `NIT ${p.nit}`
          : p.cedula
            ? `CC ${p.cedula}`
            : "—",
        contactSecondary: p.telefono ?? p.email ?? undefined,
        tipoLabel: tipoProveedorLabel(p.tipo),
        metaLine: p.email ?? p.direccion ?? "Sin contacto",
        meta: [
          { label: "Tipo", value: tipoProveedorLabel(p.tipo) },
          { label: "NIT / CC", value: p.nit ?? p.cedula ?? "—" },
          { label: "Teléfono", value: p.telefono ?? "—" },
          { label: "Email", value: p.email ?? "—" },
          { label: "Dirección", value: p.direccion ?? "—" },
          { label: "Notas", value: p.notas ?? "—" },
        ],
      })),
    [providers],
  );

  const embajadoresRows: ContactRow[] = useMemo(
    () =>
      embajadores.map((c) => ({
        id: c._id,
        name: c.nombre,
        initials: initialsOf(c.nombre),
        contactPrimary: c.email ?? c.telefono ?? "—",
        contactSecondary: c.telefono && c.email ? c.telefono : undefined,
        tipoLabel: "Embajador",
        metaLine: c.email ?? "Sin email registrado",
        meta: [
          { label: "Tipo", value: "Embajador" },
          { label: "Asesor ID", value: c.asesorId ?? "—" },
          { label: "Teléfono", value: c.telefono ?? "—" },
          { label: "Email", value: c.email ?? "—" },
          { label: "NIT / CC", value: c.nit ?? c.cedula ?? "—" },
          { label: "Dirección", value: c.direccion ?? "—" },
        ],
      })),
    [embajadores],
  );

  const clientesRows: ContactRow[] = useMemo(
    () =>
      finales.map((c) => ({
        id: c._id,
        name: c.nombre,
        initials: initialsOf(c.nombre),
        contactPrimary: c.email ?? c.telefono ?? "—",
        contactSecondary: c.telefono && c.email ? c.telefono : undefined,
        tipoLabel: "Cliente final",
        metaLine: c.email ?? "Sin email registrado",
        meta: [
          { label: "Tipo", value: "Cliente final" },
          { label: "Teléfono", value: c.telefono ?? "—" },
          { label: "Email", value: c.email ?? "—" },
          { label: "NIT / CC", value: c.nit ?? c.cedula ?? "—" },
          { label: "Dirección", value: c.direccion ?? "—" },
        ],
      })),
    [finales],
  );

  const activeRows: ContactRow[] = useMemo(() => {
    if (tab === "proveedores") return proveedoresRows;
    if (tab === "embajadores") return embajadoresRows;
    return clientesRows;
  }, [tab, proveedoresRows, embajadoresRows, clientesRows]);

  const filteredRows = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return activeRows;
    return activeRows.filter((r) => {
      return (
        r.name.toLowerCase().includes(q) ||
        r.contactPrimary.toLowerCase().includes(q) ||
        (r.contactSecondary ?? "").toLowerCase().includes(q) ||
        r.tipoLabel.toLowerCase().includes(q)
      );
    });
  }, [deferredSearch, activeRows]);

  const selectedRow = useMemo(
    () => filteredRows.find((r) => r.id === selectedId) ?? null,
    [filteredRows, selectedId],
  );

  const totalCompras = "—"; // No clean aggregate path in Slice 1.

  // --- Styles --------------------------------------------------------------
  const monoSx = {
    fontFamily: fontFamilies.mono,
    fontVariantNumeric: "tabular-nums" as const,
    letterSpacing: "-0.005em",
  } as const;

  return (
    <Box
      component="main"
      sx={{
        color: foto.ink.primary,
        background: foto.surfaces.canvas,
        minHeight: `calc(100vh - ${FOTO_TOPBAR_HEIGHT}px)`,
      }}
    >
      {/* HEADER BAND */}
      <Box
        component="section"
        sx={{
          padding: "32px 28px 24px",
          borderBottom: `1px solid ${foto.surfaces.rule}`,
          background: `linear-gradient(180deg, ${foto.surfaces.canvas} 0%, ${foto.surfaces.panel} 100%)`,
        }}
      >
        <Box
          sx={{
            maxWidth: 1320,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
            gap: "28px",
            alignItems: "end",
          }}
        >
          <Box>
            <Box
              sx={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: foto.ink.tertiary,
              }}
            >
              Atelier · Directorio
            </Box>
            <Box
              component="h1"
              sx={{
                marginTop: "8px",
                fontSize: "32px",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                color: foto.ink.primary,
              }}
            >
              Directorio
            </Box>
            <Box
              component="p"
              sx={{
                marginTop: "10px",
                fontSize: "13.5px",
                color: foto.ink.secondary,
                maxWidth: 560,
                lineHeight: 1.5,
              }}
            >
              Proveedores, embajadores y clientes — busca por nombre, NIT,
              teléfono o email, y consulta la ficha completa de cada contacto.
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: "20px",
              flexWrap: { xs: "wrap", md: "nowrap" },
            }}
            role="group"
            aria-label="Resumen del directorio"
          >
            <HeaderStat
              value={fmtN(providers?.length)}
              label="Proveedores"
              ariaLabel={`${providers?.length ?? 0} proveedores`}
              foto={foto}
            />
            <HeaderStat
              value={fmtN(embajadores.length)}
              label="Embajadores"
              ariaLabel={`${embajadores.length} embajadores`}
              foto={foto}
            />
            <HeaderStat
              value={fmtN(finales.length)}
              label="Clientes finales"
              ariaLabel={`${finales.length} clientes finales`}
              foto={foto}
            />
            <HeaderStat
              value={totalCompras}
              label="Compras totales"
              ariaLabel={`Compras totales: ${totalCompras}`}
              foto={foto}
              tone="mute"
            />
          </Box>
        </Box>
      </Box>

      {/* TABS */}
      <Box
        role="tablist"
        aria-label="Categorías del directorio"
        sx={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: { xs: "0 16px", md: "0 28px" },
          display: "flex",
          gap: "4px",
          borderBottom: `1px solid ${foto.surfaces.edge}`,
          // Horizontal scroll on phones so the 3rd tab is never clipped.
          overflowX: { xs: "auto", md: "visible" },
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          flexWrap: "nowrap",
        }}
      >
        <TabButton
          active={tab === "proveedores"}
          onClick={() => setTab("proveedores")}
          label="Proveedores"
          count={providers?.length}
          foto={foto}
        />
        <TabButton
          active={tab === "embajadores"}
          onClick={() => setTab("embajadores")}
          label="Embajadores"
          count={embajadores.length}
          foto={foto}
        />
        <TabButton
          active={tab === "clientes"}
          onClick={() => setTab("clientes")}
          label="Clientes finales"
          count={finales.length}
          foto={foto}
        />
        {WORKBENCH_ENABLED && (
          <Box
            component="button"
            type="button"
            onClick={() =>
              navigate(
                tab === "proveedores"
                  ? "/admin/fotosintesis/copilot/provider"
                  : "/admin/fotosintesis/copilot/client",
              )
            }
            sx={{
              marginLeft: "auto",
              alignSelf: "center",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              border: "none",
              borderRadius: "9px",
              padding: "8px 13px",
              background: foto.accent.primary,
              color: foto.ink.inverse,
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 120ms ease, transform 120ms ease",
              "&:hover": {
                background: foto.accent.deep,
                transform: "translateY(-1px)",
              },
              "&:focus-visible": {
                outline: "none",
                boxShadow: `0 0 0 3px ${foto.accent.glow}`,
              },
            }}
          >
            <Plus size={14} strokeWidth={2.2} />
            {tab === "proveedores"
              ? "Nuevo proveedor"
              : tab === "embajadores"
                ? "Nuevo embajador"
                : "Nuevo cliente"}
          </Box>
        )}
      </Box>

      {/* MAIN GRID — list + drawer */}
      <Box
        sx={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: { xs: "20px 16px 40px", md: "24px 28px 60px" },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 440px" },
          gap: { xs: "16px", lg: "24px" },
          alignItems: "start",
        }}
      >
        {/* LIST PANE */}
        <Box
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          sx={{
            background: foto.surfaces.canvas,
            border: `1px solid ${foto.surfaces.rule}`,
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <Box
            sx={{
              padding: "14px 18px",
              borderBottom: `1px solid ${foto.surfaces.edge}`,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: foto.surfaces.canvas,
            }}
          >
            <Search size={16} strokeWidth={1.8} color={foto.ink.tertiary} />
            <Box
              component="input"
              type="search"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              placeholder={searchPlaceholder(tab)}
              aria-label={searchPlaceholder(tab)}
              sx={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "14px",
                fontFamily: "inherit",
                color: foto.ink.primary,
                "&::placeholder": { color: foto.ink.mute },
              }}
            />
            {search ? (
              <IconButton
                size="small"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
                sx={{ color: foto.ink.tertiary }}
              >
                <X size={14} />
              </IconButton>
            ) : null}
          </Box>

          {/* Column headers */}
          <Box
            sx={{
              display: { xs: "none", lg: "grid" },
              gridTemplateColumns:
                "32px minmax(0, 1.4fr) minmax(0, 1fr) 110px 80px",
              gap: "12px",
              alignItems: "center",
              padding: "10px 18px",
              borderBottom: `1px solid ${foto.surfaces.edge}`,
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: foto.ink.tertiary,
              fontWeight: 500,
              background: foto.surfaces.panel,
            }}
          >
            <span />
            <span>Nombre</span>
            <span>Contacto</span>
            <span>Tipo</span>
            <span style={{ textAlign: "right" }}>Compras</span>
          </Box>

          {/* Rows */}
          {(tab === "proveedores" && providers === undefined) ||
          (tab !== "proveedores" && clients === undefined) ? (
            <Box sx={emptyMessageSx(foto)}>
              <Box component="span" aria-label="Sin datos">
                —
              </Box>
            </Box>
          ) : filteredRows.length === 0 ? (
            <Box sx={emptyMessageSx(foto)}>
              {deferredSearch.trim()
                ? `Sin resultados para “${deferredSearch.trim()}”.`
                : "Aún no hay contactos registrados en esta categoría."}
            </Box>
          ) : (
            <Box
              role="list"
              sx={{
                maxHeight: { lg: "calc(100vh - 360px)" },
                overflowY: { lg: "auto" },
              }}
            >
              {filteredRows.map((row) => {
                const isSelected = row.id === selectedId;
                return (
                  <Box
                    key={row.id}
                    component="button"
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(row.id)}
                    sx={{
                      width: "100%",
                      textAlign: "left",
                      background: isSelected
                        ? foto.accent.soft
                        : foto.surfaces.canvas,
                      boxShadow: isSelected
                        ? `inset 3px 0 0 ${foto.accent.primary}`
                        : "none",
                      border: "none",
                      borderBottom: `1px solid ${foto.surfaces.edge}`,
                      cursor: "pointer",
                      padding: "14px 18px",
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "32px minmax(0, 1fr) auto",
                        lg: "32px minmax(0, 1.4fr) minmax(0, 1fr) 110px 80px",
                      },
                      gap: "12px",
                      alignItems: "center",
                      color: foto.ink.primary,
                      fontFamily: "inherit",
                      transition: "background 120ms ease",
                      "&:hover": {
                        background: isSelected
                          ? foto.accent.soft
                          : foto.surfaces.panel,
                      },
                      "&:focus-visible": {
                        outline: "none",
                        boxShadow: isSelected
                          ? `inset 3px 0 0 ${foto.accent.primary}, 0 0 0 3px ${foto.accent.glow}`
                          : `0 0 0 3px ${foto.accent.glow}`,
                      },
                    }}
                  >
                    <Box
                      aria-hidden="true"
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: foto.surfaces.inset,
                        border: `1px solid ${foto.surfaces.edge}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: foto.ink.secondary,
                      }}
                    >
                      {row.initials}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          fontSize: "13.5px",
                          fontWeight: 600,
                          color: foto.ink.primary,
                          letterSpacing: "-0.01em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.name}
                      </Box>
                      <Box
                        sx={{
                          fontSize: "11.5px",
                          color: foto.ink.tertiary,
                          marginTop: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.metaLine}
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: { xs: "none", lg: "block" },
                        minWidth: 0,
                        fontSize: "12px",
                        color: foto.ink.secondary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        ...monoSx,
                      }}
                    >
                      {row.contactPrimary}
                    </Box>
                    <Box sx={{ display: { xs: "none", lg: "block" } }}>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          padding: "3px 9px",
                          borderRadius: "999px",
                          fontSize: "9.5px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          background: foto.surfaces.inset,
                          color: foto.ink.secondary,
                          border: `1px solid ${foto.surfaces.edge}`,
                        }}
                      >
                        {row.tipoLabel}
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: { xs: "flex", lg: "block" },
                        textAlign: { lg: "right" } as const,
                        alignItems: "center",
                        justifyContent: "flex-end",
                        ...monoSx,
                        fontSize: "12px",
                        color: foto.ink.tertiary,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{ display: { xs: "none", lg: "inline" } }}
                        aria-label="Sin datos"
                      >
                        —
                      </Box>
                      <Box
                        component="span"
                        sx={{ display: { xs: "inline-flex", lg: "none" } }}
                        aria-hidden="true"
                      >
                        <ChevronRight size={14} />
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* DRAWER PANE — desktop */}
        <Box
          sx={{
            display: { xs: "none", lg: "block" },
            position: "sticky",
            top: FOTO_TOPBAR_HEIGHT,
            alignSelf: "start",
          }}
        >
          {selectedRow ? (
            <ContactFicha row={selectedRow} foto={foto} />
          ) : (
            <Box
              sx={{
                background: foto.surfaces.canvas,
                border: `1px dashed ${foto.surfaces.rule}`,
                borderRadius: "14px",
                padding: "32px 24px",
                textAlign: "center",
                color: foto.ink.tertiary,
                fontSize: "12.5px",
                lineHeight: 1.55,
              }}
            >
              Selecciona un contacto de la lista para ver su ficha completa.
            </Box>
          )}
        </Box>
      </Box>

      {/* DRAWER PANE — mobile (Dialog) */}
      <Dialog
        open={Boolean(selectedRow && isMobile)}
        onClose={() => setSelectedId(null)}
        fullScreen
        aria-labelledby="ficha-title"
      >
        {selectedRow ? (
          <Box
            sx={{
              background: foto.surfaces.canvas,
              minHeight: "100vh",
              color: foto.ink.primary,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: `1px solid ${foto.surfaces.edge}`,
              }}
            >
              <Box
                sx={{
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: foto.ink.tertiary,
                  fontWeight: 500,
                }}
              >
                Ficha
              </Box>
              <IconButton
                size="small"
                onClick={() => setSelectedId(null)}
                aria-label="Cerrar ficha"
              >
                <X size={18} />
              </IconButton>
            </Box>
            <ContactFicha row={selectedRow} foto={foto} embedded />
          </Box>
        ) : null}
      </Dialog>
    </Box>
  );
}

// ============================================================================
// Internal components
// ============================================================================

type FotoT = ReturnType<typeof getFoto>;

function emptyMessageSx(foto: FotoT) {
  return {
    padding: "36px 18px",
    textAlign: "center" as const,
    color: foto.ink.tertiary,
    fontSize: "12.5px",
    lineHeight: 1.55,
  };
}

interface HeaderStatProps {
  value: string;
  label: string;
  ariaLabel: string;
  foto: FotoT;
  tone?: "mute";
}

function HeaderStat({ value, label, ariaLabel, foto, tone }: HeaderStatProps) {
  return (
    <Box
      aria-label={ariaLabel}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "3px",
        borderRight: `1px solid ${foto.surfaces.rule}`,
        paddingRight: "20px",
        "&:last-child": { borderRight: "none", paddingRight: 0 },
      }}
    >
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontSize: "26px",
          fontWeight: 300,
          color: tone === "mute" ? foto.ink.tertiary : foto.ink.primary,
          letterSpacing: "-0.035em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 0.9,
        }}
      >
        {value}
      </Box>
      <Box
        sx={{
          fontSize: "9px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 500,
          color: foto.ink.tertiary,
          marginTop: "4px",
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number | undefined;
  foto: FotoT;
}

function TabButton({ active, onClick, label, count, foto }: TabButtonProps) {
  return (
    <Box
      component="button"
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      sx={{
        appearance: "none",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        padding: "12px 14px",
        fontSize: "12.5px",
        fontWeight: 600,
        color: active ? foto.ink.primary : foto.ink.tertiary,
        borderBottom: `2px solid ${active ? foto.accent.primary : "transparent"}`,
        marginBottom: "-1px",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        transition: "color 120ms ease, border-color 120ms ease",
        "&:hover": {
          color: foto.ink.primary,
        },
        "&:focus-visible": {
          outline: "none",
          boxShadow: `0 0 0 3px ${foto.accent.glow}`,
          borderRadius: "4px",
        },
      }}
    >
      {label}
      <Box
        component="span"
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: "tabular-nums",
          fontSize: "10.5px",
          fontWeight: 600,
          padding: "2px 7px",
          borderRadius: "999px",
          background: active ? foto.accent.soft : foto.surfaces.inset,
          color: active ? foto.accent.deep : foto.ink.secondary,
        }}
      >
        {count ?? "—"}
      </Box>
    </Box>
  );
}

interface ContactFichaProps {
  row: ContactRow;
  foto: FotoT;
  embedded?: boolean;
}

function ContactFicha({ row, foto, embedded }: ContactFichaProps) {
  return (
    <Box
      sx={{
        background: foto.surfaces.canvas,
        border: embedded ? "none" : `1px solid ${foto.surfaces.rule}`,
        borderRadius: embedded ? 0 : "14px",
        padding: { xs: "20px 18px", md: "24px 22px" },
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Head */}
      <Box sx={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <Box
          aria-hidden="true"
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: foto.surfaces.inset,
            border: `1px solid ${foto.surfaces.edge}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: 600,
            color: foto.ink.secondary,
          }}
        >
          {row.initials}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            id="ficha-title"
            component="h2"
            sx={{
              fontSize: "18px",
              fontWeight: 600,
              color: foto.ink.primary,
              letterSpacing: "-0.018em",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {row.name}
          </Box>
          <Box
            sx={{
              marginTop: "5px",
              fontSize: "11.5px",
              color: foto.ink.tertiary,
            }}
          >
            {row.metaLine}
          </Box>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              marginTop: "8px",
              padding: "3px 9px",
              borderRadius: "999px",
              fontSize: "9.5px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: foto.accent.soft,
              color: foto.accent.deep,
            }}
          >
            {row.tipoLabel}
          </Box>
        </Box>
      </Box>

      {/* Meta grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "12px 16px",
          padding: "16px",
          background: foto.surfaces.panel,
          borderRadius: "11px",
          border: `1px solid ${foto.surfaces.edge}`,
        }}
      >
        {row.meta.map((m) => (
          <FichaMeta
            key={m.label}
            label={m.label}
            value={m.value}
            foto={foto}
          />
        ))}
      </Box>

      {/* 3-col metrics — Slice 1 placeholders */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "12px",
        }}
      >
        <MetricCell label="Compras" value="—" foto={foto} />
        <MetricCell label="Lotes" value="—" foto={foto} />
        <MetricCell label="Última actividad" value="—" foto={foto} />
      </Box>

      <Box
        sx={{
          fontSize: "11px",
          color: foto.ink.tertiary,
          lineHeight: 1.5,
          padding: "10px 12px",
          background: foto.surfaces.inset,
          borderRadius: "9px",
          border: `1px dashed ${foto.surfaces.edge}`,
        }}
      >
        Las métricas agregadas y el historial completo llegan en Slice 4.
      </Box>
    </Box>
  );
}

function FichaMeta({
  label,
  value,
  foto,
}: {
  label: string;
  value: ReactNode;
  foto: FotoT;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={{
          fontSize: "9px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 500,
          color: foto.ink.tertiary,
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          marginTop: "3px",
          fontSize: "12.5px",
          color: foto.ink.primary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

function MetricCell({
  label,
  value,
  foto,
}: {
  label: string;
  value: string;
  foto: FotoT;
}) {
  return (
    <Box
      sx={{
        background: foto.surfaces.canvas,
        border: `1px solid ${foto.surfaces.edge}`,
        borderRadius: "10px",
        padding: "12px 14px",
      }}
    >
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: "tabular-nums",
          fontSize: "20px",
          fontWeight: 300,
          letterSpacing: "-0.03em",
          color: foto.ink.primary,
          lineHeight: 1,
        }}
      >
        {value}
      </Box>
      <Box
        sx={{
          marginTop: "6px",
          fontSize: "9px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: foto.ink.tertiary,
          fontWeight: 500,
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return "—";
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

function tipoProveedorLabel(tipo: string): string {
  switch (tipo) {
    case "gemas":
      return "Gemas";
    case "joyas":
      return "Joyas";
    case "insumos":
      return "Insumos";
    case "otros":
      return "Otros";
    default:
      return tipo;
  }
}

function searchPlaceholder(tab: TabKey): string {
  if (tab === "proveedores") return "Buscar proveedor por nombre o NIT…";
  if (tab === "embajadores") return "Buscar embajador por nombre o email…";
  return "Buscar cliente por nombre o email…";
}

function fmtN(v: number | undefined | string): string {
  if (typeof v === "string") return v;
  return typeof v === "number" ? v.toString() : "—";
}
