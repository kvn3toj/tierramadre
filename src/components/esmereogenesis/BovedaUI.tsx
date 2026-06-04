/**
 * BovedaUI — shared Bóveda chrome & atoms (ported from the prototype's bov-ui).
 * Kicker, StreakFlame, WaterButton, GhostBtn, AmountChips, TopBar, CloseX, and
 * the swipe-to-dismiss hook. All consume the feature CSS vars (render inside a
 * `.bov-root`) and the app's currency formatter, so amounts respect the global
 * currency/multiplier setting.
 */

import { useRef, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, Droplet, Flame, X } from "lucide-react";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";

export function Kicker({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 9.5,
        letterSpacing: "0.4em",
        textTransform: "uppercase",
        fontWeight: 600,
        color: "var(--gold)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Streak flame — scale + glow grow with the weeks count. */
export function StreakFlame({
  weeks,
  milestone = false,
}: {
  weeks: number;
  milestone?: boolean;
}) {
  const grow = Math.min(1, weeks / 30);
  const sz = 15 + grow * 7;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 15px",
        borderRadius: 999,
        background: "var(--accent-bg)",
        border: `1px solid rgba(212,175,55,${0.28 + grow * 0.2})`,
        boxShadow: milestone
          ? "0 0 22px -4px var(--gold)"
          : `0 0 ${10 + grow * 16}px -6px var(--gold)`,
        transition: "all .5s",
      }}
    >
      <span
        className="anim-loop"
        style={{
          display: "inline-flex",
          filter: `drop-shadow(0 0 ${3 + grow * 5}px var(--gold))`,
          animation: "bovBreathe 2.4s ease-in-out infinite",
        }}
      >
        <Flame
          size={sz}
          strokeWidth={1.4}
          fill="var(--gold)"
          stroke="var(--gold-bright)"
        />
      </span>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: "var(--gold-bright)",
          letterSpacing: "0.03em",
        }}
      >
        {weeks}{" "}
        <span style={{ fontWeight: 500, color: "var(--ink-soft)" }}>
          {weeks === 1 ? "semana regando" : "semanas regando"}
        </span>
      </span>
    </div>
  );
}

/** Primary luminous CTA. */
export function WaterButton({
  onClick,
  label = "Regar mi esmeralda",
  sub,
  busy = false,
  glow = true,
  disabled = false,
}: {
  onClick?: () => void;
  label?: string;
  sub?: string;
  busy?: boolean;
  glow?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className="tap bov-water"
      onClick={onClick}
      disabled={busy || disabled}
      style={{
        width: "100%",
        borderRadius: 999,
        padding: sub ? "13px" : "17px",
        opacity: busy || disabled ? 0.7 : 1,
        transition:
          "transform 0.12s cubic-bezier(0.34,1.56,0.64,1), filter 0.18s ease",
        background:
          "linear-gradient(180deg, var(--em-bright), var(--em) 50%, var(--em-deep))",
        boxShadow: glow
          ? "0 0 40px -8px var(--em-bright), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 0 0 1px var(--accent-line-strong)"
          : "inset 0 0 0 1px var(--accent-line-strong)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Droplet size={18} strokeWidth={1.7} color="#fff" />
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#fff",
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </span>
      {sub && (
        <span
          style={{
            fontSize: 11,
            color: "var(--btn-sub)",
            letterSpacing: "0.03em",
            whiteSpace: "nowrap",
          }}
        >
          {sub}
        </span>
      )}
    </button>
  );
}

export function GhostBtn({
  children,
  onClick,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      className="tap"
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: 999,
        padding: "14px",
        border: "1px solid var(--hairline)",
        background: "var(--surface)",
        backdropFilter: "blur(8px)",
        fontSize: 14.5,
        fontWeight: 600,
        color: "var(--ink)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Editable quick-amount chips: suggested / 2× / 4× / complete. */
export function AmountChips({
  amount,
  suggested,
  remaining,
  onPick,
}: {
  amount: number;
  suggested: number;
  remaining: number;
  onPick: (v: number) => void;
}) {
  const { formatCurrency } = useCurrencyFormat();
  const opts: { v: number; label: string; tag?: string }[] = [
    { v: suggested, label: formatCurrency(suggested), tag: "Sugerido" },
    { v: suggested * 2, label: formatCurrency(suggested * 2) },
    { v: suggested * 4, label: formatCurrency(suggested * 4) },
    { v: remaining, label: "Completar", tag: formatCurrency(remaining) },
  ];
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {opts.map((o, i) => {
        const on =
          amount === o.v || (o.label === "Completar" && amount >= remaining);
        return (
          <button
            key={i}
            className="tap bov-chip"
            onClick={() => onPick(o.v)}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 44,
              padding: "9px 4px",
              borderRadius: 13,
              textAlign: "center",
              background: on
                ? "linear-gradient(180deg, rgba(51,193,148,0.3), rgba(0,140,97,0.18))"
                : "var(--surface)",
              border: `1px solid ${on ? "var(--accent-line-strong)" : "var(--line)"}`,
              transition: "all .2s",
            }}
          >
            <div
              className="serif"
              style={{
                fontSize: 13,
                color: on ? "var(--gold-bright)" : "var(--ink)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {o.label}
            </div>
            {o.tag && (
              <div
                style={{
                  fontSize: 7.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {o.tag}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Shared top bar: optional back chevron, centered kicker+title, right slot. */
export function TopBar({
  title,
  sub,
  onBack,
  right,
  backLabel = "Volver",
}: {
  title: string;
  sub?: string;
  onBack?: (() => void) | null;
  right?: ReactNode;
  backLabel?: string;
}) {
  return (
    <div
      style={{
        flexShrink: 0,
        position: "relative",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "2px 18px 8px",
      }}
    >
      {onBack ? (
        <button
          className="tap"
          onClick={onBack}
          aria-label={backLabel}
          style={{
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink)",
          }}
        >
          <ChevronLeft size={22} strokeWidth={1.7} />
        </button>
      ) : (
        <span style={{ width: 44, height: 44 }} />
      )}
      <div style={{ textAlign: "center" }}>
        {sub && (
          <Kicker style={{ fontSize: 8.5, letterSpacing: "0.34em" }}>
            {sub}
          </Kicker>
        )}
        <div
          className="serif"
          style={{
            fontSize: 16.5,
            marginTop: sub ? 3 : 0,
            letterSpacing: "0.01em",
            color: "var(--ink)",
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          minWidth: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          color: "var(--ink-soft)",
        }}
      >
        {right}
      </div>
    </div>
  );
}

/** Sheet close ✕. */
export function CloseX({ onClose }: { onClose: () => void }) {
  return (
    <button
      className="tap"
      onClick={onClose}
      aria-label="Cerrar"
      style={{
        position: "absolute",
        top: 14,
        right: 16,
        zIndex: 6,
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "var(--surface-2)",
        border: "1px solid var(--hairline)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-soft)",
      }}
    >
      <X size={15} strokeWidth={1.8} />
    </button>
  );
}

/** Pointer swipe-down-to-dismiss handlers for sheet grabbers. */
export function useSwipeDown(onClose: () => void) {
  const startY = useRef<number | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      startY.current = e.clientY;
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (startY.current != null && e.clientY - startY.current > 54) onClose();
      startY.current = null;
    },
    onPointerCancel: () => {
      startY.current = null;
    },
  };
}
