/**
 * Un solo lugar donde se decide el proveedor de pago y se arma el link.
 *
 * Existía duplicado en `ghl-create-order` y habría vuelto a duplicarse en el
 * endpoint público; la revisión de la fase 1 ya marcó ese patrón —dos copias
 * de la misma lógica— como la forma exacta en que se arregla una y se olvida
 * la otra.
 *
 * El link VENCE CON LA RESERVA (`RESERVA_TTL_MS`). Si sobreviviera, alguien
 * podría pagar 40 minutos después una piedra ya soltada —quizá ya vendida a
 * otro— y el resultado sería un reembolso manual sobre plata ya cobrada.
 */

import { buildCheckoutUrl } from './wompi.js';
import { buildPreference, createPreference } from './mp-preference.js';
import { RESERVA_TTL_MS } from '../../convex/_lib/reservas.js';

export type PaymentProviderName = 'mercadopago' | 'wompi';

const CONOCIDOS: PaymentProviderName[] = ['mercadopago', 'wompi'];

/**
 * Sentinels que devuelve `buildPaymentLink` cuando el proveedor simplemente
 * no tiene credenciales cargadas (build-and-mock), a diferencia de una
 * llamada que sí se intentó y falló. Es un contrato con quien llama —p. ej.
 * `ghl-create-order.ts` distingue 200 (no configurado) de 201 (falló a media
 * llamada) comparando contra estas constantes— así que se exportan en vez de
 * dejarlas como strings sueltos: renombrar el string sin tocar ambos lados
 * cambiaría en silencio el código de estado que ve el bot en vivo.
 */
export const WOMPI_NOT_CONFIGURED = 'WOMPI_NOT_CONFIGURED';
export const MP_NOT_CONFIGURED = 'MP_NOT_CONFIGURED';

/**
 * Valida `PAYMENT_PROVIDER`. Un typo cae a `mercadopago` en vez de pasar el
 * string crudo: si el valor inválido llegara a `forma_pago`, se estamparía en
 * Convex y en el espejo de Sheets, y el operador creería que cambió de riel
 * cuando no cambió.
 */
export function resolveProvider(raw: string | undefined): PaymentProviderName {
  const v = (raw ?? 'mercadopago').trim().toLowerCase();
  return (CONOCIDOS as string[]).includes(v)
    ? (v as PaymentProviderName)
    : 'mercadopago';
}

/** Cuándo vence el link: exactamente cuando vence la reserva. */
export function checkoutExpirationISO(now: number): string {
  return new Date(now + RESERVA_TTL_MS).toISOString();
}

export interface LinkInput {
  saleId: string;
  totalCOP: number;
  /** Base sin slash final, p. ej. https://tierramadre.app */
  appUrl: string;
  contact: { celular?: string; full_name?: string; email?: string };
  now: number;
}

/**
 * Devuelve el link de pago, o `{checkoutUrl: null, error}` si el proveedor
 * falló. NUNCA lanza: la venta ya está comprometida en Convex cuando se llama,
 * así que perder el pedido por un fallo del proveedor sería el peor resultado.
 */
export async function buildPaymentLink(
  input: LinkInput,
  provider: PaymentProviderName,
): Promise<{
  checkoutUrl: string | null;
  preferenceId?: string;
  error?: string;
}> {
  const redirectUrl = `${input.appUrl}/pedido-confirmado/${input.saleId}`;
  const expirationTime = checkoutExpirationISO(input.now);

  try {
    if (provider === 'wompi') {
      const publicKey = process.env.WOMPI_PUBLIC_KEY;
      const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
      if (!publicKey || !integritySecret) {
        return { checkoutUrl: null, error: WOMPI_NOT_CONFIGURED };
      }
      return {
        checkoutUrl: buildCheckoutUrl(
          {
            reference: input.saleId,
            amountCOP: input.totalCOP,
            redirectUrl,
            expirationTime,
            customer: {
              email: input.contact.email,
              fullName: input.contact.full_name,
              phoneNumber: input.contact.celular,
            },
          },
          { publicKey, integritySecret },
        ),
      };
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return { checkoutUrl: null, error: MP_NOT_CONFIGURED };
    }
    const pref = buildPreference({
      items: [
        {
          title: `Pedido ${input.saleId} · Tierra Madre`,
          quantity: 1,
          unit_price: input.totalCOP,
        },
      ],
      payer: {
        name: input.contact.full_name,
        email: input.contact.email,
        phone: { number: input.contact.celular },
      },
      orderId: input.saleId,
      notificationUrl: `${input.appUrl}/api/mp-webhook`,
      backUrls: { success: redirectUrl },
      // El mismo vencimiento que ya recibe Wompi — PAYMENT_PROVIDER está sin
      // definir en producción, así que esta es la rama viva; sin esto, la
      // reserva vencería pero el link seguiría cobrando por una piedra que
      // ya se soltó (o ya se vendió a otro).
      expirationTime,
    });
    const created = await createPreference(pref, accessToken);
    return { checkoutUrl: created.init_point, preferenceId: created.id };
  } catch (err) {
    return {
      checkoutUrl: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
