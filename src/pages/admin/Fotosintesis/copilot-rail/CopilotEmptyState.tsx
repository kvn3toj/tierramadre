import { useState } from "react";
import { Box } from "@mui/material";
import {
  Boxes,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  PackagePlus,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  UserPlus,
  Users,
} from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";

/** Grouped action categories — the admin can pick what they need in one click. */
const ACTION_GROUPS = [
  {
    label: "Inventario",
    icon: <PackagePlus size={13} strokeWidth={1.8} />,
    prompts: [
      { text: "Crear un lote nuevo", short: "Nuevo lote" },
      { text: "Registrar una gema nueva en este lote", short: "Nueva gema" },
      { text: "Registrar una joya nueva en este lote", short: "Nueva joya" },
      { text: "Registrar un insumo nuevo en este lote", short: "Nuevo insumo" },
    ],
  },
  {
    label: "Ventas",
    icon: <ShoppingBag size={13} strokeWidth={1.8} />,
    prompts: [
      { text: "Registrar una venta", short: "Registrar venta" },
      { text: "Crear un cliente final nuevo", short: "Nuevo cliente" },
      { text: "Crear un embajador nuevo", short: "Nuevo embajador" },
    ],
  },
  {
    label: "Directorio",
    icon: <Users size={13} strokeWidth={1.8} />,
    prompts: [
      { text: "Crear un proveedor nuevo", short: "Nuevo proveedor" },
      { text: "Llévame al directorio de clientes", short: "Ver clientes" },
    ],
  },
  {
    label: "Navegar",
    icon: <Search size={13} strokeWidth={1.8} />,
    prompts: [
      { text: "Llévame a Analytics", short: "Analytics" },
      { text: "Llévame al catálogo de esmeraldas", short: "Catálogo" },
      { text: "Ver los lotes abiertos", short: "Ver lotes" },
    ],
  },
];

interface GuideStep {
  number: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}

const STEPS: GuideStep[] = [
  {
    number: "01",
    icon: <Compass size={14} strokeWidth={1.8} />,
    title: "Inicio · panorama del atelier",
    body: "Salud del sistema (disponibles, lotes abiertos, sincronización, última venta) y la siguiente acción sugerida.",
  },
  {
    number: "02",
    icon: <PackagePlus size={14} strokeWidth={1.8} />,
    title: "Registrar compra · abrir un lote",
    body: "Cuando llega una caja: lote nuevo con ID autonumerado (B-NNN), proveedor, costo, forma de pago y unidades.",
  },
  {
    number: "03",
    icon: <UserPlus size={14} strokeWidth={1.8} />,
    title: "Proveedor inline · sin salir del flujo",
    body: "Si el proveedor no existe, el drawer lo crea sin perder la captura. Valida NIT y detecta duplicados.",
  },
  {
    number: "04",
    icon: <Camera size={14} strokeWidth={1.8} />,
    title: "Captura del lote · ítem por ítem",
    body: "Gema, joya o insumo: tipo, foto, peso, preponderancia (% del costo) y materiales. El anillo marca el 100%.",
  },
  {
    number: "05",
    icon: <CheckCircle2 size={14} strokeWidth={1.8} />,
    title: "Cerrar el lote · publicar al catálogo",
    body: "Con preponderancias al 100%, foto en cada ítem y sin errores de sync, eliges qué publicar y cierras el lote.",
  },
  {
    number: "06",
    icon: <Search size={14} strokeWidth={1.8} />,
    title: "Spotlight · buscar cualquier ítem",
    body: "Busca por nombre, ID, lote, calidad o estado. ⌘K desde cualquier pantalla; en venta viene filtrado a vendibles.",
  },
  {
    number: "07",
    icon: <Tag size={14} strokeWidth={1.8} />,
    title: "Cerrar una venta · Kardex en un click",
    body: "Comprador, producto, forma de pago y privacidad. El Kardex se genera como PDF y se guarda en Drive.",
  },
  {
    number: "08",
    icon: <Users size={14} strokeWidth={1.8} />,
    title: "Directorio · proveedores y clientes",
    body: "Proveedores, embajadores y clientes finales con fichas, métricas e historial completo de cada contacto.",
  },
  {
    number: "09",
    icon: <Boxes size={14} strokeWidth={1.8} />,
    title: "Lotes · ver todo el historial",
    body: "Más allá de los lotes en curso: abiertos, cerrados, publicados y cancelados, con filtros y búsqueda.",
  },
];

interface CopilotEmptyStateProps {
  onSuggested: (prompt: string) => void;
  disabled: boolean;
}

/**
 * First-run surface inside the rail's message list.
 * Shows grouped quick-action categories instead of a flat list — the admin
 * picks a category and clicks one action to fire it directly (no typing).
 */
export function CopilotEmptyState({
  onSuggested,
  disabled,
}: CopilotEmptyStateProps) {
  const foto = getFoto("light");
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const chipBase = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "7px",
    border: `1px solid ${foto.surfaces.rule}`,
    background: foto.surfaces.canvas,
    color: foto.ink.secondary,
    fontSize: "11.5px",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
    "&:hover": {
      background: foto.accent.soft,
      borderColor: foto.accent.primary,
      color: foto.accent.deep,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
      "&:hover": { background: foto.surfaces.canvas, borderColor: foto.surfaces.rule, color: foto.ink.secondary },
    },
    "&:focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
    },
  } as const;

  return (
    <Box>
      {/* Introduction */}
      <Box
        sx={{
          fontSize: "12.5px",
          color: foto.ink.secondary,
          lineHeight: 1.55,
          marginBottom: "16px",
        }}
      >
        Soy <strong>Fotosynthia</strong>. Elegí una categoría y hacé click en lo
        que querés hacer — o escribí lo que necesitás en el campo de texto.
      </Box>

      {/* Category tabs */}
      <Box sx={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
        {ACTION_GROUPS.map((group) => (
          <Box
            key={group.label}
            component="button"
            type="button"
            onClick={() =>
              setActiveGroup(activeGroup === group.label ? null : group.label)
            }
            sx={{
              ...chipBase,
              display: "inline-flex",
              gap: "5px",
              padding: "5px 11px",
              borderRadius: "8px",
              fontWeight: 500,
              ...(activeGroup === group.label && {
                background: foto.accent.soft,
                borderColor: foto.accent.primary,
                color: foto.accent.deep,
              }),
            }}
          >
            {group.icon}
            {group.label}
          </Box>
        ))}
      </Box>

      {/* Expanded group prompts */}
      {activeGroup && (() => {
        const group = ACTION_GROUPS.find((g) => g.label === activeGroup);
        if (!group) return null;
        return (
          <Box
            sx={{
              marginBottom: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {group.prompts.map((p) => (
              <Box
                key={p.text}
                component="button"
                type="button"
                onClick={() => onSuggested(p.text)}
                disabled={disabled}
                sx={{
                  textAlign: "left",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  color: foto.ink.primary,
                  background: foto.surfaces.canvas,
                  border: `1px solid ${foto.surfaces.rule}`,
                  borderRadius: "10px",
                  padding: "9px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 120ms ease, border-color 120ms ease",
                  "&:hover": {
                    background: foto.accent.soft,
                    borderColor: foto.accent.primary,
                    color: foto.accent.deep,
                  },
                  "&:disabled": {
                    cursor: "not-allowed",
                    color: foto.ink.mute,
                    background: foto.surfaces.panel,
                  },
                  "&:focus-visible": {
                    outline: "none",
                    boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                  },
                }}
              >
                <Sparkles
                  size={11}
                  strokeWidth={2}
                  style={{ flexShrink: 0, opacity: 0.5 }}
                />
                {p.text}
              </Box>
            ))}
          </Box>
        );
      })()}

      {/* When no category is expanded: show the 4 most common quick chips inline */}
      {!activeGroup && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
          {[
            { text: "Crear un lote nuevo", short: "Nuevo lote" },
            { text: "Registrar una venta", short: "Registrar venta" },
            { text: "Registrar una gema nueva en este lote", short: "Nueva gema" },
            { text: "Llévame a Analytics", short: "Analytics" },
          ].map((p) => (
            <Box
              key={p.short}
              component="button"
              type="button"
              onClick={() => onSuggested(p.text)}
              disabled={disabled}
              sx={{
                ...chipBase,
                padding: "6px 12px",
                borderRadius: "10px",
                fontSize: "12px",
                color: foto.ink.primary,
              }}
            >
              {p.short}
            </Box>
          ))}
        </Box>
      )}

      {/* Folded atelier guide */}
      <Box
        component="button"
        type="button"
        onClick={() => setGuideOpen((v) => !v)}
        aria-expanded={guideOpen}
        sx={{
          marginTop: "4px",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "9px 12px",
          background: foto.surfaces.panel,
          border: `1px solid ${foto.surfaces.rule}`,
          borderRadius: "10px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "11.5px",
          fontWeight: 600,
          color: foto.ink.secondary,
          "&:hover": {
            color: foto.ink.primary,
            background: foto.surfaces.inset,
          },
          "&:focus-visible": {
            outline: "none",
            boxShadow: `0 0 0 3px ${foto.accent.glow}`,
          },
        }}
      >
        <span>Cómo funciona el atelier</span>
        {guideOpen ? (
          <ChevronDown size={14} strokeWidth={1.8} />
        ) : (
          <ChevronRight size={14} strokeWidth={1.8} />
        )}
      </Box>

      {guideOpen && (
        <Box
          component="ol"
          sx={{
            margin: "10px 0 0",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {STEPS.map((step) => (
            <Box
              key={step.number}
              component="li"
              sx={{
                border: `1px solid ${foto.surfaces.rule}`,
                borderRadius: "10px",
                padding: "10px 12px",
                background: foto.surfaces.canvas,
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                columnGap: "10px",
                alignItems: "start",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Box
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontSize: "10px",
                    fontWeight: 600,
                    color: foto.accent.deep,
                  }}
                >
                  {step.number}
                </Box>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "7px",
                    background: foto.accent.soft,
                    color: foto.accent.deep,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step.icon}
                </Box>
              </Box>
              <Box>
                <Box
                  sx={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: foto.ink.primary,
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </Box>
                <Box
                  sx={{
                    marginTop: "4px",
                    fontSize: "11.5px",
                    color: foto.ink.secondary,
                    lineHeight: 1.5,
                  }}
                >
                  {step.body}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default CopilotEmptyState;
