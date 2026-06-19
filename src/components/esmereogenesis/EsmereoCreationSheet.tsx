/**
 * EsmereoCreationSheet — Bóveda "Vas a sembrar".
 *
 * Pick a duration (3/6/9/12 months), optionally name the gem, see the live
 * weekly rhythm, then sow the plan and float through the "Sembrando…" moment
 * into its garden. Re-skinned to the prototype; surface + dismiss via
 * BottomSheetShell (boveda paper). Creation logic unchanged.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DurationMonths } from "../../types/esmereogenesis";
import type { TreasureItem } from "../../types";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useTrackingDispatch } from "../../contexts/TrackingContext";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";
import { calcWeeklySuggested } from "../../data/esmereo-mock";
import { BottomSheetShell } from "./BottomSheetShell";
import { LivingEmerald } from "./LivingEmerald";
import { Kicker, WaterButton } from "./BovedaUI";
import SiembraOverlay from "./SiembraOverlay";

const DURATIONS: DurationMonths[] = [3, 6, 9, 12];
const NICKNAME_MAX = 24;

const reducedMotion =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface EsmereoCreationSheetProps {
  open: boolean;
  onClose: () => void;
  product: TreasureItem;
  /** Feature theme so the sheet + siembra overlay match where it was opened from. */
  theme?: "light" | "dark";
}

export const EsmereoCreationSheet = ({
  open,
  onClose,
  product,
  theme = "dark",
}: EsmereoCreationSheetProps) => {
  const navigate = useNavigate();
  const { createPlan } = useEsmereogenesis();
  const { track } = useTrackingDispatch();
  const { formatCurrency } = useCurrencyFormat();
  const [months, setMonths] = useState<DurationMonths>(6);
  const [nickname, setNickname] = useState("");
  const [seedingName, setSeedingName] = useState<string | null>(null);

  const weeklySuggested = useMemo(
    () => calcWeeklySuggested(product.precioCOP, months),
    [product.precioCOP, months],
  );

  const productName = product.nombre
    .replace(/^L:.*?\s/, "")
    .replace(/^L:/, "")
    .trim();
  const displayName = nickname.trim() || productName;

  const handleSeed = () => {
    const trimmed = nickname.trim().slice(0, NICKNAME_MAX);
    const plan = createPlan(
      product,
      months,
      trimmed.length > 0 ? trimmed : undefined,
    );
    track("esmereo_plan_created", {
      itemId: product.item,
      durationMonths: months,
      weeklySuggestedCOP: plan.weeklySuggestedCOP,
      totalCOP: plan.targetCOP,
      hasNickname: Boolean(plan.nickname),
    });
    onClose();
    setSeedingName(displayName);
    window.setTimeout(
      () => navigate(`/esmereogenesis/${plan.id}`),
      reducedMotion ? 350 : 1600,
    );
  };

  return (
    <>
      {seedingName && <SiembraOverlay name={seedingName} theme={theme} />}
      <BottomSheetShell
        open={open}
        onClose={onClose}
        ariaLabelledBy="esmereo-create-title"
        boveda
        bovedaTheme={theme}
      >
        {/* gem preview + heading */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 6,
          }}
        >
          <div style={{ width: 92, height: 92, flexShrink: 0 }}>
            <LivingEmerald
              imageSrc={product.imagen}
              corte={product.talla}
              progress={0.4}
              state="growing"
              size={92}
              showRing={false}
              showBeam={false}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <Kicker style={{ fontSize: 8.5 }}>Vas a sembrar</Kicker>
            <div
              id="esmereo-create-title"
              className="serif"
              style={{ fontSize: 24, marginTop: 4, color: "var(--ink)" }}
            >
              {displayName}
            </div>
            <div
              style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 3 }}
            >
              Meta {formatCurrency(product.precioCOP)}
            </div>
          </div>
        </div>

        {/* optional nickname */}
        <div style={{ marginTop: 18 }}>
          <Kicker style={{ fontSize: 8.5, marginBottom: 8 }}>
            Dale un nombre (opcional)
          </Kicker>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, NICKNAME_MAX))}
            placeholder={`Ej. Aurora Verde · ${productName}`}
            maxLength={NICKNAME_MAX}
            aria-label="Nombre cariñoso para tu Esmereogénesis"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>

        {/* duration selector */}
        <div style={{ marginTop: 18 }}>
          <Kicker style={{ fontSize: 8.5, marginBottom: 10 }}>
            Duración de tu génesis
          </Kicker>
          <div style={{ display: "flex", gap: 8 }}>
            {DURATIONS.map((m) => {
              const on = m === months;
              return (
                <button
                  key={m}
                  className="tap"
                  onClick={() => setMonths(m)}
                  aria-pressed={on}
                  style={{
                    flex: 1,
                    padding: "14px 4px",
                    borderRadius: 14,
                    textAlign: "center",
                    background: on
                      ? "linear-gradient(180deg, rgba(51,193,148,0.32), rgba(0,140,97,0.2))"
                      : "var(--surface)",
                    border: `1px solid ${on ? "var(--accent-line-strong)" : "var(--line)"}`,
                    transition: "all .2s",
                  }}
                >
                  <div
                    className="serif"
                    style={{
                      fontSize: 22,
                      color: on ? "var(--gold-bright)" : "var(--ink)",
                    }}
                  >
                    {m}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--ink-faint)",
                      marginTop: 2,
                    }}
                  >
                    meses
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* live rhythm */}
        <div
          style={{
            marginTop: 16,
            padding: "16px 18px",
            borderRadius: 18,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
            }}
          >
            Ritmo semanal
          </div>
          <div
            className="serif"
            style={{ fontSize: 34, marginTop: 4, color: "var(--gold-bright)" }}
          >
            {formatCurrency(weeklySuggested)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-soft)",
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            Tu{" "}
            <b style={{ color: "var(--ink)", fontWeight: 600 }}>
              {displayName}
            </b>{" "}
            tomará vida en{" "}
            <b style={{ color: "var(--ink)", fontWeight: 600 }}>
              {months} meses
            </b>{" "}
            con aportes de{" "}
            <b style={{ color: "var(--gold-bright)", fontWeight: 600 }}>
              {formatCurrency(weeklySuggested)}
            </b>{" "}
            por semana.
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <WaterButton onClick={handleSeed} label="Sembrar mi Esmereogénesis" />
          <div
            style={{
              textAlign: "center",
              fontSize: 10.5,
              color: "var(--ink-faint)",
              marginTop: 11,
              lineHeight: 1.5,
            }}
          >
            Sin permanencia · la piedra se reserva a tu nombre desde hoy.
          </div>
        </div>
      </BottomSheetShell>
    </>
  );
};

export default EsmereoCreationSheet;
