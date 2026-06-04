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
      className="tap bov-card"
      type="button"
      onClick={() => navigate(`/esmereogenesis/${plan.id}`)}
      aria-label={`Abrir jardín de ${displayName}${plan.nickname ? ` (${productName})` : ""} · ${progressPct}% regada`}
      style={{
        position: "relative",
        background: `radial-gradient(ellipse 130% 55% at 50% 145%, rgba(0,174,122,${0.04 + progress * 0.07}) 0%, transparent 70%), var(--surface)`,
        border: "1px solid var(--hairline)",
        borderRadius: 20,
        padding: "14px 12px 18px",
        cursor: "pointer",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        overflow: "hidden",
        color: "var(--ink)",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
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
      {/* Progress bar at the bottom of the card */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2.5,
          background: "var(--hairline)",
          borderRadius: "0 0 20px 20px",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${progressPct}%`,
            background: isComplete
              ? "linear-gradient(90deg, var(--gold), var(--gold-bright))"
              : "linear-gradient(90deg, var(--em), var(--em-bright))",
            transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </span>
    </button>
  );
};

export default EsmereoPlanCard;
