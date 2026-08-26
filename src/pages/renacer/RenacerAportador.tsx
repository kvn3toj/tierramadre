/**
 * `/renacer/ayudar` — la entrada del aportador (RRSS y pauta). NO va impresa, así que
 * puede cambiar sin costo (§3.4 · G-A.1).
 *
 * La cuadrícula de los 4 kits y el checkout son los Tasks 11–14 del plan, y arrancan
 * con una compuerta ajena: el canal público de pago responde 403 desde el edge (WAF),
 * y abrirlo es de TM-PAGOS-APP, no de REN-1 (§11.f).
 *
 * Nunca "donación": es una compra. Tierra Mädre no es fundación (21-08).
 */

import { Typography } from '@mui/material';
import RenacerLayout, { useRenacerTokens } from './RenacerLayout';
import { qeFont } from '../../design-system';

export default function RenacerAportador() {
  const t = useRenacerTokens();

  return (
    <RenacerLayout
      titulo="Comprá una, y otra queda en manos de una familia damnificada"
      bajada="Cada kit lleva un código. Ese código viaja con tus manillas, y con él vas a ver a quién le llegaron."
    >
      {/* Tasks 11–14: video, cuadrícula de 4 kits, checkout Wompi, confirmación con el
          código, panel "mis manillas" y muro del aliento. */}
      <Typography sx={{ fontFamily: qeFont.ui, fontSize: 15, color: t.muted }}>
        Estamos terminando de habilitar la compra en línea. Muy pronto acá.
      </Typography>
    </RenacerLayout>
  );
}
