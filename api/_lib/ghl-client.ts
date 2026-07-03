/**
 * GoHighLevel (LeadConnector) API v2 client.
 *
 * Every call carries `Authorization: Bearer <GHL_TOKEN>` (the `pit-…` Private
 * Integration Token) and the mandatory `Version: 2021-07-28` header. The write
 * value key for custom fields is **`field_value`** (the read/webhook shape uses
 * `value` — don't echo a read straight into a write). Tags are added via the
 * dedicated additive endpoint (not PUT, which has set/replace semantics).
 *
 * `fetchImpl` is injectable so the unit tests (tests/ghlClient.test.ts) can
 * assert URL/method/headers/body without a network call.
 */

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export interface GhlConfig {
  token: string;
  locationId: string;
  /** Defaults to global fetch in production; injected in tests. */
  fetchImpl?: FetchLike;
}

/** GHL write shape for a custom field — value goes under `field_value`. */
export interface CustomFieldWrite {
  id?: string;
  key?: string;
  field_value: string | number | string[];
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function impl(cfg: GhlConfig): FetchLike {
  return cfg.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
}

export interface UpsertContactInput {
  phone?: string;
  email?: string;
  name?: string;
  tags?: string[];
  customFields?: CustomFieldWrite[];
  source?: string;
}

/**
 * Create-or-update a contact by phone/email (server-side dedupe per the
 * location's "Allow Duplicate Contact" setting). Returns the contact id.
 */
export async function upsertContact(
  cfg: GhlConfig,
  input: UpsertContactInput,
): Promise<{ contactId: string; isNew?: boolean }> {
  const res = await impl(cfg)(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: headers(cfg.token),
    body: JSON.stringify({ locationId: cfg.locationId, ...input }),
  });
  if (!res.ok) throw new Error(`GHL upsertContact failed: ${res.status}`);
  const data = await res.json();
  return {
    contactId: data?.contact?.id ?? data?.contactId,
    isNew: data?.new,
  };
}

/** Additively add tags to a contact (returns the contact's full tag list). */
export async function addTags(
  cfg: GhlConfig,
  contactId: string,
  tags: string[],
): Promise<void> {
  const res = await impl(cfg)(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: headers(cfg.token),
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error(`GHL addTags failed: ${res.status}`);
}

/** Subscribe a contact to a workflow (the workflow's trigger must allow API adds). */
export async function addToWorkflow(
  cfg: GhlConfig,
  contactId: string,
  workflowId: string,
): Promise<void> {
  const res = await impl(cfg)(
    `${GHL_BASE}/contacts/${contactId}/workflow/${workflowId}`,
    { method: "POST", headers: headers(cfg.token), body: JSON.stringify({}) },
  );
  if (!res.ok) throw new Error(`GHL addToWorkflow failed: ${res.status}`);
}

/** Update a contact's custom fields (and/or core fields) via PUT. */
export async function updateContactFields(
  cfg: GhlConfig,
  contactId: string,
  customFields: CustomFieldWrite[],
): Promise<void> {
  const res = await impl(cfg)(`${GHL_BASE}/contacts/${contactId}`, {
    method: "PUT",
    headers: headers(cfg.token),
    body: JSON.stringify({ customFields }),
  });
  if (!res.ok) throw new Error(`GHL updateContactFields failed: ${res.status}`);
}

// ─── Conversations API (v2) ────────────────────────────────────────────────
//
// Used by the `sin-respuesta-7d` inactivity cron (see convex/ghl.ts +
// convex/_lib/ghlConversations.ts, the copy Convex's Node runtime actually
// bundles — keep this mirror in sync if either changes). GHL's Manage
// Scoring has no native "contact hasn't replied in N days" trigger, so a
// Convex cron scans each GHL-linked contact and tags the stale ones.
//
// FIELD-SHAPE VERIFICATION (confirmed against GHL's public OpenAPI spec,
// github.com/GoHighLevel/highlevel-api-docs, apps/conversations.json,
// `ConversationSchema` + `/conversations/search` parameters — 2 jul 2026):
// the response's `ConversationSchema` does NOT include a `lastMessageDate`
// or `lastMessageDirection` field — the original design's assumption was
// wrong. Both exist ONLY as *query filters*: `lastMessageDirection`
// (enum: inbound|outbound) and a `startDate`/`endDate` pair (documented as
// filtering the `dateAdded` field, Unix ms). `isContactInactive` below
// pushes the whole decision server-side instead of parsing response fields.
//
// ⚠️ ONE ASSUMPTION STILL UNVERIFIED (no live GHL credentials available to
// confirm): whether `dateAdded` for this filter's purposes tracks the
// conversation's last-message activity (what we want) or its original
// creation date. Confirm against one real conversation before deploy.

/**
 * TRUE iff `contactId` has a conversation whose last message is OUTBOUND
 * (from us) and at/before `nowMs - thresholdDays`, per GHL's own server-side
 * filters (see the section doc above for why this replaced a client-side
 * parse-and-compare approach).
 */
export async function isContactInactive(
  cfg: GhlConfig,
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
  if (!res.ok) throw new Error(`GHL isContactInactive failed: ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data?.conversations) ? data.conversations : [];
  return list.length > 0;
}

/** Move an opportunity to a pipeline stage (by stage id). Forward-only policy
 *  is enforced by the caller, not here. */
export async function updateOpportunityStage(
  cfg: GhlConfig,
  opportunityId: string,
  pipelineStageId: string,
): Promise<void> {
  const res = await impl(cfg)(`${GHL_BASE}/opportunities/${opportunityId}`, {
    method: "PUT",
    headers: headers(cfg.token),
    body: JSON.stringify({ pipelineStageId }),
  });
  if (!res.ok)
    throw new Error(`GHL updateOpportunityStage failed: ${res.status}`);
}
