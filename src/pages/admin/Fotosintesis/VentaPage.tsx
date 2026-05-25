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
import { useGoogleAuth } from "../../../contexts/GoogleAuthContext";
import { TicketHeader } from "./components/TicketHeader";
import { StepPills } from "./components/StepPills";
import { spanishText } from "./utils/fieldLang";
import { SegmentedControl } from "./components/SegmentedControl";
import { FieldLabel } from "./components/FieldLabel";
import { NumberInputWithCalc } from "./components/NumberInputWithCalc";
import { KbdKey } from "./components/KbdKey";
import { KardexPreview } from "./components/KardexPreview";
import { CertificadoPreview } from "./components/CertificadoPreview";
import {
  ClienteFinalForm,
  type ClienteRow,
} from "./components/ClienteFinalForm";
import {
  CreditoFields,
  EsmereogenesisFields,
} from "./components/CreditoFields";
import { useFotosintesisLayout } from "./FotosintesisLayoutContext";
import { exportCarnet } from "./exportCarnet";
import { exportCertificado, isCertificadoApproved } from "./exportCertificado";
import { slugifyBuyerName } from "../../../utils/slugify";
import { beginStage, logFailure, logStage } from "./instrumentation";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  BOVEDAS,
  sanitizeSedeCode,
  type Sede,
} from "../../../data/vocabularies";

// Known buyer types keep autocomplete; a custom write-in ("Otro…") is allowed
// and captured through the cliente-final form, which stores it on clients.tipo.
type CompradorTipo = "embajador" | "final" | (string & {});
type FormaPago =
  | "contado"
  | "esmereogenesis"
  | "credito"
  | "canje"
  | "bajo_pedido"
  | "consignacion";
type MetodoContado = "efectivo" | "transferencia" | "crypto";

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
  const { user } = useGoogleAuth();

  // ─── Selection state ───────────────────────────────────────────────────
  const initialItemId = searchParams.get("itemId") ?? null;
  const [itemId, setItemId] = useState<string | null>(initialItemId);
  const [clientId, setClientId] = useState<Id<"clients"> | null>(null);
  // Sede must be picked explicitly every sale — no default. The saleId
  // preview only resolves once the operator has chosen Bogotá or Cali.
  const [sede, setSede] = useState<Sede | null>(null);
  const [compradorTipo, setCompradorTipo] =
    useState<CompradorTipo>("embajador");
  const [formaPago, setFormaPago] = useState<FormaPago>("contado");
  const [metodoContado, setMetodoContado] = useState<MetodoContado>("efectivo");
  const [precioAcordado, setPrecioAcordado] = useState<number | "">("");
  const [privacyOn, setPrivacyOn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // ─── Slice 3 — Crédito fields ─────────────────────────────────────────
  const [creditoFechaVenc, setCreditoFechaVenc] = useState<string>("");
  const [creditoCuotas, setCreditoCuotas] = useState<number>(6);
  const [creditoTasa, setCreditoTasa] = useState<number | "">("");

  // ─── Slice 3 — Esmereogénesis fields ──────────────────────────────────
  const [esmereoPlazo, setEsmereoPlazo] = useState<number | "">("");
  const [esmereoCuotas, setEsmereoCuotas] = useState<number>(6);
  const [esmereoFechaVenc, setEsmereoFechaVenc] = useState<string>("");
  const [esmereoNotas, setEsmereoNotas] = useState<string>("");

  // ─── Slice 3 — Email opcional ─────────────────────────────────────────
  const [sendEmail, setSendEmail] = useState(false);
  const [adicionales, setAdicionales] = useState("");

  const kardexRef = useRef<HTMLDivElement>(null);
  const certificadoRef = useRef<HTMLDivElement>(null);

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

  const peeked = useConvexQuery(
    convexApi.sales.peekNextSaleId,
    sede ? { sede } : "skip",
  );
  const peekedSaleId = peeked?.preview ?? (sede ? `V${sede}-NEW` : "V—");

  const createSale = useConvexMutation(convexApi.sales.create);
  const setCarnetUrl = useConvexMutation(convexApi.sales.setCarnetUrl);
  const setCertificadoUrl = useConvexMutation(
    convexApi.sales.setCertificadoUrl,
  );

  const selectedClient = useMemo<ClienteRow | null>(() => {
    if (!clientId || !allClients) return null;
    return (allClients.find((c) => c._id === clientId) ??
      null) as ClienteRow | null;
  }, [allClients, clientId]);

  // Auto-select first embajador only when we're in the embajador flow.
  // The cliente-final flow is creation-only — we wait for the operator.
  useEffect(() => {
    if (compradorTipo !== "embajador") return;
    if (!clientId && embajadores.length > 0) {
      setClientId(embajadores[0]._id);
    }
  }, [clientId, embajadores, compradorTipo]);

  // Reset the selected client when the operator switches tabs so they don't
  // accidentally ship an embajador's id in a "cliente final" sale or vice versa.
  useEffect(() => {
    setClientId(null);
  }, [compradorTipo]);

  // ─── Derived ───────────────────────────────────────────────────────────
  const precioCop = typeof precioAcordado === "number" ? precioAcordado : 0;
  const totalCop = precioCop;
  const comisionCop = 0; // Slice 1 placeholder — commission % lives in Slice 3
  // `fechaVenta` was previously memoized at mount which dated sales to the
  // moment the operator opened the form rather than when they confirmed.
  // Computed inside `onConfirm` now (see below). Kept here only as a
  // placeholder for the Kardex preview's date display.
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
  const creditoComplete =
    formaPago !== "credito" ||
    (creditoFechaVenc.length > 0 && creditoCuotas > 0);
  const canConfirm =
    !!sede &&
    !!itemId &&
    !!clientId &&
    precioCop > 0 &&
    creditoComplete &&
    !submitting;

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
    if (!sede) {
      setErrorBanner("Falta elegir bóveda.");
      return;
    }
    if (!itemId || !clientId || precioCop <= 0) {
      setErrorBanner("Falta completar comprador, ítem o precio.");
      return;
    }
    if (formaPago === "credito" && !creditoFechaVenc) {
      setErrorBanner("Crédito requiere fecha de vencimiento.");
      return;
    }
    setErrorBanner(null);
    setSubmitting(true);
    logStage("confirm:begin", {
      compradorTipo,
      formaPago,
      hasEmail: Boolean(selectedClient?.email),
      sendEmail,
    });
    try {
      // `fechaVencimiento` / `numeroCuotas` flow into the server only for
      // credito (mandatory per BR-7) or esmereogénesis when the operator
      // filled them in (optional UX nicety).
      const confirmedAt = new Date().toISOString();
      const createArgs: Parameters<typeof createSale>[0] = {
        sede,
        itemIds: [itemId],
        clientId,
        fechaVenta: confirmedAt,
        precioAcordadoCOP: precioCop,
        totalCOP: totalCop,
        comisionCOP: comisionCop || undefined,
        formaPago,
        metodoContado: formaPago === "contado" ? metodoContado : undefined,
        adicionales: adicionales.trim() || undefined,
      };
      if (formaPago === "credito") {
        createArgs.fechaVencimiento = creditoFechaVenc;
        createArgs.numeroCuotas = creditoCuotas;
      } else if (formaPago === "esmereogenesis") {
        if (esmereoCuotas > 0) createArgs.numeroCuotas = esmereoCuotas;
        if (esmereoFechaVenc) createArgs.fechaVencimiento = esmereoFechaVenc;
      }

      const createStage = beginStage("sales.create", { itemId, formaPago });
      let res: Awaited<ReturnType<typeof createSale>>;
      try {
        res = await createSale(createArgs);
        createStage.ok({ saleId: res.saleId });
      } catch (err) {
        createStage.fail(err);
        throw err;
      }

      // From here on, failures are non-blocking — the sale is recorded.
      // PDF + email steps surface as toasts so the operator can retry
      // without losing the sale.
      const slug = slugifyBuyerName(selectedClient?.nombre ?? "cliente");
      const now = new Date();
      const subPath = `ventas/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;

      const uploadPdf = async (
        blob: Blob,
        filename: string,
      ): Promise<string> => {
        const fd = new FormData();
        fd.append("subPath", subPath);
        fd.append(
          "file",
          new File([blob], filename, { type: "application/pdf" }),
        );
        const r = await fetch("/api/media-upload", {
          method: "POST",
          body: fd,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as {
          success?: boolean;
          urls?: string[];
          error?: string;
        };
        if (!data.success || !data.urls?.[0]) {
          throw new Error(data.error ?? "Drive devolvió respuesta sin URL");
        }
        return data.urls[0];
      };

      // ── Carnet ────────────────────────────────────────────────────────
      let carnetUrl: string | null = null;
      const carnetStage = beginStage("carnet", { saleId: res.saleId, subPath });
      try {
        if (!kardexRef.current) throw new Error("Kardex DOM no listo");
        const carnetBlob = await exportCarnet(
          kardexRef.current,
          `${res.saleId}-${slug}.pdf`,
          { download: false },
        );
        carnetUrl = await uploadPdf(carnetBlob, `${res.saleId}-${slug}.pdf`);
        await setCarnetUrl({ id: res.id, carnetUrl });
        carnetStage.ok({ bytes: carnetBlob.size });
      } catch (err) {
        carnetStage.fail(err);
        const msg = err instanceof Error ? err.message : String(err);
        notify(`Venta guardada, PDF en cola: ${msg}`, "warning", {
          action: {
            label: "Reintentar",
            onClick: () => {
              void (async () => {
                try {
                  if (!kardexRef.current) return;
                  const blob = await exportCarnet(
                    kardexRef.current,
                    `${res.saleId}-${slug}.pdf`,
                    { download: false },
                  );
                  const url = await uploadPdf(
                    blob,
                    `${res.saleId}-${slug}.pdf`,
                  );
                  await setCarnetUrl({ id: res.id, carnetUrl: url });
                  notify("Kardex subido a Drive", "success");
                } catch (e) {
                  notify(
                    `Reintento falló: ${e instanceof Error ? e.message : String(e)}`,
                    "error",
                  );
                }
              })();
            },
          },
        });
      }

      // ── Certificado (gated by Q-6 legal approval) ─────────────────────
      let certificadoUrl: string | null = null;
      if (isCertificadoApproved()) {
        const certStage = beginStage("certificado", { saleId: res.saleId });
        try {
          if (!certificadoRef.current)
            throw new Error("Certificado DOM no listo");
          const certBlob = await exportCertificado(
            certificadoRef.current,
            `${res.saleId}-${slug}-certificado.pdf`,
            { download: false },
          );
          certificadoUrl = await uploadPdf(
            certBlob,
            `${res.saleId}-${slug}-certificado.pdf`,
          );
          await setCertificadoUrl({ id: res.id, certificadoUrl });
          certStage.ok({ bytes: certBlob.size });
        } catch (err) {
          certStage.fail(err);
          const msg = err instanceof Error ? err.message : String(err);
          notify(`Certificado falló: ${msg}`, "warning");
        }
      } else {
        logStage("certificado:skipped", { reason: "VITE_CERT_LEGAL_APPROVED" });
        // Toast at most once per browser session — Maritza will see this
        // every sale otherwise until Q-6 ships, which becomes noise fast.
        try {
          const KEY = "tm.fotosintesis.certPendingNotified";
          if (typeof window !== "undefined" && !sessionStorage.getItem(KEY)) {
            sessionStorage.setItem(KEY, "1");
            notify(
              "Certificado pendiente · activar VITE_CERT_LEGAL_APPROVED tras aprobación legal (Q-6)",
              "info",
            );
          }
        } catch {
          // sessionStorage can throw in private mode; fall back to toast.
          notify(
            "Certificado pendiente · activar VITE_CERT_LEGAL_APPROVED tras aprobación legal (Q-6)",
            "info",
          );
        }
      }

      // ── Email opcional ────────────────────────────────────────────────
      if (sendEmail && selectedClient?.email && carnetUrl) {
        const emailStage = beginStage("email", {
          saleId: res.saleId,
          to: selectedClient.email,
        });
        try {
          const r = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "ventaKardex",
              data: {
                saleId: res.saleId,
                buyerName: selectedClient.nombre,
                carnetUrl,
                certificadoUrl: certificadoUrl ?? undefined,
              },
              to: selectedClient.email,
            }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          emailStage.ok();
        } catch (err) {
          emailStage.fail(err);
          const msg = err instanceof Error ? err.message : String(err);
          notify(`Email no se pudo enviar: ${msg}`, "warning");
        }
      }

      logStage("confirm:success", {
        saleId: res.saleId,
        carnetUploaded: Boolean(carnetUrl),
        certificadoUploaded: Boolean(certificadoUrl),
        emailRequested: sendEmail,
      });
      notify(`Venta ${res.saleId} confirmada`, "success");
      navigate("/admin/fotosintesis");
    } catch (err) {
      logFailure("confirm", err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    sede,
    itemId,
    clientId,
    precioCop,
    totalCop,
    comisionCop,
    compradorTipo,
    formaPago,
    metodoContado,
    fechaVenta,
    creditoFechaVenc,
    creditoCuotas,
    esmereoCuotas,
    esmereoFechaVenc,
    adicionales,
    selectedClient,
    sendEmail,
    createSale,
    setCarnetUrl,
    setCertificadoUrl,
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
            value: user?.givenName || user?.name?.split(" ")[0] || "Operador",
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

          {/* 0. Bóveda */}
          <Section title="Bóveda" foto={foto}>
            <SegmentedControl<Sede>
              ariaLabel="Bóveda de la venta"
              allowOther
              otherLabel="Otra…"
              otherPlaceholder="Código de bóveda (ej. MED)…"
              sanitizeOther={sanitizeSedeCode}
              value={sede ?? ("" as Sede)}
              onChange={setSede}
              options={BOVEDAS.map((b) => ({
                value: b.code,
                label: b.label,
              }))}
            />
          </Section>

          {/* 1. Comprador */}
          <Section title="Comprador" foto={foto}>
            <SegmentedControl<CompradorTipo>
              ariaLabel="Tipo de comprador"
              allowOther
              otherLabel="Otro…"
              otherPlaceholder="Escribir tipo de comprador…"
              value={compradorTipo}
              onChange={setCompradorTipo}
              options={[
                { value: "embajador", label: "Embajador" },
                { value: "final", label: "Cliente final" },
              ]}
            />

            <Box sx={{ marginTop: "16px" }}>
              {/* Embajador uses the asesor picker; "final" and any custom write-in
                  buyer type are captured through the cliente-final form (which
                  persists the custom tipo onto the client). */}
              {compradorTipo !== "embajador" ? (
                <ClienteFinalForm
                  tipo={compradorTipo}
                  allClients={(allClients ?? []) as ClienteRow[]}
                  selectedClient={
                    selectedClient && selectedClient.tipo !== "embajador"
                      ? selectedClient
                      : null
                  }
                  onCreated={(id) => setClientId(id)}
                  onChange={() => setClientId(null)}
                />
              ) : (
                <>
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
                      transition:
                        "border-color 120ms ease, box-shadow 120ms ease",
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
                      {(selectedClient?.nombre ?? "?")
                        .slice(0, 1)
                        .toUpperCase()}
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
                        {selectedClient?.nombre ??
                          "— Sin embajador seleccionado —"}
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

                    <ChevronDown
                      size={16}
                      color={foto.ink.tertiary}
                      aria-hidden
                    />

                    {/* Native <select> overlaid for accessibility + keyboard */}
                    <Box
                      component="select"
                      aria-label="Embajador asignado"
                      value={clientId ?? ""}
                      onChange={(e) => {
                        const next = (e.target as HTMLSelectElement).value;
                        // Convex Id<"clients"> is a branded string at the type level
                        // but a plain string at runtime; the value came from a
                        // server-issued `_id` we rendered as an <option>, so it's
                        // safe to cast it back.
                        setClientId(next ? (next as Id<"clients">) : null);
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
                </>
              )}
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
              allowOther
              otherLabel="Otra…"
              otherPlaceholder="Escribir forma de pago…"
              value={formaPago}
              onChange={setFormaPago}
              options={[
                { value: "contado", label: "Contado" },
                { value: "credito", label: "Crédito" },
                { value: "canje", label: "Canje / Trueque" },
                { value: "esmereogenesis", label: "Esmereogénesis" },
                { value: "bajo_pedido", label: "Bajo pedido" },
                { value: "consignacion", label: "Consignación" },
              ]}
            />

            {formaPago === "contado" ? (
              <Box sx={{ marginTop: "14px" }}>
                <FieldLabel>Método de pago</FieldLabel>
                <SegmentedControl<MetodoContado>
                  ariaLabel="Método de pago contado"
                  block
                  allowOther
                  otherLabel="Otro…"
                  otherPlaceholder="Escribir método de pago…"
                  value={metodoContado}
                  onChange={setMetodoContado}
                  options={[
                    { value: "efectivo", label: "Efectivo" },
                    { value: "transferencia", label: "Transferencia" },
                    { value: "crypto", label: "Crypto" },
                  ]}
                />
              </Box>
            ) : null}

            {formaPago === "credito" ? (
              <CreditoFields
                fechaVencimiento={creditoFechaVenc}
                setFechaVencimiento={setCreditoFechaVenc}
                numeroCuotas={creditoCuotas}
                setNumeroCuotas={setCreditoCuotas}
                tasaInteres={creditoTasa}
                setTasaInteres={setCreditoTasa}
                totalCop={precioCop}
              />
            ) : null}

            {formaPago === "esmereogenesis" ? (
              <EsmereogenesisFields
                plazoMeses={esmereoPlazo}
                setPlazoMeses={setEsmereoPlazo}
                numeroCuotas={esmereoCuotas}
                setNumeroCuotas={setEsmereoCuotas}
                observaciones={esmereoNotas}
                setObservaciones={setEsmereoNotas}
                fechaVencimiento={esmereoFechaVenc}
                setFechaVencimiento={setEsmereoFechaVenc}
              />
            ) : null}

            <Box sx={{ marginTop: "16px" }}>
              <FieldLabel optional="notas de cierre">Adicionales</FieldLabel>
              <Box
                component="textarea"
                value={adicionales}
                {...spanishText}
                onChange={(e) =>
                  setAdicionales((e.target as HTMLTextAreaElement).value)
                }
                rows={2}
                placeholder="Condiciones especiales, trueque, entregables…"
                sx={{
                  width: "100%",
                  background: foto.surfaces.inset,
                  border: `1px solid ${foto.surfaces.rule}`,
                  borderRadius: "9px",
                  padding: "11px 14px",
                  fontSize: 13,
                  color: foto.ink.primary,
                  fontFamily: fontFamilies.system,
                  resize: "vertical",
                }}
              />
            </Box>

            <Box sx={{ marginTop: "18px" }}>
              <FieldLabel>Precio acordado (COP)</FieldLabel>
              <NumberInputWithCalc
                value={precioAcordado}
                onChange={setPrecioAcordado}
                format="currency"
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
                <li>
                  El Kardex se sube a Drive en{" "}
                  <code>
                    ventas/
                    {new Date().getFullYear()}/
                    {String(new Date().getMonth() + 1).padStart(2, "0")}
                  </code>
                  .
                </li>
                <li>
                  {isCertificadoApproved()
                    ? "El Certificado de Origen también se sube a Drive."
                    : "El Certificado de Origen queda pendiente hasta que Maritza apruebe Q-6."}
                </li>
                <li>
                  {sendEmail && selectedClient?.email
                    ? `Se le envía un email a ${selectedClient.email} con los PDFs.`
                    : "Se actualiza el dashboard del embajador."}
                </li>
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

          {/* 6. Email opcional */}
          <Section title="Enviar al comprador" foto={foto}>
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
                opacity: selectedClient?.email ? 1 : 0.55,
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
                  Enviar Kardex por email
                </Box>
                <Box sx={{ fontSize: 11.5, color: foto.ink.tertiary }}>
                  {selectedClient?.email
                    ? `Se enviarán los enlaces de Drive a ${selectedClient.email}.`
                    : "Agregá un email al cliente para habilitar el envío."}
                </Box>
              </Box>
              <Switch
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={!selectedClient?.email}
                inputProps={{ "aria-label": "Enviar Kardex por email" }}
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
                metodoContado:
                  formaPago === "contado" ? metodoContado : undefined,
              }}
              privacyOn={privacyOn}
            />
          </Box>

          {/* Certificado preview — mounted in the DOM so html2canvas can
              capture it during the confirm flow. Hidden visually (off-screen
              positioning) until Q-6 legal copy lands. Once approved, we can
              promote it to a visible tab next to the Kardex. */}
          <Box
            ref={certificadoRef}
            aria-hidden
            sx={{
              position: "absolute",
              left: "-99999px",
              top: "auto",
              width: 612 - 96, // matches Kardex paper width for consistent capture
              pointerEvents: "none",
            }}
          >
            <CertificadoPreview
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
                  ? { loteId: lot.loteId, fechaRecepcion: lot.fechaRecepcion }
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
                precioCop,
                formaPago,
                metodoContado:
                  formaPago === "contado" ? metodoContado : undefined,
              }}
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
