/**
 * Wompi payment webhook — the Wompi twin of api/mp-webhook.ts, step for step.
 *
 * Flow:
 *   1. Validate the event checksum (WOMPI_EVENTS_SECRET) → 401 on failure.
 *   2. Ignore anything that is not `transaction.updated` (200).
 *   3. Re-fetch the real transaction from Wompi (never trust the body) → 500
 *      so Wompi retries (up to 3 times in 24h).
 *   4. Only `APPROVED` transactions with a `reference` (our saleId) proceed.
 *   5. Convex `ghl.markOrderPaid` flips the sale idempotently; a replay
 *      returns `updated:false` → no double commission, no duplicate fan-out.
 *   6. GHL fan-out is best-effort: a failure flags `pendingGhlSync` and still
 *      returns 200 (the sale is committed).
 *
 * Unlike Stripe, Wompi's checksum is computed over named properties plus the
 * timestamp — not over the raw request bytes — so the default JSON body
 * parsing is fine and no raw-body config is needed.
 *
 * The branch table is unit-tested in tests/webhookLogic.test.ts; the checksum
 * in tests/wompiSignature.test.ts.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { validateWompiChecksum } from './_lib/wompi-signature.js';
import { fetchTransaction, WOMPI_APPROVED } from './_lib/wompi.js';
import {
  upsertContact,
  addTags,
  addToWorkflow,
  updateContactFields,
  type GhlConfig,
} from './_lib/ghl-client.js';
import { api } from '../convex/_generated/api.js';

const ACTIONABLE_EVENT = 'transaction.updated';

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    const privateKey = process.env.WOMPI_PRIVATE_KEY;
    const baseUrl = process.env.WOMPI_BASE_URL;

    const body = (req.body ?? {}) as {
      event?: string;
      data?: { transaction?: { id?: string } };
      signature?: { properties?: string[]; checksum?: string };
      timestamp?: number;
    };

    // 1. Checksum. The header copy wins over the in-body one.
    const headerChecksum = Array.isArray(req.headers['x-event-checksum'])
      ? req.headers['x-event-checksum'][0]
      : req.headers['x-event-checksum'];
    const valid =
      !!eventsSecret &&
      validateWompiChecksum(body, eventsSecret, headerChecksum);
    if (!valid) return sendError(res, 401, 'Invalid checksum');

    // 2. Only transaction updates are actionable.
    const transactionId = body.data?.transaction?.id
      ? String(body.data.transaction.id)
      : null;
    if (body.event !== ACTIONABLE_EVENT || !transactionId) {
      return sendSuccess(res, { ignored: true, reason: 'not-transaction' });
    }
    if (!privateKey || !baseUrl) {
      return sendError(res, 500, 'Wompi credentials not configured');
    }

    // 3. Re-fetch the real transaction — never trust the webhook body.
    let transaction: Awaited<ReturnType<typeof fetchTransaction>>;
    try {
      transaction = await fetchTransaction(transactionId, privateKey, baseUrl);
    } catch (err) {
      console.error('[WompiWebhook] fetchTransaction failed:', err);
      return sendError(res, 500, 'transaction fetch failed'); // Wompi retries
    }

    // 4. Only approved transactions carrying our saleId proceed.
    if (transaction.status !== WOMPI_APPROVED) {
      return sendSuccess(res, {
        ignored: true,
        reason: 'not-approved',
        status: transaction.status,
      });
    }
    const saleId = transaction.reference;
    if (!saleId) {
      return sendSuccess(res, { ignored: true, reason: 'no-reference' });
    }
    if (!isConvexEnabled || !convexClient) {
      return sendError(res, 503, 'Convex backend not configured');
    }

    // 5. Idempotent mark-paid. `receivedAmountInCents`/`receivedCurrency` carry what
    // Wompi actually reports charging so the mutation can veto the state
    // transition when it disagrees with the sale's own total — see
    // convex/ghl.ts markOrderPaid and convex/_lib/applyPayment.ts amountsMatch.
    const result = await convexClient.mutation(api.ghl.markOrderPaid, {
      saleId,
      provider: 'wompi',
      paymentId: transaction.id,
      status: transaction.status,
      approved: true,
      receivedAmountInCents: transaction.amountInCents,
      receivedCurrency: transaction.currency,
      secret: process.env.ADMIN_SYNC_TOKEN ?? '',
    });
    if (!result.updated) {
      if (result.reason === 'amount-mismatch') {
        // An approved Wompi transaction that doesn't match what the sale
        // expects must never quietly become a paid commission — do NOT mark
        // the sale paid. 200 so Wompi stops retrying: retrying will not
        // change the amount that was actually charged.
        console.error(
          `[WompiWebhook] amount mismatch for saleId=${saleId} transactionId=${transaction.id}: ` +
            `expected ${result.expectedAmountInCents} cents, received ${result.receivedAmountInCents} cents ` +
            `(currency=${result.receivedCurrency})`,
        );
      }
      if (result.reason === 'sale-not-found') {
        // A real approved payment whose reference matches no sale — silence
        // here would hide it entirely. Retrying will not conjure the sale,
        // so still answer 200, but make this visible in logs.
        console.error(
          `[WompiWebhook] sale-not-found for saleId=${saleId} transactionId=${transaction.id}`,
        );
      }
      return sendSuccess(res, {
        ok: true,
        alreadyProcessed: true,
        reason: result.reason,
      });
    }

    // 6. Best-effort GHL fan-out (sale already committed).
    const ghlToken = process.env.GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    const workflowId = process.env.WF_POSTVENTA_ID;
    if (ghlToken && locationId) {
      try {
        const cfg: GhlConfig = { token: ghlToken, locationId };
        let contactId = result.ghlContactId ?? undefined;
        if (!contactId && (result.clientPhone || result.clientEmail)) {
          const up = await upsertContact(cfg, {
            phone: result.clientPhone ?? undefined,
            email: result.clientEmail ?? undefined,
            name: result.clientName ?? undefined,
            source: 'wompi-webhook',
          });
          contactId = up.contactId;
          if (contactId) {
            await convexClient.mutation(api.ghl.linkGhlContact, {
              clientId: result.clientId,
              ghlContactId: contactId,
              secret: process.env.ADMIN_SYNC_TOKEN ?? '',
            });
          }
        }
        if (contactId) {
          await updateContactFields(cfg, contactId, [
            { key: 'total_comprado_cop', field_value: result.totalCOP },
            {
              key: 'ultima_compra_fecha',
              field_value: new Date().toISOString(),
            },
          ]);
          await addTags(cfg, contactId, ['cliente-pago-confirmado']);
          if (workflowId) await addToWorkflow(cfg, contactId, workflowId);
        }
      } catch (err) {
        console.error('[WompiWebhook] GHL fan-out failed (will retry):', err);
        await convexClient.mutation(api.ghl.flagGhlSyncPending, {
          saleId,
          pending: true,
          secret: process.env.ADMIN_SYNC_TOKEN ?? '',
        });
      }
    }

    return sendSuccess(res, { ok: true, saleId, processed: true });
  },
  {
    // Wompi posts the webhook; no preflight/bearer. The checksum is the auth.
    methods: ['POST'],
    requireGoogle: false,
    errorPrefix: 'WompiWebhook',
  },
);
