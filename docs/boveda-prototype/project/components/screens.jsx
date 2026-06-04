// screens.jsx — Esmereogénesis: Hub, Plan detail, Empty, Creation sheet
// (depends on emerald-core.jsx globals)

const meses3 = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const dateAfterWeeks = (w) => {
  const d = new Date(2026, 5, 3 + w * 7);
  return `${d.getDate()} ${meses3[d.getMonth()]} ${d.getFullYear()}`;
};

// ── minimal line icons ──
const Icon = ({ d, size = 22, fill = false, stroke = 'currentColor', sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? stroke : 'none'}
    stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const ICONS = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" />,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></>,
  book: <><path d="M5 4.5h9a2.5 2.5 0 0 1 2.5 2.5V20a2 2 0 0 0-2-2H5z" /><path d="M19 6.5V18" /></>,
  user: <><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /></>,
  drop: <path d="M12 3.2c3.2 4 5.4 6.6 5.4 9.4A5.4 5.4 0 0 1 12 18a5.4 5.4 0 0 1-5.4-5.4C6.6 9.8 8.8 7.2 12 3.2Z" />,
  chevR: <path d="M9 5l7 7-7 7" />,
  chevL: <path d="M15 5l-7 7 7 7" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  check: <path d="M4 12.5 9 17.5 20 6.5" />,
  award: <><circle cx="12" cy="9" r="5.2" /><path d="M9 13.5 8 22l4-2.4L16 22l-1-8.5" /></>,
  cert: <><path d="M5 3.5h14v17l-7-3.2-7 3.2z" /><path d="M9 8h6M9 11.5h6" /></>,
  seed: <path d="M12 21c0-5 0-7-2.5-9.5M12 21c0-5 0-7 2.5-9.5M12 21V8M12 8c0-2.8 2.2-4.5 5-4.5C17 6.3 14.8 8 12 8Zm0 0C12 5.2 9.8 3.5 7 3.5 7 6.3 9.2 8 12 8Z" />,
};

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────
function Header({ name = 'Valentina', greeting = 'Buenas noches' }) {
  return (
    <div style={{ padding: '56px var(--pad) 4px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <Kicker>Esmereogénesis</Kicker>
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-soft)', fontWeight: 500 }}>{greeting},</div>
        <div className="serif" style={{ fontSize: 29, fontWeight: 600, lineHeight: 1.05, marginTop: 2 }}>{name}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 9, paddingTop: 22 }}>
        <div className="serif" style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--ink-faint)', fontStyle: 'italic' }}>Tierra Mädre</div>
        <div className="glass" style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <span className="serif" style={{ fontSize: 16, color: 'var(--gold-bright)' }}>V</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab bar (glass, center gem)
// ─────────────────────────────────────────────────────────────
function TabBar({ active, onTab, onCenter }) {
  const item = (key, icon, label) => {
    const on = active === key;
    return (
      <button className="tap" onClick={() => onTab(key)} style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        color: on ? 'var(--gold-bright)' : 'var(--ink-faint)', padding: '4px 0',
      }}>
        <Icon d={icon} size={21} sw={on ? 1.9 : 1.6} />
        <span style={{ fontSize: 9, letterSpacing: '0.08em', fontWeight: on ? 600 : 500, textTransform: 'uppercase' }}>{label}</span>
      </button>
    );
  };
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40, padding: '0 14px 26px' }}>
      <div className="glass" style={{
        display: 'flex', alignItems: 'center', borderRadius: 30, padding: '10px 8px',
        position: 'relative', boxShadow: '0 14px 36px rgba(0,0,0,0.45)',
      }}>
        {item('hub', ICONS.home, 'Inicio')}
        {item('vitrina', ICONS.grid, 'Vitrina')}
        <div style={{ width: 64, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <button className="tap" onClick={onCenter} style={{
            width: 54, height: 54, borderRadius: '50%', marginTop: -30,
            background: 'linear-gradient(180deg, var(--em-bright), var(--em-deep))',
            boxShadow: '0 8px 22px rgba(11,92,70,0.6), inset 0 0 0 1.5px rgba(217,169,75,0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={ICONS.drop} size={24} fill={false} stroke="#fff" sw={1.7} />
          </button>
        </div>
        {item('diario', ICONS.book, 'Diario')}
        {item('perfil', ICONS.user, 'Perfil')}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HUB (populated)
// ─────────────────────────────────────────────────────────────
function HubScreen({ plan, onWater, onOpenPlan, wateredPulse, particles = true }) {
  const e = plan.emerald;
  const pct = plan.acumulado / plan.meta;
  const restante = plan.meta - plan.acumulado;
  const semanasFaltan = Math.ceil(restante / plan.aporteSemanal);

  return (
    <div className="screen-scroll" style={{ paddingBottom: 130 }}>
      <Header />

      {/* Hero card */}
      <div className="fade-in" style={{ padding: '12px var(--pad) 0' }}>
        <Glass style={{ padding: '16px var(--card-pad) 18px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Kicker>Tu esmeralda</Kicker>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)' }}>
              <Icon d={ICONS.spark} size={12} sw={1.5} />
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{plan.racha} sem regando</span>
            </div>
          </div>

          <div style={{ margin: '8px 0 2px', position: 'relative' }}>
            <LivingEmerald size={212} pct={pct} tone={e.tone} particles={particles} />
            {/* center % overlay */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span className="serif" style={{ fontSize: 40, fontWeight: 600, lineHeight: 1, color: '#fff', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}>{Math.round(pct * 100)}<span style={{ fontSize: 19 }}>%</span></span>
              <span className="label" style={{ marginTop: 5, color: 'rgba(255,255,255,0.72)' }}>regada</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <div className="serif" style={{ fontSize: 22, fontWeight: 600 }}>{e.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4, letterSpacing: '0.03em' }}>{e.origin} · {e.carat} · {e.color}</div>
          </div>

          <Rule style={{ margin: '15px 0 13px' }} />

          {/* acumulado / meta */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div className="label">Acumulado</div>
              <div className="serif" style={{ fontSize: 27, fontWeight: 600, marginTop: 3 }}>{fmtCOP(plan.acumulado)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label">Meta</div>
              <div className="serif" style={{ fontSize: 16, fontWeight: 500, marginTop: 3, color: 'var(--ink-soft)' }}>{fmtCOP(plan.meta)}</div>
            </div>
          </div>
        </Glass>
      </div>

      {/* Stat row */}
      <div className="fade-in" style={{ padding: 'var(--gap) var(--pad) 0' }}>
        <Glass style={{ display: 'flex', alignItems: 'center', padding: '14px 6px' }}>
          <StatTile value={plan.racha} unit="sem" caption="Racha" />
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--glass-brd)', margin: '4px 0' }} />
          <StatTile value={fmtCOPk(restante)} caption="Restante" />
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--glass-brd)', margin: '4px 0' }} />
          <StatTile value={semanasFaltan} unit="sem" caption="Para reclamar" />
        </Glass>
      </div>

      {/* CTA */}
      <div className="fade-in" style={{ padding: 'var(--gap) var(--pad) 0', position: 'relative' }}>
        <PrimaryButton onClick={onWater} sub={`+ ${fmtCOP(plan.aporteSemanal)} esta semana`}>
          Regar mi esmeralda
        </PrimaryButton>
        {wateredPulse && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: -6, textAlign: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--em-bright)', fontWeight: 600, animation: 'fadeUp .5s ease' }}>+1 gota · ¡racha viva!</span>
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--ink-faint)' }}>
          <Icon d={ICONS.drop} size={12} sw={1.5} stroke="var(--em-bright)" />
          <span style={{ fontSize: 11.5 }}>Próxima gota sugerida · <b style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>miércoles</b></span>
        </div>
      </div>

      {/* Recent log preview */}
      <div className="fade-in" style={{ padding: '18px var(--pad) 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
          <Kicker>Semanas regando</Kicker>
          <button className="tap" onClick={onOpenPlan} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--gold)', fontSize: 12, fontWeight: 600 }}>
            Ver plan <Icon d={ICONS.chevR} size={13} sw={2} />
          </button>
        </div>
        <Glass style={{ padding: '2px var(--card-pad)' }}>
          {plan.log.slice(0, 3).map((row, i) => (
            <div key={row.n} style={{ display: 'flex', alignItems: 'center', padding: '13px 0', borderBottom: i < 2 ? '1px solid var(--glass-brd)' : 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(14,124,90,0.18)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Icon d={ICONS.drop} size={14} stroke="var(--em-bright)" sw={1.6} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Semana {row.n}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{row.label}</div>
              </div>
              <div className="serif" style={{ fontSize: 15, color: 'var(--ink-soft)' }}>{fmtCOP(row.amount)}</div>
            </div>
          ))}
        </Glass>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PLAN DETAIL
// ─────────────────────────────────────────────────────────────
function PlanDetailScreen({ plan, onBack, onWater, particles = true }) {
  const e = plan.emerald;
  const pct = plan.acumulado / plan.meta;
  const restante = plan.meta - plan.acumulado;
  const semanasFaltan = Math.ceil(restante / plan.aporteSemanal);
  const done = pct >= 1;

  const detail = [
    ['Origen', e.origin],
    ['Quilates', e.carat],
    ['Color', e.color],
    ['Talla', 'Esmeralda · pulido espejo'],
    ['Certificado', 'CDTEC Bogotá · incluido'],
    ['Joyero', 'Tierra Mädre · Atelier'],
  ];

  return (
    <div className="screen-scroll" style={{ paddingBottom: 132 }}>
      {/* back header */}
      <div style={{ padding: '56px var(--pad) 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="tap glass" onClick={onBack} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={ICONS.chevL} size={18} sw={2} />
        </button>
        <Kicker>Plan de génesis</Kicker>
        <div style={{ width: 40 }} />
      </div>

      {/* hero gem */}
      <div className="fade-in" style={{ padding: '4px var(--pad) 0', textAlign: 'center' }}>
        <LivingEmerald size={224} pct={pct} tone={e.tone} particles={particles} />
        <div className="serif" style={{ fontSize: 26, fontWeight: 600, marginTop: 8 }}>{e.name}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 5, maxWidth: 280, marginInline: 'auto', lineHeight: 1.55 }}>{e.desc}</div>
      </div>

      {/* funding bar */}
      <div className="fade-in" style={{ padding: '18px var(--pad) 0' }}>
        <Glass style={{ padding: 'var(--card-pad)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 13 }}>
            <div>
              <div className="label">Acumulado</div>
              <div className="serif" style={{ fontSize: 26, fontWeight: 600, marginTop: 3 }}>{fmtCOP(plan.acumulado)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="serif" style={{ fontSize: 19, color: 'var(--gold-bright)', lineHeight: 1 }}>{Math.round(pct * 100)}%</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 5 }}>de {fmtCOP(plan.meta)}</div>
            </div>
          </div>
          {/* linear progress */}
          <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 99, background: 'linear-gradient(90deg, var(--em), var(--em-bright) 60%, var(--gold))', transition: 'width 1.1s cubic-bezier(.2,.8,.3,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 15 }}>
            <div><div className="label">Aporte semanal</div><div className="serif" style={{ fontSize: 16, marginTop: 3 }}>{fmtCOP(plan.aporteSemanal)}</div></div>
            <div style={{ textAlign: 'center' }}><div className="label">Faltan</div><div className="serif" style={{ fontSize: 16, marginTop: 3 }}>{semanasFaltan} sem</div></div>
            <div style={{ textAlign: 'right' }}><div className="label">Reclamo aprox.</div><div className="serif" style={{ fontSize: 16, marginTop: 3 }}>{dateAfterWeeks(semanasFaltan)}</div></div>
          </div>
        </Glass>
      </div>

      {/* claim / water */}
      <div className="fade-in" style={{ padding: 'var(--gap) var(--pad) 0' }}>
        {done ? (
          <PrimaryButton onClick={() => {}}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon d={ICONS.award} size={18} stroke="#fff" /> Reclamar mi esmeralda</span></PrimaryButton>
        ) : (
          <PrimaryButton onClick={onWater} sub={`+ ${fmtCOP(plan.aporteSemanal)}`}>Adelantar una gota</PrimaryButton>
        )}
      </div>

      {/* ficha técnica */}
      <div className="fade-in" style={{ padding: '22px var(--pad) 0' }}>
        <Kicker style={{ marginBottom: 10, paddingLeft: 2 }}>Ficha de la piedra</Kicker>
        <Glass style={{ padding: '2px var(--card-pad)' }}>
          {detail.map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: i < detail.length - 1 ? '1px solid var(--glass-brd)' : 'none' }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink-faint)', letterSpacing: '0.02em' }}>{k}</span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{v}</span>
            </div>
          ))}
        </Glass>
      </div>

      {/* timeline */}
      <div className="fade-in" style={{ padding: '22px var(--pad) 0' }}>
        <Kicker style={{ marginBottom: 14, paddingLeft: 2 }}>Bitácora de riego · {plan.log.length} gotas</Kicker>
        <div style={{ position: 'relative', paddingLeft: 30 }}>
          <div style={{ position: 'absolute', left: 14, top: 6, bottom: 10, width: 1.5, background: 'linear-gradient(180deg, var(--em-bright), var(--hairline), transparent)' }} />
          {plan.log.slice(0, 7).map((row) => (
            <div key={row.n} style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{ position: 'absolute', left: -23, top: 2, width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-1)', border: '1.5px solid var(--em-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold-bright)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>Semana {row.n}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 8 }}>{row.label}</span>
                </div>
                <span className="serif" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>+{fmtCOP(row.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────
function EmptyScreen({ onStart }) {
  const steps = [
    ['Elige', 'Una esmeralda real del atelier', ICONS.seed],
    ['Riega', 'Aportes semanales que la hacen crecer', ICONS.drop],
    ['Reclama', 'La piedra física, certificada', ICONS.award],
  ];
  return (
    <div className="screen-scroll" style={{ paddingBottom: 130, display: 'flex', flexDirection: 'column' }}>
      <Header greeting="Buenas noches" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px var(--pad)', textAlign: 'center' }}>
        <div className="fade-in">
          <LivingEmerald size={206} pct={0} tone="muzo" dormant />
        </div>
        <div className="fade-in" style={{ marginTop: 14 }}>
          <Kicker>Comienza tu génesis</Kicker>
          <div className="serif" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.12, marginTop: 12, maxWidth: 300 }}>
            Toda joya empieza<br /><span style={{ fontStyle: 'italic' }}>como una semilla.</span>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 14, maxWidth: 300 }}>
            Escoge una esmeralda colombiana y riégala con pequeños aportes cada semana. Cuando florezca, será tuya — física y certificada.
          </p>
        </div>

        <div className="fade-in" style={{ display: 'flex', gap: 10, marginTop: 24, width: '100%' }}>
          {steps.map(([t, d, ic], i) => (
            <div key={t} className="glass" style={{ flex: 1, padding: '16px 8px 14px', textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', margin: '0 auto', background: 'rgba(14,124,90,0.16)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={ic} size={17} stroke="var(--em-bright)" sw={1.6} />
              </div>
              <div className="kicker" style={{ marginTop: 11, fontSize: 9.5 }}>{t}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 5, lineHeight: 1.45 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="fade-in" style={{ padding: 'var(--gap) var(--pad) 0' }}>
        <PrimaryButton onClick={onStart}>Elegir mi esmeralda</PrimaryButton>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-faint)', marginTop: 12 }}>Desde {fmtCOP(150000)} por semana · sin permanencia</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CREATION SHEET (bottom sheet)
// ─────────────────────────────────────────────────────────────
const APORTES = [150000, 210000, 300000, 450000];

function CreationSheet({ open, onClose, onConfirm }) {
  const [sel, setSel] = React.useState(0);
  const [aporte, setAporte] = React.useState(210000);
  const e = CATALOG[sel];
  const weeks = Math.ceil(e.meta / aporte);

  return (
    <>
      {/* scrim */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(3,6,5,0.6)',
        backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity .35s ease',
      }} />
      {/* sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 61,
        transform: open ? 'translateY(0)' : 'translateY(102%)',
        transition: 'transform .42s cubic-bezier(.2,.85,.25,1)',
        maxHeight: '92%', display: 'flex', flexDirection: 'column',
        borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden',
        background: 'linear-gradient(180deg, #0c1a15, #07100d 60%)',
        border: '1px solid var(--glass-brd)', borderBottom: 'none',
        boxShadow: '0 -20px 50px rgba(0,0,0,0.5)',
      }}>
        {/* handle + title */}
        <div style={{ padding: '12px var(--pad) 4px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4.5, borderRadius: 99, background: 'var(--ink-ghost)', margin: '0 auto 16px' }} />
          <Kicker>Esmereogénesis · paso 1</Kicker>
          <div className="serif" style={{ fontSize: 25, fontWeight: 600, marginTop: 6 }}>Elige tu esmeralda</div>
        </div>

        <div style={{ overflowY: 'auto', padding: '14px 0 20px' }}>
          {/* catalog carousel */}
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px var(--pad) 16px', scrollbarWidth: 'none' }}>
            {CATALOG.map((c, i) => {
              const on = i === sel;
              return (
                <button key={c.id} className="tap" onClick={() => setSel(i)} style={{
                  flexShrink: 0, width: 132, textAlign: 'center', padding: '16px 12px 14px',
                  borderRadius: 20, background: on ? 'var(--glass-bg-2)' : 'transparent',
                  border: `1px solid ${on ? 'var(--hairline)' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: on ? '0 8px 24px rgba(11,92,70,0.4)' : 'none',
                  transition: 'all .25s',
                }}>
                  <LivingEmerald size={92} pct={0.0001} tone={c.tone} particles={false} />
                  <div className="serif" style={{ fontSize: 14, marginTop: 8, color: on ? 'var(--gold-bright)' : 'var(--ink)' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 3 }}>{c.carat} · {c.color}</div>
                  <div className="serif" style={{ fontSize: 13, marginTop: 6, color: 'var(--ink-soft)' }}>{fmtCOP(c.meta)}</div>
                </button>
              );
            })}
          </div>

          {/* selected desc */}
          <div style={{ padding: '0 var(--pad)' }}>
            <Glass style={{ padding: '14px var(--card-pad)', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <Icon d={ICONS.cert} size={18} stroke="var(--gold)" sw={1.4} />
              <div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{e.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>{e.origin} · Certificado CDTEC incluido</div>
              </div>
            </Glass>
          </div>

          {/* aporte selector */}
          <div style={{ padding: '22px var(--pad) 0' }}>
            <Kicker style={{ marginBottom: 12 }}>Paso 2 · Tu gota semanal</Kicker>
            <div style={{ display: 'flex', gap: 8 }}>
              {APORTES.map((a) => {
                const on = a === aporte;
                return (
                  <button key={a} className="tap" onClick={() => setAporte(a)} style={{
                    flex: 1, padding: '13px 4px', borderRadius: 14, textAlign: 'center',
                    background: on ? 'linear-gradient(180deg, rgba(47,174,134,0.28), rgba(11,92,70,0.2))' : 'var(--glass-bg)',
                    border: `1px solid ${on ? 'var(--hairline)' : 'var(--glass-brd)'}`,
                  }}>
                    <div className="serif" style={{ fontSize: 15, color: on ? 'var(--gold-bright)' : 'var(--ink)' }}>{fmtCOPk(a)}</div>
                    <div className="label" style={{ fontSize: 8, marginTop: 3 }}>/ sem</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* projection */}
          <div style={{ padding: '18px var(--pad) 0' }}>
            <Glass style={{ padding: '15px var(--card-pad)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <Icon d={ICONS.spark} size={18} stroke="var(--em-bright)" sw={1.5} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{weeks} semanas regando</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>Reclamo aprox. {dateAfterWeeks(weeks)}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label">Meta</div>
                <div className="serif" style={{ fontSize: 16, color: 'var(--gold-bright)', marginTop: 3 }}>{fmtCOP(e.meta)}</div>
              </div>
            </Glass>
          </div>

          {/* confirm */}
          <div style={{ padding: '20px var(--pad) 0' }}>
            <PrimaryButton onClick={() => onConfirm(e, aporte)} sub={`Primera gota: ${fmtCOP(aporte)}`}>Sembrar mi esmeralda</PrimaryButton>
            <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 12, lineHeight: 1.5 }}>
              Puedes pausar o adelantar gotas cuando quieras.<br />La piedra se reserva a tu nombre desde hoy.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, {
  Header, TabBar, HubScreen, PlanDetailScreen, EmptyScreen, CreationSheet,
  Icon, ICONS, dateAfterWeeks, APORTES,
});
