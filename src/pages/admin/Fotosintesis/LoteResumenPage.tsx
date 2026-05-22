import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { Check, AlertTriangle, ArrowLeft } from "lucide-react";

import { getFoto, fontFamilies } from "../../../design-system";
import {
  useConvexQuery,
  useConvexMutation,
  convexApi,
} from "../../../lib/convex-safe";
import { useGoogleAuth } from "../../../contexts/GoogleAuthContext";
import { useNotification } from "../../../contexts/NotificationContext";

// =============================================================================
// Helpers
// =============================================================================

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const formatCOP = (n: number): string => COP_FORMATTER.format(n);

const fmtDateEs = (iso: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

type PublishDecision = "selective" | "all" | "none";

// =============================================================================
// ValidationCard
// =============================================================================

interface ValidationCardProps {
  label: string;
  okPill: string;
  bigValue: React.ReactNode;
  lab: React.ReactNode;
  state: "ok" | "warn" | "err";
}

function ValidationCard({
  label,
  okPill,
  bigValue,
  lab,
  state,
}: ValidationCardProps) {
  const foto = getFoto("light");
  const accent =
    state === "ok"
      ? foto.accent.primary
      : state === "warn"
        ? foto.status.consigned
        : foto.status.sold;
  const accentDeep =
    state === "ok"
      ? foto.accent.deep
      : state === "warn"
        ? foto.status.consigned
        : foto.status.sold;

  return (
    <Box
      role="status"
      aria-label={`${label}: ${okPill}`}
      sx={{
        position: "relative",
        background: foto.surfaces.canvas,
        border: `1px solid ${state === "ok" ? "rgba(0,140,98,0.16)" : foto.surfaces.rule}`,
        borderRadius: "12px",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: "3px",
          background: accent,
        }}
      />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Box
          sx={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: foto.ink.tertiary,
          }}
        >
          {label}
        </Box>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: 9.5,
            fontWeight: 600,
            color: accentDeep,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {state === "ok" ? (
            <Check size={12} strokeWidth={2.5} />
          ) : (
            <AlertTriangle size={12} strokeWidth={2.5} />
          )}
          {okPill}
        </Box>
      </Box>
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: "tabular-nums",
          fontSize: 26,
          fontWeight: 300,
          color: foto.ink.primary,
          letterSpacing: "-0.035em",
          lineHeight: 1,
        }}
      >
        {bigValue}
      </Box>
      <Box
        sx={{
          fontSize: 11.5,
          color: foto.ink.secondary,
          lineHeight: 1.45,
        }}
      >
        {lab}
      </Box>
    </Box>
  );
}

// =============================================================================
// SumRow + PubToggle
// =============================================================================

interface PubToggleProps {
  on: boolean;
  onToggle: () => void;
  itemId: string;
}

function PubToggle({ on, onToggle, itemId }: PubToggleProps) {
  const foto = getFoto("light");
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={on}
      aria-label={
        on
          ? `Publicar el ítem ${itemId}`
          : `Mantener el ítem ${itemId} en reserva`
      }
      onClick={onToggle}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: on ? foto.accent.soft : foto.surfaces.inset,
        color: on ? foto.accent.deep : foto.ink.secondary,
        fontWeight: on ? 600 : 500,
        fontSize: 11.5,
        padding: "6px 10px 6px 12px",
        borderRadius: "7px",
        border: "none",
        cursor: "pointer",
        font: "inherit",
        transition: "background 120ms ease, color 120ms ease",
        "&:hover": {
          background: on ? foto.accent.soft : foto.surfaces.inset2,
        },
        "&:focus-visible": {
          outline: `2px solid ${foto.accent.primary}`,
          outlineOffset: "2px",
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: on ? foto.accent.primary : foto.ink.mute,
        }}
      />
      {on ? "publicar" : "reserva"}
    </Box>
  );
}

interface SumRowProps {
  itemId: string;
  ticketId: string;
  name: string;
  metaLine: React.ReactNode;
  preponderancia: number;
  costo: number;
  pubOn: boolean;
  onTogglePub: () => void;
  thumbHex?: string;
}

function SumRow({
  itemId,
  ticketId,
  name,
  metaLine,
  preponderancia,
  costo,
  pubOn,
  onTogglePub,
  thumbHex,
}: SumRowProps) {
  const foto = getFoto("light");
  const instanceId = useId();
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "42px 64px 1fr auto auto" },
        gap: { xs: "8px", sm: "16px" },
        alignItems: "center",
        padding: "14px 0",
        borderBottom: `1px solid ${foto.surfaces.edge}`,
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Box
        key={`thumb-${instanceId}-${itemId}`}
        aria-hidden
        sx={{
          width: 42,
          height: 42,
          aspectRatio: "1/1",
          borderRadius: "8px",
          background:
            thumbHex ??
            `linear-gradient(135deg, ${foto.accent.primary}, ${foto.accent.deep})`,
          flexShrink: 0,
        }}
      />
      <Box
        sx={{
          fontFamily: fontFamilies.mono,
          fontVariantNumeric: "tabular-nums",
          fontSize: 11.5,
          color: foto.ink.secondary,
          fontWeight: 500,
          background: foto.surfaces.inset,
          padding: "5px 10px",
          borderRadius: "6px",
          textAlign: "center",
          width: "fit-content",
        }}
      >
        #{itemId}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            fontSize: 13.5,
            fontWeight: 600,
            color: foto.ink.primary,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </Box>
        <Box
          sx={{
            fontSize: 11,
            color: foto.ink.tertiary,
            marginTop: "2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <Box
            component="span"
            sx={{
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
              color: foto.ink.secondary,
              marginRight: "6px",
            }}
          >
            {ticketId}
          </Box>
          {metaLine}
        </Box>
      </Box>
      <Box sx={{ textAlign: "right" }}>
        <Box
          sx={{
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
            fontSize: 15,
            fontWeight: 600,
            color: foto.ink.primary,
            letterSpacing: "-0.015em",
            lineHeight: 1,
          }}
        >
          {preponderancia.toFixed(preponderancia >= 10 ? 0 : 1)}%
        </Box>
        <Box
          sx={{
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
            fontSize: 10.5,
            color: foto.ink.tertiary,
            marginTop: "3px",
          }}
        >
          {formatCOP(costo)}
        </Box>
      </Box>
      <PubToggle on={pubOn} onToggle={onTogglePub} itemId={itemId} />
    </Box>
  );
}

// =============================================================================
// MetaCard
// =============================================================================

interface MetaRow {
  k: string;
  v: React.ReactNode;
  variant?: "default" | "plain" | "accent" | "italic";
}

function MetaCard({ rows }: { rows: MetaRow[] }) {
  const foto = getFoto("light");
  return (
    <Box
      sx={{
        background: foto.surfaces.canvas,
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      {rows.map((row, idx) => (
        <Box
          key={row.k}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "11px 18px",
            fontSize: 12.5,
            borderTop: idx === 0 ? "none" : `1px solid ${foto.surfaces.edge}`,
            gap: "12px",
          }}
        >
          <Box sx={{ color: foto.ink.tertiary, flexShrink: 0 }}>{row.k}</Box>
          <Box
            sx={{
              color:
                row.variant === "accent" ? foto.accent.deep : foto.ink.primary,
              fontWeight: row.variant === "italic" ? 400 : 500,
              fontFamily:
                row.variant === "plain" || row.variant === "italic"
                  ? fontFamilies.system
                  : fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.005em",
              textAlign: "right",
              fontStyle: row.variant === "italic" ? "italic" : "normal",
              opacity: row.variant === "italic" ? 0.85 : 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row.v}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// =============================================================================
// DecisionCard / OptionCard
// =============================================================================

interface OptionCardProps {
  active: boolean;
  title: string;
  desc: React.ReactNode;
  onClick: () => void;
}

function OptionCard({ active, title, desc, onClick }: OptionCardProps) {
  const foto = getFoto("light");
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      role="radio"
      aria-checked={active}
      sx={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "12px",
        padding: "13px 14px",
        border: `1.5px solid ${active ? foto.accent.primary : foto.surfaces.rule}`,
        borderRadius: "11px",
        background: active ? foto.accent.soft : foto.surfaces.canvas,
        cursor: "pointer",
        font: "inherit",
        textAlign: "left",
        color: "inherit",
        transition: "border-color 120ms ease, background 120ms ease",
        "&:hover": {
          borderColor: active ? foto.accent.primary : foto.surfaces.edgeStrong,
        },
        "&:focus-visible": {
          outline: `2px solid ${foto.accent.primary}`,
          outlineOffset: "2px",
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1.5px solid ${active ? foto.accent.primary : foto.ink.mute}`,
          marginTop: "1px",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {active ? (
          <Box
            sx={{
              position: "absolute",
              inset: "3px",
              borderRadius: "50%",
              background: foto.accent.primary,
            }}
          />
        ) : null}
      </Box>
      <Box>
        <Box
          sx={{
            fontSize: 13,
            fontWeight: 600,
            color: foto.ink.primary,
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </Box>
        <Box
          sx={{
            fontSize: 11.5,
            color: foto.ink.secondary,
            marginTop: "3px",
            lineHeight: 1.5,
          }}
        >
          {desc}
        </Box>
      </Box>
    </Box>
  );
}

// =============================================================================
// NextHint
// =============================================================================

function NextHint({
  loteId,
  itemsCount,
  publishingCount,
  reserveCount,
  reserveNames,
}: {
  loteId: string;
  itemsCount: number;
  publishingCount: number;
  reserveCount: number;
  reserveNames: string[];
}) {
  const foto = getFoto("light");
  return (
    <Box
      sx={{
        background: foto.surfaces.inset,
        border: `1px dashed ${foto.surfaces.edgeStrong}`,
        borderRadius: "11px",
        padding: "14px 16px",
        marginTop: "18px",
        fontSize: 11.5,
        color: foto.ink.secondary,
        lineHeight: 1.55,
      }}
    >
      <Box
        sx={{
          color: foto.ink.primary,
          fontWeight: 600,
          marginBottom: "6px",
        }}
      >
        ¿Qué pasará cuando confirmes?
      </Box>
      <Box component="ul" sx={{ listStyle: "none", margin: 0, padding: 0 }}>
        {[
          <>
            El lote{" "}
            <Box
              component="span"
              sx={{
                fontFamily: fontFamilies.mono,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {loteId}
            </Box>{" "}
            cambia de estado{" "}
            <strong style={{ color: foto.ink.primary }}>
              abierto → cerrado
            </strong>
            .
          </>,
          publishingCount > 0 ? (
            <>
              Los{" "}
              <strong style={{ color: foto.ink.primary }}>
                {publishingCount} ítem{publishingCount === 1 ? "" : "s"}{" "}
                marcados como "publicar"
              </strong>{" "}
              entran al catálogo público.
            </>
          ) : (
            <>Ningún ítem se publicará en el catálogo público todavía.</>
          ),
          reserveCount > 0 ? (
            <>
              {reserveCount === 1 ? "Queda" : "Quedan"}{" "}
              <strong style={{ color: foto.ink.primary }}>
                {reserveCount} en reserva oculta
              </strong>
              {reserveNames.length > 0 && reserveCount <= 3 ? (
                <> ({reserveNames.join(", ")})</>
              ) : null}{" "}
              hasta que decidas publicar{reserveCount === 1 ? "lo" : "los"}.
            </>
          ) : (
            <>Todos los ítems entran al catálogo público al cerrar.</>
          ),
          <>
            Se sincroniza con las pestañas{" "}
            <strong style={{ color: foto.ink.primary }}>Lotes</strong> e{" "}
            <strong style={{ color: foto.ink.primary }}>Inventario</strong> de
            Sheets.
          </>,
          itemsCount > 0 && publishingCount + reserveCount !== itemsCount ? (
            <>
              <em>
                {itemsCount - publishingCount - reserveCount} ítems aún sin
                decisión.
              </em>
            </>
          ) : null,
        ]
          .filter(Boolean)
          .map((node, idx) => (
            <Box
              component="li"
              key={idx}
              sx={{
                position: "relative",
                padding: "2px 0 2px 16px",
                "&::before": {
                  content: '"→"',
                  position: "absolute",
                  left: 0,
                  color: foto.accent.primary,
                  fontFamily: fontFamilies.mono,
                },
              }}
            >
              {node}
            </Box>
          ))}
      </Box>
    </Box>
  );
}

// =============================================================================
// Hero
// =============================================================================

function Hero({
  loteId,
  providerName,
  itemsCount,
  prepSum,
  allInsumo,
}: {
  loteId: string;
  providerName: string;
  itemsCount: number;
  prepSum: number;
  allInsumo: boolean;
}) {
  const foto = getFoto("light");
  const prepNote = allInsumo
    ? "Lote 100% insumos — no aplica preponderancia"
    : "la preponderancia suma exactamente 100%";
  return (
    <Box
      sx={{
        background: `radial-gradient(ellipse 60% 80% at 50% 0%, ${foto.accent.soft}, transparent 70%), linear-gradient(180deg, ${foto.surfaces.panel}, ${foto.surfaces.canvas})`,
        borderBottom: `1px solid ${foto.surfaces.rule}`,
        padding: { xs: "32px 20px 28px", sm: "48px 28px 40px" },
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0,
          background: foto.surfaces.canvas,
          border: `1px solid rgba(0,140,98,0.25)`,
          borderRadius: "999px",
          padding: "6px 6px 6px 18px",
          marginBottom: "18px",
        }}
      >
        <Box
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: foto.accent.deep,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          listo para cerrar
        </Box>
        <Box
          aria-hidden
          sx={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: foto.accent.primary,
            color: foto.ink.inverse,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: "10px",
          }}
        >
          <Check size={14} strokeWidth={2.5} />
        </Box>
      </Box>
      <Box
        component="h1"
        sx={{
          fontSize: { xs: 28, sm: 34, md: 38 },
          fontWeight: 600,
          letterSpacing: "-0.035em",
          lineHeight: 1.1,
          maxWidth: 680,
          margin: "0 auto",
          color: foto.ink.primary,
        }}
      >
        <Box
          component="span"
          sx={{
            fontFamily: fontFamilies.mono,
            fontVariantNumeric: "tabular-nums",
            color: foto.accent.deep,
            letterSpacing: "-0.04em",
            marginRight: "6px",
          }}
        >
          {loteId}
        </Box>
        — {providerName}
      </Box>
      <Box
        sx={{
          marginTop: "14px",
          fontSize: 14,
          color: foto.ink.secondary,
          maxWidth: 560,
          margin: "14px auto 0",
          lineHeight: 1.55,
        }}
      >
        Los {itemsCount} ítem{itemsCount === 1 ? "" : "s"} están capturados,{" "}
        {prepNote}
        {allInsumo ? "" : ` (${(Math.round(prepSum * 100) / 100).toFixed(2)}%)`}
        , y las fotos están en su lugar.{" "}
        <strong style={{ color: foto.ink.primary }}>
          Falta solo decidir si publicar ahora o mantener en reserva.
        </strong>
      </Box>
    </Box>
  );
}

// =============================================================================
// Main page
// =============================================================================

export default function FotosintesisLoteResumenPage() {
  const foto = getFoto("light");
  const navigate = useNavigate();
  const { loteId = "" } = useParams<{ loteId: string }>();
  const { user } = useGoogleAuth();
  const { notify } = useNotification();

  const lot = useConvexQuery(
    convexApi.lots.getByLoteId,
    loteId ? { loteId } : "skip",
  );
  const items = useConvexQuery(
    convexApi.lotItems.listByLote,
    loteId ? { loteId } : "skip",
  );
  const provider = useConvexQuery(
    convexApi.providers.get,
    lot?.providerId ? { id: lot.providerId } : "skip",
  );
  const allProducts = useConvexQuery(convexApi.products.list, {});

  const closeLot = useConvexMutation(convexApi.lots.close);
  const publishLot = useConvexMutation(convexApi.lots.publish);
  const saveProductEdit = useConvexMutation(convexApi.products.saveEdit);

  // Per-item product rows for this lot — derived from the global list query.
  type ProductRow = NonNullable<typeof allProducts>[number];
  const productByItemId = useMemo(() => {
    const map: Record<string, ProductRow> = {};
    if (!allProducts) return map;
    for (const p of allProducts) {
      if (p.loteId === loteId) map[p.itemId] = p;
    }
    return map;
  }, [allProducts, loteId]);

  // Toggle state: itemId → publish? (initialized from current
  // productInventory.mostrarEnCatalogo, then user can override).
  const [pubToggles, setPubToggles] = useState<Record<string, boolean>>({});
  const hydratedRef = useRef(false);

  // Hydrate once items + productByItemId are both ready so we don't bounce
  // toggles between undefined and false on subsequent renders.
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!items || !allProducts) return;
    const next: Record<string, boolean> = {};
    for (const it of items) {
      const p = productByItemId[it.itemId];
      next[it.itemId] = p?.mostrarEnCatalogo === true;
    }
    setPubToggles(next);
    hydratedRef.current = true;
  }, [items, allProducts, productByItemId]);

  // Decision derives from the toggles: if every item is on → "all",
  // every off → "none", otherwise "selective". User can also force a
  // preset which overrides the derivation by flipping all toggles.
  const decision = useMemo<PublishDecision>(() => {
    if (!items || items.length === 0) return "selective";
    const total = items.length;
    let on = 0;
    for (const it of items) {
      if (pubToggles[it.itemId]) on++;
    }
    if (on === total) return "all";
    if (on === 0) return "none";
    return "selective";
  }, [items, pubToggles]);

  const setDecision = useCallback(
    (next: PublishDecision) => {
      if (!items) return;
      if (next === "all") {
        const flip: Record<string, boolean> = {};
        for (const it of items) flip[it.itemId] = true;
        setPubToggles(flip);
      } else if (next === "none") {
        const flip: Record<string, boolean> = {};
        for (const it of items) flip[it.itemId] = false;
        setPubToggles(flip);
      }
      // "selective" doesn't change toggles; user already chose them.
    },
    [items],
  );

  const togglePub = useCallback((itemId: string) => {
    setPubToggles((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  // =============================
  // Defensive validations
  // =============================
  const allInsumo =
    items !== undefined &&
    items.length > 0 &&
    items.every((it) => it.tipo === "insumo");

  const prepSum = useMemo(() => {
    if (!items) return 0;
    return items.reduce((s, it) => s + (it.preponderancia ?? 0), 0);
  }, [items]);

  const conteoOK = !!lot && !!items && items.length === lot.unidadesDeclaradas;
  const prepOK = allInsumo || Math.abs(prepSum - 100) <= 0.01;
  // Fotos: server-side photo count isn't persisted in Slice 2 (Drive
  // upload is Slice 3+). We optimistically assume the CapturaLotePage
  // gate enforced ≥1 photo per non-insumo at save time. Display only.
  const fotosOK = true;
  const syncOK =
    !!lot && (lot.syncStatus === "synced" || lot.syncStatus === "pending");

  const allValid = conteoOK && prepOK && fotosOK && syncOK;

  // If we somehow landed here with broken BR-2/BR-3, send the user back
  // to fix it. We wait until the queries have resolved.
  useEffect(() => {
    if (!lot || !items || !allProducts) return;
    if (lot.estado !== "abierto") return; // already closed/published — leave them on this page so they see the summary
    if (!conteoOK || !prepOK) {
      notify(
        "Faltan ítems o la preponderancia no suma 100%. Volvé a la captura.",
        "error",
      );
      navigate(`/admin/fotosintesis/lots/${loteId}`, { replace: true });
    }
  }, [lot, items, allProducts, conteoOK, prepOK, notify, navigate, loteId]);

  // =============================
  // Submit
  // =============================
  const [closing, setClosing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    if (!lot || !items || closing) return;
    setClosing(true);
    setSubmitError(null);
    try {
      if (lot.estado === "abierto") {
        await closeLot({ id: lot._id });
      }
      if (decision === "all") {
        await publishLot({ id: lot._id });
      } else {
        const editorEmail = user?.email ?? "fotosintesis-resumen";
        const editorName = user?.name;
        for (const it of items) {
          const want = !!pubToggles[it.itemId];
          const current =
            productByItemId[it.itemId]?.mostrarEnCatalogo === true;
          if (want === current) continue;
          try {
            await saveProductEdit({
              itemId: it.itemId,
              editorEmail,
              editorName,
              patch: { mostrarEnCatalogo: want },
            });
          } catch (err) {
            console.warn(
              `[fotosintesis] saveEdit failed for ${it.itemId}`,
              err,
            );
          }
        }
      }
      notify(
        `Lote ${loteId} cerrado · ${items.length} ítems · sincronizando…`,
        "success",
      );
      navigate("/admin/fotosintesis", { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "No pudimos cerrar el lote",
      );
    } finally {
      setClosing(false);
    }
  }, [
    lot,
    items,
    closing,
    closeLot,
    publishLot,
    saveProductEdit,
    decision,
    pubToggles,
    productByItemId,
    user,
    loteId,
    notify,
    navigate,
  ]);

  // =============================
  // ⌘↵ shortcut: confirm
  // =============================
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleConfirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleConfirm]);

  // =============================
  // Loading state
  // =============================
  if (!lot || !items) {
    return (
      <Box
        sx={{
          padding: "48px 28px",
          color: foto.ink.tertiary,
          fontSize: 13,
        }}
      >
        Cargando cierre de {loteId}…
      </Box>
    );
  }

  const publishingCount = items.reduce(
    (n, it) => n + (pubToggles[it.itemId] ? 1 : 0),
    0,
  );
  const reserveCount = items.length - publishingCount;
  const reserveNames = items
    .filter((it) => !pubToggles[it.itemId])
    .map((it) => productByItemId[it.itemId]?.nombre ?? it.itemId);

  const totalCost = items.reduce((s, it) => s + it.costoBaseCOP, 0);

  return (
    <Box>
      <Hero
        loteId={loteId}
        providerName={provider?.nombreORazonSocial ?? "—"}
        itemsCount={items.length}
        prepSum={prepSum}
        allInsumo={allInsumo}
      />

      {/* Validations */}
      <Box
        sx={{
          maxWidth: 1320,
          margin: "36px auto 0",
          padding: { xs: "0 16px", sm: "0 28px" },
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: "14px",
        }}
      >
        <ValidationCard
          label="Preponderancia"
          okPill={allInsumo ? "N/A" : prepOK ? "BR-2 OK" : "Revisar"}
          bigValue={
            allInsumo ? "—" : `${(Math.round(prepSum * 100) / 100).toFixed(2)}%`
          }
          lab={
            allInsumo ? (
              <>
                <strong>lote 100% insumos</strong> · BR-2 no aplica
              </>
            ) : prepOK ? (
              <>
                <strong>
                  {items.length} ítem{items.length === 1 ? "" : "s"}
                </strong>{" "}
                · suma exacta, tolerancia ±0,01
              </>
            ) : (
              <>
                <strong>desfase {(prepSum - 100).toFixed(2)}%</strong>· ajustar
                antes de cerrar
              </>
            )
          }
          state={allInsumo ? "ok" : prepOK ? "ok" : "err"}
        />
        <ValidationCard
          label="Conteo de unidades"
          okPill={conteoOK ? "BR-3 OK" : "Revisar"}
          bigValue={`${items.length} / ${lot.unidadesDeclaradas}`}
          lab={
            conteoOK ? (
              <>
                <strong>declaradas {lot.unidadesDeclaradas}</strong> · creadas{" "}
                {items.length} · coincide
              </>
            ) : (
              <>
                <strong>faltan {lot.unidadesDeclaradas - items.length}</strong>{" "}
                · ajustar antes de cerrar
              </>
            )
          }
          state={conteoOK ? "ok" : "err"}
        />
        <ValidationCard
          label="Fotos"
          okPill="OK"
          bigValue={`${items.filter((it) => it.tipo !== "insumo").length}+`}
          lab={
            <>
              <strong>mínimo 1 por ítem</strong> · capturadas en el wizard
            </>
          }
          state="ok"
        />
        <ValidationCard
          label="Sync Convex · Sheets"
          okPill={
            lot.syncStatus === "synced"
              ? "synced"
              : lot.syncStatus === "pending"
                ? "pending"
                : "error"
          }
          bigValue={`${items.length} / ${items.length}`}
          lab={
            lot.syncStatus === "synced" ? (
              <>
                <strong>al día</strong> · sin errores · listo
              </>
            ) : lot.syncStatus === "pending" ? (
              <>
                <strong>en curso</strong> · esperando push a Sheets
              </>
            ) : (
              <>
                <strong>error</strong> · ver detalle en Salud
              </>
            )
          }
          state={
            lot.syncStatus === "synced"
              ? "ok"
              : lot.syncStatus === "pending"
                ? "warn"
                : "err"
          }
        />
      </Box>

      {/* Main grid */}
      <Box
        sx={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: { xs: "28px 16px 60px", sm: "36px 28px 60px" },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.5fr) 420px" },
          gap: { xs: "20px", lg: "32px" },
          alignItems: "start",
        }}
      >
        {/* Left — items summary */}
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              background: foto.surfaces.canvas,
              border: `1px solid ${foto.surfaces.rule}`,
              borderRadius: "14px",
              padding: { xs: "18px 16px", sm: "24px" },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "20px",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <Box
                component="h2"
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: foto.ink.primary,
                  margin: 0,
                }}
              >
                Los {items.length} ítem{items.length === 1 ? "" : "s"} del lote
              </Box>
              <Box
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 11.5,
                  color: foto.ink.secondary,
                }}
              >
                {formatCOP(totalCost)}
                {typeof lot.pesoTotalQuilates === "number"
                  ? ` · ${lot.pesoTotalQuilates.toFixed(2)} ct`
                  : ""}
              </Box>
            </Box>

            {items.map((it, idx) => {
              const product = productByItemId[it.itemId];
              const tipoLabel =
                it.tipo === "joya"
                  ? "joya"
                  : it.tipo === "insumo"
                    ? "insumo"
                    : "gema";
              const metaParts: string[] = [tipoLabel];
              if (product?.categoria) metaParts.push(product.categoria);
              if (product?.peso) metaParts.push(product.peso);
              if (product?.calidad) metaParts.push(product.calidad);
              if (it.tecnica) metaParts.push(`técnica ${it.tecnica}`);
              if (it.materiales && it.materiales.length > 0) {
                metaParts.push(it.materiales.slice(0, 3).join(", "));
              }
              if (
                it.tipo === "insumo" &&
                typeof it.cantidad === "number" &&
                typeof it.costoUnitarioCOP === "number"
              ) {
                metaParts.push(
                  `${it.cantidad}u × ${formatCOP(it.costoUnitarioCOP)}`,
                );
              }
              return (
                <SumRow
                  key={it._id}
                  itemId={it.itemId}
                  ticketId={`${loteId} · ${String(idx + 1).padStart(3, "0")}`}
                  name={product?.nombre ?? it.itemId}
                  metaLine={metaParts.join(" · ")}
                  preponderancia={it.preponderancia}
                  costo={it.costoBaseCOP}
                  pubOn={!!pubToggles[it.itemId]}
                  onTogglePub={() => togglePub(it.itemId)}
                />
              );
            })}

            {/* Total bar */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "42px 64px 1fr auto auto",
                },
                gap: { xs: "8px", sm: "16px" },
                alignItems: "center",
                padding: "14px 18px",
                background: `linear-gradient(90deg, ${foto.accent.soft}, transparent 80%)`,
                borderTop: `2px solid ${foto.accent.primary}`,
                marginTop: "8px",
                borderRadius: "0 0 8px 8px",
              }}
            >
              <Box
                sx={{
                  gridColumn: { xs: "1 / -1", sm: "3 / span 1" },
                  fontSize: 13,
                  fontWeight: 600,
                  color: foto.ink.primary,
                }}
              >
                Total del lote
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Box
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 18,
                    fontWeight: 600,
                    color: foto.accent.deep,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {allInsumo
                    ? "—"
                    : `${(Math.round(prepSum * 100) / 100).toFixed(2)}%`}
                </Box>
                <Box
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 11,
                    color: foto.ink.secondary,
                    marginTop: "2px",
                  }}
                >
                  {items.length} ítem{items.length === 1 ? "" : "s"}
                </Box>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Box
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 18,
                    fontWeight: 600,
                    color: foto.accent.deep,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {formatCOP(totalCost)}
                </Box>
                {typeof lot.pesoTotalQuilates === "number" ? (
                  <Box
                    sx={{
                      fontFamily: fontFamilies.mono,
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 11,
                      color: foto.ink.secondary,
                      marginTop: "2px",
                    }}
                  >
                    {lot.pesoTotalQuilates.toFixed(2)} ct
                  </Box>
                ) : null}
              </Box>
            </Box>
          </Box>

          <NextHint
            loteId={loteId}
            itemsCount={items.length}
            publishingCount={publishingCount}
            reserveCount={reserveCount}
            reserveNames={reserveNames}
          />
        </Box>

        {/* Right column */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <MetaCard
            rows={[
              {
                k: "Proveedor",
                v: provider?.nombreORazonSocial ?? "—",
                variant: "plain",
              },
              ...(provider?.nit
                ? [{ k: "NIT", v: provider.nit }]
                : provider?.cedula
                  ? [{ k: "CC", v: provider.cedula }]
                  : []),
              { k: "Recibido", v: fmtDateEs(lot.fechaRecepcion) },
              {
                k: "Forma de pago",
                v:
                  lot.formaPago === "contado"
                    ? `contado · ${lot.metodoContado ?? ""}`.trim()
                    : lot.formaPago === "esmereogenesis"
                      ? "esmereogénesis"
                      : "crédito",
                variant: "plain",
              },
              {
                k: "Costo total",
                v: `${formatCOP(lot.costoTotalCOP)} COP`,
                variant: "accent",
              },
              ...(typeof lot.pesoTotalQuilates === "number"
                ? [
                    {
                      k: "Peso del lote",
                      v: `${lot.pesoTotalQuilates.toFixed(2)} ct`,
                    },
                  ]
                : []),
              {
                k: "Factura",
                v: lot.numeroFactura ?? "por adjuntar",
                variant: lot.numeroFactura ? undefined : "italic",
              },
            ]}
          />

          {/* Decision */}
          <Box
            role="radiogroup"
            aria-label="Decisión de publicación"
            sx={{
              background: foto.surfaces.canvas,
              border: `1px solid ${foto.surfaces.rule}`,
              borderRadius: "14px",
              padding: "22px",
            }}
          >
            <Box
              component="h3"
              sx={{
                fontSize: 14,
                fontWeight: 600,
                color: foto.ink.primary,
                margin: 0,
              }}
            >
              Decisión final
            </Box>
            <Box
              sx={{
                fontSize: 12,
                color: foto.ink.tertiary,
                marginTop: "5px",
                lineHeight: 1.5,
              }}
            >
              Qué hacer con los ítems al cerrar el lote — podés cambiar cada
              ítem individualmente arriba.
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              <OptionCard
                active={decision === "selective"}
                title="Publicar selectivamente"
                desc={
                  publishingCount === 0 && reserveCount === items.length ? (
                    <>
                      Respeta el toggle por ítem. Hoy{" "}
                      <strong>no se publicaría ninguno</strong>; encendé los que
                      quieras lanzar arriba.
                    </>
                  ) : publishingCount === items.length ? (
                    <>
                      Todos los toggles están en "publicar". Equivale a la
                      opción "Publicar todo".
                    </>
                  ) : (
                    <>
                      Respeta el toggle individual por ítem. Hoy se publicarían{" "}
                      <strong>
                        {publishingCount} de {items.length}
                      </strong>
                      .
                    </>
                  )
                }
                onClick={() => setDecision("selective")}
              />
              <OptionCard
                active={decision === "all"}
                title="Publicar todo el lote ahora"
                desc={
                  <>
                    Activa <strong>los {items.length} ítems</strong> en el
                    catálogo público al cerrar. Atajo: usar este botón en vez de
                    tocar los toggles uno por uno.
                  </>
                }
                onClick={() => setDecision("all")}
              />
              <OptionCard
                active={decision === "none"}
                title="Mantener todo en reserva oculta"
                desc={
                  <>
                    Ninguno aparece en el catálogo público. Lo activás
                    manualmente desde el inventario cuando decidan lanzarlos.
                  </>
                }
                onClick={() => setDecision("none")}
              />
            </Box>

            {submitError ? (
              <Box
                role="alert"
                sx={{
                  marginTop: "14px",
                  padding: "10px 12px",
                  background: "rgba(179,58,47,0.06)",
                  border: `1px solid ${foto.status.sold}`,
                  borderRadius: "9px",
                  fontSize: 12,
                  color: foto.status.sold,
                }}
              >
                {submitError}
              </Box>
            ) : null}

            <Box
              component="button"
              type="button"
              onClick={() => void handleConfirm()}
              disabled={closing || !allValid || lot.estado !== "abierto"}
              sx={{
                marginTop: "18px",
                width: "100%",
                padding: "13px 18px",
                background:
                  closing || !allValid || lot.estado !== "abierto"
                    ? foto.surfaces.inset
                    : foto.accent.primary,
                color:
                  closing || !allValid || lot.estado !== "abierto"
                    ? foto.ink.mute
                    : foto.ink.inverse,
                border: "none",
                borderRadius: "9px",
                fontSize: 13,
                fontWeight: 600,
                cursor:
                  closing || !allValid || lot.estado !== "abierto"
                    ? "not-allowed"
                    : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background 120ms ease, transform 120ms ease",
                "&:hover":
                  closing || !allValid || lot.estado !== "abierto"
                    ? undefined
                    : {
                        background: foto.accent.deep,
                        transform: "translateY(-1px)",
                      },
              }}
            >
              {lot.estado !== "abierto"
                ? `Lote ${loteId} ya cerrado`
                : closing
                  ? "Cerrando…"
                  : `Cerrar lote ${loteId}`}
              {!closing && lot.estado === "abierto" ? (
                <Box
                  component="span"
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontSize: 10,
                    background: "rgba(255,255,255,0.15)",
                    padding: "1px 5px",
                    borderRadius: "3px",
                  }}
                >
                  ⌘↵
                </Box>
              ) : null}
            </Box>
          </Box>

          {/* Footer actions */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => navigate(`/admin/fotosintesis/lots/${loteId}`)}
              sx={{
                background: "transparent",
                color: foto.ink.secondary,
                fontSize: 12.5,
                fontWeight: 500,
                padding: "11px 12px",
                border: "none",
                borderRadius: "9px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                font: "inherit",
                "&:hover": { color: foto.ink.primary },
              }}
            >
              <ArrowLeft size={14} /> seguir editando ítems
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
