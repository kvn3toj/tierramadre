import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Switch } from "@mui/material";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Download,
  ArrowRight,
} from "lucide-react";
import {
  getFoto,
  fontFamilies,
  emeraldCore,
  goldAccent,
} from "../../../design-system";
import {
  useConvexQuery,
  useConvexMutation,
  convexApi,
} from "../../../lib/convex-safe";
import { useNotification } from "../../../contexts/NotificationContext";
import { TicketHeader } from "./components/TicketHeader";
import { StepPills } from "./components/StepPills";
import { SegmentedControl } from "./components/SegmentedControl";
import { FieldLabel } from "./components/FieldLabel";
import { NumberInputWithCalc } from "./components/NumberInputWithCalc";
import { KbdKey } from "./components/KbdKey";
import { KardexPreview } from "./components/KardexPreview";
import { useFotosintesisLayout } from "./FotosintesisLayoutContext";
import { exportCarnet } from "./exportCarnet";

type CompradorTipo = "embajador" | "final";
type FormaPago = "contado" | "esmereogenesis" | "credito";

function formatCop(value: number | undefined | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Fotosíntesis — Venta + Kardex (Slice 1).
 *
 * Embajador-only sale; cliente final UI greyed out with "próximamente".
 * Forma de pago: contado / esmereogenesis (crédito disabled).
 * On confirm: `sales.create` → exportCarnet (local download) → navigate home.
 * Drive upload + `sales.setCarnetUrl` lands in Slice 3.
 *
 * Handoff §4.6. Visual source: docs/previews/fotosintesis-v2/venta-kardex.html
 */
export default function FotosintesisVentaPage() {
  const foto = getFoto("light");
  const navigate = useNavigate();
  const { saleId } = useParams();
  const [searchParams] = useSearchParams();
  const { openSpotlight } = useFotosintesisLayout();
  const { notify } = useNotification();

  // ─── Selection state ───────────────────────────────────────────────────
  const initialItemId = searchParams.get("itemId") ?? null;
  const [itemId, setItemId] = useState<string | null>(initialItemId);
  const [clientId, setClientId] = useState<string | null>(null);
  const [compradorTipo, setCompradorTipo] =
    useState<CompradorTipo>("embajador");
  const [formaPago, setFormaPago] = useState<FormaPago>("contado");
  const [precioAcordado, setPrecioAcordado] = useState<number | "">("");
  const [privacyOn, setPrivacyOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const kardexRef = useRef<HTMLDivElement>(null);

  // ─── Data ──────────────────────────────────────────────────────────────
  const item = useConvexQuery(
    convexApi.products.get,
    itemId ? { itemId } : "skip",
  );
  const lot = useConvexQuery(
    convexApi.lots.getByLoteId,
    item?.loteId ? { loteId: item.loteId } : "skip",
  );
  const provider = useConvexQuery(
    convexApi.providers.get,
    lot?.providerId ? { id: lot.providerId } : "skip",
  );
  // `clients.list` doesn't accept `tipo` — filter client-side.
  const allClients = useConvexQuery(convexApi.clients.list, {});
  const embajadores = useMemo(
    () => (allClients ?? []).filter((c) => c.tipo === "embajador"),
    [allClients],
  );

  const peeked = useConvexQuery(convexApi.sales.peekNextSaleId, {});
  const peekedSaleId = peeked?.preview ?? "V-NEW";

  const createSale = useConvexMutation(convexApi.sales.create);

  const selectedClient = useMemo(
    () => embajadores.find((c) => c._id === clientId) ?? null,
    [embajadores, clientId],
  );

  // Auto-select first embajador if none chosen
  useEffect(() => {
    if (!clientId && embajadores.length > 0) {
      setClientId(embajadores[0]._id as string);
    }
  }, [clientId, embajadores]);

  // ─── Derived ───────────────────────────────────────────────────────────
  const precioCop = typeof precioAcordado === "number" ? precioAcordado : 0;
  const totalCop = precioCop;
  const comisionCop = 0; // Slice 1 placeholder — commission % lives in Slice 3
  const fechaVenta = useMemo(() => new Date().toISOString(), []);

  const stepBuyer: "done" | "active" | "pending" = clientId ? "done" : "active";
  const stepProduct: "done" | "active" | "pending" = !clientId
    ? "pending"
    : itemId
      ? "done"
      : "active";
  const stepPay: "done" | "active" | "pending" =
    clientId && itemId
      ? typeof precioAcordado === "number" && precioAcordado > 0
        ? "done"
        : "active"
      : "pending";

  // ─── Spotlight wiring ──────────────────────────────────────────────────
  const onBuscarItem = useCallback(() => {
    openSpotlight({
      scope: "Solo vendibles",
      onSelect: (product) => {
        setItemId(product.itemId);
        if (typeof product.precioCop === "number" && !precioAcordado) {
          setPrecioAcordado(product.precioCop);
        }
      },
    });
  }, [openSpotlight, precioAcordado]);

  // ⌘K when on this page → spotlight too (layout handles globally; this is
  // a local convenience when focus is in an input that swallows the global).

  // ─── Confirm flow ──────────────────────────────────────────────────────
  const canConfirm = !!itemId && !!clientId && precioCop > 0 && !submitting;

  const onDownloadPreview = useCallback(async () => {
    if (!kardexRef.current) return;
    try {
      await exportCarnet(kardexRef.current, `Kardex-${peekedSaleId}.pdf`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`No pude generar el PDF: ${msg}`, "error");
    }
  }, [peekedSaleId, notify]);

  const onConfirm = useCallback(async () => {
    if (!itemId || !clientId || precioCop <= 0) {
      setErrorBanner("Falta completar comprador, ítem o precio.");
      return;
    }
    setErrorBanner(null);
    setSubmitting(true);
    try {
      const res = await createSale({
        itemIds: [itemId],
        clientId: clientId as never,
        fechaVenta,
        precioAcordadoCOP: precioCop,
        totalCOP: totalCop,
        comisionCOP: comisionCop || undefined,
        formaPago,
        metodoContado: formaPago === "contado" ? "efectivo" : undefined,
      });

      // After server success, capture the Kardex DOM and save the PDF locally.
      // TODO(Slice 3): upload the returned Blob to Drive via /api/media-upload
      // and call `sales.setCarnetUrl({ id: res.id, carnetUrl })` to persist.
      if (kardexRef.current) {
        try {
          await exportCarnet(kardexRef.current, `Kardex-${res.saleId}.pdf`);
        } catch (pdfErr) {
          // PDF failure shouldn't block the sale confirmation
          const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
          notify(
            `Venta ${res.saleId} guardada, pero falló el PDF: ${msg}`,
            "warning",
          );
        }
      }

      notify(`Venta ${res.saleId} confirmada · Kardex descargado`, "success");
      navigate("/admin/fotosintesis");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    itemId,
    clientId,
    precioCop,
    totalCop,
    comisionCop,
    formaPago,
    fechaVenta,
    createSale,
    navigate,
    notify,
  ]);

  // ─── Read-only / sale-saved view ───────────────────────────────────────
  // For Slice 1, hitting `/sales/:saleId` just renders a confirmation summary.
  const isReadView = !!saleId && saleId !== "new";

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        background: foto.surfaces.canvas,
        color: foto.ink.primary,
        minHeight: "calc(100vh - 56px)",
      }}
    >
      <TicketHeader
        id={isReadView ? saleId! : peekedSaleId}
        kind="sale"
        meta={[
          {
            label: "Fecha",
            value: new Date().toLocaleDateString("es-CO", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          },
          {
            label: "Operador",
            value: "Maritza",
          },
        ]}
        rightSlot={
          <StepPills
            steps={[
              { label: "Comprador", state: stepBuyer },
              { label: "Producto", state: stepProduct },
              { label: "Pago + Kardex", state: stepPay },
            ]}
          />
        }
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) 480px",
          gap: 0,
          maxWidth: 1320,
          margin: "0 auto",
          minHeight: "calc(100vh - 56px - 110px)",
          "@media (max-width: 1024px)": {
            gridTemplateColumns: "1fr",
          },
        }}
      >
        {/* ───── LEFT pane (form) ───── */}
        <Box
          sx={{
            padding: "24px 28px 60px",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          {errorBanner ? (
            <Box
              role="alert"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                background: "rgba(179, 58, 47, 0.08)",
                border: `1px solid ${foto.status.sold}`,
                borderRadius: "9px",
                color: foto.status.sold,
                fontSize: 12.5,
              }}
            >
              <AlertCircle size={16} strokeWidth={1.7} aria-hidden />
              {errorBanner}
            </Box>
          ) : null}

          {/* 1. Comprador */}
          <Section title="Comprador" foto={foto}>
            <SegmentedControl<CompradorTipo>
              ariaLabel="Tipo de comprador"
              value={compradorTipo}
              onChange={setCompradorTipo}
              options={[
                { value: "embajador", label: "Embajador" },
                {
                  value: "final",
                  label: "Cliente final · próximamente",
                  disabled: true,
                },
              ]}
            />

            <Box sx={{ marginTop: "16px" }}>
              <FieldLabel>Embajador asignado</FieldLabel>
              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  background: foto.surfaces.inset,
                  border: `1px solid ${foto.surfaces.rule}`,
                  borderRadius: "9px",
                  padding: "10px 14px",
                  gap: "12px",
                  "&:focus-within": {
                    borderColor: foto.accent.primary,
                    boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                  },
                  transition: "border-color 120ms ease, box-shadow 120ms ease",
                }}
              >
                {/* Avatar */}
                <Box
                  aria-hidden
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${emeraldCore.dark}, ${foto.accent.deep})`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: fontFamilies.serif,
                    fontSize: 18,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {(selectedClient?.nombre ?? "?").slice(0, 1).toUpperCase()}
                </Box>

                {/* Name + meta + native select overlay */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: foto.ink.primary,
                      letterSpacing: "-0.012em",
                    }}
                  >
                    {selectedClient?.nombre ?? "— Sin embajador seleccionado —"}
                  </Box>
                  <Box
                    sx={{
                      fontSize: 11.5,
                      color: foto.ink.tertiary,
                      marginTop: "2px",
                    }}
                  >
                    {selectedClient?.email ??
                      selectedClient?.telefono ??
                      "Selecciona un embajador"}
                  </Box>
                </Box>

                <ChevronDown size={16} color={foto.ink.tertiary} aria-hidden />

                {/* Native <select> overlaid for accessibility + keyboard */}
                <Box
                  component="select"
                  aria-label="Embajador asignado"
                  value={clientId ?? ""}
                  onChange={(e) => {
                    const next = (e.target as HTMLSelectElement).value;
                    setClientId(next || null);
                  }}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                    appearance: "none",
                  }}
                >
                  <option value="">— Selecciona un embajador —</option>
                  {embajadores.map((c) => (
                    <option key={c._id as string} value={c._id as string}>
                      {c.nombre}
                    </option>
                  ))}
                </Box>
              </Box>
            </Box>
          </Section>

          {/* 2. Producto */}
          <Section title="Ítem a vender" foto={foto}>
            {itemId && item ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "96px 1fr",
                  gap: "16px",
                  padding: "16px",
                  borderRadius: "11px",
                  border: `1px solid ${foto.surfaces.rule}`,
                  background: foto.surfaces.panel,
                }}
              >
                <Box
                  sx={{
                    width: 96,
                    height: 96,
                    aspectRatio: "1 / 1",
                    borderRadius: "7px",
                    background: foto.surfaces.inset,
                    border: `1px solid ${foto.surfaces.edge}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: foto.ink.mute,
                    fontFamily: fontFamilies.mono,
                    fontSize: 11,
                    overflow: "hidden",
                  }}
                  aria-hidden
                >
                  {item.itemId}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: "-0.018em",
                      color: foto.ink.primary,
                      marginBottom: "6px",
                    }}
                  >
                    {item.nombre ?? "Sin nombre"}
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "6px 18px",
                      fontSize: 11.5,
                      color: foto.ink.secondary,
                    }}
                  >
                    <Lineage
                      label="Procedencia"
                      value={item.coleccion ?? "—"}
                    />
                    <Lineage label="Calidad" value={item.calidad ?? "—"} />
                    <Lineage label="Peso" value={item.peso ?? "—"} />
                    <Lineage label="Color" value={item.color ?? "—"} />
                    <Lineage label="Lote" value={item.loteId ?? "—"} mono />
                    <Lineage
                      label="Costo base"
                      value={formatCop(item.costoBaseCOP)}
                      mono
                    />
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box
                onClick={onBuscarItem}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onBuscarItem();
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "28px 16px",
                  borderRadius: "11px",
                  border: `1px dashed ${foto.surfaces.edgeStrong}`,
                  background: foto.surfaces.panel,
                  color: foto.ink.secondary,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "background 120ms ease",
                  "&:hover": { background: foto.surfaces.inset },
                  "&:focus-visible": {
                    outline: "none",
                    boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                  },
                }}
              >
                <Search size={16} aria-hidden />
                Buscá un ítem
                <KbdKey size="sm">⌘</KbdKey>
                <KbdKey size="sm">K</KbdKey>
              </Box>
            )}
          </Section>

          {/* 3. Pago */}
          <Section title="Forma de pago" foto={foto}>
            <SegmentedControl<FormaPago>
              ariaLabel="Forma de pago"
              value={formaPago}
              onChange={setFormaPago}
              options={[
                { value: "contado", label: "Contado" },
                { value: "esmereogenesis", label: "Esmereogénesis" },
                {
                  value: "credito",
                  label: "Crédito · próximamente",
                  disabled: true,
                },
              ]}
            />

            <Box sx={{ marginTop: "18px" }}>
              <FieldLabel>Precio acordado (COP)</FieldLabel>
              <NumberInputWithCalc
                value={precioAcordado}
                onChange={setPrecioAcordado}
                placeholder="Ingresá el precio final"
                step={1000}
                min={0}
                ariaLabel="Precio acordado en pesos colombianos"
                calcVariant="accent"
                calcSuffix={`= ${formatCop(precioCop)}`}
              />
            </Box>

            {/* Totals card */}
            <Box
              sx={{
                marginTop: "16px",
                padding: "14px 16px",
                borderRadius: "11px",
                border: `1px solid ${foto.surfaces.rule}`,
                background: foto.surfaces.panel,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <TotalsRow
                label="Precio acordado"
                value={formatCop(precioCop)}
                foto={foto}
              />
              <TotalsRow
                label="Comisión embajador"
                value={comisionCop > 0 ? formatCop(comisionCop) : "—"}
                foto={foto}
                tone="gold"
              />
              <Box
                sx={{
                  height: 1,
                  background: foto.surfaces.edge,
                  margin: "2px 0",
                }}
              />
              <TotalsRow
                label="Total"
                value={formatCop(totalCop)}
                foto={foto}
                tone="accent"
                strong
              />
            </Box>
          </Section>

          {/* 4. WillHappen */}
          <Section title="Al confirmar la venta" foto={foto}>
            <Box
              sx={{
                padding: "16px 18px",
                borderRadius: "11px",
                border: `1px solid ${foto.accent.primary}`,
                background: foto.accent.soft,
                color: foto.ink.secondary,
                fontSize: 12.5,
                lineHeight: 1.55,
              }}
            >
              <Box
                sx={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: foto.accent.deep,
                  marginBottom: "10px",
                }}
              >
                Las 5 acciones encadenadas
              </Box>
              <Box component="ol" sx={{ margin: 0, paddingLeft: "18px" }}>
                <li>El ítem pasa a estado VENDIDA en Convex y en Sheets.</li>
                <li>
                  Se genera la venta {peekedSaleId} con esta forma de pago.
                </li>
                <li>El Kardex en PDF se descarga localmente.</li>
                <li>Más adelante se subirá a Drive y se mandará por email.</li>
                <li>Se actualiza el dashboard del embajador.</li>
              </Box>
            </Box>
          </Section>

          {/* 5. Privacy */}
          <Section title="Privacidad del Kardex" foto={foto}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                padding: "14px 16px",
                borderRadius: "11px",
                border: `1px solid ${foto.surfaces.rule}`,
                background: foto.surfaces.panel,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: foto.ink.primary,
                    marginBottom: "2px",
                  }}
                >
                  Ocultar identificación en versión pública
                </Box>
                <Box sx={{ fontSize: 11.5, color: foto.ink.tertiary }}>
                  Slice 1: el toggle solo cambia el preview. Slice 3 generará
                  dos PDFs (privado + público).
                </Box>
              </Box>
              <Switch
                checked={privacyOn}
                onChange={(e) => setPrivacyOn(e.target.checked)}
                inputProps={{
                  "aria-label": "Ocultar identificación en versión pública",
                }}
              />
            </Box>
          </Section>

          {/* Confirm */}
          <Box
            sx={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              paddingTop: "8px",
              borderTop: `1px solid ${foto.surfaces.edge}`,
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => navigate("/admin/fotosintesis")}
              sx={{
                padding: "10px 18px",
                borderRadius: "9px",
                border: `1px solid ${foto.surfaces.rule}`,
                background: foto.surfaces.canvas,
                color: foto.ink.secondary,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancelar
            </Box>
            <Box
              component="button"
              type="button"
              disabled={!canConfirm}
              aria-busy={submitting}
              onClick={onConfirm}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "9px",
                border: "none",
                background: canConfirm
                  ? `linear-gradient(180deg, ${foto.accent.primary} 0%, ${foto.accent.deep} 100%)`
                  : foto.surfaces.inset,
                color: canConfirm ? foto.ink.inverse : foto.ink.mute,
                fontSize: 13.5,
                fontWeight: 600,
                letterSpacing: "-0.005em",
                cursor: canConfirm ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                boxShadow: canConfirm
                  ? "0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,140,98,0.18)"
                  : "none",
                transition:
                  "background 120ms ease, transform 120ms ease, box-shadow 120ms ease",
                "&:hover:not(:disabled)": { transform: "translateY(-1px)" },
              }}
            >
              {submitting ? (
                <>
                  <Box
                    component="span"
                    sx={{ position: "absolute", left: -9999 }}
                  >
                    Generando Kardex, espera unos segundos
                  </Box>
                  Confirmando…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden />
                  Confirmar venta
                  <ArrowRight size={14} strokeWidth={1.8} aria-hidden />
                </>
              )}
            </Box>
          </Box>
        </Box>

        {/* ───── RIGHT pane (Kardex preview) ───── */}
        <Box
          sx={{
            background: "linear-gradient(180deg, #2a2522 0%, #1a1714 100%)",
            padding: "28px 24px",
            position: "sticky",
            top: 56,
            maxHeight: "calc(100vh - 56px)",
            overflowY: "auto",
            "@media (max-width: 1024px)": {
              position: "static",
              maxHeight: "none",
            },
          }}
        >
          <Box
            sx={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
              marginBottom: "12px",
            }}
          >
            Vista previa del Kardex
          </Box>

          <Box ref={kardexRef}>
            <KardexPreview
              item={
                item
                  ? {
                      itemId: item.itemId,
                      nombre: item.nombre ?? undefined,
                      color: item.color ?? undefined,
                      calidad: item.calidad ?? undefined,
                      peso: item.peso ?? undefined,
                      medidas: item.medidas ?? undefined,
                    }
                  : null
              }
              lot={
                lot
                  ? {
                      loteId: lot.loteId,
                      fechaRecepcion: lot.fechaRecepcion,
                    }
                  : null
              }
              provider={
                provider
                  ? { nombreORazonSocial: provider.nombreORazonSocial }
                  : null
              }
              buyer={
                selectedClient
                  ? {
                      nombre: selectedClient.nombre,
                      nit: selectedClient.nit ?? undefined,
                      cedula: selectedClient.cedula ?? undefined,
                      email: selectedClient.email ?? undefined,
                      tipo: selectedClient.tipo,
                    }
                  : null
              }
              sale={{
                id: peekedSaleId,
                precioCop: precioCop,
                formaPago,
                metodoContado: formaPago === "contado" ? "efectivo" : undefined,
              }}
              privacyOn={privacyOn}
            />
          </Box>

          <Box
            component="button"
            type="button"
            onClick={onDownloadPreview}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
              padding: "9px 14px",
              borderRadius: "9px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 120ms ease",
              "&:hover": { background: "rgba(255,255,255,0.12)" },
            }}
          >
            <Download size={14} aria-hidden />
            Descargar Kardex (vista previa)
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Small local helpers ─────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
  foto: ReturnType<typeof getFoto>;
}

function Section({ title, children, foto }: SectionProps) {
  return (
    <Box>
      <Box
        sx={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: foto.ink.tertiary,
          marginBottom: "10px",
        }}
      >
        {title}
      </Box>
      {children}
    </Box>
  );
}

interface LineageProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function Lineage({ label, value, mono = false }: LineageProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          fontSize: 8.5,
          fontWeight: 500,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#8B9290",
          marginBottom: "2px",
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          fontFamily: mono ? fontFamilies.mono : fontFamilies.system,
          fontVariantNumeric: mono ? "tabular-nums" : undefined,
          fontSize: 12,
          color: "#0B100E",
          fontWeight: 500,
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

interface TotalsRowProps {
  label: string;
  value: React.ReactNode;
  foto: ReturnType<typeof getFoto>;
  tone?: "default" | "accent" | "gold";
  strong?: boolean;
}

function TotalsRow({
  label,
  value,
  foto,
  tone = "default",
  strong = false,
}: TotalsRowProps) {
  const valueColor =
    tone === "accent"
      ? foto.accent.deep
      : tone === "gold"
        ? goldAccent.dark
        : foto.ink.primary;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "16px",
      }}
    >
      <Box
        sx={{
          fontSize: strong ? 13 : 12,
          fontWeight: strong ? 600 : 500,
          color: foto.ink.secondary,
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: "tabular-nums",
          fontSize: strong ? 17 : 13,
          fontWeight: strong ? 600 : 500,
          color: valueColor,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </Box>
    </Box>
  );
}
