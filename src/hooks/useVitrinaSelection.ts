/**
 * useVitrinaSelection — el modo selección del catálogo autenticado.
 *
 * Un asesor entra al modo, toca tarjetas, y acuña un enlace `/v/<token>` con
 * esas piezas sin salir de `/treasure`. Este hook es todo el estado de ese
 * gesto.
 *
 * Tres decisiones de forma, todas deliberadas:
 *
 *   - **`number[]` ordenado, `Set` derivado.** El orden es el orden en que el
 *     asesor tocó las piezas, y es el orden en que el cliente las verá en el
 *     enlace. Un `Set` como fuente lo perdería.
 *
 *   - **Los `ShareItem` se DERIVAN de `treasureMap`, no se guardan.** Guardar el
 *     objeto congelaría el precio del instante del toque; derivarlo hace que un
 *     cambio de precio llegue al enlace.
 *
 *   - **Local al controller: NI un contexto NI una extensión de
 *     `useComparison`.** La comparación es cross-route por diseño y tiene tope
 *     4; generalizarla obligaría a tocar a todos sus consumidores para un
 *     beneficio inexistente, porque esta selección muere al salir del catálogo.
 *
 * Spec: docs/superpowers/specs/2026-09-01-seleccion-multiple-vitrina-design.md
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { TreasureItem } from '../types';
import { useLiveRegion } from '../components/shared/LiveRegion';
import { useNotification } from '../contexts/NotificationContext';
import {
  VITRINA_MAX_ITEMS,
  toggleId,
  pruneIds,
  toShareItems,
  type VitrinaShareItem,
} from '../utils/vitrinaSelection';

export interface UseVitrinaSelectionOptions {
  /** El catálogo COMPLETO por id (`useTreasureBrowserController`'s treasureMap). */
  treasureMap: ReadonlyMap<number, TreasureItem>;
  /** `useCanShareVitrina() && !isProviderMode`. Con false el hook es inerte. */
  enabled: boolean;
}

export interface UseVitrinaSelectionResult {
  selectionMode: boolean;
  enter: () => void;
  exit: () => void;
  toggle: (item: TreasureItem) => void;
  clear: () => void;
  undoClear: () => void;
  ids: number[];
  idsSet: ReadonlySet<number>;
  count: number;
  atCap: boolean;
  max: number;
  shareItems: VitrinaShareItem[];
  shareOpen: boolean;
  openShare: () => void;
  closeShare: () => void;
}

/**
 * Devuelve el foco al control que abrió el estado que se acaba de cerrar
 * (WCAG 2.4.3). Se busca por SELECTOR y no por ref porque los dos destinos
 * viven en componentes hermanos que este hook no renderiza —el interruptor
 * está en la barra de herramientas y «Compartir» en la barra inferior—, y
 * pasar dos refs por tres niveles para esto sería más frágil que un atributo
 * estable. En el frame siguiente, para que el DOM ya haya reaccionado al
 * cambio de estado (si no, el interruptor todavía dice «Listo»).
 */
function focusLater(selector: string) {
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(selector);
    el?.focus();
  });
}

/** Selector del interruptor «Seleccionar», ya fuera del modo. */
const TOGGLE_SELECTOR = '[aria-label="Seleccionar varias piezas"]';
/** Selector del botón «Compartir» de la barra inferior. */
const SHARE_SELECTOR = '[data-vitrina-share]';

/** El nombre como se lee en la tarjeta: sin el prefijo de lote (`L:…`).
 *  Copia deliberada de la regla de `GridCard.tsx` — el anuncio del lector de
 *  pantalla tiene que nombrar lo mismo que el ojo ve, no el dato crudo. */
function displayNameOf(item: TreasureItem): string {
  return (item.nombre || '')
    .replace(/^L:.*?\s/, '')
    .replace(/^L:/, '')
    .trim();
}

export function useVitrinaSelection({
  treasureMap,
  enabled,
}: UseVitrinaSelectionOptions): UseVitrinaSelectionResult {
  const { announce } = useLiveRegion();
  const { notify } = useNotification();

  const [selectionMode, setSelectionMode] = useState(false);
  const [ids, setIds] = useState<number[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  /** Respaldo del último `clear()`, para "Deshacer". */
  const lastClearedRef = useRef<number[]>([]);

  const idsSet = useMemo(() => new Set(ids), [ids]);
  const count = ids.length;
  const atCap = count >= VITRINA_MAX_ITEMS;

  const enter = useCallback(() => {
    if (!enabled) return;
    setSelectionMode(true);
    announce('Modo selección. Toca una pieza para seleccionarla.');
  }, [enabled, announce]);

  const exit = useCallback(() => {
    setSelectionMode((was) => {
      if (was) announce('Modo selección cerrado.');
      return false;
    });
    // Salir LIMPIA (semántica de Fotos). Una selección que sobreviviera
    // invisible reaparecería la próxima vez que el asesor entre, con piezas
    // curadas para otro cliente adentro.
    setIds([]);
    setShareOpen(false);
    focusLater(TOGGLE_SELECTOR);
  }, [announce]);

  const toggle = useCallback(
    (item: TreasureItem) => {
      if (!enabled) return;
      const nombre = displayNameOf(item);
      setIds((prev) => {
        const { ids: next, rejected } = toggleId(
          prev,
          item.item,
          VITRINA_MAX_ITEMS,
        );
        if (rejected) {
          // Asertivo a propósito: un rechazo silencioso deja al asesor tocando
          // una tarjeta que no responde, sin saber por qué.
          announce(
            `Ya tienes ${VITRINA_MAX_ITEMS} piezas, el máximo para un enlace.`,
            'assertive',
          );
          notify(`Máximo ${VITRINA_MAX_ITEMS} piezas por enlace`, 'warning');
          return prev;
        }
        const added = next.length > prev.length;
        announce(
          `${nombre} ${added ? 'seleccionada' : 'quitada'}. ${next.length} de ${VITRINA_MAX_ITEMS}.`,
        );
        return next;
      });
    },
    [enabled, announce, notify],
  );

  const undoClear = useCallback(() => {
    const restored = lastClearedRef.current;
    if (restored.length === 0) return;
    setIds(restored);
    lastClearedRef.current = [];
  }, []);

  const undoRef = useRef(undoClear);
  undoRef.current = undoClear;

  const clear = useCallback(() => {
    setIds((prev) => {
      if (prev.length === 0) return prev;
      lastClearedRef.current = prev;
      notify('Selección limpiada', 'info', {
        action: { label: 'Deshacer', onClick: () => undoRef.current() },
        durationMs: 6000,
      });
      return [];
    });
  }, [notify]);

  // Perder el permiso en caliente (cambio de rol, modo proveedor) cierra el
  // modo. La compuerta también vive en el JSX, pero un hook que sólo confía en
  // el JSX abre el modo el día que alguien olvide una condición.
  useEffect(() => {
    if (!enabled) {
      setSelectionMode(false);
      setIds([]);
      setShareOpen(false);
    }
  }, [enabled]);

  // Poda por EXISTENCIA, nunca por filtro: la selección sobrevive a los cambios
  // de filtro a propósito. Un catálogo vacío es "todavía no llegó", no "ya no
  // existe" — sin esa guarda, un refetch que pase por [] en un frame borraría
  // la curaduría entera sin que el asesor tocara nada.
  useEffect(() => {
    if (treasureMap.size === 0) return;
    setIds((prev) => pruneIds(prev, (id) => treasureMap.has(id)));
  }, [treasureMap]);

  const shareItems = useMemo(
    () => toShareItems(ids, treasureMap),
    [ids, treasureMap],
  );

  // ---- Escape ------------------------------------------------------------
  // Sólo mientras el modo esté abierto: un listener permanente le robaría el
  // Escape al primer diálogo que se monte encima.
  const exitRef = useRef(exit);
  exitRef.current = exit;

  useEffect(() => {
    if (!selectionMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectionMode]);

  // ---- El gesto de atrás --------------------------------------------------
  // Sin esto, "atrás" en un teléfono te saca del catálogo: el asesor pierde de
  // golpe la curaduría Y la posición de scroll. Patrón de `ImageLightbox`:
  // entrar empuja una entrada desechable, atrás la consume y sólo cierra el
  // modo, y salir por otra vía la desenrolla para no dejar pasos muertos.
  //
  // La diferencia con el lightbox: acá NO se puede leer `history.state` para
  // saber si la entrada sigue puesta. Esta pantalla corre `useUrlFilterSync`,
  // que hace `replaceState` en cada cambio de filtro y borraría la marca. Un
  // ref es la única señal fiable de si la entrada es nuestra y sigue viva.
  const pushedRef = useRef(false);
  const pushedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectionMode) return;

    window.history.pushState({ vitrinaSelection: true }, '');
    pushedRef.current = true;
    pushedPathRef.current = window.location.pathname;

    const onPopState = () => {
      // El navegador YA consumió nuestra entrada: desenrollarla otra vez
      // desharía una navegación real.
      pushedRef.current = false;
      exitRef.current();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (!pushedRef.current) return;
      pushedRef.current = false;
      // SÓLO si seguimos en la misma página. Si el asesor tocó «Inicio» o el
      // carrito estando en modo, React Router ya empujó su entrada y este
      // componente se está desmontando por eso: un `back()` acá desharía LA
      // NAVEGACIÓN DEL USUARIO y lo devolvería al catálogo. Medido en Chrome
      // contra el catálogo real (2026-09-01): pushState(/cart) → history.back
      // → popstate → pushState → popstate, y el historial quedaba sucio.
      //
      // Los cambios de filtro usan replaceState sobre la MISMA ruta, así que
      // una salida legítima del modo sigue desenrollando su entrada.
      if (window.location.pathname === pushedPathRef.current) {
        window.history.back();
      }
    };
  }, [selectionMode]);

  const openShare = useCallback(() => setShareOpen(true), []);
  // Cerrar CONSERVA la selección y el modo: el asesor típicamente ajusta dos
  // piezas y reenvía, y el flujo de editar-enlace-existente del diálogo
  // necesita exactamente los mismos items.
  const closeShare = useCallback(() => {
    setShareOpen(false);
    focusLater(SHARE_SELECTOR);
  }, []);

  return {
    selectionMode,
    enter,
    exit,
    toggle,
    clear,
    undoClear,
    ids,
    idsSet,
    count,
    atCap,
    max: VITRINA_MAX_ITEMS,
    shareItems,
    shareOpen,
    openShare,
    closeShare,
  };
}

export default useVitrinaSelection;
