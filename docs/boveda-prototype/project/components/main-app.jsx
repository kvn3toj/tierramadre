// app.jsx — Esmereogénesis state machine, tweaks, device scaler

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "direction": "vitrina",
  "estado": "con-plan",
  "progreso": 60,
  "particulas": true,
  "aporte": 210000
}/*EDITMODE-END*/;

const DIRS = { vitrina: 'Vitrina', joyero: 'Joyero', aurora: 'Aurora' };

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [emeraldId, setEmeraldId] = React.useState('muzo');
  const [racha, setRacha] = React.useState(18);
  const [view, setView] = React.useState('hub');       // 'hub' | 'plan'
  const [tab, setTab] = React.useState('hub');
  const [sheet, setSheet] = React.useState(false);
  const [pulse, setPulse] = React.useState(false);

  const hasPlan = t.estado === 'con-plan';
  const emerald = CATALOG.find((c) => c.id === emeraldId) || CATALOG[0];

  // build the live plan from tweak/state
  const plan = React.useMemo(() => {
    if (!hasPlan) return null;
    const meta = emerald.meta;
    const aporteSemanal = t.aporte;
    const acumulado = Math.min(meta, Math.round(meta * t.progreso / 100));
    return {
      emerald, meta, aporteSemanal, racha,
      acumulado,
      log: buildLog(Math.max(1, racha), aporteSemanal),
    };
  }, [hasPlan, emerald, t.aporte, t.progreso, racha]);

  // ── actions ──
  const water = () => {
    const step = (t.aporte / emerald.meta) * 100;
    setTweak('progreso', Math.min(100, Math.round((t.progreso + step) * 10) / 10));
    setRacha((r) => r + 1);
    setPulse(true);
    setTimeout(() => setPulse(false), 1400);
  };

  const startPlan = () => { setSheet(true); };

  const confirmPlan = (e, aporte) => {
    setEmeraldId(e.id);
    setTweak({ estado: 'con-plan', aporte, progreso: Math.round((aporte / e.meta) * 100 * 10) / 10 });
    setRacha(1);
    setSheet(false);
    setView('hub'); setTab('hub');
  };

  const onTab = (key) => {
    setTab(key);
    if (key === 'hub' || key === 'perfil') setView('hub');
    else if (key === 'diario') setView(hasPlan ? 'plan' : 'hub');
    else if (key === 'vitrina') setSheet(true);
  };

  // ── device scaler ──
  React.useEffect(() => {
    const wrap = document.getElementById('frame-wrap');
    const fit = () => {
      const m = 24;
      const s = Math.min((window.innerWidth - m) / 390, (window.innerHeight - m) / 844);
      wrap.style.transform = `scale(${Math.min(s, 1.15)})`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  let screen;
  if (view === 'plan' && plan) {
    screen = <PlanDetailScreen plan={plan} particles={t.particulas} onBack={() => { setView('hub'); setTab('hub'); }} onWater={water} />;
  } else if (hasPlan && plan) {
    screen = <HubScreen plan={plan} particles={t.particulas} onWater={water} onOpenPlan={() => { setView('plan'); setTab('diario'); }} wateredPulse={pulse} />;
  } else {
    screen = <EmptyScreen onStart={startPlan} />;
  }

  return (
    <div className="app-root" data-dir={t.direction}>
      <IOSDevice dark width={390} height={844}>
        <div className="screen-bg">
          {screen}
          <TabBar active={tab} onTab={onTab} onCenter={() => setSheet(true)} />
          <CreationSheet open={sheet} onClose={() => setSheet(false)} onConfirm={confirmPlan} />
        </div>
      </IOSDevice>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Dirección visual" />
        <TweakRadio label="Estilo" value={t.direction}
          options={['vitrina', 'joyero', 'aurora']}
          onChange={(v) => setTweak('direction', v)} />
        <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.45, margin: '2px 2px 4px' }}>
          {t.direction === 'vitrina' && 'Vitrina — glass flotante sobre negro, oro en hilo. Lujo clásico.'}
          {t.direction === 'joyero' && 'Joyero — estructurado, marcos en oro, más oscuro y editorial.'}
          {t.direction === 'aurora' && 'Aurora — atmosférico, degradados suaves, partículas protagonistas.'}
        </div>

        <TweakSection label="Estado" />
        <TweakRadio label="Plan" value={t.estado}
          options={['con-plan', 'sin-plan']}
          onChange={(v) => setTweak('estado', v)} />
        <TweakSlider label="Progreso (regada)" value={t.progreso} min={0} max={100} unit="%"
          onChange={(v) => setTweak('progreso', v)} />
        <TweakSelect label="Aporte semanal" value={String(t.aporte)}
          options={APORTES.map((a) => ({ value: String(a), label: fmtCOP(a) }))}
          onChange={(v) => setTweak('aporte', Number(v))} />

        <TweakSection label="Esmeralda" />
        <TweakSelect label="Piedra" value={emeraldId}
          options={CATALOG.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(v) => setEmeraldId(v)} />
        <TweakToggle label="Partículas flotantes" value={t.particulas}
          onChange={(v) => setTweak('particulas', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('frame-wrap')).render(<App />);
