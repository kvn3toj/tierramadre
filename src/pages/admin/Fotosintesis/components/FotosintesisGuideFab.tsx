import { useEffect, useId, useMemo, useState } from "react";
import { Box, Drawer, IconButton, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Compass,
  PackagePlus,
  Search,
  Sparkles,
  Tag,
  UserPlus,
  Users,
  X as XIcon,
} from "lucide-react";
import { getFoto, fontFamilies } from "../../../../design-system";
import { KbdKey } from "./KbdKey";
import { CopilotPanel } from "./CopilotPanel";

type FabTab = "guide" | "copilot";

interface FotosintesisGuideFabProps {
  /** Defaults to false. Controlled prop is optional — uncontrolled by default. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface GuideStep {
  number: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  link?: { to: string; label: string };
  shortcut?: string[];
}

/**
 * Floating guide for the Fotosíntesis admin flow.
 *
 * One circular FAB lives at the bottom-right of every Fotosíntesis route. It
 * opens a right-side drawer with an ordered tour of the whole cycle: home →
 * compra → captura → cierre → spotlight → venta → directorio. The intent is
 * onboarding + reminder — Maritza (and any future admin) can re-open it any
 * time to remember the next step.
 *
 * Hotkey: `?` (Shift+/) toggles open/close from anywhere except input fields.
 * Respects `prefers-reduced-motion` for the FAB hover lift.
 */
export function FotosintesisGuideFab({
  open: openProp,
  onOpenChange,
}: FotosintesisGuideFabProps = {}) {
  const foto = getFoto("light");
  const titleId = useId();
  const subtitleId = useId();

  const [internalOpen, setInternalOpen] = useState(false);
  const [tab, setTab] = useState<FabTab>("guide");
  const open = openProp ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  // `?` toggles the guide. Ignore the keystroke when the user is typing.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "?") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setOpen(!open);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const steps = useMemo<GuideStep[]>(
    () => [
      {
        number: "01",
        icon: <Compass size={16} strokeWidth={1.8} />,
        title: "Inicio · panorama del atelier",
        body: "Saludo, salud del sistema (disponibles, lotes abiertos, sincronización, última venta) y el banner que sugiere la siguiente acción. Empieza aquí cada turno para ver el estado vivo.",
        link: { to: "/admin/fotosintesis", label: "Ir al inicio" },
      },
      {
        number: "02",
        icon: <PackagePlus size={16} strokeWidth={1.8} />,
        title: "Registrar compra · abrir un lote",
        body: "Cuando llega una caja, sobre o paquete: crea un lote nuevo. El sistema autonumera el ID (B-NNN), pides proveedor, fecha de recepción, costo total, forma de pago y unidades declaradas.",
        link: { to: "/admin/fotosintesis/lots/new", label: "Nueva compra" },
        shortcut: ["⌘", "N"],
      },
      {
        number: "03",
        icon: <UserPlus size={16} strokeWidth={1.8} />,
        title: "Proveedor inline · sin salir del flujo",
        body: "Si el proveedor no existe, el drawer lateral lo crea sin perder la captura. Validamos NIT colombiano, detectamos duplicados por nombre o documento y autovinculamos al lote en curso.",
      },
      {
        number: "04",
        icon: <Camera size={16} strokeWidth={1.8} />,
        title: "Captura del lote · ítem por ítem",
        body: "Cada ítem es gema, joya o insumo. Llenas tipo, foto (drag, paste o subida), peso, preponderancia (% del costo del lote) y materiales. El anillo te muestra cuánto te falta para sumar 100%.",
        shortcut: ["1", "2", "3", "4"],
      },
      {
        number: "05",
        icon: <CheckCircle2 size={16} strokeWidth={1.8} />,
        title: "Cerrar el lote · publicar al catálogo",
        body: "Cuando la suma de preponderancias = 100%, hay foto en cada ítem y no hay errores de sync, llegas a la pantalla de cierre. Decides qué ítems publicar al catálogo público y cierras el lote.",
      },
      {
        number: "06",
        icon: <Search size={16} strokeWidth={1.8} />,
        title: "Spotlight · buscar cualquier ítem",
        body: "El buscador global encuentra ítems por nombre, ID, lote, calidad o estado. Lo abres con ⌘K desde cualquier pantalla. En el flujo de venta, ya viene filtrado a 'solo vendibles'.",
        shortcut: ["⌘", "K"],
      },
      {
        number: "07",
        icon: <Tag size={16} strokeWidth={1.8} />,
        title: "Cerrar una venta · Kardex en un click",
        body: "Eliges comprador (embajador o cliente final), producto, forma de pago (esmereogénesis, contado o crédito) y privacidad. El Kardex en papel se genera como PDF y se guarda en Drive.",
        link: { to: "/admin/fotosintesis/sales/new", label: "Nueva venta" },
        shortcut: ["⌘", "V"],
      },
      {
        number: "08",
        icon: <Users size={16} strokeWidth={1.8} />,
        title: "Directorio · proveedores y clientes",
        body: "Un solo lugar para proveedores, embajadores y clientes finales. Buscas, abres ficha con métricas (total comprado, lotes, ítems) y revisas el historial completo de cada contacto.",
        link: {
          to: "/admin/fotosintesis/directory",
          label: "Abrir directorio",
        },
        shortcut: ["⌘", "D"],
      },
    ],
    [],
  );

  return (
    <>
      <Tooltip
        title="Guía + Fotosynthia · ?"
        placement="left"
        enterDelay={400}
        arrow
      >
        <IconButton
          aria-label="Abrir guía del flujo y copiloto Fotosynthia"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            // Lifted above the global iOS bottom tab bar (~80px) AND the
            // "nueva versión disponible" update banner that stacks on top of
            // it (~70px). Total clearance: ~170px + breathing room.
            // Smaller + tucked tighter on phones so it doesn't overlap form
            // content (QA flagged collisions with the Venta totals and
            // Captura inputs at mobile widths).
            bottom: {
              xs: "calc(168px + env(safe-area-inset-bottom))",
              md: 188,
            },
            right: { xs: 12, md: 28 },
            zIndex: 1300,
            width: { xs: 44, md: 56 },
            height: { xs: 44, md: 56 },
            borderRadius: "50%",
            background: foto.accent.primary,
            color: foto.ink.inverse,
            border: `1px solid ${alpha(foto.ink.primary, 0.08)}`,
            boxShadow: `0 1px 2px ${alpha(foto.ink.primary, 0.12)}, 0 14px 36px ${alpha(foto.ink.primary, 0.18)}`,
            transition:
              "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), background 120ms ease, box-shadow 180ms ease",
            "&:hover": {
              background: foto.accent.deep,
              "@media (prefers-reduced-motion: no-preference)": {
                transform: "translateY(-2px)",
              },
              boxShadow: `0 2px 4px ${alpha(foto.ink.primary, 0.14)}, 0 20px 44px ${alpha(foto.ink.primary, 0.22)}`,
            },
            "&:focus-visible": {
              outline: "none",
              boxShadow: `0 0 0 3px ${foto.accent.glow}, 0 14px 36px ${alpha(foto.ink.primary, 0.18)}`,
            },
          }}
        >
          <BookOpen size={22} strokeWidth={1.8} />
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 480 },
            maxWidth: "100vw",
            background: foto.surfaces.canvas,
            borderLeft: `1px solid ${foto.surfaces.edge}`,
            boxShadow: `-30px 0 80px ${alpha(foto.ink.primary, 0.18)}`,
          },
        }}
        ModalProps={{
          "aria-labelledby": titleId,
          "aria-describedby": subtitleId,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            color: foto.ink.primary,
          }}
        >
          {/* HEADER */}
          <Box
            sx={{
              padding: "22px 26px 18px",
              borderBottom: `1px solid ${foto.surfaces.rule}`,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "14px",
              alignItems: "start",
              background: foto.surfaces.canvas,
            }}
          >
            <Box>
              <Box
                sx={{
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: foto.ink.tertiary,
                  fontWeight: 500,
                }}
              >
                {tab === "guide"
                  ? "Atelier · guía del flujo"
                  : "Atelier · Fotosynthia copiloto"}
              </Box>
              <Box
                component="h2"
                id={titleId}
                sx={{
                  margin: "8px 0 6px",
                  fontSize: "22px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  color: foto.ink.primary,
                }}
              >
                {tab === "guide"
                  ? "Cómo funciona Fotosíntesis"
                  : "Habla con Fotosynthia"}
              </Box>
              <Box
                id={subtitleId}
                sx={{
                  fontSize: "12.5px",
                  color: foto.ink.secondary,
                  lineHeight: 1.55,
                  maxWidth: 380,
                }}
              >
                {tab === "guide"
                  ? "El ciclo completo en ocho pasos — desde que llega una caja hasta que el Kardex viaja al comprador."
                  : "Pregúntale por lotes, ventas, embajadores o el flujo en general. Responde en español, con datos vivos del taller."}
              </Box>
            </Box>
            <IconButton
              aria-label="Cerrar guía"
              onClick={() => setOpen(false)}
              size="small"
              sx={{
                color: foto.ink.secondary,
                border: `1px solid ${foto.surfaces.edge}`,
                borderRadius: "8px",
                width: 32,
                height: 32,
                minWidth: 44,
                minHeight: 44,
                "&:hover": {
                  background: foto.surfaces.inset,
                  color: foto.ink.primary,
                },
              }}
            >
              <XIcon size={16} strokeWidth={1.8} />
            </IconButton>
          </Box>

          {/* TABS — Guía / Copiloto */}
          <Box
            role="tablist"
            aria-label="Secciones de la guía"
            sx={{
              padding: "10px 26px 0",
              borderBottom: `1px solid ${foto.surfaces.rule}`,
              background: foto.surfaces.canvas,
              display: "inline-flex",
              gap: "4px",
            }}
          >
            {[
              { id: "guide" as FabTab, label: "Guía", icon: BookOpen },
              {
                id: "copilot" as FabTab,
                label: "Copiloto",
                icon: Sparkles,
              },
            ].map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <Box
                  key={id}
                  component="button"
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(id)}
                  sx={{
                    fontFamily: "inherit",
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? foto.accent.deep : foto.ink.secondary,
                    background: "transparent",
                    border: "none",
                    padding: "10px 12px",
                    borderBottom: `2px solid ${
                      isActive ? foto.accent.primary : "transparent"
                    }`,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "color 120ms ease, border-color 120ms ease",
                    "&:hover": {
                      color: isActive ? foto.accent.deep : foto.ink.primary,
                    },
                    "&:focus-visible": {
                      outline: "none",
                      boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                      borderRadius: "4px",
                    },
                  }}
                >
                  <Icon size={14} strokeWidth={1.8} />
                  {label}
                </Box>
              );
            })}
          </Box>

          {/* BODY · GUÍA */}
          {tab === "guide" && (
            <Box
              component="ol"
              sx={{
                flex: 1,
                overflowY: "auto",
                margin: 0,
                padding: "20px 26px 24px",
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {steps.map((step) => (
                <Box
                  key={step.number}
                  component="li"
                  sx={{
                    border: `1px solid ${foto.surfaces.rule}`,
                    borderRadius: "12px",
                    padding: "16px 16px 14px",
                    background: foto.surfaces.canvas,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    columnGap: "14px",
                    rowGap: "10px",
                    transition:
                      "border-color 120ms ease, background 120ms ease",
                    "&:hover": {
                      borderColor: foto.surfaces.edgeStrong,
                      background: foto.surfaces.panel,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        fontFamily: fontFamilies.mono,
                        fontSize: "11px",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.005em",
                        color: foto.accent.deep,
                        fontWeight: 600,
                      }}
                    >
                      {step.number}
                    </Box>
                    <Box
                      aria-hidden
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "9px",
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
                        fontSize: "14px",
                        fontWeight: 600,
                        letterSpacing: "-0.015em",
                        color: foto.ink.primary,
                        lineHeight: 1.3,
                      }}
                    >
                      {step.title}
                    </Box>
                    <Box
                      sx={{
                        marginTop: "6px",
                        fontSize: "12.5px",
                        color: foto.ink.secondary,
                        lineHeight: 1.55,
                      }}
                    >
                      {step.body}
                    </Box>
                    {(step.link || step.shortcut) && (
                      <Box
                        sx={{
                          marginTop: "12px",
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        {step.link && (
                          <Box
                            component={RouterLink}
                            to={step.link.to}
                            onClick={() => setOpen(false)}
                            sx={{
                              fontSize: "11.5px",
                              fontWeight: 600,
                              color: foto.accent.deep,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "5px 0",
                              borderBottom: `1px solid transparent`,
                              transition:
                                "color 120ms ease, border-color 120ms ease",
                              "&:hover": {
                                color: foto.accent.primary,
                                borderColor: foto.accent.primary,
                              },
                              "&:focus-visible": {
                                outline: "none",
                                boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                                borderRadius: "4px",
                              },
                            }}
                          >
                            {step.link.label}
                            <ArrowRight size={12} strokeWidth={2} />
                          </Box>
                        )}
                        {step.shortcut && (
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "10.5px",
                              color: foto.ink.tertiary,
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                fontSize: "9px",
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                fontWeight: 500,
                              }}
                            >
                              Atajo
                            </Box>
                            <Box sx={{ display: "inline-flex", gap: "3px" }}>
                              {step.shortcut.map((k, i) => (
                                <KbdKey key={`${step.number}-${k}-${i}`}>
                                  {k}
                                </KbdKey>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* BODY · COPILOTO */}
          {tab === "copilot" && (
            <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
              <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
                <CopilotPanel active={open && tab === "copilot"} />
              </Box>
            </Box>
          )}

          {/* FOOTER */}
          <Box
            sx={{
              padding: "14px 26px",
              borderTop: `1px solid ${foto.surfaces.rule}`,
              background: foto.surfaces.panel,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              fontSize: "11px",
              color: foto.ink.tertiary,
            }}
          >
            <Box
              sx={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <KbdKey>?</KbdKey>
              <span>
                {tab === "guide"
                  ? "abre o cierra esta guía"
                  : "abre o cierra el copiloto"}
              </span>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => setOpen(false)}
              sx={{
                fontFamily: "inherit",
                fontSize: "11.5px",
                fontWeight: 500,
                background: "transparent",
                border: `1px solid ${foto.surfaces.edge}`,
                borderRadius: "7px",
                padding: "6px 12px",
                color: foto.ink.secondary,
                cursor: "pointer",
                transition: "background 120ms ease, color 120ms ease",
                "&:hover": {
                  background: foto.surfaces.inset,
                  color: foto.ink.primary,
                },
                "&:focus-visible": {
                  outline: "none",
                  boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                },
              }}
            >
              Cerrar
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}

export default FotosintesisGuideFab;
