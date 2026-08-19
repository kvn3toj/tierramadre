/**
 * Mercado Pago payment webhook (the spec's Cloudflare `mp-webhook` worker —
 * here a Vercel function so it rides the existing deploy pipeline).
 *
 * Flow (GHL/04-INTEGRACIONES + golden rule #4):
 *   1. Validate the HMAC signature (MP_WEBHOOK_SECRET) → 401 on failure.
 *   2. Ignore non-payment notifications (200).
 *   3. Re-fetch the real payment from MP (never trust the body) → 500 on error
 *      so MP retries.
 *   4. Only `approved` payments with an `external_reference` (our saleId) proceed.
 *   5. Convex `ghl.markOrderPaid` flips the sale idempotently; a replay returns
 *      `updated:false` → no double commission, no duplicate GHL fan-out.
 *   6. GHL fan-out (upsert contact + total, tag `cliente-pago-confirmado`,
 *      post-sale workflow) is best-effort: a failure flags `pendingGhlSync` and
 *      still returns 200 (the sale is committed).
 *
 * The branch table is unit-tested in tests/webhookLogic.test.ts; HMAC in
 * tests/mpSignature.test.ts.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import { validateMpSignature } from './_lib/mp-signature.js';
import { fetchPayment } from './_lib/mp-preference.js';
import {
  upsertContact,
  addTags,
  addToWorkflow,
  updateContactFields,
  type GhlConfig,
} from './_lib/ghl-client.js';
import { api } from '../convex/_generated/api.js';

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    const secret = process.env.MP_WEBHOOK_SECRET;
    const mpToken = process.env.MP_ACCESS_TOKEN;

    const body = (req.body ?? {}) as {
      type?: string;
      data?: { id?: string | number };
    };
    const bodyDataId = body.data?.id ?? null;

    // 1. HMAC signature.
    const valid =
      !!secret &&
      validateMpSignature(
        {
          headers: req.headers as Record<string, string | string[] | undefined>,
          query: req.query as Record<string, string | string[] | undefined>,
          bodyDataId,
        },
        secret,
      );
    if (!valid) return sendError(res, 401, 'Invalid signature');

    // 2. Only payment notifications are actionable.
    const dataId =
      bodyDataId != null
        ? String(bodyDataId)
        : ((req.query['data.id'] as string | undefined) ?? null);
    if (body.type !== 'payment' || !dataId) {
      return sendSuccess(res, { ignored: true, reason: 'not-payment' });
    }
    if (!mpToken) return sendError(res, 500, 'MP_ACCESS_TOKEN not configured');

    // 3. Re-fetch the real payment — never trust the webhook body.
    let payment: Awaited<ReturnType<typeof fetchPayment>>;
    try {
      payment = await fetchPayment(dataId, mpToken);
    } catch (err) {
      console.error('[MpWebhook] fetchPayment failed:', err);
      return sendError(res, 500, 'payment fetch failed'); // MP retries
    }

    // 4. Only approved payments with our saleId proceed.
    if (payment.status !== 'approved') {
      return sendSuccess(res, {
        ignored: true,
        reason: 'not-approved',
        status: payment.status,
      });
    }
    const saleId = payment.externalReference;
    if (!saleId) {
      return sendSuccess(res, {
        ignored: true,
        reason: 'no-external-reference',
      });
    }
    if (!isConvexEnabled || !convexClient) {
      return sendError(res, 503, 'Convex backend not configured');
    }

    // 5. Idempotent mark-paid.
    const result = await convexClient.mutation(api.ghl.markOrderPaid, {
      saleId,
      mpPaymentId: payment.id,
      mpStatus: payment.status,
      secret: process.env.ADMIN_SYNC_TOKEN ?? '',
    });
    if (!result.updated) {
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
            source: 'mp-webhook',
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
        console.error('[MpWebhook] GHL fan-out failed (will retry):', err);
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
    // MP posts the webhook; no preflight/bearer. HMAC is the auth.
    methods: ['POST'],
    requireGoogle: false,
    errorPrefix: 'MpWebhook',
  },
);
