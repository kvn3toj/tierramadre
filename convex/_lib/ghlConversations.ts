/**
 * GHL Conversations API client for the `sin-respuesta-7d` inactivity cron.
 *
 * WHY A CONVEX-LOCAL COPY of the auth logic? Convex bundles ONLY files under
 * `convex/` for its Node runtime, so the internalAction in `convex/ghl.ts`
 * cannot import from `api/_lib/ghl-client.ts` (a Vercel-only module). This file
 * deliberately MIRRORS the exact same request contract as
 * `api/_lib/ghl-client.ts` — Bearer `GHL_TOKEN` auth, `Version: 2021-07-28`
 * header, injectable `fetchImpl` for tests — so both sides stay in lockstep.
 * The sibling functions `getLatestConversation` / `isInactiveConversation` also
 * live in `api/_lib/ghl-client.ts`; keep the two in sync if either changes.
 *
 * Background: GHL Manage Scoring has no native "contact hasn't replied in N
 * days" trigger category (all categories tested in the GHL UI — see
 * GHL/ESTADO-Y-PROXIMOS-PASOS.md). Design: a daily Convex cron scans each
 * contact's most-recent conversation; if the last message was OUTBOUND (from
 * us) and older than 7 days with no inbound reply since, tag the contact
 * `sin-respuesta-7d`. A Manage Scoring rule (UI config, already in place)
 * scores "Tag added: sin-respuesta-7d" as −10.
 *
 * ⚠️ FIELD-NAME ASSUMPTIONS (NOT yet verified against live GHL data):
 * `GET /conversations/search?locationId=..&contactId=..` is assumed to return
 * `{ conversations: [{ id, lastMessageDate, lastMessageDirection, ... }] }`.
 *   - `lastMessageDate` — epoch-ms number on most tenants; some return an ISO
 *     string. `parseLastMessageMs` tolerates both.
 *   - `lastMessageDirection` — "inbound" (from the contact) | "outbound"
 *     (from us). Compared case-insensitively.
 * Verify these names against a real response before the cron is published.
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

/** Raw conversation summary as returned by /conversations/search. */
export interface GhlConversationSummary {
  id?: string;
  /** Epoch-ms number OR ISO-8601 string, depending on tenant. */
  lastMessageDate?: number | string;
  /** "inbound" = from the contact; "outbound" = from us. */
  lastMessageDirection?: string;
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
 * Fetch the most-recent conversation summary for a contact, or `null` when the
 * contact has no conversation history.
 */
export async function getLatestConversation(
  cfg: GhlConvConfig,
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
  if (!res.ok) {
    throw new Error(`GHL getLatestConversation failed: ${res.status}`);
  }
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

/**
 * Pure decision: should this conversation earn the `sin-respuesta-7d` tag?
 *
 * TRUE iff the last message was OUTBOUND (from us) AND older than
 * `thresholdDays`. An inbound last message means the contact already replied
 * (never tag); a `null` summary (no conversation) is treated as "not inactive"
 * (the cron skips those before this is even called).
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
