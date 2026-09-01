/**
 * `/renacer/ayudar` — la entrada de quien quiere ayudar (RRSS y pauta). NO va impresa,
 * así que puede cambiar sin costo (§3.4 · G-A.1).
 *
 * Reunión 31-08: tres caminos, no una cuadrícula de kits. Se muestran primero los dos que
 * funcionan; el símbolo de esperanza va último y dice por qué todavía no (D-0831-1).
 * Nunca "donación": es una compra. Tierra Mädre no es fundación (21-08).
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonSecundario, HuecoDeVideo, OpcionCard, anilloFoco } from './ui';
import { RUTA_SIMBOLO } from './flujo';
import { leerContadores, type Contadores } from './renacerApi';
import { renacerFont } from '../../design-system';

/** Cifras en tinta (el color señala, el texto informa); solo se pintan si hay algo que contar. */
function Contador({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const t = useRenacerTokens();
  return (
    <Box role="group" aria-label={`${valor} ${etiqueta}`} sx={{ flex: 1, minWidth: 96, border: `1px solid ${t.border}`, bgcolor: t.surface, backdropFilter: 'blur(10px)', borderRadius: '16px', p: 1.75 }}>
      <Typography sx={{ fontFamily: renacerFont.display, fontWeight: 800, fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em', color: t.text }}>{valor}</Typography>
      <Typography sx={{ fontFamily: renacerFont.ui, fontSize: 12.5, color: t.subtle, mt: 0.5 }}>{etiqueta}</Typography>
    </Box>
  );
}

export default function RenacerAportador() {
  const navegar = useNavigate();
  const t = useRenacerTokens();
  const [contadores, setContadores] = useState<Contadores | null>(null);

  useEffect(() => {
    let vigente = true;
    leerContadores()
      .then((c) => vigente && setContadores(c))
      .catch(() => {
        /* sin contadores no pasa nada: la página sigue */
      });
    return () => {
      vigente = false;
    };
  }, []);

  const hayNumeros = contadores !== null && (contadores.familias > 0 || contadores.raicesActivas > 0);

  return (
    <RenacerLayout
      marca
      titulo="Comprar es ayudar. Y ofrecer lo que sabés hacer, también."
      bajada="Cada compra en Tierra Mädre aporta a una bolsa común para las familias que perdieron su casa. Hay varias formas de sumarte."
    >
      <HuecoDeVideo nota="Pronto, un video corto sobre el poder de ayudar." />

      {hayNumeros && contadores && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Contador valor={contadores.familias} etiqueta="familias inscritas" />
          <Contador valor={contadores.necesidadesAbiertas} etiqueta="necesidades abiertas" />
          <Contador valor={contadores.raicesActivas} etiqueta="comunidades" />
          {/* "Cuántos días va" (reunión 31-08). Solo cuando el arranque está fijado: sin
              fecha medida no se pinta un número inventado (D-0901-3). */}
          {contadores.diasDeCampana !== null && (
            <Contador valor={contadores.diasDeCampana} etiqueta="días de campaña" />
          )}
        </Box>
      )}
      <Box sx={{ mb: 3 }}>
        {/* El tablero siempre tiene entrada; solo las cifras dependen de que haya algo que contar. */}
        <Box
          component="button"
          type="button"
          onClick={() => navegar('/renacer/tablero')}
          sx={{ fontFamily: renacerFont.display, fontWeight: 600, fontSize: 14.5, color: t.accent, background: 'none', border: 0, px: 1, ml: -1, minHeight: 48, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', borderRadius: 999, textDecoration: 'underline', textUnderlineOffset: 4, ...anilloFoco(t) }}
        >
          Ver cómo va la campaña →
        </Box>
      </Box>

      <OpcionCard
        rol="Ofrecer tiempo"
        titulo="Ofrecer lo que sé hacer"
        bajada="Cocinar, levantar escombros, dar un taller, acompañar. Contanos qué sabés hacer y te escribimos cuando haga falta."
        onClick={() => navegar('/renacer/capacidades')}
      />
      <OpcionCard
        rol="Mirar"
        titulo="Conocer las necesidades"
        bajada="Lo que las familias están pidiendo, agrupado por tipo. Para saber a dónde va lo que aportás."
        onClick={() => navegar('/renacer/tribu')}
      />
      <OpcionCard
        rol="Comprar"
        titulo="Regalar un símbolo de esperanza"
        bajada="Una manilla o un dije que le entregamos en persona a una familia, con una tarjeta con tu nombre si querés."
        deshabilitada={RUTA_SIMBOLO === null}
        nota={RUTA_SIMBOLO === null ? 'Todavía no se puede comprar en línea. Estamos en eso.' : undefined}
        onClick={() => RUTA_SIMBOLO && navegar(RUTA_SIMBOLO)}
      />

      {/* Entrada al muro de gratitud (sesión tierramadre-b1, 01-09): lo que las familias agradecen. */}
      <Box sx={{ mb: 2 }}>
        <Box
          component="button"
          type="button"
          onClick={() => navegar('/renacer/gracias')}
          sx={{ fontFamily: renacerFont.display, fontWeight: 600, fontSize: 14.5, color: t.accent, background: 'none', border: 0, px: 1, ml: -1, minHeight: 48, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', borderRadius: 999, textDecoration: 'underline', textUnderlineOffset: 4, ...anilloFoco(t) }}
        >
          Leer el muro de gratitud →
        </Box>
      </Box>

      <BotonSecundario onClick={() => navegar('/renacer')}>Volver</BotonSecundario>
    </RenacerLayout>
  );
}
