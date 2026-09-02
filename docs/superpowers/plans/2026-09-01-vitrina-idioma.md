# Vitrina en el idioma del cliente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el asesor elija el idioma al acuñar el enlace, que ese idioma viva en el registro de la vitrina, que el mensaje que lleva el enlace salga en ese idioma, y que `/v/<token>` se abra en ese idioma — sin cambiarle el idioma de la app al asesor.

**Architecture:** El idioma es un campo opcional del registro (`vitrinas.lang`), no un parámetro de la URL: el enlace queda limpio y editable, y un enlace ya enviado puede cambiar de idioma sin reenviarse. La página pública NO usa `LanguageContext` — construye una **tabla local** `translations[lang].vitrina` y la baja por props. Esa es la decisión que impide que un asesor revisando su propio enlace vea cambiar el idioma de su app.

**Tech Stack:** React 18 + TypeScript, MUI v6, Convex, Vercel functions, Vitest (+ jsdom para `.test.tsx`).

**Spec:** `docs/superpowers/specs/2026-09-01-vitrina-idioma-design.md`

## Global Constraints

- **Convex: expandir, no migrar.** `lang` es `v.optional(...)`. Las filas ya acuñadas no lo tienen y se leen como `'es'`. Sin backfill, sin `convex/migrations.ts`.
- **`getByToken` devuelve `lang` en las DOS ramas.** La proyección de vencida quita **precio** (`multiplier`, `currency`) porque mostrar un precio viejo obliga a honrarlo o a explicarlo. `lang` no es precio: la pantalla de «cotización vencida» también se traduce, y quitarlo la dejaría en español para un cliente que nunca leyó español.
- **Un solo default, y es `'es'`.** El servidor valida `body.lang` contra los seis códigos y todo lo demás cae a `'es'` — mismo patrón que `currency` (`api/vitrina.ts:245-248`, `:286`). Nunca se inventa otro valor.
- **`setLanguage` no se llama nunca desde la superficie pública.** El único efecto global permitido es `document.documentElement.lang`, y se restaura al desmontar.
- Enlaces sin estado (`/v/324-323-370`, y las rutas heredadas `/product/:itemId` y `/p/:itemId`, que resuelven como lista de un id) → `'es'`. No tienen registro, no tienen idioma elegido.
- **Nunca correr** `npm run build`, `npx convex deploy`, `npx convex dev`, `npx convex run`, ni ningún comando `vercel`: este repo apunta a un deployment de producción VIVO. Typecheck local seguro: `npx tsc --noEmit -p convex/tsconfig.json`.
- `npm run lint` **no está limpio en baseline**: `api/cotizacion-deck.ts` tiene 2 errores TS7016 preexistentes, también en `origin/main`. La vara es **cero errores nuevos**. No tocar ese archivo.
- Suite completa: `npm run test:unit` — **193 archivos / 1985 tests en verde** en baseline (medido 2026-09-01 sobre el árbol sin tocar).
- **Fuera de esta rebanada, a propósito:** las etiquetas técnicas de la ficha (`SpecGroups`, `GemStats`, `GemPills`, `TrustCard`, `RelatoBlock`, `FormulaPanel`, `CheckoutPieza`) son componentes compartidos con la app autenticada. Un cliente en inglés verá marco y botones en inglés y especificaciones en español. Es la rebanada 3.
- La rebanada 1 (multi-selección del catálogo) se construye en paralelo en `.claude/worktrees/seleccion-vitrina`. Las vallas de archivo son disjuntas por diseño: **no tocar** `src/components/treasure/**`, `src/hooks/useTreasureBrowserController.tsx`, `CartPage.tsx`, `CollectionPage.tsx`, `src/design-system/**`.

## Nota sobre el plural

El español ramifica «pieza»/«piezas»; el chino no ramifica nada. En vez de un motor de pluralización, cada frase con conteo lleva **dos claves completas** (`caption`/`captionOne`, `shareText`/`shareTextOne`, `whatsappMessage`/`whatsappMessageOne`) y el llamador elige según `n === 1`. Es más texto y menos maquinaria: una lengua que no distingue singular de plural pone la misma frase en las dos claves, y ninguna sufre una regla ajena.

---

### Task 1: Las claves, en los seis idiomas

`Translations = typeof es` (`src/locales/index.ts:15`) hace que agregar la sección a `es.ts` **obligue** por `tsc` a agregarla en los otros cinco. Pero `tsc` sólo prueba que la clave existe, no que alguien la tradujo — por eso además va un test de completitud que compara los seis mapas contra `es`.

**Files:**

- Modify: `src/locales/es.ts`, `en.ts`, `fr.ts`, `it.ts`, `zh.ts`, `pt.ts`
- Create: `tests/localesVitrinaCompletos.test.ts`

**Interfaces:**

- Produces: `translations[lang].vitrina` y `translations[lang].vitrinaShare` para los seis `Language`.

Claves de `vitrina`: `caption`, `captionOne`, `expiredTitle`, `expiredBody`, `expiredCta`, `unavailableTitle`, `unavailableBody`, `back`, `price`, `consultWhatsApp`, `pay`, `addToSelection`, `inSelection`, `footerTagline`.

Claves de `vitrinaShare`: `languageLabel`, `shareTitle`, `shareText`, `shareTextOne`, `whatsappMessage`, `whatsappMessageOne`.

Los textos en español son **los que ya están en los archivos, movidos textuales** (`VitrinaPage.tsx:203,209,285,311,314,524`; `PublicProductView.tsx:301,370,429,455,491,505`; `VitrinaShareDialog.tsx:313-314`).

- [ ] **Step 1: Escribir el test rojo**

`tests/localesVitrinaCompletos.test.ts` recorre los seis locales y exige que cada clave de `vitrina`/`vitrinaShare` exista, sea `string` y no esté vacía; y que las claves de conteo contengan su marcador (`{n}`, y `{link}` en las de WhatsApp).

- [ ] **Step 2: Verlo rojo** — antes de tocar los locales el test ni compila (`vitrina` no existe en `es`). Correr y capturar el fallo.
- [ ] **Step 3: Escribir las secciones** en `es.ts` primero; `npm run lint` señala los cinco archivos que faltan; completarlos.
- [ ] **Step 4: Control negativo obligatorio** — borrar UNA clave de `fr.ts`, correr el test, **verlo rojo**, restaurarla, verlo verde. Un test que nunca se vio rojo no es un test.
- [ ] **Step 5: Verificar** `npm run test:unit -- localesVitrinaCompletos` + `npm run lint` (sólo los 2 errores preexistentes).
- [ ] **Step 6: Commit** `feat(vitrina): las claves de la vitrina pública en los seis idiomas`

---

### Task 2: El idioma vive en el registro (Convex)

**Files:**

- Modify: `convex/schema.ts` (un campo opcional en `vitrinas`)
- Modify: `convex/vitrinas.ts` (`create`, `update`, `getByToken`)

**Interfaces:**

- Produces: `vitrinas.lang?: 'es'|'en'|'fr'|'it'|'zh'|'pt'`; `getByToken` lo devuelve en la rama vencida y en la vigente.

- [ ] **Step 1:** `schema.ts` → `lang: v.optional(v.union(v.literal('es'), v.literal('en'), v.literal('fr'), v.literal('it'), v.literal('zh'), v.literal('pt')))`, con el comentario de por qué es opcional (filas ya acuñadas, sin migración).
- [ ] **Step 2:** `create` acepta `lang` con el mismo validador y lo inserta; `update` lo agrega al `patch` con el mismo `!== undefined` que ya usan los otros campos (omitir = no tocar).
- [ ] **Step 3:** `getByToken` mueve `lang` a `base` — **no** al objeto de la rama vigente — con un comentario que diga por qué sobrevive al vencimiento, al lado del que ya explica por qué `createdByEmail` también.
- [ ] **Step 4: Verificar** `npx tsc --noEmit -p convex/tsconfig.json` (exit 0). **No** `convex deploy`.
- [ ] **Step 5: Commit** `feat(vitrina): el idioma elegido vive en el registro, sin migrar una fila`

---

### Task 3: El servidor valida el idioma

**Files:**

- Modify: `api/vitrina.ts`
- Modify: `tests/vitrina.test.ts`

**Interfaces:**

- Produces: `export function idiomaValido(raw: unknown): Language` — exportada para poder probarla sola, como `verifiedSessionEmail` ya lo está en ese archivo.

- [ ] **Step 1: Escribir el test rojo** en `tests/vitrina.test.ts`, contra el handler real (mock de Convex + roster ya existen en ese archivo): POST sin `lang` → la mutación recibe `'es'`; POST con `lang: 'xx'` → `'es'`; POST con `lang: 'en'` → `'en'`; PATCH con `lang: 'fr'` → `'fr'`. Se inspecciona `convexMutations`, no la respuesta.
- [ ] **Step 2: Verlo rojo.**
- [ ] **Step 3:** implementar `idiomaValido` y pasarlo en las dos ramas. En POST el default es `'es'` (siempre viaja un valor); en PATCH `lang` sólo viaja si el body lo trajo válido — omitido = no cambia el idioma del enlace ya enviado.
- [ ] **Step 4: Verificar** el test verde + `npm run lint`.
- [ ] **Step 5: Commit** `feat(vitrina): el idioma se valida en el servidor y lo inválido cae a español`

---

### Task 4: El selector en el diálogo, y el mensaje que sale con el enlace

**Files:**

- Modify: `src/components/vitrina/VitrinaShareDialog.tsx`
- Create: `tests/vitrinaShareDialogIdioma.test.tsx`

**Interfaces:**

- Consume: `useLanguage()` (valor inicial), `LANGUAGE_OPTIONS`, `translations`.
- Produces: `lang` en el body del POST y del PATCH; `navigator.share({title,text})` y el `wa.me/?text=` en ese idioma.

Requisitos (no hay JSX literal acá: este repo tiene una migración de design system a medio camino — leer primero el bloque «Moneda» vecino, `:539-562`, e imitarlo):

- Un `Select` de MUI (no `ToggleButtonGroup`: seis opciones no caben en 320px), etiquetado con `translations[lang].vitrinaShare.languageLabel`, debajo del bloque «Moneda». Opciones de `LANGUAGE_OPTIONS`, bandera + nombre. Revisar antes si `src/design-system/components/Field` ya envuelve un select; si sí, usarlo.
- Valor inicial `useLanguage().language`. `reset()` (`:222-233`) vuelve **a ese valor**, no a `'es'`: quien comparte en inglés todo el día no debería re-elegirlo en cada enlace.
- `lang` viaja en el POST (`:279-291`) y en el PATCH (`:331-380`).
- El texto de `navigator.share` y el de WhatsApp salen de `translations[lang].vitrinaShare`, con `{n}` y `{link}` sustituidos, eligiendo la clave singular cuando `items.length === 1`. **El enlace no cambia.**
- El botón de WhatsApp hoy manda sólo el enlace (`:796`); pasa a mandar el mensaje completo con el enlace dentro.

- [ ] **Step 1: Escribir el test rojo** — render del diálogo con `fetch` mockeado, elegir `en` en el select, generar, y afirmar (a) que el body del POST lleva `lang: 'en'`, (b) que `navigator.share` recibió el `text` en inglés. Mockear `sessionToken`/`GoogleAuthContext` como haga falta.
- [ ] **Step 2: Verlo rojo.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Verificar** test verde + `npm run lint`.
- [ ] **Step 5: Commit** `feat(vitrina): el asesor elige el idioma y el mensaje sale en ese idioma`

---

### Task 5: La página pública se abre en el idioma del enlace

**Files:**

- Modify: `src/pages/vitrina/VitrinaPage.tsx`
- Create: `tests/vitrinaPageIdioma.test.tsx`

**Interfaces:**

- Consume: `tokenDoc.lang`.
- Produces: `const tv = translations[lang].vitrina`, bajado por props a `PublicProductView`; `document.documentElement.lang`.

- [ ] **Step 1: Escribir el test rojo** — `tokenDoc` mockeado (`useConvexQuery`), tres casos: `lang: 'en'` → caption en inglés y `html[lang="en"]`; **control negativo** `lang: 'es'` → caption en español y `html[lang="es"]`; ruta de lista de ids → español. Si Playwright no puede sembrar Convex (no hay deployment de pruebas y este repo apunta a producción viva), el test vive al nivel de página con el query mockeado — **y se dice por qué**, no se calla.
- [ ] **Step 2: Verlo rojo.**
- [ ] **Step 3: Implementar** — `lang` derivado en `VitrinaContent`, `tv` construido ahí, efecto que fija y restaura `document.documentElement.lang`, y `tv` pasado a `VencidaState`, `NotFoundState` y `PublicProductView`. `NotFoundState` se renderiza también cuando `tokenDoc === null` (no hay registro y por tanto no hay idioma): ahí `tv` es el español, y está bien.
- [ ] **Step 4: Verificar** test verde + `npm run lint`.
- [ ] **Step 5: Commit** `feat(vitrina): la página pública se abre en el idioma que eligió el asesor`

---

### Task 6: Los botones de la ficha

**Files:**

- Modify: `src/pages/vitrina/PublicProductView.tsx`
- Modify: `tests/vitrinaPageIdioma.test.tsx` (un caso más)

- [ ] **Step 1: Escribir el test rojo** — con `lang: 'en'` y un solo producto, la ficha muestra «Ask on WhatsApp» y no «Consultar por WhatsApp».
- [ ] **Step 2: Verlo rojo.**
- [ ] **Step 3: Implementar** — prop opcional `tv?: Translations['vitrina']` con el español por defecto, para que los tests existentes (`publicProductViewCertificado`, `publicProductViewOrdenPrecio`) que no lo pasan sigan verdes. Traducir `back` (`:301`, que es un `aria-label` — se traduce igual, es lo que oye un lector de pantalla), `price` (`:370`), `consultWhatsApp` (`:429`), `pay` (`:455`), `addToSelection`/`inSelection` (`:491`), `footerTagline` (`:505`).
- [ ] **Step 4: Verificar** la suite completa: 193 archivos / 1985 tests + los nuevos, cero regresiones.
- [ ] **Step 5: Commit** `feat(vitrina): los botones de la ficha pública hablan el idioma del enlace`

---

### Task 7: Cierre

- [ ] `npm run test:unit` completo — contar archivos y tests, comparar contra 193/1985.
- [ ] `npm run lint` — exactamente los 2 errores preexistentes de `api/cotizacion-deck.ts`, ninguno nuevo.
- [ ] Manual, si hay servidor de desarrollo y navegador: acuñar en `en`, abrir en ventana privada, ver el marco en inglés y `document.documentElement.lang`; comprobar que el idioma de la app del asesor **no** cambió (control). Si no se puede correr, dejar la lista y decirlo.
- [ ] `git push -u origin feat/vitrina-idioma` y PR contra `main` con spec, plan, conteos de tests y la nota **«zh necesita revisión humana antes de mergear»**. **No mergear** — el merge es de Kevin.
