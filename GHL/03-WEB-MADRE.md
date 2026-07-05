# 03 · Web madre (Vite + React) — guía de construcción

> Es la **página madre**: la tienda pública + el panel admin + el panel embajador. Aquí se **cierra la
> compra** (carrito → datos → Mercado Pago). **🤖 Todo el código lo construyo yo.** **✋ Tú: cuenta
> Mercado Pago, env vars y el deploy a Vercel.** Depende de Supabase (catálogo).

## Stack (confirmado)
Vite 5 + React 19 + TS + React Router 7 + Tailwind 4 + Framer Motion + shadcn/ui + @supabase/supabase-js
+ TanStack Query + Zustand + Mercado Pago SDK. Hosting: Vercel. Dominio: `tierramadre.co`.

## 🤖 Lo que construyo yo (código)

### Sitio del cliente
- **Home**: hero, productos destacados (lee `products where destacado`), historia de marca, testimonios, CTA WhatsApp.
- **Catálogo** `/catalogo`: grid + filtros (categoría, precio, ocasión), búsqueda (search_vector), scroll infinito.
- **Producto** `/producto/:slug`: galería (360° si hay), descripción, precio, **certificado** (signed URL),
  bloque de **confianza** (certificado + procedencia colombiana + pago seguro), botón "Agregar al carrito".
- **Carrito** `/carrito` + **Checkout** `/checkout`: 3 pasos (datos cliente → resumen → método de pago).
  En "pagar": llama Edge Function **`create-order`** (Supabase) → recibe link Mercado Pago → redirige.
  **Gate ≤2M:** si el total >2M, en vez de pago muestra "te conecta un asesor" (coherente con el bot).
- **Confirmación** `/pedido-confirmado/:order_id` + manejo de pago `rejected`/`pending`/`cancelled`.
- **6 landings** (`/topitos`, `/anillos-compromiso`, etc.) con form de pre-calificación → Supabase + GHL.
- **El `link` de cada producto** (que el bot manda) apunta aquí (`/producto/:slug` o deep-link al carrito).
- Chat de GHL embebido (snippet) en páginas del cliente, **NO** en /admin.

### Panel admin (`/admin`, login Supabase Auth)
12 módulos: dashboard BI, **productos** (CRUD + subir fotos/cert → Storage), **promociones**,
**anuncios** (broadcast), **eventos**, **embajadores**, **agentes**, **órdenes**, **comisiones**
(aprobar/pagar), **plantillas**, **testimonios**, **contenido**, **config**. ← aquí cargas el catálogo real.

### Panel embajador (`/embajador`, login Supabase Auth)
dashboard (score, nivel, ranking), **crear/agregar leads** (uno o CSV) → `ambassador_leads` (trigger T4
los matchea y atribuye), comisiones, kit. Link público por embajador `/embajador/:slug/leads`.

### Matriz de estados (obligatoria, §14 del plan)
loading / empty / error / success / partial en cada componente con datos (catálogo vacío, 0 leads,
pago fallido, código de promo inválido, pieza única ya vendida).

## ✋ Lo manual tuyo
1. **Cuenta Mercado Pago** (Colombia, modo Business) → credenciales: PUBLIC_KEY (front), ACCESS_TOKEN
   (server), WEBHOOK_SECRET. Me las pasas para `.env`.
2. **Deploy a Vercel**: conecto el repo / build Vite; tú confirmas el deploy, configuras env vars en el
   dashboard de Vercel y conectas el dominio `tierramadre.co` + SSL.
3. Subir el catálogo real (fotos/desc/precios) desde `/admin/productos` (o me das los datos y lo seedeo).

## Variables de entorno (web)
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MP_PUBLIC_KEY` (prefijo `VITE_` obligatorio para
que lleguen al browser). El `service_role` y el `ACCESS_TOKEN` de MP **nunca** van al front (solo en Edge Functions/Workers).

## Cómo se comunica (detalle en 06)
- **Web → Supabase**: catálogo (lectura), `create-order` (checkout).
- **Web → Mercado Pago**: redirige al checkout con el link de la preferencia.
- **Web ← Bot**: el bot manda el `link` del producto → el cliente llega aquí a comprar.
- **Web → GHL**: los forms de landing crean/actualizan el contacto (vía Supabase + sync, o webhook).
