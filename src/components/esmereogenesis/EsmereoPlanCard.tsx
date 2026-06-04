/**
 * EsmereoPlanCard — Bóveda overview card for one plan in the Hub grid.
 * A small living emerald (with its progress ring), the name, the % and a streak
 * chip. Renders inside the Hub's `.bov-root` (consumes the feature CSS vars).
 */

import { useNavigate } from "react-router-dom";
import { Flame, Sparkles } from "lucide-react";
import type { EsmereoPlan } from "../../types/esmereogenesis";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";
import { LivingEmerald } from "./LivingEmerald";

interface EsmereoPlanCardProps {
  plan: EsmereoPlan;
}

export const EsmereoPlanCard = ({ plan }: EsmereoPlanCardProps) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormat();
  const progress =
    plan.targetCOP > 0 ? plan.totalAbonadoCOP / plan.targetCOP : 0;
  const progressPct = Math.round(progress * 100);
  const isComplete = plan.state === "completed" || plan.state === "claimed";
  const productName = plan.productSnapshot.nombre
    .replace(/^L:.*?\s/, "")
    .replace(/^L:/, "")
    .trim();
  const displayName = plan.nickname ?? productName;

  return (
    <button
      className="tap"
      type="button"
      onClick={() => navigate(`/esmereogenesis/${plan.id}`)}
      aria-label={`Abrir jardín de ${displayName}${plan.nickname ? ` (${productName})` : ""} · ${progressPct}% regada`}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--hairline)",
        borderRadius: 20,
        padding: "14px 12px 16px",
        cursor: "pointer",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        overflow: "hidden",
        color: "var(--ink)",
      }}
    >
      <LivingEmerald
        imageSrc={plan.productSnapshot.imagen}
        corte={plan.productSnapshot.corte}
        progress={progress}
        state={plan.state}
        size={104}
        showBeam={false}
        isPulsing={!isComplete}
      />
      <div
        className="serif"
        style={{
          fontSize: 15,
          color: "var(--ink)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
        }}
      >
        {displayName}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{ fontSize: 13, fontWeight: 700, color: "var(--gold-bright)" }}
        >
          {progressPct}%
        </span>
        <span
          style={{
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: "var(--ink-faint)",
          }}
        />
        <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
          {formatCurrency(plan.totalAbonadoCOP)}
        </span>
      </div>
      {plan.streak.currentWeeks > 0 && !isComplete && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "var(--gold)",
          }}
        >
          <Flame size={11} fill="var(--gold)" stroke="var(--gold-bright)" />
          {plan.streak.currentWeeks} sem
        </span>
      )}
      {isComplete && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-line)",
            borderRadius: 999,
            padding: "2px 8px",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--gold-bright)",
          }}
        >
          <Sparkles size={11} />
          Adquirida
        </span>
      )}
    </button>
  );
};

export default EsmereoPlanCard;
