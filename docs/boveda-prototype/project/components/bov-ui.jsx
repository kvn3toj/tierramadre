// bov-ui.jsx — shared chrome & atoms for Bóveda. Exports to window.

const Ico = ({ d, s = 22, sw = 1.6, fill = 'none', stroke = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const P = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />,
  gem: <><path d="M7.5 4H16.5L20 8V16L16.5 20H7.5L4 16V8Z" /><path d="M7.5 8.5H16.5" /><path d="M7.5 15.5H16.5" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M16 6.2a3 3 0 0 1 0 5.6M17 14.2c2.4.5 4 2.3 4 4.8" /></>,
  more: <><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
  drop: <path d="M12 3.2c3.2 4 5.4 6.6 5.4 9.4A5.4 5.4 0 0 1 12 18a5.4 5.4 0 0 1-5.4-5.4C6.6 9.8 8.8 7.2 12 3.2Z" />,
  flame: <path d="M12 3c.6 3-1.8 4.2-1.8 6.6 0 1 .7 1.8 1.8 1.8s1.8-.9 1.8-2c0-.6-.2-1.1-.2-1.1 1.7 1 2.8 2.8 2.8 4.9A4.4 4.4 0 0 1 12 17.6a4.4 4.4 0 0 1-4.4-4.4C7.6 9 10.5 7.4 12 3Z" />,
  chevL: <path d="M15 5l-7 7 7 7" />,
  chevR: <path d="M9 5l7 7-7 7" />,
  trash: <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  seed: <path d="M12 21V9M12 9c0-3 2.4-5 5.5-5C17.5 7 15 9 12 9Zm0 0C12 6 9.6 4 6.5 4 6.5 7 9 9 12 9Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.5" /></>,
  award: <><circle cx="12" cy="9" r="5" /><path d="M9 13.5 8 22l4-2.4L16 22l-1-8.5" /></>,
};
const TABS = [
  { key: 'inicio', label: 'Inicio', icon: P.home },
  { key: 'tesoros', label: 'Tesoros', icon: P.gem },
  { key: 'embajadores', label: 'Embajadores', icon: P.people },
  { key: 'mas', label: 'Más', icon: P.more },
];

function StatusBar({ light = false }) {
  const bp = (typeof useBp === 'function') ? useBp() : 'mobile';
  if (bp === 'desktop') return <div style={{ height: 30, flexShrink: 0 }} />;
  const c = 'var(--statusbar)';
  return (
    <div style={{ height: 44, flexShrink: 0, position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px 0 32px', color: c }}>
      <span style={{ fontSize: 14.5, fontWeight: 700 }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill={c}><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={c} strokeOpacity="0.45" /><rect x="2" y="2" width="17" height="8" rx="1.6" fill={c} /><rect x="23" y="3.5" width="1.6" height="5" rx="0.8" fill={c} fillOpacity="0.5" /></svg>
      </div>
    </div>
  );
}

// ── emerald-cut gem icon (precise top-view step cut, landscape octagon) ──
function EmeraldCutIcon({ size = 22, sw = 5.5, stroke = 'currentColor' }) {
  return (
    <svg width={size} height={size * 0.76} viewBox="0 0 100 76" fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
      <path d="M26 6 L74 6 L94 26 L94 50 L74 70 L26 70 L6 50 L6 26 Z" />
      <path d="M28 12 L72 12 L88 28 L88 48 L72 64 L28 64 L12 48 L12 28 Z" />
      <path d="M35 21 L65 21 L79 35 L79 41 L65 55 L35 55 L21 41 L21 35 Z" />
      <path d="M26 6 L35 21 M74 6 L65 21 M94 26 L79 35 M94 50 L79 41 M74 70 L65 55 M26 70 L35 55 M6 50 L21 41 M6 26 L21 35" />
    </svg>
  );
}

function Dock({ active = 'inicio', onTab }) {
  const bp = (typeof useBp === 'function') ? useBp() : 'mobile';
  if (bp === 'desktop') return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, padding: '10px 22px 30px',
      background: 'linear-gradient(180deg, transparent, var(--dock-fade) 40%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <button key={t.key} className="tap" onClick={() => onTab && onTab(t.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: on ? 'var(--gold-bright)' : 'var(--ink-faint)' }}>
            {t.key === 'tesoros'
              ? <EmeraldCutIcon size={23} sw={on ? 6.5 : 5} />
              : <Ico d={t.icon} s={21} sw={on ? 2 : 1.5} />}
            <span style={{ fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: on ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// kicker + stage chip
function Kicker({ children, style }) {
  return <div style={{ fontSize: 9.5, letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gold)', ...style }}>{children}</div>;
}

function StageChip({ stage, animatePulse = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(47,174,134,0.12)', border: '1px solid rgba(47,174,134,0.32)' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--em-bright)', boxShadow: '0 0 8px var(--em-bright)' }} />
      <span style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--ink)' }}>{stage.label}</span>
    </div>
  );
}

// growing streak flame — flame scale + glow grows with weeks
function StreakFlame({ weeks, milestone = false }) {
  const grow = Math.min(1, weeks / 30);
  const sz = 15 + grow * 7;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 15px', borderRadius: 999, background: milestone ? 'var(--accent-bg)' : 'var(--accent-bg)', border: `1px solid rgba(217,169,75,${0.28 + grow * 0.2})`, boxShadow: milestone ? '0 0 22px -4px var(--gold)' : `0 0 ${10 + grow * 16}px -6px var(--gold)`, transition: 'all .5s' }}>
      <span className="anim-loop" style={{ display: 'inline-flex', filter: `drop-shadow(0 0 ${3 + grow * 5}px var(--gold))`, animation: 'bovBreathe 2.4s ease-in-out infinite' }}>
        <Ico d={P.flame} s={sz} sw={1.4} fill="var(--gold)" stroke="var(--gold-bright)" />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gold-bright)', letterSpacing: '0.03em' }}>{weeks} <span style={{ fontWeight: 500, color: 'var(--ink-soft)' }}>semanas regando</span></span>
    </div>
  );
}

// primary luminous CTA
function WaterButton({ onClick, label = 'Regar mi esmeralda', sub, busy = false, glow = true }) {
  return (
    <button className="tap" onClick={onClick} disabled={busy} style={{ width: '100%', borderRadius: 999, padding: sub ? '13px' : '17px', opacity: busy ? 0.7 : 1,
      background: 'linear-gradient(180deg, var(--em-bright), var(--em) 50%, var(--em-deep))',
      boxShadow: glow ? '0 0 40px -8px var(--em-bright), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 0 0 1px var(--accent-line-strong)' : 'inset 0 0 0 1px var(--accent-line-strong)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Ico d={P.drop} s={18} sw={1.7} stroke="#fff" />
        <span style={{ fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{label}</span>
      </span>
      {sub && <span style={{ fontSize: 11, color: 'var(--btn-sub)', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{sub}</span>}
    </button>
  );
}

function GhostBtn({ children, onClick, style }) {
  return <button className="tap" onClick={onClick} style={{ width: '100%', borderRadius: 999, padding: '14px', border: '1px solid var(--hairline)', background: 'var(--surface)', backdropFilter: 'blur(8px)', fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', ...style }}>{children}</button>;
}

// ── sheet chrome: close ✕ + swipe-down-to-dismiss ──
function CloseX({ onClose }) {
  return (
    <button className="tap" onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: 14, right: 16, zIndex: 6, width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>
      <Ico d={<path d="M5 5l14 14M19 5 5 19" />} s={15} sw={1.8} />
    </button>
  );
}
function useSwipeDown(onClose) {
  const startY = React.useRef(null);
  return {
    onPointerDown: (e) => { startY.current = e.clientY; },
    onPointerUp: (e) => { if (startY.current != null && e.clientY - startY.current > 54) onClose(); startY.current = null; },
    onPointerCancel: () => { startY.current = null; },
  };
}

// ── theme toggle (sun ⇄ moon) ──
const SUN_ICON = <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.5 1.5M17.9 17.9l1.5 1.5M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.5-1.5M17.9 6.1l1.5-1.5" /></>;
const MOON_ICON = <path d="M20 14.2A8 8 0 1 1 9.8 4 6.4 6.4 0 0 0 20 14.2Z" />;
function ThemeToggle({ theme, onToggle }) {
  const light = theme === 'light';
  return (
    <button className="tap" onClick={onToggle} aria-label="Cambiar tema" style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>
      <Ico d={light ? MOON_ICON : SUN_ICON} s={19} sw={1.6} />
    </button>
  );
}

Object.assign(window, { Ico, P, TABS, StatusBar, Dock, Kicker, StageChip, StreakFlame, WaterButton, GhostBtn, CloseX, useSwipeDown, ThemeToggle, EmeraldCutIcon });
