// dir-boveda.jsx — Direction 3: BÓVEDA
// Immersive cinematic. Full-bleed atmospheric dark space, volumetric light
// beam, drifting mist, rising particles. Gem floats in light; minimal floating
// HUD overlaid; huge dramatic serif numbers. Experience, not dashboard.

const BOV = {
  ink: '#F2F7F4',
  inkSoft: 'rgba(228,240,234,0.6)',
  inkFaint: 'rgba(228,240,234,0.34)',
  em: '#0E7C5A',
  emBright: '#2FAE86',
  gold: '#D9A94B',
  goldBright: '#F0CE86',
};
const bovPal = { bright: '#46C79C', mid: '#0E7C5A', deep: '#073d2d', spark: '#EAFBF3' };

// volumetric gem stage
function BovStage({ size = 230, pct = 0.6 }) {
  const motes = React.useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    left: 8 + Math.random() * 84, delay: (i / 16) * 9, dur: 7 + Math.random() * 6,
    sz: 1.2 + Math.random() * 2.6, gold: i % 5 === 0, drift: (Math.random() * 2 - 1) * 22,
  })), []);
  return (
    <div style={{ position: 'relative', width: '100%', height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* volumetric beam */}
      <div style={{ position: 'absolute', top: '-12%', left: '50%', width: 260, height: 420, transform: 'translateX(-50%)', background: 'linear-gradient(180deg, rgba(47,174,134,0.30), rgba(14,124,90,0.12) 42%, transparent 78%)', clipPath: 'polygon(34% 0, 66% 0, 88% 100%, 12% 100%)', filter: 'blur(14px)', opacity: 0.9 }} />
      {/* halo */}
      <div style={{ position: 'absolute', width: size * 1.5, height: size * 1.5, borderRadius: '50%', background: `radial-gradient(circle, ${bovPal.mid}55, transparent 60%)`, filter: 'blur(26px)' }} />
      {/* rising motes */}
      {motes.map((m, i) => (
        <span key={i} style={{ position: 'absolute', bottom: '6%', left: m.left + '%', width: m.sz, height: m.sz, borderRadius: '50%', background: m.gold ? BOV.goldBright : bovPal.spark, boxShadow: m.gold ? `0 0 6px ${BOV.gold}` : `0 0 6px ${bovPal.bright}`, opacity: 0, ['--drift']: m.drift + 'px', animation: `bovRise ${m.dur}s ease-in ${m.delay}s infinite` }} />
      ))}
      {/* ring + gem */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <ProgressArc size={size} pct={pct} stroke={3} from={BOV.em} to={BOV.gold} track="rgba(255,255,255,0.08)" glow />
        <div style={{ position: 'absolute', inset: size * 0.1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GemCore size={Math.round(size * 0.66)} pal={bovPal} mode="dark" />
        </div>
      </div>
      {/* mist */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130, background: 'radial-gradient(120% 80% at 50% 100%, rgba(47,174,134,0.22), transparent 70%)', filter: 'blur(12px)', animation: 'bovMist 16s ease-in-out infinite alternate' }} />
    </div>
  );
}

function BovDock({ active = 'inicio' }) {
  return (
    <div style={{ flexShrink: 0, padding: '0 30px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <div key={t.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: on ? BOV.goldBright : BOV.inkFaint }}>
            <Ico d={t.icon} s={20} sw={on ? 1.9 : 1.5} />
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function bovBg() {
  return {
    background: `
      radial-gradient(90% 55% at 50% 18%, rgba(14,124,90,0.34), transparent 56%),
      radial-gradient(120% 60% at 50% 108%, rgba(11,92,70,0.30), transparent 58%),
      radial-gradient(140% 100% at 50% 40%, #0a1712 0%, #061009 46%, #020605 100%)`,
  };
}

function BovedaHub() {
  const p = PLAN;
  return (
    <div style={{ width: '100%', height: '100%', color: BOV.ink, fontFamily: "'Hanken Grotesk',sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', ...bovBg() }}>
      {/* vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(130% 90% at 50% 45%, transparent 56%, rgba(0,0,0,0.6) 100%)' }} />
      <StatusBar color={BOV.ink} op={0.9} />

      {/* floating top HUD */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: '6px 24px 0', position: 'relative', zIndex: 2 }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 9.5, letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 600, color: BOV.gold }}>Esmereogénesis</div>
        <div className="serif" style={{ fontSize: 23, marginTop: 7, color: BOV.ink }}>{p.name}</div>
        <div style={{ fontSize: 11, color: BOV.inkSoft, marginTop: 3, letterSpacing: '0.03em' }}>{p.origin} · {p.carat}</div>
      </div>

      {/* stage */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: -6 }}>
        <BovStage size={224} pct={p.pct} />
      </div>

      {/* huge serif % overlay-ish, pulled up under gem */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginTop: -42 }}>
        <div className="serif" style={{ fontSize: 96, lineHeight: 0.82, color: BOV.ink, textShadow: '0 6px 40px rgba(11,92,70,0.6)' }}>
          {Math.round(p.pct * 100)}<span style={{ fontSize: 38, color: BOV.goldBright }}>%</span>
        </div>
        <div style={{ fontSize: 9.5, letterSpacing: '0.34em', textTransform: 'uppercase', color: BOV.inkFaint, marginTop: 6 }}>Regada</div>

        {/* acumulado + racha floating row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
          <span className="serif" style={{ fontSize: 17, color: BOV.ink }}>{fmtCOP(p.acumulado)}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: BOV.inkFaint }} />
          <span style={{ fontSize: 13, color: BOV.inkSoft, whiteSpace: 'nowrap' }}>meta {fmtCOPk(p.meta)}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 14, padding: '7px 15px', borderRadius: 999, background: 'rgba(217,169,75,0.10)', border: '1px solid rgba(217,169,75,0.32)' }}>
          <Ico d={PATHS.flame} s={13} sw={1.4} fill={BOV.gold} stroke={BOV.gold} />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: BOV.goldBright, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{p.racha} semanas regando</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* luminous CTA */}
      <div style={{ flexShrink: 0, padding: '0 30px 14px', position: 'relative', zIndex: 2 }}>
        <button style={{ width: '100%', border: 'none', cursor: 'pointer', borderRadius: 999, padding: '16px', background: `linear-gradient(180deg, ${BOV.emBright}, ${BOV.em} 50%, ${BOV.em})`, boxShadow: `0 0 38px -6px ${BOV.emBright}, inset 0 1px 0 rgba(255,255,255,0.25), inset 0 0 0 1px rgba(217,169,75,0.4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
          <Ico d={PATHS.drop} s={18} sw={1.6} stroke="#fff" />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '0.01em' }}>Regar mi esmeralda</span>
        </button>
        <div style={{ textAlign: 'center', fontSize: 11, color: BOV.inkFaint, marginTop: 10 }}>Aporte sugerido {fmtCOP(p.aporte)} · monto editable</div>
      </div>

      <BovDock active="inicio" />
    </div>
  );
}

function BovedaPlan() {
  const p = PLAN;
  const log = dirLog(4, p.aporte);
  return (
    <div style={{ width: '100%', height: '100%', color: BOV.ink, fontFamily: "'Hanken Grotesk',sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', ...bovBg() }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(130% 90% at 50% 40%, transparent 56%, rgba(0,0,0,0.62) 100%)' }} />
      <StatusBar color={BOV.ink} op={0.9} />
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 22px 0', position: 'relative', zIndex: 2 }}>
        <Ico d={PATHS.chevL} s={22} sw={1.6} stroke={BOV.ink} />
        <div style={{ fontSize: 9.5, letterSpacing: '0.34em', textTransform: 'uppercase', color: BOV.inkSoft }}>Lote N.º {p.lote}</div>
        <Ico d={PATHS.trash} s={19} sw={1.5} stroke={BOV.inkFaint} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, marginTop: -4 }}>
        <BovStage size={186} pct={p.pct} />
      </div>

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginTop: -36 }}>
        <div className="serif" style={{ fontSize: 26, color: BOV.ink }}>{p.name}</div>
        <div className="serif" style={{ fontSize: 72, lineHeight: 0.85, marginTop: 6, textShadow: '0 6px 36px rgba(11,92,70,0.6)' }}>{Math.round(p.pct * 100)}<span style={{ fontSize: 30, color: BOV.goldBright }}>%</span></div>
        <div style={{ fontSize: 13, color: BOV.inkSoft, marginTop: 8 }}>{fmtCOP(p.acumulado)} <span style={{ color: BOV.inkFaint }}>/ {fmtCOP(p.meta)}</span></div>
      </div>

      <div style={{ flex: 1 }} />

      {/* floating ritmo + aportes (no cards — hairline rows over scene) */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: BOV.inkFaint }}>Ritmo sugerido</span>
          <span className="serif" style={{ fontSize: 16 }}>{fmtCOP(p.aporte)} <span style={{ fontSize: 11, color: BOV.inkSoft }}>/ sem</span></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: BOV.inkFaint }}>Reclamo aprox.</span>
          <span className="serif" style={{ fontSize: 16 }}>{claimDate(p.semanasRestan)}</span>
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: '14px 30px 14px', position: 'relative', zIndex: 2 }}>
        <button style={{ width: '100%', border: 'none', cursor: 'pointer', borderRadius: 999, padding: '16px', background: `linear-gradient(180deg, ${BOV.emBright}, ${BOV.em} 50%, ${BOV.em})`, boxShadow: `0 0 38px -6px ${BOV.emBright}, inset 0 0 0 1px rgba(217,169,75,0.4)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
          <Ico d={PATHS.drop} s={18} sw={1.6} stroke="#fff" />
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Regar · {fmtCOP(p.aporte)}</span>
        </button>
      </div>
      <BovDock active="tesoros" />
    </div>
  );
}

Object.assign(window, { BovedaHub, BovedaPlan, BOV });
