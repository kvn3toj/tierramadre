# Design: Migrar Sistema de Invitaciones a Convex

**Fecha:** 2026-04-13
**Estado:** Borrador validado
**Scope:** Invitaciones + ProductViews + live sync multiplicador + cache fix asesores

---

## 1. Contexto y Problema

El endpoint `/api/invitations?action=list-by-creator` devuelve `500 Quota exceeded` en Google Sheets cuando el asesor consulta `/mi-perfil`. La causa raíz: Google Sheets no es una base de datos transaccional, y cada lectura/escritura consume cuota compartida con todos los demás endpoints.

**Problemas específicos:**
- `useAsesores` no cachea nada — si Sheets falla, `/mi-perfil` muestra "No se encontró tu perfil" aunque el usuario esté logueado.
- El multiplicador del guest vive en `sessionStorage` (seteado una vez por InvitationPage). Cuando el asesor cambia el multiplicador, el guest no lo ve hasta recargar.
- `useMyInvitations` usa localStorage como fallback, pero las escrituras (create/update/expire) siguen golpeando Sheets.

**Lo que NO es problema (fuera de scope):**
- Treasures/inventario — Sheets es y seguirá siendo la fuente de verdad (el equipo edita ahí manualmente).
- Asesores — se quedan en Sheets. Solo necesitan cache en el frontend.
- Cotizaciones — se quedan en Sheets/Drive.
- Media — sigue en Google Drive.

---

## 2. Decisiones de Arquitectura

### 2.1 Estrategia de transición: Dual-read, single-write (Opción C)

- **Escrituras**: van solo a Convex desde el día 1. Sheets se congela como snapshot read-only para invitaciones.
- **Lecturas**: empiezan en Sheets (feature flag `VITE_DATA_SOURCE=sheets`), migran gradualmente a Convex (`VITE_DATA_SOURCE=convex`).
- **Rollback**: si Convex falla, el flag revierte a Sheets (datos congelados pero funcionales).

### 2.2 Autenticación: Proxy a través de Vercel (Opción B)

- El frontend sigue llamando a `/api/invitations` (mismas rutas).
- El endpoint de Vercel valida el Google OAuth token del request.
- Luego ejecuta la mutation de Convex server-side via el SDK de Node.
- Sin cambios en el frontend para auth. Convex Auth queda para una fase posterior.

### 2.3 Scope P0

| Migra a Convex | Se queda en Sheets | Fix inmediato (sin Convex) |
|---|---|---|
| `invitations` (CRUD + live sync) | `treasures` (inventario) | `useAsesores` cache en localStorage |
| `productViews` (tracking de guests) | `asesores` (datos de embajadores) | |
| | `cotizaciones` | |
| | `media` (Drive) | |

---

## 3. Schema de Convex

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  invitations: defineTable({
    invitationId: v.string(),
    shortCode: v.string(),
    creatorEmail: v.string(),
    creatorName: v.string(),
    creatorRole: v.optional(v.string()),
    guestName: v.optional(v.string()),
    guestContact: v.optional(v.string()),
    contactType: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("expired")
    ),
    createdAt: v.string(),
    activatedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    pricingMode: v.string(),
    durationHours: v.number(),
    guestCurrencyMode: v.optional(v.string()),
    guestMultiplier: v.optional(v.float64()),
    pin: v.optional(v.string()),
    boundToken: v.optional(v.string()),
  })
    .index("by_creatorEmail", ["creatorEmail"])
    .index("by_shortCode", ["shortCode"])
    .index("by_status", ["status"]),

  productViews: defineTable({
    timestamp: v.string(),
    itemId: v.string(),
    productName: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    referrer: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    browser: v.optional(v.string()),
    country: v.optional(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userRole: v.optional(v.string()),
    inviterName: v.optional(v.string()),
  })
    .index("by_itemId", ["itemId"])
    .index("by_inviterName", ["inviterName"])
    .index("by_userEmail", ["userEmail"]),
});
```

**Notas sobre el schema:**
- Replica las 18 columnas de la hoja de Invitaciones (`api/invitations.ts:31-36`).
- `status` incluye `"pending"` (que el spec original omitía pero el código usa: `useMyInvitations.ts:19`).
- `guestMultiplier` es `v.optional(v.float64())` — nullable porque Sheets devuelve `''` para celdas vacías.
- `productViews` replica los 12 campos del header (`api/product-views.js:24-27`).
- Índice `by_inviterName` en productViews permite filtrar guest activity por asesor sin cargar toda la tabla.

---

## 4. Funciones de Convex

### 4.1 Queries

```typescript
// convex/invitations.ts — queries

// Listar invitaciones por email del creador (reemplaza list-by-creator)
export const listByCreator = query({
  args: { creatorEmail: v.string() },
  handler: async (ctx, { creatorEmail }) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_creatorEmail", q => q.eq("creatorEmail", creatorEmail.toLowerCase().trim()))
      .filter(q => q.or(
        q.eq(q.field("status"), "active"),
        q.eq(q.field("status"), "pending")
      ))
      .order("desc")
      .collect();
  },
});

// Buscar invitación por shortCode (reemplaza findInvitationByCode)
export const getByShortCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, { shortCode }) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_shortCode", q => q.eq("shortCode", shortCode.toUpperCase()))
      .first();
  },
});

// Guest activity por inviter (reemplaza product-views?action=recent filtrado)
export const guestActivity = query({
  args: { inviterName: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { inviterName, limit }) => {
    const views = await ctx.db
      .query("productViews")
      .withIndex("by_inviterName", q => q.eq("inviterName", inviterName))
      .order("desc")
      .take(limit ?? 50);
    return views;
  },
});
```

### 4.2 Mutations

```typescript
// convex/invitations.ts — mutations

// Crear invitación (reemplaza POST action=generate)
export const generate = mutation({
  args: {
    creatorEmail: v.string(),
    creatorName: v.string(),
    creatorRole: v.optional(v.string()),
    pricingMode: v.optional(v.string()),
    guestName: v.optional(v.string()),
    guestContact: v.optional(v.string()),
    contactType: v.optional(v.string()),
    guestCurrencyMode: v.optional(v.string()),
    guestMultiplier: v.optional(v.float64()),
    pin: v.string(),
    shortCode: v.string(),
  },
  handler: async (ctx, args) => {
    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    await ctx.db.insert("invitations", {
      ...args,
      invitationId,
      status: "pending",
      createdAt: new Date().toISOString(),
      pricingMode: args.pricingMode ?? "with_prices",
      creatorRole: args.creatorRole ?? "Asesor",
      durationHours: 48, // INVITATION_DURATION_HOURS
    });
    return { invitationId, shortCode: args.shortCode, pin: args.pin };
  },
});

// Actualizar multiplicador (reemplaza POST action=update)
export const updateMultiplier = mutation({
  args: {
    shortCode: v.string(),
    creatorEmail: v.string(),
    guestMultiplier: v.float64(),
  },
  handler: async (ctx, { shortCode, creatorEmail, guestMultiplier }) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_shortCode", q => q.eq("shortCode", shortCode))
      .first();
    if (!invitation) throw new Error("Invitación no encontrada");
    if (invitation.creatorEmail.toLowerCase() !== creatorEmail.toLowerCase()) {
      throw new Error("No tienes permiso para editar esta invitación");
    }
    if (invitation.status !== "active" && invitation.status !== "pending") {
      throw new Error("Solo se pueden editar invitaciones activas o pendientes");
    }
    const safe = Math.round(Math.min(4.0, Math.max(1.0, guestMultiplier)) * 10) / 10;
    await ctx.db.patch(invitation._id, { guestMultiplier: safe });
    return { shortCode, guestMultiplier: safe };
  },
});

// Expirar invitación (reemplaza POST action=expire)
export const expire = mutation({
  args: { shortCode: v.string(), creatorEmail: v.string() },
  handler: async (ctx, { shortCode, creatorEmail }) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_shortCode", q => q.eq("shortCode", shortCode))
      .first();
    if (!invitation) throw new Error("Invitación no encontrada");
    if (invitation.creatorEmail.toLowerCase() !== creatorEmail.toLowerCase()) {
      throw new Error("No tienes permiso para expirar esta invitación");
    }
    if (invitation.status === "expired") return { success: true };
    await ctx.db.patch(invitation._id, {
      status: "expired",
      expiresAt: new Date().toISOString(),
    });
    return { success: true };
  },
});

// Activar invitación (reemplaza la lógica de activación en validateInvitation)
export const activate = mutation({
  args: { shortCode: v.string() },
  handler: async (ctx, { shortCode }) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_shortCode", q => q.eq("shortCode", shortCode))
      .first();
    if (!invitation || invitation.status !== "pending") return null;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + invitation.durationHours * 60 * 60 * 1000);
    await ctx.db.patch(invitation._id, {
      status: "active",
      activatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    return { ...invitation, status: "active", activatedAt: now.toISOString(), expiresAt: expiresAt.toISOString() };
  },
});

// Registrar guest (reemplaza POST action=register)
export const registerGuest = mutation({
  args: {
    invitationId: v.string(),
    guestName: v.string(),
    guestContact: v.optional(v.string()),
    contactType: v.optional(v.string()),
  },
  handler: async (ctx, { invitationId, guestName, guestContact, contactType }) => {
    const invitation = await ctx.db
      .query("invitations")
      .filter(q => q.eq(q.field("invitationId"), invitationId))
      .first();
    if (!invitation) throw new Error("Invitación no encontrada");
    await ctx.db.patch(invitation._id, {
      guestName,
      guestContact: guestContact ?? undefined,
      contactType: contactType ?? undefined,
    });
    return { success: true, guestName };
  },
});

// Verificar PIN y bind device token
export const verifyPin = mutation({
  args: {
    shortCode: v.string(),
    pin: v.string(),
    deviceToken: v.optional(v.string()),
  },
  handler: async (ctx, { shortCode, pin, deviceToken }) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_shortCode", q => q.eq("shortCode", shortCode))
      .first();
    if (!invitation) return { success: false, error: "Invitación no encontrada" };
    if (!invitation.pin || invitation.pin !== pin) {
      return { success: true, isPinWrong: true };
    }
    if (invitation.boundToken && (!deviceToken || deviceToken !== invitation.boundToken)) {
      return { success: true, isIpBlocked: true };
    }
    let tokenToReturn = deviceToken;
    if (!invitation.boundToken) {
      tokenToReturn = `tk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
      await ctx.db.patch(invitation._id, { boundToken: tokenToReturn });
    }
    return {
      success: true,
      pinVerified: true,
      deviceToken: tokenToReturn,
      guestName: invitation.guestName ?? null,
      guestContact: invitation.guestContact ?? null,
    };
  },
});
```

### 4.3 ProductViews

```typescript
// convex/productViews.ts

export const track = mutation({
  args: {
    itemId: v.string(),
    productName: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    referrer: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    browser: v.optional(v.string()),
    country: v.optional(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userRole: v.optional(v.string()),
    inviterName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("productViews", {
      ...args,
      timestamp: new Date().toISOString(),
    });
    return { success: true, itemId: args.itemId };
  },
});
```

---

## 5. Capa de Proxy en Vercel

Los endpoints `/api/invitations` y `/api/product-views` se refactorizan para:

1. **Validar auth** — verificar el Google OAuth token (ya existe parcialmente).
2. **Llamar a Convex** — usar el SDK de Node (`ConvexHttpClient`) para ejecutar mutations/queries.
3. **Feature flag** — `process.env.DATA_SOURCE` controla si lee de Convex o de Sheets.

```typescript
// api/invitations.ts — refactorizado (pseudo-código)
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

// En cada action handler:
if (process.env.DATA_SOURCE === 'convex') {
  // Mutation/query via Convex
  const result = await convex.mutation(api.invitations.generate, { ... });
  return res.json(result);
} else {
  // Legacy: Sheets (read-only fallback)
  const result = await generateInvitation(sheets, body);
  return res.json(result);
}
```

**Variables de entorno nuevas (Vercel):**
- `CONVEX_URL` — URL del deployment de Convex
- `CONVEX_DEPLOY_KEY` — para el script de migración
- `DATA_SOURCE` — `"convex"` | `"sheets"` (flag de transición)

---

## 6. Refactor de Hooks en el Frontend

### 6.1 useMyInvitations — Convex reactivo

El hook mantiene su API pública idéntica (`UseMyInvitationsReturn`). Internamente:

- **Lecturas**: `useQuery(api.invitations.listByCreator, { creatorEmail })` reemplaza el fetch + localStorage.
- **Mutations** (`updateMultiplier`, `expireInvitation`): siguen llamando a `/api/invitations` (proxy Vercel) para mantener la validación server-side. El optimistic update local se mantiene; Convex lo confirma vía la subscripción reactiva.
- **Eliminamos**: `localStorage.getItem(CACHE_KEY)`, `localStorage.setItem(CACHE_KEY)`, el estado `isLoading` manual, el `fetchInvitations` callback.

```typescript
// Versión Convex (simplificada)
export function useMyInvitations(creatorEmail: string | null | undefined): UseMyInvitationsReturn {
  const invitations = useQuery(
    api.invitations.listByCreator,
    creatorEmail ? { creatorEmail } : "skip"
  ) ?? [];

  // mutations siguen via fetch a /api/invitations (proxy)
  const updateMultiplier = async (shortCode: string, multiplier: number) => { ... };
  const expireInvitation = async (shortCode: string) => { ... };

  // metrics calculadas con useMemo (igual que hoy)
  const metrics = useMemo(() => { ... }, [invitations]);

  return { invitations, metrics, isLoading: invitations === undefined, ... };
}
```

### 6.2 useGuestActivity — Convex reactivo

```typescript
export function useGuestActivity(inviterName: string | null | undefined) {
  const guestViews = useQuery(
    api.productViews.guestActivity,
    inviterName ? { inviterName, limit: 50 } : "skip"
  ) ?? [];

  // topProducts con useMemo (igual que hoy)
  const topProducts = useMemo(() => { ... }, [guestViews]);

  return { guestViews, topProducts, isLoading: guestViews === undefined };
}
```

### 6.3 useAsesores — Cache fix (sin Convex)

Agregar el mismo patrón de cache que usan los otros hooks:

```typescript
const CACHE_KEY = 'tm-asesores';

export function useAsesores(treasure?: TreasureItem[]): UseAsesoresReturn {
  const [asesores, setAsesores] = useState<Asesor[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const loadAsesores = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithRetry('/api/get-asesores', ...);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.asesores) {
          const deduped = dedupeAsesores(result.asesores);
          setAsesores(deduped);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(deduped)); } catch {}
        }
      }
    } catch {
      // Cache sigue sirviendo datos
    } finally {
      setIsLoading(false);
    }
  };
  // ...
}
```

---

## 7. Live Sync del Multiplicador

El flujo actual del guest:
1. Guest abre link → InvitationPage setea `sessionStorage.GUEST_MULTIPLIER`
2. `CurrencyContext` lee de `sessionStorage` al inicializar
3. Si el asesor cambia el multiplicador, el guest no se entera hasta recargar

El flujo con Convex:
1. Guest abre link → InvitationPage setea `sessionStorage` (igual)
2. `CurrencyContext` se suscribe a `getByShortCode(shortCode)` via `useQuery`
3. Cuando el asesor ejecuta `updateMultiplier`, Convex notifica al guest en <2s
4. `CurrencyContext` actualiza `setMultiplierState` con el valor reactivo

**Cambio en CurrencyContext:**

```typescript
// Dentro de CurrencyProvider, para guests:
// TOKEN almacena el shortCode del guest (key: 'invitation-token')
const shortCode = isGuest
  ? sessionStorage.getItem(INVITATION_STORAGE_KEYS.TOKEN)
  : null;

const liveInvitation = useQuery(
  api.invitations.getByShortCode,
  shortCode ? { shortCode } : "skip"
);

// Sync live multiplier cuando Convex notifica cambio
useEffect(() => {
  if (!isGuest || !liveInvitation?.guestMultiplier) return;
  const live = normalizeMultiplier(liveInvitation.guestMultiplier);
  if (live !== multiplier) {
    setMultiplierState(live);
    sessionStorage.setItem(INVITATION_STORAGE_KEYS.GUEST_MULTIPLIER, String(live));
  }
}, [isGuest, liveInvitation?.guestMultiplier]);
```

**Verificado**: InvitationPage ya guarda el shortCode en `sessionStorage` como `INVITATION_STORAGE_KEYS.TOKEN` (`'invitation-token'`). Ver `InvitationPage.tsx:488` y `:584`. No se requiere cambio adicional.

---

## 8. Script de Migración

```typescript
// scripts/migrate-sheets-to-convex.ts

// 1. Lee la hoja de Invitaciones completa (A:R)
// 2. Para cada fila, parsea los 18 campos al schema de Convex
// 3. Upsert por invitationId (idempotente)
// 4. Lee la hoja de ProductViews (A:L)
// 5. Inserta cada fila como productView
// 6. Log de discrepancias (tipos, nulls, duplicados)

// Flags:
// --dry-run: solo reporta, no escribe
// --table invitations|productViews|all: migra tabla específica
// --verify: después de migrar, compara conteos Sheets vs Convex
```

**Consideraciones:**
- `guestMultiplier` en Sheets es string o vacío → convertir a `number | null`
- `status` en Sheets puede tener valores inesperados → normalizar a `"active" | "pending" | "expired"`
- IDs duplicados en Sheets → el script toma la fila más reciente
- ProductViews puede tener miles de filas → batch inserts de 100

---

## 9. Setup de Convex en el Proyecto

### 9.1 Dependencias nuevas

```bash
npm install convex
```

### 9.2 Archivos nuevos

```
convex/
├── _generated/      # Auto-generado por Convex
├── schema.ts        # Schema (sección 3)
├── invitations.ts   # Queries + mutations (sección 4)
└── productViews.ts  # Track mutation + queries (sección 4.3)

scripts/
└── migrate-sheets-to-convex.ts  # Migración one-shot (sección 8)
```

### 9.3 ConvexProvider en el frontend

Agregar `ConvexProvider` como wrapper en `AppShellProviders.tsx`:

```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Wrappear el árbol existente:
<ConvexProvider client={convex}>
  {/* ...providers existentes... */}
</ConvexProvider>
```

**Variable de entorno frontend:**
- `VITE_CONVEX_URL` — URL pública del deployment de Convex

---

## 10. Rollout Strategy

### Fase 1 — Setup + Migración (semana 1)
1. `npm install convex`, setup proyecto, schema, deploy.
2. Script de migración one-shot + verificación.
3. Fix cache de `useAsesores` (PR independiente, merge inmediato).
4. Feature flag `DATA_SOURCE=sheets` (default).

### Fase 2 — Lecturas en Convex (semana 2)
5. Refactor de `useMyInvitations` y `useGuestActivity` para usar `useQuery`.
6. Refactor de endpoints Vercel como proxy a Convex.
7. Flag `DATA_SOURCE=convex` para equipo interno.
8. Validar que `/mi-perfil` carga sin 500s.

### Fase 3 — Live sync + cutover (semana 3)
9. Live sync del multiplicador en `CurrencyContext`.
10. Flag `DATA_SOURCE=convex` para 100% de usuarios.
11. Monitoreo: 0 errores 5xx en invitations durante 7 días.

### Fase 4 — Limpieza (semana 4)
12. Borrar código legacy de Sheets en hooks migrados.
13. Borrar localStorage cache keys obsoletos (`tm-my-invitations`, `tm-guest-activity`).
14. Documentar runbook de operaciones Convex.

---

## 11. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Convex free tier insuficiente (1M calls/mes) | Media | Alto | Proyectar uso antes de empezar. Invitaciones activas * queries/min * 30 días. |
| Latencia de Convex > Sheets en cold start | Baja | Bajo | Convex tiene edge caching. Benchmark antes del cutover. |
| Datos inconsistentes post-migración | Media | Alto | Script idempotente + flag `--verify` + reconciliación manual. |
| Guest pierde sesión durante cutover | Baja | Medio | sessionStorage no se afecta. El shortCode sigue funcionando. |
| useQuery de Convex en guest sin auth | Baja | Medio | Queries públicas en Convex (no requieren auth). Auth es server-side en el proxy. |

---

## 12. Lo que NO cambia

- Google Sheets para inventario (`get-treasure-sheets`)
- Google Sheets para asesores (`get-asesores`) — solo se agrega cache frontend
- Google Drive para media
- Google OAuth para autenticación
- Vercel para deployment y serverless functions
- Todos los endpoints que no tocan invitations ni product-views
- La UI de `/mi-perfil` y componentes hijos — solo cambian los hooks internos
