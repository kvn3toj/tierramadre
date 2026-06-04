/**
 * EsmereogenesisCTA — the premium product-page entry point (Bóveda).
 *
 *   - New item → Concepto / Precio·duración variant toggle (persisted) + a
 *     premium emerald card that opens the "¿Qué es Esmereogénesis?" explainer.
 *   - Active plan → deep-links to its garden ("Continuar · X%").
 *   - Completed plan → deep-links ("Reclamada / Adquirida").
 *
 * Rendered on the product detail page (no EsmereoThemeProvider), so it wraps in
 * a vars-only `.bov-root` keyed to the GLOBAL theme to match the page.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Info } from "lucide-react";
import type { TreasureItem } from "../../types";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useThemeMode } from "../../contexts/ThemeContext";
import { useTrackingDispatch } from "../../contexts/TrackingContext";
import { useCurrencyFormat } from "../../contexts/CurrencyContext";
import { calcWeeklySuggested } from "../../data/esmereo-mock";
import { STORAGE_KEYS } from "../../constants/storage-keys";
import { EsmereoCreationSheet } from "./EsmereoCreationSheet";
import EsmereoExplainerSheet from "./EsmereoExplainerSheet";
import { LivingEmerald } from "./LivingEmerald";
import "./boveda.css";

type CtaVariant = "concepto" | "precio";

interface EsmereogenesisCTAProps {
  product: TreasureItem;
  /** Hide if the product is sold/unavailable */
  disabled?: boolean;
}

function CtaPill({
  children,
  gold,
}: {
  children: React.ReactNode;
  gold?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 9px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 600,
        background: gold ? "var(--accent-bg)" : "var(--surface-2)",
        border: `1px solid ${gold ? "var(--accent-line-strong)" : "var(--hairline)"}`,
        color: gold ? "var(--gold-bright)" : "var(--ink-soft)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export const EsmereogenesisCTA = ({
  product,
  disabled,
}: EsmereogenesisCTAProps) => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const { getActivePlanForItem, getLatestPlanForItem } = useEsmereogenesis();
  const { formatCurrency } = useCurrencyFormat();
  const { track } = useTrackingDispatch();
  const [creationOpen, setCreationOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [variant, setVariantState] = useState<CtaVariant>(() => {
    try {
      return (
        (localStorage.getItem(STORAGE_KEYS.BOVEDA_CTA_VARIANT) as CtaVariant) ||
        "concepto"
      );
    } catch {
      return "concepto";
    }
  });
  const setVariant = (v: CtaVariant) => {
    setVariantState(v);
    try {
      localStorage.setItem(STORAGE_KEYS.BOVEDA_CTA_VARIANT, v);
    } catch {
      /* private mode — non-fatal */
    }
    track("esmereo_cta_variant_toggled", { variant: v });
  };

  const activePlan = getActivePlanForItem(product.item);
  const latestPlan = getLatestPlanForItem(product.item);
  const completed =
    !activePlan &&
    latestPlan &&
    (latestPlan.state === "completed" || latestPlan.state === "claimed")
      ? latestPlan
      : null;
  const isNew = !activePlan && !completed;

  if (disabled) return null;

  const months = 6;
  const perWeek = calcWeeklySuggested(product.precioCOP, months);
  const activeProgress = activePlan
    ? activePlan.totalAbonadoCOP / activePlan.targetCOP
    : 0.5;

  const handleOpen = () => {
    if (activePlan) {
      navigate(`/esmereogenesis/${activePlan.id}`);
      return;
    }
    if (completed) {
      navigate(`/esmereogenesis/${completed.id}`);
      return;
    }
    setExplainerOpen(true);
    track("esmereo_context_sheet_opened", { itemId: product.item });
  };

  // Card copy per state.
  let title: React.ReactNode = (
    <>
      {variant === "concepto" && (
        <span style={{ color: "var(--gold-bright)" }}>✦ </span>
      )}
      Esmereógenesis
    </>
  );
  let subtitle = "Hazla tuya, ahorrando con propósito";
  let ariaLabel = "Esmereógenesis · conoce cómo funciona";
  if (activePlan) {
    title = "Continuar Esmereogénesis";
    subtitle = `Ya has aportado ${formatCurrency(activePlan.totalAbonadoCOP)}`;
    ariaLabel = `Continuar Esmereogénesis · ${Math.round(activeProgress * 100)}%`;
  } else if (completed) {
    title =
      completed.state === "claimed"
        ? "Reclamada · ver detalles"
        : "Adquirida · reclamar";
    subtitle = "Tu Esmereogénesis ha cobrado vida";
    ariaLabel = String(title);
  }

  return (
    <div className="bov-root" data-theme={mode}>
      {/* variant toggle (new plans only) */}
      {isNew && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 11,
          }}
        >
          <span
            style={{
              fontSize: 8.5,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              fontWeight: 600,
            }}
          >
            Variante del CTA
          </span>
          <div
            style={{
              display: "flex",
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: 999,
              padding: 3,
              gap: 2,
            }}
          >
            {(
              [
                ["concepto", "Concepto"],
                ["precio", "Precio · duración"],
              ] as [CtaVariant, string][]
            ).map(([v, l]) => {
              const on = variant === v;
              return (
                <button
                  key={v}
                  className="tap"
                  onClick={() => setVariant(v)}
                  aria-pressed={on}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    border: "none",
                    cursor: "pointer",
                    background: on
                      ? "linear-gradient(180deg, var(--em-bright), var(--em-deep))"
                      : "transparent",
                    color: on ? "#fff" : "var(--ink-faint)",
                    boxShadow: on
                      ? "inset 0 0 0 1px var(--accent-line-strong)"
                      : "none",
                  }}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* premium emerald CTA */}
      <button
        className="tap"
        onClick={handleOpen}
        aria-label={ariaLabel}
        style={{
          width: "100%",
          textAlign: "left",
          borderRadius: 22,
          padding: "15px 16px",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgba(14,124,90,0.26), rgba(11,92,70,0.08) 70%)",
          border: "1px solid var(--cta-border)",
          boxShadow: "var(--cta-glow)",
          display: "flex",
          alignItems: "center",
          gap: 13,
          cursor: "pointer",
        }}
      >
        <div
          className="anim-loop reduced-hide"
          aria-hidden
          style={{
            position: "absolute",
            inset: "-40% -10%",
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(248,250,247,0.06) 30deg, transparent 70deg, transparent 360deg)",
            animation: "bovSheen 18s linear infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            width: 56,
            height: 56,
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          <LivingEmerald
            imageSrc={product.imagen}
            corte={product.talla}
            progress={activeProgress}
            state="growing"
            size={56}
            showRing={false}
            showBeam={false}
            isPulsing={false}
          />
        </div>
        <div style={{ flex: 1, position: "relative", zIndex: 1, minWidth: 0 }}>
          <div
            className="serif"
            style={{
              fontSize: 20,
              lineHeight: 1.05,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-soft)",
              marginTop: 4,
              lineHeight: 1.35,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtitle}
          </div>
          {isNew && variant === "precio" && (
            <div
              style={{
                display: "flex",
                gap: 6,
                marginTop: 9,
                flexWrap: "wrap",
              }}
            >
              <CtaPill gold>{formatCurrency(perWeek)} / sem</CtaPill>
              <CtaPill>{months} meses</CtaPill>
              <CtaPill>sin intereses</CtaPill>
            </div>
          )}
          {activePlan && (
            <div
              style={{
                marginTop: 8,
                height: 5,
                borderRadius: 999,
                background: "var(--surface-2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.round(activeProgress * 100)}%`,
                  background:
                    "linear-gradient(90deg, var(--em-bright), var(--gold))",
                  borderRadius: 999,
                }}
              />
            </div>
          )}
        </div>
        <span
          style={{
            position: "relative",
            zIndex: 1,
            color: "var(--gold)",
            flexShrink: 0,
          }}
        >
          <ChevronRight size={18} strokeWidth={2} />
        </span>
      </button>

      {isNew && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            marginTop: 11,
            color: "var(--ink-faint)",
          }}
        >
          <Info size={13} strokeWidth={1.5} />
          <span style={{ fontSize: 11 }}>Toca para conocer cómo funciona</span>
        </div>
      )}

      <EsmereoExplainerSheet
        open={explainerOpen}
        onClose={() => setExplainerOpen(false)}
        onStart={() => {
          setExplainerOpen(false);
          window.setTimeout(() => setCreationOpen(true), 260);
        }}
        theme={mode}
      />
      <EsmereoCreationSheet
        open={creationOpen}
        onClose={() => setCreationOpen(false)}
        product={product}
      />
    </div>
  );
};

export default EsmereogenesisCTA;
