// dir-canvas.jsx — assembles the three bold directions side by side on a canvas.

function Phone({ children, island = 'dark' }) {
  return (
    <div style={{ width: 390, height: 844, borderRadius: 46, overflow: 'hidden', position: 'relative', background: '#05080b', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.4)' }}>
      {children}
      {/* dynamic island */}
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 110, height: 30, borderRadius: 16, background: '#04060a', zIndex: 60, boxShadow: island === 'light' ? '0 0 0 0.5px rgba(0,0,0,0.25)' : 'none' }} />
    </div>
  );
}

function DireccionesCanvas() {
  return (
    <DesignCanvas>
      <DCSection id="luminaria" title="A · Luminaria" subtitle="Galería editorial — marfil, esmeralda como tinta, aire de casa de subastas">
        <DCArtboard id="lum-hub" label="Hub · Tu jardín" width={390} height={844}>
          <Phone island="light"><LuminariaHub /></Phone>
        </DCArtboard>
        <DCArtboard id="lum-plan" label="Plan · Detalle" width={390} height={844}>
          <Phone island="light"><LuminariaPlan /></Phone>
        </DCArtboard>
      </DCSection>

      <DCSection id="minima" title="B · Mínima" subtitle="Swiss luxe — monocromo, una sola esmeralda de acento, retícula precisa, datos">
        <DCArtboard id="min-hub" label="Hub · Tu jardín" width={390} height={844}>
          <Phone island="light"><MinimaHub /></Phone>
        </DCArtboard>
        <DCArtboard id="min-plan" label="Plan · Detalle" width={390} height={844}>
          <Phone island="light"><MinimaPlan /></Phone>
        </DCArtboard>
      </DCSection>

      <DCSection id="boveda" title="C · Bóveda" subtitle="Cinemática — espacio oscuro, luz volumétrica, niebla y partículas, serif dramática">
        <DCArtboard id="bov-hub" label="Hub · Tu jardín" width={390} height={844}>
          <Phone island="dark"><BovedaHub /></Phone>
        </DCArtboard>
        <DCArtboard id="bov-plan" label="Plan · Detalle" width={390} height={844}>
          <Phone island="dark"><BovedaPlan /></Phone>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<DireccionesCanvas />);
