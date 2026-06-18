import { createContext, useContext } from "react";
import type {
  BatchEditPatch,
  GuidedDraft,
  GuidedFlow,
} from "./copilot/flowSchemas";

export interface SpotlightOpenOptions {
  /** Optional scope chip displayed in the search header, e.g. "Solo vendibles". */
  scope?: string;
  /** Called with the selected product. */
  onSelect?: (product: SpotlightProduct) => void;
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
