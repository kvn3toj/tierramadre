/**
 * De qué registro viene una compra — resuelto una sola vez, desde la sesión.
 *
 * El checkout **nunca manda un precio ni un multiplicador**: manda el origen,
 * y el servidor busca ese registro y aplica su multiplicador
 * (`resolverMultiplicador` en `convex/_lib/precioVitrina.ts`). Este módulo
 * existe porque el cliente ahora puede *navegar* entre superficies antes de
 * pagar: entra por una vitrina a x2,6, agrega piezas al carrito y paga en
 * `/cart`, que es una pantalla que ya no sabe de dónde vino.
 *
 * Sin esto, ese cliente pagaría el precio base y el markup de la vitrina se
 * perdería en cada venta hecha desde el carrito.
 *
 * ## Ausente ≠ inválido
 *
 * No tener origen es legítimo: el visitante anónimo del catálogo público
 * compra al precio base (x1), y la venta guarda `precioBaseCOP` y
 * `multiplicador: 1` para poder auditarla. Pero un origen que se afirma y no
 * resuelve —vitrina borrada, invitación vencida— hace que el servidor
 * **rechace** la orden con `ORIGEN_INVALIDO`. Por eso este módulo nunca
 * "limpia" un token que parezca sospechoso: descartarlo lo convertiría en la
 * forma de comprar al costo, que es exactamente el agujero que el spec de la
 * fase 3 nombra.
 *
 * ## La precedencia, y por qué
 *
 * `invitacion` gana sobre `vitrina`. Una invitación es un vínculo con una
 * persona concreta y su `guestMultiplier`; una vitrina es un link que pudo
 * llegarle reenviado por cualquiera. Si un invitado abre además una vitrina,
 * el precio que le corresponde sigue siendo el de su invitación.
 */
import { INVITATION_STORAGE_KEYS } from '../types/invitation';

export type OrigenTipo = 'vitrina' | 'invitacion';

export interface OrigenGuardado {
  tipo: OrigenTipo;
  token: string;
  /**
   * El multiplicador de la vitrina, **sólo para mostrar**. El servidor lo
   * re-resuelve siempre desde el registro y nunca confía en éste (ver
   * `resolverMultiplicador`), así que si quedara viejo o alguien lo editara,
   * el cliente vería una cifra distinta de la real — jamás lograría que se
   * le cobre menos.
   *
   * Sólo lo lleva el origen de tipo `vitrina`: el de invitación ya viaja por
   * `CurrencyContext`, que lo sincroniza en vivo desde Convex cuando el
   * asesor lo cambia. Duplicarlo acá sería una segunda copia que se
   * desincroniza.
   */
  multiplicador?: number;
}

/**
 * Dónde se guarda el token de vitrina. La invitación NO tiene clave propia
 * acá: se lee de `INVITATION_STORAGE_KEYS.TOKEN`, que ya escribe
 * `InvitationPage`. Duplicarla sería crear una segunda fuente de verdad que
 * puede desincronizarse.
 */
export const ORIGEN_VITRINA_KEY = 'checkout-origen-vitrina';

/** El multiplicador de esa vitrina. Sólo para mostrar — ver `OrigenGuardado`. */
export const ORIGEN_VITRINA_MULT_KEY = 'checkout-origen-vitrina-mult';

/**
 * `sessionStorage` lanza en modo privado de Safari y cuando el navegador
 * bloquea el almacenamiento del sitio. Un fallo acá nunca puede romper el
 * checkout: sin origen se cobra el precio base, que es un resultado válido.
 */
function leerClave(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * El origen vigente, o `undefined` si no hay ninguno.
 *
 * OJO con el nombre de la clave de invitación: se llama `TOKEN` pero lo que
 * guarda es el **shortCode** (`InvitationPage` hace
 * `[INVITATION_STORAGE_KEYS.TOKEN]: resolvedShortCode`). El servidor lo
 * resuelve por el índice `by_shortCode`; resolver "por token" literalmente
 * sería un full-scan, y además `boundToken` se borra a propósito de toda
 * lectura de invitación para que nunca salga del servidor.
 */
export function leerOrigen(): OrigenGuardado | undefined {
  const invitacion = leerClave(INVITATION_STORAGE_KEYS.TOKEN)?.trim();
  if (invitacion) return { tipo: 'invitacion', token: invitacion };

  const vitrina = leerClave(ORIGEN_VITRINA_KEY)?.trim();
  if (vitrina) {
    const crudo = Number(leerClave(ORIGEN_VITRINA_MULT_KEY));
    // Un valor corrupto cae a 1: mostrar el precio base es un error visible y
    // conservador, mientras que propagar un NaN rompería el total entero.
    const multiplicador = Number.isFinite(crudo) && crudo > 0 ? crudo : 1;
    return { tipo: 'vitrina', token: vitrina, multiplicador };
  }

  return undefined;
}

/**
 * Guarda el token de una vitrina.
 *
 * Sólo debe llamarse cuando el `:code` de la URL resolvió a un registro real
 * de `vitrinas` — la misma condición que produce el prop `vitrinaToken` de
 * `PublicProductView`. Una lista de ids sin estado (`/v/324-323-370`) no
 * tiene registro ni markup elegido, así que no deja origen y su carrito
 * cobra el precio base.
 *
 * Un token vacío borra el origen en vez de guardar basura.
 */
export function guardarOrigenVitrina(
  token: string | null | undefined,
  multiplicador?: number,
): void {
  const limpio = token?.trim();
  try {
    if (limpio) {
      sessionStorage.setItem(ORIGEN_VITRINA_KEY, limpio);
      if (Number.isFinite(multiplicador) && (multiplicador as number) > 0) {
        sessionStorage.setItem(
          ORIGEN_VITRINA_MULT_KEY,
          String(multiplicador),
        );
      } else {
        sessionStorage.removeItem(ORIGEN_VITRINA_MULT_KEY);
      }
    } else {
      sessionStorage.removeItem(ORIGEN_VITRINA_KEY);
      sessionStorage.removeItem(ORIGEN_VITRINA_MULT_KEY);
    }
  } catch {
    // Ver `leerClave`: sin almacenamiento se cobra el precio base.
  }
}

/** Borra el origen de vitrina. No toca la invitación, que tiene su propio ciclo de vida. */
export function limpiarOrigen(): void {
  try {
    sessionStorage.removeItem(ORIGEN_VITRINA_KEY);
    sessionStorage.removeItem(ORIGEN_VITRINA_MULT_KEY);
  } catch {
    // Idem.
  }
}
