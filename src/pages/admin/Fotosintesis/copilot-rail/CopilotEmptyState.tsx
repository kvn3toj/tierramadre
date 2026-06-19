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
  Tag,
  UserPlus,
  Users,
} from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";

/** First-run openers — guided capture is Fotosynthia's primary role. */
export const SUGGESTED_PROMPTS = [
  "Registrar una gema nueva en este lote",
  "Crear un lote nuevo",
  "Registrar una venta",
  "Llévame a Analytics",
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
 * First-run surface inside the rail's message list: who Fotosynthia is, four
 * starter prompts, and the full atelier guide folded into a collapsible (it
 * replaces the old "Guía" tab). Shown only when the thread is empty.
 */
export function CopilotEmptyState({
  onSuggested,
  disabled,
}: CopilotEmptyStateProps) {
  const foto = getFoto("light");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <Box>
      <Box
        sx={{
          fontSize: "12.5px",
          color: foto.ink.secondary,
          lineHeight: 1.55,
          marginBottom: "14px",
        }}
      >
        Soy <strong>Fotosynthia</strong>. Decime qué querés registrar o editar —
        un lote, una gema, una joya, una venta, un proveedor — o pedime que te
        lleve a una pantalla. Te voy preguntando solo lo que falte y, cuando
        esté listo, te precargo el formulario para que revises y guardes.
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Box
            key={prompt}
            component="button"
            type="button"
            onClick={() => onSuggested(prompt)}
            disabled={disabled}
            sx={{
              textAlign: "left",
              fontFamily: "inherit",
              fontSize: "12px",
              color: foto.ink.primary,
              background: foto.surfaces.canvas,
              border: `1px solid ${foto.surfaces.rule}`,
              borderRadius: "10px",
              padding: "10px 12px",
              cursor: "pointer",
              transition: "background 120ms ease, border-color 120ms ease",
              "&:hover": {
                background: foto.surfaces.inset,
                borderColor: foto.surfaces.edgeStrong,
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
            {prompt}
          </Box>
        ))}
      </Box>

      {/* Folded atelier guide — replaces the retired "Guía" tab. */}
      <Box
        component="button"
        type="button"
        onClick={() => setGuideOpen((v) => !v)}
        aria-expanded={guideOpen}
        sx={{
          marginTop: "16px",
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
