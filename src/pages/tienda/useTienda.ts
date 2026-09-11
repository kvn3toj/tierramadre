/**
 * El estado de la tienda: la selección, y dónde vive el menú.
 *
 * Ambos son `useSyncExternalStore` sobre un store de módulo, no un Context:
 * la tienda se monta fuera de `AppShellProviders`-con-sesión y no necesita un
 * proveedor más; y un store externo evita el bug que este proyecto ya
 * documentó en `useCart` (CarritoFlotante.tsx:11-21), donde cada llamador
 * recibía su propio `useState` y dos consumidores nunca veían el mismo número.
 * Aquí la barra de selección y la tarjeta SÍ observan el mismo valor.
 *
 * La selección persiste en `sessionStorage` (sobrevive navegar, muere al
 * cerrar la pestaña) y se PROYECTA a la URL sólo en /tienda/seleccion, que es
 * donde se comparte. Ese reparto es deliberado: un `?p=` arrastrado por cada
 * ruta ensucia todos los enlaces, y una selección que sólo vive en la URL se
 * pierde en cuanto alguien pulsa un enlace del menú.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { MAX_SELECCION } from '../../data/tienda';
import type { SeleccionItem } from '../../types/tienda';
import {
  alternar,
  claveDe,
  estaSeleccionada,
  parseSeleccionParam,
  serializeSeleccion,
} from '../../utils/tiendaSeleccion';

// ---------------------------------------------------------------- store base

function crearStore<T>(clave: string, inicial: T, leer: (raw: string) => T) {
  let valor: T = (() => {
    try {
      const raw = sessionStorage.getItem(clave);
      return raw ? leer(raw) : inicial;
    } catch {
      // Ventana privada, almacenamiento bloqueado: el store sigue funcionando
      // en memoria. Nunca es motivo para romper la página.
      return inicial;
    }
  })();

  const oyentes = new Set<() => void>();

  return {
    get: () => valor,
    set(siguiente: T, escribir: (v: T) => string) {
      valor = siguiente;
      try {
        sessionStorage.setItem(clave, escribir(siguiente));
      } catch {
        /* sin persistencia, pero la sesión en memoria sigue viva */
      }
      oyentes.forEach((o) => o());
    },
    subscribe(o: () => void) {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
  };
}

// ------------------------------------------------------------------ selección

const storeSeleccion = crearStore<SeleccionItem[]>(
  'tm-tienda-seleccion',
  [],
  (raw) => parseSeleccionParam(raw),
);

export interface UseSeleccion {
  seleccion: SeleccionItem[];
  count: number;
  full: boolean;
  isSelected: (item: SeleccionItem) => boolean;
  /** Devuelve `true` si el toque cambió algo; `false` si la lista estaba
   *  llena, para que el llamador pueda avisar en vez de fallar en silencio. */
  toggle: (item: SeleccionItem) => boolean;
  clear: () => void;
  /** La forma compartible: `anillo-compromiso:oro-18k,mapa-colombia`. */
  serialized: string;
  /** Reemplaza la selección entera (hidratar desde un `?p=` compartido). */
  replace: (items: SeleccionItem[]) => void;
}

export function useSeleccion(): UseSeleccion {
  const seleccion = useSyncExternalStore(
    storeSeleccion.subscribe,
    storeSeleccion.get,
    storeSeleccion.get,
  );

  const escribir = (v: SeleccionItem[]) => serializeSeleccion(v);

  const toggle = useCallback((item: SeleccionItem) => {
    const antes = storeSeleccion.get();
    const despues = alternar(antes, item);
    if (despues === antes) return false; // llena
    storeSeleccion.set(despues, escribir);
    return true;
  }, []);

  const clear = useCallback(() => storeSeleccion.set([], escribir), []);
  const replace = useCallback(
    (items: SeleccionItem[]) => storeSeleccion.set(items, escribir),
    [],
  );

  return {
    seleccion,
    count: seleccion.length,
    full: seleccion.length >= MAX_SELECCION,
    isSelected: (item) => estaSeleccionada(seleccion, item),
    toggle,
    clear,
    serialized: serializeSeleccion(seleccion),
    replace,
  };
}

export { claveDe };

// -------------------------------------------------------- colocación del menú

/**
 * Dónde vive el menú. Las DOS opciones están construidas de verdad y se
 * alternan en vivo, porque la colocación es una decisión del dueño y se elige
 * mirándola, no leyendo una descripción.
 *
 * `?menu=bottom` gana sobre lo guardado, para poder mandar un enlace con una
 * de las dos opciones ya puesta.
 */
export type MenuPlacement = 'header' | 'bottom';

const PLACEMENT_INICIAL: MenuPlacement = (() => {
  try {
    const url = new URLSearchParams(window.location.search).get('menu');
    if (url === 'header' || url === 'bottom') return url;
    const guardado = sessionStorage.getItem('tm-tienda-menu');
    if (guardado === 'header' || guardado === 'bottom') return guardado;
  } catch {
    /* sin almacenamiento: cae al defecto */
  }
  return 'header';
})();

const storePlacement = crearStore<MenuPlacement>(
  'tm-tienda-menu',
  PLACEMENT_INICIAL,
  (raw) => (raw === 'bottom' ? 'bottom' : 'header'),
);
// El parámetro de URL manda sobre lo que hubiera guardado.
storePlacement.set(PLACEMENT_INICIAL, (v) => v);

export function useMenuPlacement(): [MenuPlacement, (p: MenuPlacement) => void] {
  const placement = useSyncExternalStore(
    storePlacement.subscribe,
    storePlacement.get,
    storePlacement.get,
  );
  const set = useCallback(
    (p: MenuPlacement) => storePlacement.set(p, (v) => v),
    [],
  );
  return [placement, set];
}
