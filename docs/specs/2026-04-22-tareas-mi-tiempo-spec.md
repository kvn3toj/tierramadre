# SPEC — Tareas pendientes del proyecto Tierra Mädre (Mi Tiempo)

**Fecha:** 22 abril 2026
**Fuente:** https://mi-tiempo-calendar.vercel.app/proyectos/mn7c41ahwskv83w50wzpzenxbx84shtc
**Estado del proyecto en Mi Tiempo:** Activo · 1/10 completadas (10%) · 9 pendientes · 0 en curso · 1 hecha · 1 idea
**Autor del spec:** Kvn3Toj (con asistencia de Claude)
**Alcance del documento:** convertir las 9 tareas pendientes en un plan implementable, con archivos concretos del repo `tierra-madre-studio`, criterios de aceptación y cronograma por sprints.

---

## 1. Resumen ejecutivo

Las 9 tareas pendientes se agrupan en **cuatro líneas de trabajo**:

1. **Fixes de copy/iconografía** (quick wins, 1-2 días) — tareas 1 y 2.
2. **Embajadores / Asesores** (mayor peso, 5-8 días) — tareas 3, 4 y 5.
3. **Contenido & branding** (dependiente de assets externos, 3-5 días) — tareas 6 y 7.
4. **Proyectos grandes** (requieren su propio spec, 2-4 sprints) — tareas 8 (Recrear web) y 9 (Bóveda secreta).

El plan propone **3 sprints de 1 semana** para absorber las tareas 1-7 y **un backlog dedicado** para las tareas 8 y 9, que superan el alcance de un sprint estándar.

---

## 2. Inventario de tareas (tal como aparecen en Mi Tiempo)

| # | Título | Prioridad (sheet) | Área | Estimación |
|---|---|---|---|---|
| T1 | En el preview no salga icono de diamante sino corazón verde | Media | Copy/UX | 0.5 d |
| T2 | Cambiar mensaje predilecto de invitación a la App (sin referencia 24hr) | Media | Copy/i18n | 0.5 d |
| T3 | Al compartir la colección del embajador le muestre primero su colección y botón flotante para ver todos los tesoros de Tierra Mädre | Media | UX Embajador | 2 d |
| T4 | Nuevas funciones para embajadores: cambiar precio y nombre de sus productos en el perfil embajador | Media | Feature Embajador | 3-4 d |
| T5 | Crear perfil Paola Daza y asignar inventario | Media | Data/Ops | 0.5 d |
| T6 | Generar video con Pencil y Claude para video de subastas | Media | Contenido | 2 d (dep. assets) |
| T7 | Realizar animación de logo Tierra Mädre | Media | Branding | 2 d |
| T8 | Recrear la página web de TM (due 13 abr 19:00 — vencida) | Media | Web/Marketing | 2-4 sprints |
| T9 | Bóveda secreta | Media | Feature | 2-3 sprints |
| (idea) | Integrar Memplace en chats de Telegram y WhatsApp | — | Integración | — |

---

## 3. Plan técnico por tarea

### T1 — Ícono de corazón verde en el preview de compartir

**Problema.** Al compartir un producto (share sheet nativa o fallback clipboard), el mensaje arranca con 💎 y el equipo prefiere la identidad verde esmeralda con 💚.

**Evidencia en código.**
- `src/hooks/useShare.ts` línea 99 → `` `💎 ${displayName}` `` es el primer emoji del texto compartido.
- `src/hooks/useWhatsAppContact.ts` línea 84 → `` `${index + 1}. 💎 *${item.nombre}*` `` (también lo usa el envío por WhatsApp).
- Otros 💎 (gamificación, filtros, feedback types, design system) quedan **fuera de alcance**: son iconos de UI, no el "preview de compartir".

**Cambio propuesto.**
```ts
// src/hooks/useShare.ts:99
`💚 ${displayName}`,
// src/hooks/useWhatsAppContact.ts:84
`${index + 1}. 💚 *${item.nombre}*`
```

**Criterios de aceptación.**
- [ ] Al compartir cualquier TreasureItem por `shareProduct`, el primer emoji del `text` es 💚.
- [ ] El mensaje generado por `useWhatsAppContact` para staff→admin inicia cada ítem con 💚.
- [ ] Screenshots lado-a-lado (antes/después) en el PR, en iOS Safari y Android Chrome.
- [ ] La gamificación y los filtros (`FilterContent.tsx`, `AchievementToastAnimated.tsx`) **siguen con 💎** — esto es intencional.

**Effort.** 0.5 día · **Riesgo.** Bajo.

---

### T2 — Mensaje de invitación sin referencia a "24hr"

**Problema.** El mensaje por defecto para invitar a la App menciona "Este enlace es válido por 24 horas", y se quiere eliminar esa referencia del mensaje principal (el dato sigue siendo cierto, pero no debe ser lo primero que ve el invitado).

**Evidencia en código.**
- `src/locales/es.ts:211` — `shareText: 'Hola {name}, te invito a explorar nuestra colección de esmeraldas colombianas. Este enlace es válido por 24 horas.'`
- Traducciones equivalentes en `pt.ts`, `fr.ts`, `en.ts`, `zh.ts`, `it.ts`.
- `src/locales/es.ts:199` — `validFor24h: 'Válido por 24 horas desde que lo abra'` (**se conserva** como texto separado dentro del modal/hint).
- `src/locales/es.ts:197` — `expiryHint: 'El enlace expira 24h después de que lo abra'` (se conserva, es el hint).
- `src/components/invitation/InvitationGenerator.tsx:535` usa `inv.validFor24h`.

**Cambio propuesto.**
```ts
// es.ts:211
shareText: 'Hola {name}, te invito a explorar nuestra colección de esmeraldas colombianas Tierra Mädre.'
// en.ts (equivalente)
shareText: 'Hi {name}, I invite you to explore our Tierra Mädre Colombian emerald collection.'
// repetir para pt/fr/zh/it
```
**Se mantienen** `validFor24h` y `expiryHint` — solo se remueve la frase del mensaje principal de invitación.

**Criterios de aceptación.**
- [ ] `t('invitation.shareText')` en los 6 idiomas no contiene "24", "24h", "24hr", "24 horas", "24 heures", etc.
- [ ] El badge/hint "Válido por 24 horas" sigue visible dentro del modal `InvitationGenerator` (UX de transparencia).
- [ ] Tests unitarios o snapshot: preview del texto generado contra un fixture `{name: "Ana"}`.

**Effort.** 0.5 día · **Riesgo.** Bajo (solo copy).

---

### T3 — Compartir colección de embajador: primero su curaduría, luego tesoros de TM

**Problema.** Cuando un embajador comparte su colección, el destinatario ve un mix con el inventario global de TM. El equipo quiere que la página de destino:
1. Muestre **primero y de forma exclusiva** la colección curada del embajador.
2. Agregue un **botón flotante (FAB)** que abra/navegue al catálogo completo de tesoros de TM.

**Evidencia en código.**
- Ruta: `src/App.tsx:156` → `/ambassadors/:slug`.
- Página: `src/pages/ambassadors/profile/AsesorProfilePage.tsx`.
- Sección de colección: `src/pages/ambassadors/profile/components/ExclusiveCollectionSection.tsx` (ya existe).
- `src/pages/ambassadors/profile/components/CollectionProductDialog.tsx` (detalle de producto en colección).
- Share del asesor: probablemente en `ProfileHeader.tsx` o `useShare.ts`.

**Cambio propuesto.**

1. **Routing/estructura.** Cuando la URL es `/ambassadors/:slug` y viene de un invite-share, el primer bloque visible debe ser `ExclusiveCollectionSection` (su colección). Los demás bloques (categorías de TM, favoritos del asesor) se colapsan al scroll/debajo.

2. **FAB flotante.** Nuevo componente `ViewAllTreasuresFAB.tsx` en `src/pages/ambassadors/profile/components/`:
   - Posición `fixed bottom: 24px right: 24px`, z-index por encima del contenido, respetando safe-area iOS.
   - Ícono 💎 + texto "Ver todos los tesoros" (o solo ícono en mobile).
   - Al tap → navega a `/treasure` preservando el contexto del asesor (parámetro `?from=asesor-{slug}` para tracking).
   - Animación de entrada usando Framer Motion (suave, luego se oculta al scroll down y reaparece al scroll up).

3. **Default dentro de `AsesorProfilePage`.** Reordenar secciones:
   ```
   <ExclusiveCollectionSection />   ← primero, pantalla completa si es posible
   <FavoritesRow />                 ← después
   <CategoryGrid />                 ← después
   <ViewAllTreasuresFAB />          ← sobrepuesto
   ```

4. **Instrumentación.** Evento `ambassador_share_viewed` con `{slug, referrer: 'share'}` y `view_all_treasures_clicked` con `{slug}`.

**Criterios de aceptación.**
- [ ] Al abrir `/ambassadors/paola-daza` la primera sección bajo el header es la colección curada.
- [ ] El FAB "Ver todos los tesoros" es visible desde el primer viewport.
- [ ] Tap en el FAB lleva a `/treasure?from=asesor-paola-daza`.
- [ ] El FAB respeta safe-area en iOS (no tapa el home-indicator).
- [ ] El FAB se oculta cuando el usuario está navegando detalle de producto.
- [ ] Tracking logs visibles en el dashboard analytics del admin.

**Effort.** 2 días · **Riesgo.** Medio (cambio visual en una página crítica).

---

### T4 — Embajadores pueden editar precio y nombre de sus productos desde su perfil

**Problema.** Hoy los embajadores solo pueden **seleccionar** qué productos mostrar en su colección, pero no pueden **personalizar** el nombre ni el precio que se muestra al compartir. El equipo quiere darles autonomía comercial (ej. subir un margen, renombrar para su audiencia).

**Consideraciones críticas.**
- **No mutar el inventario maestro** (Google Sheets) — cada embajador debe tener overrides locales al producto.
- El precio base en USD sigue viniendo de `useCurrency()` con multiplicadores x2/x3/x4 — esto se preserva.
- El override de precio del embajador se aplica **encima** del precio base convertido.
- Validar rango: el override no puede ser < precio base TM (protección anti-devaluación) ni > 10x (protección anti-error).

**Evidencia en código.**
- `src/pages/ambassadors/profile/components/ManageFavoritesView.tsx` — vista actual de gestión (solo toggle).
- `src/pages/ambassadors/profile/components/EditProfileView.tsx` — patrón existente para edición.
- `api/get-asesores.ts` — trae asesores desde Google Sheets (sin overrides por producto actualmente).
- `api/user-prefs.js` — posible lugar para persistir overrides.

**Cambio propuesto.**

1. **Modelo de datos.**
   ```ts
   // src/types/ambassador.ts
   interface AmbassadorProductOverride {
     asesorSlug: string;
     itemId: string;       // product.item
     customName?: string;  // max 80 chars
     customPriceCOP?: number; // validated range
     updatedAt: string;    // ISO
   }
   ```
   Persistir en **Google Sheets** (pestaña nueva `AmbassadorOverrides`) o **Convex** (si la migración del spec `2026-04-13-convex-invitations-migration` avanza). Fallback temporal: `localStorage` con clave `tm:ambassador-overrides:{slug}`.

2. **Nuevo API endpoint.**
   - `api/ambassador-product-override.js` → `POST`/`GET`/`DELETE`.
   - Auth: requiere `x-asesor-token` (usar patrón existente de `validate.js`).
   - Validación server-side de precio (min = base * 1.0, max = base * 10.0).

3. **UI.** Nuevo componente `src/pages/ambassadors/profile/components/EditProductOverrideDialog.tsx`:
   - Se abre desde un menú 3-dots en cada producto de `ManageFavoritesView`.
   - Campos: nombre custom (con contador 80 chars), precio custom (con preview del precio actual).
   - Botón "Restaurar valores por defecto" que hace `DELETE` del override.

4. **Aplicación del override al renderizar.**
   - Nuevo hook `useAmbassadorOverrides(slug)` que devuelve un `Map<itemId, Override>`.
   - En `CollectionProductDialog`, `AmbassadorProductDetail`, `FavoriteDetailView` y al compartir: si existe override, usar sus valores; si no, los originales.

5. **Indicador visual.** Badge sutil "editado por {nombre del asesor}" en el detalle (transparencia con el cliente final — opcional, discutir con producto).

**Criterios de aceptación.**
- [ ] El embajador ve "Editar" en cada producto de su perfil (solo en modo autenticado).
- [ ] Puede cambiar nombre y precio con validación (nombre ≤ 80 chars, precio entre 1x y 10x del base).
- [ ] El nuevo valor se refleja al compartir el producto (share sheet muestra el nombre/precio custom).
- [ ] El inventario maestro en Sheets **no se modifica**.
- [ ] Otro embajador viendo el mismo producto ve sus propios overrides (o los valores por defecto si no tiene).
- [ ] "Restaurar" elimina el override limpiamente.
- [ ] Métrica tracked: `ambassador_override_applied` con `{slug, itemId, field}`.

**Effort.** 3-4 días · **Riesgo.** Alto (datos + auth + UX). Requiere decisión sobre backend (Sheets vs Convex).

**Dependencia.** Debe coordinarse con el spec de Convex (`docs/specs/convex-migration-spec.md`) para no duplicar infra.

---

### T5 — Crear perfil Paola Daza y asignar inventario

**Problema.** Nueva embajadora a onboardear.

**Pasos (data ops, no código).**
1. En Google Sheets (hoja 3 = asesores): agregar fila con
   - `nombre`: Paola Daza
   - `slug`: paola-daza (URL-safe)
   - `rol`: Embajadora
   - `whatsapp`: (pedir al equipo)
   - `especialidad`: (pedir al equipo)
   - `email`: (pedir al equipo)
2. Subir foto perfil a Drive vía `api/ambassador-photo` o desde el admin panel.
3. Asignar inventario: cargar los item-ids específicos en la columna correspondiente de la hoja (o en la nueva pestaña de overrides/asignaciones si existe).
4. Validar visualmente: `/ambassadors/paola-daza` renderiza perfil completo con foto y productos asignados.

**Criterios de aceptación.**
- [ ] `/ambassadors/paola-daza` carga sin errores.
- [ ] Foto visible con fallback correcto (probado en Safari iOS).
- [ ] Al menos 5 productos asignados visibles en su colección.
- [ ] WhatsApp deep-link funciona (`useWhatsAppContact`).
- [ ] Aparece en listado `/ambassadors`.

**Effort.** 0.5 día · **Riesgo.** Bajo (data ops). Puede bloquearse si T4 (overrides) cambia el modelo de datos — decidir orden.

---

### T6 — Video de subastas con Pencil + Claude (vidgen)

**Problema.** Producir un video corto (~15-30s) para anunciar subastas.

**Pasos.**
1. **Input.** El equipo entrega imágenes y videos de referencia (assets en Drive).
2. **Guión.** 3-5 escenas cortas: apertura con logo → hero del lote → CTA.
3. **Producción.**
   - Usar la skill `vidgen` (ver `/sessions/busy-exciting-fermi/mnt/.claude/skills/vidgen/SKILL.md`) para generar/animar escenas desde stills.
   - Usar Pencil MCP para maquetar el layout de cada frame con los tokens de `ds-v4` (esmeralda + oro).
   - Música: track libre de derechos; SFX sutil en transiciones.
4. **Post.** Ensamblar con `vidgen` (assembly de frames/clips).
5. **Exportar.** 1080p vertical (9:16) para Stories/Reels + 1080p cuadrado (1:1) para feed.

**Criterios de aceptación.**
- [ ] Dos exports finales (9:16 y 1:1) en `computer:///sessions/busy-exciting-fermi/mnt/TierraMadre/mnt/TierraMadre/dist-videos/` (o carpeta que el equipo indique).
- [ ] Logo final con animación (ver T7 — dependencia).
- [ ] Duración entre 15s y 30s.
- [ ] Revisado por el equipo antes de publicar.

**Effort.** 2 días (asumiendo assets listos) · **Riesgo.** Medio (depende de entregas externas).

**Dependencia.** T7 (animación del logo).

---

### T7 — Animación del logo Tierra Mädre

**Problema.** Branding actual usa PNG estáticos. Se quiere una versión animada para video, splash screen y transiciones.

**Entregables.**
1. **Animación de logo** (reveal 1.5-2s) en formato:
   - **Lottie (`.json`)** — para uso en la app (usar `lottie-react` o `framer-motion` con paths SVG).
   - **MP4/WebM** con canal alpha — para ediciones externas.
   - **GIF** — para WhatsApp/social.
2. **Micro-loop** de 3-4s (opcional, para loaders discretos).

**Estrategia técnica.**
- Base: tomar el SVG del logo (si no existe, vectorizar `public/logo-symbol.png`).
- Animar con After Effects + Bodymovin → Lottie JSON, **o** directamente con Framer Motion sobre paths SVG dentro de React.
- Tokens de color: `emeraldCore.primary` + `goldAccent.primary` de `src/design-system`.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (iOS-like) consistente con el resto de la app.

**Integración en la app.**
- Reemplazar splash screen estática en `src/App.tsx` (o `LocalizedLoading` inicial) con el Lottie de logo.
- Agregar al onboarding del invitado (`src/pages/InvitationPage.tsx`).

**Criterios de aceptación.**
- [ ] 4 archivos entregados: `.json` (Lottie), `.webm`, `.gif`, `.mp4`.
- [ ] Animación funciona sin jank a 60fps en iPhone 12+ (medir con Safari devtools).
- [ ] Versión dark y light (o responde a `prefers-color-scheme`).
- [ ] Preview en Storybook/DesignSystemPage (`src/pages/DesignSystemPage.tsx`).

**Effort.** 2 días · **Riesgo.** Medio (calidad del branding depende del gusto del equipo — prever 1 ronda de iteración).

---

### T8 — Recrear la página web de TM (vencida 13 abr 19:00)

**Problema.** El sitio web necesita ser rehecho. Esta tarea es del tamaño de un mini-proyecto.

**Recomendación.** **No resolverla dentro del sprint** — abrir un spec dedicado con:
1. Audiencia objetivo (clientes finales vs B2B vs embajadores).
2. Stack (¿Astro? ¿Next.js marketing? ¿Reusar `tierra-madre-studio`?).
3. CMS (¿Notion? ¿Google Sheets como CMS? ¿Sanity?).
4. SEO + Open Graph (reutilizar `api/og-product.js`).
5. Copy e identidad (coordinar con KIRA).

**Spec placeholder:** `docs/specs/YYYY-MM-DD-tm-website-redesign-spec.md` (a crear en la semana de kickoff).

**Estimación.** 2-4 sprints · **Prioridad sugerida.** Alta, pero con alcance reducido para MVP v1.

---

### T9 — Bóveda Secreta (completar)

**Estado actual.** `src/pages/VaultPage.tsx` existe como placeholder con el header y descripción, pero no muestra productos. Hay storage keys definidos (`VAULT_UNLOCKED`, `VAULT_ATTEMPTS`, `VAULT_COOLDOWN`) y tipos (`isVaultExclusive?: boolean`).

**Problema.** Completar la experiencia: gate de acceso (código/invitación), galería de items exclusivos, flujo de contacto directo.

**Requerimientos mínimos.**
1. **Gate de acceso.** Entrada por código compartido por admin (no público). Implementar cooldown (`VAULT_COOLDOWN`) tras 3 intentos fallidos (`VAULT_ATTEMPTS`).
2. **Curaduría.** Productos marcados con `isVaultExclusive: true` en el Sheet.
3. **UX diferenciada.** Fondo oscuro permanente, dorado como color primario, animación de "revelación" al abrir un item.
4. **Contacto 1-a-1.** Al abrir un item, CTA directo al admin vía WhatsApp (`useWhatsAppContact` con contexto `vault`).
5. **Analytics separados.** `vault_unlock_success`, `vault_item_viewed`, `vault_contact_initiated`.

**Estimación.** 2-3 sprints · **Spec propio recomendado** (`docs/specs/YYYY-MM-DD-vault-spec.md`).

---

### (Idea registrada) — Memplace en Telegram/WhatsApp

Mantener en backlog de ideas. No entra al plan hasta que Producto la priorice.

---

## 4. Priorización y secuencia

**Regla.** Quick wins primero (libera capacidad de cabeza), luego features de embajador (mayor ROI comercial), luego contenido/branding, luego proyectos grandes.

```
Sprint 1 (semana 1):  T1 + T2 + T5  (quick wins + onboarding Paola)
Sprint 2 (semana 2):  T3 + T7       (UX embajador + branding logo)
Sprint 3 (semana 3):  T4 + T6       (overrides embajador + video)
Backlog dedicado:     T8 (Web) y T9 (Bóveda) — spec aparte cada uno
```

**Capacidad asumida.** 1 dev full-time + 1 diseñador part-time + apoyo ocasional del equipo creativo.

---

## 5. Dependencias cruzadas

- **T5** (Paola) se beneficia de cerrar **T4** (overrides), pero puede hacerse antes si no necesita custom price/name. Recomendación: **hacer T5 primero** con datos básicos; si Paola quiere custom pricing después, se aplica T4 cuando esté lista.
- **T6** (Video) depende de **T7** (Animación logo) para el cierre/opening del video.
- **T3** (FAB + reordenar) no bloquea **T4** (overrides) — son desacoplables.
- **T4** (overrides) idealmente se alinea con la migración a Convex (`docs/specs/convex-migration-spec.md`) para evitar construir persistencia en Sheets que se tire después.

---

## 6. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| T4 requiere decisión de backend (Sheets vs Convex) | Bloquea 3-4 días de dev | Decidir con Producto en día 1; fallback a localStorage para demo |
| T6 depende de assets externos | Retraso en sprint 3 | Pedir assets **en kickoff del sprint 1** para paralelizar |
| T7 animación puede requerir varias rondas | Retraso en T6 | Entregar v1 "suficiente" al día 2 y dejar polish para después |
| T8 y T9 son proyectos grandes disfrazados de tareas | Expectativas desalineadas | Comunicar explícitamente a stakeholders que se abren specs aparte |
| Paola Daza (T5) llega sin fotos/WhatsApp | Bloqueo datos | Recolectar todo antes del sprint 1 |

---

## 7. Criterios de cierre del plan

- [ ] T1, T2, T5 cerrados al final de semana 1 — **demo interna.**
- [ ] T3, T7 cerrados al final de semana 2 — **demo con equipo creativo.**
- [ ] T4, T6 cerrados al final de semana 3 — **demo a embajadores piloto (Paola + 1-2 más).**
- [ ] Spec separado creado para T8 y T9 con owner y timeline.
- [ ] Todas las tareas actualizadas en Mi Tiempo (marcadas `Hechas`).

---

## 8. Observaciones del repo relevantes

- La regla **Anti-Blinking** (ver `CLAUDE.md`) aplica a T3 cuando agreguemos el FAB: usar `useId()` para keys, reservar espacio con `aspectRatio`, evitar animaciones complejas.
- T4 debe usar el barrel canónico `@/design-system` para tokens — no crear utilidades de color locales.
- T6/T7 deben subir assets a `public/images/` o `src/assets/` respetando naming kebab-case.
- Antes de cada deploy: `npm run build` (auto-actualiza `APP_VERSION` para Safari cache-busting) y verificar `git status` incluya `index.html` y `public/version.json`.
- El deploy es **auto** en push a `main` en Vercel proyecto `tierra-madre-studio` — **no** correr `vercel` manualmente.

---

## 9. Siguiente paso inmediato

1. Revisar este spec con el equipo (30 min).
2. Confirmar prioridades y capacidad para Sprint 1.
3. Abrir issues/tasks en el tracker por cada T# con el texto de "Criterios de aceptación" como checklist.
4. Pedir assets de T5 (fotos/datos Paola) y T6 (referencias video) **antes** de arrancar.
5. Agendar kickoff Sprint 1.

---

_Hecho con amor verde-esmeralda en Colombia 💚_
