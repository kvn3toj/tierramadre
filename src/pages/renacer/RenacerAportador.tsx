/**
 * `/renacer/ayudar` — la entrada de quien quiere ayudar (RRSS y pauta). NO va impresa,
 * así que puede cambiar sin costo (§3.4 · G-A.1).
 *
 * Reunión 31-08: tres caminos, no una cuadrícula de kits — regalar un símbolo de
 * esperanza, enlistar mis capacidades, conocer las necesidades. El catálogo entero
 * aporta a la bolsa común; eso vive en la tienda, no acá (D-0831-7).
 *
 * Nunca "donación": es una compra. Tierra Mädre no es fundación (21-08).
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { BotonSecundario, HuecoDeVideo, OpcionCard } from './ui';
import { RUTA_SIMBOLO } from './flujo';
import { leerContadores, type Contadores } from './renacerApi';
import { qeFont } from '../../design-system';

/**
 * Los contadores solo se pintan si llegaron y hay algo que contar: un "0 familias" el
 * primer día no informa, desanima. El recaudo vive en el Convex de TM y entra en Fase 3.
 */
function Contador({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const t = useRenacerTokens();
  return (
    <Box sx={{ flex: 1, minWidth: 96, border: `1px solid ${t.border}`, bgcolor: t.surface, borderRadius: 2, p: 1.5 }}>
      <Typography sx={{ fontFamily: qeFont.serif, fontSize: 28, lineHeight: 1, color: t.text }}>{valor}</Typography>
      <Typography sx={{ fontFamily: qeFont.ui, fontSize: 12.5, color: t.subtle, mt: 0.5 }}>{etiqueta}</Typography>
    </Box>
  );
}

export default function RenacerAportador() {
  const navegar = useNavigate();
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
      titulo="Ayudar es comprar. Y también es ofrecer lo que sabés hacer."
      bajada="Cada compra en Tierra Mädre aporta a una bolsa común para las familias damnificadas. Acá hay tres formas de sumarte."
    >
      <HuecoDeVideo nota="Acá va el video sobre el poder de ayudar." />

      {hayNumeros && contadores && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }} aria-label="Cómo va la campaña">
          <Contador valor={contadores.familias} etiqueta="familias inscritas" />
          <Contador valor={contadores.necesidadesAbiertas} etiqueta="necesidades abiertas" />
          <Contador valor={contadores.raicesActivas} etiqueta="comunidades" />
        </Box>
      )}

      <OpcionCard
        titulo="Regalar un símbolo de esperanza"
        bajada="Una manilla o un dije, a un solo precio, que llega a alguien en presencia. Va con una tarjeta que dice quién lo sembró."
        deshabilitada={RUTA_SIMBOLO === null}
        nota={RUTA_SIMBOLO === null ? 'Estamos terminando de habilitar la compra en línea. Muy pronto acá.' : undefined}
        onClick={() => RUTA_SIMBOLO && navegar(RUTA_SIMBOLO)}
      />
      <OpcionCard
        titulo="Enlistar mis capacidades"
        bajada="Cocinar, levantar escombros, dar un taller, acompañar. Decinos qué sabés hacer y te escribimos cuando haga falta."
        onClick={() => navegar('/renacer/capacidades')}
      />
      <OpcionCard
        titulo="Conocer las necesidades"
        bajada="Lo que las familias están pidiendo, agrupado por tipo. Para saber a dónde va lo que aportás."
        onClick={() => navegar('/renacer/tribu')}
      />

      <BotonSecundario onClick={() => navegar('/renacer')}>Volver</BotonSecundario>
    </RenacerLayout>
  );
}
