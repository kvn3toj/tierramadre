// bov-responsive.jsx — breakpoint context, per-breakpoint canvas sizes, and the
// desktop left side-nav that replaces the bottom Dock. Loaded BEFORE bov-main.
// Exports to window: BP_CANVAS, detectBp, BpCtx, useBp, SideNav, useBpState

// fixed canvas per breakpoint (scaled-to-fit, letterboxed) — keeps the design
// pixel-stable at each size and avoids reflow bugs, same model as the phone.
const BP_CANVAS = {
  mobile:  { w: 390,  h: 844 },
  ipad:    { w: 834,  h: 1194 },
  desktop: { w: 1440, h: 900 },
};

function detectBp(w) {
  try {
    const f = new URLSearchParams(location.search).get('bp');
    if (f === 'mobile' || f === 'ipad' || f === 'desktop') return f;
  } catch (e) {}
  if (w < 760) return 'mobile';
  if (w < 1180) return 'ipad';
  return 'desktop';
}

function useBpState() {
  const [bp, setBp] = React.useState(() => detectBp(window.innerWidth));
  React.useEffect(() => {
    const on = () => setBp(detectBp(window.innerWidth));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return bp;
}

const BpCtx = React.createContext('mobile');
const useBp = () => React.useContext(BpCtx);

// ── desktop side-nav: slim vertical rail, replaces the bottom Dock ──
function SideNav({ active = 'inicio', onTab, theme, onToggleTheme }) {
  return (
    <div className="bov-sidenav">
      {/* brand mark */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, paddingTop: 4 }}>
        <span style={{ color: 'var(--gold)', display: 'inline-flex', filter: 'drop-shadow(0 0 10px rgba(217,169,75,0.4))' }}>
          <EmeraldCutIcon size={30} sw={5} />
        </span>
        <span className="serif" style={{ fontSize: 10.5, letterSpacing: '0.16em', color: 'var(--ink-soft)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', textTransform: 'uppercase', marginTop: 4 }}>Tierra Mädre</span>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', alignItems: 'center' }}>
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <button key={t.key} className="tap" onClick={() => onTab && onTab(t.key)} style={{
              width: 64, padding: '11px 0', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              color: on ? 'var(--gold-bright)' : 'var(--ink-faint)',
              background: on ? 'var(--accent-bg)' : 'transparent',
              border: on ? '1px solid var(--accent-line)' : '1px solid transparent',
              boxShadow: on ? '0 0 24px -10px var(--gold)' : 'none', transition: 'all .2s' }}>
              {t.key === 'tesoros'
                ? <EmeraldCutIcon size={23} sw={on ? 6.5 : 5} />
                : <Ico d={t.icon} s={22} sw={on ? 2 : 1.5} />}
              <span style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: on ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* theme toggle pinned bottom */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </div>
  );
}

Object.assign(window, { BP_CANVAS, detectBp, BpCtx, useBp, useBpState, SideNav });
