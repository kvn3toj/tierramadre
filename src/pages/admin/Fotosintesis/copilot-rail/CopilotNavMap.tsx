import { useMemo } from "react";
import { Box } from "@mui/material";
import { useLocation, matchPath } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Boxes,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Circle,
  Eye,
  FileBarChart,
  FileText,
  Gem,
  Inbox,
  Landmark,
  type LucideIcon,
  Map as MapIcon,
  MessageSquare,
  Package,
  Pencil,
  Receipt,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
  UserPlus,
  UserSearch,
  Users,
} from "lucide-react";
import { getFoto } from "../../../../design-system";
import {
  GROUP_ORDER,
  navMapForLevel,
  type AdminRouteEntry,
  type NavGroup,
} from "../../../../config/adminNavMap";
import { useAppNavigator } from "../../../../contexts/AppNavigatorContext";
import { useCopilotRail } from "./CopilotRailContext";

const ICONS: Record<string, LucideIcon> = {
  Activity,
  BarChart3,
  Boxes,
  Calculator,
  Camera,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileBarChart,
  FileText,
  Gem,
  Inbox,
  Landmark,
  MessageSquare,
  Package,
  Pencil,
  Receipt,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
  UserPlus,
  UserSearch,
  Users,
};

function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Circle;
}

/**
 * Collapsible route map in the rail. Lists every back-office screen the current
 * role can reach, grouped, with the active route highlighted. Clicking a node
 * routes through the shared, role-gated navigator — the same path the
 * natural-language `navigate` action uses.
 */
export function CopilotNavMap() {
  const foto = getFoto("light");
  const location = useLocation();
  const { accessLevel, navigateTo } = useAppNavigator();
  const { navMapOpen, toggleNavMap } = useCopilotRail();

  const grouped = useMemo(() => {
    const entries = navMapForLevel(accessLevel);
    const byGroup = new Map<NavGroup, AdminRouteEntry[]>();
    for (const e of entries) {
      const list = byGroup.get(e.group) ?? [];
      list.push(e);
      byGroup.set(e.group, list);
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
      group: g,
      items: byGroup.get(g)!,
    }));
  }, [accessLevel]);

  const total = useMemo(
    () => grouped.reduce((n, g) => n + g.items.length, 0),
    [grouped],
  );

  const isActive = (path: string): boolean =>
    !!matchPath({ path, end: true }, location.pathname);

  if (total === 0) return null;

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${foto.surfaces.rule}`,
        background: foto.surfaces.panel,
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={toggleNavMap}
        aria-expanded={navMapOpen}
        aria-controls="copilot-nav-map-body"
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "10px 22px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          color: foto.ink.secondary,
          "&:hover": { color: foto.ink.primary },
          "&:focus-visible": {
            outline: "none",
            boxShadow: `inset 0 0 0 2px ${foto.accent.glow}`,
          },
        }}
      >
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <MapIcon size={14} strokeWidth={1.8} color={foto.accent.deep} />
          <Box
            component="span"
            sx={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Mapa
          </Box>
          <Box
            component="span"
            sx={{ fontSize: "10.5px", color: foto.ink.tertiary }}
          >
            {total} pantallas
          </Box>
        </Box>
        {navMapOpen ? (
          <ChevronDown size={15} strokeWidth={1.8} />
        ) : (
          <ChevronRight size={15} strokeWidth={1.8} />
        )}
      </Box>

      {navMapOpen && (
        <Box
          id="copilot-nav-map-body"
          sx={{
            maxHeight: "34vh",
            overflowY: "auto",
            padding: "2px 14px 12px",
          }}
        >
          {grouped.map(({ group, items }) => (
            <Box key={group} sx={{ marginTop: "8px" }}>
              <Box
                sx={{
                  fontSize: "9px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: foto.ink.tertiary,
                  fontWeight: 600,
                  padding: "2px 8px 6px",
                }}
              >
                {group}
              </Box>
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: "3px" }}
              >
                {items.map((entry) => {
                  const Icon = iconFor(entry.iconName);
                  const active = isActive(entry.path);
                  return (
                    <Box
                      key={entry.id}
                      component="button"
                      type="button"
                      title={entry.description}
                      aria-current={active ? "page" : undefined}
                      onClick={() =>
                        navigateTo({
                          routeId: entry.id,
                          path: entry.path,
                          label: entry.label,
                        })
                      }
                      sx={{
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: "9px",
                        width: "100%",
                        minHeight: 38,
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: `1px solid ${
                          active ? "transparent" : foto.surfaces.edge
                        }`,
                        borderLeft: active
                          ? `2px solid ${foto.accent.primary}`
                          : `1px solid ${foto.surfaces.edge}`,
                        background: active
                          ? foto.surfaces.rowActive
                          : foto.surfaces.inset,
                        color: foto.ink.primary,
                        fontFamily: "inherit",
                        fontSize: "12.5px",
                        cursor: "pointer",
                        transition:
                          "background 120ms ease, border-color 120ms ease",
                        "&:hover": {
                          background: foto.surfaces.rowHover,
                          borderColor: foto.surfaces.edgeStrong,
                        },
                        "&:focus-visible": {
                          outline: "none",
                          boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                        },
                      }}
                    >
                      <Icon
                        size={15}
                        strokeWidth={1.8}
                        color={active ? foto.accent.deep : foto.ink.tertiary}
                      />
                      <Box
                        component="span"
                        sx={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        {entry.label}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default CopilotNavMap;
