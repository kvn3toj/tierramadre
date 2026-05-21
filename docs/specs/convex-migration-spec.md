# PRD — Migración de Tierra Mädre Studio a Convex

**Autor:** Kevin Pineda Pérez
**Fecha:** 2026-04-13
**Estado:** Borrador v1
**Target release:** Q2 2026 (fases escalonadas)

---

## 1. Problem Statement

Tierra Mädre Studio usa Google Sheets como base de datos transaccional para inventario, invitaciones, asesores, cotizaciones y analytics. En la auditoría del 2026-04-13 la API `/api/invitations?action=list-by-creator` devolvió `500 Quota exceeded for 'Read requests per minute'` (sheets.googleapis.com, project 823887551984), dejando la página `/mi-perfil` sin datos frescos para el administrador. Los síntomas son recurrentes: latencia alta (>1s por lectura), cuota diaria frágil, imposibilidad de escrituras concurrentes seguras, y ausencia de sincronización en vivo — por ejemplo, cuando un asesor edita el multiplicador de una invitación activa, el invitado sigue viendo precios viejos hasta recargar.

El costo de no migrar: fallos 500 visibles al cliente en momentos de demo, imposibilidad de ofrecer "precios en vivo" a invitados, retrabajo en caché/backoff por cada endpoint nuevo, y un techo duro para el crecimiento del negocio (Sheets no escala a operación diaria con múltiples asesores activos).

## 2. Goals

1. **Eliminar errores 5xx por cuota** — 0 errores `Quota exceeded` en `/api/*` durante 30 días consecutivos post-migración.
2. **Reducir latencia de lectura** — p50 de endpoints críticos (`get-treasure-sheets`, `get-asesores`, `list-by-creator`) < 150 ms (hoy: 600–1200 ms).
3. **Habilitar sincronización en vivo** — el invitado ve el multiplicador/precio actualizado en ≤2 s sin recargar la app.
4. **Eliminar caché localStorage como fuente de verdad** — reducir a 0 los hooks que dependen de `localStorage` como fallback autoritativo para datos de Sheets (hoy: `useMyInvitations`, `useBatchThumbnails`, `useTreasure`).
5. **Mantener feature parity** — no perder ninguna funcionalidad existente durante la migración.

## 3. Non-Goals

- **No migrar media (imágenes/videos)** — Google Drive sigue siendo el storage para archivos binarios (economía y permisos compartidos con el equipo). Convex solo guarda referencias/IDs.
- **No rediseñar el modelo de datos desde cero** — se replica el esquema actual (Asesores, Treasures, Invitations, Cotizaciones, Analytics) con migración 1:1 primero, normalización después.
- **No migrar autenticación** — Google OAuth sigue como está; Convex `auth` queda para una fase posterior.
- **No reemplazar Vercel** — los endpoints serverless existentes se mantienen como proxy delgado mientras se migra por fases. Evita un rewrite del frontend en el primer sprint.
- **No añadir features nuevas en la migración** — cambios funcionales (edición masiva de multiplicadores, dashboards nuevos) se posponen a v2. La migración debe ser invisible para el usuario final.

## 4. User Stories

**Asesor (admin)**
- Como asesor, quiero que `/mi-perfil` cargue mis invitaciones en <1 s para poder revisar actividad de invitados sin esperar.
- Como asesor, quiero editar el multiplicador de una invitación activa y ver el cambio reflejado en el dispositivo del invitado en segundos, para ajustar precios en tiempo real durante una llamada de venta.
- Como admin, quiero que los cambios en inventario (precio, disponibilidad) se propaguen a todos los navegadores abiertos sin recargar.

**Invitado**
- Como invitado, quiero ver precios consistentes con lo que el asesor ve en su dispositivo, sin que pueda haber discrepancia por caché.
- Como invitado, si pierdo conexión, quiero que la app siga funcionando en modo lectura con los datos más recientes que cargué (offline-first).

**Desarrollador**
- Como dev, quiero un único cliente de datos tipado (`useQuery` de Convex) en lugar de 11 hooks custom con lógica de caché repetida.
- Como dev, quiero ver en logs centralizados cuándo un endpoint falla, sin que el error quede tragado en un `catch` silencioso.

## 5. Requirements

### Must-Have (P0)

1. **Schema Convex inicial** con tablas:
   - `asesores` (name, email, whatsapp, photoUrl, active, role)
   - `treasures` (itemNumber, name, weight, priceCOP, color, quality, origin, available, metadata)
   - `invitations` (shortCode, creatorEmail, guestName, guestContact, status, createdAt, activatedAt, expiresAt, pricingMode, guestCurrencyMode, guestMultiplier, pin, boundToken, invitationId)
   - `productViews` (invitationId, itemNumber, viewedAt, duration)
   - `cotizaciones` (id, creatorEmail, guestContact, items, totalCOP, createdAt, driveFileId)
   - Índices: `invitations.by_creatorEmail`, `invitations.by_shortCode`, `treasures.by_itemNumber`, `productViews.by_invitationId`.

2. **Job de migración one-shot** (`scripts/migrate-sheets-to-convex.ts`) que lee cada hoja y hace upsert en Convex. Idempotente, con dry-run y log de discrepancias.

3. **Wrapper del cliente en el frontend** — un hook `useConvexData()` que expone queries tipadas. Los hooks existentes (`useMyInvitations`, `useAsesores`, `useTreasure`) se refactorizan para consumir Convex internamente, manteniendo la misma interfaz pública para no tocar componentes.

4. **Escrituras migradas** para los endpoints de mayor contención:
   - `POST /api/invitations` → `createInvitation` mutation
   - `POST /api/invitations?action=update` → `updateInvitation` mutation (publica subscripción a invitados activos)
   - `POST /api/invitations?action=expire` → `expireInvitation` mutation
   - `POST /api/cotizacion-save` → `saveCotizacion` mutation

5. **Sincronización en vivo** del multiplicador — el `CurrencyContext` del guest se suscribe a `invitations.by_shortCode` y actualiza `setMultiplier` cuando el asesor edita.

6. **Compatibilidad durante la transición** — modo dual durante ≥2 semanas: Convex es fuente de verdad, Sheets se escribe como sombra para rollback. Una flag `VITE_DATA_SOURCE=convex|sheets` controla el cliente.

7. **Fix paralelo del bug admin en `/mi-perfil`** — como parte del sprint 1, remover el early-return de `MyProfilePage.tsx:46` para que admins sin fila en Asesores vean igualmente sus invitaciones (oportunidad barata, dependencia de datos resuelta con Convex).

### Nice-to-Have (P1)

- Offline queue: mutations pendientes se reintentan cuando vuelve la red (Convex lo soporta nativo).
- Métricas de uso por endpoint en un dashboard interno (queries vs mutations, latencia p50/p95).
- Scheduled functions de Convex para expirar invitaciones (hoy se hace en el cliente/server ad-hoc).
- Búsqueda full-text sobre `treasures.name` via Convex search index.

### Future Considerations (P2)

- Convex Auth para reemplazar Google OAuth directo.
- File storage en Convex para thumbnails (aliviaría el rate-limit de Drive).
- Row-level authorization vía `ctx.auth` para que asesores solo vean sus invitaciones (hoy se filtra client-side).
- Replicación opcional a BigQuery para analytics históricos.

## 6. Success Metrics

### Leading indicators (medidos en semana 1–4 post-migración)

| Métrica | Baseline | Meta | Stretch |
|---|---|---|---|
| Errores 5xx en `/api/invitations*` | ~3–5/día (picos) | 0/día | 0/semana |
| p50 `list-by-creator` | ~800 ms | <150 ms | <80 ms |
| p95 `get-treasure-sheets` | ~2500 ms | <400 ms | <200 ms |
| Tiempo de propagación multiplicador guest | ∞ (requiere recarga) | <2 s | <500 ms |
| % hooks con caché-as-source-of-truth | 27% (3/11) | 0% | 0% |

### Lagging indicators (medidos a 60–90 días)

- Reducción de sesiones de soporte del equipo por "la app no carga" → objetivo -80%.
- Incremento de invitaciones activas simultáneas soportadas (hoy frágil a >10, meta >100).
- NPS interno del equipo de ventas sobre la herramienta → +1 punto.

### Método de medición

- Convex Dashboard para p50/p95 de queries y mutations.
- Vercel Analytics para errores 5xx por endpoint.
- Log custom en `CurrencyContext` que mide tiempo entre `mutation.commit` y `subscription.update` en el guest.
- Encuesta corta al equipo de asesores a los 30 días.

## 7. Open Questions

**Bloqueantes (resolver antes de sprint 1)**
- [Ingeniería] ¿Plan de Convex? El free tier cubre 1M function calls/mes — validar proyección. → Kevin
- [Ingeniería] ¿Cómo manejar las fórmulas y validaciones que hoy viven en las hojas de cálculo (ej. columnas calculadas en Treasures)? → auditar hoja por hoja antes del cutover.
- [Producto] ¿Qué nivel de "modo dual" es aceptable? ¿Escritura a Sheets como sombra es requisito o se puede omitir con backup nocturno? → Kevin

**No bloqueantes**
- [Ingeniería] Si el proxy Vercel sigue existiendo, ¿cuándo se borra? Proponer sunset a 30 días post-cutover.
- [Diseño] ¿Aprovechamos la migración para unificar los empty states rotos detectados en la auditoría (ej. "No se encontró tu perfil de embajador")? → probablemente sí, en el mismo PR del fix del admin.
- [Data] ¿Cómo exportamos a las hojas para que el equipo de contabilidad siga operando en Sheets? → sync de solo-lectura vía scheduled function.

## 8. Timeline Considerations

Propongo 4 fases, 2 semanas por fase:

**Fase 1 — Fundación (semanas 1–2)**
- Setup Convex (projects, schema, deploy pipeline).
- Migración one-shot con dry-run.
- Feature flag `VITE_DATA_SOURCE`.
- **Fix del bug admin `/mi-perfil`** como PR independiente que desbloquea mientras se migra.

**Fase 2 — Lectura en Convex (semanas 3–4)**
- Refactor de `useMyInvitations`, `useAsesores`, `useCurrentAsesor`, `useTreasure` para usar `useQuery` Convex detrás de la misma API pública.
- Escritura dual (Convex + Sheets como sombra).
- Flag al 10% → 50% → 100% de usuarios internos.

**Fase 3 — Escritura y live sync (semanas 5–6)**
- Mutations de invitaciones y cotizaciones 100% en Convex.
- Subscripción live del multiplicador en guest `CurrencyContext`.
- Deprecación progresiva del shadow write a Sheets.

**Fase 4 — Limpieza (semanas 7–8)**
- Borrar hooks de caché legacy y sus `localStorage` correspondientes.
- Eliminar endpoints `/api/*` redundantes (quedan solo los que usan servicios de Google Drive/Resend).
- Documentación + runbook de rollback.

### Dependencias y riesgos

- **Riesgo medio**: cuota de Sheets durante la escritura dual (agrava el problema actual). Mitigación: escritura dual desactivable vía flag si se detecta rate-limit.
- **Riesgo bajo**: divergencia de datos en las 2 semanas de dual-write. Mitigación: script de reconciliación nocturno que compara hashes.
- **Hard deadline**: ninguno contractual. Suave: evitar migrar en diciembre (pico de ventas navideñas).

---

## Anexo A — Apéndice técnico resumido

Trade-offs que justifican Convex sobre alternativas:

- **vs Supabase/Postgres**: Convex da subscripciones reactivas out-of-the-box sin configurar triggers ni canales Realtime. Menos infra. Para el caso del multiplicador live es casi zero-code.
- **vs Firestore**: tipado end-to-end (TypeScript), mutations transaccionales, mejor DX. Firestore tiene mejor offline mobile pero no es prioridad.
- **vs Planetscale/neon + tRPC**: requieren montar un layer de realtime propio; más ergonomía para equipo pequeño con Convex.

Riesgo principal de Convex: vendor lock-in más fuerte que un Postgres. Mitigado por export periódico a JSON y el hecho de que el schema es código versionado.
