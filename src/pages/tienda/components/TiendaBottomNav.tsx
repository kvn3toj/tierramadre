/**
 * Opción B del menú: la barra inferior.
 *
 * Monta la MISMA `TabBar` de DS3 que usa el resto de la app, con otras
 * ranuras y el tema storefront — «el tema es dato, nunca una bifurcación».
 * La TabBar es `position: fixed` y no necesita `IOSLayout`, así que una ruta
 * pública sin shell puede montarla tal cual.
 */
import { TabBar } from '../../../design-system';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useThemeMode } from '../../../contexts/ThemeContext';
import {
  TIENDA_SLOTS,
  storefrontTabTheme,
} from '../../../components/navigation/tabBarConfig';
import { useSeleccion } from '../useTienda';

export interface TiendaBottomNavProps {
  onOpenMenu: () => void;
  menuOpen: boolean;
}

export default function TiendaBottomNav({
  onOpenMenu,
  menuOpen,
}: TiendaBottomNavProps) {
  const { t } = useLanguage();
  const { mode } = useThemeMode();
  const { count } = useSeleccion();

  const slots = TIENDA_SLOTS.map((s) =>
    s.id === 'seleccion' && count > 0 ? { ...s, badge: count } : s,
  );

  return (
    <TabBar
      slots={slots}
      theme={storefrontTabTheme(mode)}
      onAction={onOpenMenu}
      actionOpen={menuOpen}
      ariaLabel={t.tienda.nav.landmark}
    />
  );
}
