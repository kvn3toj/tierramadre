/**
 * TabBar wiring — slot sets + theme adapters for the unified TabBar (DS v3).
 *
 * The storefront and Fotosíntesis now share ONE bar; only these two things
 * differ per context: the slot list and the color theme. Everything else
 * (geometry, containment, motion, a11y) lives in TabBar.tsx.
 *
 * Target path: src/components/navigation/tabBarConfig.ts
 * (app-layer wiring: references app icons + routes, so it lives OUTSIDE the
 * pure design-system layer and feeds config into the DS-layer <TabBar>.)
 */

import { Home, Boxes, BarChart3, Users, Menu as MenuIcon } from 'lucide-react';
import EmeraldCutIcon from '../icons/EmeraldCutIcon';
import AmbassadorsGlobeIcon from '../icons/AmbassadorsGlobeIcon';
import { getQuietEmerald, getFoto, type QEMode } from '../../design-system';
import type {
  TabSlot,
  TabBarTheme,
} from '../../design-system/components/TabBar/TabBar';

// =============================================================================
// STOREFRONT (client) slots — 4 places + Menú (recommended default).
//
// The bottom bar holds only the browse-loop destinations. CUENTAS deliberately
// lives INSIDE the Menú (RouteMenu), where it already sits today in the "Más"
// sheet — it's a periodic destination, not a daily browse tab, so padding the
// bar to 5 just to mirror Fotosíntesis would only crowd it on a phone.
//
// To promote Cuentas back to a tab (e.g. if asesores hit it constantly), add
// this one slot before the `more` action slot:
//   { id: 'cuentas', label: 'Cuentas', icon: BarChart3, route: '/cuentas', match: 'prefix' },
// =============================================================================

export const STOREFRONT_SLOTS: readonly TabSlot[] = [
  { id: 'home', label: 'Inicio', icon: Home, route: '/home', match: 'exact' },
  {
    id: 'treasure',
    label: 'Tesoros',
    icon: EmeraldCutIcon as TabSlot['icon'],
    route: '/treasure',
    match: 'prefix',
  },
  {
    id: 'ambassadors',
    label: 'Embajadores',
    icon: AmbassadorsGlobeIcon as TabSlot['icon'],
    route: '/ambassadors',
    match: 'prefix',
  },
  { id: 'more', label: 'Menú', icon: MenuIcon, action: true },
] as const;

// Provider variant keeps its four direct places; no action slot. Mirrors the
// provider tabs the old IOSTabBar shipped — Cotizar (/provider/submit) stays a
// direct tab, so providers reach quoting in one tap (no Menú indirection).
export const PROVIDER_SLOTS: readonly TabSlot[] = [
  {
    id: 'provider-home',
    label: 'Inicio',
    icon: Home,
    route: '/provider',
    match: 'exact',
  },
  {
    id: 'provider-requests',
    label: 'Solicitudes',
    icon: BarChart3,
    route: '/provider/requests',
    match: 'prefix',
  },
  {
    id: 'provider-submit',
    label: 'Cotizar',
    icon: EmeraldCutIcon as TabSlot['icon'],
    route: '/provider/submit',
    match: 'prefix',
  },
  {
    id: 'provider-inventory',
    label: 'Inventario',
    icon: Boxes,
    route: '/provider/inventory',
    match: 'prefix',
  },
] as const;

// =============================================================================
// FOTOSÍNTESIS slots — unchanged from the bar users already love.
// =============================================================================

export const FOTO_SLOTS: readonly TabSlot[] = [
  {
    id: 'inicio',
    label: 'Inicio',
    icon: Home,
    route: '/admin/fotosintesis',
    match: 'exact',
  },
  {
    id: 'lotes',
    label: 'Lotes',
    icon: Boxes,
    route: '/admin/fotosintesis/lots',
    match: 'prefix',
  },
  {
    id: 'ventas',
    label: 'Ventas',
    icon: BarChart3,
    route: '/admin/fotosintesis/sales',
    match: 'prefix',
  },
  {
    id: 'directorio',
    label: 'Directorio',
    icon: Users,
    route: '/admin/fotosintesis/directory',
    match: 'prefix',
  },
  { id: 'menu', label: 'Menú', icon: MenuIcon, action: true },
] as const;

// =============================================================================
// THEME ADAPTERS — resolve DS tokens into the TabBar's flat theme contract.
// =============================================================================

/** Storefront bar: Quiet Emerald tokens. */
export function storefrontTabTheme(mode: QEMode): TabBarTheme {
  const qe = getQuietEmerald(mode);
  return {
    surface: qe.surface,
    border: qe.border,
    accentStrong: qe.accentStrong,
    onAccent: qe.onAccent,
    inactive: qe.subtle,
    hover: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    focus: mode === 'dark' ? 'rgba(52,201,155,0.30)' : 'rgba(0,120,92,0.22)',
    shadow:
      mode === 'dark'
        ? '0 4px 16px rgba(0,0,0,0.40)'
        : '0 4px 16px rgba(13,30,24,0.10)',
    fontUi:
      '"Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };
}

/** Fotosíntesis bar: Foto tokens (kept identical to today's look). */
export function fotoTabTheme(mode: QEMode): TabBarTheme {
  const foto = getFoto(mode);
  return {
    surface: foto.surfaces.canvas,
    border: foto.surfaces.edge,
    accentStrong: foto.accent.deep,
    onAccent: foto.ink.inverse,
    inactive: foto.ink.tertiary,
    hover: foto.surfaces.rowHover,
    focus: foto.accent.glow,
    shadow:
      mode === 'dark'
        ? '0 4px 16px rgba(0,0,0,0.40)'
        : '0 4px 16px rgba(11,16,14,0.12)',
    fontUi:
      '"Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };
}
