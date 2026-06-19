import type { CSSProperties } from "react";
import type { EsmereoStage } from "../../types/esmereogenesis";
import { STAGE_META } from "./stages";

/**
 * StageChip — the growth-stage pill ("SEMILLA" … "✦ ECLOSIÓN") with a glowing
 * emerald dot. Ported from the prototype. Renders inside `.bov-root` (uses the
 * feature CSS vars). Decorative for SR (the stage is announced via the gem's
 * aria-label), so it's aria-hidden by default.
 */
export default function StageChip({
  stage,
  style,
}: {
  stage: EsmereoStage;
  style?: CSSProperties;
}) {
  const { label } = STAGE_META[stage];
  return (
    <div
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 999,
        background: "rgba(51,193,148,0.12)",
        border: "1px solid rgba(51,193,148,0.32)",
        ...style,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--em-bright)",
          boxShadow: "0 0 8px var(--em-bright)",
        }}
      />
      <span
        style={{
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: "var(--ink)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}
