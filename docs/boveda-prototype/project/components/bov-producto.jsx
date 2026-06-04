// bov-producto.jsx — product-page entry point: emerald detail, Esmereogénesis CTA
// (concept vs price/duration variant + toggle), and the "¿Qué es?" context sheet.
// Depends on globals from bov-living + bov-ui.

const heartPath = <path d="M12 20s-7-4.6-9.2-9C1.3 7.6 3 4.8 6 4.8c1.9 0 3.2 1.1 4 2.3.8-1.2 2.1-2.3 4-2.3 3 0 4.7 2.8 3.2 6.2C19 15.4 12 20 12 20Z" />;
const checkPath = <path d="M4 12.5 9 17.5 20 6.5" />;

// small chip used in the price/duration CTA variant
function CtaPill({ children, gold }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.01em',
      background: gold ? 'var(--accent-bg)' : 'var(--surface-2)', border: `1px solid ${gold ? 'var(--accent-line-strong)' : 'var(--hairline)'}`,
      color: gold ? 'var(--gold-bright)' : 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{children}</span>
  );
}

// the toggle to compare CTA variants
function CtaToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
      <span style={{ fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 600 }}>Variante del CTA</span>
      <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 999, padding: 3, gap: 2 }}>
        {[['concepto', 'Concepto'], ['precio', 'Precio · duración']].map(([v, l]) => {
          const on = value === v;
          return (
            <button key={v} className="tap" onClick={() => onChange(v)} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
              background: on ? 'linear-gradient(180deg, var(--em-bright), var(--em-deep))' : 'transparent',
              color: on ? '#fff' : 'var(--ink-faint)', boxShadow: on ? 'inset 0 0 0 1px var(--accent-line-strong)' : 'none' }}>{l}</button>
          );
        })}
      </div>
    </div>
  );
}

// the special Esmereogénesis CTA card
function EsmereogenesisCTA({ variant, perWeek, months, onOpen }) {
  return (
    <button className="tap" onClick={onOpen} style={{ width: '100%', textAlign: 'left', borderRadius: 22, padding: '15px 16px', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, rgba(14,124,90,0.26), rgba(11,92,70,0.08) 70%)',
      border: '1px solid var(--cta-border)',
      boxShadow: 'var(--cta-glow)',
      display: 'flex', alignItems: 'center', gap: 13 }}>
      {/* sheen */}
      <div className="anim-loop reduced-hide" style={{ position: 'absolute', inset: '-40% -10%', background: 'conic-gradient(from 0deg, transparent 0deg, rgba(248,250,247,0.06) 30deg, transparent 70deg, transparent 360deg)', animation: 'bovSheen 18s linear infinite', pointerEvents: 'none' }} />
      <div style={{ width: 56, height: 56, flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <LivingEmerald size={56} pct={0.5} showRing={false} showBeam={false} />
      </div>
      <div style={{ flex: 1, position: 'relative', zIndex: 1, minWidth: 0 }}>
        <div className="serif" style={{ fontSize: 20, lineHeight: 1.05 }}>
          <span style={{ color: 'var(--gold-bright)' }}>✦</span> Esmereogénesis
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.35 }}>Hazla tuya, ahorrando con propósito</div>
        {variant === 'precio' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
            <CtaPill gold>{fmtCOP(perWeek)} / sem</CtaPill>
            <CtaPill>{months} meses</CtaPill>
            <CtaPill>sin intereses</CtaPill>
          </div>
        )}
      </div>
      <span style={{ position: 'relative', zIndex: 1, color: 'var(--gold)', flexShrink: 0 }}><Ico d={P.chevR} s={18} sw={2} /></span>
    </button>
  );
}

// ── PRODUCT PAGE ──
function ProductoScreen({ ctx }) {
  const { ctaVariant, setCtaVariant, openContext, productBack, go } = ctx;
  const bp = useBp();
  const price = 6300000;
  const months = 6, perWeek = Math.ceil(price / (months * 4) / 1000) * 1000;
  const gem = bp === 'desktop' ? 300 : bp === 'ipad' ? 252 : 216;

  return (
    <div className="scroll" style={{ paddingBottom: bp === 'desktop' ? 28 : 96 }}>
      <StatusBar />
      <TopBar title="Tierra Mädre" sub="Colección Génesis" onBack={productBack} right={bp === 'desktop' ? null : <ThemeToggle theme={ctx.theme} onToggle={ctx.toggleTheme} />} />

      <div className="focus-col">
      {/* hero gem (product, no progress ring) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LivingEmerald size={gem} pct={0.5} showRing={false} onPet={ctx.onPet} />
        <div style={{ textAlign: 'center', marginTop: -26, position: 'relative', zIndex: 3 }}>
          <Kicker style={{ fontSize: 8.5 }}>Esmeralda colombiana</Kicker>
          <div className="serif" style={{ fontSize: 30, marginTop: 7 }}>Gota de Muzo</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 5, letterSpacing: '0.02em' }}>Muzo · Boyacá · 2,1 ct · Verde jardín</div>
        </div>
      </div>

      {/* price */}
      <div style={{ textAlign: 'center', marginTop: 18, position: 'relative', zIndex: 3 }}>
        <div className="serif" style={{ fontSize: 30 }}>{fmtCOP(price)}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 3, letterSpacing: '0.04em' }}>Precio de la pieza · certificado CDTEC incluido</div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, textAlign: 'center', margin: '16px auto 0', maxWidth: 312, position: 'relative', zIndex: 3 }}>
        El verde puro de las minas de Muzo, intenso y aterciopelado. Una pieza viva, tallada para perdurar generaciones.
      </p>

      {/* ── the Esmereogénesis entry point ── */}
      <div style={{ padding: '24px 22px 0', position: 'relative', zIndex: 3 }}>
        <CtaToggle value={ctaVariant} onChange={setCtaVariant} />
        <EsmereogenesisCTA variant={ctaVariant} perWeek={perWeek} months={months} onOpen={openContext} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 11, color: 'var(--ink-faint)' }}>
          <Ico d={P.info} s={13} sw={1.5} />
          <span style={{ fontSize: 11 }}>Toca para conocer cómo funciona</span>
        </div>
      </div>

      {/* standard purchase (secondary) */}
      <div style={{ padding: '16px 22px 0', position: 'relative', zIndex: 3 }}>
        <GhostBtn onClick={() => {}}>Comprar ahora · {fmtCOP(price)}</GhostBtn>
      </div>
      </div>

      <Dock active={ctx.activeTab} onTab={go} />
    </div>
  );
}

// ── "¿Qué es Esmereogénesis?" CONTEXT SHEET ──
function ContextSheet({ open, onClose, onStart }) {
  const swipe = useSwipeDown(onClose);
  const bp = useBp();
  const wide = bp !== 'mobile';
  const noEsDeuda = ['Sin intereses', 'Sin cuotas que te persiguen', 'Sin multas si una semana no puedes regar', 'Tu progreso siempre es tuyo'];
  const steps = [
    [P.seed, 'Elige', 'Elige tu esmeralda'],
    [P.drop, 'Riega', 'Riégala a tu ritmo, sin presión'],
    [P.award, 'Reclama', 'Reclámala cuando florezca'],
  ];
  const panelStyle = wide
    ? { position: 'absolute', left: '50%', top: '50%', zIndex: 101, width: 'min(520px, 88%)', maxHeight: '90%',
        transform: open ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-46%) scale(0.96)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'transform .42s cubic-bezier(.2,.85,.25,1), opacity .3s', display: 'flex', flexDirection: 'column', borderRadius: 28, overflow: 'hidden',
        background: 'var(--sheet-bg)', border: '1px solid var(--line)', boxShadow: '0 40px 110px -30px rgba(0,0,0,0.7)' }
    : { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 101, transform: open ? 'translateY(0)' : 'translateY(103%)', transition: 'transform .46s cubic-bezier(.2,.85,.25,1)',
        maxHeight: '94%', display: 'flex', flexDirection: 'column', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden',
        background: 'var(--sheet-bg)', border: '1px solid var(--line)', borderBottom: 'none', boxShadow: 'var(--sheet-shadow)' };
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'var(--scrim)', backdropFilter: 'blur(3px)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .35s' }} />
      <div style={panelStyle}>

        <CloseX onClose={onClose} />
        <div style={{ padding: '12px 24px 0', flexShrink: 0 }}>
          <div {...swipe} style={{ width: 40, height: 4.5, borderRadius: 99, background: 'var(--ink-faint)', margin: '0 auto 16px', cursor: 'grab', touchAction: 'none' }} />
        </div>

        <div style={{ overflowY: 'auto', padding: '0 24px 26px' }}>
          {/* mini gem + kicker */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
            <LivingEmerald size={84} pct={0.7} showRing={false} showBeam={false} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <Kicker style={{ fontSize: 8.5 }}>¿Qué es Esmereogénesis?</Kicker>
            <div className="serif" style={{ fontSize: 27, lineHeight: 1.1, marginTop: 11 }}>
              No es un crédito.<br /><span style={{ color: 'var(--gold-bright)', fontStyle: 'italic' }}>Es ahorro con propósito.</span>
            </div>
          </div>

          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.62, textAlign: 'center', marginTop: 14 }}>
            Esmereogénesis es una forma consciente de hacer tuya una esmeralda: en vez de pagarla a crédito, la riegas poco a poco con aportes a tu propio ritmo, hasta que cobra vida y la reclamas.
          </p>

          {/* NO ES DEUDA block */}
          <div style={{ marginTop: 20, padding: '16px 18px', borderRadius: 20, background: 'var(--accent-bg-soft)', border: '1px solid var(--accent-line)' }}>
            <div style={{ fontSize: 9.5, letterSpacing: '0.26em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gold-bright)', marginBottom: 12, textAlign: 'center' }}>No es deuda</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {noEsDeuda.map((t) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', background: 'rgba(47,174,134,0.18)', border: '1px solid rgba(47,174,134,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ico d={checkPath} s={12} sw={2.2} stroke="var(--em-bright)" />
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* three steps */}
          <div style={{ marginTop: 22 }}>
            <Kicker style={{ fontSize: 8.5, textAlign: 'center', marginBottom: 14 }}>Así florece</Kicker>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.map(([ic, t, d], i) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--hairline)' }}>
                  <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', background: 'rgba(47,174,134,0.14)', border: '1px solid var(--accent-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ico d={ic} s={18} sw={1.6} stroke="var(--em-bright)" />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>{`0${i + 1}`}</span>
                      <span className="serif" style={{ fontSize: 17 }}>{t}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* closing line */}
          <div className="serif" style={{ fontStyle: 'italic', fontSize: 16, lineHeight: 1.45, textAlign: 'center', color: 'var(--ink)', margin: '24px 6px 0' }}>
            “Una relación, no una transacción — cuidas tu gema hasta que es tuya de verdad.”
          </div>

          <div style={{ marginTop: 22 }}>
            <WaterButton onClick={onStart} label="Comenzar mi Esmereogénesis" />
            <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 11 }}>Sin permanencia · la piedra se reserva a tu nombre desde hoy.</div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ProductoScreen, ContextSheet, EsmereogenesisCTA, CtaToggle });
