// bov-garden-wide.jsx — iPad/desktop layouts for the Hub (Tu jardín) and Plan
// (Jardín detail). Mobile keeps its original column; these are delegated to when
// bp !== 'mobile'. Exports HubWide, PlanWide.

// shared identity/fact rail
function FactRow({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: '1px solid var(--line)' }}>
      <span style={{ fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{k}</span>
      <span className="serif" style={{ fontSize: 15, whiteSpace: 'nowrap' }}>{v}</span>
    </div>
  );
}

// ── HUB (wide) ──
function HubWide({ ctx, bp }) {
  const { acumulado, meta, racha, aporte, phase, name, origin, carat, color, cert, milestone, water, setAmount, claimed, openReclamar, openPlan, hubBack, activeTab, go } = ctx;
  const display = useCountUp(acumulado);
  const pct = Math.min(1, acumulado / meta);
  const dispPct = Math.min(1, display / meta);
  const stage = stageFor(dispPct);
  const remaining = Math.max(0, meta - acumulado);
  const busy = phase !== 'idle';
  const desktop = bp === 'desktop';
  const gemSize = desktop ? 392 : 312;

  const gemPane = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
      <div style={{ position: 'relative', zIndex: 2, marginBottom: 4 }}><StageChip stage={stage} /></div>
      <LivingEmerald size={gemSize} pct={pct} phase={phase} onPet={ctx.onPet} />
      <button className="tap" onClick={openPlan} style={{ textAlign: 'center', marginTop: -34, zIndex: 3, position: 'relative', background: 'none' }}>
        <div className="serif" style={{ fontSize: desktop ? 34 : 28 }}>{name}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4, letterSpacing: '0.02em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{origin} · {carat} <span style={{ color: 'var(--gold)', display: 'inline-flex' }}><Ico d={P.chevR} s={12} sw={2} /></span></div>
      </button>
    </div>
  );

  const leftRail = (
    <div style={{ width: 264, flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Kicker style={{ fontSize: 9 }}>Estado</Kicker>
      <div className="serif" style={{ fontSize: 21, lineHeight: 1.3, marginTop: 10, color: 'var(--ink)' }}>{stage.note}</div>
      <div style={{ marginTop: 18 }}>
        <FactRow k="Origen" v={origin} />
        <FactRow k="Talla" v={carat} />
        <FactRow k="Color" v={color} />
        <FactRow k="Certificado" v={cert} />
      </div>
    </div>
  );

  const controls = (
    <div style={{ width: desktop ? 300 : 360, flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: desktop ? 104 : 90, lineHeight: 0.82, textShadow: '0 6px 38px rgba(11,92,70,0.6)' }}>
          {Math.round(dispPct * 100)}<span style={{ fontSize: 34, color: 'var(--gold-bright)' }}>%</span>
        </div>
        <div style={{ fontSize: 10, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 7 }}>regada</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 13, marginTop: 14 }}>
          <span className="serif" style={{ fontSize: 18 }}>{fmtCOP(display)}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-faint)' }} />
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>meta {fmtCOPk(meta)}</span>
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}><StreakFlame weeks={racha} milestone={milestone} /></div>
      </div>
      <div style={{ marginTop: 26, width: '100%' }}>
        {remaining <= 0 ? (
          claimed
            ? <WaterButton onClick={() => {}} busy label="Esmeralda reclamada" />
            : <WaterButton onClick={openReclamar} label="Reclamar mi esmeralda" />
        ) : (
          <>
            <AmountChips amount={aporte} remaining={remaining} onPick={setAmount} />
            <div style={{ marginTop: 12 }}>
              <WaterButton onClick={water} busy={busy} sub={`Aporte de ${fmtCOP(Math.min(aporte, remaining))} · monto editable`} />
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', paddingBottom: desktop ? 0 : 96 }}>
      <StatusBar />
      <TopBar title="Tu jardín" sub="Esmereogénesis" onBack={hubBack} right={desktop ? null : <ThemeToggle theme={ctx.theme} onToggle={ctx.toggleTheme} />} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: desktop ? 56 : 44, padding: desktop ? '0 64px' : '0 52px' }}>
        {desktop && leftRail}
        {gemPane}
        {controls}
      </div>
      <Dock active={activeTab} onTab={go} />
    </div>
  );
}

// ── PLAN detail (wide) ──
function PlanWide({ ctx, bp }) {
  const { acumulado, meta, racha, aporte, phase, name, origin, carat, color, cert, water, go, claimed, openReclamar, activeTab } = ctx;
  const display = useCountUp(acumulado);
  const pct = Math.min(1, acumulado / meta);
  const dispPct = Math.min(1, display / meta);
  const stage = stageFor(dispPct);
  const remaining = Math.max(0, meta - acumulado);
  const weeksLeft = Math.ceil(remaining / 210000);
  const busy = phase !== 'idle';
  const desktop = bp === 'desktop';
  const gemSize = desktop ? 320 : 280;
  const log = [0, 1, 2, 3].map((i) => {
    const d = new Date(2026, 5, 1 - i * 7);
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return { n: racha - i, label: `${d.getDate()} ${meses[d.getMonth()]}`, amount: 210000 };
  }).filter((r) => r.n >= 1);

  const leftPane = (
    <div style={{ flex: '0 0 auto', width: desktop ? 420 : 360, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', zIndex: 3, marginBottom: -6 }}><StageChip stage={stage} /></div>
      <LivingEmerald size={gemSize} pct={pct} phase={phase} onPet={ctx.onPet} />
      <div style={{ textAlign: 'center', marginTop: -32, zIndex: 3, position: 'relative' }}>
        <Kicker style={{ fontSize: 8.5 }}>Tu esmeralda</Kicker>
        <div className="serif" style={{ fontSize: 30, marginTop: 6 }}>{name}</div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 18, position: 'relative', zIndex: 3 }}>
        <div style={{ fontSize: 9.5, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Tu progreso</div>
        <div className="serif" style={{ fontSize: desktop ? 88 : 76, lineHeight: 0.86, marginTop: 6, textShadow: '0 6px 34px rgba(11,92,70,0.6)' }}>
          {Math.round(dispPct * 100)}<span style={{ fontSize: 30, color: 'var(--gold-bright)' }}>%</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>{fmtCOP(display)} <span style={{ color: 'var(--ink-faint)' }}>/ {fmtCOP(meta)}</span></div>
      </div>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}><StreakFlame weeks={racha} /></div>
      <div style={{ marginTop: 18, width: '100%' }}>
        {remaining <= 0 ? (
          claimed
            ? <WaterButton onClick={() => {}} busy label="Esmeralda reclamada" />
            : <WaterButton onClick={openReclamar} label="Reclamar mi esmeralda" />
        ) : (
          <>
            <AmountChips amount={aporte} remaining={remaining} onPick={ctx.setAmount} />
            <div style={{ marginTop: 12 }}>
              <WaterButton onClick={water} busy={busy} sub={`Ritmo sugerido $210.000 / semana`} />
            </div>
          </>
        )}
      </div>
    </div>
  );

  const rightPane = (
    <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 420 }}>
      <div>
        {[['Ritmo sugerido', '$210.000 / sem'], ['Faltan', `${weeksLeft} semanas`], ['Origen', origin], ['Color', color], ['Certificado', cert]].map(([k, v]) => (
          <FactRow key={k} k={k} v={v} />
        ))}
      </div>
      <div style={{ marginTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Kicker style={{ fontSize: 8.5 }}>Tus aportes ({racha})</Kicker>
          <span style={{ fontSize: 11.5, color: 'var(--gold)', fontWeight: 600 }}>Ver historial</span>
        </div>
        {log.map((r, i) => (
          <div key={r.n} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--surface-2)' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(47,174,134,0.16)', border: '1px solid var(--accent-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ico d={P.drop} s={13} sw={1.6} stroke="var(--em-bright)" />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Semana {r.n}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{r.label} · Aporte sugerido</div>
            </div>
            <span className="serif" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>+{fmtCOP(r.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="scroll" style={{ paddingBottom: desktop ? 24 : 96 }}>
      <StatusBar />
      <TopBar title="Jardín" sub="Lote N.º 014" onBack={() => go('inicio')} right={desktop ? null : <ThemeToggle theme={ctx.theme} onToggle={ctx.toggleTheme} />} />
      <div style={{ minHeight: 'calc(100% - 86px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: desktop ? 64 : 40, padding: desktop ? '20px 72px 40px' : '12px 48px 40px' }}>
        {leftPane}
        {rightPane}
      </div>
      <Dock active={activeTab} onTab={go} />
    </div>
  );
}

Object.assign(window, { HubWide, PlanWide, FactRow });
