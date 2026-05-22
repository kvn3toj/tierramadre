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
