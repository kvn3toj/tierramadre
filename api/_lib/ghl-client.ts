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
// convex/_lib/ghlConversations.ts). GHL's Manage Scoring has no native
// "contact hasn't replied in N days" trigger, so a Convex cron scans each
// contact's most-recent conversation here and tags the stale ones.
//
// ⚠️ FIELD-NAME ASSUMPTIONS (not yet verified against live GHL data):
// `GET /conversations/search?locationId=..&contactId=..` returns
// `{ conversations: [{ id, lastMessageDate, lastMessageDirection, ... }] }`.
// Per the documented v2 shape, `lastMessageDate` is an epoch-ms number (some
// tenants return an ISO string) and `lastMessageDirection` is "inbound"
// (from the contact) | "outbound" (from us). `parseLastMessageMs` and
// `isInactiveConversation` below tolerate both date encodings. Verify these
// names against a real response before publishing the cron.

/** Raw conversation summary as returned by /conversations/search. */
export interface GhlConversationSummary {
  id?: string;
  /** Epoch-ms number OR ISO-8601 string, depending on tenant. */
  lastMessageDate?: number | string;
  /** "inbound" = from the contact; "outbound" = from us. */
  lastMessageDirection?: string;
}

/**
 * Fetch the most-recent conversation summary for a contact (or `null` when the
 * contact has no conversation history). Reuses the same Bearer + Version auth
 * as every other call in this file.
 */
export async function getLatestConversation(
  cfg: GhlConfig,
  contactId: string,
): Promise<GhlConversationSummary | null> {
  const url =
    `${GHL_BASE}/conversations/search` +
    `?locationId=${encodeURIComponent(cfg.locationId)}` +
    `&contactId=${encodeURIComponent(contactId)}`;
  const res = await impl(cfg)(url, {
    method: "GET",
    headers: headers(cfg.token),
  });
  if (!res.ok) throw new Error(`GHL getLatestConversation failed: ${res.status}`);
  const data = await res.json();
  const list: GhlConversationSummary[] = Array.isArray(data?.conversations)
    ? data.conversations
    : [];
  if (!list.length) return null;
  // The search endpoint returns most-recent first; pick the freshest defensively.
  return list.reduce((newest, c) =>
    parseLastMessageMs(c) > parseLastMessageMs(newest) ? c : newest,
  );
}

/** Normalise `lastMessageDate` (epoch-ms number OR ISO string) to epoch-ms. */
export function parseLastMessageMs(c: GhlConversationSummary): number {
  const d = c.lastMessageDate;
  if (typeof d === "number") return Number.isFinite(d) ? d : 0;
  if (typeof d === "string") {
    const t = Date.parse(d);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

/**
 * Pure decision: should this conversation earn the `sin-respuesta-7d` tag?
 *
 * TRUE iff the last message was OUTBOUND (from us) AND older than
 * `thresholdDays`. An inbound last message means the contact already replied
 * (never tag); a `null` summary (no conversation) is caller-skipped, but is
 * treated as "not inactive" here for safety.
 */
export function isInactiveConversation(
  summary: GhlConversationSummary | null,
  nowMs: number,
  thresholdDays: number,
): boolean {
  if (!summary) return false;
  const dir = (summary.lastMessageDirection ?? "").toLowerCase();
  if (dir !== "outbound") return false;
  const lastMs = parseLastMessageMs(summary);
  if (!lastMs) return false; // unknown date → don't tag (avoid false positives)
  const ageMs = nowMs - lastMs;
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}
