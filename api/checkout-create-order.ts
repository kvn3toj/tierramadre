/**
 * Checkout público — el primer endpoint de escritura SIN AUTENTICAR de la app.
 *
 * Modelo de proxy de confianza, el mismo que documenta `api/vitrina.ts`: este
 * endpoint guarda `ADMIN_SYNC_TOKEN` del lado del servidor y llama a la
 * mutation que ya está protegida por `requireServerSecret`. No aparece ninguna
 * superficie de autenticación nueva en Convex — la mutation sigue siendo
 * inalcanzable salvo a través de aquí.
 *
 * Lo que NO trae, a propósito: no lleva techo de 2M (decisión de producto, vía
 * `skip_limit`). Un llamante anónimo puede crear un pedido arbitrariamente
 * grande; no se mueve plata hasta que pague, pero es basura que alguien
 * limpia. El escudo contra avalanchas es Vercel WAF + BotID en el edge, no
 * código.
 *
 * Los precios SIEMPRE se recargan en Convex; nada de lo que manda el cliente
 * toca el monto.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ConvexError } from 'convex/values';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import {
  resolveProvider,
  buildPaymentLink,
  WOMPI_NOT_CONFIGURED,
  MP_NOT_CONFIGURED,
} from './_lib/checkoutLink.js';
import { MAX_ITEMS_POR_PEDIDO } from '../convex/_lib/reservas.js';
import { api } from '../convex/_generated/api.js';

const DEFAULT_APP_URL = 'https://tierramadre.app';

interface CheckoutBody {
  contact?: { celular?: string; full_name?: string; email?: string };
  items?: Array<{ sku?: string; qty?: number }>;
  ambassador_slug?: string | null;
  canal_origen?: string | null;
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!isConvexEnabled || !convexClient) {
      return sendError(res, 503, 'Convex backend not configured');
    }

    const body = (req.body ?? {}) as CheckoutBody;
    if (!body.contact?.celular) {
      return sendError(res, 400, 'Missing contact.celular');
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return sendError(res, 400, 'items must be a non-empty array');
    }

    // Tope antes de tocar Convex: acota el daño de una llamada abusiva sin
    // gastar el ancho de banda que la política de free-tier raciona.
    const unidades = body.items.reduce(
      (n, i) => n + Math.max(1, Math.floor(Number(i.qty ?? 1))),
      0,
    );
    if (unidades > MAX_ITEMS_POR_PEDIDO) {
      return sendError(
        res,
        400,
        `Máximo ${MAX_ITEMS_POR_PEDIDO} piezas por pedido`,
      );
    }

    const provider = resolveProvider(process.env.PAYMENT_PROVIDER);

    let order: { saleId: string; totalCOP: number; reused: boolean };
    try {
      order = await convexClient.mutation(api.ghl.createOrder, {
        contact: {
          celular: body.contact.celular,
          full_name: body.contact.full_name,
          email: body.contact.email,
        },
        items: body.items.map((i) => ({
          sku: String(i.sku ?? ''),
          qty: Number(i.qty ?? 1),
        })),
        ambassador_slug: body.ambassador_slug ?? undefined,
        canal_origen: body.canal_origen ?? 'checkout-web',
        forma_pago: provider,
        skip_limit: true,
        secret: process.env.ADMIN_SYNC_TOKEN ?? '',
      });
    } catch (err) {
      // Convex sanitiza un `Error` normal a "Server Error"; solo `.data` de un
      // ConvexError sobrevive intacto.
      const msg =
        err instanceof ConvexError
          ? typeof err.data === 'string'
            ? err.data
            : String(err.data)
          : err instanceof Error
            ? err.message
            : String(err);

      if (msg.includes('ITEM_RESERVED')) {
        // A diferencia del riel del bot (`ghl-create-order.ts`), este endpoint
        // lo lee un humano en el navegador, así que el cuerpo lleva un mensaje
        // de cara al cliente además del sku.
        const sku = msg.split('ITEM_RESERVED:')[1]?.trim() ?? '';
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(409).json({
          success: false,
          error: 'ITEM_RESERVED',
          sku,
          message: 'Alguien más está pagando esta pieza en este momento.',
        });
      }
      if (msg.includes('PRODUCT_NOT_FOUND') || msg.includes('NOT_AVAILABLE')) {
        return sendError(res, 409, 'PRODUCT_UNAVAILABLE', msg);
      }
      if (msg.includes('EMPTY_ITEMS')) {
        return sendError(res, 400, 'items must be a non-empty array');
      }
      throw err;
    }

    const appUrl = (process.env.APP_URL ?? DEFAULT_APP_URL)
      .trim()
      .replace(/\/$/, '');

    // La venta ya existe en Convex: un fallo del proveedor no puede perderla.
    const link = await buildPaymentLink(
      {
        saleId: order.saleId,
        totalCOP: order.totalCOP,
        appUrl,
        contact: {
          celular: body.contact.celular,
          full_name: body.contact.full_name,
          email: body.contact.email,
        },
        now: Date.now(),
      },
      provider,
    );

    if (link.preferenceId) {
      // Bookkeeping only — persistir el preference id de MP nunca debe costarle
      // al cliente el link de pago que ya tiene. Igual que en
      // `ghl-create-order.ts`: un `ADMIN_SYNC_TOKEN` ausente/no coincidente
      // lanza aquí (`requireServerSecret`), y dejarlo escapar sin capturar
      // convertiría un `init_point` perfectamente bueno en un 500.
      try {
        await convexClient.mutation(api.ghl.setMpPreference, {
          saleId: order.saleId,
          mpPreferenceId: link.preferenceId,
          secret: process.env.ADMIN_SYNC_TOKEN ?? '',
        });
      } catch (err) {
        console.error(
          '[CheckoutCreateOrder] setMpPreference failed (continuing with the link the customer already has):',
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    if (!link.checkoutUrl) {
      // Misma distinción que `ghl-create-order.ts`: credenciales no
      // configuradas (build-and-mock) es un estado distinto de que el
      // proveedor haya fallado a media llamada.
      const notConfigured =
        link.error === WOMPI_NOT_CONFIGURED || link.error === MP_NOT_CONFIGURED;
      if (!notConfigured) {
        console.error(
          `[CheckoutCreateOrder] ${provider} checkout link failed:`,
          link.error,
        );
      }
      return sendSuccess(
        res,
        {
          order_id: order.saleId,
          total_cop: order.totalCOP,
          checkout_url: null,
          pending: true,
          reused: order.reused,
          ...(notConfigured ? {} : { error: link.error }),
        },
        notConfigured ? 200 : 201,
      );
    }

    return sendSuccess(res, {
      order_id: order.saleId,
      total_cop: order.totalCOP,
      checkout_url: link.checkoutUrl,
      reused: order.reused,
    });
  },
  {
    methods: ['POST', 'OPTIONS'],
    requireGoogle: false,
    errorPrefix: 'CheckoutCreateOrder',
  },
);
