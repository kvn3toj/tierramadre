/**
 * /api/vitrina-select — a client picked a product from a public Vitrina link.
 *
 * PUBLIC (no auth — called directly from an anonymous client's browser, the
 * instant they tap "Consultar por WhatsApp" on a piece). Only fires when the
 * link carries `?cid=<ghlContactId>` (set by convex/ghl.ts `searchProducts`
 * when WF-04's webhook sends `contactId: {{contact.id}}` — see
 * api/ghl-search-products.ts). Links without a cid (e.g. staff's manual
 * "Compartir con cliente" share) simply skip this — unchanged old behavior.
 *
 * WHY THIS EXISTS: previously the ONLY signal that a client picked a piece
 * was a free-text WhatsApp message ("Me interesa esta pieza… {nombre} —
 * {precio}") that María's Conversation AI had to correctly parse and act on
 * — fragile, invisible-on-failure (GHL's execution log says "Success" even
 * when a bot action never actually fires), and entirely dependent on which
 * WhatsApp number the reply happened to land on. This endpoint instead
 * writes the pick straight to the GHL contact record — deterministic,
 * independent of any LLM parsing or phone-number routing.
 *
 * Effect on the GHL contact (per explicit product decision — this triggers
 * the ALREADY-LIVE WF-06 escalation workflow, sending the customer a real
 * WhatsApp and pausing María):
 *   - custom field producto_seleccionado_sku ← sku
 *   - tag `quiere-comprar` (bookkeeping / Manage Scoring)
 *   - tag `pide-humano` (fires WF-06: pauses María, moves the opportunity to
 *     Negociación/Agente, sends the ES-01 hand-off WhatsApp; also feeds
 *     WF-11 routing)
 *
 * Body: { contactId: string, sku: number|string }
 * 200:  { success: true }
 * 400:  invalid/unsigned/forged contactId, or invalid sku
 * 502:  GHL write failed (client-facing WhatsApp CTA still works regardless —
 *       callers should not block on this response)
 *
 * `contactId` must be the HMAC-signed `id.signature` form minted by
 * `ghl.searchProducts` (see convex/_lib/cidSigning.ts) — this endpoint has
 * no other auth, so an unsigned/forged id is rejected outright rather than
 * trusted at face value (see api/_lib/cidSigning.ts).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withApiHandler, sendError, sendSuccess } from './_lib/index.js';
import { convexClient, isConvexEnabled } from './_lib/convex-client.js';
import {
  updateContactFields,
  addTags,
  type GhlConfig,
} from './_lib/ghl-client.js';
import { api } from '../convex/_generated/api.js';
import { verifySignedContactId } from './_lib/cidSigning.js';

// GHL contact ids are alphanumeric, ~20 chars. Loose bounds — just enough to
// reject garbage before we spend a live GHL API call on it.
const CONTACT_ID_RE = /^[a-zA-Z0-9]{10,40}$/;

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    const ghlToken = process.env.GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    if (!ghlToken || !locationId) {
      return sendError(res, 503, 'GHL credentials not configured');
    }

    const body = (req.body ?? {}) as { contactId?: unknown; sku?: unknown };
    const rawCid =
      typeof body.contactId === 'string' ? body.contactId.trim() : '';
    const contactId = rawCid ? verifySignedContactId(rawCid) : null;
    if (!contactId || !CONTACT_ID_RE.test(contactId)) {
      return sendError(res, 400, 'contactId inválido');
    }
    const skuNum = Number(body.sku);
    if (!Number.isFinite(skuNum) || skuNum <= 0) {
      return sendError(res, 400, 'sku inválido');
    }
    const sku = String(Math.trunc(skuNum));

    const cfg: GhlConfig = { token: ghlToken, locationId };
    try {
      await updateContactFields(cfg, contactId, [
        { key: 'producto_seleccionado_sku', field_value: sku },
      ]);
      await addTags(cfg, contactId, ['quiere-comprar', 'pide-humano']);
    } catch (err) {
      console.error('[VitrinaSelect] GHL write failed:', err);
      return sendError(res, 502, 'No se pudo notificar la selección a GHL');
    }

    // Audit trail only — never let a Convex hiccup fail a request that
    // already succeeded against GHL (the source of truth for automation).
    if (isConvexEnabled && convexClient) {
      try {
        await convexClient.mutation(api.ghl.recordVitrinaSelection, {
          ghlContactId: contactId,
          sku,
          secret: process.env.ADMIN_SYNC_TOKEN ?? '',
        });
      } catch (err) {
        console.error('[VitrinaSelect] Convex audit write failed:', err);
      }
    }

    return sendSuccess(res, { success: true });
  },
  {
    methods: ['POST', 'OPTIONS'],
    requireGoogle: false,
    errorPrefix: 'VitrinaSelect',
  },
);
