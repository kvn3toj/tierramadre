// bov-main.jsx — Bóveda app: journey-ordered state machine, ritual + ceremony
// orchestration, screen transitions, device scaler.
//
// Canonical happy path:
//   PRODUCTO → ¿Qué es? (context) → CREAR (creation) → siembra → PLAN
//   → Regar… → ECLOSIÓN → Reclamar → HUB (Tu jardín)
// Tabs: Inicio = Hub/jardín · Tesoros = catálogo/producto · Embajadores · Más

const META = 6300000;
const SEED = { acumulado: 3780000, racha: 18, name: 'Gota de Muzo', origin: 'Muzo · Boyacá', carat: '2,1 ct', color: 'Verde jardín', cert: 'CDTEC Bogotá' };
const SEED_START = 210000; // freshly-seeded plan = first aporte

function App() {
  const bp = useBpState();
  const [screen, setScreen] = React.useState('producto');  // producto|hub|plan|empty|mas|embajadores
  const [hasPlan, setHasPlan] = React.useState(false);
  const [acumulado, setAcumulado] = React.useState(SEED.acumulado);
  const [racha, setRacha] = React.useState(SEED.racha);
  const [aporte, setAporte] = React.useState(210000);
  const [phase, setPhase] = React.useState('idle');
  const [milestone, setMilestone] = React.useState(false);
  const [ceremony, setCeremony] = React.useState(false);
  const [hatched, setHatched] = React.useState(false);
  const [claimed, setClaimed] = React.useState(false);
  const [reclamada, setReclamada] = React.useState(false);
  const [siembra, setSiembra] = React.useState(false);
  const [create, setCreate] = React.useState(false);
  const [context, setContext] = React.useState(false);
  const [ctaVariant, setCtaVariantState] = React.useState(() => {
    try { return localStorage.getItem('bov-cta') || 'concepto'; } catch (e) { return 'concepto'; }
  });
  const setCtaVariant = (v) => { setCtaVariantState(v); try { localStorage.setItem('bov-cta', v); } catch (e) {} };
  const [petCount, setPetCount] = React.useState(0);
  const [theme, setTheme] = React.useState(() => {
    try { return localStorage.getItem('bov-theme') || 'dark'; } catch (e) { return 'dark'; }
  });
  const toggleTheme = () => setTheme((t) => { const n = t === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('bov-theme', n); } catch (e) {} return n; });
  const timers = React.useRef([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  React.useEffect(() => clearTimers, []);

  const meta = META;
  const remaining = Math.max(0, meta - acumulado);

  // ── watering ritual ──
  const water = () => {
    if (phase !== 'idle' || remaining <= 0) return;
    const add = Math.min(aporte, remaining);
    const next = Math.min(meta, acumulado + add);
    const nextRacha = racha + 1;
    const hitsMilestone = nextRacha % 5 === 0;
    const willHatch = next >= meta && !hatched;

    if (REDUCED) {
      setAcumulado(next); setRacha(nextRacha);
      if (hitsMilestone) { setMilestone(true); setTimeout(() => setMilestone(false), 2200); }
      if (willHatch) { setHatched(true); setTimeout(() => setCeremony(true), 350); }
      return;
    }
    clearTimers();
    const T = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    setPhase('drop');
    T(() => setPhase('splash'), 600);
    T(() => { setPhase('bloom'); setAcumulado(next); setRacha(nextRacha); if (hitsMilestone) setMilestone(true); }, 900);
    T(() => setPhase('count'), 1120);
    T(() => setPhase('celebrate'), 2050);
    T(() => { setPhase('idle'); if (willHatch) { setHatched(true); setCeremony(true); } }, 2550);
    if (hitsMilestone) T(() => setMilestone(false), 3200);
  };

  const onPet = () => setPetCount((c) => c + 1);
  const setAmount = (v) => { if (phase === 'idle') setAporte(v); };

  // ── navigation ──
  const go = (tab) => {
    if (phase !== 'idle') return;
    if (tab === 'inicio') setScreen(hasPlan ? 'hub' : 'empty');
    else if (tab === 'tesoros') setScreen('producto');
    else if (tab === 'embajadores') setScreen('embajadores');
    else if (tab === 'mas') setScreen('mas');
  };
  const goCatalog = () => { if (phase === 'idle') setScreen('producto'); };
  const goEmpty = () => { setHasPlan(false); setScreen('empty'); };
  const openPlan = () => { if (phase === 'idle') setScreen('plan'); };
  const productBack = () => setScreen(hasPlan ? 'hub' : 'empty');
  const hubBack = () => setScreen('producto');
  const masBack = () => setScreen(hasPlan ? 'hub' : 'empty');
  const embBack = () => setScreen(hasPlan ? 'hub' : 'empty');

  // ── sheets / funnel ──
  const openContext = () => setContext(true);
  const startFromContext = () => { setContext(false); setTimeout(() => setCreate(true), 300); };
  const confirmCreate = (perWeek) => {
    setCreate(false);
    setSiembra(true);
    const dur = REDUCED ? 350 : 2200;
    setTimeout(() => {
      setHasPlan(true); setAcumulado(SEED_START); setRacha(1);
      setHatched(false); setClaimed(false); setAporte(210000);
      setSiembra(false); setScreen('plan');
    }, dur);
  };

  // ── ceremony / claim ──
  const openCeremony = () => { if (phase === 'idle') setCeremony(true); };
  const openReclamar = () => { setCeremony(false); setReclamada(true); };
  const finishReclamar = () => { setReclamada(false); setClaimed(true); setScreen('hub'); };

  // ── demo controls ──
  const loadDemo = () => {
    clearTimers(); setPhase('idle');
    setHasPlan(true); setAcumulado(SEED.acumulado); setRacha(SEED.racha);
    setHatched(false); setClaimed(false); setAporte(210000);
    setCeremony(false); setReclamada(false); setSiembra(false);
    setScreen('hub');
  };
  const reiniciar = () => {
    clearTimers(); setPhase('idle');
    setHasPlan(false); setAcumulado(SEED.acumulado); setRacha(SEED.racha);
    setHatched(false); setClaimed(false); setAporte(210000);
    setCeremony(false); setReclamada(false); setSiembra(false); setCreate(false); setContext(false);
    setScreen('producto');
  };

  // ── flow map quick-jump (Más) ──
  const currentStep = (() => {
    if (context) return 'context';
    if (create || siembra) return 'crear';
    if (ceremony || reclamada) return 'eclosion';
    if (screen === 'producto') return 'producto';
    if (screen === 'plan') return 'jardin';
    if (screen === 'hub') return 'hub';
    return null;
  })();
  const jumpStep = (key) => {
    if (phase !== 'idle') return;
    setCreate(false); setContext(false); setCeremony(false); setReclamada(false); setSiembra(false);
    if (key === 'producto') setScreen('producto');
    else if (key === 'context') { setScreen('producto'); setTimeout(() => setContext(true), 60); }
    else if (key === 'crear') { setScreen('producto'); setTimeout(() => setCreate(true), 60); }
    else if (key === 'jardin') { if (!hasPlan) { setHasPlan(true); setAcumulado(SEED.acumulado); setRacha(SEED.racha); setClaimed(false); setHatched(false); } setScreen('plan'); }
    else if (key === 'eclosion') { setCeremony(true); }
    else if (key === 'hub') { setScreen(hasPlan ? 'hub' : 'empty'); }
  };

  const activeTab = screen === 'producto' ? 'tesoros' : screen === 'mas' ? 'mas' : screen === 'embajadores' ? 'embajadores' : 'inicio';

  const ctx = {
    acumulado, meta, racha, aporte, phase, milestone, claimed,
    name: SEED.name, origin: SEED.origin, carat: SEED.carat, color: SEED.color, cert: SEED.cert,
    water, setAmount, go, onPet, loadDemo, goEmpty, goCatalog, reiniciar,
    productBack, hubBack, masBack, embBack, openPlan, openContext, openCeremony, openReclamar,
    ctaVariant, setCtaVariant, activeTab, currentStep, jumpStep,
    theme, toggleTheme, bp,
  };

  // device scaler — fits the active breakpoint's canvas into the viewport
  React.useEffect(() => {
    const wrap = document.getElementById('frame-wrap');
    const { w, h } = BP_CANVAS[bp];
    const cap = bp === 'mobile' ? 1.18 : 1;
    const fit = () => {
      const m = bp === 'desktop' ? 36 : 26;
      const s = Math.min((window.innerWidth - m) / w, (window.innerHeight - m) / h);
      wrap.style.transform = `scale(${Math.min(s, cap)})`;
    };
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [bp]);

  let body;
  if (screen === 'producto') body = <ProductoScreen ctx={ctx} />;
  else if (screen === 'mas') body = <MasScreen ctx={ctx} />;
  else if (screen === 'embajadores') body = <EmbajadoresScreen ctx={ctx} />;
  else if (screen === 'plan' && hasPlan) body = <PlanScreen ctx={ctx} />;
  else if (!hasPlan || screen === 'empty') body = <EmptyScreen ctx={ctx} />;
  else body = <HubScreen ctx={ctx} />;

  const { w, h } = BP_CANVAS[bp];

  return (
    <BpCtx.Provider value={bp}>
    <div className="device" data-frame={bp} style={{ width: w, height: h }}>
      <div className="island" />
      <div className="bov-root" data-theme={theme} data-bp={bp}>
        {bp === 'desktop' && <SideNav active={activeTab} onTab={go} theme={theme} onToggleTheme={toggleTheme} />}
        <div className="screen-anim" key={screen}>{body}</div>
        <div className="bov-vignette" />

        <CreationSheet open={create} meta={meta} name={SEED.name} onClose={() => setCreate(false)} onConfirm={confirmCreate} />
        <ContextSheet open={context} onClose={() => setContext(false)} onStart={startFromContext} />
        {siembra && <SiembraOverlay name={SEED.name} />}
        {ceremony && <EclosionCeremony name={SEED.name} onClaim={openReclamar} onClose={() => setCeremony(false)} />}
        {reclamada && <ReclamadaOverlay name={SEED.name} onHome={finishReclamar} />}

        {/* milestone toast */}
        {milestone && (
          <div className="fade-up" style={{ position: 'absolute', left: 0, right: 0, top: 92, display: 'flex', justifyContent: 'center', zIndex: 80, pointerEvents: 'none' }}>
            <div style={{ padding: '9px 18px', borderRadius: 999, background: 'rgba(240,206,134,0.16)', border: '1px solid rgba(240,206,134,0.5)', backdropFilter: 'blur(10px)', boxShadow: '0 0 30px -6px var(--gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ico d={P.flame} s={15} sw={1.4} fill="var(--gold)" stroke="var(--gold-bright)" />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gold-bright)' }}>¡Racha de {racha} semanas!</span>
            </div>
          </div>
        )}
      </div>
    </div>
    </BpCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('frame-wrap')).render(<App />);
