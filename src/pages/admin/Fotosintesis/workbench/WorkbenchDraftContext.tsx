/**
 * Thin pass-through over the lifted chat hook so deep canvas fields can read
 * the live draft / write manual edits without prop-drilling. NOT a second store
 * — the single source of truth stays `useFotosynthiaChat`'s `priorDraft`.
 */
import { createContext, useContext } from "react";
import type { GuidedDraft } from "../copilot/flowSchemas";
import type { WorkbenchFlow } from "./workbenchSteps";

export interface WorkbenchDraftValue {
  flow: WorkbenchFlow;
  /** The live accumulated draft (slots). */
  draft: GuidedDraft;
  /** Keys filled by the most recent guided turn (for the field-fill highlight). */
  recentlyFilledKeys: string[];
  /** Merge a manual edit; rides the next guided turn (server re-hardens). */
  patchDraft: (patch: GuidedDraft, origin?: "human" | "copilot") => void;
}

const WorkbenchDraftContext = createContext<WorkbenchDraftValue | null>(null);

export const WorkbenchDraftProvider = WorkbenchDraftContext.Provider;

export function useWorkbenchDraft(): WorkbenchDraftValue {
  const ctx = useContext(WorkbenchDraftContext);
  if (!ctx) {
    throw new Error("useWorkbenchDraft must be used within a WorkbenchPage");
  }
  return ctx;
}

/** Non-throwing variant for components that may render outside the workbench. */
export function useWorkbenchDraftSafe(): WorkbenchDraftValue | null {
  return useContext(WorkbenchDraftContext);
}
