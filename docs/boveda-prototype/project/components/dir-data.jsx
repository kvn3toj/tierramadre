// dir-data.jsx — shared data + primitives for the Direcciones comparison canvas.
// Self-contained (does NOT depend on emerald-core). Exports to window.

// ── The single plan all three directions render (same data, fair comparison) ──
const PLAN = {
  name: 'Gota de Muzo',
  origin: 'Muzo · Boyacá',
  carat: '2,1 ct',
  color: 'Verde jardín',
  desc: 'El verde puro de las minas de Muzo, intenso y aterciopelado.',
  meta: 6300000,
  acumulado: 3780000,
  pct: 0.60,
  aporte: 210000,
  racha: 18,
  lote: '014',
  cert: 'CDTEC Bogotá',
};
PLAN.restante = PLAN.meta - PLAN.acumulado;
PLAN.semanasRestan = Math.ceil(PLAN.restante / PLAN.aporte);

const fmtCOP = (n) => '$' + Math.round(n).toLocaleString('es-CO');
const fmtCOPk = (n) => {
  if (n >= 1000000) return '$' + (n / 1000000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
  return '$' + n;
};

// recent watering log
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function dirLog(weeks, aporte) {
  const out = [];
  let d = new Date(2026, 5, 1);
  for (let i = 0; i < weeks; i++) {
    out.push({ n: weeks - i, label: `${d.getDate()} ${MESES[d.getMonth()]}`, amount: aporte });
    d = new Date(d.getTime() - 7 * 864e5);
  }
  return out;
}
function claimDate(weeks) {
  const d = new Date(2026, 5, 3 + weeks * 7);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// ── iOS status bar (parameterized color) ──
function StatusBar({ color = '#fff', op = 1 }) {
  return (
    <div style={{ height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px 0 30px', color, opacity: op }}>
      <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14.5, fontWeight: 700, letterSpacing: '0.01em' }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill={color}><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke={color} strokeWidth="1.1"><path d="M8 9.5 8 9.5M2 4.2a9 9 0 0 1 12 0M4.5 6.6a5.5 5.5 0 0 1 7 0" strokeLinecap="round"/><circle cx="8" cy="9.2" r="0.9" fill={color} stroke="none"/></svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={color} strokeOpacity="0.45"/><rect x="2" y="2" width="17" height="8" rx="1.6" fill={color}/><rect x="23" y="3.5" width="1.6" height="5" rx="0.8" fill={color} fillOpacity="0.5"/></svg>
      </div>
    </div>
  );
}

// ── Faceted gem core (palette-driven; framing added by each direction) ──
// mode: 'dark' (glow rim) or 'light' (catalog, crisp)
function GemCore({ size, pal, mode = 'dark', shimmer = true }) {
  const light = mode === 'light';
  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `
        radial-gradient(circle at 50% 122%, rgba(0,0,0,${light ? 0.34 : 0.6}), transparent 52%),
        radial-gradient(circle at 50% 47%, ${pal.bright} 0%, ${pal.mid} 43%, ${pal.deep} 77%, ${light ? pal.deep : '#03201a'} 100%)`,
      boxShadow: light
        ? `inset 0 -10px 22px rgba(0,0,0,0.32), inset 0 8px 16px rgba(255,255,255,0.34), inset 0 0 0 1px rgba(0,0,0,0.10)`
        : `inset 0 -14px 28px rgba(0,0,0,0.5), inset 0 9px 20px rgba(255,255,255,0.16), inset 0 0 0 1px rgba(0,0,0,0.22), 0 18px 46px -10px rgba(5,40,30,0.7)`,
      border: `1px solid ${light ? 'rgba(255,255,255,0.5)' : 'rgba(217,169,75,0.20)'}`,
      overflow: 'hidden',
    }}>
      {/* top rim light */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 50% 5%, rgba(255,255,255,0.34), transparent 34%)', opacity: 0.9 }} />
      {/* env reflection */}
      <div style={{ position: 'absolute', right: '13%', bottom: '15%', width: '42%', height: '32%', borderRadius: '50%', background: `radial-gradient(closest-side, ${pal.spark}66, transparent 72%)`, filter: 'blur(3px)', opacity: light ? 0.6 : 0.5 }} />
      {/* facet streaks */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(123deg, transparent 39%, rgba(255,255,255,0.12) 47%, transparent 53%)', mixBlendMode: 'screen', opacity: 0.6 }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(58deg, transparent 62%, rgba(255,255,255,0.08) 71%, transparent 78%)', mixBlendMode: 'screen', opacity: 0.5 }} />
      {shimmer && (
        <div style={{ position: 'absolute', inset: '-30%', borderRadius: '50%', background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.10) 22deg, transparent 56deg, transparent 360deg)', mixBlendMode: 'screen', opacity: 0.55, animation: 'dirSheen 16s linear infinite' }} />
      )}
      {/* soft specular */}
      <div style={{ position: 'absolute', left: '25%', top: '16%', width: '36%', height: '27%', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,255,255,0.85), rgba(255,255,255,0) 74%)', filter: 'blur(2.5px)', opacity: light ? 0.85 : 0.7 }} />
      <div style={{ position: 'absolute', left: '32%', top: '22%', width: '6.5%', height: '6.5%', borderRadius: '50%', background: 'rgba(255,255,255,0.96)', filter: 'blur(0.6px)', opacity: 0.9 }} />
    </div>
  );
}

// ── Thin progress arc (reusable) ──
function ProgressArc({ size, pct, stroke = 3, from = '#0E7C5A', to = '#D9A94B', track = 'rgba(0,0,0,0.08)', cap = 'round', glow = false }) {
  const r = (size - stroke) / 2 - 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  const uid = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id={`pa-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="65%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        {glow && <filter id={`pg-${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={stroke * 0.7} result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>}
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#pa-${uid})`} strokeWidth={stroke} strokeLinecap={cap}
        strokeDasharray={`${C * Math.max(0, Math.min(1, pct))} ${C}`} filter={glow ? `url(#pg-${uid})` : undefined} />
    </svg>
  );
}

// ── line icons ──
const Ico = ({ d, s = 22, sw = 1.6, fill = 'none', stroke = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const PATHS = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />,
  gem: <path d="M6 3h12l3 6-9 12L3 9z M3 9h18 M9 3 7 9l5 12 M15 3l2 6-5 12" />,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M16 6.2a3 3 0 0 1 0 5.6M17 14.2c2.4.5 4 2.3 4 4.8" /></>,
  more: <><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  drop: <path d="M12 3.2c3.2 4 5.4 6.6 5.4 9.4A5.4 5.4 0 0 1 12 18a5.4 5.4 0 0 1-5.4-5.4C6.6 9.8 8.8 7.2 12 3.2Z" />,
  flame: <path d="M12 3c.6 3-1.8 4.2-1.8 6.6 0 1 .7 1.8 1.8 1.8s1.8-.9 1.8-2c0-.6-.2-1.1-.2-1.1 1.7 1 2.8 2.8 2.8 4.9A4.4 4.4 0 0 1 12 17.6a4.4 4.4 0 0 1-4.4-4.4C7.6 9 10.5 7.4 12 3Z" />,
  chevL: <path d="M15 5l-7 7 7 7" />,
  chevR: <path d="M9 5l7 7-7 7" />,
  back: <path d="M15 5l-7 7 7 7" />,
  trash: <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  award: <><circle cx="12" cy="9" r="5" /><path d="M9 13.5 8 22l4-2.4L16 22l-1-8.5" /></>,
};
const TABS = [
  { key: 'inicio', label: 'Inicio', icon: PATHS.home },
  { key: 'tesoros', label: 'Tesoros', icon: PATHS.gem },
  { key: 'embajadores', label: 'Embajadores', icon: PATHS.people },
  { key: 'mas', label: 'Más', icon: PATHS.more },
];

Object.assign(window, {
  PLAN, fmtCOP, fmtCOPk, dirLog, claimDate,
  StatusBar, GemCore, ProgressArc, Ico, PATHS, TABS,
});
