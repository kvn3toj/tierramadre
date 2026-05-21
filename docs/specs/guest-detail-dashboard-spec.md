# PRD — Guest Detail & Management Dashboard

**Autor:** Kevin Pineda Pérez
**Fecha:** 2026-04-13
**Estado:** Borrador v1
**Depende de:** `convex-migration-spec.md` (fase 2) y fix `/mi-perfil` admin
**Target release:** Post-migración a Convex — sprint 3–4

---

## 1. Problem Statement

Hoy el asesor ve un listado plano de invitaciones en `/mi-perfil` (chip de multiplicador, estado y botón de expirar) pero **no puede profundizar en la actividad de un invitado individual**. No sabe qué productos miró Julián Pineda, cuánto tiempo estuvo, qué cotizó, si compartió el link con alguien más, ni tiene forma de editar nombre, contacto, pricing, ampliar vigencia, o escribirle por WhatsApp desde la app. El listado agregado en `GuestActivityFeed` mezcla actividad de todos los invitados en un solo feed, lo que vuelve imposible el seguimiento uno-a-uno — justo lo que un vendedor necesita antes de cerrar.

Costo de no resolverlo: el asesor sale de la app (hojas, WhatsApp, email) para armar contexto antes de llamar al cliente. Se pierde el momento de venta y la app deja de ser la herramienta central.

## 2. Goals

1. **Contexto completo por invitado en ≤2 clicks** desde `/mi-perfil` hasta la vista detallada.
2. **Dashboard accionable** — el asesor puede editar, contactar, renovar o expirar la invitación sin salir de la vista.
3. **Historial de actividad navegable** — ver cada producto que el invitado abrió, con timestamp y duración.
4. **Reducir tiempo de preparación de llamada de venta** de ~5 min (consolidar manualmente) a <30 s.
5. **Mantener privacidad del invitado** — solo el creador de la invitación (o admins) puede ver estos datos.

## 3. Non-Goals

- **No construir CRM** — no se trackea pipeline, estados de venta, notas multi-hilo. Para eso se integra con un CRM externo en v2.
- **No mensajería interna** — "contactar" es un deep-link a WhatsApp/email, no un chat dentro de la app.
- **No editar actividad histórica del invitado** — el feed es read-only; solo se edita la configuración de la invitación.
- **No analytics comparativos entre invitados en esta versión** — el dashboard es por-invitado. Comparaciones agregadas van a v2.
- **No notificaciones push en tiempo real** — live updates via Convex subscription dentro de la sesión del asesor, pero no notificaciones al móvil cuando la app está cerrada.

## 4. User Stories

**Flujo principal**
- Como asesor, quiero hacer tap en una tarjeta de invitación en `/mi-perfil` y aterrizar en el detalle del invitado.
- Como asesor, quiero ver en el detalle: nombre, contacto, fecha de creación, fecha de activación, vigencia restante, multiplicador actual, moneda, estado, y quién lo invitó (si es admin viendo a otro asesor).
- Como asesor, quiero ver la lista de todos los productos que el invitado abrió, ordenada por más reciente, con miniatura, nombre, peso, precio visto y tiempo de permanencia.
- Como asesor, quiero ver un resumen: #productos vistos, #cotizaciones, producto favorito (más visitas), tiempo total de sesión, última visita.

**Acciones de administración**
- Como asesor, quiero editar el multiplicador con un slider (ya existe) y ver la confirmación en vivo.
- Como asesor, quiero editar nombre y contacto del invitado si me lo dieron incompleto al crear el link.
- Como asesor, quiero renovar la vigencia (+24h, +7d, +30d) con un tap.
- Como asesor, quiero regenerar el PIN si el invitado lo perdió.
- Como asesor, quiero expirar la invitación con confirmación (ya existe en el listado).
- Como asesor, quiero reenviar el link al invitado por WhatsApp o email con un tap, prellenando un mensaje.

**Contexto cruzado**
- Como asesor, quiero ver las cotizaciones que le generé a este invitado (si existen) con link al PDF.
- Como asesor, quiero ver si el invitado compartió el link (si en el futuro hay multi-device detection — hoy se muestra "1 dispositivo" por defecto).

**Admin global**
- Como admin, quiero poder abrir el detalle de cualquier invitado del equipo, no solo los míos, para dar soporte.

**Casos borde**
- Como asesor, si la invitación expiró, quiero ver el detalle en modo read-only con un CTA "Crear nueva invitación para este invitado".
- Como asesor, si el invitado aún no activó el link, quiero ver "Sin actividad" con el código y fecha de expiración visible.

## 5. Requirements

### Must-Have (P0)

1. **Ruta nueva** `/mi-perfil/invitado/:shortCode` con lazy-loading del bundle.

2. **Click-through desde la lista** — la tarjeta de invitación en `InvitationSummary.tsx` pasa de mostrar solo el chip editable a ser clickeable entera (el click en el chip sigue abriendo el popover de multiplicador, el click en el resto de la fila navega al detalle). Afordancia visual (chevron `>` a la derecha).

3. **Layout del detalle** (mobile-first, max 600px):
   - **Header**: avatar generado (iniciales sobre gradiente emerald), nombre, estado (activa/pendiente/expirada), contacto con iconos, chip de multiplicador, chip de moneda.
   - **Barra de acciones**: [WhatsApp] [Email] [Reenviar link] [Más ⋯] — el menú expande: editar datos, regenerar PIN, renovar vigencia, expirar.
   - **KPI row**: 4 tarjetas — Productos vistos, Cotizaciones, Tiempo total, Última visita.
   - **Tab "Actividad"**: timeline cronológico inverso con cada `productView`. Cada item: thumbnail → nombre producto → peso/precio visto en ese momento → duración → timestamp relativo. Agrupar por día.
   - **Tab "Cotizaciones"**: listado con total, fecha, link al PDF en Drive.
   - **Tab "Configuración"**: formulario editable con los campos de la invitación (nombre, contacto, pricing mode, currency, multiplier, vigencia, PIN).

4. **Queries Convex (post-migración)**:
   - `invitations.getByShortCode(shortCode)` — retorna la invitación con ownership check (creatorEmail === user.email o admin).
   - `productViews.listByInvitation(invitationId)` — paginada, con join a `treasures`.
   - `cotizaciones.listByGuestContact(guestContact, creatorEmail)`.
   - Todas reactivas via `useQuery`.

5. **Mutations Convex**:
   - `invitations.update(shortCode, fields)` — extender la mutation actual para aceptar `guestName`, `guestContact`, `pricingMode`, `guestCurrencyMode`, `expiresAt`, regenerar PIN. Validación server-side de cada campo.
   - `invitations.extend(shortCode, hoursToAdd)` — helper específico para renovar vigencia, suma al `expiresAt` actual.

6. **Ownership + privacidad** — queries y mutations rechazan si el `creatorEmail` del invitación no coincide con el del usuario autenticado, a menos que `accessLevel === 'admin'`. Esto se valida server-side, no client.

7. **Deep-links de contacto**:
   - WhatsApp: `https://wa.me/{phone}?text={encoded}` con plantilla "Hola {nombre}, aquí el link de Tierra Madre: {url} · PIN: {pin}".
   - Email: `mailto:{email}?subject=…&body=…` con la misma plantilla.
   - Reenviar: abre modal con la plantilla, permite editar, luego dispara WhatsApp o email según `contactType`.

8. **Empty states específicos**:
   - Sin productos vistos → "Todavía no ha abierto ningún producto" + CTA "Reenviar link".
   - Sin cotizaciones → "Aún no has cotizado para {nombre}" + CTA "Crear cotización".
   - Invitación expirada → banner rojo arriba del header + CTA "Crear nueva invitación".

9. **Tracking del detalle mismo** — evento `guest_detail_viewed` en `TrackingContext` para medir adopción.

### Nice-to-Have (P1)

- **Live badge** "Activo ahora" cuando hay un `productView` en los últimos 5 min (via subscripción Convex).
- **Heatmap de horarios** — qué horas del día navega más el invitado (ayuda a decidir cuándo llamarlo).
- **Notas privadas** por invitación — campo libre solo visible al asesor creador.
- **Comparador inline** — seleccionar 2–3 productos del historial y abrir el comparador existente.
- **Export PDF** del dashboard del invitado para adjuntar a follow-ups internos.
- **Atajo desde `/embajadores`** — si el admin abre un asesor, ver lista de sus invitaciones con link al detalle.

### Future Considerations (P2)

- Timeline que incluya acciones del asesor (cuándo cambió el multiplicador, cuándo renovó) junto a la actividad del invitado.
- Segmentación: tags/labels por invitado ("VIP", "Prospecto frío", "Repeat").
- Webhook cuando el invitado hace X (ej. mira 5 productos en una sesión) → envía push al asesor.
- Multi-device detection — si el link se abre desde 2 IPs/user-agents, marcar "Compartido".
- Integración con CRM (HubSpot, Pipedrive) — push de eventos del invitado.

## 6. Success Metrics

### Leading (semana 1–4 post-launch)

| Métrica | Baseline | Meta | Stretch |
|---|---|---|---|
| Tasa de adopción (asesores que abren el detalle ≥1 vez) | 0% | 70% en 14 días | 90% |
| Detalles abiertos por asesor activo por semana | 0 | ≥3 | ≥7 |
| % de acciones (editar, renovar, reenviar) ejecutadas desde el detalle | — | 40% | 60% |
| Tiempo en cargar el detalle (p50) | — | <400 ms | <200 ms |
| Tasa de renovación de invitaciones próximas a expirar | ~0% manual | 30% | 50% |

### Lagging (60–90 días)

- Reducción de tiempo auto-reportado para preparar una llamada de venta (encuesta 5-pt): de baseline ~5 min a <1 min.
- Incremento del % de invitaciones que terminan en cotización enviada: +20%.
- NPS interno del equipo de ventas sobre la herramienta: +2 pts.

### Método de medición

- Convex analytics para latencia de `invitations.getByShortCode`.
- Eventos custom `guest_detail_viewed`, `guest_detail_action` (con `actionType`) en `TrackingContext`.
- Dashboard en el panel de admin existente con funnels: lista → detalle → acción.

## 7. Open Questions

**Bloqueantes**
- [Producto] ¿El admin puede editar invitaciones de otros asesores o solo ver? → conservador: solo ver + "expirar" como acción de soporte. Confirmar con Kevin.
- [Diseño] ¿Tabs, accordion, o scroll largo? → recomiendo tabs (Actividad | Cotizaciones | Configuración) en mobile porque mantiene el primer fold enfocado.
- [Ingeniería] ¿La tabla `productViews` ya existe o la creamos en Convex? Hoy el tracking es client-side (`localStorage` + `useTreasureAnalytics`). Esta feature requiere persistir en Convex. → depende del alcance de la fase 2 de la migración.

**No bloqueantes**
- [Diseño] ¿Avatar con iniciales o integrar con Gravatar/contacto del teléfono? → iniciales es suficiente para v1.
- [Legal] ¿Qué datos del invitado podemos mostrar si cambia `guestContact` a otro valor? (histórico vs actual). → conservador: mostrar el actual, ocultar el anterior.
- [Data] ¿Cómo calcular "duración" de view cuando el usuario cierra la pestaña sin evento de salida? → timeout cap de 10 min por sesión.

## 8. Timeline Considerations

**Prerequisitos**: fase 2 de la migración a Convex completa (lecturas reactivas de `invitations` y `productViews`). Sin eso, este feature sigue colgado del rate-limit de Sheets.

**Fase A — Shell + Configuración (sprint 3, semana 1–2 post-migración)**
- Ruta, layout, tabs, fetch del detalle, acciones de edición y expiración.
- Sin timeline de productViews todavía (usa placeholder).
- Ship a 100% de asesores internos.

**Fase B — Actividad + Cotizaciones (sprint 4, semana 3–4)**
- Tab "Actividad" con timeline real y join a treasures.
- Tab "Cotizaciones" con links al Drive.
- KPI row con métricas reales.

**Fase C — P1 enhancements (sprint 5+, opcional)**
- Live badge, notas, heatmap, export PDF.

### Dependencias

- **Convex schema**: `productViews` debe existir. Si aún no está en la migración, este feature la empuja al P0 de fase 2.
- **Diseño**: mockups de alta fidelidad para las 3 tabs antes de sprint 3. Owner: tú con apoyo del skill `design`.
- **Tracking**: `TrackingContext` debe empezar a escribir `productView` events en Convex (hoy solo localStorage).

### Riesgos

- **Volumen de productViews** — si cada invitado genera 100+ events/día, la tabla crece rápido. Mitigación: índice por `invitationId` + pagination cursor, retención de 90 días con soft-delete.
- **Privacidad** — filtrar por ownership server-side es crítico. Un bug expone datos de un invitado a otro asesor. Mitigación: tests de integración con múltiples cuentas + revisión de seguridad antes de rollout.

---

## Anexo — wireframe de bajo nivel (ASCII)

```
┌─ /mi-perfil/invitado/DZMFED ────────────────┐
│ ← Volver                                    │
│                                             │
│   [JP]  Julián Pineda              [Activa] │
│         jepp198405@gmail.com · Email        │
│         Activado 3 abr · Expira nunca       │
│                                             │
│   [x2.0 ▾]  [COP]  [Ver todo el precio]     │
│                                             │
│   [ WhatsApp ] [ Email ] [ Reenviar ] [⋯]   │
│   ───────────────────────────────────────   │
│   12      3       47m      hace 2h          │
│   Vistos  Cotiz.  Tiempo   Última visita    │
│   ───────────────────────────────────────   │
│   [Actividad] Cotizaciones  Configuración   │
│                                             │
│   Hoy                                       │
│   🟢 Corona de Jaguar · 1.36ct · 4m ago     │
│   🟢 Atardecer · 1.24ct · 6m ago            │
│   ...                                       │
└─────────────────────────────────────────────┘
```
