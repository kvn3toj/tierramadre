import { useCallback, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Tag,
  Users,
  MessageSquare,
  Plus,
  AlertCircle,
  Check,
  ArrowRight,
  DollarSign,
  X,
  Boxes,
} from "lucide-react";
import { getFoto, fontFamilies, goldAccent } from "../../../design-system";
import {
  useConvexQuery,
  useConvexMutation,
  convexApi,
} from "../../../lib/convex-safe";
import { useGoogleAuth } from "../../../contexts/GoogleAuthContext";
import { useNotification } from "../../../contexts/NotificationContext";
import ConfirmDialog from "../../../components/shared/ConfirmDialog";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Fotosíntesis Home — Slice 1 (read-only).
 *
 * Hero greeting + 4 health stats, optional attention banner for the
 * first open lot, three quick-action cards, and 2-col grid of panels.
 * Spec: docs/specs/2026-05-21-fotosintesis-v2-handoff.md §4.1
 * Visual source of truth: docs/previews/fotosintesis-v2/home.html
 */

function formaPagoLabel(formaPago: string): string {
  if (formaPago === "contado") return "Contado";
  if (formaPago === "credito") return "Crédito";
  if (formaPago === "esmereogenesis") return "Esmereogénesis";
  if (formaPago === "bajo_pedido") return "Bajo pedido";
  if (formaPago === "consignacion") return "Consignación";
  return formaPago;
}
export default function FotosintesisHomePage() {
  const foto = getFoto("light");
  const { notify } = useNotification();
  const { user } = useGoogleAuth();
  const firstName = user?.givenName || user?.name?.split(" ")[0] || "Operador";

  // --- Data ----------------------------------------------------------------
  const lots = useConvexQuery(convexApi.lots.list, {});
  const recentSales = useConvexQuery(convexApi.sales.list, {});
  const inventory = useConvexQuery(convexApi.products.list, {});
  const recentEdits = useConvexQuery(convexApi.products.recentEdits, {
    limit: 5,
  });

  // --- Mutations -----------------------------------------------------------
  const cancelLot = useConvexMutation(convexApi.lots.cancel);

  // --- Cancel-lot flow -----------------------------------------------------
  const [cancelTarget, setCancelTarget] = useState<{
    id: Id<"lots">;
    loteId: string;
  } | null>(null);
  const [cancellingLot, setCancellingLot] = useState(false);

  const handleCancelLot = useCallback(async () => {
    if (!cancelTarget) return;
    setCancellingLot(true);
    try {
      await cancelLot({ id: cancelTarget.id });
      notify(`Lote ${cancelTarget.loteId} cancelado`, "info");
      setCancelTarget(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No pudimos cancelar el lote";
      notify(msg, "error");
    } finally {
      setCancellingLot(false);
    }
  }, [cancelTarget, cancelLot, notify]);

  // --- Derived -------------------------------------------------------------
  const now = useMemo(() => new Date(), []);
  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  }, [now]);

  const openLots = useMemo(
    () => (lots ?? []).filter((l) => l.estado === "abierto"),
    [lots],
  );
  const closedLots = useMemo(
    () => (lots ?? []).filter((l) => l.estado === "cerrado"),
    [lots],
  );
  // Published lots stay reachable (to manage catalog grouping) — listed after
  // the in-progress ones.
  const publishedLots = useMemo(
    () => (lots ?? []).filter((l) => l.estado === "publicado"),
    [lots],
  );
  const activeLots = useMemo(
    () => [...openLots, ...closedLots, ...publishedLots],
    [openLots, closedLots, publishedLots],
  );

  const itemsAvailable = useMemo(
    () => (inventory ?? []).filter((p) => p.estado === "DISPONIBLE").length,
    [inventory],
  );

  const pendingSyncSales = useMemo(
    () => (recentSales ?? []).filter((s) => s.syncStatus !== "synced").length,
    [recentSales],
  );

  const lastSale = useMemo(() => (recentSales ?? [])[0], [recentSales]);

  const firstOpenLot = openLots[0];

  // Numeric values can be `undefined` while loading — show em-dash placeholder.
  const fmtN = (v: number | undefined): string =>
    typeof v === "number" ? v.toString() : "—";

  const fmtLastSaleDate = (): string => {
    if (recentSales === undefined) return "—";
    if (!lastSale) return "—";
    try {
      const d = new Date(lastSale.fechaVenta);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return "—";
    }
  };

  const fmtWhen = useMemo(() => {
    return now
      .toLocaleString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(",", " ·");
  }, [now]);

  const fmtCop = (n: number): string => {
    if (!Number.isFinite(n)) return "—";
    return `$${Math.round(n).toLocaleString("es-CO")}`;
  };

  const fmtRelative = (iso: string): string => {
    try {
      const d = new Date(iso);
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.round(diffMs / 60000);
      if (diffMin < 1) return "ahora";
      if (diffMin < 60) return `hace ${diffMin} min`;
      const diffH = Math.round(diffMin / 60);
      if (diffH < 24) return `hace ${diffH} h`;
      const diffD = Math.round(diffH / 24);
      if (diffD < 7) return `hace ${diffD} d`;
      return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
    } catch {
      return "—";
    }
  };

  // --- Reusable styled tokens ---------------------------------------------
  const panelSx = {
    background: foto.surfaces.canvas,
    border: `1px solid ${foto.surfaces.rule}`,
    borderRadius: "14px",
    padding: "20px 22px",
  } as const;

  const panelHeadSx = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "14px",
  } as const;

  const panelHeadTitleSx = {
    fontSize: "9px",
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color: foto.ink.tertiary,
    fontWeight: 500,
    margin: 0,
  };

  const monoSx = {
    fontFamily: fontFamilies.mono,
    fontVariantNumeric: "tabular-nums" as const,
    letterSpacing: "-0.005em",
  } as const;

  const emptyStateSx = {
    padding: "24px 8px",
    textAlign: "center" as const,
    color: foto.ink.tertiary,
    fontSize: "12px",
    lineHeight: 1.5,
  };

  // --- Render --------------------------------------------------------------
  return (
    <Box
      component="main"
      sx={{
        color: foto.ink.primary,
        background: foto.surfaces.canvas,
      }}
    >
      {/* HERO */}
      <Box
        component="section"
        sx={{
          padding: { xs: "32px 16px 20px", md: "36px 28px 24px" },
          background: `linear-gradient(180deg, ${foto.surfaces.canvas} 0%, ${foto.surfaces.panel} 60%, ${foto.surfaces.canvas} 100%)`,
          borderBottom: `1px solid ${foto.surfaces.rule}`,
        }}
      >
        <Box
          sx={{
            maxWidth: 1320,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
            gap: "36px",
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
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Atelier · Captura administrativa
              <Box
                component="span"
                sx={{
                  ...monoSx,
                  color: foto.ink.secondary,
                  textTransform: "lowercase",
                  letterSpacing: 0,
                }}
              >
                · {fmtWhen}
              </Box>
            </Box>
            <Box
              component="h1"
              sx={{
                marginTop: "10px",
                fontSize: { xs: "34px", sm: "42px" },
                fontWeight: 600,
                letterSpacing: "-0.035em",
                lineHeight: 1.05,
                color: foto.ink.primary,
                overflowWrap: "anywhere",
              }}
            >
              {greeting},{" "}
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  color: foto.ink.primary,
                }}
              >
                {firstName}
              </Box>
            </Box>
            <Box
              component="p"
              sx={{
                marginTop: "14px",
                fontSize: "14.5px",
                color: foto.ink.secondary,
                maxWidth: 560,
                lineHeight: 1.55,
              }}
            >
              {openLots.length > 0 ? (
                <>
                  Tienes{" "}
                  <Box
                    component="strong"
                    sx={{ color: foto.ink.primary, fontWeight: 600 }}
                  >
                    {openLots.length}{" "}
                    {openLots.length === 1 ? "lote abierto" : "lotes abiertos"}
                  </Box>{" "}
                  esperándote y{" "}
                  <Box
                    component="strong"
                    sx={{ color: foto.ink.primary, fontWeight: 600 }}
                  >
                    {itemsAvailable} ítems disponibles
                  </Box>{" "}
                  en catálogo. Empieza por terminar la captura abierta.
                </>
              ) : lots === undefined ? (
                <>Sincronizando estado del atelier…</>
              ) : (
                <>
                  El atelier está al día. Cuando llegue una caja nueva, registra
                  la compra para arrancar un lote.
                </>
              )}
            </Box>
          </Box>

          {/* HEALTH STRIP */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                md: "repeat(4, auto)",
              },
              alignItems: "flex-end",
              gap: { xs: "20px 24px", md: "24px" },
              paddingRight: "4px",
            }}
            role="group"
            aria-label="Salud del atelier"
          >
            <HealthStat
              value={fmtN(itemsAvailable)}
              label="Disponibles"
              ariaLabel={`${itemsAvailable} ítems disponibles`}
              foto={foto}
            />
            <HealthStat
              value={fmtN(openLots.length)}
              label="Lotes abiertos"
              ariaLabel={`${openLots.length} lotes abiertos`}
              variant={openLots.length > 0 ? "warn" : undefined}
              foto={foto}
            />
            <HealthStat
              value={fmtN(pendingSyncSales)}
              label="Por sincronizar"
              ariaLabel={`${pendingSyncSales} ventas por sincronizar`}
              variant={pendingSyncSales > 0 ? "alert" : undefined}
              foto={foto}
            />
            <HealthStat
              value={fmtLastSaleDate()}
              label="Última venta"
              ariaLabel={`Última venta: ${fmtLastSaleDate()}`}
              foto={foto}
            />
          </Box>
        </Box>
      </Box>

      {/* ATTENTION BANNER */}
      {firstOpenLot ? (
        <Box
          sx={{
            maxWidth: 1320,
            margin: "24px auto 0",
            padding: { xs: "0 16px", md: "0 28px" },
          }}
        >
          <Box
            role="region"
            aria-label="Lote en curso"
            sx={{
              background: `linear-gradient(90deg, ${foto.accent.soft} 0%, ${alpha(foto.accent.primary, 0.03)} 100%)`,
              border: `1px solid ${alpha(foto.accent.primary, 0.18)}`,
              borderRadius: "14px",
              padding: "18px 22px",
              display: "grid",
              gridTemplateColumns: { xs: "auto 1fr", md: "auto 1fr auto" },
              gap: "18px",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "11px",
                background: foto.accent.primary,
                color: foto.ink.inverse,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageSquare size={22} strokeWidth={1.8} />
            </Box>
            <Box>
              <Box
                sx={{
                  fontSize: "14.5px",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: foto.ink.primary,
                }}
              >
                Continúa con {firstOpenLot.loteId}
              </Box>
              <Box
                sx={{
                  fontSize: "12px",
                  color: foto.ink.secondary,
                  marginTop: "3px",
                }}
              >
                Recibido el{" "}
                <Box component="span" sx={monoSx}>
                  {firstOpenLot.fechaRecepcion}
                </Box>
                . Termina la captura para poder cerrar el lote y publicar sus
                ítems.
              </Box>
            </Box>
            <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
              <Box
                component={Link}
                to={`/admin/fotosintesis/lots/${firstOpenLot.loteId}`}
                sx={{
                  fontSize: "12.5px",
                  fontWeight: 600,
                  padding: "10px 18px",
                  borderRadius: "9px",
                  border: "1px solid transparent",
                  letterSpacing: "-0.005em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  textDecoration: "none",
                  background: foto.accent.primary,
                  color: foto.ink.inverse,
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
                Retomar captura
                <ArrowRight size={14} strokeWidth={2} />
              </Box>
            </Box>
          </Box>
        </Box>
      ) : null}

      {/* MAIN GRID */}
      <Box
        sx={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: { xs: "24px 16px 48px", md: "24px 28px 60px" },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.6fr 1fr" },
          gap: "24px",
        }}
      >
        {/* QUICK ACTIONS */}
        <Box
          sx={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: "14px",
          }}
        >
          <QuickCard
            to="/admin/fotosintesis/lots/new"
            title="Registrar compra"
            description="Llegó una caja, sobre o paquete. El lote se autonumera, capturas sus ítems y publicas al cerrar."
            footerLeft={
              <>
                Último lote ·{" "}
                <Box
                  component="strong"
                  sx={{ ...monoSx, color: foto.ink.secondary, fontWeight: 600 }}
                >
                  {lots && lots[0] ? lots[0].loteId : "—"}
                </Box>
              </>
            }
            footerRight={
              <Box
                component="span"
                sx={{ ...monoSx, color: foto.ink.secondary, fontWeight: 600 }}
              >
                {lots ? `${lots.length} lotes` : "—"}
              </Box>
            }
            kbdPill="⌘ N"
            icon={<ShoppingBag size={20} strokeWidth={1.8} />}
            iconBackground={`linear-gradient(135deg, ${foto.accent.primary}, ${foto.accent.deep})`}
            foto={foto}
          />

          <QuickCard
            to="/admin/fotosintesis/sales/new"
            title="Cerrar una venta"
            description="Vender a embajador o cliente final. Genera Kardex + certificado de origen en un click."
            footerLeft={
              <>
                Última venta ·{" "}
                <Box
                  component="strong"
                  sx={{ ...monoSx, color: foto.ink.secondary, fontWeight: 600 }}
                >
                  {lastSale ? lastSale.saleId : "—"}
                </Box>
                {lastSale ? (
                  <>
                    {" · "}
                    {fmtRelative(lastSale.fechaVenta)}
                  </>
                ) : null}
              </>
            }
            footerRight={
              <Box
                component="span"
                sx={{ ...monoSx, color: foto.ink.secondary, fontWeight: 600 }}
              >
                {recentSales ? `${recentSales.length} ventas` : "—"}
              </Box>
            }
            kbdPill="⌘ V"
            icon={<Tag size={20} strokeWidth={1.8} />}
            iconBackground={`linear-gradient(135deg, ${goldAccent.primary}, ${goldAccent.dark})`}
            foto={foto}
          />

          <QuickCard
            to="/admin/fotosintesis/directory"
            title="Directorio"
            description="Proveedores, embajadores y clientes — con búsqueda por nombre, NIT o teléfono e historial completo."
            footerLeft={
              <>
                <Box component="strong" sx={{ fontWeight: 600 }}>
                  Contactos y proveedores
                </Box>
              </>
            }
            footerRight={
              <Box
                component="span"
                sx={{
                  ...monoSx,
                  color: foto.accent.deep,
                  fontWeight: 600,
                }}
              >
                buscar →
              </Box>
            }
            kbdPill="⌘ D"
            icon={<Users size={20} strokeWidth={1.8} />}
            iconBackground={foto.ink.primary}
            foto={foto}
          />
        </Box>

        {/* LEFT COL */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Lotes en curso */}
          <Box sx={panelSx}>
            <Box sx={panelHeadSx}>
              <Box component="h2" sx={panelHeadTitleSx}>
                Lotes en curso
              </Box>
              <Box
                sx={{ display: "flex", alignItems: "baseline", gap: "12px" }}
              >
                {activeLots.length > 0 ? (
                  <Box sx={{ fontSize: "11px", color: foto.ink.tertiary }}>
                    {activeLots.length} activos
                  </Box>
                ) : null}
                <Box
                  component={Link}
                  to="/admin/fotosintesis/lots"
                  aria-label="Ver todos los lotes"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: foto.accent.deep,
                    textDecoration: "none",
                    "&:hover": { color: foto.accent.primary },
                  }}
                >
                  Ver todos <ArrowRight size={12} strokeWidth={2} />
                </Box>
              </Box>
            </Box>

            {lots === undefined ? (
              <Box sx={emptyStateSx}>—</Box>
            ) : activeLots.length === 0 ? (
              <Box sx={emptyStateSx}>
                Aún no hay lotes en curso.
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
              </Box>
            ) : (
              activeLots.slice(0, 5).map((lot, idx) => {
                const target =
                  lot.estado === "abierto"
                    ? `/admin/fotosintesis/lots/${lot.loteId}`
                    : `/admin/fotosintesis/lots/${lot.loteId}/close`;
                const isLast = idx === Math.min(5, activeLots.length) - 1;
                const canCancel = lot.estado === "abierto";
                return (
                  <Box
                    key={lot._id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "auto 1fr auto",
                        md: "auto 1fr auto auto",
                      },
                      gap: "14px",
                      alignItems: "center",
                      padding: "13px 0",
                      borderBottom: isLast
                        ? "none"
                        : `1px solid ${foto.surfaces.edge}`,
                      "& .lotId": {
                        transition: "background 120ms ease, color 120ms ease",
                      },
                      "&:hover .lotId": {
                        background: foto.accent.primary,
                        color: foto.ink.inverse,
                      },
                    }}
                  >
                    <Box
                      component={Link}
                      to={target}
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
                        textDecoration: "none",
                      }}
                    >
                      {lot.loteId}
                    </Box>
                    <Box
                      component={Link}
                      to={target}
                      sx={{
                        textDecoration: "none",
                        color: "inherit",
                        minWidth: 0,
                        overflowWrap: "anywhere",
                      }}
                    >
                      <Box
                        sx={{
                          fontSize: "13.5px",
                          fontWeight: 600,
                          color: foto.ink.primary,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {lot.estado === "abierto"
                          ? "Captura en curso"
                          : lot.estado === "cerrado"
                            ? "Listo para publicar"
                            : "Publicado · en catálogo"}
                      </Box>
                      <Box
                        sx={{
                          fontSize: "11.5px",
                          color: foto.ink.tertiary,
                          marginTop: "2px",
                        }}
                      >
                        recibido{" "}
                        <Box
                          component="span"
                          sx={{ ...monoSx, color: foto.ink.secondary }}
                        >
                          {lot.fechaRecepcion}
                        </Box>{" "}
                        ·{" "}
                        <Box
                          component="span"
                          sx={{ ...monoSx, color: foto.ink.secondary }}
                        >
                          {lot.unidadesDeclaradas}
                        </Box>{" "}
                        unidades declaradas · {formaPagoLabel(lot.formaPago)}
                      </Box>
                    </Box>
                    <Box
                      component={Link}
                      to={target}
                      sx={{
                        display: { xs: "none", md: "inline-flex" },
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "11.5px",
                        color: foto.accent.deep,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      {lot.estado === "abierto"
                        ? "Continuar"
                        : lot.estado === "cerrado"
                          ? "Publicar"
                          : "Gestionar"}
                      <ArrowRight size={13} strokeWidth={2} />
                    </Box>
                    {canCancel ? (
                      <Box
                        component="button"
                        type="button"
                        aria-label={`Cancelar lote ${lot.loteId}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCancelTarget({
                            id: lot._id as Id<"lots">,
                            loteId: lot.loteId,
                          });
                        }}
                        sx={{
                          minWidth: 44,
                          minHeight: 44,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          border: `1px solid transparent`,
                          borderRadius: "7px",
                          color: foto.ink.tertiary,
                          cursor: "pointer",
                          transition:
                            "background 120ms ease, color 120ms ease, border-color 120ms ease",
                          "&:hover": {
                            background: alpha(foto.status.sold, 0.08),
                            borderColor: foto.status.sold,
                            color: foto.status.sold,
                          },
                          "&:focus-visible": {
                            outline: "none",
                            borderColor: foto.status.sold,
                            color: foto.status.sold,
                          },
                        }}
                      >
                        <X size={14} strokeWidth={2} />
                      </Box>
                    ) : (
                      <Box
                        component={Link}
                        to={`/admin/fotosintesis/lots/${lot.loteId}/sublotes`}
                        aria-label={`Sub-lotes del lote ${lot.loteId}`}
                        title="Sub-lotes"
                        sx={{
                          minWidth: 44,
                          minHeight: 44,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          border: `1px solid transparent`,
                          borderRadius: "7px",
                          color: foto.ink.tertiary,
                          textDecoration: "none",
                          transition:
                            "background 120ms ease, color 120ms ease, border-color 120ms ease",
                          "&:hover": {
                            background: foto.accent.soft,
                            borderColor: foto.accent.primary,
                            color: foto.accent.deep,
                          },
                        }}
                      >
                        <Boxes size={15} strokeWidth={2} />
                      </Box>
                    )}
                  </Box>
                );
              })
            )}
          </Box>

          {/* Actividad reciente */}
          <Box sx={panelSx}>
            <Box sx={panelHeadSx}>
              <Box component="h2" sx={panelHeadTitleSx}>
                Actividad reciente
              </Box>
            </Box>

            {(() => {
              const items: ActivityItem[] = [];
              for (const s of (recentSales ?? []).slice(0, 5)) {
                items.push({
                  kind: "sale",
                  ts: s._creationTime,
                  saleId: s.saleId,
                  total: s.totalCOP,
                });
              }
              for (const e of (recentEdits ?? []).slice(0, 5)) {
                items.push({
                  kind: "edit",
                  ts: new Date(e.editedAt).getTime(),
                  itemId: e.itemId,
                  editorName: e.editorName ?? e.editorEmail,
                  status: e.status,
                });
              }
              items.sort((a, b) => b.ts - a.ts);
              const top = items.slice(0, 5);

              if (recentSales === undefined && recentEdits === undefined) {
                return <Box sx={emptyStateSx}>—</Box>;
              }
              if (top.length === 0) {
                return (
                  <Box sx={emptyStateSx}>Aún no hay actividad reciente.</Box>
                );
              }
              return top.map((it, idx) => {
                const isLast = idx === top.length - 1;
                // Click target: sales open their detail ticket; item edits open
                // the inventory inspector deep-linked to that piece.
                const to =
                  it.kind === "sale" && it.saleId
                    ? `/admin/fotosintesis/sales/${it.saleId}`
                    : it.kind === "edit" && it.itemId
                      ? `/admin/products?item=${encodeURIComponent(it.itemId)}`
                      : "/admin/fotosintesis";
                return (
                  <Box
                    key={`${it.kind}-${idx}-${it.ts}`}
                    component={Link}
                    to={to}
                    aria-label={
                      it.kind === "sale"
                        ? `Ver venta ${it.saleId}`
                        : `Ver ítem ${it.itemId}`
                    }
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: "12px",
                      padding: "11px 8px",
                      marginX: "-8px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "inherit",
                      cursor: "pointer",
                      borderBottom: isLast
                        ? "none"
                        : `1px solid ${foto.surfaces.edge}`,
                      transition: "background 120ms ease",
                      "&:hover": { background: foto.surfaces.inset },
                      "& .activity-go": {
                        opacity: 0,
                        transition: "opacity 120ms ease, transform 120ms ease",
                      },
                      "&:hover .activity-go": {
                        opacity: 1,
                        transform: "translateX(2px)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          it.kind === "sale"
                            ? alpha(foto.status.consigned, 0.1)
                            : it.kind === "edit" && it.status === "failed"
                              ? alpha(foto.status.sold, 0.07)
                              : foto.accent.soft,
                        color:
                          it.kind === "sale"
                            ? foto.status.consigned
                            : it.kind === "edit" && it.status === "failed"
                              ? foto.status.sold
                              : foto.accent.deep,
                      }}
                    >
                      {it.kind === "sale" ? (
                        <DollarSign size={14} strokeWidth={1.8} />
                      ) : it.kind === "edit" && it.status === "failed" ? (
                        <AlertCircle size={14} strokeWidth={1.8} />
                      ) : (
                        <Check size={14} strokeWidth={1.8} />
                      )}
                    </Box>
                    <Box
                      sx={{
                        fontSize: "12.5px",
                        color: foto.ink.primary,
                        lineHeight: 1.45,
                        minWidth: 0,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {it.kind === "sale" ? (
                        <>
                          Venta{" "}
                          <Box
                            component="span"
                            sx={{ ...monoSx, color: foto.ink.secondary }}
                          >
                            {it.saleId}
                          </Box>{" "}
                          ·{" "}
                          <Box
                            component="span"
                            sx={{ ...monoSx, color: foto.ink.secondary }}
                          >
                            {fmtCop(it.total ?? 0)}
                          </Box>
                        </>
                      ) : (
                        <>
                          Edición en ítem{" "}
                          <Box
                            component="span"
                            sx={{ ...monoSx, color: foto.ink.secondary }}
                          >
                            #{it.itemId}
                          </Box>{" "}
                          por{" "}
                          <Box component="strong" sx={{ fontWeight: 600 }}>
                            {it.editorName}
                          </Box>
                        </>
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "6px",
                      }}
                    >
                      <Box
                        sx={{
                          ...monoSx,
                          fontSize: "10.5px",
                          color: foto.ink.tertiary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtRelative(new Date(it.ts).toISOString())}
                      </Box>
                      <Box
                        className="activity-go"
                        component="span"
                        aria-hidden
                        sx={{
                          display: "inline-flex",
                          color: foto.ink.tertiary,
                        }}
                      >
                        <ArrowRight size={13} strokeWidth={1.8} />
                      </Box>
                    </Box>
                  </Box>
                );
              });
            })()}
          </Box>
        </Box>

        {/* RIGHT COL */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Ventas por embajador — empty state for Slice 1 */}
          <Box sx={panelSx}>
            <Box sx={panelHeadSx}>
              <Box component="h2" sx={panelHeadTitleSx}>
                Ventas por embajador
              </Box>
              <Box sx={{ fontSize: "11px", color: foto.ink.tertiary }}>
                este mes
              </Box>
            </Box>
            <Box sx={emptyStateSx}>
              Aún no hay datos suficientes para agregar por embajador.
            </Box>
          </Box>

          {/* Ritmo semanal — empty state for Slice 1 */}
          <Box sx={panelSx}>
            <Box sx={panelHeadSx}>
              <Box component="h2" sx={panelHeadTitleSx}>
                Ritmo semanal
              </Box>
              <Box sx={{ fontSize: "11px", color: foto.ink.tertiary }}>
                últimas 8 semanas
              </Box>
            </Box>
            <Box sx={emptyStateSx}>
              {recentSales && recentSales.length === 0
                ? "Aún no hay ventas registradas."
                : "Aún no hay datos suficientes."}
            </Box>
          </Box>

          {/* Atajos */}
          <Box sx={panelSx}>
            <Box sx={panelHeadSx}>
              <Box component="h2" sx={panelHeadTitleSx}>
                Atajos de teclado
              </Box>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "7px 14px",
                fontSize: "11.5px",
                color: foto.ink.secondary,
              }}
            >
              <Shortcut
                label="Paleta universal"
                keys={["⌘", "K"]}
                foto={foto}
              />
              <Shortcut label="Nueva compra" keys={["⌘", "N"]} foto={foto} />
              <Shortcut label="Nueva venta" keys={["⌘", "V"]} foto={foto} />
              <Shortcut label="Directorio" keys={["⌘", "D"]} foto={foto} />
            </Box>
          </Box>
        </Box>
      </Box>

      <ConfirmDialog
        open={cancelTarget !== null}
        title={
          cancelTarget
            ? `Cancelar lote ${cancelTarget.loteId}`
            : "Cancelar lote"
        }
        message="Los ítems ya capturados se desligan del lote (quedan en inventario sin lote, sin costo asignado ni preponderancia). El lote queda marcado como cancelado y no se puede revertir."
        confirmLabel={cancellingLot ? "Cancelando…" : "Cancelar lote"}
        cancelLabel="Volver"
        confirmColor="error"
        onConfirm={() => void handleCancelLot()}
        onCancel={() => (cancellingLot ? undefined : setCancelTarget(null))}
      />
    </Box>
  );
}

// ============================================================================
// Internal components — kept inline per Slice 1 scope (no shared primitives)
// ============================================================================

type FotoT = ReturnType<typeof getFoto>;

interface ActivityItem {
  kind: "sale" | "edit";
  ts: number;
  saleId?: string;
  total?: number;
  itemId?: string;
  editorName?: string;
  status?: "pending" | "saved" | "failed";
}

interface HealthStatProps {
  value: string;
  label: string;
  ariaLabel: string;
  variant?: "warn" | "alert";
  foto: FotoT;
}

function HealthStat({
  value,
  label,
  ariaLabel,
  variant,
  foto,
}: HealthStatProps) {
  const color =
    variant === "alert"
      ? foto.status.sold
      : variant === "warn"
        ? foto.status.consigned
        : foto.ink.primary;
  return (
    <Box
      aria-label={ariaLabel}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "3px",
        borderRight: { xs: "none", md: `1px solid ${foto.surfaces.rule}` },
        paddingRight: { xs: 0, md: "24px" },
        "&:last-child": { borderRight: "none", paddingRight: 0 },
      }}
    >
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontSize: "28px",
          fontWeight: 300,
          color,
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

interface QuickCardProps {
  to: string;
  title: string;
  description: string;
  footerLeft: React.ReactNode;
  footerRight: React.ReactNode;
  kbdPill: string;
  icon: React.ReactNode;
  iconBackground: string;
  foto: FotoT;
}

function QuickCard({
  to,
  title,
  description,
  footerLeft,
  footerRight,
  kbdPill,
  icon,
  iconBackground,
  foto,
}: QuickCardProps) {
  return (
    <Box
      component={Link}
      to={to}
      sx={{
        background: foto.surfaces.canvas,
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "14px",
        padding: "22px 22px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        textDecoration: "none",
        color: "inherit",
        transition:
          "border-color 120ms ease, transform 180ms ease, box-shadow 180ms ease",
        "&:hover": {
          borderColor: foto.ink.primary,
          transform: "translateY(-2px)",
          boxShadow: `0 1px 2px ${alpha(foto.ink.primary, 0.04)}, 0 14px 32px ${alpha(foto.ink.primary, 0.06)}`,
        },
        "&:focus-visible": {
          outline: "none",
          boxShadow: `0 0 0 3px ${foto.accent.glow}`,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: iconBackground,
            color: foto.ink.inverse,
          }}
        >
          {icon}
        </Box>
        <Box
          sx={{
            fontFamily: fontFamilies.mono,
            fontSize: "10px",
            fontWeight: 500,
            background: foto.surfaces.inset,
            border: `1px solid ${foto.surfaces.edge}`,
            padding: "4px 8px",
            borderRadius: "6px",
            color: foto.ink.secondary,
          }}
        >
          {kbdPill}
        </Box>
      </Box>
      <Box>
        <Box
          sx={{
            fontSize: "18px",
            fontWeight: 600,
            color: foto.ink.primary,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          {title}
        </Box>
        <Box
          sx={{
            fontSize: "12.5px",
            color: foto.ink.secondary,
            lineHeight: 1.55,
            marginTop: "6px",
          }}
        >
          {description}
        </Box>
      </Box>
      <Box
        sx={{
          marginTop: "6px",
          paddingTop: "14px",
          borderTop: `1px solid ${foto.surfaces.edge}`,
          fontSize: "11px",
          color: foto.ink.tertiary,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Box component="span">{footerLeft}</Box>
        <Box component="span">{footerRight}</Box>
      </Box>
    </Box>
  );
}

interface ShortcutProps {
  label: string;
  keys: string[];
  foto: FotoT;
}

function Shortcut({ label, keys, foto }: ShortcutProps) {
  return (
    <>
      <Box component="span" sx={{ padding: "3px 0" }}>
        {label}
      </Box>
      <Box component="span" sx={{ display: "inline-flex", gap: "4px" }}>
        {keys.map((k, i) => (
          <Box
            key={`${k}-${i}`}
            component="kbd"
            sx={{
              fontFamily: fontFamilies.mono,
              fontSize: "10px",
              background: foto.surfaces.canvas,
              border: `1px solid ${foto.surfaces.edge}`,
              padding: "2.5px 6px",
              borderRadius: "4px",
              color: foto.ink.secondary,
              boxShadow: `0 1px 0 ${foto.surfaces.rule}`,
            }}
          >
            {k}
          </Box>
        ))}
      </Box>
    </>
  );
}
