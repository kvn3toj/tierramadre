/**
 * LayeredCssGem — the CSS-rendered faceted emerald (the prototype's `GemCore`).
 *
 * This is the canonical Bóveda hero and the fallback when a plan's cut has no
 * character art and no product photo. Brightness/saturation track `vitality`
 * (0..1 progress); `surge` brightens it during the watering ritual. Pure CSS
 * gradients + specular layers — no images, renders anywhere.
 */

// Gem palette (literal hex so the gem looks identical with or without a
// .bov-root ancestor). Matches the prototype's PAL.
const PAL = {
  bright: "#33C194",
  mid: "#00C992",
  deep: "#006A48",
  spark: "#EAFBF3",
};

export default function LayeredCssGem({
  size,
  vitality = 0.6,
  surge = false,
  reducedMotion = false,
}: {
  size: number;
  vitality?: number;
  surge?: boolean;
  reducedMotion?: boolean;
}) {
  const v = Math.max(0, Math.min(1, vitality));
  const sat = 0.55 + v * 0.6 + (surge ? 0.25 : 0);
  const bri = 0.78 + v * 0.34 + (surge ? 0.22 : 0);
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        filter: `saturate(${sat}) brightness(${bri})`,
        transition: "filter .5s cubic-bezier(.34,1.4,.6,1)",
        background: `
          radial-gradient(circle at 50% 120%, rgba(0,0,0,0.55), transparent 52%),
          radial-gradient(circle at 50% 46%, ${PAL.bright} 0%, ${PAL.mid} 42%, ${PAL.deep} 76%, #03201a 100%)`,
        boxShadow: `inset 0 -14px 30px rgba(0,0,0,0.5), inset 0 10px 22px rgba(255,255,255,0.18), inset 0 0 0 1px rgba(0,0,0,0.22), 0 18px 50px -10px rgba(0,140,97,${0.4 + v * 0.5})`,
        border: "1px solid var(--accent-line, rgba(212,175,55,0.32))",
        overflow: "hidden",
      }}
    >
      {/* top sheen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 6%, rgba(255,255,255,0.36), transparent 34%)",
        }}
      />
      {/* slow rotating conic sheen */}
      <div
        className="anim-loop"
        style={{
          position: "absolute",
          inset: "-30%",
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.12) 22deg, transparent 58deg, transparent 360deg)",
          mixBlendMode: "screen",
          opacity: 0.55,
          animation: reducedMotion ? "none" : "bovSheen 15s linear infinite",
        }}
      />
      {/* facet streaks */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "linear-gradient(123deg, transparent 39%, rgba(255,255,255,0.13) 47%, transparent 53%)",
          mixBlendMode: "screen",
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "linear-gradient(58deg, transparent 62%, rgba(255,255,255,0.09) 71%, transparent 78%)",
          mixBlendMode: "screen",
          opacity: 0.5,
        }}
      />
      {/* env reflection */}
      <div
        style={{
          position: "absolute",
          right: "14%",
          bottom: "16%",
          width: "40%",
          height: "30%",
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${PAL.spark}66, transparent 72%)`,
          filter: "blur(3px)",
          opacity: 0.5,
        }}
      />
      {/* soft specular */}
      <div
        style={{
          position: "absolute",
          left: "25%",
          top: "15%",
          width: "36%",
          height: "27%",
          borderRadius: "50%",
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.82), transparent 74%)",
          filter: "blur(2.5px)",
          opacity: 0.72,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "32%",
          top: "21%",
          width: "6%",
          height: "6%",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.95)",
          filter: "blur(0.5px)",
        }}
      />
      {/* life-wink sparkle */}
      {!reducedMotion && (
        <div
          className="anim-loop"
          style={{
            position: "absolute",
            left: "62%",
            top: "40%",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 0 6px #fff",
            animation: "bovBlink 6s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}
