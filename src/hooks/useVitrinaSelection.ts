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

  const openShare = useCallback(() => setShareOpen(true), []);
  // Cerrar CONSERVA la selección y el modo: el asesor típicamente ajusta dos
  // piezas y reenvía, y el flujo de editar-enlace-existente del diálogo
  // necesita exactamente los mismos items.
  const closeShare = useCallback(() => setShareOpen(false), []);

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
