// scripts/lib/apply-plan.ts
import type { ExtractionRow } from "./types";
import { deriveFieldWrites } from "./backfill-fields";
import { deriveTags } from "./backfill-tags";
import { chooseStageWrite } from "./backfill-stage";

export interface ContactPlan {
  contactId: string;
  fieldWrites: { key: string; field_value: string | number }[];
  tags: string[];
  stage: { stageId: string } | null;
}

export function planContactWrites(
  row: ExtractionRow,
  ctx: {
    currentFieldsByKey: Record<string, unknown>;
    currentTags: string[];
    currentStageId: string | null;
    settable: Map<string, { id: string; order: number }>;
  },
): ContactPlan {
  const { writes } = deriveFieldWrites(row, ctx.currentFieldsByKey);
  const already = new Set(ctx.currentTags.map((t) => t.toLowerCase().trim()));
  const tags = deriveTags(row).filter((t) => !already.has(t));
  const stage = ctx.currentStageId
    ? chooseStageWrite(row, ctx.currentStageId, ctx.settable)
    : null;
  return { contactId: row.contactId, fieldWrites: writes, tags, stage };
}
