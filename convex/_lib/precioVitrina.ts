/**
 * Autoridad de precio: quién decide cuánto se cobra.
 *
 * El precio que ve el cliente NO es `precioCOP`, es `precioCOP × multiplicador`
 * (x1–x4). Ese multiplicador vive en `vitrinas.multiplier` o en
 * `invitations.guestMultiplier` — del lado del servidor, y a propósito: el
 * comentario del esquema dice que se guarda ahí «para que el markup nunca
 * quede expuesto ni editable por el destinatario». En el navegador vive sólo
 * una copia para MOSTRAR, y una copia que el cliente puede editar no puede
 * decidir un cobro.
 *
 * De ahí que aquí nunca entre un multiplicador mandado por la red: entra un
 * ORIGEN (a qué registro pertenece esta compra) y el registro que el llamante
 * ya leyó de la base.
 *
 * Todo es puro; la mutation aporta el IO. Ver tests/precioVitrina.test.ts.
 */

export type OrigenTipo = 'vitrina' | 'invitacion';

export interface Origen {
  tipo: OrigenTipo;
  /**
   * Vitrina → el `:code` de `/v/:code`.
   * Invitación → lo que el invitado guarda bajo `INVITATION_STORAGE_KEYS.TOKEN`,
   * que pese al nombre es el **shortCode** (ver InvitationPage.tsx).
   */
  token: string;
}

/** El slider va de 1 a 4 en pasos de 0,1 (CurrencyContext). */
const MULT_MIN = 1;
const MULT_MAX = 4;

/** Ausencia de markup. NO es «no se pudo resolver»: son cosas distintas. */
export const MULTIPLICADOR_POR_DEFECTO = 1;

export function esMultiplicadorValido(v: unknown): v is number {
  return (
    typeof v === 'number' &&
    Number.isFinite(v) &&
    v >= MULT_MIN &&
    v <= MULT_MAX
  );
}

export type ResolucionMultiplicador =
  | { ok: true; multiplicador: number }
  | { ok: false; razon: 'origen-invalido' };

/**
 * Decide el multiplicador de una compra.
 *
 * La distinción que sostiene todo: **origen AUSENTE y origen INVÁLIDO no son
 * lo mismo**. Sin origen (el riel del bot) se cobra sin markup. Pero un origen
 * que se AFIRMA y no resuelve se rechaza — si cayera a 1, mandar un token
 * inventado sería la forma de comprar al costo, y este archivo existe para
 * impedir exactamente eso.
 *
 * `registro` es lo que el llamante encontró en la base: `null` si no encontró
 * nada.
 */
export function resolverMultiplicador(
  origen: Origen | undefined,
  registro: { multiplicador?: number } | null,
): ResolucionMultiplicador {
  if (!origen) {
    return { ok: true, multiplicador: MULTIPLICADOR_POR_DEFECTO };
  }
  if (!registro) {
    return { ok: false, razon: 'origen-invalido' };
  }
  // Un registro que existe pero no eligió markup vale 1: la ausencia de
  // elección es una elección válida. Un valor presente pero absurdo, no.
  if (registro.multiplicador === undefined) {
    return { ok: true, multiplicador: MULTIPLICADOR_POR_DEFECTO };
  }
  if (!esMultiplicadorValido(registro.multiplicador)) {
    return { ok: false, razon: 'origen-invalido' };
  }
  return { ok: true, multiplicador: registro.multiplicador };
}

/**
 * `false` si este precio base NUNCA puede ser un cobro real: 0, negativo, o
 * NaN/Infinity. Un ítem "Consultar precio" en el catálogo tiene `precioCOP`
 * ausente — el llamante ya lo coacciona a 0 (`product.precioCOP ?? 0`) antes
 * de preguntar esto.
 *
 * Por qué existe SEPARADO del chequeo de `totalCOP <= 0` en `createOrder`:
 * ese mira la SUMA, y un carrito mixto (una pieza con precio + una sin) da
 * una suma > 0 — se cuela. Este chequeo mira cada LÍNEA, así que ninguna
 * pieza sin precio puede viajar gratis escondida detrás de una que sí tiene
 * precio. Los dos chequeos son belt-and-braces, no uno reemplaza al otro:
 * éste es el que de verdad protege un carrito mixto; el de la suma queda
 * como red para cualquier ruta futura que llegue a un total en cero por otro
 * camino.
 */
export function precioBaseEsValido(base: number): boolean {
  return Number.isFinite(base) && base > 0;
}

/** Lo que se cobra por una pieza, en pesos enteros. */
export function precioConMarkup(
  precioCOP: number,
  multiplicador: number,
): number {
  return Math.round(precioCOP * multiplicador);
}
