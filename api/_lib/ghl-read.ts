// api/_lib/ghl-read.ts
//
// Read-ONLY GHL LeadConnector v2 helpers. Deliberately self-contained (mirrors
// the api/_lib/ghl-client.ts ↔ convex/_lib/ghlConversations.ts duplication
// pattern) so a module that imports this can NEVER transitively reach a writer
// function. Do not import ghl-client.ts here.

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;

export interface GhlReadConfig {
  token: string;
  locationId: string;
  fetchImpl?: FetchLike;
}

export interface GhlMessage {
  id: string;
  type: string;
  direction: "inbound" | "outbound";
  body: string;
  dateAdded: string;
}
export interface GhlConversationSummary {
  id: string;
  contactId: string;
  fullName?: string;
}
export interface GhlContact {
  id: string;
  customFields: { id: string; value: unknown }[];
  tags: string[];
}
export interface GhlCustomFieldDef {
  id: string;
  fieldKey: string;
  name: string;
}
export interface GhlPipeline {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}
export interface GhlOpportunity {
  id: string;
  pipelineId: string;
  pipelineStageId: string;
  updatedAt?: string;
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}
function impl(cfg: GhlReadConfig): FetchLike {
  return cfg.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
}
async function getJson(cfg: GhlReadConfig, url: string): Promise<any> {
  const res = await impl(cfg)(url, {
    method: "GET",
    headers: headers(cfg.token),
  });
  if (!res.ok) throw new Error(`GHL GET ${url} failed: ${res.status}`);
  return res.json();
}

export async function getConversationMessages(
  cfg: GhlReadConfig,
  conversationId: string,
  opts: { max?: number } = {},
): Promise<GhlMessage[]> {
  const max = opts.max ?? 500;
  const out: GhlMessage[] = [];
  let lastMessageId: string | undefined;
  while (out.length < max) {
    let url = `${GHL_BASE}/conversations/${encodeURIComponent(conversationId)}/messages?limit=100`;
    if (lastMessageId)
      url += `&lastMessageId=${encodeURIComponent(lastMessageId)}`;
    const data = await getJson(cfg, url);
    const page: GhlMessage[] = data?.messages?.messages ?? [];
    out.push(...page);
    const nextId = data?.messages?.lastMessageId;
    if (!page.length || !data?.messages?.nextPage || !nextId) break;
    lastMessageId = nextId;
  }
  return out.slice(0, max);
}

// Coerce a raw GHL date field to Unix-ms. Handles an epoch-ms number, a numeric
// string, or an ISO date string; returns undefined when unusable.
function toEpochMs(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : undefined;
}

export async function searchConversations(
  cfg: GhlReadConfig,
  params: {
    contactId?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  } = {},
): Promise<GhlConversationSummary[]> {
  // GHL /conversations/search defaults to ~20 items/page. Default to its max
  // page size (100) and PAGINATE via a startAfterDate (Unix-ms) cursor read from
  // the raw last item, so we cover the whole backlog — not just page 1.
  const limit = params.limit ?? 100;
  const MAX_PAGES = 20; // hard cap — bound the loop no matter what.
  const out: GhlConversationSummary[] = [];
  let startAfterDate: number | undefined;
  let prevCursor: number | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const q = new URLSearchParams({ locationId: cfg.locationId });
    if (params.contactId) q.set("contactId", params.contactId);
    if (params.startDate != null) q.set("startDate", String(params.startDate));
    if (params.endDate != null) q.set("endDate", String(params.endDate));
    q.set("limit", String(limit));
    if (startAfterDate != null) q.set("startAfterDate", String(startAfterDate));

    const data = await getJson(
      cfg,
      `${GHL_BASE}/conversations/search?${q.toString()}`,
    );
    const raw: any[] = Array.isArray(data?.conversations)
      ? data.conversations
      : [];
    for (const c of raw) {
      out.push({ id: c.id, contactId: c.contactId, fullName: c.fullName });
    }

    // A short page means we've reached the end.
    if (raw.length < limit) break;

    // Advance the cursor from the RAW last item. Field name is verify-live —
    // take the first present of lastMessageDate / dateUpdated / dateAdded.
    const last = raw[raw.length - 1] ?? {};
    const cursor =
      toEpochMs(last.lastMessageDate) ??
      toEpochMs(last.dateUpdated) ??
      toEpochMs(last.dateAdded);
    if (cursor == null) break; // no usable cursor → stop rather than loop.
    if (prevCursor != null && cursor === prevCursor) break; // no progress → stop.
    prevCursor = cursor;
    startAfterDate = cursor;
  }
  return out;
}

export async function getContact(
  cfg: GhlReadConfig,
  contactId: string,
): Promise<GhlContact> {
  const data = await getJson(
    cfg,
    `${GHL_BASE}/contacts/${encodeURIComponent(contactId)}`,
  );
  const c = data?.contact ?? {};
  return {
    id: c.id ?? contactId,
    customFields: c.customFields ?? [],
    tags: c.tags ?? [],
  };
}

export async function getCustomFieldDefs(
  cfg: GhlReadConfig,
): Promise<GhlCustomFieldDef[]> {
  const data = await getJson(
    cfg,
    `${GHL_BASE}/locations/${encodeURIComponent(cfg.locationId)}/customFields`,
  );
  const list = Array.isArray(data?.customFields) ? data.customFields : [];
  return list.map((d: any) => ({
    id: d.id,
    fieldKey: String(d.fieldKey ?? "").replace(/^contact\./, ""),
    name: d.name,
  }));
}

export async function getPipelines(cfg: GhlReadConfig): Promise<GhlPipeline[]> {
  const data = await getJson(
    cfg,
    `${GHL_BASE}/opportunities/pipelines?locationId=${encodeURIComponent(cfg.locationId)}`,
  );
  return Array.isArray(data?.pipelines) ? data.pipelines : [];
}

export async function findContactOpportunity(
  cfg: GhlReadConfig,
  contactId: string,
  pipelineId: string,
): Promise<GhlOpportunity | null> {
  const q = new URLSearchParams({
    location_id: cfg.locationId,
    contact_id: contactId,
  });
  const data = await getJson(
    cfg,
    `${GHL_BASE}/opportunities/search?${q.toString()}`,
  );
  const opps: GhlOpportunity[] = Array.isArray(data?.opportunities)
    ? data.opportunities
    : [];
  const inPipe = opps.filter((o) => o.pipelineId === pipelineId);
  if (!inPipe.length) return null;
  return inPipe.reduce((newest, o) =>
    (o.updatedAt ?? "") > (newest.updatedAt ?? "") ? o : newest,
  );
}
