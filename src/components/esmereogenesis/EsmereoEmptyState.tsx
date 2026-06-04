/**
 * EsmereoEmptyState — Bóveda "seed" state shown in the Hub when there are no
 * plans. A dormant living emerald in a soft beam invites the user to the
 * catalogue, with a discreet demo-garden loader. Renders inside the Hub's
 * `.bov-root`, so it reads in whichever feature theme is active.
 */

import { useNavigate } from "react-router-dom";
import { useEsmereogenesis } from "../../contexts/EsmereogenesisContext";
import { useTrackingDispatch } from "../../contexts/TrackingContext";
import { useTreasure } from "../../hooks/useTreasure";
import { LivingEmerald } from "./LivingEmerald";
import { Kicker, WaterButton } from "./BovedaUI";

interface EsmereoEmptyStateProps {
  onSeedDemo?: () => void;
}

export const EsmereoEmptyState = ({ onSeedDemo }: EsmereoEmptyStateProps) => {
  const navigate = useNavigate();
  const { seedDemo } = useEsmereogenesis();
  const { treasure } = useTreasure();
  const { track } = useTrackingDispatch();

  const handleSeedDemo = () => {
    const created = seedDemo(treasure);
    onSeedDemo?.();
    track("esmereo_demo_seeded", { count: created.length });
  };

  return (
    <div
      className="focus-col"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 30px 48px",
        textAlign: "center",
        minHeight: 0,
        position: "relative",
        zIndex: 2,
      }}
    >
      <LivingEmerald
        progress={0.02}
        state="empty"
        size={210}
        showRing={false}
        staged
      />

      <div style={{ marginTop: -10, position: "relative", zIndex: 3 }}>
        <Kicker>Comienza tu génesis</Kicker>
        <div
          className="serif"
          style={{
            fontSize: 31,
            lineHeight: 1.1,
            marginTop: 12,
            color: "var(--ink)",
          }}
        >
          Tu jardín de
          <br />
          esmeraldas espera
        </div>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--ink-soft)",
            lineHeight: 1.6,
            marginTop: 14,
            maxWidth: 360,
          }}
        >
          Esmereogénesis es un método de ahorro con propósito. Elige una
          esmeralda del catálogo y comienza a darle vida con cada aporte.
        </p>
      </div>

      <div
        style={{
          marginTop: 28,
          width: "100%",
          maxWidth: 340,
          position: "relative",
          zIndex: 3,
        }}
      >
        <WaterButton
          label="Explorar el catálogo"
          onClick={() => navigate("/treasure")}
        />
        <button
          className="tap"
          onClick={handleSeedDemo}
          style={{
            width: "100%",
            marginTop: 14,
            padding: 6,
            fontSize: 12.5,
            color: "var(--ink-faint)",
            letterSpacing: "0.03em",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            background: "none",
          }}
        >
          Cargar jardín de demostración
        </button>
      </div>
    </div>
  );
};

export default EsmereoEmptyState;
