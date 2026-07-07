# Auditoría de contactos GHL — backfill pendiente (2026-07-06)

Auditoría en vivo vía API v2 (`GET /contacts`, PIT token de `.env.local`).
Datos crudos por contacto: `output/contacts-audit-2026-07-06.json`.

## Resultado

**El backfill de contactos pre-bot NUNCA se ha hecho.** La calificación
(tags, tipo_interes, presupuesto, ciudad, score) solo existe hacia adelante
(María + WF-01), y ni siquiera cubre bien la era post-bot.

| Métrica                                          | Valor        |
| ------------------------------------------------ | ------------ |
| Contactos totales                                | **193**      |
| Con `tipo_interes`                               | 19 (10%)     |
| Con `presupuesto_declarado`                      | 11 (6%)      |
| Con `ciudad`                                     | 4 (2%)       |
| Con `lead_score` (custom field)                  | **0**        |
| Con `canal_origen`                               | 77 (40%)     |
| Sin ningún tag                                   | 99 (51%)     |
| Sin NINGÚN campo de calificación (tipo/pres/ciu) | **171 (89%)**|

### Por era

- **Pre-bot (antes 17-jun, 74 contactos):** 68 sin absolutamente nada
  (ni tags ni campos). Abril–junio: seguidores IG, joyeros, leads WhatsApp.
- **Post-bot (119 contactos):** 96 tienen solo `canal_origen` o menos —
  María solo califica a quien completa las 4 preguntas.

### Hallazgos extra

- `contact.lead_score` (custom field) está vacío en el 100% — coherente con
  "el backend nunca lo escribe"; el Engagement Score de Manage Scoring vive
  aparte (interno GHL) y estuvo apagado hasta hace poco → los históricos no
  acumularon nada.
- Duplicados visibles (mitchel moreno ×2, maritza campuzano ×2,
  migdalia gomez ×2, mauricio echeverry ×2 con canal distinto).
- Cuentas internas/basura mezcladas: `tierra madre`, `tierra mädre`,
  `comercial.tierramadre@gmail`, `policía`, contactos "." / emoji-only.

## Consecuencia

Cualquier WF de calidad de cliente que filtre por tag/campo/score excluye
hoy al **89%** de la base.

## Diseño del backfill (propuesto)

1. **Leer conversaciones históricas** por contacto sin campos
   (`GET /conversations/search?contactId=…` + messages) — ya existe patrón en
   `convex/_lib/ghlConversations.ts`.
2. **Clasificación IA** (gateway gemini→groq estilo Fotosynthia) por chat:
   - `tipo_interes` (valores reales: topito, candonga, anillo, dije,
     gema_suelta, set, otro), `presupuesto_declarado` (COP), `ciudad`,
     `ocasion`, y una **calidad proxy** `calidad-alta|media|baja`
     (score no se puede escribir — es de Manage Scoring).
   - Contactos sin conversación (seguidores IG sin chat) → tag `sin-conversacion`.
3. **Escritura bulk** vía `api/_lib/ghl-client.ts` (custom fields con
   `field_value`, tags por endpoint aditivo), token-bucket ≤100 req/10s.
4. **Dry-run primero** (CSV de propuestas para revisión) → luego apply.
   Solo probar escrituras con los 3 contactos de prueba
   (Kevin Tres Toj / Juan Ma Escobar / Isa La Negra Vikinga).
5. Extras opcionales: merge de duplicados, tag `interno` para cuentas propias.
