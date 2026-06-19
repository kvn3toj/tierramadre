// bov-screens.jsx — Hub, Plan detail, Empty seed, Creation sheet. Exports to window.

// shared top bar
function TopBar({ title, sub, onBack, right }) {
  return (
    <div style={{ flexShrink: 0, position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 18px 8px' }}>
      <button className="tap" onClick={onBack} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
        {onBack ? <Ico d={P.chevL} s={22} sw={1.7} /> : null}
      </button>
      <div style={{ textAlign: 'center' }}>
        {sub && <Kicker style={{ fontSize: 8.5, letterSpacing: '0.34em' }}>{sub}</Kicker>}
        <div className="serif" style={{ fontSize: 16.5, marginTop: sub ? 3 : 0, letterSpacing: '0.01em' }}>{title}</div>
      </div>
      <div style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>{right}</div>
    </div>
  );
}

// amount chip row (editable aporte)
function AmountChips({ amount, remaining, onPick }) {
  const opts = [
    { v: 210000, label: '$210k', tag: 'Sugerido' },
    { v: 420000, label: '$420k' },
    { v: 840000, label: '$840k' },
    { v: remaining, label: 'Completar', tag: fmtCOPk(remaining) },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {opts.map((o, i) => {
        const on = amount === o.v || (o.label === 'Completar' && amount >= remaining);
        return (
          <button key={i} className="tap" onClick={() => onPick(o.v)} style={{
            flex: 1, padding: '9px 4px', borderRadius: 13, textAlign: 'center',
            background: on ? 'linear-gradient(180deg, rgba(47,174,134,0.3), rgba(11,92,70,0.18))' : 'var(--surface)',
            border: `1px solid ${on ? 'var(--accent-line-strong)' : 'var(--line)'}`,
            transition: 'all .2s',
          }}>
            <div className="serif" style={{ fontSize: 14, color: on ? 'var(--gold-bright)' : 'var(--ink)' }}>{o.label}</div>
            {o.tag && <div style={{ fontSize: 7.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 2 }}>{o.tag}</div>}
          </button>
        );
      })}
    </div>
  );
}

// ── HUB ──
function HubScreen({ ctx }) {
  const bp = useBp();
  if (bp !== 'mobile') return <HubWide ctx={ctx} bp={bp} />;
  const { acumulado, meta, racha, aporte, phase, name, origin, carat, milestone, water, setAmount, go, onPet, claimed, openReclamar, openPlan, hubBack, activeTab } = ctx;
  const display = useCountUp(acumulado);
  const pct = Math.min(1, acumulado / meta);
  const dispPct = Math.min(1, display / meta);
  const stage = stageFor(dispPct);
  const remaining = Math.max(0, meta - acumulado);
  const busy = phase !== 'idle';

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', paddingBottom: 92 }}>
      <StatusBar />
      <TopBar title="Tu jardín" sub="Esmereogénesis" onBack={hubBack} right={<ThemeToggle theme={ctx.theme} onToggle={ctx.toggleTheme} />} />

      {/* stage */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <div style={{ position: 'relative', zIndex: 2, marginBottom: 2 }}>
          <StageChip stage={stage} />
        </div>
        <LivingEmerald size={228} pct={pct} phase={phase} onPet={onPet} />
        <button className="tap" onClick={openPlan} style={{ textAlign: 'center', marginTop: -28, zIndex: 3, position: 'relative', background: 'none' }}>
          <div className="serif" style={{ fontSize: 23 }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 3, letterSpacing: '0.02em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{origin} · {carat} <span style={{ color: 'var(--gold)', display: 'inline-flex' }}><Ico d={P.chevR} s={11} sw={2} /></span></div>
        </button>
      </div>

      {/* metric block */}
      <div style={{ flexShrink: 0, textAlign: 'center', position: 'relative', zIndex: 3 }}>
        <div className="serif" style={{ fontSize: 80, lineHeight: 0.84, textShadow: '0 6px 38px rgba(11,92,70,0.6)' }}>
          {Math.round(dispPct * 100)}<span style={{ fontSize: 30, color: 'var(--gold-bright)' }}>%</span>
        </div>
        <div style={{ fontSize: 9.5, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 5 }}>regada</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 13, marginTop: 13 }}>
          <span className="serif" style={{ fontSize: 17 }}>{fmtCOP(display)}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ink-faint)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>meta {fmtCOPk(meta)}</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <StreakFlame weeks={racha} milestone={milestone} />
        </div>
      </div>

      {/* controls */}
      <div style={{ flexShrink: 0, padding: '18px 24px 0', position: 'relative', zIndex: 3 }}>
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

      <Dock active={activeTab} onTab={go} />
    </div>
  );
}

// ── PLAN DETAIL ──
function PlanScreen({ ctx }) {
  const bp = useBp();
  if (bp !== 'mobile') return <PlanWide ctx={ctx} bp={bp} />;
  const { acumulado, meta, racha, aporte, phase, name, origin, carat, color, cert, water, go, onPet, claimed, openReclamar, activeTab } = ctx;
  const display = useCountUp(acumulado);
  const pct = Math.min(1, acumulado / meta);
  const dispPct = Math.min(1, display / meta);
  const stage = stageFor(dispPct);
  const remaining = Math.max(0, meta - acumulado);
  const weeksLeft = Math.ceil(remaining / 210000);
  const busy = phase !== 'idle';
  const log = [0, 1, 2, 3].map((i) => {
    const d = new Date(2026, 5, 1 - i * 7);
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return { n: racha - i, label: `${d.getDate()} ${meses[d.getMonth()]}`, amount: 210000 };
  }).filter((r) => r.n >= 1);

  return (
    <div className="scroll" style={{ paddingBottom: 96 }}>
      <StatusBar />
      <TopBar title="Jardín" sub={`Lote N.º 014`} onBack={() => go('inicio')} right={<ThemeToggle theme={ctx.theme} onToggle={ctx.toggleTheme} />} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', zIndex: 3, marginBottom: -6 }}><StageChip stage={stage} /></div>
        <LivingEmerald size={206} pct={pct} phase={phase} onPet={onPet} />
        <div style={{ textAlign: 'center', marginTop: -30, zIndex: 3, position: 'relative' }}>
          <Kicker style={{ fontSize: 8.5 }}>Tu esmeralda</Kicker>
          <div className="serif" style={{ fontSize: 27, marginTop: 6 }}>{name}</div>
        </div>
      </div>

      {/* giant figure */}
      <div style={{ textAlign: 'center', marginTop: 14, position: 'relative', zIndex: 3 }}>
        <div style={{ fontSize: 9.5, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Tu progreso</div>
        <div className="serif" style={{ fontSize: 72, lineHeight: 0.86, marginTop: 6, textShadow: '0 6px 34px rgba(11,92,70,0.6)' }}>
          {Math.round(dispPct * 100)}<span style={{ fontSize: 28, color: 'var(--gold-bright)' }}>%</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>{fmtCOP(display)} <span style={{ color: 'var(--ink-faint)' }}>/ {fmtCOP(meta)}</span></div>
      </div>

      {/* ritmo + CTA */}
      <div style={{ padding: '20px 24px 0', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><StreakFlame weeks={racha} /></div>
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

      {/* hairline data rows over scene */}
      <div style={{ padding: '24px 26px 0', position: 'relative', zIndex: 3 }}>
        {[['Ritmo sugerido', '$210.000 / sem'], ['Faltan', `${weeksLeft} semanas`], ['Origen', origin], ['Color', color], ['Certificado', cert]].map(([k, v], i) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{k}</span>
            <span className="serif" style={{ fontSize: 15, whiteSpace: 'nowrap' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* aportes */}
      <div style={{ padding: '22px 26px 0', position: 'relative', zIndex: 3 }}>
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

      <Dock active={activeTab} onTab={go} />
    </div>
  );
}

// ── EMPTY (seed) ──
function EmptyScreen({ ctx }) {
  const { go, goCatalog, loadDemo } = ctx;
  const bp = useBp();
  const gem = bp === 'desktop' ? 320 : bp === 'ipad' ? 264 : 210;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', paddingBottom: bp === 'desktop' ? 24 : 92 }}>
      <StatusBar />
      <TopBar title="Tu jardín" sub="Esmereogénesis" onBack={null} right={bp === 'desktop' ? null : <ThemeToggle theme={ctx.theme} onToggle={ctx.toggleTheme} />} />

      <div className="focus-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center', minHeight: 0 }}>
        <LivingEmerald size={gem} pct={0.02} showRing={false} onPet={ctx.onPet} />
        <div style={{ marginTop: -10, position: 'relative', zIndex: 3 }}>
          <Kicker>Comienza tu génesis</Kicker>
          <div className="serif" style={{ fontSize: bp === 'mobile' ? 31 : 38, lineHeight: 1.1, marginTop: 12 }}>Tu jardín de<br />esmeraldas espera</div>
          <p style={{ fontSize: bp === 'mobile' ? 13.5 : 15, color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 14, maxWidth: 360 }}>
            Esmereogénesis es un método de ahorro con propósito. Elige una esmeralda del catálogo y comienza a darle vida con cada aporte.
          </p>
        </div>
      </div>

      <div className="focus-col" style={{ flexShrink: 0, padding: '0 28px', position: 'relative', zIndex: 3, width: '100%' }}>
        <WaterButton onClick={goCatalog} label="Explorar el catálogo" />
        <button className="tap" onClick={loadDemo} style={{ width: '100%', marginTop: 14, padding: '6px', fontSize: 12.5, color: 'var(--ink-faint)', letterSpacing: '0.03em', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Cargar jardín de demostración
        </button>
      </div>

      <Dock active={ctx.activeTab} onTab={go} />
    </div>
  );
}

// ── CREATION SHEET ──
const DURATIONS = [3, 6, 9, 12];
function CreationSheet({ open, meta, name, onClose, onConfirm }) {
  const [months, setMonths] = React.useState(6);
  const weeks = months * 4;
  const perWeek = Math.ceil(meta / weeks / 1000) * 1000;
  const [coach, setCoach] = React.useState(true);
  const swipe = useSwipeDown(onClose);
  const bp = useBp();
  const wide = bp !== 'mobile';
  const panelStyle = wide
    ? { position: 'absolute', left: '50%', top: '50%', zIndex: 101, width: 'min(480px, 86%)', maxHeight: '90%', overflowY: 'auto',
        transform: open ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-46%) scale(0.96)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'transform .42s cubic-bezier(.2,.85,.25,1), opacity .3s', borderRadius: 28, overflow: 'hidden',
        background: 'var(--sheet-bg)', border: '1px solid var(--line)', boxShadow: '0 40px 110px -30px rgba(0,0,0,0.7)' }
    : { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 101, transform: open ? 'translateY(0)' : 'translateY(103%)', transition: 'transform .46s cubic-bezier(.2,.85,.25,1)', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', background: 'var(--sheet-bg)', border: '1px solid var(--line)', borderBottom: 'none', boxShadow: 'var(--sheet-shadow)' };

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'var(--scrim)', backdropFilter: 'blur(3px)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .35s' }} />
      <div style={panelStyle}>
        <CloseX onClose={onClose} />
        <div style={{ padding: '12px 24px 26px' }}>
          <div {...swipe} style={{ width: 40, height: 4.5, borderRadius: 99, background: 'var(--ink-faint)', margin: '0 auto 18px', cursor: 'grab', touchAction: 'none' }} />

          {/* gem preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
            <div style={{ width: 92, height: 92, flexShrink: 0 }}>
              <LivingEmerald size={92} pct={0.4} showRing={false} showBeam={false} />
            </div>
            <div>
              <Kicker style={{ fontSize: 8.5 }}>Vas a sembrar</Kicker>
              <div className="serif" style={{ fontSize: 24, marginTop: 4 }}>{name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 3 }}>Meta {fmtCOP(meta)} · Muzo · Boyacá</div>
            </div>
          </div>

          {/* coachmark */}
          {coach && (
            <div className="fade-up" style={{ position: 'relative', margin: '16px 0 4px', padding: '12px 14px', borderRadius: 14, background: 'var(--accent-bg)', border: '1px solid var(--accent-line)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Ico d={P.info} s={16} sw={1.5} stroke="var(--gold-bright)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gold-bright)', letterSpacing: '0.02em' }}>Aporte sugerido</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.45 }}>Elige una duración y calcularemos cuánto regar cada semana. Puedes cambiarlo cuando quieras.</div>
              </div>
              <button onClick={() => setCoach(false)} style={{ color: 'var(--ink-faint)', fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
            </div>
          )}

          {/* duration selector */}
          <div style={{ marginTop: 18 }}>
            <Kicker style={{ fontSize: 8.5, marginBottom: 10 }}>Duración de tu génesis</Kicker>
            <div style={{ display: 'flex', gap: 8 }}>
              {DURATIONS.map((m) => {
                const on = m === months;
                return (
                  <button key={m} className="tap" onClick={() => setMonths(m)} style={{ flex: 1, padding: '14px 4px', borderRadius: 14, textAlign: 'center', background: on ? 'linear-gradient(180deg, rgba(47,174,134,0.32), rgba(11,92,70,0.2))' : 'var(--surface)', border: `1px solid ${on ? 'var(--accent-line-strong)' : 'var(--line)'}`, transition: 'all .2s' }}>
                    <div className="serif" style={{ fontSize: 22, color: on ? 'var(--gold-bright)' : 'var(--ink)' }}>{m}</div>
                    <div style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 2 }}>meses</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* live rhythm */}
          <div style={{ marginTop: 16, padding: '16px 18px', borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--line)', textAlign: 'center' }}>
            <div style={{ fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Ritmo semanal</div>
            <div className="serif" style={{ fontSize: 34, marginTop: 4, color: 'var(--gold-bright)' }}>{fmtCOP(perWeek)}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.5 }}>
              Tu <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{name}</b> tomará vida en <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{months} meses</b> con aportes de <b style={{ color: 'var(--gold-bright)', fontWeight: 600 }}>{fmtCOP(perWeek)}</b> por semana.
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <WaterButton onClick={() => onConfirm(perWeek)} label="Sembrar mi Esmereogénesis" />
            <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 11, lineHeight: 1.5 }}>Sin permanencia · la piedra se reserva a tu nombre desde hoy.</div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { HubScreen, PlanScreen, EmptyScreen, CreationSheet, TopBar, AmountChips });
