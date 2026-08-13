# Catalog Access Control — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `/api/get-treasure-sheets` and six sibling endpoints from publishing prices, location, asesor and stock status to anonymous callers, while keeping staff and vitrina share links working exactly as they do today.

**Architecture:** Each request resolves to exactly one _grant_ (`staff` | `vitrina` | `anon`) server-side. An allowlist projection then builds the response objects field by field — never strips fields from a copy — so a newly added field is invisible until someone deliberately publishes it. The browser attaches `Authorization: Bearer` when signed in, and forwards a stateful vitrina token as `?vitrina=<token>` when viewing a share link.

**Tech Stack:** TypeScript, Vercel serverless functions (`api/`), Vitest, React 18, Convex (vitrina token lookup only).

**Spec:** `docs/superpowers/specs/2026-08-05-control-de-acceso-al-catalogo-design.md`

## Global Constraints

- **Allowlist, never denylist.** `toPublicItem` constructs a new object naming safe fields. Never `delete obj.precioCOP` or spread-and-omit.
- **Never throw during grant resolution.** Malformed, expired, forged, or absent credentials all resolve to `anon`. Catalog reads must stay available.
- **`PUBLIC_KEYS` is exactly these 11 fields**, per the approved spec: `item`, `nombre`, `peso`, `color`, `calidad`, `talla`, `medidas`, `medidasValores`, `categoria`, `coleccion`, `isJewelry`.
- **A numeric id is not a credential.** `?vitrina=` values matching `/^\d+([-,]\d+)*$/` are id-lists — guessable — and MUST resolve to `anon`. Only an unguessable stateful Convex token grants `vitrina`.
- **Bearer tokens come in two forms.** `readFreshAuthToken()` returns a raw Google ID token _or_ a `tms1` session token. Server verification must accept both — reuse the exact pattern in `api/vitrina.ts:42-60`.
- **Task 7 is the only behaviour change for anonymous users.** Tasks 1–6 ship first and change nothing user-visible. Do not merge 7 until 6 is confirmed in production.
- Tests live in `tests/*.test.ts` (node env) for `api/_lib` modules, co-located `src/**/*.test.ts` for frontend. Run with `npx vitest run <path>`.
- Commit messages: imperative Spanish subject, matching repo convention.

---

### Task 1: The allowlist projection

**Files:**

- Create: `api/_lib/catalogProjection.ts`
- Test: `tests/catalogProjection.test.ts`

**Interfaces:**

- Consumes: `TreasureItem` from `../src/types/index.ts` (already imported this way by `api/get-treasure-sheets.ts:9`)
- Produces:
  - `PUBLIC_KEYS: readonly string[]`
  - `type Grant = { kind: 'staff' } | { kind: 'vitrina'; itemIds: number[] } | { kind: 'anon' }`
  - `toPublicItem(item: TreasureItem): PublicItem`
  - `projectForGrant(items: TreasureItem[], grant: Grant): (TreasureItem | PublicItem)[]`

- [ ] **Step 1: Write the failing test**

Create `tests/catalogProjection.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  PUBLIC_KEYS,
  toPublicItem,
  projectForGrant,
} from '../api/_lib/catalogProjection';
import type { TreasureItem } from '../src/types/index.ts';

// A row shaped like what get-treasure-sheets actually emits today (23 keys).
const ROW = {
  item: 1,
  fechaIngreso: '31-oct-2025',
  nombre: 'Rey Midas',
  peso: 1.47,
  color: 'Verde Natural',
  calidad: 'COMERCIAL FINA',
  cantidad: 1,
  talla: 'Esmeralda',
  medidas: '',
  medidasValores: '',
  categoria: 'Gema',
  precioCOP: 635000,
  precioInternacional: 200000,
  ubicacion: 'ASESOR',
  asesor: 'M.Campuzano',
  estado: 'VENDIDA',
  qr: 'https://tierramadre.app/p/1',
  coleccion: '#4000',
  caja: 'C-12',
  asesorActual: 'M.Campuzano',
  estadoAsesor: 'VENDIDA',
  isJewelry: false,
  sheetRow: 42,
} as unknown as TreasureItem;

describe('toPublicItem', () => {
  it('emits only allowlisted keys', () => {
    const out = toPublicItem(ROW);
    expect(Object.keys(out).sort()).toEqual([...PUBLIC_KEYS].sort());
  });

  it('withholds every commercially sensitive field', () => {
    const out = toPublicItem(ROW) as Record<string, unknown>;
    for (const key of [
      'precioCOP',
      'precioInternacional',
      'ubicacion',
      'caja',
      'estado',
      'cantidad',
      'asesor',
      'asesorActual',
      'estadoAsesor',
      'fechaIngreso',
      'sheetRow',
      'qr',
    ]) {
      expect(out[key]).toBeUndefined();
    }
  });

  it('keeps the fields that sell the stone', () => {
    const out = toPublicItem(ROW);
    expect(out.item).toBe(1);
    expect(out.nombre).toBe('Rey Midas');
    expect(out.peso).toBe(1.47);
    expect(out.calidad).toBe('COMERCIAL FINA');
  });

  it('does not mutate its input', () => {
    const before = JSON.stringify(ROW);
    toPublicItem(ROW);
    expect(JSON.stringify(ROW)).toBe(before);
  });
});

describe('projectForGrant', () => {
  it('returns staff rows untouched', () => {
    const [out] = projectForGrant([ROW], { kind: 'staff' });
    expect(out).toBe(ROW);
  });

  it('projects everything for anon', () => {
    const [out] = projectForGrant([ROW], { kind: 'anon' }) as Record<
      string,
      unknown
    >[];
    expect(out.precioCOP).toBeUndefined();
  });

  it('restores full rows only for the items a vitrina grants', () => {
    const other = { ...ROW, item: 2 } as TreasureItem;
    const out = projectForGrant([ROW, other], {
      kind: 'vitrina',
      itemIds: [1],
    }) as Record<string, unknown>[];
    expect(out[0].precioCOP).toBe(635000); // granted
    expect(out[1].precioCOP).toBeUndefined(); // not in this vitrina
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/catalogProjection.test.ts`
Expected: FAIL — `Failed to resolve import "../api/_lib/catalogProjection"`

- [ ] **Step 3: Write the implementation**

Create `api/_lib/catalogProjection.ts`:

```ts
/**
 * Field-level projection for catalog reads.
 *
 * ALLOWLIST, NOT DENYLIST. `toPublicItem` builds a new object naming the safe
 * fields. A denylist would fail OPEN — whoever adds a field and forgets to
 * classify it creates a silent leak. This fails CLOSED: a new field is
 * invisible until someone deliberately adds it to PUBLIC_KEYS.
 *
 * See docs/superpowers/specs/2026-08-05-control-de-acceso-al-catalogo-design.md
 */
import type { TreasureItem } from '../src/types/index.ts';

/** The only fields an anonymous caller ever sees. */
export const PUBLIC_KEYS = [
  'item',
  'nombre',
  'peso',
  'color',
  'calidad',
  'talla',
  'medidas',
  'medidasValores',
  'categoria',
  'coleccion',
  'isJewelry',
] as const;

/**
 * Everything else on TreasureItem. Listed explicitly so the exhaustiveness
 * check below can prove no field is unclassified. Several of these
 * (procedencia, mina, tipoEsmeralda, tratamiento, certificateUrl, the media
 * fields) are plausible future public fields — promote them deliberately by
 * moving them to PUBLIC_KEYS, never by loosening the projection.
 */
export const WITHHELD_KEYS = [
  'fechaIngreso',
  'cantidad',
  'imagen',
  'mediaType',
  'thumbnailUrl',
  'videoUrl',
  'posterUrl',
  'galleryCount',
  'tinyThumb',
  'costoTM',
  'precioCOP',
  'precioInternacional',
  'ubicacion',
  'asesor',
  'estado',
  'asesorActual',
  'estadoAsesor',
  'caja',
  'qr',
  'metalType',
  'certifications',
  'chainOfCustody',
  'aestheticRating',
  'demandIndicator',
  'imageGallery',
  'imageVerificationStatus',
  'lastImageVerification',
  'city',
  'isVaultExclusive',
  'certificateUrl',
  'procedencia',
  'loteId',
  'preponderancia',
  'publishedAt',
  'tipoEsmeralda',
  'nivelRareza',
  'calificacion',
  'tipoJoya',
  'tecnicaJoya',
  'minerales',
  'complementos',
  'mina',
  'tratamiento',
  'precioEspecial',
  'syncStatus',
  'syncError',
  'sheetRow',
  'description',
  'isLote',
  'groupKind',
  'groupId',
  'loteItems',
] as const;

export type PublicItem = Pick<TreasureItem, (typeof PUBLIC_KEYS)[number]>;

// Compile-time exhaustiveness: adding a field to TreasureItem without putting
// it in PUBLIC_KEYS or WITHHELD_KEYS breaks the build here, on purpose.
type Classified = (typeof PUBLIC_KEYS)[number] | (typeof WITHHELD_KEYS)[number];
type Unclassified = Exclude<keyof TreasureItem, Classified>;
const _exhaustive: Unclassified extends never
  ? true
  : ['unclassified TreasureItem field:', Unclassified] = true;
void _exhaustive;

export type Grant =
  | { kind: 'staff' }
  | { kind: 'vitrina'; itemIds: number[] }
  | { kind: 'anon' };

/** Builds a new object containing only PUBLIC_KEYS. Never mutates `item`. */
export function toPublicItem(item: TreasureItem): PublicItem {
  return {
    item: item.item,
    nombre: item.nombre,
    peso: item.peso,
    color: item.color,
    calidad: item.calidad,
    talla: item.talla,
    medidas: item.medidas,
    medidasValores: item.medidasValores,
    categoria: item.categoria,
    coleccion: item.coleccion,
    isJewelry: item.isJewelry,
  };
}

export function projectForGrant(
  items: TreasureItem[],
  grant: Grant,
): (TreasureItem | PublicItem)[] {
  if (grant.kind === 'staff') return items;
  if (grant.kind === 'vitrina') {
    const granted = new Set(grant.itemIds);
    return items.map((i) => (granted.has(i.item) ? i : toPublicItem(i)));
  }
  return items.map(toPublicItem);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/catalogProjection.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 5: Verify the exhaustiveness guard actually guards**

Temporarily add `nuevoCampo?: string;` to the `TreasureItem` interface in `src/types/index.ts`, then run:

Run: `npx tsc --noEmit -p api/tsconfig.json`
Expected: FAIL, pointing at `_exhaustive` in `catalogProjection.ts`

Remove `nuevoCampo` again and re-run — expected: no new errors. (Two pre-existing `api/cotizacion-deck.ts` TS7016 errors are unrelated and expected.)

- [ ] **Step 6: Commit**

```bash
git add api/_lib/catalogProjection.ts tests/catalogProjection.test.ts
git commit -m "feat(api): la proyección pública nombra lo seguro en vez de borrar lo sensible"
```

---

### Task 2: Grant resolution

**Files:**

- Create: `api/_lib/catalogGrant.ts`
- Test: `tests/catalogGrant.test.ts`

**Interfaces:**

- Consumes: `Grant` from Task 1; `extractBearer` from `./bearer.js`; `isSessionToken`, `verifySessionToken` from `./sessionToken.js`
- Produces: `resolveGrant(req, deps?): Promise<Grant>` and `type VitrinaLookup = (token: string) => Promise<{ itemIds: number[] } | null>`

The vitrina lookup is injected so tests never touch Convex.

- [ ] **Step 1: Write the failing test**

Create `tests/catalogGrant.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { resolveGrant } from '../api/_lib/catalogGrant';
import { mintSessionToken } from '../api/_lib/sessionToken';

process.env.ADMIN_SYNC_TOKEN = 'test-secret-for-grants';

const req = (headers = {}, query = {}) => ({ headers, query }) as never;

const neverCalled = vi.fn(async () => {
  throw new Error('vitrina lookup must not be called');
});

describe('resolveGrant', () => {
  it('is anon with no credentials at all', async () => {
    expect(await resolveGrant(req(), { lookupVitrina: neverCalled })).toEqual({
      kind: 'anon',
    });
  });

  it('is anon for a malformed bearer token', async () => {
    const g = await resolveGrant(
      req({ authorization: 'Bearer not-a-real-token' }),
      { lookupVitrina: neverCalled },
    );
    expect(g).toEqual({ kind: 'anon' });
  });

  it('is staff for a valid session token', async () => {
    const token = mintSessionToken('asesor@tierramadre.app');
    const g = await resolveGrant(req({ authorization: `Bearer ${token}` }), {
      lookupVitrina: neverCalled,
    });
    expect(g).toEqual({ kind: 'staff' });
  });

  it('is anon when ?vitrina is an id-list — a number is not a credential', async () => {
    for (const guessable of ['368', '368,412', '368-412']) {
      const g = await resolveGrant(req({}, { vitrina: guessable }), {
        lookupVitrina: neverCalled,
      });
      expect(g).toEqual({ kind: 'anon' });
    }
  });

  it('is vitrina for a stateful token that resolves', async () => {
    const lookupVitrina = vi.fn(async () => ({ itemIds: [368, 412] }));
    const g = await resolveGrant(req({}, { vitrina: 'AB3K9P2Q4R7S' }), {
      lookupVitrina,
    });
    expect(g).toEqual({ kind: 'vitrina', itemIds: [368, 412] });
    expect(lookupVitrina).toHaveBeenCalledWith('AB3K9P2Q4R7S');
  });

  it('is anon when the stateful token does not resolve', async () => {
    const g = await resolveGrant(req({}, { vitrina: 'DEADBEEF1234' }), {
      lookupVitrina: async () => null,
    });
    expect(g).toEqual({ kind: 'anon' });
  });

  it('is anon — never throws — when the lookup itself fails', async () => {
    const g = await resolveGrant(req({}, { vitrina: 'AB3K9P2Q4R7S' }), {
      lookupVitrina: async () => {
        throw new Error('convex down');
      },
    });
    expect(g).toEqual({ kind: 'anon' });
  });

  it('prefers staff over vitrina when both are present', async () => {
    const token = mintSessionToken('asesor@tierramadre.app');
    const g = await resolveGrant(
      req({ authorization: `Bearer ${token}` }, { vitrina: 'AB3K9P2Q4R7S' }),
      { lookupVitrina: neverCalled },
    );
    expect(g).toEqual({ kind: 'staff' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/catalogGrant.test.ts`
Expected: FAIL — cannot resolve `../api/_lib/catalogGrant`

- [ ] **Step 3: Write the implementation**

Create `api/_lib/catalogGrant.ts`:

```ts
/**
 * Resolves exactly one grant per catalog request: staff | vitrina | anon.
 *
 * NEVER THROWS. Anything malformed, expired, forged, or unreachable resolves
 * to `anon` — catalog reads stay available, they just carry less.
 *
 * A numeric id-list is NOT a credential: `/v/368,412` is guessable by anyone,
 * and `/p/368` is literally a one-item stateless vitrina (VitrinaPage.tsx:198).
 * Only an unguessable stateful Convex token grants price visibility.
 */
import type { VercelRequest } from '@vercel/node';
import { extractBearer } from './bearer.js';
import { isSessionToken, verifySessionToken } from './sessionToken.js';
import type { Grant } from './catalogProjection.js';

/** Same shape check VitrinaContent uses (VitrinaPage.tsx:57). */
const ID_LIST_RE = /^\d+([-,]\d+)*$/;

export type VitrinaLookup = (
  token: string,
) => Promise<{ itemIds: number[] } | null>;

export interface ResolveGrantDeps {
  lookupVitrina: VitrinaLookup;
}

/** Accepts a `tms1` session token OR a raw Google ID token (api/vitrina.ts:42). */
async function verifiedEmail(
  authHeader?: string | string[],
): Promise<string | null> {
  const token = extractBearer(authHeader);
  if (!token) return null;
  if (isSessionToken(token)) {
    return verifySessionToken(token)?.email ?? null;
  }
  const audiences = [
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.VITE_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ].filter((a): a is string => !!a && a.trim().length > 0);
  if (audiences.length === 0) return null;
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const ticket = await new OAuth2Client().verifyIdToken({
      idToken: token,
      audience: audiences,
    });
    return ticket.getPayload()?.email?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export async function resolveGrant(
  req: VercelRequest,
  deps: ResolveGrantDeps,
): Promise<Grant> {
  try {
    if (await verifiedEmail(req.headers?.authorization)) {
      return { kind: 'staff' };
    }
  } catch {
    /* fall through to anon */
  }

  const raw = req.query?.vitrina;
  const code = Array.isArray(raw) ? raw[0] : raw;
  if (typeof code === 'string' && code && !ID_LIST_RE.test(code)) {
    try {
      const doc = await deps.lookupVitrina(code);
      if (doc && Array.isArray(doc.itemIds)) {
        return { kind: 'vitrina', itemIds: doc.itemIds };
      }
    } catch {
      /* convex unreachable — degrade, don't break the page */
    }
  }

  return { kind: 'anon' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/catalogGrant.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add api/_lib/catalogGrant.ts tests/catalogGrant.test.ts
git commit -m "feat(api): un grant por petición — el id numérico no prueba nada"
```

---

### Task 3: The browser sends its session token

**Files:**

- Modify: `src/hooks/useSheetsTreasure.ts:111`
- Modify: `src/hooks/useNewestProducts.ts:107`
- Modify: `src/hooks/useAsesores.ts:82`
- Modify: `src/hooks/useAsesorCollection.ts:59`
- Create: `src/utils/catalogAuthHeaders.ts`
- Test: `src/utils/catalogAuthHeaders.test.ts`

**Interfaces:**

- Consumes: `readFreshAuthToken()` from `./sessionToken`
- Produces: `catalogRequestInit(vitrinaToken?: string): RequestInit | undefined`

One helper keeps the four call sites identical and gives Task 4 a place to add the vitrina token.

- [ ] **Step 1: Write the failing test**

Create `src/utils/catalogAuthHeaders.test.ts`:

```ts
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above the imports, so its factory cannot close over a
// plain `let` (TDZ). vi.hoisted gives it a box that exists early enough.
// vi.spyOn on an ESM named export does NOT reliably intercept — use this.
const auth = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('./sessionToken', () => ({
  readFreshAuthToken: () => auth.token,
}));

import { catalogRequestInit } from './catalogAuthHeaders';

describe('catalogRequestInit', () => {
  beforeEach(() => {
    auth.token = null;
  });

  it('returns undefined when there is no token — anonymous stays anonymous', () => {
    expect(catalogRequestInit()).toBeUndefined();
  });

  it('attaches a Bearer header when signed in', () => {
    auth.token = 'tms1.abc.def';
    expect(catalogRequestInit()).toEqual({
      headers: { Authorization: 'Bearer tms1.abc.def' },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/catalogAuthHeaders.test.ts`
Expected: FAIL — cannot resolve `./catalogAuthHeaders`

- [ ] **Step 3: Write the implementation**

Create `src/utils/catalogAuthHeaders.ts`:

```ts
/**
 * Builds the RequestInit for catalog reads.
 *
 * Returns `undefined` when there is nothing to send, so anonymous requests
 * stay byte-identical to what they were before access control landed.
 */
import { readFreshAuthToken } from './sessionToken';

export function catalogRequestInit(): RequestInit | undefined {
  const token = readFreshAuthToken();
  if (!token) return undefined;
  return { headers: { Authorization: `Bearer ${token}` } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/catalogAuthHeaders.test.ts`
Expected: PASS — 2 tests

- [ ] **Step 5: Wire the four call sites**

In `src/hooks/useSheetsTreasure.ts`, `src/hooks/useNewestProducts.ts`, and `src/hooks/useAsesores.ts`, add the import and replace the `undefined` second argument:

```ts
import { catalogRequestInit } from '../utils/catalogAuthHeaders';

// before: fetchWithRetry('/api/get-treasure-sheets', undefined, { ... })
// after:
const response = await fetchWithRetry(
  '/api/get-treasure-sheets',
  catalogRequestInit(),
  { retries: 3 /* ...unchanged options... */ },
);
```

`src/hooks/useAsesorCollection.ts:59` uses a bare `fetch` with no init at all — it is the only one that needs a second argument introduced:

```ts
// before: await fetch(`/api/get-collection?folder=${encodeURIComponent(folder)}`)
// after:
const response = await fetch(
  `/api/get-collection?folder=${encodeURIComponent(folder)}`,
  catalogRequestInit(),
);
```

- [ ] **Step 6: Verify nothing broke**

Run: `npm run lint`
Expected: no new errors (two pre-existing `api/cotizacion-deck.ts` TS7016 errors remain)

Run: `npm run test:unit`
Expected: same pass/fail counts as before this task, plus the 2 new tests. `tests/quietEmeraldShim.test.ts` is a known pre-existing failure — unrelated.

- [ ] **Step 7: Commit**

```bash
git add src/utils/catalogAuthHeaders.ts src/utils/catalogAuthHeaders.test.ts \
        src/hooks/useSheetsTreasure.ts src/hooks/useNewestProducts.ts \
        src/hooks/useAsesores.ts src/hooks/useAsesorCollection.ts
git commit -m "feat(app): el catálogo se identifica cuando hay sesión"
```

---

### Task 4: The vitrina token reaches the API

**Files:**

- Modify: `src/utils/catalogAuthHeaders.ts`
- Modify: `src/utils/catalogAuthHeaders.test.ts`
- Modify: `src/hooks/useSheetsTreasure.ts`
- Modify: `src/hooks/useTreasure.ts`
- Modify: `src/pages/vitrina/VitrinaPage.tsx:184-198`

**Interfaces:**

- Consumes: `catalogRequestInit` from Task 3
- Produces: `useTreasure({ vitrinaToken }?: { vitrinaToken?: string })` — the option is optional, so every existing caller compiles unchanged.

Without this task the `vitrina` grant is unreachable and share links lose their prices. `VitrinaContent` knows the code as a React route param; the fetch never carried it.

- [ ] **Step 1: Write the failing test**

Append to `src/utils/catalogAuthHeaders.test.ts`:

```ts
describe('catalogUrl — vitrina passthrough', () => {
  it('appends the token so the server can resolve the grant', () => {
    expect(catalogUrl('/api/get-treasure-sheets', 'AB3K9P2Q4R7S')).toBe(
      '/api/get-treasure-sheets?vitrina=AB3K9P2Q4R7S',
    );
  });

  it('leaves the URL alone with no vitrina token', () => {
    expect(catalogUrl('/api/get-treasure-sheets')).toBe(
      '/api/get-treasure-sheets',
    );
  });

  it('does not forward an id-list — a number is not a credential', () => {
    expect(catalogUrl('/api/get-treasure-sheets', '368')).toBe(
      '/api/get-treasure-sheets',
    );
    expect(catalogUrl('/api/get-treasure-sheets', '368,412')).toBe(
      '/api/get-treasure-sheets',
    );
  });
});
```

Change the import at the top of the file to
`import { catalogRequestInit, catalogUrl } from './catalogAuthHeaders';`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/catalogAuthHeaders.test.ts`
Expected: FAIL — `catalogUrl is not exported`

- [ ] **Step 3: Write the implementation**

Append to `src/utils/catalogAuthHeaders.ts`:

```ts
/** Mirrors ID_LIST_RE in VitrinaPage.tsx:57 — id-lists prove nothing. */
const ID_LIST_RE = /^\d+([-,]\d+)*$/;

/**
 * Appends `?vitrina=<token>` for stateful share tokens only. Filtering
 * id-lists here saves a pointless round trip; the server rejects them too.
 */
export function catalogUrl(path: string, vitrinaToken?: string): string {
  if (!vitrinaToken || ID_LIST_RE.test(vitrinaToken)) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}vitrina=${encodeURIComponent(vitrinaToken)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/catalogAuthHeaders.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Thread the token through**

In `src/hooks/useSheetsTreasure.ts`, give `fetchFromSheets` an optional token and use `catalogUrl`:

```ts
async function fetchFromSheets(
  notifyOnFailure = false,
  vitrinaToken?: string,
): Promise<TreasureItem[]> {
  const response = await fetchWithRetry(
    catalogUrl('/api/get-treasure-sheets', vitrinaToken),
    catalogRequestInit(),
    { retries: 3 /* ...unchanged... */ },
  );
  // ...unchanged...
}
```

Thread the same optional parameter through `useTreasure` in `src/hooks/useTreasure.ts` as `useTreasure({ vitrinaToken }: { vitrinaToken?: string } = {})`, defaulting to `{}` so all existing call sites compile untouched.

In `src/pages/vitrina/VitrinaPage.tsx`, `VitrinaContent` already computes `isIdList` at line 198. Move that computation above the `useTreasure()` call at line 189 and pass the token:

```ts
const isIdList = ID_LIST_RE.test(code);
const { treasure, isLoadingSheets } = useTreasure({
  vitrinaToken: isIdList ? undefined : code,
});
```

- [ ] **Step 6: Verify**

Run: `npm run lint`
Expected: no new errors

Run: `npm run test:unit`
Expected: no new failures

- [ ] **Step 7: Commit**

```bash
git add src/utils/catalogAuthHeaders.ts src/utils/catalogAuthHeaders.test.ts \
        src/hooks/useSheetsTreasure.ts src/hooks/useTreasure.ts \
        src/pages/vitrina/VitrinaPage.tsx
git commit -m "feat(app): el token de vitrina viaja hasta el API"
```

---

### Task 5: Close the localStorage leak

**Files:**

- Modify: `src/hooks/useSheetsTreasure.ts` (cache key)
- Modify: `src/contexts/AuthContext.tsx:190-193` (logout)
- Test: `src/hooks/treasureCacheKey.test.ts`
- Create: `src/hooks/treasureCacheKey.ts`

**Interfaces:**

- Produces: `treasureCacheKey(): string` and `clearTreasureCaches(): void`

Without this, everything the server does is undone locally: `logout()` never clears `TREASURE_SHEETS_CACHE`, so the full catalog — prices, asesor, ubicación — survives sign-out on any device staff has used, and a guest reads it straight from `localStorage`.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/treasureCacheKey.test.ts`:

```ts
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Same hoisting rule as catalogAuthHeaders.test.ts — see the note there.
const auth = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('../utils/sessionToken', () => ({
  readFreshAuthToken: () => auth.token,
}));

import { treasureCacheKey, clearTreasureCaches } from './treasureCacheKey';
import { STORAGE_KEYS } from '../constants/storage-keys';

describe('treasureCacheKey', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.token = null;
  });
  afterEach(() => localStorage.clear());

  it('separates the signed-in cache from the anonymous one', () => {
    const anon = treasureCacheKey();
    auth.token = 'tms1.abc.def';
    expect(treasureCacheKey()).not.toBe(anon);
  });

  it('clears every treasure cache, whatever the grant', () => {
    localStorage.setItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:staff`, '1');
    localStorage.setItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:anon`, '1');
    localStorage.setItem(STORAGE_KEYS.TREASURE_SHEETS_CACHE, '1');
    localStorage.setItem('unrelated-key', 'keep me');

    clearTreasureCaches();

    expect(
      localStorage.getItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:staff`),
    ).toBeNull();
    expect(
      localStorage.getItem(`${STORAGE_KEYS.TREASURE_SHEETS_CACHE}:anon`),
    ).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.TREASURE_SHEETS_CACHE)).toBeNull();
    expect(localStorage.getItem('unrelated-key')).toBe('keep me');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/treasureCacheKey.test.ts`
Expected: FAIL — cannot resolve `./treasureCacheKey`

- [ ] **Step 3: Write the implementation**

Create `src/hooks/treasureCacheKey.ts`:

```ts
/**
 * The catalog cache is keyed by grant, and cleared on logout.
 *
 * Without both, the server-side projection is defeated locally: the
 * full-fidelity payload an asesor cached would still be sitting in
 * localStorage for the next person to use this device.
 */
import { readFreshAuthToken } from '../utils/sessionToken';
import { STORAGE_KEYS } from '../constants/storage-keys';

const BASE = STORAGE_KEYS.TREASURE_SHEETS_CACHE;

export function treasureCacheKey(): string {
  return `${BASE}:${readFreshAuthToken() ? 'staff' : 'anon'}`;
}

/** Removes every grant-scoped cache plus the pre-grant legacy key. */
export function clearTreasureCaches(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key === BASE || key.startsWith(`${BASE}:`)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/treasureCacheKey.test.ts`
Expected: PASS — 2 tests

- [ ] **Step 5: Use the key and clear on logout**

In `src/hooks/useSheetsTreasure.ts`, replace every read and write of the module-level `SHEETS_CACHE_KEY` constant with a call to `treasureCacheKey()`. (It is used in the cache read and the cache write helpers near lines 90-105.)

In `src/contexts/AuthContext.tsx`, extend `logout` (line 190):

```ts
const logout = useCallback(() => {
  setAuthState({ isAuthenticated: false, accessLevel: 'guest' });
  clearStoredAuth();
  localStorage.removeItem(GUEST_PERSIST_KEY);
  // The catalog cache outlives the session otherwise — see
  // docs/superpowers/specs/2026-08-05-control-de-acceso-al-catalogo-design.md
  clearTreasureCaches();
}, []);
```

Add `import { clearTreasureCaches } from '../hooks/treasureCacheKey';` at the top.

- [ ] **Step 6: Verify**

Run: `npm run lint && npm run test:unit`
Expected: no new failures

- [ ] **Step 7: Commit**

```bash
git add src/hooks/treasureCacheKey.ts src/hooks/treasureCacheKey.test.ts \
        src/hooks/useSheetsTreasure.ts src/contexts/AuthContext.tsx
git commit -m "fix(app): la caché del catálogo ya no sobrevive al logout"
```

---

### Task 6: Endpoints resolve the grant (no behaviour change — deploy 1)

**Files:**

- Create: `api/_lib/vitrinaLookup.ts`
- Modify: `api/get-treasure-sheets.ts:308-395`

**Interfaces:**

- Consumes: `resolveGrant` (Task 2), `Grant` (Task 1)
- Produces: `lookupVitrina: VitrinaLookup` backed by Convex

This task resolves and logs the grant but still returns the full payload. Ship it, confirm from logs that real staff requests resolve to `staff`, and only then merge Task 7. That is the whole two-deploy rollout — no feature flag to clean up.

- [ ] **Step 1: Write the Convex-backed lookup**

Create `api/_lib/vitrinaLookup.ts`:

```ts
/**
 * Resolves a stateful vitrina token to its item ids via Convex.
 * Returns null for anything that does not resolve — resolveGrant treats that
 * exactly like "no credential presented".
 */
import { convexClient, isConvexEnabled } from './convex-client.js';
import { api } from '../../convex/_generated/api.js';
import type { VitrinaLookup } from './catalogGrant.js';

export const lookupVitrina: VitrinaLookup = async (token) => {
  if (!isConvexEnabled || !convexClient) return null;
  const doc = (await convexClient.query(api.vitrinas.getByToken, {
    token,
  })) as { itemIds?: number[] } | null;
  if (!doc || !Array.isArray(doc.itemIds)) return null;
  return { itemIds: doc.itemIds };
};
```

- [ ] **Step 2: Resolve and log the grant**

In `api/get-treasure-sheets.ts`, add the imports:

```ts
import { resolveGrant } from './_lib/catalogGrant.js';
import { lookupVitrina } from './_lib/vitrinaLookup.js';
```

Inside the `withApiHandler` callback (starting line 309), resolve the grant right after destructuring `ctx`:

```ts
const { sheets } = ctx as { sheets: sheets_v4.Sheets };
const grant = await resolveGrant(req, { lookupVitrina });
console.log('[catalog] grant', grant.kind);
```

Do **not** apply the projection yet — the response stays exactly as it is today.

- [ ] **Step 3: Report a rejected token so the client can recover**

Without this, an asesor whose 30-day token expired silently would watch prices
disappear in Task 7 and conclude the app broke. The response must say that a
credential was offered and refused.

In `api/_lib/catalogGrant.ts`, add a second export that reports the distinction
(`resolveGrant` itself is unchanged — it still only returns a `Grant`):

```ts
/**
 * True when the caller DID present a bearer token and it did not verify.
 * Distinguishes "never signed in" (fine, stay anonymous) from "session died"
 * (recoverable — the client should refresh and retry).
 */
export function bearerWasRejected(req: VercelRequest, grant: Grant): boolean {
  if (grant.kind === 'staff') return false;
  return extractBearer(req.headers?.authorization) !== null;
}
```

Add the matching cases to `tests/catalogGrant.test.ts`:

```ts
describe('bearerWasRejected', () => {
  it('is false when no token was ever offered', async () => {
    const r = req();
    expect(
      bearerWasRejected(
        r,
        await resolveGrant(r, { lookupVitrina: neverCalled }),
      ),
    ).toBe(false);
  });

  it('is true when a token was offered and refused', async () => {
    const r = req({ authorization: 'Bearer expired-or-forged' });
    expect(
      bearerWasRejected(
        r,
        await resolveGrant(r, { lookupVitrina: neverCalled }),
      ),
    ).toBe(true);
  });

  it('is false for a token that verified', async () => {
    const r = req({ authorization: `Bearer ${mintSessionToken('a@b.co')}` });
    expect(
      bearerWasRejected(
        r,
        await resolveGrant(r, { lookupVitrina: neverCalled }),
      ),
    ).toBe(false);
  });
});
```

Import `bearerWasRejected` at the top of the test file.

In `api/get-treasure-sheets.ts`, include the flag in the success response:

```ts
...(bearerWasRejected(req, grant) ? { tokenRejected: true } : {}),
```

- [ ] **Step 4: Have the client refresh once on rejection**

In `src/hooks/useSheetsTreasure.ts`, after parsing the JSON result, retry a
single time through the existing session-refresh path:

```ts
if (result.tokenRejected && !isRetry) {
  await ensureAppSession(); // src/utils/sessionToken.ts
  return fetchFromSheets(notifyOnFailure, vitrinaToken, true);
}
```

Add `isRetry = false` as the third parameter of `fetchFromSheets` and import
`ensureAppSession` from `../utils/sessionToken`. The `isRetry` guard is what
stops a permanently dead session from looping.

- [ ] **Step 5: Verify the endpoint still returns everything**

Run: `npx vitest run tests/catalogGrant.test.ts`
Expected: PASS — 11 tests

Run: `npm run lint`
Expected: no new errors

Run: `npm run build`
Expected: build succeeds

- [ ] **Step 6: Commit**

```bash
git add api/_lib/vitrinaLookup.ts api/_lib/catalogGrant.ts \
        api/get-treasure-sheets.ts tests/catalogGrant.test.ts \
        src/hooks/useSheetsTreasure.ts
git commit -m "feat(api): el catálogo ya sabe quién pregunta (sin cambiar lo que responde)"
```

- [ ] **Step 7: Deploy and confirm before continuing**

Merge to `main`, wait for the Vercel deploy, then check the function logs for `[catalog] grant staff` on real signed-in traffic. **Do not start Task 7 until you have seen it.** If staff requests are resolving to `anon`, Task 3 or 4 is not wired correctly and projecting now would hide prices from your own team.

---

### Task 7: Apply the projection (deploy 2 — the behaviour change)

**Files:**

- Modify: `api/get-treasure-sheets.ts`
- Modify: `api/get-newest-products.js`
- Modify: `api/get-inventory-rows.ts`
- Modify: `api/get-table.ts`
- Modify: `api/get-table-rows.ts`
- Modify: `api/get-collection.js`
- Modify: `api/get-asesores.ts`

- [ ] **Step 1: Project in get-treasure-sheets**

In `api/get-treasure-sheets.ts`, import `projectForGrant` from `./_lib/catalogProjection.js`, then change the success response (line 378) so the array is projected:

```ts
return sendSuccess(res, {
  treasure: projectForGrant(treasure, grant),
  count: treasure.length,
  sheetName: targetSheet,
  lastUpdated: new Date().toISOString(),
  ...(includeDebug
    ? {
        /* ...unchanged... */
      }
    : {}),
});
```

Also remove `sheetName` and the `_debug` block from anonymous responses — both describe the internal sheet layout:

```ts
...(grant.kind === 'staff' ? { sheetName: targetSheet } : {}),
```

- [ ] **Step 2: Repeat for the other six endpoints**

Each of `get-newest-products.js`, `get-inventory-rows.ts`, `get-table.ts`, `get-table-rows.ts`, `get-collection.js`, `get-asesores.ts` follows the same three edits: import `resolveGrant` + `lookupVitrina` + `projectForGrant`, resolve the grant at the top of the handler, and wrap the item array in the response.

`get-asesores.ts` is the exception — it returns staff records, not `TreasureItem`s. For that one, return an empty list to non-staff rather than projecting:

```ts
const grant = await resolveGrant(req, { lookupVitrina });
if (grant.kind !== 'staff') {
  return sendSuccess(res, { asesores: [] });
}
```

- [ ] **Step 3: Write the integration net**

Create `tests/catalogEndpointsProjection.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PUBLIC_KEYS } from '../api/_lib/catalogProjection';

const SENSITIVE = [
  'precioCOP',
  'precioInternacional',
  'costoTM',
  'ubicacion',
  'caja',
  'estado',
  'cantidad',
  'asesor',
  'asesorActual',
  'estadoAsesor',
  'fechaIngreso',
  'sheetRow',
];

describe('PUBLIC_KEYS', () => {
  it('never overlaps the sensitive set', () => {
    for (const key of SENSITIVE) {
      expect(PUBLIC_KEYS).not.toContain(key);
    }
  });

  it('is exactly the 11 fields the spec approved', () => {
    expect([...PUBLIC_KEYS].sort()).toEqual(
      [
        'calidad',
        'categoria',
        'coleccion',
        'color',
        'isJewelry',
        'item',
        'medidas',
        'medidasValores',
        'nombre',
        'peso',
        'talla',
      ].sort(),
    );
  });
});
```

- [ ] **Step 4: Write the "someone added an endpoint and forgot" net**

The spec asks for a net across all seven endpoints. A source scan is the cheap,
reliable version: it fails when a catalog endpoint exists that never resolves a
grant, which is exactly the regression that would silently re-open the leak.

Append to `tests/catalogEndpointsProjection.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const API_DIR = join(__dirname, '..', 'api');

// Endpoints that read catalog rows and MUST gate on a grant.
const CATALOG_ENDPOINTS = [
  'get-treasure-sheets.ts',
  'get-newest-products.js',
  'get-inventory-rows.ts',
  'get-table.ts',
  'get-table-rows.ts',
  'get-collection.js',
  'get-asesores.ts',
];

describe('every catalog endpoint gates on a grant', () => {
  it.each(CATALOG_ENDPOINTS)('%s resolves a grant', (file) => {
    const src = readFileSync(join(API_DIR, file), 'utf8');
    expect(src).toContain('resolveGrant');
  });

  it('flags any new get-* endpoint nobody classified', () => {
    const onDisk = readdirSync(API_DIR).filter(
      (f) => f.startsWith('get-') && /\.[jt]s$/.test(f),
    );
    // Media-only endpoints serve images and carry no sensitive fields.
    const MEDIA_ONLY = ['get-batch-thumbnails.ts', 'get-drive-images.js'];
    const unclassified = onDisk.filter(
      (f) => !CATALOG_ENDPOINTS.includes(f) && !MEDIA_ONLY.includes(f),
    );
    expect(unclassified).toEqual([]);
  });
});
```

If that last test fails, a new `get-*` endpoint was added: classify it into
`CATALOG_ENDPOINTS` (and gate it) or `MEDIA_ONLY` (and justify why it carries
nothing sensitive). Do not delete the assertion.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/catalogEndpointsProjection.test.ts tests/catalogProjection.test.ts tests/catalogGrant.test.ts`
Expected: PASS

Run: `npm run lint && npm run build`
Expected: no new errors, build succeeds

- [ ] **Step 6: Commit**

```bash
git add api/ tests/catalogEndpointsProjection.test.ts
git commit -m "feat(api): el catálogo deja de publicar precio, ubicación y asesor"
```

---

### Task 8: Verify against the real deployment

**Files:** none — this is a verification gate.

- [ ] **Step 1: Confirm the anonymous payload lost its sensitive keys**

```bash
curl -s https://tierramadre.app/api/get-treasure-sheets \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
      const t=JSON.parse(s).treasure;
      console.log('keys:', Object.keys(t[0]).sort().join(', '));
    })"
```

Expected exactly: `calidad, categoria, coleccion, color, isJewelry, item, medidas, medidasValores, nombre, peso, talla`

- [ ] **Step 2: Confirm the asesor roster is closed**

```bash
curl -s https://tierramadre.app/api/get-asesores
```

Expected: an empty `asesores` array.

- [ ] **Step 3: Confirm a scanned label shows no price**

Open `https://tierramadre.app/p/1` in a private window. Expected: the piece renders, **no `PRECIO` block**, contact CTA still present.

- [ ] **Step 4: Confirm share links still show prices**

Mint a link from "Compartir con cliente", open `/v/<token>` in a private window. Expected: the curated price renders exactly as before. **This is the regression that matters most** — if it fails, Task 4 is not wired and clients are seeing broken share links.

- [ ] **Step 5: Confirm staff are unaffected**

Sign in as an asesor, open the treasure browser. Expected: prices, ubicación and estado all present, exactly as before.

- [ ] **Step 6: Confirm the cache no longer outlives the session**

Sign in as staff, browse the catalog, sign out, then check DevTools → Application → Local Storage. Expected: no key starting with `tierramadre-treasure-sheets-cache`.
