import { useCallback, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Ban, ExternalLink, Link2Off } from "lucide-react";
import { getFoto, fontFamilies } from "../../../design-system";
import {
  useConvexQuery,
  useConvexMutation,
  convexApi,
} from "../../../lib/convex-safe";
import { useGoogleAuth } from "../../../contexts/GoogleAuthContext";
import { useNotification } from "../../../contexts/NotificationContext";
import { TicketHeader } from "./components/TicketHeader";
import { KardexPreview } from "./components/KardexPreview";
import { CancelVentaDialog } from "./components/CancelVentaDialog";
import { EditableMetaValue } from "./components/EditableMetaValue";
import type { Id } from "../../../../convex/_generated/dataModel";

function formatCop(value: number | undefined | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLong(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTimeLong(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function formaPagoLabel(formaPago: string, metodoContado?: string): string {
  if (formaPago === "contado") {
    return metodoContado ? `Contado · ${metodoContado}` : "Contado";
  }
  if (formaPago === "esmereogenesis") return "Esmereogénesis";
  if (formaPago === "credito") return "Crédito";
  if (formaPago === "bajo_pedido") return "Bajo pedido";
  if (formaPago === "consignacion") return "Consignación";
  return formaPago;
}

/**
 * Fotosíntesis — Read-only detail view for a persisted sale (Slice 3).
 *
 * Sibling to VentaPage (which still owns `/sales/new`). Loads the sale,
 * its buyer/lot/provider/first-item context, and shows the Kardex preview
 * as a comprobante on the dark right pane. The footer exposes a single
 * "Cancelar venta" action that drives `sales.cancel`; the cancellation
 * audit (cancelledAt/By/Reason) renders below as soon as Convex reactivity
 * refreshes the row.
 */
export default function VentaDetailPage() {
  const foto = getFoto("light");
  const navigate = useNavigate();
  const { saleId: routeSaleId } = useParams();
  const { user } = useGoogleAuth();
  const { notify } = useNotification();

  const [showCancel, setShowCancel] = useState(false);

  // The route param is the human "V-NNNN" id, but `sales.get` expects the
  // Convex `_id`. Look up by saleId via list+find — list is small and the
  // detail view is rare. Future optimisation: add `sales.getBySaleId`.
  const allSales = useConvexQuery(convexApi.sales.list, {});
  const saleMatch = useMemo(
    () => (allSales ?? []).find((s) => s.saleId === routeSaleId) ?? null,
    [allSales, routeSaleId],
  );
  // `undefined` = still loading; `null` = loaded + not found.
  const sale = allSales === undefined ? undefined : saleMatch;

  const cancelSale = useConvexMutation(convexApi.sales.cancel);
  const updatePrice = useConvexMutation(convexApi.sales.updatePrice);

  // First item drives the Kardex preview; for multi-item sales the additional
  // itemIds are listed under the comprobante.
  const firstItemId = sale?.itemIds[0] ?? null;
  const item = useConvexQuery(
    convexApi.products.get,
    firstItemId ? { itemId: firstItemId } : "skip",
  );
  const lot = useConvexQuery(
    convexApi.lots.getByLoteId,
    item?.loteId ? { loteId: item.loteId } : "skip",
  );
  const provider = useConvexQuery(
    convexApi.providers.get,
    lot?.providerId ? { id: lot.providerId } : "skip",
  );
  const buyer = useConvexQuery(
    convexApi.clients.get,
    sale?.clientId ? { id: sale.clientId } : "skip",
  );

  const handleConfirmCancel = useCallback(
    async (reason: string) => {
      if (!sale) return;
      const operatorEmail = user?.email ?? "unknown@tm";
      const operatorName = user?.name;
      await cancelSale({
        id: sale._id as Id<"sales">,
        operatorEmail,
        operatorName,
        reason,
      });
      notify("Venta cancelada y stock restaurado", "success");
      setShowCancel(false);
    },
    [sale, user, cancelSale, notify],
  );

  // ─── Loading / not-found ─────────────────────────────────────────────
  if (sale === undefined) {
    return (
      <Box
        sx={{
          background: foto.surfaces.canvas,
          color: foto.ink.tertiary,
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          letterSpacing: "-0.005em",
        }}
      >
        Cargando venta…
      </Box>
    );
  }

  if (sale === null) {
    return (
      <Box
        sx={{
          background: foto.surfaces.canvas,
          color: foto.ink.primary,
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <Link2Off size={28} color={foto.ink.tertiary} aria-hidden />
        <Box sx={{ fontSize: 16, fontWeight: 600 }}>
          No encontramos la venta {routeSaleId}
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => navigate("/admin/fotosintesis")}
          sx={{
            marginTop: "4px",
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
          Volver al inicio
        </Box>
      </Box>
    );
  }

  const isCancelled = sale.estado === "cancelada";
  const buyerTipoLabel =
    buyer?.tipo === "embajador" ? "Embajador" : "Cliente final";
  const extraItemIds = sale.itemIds.slice(1);

  return (
    <Box
      sx={{
        background: foto.surfaces.canvas,
        color: foto.ink.primary,
        minHeight: "calc(100vh - 56px)",
      }}
    >
      <TicketHeader
        id={sale.saleId}
        kind="sale"
        meta={[
          { label: "Fecha", value: formatDateLong(sale.fechaVenta) },
          {
            label: "Operador",
            value: user?.givenName || user?.name?.split(" ")[0] || "Operador",
          },
        ]}
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
        {/* ───── LEFT pane (form summary) ───── */}
        <Box
          sx={{
            padding: "24px 28px 60px",
            display: "flex",
            flexDirection: "column",
            gap: "28px",
          }}
        >
          <Section title="Detalle de la venta" foto={foto}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                padding: "16px 18px",
                borderRadius: "11px",
                border: `1px solid ${foto.surfaces.rule}`,
                background: foto.surfaces.panel,
              }}
            >
              <DetailRow
                label="Comprador"
                value={
                  <>
                    <Box
                      component="span"
                      sx={{
                        fontWeight: 600,
                        color: foto.ink.primary,
                      }}
                    >
                      {buyer?.nombre ?? "—"}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        marginLeft: "8px",
                        fontSize: 11.5,
                        color: foto.ink.tertiary,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {buyerTipoLabel}
                    </Box>
                  </>
                }
                foto={foto}
              />
              <DetailRow
                label="Forma de pago"
                value={formaPagoLabel(sale.formaPago, sale.metodoContado)}
                foto={foto}
              />
              {sale.formaPago === "credito" ? (
                <>
                  <DetailRow
                    label="Vence"
                    value={formatDateLong(sale.fechaVencimiento)}
                    foto={foto}
                  />
                  <DetailRow
                    label="N° de cuotas"
                    value={
                      typeof sale.numeroCuotas === "number"
                        ? String(sale.numeroCuotas)
                        : "—"
                    }
                    foto={foto}
                  />
                </>
              ) : null}
              <Box
                sx={{
                  height: 1,
                  background: foto.surfaces.edge,
                  margin: "4px 0",
                }}
              />
              <DetailRow
                label="Precio acordado"
                value={
                  <EditableMetaValue
                    value={sale.precioAcordadoCOP}
                    format={formatCop}
                    disabled={isCancelled}
                    min={1}
                    step={1000}
                    variant="currency"
                    ariaLabel="precio acordado de la venta"
                    helper={
                      isCancelled
                        ? undefined
                        : "Actualiza precio + total (Enter para guardar)."
                    }
                    onCommit={async (next) => {
                      try {
                        await updatePrice({
                          id: sale._id as Id<"sales">,
                          precioAcordadoCOP: next,
                          totalCOP: next,
                        });
                        notify("Precio de la venta actualizado", "success");
                      } catch (err) {
                        const msg =
                          err instanceof Error ? err.message : String(err);
                        notify(
                          `No pudimos actualizar el precio: ${msg}`,
                          "error",
                        );
                        throw err;
                      }
                    }}
                  />
                }
                foto={foto}
                mono
              />
              <DetailRow
                label="Total"
                value={formatCop(sale.totalCOP)}
                foto={foto}
                mono
                strong
              />
            </Box>
          </Section>

          <Section title="Documentos" foto={foto}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <DocumentRow
                label="Kardex"
                url={sale.carnetUrl}
                openLabel="Abrir Kardex"
                foto={foto}
              />
              <DocumentRow
                label="Certificado"
                url={sale.certificadoUrl}
                openLabel="Abrir Certificado"
                foto={foto}
              />
            </Box>
          </Section>

          {isCancelled ? (
            <Section title="Historial de cancelación" foto={foto}>
              <Box
                role="status"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "14px 16px",
                  borderRadius: "11px",
                  border: `1px solid ${foto.status.sold}`,
                  background: "rgba(179, 58, 47, 0.06)",
                  color: foto.status.sold,
                  fontSize: 12.5,
                  lineHeight: 1.55,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={16} strokeWidth={1.7} aria-hidden />
                  <Box sx={{ fontWeight: 600 }}>
                    Cancelada el {formatDateTimeLong(sale.cancelledAt)}
                  </Box>
                </Box>
                <Box sx={{ color: foto.ink.secondary, fontSize: 12 }}>
                  por {sale.cancelledBy ?? "—"}
                </Box>
                <Box sx={{ color: foto.ink.secondary, fontSize: 12 }}>
                  Motivo: {sale.cancellationReason ?? "—"}
                </Box>
              </Box>
            </Section>
          ) : null}

          {/* Footer actions */}
          <Box
            sx={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              paddingTop: "12px",
              borderTop: `1px solid ${foto.surfaces.edge}`,
            }}
          >
            <Box
              component="button"
              type="button"
              disabled={isCancelled}
              aria-disabled={isCancelled}
              onClick={() => setShowCancel(true)}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "9px",
                border: `1px solid ${isCancelled ? foto.surfaces.rule : foto.status.sold}`,
                background: isCancelled
                  ? foto.surfaces.inset
                  : "rgba(179, 58, 47, 0.06)",
                color: isCancelled ? foto.ink.mute : foto.status.sold,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "-0.005em",
                cursor: isCancelled ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "background 120ms ease, transform 120ms ease",
                "&:hover:not(:disabled)": {
                  background: "rgba(179, 58, 47, 0.10)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Ban size={15} strokeWidth={1.8} aria-hidden />
              {isCancelled ? "Venta cancelada" : "Cancelar venta"}
            </Box>
          </Box>
        </Box>

        {/* ───── RIGHT pane (Kardex comprobante) ───── */}
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
            Comprobante archivado
          </Box>

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
              buyer
                ? {
                    nombre: buyer.nombre,
                    nit: buyer.nit ?? undefined,
                    cedula: buyer.cedula ?? undefined,
                    email: buyer.email ?? undefined,
                    tipo: buyer.tipo,
                  }
                : null
            }
            sale={{
              id: sale.saleId,
              precioCop: sale.precioAcordadoCOP,
              formaPago: sale.formaPago,
              metodoContado: sale.metodoContado,
            }}
            privacyOn={false}
          />

          <Box
            sx={{
              marginTop: "14px",
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "0.01em",
              fontFamily: fontFamilies.system,
            }}
          >
            Comprobante archivado para {sale.saleId}
          </Box>

          {extraItemIds.length > 0 ? (
            <Box
              sx={{
                marginTop: "16px",
                paddingTop: "14px",
                borderTop: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <Box
                sx={{
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  marginBottom: "8px",
                }}
              >
                Ítems adicionales en esta venta
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "6px 12px",
                  fontFamily: fontFamilies.mono,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {extraItemIds.map((id) => (
                  <Box key={id}>{id}</Box>
                ))}
              </Box>
            </Box>
          ) : null}
        </Box>
      </Box>

      <CancelVentaDialog
        open={showCancel}
        saleId={sale.saleId}
        onCancel={() => setShowCancel(false)}
        onConfirm={handleConfirmCancel}
      />
    </Box>
  );
}

// ─── Local helpers ───────────────────────────────────────────────────────

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

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  foto: ReturnType<typeof getFoto>;
  mono?: boolean;
  strong?: boolean;
}

function DetailRow({
  label,
  value,
  foto,
  mono = false,
  strong = false,
}: DetailRowProps) {
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
          fontSize: 12,
          fontWeight: 500,
          color: foto.ink.secondary,
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          fontFamily: mono ? fontFamilies.mono : fontFamilies.system,
          fontVariantNumeric: mono ? "tabular-nums" : undefined,
          fontSize: strong ? 17 : 13,
          fontWeight: strong ? 600 : 500,
          color: strong ? foto.accent.deep : foto.ink.primary,
          letterSpacing: "-0.01em",
          textAlign: "right",
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

interface DocumentRowProps {
  label: string;
  url: string | undefined;
  openLabel: string;
  foto: ReturnType<typeof getFoto>;
}

function DocumentRow({ label, url, openLabel, foto }: DocumentRowProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "10px",
        border: `1px solid ${foto.surfaces.rule}`,
        background: foto.surfaces.panel,
      }}
    >
      <Box
        sx={{
          fontSize: 12.5,
          fontWeight: 500,
          color: foto.ink.secondary,
        }}
      >
        {label}
      </Box>
      {url ? (
        <Box
          component="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "7px",
            border: `1px solid ${foto.accent.primary}`,
            background: foto.accent.soft,
            color: foto.accent.deep,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            letterSpacing: "-0.005em",
            transition: "background 120ms ease",
            "&:hover": { background: "rgba(0, 92, 66, 0.12)" },
          }}
        >
          <ExternalLink size={13} strokeWidth={1.8} aria-hidden />
          {openLabel}
        </Box>
      ) : (
        <Box
          sx={{
            fontSize: 11.5,
            color: foto.ink.mute,
            fontStyle: "italic",
            letterSpacing: "0.01em",
          }}
        >
          Pendiente
        </Box>
      )}
    </Box>
  );
}
