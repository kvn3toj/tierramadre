/**
 * GHL Conversations API client for the `sin-respuesta-7d` inactivity cron.
 *
 * WHY A CONVEX-LOCAL COPY of the auth logic? Convex bundles ONLY files under
 * `convex/` for its Node runtime, so the internalAction in `convex/ghl.ts`
 * cannot import from `api/_lib/ghl-client.ts` (a Vercel-only module). This file
 * deliberately MIRRORS the exact same request contract as
 * `api/_lib/ghl-client.ts` — Bearer `GHL_TOKEN` auth, `Version: 2021-07-28`
 * header, injectable `fetchImpl` for tests — so both sides stay in lockstep.
 * The sibling function `isContactInactive` also lives in
 * `api/_lib/ghl-client.ts`; keep the two in sync if either changes.
 *
 * Background: GHL Manage Scoring has no native "contact hasn't replied in N
 * days" trigger category (all categories tested in the GHL UI — see
 * GHL/ESTADO-Y-PROXIMOS-PASOS.md). Design: a daily Convex cron scans each
 * GHL-linked contact; if their last message was OUTBOUND (from us) and older
 * than 7 days with no inbound reply since, tag the contact `sin-respuesta-7d`.
 * A Manage Scoring rule (UI config, already in place) scores "Tag added:
 * sin-respuesta-7d" as −10.
 *
 * FIELD-SHAPE VERIFICATION (confirmed against GHL's public OpenAPI spec,
 * github.com/GoHighLevel/highlevel-api-docs, apps/conversations.json,
 * `ConversationSchema` + `/conversations/search` parameters — 2 jul 2026):
 * the response's `ConversationSchema` does NOT include a `lastMessageDate` or
 * `lastMessageDirection` field — the original design's assumption was WRONG,
 * and the previous client-side parse-and-compare approach would have silently
 * never tagged anyone. Both `lastMessageDirection` (enum: inbound|outbound)
 * and a `startDate`/`endDate` pair (documented as filtering the `dateAdded`
 * field, Unix ms) exist ONLY as *query filters* on `/conversations/search`.
 * `isContactInactive` below pushes the whole decision server-side: a
 * non-empty result for `lastMessageDirection=outbound&endDate=<cutoff>` means
 * "a conversation exists whose last message is outbound and at/before the
 * cutoff" — exactly the tag condition, with zero response-field parsing.
 *
 * ⚠️ ONE ASSUMPTION STILL UNVERIFIED (no live GHL credentials available to
 * confirm): whether `dateAdded` for this filter's purposes tracks the
 * conversation's *last-message* activity (what we want) or its original
 * creation date (which would under-tag any long-running thread). Confirm
 * against one real conversation before this cron is deployed.
 */

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export interface GhlConvConfig {
  token: string;
  locationId: string;
  /** Defaults to global fetch in production; injected in tests. */
  fetchImpl?: FetchLike;
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function impl(cfg: GhlConvConfig): FetchLike {
  return cfg.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
}

/**
 * TRUE iff `contactId` has a conversation whose last message is OUTBOUND
 * (from us) and at/before `nowMs - thresholdDays`, per GHL's own server-side
 * filters (see the module doc for why this replaced a client-side parse).
 */
export async function isContactInactive(
  cfg: GhlConvConfig,
  contactId: string,
  nowMs: number,
  thresholdDays: number,
): Promise<boolean> {
  const cutoffMs = nowMs - thresholdDays * 24 * 60 * 60 * 1000;
  const url =
    `${GHL_BASE}/conversations/search` +
    `?locationId=${encodeURIComponent(cfg.locationId)}` +
    `&contactId=${encodeURIComponent(contactId)}` +
    `&lastMessageDirection=outbound` +
    `&endDate=${cutoffMs}` +
    `&limit=1`;
  const res = await impl(cfg)(url, {
    method: "GET",
    headers: headers(cfg.token),
  });
  if (!res.ok) {
    throw new Error(`GHL isContactInactive failed: ${res.status}`);
  }
  const data = await res.json();
  const list = Array.isArray(data?.conversations) ? data.conversations : [];
  return list.length > 0;
}

/**
 * Additively add tags to a contact via the dedicated POST endpoint (same
 * contract as api/_lib/ghl-client.ts::addTags — NOT PUT, which set/replaces).
 */
export async function addContactTags(
  cfg: GhlConvConfig,
  contactId: string,
  tags: string[],
): Promise<void> {
  const res = await impl(cfg)(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: headers(cfg.token),
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error(`GHL addContactTags failed: ${res.status}`);
}
