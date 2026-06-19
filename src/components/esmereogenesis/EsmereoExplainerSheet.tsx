/**
 * EsmereoExplainerSheet — "¿Qué es Esmereogénesis?" context sheet.
 *
 * Opens from the product CTA before any commitment: frames the method as
 * "no es un crédito, es ahorro con propósito", lists what it is NOT (no debt),
 * the three steps (Elige / Riega / Reclama), and leads into creation. Copy is
 * the spec's final §5.2 wording. Uses the Bóveda BottomSheetShell surface.
 */

import { Check, Sprout, Droplet, Award } from "lucide-react";
import type { ReactNode } from "react";
import { BottomSheetShell } from "./BottomSheetShell";
import { LivingEmerald } from "./LivingEmerald";
import { Kicker, WaterButton } from "./BovedaUI";

interface EsmereoExplainerSheetProps {
  open: boolean;
  onClose: () => void;
  /** Close the explainer and open the creation sheet. */
  onStart: () => void;
  theme?: "light" | "dark";
}

const NO_ES_DEUDA = [
  "Sin intereses",
  "Sin cuotas que te persiguen",
  "Sin multas si una semana no puedes regar",
  "Tu progreso siempre es tuyo",
];

const STEPS: [ReactNode, string, string, string][] = [
  [
    <Sprout size={18} strokeWidth={1.6} color="var(--em-bright)" />,
    "01",
    "Elige",
    "Elige tu esmeralda",
  ],
  [
    <Droplet size={18} strokeWidth={1.6} color="var(--em-bright)" />,
    "02",
    "Riega",
    "Riégala a tu ritmo, sin presión",
  ],
  [
    <Award size={18} strokeWidth={1.6} color="var(--em-bright)" />,
    "03",
    "Reclama",
    "Reclámala cuando florezca",
  ],
];

export default function EsmereoExplainerSheet({
  open,
  onClose,
  onStart,
  theme = "dark",
}: EsmereoExplainerSheetProps) {
  return (
    <BottomSheetShell
      open={open}
      onClose={onClose}
      ariaLabelledBy="esmereo-explainer-title"
      boveda
      bovedaTheme={theme}
    >
      {/* mini gem + kicker */}
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: 2 }}
      >
        <LivingEmerald
          progress={0.7}
          state="growing"
          size={84}
          showRing={false}
          showBeam={false}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <Kicker style={{ fontSize: 8.5 }}>¿Qué es Esmereogénesis?</Kicker>
        <div
          id="esmereo-explainer-title"
          className="serif"
          style={{
            fontSize: 27,
            lineHeight: 1.1,
            marginTop: 11,
            color: "var(--ink)",
          }}
        >
          No es un crédito.
          <br />
          <span style={{ color: "var(--gold-bright)", fontStyle: "italic" }}>
            Es ahorro con propósito.
          </span>
        </div>
      </div>

      <p
        style={{
          fontSize: 13.5,
          color: "var(--ink-soft)",
          lineHeight: 1.62,
          textAlign: "center",
          marginTop: 14,
        }}
      >
        Esmereogénesis es una forma consciente de hacer tuya una esmeralda: en
        vez de pagarla a crédito, la riegas poco a poco con aportes a tu propio
        ritmo, hasta que cobra vida y la reclamas.
      </p>

      {/* NO ES DEUDA block */}
      <div
        style={{
          marginTop: 20,
          padding: "16px 18px",
          borderRadius: 20,
          background: "var(--accent-bg-soft)",
          border: "1px solid var(--accent-line)",
        }}
      >
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--gold-bright)",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          No es deuda
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {NO_ES_DEUDA.map((t) => (
            <div
              key={t}
              style={{ display: "flex", alignItems: "center", gap: 11 }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: "rgba(51,193,148,0.18)",
                  border: "1px solid rgba(51,193,148,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={12} strokeWidth={2.2} color="var(--em-bright)" />
              </span>
              <span
                style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}
              >
                {t}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* three steps */}
      <div style={{ marginTop: 22 }}>
        <Kicker
          style={{ fontSize: 8.5, textAlign: "center", marginBottom: 14 }}
        >
          Así florece
        </Kicker>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {STEPS.map(([ic, n, t, d]) => (
            <div
              key={n}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "11px 14px",
                borderRadius: 16,
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: "rgba(51,193,148,0.14)",
                  border: "1px solid var(--accent-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {ic}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ display: "flex", alignItems: "baseline", gap: 8 }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "var(--gold)",
                      fontWeight: 700,
                    }}
                  >
                    {n}
                  </span>
                  <span
                    className="serif"
                    style={{ fontSize: 17, color: "var(--ink)" }}
                  >
                    {t}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                    marginTop: 2,
                  }}
                >
                  {d}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* closing line */}
      <div
        className="serif"
        style={{
          fontStyle: "italic",
          fontSize: 16,
          lineHeight: 1.45,
          textAlign: "center",
          color: "var(--ink)",
          margin: "24px 6px 0",
        }}
      >
        “Una relación, no una transacción — cuidas tu gema hasta que es tuya de
        verdad.”
      </div>

      <div style={{ marginTop: 22 }}>
        <WaterButton onClick={onStart} label="Comenzar mi Esmereogénesis" />
        <div
          style={{
            textAlign: "center",
            fontSize: 10.5,
            color: "var(--ink-faint)",
            marginTop: 11,
          }}
        >
          Sin permanencia · la piedra se reserva a tu nombre desde hoy.
        </div>
      </div>
    </BottomSheetShell>
  );
}
