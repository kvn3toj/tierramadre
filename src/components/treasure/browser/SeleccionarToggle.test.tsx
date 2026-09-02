/**
 * El interruptor «Seleccionar», en las dos barras de herramientas.
 *
 * Lo que se fija acá es una AUSENCIA, y es lo más importante del archivo:
 *
 *   **Sin `onToggleSelectionMode` el botón NO EXISTE.** La compuerta de permiso
 *   (`useCanShareVitrina() && !isProviderMode`) vive en el controller, y lo que
 *   viaja hasta acá es la presencia o ausencia del prop. Si esta rama se
 *   rompiera, un proveedor —que no debe ver precios ni compartir nada— vería un
 *   botón para armarle una vitrina a un cliente, y un invitado también.
 *
 *   Esa es exactamente la comprobación que el paso manual repite contra el DOM
 *   real (0 ocurrencias de la etiqueta), así que acá queda fijada en unidad.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { TreasureFilters } from '../../../hooks/useTreasureFiltering';

// Traducciones REALES: la barra pinta el dropdown de búsquedas guardadas, que
// lee media docena de claves. Un objeto de mentira acá no prueba nada y se
// rompe cada vez que alguien agrega una clave.
vi.mock('../../../contexts/LanguageContext', async () => {
  const { es } = await import('../../../locales');
  return { useLanguage: () => ({ t: es, language: 'es' }) };
});
// El dropdown de búsquedas guardadas arrastra CurrencyContext (formatea
// precios de las piezas recientes). Nada de eso tiene que ver con la regla
// bajo prueba.
vi.mock('../../../contexts/CurrencyContext', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (n: number) => String(n),
    formatFullCurrency: (n: number) => String(n),
  }),
  useCurrency: () => ({ currency: 'COP', multiplier: 1 }),
}));
vi.mock('../../../contexts/PriceShareContext', () => ({
  usePriceShare: () => ({ shouldShowPrices: true }),
}));
vi.mock('../../../contexts/ThemeContext', () => ({
  useThemeMode: () => ({ mode: 'light' }),
  useTheme: () => ({ mode: 'light' }),
}));

const { default: DesktopFilterToolbar } =
  await import('./DesktopFilterToolbar');
const { default: MobileSearchBar } = await import('./MobileSearchBar');

const FILTROS = {
  search: '',
  colorFilter: 'all',
  qualityFilter: 'all',
  typeFilter: 'all',
  statusFilter: 'all',
  shapeFilter: 'all',
  priceRange: [0, 100] as [number, number],
  caratRange: [0, 10] as [number, number],
  sortBy: 'newest',
  cantidadFilter: 'all',
  coleccionFilter: 'all',
  categoriaFilter: 'all',
} as unknown as TreasureFilters;

const noop = () => {};
const base = {
  viewMode: 'grid' as const,
  onViewModeChange: noop,
  savedFilters: {
    presets: [],
    savePreset: () => ({}) as never,
    deletePreset: noop,
  },
  hasFilters: false,
  filters: FILTROS,
  setSearch: noop,
  setColorFilter: noop,
  setQualityFilter: noop,
  setTypeFilter: noop,
  setStatusFilter: noop,
  setShapeFilter: noop,
  setPriceRange: noop,
  setSortBy: noop,
  setCantidadFilter: noop,
  trackViewModeChange: noop,
  isLight: true,
};

const ETIQUETA_ENTRAR = 'Seleccionar varias piezas';
const ETIQUETA_SALIR = 'Salir del modo selección';

afterEach(cleanup);

describe('DesktopFilterToolbar · interruptor Seleccionar', () => {
  it('SIN el prop, el botón no existe — así es como no lo ve un proveedor', () => {
    render(<DesktopFilterToolbar {...base} />);
    expect(screen.queryByRole('button', { name: ETIQUETA_ENTRAR })).toBeNull();
    expect(screen.queryByRole('button', { name: ETIQUETA_SALIR })).toBeNull();
  });

  it('con el prop aparece, sin presionar, y rotula la entrada', () => {
    render(<DesktopFilterToolbar {...base} onToggleSelectionMode={noop} />);
    const boton = screen.getByRole('button', { name: ETIQUETA_ENTRAR });
    expect(boton.getAttribute('aria-pressed')).toBe('false');
    // Sólo icono: la banda es de una línea y el rótulo recortaba la tira de
    // orígenes. El nombre vive en aria-label y en title.
    expect(boton.getAttribute('title')).toBe(ETIQUETA_ENTRAR);
  });

  it('dentro del modo queda presionado y rotula la SALIDA', () => {
    render(
      <DesktopFilterToolbar
        {...base}
        selectionMode
        onToggleSelectionMode={noop}
      />,
    );
    const boton = screen.getByRole('button', { name: ETIQUETA_SALIR });
    expect(boton.getAttribute('aria-pressed')).toBe('true');
    expect(boton.getAttribute('title')).toBe(ETIQUETA_SALIR);
  });

  it('presionarlo llama a su acción', () => {
    const onToggle = vi.fn();
    render(<DesktopFilterToolbar {...base} onToggleSelectionMode={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: ETIQUETA_ENTRAR }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

const baseMovil = {
  search: '',
  setSearch: noop,
  isLight: true,
  filterSheetOpen: false,
  setFilterSheetOpen: noop,
  hasFilters: false,
  activeFilterCount: 0,
  filters: FILTROS,
  priceMinMax: { min: 0, max: 100 },
  caratMinMax: { min: 0, max: 10 },
  setColorFilter: noop,
  setQualityFilter: noop,
  setTypeFilter: noop,
  setStatusFilter: noop,
  setShapeFilter: noop,
  setCantidadFilter: noop,
  setCategoriaFilter: noop,
  setHeroCategoryFilter: noop,
  setPriceRange: noop,
  setCaratRange: noop,
  showFavoritesOnly: false,
  setShowFavoritesOnly: noop,
  favoritesCount: 0,
  isProviderMode: false,
  filteredCount: 24,
};

describe('MobileSearchBar · interruptor Seleccionar', () => {
  it('SIN el prop, el botón no existe en el teléfono tampoco', () => {
    render(<MobileSearchBar {...baseMovil} />);
    expect(screen.queryByRole('button', { name: ETIQUETA_ENTRAR })).toBeNull();
  });

  it('con el prop aparece y arranca sin presionar', () => {
    render(<MobileSearchBar {...baseMovil} onToggleSelectionMode={noop} />);
    expect(
      screen
        .getByRole('button', { name: ETIQUETA_ENTRAR })
        .getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('dentro del modo cambia de etiqueta y queda presionado', () => {
    render(
      <MobileSearchBar
        {...baseMovil}
        selectionMode
        onToggleSelectionMode={noop}
      />,
    );
    expect(
      screen
        .getByRole('button', { name: ETIQUETA_SALIR })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('presionarlo llama a su acción', () => {
    const onToggle = vi.fn();
    render(
      <MobileSearchBar {...baseMovil} onToggleSelectionMode={onToggle} />,
    );
    fireEvent.click(screen.getByRole('button', { name: ETIQUETA_ENTRAR }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
