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

## Operación (pivote 31-08): raíces y códigos

Desde el 31-08 los códigos no nacen de una compra sino de una **raíz** (el líder
comunitario que invita). A cada raíz se le habilita un bloque numérico; ella reparte los
códigos uno por persona, de una lista en papel si hace falta. Todo con `RENACER_OPS_TOKEN`:

```sh
cd convex-renacer

# Pablo / Casamangles: código de raíz 100, reparte 101…199
npx convex run raices:emitir '{"secret":"<OPS>","codigoBase":100,"tamano":100,"nombre":"Pablo","comunidad":"Casamangles","zona":"Cali"}'

# Mitchell: 200 → 201…299
npx convex run raices:emitir '{"secret":"<OPS>","codigoBase":200,"tamano":100,"nombre":"Mitchell","comunidad":"Sevilla y Potrerito"}'

npx convex run raices:listar '{"secret":"<OPS>"}'
npx convex run raices:marcarEstado '{"secret":"<OPS>","codigoBase":100,"estado":"pausada"}'
```

Reglas que el backend hace cumplir: los bloques no se solapan; el código de la raíz
(`codigoBase`) no se reparte; **un código, una persona** — el segundo registro con el
mismo código se rechaza; una raíz pausada deja de admitir registros. Los códigos de kit
del diseño viejo (`kits`) siguen resolviendo como camino legado.

Riesgo aceptado (misma postura que la compuerta §3.4 del 25-08): el código es
adivinable — un tercero puede teclear 105 y quemar ese lugar del bloque. Lo mitiga la
entrega en presencia y la lista de la raíz; si aparece fraude, `resolverCodigo` es el
único punto donde entrarían códigos opacos.

## Correr el flujo entero en localhost (sin Vercel)

```sh
# en la raíz del repo — app en :3000, API local de renacer-* en :3999
npm run dev:renacer
```

`scripts/renacer-dev.mjs` monta los handlers reales de `api/renacer-*.ts` en un servidor
Node y lanza Vite con `vite.local.config.ts` (mismo `vite.config.ts`, pero el proxy `/api`
apunta al servidor local en vez de a producción). Necesita en `.env.local` (gitignored):

```
RENACER_CONVEX_URL=https://savory-malamute-505.convex.cloud
RENACER_APP_TOKEN=<npx convex env get RENACER_APP_TOKEN, desde convex-renacer/>
```

`vercel dev` **no** sirve para esto: su compilador de rutas rechaza los patrones del preset
de Vite (`PATH TO REGEXP ERROR … ":path*"`, medido 2026-09-01 con las CLI 54 y 59) y todo
`/api/*` cae en 404. Por eso el script. Los patrones `:path*` de `vercel.json` se cambiaron
igual por su equivalente `(.*)`/`$1` — idéntico en producción — para no dejar la mina puesta.

Datos de prueba en el dev deployment (2026-09-01): raíces `100` Pablo · Casamangles y `200`
Mitchell · Sevilla y Potrerito (bloques 101–199 / 201–299, sin registros), y `900` PRUEBA.
Los registros hechos desde localhost quedan ahí — es dev, se limpian desde el dashboard.
