import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Box, Switch } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Check, Diamond, Gem, Package, Tag } from "lucide-react";

import { getFoto, fontFamilies } from "../../../design-system";
import {
  useConvexQuery,
  useConvexMutation,
  convexApi,
} from "../../../lib/convex-safe";

import { TicketHeader, type TicketMeta } from "./components/TicketHeader";
import { PreponderanceRing } from "./components/PreponderanceRing";
import { ItemMiniCard } from "./components/ItemMiniCard";
import { SegmentedControl } from "./components/SegmentedControl";
import { FieldLabel } from "./components/FieldLabel";
import { NumberInputWithCalc } from "./components/NumberInputWithCalc";
import { PhotoDropzone, type DropzonePhoto } from "./components/PhotoDropzone";
import { ShortcutTable } from "./components/ShortcutTable";
import { ProveedorNuevoDrawer } from "./components/ProveedorNuevoDrawer";
import {
  GemaFields,
  EMPTY_GEMA_DRAFT,
  type GemaDraft,
} from "./components/GemaFields";
import { useNextLoteId } from "./hooks/useNextLoteId";
import { usePreponderanciaTotal } from "./hooks/usePreponderanciaTotal";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const formatCOP = (n: number): string => COP_FORMATTER.format(n);

const todayIso = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtDateEs = (iso: string): string => {
  // YYYY-MM-DD → "21 may"
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
};

// -----------------------------------------------------------------------------
// Type selector (custom radios — Slice 1 disables joya/insumo/lote)
// -----------------------------------------------------------------------------

type TipoItem = "gema" | "joya" | "insumo" | "lote";

interface TypeOption {
  value: TipoItem;
  label: string;
  key: string;
  Icon: typeof Gem;
  disabled?: boolean;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: "gema", label: "Gema", key: "1", Icon: Gem },
  { value: "joya", label: "Joya", key: "2", Icon: Diamond, disabled: true },
  { value: "insumo", label: "Insumo", key: "3", Icon: Package, disabled: true },
  { value: "lote", label: "Lote/Otros", key: "4", Icon: Tag, disabled: true },
];

interface TypeSelectorProps {
  value: TipoItem;
  onChange: (next: TipoItem) => void;
}

function TypeSelector({ value, onChange }: TypeSelectorProps) {
  const foto = getFoto("light");
  const groupName = useId();

  return (
    <Box
      component="fieldset"
      sx={{
        border: "none",
        padding: 0,
        margin: 0,
        display: "block",
      }}
    >
      <Box
        component="legend"
        sx={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: foto.ink.tertiary,
          marginBottom: "10px",
          padding: 0,
        }}
      >
        Tipo de ítem
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        {TYPE_OPTIONS.map((opt) => {
          const isActive = value === opt.value && !opt.disabled;
          const inputId = `${groupName}-${opt.value}`;
          const Glyph = opt.Icon;
          return (
            <Box
              key={opt.value}
              component="label"
              htmlFor={inputId}
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 14px",
                borderRadius: "10px",
                border: `1px solid ${
                  isActive ? foto.accent.primary : foto.surfaces.rule
                }`,
                background: isActive ? foto.accent.soft : foto.surfaces.canvas,
                cursor: opt.disabled ? "not-allowed" : "pointer",
                opacity: opt.disabled ? 0.55 : 1,
                transition:
                  "background 120ms ease, border-color 120ms ease, opacity 120ms ease",
                "&:hover": opt.disabled
                  ? undefined
                  : { background: foto.accent.soft },
              }}
            >
              <Box
                component="input"
                type="radio"
                id={inputId}
                name={groupName}
                value={opt.value}
                checked={isActive}
                disabled={opt.disabled}
                onChange={() => !opt.disabled && onChange(opt.value)}
                sx={{
                  position: "absolute",
                  opacity: 0,
                  pointerEvents: "none",
                  width: 0,
                  height: 0,
                }}
              />
              <Box
                aria-hidden
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "8px",
                  background: isActive
                    ? foto.accent.primary
                    : foto.surfaces.inset,
                  color: isActive ? foto.ink.inverse : foto.ink.secondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 120ms ease, color 120ms ease",
                }}
              >
                <Glyph size={15} />
              </Box>
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: "1px" }}
              >
                <Box
                  sx={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: foto.ink.primary,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {opt.label}
                </Box>
                {opt.disabled ? (
                  <Box
                    sx={{
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: foto.ink.mute,
                    }}
                  >
                    Próximamente
                  </Box>
                ) : (
                  <Box
                    sx={{
                      fontSize: 10.5,
                      color: foto.ink.tertiary,
                      fontFamily: fontFamilies.mono,
                    }}
                  >
                    Tecla {opt.key}
                  </Box>
                )}
              </Box>
              {isActive ? (
                <Box
                  aria-hidden
                  sx={{
                    position: "absolute",
                    top: -1,
                    right: -1,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: foto.accent.primary,
                  }}
                />
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// -----------------------------------------------------------------------------
// "Antes de empezar" intro form (loteId === "new")
// -----------------------------------------------------------------------------

type FormaPago = "contado" | "esmereogenesis";
type MetodoContado = "efectivo" | "transferencia";

interface NewLotIntroProps {
  previewLoteId: string | null;
}

function NewLotIntro({ previewLoteId }: NewLotIntroProps) {
  const foto = getFoto("light");
  const navigate = useNavigate();

  const createLot = useConvexMutation(convexApi.lots.create);

  // Local form state
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [fechaRecepcion, setFechaRecepcion] = useState(todayIso());
  const [costoTotalCOP, setCostoTotalCOP] = useState<number | "">("");
  const [unidadesDeclaradas, setUnidadesDeclaradas] = useState<number | "">(3);
  const [formaPago, setFormaPago] = useState<FormaPago>("contado");
  const [metodoContado, setMetodoContado] =
    useState<MetodoContado>("transferencia");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Provider drawer auto-opens once on mount when there's no provider yet
  // (handoff §4.2 — "auto-opens if the lot has no providerId").
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!providerId && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setDrawerOpen(true);
    }
  }, [providerId]);

  const canSubmit =
    !!providerId &&
    typeof costoTotalCOP === "number" &&
    costoTotalCOP > 0 &&
    typeof unidadesDeclaradas === "number" &&
    unidadesDeclaradas >= 1 &&
    !submitting;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !providerId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createLot({
        providerId: providerId as any, // Convex Id is opaque; drawer hands back a string id
        fechaRecepcion,
        costoTotalCOP: costoTotalCOP as number,
        unidadesDeclaradas: unidadesDeclaradas as number,
        formaPago,
        metodoContado: formaPago === "contado" ? metodoContado : undefined,
      });
      navigate(`/admin/fotosintesis/lots/${result.loteId}`, {
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear el lote");
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "36px 28px 80px",
      }}
    >
      <Box
        component="header"
        sx={{
          marginBottom: "20px",
        }}
      >
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
          Antes de empezar
        </Box>
        <Box
          component="h1"
          sx={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: foto.ink.primary,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Nuevo lote{" "}
          <Box
            component="span"
            sx={{
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
              color: foto.accent.deep,
              letterSpacing: "-0.04em",
            }}
          >
            {previewLoteId ?? "B-…"}
          </Box>
        </Box>
        <Box
          sx={{
            marginTop: "8px",
            fontSize: 13,
            color: foto.ink.secondary,
            lineHeight: 1.55,
          }}
        >
          Cuatro datos para fijar la cabecera. Luego entrás a la captura ítem
          por ítem.
        </Box>
      </Box>

      {error ? (
        <Box
          role="alert"
          sx={{
            marginBottom: "20px",
            padding: "12px 14px",
            border: `1px solid ${foto.status.sold}`,
            background: "rgba(179,58,47,0.06)",
            color: foto.status.sold,
            fontSize: 12.5,
            borderRadius: "10px",
          }}
        >
          {error}
        </Box>
      ) : null}

      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "18px",
          padding: "22px",
          background: foto.surfaces.canvas,
          border: `1px solid ${foto.surfaces.rule}`,
          borderRadius: "14px",
        }}
      >
        {/* Proveedor */}
        <Box>
          <FieldLabel>Proveedor</FieldLabel>
          <Box
            component="button"
            type="button"
            onClick={() => setDrawerOpen(true)}
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              border: `1px solid ${
                providerId ? foto.surfaces.rule : foto.status.sold
              }`,
              background: providerId
                ? foto.surfaces.inset
                : "rgba(179,58,47,0.04)",
              borderRadius: "9px",
              fontSize: 13,
              color: providerId ? foto.ink.primary : foto.status.sold,
              cursor: "pointer",
              font: "inherit",
              transition: "border-color 120ms ease, background 120ms ease",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {providerId ? (
                <Check
                  size={14}
                  color={foto.accent.primary}
                  strokeWidth={2.5}
                />
              ) : (
                <AlertTriangle size={14} />
              )}
              <span>{providerName ?? "Elegir o crear proveedor"}</span>
            </Box>
            <Box
              sx={{
                fontSize: 10.5,
                color: foto.ink.tertiary,
                letterSpacing: "0.02em",
              }}
            >
              {providerId ? "cambiar" : "abrir"}
            </Box>
          </Box>
        </Box>

        {/* Fecha + Costo total */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "18px",
          }}
        >
          <Box>
            <FieldLabel htmlFor="lote-fecha">Fecha de recepción</FieldLabel>
            <Box
              component="input"
              id="lote-fecha"
              type="date"
              value={fechaRecepcion}
              onChange={(e) =>
                setFechaRecepcion((e.target as HTMLInputElement).value)
              }
              sx={{
                width: "100%",
                background: foto.surfaces.inset,
                border: `1px solid ${foto.surfaces.rule}`,
                borderRadius: "9px",
                padding: "11px 14px",
                fontSize: 13,
                color: foto.ink.primary,
                fontFamily: fontFamilies.mono,
                outline: "none",
                "&:focus": {
                  borderColor: foto.accent.primary,
                  boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                },
              }}
            />
          </Box>
          <Box>
            <FieldLabel htmlFor="lote-costo">Costo total (COP)</FieldLabel>
            <NumberInputWithCalc
              id="lote-costo"
              value={costoTotalCOP}
              onChange={setCostoTotalCOP}
              placeholder="0"
              step={1000}
              min={0}
              ariaLabel="Costo total del lote en COP"
              calcSuffix={
                typeof costoTotalCOP === "number" && costoTotalCOP > 0
                  ? formatCOP(costoTotalCOP)
                  : "= —"
              }
              calcVariant="neutral"
            />
          </Box>
        </Box>

        {/* Unidades + Forma de pago */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "18px",
            alignItems: "end",
          }}
        >
          <Box>
            <FieldLabel htmlFor="lote-unidades">Unidades declaradas</FieldLabel>
            <NumberInputWithCalc
              id="lote-unidades"
              value={unidadesDeclaradas}
              onChange={setUnidadesDeclaradas}
              placeholder="3"
              step={1}
              min={1}
              ariaLabel="Unidades declaradas"
              calcSuffix="ítems"
              calcVariant="neutral"
            />
          </Box>
          <Box>
            <FieldLabel>Forma de pago</FieldLabel>
            <SegmentedControl
              ariaLabel="Forma de pago"
              options={[
                { value: "contado", label: "Contado" },
                { value: "esmereogenesis", label: "Esmereogénesis" },
                { value: "credito", label: "Crédito", disabled: true },
              ]}
              value={formaPago}
              onChange={(next) => {
                if (next === "credito") return;
                setFormaPago(next as FormaPago);
              }}
            />
          </Box>
        </Box>

        {formaPago === "contado" ? (
          <Box>
            <FieldLabel>Método</FieldLabel>
            <SegmentedControl
              ariaLabel="Método de pago contado"
              options={[
                { value: "efectivo", label: "Efectivo" },
                { value: "transferencia", label: "Transferencia" },
              ]}
              value={metodoContado}
              onChange={(next) => setMetodoContado(next as MetodoContado)}
            />
          </Box>
        ) : null}

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "4px",
          }}
        >
          <Box
            component="button"
            type="submit"
            disabled={!canSubmit}
            sx={{
              border: "none",
              borderRadius: "9px",
              padding: "12px 22px",
              background: canSubmit ? foto.accent.primary : foto.surfaces.inset,
              color: canSubmit ? foto.ink.inverse : foto.ink.mute,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "background 120ms ease, transform 120ms ease",
              "&:hover": canSubmit
                ? {
                    background: foto.accent.deep,
                    transform: "translateY(-1px)",
                  }
                : undefined,
            }}
          >
            {submitting ? "Creando…" : "Empezar captura"}
          </Box>
        </Box>
      </Box>

      <ProveedorNuevoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={(newProviderId) => {
          setProviderId(newProviderId);
          // We don't know the name from the drawer payload alone — leave a
          // gentle placeholder; the topbar of the captura screen will hydrate
          // the real name via providers.get once we navigate.
          setProviderName("Proveedor creado");
          setDrawerOpen(false);
        }}
        contextLabel={
          previewLoteId
            ? `${previewLoteId} · sin salir de la captura`
            : undefined
        }
      />
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Sticky footer for the active item
// -----------------------------------------------------------------------------

interface StickyFooterProps {
  onCancel: () => void;
  onSaveAndNext: () => void;
  onCloseLot: () => void;
  saveDisabled: boolean;
  closeDisabled: boolean;
  saving: boolean;
}

function StickyFooter({
  onCancel,
  onSaveAndNext,
  onCloseLot,
  saveDisabled,
  closeDisabled,
  saving,
}: StickyFooterProps) {
  const foto = getFoto("light");
  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 0,
        marginTop: "24px",
        padding: "14px 0 18px",
        background: `linear-gradient(180deg, transparent 0%, ${foto.surfaces.canvas} 28%)`,
        display: "flex",
        gap: "8px",
        justifyContent: "flex-end",
        alignItems: "center",
        zIndex: 5,
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onCancel}
        sx={{
          border: `1px solid ${foto.surfaces.rule}`,
          background: foto.surfaces.canvas,
          color: foto.ink.secondary,
          borderRadius: "9px",
          padding: "10px 16px",
          fontSize: 12.5,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 120ms ease, color 120ms ease",
          "&:hover": {
            background: foto.surfaces.inset,
            color: foto.ink.primary,
          },
        }}
      >
        Cancelar ítem
      </Box>
      <Box
        component="button"
        type="button"
        onClick={onSaveAndNext}
        disabled={saveDisabled}
        sx={{
          border: `1px solid ${
            saveDisabled ? foto.surfaces.rule : foto.surfaces.edgeStrong
          }`,
          background: foto.surfaces.canvas,
          color: saveDisabled ? foto.ink.mute : foto.ink.primary,
          borderRadius: "9px",
          padding: "10px 16px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: saveDisabled ? "not-allowed" : "pointer",
          transition: "background 120ms ease",
          "&:hover": saveDisabled
            ? undefined
            : { background: foto.surfaces.inset },
        }}
      >
        {saving ? "Guardando…" : "Guardar y siguiente"}
      </Box>
      <Box
        component="button"
        type="button"
        onClick={onCloseLot}
        disabled={closeDisabled}
        sx={{
          border: "none",
          background: closeDisabled ? foto.surfaces.inset : foto.accent.primary,
          color: closeDisabled ? foto.ink.mute : foto.ink.inverse,
          borderRadius: "9px",
          padding: "10px 18px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: closeDisabled ? "not-allowed" : "pointer",
          transition: "background 120ms ease, transform 120ms ease",
          "&:hover": closeDisabled
            ? undefined
            : {
                background: foto.accent.deep,
                transform: "translateY(-1px)",
              },
        }}
      >
        Cerrar lote
      </Box>
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Lot meta card (right pane summary, slightly compact)
// -----------------------------------------------------------------------------

interface LotMetaCardProps {
  rows: Array<{ label: string; value: React.ReactNode; alert?: boolean }>;
}

function LotMetaCard({ rows }: LotMetaCardProps) {
  const foto = getFoto("light");
  return (
    <Box
      sx={{
        padding: "14px 16px",
        background: foto.surfaces.canvas,
        border: `1px solid ${foto.surfaces.rule}`,
        borderRadius: "11px",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        rowGap: "8px",
        columnGap: "12px",
      }}
    >
      {rows.map((row) => (
        <Box key={row.label} sx={{ display: "contents" }}>
          <Box
            sx={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: foto.ink.tertiary,
              alignSelf: "center",
            }}
          >
            {row.label}
          </Box>
          <Box
            sx={{
              fontSize: 12,
              fontWeight: 500,
              color: row.alert ? foto.status.sold : foto.ink.primary,
              letterSpacing: "-0.005em",
              textAlign: "right",
              fontFamily: fontFamilies.mono,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {row.value}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Active item card (LEFT pane) — the captura form proper
// -----------------------------------------------------------------------------

interface ActiveLotPageProps {
  loteId: string;
}

function ActiveLotPage({ loteId }: ActiveLotPageProps) {
  const foto = getFoto("light");
  const navigate = useNavigate();

  // Reactive data --------------------------------------------------------------
  const lot = useConvexQuery(convexApi.lots.getByLoteId, { loteId });
  const items = useConvexQuery(convexApi.lotItems.listByLote, { loteId });
  const prepTotal = usePreponderanciaTotal(loteId);
  const provider = useConvexQuery(
    convexApi.providers.get,
    lot?.providerId ? { id: lot.providerId } : "skip",
  );

  // Mutations ------------------------------------------------------------------
  const createLotItem = useConvexMutation(convexApi.lotItems.create);
  // `lots.update` mutation will be re-wired in Slice 2 once the patch
  // validator accepts providerId (see drawer onSuccess below).

  // Form state -----------------------------------------------------------------
  const [tipo, setTipo] = useState<TipoItem>("gema");
  const [gema, setGema] = useState<GemaDraft>(EMPTY_GEMA_DRAFT);
  const [observacion, setObservacion] = useState("");
  // Slice plan: items default to hidden from catalog (reserve). The Switch is
  // "Reserva oculta" ON → `mostrarEnCatalogo: false`.
  const [reservaOculta, setReservaOculta] = useState(true);
  const [photos, setPhotos] = useState<DropzonePhoto[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provider drawer ------------------------------------------------------------
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasProvider = !!lot?.providerId;
  const drawerAutoOpenedRef = useRef(false);
  useEffect(() => {
    // Auto-open the drawer once if the loaded lot has no provider yet.
    if (lot && !hasProvider && !drawerAutoOpenedRef.current) {
      drawerAutoOpenedRef.current = true;
      setDrawerOpen(true);
    }
  }, [lot, hasProvider]);

  // Derived state --------------------------------------------------------------
  const costoTotalCOP = lot?.costoTotalCOP ?? 0;
  const unidadesDeclaradas = lot?.unidadesDeclaradas ?? 0;
  const itemsCount = items?.length ?? 0;
  const isLastItem =
    unidadesDeclaradas > 0 && itemsCount === unidadesDeclaradas - 1;

  const prepNumeric =
    typeof gema.preponderancia === "number" ? gema.preponderancia : 0;
  const projectedSum = prepTotal.sum + prepNumeric;
  const overflow = projectedSum - 100;
  const prepHelper = useMemo<{
    text: React.ReactNode;
    alert: boolean;
  } | null>(() => {
    if (overflow > 0.01) {
      return {
        text: `Excede el 100% del lote por ${(Math.round(overflow * 10) / 10).toFixed(1)}%. Bajá la preponderancia o ajustá un ítem previo.`,
        alert: true,
      };
    }
    if (
      isLastItem &&
      gema.preponderancia === "" &&
      prepTotal.remaining > 0.01
    ) {
      return {
        text: `Es el último ítem del lote: te queda ${(Math.round(prepTotal.remaining * 10) / 10).toFixed(1)}% para completar el 100%.`,
        alert: false,
      };
    }
    return null;
  }, [overflow, isLastItem, gema.preponderancia, prepTotal.remaining]);

  // Save handlers --------------------------------------------------------------
  const canSave =
    !!lot &&
    lot.estado === "abierto" &&
    gema.nombre.trim().length > 0 &&
    typeof gema.preponderancia === "number" &&
    gema.preponderancia > 0 &&
    overflow <= 0.01 &&
    itemsCount < unidadesDeclaradas &&
    !saving;

  const canCloseLot =
    !!lot &&
    lot.estado === "abierto" &&
    itemsCount > 0 &&
    itemsCount === unidadesDeclaradas &&
    Math.abs(prepTotal.sum - 100) <= 0.01;

  const resetItemDraft = useCallback(() => {
    setGema(EMPTY_GEMA_DRAFT);
    setObservacion("");
    setPhotos([]);
    setReservaOculta(true);
  }, []);

  const handleSaveAndNext = useCallback(async () => {
    if (!canSave || !lot) return;
    setSaving(true);
    setError(null);
    try {
      // TODO Slice 2: upload photos to Drive first, attach URL on create.
      await createLotItem({
        loteId,
        tipo,
        nombre: gema.nombre.trim(),
        preponderancia: gema.preponderancia as number,
        color: gema.color || undefined,
        calidad: gema.calidad,
        peso: gema.peso || undefined,
        observacion: observacion.trim() || undefined,
        mostrarEnCatalogo: !reservaOculta,
        // procedencia + precioPublicoCOP are not in lotItems.create's
        // surface yet — Slice 2 extends the mutation to capture them.
      });
      resetItemDraft();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos guardar el ítem",
      );
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    lot,
    createLotItem,
    loteId,
    tipo,
    gema,
    observacion,
    reservaOculta,
    resetItemDraft,
  ]);

  const handleCloseLot = useCallback(() => {
    if (!canCloseLot) return;
    navigate(`/admin/fotosintesis/lots/${loteId}/close`);
  }, [canCloseLot, navigate, loteId]);

  const handleDuplicate = useCallback(() => {
    // ⌘D — clone type/calidad/procedencia/color/materiales; reset
    // nombre/peso/preponderancia for the next ítem.
    setGema((prev) => ({
      ...EMPTY_GEMA_DRAFT,
      color: prev.color,
      calidad: prev.calidad,
      procedencia: prev.procedencia,
    }));
  }, []);

  // Page-local hotkeys ---------------------------------------------------------
  useEffect(() => {
    const isTyping = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
        return true;
      return target.isContentEditable;
    };
    const handler = (e: KeyboardEvent) => {
      // ⌘D — duplicate
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "d" &&
        !e.shiftKey &&
        !e.altKey
      ) {
        // Only when on this page and not blocked by the global ⌘D (directory)
        // — the global handler ignores typing targets too; here we intercept
        // regardless of focus because the user clearly wants the local action.
        e.preventDefault();
        e.stopPropagation();
        handleDuplicate();
        return;
      }
      // ⌘↵ — save and next, or close-and-navigate when last item is complete
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (canCloseLot) {
          handleCloseLot();
        } else {
          void handleSaveAndNext();
        }
        return;
      }
      // 1 / 2 / 3 / 4 — type select (only when not typing)
      if (!isTyping(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          setTipo("gema");
        }
        // 2/3/4 are visually present but Slice-1 disabled — swallow noise.
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDuplicate, handleSaveAndNext, handleCloseLot, canCloseLot]);

  // Topbar / TicketHeader meta -------------------------------------------------
  const ticketMeta = useMemo<TicketMeta[]>(() => {
    if (!lot) return [];
    return [
      {
        label: "Proveedor",
        value:
          provider?.nombreORazonSocial ?? (hasProvider ? "—" : "Sin proveedor"),
        alert: !hasProvider,
      },
      { label: "Recibido", value: fmtDateEs(lot.fechaRecepcion) },
      { label: "Costo total", value: formatCOP(lot.costoTotalCOP) },
      {
        label: "Peso",
        value:
          typeof lot.pesoTotalQuilates === "number"
            ? `${lot.pesoTotalQuilates} ct`
            : "—",
      },
      {
        label: "Pago",
        value:
          lot.formaPago === "contado"
            ? `Contado · ${lot.metodoContado ?? ""}`.trim()
            : lot.formaPago === "esmereogenesis"
              ? "Esmereogénesis"
              : "Crédito",
      },
    ];
  }, [lot, provider, hasProvider]);

  // Photo helpers --------------------------------------------------------------
  const addPhotos = (files: File[]) => {
    const next: DropzonePhoto[] = files.map((f) => ({
      id: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      url: URL.createObjectURL(f),
    }));
    setPhotos((prev) => [...prev, ...next]);
  };
  const removePhoto = (id: string) =>
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });

  // Revoke any remaining object URLs on unmount or when the loteId changes so
  // we don't leak blob handles in long sessions or hot navigations.
  useEffect(() => {
    return () => {
      for (const p of photos) {
        if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteId]);

  // Loading state --------------------------------------------------------------
  if (!lot) {
    return (
      <Box
        sx={{
          padding: "36px 28px",
          color: foto.ink.tertiary,
          fontSize: 13,
        }}
      >
        Cargando lote {loteId}…
      </Box>
    );
  }

  // Render ---------------------------------------------------------------------
  return (
    <Box>
      {/* sr-only h1 for a11y */}
      <Box
        component="h1"
        sx={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Captura del lote {loteId}
      </Box>

      <TicketHeader
        kind="lot"
        id={loteId}
        meta={ticketMeta}
        progress={{
          value: prepTotal.sum,
          target: 100,
          label: "Preponderancia",
        }}
        alert={!hasProvider}
      />

      {!hasProvider ? (
        <Box
          role="alert"
          sx={{
            maxWidth: 1320,
            margin: "12px auto 0",
            padding: "10px 14px",
            background: "rgba(179,58,47,0.06)",
            border: `1px solid ${foto.status.sold}`,
            borderRadius: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: foto.status.sold,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={14} />
            <span>Este lote no tiene proveedor. Asignalo antes de cerrar.</span>
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => setDrawerOpen(true)}
            sx={{
              border: `1px solid ${foto.status.sold}`,
              background: foto.surfaces.canvas,
              color: foto.status.sold,
              fontSize: 11.5,
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: "7px",
              cursor: "pointer",
            }}
          >
            Crear proveedor
          </Box>
        </Box>
      ) : null}

      <Box
        sx={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "24px 28px 0",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 380px" },
          gap: { xs: "20px", lg: "28px" },
          alignItems: "start",
        }}
      >
        {/* LEFT — active item editor */}
        <Box
          sx={{
            paddingBottom: "16px",
            minWidth: 0,
          }}
        >
          {error ? (
            <Box
              role="alert"
              sx={{
                marginBottom: "18px",
                padding: "10px 14px",
                border: `1px solid ${foto.status.sold}`,
                background: "rgba(179,58,47,0.06)",
                color: foto.status.sold,
                fontSize: 12.5,
                borderRadius: "10px",
              }}
            >
              {error}
            </Box>
          ) : null}

          <Box
            sx={{
              background: foto.surfaces.canvas,
              border: `1px solid ${foto.surfaces.rule}`,
              borderRadius: "14px",
              padding: "20px 22px",
              display: "grid",
              gap: "20px",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "12px",
              }}
            >
              <Box
                component="h2"
                sx={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: foto.ink.primary,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Ítem {itemsCount + 1} de {unidadesDeclaradas || "?"}
              </Box>
              <Box
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 11,
                  color: foto.ink.tertiary,
                }}
              >
                {loteId} · {String(itemsCount + 1).padStart(3, "0")}
              </Box>
            </Box>

            <TypeSelector value={tipo} onChange={setTipo} />

            <GemaFields
              value={gema}
              onChange={(patch) => setGema((prev) => ({ ...prev, ...patch }))}
              lotCostoTotalCOP={costoTotalCOP}
              preponderanciaHelper={prepHelper?.text}
              preponderanciaHelperAlert={prepHelper?.alert}
            />

            {/* Foto */}
            <Box>
              <FieldLabel optional="opcional">Foto del ítem</FieldLabel>
              <PhotoDropzone
                photos={photos}
                onAdd={addPhotos}
                onRemove={removePhoto}
                hint="JPG o PNG. Slice 2 sube a Drive automáticamente."
              />
            </Box>

            {/* Observación */}
            <Box>
              <FieldLabel htmlFor="obs">Observación</FieldLabel>
              <Box
                component="textarea"
                id="obs"
                value={observacion}
                placeholder="Cualquier detalle libre — talla del corte, particularidades, intenciones de venta…"
                onChange={(e) =>
                  setObservacion((e.target as HTMLTextAreaElement).value)
                }
                rows={3}
                sx={{
                  width: "100%",
                  background: foto.surfaces.inset,
                  border: `1px solid ${foto.surfaces.rule}`,
                  borderRadius: "9px",
                  padding: "11px 14px",
                  fontSize: 13,
                  color: foto.ink.primary,
                  fontFamily: fontFamilies.system,
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.5,
                  "&:focus": {
                    borderColor: foto.accent.primary,
                    boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                  },
                  "::placeholder": { color: foto.ink.mute },
                }}
              />
            </Box>

            {/* Reserva oculta toggle */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                background: foto.surfaces.inset,
                border: `1px solid ${foto.surfaces.edge}`,
                borderRadius: "10px",
              }}
            >
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: "2px" }}
              >
                <Box
                  component="label"
                  htmlFor="reserva-oculta"
                  sx={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: foto.ink.primary,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Reserva oculta
                </Box>
                <Box
                  sx={{
                    fontSize: 10.5,
                    color: foto.ink.tertiary,
                  }}
                >
                  Cuando está activa, el ítem no aparece en el catálogo público
                  hasta que decidas publicarlo desde el cierre del lote.
                </Box>
              </Box>
              <Switch
                id="reserva-oculta"
                checked={reservaOculta}
                onChange={(e) => setReservaOculta(e.target.checked)}
                inputProps={{
                  "aria-checked": reservaOculta,
                  "aria-label": "Reserva oculta",
                }}
              />
            </Box>
          </Box>

          <StickyFooter
            onCancel={resetItemDraft}
            onSaveAndNext={handleSaveAndNext}
            onCloseLot={handleCloseLot}
            saveDisabled={!canSave}
            closeDisabled={!canCloseLot}
            saving={saving}
          />
        </Box>

        {/* RIGHT — bandeja */}
        <Box
          sx={{
            position: { lg: "sticky" },
            top: { lg: 56 },
            maxHeight: { lg: "calc(100vh - 56px)" },
            overflow: { lg: "auto" },
            paddingBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            minWidth: 0,
          }}
        >
          {/* Ring */}
          <Box
            sx={{
              padding: "22px 18px 18px",
              background: foto.surfaces.panel,
              border: `1px solid ${foto.surfaces.edge}`,
              borderRadius: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <PreponderanceRing value={prepTotal.sum} target={100} />
            <Box
              sx={{
                fontSize: 10.5,
                color: foto.ink.tertiary,
                fontFamily: fontFamilies.mono,
                fontVariantNumeric: "tabular-nums",
                textAlign: "center",
              }}
            >
              {prepTotal.count}/{unidadesDeclaradas} ítems ·{" "}
              {prepTotal.remaining > 0
                ? `${Math.round(prepTotal.remaining * 10) / 10}% restante`
                : prepTotal.overflow > 0.01
                  ? `${Math.round(prepTotal.overflow * 10) / 10}% de exceso`
                  : "lote balanceado"}
            </Box>
          </Box>

          {/* Lot meta summary */}
          <LotMetaCard
            rows={[
              {
                label: "Lote",
                value: loteId,
              },
              {
                label: "Recibido",
                value: fmtDateEs(lot.fechaRecepcion),
              },
              {
                label: "Costo",
                value: formatCOP(lot.costoTotalCOP),
              },
              {
                label: "Unidades",
                value: `${itemsCount}/${unidadesDeclaradas}`,
              },
              {
                label: "Pago",
                value:
                  lot.formaPago === "contado"
                    ? "Contado"
                    : lot.formaPago === "esmereogenesis"
                      ? "Esmereo"
                      : "Crédito",
              },
              {
                label: "Factura",
                value: lot.numeroFactura ?? "por adjuntar",
                alert: !lot.numeroFactura,
              },
            ]}
          />

          {/* Items list */}
          <Box
            component="ul"
            role="list"
            sx={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {(items ?? []).map((item, idx) => (
              <Box component="li" key={item._id} sx={{ margin: 0 }}>
                <ItemMiniCard
                  ticketId={`${loteId} · ${String(idx + 1).padStart(3, "0")}`}
                  name={item.itemId}
                  meta={
                    typeof item.preponderancia === "number"
                      ? `costo ${formatCOP(item.costoBaseCOP)}`
                      : undefined
                  }
                  preponderancia={item.preponderancia}
                  cost={formatCOP(item.costoBaseCOP)}
                  state="done"
                />
              </Box>
            ))}
            {/* Active row for the in-progress item */}
            {itemsCount < unidadesDeclaradas ? (
              <Box component="li" sx={{ margin: 0 }}>
                <ItemMiniCard
                  ticketId={`${loteId} · ${String(itemsCount + 1).padStart(3, "0")}`}
                  name={gema.nombre.trim() || "Ítem en captura"}
                  meta={
                    typeof gema.preponderancia === "number"
                      ? `${gema.preponderancia}% · ${formatCOP(
                          Math.round(
                            costoTotalCOP *
                              ((gema.preponderancia as number) / 100),
                          ),
                        )}`
                      : "Esperando preponderancia…"
                  }
                  preponderancia={
                    typeof gema.preponderancia === "number"
                      ? gema.preponderancia
                      : undefined
                  }
                  state="active"
                />
              </Box>
            ) : null}
            {/* Pending placeholders for remaining declared items */}
            {Array.from(
              {
                length: Math.max(0, unidadesDeclaradas - itemsCount - 1),
              },
              (_, i) => {
                const seq = itemsCount + 2 + i;
                return (
                  <Box component="li" key={`pending-${seq}`} sx={{ margin: 0 }}>
                    <ItemMiniCard
                      ticketId={`${loteId} · ${String(seq).padStart(3, "0")}`}
                      name="Pendiente"
                      meta="—"
                      state="pending"
                    />
                  </Box>
                );
              },
            )}
          </Box>

          <ShortcutTable
            title="Atajos"
            shortcuts={[
              { label: "Duplicar ítem", keys: ["⌘", "D"] },
              { label: "Guardar y siguiente", keys: ["⌘", "↵"] },
              { label: "Cambiar a Gema", keys: ["1"] },
              { label: "Abrir buscador global", keys: ["⌘", "K"] },
            ]}
          />
        </Box>
      </Box>

      <ProveedorNuevoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={(newProviderId) => {
          // The active-lot "create provider" drawer is a legacy fallback for
          // lots that were created without a provider. The new-lot intro
          // already requires a provider at `lots.create` time, so this branch
          // should rarely fire. `lots.update`'s patch validator does not yet
          // accept `providerId`, so we cannot persist the linkage from the
          // client today. Surface that loud-and-clear instead of silently
          // round-tripping an empty patch (reviewer flagged the no-op).
          //
          // TODO(slice-2): extend `lotPatchValidator` in convex/lots.ts to
          // accept `providerId: v.optional(v.id("providers"))`, then patch
          // here with `{ providerId: newProviderId }`.
          setDrawerOpen(false);
          void newProviderId;
          if (typeof window !== "undefined") {
            // eslint-disable-next-line no-alert
            window.alert(
              `Proveedor creado, pero el enlace al lote ${loteId} requiere extender lots.update en el servidor (Slice 2). Por ahora abrí el lote de nuevo desde Inicio para volver a empezar con este proveedor.`,
            );
          }
        }}
        contextLabel={`${loteId} · sin salir de la captura`}
      />
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Route entry — dispatches between "new" intro and the active editor
// -----------------------------------------------------------------------------

export default function FotosintesisCapturaLotePage() {
  const { loteId } = useParams<{ loteId: string }>();
  const previewLoteId = useNextLoteId();

  if (!loteId || loteId === "new") {
    return <NewLotIntro previewLoteId={previewLoteId} />;
  }

  return <ActiveLotPage loteId={loteId} />;
}
