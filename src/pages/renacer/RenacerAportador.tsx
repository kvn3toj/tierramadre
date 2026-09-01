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

import { useNavigate } from 'react-router-dom';
import RenacerLayout from './RenacerLayout';
import { BotonSecundario, HuecoDeVideo, OpcionCard } from './ui';
import { RUTA_SIMBOLO } from './flujo';

export default function RenacerAportador() {
  const navegar = useNavigate();

  return (
    <RenacerLayout
      titulo="Ayudar es comprar. Y también es ofrecer lo que sabés hacer."
      bajada="Cada compra en Tierra Mädre aporta a una bolsa común para las familias damnificadas. Acá hay tres formas de sumarte."
    >
      <HuecoDeVideo nota="Acá va el video sobre el poder de ayudar." />

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
