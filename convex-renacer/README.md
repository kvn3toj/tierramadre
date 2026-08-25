# Backend Convex de Renacer

**Este directorio es un proyecto Convex APARTE.** No es el backend de la app de Tierra Mädre
(ese vive en `../convex/` y despliega a `valuable-mule-753`).

## Por qué está separado

La línea roja del §8.1 del spec
(`docs/superpowers/specs/2026-08-25-renacer-qr-flow-design.md`), ratificada el 2026-08-24:
**cero carga de campaña sobre el team Skyline canónico del MVP, ni sobre el Convex de
producción de TM.** Las razones, en orden de peso:

1. `convex deploy` sube **todo** el directorio de funciones. Compartir deployment ataría cada
   despliegue de la campaña al backend del inventario de esmeraldas — y `../convex/migrations.ts`
   ya carga una migración sin guard (`seedBucketC`, que re-disparada duplica lotes e ítems).
2. Son datos de habeas data de damnificados (Ley 1581) con la silla Legal vacía. Separar hoy
   es barato; separar después del primer registro, no.
3. El §8.3 quiere que el export de Fase 3 hacia CoomÜnity sea **un rename, no una migración**.

## Por qué tiene su propio `package.json` y `convex.json`

Para **anclar el CLI acá**. Sin ellos, `npx convex` sube por el árbol, encuentra el
`convex.json` del repo y el `CONVEX_DEPLOYMENT` de la raíz, y desplegaría este esquema
**dentro del Convex de producción de TM** — la línea roja violada en silencio.

**Antes de cualquier `deploy`, verificá a dónde apunta:**

```sh
cd convex-renacer && npx convex dashboard --no-open   # debe NO decir admired-jaguar-376
```

## Cómo se alcanza desde la app

Nunca directo. El navegador no tiene cliente Convex de Renacer: llama a `/api/renacer-*`,
y esos endpoints de Vercel guardan `RENACER_CONVEX_URL` del lado del servidor. Es el patrón
de proxy de confianza que la casa ya usa en `api/checkout-create-order.ts`.

## Setup

```sh
cd convex-renacer
npm install
npx convex dev            # la primera vez: elegir el proyecto `renacer`
```
