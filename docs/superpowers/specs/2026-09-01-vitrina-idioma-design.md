# Vitrina en el idioma del cliente — diseño

**Fecha:** 2026-09-01 · **Iniciativa:** TM-VITRINA-MULTISEL, rebanada 2 (`TM-VITRINA-IDIOMA`)
· **Decisor:** Kevin · **Rama:** `feat/vitrina-idioma` desde `origin/main` `992ee2d`.

## Problema

El asesor acuña un enlace `/v/<token>` para un cliente y el cliente lo abre en español, sea
quien sea. `src/pages/vitrina/VitrinaPage.tsx` y `src/pages/vitrina/PublicProductView.tsx` no
usan `LanguageContext` (0 ocurrencias de `useLanguage`/`t.` en ambos, medido 2026-09-01); todo
el texto es español fijo. `src/locales/*.ts` no tiene ninguna clave de vitrina. El registro
`vitrinas` guarda `currency`, `multiplier` y `senderSlug`, nada de idioma.

## Decisiones (Kevin, 2026-09-01)

1. **Los seis idiomas** que ya existen en `src/locales` (`es en fr it zh pt`).
2. **El idioma vive en el registro** de la vitrina (`lang` opcional). El enlace sigue limpio,
   `/v/<token>`; editar un enlace enviado puede cambiar el idioma. Los enlaces sin estado
   (`/v/324-323-370`) quedan en español.
3. **El mensaje que lleva el enlace** (native share y WhatsApp) va en el idioma elegido.

## Diseño

### 1. Datos

- `convex/schema.ts` → `vitrinas.lang: v.optional(v.union(6 literales))`. Expandir, no migrar:
  las filas existentes no lo tienen y se leen como `'es'`.
- `convex/vitrinas.ts` → `create` y `update` aceptan `lang` opcional con el mismo validador.
  `getByToken` lo devuelve **también cuando la vitrina venció** (verificar la proyección de
  vencida: hoy quita precios; `lang` no es precio y debe sobrevivir, porque la pantalla de
  «cotización vencida» también se traduce).
- `api/vitrina.ts` → POST y PATCH leen `body.lang`; se valida contra la lista de seis, y lo que
  no esté en la lista cae a `'es'` — mismo patrón que `currency` (`api/vitrina.ts:245-248`,
  `:286`). Nunca se inventa otro valor.

### 2. Diálogo (`src/components/vitrina/VitrinaShareDialog.tsx`)

- Un selector «Idioma» debajo del bloque «Moneda» (`:539-562`), con las seis opciones de
  `LANGUAGE_OPTIONS` (`src/locales/index.ts:23`, bandera + nombre). Seis entradas no caben en
  un `ToggleButtonGroup` de 320px: usar `Select` de MUI (o el `Field` de DS3 si ya envuelve un
  select) con `label="Idioma"`.
- Valor inicial: el idioma actual de la app (`useLanguage().language`); `reset()` (`:222-233`)
  lo devuelve a ese valor, no a `'es'`.
- El valor viaja en el POST (`:279-291`) y en el PATCH (`:331-380`) como `lang`.
- `navigator.share({ title, text })` (`:312-316`) y el botón de WhatsApp (`:796`, hoy manda solo
  el enlace) usan `translations[lang].vitrinaShare` — título, texto con `{n}` piezas y el
  mensaje de WhatsApp que incluye el enlace. El enlace no cambia.

### 3. Página pública (`/v/:code`)

- `VitrinaPage.tsx` lee `tokenDoc.lang ?? 'es'` y construye una tabla local:
  `const tv = translations[lang].vitrina`. **No llama a `setLanguage`**: un asesor que abre su
  propio enlace para revisarlo no debe ver cambiar el idioma de su app.
- Efecto: `document.documentElement.lang = lang` mientras la página está montada, restaurando
  el valor anterior al desmontar.
- `tv` baja por props a `PublicProductView` (y a `mensajeCotizacionVencida` solo para la
  etiqueta del botón; el cuerpo del mensaje que el cliente envía a la casa sigue en español
  porque quien lo lee es la casa).
- Enlaces de lista de ids (`isIdList`, `:327`) → `'es'`.

### 4. Claves nuevas (en los seis archivos de `src/locales`)

`Translations = typeof es` (`index.ts:15`): añadir la sección a `es.ts` obliga por `tsc` a
añadirla en los otros cinco. Sección `vitrina`:

| clave                            | es (referencia)                                                      |
| -------------------------------- | -------------------------------------------------------------------- |
| `caption`                        | «Selección para ti · {n} piezas» (singular «pieza»)                  |
| `expiredTitle`                   | «Esta cotización ya venció»                                          |
| `expiredBody`                    | texto de `VitrinaPage.tsx:209`                                       |
| `expiredCta`                     | «Pedir cotización actualizada»                                       |
| `unavailableTitle`               | «Enlace no disponible»                                               |
| `unavailableBody`                | «Este enlace ya no está activo. Escríbenos y con gusto te ayudamos.» |
| `back`                           | «Volver»                                                             |
| `price`                          | «Precio»                                                             |
| `consultWhatsApp`                | «Consultar por WhatsApp»                                             |
| `pay`                            | «Pagar»                                                              |
| `addToSelection` / `inSelection` | «Agregar a mi selección» / «En tu selección»                         |
| `footerTagline`                  | «Tierra Mädre · Esmeraldas colombianas con ADN de paz»               |

Sección `vitrinaShare`: `shareTitle` («Tierra Mädre — Selección para ti»), `shareText`
(«Estas piezas son para ti 💚 ({n} piezas)»), `whatsappMessage` (texto + `{link}`),
`languageLabel` («Idioma»). Las traducciones las escribe `kira`; `zh` con revisión humana antes
de merge (marcar en el PR).

**Fuera de esta rebanada, a propósito:** las etiquetas técnicas de la ficha (`SpecGroups`,
`GemStats`, `GemPills`, `TrustCard`, `RelatoBlock`, `FormulaPanel`, `CheckoutPieza`) son
componentes compartidos con la app autenticada. Un cliente en inglés verá botones y marco en
inglés y etiquetas de especificación en español. Rebanada 3 cuando esta aterrice.

### 5. Verificación

- Unit: test de completitud que carga los seis locales y falla si a alguno le falta una clave
  de `vitrina`/`vitrinaShare` (además del `tsc`); test de `api/vitrina.ts` (patrón de los tests
  de `api/` existentes) para `lang` inválido/ausente → `'es'` y válido → se conserva; test del
  diálogo que el body del POST lleva `lang` (mock de `fetch`).
- Playwright: vitrina con `lang: 'en'` → `/v/<token>` muestra el caption en inglés y
  `html[lang="en"]`; control negativo con `lang: 'es'` → caption en español y `html[lang="es"]`.
  Si el e2e no puede sembrar Convex, el test entra en el nivel de página con el query mockeado
  (patrón de los tests de página existentes) y se dice explícitamente.
- Manual: acuñar en `en` desde el diálogo, abrir en ventana privada, ver caption + botones en
  inglés y el `lang` del documento; el idioma de la app del asesor no cambió (control).

### 6. Despliegue

Campo opcional, sin migración. Orden Convex → Vercel (`docs/estado-sesiones.md`, cabecera):
`build:vercel` ya envuelve `convex deploy`. Merge = Kevin.
