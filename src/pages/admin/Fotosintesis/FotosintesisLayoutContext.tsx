import { createContext, useContext } from "react";

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
