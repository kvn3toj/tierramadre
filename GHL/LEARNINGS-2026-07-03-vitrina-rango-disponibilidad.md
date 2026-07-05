# Learnings — Colección/Vitrina: rango de precio, tipo de pieza y disponibilidad

> Sesión de validación en vivo (Progresy `t3tOZBrR05jUoLqnDn4I` + tierramadre.app), 2026-07-03.
> Caso real: lead **Andrey C.** (WhatsApp, +57 313 3828052) — calificado como **regalo · anillo · ~$5.000.000 · primera vez**.
> Fuente de verdad del prompt: [`GHL/output/bot-maria-prompt.md`](output/bot-maria-prompt.md). Estado global: [`GHL/ESTADO-Y-PROXIMOS-PASOS.md`](ESTADO-Y-PROXIMOS-PASOS.md).

---

## 1. Qué se validó (en vivo)

### 1.1 La cadena WF-04 no dispara sola

- **WF-04 "Búsqueda en catálogo"** se dispara por el tag **`buscar-catalogo`** (trigger "Etiqueta de contacto → añadida includes 'buscar-catalogo'").
- **María (Conversation AI) NO tiene acción configurada** para aplicar ese tag → el workflow **nunca dispara** en leads reales.
- Evidencia: Andrey completó las 4 preguntas de calificación → el bot **quedó mudo**, contacto con **0 etiquetas**, Propietario "Sin asignar". WF-04 muestra **7 inscritos históricos** (pruebas manuales) y **0 inscripción activa**.

### 1.2 El webhook de WF-04 está BIEN configurado

- `POST https://tierramadre.app/api/ghl-search-products`
- Header `Authorization: Bearer {{custom_values.internal_api_secret}}` (auth correcta, no por el dropdown "Autorización").
- Body: `{"intent":{"categoria":"{{contact.tipo_interes}}"},"presupuesto":{{contact.presupuesto_declarado}}, ...}`
- El endpoint (`api/ghl-search-products.ts` → `convex/ghl.ts:searchProducts` → `convex/_lib/productSearch.ts`) filtra: publicado + **DISPONIBLE** + precio **≤ presupuesto × 1.2**, máx 3, ordenado por match de categoría y luego precio, y arma `vitrina_link = /v/{id1}-{id2}-{id3}`.

### 1.3 El presupuesto NO se captura

- Andrey escribió `5000000` pero el custom field **`Presupuesto declarado COP` quedó vacío**.
- María no escribe custom fields (sin acciones). → Si WF-04 disparara, `presupuesto` iría vacío → `presupuestoMax = Infinity` → devolvería **las 3 piezas más caras**, ignorando el rango del cliente.

### 1.4 El tipo de pieza (anillo) se ignora

- El body manda `categoria = "anillo"` (de `tipo_interes`), pero el catálogo usa **nombres de categoría interna**: `Anillo en Oro`, `Anillo en Plata`, `Gema`, `Gema Facetada`, `Joyas`, `Gola`, `Muralla`, `Pulsera`, `COLECCIÓN 11:11`, etc.
- `"anillo"` no hace match estricto con `"Anillo en Oro"` → cae al **fallback "solo en presupuesto"**. **Hoy solo se respeta el PRECIO, no el tipo.**

---

## 2. Sobre los enlaces `/v/` (vitrina) — mecánica real

- Dos formas (`src/pages/vitrina/VitrinaPage.tsx`):
  - **Token stateful** — `/v/AB3K9P`, registro Convex `vitrinas` (precio/moneda/senderSlug guardados).
  - **Lista de IDs stateless** — `/v/115-114-113`, renderiza esos ítems directo del catálogo (precio x1 COP por defecto).
- ⚠️ **La lista de IDs stateless es INMUTABLE y NO revocable**: siempre renderiza esos IDs. **No existe "desactivar enlace".**
- ⚠️ Ni los tokens stateful se pueden desactivar/editar hoy: `convex/vitrinas.ts` solo expone `create` y `getByToken` (sin `update`/`disable`/`revoke`).
- ⚠️ **Un WhatsApp ya enviado NO se puede editar ni "actualizar el link"** desde GHL. Para corregir hay que **enviar un mensaje nuevo** con el link corregido.
- ⚠️ **Los ítems VENDIDOS SÍ se comparten** por `/v/`: la página pública **no muestra badge de "vendido"**. `ghl-search-products` sí filtra `DISPONIBLE`, pero un `/v/` manual no.

---

## 3. Inventario de anillos (dato de negocio, 2026-07-03)

| Filtro                                       | Resultado                               |
| -------------------------------------------- | --------------------------------------- |
| `Anillo en Oro` · Disponibles                | **1** → Infinito Amor #115 ($5.460.000) |
| `Anillo en Plata` · Disponibles              | 1 → Pocahontas #52 ($340.000)           |
| `Anillo en Oro` · **Todas** (incl. vendidos) | **11**, total $59.142.562               |

**Anillos en Oro en rango ~$5M** (varios vendidos): Infinito Amor #115 ($5.46M, _disponible_), Reina Carlota #114 ($5.46M), Reina Cleopatra #113 ($5.16M), Duquesa Leonor (~$5.20M).

**No son anillos** (son dijes/collares Oro 18k, "Colección Madres", ~$5.5M): corazón de Venus #302, Diosa Maya #301, corazón de Plutón.

> Insight: sólo hay **UN anillo disponible** cerca de $5M. Para dar "más opciones" de anillos en rango hay que **incluir vendidos** (permitido) o proponer piezas a pedido/custom.

---

## 4. Acciones tomadas (caso Andrey)

1. **1ª colección** enviada `/v/115-52` (Infinito Amor + Pocahontas $340K) — ❌ **error**: Pocahontas fuera de rango (outlier barato).
2. **Corrección** enviada `/v/115-114-113` (3 anillos Oro 18k, $5.16–5.46M) — ✅ rango consistente, solo anillos. 2 de 3 vendidos (compartidos con permiso explícito). Mensaje de takeover humano → María queda inactiva en el hilo.

---

## 5. Reglas para PRÓXIMAS colecciones (política)

1. **Rango de precio consistente** — todas las piezas dentro de una banda estrecha del presupuesto declarado (objetivo **~0.8×–1.2×**). **Nunca** mezclar un outlier barato (p.ej. $340K junto a $5.46M).
2. **Coincidir el tipo de pieza** — si pidió anillo, mostrar anillos (requiere mapa `tipo_interes` → `categoria`).
3. **Disponibilidad** — si la colección puede incluir piezas vendidas/reservadas, agregar la línea:
   > **"Disponibilidad sujeta a confirmación con tu asesor 💚"**
   > (No se aplicó al mensaje de Andrey por pedido explícito; **aplica de aquí en adelante**.)

---

## 6. Cambios a aplicar en Progresy (training / config)

### 6.1 Bot María (Conversation AI) — Acciones (hoy: NINGUNA)

- [ ] **Escribir custom fields** en cada respuesta: `tipo_interes`, `ocasion`, `presupuesto_declarado`, `conocimiento_esmeraldas`.
- [ ] **Acción "Iniciar flujo — Enviar Vitrina → WF-04"** al completar calificación (aplica tag `buscar-catalogo`).
- [ ] Acción "Escalación → WF-06 + WF-11" (humano/queja/molestia/inversión >5M).
- [ ] Acción "Compra con asesor → WF-05B" (cliente eligió pieza / quiere pagar).

### 6.2 WF-04 — mensaje de WhatsApp

- [ ] Añadir línea final: **"Disponibilidad sujeta a confirmación con tu asesor 💚"**.

### 6.3 Prompt v2 de María (`bot-maria-prompt.md`) — ENTREGA DE OPCIONES

- [ ] Añadir a la sección "ENTREGA DE OPCIONES": _"Cuando la colección pueda incluir piezas ya reservadas/vendidas, cierra con 'Disponibilidad sujeta a confirmación con tu asesor'."_

### 6.4 Taxonomía (código, follow-up)

- [ ] Mapa `tipo_interes` → `categoria` del catálogo (anillo → `Anillo en Oro`/`Anillo en Plata`; aretes → `Aretes`; dije → `Dije`; gema → `Gema`/`Gema Facetada`; set → …). Ubicación sugerida: normalizador en `convex/_lib/productSearch.ts` o previo al webhook.

### 6.5 Decisión de negocio pendiente

- ¿`ghl-search-products` debe incluir vendidos como "muestra"? **Hoy filtra `DISPONIBLE` (correcto para venta directa).** Para colecciones de muestra con vendidos, usar links `/v/` manuales + línea de disponibilidad.

---

## 7. Notas operativas (Progresy UI)

- El input de WhatsApp en el inbox es un editor enriquecido: **escribir texto solo "prende" tras click en el área expandida** (usar el ref del textbox tras expandir; escribir en el colapsado no registra).
- La lista de conversaciones **se reordena** al recibir mensajes → clickear por coordenada falla; usar búsqueda por nombre / `find`.
- El filtro "Disponibles / Vendidas / Todas" **se resetea a "Disponibles"** al navegar "atrás".
