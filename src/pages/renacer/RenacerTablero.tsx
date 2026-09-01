/**
 * `/renacer/tablero` — cómo va la campaña, para cualquiera (31-08: "que se vea la data").
 *
 * Todo lo que se muestra es agregado y anónimo: cuántas familias, qué piden agrupado por
 * bolsa, cuánto va cada comunidad de su cupo, qué capacidades se ofrecen. Ningún nombre —
 * esta es la pantalla más pública del flujo. El recaudo no está: vive en el Convex de TM y
 * entra en Fase 3 (D-0831-7).
 *
 * Gráficas sin librería: una sola serie por gráfica, barras finas con la magnitud en texto
 * al lado (nunca solo color), rejilla ausente porque el número está escrito.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonSecundario } from './ui';
import { leerTablero, type Tablero } from './renacerApi';
import { renacerFont } from '../../design-system';

function Cifra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const t = useRenacerTokens();
  return (
    <Box sx={{ flex: '1 1 40%', minWidth: 140, border: `1px solid ${t.border}`, bgcolor: t.surface, backdropFilter: 'blur(10px)', borderRadius: '16px', p: 2 }}>
      <Typography sx={{ fontFamily: renacerFont.display, fontWeight: 800, fontSize: 36, lineHeight: 1, letterSpacing: '-0.03em', color: t.text }}>
        {valor}
      </Typography>
      <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 13, color: t.subtle, mt: 0.75 }}>{etiqueta}</Typography>
    </Box>
  );
}

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  const t = useRenacerTokens();
  return (
    <Box component="section" sx={{ mb: 3.5 }}>
      <Typography component="h2" sx={{ fontFamily: renacerFont.display, fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', color: t.text, mb: 0.25 }}>
        {titulo}
      </Typography>
      {nota && (
        <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 13, color: t.subtle, mb: 1.5 }}>{nota}</Typography>
      )}
      <Box sx={{ border: `1px solid ${t.border}`, bgcolor: t.surface, backdropFilter: 'blur(10px)', borderRadius: '18px', p: 2 }}>
        {children}
      </Box>
    </Box>
  );
}

/** Una barra fina con su magnitud escrita: el color marca, el texto informa. */
function Barra({ etiqueta, valor, max, detalle, tono }: { etiqueta: string; valor: number; max: number; detalle?: string; tono?: 'acento' | 'suave' }) {
  const t = useRenacerTokens();
  const ancho = max > 0 ? Math.max(2, Math.round((valor / max) * 100)) : 0;
  return (
    <Box role="listitem" sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, mb: 0.6 }}>
        <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 14.5, color: t.text }}>{etiqueta}</Typography>
        <Typography sx={{ fontFamily: renacerFont.mono, fontSize: 13, color: t.text, whiteSpace: 'nowrap' }}>
          {valor}
          {detalle && <Box component="span" sx={{ color: t.subtle }}> {detalle}</Box>}
        </Typography>
      </Box>
      <Box aria-hidden sx={{ height: 6, borderRadius: 3, bgcolor: t.surface2, overflow: 'hidden' }}>
        <Box sx={{ width: `${ancho}%`, height: '100%', borderRadius: 3, bgcolor: tono === 'suave' ? t.muted : t.accent, transition: 'width 600ms cubic-bezier(.2,.7,.2,1)' }} />
      </Box>
    </Box>
  );
}

const hace = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 60) return `hace ${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
};

export default function RenacerTablero() {
  const t = useRenacerTokens();
  const navegar = useNavigate();
  const [datos, setDatos] = useState<Tablero | 'cargando' | 'error'>('cargando');

  useEffect(() => {
    let vigente = true;
    leerTablero()
      .then((d) => vigente && setDatos(d))
      .catch(() => vigente && setDatos('error'));
    return () => {
      vigente = false;
    };
  }, []);

  if (datos === 'cargando') {
    return (
      <RenacerLayout titulo="Un momento…">
        <CircularProgress size={24} sx={{ color: t.accent }} />
      </RenacerLayout>
    );
  }
  if (datos === 'error') {
    return (
      <RenacerLayout titulo="No pudimos cargar el tablero" bajada="Puede ser la conexión. Intentá de nuevo en un momento.">
        <BotonSecundario onClick={() => navegar('/renacer/ayudar')}>Volver</BotonSecundario>
      </RenacerLayout>
    );
  }

  const maxBolsa = Math.max(1, ...datos.bolsas.map((b) => b.abiertas));
  const maxCap = Math.max(1, ...datos.capacidades.map((c) => c.total));

  return (
    <RenacerLayout
      marca
      titulo="Cómo va la campaña"
      bajada="Lo que las familias piden, cuánto va cada comunidad y qué manos se han ofrecido. Sin nombres: solo lo que hace falta y lo que ya hay."
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mb: 3.5 }} aria-label="Totales de la campaña">
        <Cifra valor={datos.totales.familias} etiqueta="familias inscritas" />
        <Cifra valor={datos.totales.necesidadesAbiertas} etiqueta="necesidades abiertas" />
        <Cifra valor={datos.totales.raicesActivas} etiqueta="comunidades activas" />
        <Cifra valor={datos.totales.voluntarios} etiqueta="personas que ofrecen ayuda" />
      </Box>

      <Seccion titulo="Qué están pidiendo" nota="Necesidades abiertas por tipo. El número es lo que cuenta; la barra solo lo hace visible.">
        {datos.bolsas.length === 0 ? (
          <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 14, color: t.subtle }}>Todavía no hay necesidades registradas.</Typography>
        ) : (
          <Box role="list">
            {datos.bolsas.map((b) => (
              <Barra key={b.nombre} etiqueta={b.nombre} valor={b.abiertas} max={maxBolsa} detalle={b.apoyos > 0 ? `· ${b.apoyos} se sumaron` : undefined} />
            ))}
          </Box>
        )}
      </Seccion>

      <Seccion titulo="Comunidades" nota="Familias registradas sobre el cupo que cada comunidad tiene para invitar.">
        {datos.comunidades.length === 0 ? (
          <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 14, color: t.subtle }}>Aún no hay comunidades activas.</Typography>
        ) : (
          <Box role="list">
            {datos.comunidades.map((c) => (
              <Barra key={c.comunidad} etiqueta={c.zona ? `${c.comunidad} · ${c.zona}` : c.comunidad} valor={c.registrados} max={c.cupo} detalle={`/ ${c.cupo}`} tono={c.activa ? 'acento' : 'suave'} />
            ))}
          </Box>
        )}
      </Seccion>

      <Seccion titulo="Manos que se ofrecen" nota="Las capacidades más enlistadas, de voluntarios y de las mismas familias.">
        {datos.capacidades.length === 0 ? (
          <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 14, color: t.subtle }}>Nadie ha enlistado capacidades todavía.</Typography>
        ) : (
          <Box role="list">
            {datos.capacidades.map((c) => (
              <Barra key={c.titulo} etiqueta={c.titulo} valor={c.total} max={maxCap} detalle={c.voluntarios > 0 && c.beneficiarios > 0 ? `· ${c.voluntarios} vol. · ${c.beneficiarios} fam.` : undefined} />
            ))}
          </Box>
        )}
      </Seccion>

      <Seccion titulo="Últimos pedidos" nota="Tal como los escribieron, sin decir quién.">
        {datos.ultimos.map((u, i) => (
          <Box key={i} sx={{ py: 1.25, borderTop: i === 0 ? 'none' : `1px solid ${t.hairline}` }}>
            <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 15, color: t.text }}>{u.whatINeed}</Typography>
            <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 12.5, color: t.subtle, mt: 0.25 }}>
              {u.categoria ?? 'Sin tipo'} · {hace(u.createdAt)}
              {u.supportCount > 0 && ` · ${u.supportCount} se sumaron`}
            </Typography>
          </Box>
        ))}
      </Seccion>

      <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 12.5, color: t.subtle, mb: 2.5 }}>
        Actualizado {hace(datos.updatedAt)}. El recaudo de la bolsa común se suma cuando la tienda entre en campaña.
      </Typography>

      <BotonSecundario onClick={() => navegar('/renacer/ayudar')}>Volver</BotonSecundario>
    </RenacerLayout>
  );
}
