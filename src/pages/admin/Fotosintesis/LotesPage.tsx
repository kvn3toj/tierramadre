import { useDeferredValue, useMemo, useState } from "react";
import { Box, IconButton } from "@mui/material";
import { Search, X, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { getFoto, fontFamilies } from "../../../design-system";
import { useConvexQuery, convexApi } from "../../../lib/convex-safe";
import { FOTO_TOPBAR_HEIGHT } from "./components/FotoTopbar";

/**
 * Fotosíntesis · Lotes — the full lot ledger.
 *
 * Home only surfaces the five most recent active lots ("Lotes en curso"),
 * so this page is the "ver todos" destination: every lot across every estado
 * (abierto / cerrado / publicado / cancelado), with estado tabs, a debounced
 * search and rows that link to each lot's existing detail route.
 *
 * Read-only index — lots keep their own capture / cierre / sub-lote pages, so
 * a row is a plain Link, not a drawer (cf. DirectorioPage which owns a ficha).
 * Spec: docs/specs/2026-05-21-fotosintesis-v2-handoff.md §4.1
 */

type EstadoKey = "abierto" | "cerrado" | "publicado" | "cancelado";
type TabKey = "todos" | EstadoKey;

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const formatCOP = (n: number): string => COP_FORMATTER.format(n);

function formaPagoLabel(formaPago: string): string {
  if (formaPago === "contado") return "Contado";
  if (formaPago === "credito") return "Crédito";
  if (formaPago === "esmereogenesis") return "Esmereogénesis";
  if (formaPago === "bajo_pedido") return "Bajo pedido";
  if (formaPago === "consignacion") return "Consignación";
  return formaPago;
}

interface LoteRow {
  id: string;
  loteId: string;
  estado: EstadoKey;
  fechaRecepcion: string;
  unidadesDeclaradas: number;
  formaPago: string;
  costoTotalCOP: number;
  pesoTotalQuilates?: number;
  providerName: string;
  renombreLote?: string;
  mina?: string;
  operadorNombre?: string;
}

export default function FotosintesisLotesPage() {
  const foto = getFoto("light");

  const [tab, setTab] = useState<TabKey>("todos");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const lots = useConvexQuery(convexApi.lots.list, {});
  const providers = useConvexQuery(convexApi.providers.list, {});

  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of providers ?? []) map.set(p._id, p.nombreORazonSocial);
    return map;
  }, [providers]);

  const rows: LoteRow[] = useMemo(
    () =>
      (lots ?? []).map((l) => ({
        id: l._id,
        loteId: l.loteId,
        estado: l.estado,
        fechaRecepcion: l.fechaRecepcion,
        unidadesDeclaradas: l.unidadesDeclaradas,
        formaPago: l.formaPago,
        costoTotalCOP: l.costoTotalCOP,
        pesoTotalQuilates: l.pesoTotalQuilates,
        providerName: providerNameById.get(l.providerId) ?? "Proveedor —",
        renombreLote: l.renombreLote,
        mina: l.mina,
        operadorNombre: l.operadorNombre,
      })),
    [lots, providerNameById],
  );

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      todos: rows.length,
      abierto: 0,
      cerrado: 0,
      publicado: 0,
      cancelado: 0,
    };
    for (const r of rows) c[r.estado] += 1;
    return c;
  }, [rows]);

  const byTab = useMemo(
    () => (tab === "todos" ? rows : rows.filter((r) => r.estado === tab)),
    [rows, tab],
  );

  const filteredRows = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((r) =>
      [
        r.loteId,
        r.providerName,
        r.renombreLote,
        r.mina,
        r.operadorNombre,
        formaPagoLabel(r.formaPago),
      ]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q)),
    );
  }, [deferredSearch, byTab]);

  // --- Styles --------------------------------------------------------------
  const monoSx = {
    fontFamily: fontFamilies.mono,
    fontVariantNumeric: "tabular-nums" as const,
    letterSpacing: "-0.005em",
  } as const;

  const fmtN = (v: number | undefined): string =>
    typeof v === "number" ? v.toString() : "—";

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
              Atelier · Lotes
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
              Lotes
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
              Todo el historial de compras — abiertos, cerrados, publicados y
              cancelados. Busca por ID, proveedor, mina u operador y abre
              cualquier lote para continuarlo o gestionarlo.
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
            aria-label="Resumen de lotes"
          >
            <HeaderStat
              value={lots === undefined ? "—" : fmtN(counts.todos)}
              label="Total"
              ariaLabel={`${counts.todos} lotes en total`}
              foto={foto}
            />
            <HeaderStat
              value={lots === undefined ? "—" : fmtN(counts.abierto)}
              label="Abiertos"
              ariaLabel={`${counts.abierto} lotes abiertos`}
              foto={foto}
            />
            <HeaderStat
              value={lots === undefined ? "—" : fmtN(counts.cerrado)}
              label="Cerrados"
              ariaLabel={`${counts.cerrado} lotes cerrados`}
              foto={foto}
            />
            <HeaderStat
              value={lots === undefined ? "—" : fmtN(counts.publicado)}
              label="Publicados"
              ariaLabel={`${counts.publicado} lotes publicados`}
              foto={foto}
              tone="mute"
            />
          </Box>
        </Box>
      </Box>

      {/* TABS */}
      <Box
        role="tablist"
        aria-label="Filtrar lotes por estado"
        sx={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: { xs: "0 16px", md: "0 28px" },
          display: "flex",
          gap: "4px",
          borderBottom: `1px solid ${foto.surfaces.edge}`,
          overflowX: { xs: "auto", md: "visible" },
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          flexWrap: "nowrap",
        }}
      >
        <TabButton
          active={tab === "todos"}
          onClick={() => setTab("todos")}
          label="Todos"
          count={lots === undefined ? undefined : counts.todos}
          foto={foto}
        />
        <TabButton
          active={tab === "abierto"}
          onClick={() => setTab("abierto")}
          label="Abiertos"
          count={lots === undefined ? undefined : counts.abierto}
          foto={foto}
        />
        <TabButton
          active={tab === "cerrado"}
          onClick={() => setTab("cerrado")}
          label="Cerrados"
          count={lots === undefined ? undefined : counts.cerrado}
          foto={foto}
        />
        <TabButton
          active={tab === "publicado"}
          onClick={() => setTab("publicado")}
          label="Publicados"
          count={lots === undefined ? undefined : counts.publicado}
          foto={foto}
        />
        <TabButton
          active={tab === "cancelado"}
          onClick={() => setTab("cancelado")}
          label="Cancelados"
          count={lots === undefined ? undefined : counts.cancelado}
          foto={foto}
        />
      </Box>

      {/* LIST */}
      <Box
        sx={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: { xs: "20px 16px 40px", md: "24px 28px 60px" },
        }}
      >
        <Box
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
              placeholder="Buscar por ID, proveedor, mina u operador…"
              aria-label="Buscar lotes"
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

          {/* Column headers (desktop) */}
          <Box
            sx={{
              display: { xs: "none", lg: "grid" },
              gridTemplateColumns:
                "72px minmax(0, 1.5fr) 96px 70px 120px 130px",
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
            <span>Lote</span>
            <span>Estado · proveedor</span>
            <span>Recibido</span>
            <span style={{ textAlign: "right" }}>Uds.</span>
            <span>Forma de pago</span>
            <span style={{ textAlign: "right" }}>Costo</span>
          </Box>

          {/* Rows */}
          {lots === undefined ? (
            <Box sx={emptyMessageSx(foto)}>
              <Box component="span" aria-label="Cargando">
                —
              </Box>
            </Box>
          ) : filteredRows.length === 0 ? (
            <Box sx={emptyMessageSx(foto)}>
              {deferredSearch.trim() ? (
                `Sin resultados para “${deferredSearch.trim()}”.`
              ) : tab === "todos" && rows.length === 0 ? (
                <>
                  Aún no hay lotes registrados.
                  <br />
                  <Box
                    component={Link}
                    to="/admin/fotosintesis/lots/new"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "10px",
                      color: foto.accent.deep,
                      fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { color: foto.accent.primary },
                    }}
                  >
                    <Plus size={12} /> Registrar primera compra
                  </Box>
                </>
              ) : (
                "No hay lotes en este estado."
              )}
            </Box>
          ) : (
            <Box role="list">
              {filteredRows.map((row) => {
                const meta = estadoMeta(row.estado, foto);
                const target =
                  row.estado === "abierto"
                    ? `/admin/fotosintesis/lots/${row.loteId}`
                    : `/admin/fotosintesis/lots/${row.loteId}/close`;
                return (
                  <Box
                    key={row.id}
                    component={Link}
                    to={target}
                    role="listitem"
                    aria-label={`Lote ${row.loteId}, ${meta.label}, ${row.providerName}`}
                    sx={{
                      width: "100%",
                      textDecoration: "none",
                      background: foto.surfaces.canvas,
                      borderBottom: `1px solid ${foto.surfaces.edge}`,
                      padding: "14px 18px",
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "72px minmax(0, 1fr) auto",
                        lg: "72px minmax(0, 1.5fr) 96px 70px 120px 130px",
                      },
                      gap: "12px",
                      alignItems: "center",
                      color: foto.ink.primary,
                      fontFamily: "inherit",
                      transition: "background 120ms ease",
                      "& .lotId": {
                        transition: "background 120ms ease, color 120ms ease",
                      },
                      "&:hover": { background: foto.surfaces.panel },
                      "&:hover .lotId": {
                        background: foto.accent.primary,
                        color: foto.ink.inverse,
                      },
                      "&:focus-visible": {
                        outline: "none",
                        boxShadow: `inset 0 0 0 2px ${foto.accent.glow}`,
                      },
                    }}
                  >
                    {/* Lot ID chip */}
                    <Box
                      className="lotId"
                      sx={{
                        ...monoSx,
                        width: 64,
                        padding: "6px 0",
                        textAlign: "center",
                        background: foto.accent.soft,
                        color: foto.accent.deep,
                        borderRadius: "7px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                      }}
                    >
                      {row.loteId}
                    </Box>

                    {/* Estado + proveedor */}
                    <Box sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          fontSize: "13.5px",
                          fontWeight: 600,
                          color: foto.ink.primary,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        <Box
                          aria-hidden="true"
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: meta.color,
                          }}
                        />
                        <Box
                          component="span"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.renombreLote || meta.descriptor}
                        </Box>
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
                        {meta.label} · {row.providerName}
                        {row.mina ? ` · ${row.mina}` : ""}
                      </Box>
                    </Box>

                    {/* Recibido (desktop) */}
                    <Box
                      sx={{
                        display: { xs: "none", lg: "block" },
                        ...monoSx,
                        fontSize: "12px",
                        color: foto.ink.secondary,
                      }}
                    >
                      {row.fechaRecepcion}
                    </Box>

                    {/* Unidades (desktop) */}
                    <Box
                      sx={{
                        display: { xs: "none", lg: "block" },
                        ...monoSx,
                        fontSize: "12.5px",
                        color: foto.ink.secondary,
                        textAlign: "right",
                      }}
                    >
                      {row.unidadesDeclaradas}
                    </Box>

                    {/* Forma de pago (desktop) */}
                    <Box
                      sx={{
                        display: { xs: "none", lg: "block" },
                        fontSize: "12px",
                        color: foto.ink.secondary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formaPagoLabel(row.formaPago)}
                    </Box>

                    {/* Costo (desktop) */}
                    <Box
                      sx={{
                        display: { xs: "none", lg: "block" },
                        ...monoSx,
                        fontSize: "12.5px",
                        fontWeight: 600,
                        color: foto.ink.primary,
                        textAlign: "right",
                      }}
                    >
                      {formatCOP(row.costoTotalCOP)}
                    </Box>

                    {/* Chevron (mobile only) */}
                    <Box
                      aria-hidden="true"
                      sx={{
                        display: { xs: "inline-flex", lg: "none" },
                        alignItems: "center",
                        justifyContent: "center",
                        color: foto.ink.mute,
                      }}
                    >
                      <ChevronRight size={16} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ============================================================================
// Internal helpers
// ============================================================================

type FotoT = ReturnType<typeof getFoto>;

interface EstadoMeta {
  label: string;
  descriptor: string;
  color: string;
}

function estadoMeta(estado: EstadoKey, foto: FotoT): EstadoMeta {
  switch (estado) {
    case "abierto":
      return {
        label: "Abierto",
        descriptor: "Captura en curso",
        color: foto.accent.primary,
      };
    case "cerrado":
      return {
        label: "Cerrado",
        descriptor: "Listo para publicar",
        color: foto.status.consigned,
      };
    case "publicado":
      return {
        label: "Publicado",
        descriptor: "En catálogo",
        color: foto.ink.secondary,
      };
    case "cancelado":
      return {
        label: "Cancelado",
        descriptor: "Lote cancelado",
        color: foto.status.sold,
      };
  }
}

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
        whiteSpace: "nowrap",
        color: active ? foto.ink.primary : foto.ink.tertiary,
        borderBottom: `2px solid ${active ? foto.accent.primary : "transparent"}`,
        marginBottom: "-1px",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        transition: "color 120ms ease, border-color 120ms ease",
        "&:hover": { color: foto.ink.primary },
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
