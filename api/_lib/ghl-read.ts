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

export async function searchConversations(
  cfg: GhlReadConfig,
  params: {
    contactId?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  } = {},
): Promise<GhlConversationSummary[]> {
  const q = new URLSearchParams({ locationId: cfg.locationId });
  if (params.contactId) q.set("contactId", params.contactId);
  if (params.startDate != null) q.set("startDate", String(params.startDate));
  if (params.endDate != null) q.set("endDate", String(params.endDate));
  if (params.limit != null) q.set("limit", String(params.limit));
  const data = await getJson(
    cfg,
    `${GHL_BASE}/conversations/search?${q.toString()}`,
  );
  return Array.isArray(data?.conversations) ? data.conversations : [];
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
