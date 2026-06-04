// emerald-core.jsx — Esmereogénesis visual system
// LivingEmerald hero, progress ring, particles, glass atoms, money fmt, data.

// ─────────────────────────────────────────────────────────────
// Money / dates (Colombian peso)
// ─────────────────────────────────────────────────────────────
const fmtCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const fmtCOPk = (n) => {
  if (n >= 1000000) return '$' + (n / 1000000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
  return '$' + n;
};

// ─────────────────────────────────────────────────────────────
// Emerald tones (per-origin gem tint)
// ─────────────────────────────────────────────────────────────
const TONES = {
  muzo:    { bright: '#3FBE93', mid: '#0E7C5A', deep: '#06382b', spark: '#E8FBF2' },
  chivor:  { bright: '#34C0B0', mid: '#0C7A72', deep: '#063b37', spark: '#E6FBF7' },
  gachala: { bright: '#2BA47A', mid: '#0A5C45', deep: '#052b21', spark: '#DDF6EC' },
  coscuez: { bright: '#5FCB9F', mid: '#1A8C66', deep: '#0a4732', spark: '#EEFCF4' },
  dormant: { bright: '#6b7d76', mid: '#3c4a44', deep: '#1c2723', spark: '#9fb0a8' },
};

// ─────────────────────────────────────────────────────────────
// Gem face — layered CSS gradients: soft specular, depth, subtle facets
// ─────────────────────────────────────────────────────────────
function GemFace({ size, tone = 'muzo', dormant = false, alive = true }) {
  const t = TONES[dormant ? 'dormant' : tone] || TONES.muzo;
  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: '50%',
      flexShrink: 0,
      background: `
        radial-gradient(circle at 50% 124%, rgba(0,0,0,0.62), transparent 52%),
        radial-gradient(circle at 50% 48%, ${t.bright} 0%, ${t.mid} 44%, ${t.deep} 76%, #03201a 100%)`,
      boxShadow: `inset 0 -14px 28px rgba(0,0,0,0.5),
                  inset 0 9px 20px rgba(255,255,255,${dormant ? 0.05 : 0.14}),
                  inset 0 0 0 1px rgba(0,0,0,0.22),
                  0 16px 40px -10px rgba(5,40,30,${dormant ? 0.18 : 0.65})`,
      border: `1px solid ${dormant ? 'rgba(255,255,255,0.05)' : 'rgba(217,169,75,0.20)'}`,
      overflow: 'hidden',
      filter: dormant ? 'saturate(0.42)' : 'none',
    }}>
      {/* top rim light */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle at 50% 6%, rgba(255,255,255,0.20), transparent 32%)',
        opacity: dormant ? 0.3 : 0.85 }} />
      {/* environment reflection (cool, bottom-right) */}
      <div style={{ position: 'absolute', right: '13%', bottom: '15%', width: '42%', height: '32%', borderRadius: '50%',
        background: `radial-gradient(closest-side, ${t.spark}55, transparent 72%)`,
        filter: 'blur(3px)', opacity: dormant ? 0.18 : 0.5 }} />
      {/* faint facet streaks */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'linear-gradient(123deg, transparent 39%, rgba(255,255,255,0.10) 47%, transparent 53%)',
        mixBlendMode: 'screen', opacity: dormant ? 0 : 0.55 }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'linear-gradient(58deg, transparent 62%, rgba(255,255,255,0.06) 71%, transparent 78%)',
        mixBlendMode: 'screen', opacity: dormant ? 0 : 0.5 }} />
      {/* slow living shimmer */}
      {alive && !dormant && (
        <div style={{ position: 'absolute', inset: '-30%', borderRadius: '50%',
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.09) 22deg, transparent 56deg, transparent 360deg)',
          mixBlendMode: 'screen', opacity: 0.5, animation: 'gemSheen 16s linear infinite' }} />
      )}
      {/* soft specular highlight */}
      <div style={{ position: 'absolute', left: '25%', top: '17%', width: '36%', height: '27%', borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(255,255,255,0.82), rgba(255,255,255,0) 74%)',
        filter: 'blur(2.5px)', opacity: dormant ? 0.3 : 0.7 }} />
      {/* tiny hot spot */}
      <div style={{ position: 'absolute', left: '32%', top: '23%', width: '7%', height: '7%', borderRadius: '50%',
        background: 'rgba(255,255,255,0.95)', filter: 'blur(0.6px)', opacity: dormant ? 0.25 : 0.85 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LivingEmerald — gem + organic progress ring + floating particles
// ─────────────────────────────────────────────────────────────
function LivingEmerald({ size = 230, pct = 0, tone = 'muzo', dormant = false, particles = true }) {
  const stroke = Math.max(5, Math.round(size * 0.028));
  const pad = Math.round(size * 0.09);
  const r = (size - stroke) / 2 - pad;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const dash = C * clamped;
  const headAngle = (-90 + clamped * 360) * (Math.PI / 180);
  const hx = cx + r * Math.cos(headAngle);
  const hy = cy + r * Math.sin(headAngle);
  const gemSize = Math.round(size - pad * 2 - stroke * 2 - size * 0.05);

  const uid = React.useId().replace(/:/g, '');

  const pCount = dormant ? 0 : (particles ? 6 : 0);
  const dots = React.useMemo(() => Array.from({ length: pCount }, (_, i) => ({
    left: 22 + Math.random() * 56,
    delay: (i / Math.max(1, pCount)) * 6,
    dur: 5.5 + Math.random() * 3.5,
    sz: 1.5 + Math.random() * 2.5,
    gold: i % 4 === 0,
  })), [pCount]);

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      {/* halo glow */}
      {!dormant && (
        <div style={{
          position: 'absolute', inset: '-14%', borderRadius: '50%',
          background: `radial-gradient(circle, ${TONES[tone].mid}55, transparent 62%)`,
          filter: 'blur(14px)', opacity: 'var(--halo)', pointerEvents: 'none',
        }} />
      )}

      {/* particles */}
      {dots.map((d, i) => (
        <span key={i} style={{
          position: 'absolute', bottom: '14%', left: d.left + '%',
          width: d.sz, height: d.sz, borderRadius: '50%',
          background: d.gold ? 'var(--gold-bright)' : TONES[tone].spark,
          boxShadow: d.gold ? '0 0 6px var(--gold)' : `0 0 6px ${TONES[tone].bright}`,
          opacity: 0, pointerEvents: 'none',
          animation: `floatUp ${d.dur}s ease-in ${d.delay}s infinite`,
        }} />
      ))}

      {/* progress ring */}
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={TONES[tone].mid} />
            <stop offset="45%" stopColor={TONES[tone].bright} />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={stroke * 0.75} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth={stroke} />
        {!dormant && (
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={`url(#ring-${uid})`} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`} filter={`url(#glow-${uid})`}
            style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(.2,.8,.3,1)' }} />
        )}
      </svg>

      {/* head bead */}
      {!dormant && clamped > 0.012 && clamped < 0.995 && (
        <span style={{
          position: 'absolute', left: hx, top: hy, width: stroke * 1.45, height: stroke * 1.45,
          marginLeft: -stroke * 0.725, marginTop: -stroke * 0.725, borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 32%, #fff, var(--gold-bright) 55%, var(--gold))',
          boxShadow: '0 0 12px 2px rgba(217,169,75,0.65)',
          transition: 'all 1.1s cubic-bezier(.2,.8,.3,1)',
        }} />
      )}

      {/* gem */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GemFace size={gemSize} tone={tone} dormant={dormant} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Glass atoms
// ─────────────────────────────────────────────────────────────
function Glass({ children, style = {}, className = '', ...rest }) {
  return <div className={`glass ${className}`} style={style} {...rest}>{children}</div>;
}

function Label({ children, style = {} }) {
  return <div className="label" style={style}>{children}</div>;
}

function Kicker({ children, style = {} }) {
  return <div className="kicker" style={style}>{children}</div>;
}

// gold-rule divider
function Rule({ style = {} }) {
  return <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--hairline), transparent)', ...style }} />;
}

// Primary CTA — emerald gradient w/ gold text
function PrimaryButton({ children, onClick, style = {}, sub }) {
  return (
    <button className="tap" onClick={onClick} style={{
      width: '100%', borderRadius: 999, padding: sub ? '13px 22px' : '17px 22px',
      background: 'linear-gradient(180deg, var(--em-bright), var(--em) 48%, var(--em-deep))',
      boxShadow: '0 10px 26px rgba(11,92,70,0.5), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 0 0 1px rgba(217,169,75,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      ...style,
    }}>
      <span style={{
        fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 16,
        letterSpacing: '0.02em', color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, lineHeight: 1.15,
      }}>
        <span style={{ whiteSpace: 'nowrap' }}>{children}</span>
        {sub && <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--gold-bright)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
    </button>
  );
}

// ghost / secondary
function GhostButton({ children, onClick, style = {} }) {
  return (
    <button className="tap glass" onClick={onClick} style={{
      width: '100%', borderRadius: 999, padding: '15px 22px',
      fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 15,
      letterSpacing: '0.02em', color: 'var(--ink)',
      ...style,
    }}>{children}</button>
  );
}

// stat tile
function StatTile({ value, unit, caption }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '4px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
        <span className="serif" style={{ fontSize: 25, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>{unit}</span>}
      </div>
      <div className="label" style={{ marginTop: 7, fontSize: 9, letterSpacing: '0.2em' }}>{caption}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────
const CATALOG = [
  { id: 'muzo', tone: 'muzo', name: 'Gota de Muzo', origin: 'Muzo · Boyacá', carat: '2.1 ct', color: 'Verde jardín', meta: 6300000, desc: 'El verde puro de las minas de Muzo, intenso y aterciopelado.' },
  { id: 'chivor', tone: 'chivor', name: 'Lágrima de Chivor', origin: 'Chivor · Boyacá', carat: '1.6 ct', color: 'Verde azulado', meta: 4800000, desc: 'Un destello fresco con alma de río, claridad excepcional.' },
  { id: 'gachala', tone: 'gachala', name: 'Corazón de Gachalá', origin: 'Gachalá · Cundinamarca', carat: '3.0 ct', color: 'Verde profundo', meta: 9200000, desc: 'Pieza de coleccionista, profundidad y peso sobresalientes.' },
  { id: 'coscuez', tone: 'coscuez', name: 'Brote de Coscuez', origin: 'Coscuez · Boyacá', carat: '1.2 ct', color: 'Verde claro', meta: 3600000, desc: 'Luminosa y delicada, ideal para comenzar tu génesis.' },
];

// recent watering log
function buildLog(weeks, aporte) {
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const out = [];
  let d = new Date(2026, 5, 1); // jun 1 2026
  for (let i = 0; i < weeks; i++) {
    out.push({
      n: weeks - i,
      label: `${d.getDate()} ${meses[d.getMonth()]}`,
      amount: aporte,
    });
    d = new Date(d.getTime() - 7 * 864e5);
  }
  return out;
}

Object.assign(window, {
  fmtCOP, fmtCOPk, TONES, GemFace, LivingEmerald,
  Glass, Label, Kicker, Rule, PrimaryButton, GhostButton, StatTile,
  CATALOG, buildLog,
});
