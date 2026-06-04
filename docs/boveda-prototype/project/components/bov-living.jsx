// bov-living.jsx — the living emerald creature + ritual visuals + ceremony.
// Exports to window: LivingEmerald, EclosionCeremony, useCountUp, stageFor, STAGES,
//   fmtCOP, fmtCOPk, PLAN_BOV, REDUCED

const fmtCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const fmtCOPk = (n) => {
  if (n >= 1000000) return '$' + (n / 1000000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
  return '$' + n;
};
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── growth stages ──
const STAGES = [
  { key: 'semilla',   min: 0.0,  label: 'Semilla',   verb: 'duerme',     note: 'Tu esmeralda aún duerme. Riégala para despertarla.' },
  { key: 'brote',     min: 0.12, label: 'Brote',     verb: 'despierta',  note: 'Ha despertado — los primeros brotes asoman.' },
  { key: 'creciendo', min: 0.36, label: 'Creciendo', verb: 'crece',      note: 'Crece con fuerza. Su luz se vuelve cálida.' },
  { key: 'radiante',  min: 0.68, label: 'Radiante',  verb: 'irradia',    note: 'Casi viva. Sus facetas irradian luz.' },
  { key: 'eclosion',  min: 1.0,  label: 'Eclosión',  verb: 'cobra vida', note: 'Ha cobrado vida. Es tuya.' },
];
function stageFor(pct) {
  let s = STAGES[0];
  for (const st of STAGES) if (pct >= st.min) s = st;
  return s;
}
const PAL = { bright: '#46C79C', mid: '#0E7C5A', deep: '#073d2d', spark: '#EAFBF3' };

// ── count-up hook (rAF, springy ease-out) ──
function useCountUp(target, dur = 1100) {
  const [val, setVal] = React.useState(target);
  const fromRef = React.useRef(target);
  const rafRef = React.useRef(0);
  React.useEffect(() => {
    if (REDUCED) { setVal(target); fromRef.current = target; return; }
    const from = fromRef.current;
    if (from === target) return;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * e));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, dur]);
  return val;
}

// ── faceted gem core (vitality-driven brightness) ──
function GemCore({ size, vitality = 0.6, surge = false }) {
  const sat = 0.55 + vitality * 0.6 + (surge ? 0.25 : 0);
  const bri = 0.78 + vitality * 0.34 + (surge ? 0.22 : 0);
  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: '50%', flexShrink: 0,
      filter: `saturate(${sat}) brightness(${bri})`,
      transition: 'filter .5s cubic-bezier(.34,1.4,.6,1)',
      background: `
        radial-gradient(circle at 50% 120%, rgba(0,0,0,0.55), transparent 52%),
        radial-gradient(circle at 50% 46%, ${PAL.bright} 0%, ${PAL.mid} 42%, ${PAL.deep} 76%, #03201a 100%)`,
      boxShadow: `inset 0 -14px 30px rgba(0,0,0,0.5), inset 0 10px 22px rgba(255,255,255,0.18),
                  inset 0 0 0 1px rgba(0,0,0,0.22), 0 18px 50px -10px rgba(11,92,70,${0.4 + vitality * 0.5})`,
      border: '1px solid var(--accent-line)', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 50% 6%, rgba(255,255,255,0.36), transparent 34%)' }} />
      <div className="anim-loop" style={{ position: 'absolute', inset: '-30%', borderRadius: '50%', background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.12) 22deg, transparent 58deg, transparent 360deg)', mixBlendMode: 'screen', opacity: 0.55, animation: 'bovSheen 15s linear infinite' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(123deg, transparent 39%, rgba(255,255,255,0.13) 47%, transparent 53%)', mixBlendMode: 'screen', opacity: 0.6 }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(58deg, transparent 62%, rgba(255,255,255,0.09) 71%, transparent 78%)', mixBlendMode: 'screen', opacity: 0.5 }} />
      {/* env reflection */}
      <div style={{ position: 'absolute', right: '14%', bottom: '16%', width: '40%', height: '30%', borderRadius: '50%', background: `radial-gradient(closest-side, ${PAL.spark}66, transparent 72%)`, filter: 'blur(3px)', opacity: 0.5 }} />
      {/* soft specular */}
      <div style={{ position: 'absolute', left: '25%', top: '15%', width: '36%', height: '27%', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.82), transparent 74%)', filter: 'blur(2.5px)', opacity: 0.72 }} />
      <div style={{ position: 'absolute', left: '32%', top: '21%', width: '6%', height: '6%', borderRadius: '50%', background: 'rgba(255,255,255,0.95)', filter: 'blur(0.5px)' }} />
      {/* life-wink sparkle */}
      <div className="anim-loop reduced-hide" style={{ position: 'absolute', left: '62%', top: '40%', width: 5, height: 5, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px #fff', animation: 'bovBlink 6s ease-in-out infinite' }} />
    </div>
  );
}

// ── progress ring (emerald→gold, glow) ──
function Ring({ size, pct, stroke = 3 }) {
  const r = (size - stroke) / 2 - 2;
  const c = size / 2, C = 2 * Math.PI * r;
  const uid = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id={`br-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0E7C5A" /><stop offset="62%" stopColor="#2FAE86" /><stop offset="100%" stopColor="#D9A94B" />
        </linearGradient>
        <filter id={`bg-${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={stroke * 0.7} result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={`url(#br-${uid})`} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${C * Math.max(0, Math.min(1, pct))} ${C}`} filter={`url(#bg-${uid})`}
        style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(.2,.85,.3,1)' }} />
    </svg>
  );
}

// ── roots / tendrils that grow with vitality ──
function Roots({ size, vitality }) {
  const count = vitality < 0.12 ? 0 : vitality < 0.36 ? 3 : vitality < 0.68 ? 4 : vitality < 1 ? 5 : 6;
  if (count === 0) return null;
  const grow = 0.55 + Math.min(1, vitality) * 0.55;
  const w = size * 1.5, h = size * 1.15, cx = w / 2;
  const roots = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      const len = h * 0.78 * grow;
      roots.push({ d: `M ${cx} 0 Q ${cx + 6} ${len * 0.55} ${cx} ${len}`, tipX: cx, tipY: len, key: i, sw: 1.7 });
    } else {
      const side = i % 2 ? -1 : 1;
      const rank = Math.ceil(i / 2);
      const spread = side * (w * 0.085 + rank * w * 0.085) * grow;
      const len = (h * 0.42 + rank * h * 0.12) * grow;
      const ctrlX = cx + spread * 0.32;
      roots.push({ d: `M ${cx} ${h * 0.04} Q ${ctrlX} ${len * 0.46} ${cx + spread} ${len}`, tipX: cx + spread, tipY: len, key: i, sw: 1.4 });
    }
  }
  return (
    <svg width={w} height={h} style={{ position: 'absolute', left: '50%', top: '48%', transform: 'translateX(-50%)', overflow: 'visible', zIndex: 0, pointerEvents: 'none' }}>
      <defs>
        <linearGradient id="rootg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2FAE86" stopOpacity="0.7" />
          <stop offset="55%" stopColor="#0E7C5A" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#0B5C46" stopOpacity="0" />
        </linearGradient>
      </defs>
      {roots.map((r) => (
        <g key={r.key}>
          <path d={r.d} fill="none" stroke="url(#rootg)" strokeWidth={r.sw} strokeLinecap="round" style={{ transition: 'all .8s cubic-bezier(.2,.85,.3,1)' }} />
          {/* leaf-bud tip */}
          <ellipse cx={r.tipX} cy={r.tipY} rx={3.4} ry={5} fill="#2FAE86" opacity="0.5" transform={`rotate(${r.tipX < cx ? -28 : 28} ${r.tipX} ${r.tipY})`} style={{ transition: 'all .8s' }} />
          <circle cx={r.tipX} cy={r.tipY} r={1.6} fill="#F0CE86" opacity="0.9" style={{ transition: 'all .8s' }} />
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// LivingEmerald — the creature
// props: size, pct, phase ('idle'|'drop'|'splash'|'bloom'|'count'|'celebrate'),
//        showRing, showBeam, onPet, reduced
// ─────────────────────────────────────────────────────────────
function LivingEmerald({ size = 220, pct = 0.6, phase = 'idle', showRing = true, showBeam = true, onPet }) {
  const stage = stageFor(pct);
  const vitality = Math.max(0, Math.min(1, pct));
  const surge = phase === 'splash' || phase === 'bloom' || phase === 'count';
  const [bursts, setBursts] = React.useState([]);
  const gemBox = Math.round(size * (showRing ? 0.66 : 0.92));

  // particle stream (density scales with vitality)
  const pCount = REDUCED ? 0 : Math.round(6 + vitality * 12);
  const motes = React.useMemo(() => Array.from({ length: pCount }, (_, i) => ({
    left: 12 + Math.random() * 76, delay: (i / Math.max(1, pCount)) * 9, dur: 7 + Math.random() * 6,
    sz: 1.3 + Math.random() * 2.6, gold: i % 5 === 0, dx: (Math.random() * 2 - 1) * 26,
  })), [pCount]);

  const pet = (e) => {
    if (onPet) onPet();
    if (REDUCED) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX ?? rect.left + rect.width / 2) - rect.left) / rect.width * 100;
    const y = ((e.clientY ?? rect.top + rect.height / 2) - rect.top) / rect.height * 100;
    const id = Date.now();
    const sparks = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.random();
      const dist = 34 + Math.random() * 26;
      return { i, bx: Math.cos(a) * dist, by: Math.sin(a) * dist, gold: i % 3 === 0 };
    });
    setBursts((b) => [...b, { id, x, y, sparks }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 800);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: size * 1.18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* light-mode hero staging (halo + pedestal/reflection) */}
      {showBeam && <div className="le-stage" />}
      {/* light beam */}
      {showBeam && (
        <div className="anim-loop reduced-hide le-beam" style={{ position: 'absolute', top: '-16%', left: '50%', width: size * 1.15, height: size * 1.9, transformOrigin: 'top center', background: 'linear-gradient(180deg, rgba(47,174,134,0.28), rgba(14,124,90,0.10) 44%, transparent 78%)', clipPath: 'polygon(36% 0, 64% 0, 90% 100%, 10% 100%)', filter: 'blur(13px)', animation: 'bovBeam 7s ease-in-out infinite', zIndex: 0 }} />
      )}
      {/* halo pulse (with streak vibe) */}
      <div className="anim-loop" style={{ position: 'absolute', width: size * 1.4, height: size * 1.4, borderRadius: '50%', background: `radial-gradient(circle, ${PAL.mid}${surge ? '88' : '55'}, transparent 62%)`, filter: 'blur(22px)', animation: 'bovHalo 4s ease-in-out infinite', zIndex: 0, transition: 'background .5s' }} />

      {/* rising particles */}
      {motes.map((m, i) => (
        <span key={i} className="reduced-hide" style={{ position: 'absolute', bottom: '8%', left: m.left + '%', width: m.sz, height: m.sz, borderRadius: '50%', background: m.gold ? 'var(--gold-bright)' : 'var(--spark)', boxShadow: m.gold ? '0 0 6px var(--gold)' : `0 0 6px ${PAL.bright}`, opacity: 0, ['--dx']: m.dx + 'px', animation: `bovRise ${m.dur}s ease-in ${m.delay}s infinite`, zIndex: 1 }} />
      ))}

      {/* roots */}
      <div style={{ position: 'absolute', width: gemBox, height: gemBox, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <Roots size={gemBox} vitality={vitality} />
      </div>

      {/* ring + gem (floating, breathing) */}
      <div style={{ position: 'relative', width: size, height: size, zIndex: 2 }}>
        {showRing && <Ring size={size} pct={pct} />}
        <div className="anim-loop" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bovFloat 6s ease-in-out infinite' }}>
          <div className="anim-loop" style={{ animation: 'bovBreathe 4.5s ease-in-out infinite' }}>
            <div key={phase === 'bloom' ? 'bloom' : 'g'} onPointerDown={pet}
              style={{ cursor: 'pointer', animation: phase === 'bloom' && !REDUCED ? 'bovBounce .6s cubic-bezier(.34,1.56,.64,1)' : 'none', position: 'relative' }}>
              <GemCore size={gemBox} vitality={vitality} surge={surge} />

              {/* splash ripple */}
              {phase === 'splash' && !REDUCED && (
                <div key="rip" style={{ position: 'absolute', left: '50%', top: '50%', width: gemBox, height: gemBox, borderRadius: '50%', border: '2px solid rgba(240,206,134,0.9)', animation: 'bovRipple .55s ease-out forwards', pointerEvents: 'none' }} />
              )}
              {/* bloom surge ring */}
              {(phase === 'bloom' || phase === 'count') && !REDUCED && (
                <div key="srg" style={{ position: 'absolute', left: '50%', top: '50%', width: gemBox * 1.1, height: gemBox * 1.1, borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,174,134,0.5), transparent 65%)', animation: 'bovSurge .7s ease-out forwards', pointerEvents: 'none' }} />
              )}
              {/* celebrate sparkle crown */}
              {phase === 'celebrate' && !REDUCED && Array.from({ length: 10 }).map((_, i) => {
                const a = (i / 10) * Math.PI * 2; const d = gemBox * 0.62;
                return <span key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: 4, height: 4, borderRadius: '50%', background: i % 2 ? 'var(--gold-bright)' : '#fff', boxShadow: '0 0 6px var(--gold)', ['--bx']: Math.cos(a) * d + 'px', ['--by']: Math.sin(a) * d + 'px', animation: 'bovBurst .7s ease-out forwards', pointerEvents: 'none' }} />;
              })}
              {/* touch bursts */}
              {bursts.map((b) => (
                <React.Fragment key={b.id}>
                  {b.sparks.map((s) => (
                    <span key={s.i} style={{ position: 'absolute', left: b.x + '%', top: b.y + '%', width: 4, height: 4, borderRadius: '50%', background: s.gold ? 'var(--gold-bright)' : '#fff', boxShadow: s.gold ? '0 0 6px var(--gold)' : '0 0 5px #fff', ['--bx']: s.bx + 'px', ['--by']: s.by + 'px', animation: 'bovBurst .7s ease-out forwards', pointerEvents: 'none' }} />
                  ))}
                </React.Fragment>
              ))}

              {/* droplet falling */}
              {phase === 'drop' && !REDUCED && (
                <div key="drop" style={{ position: 'absolute', left: '50%', top: '50%', width: 16, height: 20, zIndex: 5, animation: 'bovDrop .6s cubic-bezier(.5,0,.9,.5) forwards', pointerEvents: 'none' }}>
                  <div style={{ width: 16, height: 20, background: 'radial-gradient(circle at 38% 30%, #fff, var(--gold-bright) 45%, var(--gold) 100%)', borderRadius: '50% 50% 50% 50% / 64% 64% 40% 40%', transform: 'rotate(0deg)', boxShadow: '0 0 10px var(--gold)' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* mist */}
      <div className="anim-loop reduced-hide" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, background: 'radial-gradient(120% 80% at 50% 100%, rgba(47,174,134,0.22), transparent 70%)', filter: 'blur(12px)', animation: 'bovMist 14s ease-in-out infinite alternate', zIndex: 1 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Eclosión ceremony overlay
// ─────────────────────────────────────────────────────────────
function EclosionCeremony({ name, onClaim, onClose }) {
  const bp = (typeof useBp === 'function') ? useBp() : 'mobile';
  const wide = bp !== 'mobile';
  const gem = bp === 'desktop' ? 300 : bp === 'ipad' ? 256 : 200;
  const rain = React.useMemo(() => Array.from({ length: REDUCED ? 0 : 26 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 2.5, dur: 3 + Math.random() * 3, sz: 2 + Math.random() * 3, gold: i % 2 === 0,
  })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 120, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--veil)' }}>
      {/* expanding golden rings */}
      {!REDUCED && [0, 0.5, 1].map((d, i) => (
        <div key={i} style={{ position: 'absolute', left: '50%', top: '44%', width: 200, height: 200, borderRadius: '50%', border: '1.5px solid var(--accent-line-strong)', animation: `ecloRing 2.6s ease-out ${d}s infinite` }} />
      ))}
      {/* central glow */}
      <div style={{ position: 'absolute', left: '50%', top: '44%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-line-strong), rgba(47,174,134,0.18) 40%, transparent 70%)', filter: 'blur(10px)', animation: REDUCED ? 'none' : 'ecloGlow 3s ease-in-out infinite' }} />
      {/* golden rain */}
      {rain.map((r, i) => (
        <span key={i} style={{ position: 'absolute', top: 0, left: r.left + '%', width: r.sz, height: r.sz, borderRadius: '50%', background: r.gold ? 'var(--gold-bright)' : 'var(--spark)', boxShadow: '0 0 6px var(--gold)', opacity: 0, animation: `ecloRain ${r.dur}s ease-in ${r.delay}s infinite` }} />
      ))}

      {/* ascending gem */}
      <div style={{ marginTop: -40, animation: REDUCED ? 'none' : 'ecloAscend 1.8s cubic-bezier(.2,.85,.3,1) forwards', zIndex: 2 }}>
        <LivingEmerald size={gem} pct={1} phase="idle" showRing={false} showBeam={false} />
      </div>

      <div style={{ textAlign: 'center', padding: '0 36px', marginTop: 4, zIndex: 3, maxWidth: wide ? 560 : 'none' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>Eclosión</div>
        <div className="serif" style={{ fontSize: wide ? 46 : 33, lineHeight: 1.06, marginTop: 12 }}>Tu esmeralda<br />ha cobrado vida</div>
        <div style={{ fontSize: wide ? 16 : 13.5, color: 'var(--ink-soft)', marginTop: 14, lineHeight: 1.55 }}>
          {name} está completa. Ahora es tuya — física y certificada por Tierra Mädre.
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: wide ? 420 : 'none', padding: '0 30px', marginTop: 26, zIndex: 3 }}>
        <button className="tap" onClick={onClaim} style={{ width: '100%', borderRadius: 999, padding: '17px', background: 'var(--claim-bg)', boxShadow: '0 0 40px -6px var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--claim-ink)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>Reclamar mi esmeralda</span>
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 12, padding: '8px', fontSize: 12.5, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>Seguir admirándola</button>
      </div>
    </div>
  );
}

Object.assign(window, { LivingEmerald, EclosionCeremony, useCountUp, stageFor, STAGES, fmtCOP, fmtCOPk, REDUCED });
