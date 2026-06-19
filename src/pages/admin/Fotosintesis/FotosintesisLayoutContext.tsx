import { createContext, useContext } from "react";
import type {
  BatchEditPatch,
  GuidedDraft,
  GuidedFlow,
} from "./copilot/flowSchemas";

export interface SpotlightOpenOptions {
  /** Optional scope chip displayed in the search header, e.g. "Solo vendibles". */
  scope?: string;
  /** Called with the selected product (single-select mode). */
  onSelect?: (product: SpotlightProduct) => void;
  /**
   * Multi-select mode: rows toggle in/out instead of closing on click, and the
   * operator confirms a whole set via the footer "Listo" button (or ⌘↵).
   * VentaPage opts in so a sale can bundle several pieces.
   */
  multiSelect?: boolean;
  /**
   * Pre-selected products to seed multi-select mode with. Carries the full
   * product objects (not just ids) so already-chosen items stay visible and
   * de-selectable even when they fall outside the current search results.
   */
  selectedProducts?: SpotlightProduct[];
  /** Called with the full chosen set when multi-select is confirmed. */
  onConfirm?: (products: SpotlightProduct[]) => void;
}

export interface SpotlightProduct {
  itemId: string;
  nombre: string;
  thumbnailUrl?: string;
  precioCop?: number;
  loteId?: string;
  estado?: string;
}

export interface FotosintesisLayoutContextValue {
  openSpotlight: (options?: SpotlightOpenOptions) => void;
  closeSpotlight: () => void;
  /**
   * Register page-level default spotlight options. Used when the spotlight is
   * opened WITHOUT explicit options — i.e. the global ⌘K hotkey and the topbar
   * "Buscar" button. Without this, those entry points open a spotlight with no
   * `onSelect`, so picking an item silently does nothing (the affordance the
   * venta page itself advertises). Pass `null` on unmount to clear.
   */
  registerSpotlightDefault: (options: SpotlightOpenOptions | null) => void;

  // ─── Fotosynthia v2 · guided-capture hand-off ──────────────────────
  //
  // The Copilot panel writes an AI-built draft here and navigates to the
  // target form, which reads it ONCE on mount and seeds its existing state.
  // The AI never calls a mutation — the human still clicks the form's own
  // Guardar/Confirmar.

  /**
   * Store an AI-built draft for `flow` and navigate to `targetPath`. Backed by
   * a ref (no re-render); `draftNonce` bumps so the target page re-seeds even
   * when navigation stays on the same route.
   */
  openDraftForm: (
    flow: GuidedFlow,
    data: GuidedDraft,
    targetPath: string,
  ) => void;
  /**
   * One-shot read of a pending draft for `flow`. Returns null if none is
   * pending (or it targets another flow), and clears it so it seeds only once.
   */
  consumeDraftForm: (flow: GuidedFlow) => GuidedDraft | null;
  /** Increments on each openDraftForm — use as a seeding-effect dependency. */
  draftNonce: number;

  /** Queue a batch of item edits for the per-item review loop. */
  enqueueEdits: (edits: BatchEditPatch[]) => void;
  /** Peek the current batch-edit queue (does not advance). */
  peekEdits: () => BatchEditPatch[];
  /** Pop the next batch edit, advancing the queue (null when empty). */
  dequeueEdit: () => BatchEditPatch | null;
  /** Increments on each enqueueEdits — use to react to a new batch. */
  editQueueNonce: number;
}

const FotosintesisLayoutContext = createContext<
  FotosintesisLayoutContextValue | undefined
>(undefined);

export const FotosintesisLayoutProvider = FotosintesisLayoutContext.Provider;

export function useFotosintesisLayout(): FotosintesisLayoutContextValue {
  const ctx = useContext(FotosintesisLayoutContext);
  if (!ctx) {
    throw new Error(
      "useFotosintesisLayout must be used within a FotosintesisLayoutProvider",
    );
  }
  return ctx;
}

/**
 * Like `useFotosintesisLayout`, but returns `null` when used OUTSIDE the
 * provider instead of throwing. The Copilot rail mounts at the app shell and
 * renders on every back-office route, so it must read the capture hand-off bus
 * defensively: the bus exists only while a `/admin/fotosintesis/*` route (which
 * mounts `FotosintesisLayout`) is active. Off those routes this returns null and
 * the rail hides the capture hand-off affordance.
 */
export function useFotosintesisLayoutSafe(): FotosintesisLayoutContextValue | null {
  return useContext(FotosintesisLayoutContext) ?? null;
}
