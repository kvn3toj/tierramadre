// dir-minima.jsx — Direction 2: MÍNIMA
// Ultra-minimal Swiss luxe. Bone ground, charcoal ink, ONE emerald accent.
// Sharp corners, hairlines, tight grid, generous air, small precise type,
// big light-weight grotesk numerals, gem small & jewel-like. No decoration.

const MIN = {
  paper: '#EFEDE7',
  ink: '#1A1C1A',
  inkSoft: 'rgba(26,28,26,0.56)',
  inkFaint: 'rgba(26,28,26,0.34)',
  em: '#0E7C5A',
  line: 'rgba(26,28,26,0.14)',
  lineSoft: 'rgba(26,28,26,0.09)',
};
const minPal = { bright: '#4FC79C', mid: '#0E7C5A', deep: '#0a4a37', spark: '#E6F7EF' };
const MONO = "'Hanken Grotesk', sans-serif";

function MinLabel({ children, color = MIN.inkFaint, style }) {
  return <div style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.24em', fontSize: 9, fontWeight: 600, color, whiteSpace: 'nowrap', ...style }}>{children}</div>;
}

function MinTabBar({ active = 'inicio' }) {
  return (
    <div style={{ flexShrink: 0, borderTop: `1px solid ${MIN.line}`, padding: '14px 26px 32px', display: 'flex', justifyContent: 'space-between' }}>
      {TABS.map((t) => {
        const on = t.key === active;
        return <span key={t.key} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: on ? 700 : 500, color: on ? MIN.em : MIN.inkFaint }}>{t.label}</span>;
      })}
    </div>
  );
}

// precise data row
function MinRow({ k, v, accent, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '13px 0', borderBottom: last ? 'none' : `1px solid ${MIN.lineSoft}` }}>
      <MinLabel>{k}</MinLabel>
      <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 500, color: accent ? MIN.em : MIN.ink, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{v}</span>
    </div>
  );
}

function MinimaHub() {
  const p = PLAN;
  return (
    <div style={{ width: '100%', height: '100%', background: MIN.paper, color: MIN.ink, fontFamily: MONO, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <StatusBar color={MIN.ink} op={0.8} />

      {/* masthead */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 26px 0' }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.26em', fontWeight: 700, textTransform: 'uppercase' }}>Tierra Mädre</span>
        <MinLabel style={{ letterSpacing: '0.26em' }}>Esmereogénesis</MinLabel>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 26px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* hero metric block */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 6 }}>
          <div>
            <MinLabel>En génesis</MinLabel>
            <div style={{ fontFamily: MONO, fontWeight: 300, fontSize: 92, lineHeight: 0.86, letterSpacing: '-0.03em', marginTop: 12, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(p.pct * 100)}<span style={{ fontSize: 30, fontWeight: 400, color: MIN.inkSoft }}>%</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 13, color: MIN.inkSoft, marginTop: 10, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums' }}>
              {fmtCOP(p.acumulado)} <span style={{ color: MIN.inkFaint }}>/ {fmtCOP(p.meta)}</span>
            </div>
          </div>
          {/* jewel-small gem */}
          <div style={{ paddingTop: 6 }}>
            <GemCore size={66} pal={minPal} mode="light" shimmer={false} />
          </div>
        </div>

        {/* precise progress line */}
        <div style={{ marginTop: 26 }}>
          <div style={{ height: 1, background: MIN.line, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: -1, height: 3, width: `${p.pct * 100}%`, background: MIN.em }} />
            <div style={{ position: 'absolute', left: `${p.pct * 100}%`, top: -4, width: 1, height: 9, background: MIN.em }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}>
            <MinLabel>0</MinLabel>
            <MinLabel color={MIN.em}>Restan {p.semanasRestan} semanas</MinLabel>
          </div>
        </div>

        {/* data list */}
        <div style={{ marginTop: 22 }}>
          <MinRow k="Esmeralda" v={p.name} />
          <MinRow k="Origen" v={p.origin} />
          <MinRow k="Aporte semanal" v={fmtCOP(p.aporte)} />
          <MinRow k="Racha" v={`${p.racha} semanas`} accent last />
        </div>
      </div>

      {/* CTA — sharp emerald block */}
      <div style={{ flexShrink: 0, padding: '0 26px 18px' }}>
        <button style={{ width: '100%', border: 'none', cursor: 'pointer', borderRadius: 2, padding: '16px', background: MIN.em, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, color: MIN.paper, whiteSpace: 'nowrap' }}>Regar esmeralda</span>
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.72)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtCOP(p.aporte)}</span>
        </button>
      </div>

      <MinTabBar active="inicio" />
    </div>
  );
}

function MinimaPlan() {
  const p = PLAN;
  const log = dirLog(4, p.aporte);
  return (
    <div style={{ width: '100%', height: '100%', background: MIN.paper, color: MIN.ink, fontFamily: MONO, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <StatusBar color={MIN.ink} op={0.8} />
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 26px 0' }}>
        <Ico d={PATHS.chevL} s={20} sw={1.6} stroke={MIN.ink} />
        <MinLabel style={{ letterSpacing: '0.26em' }}>Jardín · Lote {p.lote}</MinLabel>
        <Ico d={PATHS.trash} s={17} sw={1.5} stroke={MIN.inkFaint} />
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '24px 26px 0' }}>
        <MinLabel>Tu esmeralda</MinLabel>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div style={{ fontFamily: MONO, fontWeight: 300, fontSize: 30, letterSpacing: '-0.01em', lineHeight: 1 }}>{p.name}</div>
          <GemCore size={58} pal={minPal} mode="light" shimmer={false} />
        </div>

        {/* giant figure */}
        <div style={{ marginTop: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: MONO, fontWeight: 300, fontSize: 78, lineHeight: 0.86, letterSpacing: '-0.03em', color: MIN.em, fontVariantNumeric: 'tabular-nums' }}>{Math.round(p.pct * 100)}<span style={{ fontSize: 26, color: MIN.inkSoft }}>%</span></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: MONO, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{fmtCOP(p.acumulado)}</div>
            <MinLabel style={{ marginTop: 4 }}>de {fmtCOP(p.meta)}</MinLabel>
          </div>
        </div>
        <div style={{ height: 1, background: MIN.line, marginTop: 16, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: -1, height: 3, width: `${p.pct * 100}%`, background: MIN.em }} />
        </div>

        <div style={{ marginTop: 22 }}>
          <MinRow k="Ritmo sugerido" v={`${fmtCOP(p.aporte)} / sem`} />
          <MinRow k="Reclamo aprox." v={claimDate(p.semanasRestan)} />
          <MinRow k="Certificado" v={p.cert} />
        </div>

        {/* aportes */}
        <MinLabel style={{ marginTop: 22 }}>Aportes · {p.racha}</MinLabel>
        <div style={{ marginTop: 8 }}>
          {log.slice(0, 3).map((r, i) => (
            <div key={r.n} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? `1px solid ${MIN.lineSoft}` : 'none' }}>
              <span style={{ fontFamily: MONO, fontSize: 13, color: MIN.inkSoft }}>Semana {r.n} <span style={{ color: MIN.inkFaint, fontSize: 11 }}>· {r.label}</span></span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: MIN.em, fontVariantNumeric: 'tabular-nums' }}>+{fmtCOP(r.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: '8px 26px 18px' }}>
        <button style={{ width: '100%', border: 'none', cursor: 'pointer', borderRadius: 2, padding: '16px', background: MIN.em, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, color: MIN.paper, whiteSpace: 'nowrap' }}>Regar esmeralda</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(255,255,255,0.72)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtCOP(p.aporte)}</span>
        </button>
      </div>
      <MinTabBar active="tesoros" />
    </div>
  );
}

Object.assign(window, { MinimaHub, MinimaPlan, MIN });
