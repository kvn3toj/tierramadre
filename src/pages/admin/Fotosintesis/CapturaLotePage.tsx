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
import {
  AlertTriangle,
  Diamond,
  Gem,
  Mountain,
  Package,
  Pencil,
  Tag,
} from "lucide-react";

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
import { EntityPicker } from "./components/EntityPicker";
import { LotSwitcher } from "./components/LotSwitcher";
import { EditableMetaValue } from "./components/EditableMetaValue";
import { EditItemDrawer } from "./components/EditItemDrawer";
import { EditLotDrawer } from "./components/EditLotDrawer";
import { useNotification } from "../../../contexts/NotificationContext";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  GemaFields,
  EMPTY_GEMA_DRAFT,
  type GemaDraft,
} from "./components/GemaFields";
import {
  BrutoFields,
  EMPTY_BRUTO_DRAFT,
  type BrutoDraft,
} from "./components/BrutoFields";
import { CreditoFields } from "./components/CreditoFields";
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

type TipoItem = "gema" | "bruto" | "joya" | "insumo" | "lote";

interface TypeOption {
  value: TipoItem;
  label: string;
  key: string;
  Icon: typeof Gem;
  disabled?: boolean;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: "gema", label: "Gema", key: "1", Icon: Gem },
  { value: "bruto", label: "Bruto", key: "2", Icon: Mountain },
  { value: "joya", label: "Joya", key: "3", Icon: Diamond, disabled: true },
  { value: "insumo", label: "Insumo", key: "4", Icon: Package, disabled: true },
  { value: "lote", label: "Lote/Otros", key: "5", Icon: Tag, disabled: true },
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
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: `repeat(${TYPE_OPTIONS.length}, minmax(0, 1fr))`,
          },
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

type FormaPago =
  | "contado"
  | "esmereogenesis"
  | "credito"
  | "bajo_pedido"
  | "consignacion";
type MetodoContado = "efectivo" | "transferencia";

function formaPagoShort(formaPago: string, metodoContado?: string): string {
  if (formaPago === "contado") {
    return metodoContado ? `Contado · ${metodoContado}` : "Contado";
  }
  if (formaPago === "esmereogenesis") return "Esmereo";
  if (formaPago === "credito") return "Crédito";
  if (formaPago === "bajo_pedido") return "Bajo pedido";
  if (formaPago === "consignacion") return "Consignación";
  return formaPago;
}

type Sede = "B" | "C";

interface ProviderRow {
  _id: string;
  nombreORazonSocial: string;
  nit?: string;
  cedula?: string;
  tipo?: "gemas" | "joyas" | "insumos" | "otros";
}

function NewLotIntro() {
  const foto = getFoto("light");
  const navigate = useNavigate();

  // Sede must be chosen explicitly every time — there is no default. The
  // lot ID preview ("B-009"/"C-001") only resolves after a sede is picked.
  const [sede, setSede] = useState<Sede | null>(null);
  const previewLoteId = useNextLoteId(sede);

  const createLot = useConvexMutation(convexApi.lots.create);
  // Provider directory — already loaded by the drawer below; surface it at
  // the parent so the EntityPicker can render the list as options instead of
  // forcing the operator to retype a name they've already registered.
  const providers = useConvexQuery(convexApi.providers.list, { search: "" }) as
    | ProviderRow[]
    | undefined;

  // Local form state
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [fechaRecepcion, setFechaRecepcion] = useState(todayIso());
  const [costoTotalCOP, setCostoTotalCOP] = useState<number | "">("");
  const [unidadesDeclaradas, setUnidadesDeclaradas] = useState<number | "">(3);
  const [formaPago, setFormaPago] = useState<FormaPago>("contado");
  const [metodoContado, setMetodoContado] =
    useState<MetodoContado>("transferencia");

  // Crédito a proveedor — vencimiento + cuotas viajan a Convex (BR-7),
  // tasaInteres se queda UI-only hasta que el contador defina la columna.
  const [creditoFechaVenc, setCreditoFechaVenc] = useState<string>("");
  const [creditoCuotas, setCreditoCuotas] = useState<number>(3);
  const [creditoTasa, setCreditoTasa] = useState<number | "">("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialName, setDrawerInitialName] = useState<string>("");

  // Resolve the selected provider object once so the EntityPicker can render
  // avatar + meta without re-scanning the list on every keystroke. When the
  // operator has just created a provider, the Convex `providers.list` query
  // may revalidate one frame later — fall back to a synthetic row built from
  // `providerName` so the picker doesn't blink between the create row and
  // the new selection.
  const selectedProvider = useMemo<ProviderRow | null>(() => {
    if (!providerId) return null;
    const fromList = providers?.find((p) => p._id === providerId);
    if (fromList) return fromList;
    if (providerName) {
      return { _id: providerId, nombreORazonSocial: providerName };
    }
    return null;
  }, [providerId, providerName, providers]);

  const creditoComplete =
    formaPago !== "credito" ||
    (creditoFechaVenc.length > 0 && creditoCuotas > 0);

  const canSubmit =
    !!sede &&
    !!providerId &&
    typeof costoTotalCOP === "number" &&
    costoTotalCOP > 0 &&
    typeof unidadesDeclaradas === "number" &&
    unidadesDeclaradas >= 1 &&
    creditoComplete &&
    !submitting;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !providerId || !sede) return;
    if (formaPago === "credito" && !creditoFechaVenc) {
      setError("Crédito requiere fecha de vencimiento.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const createArgs: Parameters<typeof createLot>[0] = {
        sede,
        providerId: providerId as any, // Convex Id is opaque; drawer hands back a string id
        fechaRecepcion,
        costoTotalCOP: costoTotalCOP as number,
        unidadesDeclaradas: unidadesDeclaradas as number,
        formaPago,
        metodoContado: formaPago === "contado" ? metodoContado : undefined,
      };
      if (formaPago === "credito") {
        createArgs.fechaVencimiento = creditoFechaVenc;
        createArgs.numeroCuotas = creditoCuotas;
      }
      const result = await createLot(createArgs);
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
            {previewLoteId ?? (sede ? `${sede}-…` : "—")}
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
        {/* Sede — decide qué contador alimentar (B-NNN / C-NNN). Sin default. */}
        <Box>
          <FieldLabel>Sede</FieldLabel>
          <SegmentedControl
            ariaLabel="Sede del lote"
            options={[
              { value: "B", label: "Bogotá" },
              { value: "C", label: "Cali" },
            ]}
            value={sede ?? ("" as Sede)}
            onChange={(next) => setSede(next as Sede)}
          />
        </Box>

        {/* Proveedor */}
        <EntityPicker<ProviderRow>
          label="Proveedor"
          placeholder="Buscar por nombre o NIT…"
          options={providers ?? []}
          loading={providers === undefined}
          value={selectedProvider}
          onChange={(next) => {
            setProviderId(next?._id ?? null);
            setProviderName(next?.nombreORazonSocial ?? null);
          }}
          getOptionId={(p) => p._id}
          getOptionLabel={(p) => p.nombreORazonSocial}
          getOptionMeta={(p) =>
            [
              p.nit ? `NIT ${p.nit}` : p.cedula ? `CC ${p.cedula}` : null,
              p.tipo,
            ]
              .filter(Boolean)
              .join(" · ") || null
          }
          getOptionAvatar={(p) =>
            p.nombreORazonSocial.slice(0, 1).toUpperCase()
          }
          onCreateRequest={(typed) => {
            setDrawerInitialName(typed);
            setDrawerOpen(true);
          }}
          createLabel={(t) => `Crear «${t}» como nuevo proveedor`}
        />

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
                { value: "credito", label: "Crédito" },
                { value: "esmereogenesis", label: "Esmereogénesis" },
                { value: "bajo_pedido", label: "Bajo pedido" },
                { value: "consignacion", label: "Consignación" },
              ]}
              value={formaPago}
              onChange={(next) => setFormaPago(next as FormaPago)}
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

        {formaPago === "credito" ? (
          <CreditoFields
            fechaVencimiento={creditoFechaVenc}
            setFechaVencimiento={setCreditoFechaVenc}
            numeroCuotas={creditoCuotas}
            setNumeroCuotas={setCreditoCuotas}
            tasaInteres={creditoTasa}
            setTasaInteres={setCreditoTasa}
            totalCop={typeof costoTotalCOP === "number" ? costoTotalCOP : 0}
          />
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
        onClose={() => {
          setDrawerOpen(false);
          setDrawerInitialName("");
        }}
        onSuccess={({ id, nombre }) => {
          setProviderId(id);
          setProviderName(nombre);
          setDrawerOpen(false);
          setDrawerInitialName("");
        }}
        contextLabel={
          previewLoteId
            ? `${previewLoteId} · sin salir de la captura`
            : undefined
        }
        initialName={drawerInitialName || undefined}
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
  /** Optional inline action rendered in the top-right corner — used for "Editar lote". */
  action?: { label: string; onClick: () => void; disabled?: boolean };
}

function LotMetaCard({ rows, action }: LotMetaCardProps) {
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
        position: "relative",
      }}
    >
      {action ? (
        <Box
          component="button"
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          aria-label={action.label}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 9px",
            border: `1px solid ${foto.surfaces.edge}`,
            background: foto.surfaces.canvas,
            borderRadius: "7px",
            cursor: action.disabled ? "not-allowed" : "pointer",
            color: foto.ink.secondary,
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: "0.04em",
            transition:
              "background 120ms ease, color 120ms ease, border-color 120ms ease",
            opacity: action.disabled ? 0.5 : 1,
            "&:hover": action.disabled
              ? undefined
              : {
                  background: foto.accent.soft,
                  color: foto.accent.deep,
                  borderColor: foto.accent.primary,
                },
            "&:focus-visible": {
              outline: "none",
              boxShadow: `0 0 0 2px ${foto.accent.glow}`,
            },
          }}
        >
          <Pencil size={11} strokeWidth={1.8} aria-hidden />
          {action.label}
        </Box>
      ) : null}
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
  const { notify } = useNotification();

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
  const updateLot = useConvexMutation(convexApi.lots.update);
  const updatePreponderancia = useConvexMutation(
    convexApi.lotItems.updatePreponderancia,
  );

  // Form state -----------------------------------------------------------------
  // Tipo gates which draft is active; we hold both side-by-side so flipping
  // between Gema and Bruto doesn't wipe in-progress fields for the other type.
  // Each draft is reset independently on save.
  const [tipo, setTipo] = useState<TipoItem>("gema");
  const [gema, setGema] = useState<GemaDraft>(EMPTY_GEMA_DRAFT);
  const [bruto, setBruto] = useState<BrutoDraft>(EMPTY_BRUTO_DRAFT);
  const [observacion, setObservacion] = useState("");
  // Slice plan: items default to hidden from catalog (reserve). The Switch is
  // "Reserva oculta" ON → `mostrarEnCatalogo: false`.
  const [reservaOculta, setReservaOculta] = useState(true);
  const [photos, setPhotos] = useState<DropzonePhoto[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit drawers ---------------------------------------------------------------
  const [editLotOpen, setEditLotOpen] = useState(false);
  const [editingLotItemId, setEditingLotItemId] =
    useState<Id<"lotItems"> | null>(null);

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

  // Active draft surface — the form fields below dispatch off `tipo`, but
  // preponderancia + nombre validations are uniform across types.
  const activeDraft = tipo === "bruto" ? bruto : gema;
  const activePreponderancia = activeDraft.preponderancia;
  const activeNombre = activeDraft.nombre;

  const prepNumeric =
    typeof activePreponderancia === "number" ? activePreponderancia : 0;
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
      activePreponderancia === "" &&
      prepTotal.remaining > 0.01
    ) {
      return {
        text: `Es el último ítem del lote: te queda ${(Math.round(prepTotal.remaining * 10) / 10).toFixed(1)}% para completar el 100%.`,
        alert: false,
      };
    }
    return null;
  }, [overflow, isLastItem, activePreponderancia, prepTotal.remaining]);

  // Save handlers --------------------------------------------------------------
  const canSave =
    !!lot &&
    lot.estado === "abierto" &&
    activeNombre.trim().length > 0 &&
    typeof activePreponderancia === "number" &&
    activePreponderancia > 0 &&
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
    setBruto(EMPTY_BRUTO_DRAFT);
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
      if (tipo === "bruto") {
        await createLotItem({
          loteId,
          tipo,
          nombre: bruto.nombre.trim(),
          preponderancia: bruto.preponderancia as number,
          peso: bruto.pesoTotal || undefined,
          procedencia: bruto.procedencia || undefined,
          cantidadEstimada:
            typeof bruto.cantidadEstimada === "number"
              ? bruto.cantidadEstimada
              : undefined,
          rendimientoEsperado:
            typeof bruto.rendimientoEsperado === "number"
              ? bruto.rendimientoEsperado
              : undefined,
          precioPublicoCOP:
            typeof bruto.precioPublicoCOP === "number"
              ? bruto.precioPublicoCOP
              : undefined,
          observacion: observacion.trim() || undefined,
          mostrarEnCatalogo: !reservaOculta,
        });
      } else {
        await createLotItem({
          loteId,
          tipo,
          nombre: gema.nombre.trim(),
          preponderancia: gema.preponderancia as number,
          color: gema.color || undefined,
          calidad: gema.calidad,
          peso: gema.peso || undefined,
          procedencia: gema.procedencia || undefined,
          precioPublicoCOP:
            typeof gema.precioPublicoCOP === "number"
              ? gema.precioPublicoCOP
              : undefined,
          observacion: observacion.trim() || undefined,
          mostrarEnCatalogo: !reservaOculta,
        });
      }
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
    bruto,
    observacion,
    reservaOculta,
    resetItemDraft,
  ]);

  const handleCloseLot = useCallback(() => {
    if (!canCloseLot) return;
    navigate(`/admin/fotosintesis/lots/${loteId}/close`);
  }, [canCloseLot, navigate, loteId]);

  const handleDuplicate = useCallback(() => {
    // ⌘D — clone type-shared fields (procedencia, plus type-specific
    // contextual ones); reset nombre/peso/preponderancia for the next ítem.
    if (tipo === "bruto") {
      setBruto((prev) => ({
        ...EMPTY_BRUTO_DRAFT,
        procedencia: prev.procedencia,
        rendimientoEsperado: prev.rendimientoEsperado,
      }));
    } else {
      setGema((prev) => ({
        ...EMPTY_GEMA_DRAFT,
        color: prev.color,
        calidad: prev.calidad,
        procedencia: prev.procedencia,
      }));
    }
  }, [tipo]);

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
      // 1 / 2 / 3 / 4 / 5 — type select (only when not typing)
      if (!isTyping(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          setTipo("gema");
        } else if (e.key === "2") {
          e.preventDefault();
          setTipo("bruto");
        }
        // 3/4/5 are visually present but disabled — swallow noise.
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
        value: formaPagoShort(lot.formaPago, lot.metodoContado),
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
        idSlot={<LotSwitcher currentLoteId={loteId} />}
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

            {tipo === "bruto" ? (
              <BrutoFields
                value={bruto}
                onChange={(patch) =>
                  setBruto((prev) => ({ ...prev, ...patch }))
                }
                lotCostoTotalCOP={costoTotalCOP}
                preponderanciaHelper={prepHelper?.text}
                preponderanciaHelperAlert={prepHelper?.alert}
              />
            ) : (
              <GemaFields
                value={gema}
                onChange={(patch) => setGema((prev) => ({ ...prev, ...patch }))}
                lotCostoTotalCOP={costoTotalCOP}
                preponderanciaHelper={prepHelper?.text}
                preponderanciaHelperAlert={prepHelper?.alert}
              />
            )}

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
          {(() => {
            const editable = lot.estado === "abierto";
            const handleCostoCommit = async (next: number) => {
              try {
                await updateLot({
                  id: lot._id as Id<"lots">,
                  patch: { costoTotalCOP: next },
                });
                notify("Costo del lote actualizado", "success");
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                notify(`No pudimos guardar el costo: ${msg}`, "error");
                throw err;
              }
            };
            const handleUnidadesCommit = async (next: number) => {
              if (next < itemsCount) {
                throw new Error(
                  `Ya hay ${itemsCount} ítems capturados — no puede bajar de ahí.`,
                );
              }
              try {
                await updateLot({
                  id: lot._id as Id<"lots">,
                  patch: { unidadesDeclaradas: next },
                });
                notify("Unidades declaradas actualizadas", "success");
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                notify(`No pudimos guardar las unidades: ${msg}`, "error");
                throw err;
              }
            };
            return (
              <LotMetaCard
                action={{
                  label: "Editar",
                  onClick: () => setEditLotOpen(true),
                  disabled: !editable,
                }}
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
                    value: (
                      <EditableMetaValue
                        value={lot.costoTotalCOP}
                        format={formatCOP}
                        onCommit={handleCostoCommit}
                        disabled={!editable}
                        min={1}
                        step={1000}
                        variant="currency"
                        ariaLabel="costo total del lote"
                        helper={
                          editable
                            ? "Cambia el costo total del lote (Enter para guardar, Esc para cancelar)."
                            : undefined
                        }
                      />
                    ),
                  },
                  {
                    label: "Unidades",
                    value: (
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "baseline",
                          gap: "4px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Box component="span">{itemsCount}/</Box>
                        <EditableMetaValue
                          value={unidadesDeclaradas}
                          format={(n) => String(n)}
                          onCommit={handleUnidadesCommit}
                          disabled={!editable}
                          min={Math.max(1, itemsCount)}
                          step={1}
                          variant="count"
                          ariaLabel="unidades declaradas del lote"
                          helper={
                            editable
                              ? `Mínimo ${Math.max(1, itemsCount)} (ya capturadas).`
                              : undefined
                          }
                        />
                      </Box>
                    ),
                  },
                  {
                    label: "Pago",
                    value: formaPagoShort(lot.formaPago),
                  },
                  {
                    label: "Factura",
                    value: lot.numeroFactura ?? "por adjuntar",
                    alert: !lot.numeroFactura,
                  },
                ]}
              />
            );
          })()}

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
            {(items ?? []).map((item, idx) => {
              const itemEditable = lot.estado === "abierto";
              const handlePrepCommit = async (next: number) => {
                try {
                  await updatePreponderancia({
                    lotItemId: item._id as Id<"lotItems">,
                    preponderancia: next,
                  });
                  notify(
                    `Preponderancia de #${item.itemId} actualizada`,
                    "success",
                  );
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  notify(
                    `No pudimos actualizar la preponderancia: ${msg}`,
                    "error",
                  );
                  throw err;
                }
              };
              return (
                <Box component="li" key={item._id} sx={{ margin: 0 }}>
                  <ItemMiniCard
                    ticketId={`${loteId} · ${String(idx + 1).padStart(3, "0")}`}
                    name={item.itemId}
                    meta={
                      typeof item.preponderancia === "number"
                        ? `costo ${formatCOP(item.costoBaseCOP)}`
                        : undefined
                    }
                    preponderanciaSlot={
                      <EditableMetaValue
                        value={item.preponderancia}
                        format={(n) => `${Math.round(n * 10) / 10}%`}
                        onCommit={handlePrepCommit}
                        disabled={!itemEditable}
                        min={0.1}
                        max={100}
                        step={0.1}
                        variant="count"
                        ariaLabel={`preponderancia del ítem ${item.itemId}`}
                      />
                    }
                    cost={formatCOP(item.costoBaseCOP)}
                    state="done"
                    onEdit={
                      itemEditable
                        ? () => setEditingLotItemId(item._id as Id<"lotItems">)
                        : undefined
                    }
                  />
                </Box>
              );
            })}
            {/* Active row for the in-progress item */}
            {itemsCount < unidadesDeclaradas
              ? (() => {
                  const activeName =
                    tipo === "bruto"
                      ? bruto.nombre.trim() || "Bruto en captura"
                      : gema.nombre.trim() || "Ítem en captura";
                  const activePrep =
                    typeof activePreponderancia === "number"
                      ? activePreponderancia
                      : undefined;
                  const baseMeta =
                    typeof activePrep === "number"
                      ? `${activePrep}% · ${formatCOP(
                          Math.round(costoTotalCOP * (activePrep / 100)),
                        )}`
                      : "Esperando preponderancia…";
                  let activeMeta = baseMeta;
                  if (tipo === "bruto") {
                    const brutoBits: string[] = [];
                    if (bruto.pesoTotal.trim().length > 0)
                      brutoBits.push(bruto.pesoTotal.trim());
                    if (typeof bruto.cantidadEstimada === "number")
                      brutoBits.push(`${bruto.cantidadEstimada} pzs est`);
                    if (typeof bruto.rendimientoEsperado === "number")
                      brutoBits.push(`${bruto.rendimientoEsperado}% rendim`);
                    if (brutoBits.length > 0) {
                      activeMeta =
                        typeof activePrep === "number"
                          ? `${brutoBits.join(" · ")} · ${baseMeta}`
                          : brutoBits.join(" · ");
                    }
                  }
                  return (
                    <Box component="li" sx={{ margin: 0 }}>
                      <ItemMiniCard
                        ticketId={`${loteId} · ${String(itemsCount + 1).padStart(3, "0")}`}
                        name={activeName}
                        meta={activeMeta}
                        preponderancia={activePrep}
                        state="active"
                      />
                    </Box>
                  );
                })()
              : null}
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
              { label: "Cambiar a Bruto", keys: ["2"] },
              { label: "Abrir buscador global", keys: ["⌘", "K"] },
            ]}
          />
        </Box>
      </Box>

      <ProveedorNuevoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={({ id }) => {
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
          // here with `{ providerId: id }`.
          setDrawerOpen(false);
          void id;
          if (typeof window !== "undefined") {
            // eslint-disable-next-line no-alert
            window.alert(
              `Proveedor creado, pero el enlace al lote ${loteId} requiere extender lots.update en el servidor (Slice 2). Por ahora abrí el lote de nuevo desde Inicio para volver a empezar con este proveedor.`,
            );
          }
        }}
        contextLabel={`${loteId} · sin salir de la captura`}
      />

      {/* Lot meta edit drawer ------------------------------------------------- */}
      <EditLotDrawer
        open={editLotOpen}
        onClose={() => setEditLotOpen(false)}
        lot={lot}
        itemsCount={itemsCount}
      />

      {/* Item edit drawer ----------------------------------------------------- */}
      {(() => {
        const editingItem = (items ?? []).find(
          (it) => it._id === editingLotItemId,
        );
        const editingIndex = editingItem
          ? (items ?? []).findIndex((it) => it._id === editingItem._id)
          : -1;
        const siblingSum = editingItem
          ? (items ?? [])
              .filter((it) => it._id !== editingItem._id)
              .reduce((s, it) => s + it.preponderancia, 0)
          : 0;
        return editingItem ? (
          <EditItemDrawer
            open={true}
            onClose={() => setEditingLotItemId(null)}
            itemId={editingItem.itemId}
            lotItemId={editingItem._id as Id<"lotItems">}
            currentPreponderancia={editingItem.preponderancia}
            lotCostoTotalCOP={costoTotalCOP}
            siblingPreponderanciaSum={siblingSum}
            ticketLabel={`${loteId} · ${String(editingIndex + 1).padStart(3, "0")}`}
            editable={lot.estado === "abierto"}
          />
        ) : null;
      })()}
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Route entry — dispatches between "new" intro and the active editor
// -----------------------------------------------------------------------------

export default function FotosintesisCapturaLotePage() {
  const { loteId } = useParams<{ loteId: string }>();

  if (!loteId || loteId === "new") {
    return <NewLotIntro />;
  }

  return <ActiveLotPage loteId={loteId} />;
}
