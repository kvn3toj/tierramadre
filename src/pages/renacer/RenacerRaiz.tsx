/**
 * `/renacer/r/:codigo?t=<token>` — el panel de la raíz (2026-09-01).
 *
 * Lo primero que pidió la reunión del 31-08 y lo único de ese dibujo que no existía:
 * «Sol me habilita a mí las invitaciones y yo decido a quién le habilito el código.»
 * Hasta hoy, repartir un código dependía de que un operador leyera Convex por la raíz.
 *
 * La pantalla es una sola tarea — **entregar el próximo código** — y todo lo demás es
 * contexto de esa tarea. Por eso el código libre es lo más grande de la página y el
 * botón copia el mensaje entero, listo para pegar en WhatsApp: la raíz está parada en
 * territorio, con una persona enfrente, no sentada mirando una tabla.
 *
 * **Exige el token** (mismo argumento que el carnet, D-1): `:codigo` es dictable y por lo
 * tanto adivinable, y esta pantalla lee. El enlace completo se entrega una sola vez, al
 * emitir el bloque.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonPrincipal, BotonSecundario } from './ui';
import { leerPanelRaiz, type PanelRaiz } from './renacerApi';
import { copy } from './renacerCopy';
import { qeFont, renacerFont } from '../../design-system';

export default function RenacerRaiz() {
  const { codigo = '' } = useParams();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const token = params.get('t') ?? '';
  const t = useRenacerTokens();
  const [panel, setPanel] = useState<PanelRaiz | null | 'cargando'>('cargando');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vigente = true;
    if (!token) {
      setPanel(null);
      return;
    }
    leerPanelRaiz(codigo, token)
      .then((p) => vigente && setPanel(p))
      .catch(() => vigente && setPanel(null));
    return () => {
      vigente = false;
    };
  }, [codigo, token]);

  const copiarInvitacion = useCallback(async () => {
    if (panel === null || panel === 'cargando' || panel.proximoCodigo === null) return;
    const texto = copy.raiz.invitacion(panel.proximoCodigo, window.location.origin);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso de portapapeles (Safari sin gesto, contexto inseguro): el texto
      // igual está a la vista debajo, que es de donde se copia a mano.
    }
  }, [panel]);

  if (panel === 'cargando') {
    return (
      <RenacerLayout titulo="Un momento…">
        <CircularProgress size={24} sx={{ color: t.accent }} />
      </RenacerLayout>
    );
  }

  // Sin token, token equivocado o bloque inexistente: la MISMA pantalla para los tres.
  if (!panel) {
    return (
      <RenacerLayout
        titulo={copy.raiz.sinAcceso}
        bajada={copy.raiz.sinAccesoBajada}
      >
        <BotonSecundario onClick={() => navegar('/renacer')}>Volver al inicio</BotonSecundario>
      </RenacerLayout>
    );
  }

  const agotado = panel.proximoCodigo === null;
  const pausada = panel.estado !== 'activa';

  return (
    <RenacerLayout
      marca
      titulo={copy.raiz.titulo(panel.nombre)}
      bajada={copy.raiz.bajada(panel.comunidad, panel.desde, panel.hasta)}
    >
      {pausada && (
        <Box
          sx={{
            border: `1px solid ${t.border}`,
            bgcolor: t.surface,
            borderRadius: '16px',
            p: 2,
            mb: 2.5,
          }}
        >
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.text, lineHeight: 1.5 }}>
            {copy.raiz.pausada}
          </Typography>
        </Box>
      )}

      {/* La tarea: el próximo código. Lo más grande de la pantalla, a propósito. */}
      <Box
        sx={{
          border: `1px solid ${t.border}`,
          bgcolor: t.surface,
          backdropFilter: 'blur(12px)',
          borderRadius: '24px',
          p: 3,
          mb: 2.5,
          textAlign: 'center',
          boxShadow: t.shadow,
        }}
      >
        <Typography sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle, mb: 0.5 }}>
          {agotado ? 'Cupo del bloque' : 'El próximo código para entregar'}
        </Typography>
        <Typography
          sx={{
            fontFamily: renacerFont.display,
            fontWeight: 800,
            fontSize: agotado ? 34 : 68,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: agotado ? t.muted : t.text,
            mb: 1.5,
          }}
        >
          {agotado ? 'Sin códigos libres' : panel.proximoCodigo}
        </Typography>

        {agotado ? (
          <Typography sx={{ fontFamily: qeFont.ui, fontSize: 14.5, color: t.muted, lineHeight: 1.5 }}>
            {copy.raiz.agotado}
          </Typography>
        ) : (
          <>
            <Typography
              sx={{
                fontFamily: qeFont.ui,
                fontSize: 14,
                color: t.muted,
                lineHeight: 1.55,
                textAlign: 'left',
                border: `1px dashed ${t.hairline}`,
                borderRadius: '14px',
                p: 1.75,
                mb: 2,
                whiteSpace: 'pre-wrap',
              }}
            >
              {copy.raiz.invitacion(panel.proximoCodigo!, window.location.origin)}
            </Typography>
            <BotonPrincipal onClick={copiarInvitacion} disabled={pausada}>
              {copiado ? '¡Copiado!' : 'Copiar la invitación'}
            </BotonPrincipal>
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
        <Recuadro valor={panel.usados} etiqueta="ya se registraron" />
        <Recuadro valor={panel.cupo - panel.usados} etiqueta="códigos libres" />
      </Box>

      <Typography
        sx={{ fontFamily: qeFont.ui, fontSize: 13, color: t.subtle, mb: 1, letterSpacing: '0.04em', textTransform: 'uppercase' }}
      >
        Tu bloque
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
          gap: 0.75,
          mb: 3,
        }}
      >
        {panel.codigos.map((c) => (
          <Box
            key={c.codigo}
            sx={{
              border: `1px solid ${c.usado ? 'transparent' : t.controlBorder}`,
              bgcolor: c.usado ? t.track : 'transparent',
              borderRadius: '12px',
              px: 1,
              py: 0.9,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: renacerFont.mono,
                fontSize: 15,
                letterSpacing: '0.05em',
                color: c.usado ? t.muted : t.accent,
              }}
            >
              {c.codigo}
            </Typography>
            {/* El nombre sale solo con consentimiento (D-0831-5). Sin él: "usado" y nada
                más — que es todo lo que la raíz necesita para no repartirlo dos veces. */}
            <Typography sx={{ fontFamily: qeFont.ui, fontSize: 11, color: t.subtle, mt: 0.15 }}>
              {c.usado ? (c.nombre ?? 'usado') : 'libre'}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <BotonSecundario onClick={() => navegar('/renacer/tablero')}>
          Cómo va la campaña
        </BotonSecundario>
        <BotonSecundario onClick={() => navegar('/renacer/tribu')}>
          Lo que las familias necesitan
        </BotonSecundario>
      </Box>
    </RenacerLayout>
  );
}

function Recuadro({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const t = useRenacerTokens();
  return (
    <Box
      sx={{
        flex: 1,
        border: `1px solid ${t.border}`,
        bgcolor: t.surface,
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        p: 1.75,
      }}
    >
      <Typography
        sx={{ fontFamily: renacerFont.display, fontWeight: 800, fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em', color: t.text }}
      >
        {valor}
      </Typography>
      <Typography sx={{ fontFamily: qeFont.ui, fontSize: 12.5, color: t.subtle, mt: 0.5 }}>
        {etiqueta}
      </Typography>
    </Box>
  );
}
