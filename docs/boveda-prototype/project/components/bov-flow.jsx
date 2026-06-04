// bov-flow.jsx — flow scaffolding: Más (ajustes/demo + flow map), Embajadores,
// the "siembra" moment, and the "reclamada" state. Exports to window.

const FLOW_STEPS = [
  { key: 'producto', label: 'Producto', screen: 'producto' },
  { key: 'context', label: '¿Qué es?', screen: 'producto' },
  { key: 'crear', label: 'Crear', screen: 'producto' },
  { key: 'jardin', label: 'Jardín', screen: 'plan' },
  { key: 'eclosion', label: 'Eclosión', screen: 'plan' },
  { key: 'hub', label: 'Mi jardín', screen: 'hub' },
];

// tiny journey map — current step highlit, tappable to jump
function FlowMap({ current, onJump }) {
  return (
    <div style={{ padding: '16px 16px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <Kicker style={{ fontSize: 8.5, marginBottom: 13 }}>El recorrido</Kicker>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {FLOW_STEPS.map((s, i) => {
          const on = s.key === current;
          return (
            <React.Fragment key={s.key}>
              <button className="tap" onClick={() => onJump(s.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto', width: 44 }}>
                <span style={{ width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                  background: on ? 'var(--gold-bright)' : 'rgba(47,174,134,0.25)',
                  border: `1.5px solid ${on ? 'var(--gold)' : 'rgba(47,174,134,0.5)'}`,
                  boxShadow: on ? '0 0 10px var(--gold)' : 'none' }} />
                <span style={{ fontSize: 8, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: on ? 700 : 500, color: on ? 'var(--gold-bright)' : 'var(--ink-faint)', textAlign: 'center', lineHeight: 1.2 }}>{s.label}</span>
              </button>
              {i < FLOW_STEPS.length - 1 && <span style={{ flex: 1, height: 1.5, background: 'var(--hairline)', marginTop: 6 }} />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// settings row
function MasRow({ icon, title, desc, onClick, gold, cut }) {
  return (
    <button className="tap" onClick={onClick} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, background: 'var(--surface)', border: `1px solid ${gold ? 'var(--accent-line)' : 'var(--line)'}` }}>
      <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', background: gold ? 'var(--accent-bg)' : 'rgba(47,174,134,0.14)', border: `1px solid ${gold ? 'var(--accent-line-strong)' : 'rgba(47,174,134,0.35)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {cut
          ? <EmeraldCutIcon size={19} sw={6} stroke="var(--em-bright)" />
          : <Ico d={icon} s={18} sw={1.6} stroke={gold ? 'var(--gold-bright)' : 'var(--em-bright)'} />}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
        {desc && <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>{desc}</div>}
      </div>
      <Ico d={P.chevR} s={16} sw={2} stroke="var(--ink-faint)" />
    </button>
  );
}

const refreshPath = <path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2M18 3v4h-4M6 21v-4h4" />;

function MasScreen({ ctx }) {
  const { go, masBack, currentStep, jumpStep, reiniciar, loadDemo, goEmpty, goCatalog } = ctx;
  const bp = useBp();
  return (
    <div className="scroll" style={{ paddingBottom: bp === 'desktop' ? 28 : 100 }}>
      <StatusBar />
      <TopBar title="Más" sub="Ajustes y demo" onBack={masBack} right={bp === 'desktop' ? null : <ThemeToggle theme={ctx.theme} onToggle={ctx.toggleTheme} />} />

      <div className="focus-col" style={{ padding: '8px 22px 0', position: 'relative', zIndex: 3 }}>
        <FlowMap current={currentStep} onJump={jumpStep} />

        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Kicker style={{ fontSize: 8.5, marginBottom: 2, paddingLeft: 4 }}>Demostración</Kicker>
          <MasRow icon={refreshPath} title="Reiniciar demo" desc="Vuelve al inicio del recorrido" onClick={reiniciar} gold />
          <MasRow icon={P.gem} title="Cargar jardín de demostración" desc="Un plan al 60%, con racha" onClick={loadDemo} cut />
          <MasRow icon={P.seed} title="Ver estado vacío" desc="El jardín antes de sembrar" onClick={goEmpty} />
          <MasRow icon={P.home} title="Explorar el catálogo" desc="Ir a la página de producto" onClick={goCatalog} />
        </div>

        <div style={{ marginTop: 26, textAlign: 'center' }}>
          <div className="serif" style={{ fontSize: 15, letterSpacing: '0.02em' }}>Tierra Mädre</div>
          <div style={{ fontSize: 9.5, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 5 }}>Esencia y Poder</div>
        </div>
      </div>

      <Dock active="mas" onTab={go} />
    </div>
  );
}

function EmbajadoresScreen({ ctx }) {
  const { go, embBack } = ctx;
  const bp = useBp();
  const gem = bp === 'desktop' ? 230 : bp === 'ipad' ? 196 : 150;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', paddingBottom: bp === 'desktop' ? 24 : 92 }}>
      <StatusBar />
      <TopBar title="Embajadores" sub="Programa" onBack={embBack} right={bp === 'desktop' ? null : <ThemeToggle theme={ctx.theme} onToggle={ctx.toggleTheme} />} />
      <div className="focus-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 34px', textAlign: 'center', minHeight: 0 }}>
        <LivingEmerald size={gem} pct={0.55} showRing={false} onPet={ctx.onPet} />
        <div style={{ marginTop: -8, position: 'relative', zIndex: 3 }}>
          <Kicker>Círculo Tierra Mädre</Kicker>
          <div className="serif" style={{ fontSize: 27, lineHeight: 1.12, marginTop: 11 }}>Comparte la<br />génesis</div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 13, maxWidth: 290 }}>
            Invita a quienes amas a hacer suya una esmeralda. Pronto podrás acompañar sus jardines y recibir gestos de nuestra casa.
          </p>
          <div style={{ display: 'inline-block', marginTop: 18, padding: '8px 16px', borderRadius: 999, background: 'var(--accent-bg)', border: '1px solid var(--accent-line)', fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gold-bright)' }}>Próximamente</div>
        </div>
      </div>
      <Dock active="embajadores" onTab={go} />
    </div>
  );
}

// ── siembra moment ──
function SiembraOverlay({ name }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 115, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--veil)' }}>
      {!REDUCED && [0, 0.6].map((d, i) => (
        <div key={i} style={{ position: 'absolute', left: '50%', top: '44%', width: 160, height: 160, borderRadius: '50%', border: '1px solid rgba(47,174,134,0.5)', animation: `ecloRing 2.4s ease-out ${d}s infinite` }} />
      ))}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <LivingEmerald size={150} pct={0.06} showRing={false} showBeam={false} />
      </div>
      <div style={{ textAlign: 'center', marginTop: -6, zIndex: 3 }}>
        <Kicker style={{ color: 'var(--gold)' }}>Sembrando</Kicker>
        <div className="serif" style={{ fontSize: 25, marginTop: 10 }}>Plantando tu {name}</div>
        <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="anim-loop" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold-bright)', animation: `siembraPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── reclamada (post-eclosión claim) ──
function ReclamadaOverlay({ name, onHome }) {
  const bp = (typeof useBp === 'function') ? useBp() : 'mobile';
  const wide = bp !== 'mobile';
  const gem = bp === 'desktop' ? 240 : bp === 'ipad' ? 210 : 170;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 118, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--veil)', padding: '0 30px' }}>
      <div style={{ position: 'absolute', left: '50%', top: '40%', width: 300, height: 300, borderRadius: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(240,206,134,0.28), transparent 68%)', filter: 'blur(10px)' }} />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <LivingEmerald size={gem} pct={1} showRing={false} showBeam={false} />
      </div>
      <div style={{ textAlign: 'center', marginTop: -4, zIndex: 3 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>✦ Reclamada</div>
        <div className="serif" style={{ fontSize: wide ? 40 : 29, lineHeight: 1.08, marginTop: 12 }}>{name}<br /><span style={{ fontStyle: 'italic', color: 'var(--gold-bright)' }}>es tuya</span></div>
        <p style={{ fontSize: wide ? 15 : 13, color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 14, maxWidth: 340 }}>
          Un asesor de Tierra Mädre te contactará para coordinar la entrega de tu esmeralda física, certificada y lista para vivir contigo.
        </p>
      </div>
      <div style={{ width: '100%', maxWidth: wide ? 420 : 'none', marginTop: 26, zIndex: 3 }}>
        <button className="tap" onClick={onHome} style={{ width: '100%', borderRadius: 999, padding: '16px', background: 'var(--claim-bg)', boxShadow: '0 0 38px -8px var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--claim-ink)', whiteSpace: 'nowrap' }}>Volver a mi jardín</span>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { MasScreen, EmbajadoresScreen, SiembraOverlay, ReclamadaOverlay, FlowMap, FLOW_STEPS });
