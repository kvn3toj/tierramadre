/**
 * FotoRouteMenu — the Fotosíntesis header/menu drawer.
 *
 * Renders the FULL role-gated back-office route map (same registry + grouping +
 * icon resolution the Copilot rail's CopilotNavMap uses), plus a keyboard-shortcut
 * cheat-sheet and an ESTADO color legend. Every row routes through the shared,
 * role-gated `useAppNavigator().navigateTo(...)` — never a raw navigate — so the
 * live-session role gate (layer 3) always applies.
 *
 * Controlled: parent owns `open`. Presented as a right-anchored MUI Drawer, which
 * gives us focus-trap, Escape-to-close and aria-modal for free.
 */

import { useMemo } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { Box, Drawer, IconButton, Typography } from '@mui/material';
import {
  Activity,
  BarChart3,
  Boxes,
  Calculator,
  Camera,
  CheckCircle2,
  Circle,
  ClipboardList,
  Eye,
  FileBarChart,
  FileText,
  Gem,
  Inbox,
  Keyboard,
  Landmark,
  type LucideIcon,
  MessageSquare,
  Package,
  Pencil,
  Receipt,
  ShoppingBag,
  Sparkles,
  ScanLine,
  Tag,
  User,
  UserPlus,
  UserSearch,
  Users,
  X,
} from 'lucide-react';
import {
  getFoto,
  fontFamilies,
  zIndex,
  containedScrollY,
} from '../../../../design-system';
import {
  GROUP_ORDER,
  navMapForLevel,
  type AdminRouteEntry,
  type NavGroup,
} from '../../../../config/adminNavMap';
import { useAppNavigator } from '../../../../contexts/AppNavigatorContext';

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
  ScanLine,
  Tag,
  User,
  UserPlus,
  UserSearch,
  Users,
};

function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Circle;
}

interface ShortcutRow {
  keys: string;
  label: string;
}

const SHORTCUTS: readonly ShortcutRow[] = [
  { keys: '⌘ K', label: 'Buscar' },
  { keys: '⌘ N', label: 'Nuevo lote' },
  { keys: '⌘ V', label: 'Nueva venta' },
  { keys: '⌘ D', label: 'Directorio' },
  { keys: '⌘ J', label: 'Copiloto' },
];

export interface FotoRouteMenuProps {
  open: boolean;
  onClose: () => void;
  /** Optional anchor for popover-style callers; the Drawer presentation ignores it. */
  anchorEl?: HTMLElement | null;
}

export function FotoRouteMenu({ open, onClose }: FotoRouteMenuProps) {
  const foto = getFoto('light');
  const location = useLocation();
  const { accessLevel, navigateTo } = useAppNavigator();

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

  const isActive = (path: string): boolean =>
    !!matchPath({ path, end: true }, location.pathname);

  const legend: { label: string; color: string }[] = [
    { label: 'Disponible', color: foto.status.available },
    { label: 'Consignado', color: foto.status.consigned },
    { label: 'Vendido', color: foto.status.sold },
  ];

  const sectionLabelSx = {
    fontSize: '9px',
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: foto.ink.tertiary,
    fontWeight: 600,
    padding: '2px 4px 6px',
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: false }}
      PaperProps={{
        role: 'menu',
        'aria-label': 'Mapa de navegación de Fotosíntesis',
        sx: {
          width: { xs: '88vw', sm: 360 },
          maxWidth: 400,
          background: foto.surfaces.canvas,
          borderLeft: `1px solid ${foto.surfaces.rule}`,
          backgroundImage: 'none',
        },
      }}
      sx={{ zIndex: zIndex.sheetContent }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          padding: '14px 16px',
          borderBottom: `1px solid ${foto.surfaces.rule}`,
          background: foto.surfaces.panel,
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          <Camera size={16} strokeWidth={1.8} color={foto.accent.deep} />
          <Typography
            component="span"
            sx={{
              fontSize: '13px',
              fontWeight: 700,
              color: foto.ink.primary,
              letterSpacing: '0.01em',
            }}
          >
            Fotosíntesis
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="Cerrar menú"
          size="small"
          sx={{
            color: foto.ink.secondary,
            '&:hover': { color: foto.ink.primary },
          }}
        >
          <X size={18} strokeWidth={1.8} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box
        sx={{
          flex: 1,
          ...containedScrollY,
          padding: '6px 12px 20px',
        }}
      >
        {grouped.map(({ group, items }) => (
          <Box key={group} sx={{ marginTop: '10px' }}>
            <Box sx={sectionLabelSx}>{group}</Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {items.map((entry) => {
                const Icon = iconFor(entry.iconName);
                const active = isActive(entry.path);
                return (
                  <Box
                    key={entry.id}
                    component="button"
                    type="button"
                    role="menuitem"
                    title={entry.description}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      const result = navigateTo({
                        routeId: entry.id,
                        path: entry.path,
                        label: entry.label,
                      });
                      if (result.ok) onClose();
                    }}
                    sx={{
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      minHeight: 42,
                      padding: '9px 11px',
                      borderRadius: '9px',
                      border: `1px solid ${
                        active ? 'transparent' : foto.surfaces.edge
                      }`,
                      borderLeft: active
                        ? `2px solid ${foto.accent.primary}`
                        : `1px solid ${foto.surfaces.edge}`,
                      background: active
                        ? foto.surfaces.rowActive
                        : foto.surfaces.inset,
                      color: foto.ink.primary,
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition:
                        'background 120ms ease, border-color 120ms ease',
                      '&:hover': {
                        background: foto.surfaces.rowHover,
                        borderColor: foto.surfaces.edgeStrong,
                      },
                      '&:focus-visible': {
                        outline: 'none',
                        boxShadow: `0 0 0 3px ${foto.accent.glow}`,
                      },
                    }}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.8}
                      color={active ? foto.accent.deep : foto.ink.tertiary}
                    />
                    <Box
                      component="span"
                      sx={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
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

        {/* Keyboard shortcuts */}
        <Box sx={{ marginTop: '18px' }}>
          <Box
            sx={{
              ...sectionLabelSx,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Keyboard size={12} strokeWidth={1.8} color={foto.ink.tertiary} />
            Atajos de teclado
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '6px 4px 2px',
            }}
          >
            {SHORTCUTS.map((s) => (
              <Box
                key={s.keys}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  padding: '3px 2px',
                }}
              >
                <Typography
                  component="span"
                  sx={{ fontSize: '12.5px', color: foto.ink.secondary }}
                >
                  {s.label}
                </Typography>
                <Box
                  component="kbd"
                  sx={{
                    fontFamily: fontFamilies.mono,
                    fontSize: '10px',
                    color: foto.ink.secondary,
                    background: foto.surfaces.inset,
                    border: `1px solid ${foto.surfaces.edge}`,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.keys}
                </Box>
              </Box>
            ))}
            <Typography
              component="span"
              sx={{
                fontSize: '10.5px',
                color: foto.ink.tertiary,
                paddingTop: '4px',
              }}
            >
              Usá Ctrl en Windows.
            </Typography>
          </Box>
        </Box>

        {/* Estado legend */}
        <Box sx={{ marginTop: '16px' }}>
          <Box sx={sectionLabelSx}>Estado</Box>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '6px 4px 2px',
            }}
          >
            {legend.map((l) => (
              <Box
                key={l.label}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    backgroundColor: l.color,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  component="span"
                  sx={{ fontSize: '11.5px', color: foto.ink.secondary }}
                >
                  {l.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}

export default FotoRouteMenu;
