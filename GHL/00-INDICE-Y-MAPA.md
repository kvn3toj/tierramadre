# Guía de construcción — Sistema Tierra Madre (índice y mapa)

> Cómo se construye TODO el sistema, paso a paso, basado en cómo funciona GHL de verdad
> (ver `../GHL-MECANICA.md`). Cada documento de esta carpeta es una guía detallada por área.
> Marca qué hace **🤖 la IA (Claude) automático** y qué es **✋ manual (humano en la UI)**.

## Documentos de esta guía
- **00** (este) — índice, arquitectura, orden de construcción, mapa de conexiones, tabla AI vs manual.
- **01-GHL.md** — CRM, canales, bot María (Agent Studio), workflows, agentes. (✋ casi todo manual UI)
- **02-SUPABASE.md** — base de datos, Edge Functions, storage, auth. (🤖 lo construye la IA por código)
- **03-WEB-MADRE.md** — sitio Vite: catálogo, carrito, checkout, admin, panel embajador. (🤖 código IA / ✋ deploy)
- **04-INTEGRACIONES.md** — Cloudflare Workers (mp-webhook), Mercado Pago, webhooks. (🤖 código / ✋ cuentas)
- **05-META-WHATSAPP.md** — plantillas WhatsApp + conexión de canales en Meta. (✋ manual)
- **06-FLUJOS-CONEXION.md** — cómo se comunican TODAS las áreas (los flujos reales end-to-end).

## Arquitectura (5 piezas, GHL al centro)

```
   CANALES                 CEREBRO                  COMERCIO + DATOS
 WhatsApp ─┐         ┌──────────────────┐        ┌──────────────────────┐
 Instagram ─┼──────▶ │  GoHighLevel     │◀──────▶│  Supabase (DB+Fns)   │
 TikTok ───┤         │  - Inbox unif.   │  API   │  - catálogo/órdenes  │
 Web Chat ─┘         │  - Bot María     │        │  - embajadores       │
                     │    (Agent Studio)│        │  - comisiones        │
                     │  - Pipeline 7et. │        └─────────┬────────────┘
                     │  - Workflows     │                  │ (lee/escribe)
                     │  - Agentes/pools │        ┌─────────▼────────────┐
                     └────────┬─────────┘        │  Web madre (Vite)    │
                              │ webhooks         │  catálogo+carrito+   │
                     ┌────────▼─────────┐        │  checkout+admin+     │
                     │ Cloudflare Works │        │  panel embajador     │
                     │ mp-webhook, etc. │◀──────▶│  (Mercado Pago)      │
                     └──────────────────┘        └──────────────────────┘
```

**Regla de oro:** un solo catálogo (Supabase) alimenta la web Y la búsqueda del bot. El bot manda
el **link de checkout de la web**; la compra se cierra en la web (carrito → datos → Mercado Pago).

## Orden de construcción (qué primero y por qué)

| Fase | Qué | Depende de | Quién |
|---|---|---|---|
| 0 | Cuentas: GHL (✅), Supabase, Mercado Pago, Meta, Vercel + dominio | — | ✋ tú |
| 1 | **GHL base por API** (14 custom fields, pipeline, 48 tags) | cuenta GHL | 🤖 **HECHO** |
| 2 | **Supabase** (17 tablas + Edge Functions + storage) | proyecto Supabase | 🤖 IA por código |
| 3 | **Web madre (Vite)** (catálogo, carrito, checkout, admin, embajador) | Supabase + Mercado Pago | 🤖 código IA / ✋ deploy |
| 4 | **Cloudflare Workers** (mp-webhook + scheduler) | Supabase + Mercado Pago | 🤖 código / ✋ deploy |
| 5 | **Canales en Meta + GHL** (WhatsApp/IG/TikTok OAuth) + plantillas | cuenta Meta | ✋ manual |
| 6 | **Bot María en Agent Studio** (LLM + KB tool + API tools a Supabase) | Supabase + canales | ✋ manual UI |
| 7 | **Workflows GHL** (WF-01 etc., bookkeeping/escalación) | agentes creados | ✋ manual UI |
| 8 | **QA / soft launch** (probar los flujos con gente real) | todo lo anterior | ✋ + 🤖 verifica |

> Crítico: GHL base ya está (Fase 1). El siguiente desbloqueo real es **Supabase** (Fase 2), porque
> de él dependen la web, el bot (API tools) y casi todo lo demás.

## Tabla: qué automatizo yo (🤖) vs qué es manual (✋)

| Tarea | 🤖 IA | ✋ Manual | Por qué |
|---|---|---|---|
| GHL: custom fields, pipeline, tags | ✅ HECHO | — | API v2 lo permite |
| GHL: crear pipeline/renombrar | parcial | renombre fue UI | API no crea pipelines (401) |
| GHL: Conversation AI / Agent Studio (bot) | — | ✋ | Solo UI |
| GHL: workflows | — | ✋ (con mis guías) | API no crea workflows; el builder no carga en navegador headless |
| GHL: conectar canales (WhatsApp/IG/TikTok OAuth) | — | ✋ | Login/2FA con tus cuentas |
| GHL: subir KB / agentes / pools | — | ✋ | Solo UI |
| GHL: operar datos (contactos, oportunidades, tags, mensajes) | ✅ vía MCP/API | — | API/MCP lo permite |
| Supabase: esquema + Edge Functions + triggers + RLS | ✅ por código/CLI | — | Es código, lo escribo y despliego |
| Supabase: crear el proyecto + dar keys | — | ✋ | Tu cuenta |
| Web madre (Vite): todo el código | ✅ por código | — | Es código |
| Web madre: deploy a Vercel + dominio + env | parcial | ✋ confirmas | Cuenta/credenciales tuyas |
| Cloudflare Workers: código | ✅ | — | Es código |
| Cloudflare Workers: deploy (wrangler) + secrets | parcial | ✋ | Tu cuenta CF |
| Mercado Pago: cuenta + credenciales | — | ✋ | Tu cuenta |
| Meta: registrar plantillas WhatsApp | — | ✋ (te doy textos listos) | Va en Meta Business Manager, aprueba Meta |
| Probar/verificar flujos | ✅ (creo contactos de prueba) | ✋ pruebas reales | Mezcla |

## Mapa de comunicación (resumen — detalle en 06)
- **Canales → GHL:** los mensajes entran al inbox unificado de GHL.
- **GHL ↔ Supabase:** el bot (Agent Studio, API tools) y los workflows (Custom Webhook) llaman Edge
  Functions de Supabase con header `Authorization: Bearer {{INTERNAL_API_SECRET}}`.
- **Web ↔ Supabase:** la web lee el catálogo y crea órdenes en Supabase (supabase-js).
- **Web/Supabase → Mercado Pago:** el checkout de la web genera el pago.
- **Mercado Pago → Cloudflare → Supabase/GHL:** webhook de pago confirma la orden y avisa a GHL.
- **GHL → equipo humano:** escalación por "Human Handover" + "Assign to User" (round-robin).

## IDs reales ya creados (no cambiar)
- GHL Location: `t3tOZBrR05jUoLqnDn4I` · Pipeline "Ventas Tierra Madre": `u4MPXH2HdEFmU3vVqNdd`
- Bot legacy Conversation AI: `wMfconpBCdms3CprYrpc` · Knowledge Base "Tierra Madre KB": `OHDQ6vwrSUBsPD5rwHlK`
- Custom field keys: `contact.presupuesto_declarado`, `contact.tipo_interes`, etc. (ver REPORTE-EJECUCION.md)
- Stage IDs: ver `output/workflows-blueprint.md` §datos reales.
