/**
 * Las guardas de acceso del backend de Renacer.
 *
 * **El malentendido que estas guardas corrigen:** en Convex, `mutation` y `query` son
 * API **pública** — cualquiera que conozca la URL del deployment las invoca directo,
 * sin pasar jamás por `api/renacer-*`. Un proxy de confianza no es una puerta si lo
 * que hay detrás también atiende por la ventana. Sin esto, `kits.emitir` dejaba a
 * cualquiera quemar la secuencia de códigos impresos, y `muro.ocultar` dejaba a
 * cualquiera censurar el muro de desahogo.
 *
 * El patrón es el que la casa ya usa: `api/checkout-create-order.ts` guarda
 * `ADMIN_SYNC_TOKEN` del lado del servidor y la mutation lo exige (spec §5.1).
 *
 * **Dos secretos, no uno**, para que comprometer el de la app no alcance para acuñar
 * códigos:
 *
 *  - `RENACER_APP_TOKEN` — lo llevan los endpoints públicos (`api/renacer-*`). Habilita
 *    lo que un visitante puede hacer: resolver un código, registrarse, ver el mapa,
 *    sumarse, escribir en el muro.
 *  - `RENACER_OPS_TOKEN` — lo llevan SOLO el riel de pago y el CLI de operador. Habilita
 *    emitir códigos, cambiar el estado de un kit y ocultar un mensaje.
 *
 * Se configuran con `npx convex env set` en el deployment de Renacer, nunca en el repo.
 */

/**
 * Comparación en tiempo constante. Con `===`, el tiempo de respuesta filtra cuántos
 * caracteres del prefijo acertó quien tantea.
 */
function igualEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function exigir(recibido: string, nombreVariable: string): void {
  const esperado = process.env[nombreVariable];

  // Fail-closed y explícito. Si la variable no está configurada, NO se compara
  // `undefined` con `undefined` —que dejaría todo abierto justo cuando falta la
  // config—: se rompe, ruidosamente.
  if (!esperado) {
    throw new Error(
      `${nombreVariable} no está configurada en este deployment. ` +
        `Configurala con \`npx convex env set ${nombreVariable} …\` antes de servir tráfico.`,
    );
  }

  if (!igualEnTiempoConstante(recibido, esperado)) {
    throw new Error('No autorizado.');
  }
}

/** Lo que puede hacer un visitante, a través de los endpoints públicos. */
export function exigirTokenDeApp(secret: string): void {
  exigir(secret, 'RENACER_APP_TOKEN');
}

/** Lo que solo pueden hacer el riel de pago y el operador. */
export function exigirTokenDeOps(secret: string): void {
  exigir(secret, 'RENACER_OPS_TOKEN');
}

/**
 * Resuelve quién actúa a partir de la credencial del carnet.
 *
 * **Por qué no se recibe el `beneficiaryId` y ya:** un id que viaja en el body es una
 * afirmación del cliente, no una identidad. Cualquiera podría sumarse a una necesidad
 * o escribir en el muro en nombre de otro. El par `cardNumber + cardToken` es una
 * credencial de capacidad: el token se entrega una sola vez, al completar el registro,
 * y funciona igual para el camino con Google y para el registro asistido en campo —
 * que es justo el que no tiene sesión (D-2 del plan).
 */
export async function resolverBeneficiario(
  ctx: { db: any },
  cardNumber: number,
  cardToken: string,
) {
  const persona = await ctx.db
    .query('beneficiaries')
    .withIndex('by_cardNumber', (q: any) => q.eq('cardNumber', cardNumber))
    .unique();

  // Misma respuesta para "no existe" y "token equivocado": distinguirlas le confirmaría
  // a quien tantea qué números de carnet están tomados.
  if (!persona || !igualEnTiempoConstante(persona.cardToken, cardToken)) {
    throw new Error('No autorizado.');
  }

  return persona;
}
