// dir-luminaria.jsx — Direction 1: LUMINARIA
// Light editorial gallery / auction-house. Ivory grounds, emerald ink,
// gem photographed on white like a catalog lot, large editorial serif, air.

const LUM = {
  paper: '#F4EFE5',
  paper2: '#FCFAF4',
  ink: '#16241E',
  inkSoft: 'rgba(22,36,30,0.58)',
  inkFaint: 'rgba(22,36,30,0.38)',
  em: '#0B5C46',
  emBright: '#0E7C5A',
  gold: '#9C7B33',
  line: 'rgba(22,36,30,0.13)',
  lineSoft: 'rgba(22,36,30,0.08)',
};
const lumPal = { bright: '#5FD0A6', mid: '#149469', deep: '#0a5a42', spark: '#EAFBF3' };

function LumKicker({ children, style }) {
  return <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", textTransform: 'uppercase', letterSpacing: '0.34em', fontSize: 10, fontWeight: 600, color: LUM.gold, whiteSpace: 'nowrap', ...style }}>{children}</div>;
}
function LumMicro({ children, color = LUM.inkFaint, style }) {
  return <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 8.5, fontWeight: 600, color, whiteSpace: 'nowrap', ...style }}>{children}</div>;
}

// Catalog lot plate — gem photographed on white with realistic contact shadow
function LumPlate({ size = 200 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* soft emerald aura on the white */}
      <div style={{ position: 'absolute', width: '78%', height: '78%', borderRadius: '50%', background: `radial-gradient(circle, ${lumPal.mid}1f, transparent 68%)`, filter: 'blur(10px)' }} />
      {/* contact shadow */}
      <div style={{ position: 'absolute', bottom: '11%', width: '52%', height: '13%', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(22,36,30,0.32), transparent 75%)', filter: 'blur(5px)' }} />
      {/* floating gem */}
      <div style={{ transform: 'translateY(-4%)' }}>
        <GemCore size={Math.round(size * 0.62)} pal={lumPal} mode="light" />
      </div>
      {/* a couple of refined gold motes */}
      <span style={{ position: 'absolute', left: '24%', top: '30%', width: 3, height: 3, borderRadius: '50%', background: LUM.gold, opacity: 0.5 }} />
      <span style={{ position: 'absolute', right: '26%', top: '24%', width: 2, height: 2, borderRadius: '50%', background: lumPal.mid, opacity: 0.55 }} />
    </div>
  );
}

function LumTabBar({ active = 'inicio' }) {
  return (
    <div style={{ flexShrink: 0, background: LUM.paper2, borderTop: `1px solid ${LUM.line}`, padding: '11px 16px 30px', display: 'flex' }}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <div key={t.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: on ? LUM.em : LUM.inkFaint }}>
            <Ico d={t.icon} s={20} sw={on ? 1.9 : 1.5} />
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 9, letterSpacing: '0.08em', fontWeight: on ? 700 : 500, textTransform: 'uppercase' }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LuminariaHub() {
  const p = PLAN;
  return (
    <div style={{ width: '100%', height: '100%', background: LUM.paper, color: LUM.ink, fontFamily: "'Hanken Grotesk',sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <StatusBar color={LUM.ink} op={0.85} />

      {/* top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 22px 14px' }}>
        <Ico d={PATHS.chevL} s={22} sw={1.6} stroke={LUM.ink} />
        <div style={{ textAlign: 'center' }}>
          <div className="serif" style={{ fontSize: 17, letterSpacing: '0.02em', color: LUM.ink }}>Tierra Mädre</div>
          <LumMicro style={{ marginTop: 2, letterSpacing: '0.34em' }}>Esmereogénesis</LumMicro>
        </div>
        <Ico d={PATHS.cog} s={20} sw={1.5} stroke={LUM.ink} />
      </div>
      <div style={{ height: 1, background: LUM.line, margin: '0 22px' }} />

      <div style={{ flex: 1, overflow: 'hidden', padding: '20px 26px 6px', display: 'flex', flexDirection: 'column' }}>
        {/* lot header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <LumKicker>Lote N.º {p.lote}</LumKicker>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: LUM.emBright }} />
            <LumMicro color={LUM.em} style={{ letterSpacing: '0.22em' }}>En génesis</LumMicro>
          </div>
        </div>

        {/* the plate */}
        <div style={{ marginTop: 10 }}>
          <LumPlate size={196} />
        </div>

        {/* name + provenance */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <div className="serif" style={{ fontSize: 33, lineHeight: 1.02, color: LUM.ink }}>{p.name}</div>
          <div className="serif" style={{ fontStyle: 'italic', fontSize: 13.5, color: LUM.inkSoft, marginTop: 7 }}>{p.origin} — {p.carat} · {p.color}</div>
        </div>

        <div style={{ height: 1, background: LUM.line, margin: '18px 0 14px' }} />

        {/* progress: editorial figure + slim bar */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <LumMicro>Regada</LumMicro>
            <div className="serif" style={{ fontSize: 46, lineHeight: 0.92, color: LUM.em, marginTop: 4 }}>{Math.round(p.pct * 100)}<span style={{ fontSize: 22 }}>%</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="serif" style={{ fontSize: 19, color: LUM.ink }}>{fmtCOP(p.acumulado)}</div>
            <LumMicro style={{ marginTop: 4 }}>de {fmtCOP(p.meta)}</LumMicro>
          </div>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: LUM.lineSoft, marginTop: 13, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${p.pct * 100}%`, borderRadius: 99, background: `linear-gradient(90deg, ${LUM.em}, ${LUM.emBright})` }} />
        </div>

        {/* racha line */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: LUM.gold }}>
            <Ico d={PATHS.flame} s={15} sw={1.4} fill={LUM.gold} stroke={LUM.gold} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: LUM.ink }}>{p.racha} semanas regando</span>
          </div>
          <LumMicro>Restan {p.semanasRestan} sem</LumMicro>
        </div>
      </div>

      {/* CTA */}
      <div style={{ flexShrink: 0, padding: '8px 26px 16px' }}>
        <button style={{ width: '100%', border: 'none', cursor: 'pointer', borderRadius: 999, padding: '15px', background: LUM.em, boxShadow: `inset 0 0 0 1px ${LUM.gold}55, 0 12px 26px -12px ${LUM.em}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span className="serif" style={{ fontSize: 17, color: LUM.paper2, letterSpacing: '0.01em' }}>Regar mi esmeralda</span>
          <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.03em' }}>Aporte sugerido {fmtCOP(p.aporte)}</span>
        </button>
      </div>

      <LumTabBar active="inicio" />
    </div>
  );
}

function LuminariaPlan() {
  const p = PLAN;
  const log = dirLog(5, p.aporte);
  const detail = [['Origen', p.origin], ['Quilates', p.carat], ['Color', p.color], ['Certificado', p.cert], ['Reclamo aprox.', claimDate(p.semanasRestan)]];
  return (
    <div style={{ width: '100%', height: '100%', background: LUM.paper, color: LUM.ink, fontFamily: "'Hanken Grotesk',sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <StatusBar color={LUM.ink} op={0.85} />
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 22px 14px' }}>
        <Ico d={PATHS.chevL} s={22} sw={1.6} stroke={LUM.ink} />
        <LumMicro style={{ letterSpacing: '0.3em' }}>Lote N.º {p.lote}</LumMicro>
        <Ico d={PATHS.trash} s={19} sw={1.5} stroke={LUM.inkSoft} />
      </div>
      <div style={{ height: 1, background: LUM.line, margin: '0 22px' }} />

      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 26px 4px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 116, height: 116, flexShrink: 0 }}>
            <ProgressArc size={116} pct={p.pct} stroke={2.5} from={LUM.em} to={LUM.gold} track={LUM.lineSoft} />
            <div style={{ position: 'absolute', inset: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GemCore size={72} pal={lumPal} mode="light" />
            </div>
          </div>
          <div>
            <LumKicker>Tu esmeralda</LumKicker>
            <div className="serif" style={{ fontSize: 27, lineHeight: 1.02, marginTop: 5 }}>{p.name}</div>
            <div className="serif" style={{ fontStyle: 'italic', fontSize: 12.5, color: LUM.inkSoft, marginTop: 5 }}>{p.origin}</div>
          </div>
        </div>

        <div style={{ height: 1, background: LUM.line, margin: '18px 0 4px' }} />

        {/* big figure */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '10px 0' }}>
          <div className="serif" style={{ fontSize: 52, lineHeight: 0.9, color: LUM.em }}>{Math.round(p.pct * 100)}<span style={{ fontSize: 24 }}>%</span></div>
          <div style={{ textAlign: 'right' }}>
            <div className="serif" style={{ fontSize: 18 }}>{fmtCOP(p.acumulado)}</div>
            <LumMicro style={{ marginTop: 3 }}>de {fmtCOP(p.meta)}</LumMicro>
          </div>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: LUM.lineSoft, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${p.pct * 100}%`, background: `linear-gradient(90deg, ${LUM.em}, ${LUM.emBright})` }} />
        </div>

        {/* ficha */}
        <div style={{ marginTop: 16 }}>
          {detail.map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < detail.length - 1 ? `1px solid ${LUM.lineSoft}` : 'none' }}>
              <LumMicro>{k}</LumMicro>
              <span className="serif" style={{ fontSize: 13.5, color: LUM.ink, whiteSpace: 'nowrap' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: '8px 26px 16px' }}>
        <button style={{ width: '100%', border: 'none', cursor: 'pointer', borderRadius: 999, padding: '15px', background: LUM.em, boxShadow: `inset 0 0 0 1px ${LUM.gold}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span className="serif" style={{ fontSize: 17, color: LUM.paper2 }}>Regar mi esmeralda</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{p.racha} semanas regando · {fmtCOP(p.aporte)}/sem</span>
        </button>
      </div>
      <LumTabBar active="tesoros" />
    </div>
  );
}

Object.assign(window, { LuminariaHub, LuminariaPlan, LUM });
