/**
 * SiembraOverlay — the brief "Sembrando…" moment between confirming a new plan
 * and landing in its garden. A seed-stage gem in expanding rings with a pulsing
 * progress trio. Ported from the prototype. Full-screen, dark vault by default.
 */

import { LivingEmerald } from "./LivingEmerald";
import { Kicker } from "./BovedaUI";
import "./boveda.css";

const prefersReduced =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function SiembraOverlay({
  name,
  theme = "dark",
}: {
  name: string;
  theme?: "light" | "dark";
}) {
  return (
    <div
      className="bov-root"
      data-theme={theme}
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1600,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--veil)",
      }}
    >
      {!prefersReduced &&
        [0, 0.6].map((d, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "44%",
              width: 160,
              height: 160,
              borderRadius: "50%",
              border: "1px solid rgba(51,193,148,0.5)",
              animation: `ecloRing 2.4s ease-out ${d}s infinite`,
            }}
          />
        ))}
      <div style={{ position: "relative", zIndex: 2 }}>
        <LivingEmerald
          progress={0.06}
          state="seeded"
          size={150}
          showRing={false}
          showBeam={false}
        />
      </div>
      <div style={{ textAlign: "center", marginTop: -6, zIndex: 3 }}>
        <Kicker style={{ color: "var(--gold)" }}>Sembrando</Kicker>
        <div
          className="serif"
          style={{ fontSize: 25, marginTop: 10, color: "var(--ink)" }}
        >
          Plantando tu {name}
        </div>
        <div
          style={{
            display: "flex",
            gap: 7,
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="anim-loop"
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--gold-bright)",
                animation: prefersReduced
                  ? "none"
                  : `siembraPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
