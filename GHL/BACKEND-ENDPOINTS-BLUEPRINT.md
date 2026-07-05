# Backend Endpoint Blueprints — /match-ambassador & /auto-event-invite

> Generated 2026-07-02 by a multi-agent workflow (explore → design → adversarial-verify against the live repo).
> Unblocks WF-02 (Verificar embajador), WF-07 (Regla 5 min), WF-12 (Auto-invitación a eventos).
> **Implement AFTER `feat/ghl-inactivity-scoring` merges.** Every "Open business question" needs sign-off before coding.

Verification complete. All referenced files, functions, signatures, env vars, spec claims, and branch touchpoints were checked against the repo. Below is the CHANGES list followed by the full corrected blueprint.

# CHANGES (adversarial verification vs. actual repo, 2026-07-02)

1. **Convex import style fixed** — `convex/` files import `_lib` **without** `.js` extension (`convex/ghl.ts`: `from "./_lib/ghlConversations"`; `convex/ambassadors.ts`: `from "./_lib/commission"`). Blueprint had `./_lib/ambassadorMatch.js`. API handlers keep `.js` (that part was right).
2. **Wrong ConvexError precedent** — `ambassadors.create` throws plain `Error("SLUG_TAKEN")` (convex/ambassadors.ts:52,58), which Convex **sanitizes in prod**. The ConvexError pattern is `ghl.createOrder` (convex/ghl.ts:165+). Citations fixed; new code keeps ConvexError.
3. **Missing `events.setStatus`/publish mutation** — Blueprint B created events as `draft` and gated enqueue on `published` with no way to publish. Added.
4. **Removed unnamed placeholder internal getter** — `sendInvites` needed "an internal getter for the event doc" that was never specced. Fixed by passing `eventSlug`/`tipo` in the scheduled args; also dropped `listAudience`/`listInvites` internalQueries — `enqueueInvites` is a mutation and reads `ctx.db` directly (repo style: `ctx.runQuery` appears only in actions, e.g. clients.ts `_pushToSheet`, ghl.ts `tagInactiveContacts`; `MutationCtx` does have `runQuery` in convex 1.35 but no repo mutation uses it).
5. **Security hole flagged + closed** — `enqueueInvites` as a public Convex mutation is callable by **anyone with the deployment URL** (`VITE_CONVEX_URL` ships in the browser bundle), bypassing the Vercel dual-auth entirely — including `dryRun:false`. Precedent (`ghl.createOrder` is public too) doesn't excuse a bulk-send. Added an `internalSecret` arg checked inside the mutation against `process.env.GHL_API_SECRET` (Convex deployment env).
6. **Convex action runtime cap noted** — internalActions cap at ~10 min; at ~40 contacts/10 s the fan-out caps around ~2,000 contacts per run. Ledger idempotency makes re-runs safe; note added.
7. **`.env.example` is the wrong home** — it contains **no** GHL vars at all; repo precedent documents GHL env vars in `docs/ghl-commerce-integration.md`'s env table (that's where `WF_POSTVENTA_ID` lives). File list corrected. Also flagged existing docs drift: that table lists `GHL_TOKEN`/`GHL_LOCATION_ID` as Vercel-only, but this branch's cron already reads them from **Convex** env.
8. **Invented template names removed** — `evento_presencial_wa`/`evento_virtual_wa` appear in no spec doc; the templates are the **EV-01/EV-02 snippets** (GHL/SPEC-CONTINUACION.md:27,251).
9. **`addContactToWorkflow` mirror aligned to module style** — `convex/_lib/ghlConversations.ts` has `impl(cfg)`/`headers()` helpers and template-literal errors; `cfg.fetchImpl ?? fetch` as written would not typecheck against `FetchLike`. Snippet corrected.
10. **Ambassador statuses corrected** — schema union is `invited | active | paused | suspended | archived` (schema.ts:447-453). Test plan now also excludes `paused`; Q-A1 mentions it.
11. **Q-A5 inconsistency fixed** — it claimed "oldest-wins + `console.warn`" but the pure skeleton has no warn. Aligned (pure module stays silent).
12. **`pickAmbassadorMatch` made generic** (`<T extends MatchableAmbassador>`) so `matchByIdentity` returns `_id` without the `as any` cast.
13. **Empty `embajador_ghl_contact_id` on match** — `ambassadors.ghlContactId` is optional (schema.ts:455); WF-02 must branch on it being non-empty before cross-sending EM-01. Wiring note added.
14. **"Two spec docs disagree" on body spelling unverified** — SPEC-CONTINUACION.md:186 says `{phone, email, ig_handle}`; no doc found using `celular`/`instagram` for this endpoint. Aliases kept but described as defensive, not spec-mandated.
15. **Error-mapping style aligned** — repo precedent is `msg.includes(...)` (api/ghl-create-order.ts:88-99), not `startsWith`.
16. **Concurrent-branch section corrected to verified facts** — `git diff main...HEAD` confirms the branch (not main) added the four `vercel.json` GHL/MP function entries (lines 82-93), `convex/_lib/ghlConversations.ts` + tests, the 07:00 UTC cron, Convex-side `GHL_TOKEN`/`GHL_LOCATION_ID` reads, `scripts/lib/backfill-tags.ts` (`canal-evento` at :38, `ocasion-evento-especial` at :31), plus `api/vitrina.ts`/`convex/vitrinas.ts`/schema changes the original didn't mention. "Branch may too" → branch **does**.
17. **Line refs fixed** — clients indexes are schema.ts **416–424**; ambassadors table 426–460 ✓; vercel.json functions block is lines 3–94 with GHL entries at 82–93 ✓.
18. **Clarified `ghl.upsertClient`** — it's a private helper inside `convex/ghl.ts` (line 97), not an exported mutation.
19. **Verified-good claims kept as-is**: `bearerMatches(authHeader, secret)` signature ✓; `withApiHandler` options `{methods, requireGoogle, errorPrefix}` ✓; `sendSuccess` flat spread `{success:true, ...data}` ✓; `requireAdminEmail` graceful-degradation-when-unset ✓ (cors.js:125-128); `addToWorkflow` in api/_lib/ghl-client.ts:94-104 ✓; `WF_POSTVENTA_ID` used by mp-webhook.ts:114 ✓; test-contact rule (Kevin Tres Toj / Juan Ma Escobar / Isa La Negra Vikinga) in ESTADO-Y-PROXIMOS-PASOS.md:183 ✓; custom-header Bearer lesson (native Bearer field stores a static key, no merge tags) ESTADO:586-589 ✓; "Guardar la respuesta" needs one real test request ✓ (ESTADO:199); rate-limit golden rule #7 (SETUP-SPEC.md:1176) ✓; reminder cron spec §5.3.2 = `0 9 * * *` `mode=reminder` ≤72 h (SETUP-SPEC.md:776,788) ✓; `clients.by_telefono`/`by_email` indexes ✓; blocked-workflows table in SPEC-CONTINUACION.md:159-170 ✓; `canal_preferido` enumeration truly undocumented ✓.

---

# Implementation Blueprints: /api/match-ambassador & /api/auto-event-invite (CORRECTED)

Both blueprints follow the established `api/ghl-*.ts` + Convex pattern (bearer auth via `GHL_API_SECRET`, `withApiHandler` wrapper, flat `sendSuccess` envelopes for GHL merge tags, pure logic extracted into `_lib` for Vitest). Implementation should start **after `feat/ghl-inactivity-scoring` merges** — conflict surface (verified against `git diff main...HEAD`) noted at the end.

---

# Blueprint A — POST /api/ghl-match-ambassador

**Purpose:** GHL WF-02 posts the inbound contact's identity keys; the server matches them against the Convex `ambassadors` table and returns a flat payload WF-02 uses to set custom field `embajador_asignado`, branch on match, and cross-send EM-01 to the ambassador. Endpoint is read-mostly; the only write is an optional first-touch link on the `clients` row (spec T4).

**Naming note:** spec docs say `POST /match-ambassador`, repo convention is `api/ghl-*.ts` for GHL-facing endpoints. Ship as `/api/ghl-match-ambassador` — the WF-02 Custom Webhook URL is freely configurable. Update the `GHL/SPEC-CONTINUACION.md` blocked-workflows table (lines 159–170) when shipping.

## Files

| Action | Path |
|---|---|
| CREATE | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/_lib/ambassadorMatch.ts` (pure, unit-tested) |
| CREATE | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/api/ghl-match-ambassador.ts` (Vercel handler) |
| MODIFY | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/ambassadors.ts` (add `matchByIdentity` query + `assignClientFirstTouch` mutation) |
| MODIFY | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/vercel.json` (add `"api/ghl-match-ambassador.ts": { "maxDuration": 15 }` to the `functions` block, lines 3–94) |
| CREATE | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/tests/ambassadorMatch.test.ts` |
| MODIFY | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/docs/ghl-commerce-integration.md` (endpoint in the flow diagram + go-live checklist; no new env vars) |

## 1. Pure matching module — `convex/_lib/ambassadorMatch.ts`

Lives under `convex/_lib/` (not `api/_lib/`) because the Convex query consumes it and Convex bundles only files under `convex/`; tests import it directly, matching the `convex/_lib/commission.ts` / `asesorSync.ts` precedent.

```ts
/**
 * Identity matching for the WF-02 "Verificar embajador" flow (spec T4).
 * Pure — unit-tested in tests/ambassadorMatch.test.ts.
 */

export interface AmbassadorIdentity {
  phone?: string | null;
  email?: string | null;
  igHandle?: string | null;
}

/** Structural subset of the `ambassadors` doc this module needs.
 *  Schema: convex/schema.ts lines 426-460. */
export interface MatchableAmbassador {
  slug: string;
  nombre: string;
  celular?: string;
  email: string;
  instagramHandle?: string;
  status: string; // schema union: invited|active|paused|suspended|archived
  ghlContactId?: string;
  nivel: string;
  createdAt: string;
}

export type MatchVia = "phone" | "email" | "instagram";

/**
 * Canonicalize Colombian phone formats to a comparable digit string.
 * "+57 300 123 4567" / "57 3001234567" / "0057..." / "(300) 123-4567"
 * all reduce to "3001234567". Non-CO / odd-length numbers fall back to
 * their raw digit string so exact matches still work. Empty -> null.
 */
export function normalizePhoneCO(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0057")) d = d.slice(4);
  if (d.length === 12 && d.startsWith("57")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length > 0 ? d : null;
}

/** Lowercased, trimmed email; empty -> null. */
export function normalizeEmail(raw?: string | null): string | null {
  const e = (raw ?? "").trim().toLowerCase();
  return e.length > 0 ? e : null;
}

/**
 * Strip @-prefix, instagram.com URLs, trailing slashes/query, lowercase.
 * "@Handle" / "https://www.instagram.com/handle/?igsh=x" -> "handle".
 */
export function normalizeIgHandle(raw?: string | null): string | null {
  if (!raw) return null;
  let h = raw.trim().toLowerCase();
  h = h.replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
  h = h.replace(/^@/, "");
  h = h.split(/[/?#]/)[0].trim();
  return h.length > 0 ? h : null;
}

/**
 * Deterministic match: phone beats email beats instagram (an inbound WhatsApp
 * contact's phone is the strongest signal). Within one key, ties (data error:
 * two ambassadors sharing a phone) resolve to oldest createdAt, silently —
 * see Q-A5. Only `matchable` statuses participate (paused/suspended/archived
 * never match).
 *
 * Generic over T so callers get their full doc back (Convex `_id` included)
 * without casting.
 */
const MATCHABLE_STATUSES = new Set(["active", "invited"]); // OPEN QUESTION Q-A1

export function pickAmbassadorMatch<T extends MatchableAmbassador>(
  candidates: T[],
  identity: AmbassadorIdentity,
): { ambassador: T; via: MatchVia } | null {
  const pool = candidates
    .filter((a) => MATCHABLE_STATUSES.has(a.status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const phone = normalizePhoneCO(identity.phone);
  const email = normalizeEmail(identity.email);
  const ig = normalizeIgHandle(identity.igHandle);

  const attempts: Array<[MatchVia, string | null, (a: T) => string | null]> = [
    ["phone", phone, (a) => normalizePhoneCO(a.celular)],
    ["email", email, (a) => normalizeEmail(a.email)],
    ["instagram", ig, (a) => normalizeIgHandle(a.instagramHandle)],
  ];

  for (const [via, needle, extract] of attempts) {
    if (!needle) continue;
    const hit = pool.find((a) => extract(a) === needle);
    if (hit) return { ambassador: hit, via };
  }
  return null;
}
```

## 2. Convex layer — additions to `convex/ambassadors.ts`

> Import style: `convex/` files import `_lib` modules **without** an extension (`import { commissionPercentForNivel } from "./_lib/commission"` in this same file; `ghl.ts` does the same). Do NOT add `.js` here — that's the `api/` handler convention only.

```ts
import { pickAmbassadorMatch } from "./_lib/ambassadorMatch";

/** WF-02 identity lookup. Table is small (tens of rows) — full scan is fine
 *  and necessary anyway, since stored phone/IG formats vary and can only be
 *  compared post-normalization (no index can serve that). */
export const matchByIdentity = query({
  args: {
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    igHandle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("ambassadors").collect();
    const hit = pickAmbassadorMatch(all, args); // generic: docs carry _id through
    if (!hit) return null;
    const a = hit.ambassador;
    return {
      ambassadorId: a._id,
      slug: a.slug,
      nombre: a.nombre,
      nivel: a.nivel,
      celular: a.celular ?? "",
      ghlContactId: a.ghlContactId ?? "", // OPTIONAL in schema (line 455) — may be ""
      via: hit.via,
    };
  },
});

/**
 * Spec T4 first-touch: if a Convex client exists for the inbound contact and
 * has no ambassadorId yet, link it. Mirrors the guard in the private
 * `upsertClient` helper inside convex/ghl.ts (line ~121: "only set an
 * ambassador if none yet") — never overwrites an earlier touch.
 */
export const assignClientFirstTouch = mutation({
  args: {
    ambassadorId: v.id("ambassadors"),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { ambassadorId, phone, email }) => {
    let client = phone
      ? await ctx.db
          .query("clients")
          .withIndex("by_telefono", (q) => q.eq("telefono", phone))
          .first()
      : null;
    if (!client && email) {
      client = await ctx.db
        .query("clients")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }
    if (!client) return { linked: false, reason: "no-client" };
    if (client.ambassadorId) return { linked: false, reason: "already-attributed" };
    await ctx.db.patch(client._id, { ambassadorId });
    return { linked: true, clientId: client._id };
  },
});
```

Caveat for the engineer: `by_telefono` is an exact-string index — if the GHL-sent phone format differs from the stored one, the first-touch link silently no-ops (`no-client`). That is acceptable for v1 (attribution is re-attempted at order time by ghl.ts's `upsertClient` helper); do NOT block the response on it.

## 3. Vercel handler — `api/ghl-match-ambassador.ts`

```ts
/**
 * WF-02 "Verificar embajador": match an inbound contact's identity keys
 * against the ambassadors table (spec T4 first-touch).
 *
 * POST, `Authorization: Bearer <GHL_API_SECRET>` — GHL must send it as a
 * CUSTOM header (GHL's native Bearer auth field stores a static key and does
 * NOT resolve merge tags; see GHL/ESTADO-Y-PROXIMOS-PASOS.md lines 586-589,
 * the WF-04 pattern).
 *
 * Body (spec, SPEC-CONTINUACION.md WF-02): { phone?, email?, ig_handle? }.
 * Aliases celular/instagram are accepted defensively (not spec-mandated).
 *
 * Response is FLAT for GHL merge tags; unmatched fields are "" (never
 * undefined, which renders literally in WhatsApp).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withApiHandler, sendError, sendSuccess } from "./_lib/index.js";
import { convexClient, isConvexEnabled } from "./_lib/convex-client.js";
import { bearerMatches } from "./_lib/bearer.js";
import { api } from "../convex/_generated/api.js";

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    if (!process.env.GHL_API_SECRET)
      return sendError(res, 500, "GHL_API_SECRET not configured on server");
    if (!bearerMatches(req.headers["authorization"], process.env.GHL_API_SECRET))
      return sendError(res, 401, "Unauthorized");
    if (!isConvexEnabled || !convexClient)
      return sendError(res, 503, "Convex backend not configured");

    const body = (req.body ?? {}) as {
      phone?: string; celular?: string;
      email?: string;
      ig_handle?: string; instagram?: string;
    };
    const phone = body.phone ?? body.celular;
    const email = body.email;
    const igHandle = body.ig_handle ?? body.instagram;
    if (!phone && !email && !igHandle)
      return sendError(res, 400, "At least one of phone, email, ig_handle is required");

    const match = await convexClient.query(api.ambassadors.matchByIdentity, {
      phone, email, igHandle,
    });

    if (!match) {
      return sendSuccess(res, {
        matched: false,
        embajador_slug: "",
        embajador_nombre: "",
        embajador_user_id: "",
        embajador_ghl_contact_id: "",
        embajador_celular: "",
        embajador_nivel: "",
        matched_via: "",
      });
    }

    // Best-effort first-touch link (spec T4). Never fails the response —
    // order-time attribution (ghl.createOrder) re-attempts anyway.
    try {
      await convexClient.mutation(api.ambassadors.assignClientFirstTouch, {
        ambassadorId: match.ambassadorId, phone, email,
      });
    } catch (err) {
      console.error("[GhlMatchAmbassador] first-touch link failed:", err);
    }

    return sendSuccess(res, {
      matched: true,
      embajador_slug: match.slug,
      embajador_nombre: match.nombre,
      embajador_user_id: String(match.ambassadorId),
      embajador_ghl_contact_id: match.ghlContactId, // "" if the ambassador row has no ghlContactId
      embajador_celular: match.celular,
      embajador_nivel: match.nivel,
      matched_via: match.via,
    });
  },
  { methods: ["POST", "OPTIONS"], requireGoogle: false, errorPrefix: "GhlMatchAmbassador" },
);
```

**GHL WF-02 wiring (documentation to ship with the PR):** enable "Guardar la respuesta de este Webhook" (requires one real test request against a sanctioned test contact — Kevin Tres Toj / Juan Ma Escobar / Isa La Negra Vikinga only, per the permanent rule in GHL/ESTADO-Y-PROXIMOS-PASOS.md:183); branch If/Else on `{{custom_webhook.1.response.matched}}`; set `embajador_asignado = {{custom_webhook.1.response.embajador_slug}}` (see Q-A4). **The EM-01 cross-send must additionally branch on `embajador_ghl_contact_id` being non-empty** — `ambassadors.ghlContactId` is optional in the schema, so a match can return an ambassador with no GHL contact yet. The endpoint does NOT send EM-01 — that stays in the workflow per spec.

## 4. Env vars

None new. Reuses `GHL_API_SECRET`, `CONVEX_URL` (Vercel). No GHL_TOKEN needed (no GHL API calls from this endpoint).

## 5. Test plan — `tests/ambassadorMatch.test.ts`

Mirror `tests/asesorSync.test.ts` / `tests/commission.test.ts` style (explicit vitest imports, pure module imported extensionless from `../convex/_lib/ambassadorMatch`, no handler tests):

- `normalizePhoneCO`: `"+57 300 123 4567"`, `"573001234567"`, `"57 300-123-4567"`, `"0057 3001234567"`, `"(300) 123.4567"`, `"03001234567"` all → `"3001234567"`; 10-digit landline `"6012345678"` preserved; garbage/short → raw digits fallback equality; `""`/`undefined`/`"abc"` → `null`.
- `normalizeEmail`: case + whitespace; empty → null.
- `normalizeIgHandle`: `"@Handle"`, `"handle"`, `"https://www.instagram.com/handle/"`, `"instagram.com/handle?igsh=abc"` → `"handle"`; empty → null.
- `pickAmbassadorMatch`: phone match wins over email match pointing at a different ambassador; email wins over IG; no identifiers → null; **paused/suspended/archived excluded** (all three non-matchable statuses from the schema union); duplicate-phone tie resolves to oldest `createdAt`; input phone in `+57` form matches stored 10-digit form and vice versa.
- Run: `npm run test:unit` and `npm run lint` (`tsc --noEmit` on src + api tsconfigs; note `convex/` is typechecked by the Convex push, not by `npm run lint`).
- Manual smoke (post-deploy): `curl -X POST https://tierramadre.app/api/ghl-match-ambassador -H "Authorization: Bearer $GHL_API_SECRET" -H "Content-Type: application/json" -d '{"phone":"+57 ..."}'` against a seeded test ambassador; verify 401 without bearer.

## 6. Open business questions (Blueprint A — do not implement without answers)

- **Q-A1 — Matchable statuses:** should `invited` ambassadors match, or only `active`? (`paused`/`suspended`/`archived` are always excluded.) Skeleton defaults to `active + invited`; pin before ship.
- **Q-A2 — Multi-key tie-break:** phone > email > instagram priority is assumed (not in any spec). Confirm.
- **Q-A3 — First-touch write here vs order-time only:** spec T4 says the backend sets the client's ambassador on match; ghl.ts's `upsertClient` helper already does it at order time. Blueprint does both (guarded, idempotent) — confirm this is wanted, or drop `assignClientFirstTouch` for a read-only v1.
- **Q-A4 — What value does GHL custom field `embajador_asignado` store?** SPEC-CONTINUACION.md:188 says `response.ambassador_id`; slug is more human-readable in the GHL UI and is the stable key used by `ghl-create-order`'s `ambassador_slug`. Recommend slug; needs sign-off since Manage Scoring / other workflows may reference it.
- **Q-A5 — Duplicate identity data policy:** if two ambassadors share a phone/email, oldest-wins (silently — the pure module does not log) is the skeleton behavior. Confirm, or require manual data cleanup instead.

---

# Blueprint B — POST /api/ghl-auto-event-invite

**Purpose:** unblock WF-12. Admin frontend (or GHL WF-12) posts `{event_slug, audience_filters}`; the server segments contacts, and fans out EV-01 (presencial) / EV-02 (virtual) invites + tag `evento-{slug}-invitado`, idempotently and inside GHL's 100 req/10 s ceiling (SETUP-SPEC.md golden rule #7, line 1176).

**Key architecture decision (per repo precedent):** the endpoint only validates, segments, and **enqueues**; the fan-out runs as a Convex `internalAction` (same home as `ghl.tagInactiveContacts`), scheduled via `ctx.scheduler.runAfter(0, ...)`. This sidesteps Vercel `maxDuration` for large audiences and keeps the GHL client code in the Convex-bundled mirror (`convex/_lib/`). **Runtime cap caveat:** Convex actions cap at ~10 minutes; at the paced ~40 contacts/10 s (2 GHL calls each) one run covers roughly ~2,000 contacts. The `eventInvites` ledger makes re-running the same request idempotent, so a capped run is resumed by simply POSTing again; chunked self-rescheduling is a documented follow-up if audiences ever exceed that.

**Send mechanism — Variant 1 (recommended, spec'd here):** per contact, `addContactToWorkflow` into one of two GHL workflows (presencial/virtual) that own the actual EV-01/EV-02 snippet send, with the workflow's own If/Else on `canal_preferido` choosing WhatsApp/IG/etc. This matches the existing `WF_POSTVENTA_ID` + `addToWorkflow` precedent (api/mp-webhook.ts:114, api/_lib/ghl-client.ts:94-104), avoids N extra `getContact` reads for `canal_preferido`, and respects the WhatsApp rule that MARKETING templates outside the 24 h window must go out as approved templates (which GHL workflows handle natively). **Variant 2 (direct API send via `POST /conversations/messages`) is NOT spec'd** — whether GHL's v2 API can trigger an approved WA template send directly is unverified; see Q-B7.

## Files

| Action | Path |
|---|---|
| MODIFY | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/schema.ts` (add `events`, `eventInvites` tables) |
| CREATE | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/events.ts` (CRUD + `setStatus` + enqueue mutation + fan-out internalAction) |
| CREATE | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/_lib/eventAudience.ts` (pure segment filter) |
| CREATE | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/_lib/eventInvitePlan.ts` (pure idempotency plan) |
| CREATE | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/_lib/ghlPacer.ts` (pure rate pacer) |
| MODIFY | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/_lib/ghlConversations.ts` (add `addContactToWorkflow` mirror; keep in sync with `api/_lib/ghl-client.ts` per the standing sync rule in both file headers) |
| CREATE | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/api/ghl-auto-event-invite.ts` (Vercel handler) |
| MODIFY | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/vercel.json` (add `"api/ghl-auto-event-invite.ts": { "maxDuration": 15 }`) |
| MODIFY | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/docs/ghl-commerce-integration.md` (env table: `WF_EVENT_PRESENCIAL_ID`, `WF_EVENT_VIRTUAL_ID`; also fix the drift where `GHL_TOKEN`/`GHL_LOCATION_ID` are listed as Vercel-only — the inactivity cron already reads them from Convex env). **Not `.env.example`** — it contains no GHL vars; the docs env table is where `WF_POSTVENTA_ID` is documented. |
| CREATE | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/tests/eventAudience.test.ts`, `tests/eventInvitePlan.test.ts`, `tests/ghlPacer.test.ts` |
| MODIFY | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/tests/ghlConversations.test.ts` (cover `addContactToWorkflow`) |
| MODIFY (phase 2, optional) | `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/crons.ts` (daily 14:00 UTC ≈ 09:00 Bogotá reminder cron per SETUP-SPEC.md §5.3.2 — blocked on Q-B4) |

## 1. Schema additions — `convex/schema.ts`

Convex-only tables (no Sheets mirror — same precedent as `vitrinas`/`ambassadors`), camelCase names, `by_xxx` indexes:

```ts
  // ─── GHL commerce · Events (WF-10/WF-12) ─────────────────────────
  // Convex-only. `slug` is the public key used in tags evento-{slug}-invitado.
  events: defineTable({
    slug: v.string(),
    nombre: v.string(),
    tipo: v.union(v.literal("presencial"), v.literal("virtual"), v.literal("hibrido")),
    fechaISO: v.string(),          // ISO datetime, America/Bogota wall time decided by caller
    ciudad: v.optional(v.string()),
    lugar: v.optional(v.string()),
    zoomLink: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    capacidad: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("published"),
                    v.literal("finished"), v.literal("cancelled")),
    createdAt: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  // Idempotency ledger for auto-event-invite: one row per (event, contact, mode).
  // status "failed" rows are retried on re-run; "invited" rows are skipped.
  eventInvites: defineTable({
    eventId: v.id("events"),
    ghlContactId: v.string(),
    clientId: v.optional(v.id("clients")),
    mode: v.union(v.literal("invite"), v.literal("reminder")),
    status: v.union(v.literal("invited"), v.literal("failed")),
    sentAt: v.string(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_contact_mode", ["eventId", "ghlContactId", "mode"]),
```

Deliberately NOT adding `eventAttendees`/RSVP/QR (spec 006 migration) — that's WF-10 scope, out of this blueprint.

## 2. Pure modules

**`convex/_lib/eventAudience.ts`** — segment filter over Convex clients (contact universe = GHL-linked clients, same as `tagInactiveContacts`; see Q-B3):

```ts
export interface AudienceFilters {
  ciudad?: string;          // accent/case-insensitive exact match (NFD strip, like asesorSync's normalizeAsesorName)
  tags?: string[];          // client must have ALL listed tags — OPEN QUESTION Q-B1 (ALL vs ANY)
  tipoInteres?: string;
}
export interface AudienceClient {
  clientId: string; ghlContactId: string;
  ciudad?: string; tags?: string[]; tipoInteres?: string;
}
export function filterAudience(clients: AudienceClient[], f: AudienceFilters): AudienceClient[];
// AND across filter keys; empty/absent filters object => ALL linked contacts (guarded by dry-run default).
```

**`convex/_lib/eventInvitePlan.ts`** — idempotency, extracted pure for tests:

```ts
export interface ExistingInvite { ghlContactId: string; mode: "invite" | "reminder"; status: "invited" | "failed"; }
export function planEventInvites(
  audience: AudienceClient[],
  existing: ExistingInvite[],
  mode: "invite" | "reminder",
): { toSend: AudienceClient[]; alreadyInvited: number } {
  // skip contacts with an existing status:"invited" row for this mode;
  // contacts with only status:"failed" rows ARE retried;
  // dedupe audience by ghlContactId.
}
```

**`convex/_lib/ghlPacer.ts`** — first real pacing mechanism in the repo (golden rule #7: 100 req/10 s). Sliding-window, injectable clock/sleep for tests:

```ts
export interface PacerOpts {
  maxPerWindow?: number;              // default 80 (headroom under GHL's 100)
  windowMs?: number;                  // default 10_000
  sleep?: (ms: number) => Promise<void>;   // injectable for tests
  now?: () => number;
}
export interface Pacer { wait(): Promise<void>; }
export function createPacer(opts: PacerOpts = {}): Pacer {
  // keep timestamps of the last maxPerWindow calls; if full, sleep until the
  // oldest falls out of the window, then record and resolve.
}
```

**`convex/_lib/ghlConversations.ts`** — add the workflow-add mirror (byte-compatible with `api/_lib/ghl-client.ts::addToWorkflow`, lines 94-104; note the sync rule in both file headers). Use the module's existing `impl(cfg)` / `headers()` helpers and template-literal error style — do NOT write `cfg.fetchImpl ?? fetch` (the global `fetch` isn't typed as the module's `FetchLike`):

```ts
/** POST /contacts/{contactId}/workflow/{workflowId} — mirror of
 *  api/_lib/ghl-client.ts::addToWorkflow (keep in sync). The workflow's
 *  trigger must allow API adds. */
export async function addContactToWorkflow(
  cfg: GhlConvConfig,
  contactId: string,
  workflowId: string,
): Promise<void> {
  const res = await impl(cfg)(
    `${GHL_BASE}/contacts/${contactId}/workflow/${workflowId}`,
    { method: "POST", headers: headers(cfg.token), body: JSON.stringify({}) },
  );
  if (!res.ok) throw new Error(`GHL addContactToWorkflow failed: ${res.status}`);
}
```

## 3. Convex layer — `convex/events.ts`

> Patterns verified against `convex/ghl.ts`: same import set (`query, mutation, internalMutation, internalAction` from `./_generated/server`, `v, ConvexError` from `convex/values`, `internal` from `./_generated/api`), extensionless `_lib` imports, explicit return-type annotation on the internalAction (as `tagInactiveContacts` does), no `"use node"` (fetch is available to actions in the default runtime — `tagInactiveContacts` proves it, and `"use node"` would forbid the mutations in this file).
>
> **ConvexError precedent is `ghl.createOrder`** (convex/ghl.ts) — NOT `ambassadors.create`, which throws a plain `Error("SLUG_TAKEN")` that Convex sanitizes to "Server Error" in prod (a known wart; don't copy it).

```ts
/**
 * Events + auto-invite fan-out (WF-12). HTTP surface: api/ghl-auto-event-invite.ts.
 * Fan-out runs here (internalAction) — not in Vercel — so big audiences aren't
 * capped by maxDuration, mirroring ghl.tagInactiveContacts.
 */
import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { filterAudience } from "./_lib/eventAudience";
import { planEventInvites } from "./_lib/eventInvitePlan";
import { createPacer } from "./_lib/ghlPacer";
import { addContactTags, addContactToWorkflow, type GhlConvConfig } from "./_lib/ghlConversations";

export const getBySlug = query({ args: { slug: v.string() }, handler: /* by_slug .first() */ });

export const create = mutation({
  args: { slug, nombre, tipo, fechaISO, ciudad?, lugar?, zoomLink?, descripcion?, capacidad? },
  handler: async (ctx, args) => {
    // throw new ConvexError("SLUG_TAKEN") on by_slug collision (ConvexError so
    // the message survives prod sanitization — cf. ghl.createOrder; note
    // ambassadors.create's plain Error("SLUG_TAKEN") is the anti-pattern).
    // insert with status "draft", createdAt: new Date().toISOString()
  },
});

/** draft -> published -> finished/cancelled. Required: `create` inserts drafts
 *  and enqueueInvites refuses anything not published — without this mutation
 *  there is no way to ever send. Same auth posture as `create` (Q-B8). */
export const setStatus = mutation({
  args: {
    slug: v.string(),
    status: v.union(v.literal("draft"), v.literal("published"),
                    v.literal("finished"), v.literal("cancelled")),
  },
  handler: async (ctx, { slug, status }) => {
    const event = /* by_slug .first() */;
    if (!event) throw new ConvexError(`EVENT_NOT_FOUND:${slug}`);
    await ctx.db.patch(event._id, { status });
    return { ok: true, status };
  },
});
// NOTE: like ambassadors.create, `create`/`setStatus` are public Convex
// mutations with no Convex-layer auth — called from the admin frontend via
// VITE_CONVEX_URL. See Q-B8.

export const recordInvite = internalMutation({
  args: { eventId: v.id("events"), ghlContactId: v.string(), clientId: v.optional(v.id("clients")),
          mode: v.union(v.literal("invite"), v.literal("reminder")),
          status: v.union(v.literal("invited"), v.literal("failed")) },
  handler: async (ctx, args) => {
    // upsert on by_event_contact_mode: patch status/sentAt if a row exists
    // (failed -> invited on successful retry), else insert.
  },
});

/**
 * Entry point called by the Vercel handler. Validates, plans, and either
 * returns the dry-run preview or schedules the fan-out.
 *
 * SECURITY: this is a *public* Convex mutation, and VITE_CONVEX_URL ships in
 * the browser bundle — the Vercel handler's bearer/admin auth does NOT protect
 * direct Convex calls. Unlike ghl.createOrder (which merely creates a pending
 * order), this one can trigger a mass send, so it verifies `internalSecret`
 * against GHL_API_SECRET (which must also be set in the CONVEX deployment env).
 *
 * All reads use ctx.db directly (repo style: ctx.runQuery only appears in
 * actions — cf. clients._pushToSheet, ghl.tagInactiveContacts).
 */
export const enqueueInvites = mutation({
  args: {
    internalSecret: v.string(),
    eventSlug: v.string(),
    audienceFilters: v.optional(v.any()), // or a typed object validator mirroring AudienceFilters
    dryRun: v.boolean(),
    mode: v.union(v.literal("invite"), v.literal("reminder")),
  },
  handler: async (ctx, { internalSecret, eventSlug, audienceFilters, dryRun, mode }) => {
    if (!process.env.GHL_API_SECRET || internalSecret !== process.env.GHL_API_SECRET)
      throw new ConvexError("UNAUTHORIZED");

    const event = /* by_slug .first() */;
    if (!event) throw new ConvexError(`EVENT_NOT_FOUND:${eventSlug}`);
    if (event.status !== "published") throw new ConvexError(`EVENT_NOT_PUBLISHED:${event.status}`);
    if (event.tipo === "hibrido") throw new ConvexError("HIBRIDO_TEMPLATE_UNDECIDED"); // Q-B2

    // Same full-scan-and-filter as ghl.listGhlLinkedContacts.
    const clients = await ctx.db.query("clients").collect();
    const linked = clients
      .filter((c) => Boolean(c.ghlContactId))
      .map(/* -> AudienceClient (clientId, ghlContactId, ciudad, tags, tipoInteres) */);
    const audience = filterAudience(linked, audienceFilters ?? {});

    const existing = await ctx.db
      .query("eventInvites")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .collect();
    const plan = planEventInvites(audience, existing, mode);

    if (!dryRun && plan.toSend.length > 0) {
      await ctx.scheduler.runAfter(0, internal.events.sendInvites, {
        eventId: event._id,
        eventSlug: event.slug,     // passed through so the action needs no event getter
        tipo: event.tipo,
        mode,
        contacts: plan.toSend.map((c) => ({ clientId: c.clientId, ghlContactId: c.ghlContactId })),
      });
    }
    return {
      eventSlug, tipo: event.tipo, mode, dryRun,
      audienceTotal: audience.length,
      alreadyInvited: plan.alreadyInvited,
      toInvite: plan.toSend.length,
      sampleContactIds: plan.toSend.slice(0, 20).map((c) => c.ghlContactId),
      queued: !dryRun && plan.toSend.length > 0,
    };
  },
});

/**
 * The fan-out. Sequential + paced (80 req/10s bucket; 2 GHL calls per contact
 * => ~40 contacts/10s => ~2,000 contacts fits Convex's ~10-min action cap; the
 * ledger makes a re-POST resume an interrupted run). Per-contact try/catch:
 * one failure never aborts the batch (pattern: tagInactiveContacts). Every
 * outcome writes an eventInvites row, which is what makes re-runs idempotent.
 * Return type annotated explicitly, same as tagInactiveContacts.
 */
export const sendInvites = internalAction({
  args: {
    eventId: v.id("events"),
    eventSlug: v.string(),
    tipo: v.union(v.literal("presencial"), v.literal("virtual"), v.literal("hibrido")),
    mode: v.union(v.literal("invite"), v.literal("reminder")),
    contacts: v.array(v.object({
      clientId: v.optional(v.id("clients")),
      ghlContactId: v.string(),
    })),
  },
  handler: async (
    ctx,
    { eventId, eventSlug, tipo, mode, contacts },
  ): Promise<{ sent: number; failed: number; skipped?: number }> => {
    const token = process.env.GHL_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    const workflowId = tipo === "presencial"
      ? process.env.WF_EVENT_PRESENCIAL_ID
      : process.env.WF_EVENT_VIRTUAL_ID;
    if (!token || !locationId || !workflowId) {
      console.warn("[auto-event-invite] GHL creds or WF_EVENT_*_ID unset — skipping run");
      return { sent: 0, failed: 0, skipped: contacts.length };
    }
    const cfg: GhlConvConfig = { token, locationId };
    const pacer = createPacer(); // 80 / 10s
    const inviteTag = `evento-${eventSlug}-invitado`;
    let sent = 0, failed = 0;

    for (const { clientId, ghlContactId } of contacts) {
      try {
        await pacer.wait();
        await addContactToWorkflow(cfg, ghlContactId, workflowId); // workflow sends EV-01/EV-02 per canal_preferido
        await pacer.wait();
        await addContactTags(cfg, ghlContactId, [inviteTag]);
        await ctx.runMutation(internal.events.recordInvite,
          { eventId, ghlContactId, clientId, mode, status: "invited" });
        sent++;
      } catch (err) {
        failed++;
        console.error(`[auto-event-invite] contact ${ghlContactId} failed:`, err instanceof Error ? err.message : err);
        await ctx.runMutation(internal.events.recordInvite,
          { eventId, ghlContactId, clientId, mode, status: "failed" }); // retried on next run
      }
    }
    console.log(`[auto-event-invite] event=${eventSlug} mode=${mode} sent=${sent} failed=${failed}`);
    return { sent, failed };
  },
});
```

## 4. Vercel handler — `api/ghl-auto-event-invite.ts`

```ts
/**
 * WF-12 / admin "auto-event-invite": segment contacts and fan out EV-01/EV-02
 * event invites via GHL workflows, tagging evento-{slug}-invitado.
 *
 * SAFETY: dry-run by DEFAULT (repo guarded-apply culture, cf. scripts/apply-backfill.ts).
 * Callers must pass { "dry_run": false } to actually send.
 *
 * Auth (dual): Bearer GHL_API_SECRET (GHL WF-12 / server-to-server) OR
 * x-requester-email in ADMIN_EMAILS (admin frontend). NOTE: unlike
 * cors.js#requireAdminEmail (which allows-with-warning when ADMIN_EMAILS is
 * unset), the email path here FAILS CLOSED — a bulk-send endpoint gets no
 * graceful degradation. Defense in depth: the Convex mutation ALSO verifies
 * internalSecret, because public Convex mutations are directly reachable via
 * the browser-bundled VITE_CONVEX_URL.
 *
 * Body: { event_slug, audience_filters?: { ciudad?, tags?: string[], tipo_interes? },
 *         dry_run?: boolean, mode?: "invite" | "reminder" }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ConvexError } from "convex/values";
import { withApiHandler, sendError, sendSuccess } from "./_lib/index.js";
import { convexClient, isConvexEnabled } from "./_lib/convex-client.js";
import { bearerMatches } from "./_lib/bearer.js";
import { api } from "../convex/_generated/api.js";

function isStrictAdmin(req: VercelRequest): boolean {
  const email = String(req.headers["x-requester-email"] ?? "").trim().toLowerCase();
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.length > 0 && !!email && admins.includes(email); // fail closed
}

export default withApiHandler(
  async (req: VercelRequest, res: VercelResponse) => {
    const secret = process.env.GHL_API_SECRET;
    if (!secret) return sendError(res, 500, "GHL_API_SECRET not configured on server");
    const bearerOk = bearerMatches(req.headers["authorization"], secret);
    if (!bearerOk && !isStrictAdmin(req)) return sendError(res, 401, "Unauthorized");
    if (!isConvexEnabled || !convexClient) return sendError(res, 503, "Convex backend not configured");

    const body = (req.body ?? {}) as {
      event_slug?: string;
      audience_filters?: { ciudad?: string; tags?: string[]; tipo_interes?: string };
      dry_run?: boolean;
      mode?: "invite" | "reminder";
    };
    if (!body.event_slug) return sendError(res, 400, "Missing event_slug");
    const mode = body.mode === "reminder" ? "reminder" : "invite";
    const dryRun = body.dry_run !== false; // dry-run unless explicitly false

    try {
      const r = await convexClient.mutation(api.events.enqueueInvites, {
        internalSecret: secret,
        eventSlug: body.event_slug,
        audienceFilters: body.audience_filters,
        dryRun, mode,
      });
      // Flat response — GHL merge tags & admin UI both read top-level keys.
      return sendSuccess(res, {
        event_slug: r.eventSlug, tipo: r.tipo, mode: r.mode,
        dry_run: r.dryRun, queued: r.queued,
        audience_total: r.audienceTotal,
        already_invited: r.alreadyInvited,
        to_invite: r.toInvite,
        sample_contact_ids: r.sampleContactIds,
      });
    } catch (err) {
      // Only ConvexError.data survives Convex's prod error sanitization
      // (comment + mapping style per api/ghl-create-order.ts, which uses
      // msg.includes — not startsWith).
      const msg = err instanceof ConvexError
        ? (typeof err.data === "string" ? err.data : String(err.data))
        : err instanceof Error ? err.message : String(err);
      if (msg.includes("EVENT_NOT_FOUND")) return sendError(res, 404, "EVENT_NOT_FOUND", msg);
      if (msg.includes("EVENT_NOT_PUBLISHED")) return sendError(res, 409, "EVENT_NOT_PUBLISHED", msg);
      if (msg.includes("HIBRIDO_TEMPLATE_UNDECIDED")) return sendError(res, 422, "HIBRIDO_TEMPLATE_UNDECIDED", msg);
      if (msg.includes("UNAUTHORIZED")) return sendError(res, 401, "Unauthorized");
      throw err; // -> wrapper 500
    }
  },
  { methods: ["POST", "OPTIONS"], requireGoogle: false, errorPrefix: "GhlAutoEventInvite" },
);
```

## 5. Env vars

Document in `docs/ghl-commerce-integration.md`'s env table (the repo's home for these — `.env.example` has no GHL section):

| Var | Where | Notes |
|---|---|---|
| `WF_EVENT_PRESENCIAL_ID` | **Convex deployment env** (fan-out runs there) | GHL workflow that sends EV-01 (the presencial snippet); its trigger must allow API adds and it does the per-`canal_preferido` If/Else |
| `WF_EVENT_VIRTUAL_ID` | Convex deployment env | Same, sends EV-02 (virtual snippet) |
| `GHL_TOKEN`, `GHL_LOCATION_ID` | Convex deployment env | Already required there by `tagInactiveContacts` on the concurrent branch. **Docs drift**: the current env table marks them Vercel-only — fix the rows to "Vercel + Convex" in this PR |
| `GHL_API_SECRET` | Vercel **and now also Convex** deployment env | Existing Vercel var; the Convex copy powers the `enqueueInvites` `internalSecret` gate |
| `ADMIN_EMAILS`, `CONVEX_URL` | Vercel | Already exist |

Two small GHL workflows must be built in the GHL UI ("EV-01 sender", "EV-02 sender": trigger = added-via-API, action = send snippet per `canal_preferido`, using Custom Values `link-evento-presencial`/`link-evento-virtual`, SPEC-CONTINUACION.md:109-110). That is GHL config work, not repo code — list it in the PR checklist. (Note: the templates are the **EV-01/EV-02 snippets** from SPEC-CONTINUACION.md:27; no `evento_*_wa` template names exist in any spec.)

## 6. Test plan

- `tests/ghlPacer.test.ts` — injectable `now`/`sleep`: first `maxPerWindow` calls resolve without sleeping; call N+1 sleeps until the window frees; timestamps slide correctly; defaults are 80/10 000 ms.
- `tests/eventAudience.test.ts` — ciudad accent/case-insensitive ("Cali" matches "cali", "Bogotá" matches "bogota"); tags semantics; tipoInteres; empty filters returns all; unlinked clients (no `ghlContactId`) never appear (enforced upstream, assert the pure filter contract anyway via fixture).
- `tests/eventInvitePlan.test.ts` — already-`invited` skipped; `failed` retried; audience deduped by `ghlContactId`; `mode:"reminder"` independent of `mode:"invite"` rows.
- `tests/ghlConversations.test.ts` (extend — same fakeFetch/baseCfg fixtures already in the file) — `addContactToWorkflow`: exact URL `/contacts/{id}/workflow/{wfId}`, POST, `Authorization: Bearer pit-…`, `Version: 2021-07-28`, body `{}`; throws on `!ok`.
- Handler untested per repo convention (all branchy logic lives in the three pure modules + Convex).
- Manual smoke: (1) `create` a draft event, expect 409 on enqueue; `setStatus` → published; (2) dry-run POST → verify counts + `sample_contact_ids`, zero GHL calls, zero `eventInvites` rows; (3) `dry_run:false` with `audience_filters` narrowed to the three sanctioned test contacts ONLY (Kevin Tres Toj / Juan Ma Escobar / Isa La Negra Vikinga — permanent rule, GHL/ESTADO-Y-PROXIMOS-PASOS.md:183); (4) re-run → `already_invited` covers them, `to_invite: 0`; (5) direct Convex call to `events.enqueueInvites` with a wrong `internalSecret` → `UNAUTHORIZED`.
- `npm run test:unit`, `npm run lint` (typechecks src + api; convex/ typechecks on push), `npx convex dev` schema push in a dev deployment before prod.

## 7. Open business questions (Blueprint B — do not implement without answers)

- **Q-B1 — `audience_filters` vocabulary and semantics:** exact filter keys (ciudad/tags/tipo_interes assumed from `clients` fields, schema.ts:408-413), AND vs OR across keys, ALL vs ANY within `tags`. No spec defines this.
- **Q-B2 — `hibrido` events:** which template (EV-01, EV-02, both?). v1 returns 422 until decided.
- **Q-B3 — Contact universe:** Convex-linked clients only (this design, matching `tagInactiveContacts`) vs all GHL location contacts (would require a new GHL `POST /contacts/search` read helper and moves segmentation data ownership to GHL). Business call: are event invitees expected to exist in Convex?
- **Q-B4 — Reminder cadence:** SETUP-SPEC.md §5.3.2 (line 788) says daily-09:00 cron with `mode=reminder` for events ≤72 h, but WF-10 (line 1057) separately specs 3d/1d/2h reminders for RSVP'd contacts. Which applies to *invitees*, and may a contact receive more than one reminder? (Current ledger allows exactly one `reminder` row per contact.) Cron entry is phase 2, blocked on this.
- **Q-B5 — Marketing consent / DND:** EV-02 is a MARKETING template (EV-01 is listed utility in SPEC-CONTINUACION.md:258, but confirm). Should the segment exclude GHL DND contacts or contacts without explicit marketing opt-in? Strongly recommended before any non-test send; not implementable without the policy.
- **Q-B6 — Dry-run default:** blueprint defaults to dry-run (must pass `dry_run:false`). Confirm WF-12's webhook body will carry `"dry_run": false`, or flip the default for the bearer-auth path only.
- **Q-B7 — Variant 2 (direct send):** if the team insists the endpoint sends messages itself (per one spec variant), someone must first verify GHL v2 API can trigger approved WA template sends via `POST /conversations/messages`, and the `canal_preferido` value enumeration must be documented (it never is, anywhere — verified across GHL/*.md).
- **Q-B8 — Event creation auth:** `events.create`/`events.setStatus` follow the `ambassadors.create` precedent (public Convex mutation, no Convex-layer auth). `enqueueInvites` does NOT follow it — it gates on `internalSecret` because it can trigger a mass send and public mutations are directly reachable via the browser-bundled `VITE_CONVEX_URL`. Confirm whether create/setStatus need the same gate.

---

# Concurrent-branch integration notes (`feat/ghl-inactivity-scoring`)

Implement both blueprints **after that branch lands**, then rebase-check these touchpoints (all verified via `git diff --name-only main...HEAD`):

- `convex/_lib/ghlConversations.ts` + `tests/ghlConversations.test.ts` — created on that branch (commits `29ed2f7`, `852bf61`); Blueprint B appends `addContactToWorkflow` (merge conflict likely; trivial).
- `convex/crons.ts` — the branch's 07:00 UTC inactivity cron is in place, alongside 05:00 (ambassador scoring) and 23:00 (abandoned cart). Blueprint B's optional reminder cron slots at 14:00 UTC — no collision.
- `convex/ghl.ts` — hot on that branch; deliberately untouched by both blueprints (A adds to `convex/ambassadors.ts`, B creates `convex/events.ts`).
- `vercel.json` — the branch **did** add the four GHL/MP `functions` entries (lines 82–93: `ghl-create-order` 30s, `ghl-search-products`/`ghl-sync-contact`/`mp-webhook` 15s); both blueprints append one entry each — trivial adjacent-line conflict.
- Convex deployment env — that branch's cron already reads `GHL_TOKEN`/`GHL_LOCATION_ID` from Convex env (convex/ghl.ts:428-429); Blueprint B's `sendInvites` depends on them being set, and adds `GHL_API_SECRET` + `WF_EVENT_*_ID` there. `docs/ghl-commerce-integration.md`'s env table still says Vercel-only for GHL_TOKEN/GHL_LOCATION_ID — fix that drift in the same PR.
- `scripts/lib/backfill-tags.ts` on that branch emits `canal-evento` (line 38) / `ocasion-evento-especial` (line 31) tags — distinct namespace from `evento-{slug}-invitado`; no collision, but grep before renaming anything.
- Also on that branch (context, no overlap): `api/_lib/ghl-read.ts`, `api/_lib/ghl-client.ts` (added `isContactInactive` + `updateOpportunityStage`), `api/vitrina.ts` + `convex/vitrinas.ts` + `convex/schema.ts` (vitrinas table), `scripts/analyze-conversations.ts` / `scripts/apply-backfill.ts` + `scripts/lib/*`.

Key reference files for the implementer: `/Users/kevinp/Movies/coomunity-universe/TierraMadre/api/ghl-sync-contact.ts` (handler template), `/Users/kevinp/Movies/coomunity-universe/TierraMadre/api/ghl-create-order.ts` (ConvexError→HTTP mapping, `msg.includes` style), `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/ghl.ts` (internalAction + ConvexError patterns; `upsertClient` first-touch helper at line 97), `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/_lib/ghlConversations.ts` (GHL mirror + sync rule + `impl`/`headers` helpers), `/Users/kevinp/Movies/coomunity-universe/TierraMadre/api/_lib/bearer.ts`, `/Users/kevinp/Movies/coomunity-universe/TierraMadre/convex/schema.ts` (ambassadors table lines 426–460, clients GHL fields + indexes lines 397–424), `/Users/kevinp/Movies/coomunity-universe/TierraMadre/vercel.json` (functions block lines 3–94; GHL entries 82–93).
