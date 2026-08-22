# Campos protegidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que ninguna de las tres vías de escritura del SOT v3 (app, hoja de Google, anima-bot) pueda reemplazar por vacío un valor de plata o de medida que otra vía ya había puesto.

**Architecture:** Un módulo puro `convex/_lib/camposProtegidos.ts` con la tabla de campos y la tabla de decisión por origen. Se llama desde tres sitios que escriben en Convex (`_saveEdit`, `planRowPatch`, las derivaciones de lote) y se copia un patrón distinto —spread condicional— en el cuarto, que escribe hacia la hoja (`pushToSheet`). Un test de inspección de fuente impide que nazca un quinto riel sin portero.

**Tech Stack:** TypeScript · Convex · Vitest · Google Sheets API

**Spec:** `docs/superpowers/specs/2026-08-21-campos-protegidos-design.md`

## Global Constraints

- **Idioma de comentarios y mensajes de commit: español.** El repo lo es; seguí el tono de los comentarios existentes en `convex/_lib/pricing.ts` — explican POR QUÉ, con la evidencia medida.
- **No hay `convex-test` en este repo.** Las mutaciones no son unit-testables. Todo lo que deba fijarse se extrae a una función pura y se prueba ahí, o se fija por inspección de fuente (patrón de `tests/saleSafe.test.ts`).
- **Tests con Vitest:** `npx vitest run tests/<archivo>.test.ts`. La suite completa: `npm run test:unit` (177 archivos / 1783 tests en verde hoy).
- **Typecheck:** `npm run lint` (= `tsc --noEmit` × 2). **Hay 2 errores preexistentes en `api/cotizacion-deck.ts`** (TS7016, `drive-helpers.js` y `deck-upload.js`) que NO son tuyos y NO debés arreglar. Cualquier error distinto de esos dos sí lo es.
- **Nunca escribir en producción desde este plan.** Ni un `convex run --prod`, ni un script contra la hoja. Este plan es solo código y tests.
- **Worktree aislado.** El árbol de `TierraMadre` lo comparten varias sesiones; un `git checkout` cambia la rama bajo los pies de otra ventana (pasó el 2026-08-21). Trabajá en `git worktree add`.
- **`vacío` para clase `dinero` incluye el `0`.** Para clase `medida`, no.
- **`motivoBorrado` válido** = cadena con ≥ 10 caracteres tras `.trim()`.

---

## File Structure

| Archivo                                                 | Responsabilidad                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `convex/_lib/camposProtegidos.ts` **(crear)**           | Tabla de campos, tabla de decisión, `filtrarBorradosNoDeclarados`. Puro: sin `ctx`, sin IO. |
| `tests/camposProtegidos.test.ts` **(crear)**            | La tabla de decisión completa + la regresión del incidente #577.                            |
| `convex/products.ts` **(modificar)**                    | `_saveEdit`: portero antes del patch. `pushToSheet`: spread condicional en L y M.           |
| `convex/_lib/sheetPullMaps.ts` **(modificar)**          | `planRowPatch`: portero con `origen: 'hoja'`, rechazos a `flags`.                           |
| `convex/lotItems.ts` · `convex/lots.ts` **(modificar)** | Las dos derivaciones.                                                                       |
| `convex/alertas.ts` **(crear)**                         | `internalAction` que avisa por Telegram.                                                    |
| `tests/camposProtegidosSinEsquivar.test.ts` **(crear)** | Inspección de fuente: ningún riel esquiva el portero.                                       |

---

## Task 1: El módulo puro

**Files:**

- Create: `convex/_lib/camposProtegidos.ts`
- Test: `tests/camposProtegidos.test.ts`

**Interfaces:**

- Consumes: nada.
- Produces: `CAMPOS_PROTEGIDOS`, `type Origen`, `type Rechazo`, `filtrarBorradosNoDeclarados(existente, patch, opts) => { patch, rechazos }`, `esVacio(valor, clase)`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/camposProtegidos.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  filtrarBorradosNoDeclarados,
  esVacio,
  CAMPOS_PROTEGIDOS,
} from '../convex/_lib/camposProtegidos';

/**
 * La regla, en una línea: un valor que existe nunca puede ser reemplazado por
 * vacío. Cambiarlo por otro valor sí.
 *
 * Nace del incidente del 2026-08-20: `computePrecioFinal(0)` devuelve undefined
 * a propósito, la adjunción a lote lo escribe y el push lo empuja a la columna M
 * de la hoja — se borra en los DOS lados a la vez, y por eso parece que el
 * precio nunca existió. 41 ítems quedaron así.
 */
describe('esVacio', () => {
  it('para dinero, el 0 es vacío', () => {
    expect(esVacio(0, 'dinero')).toBe(true);
    expect(esVacio(150000, 'dinero')).toBe(false);
  });

  it('para medida, el 0 NO es vacío — 0 mm sería un dato', () => {
    expect(esVacio(0, 'medida')).toBe(false);
  });

  it('undefined, null y cadena vacía son vacío en las dos clases', () => {
    for (const clase of ['dinero', 'medida'] as const) {
      expect(esVacio(undefined, clase)).toBe(true);
      expect(esVacio(null, clase)).toBe(true);
      expect(esVacio('', clase)).toBe(true);
      expect(esVacio('   ', clase)).toBe(true);
    }
  });
});

describe('filtrarBorradosNoDeclarados', () => {
  const CON_PRECIO = { precioFinalCOP: 150000, costoBaseCOP: 0 };

  it('deja pasar el cambio de un valor por otro', () => {
    const r = filtrarBorradosNoDeclarados(
      CON_PRECIO,
      { precioFinalCOP: 180000 },
      { origen: 'derivacion' },
    );
    expect(r.patch).toEqual({ precioFinalCOP: 180000 });
    expect(r.rechazos).toEqual([]);
  });

  it('deja pasar llenar un campo que estaba vacío', () => {
    const r = filtrarBorradosNoDeclarados(
      { precioFinalCOP: undefined },
      { precioFinalCOP: 150000 },
      { origen: 'hoja' },
    );
    expect(r.patch).toEqual({ precioFinalCOP: 150000 });
    expect(r.rechazos).toEqual([]);
  });

  it('REGRESIÓN #577: la derivación no puede vaciar el precio', () => {
    const r = filtrarBorradosNoDeclarados(
      CON_PRECIO,
      { precioFinalCOP: undefined },
      { origen: 'derivacion' },
    );
    expect(r.patch).toEqual({});
    expect(r.rechazos).toEqual([
      {
        campo: 'precioFinalCOP',
        valorAnterior: 150000,
        valorIntentado: undefined,
        origen: 'derivacion',
      },
    ]);
  });

  it('la derivación tampoco borra AUNQUE declare motivo', () => {
    const r = filtrarBorradosNoDeclarados(
      CON_PRECIO,
      { precioFinalCOP: undefined },
      {
        origen: 'derivacion',
        motivoBorrado: 'lote C-006 cancelado por el dueño',
      },
    );
    expect(r.patch).toEqual({});
    expect(r.rechazos).toHaveLength(1);
  });

  it('la hoja tampoco borra aunque declare motivo', () => {
    const r = filtrarBorradosNoDeclarados(
      CON_PRECIO,
      { precioFinalCOP: '' },
      { origen: 'hoja', motivoBorrado: 'la celda se vació a propósito' },
    );
    expect(r.patch).toEqual({});
    expect(r.rechazos).toHaveLength(1);
  });

  it('app, bot y migración SÍ borran declarando motivo', () => {
    for (const origen of ['app', 'bot', 'migracion'] as const) {
      const r = filtrarBorradosNoDeclarados(
        CON_PRECIO,
        { precioFinalCOP: undefined },
        { origen, motivoBorrado: 'padre retirado, se vende por #429-433' },
      );
      expect(r.patch, origen).toEqual({ precioFinalCOP: undefined });
      expect(r.rechazos, origen).toEqual([]);
    }
  });

  it('app, bot y migración NO borran sin motivo', () => {
    for (const origen of ['app', 'bot', 'migracion'] as const) {
      const r = filtrarBorradosNoDeclarados(
        CON_PRECIO,
        { precioFinalCOP: undefined },
        { origen },
      );
      expect(r.patch, origen).toEqual({});
      expect(r.rechazos, origen).toHaveLength(1);
    }
  });

  it('un motivo de menos de 10 caracteres no es una declaración', () => {
    const r = filtrarBorradosNoDeclarados(
      CON_PRECIO,
      { precioFinalCOP: undefined },
      { origen: 'app', motivoBorrado: 'x' },
    );
    expect(r.patch).toEqual({});
    expect(r.rechazos).toHaveLength(1);
  });

  it('el costo a 0 es un borrado, no un cambio', () => {
    const r = filtrarBorradosNoDeclarados(
      { costoBaseCOP: 41340039 },
      { costoBaseCOP: 0 },
      { origen: 'derivacion' },
    );
    expect(r.patch).toEqual({});
    expect(r.rechazos[0].campo).toBe('costoBaseCOP');
  });

  it('no toca campos que no están en la tabla', () => {
    const r = filtrarBorradosNoDeclarados(
      { ubicacion: 'Bóveda', precioFinalCOP: 150000 },
      { ubicacion: '' },
      { origen: 'derivacion' },
    );
    expect(r.patch).toEqual({ ubicacion: '' });
    expect(r.rechazos).toEqual([]);
  });

  it('una tanda mixta aplica lo bueno y rechaza lo malo — no falla entera', () => {
    const r = filtrarBorradosNoDeclarados(
      { precioFinalCOP: 150000, calidad: 'F1', peso: '2.15' },
      { precioFinalCOP: undefined, calidad: 'FINA SUBLIME', peso: '2.20' },
      { origen: 'derivacion' },
    );
    expect(r.patch).toEqual({ calidad: 'FINA SUBLIME', peso: '2.20' });
    expect(r.rechazos).toHaveLength(1);
  });

  it('la tabla cubre los seis campos de la spec', () => {
    expect(Object.keys(CAMPOS_PROTEGIDOS).sort()).toEqual([
      'costoBaseCOP',
      'medidas',
      'peso',
      'precioCOP',
      'precioEmbajadorCOP',
      'precioFinalCOP',
    ]);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/camposProtegidos.test.ts`
Expected: FAIL — `Failed to resolve import "../convex/_lib/camposProtegidos"`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `convex/_lib/camposProtegidos.ts`:

```ts
/**
 * Portero de los campos que un humano teclea y ninguna máquina reconstruye.
 *
 * LA REGLA: un valor que existe nunca puede ser reemplazado por vacío. Cambiarlo
 * por otro valor sí. Borrar exige declarar un motivo — y ni el pull de la hoja
 * ni las derivaciones de lote pueden hacerlo ni declarándolo, porque una
 * derivación no tiene dónde poner un motivo.
 *
 * POR QUÉ EXISTE. El 2026-08-20, 41 ítems quedaron sin precio de una vez.
 * `computePrecioFinal(0)` devuelve `undefined` a propósito (_lib/pricing.ts:34,
 * "no phantom 0"); la adjunción a lote lo escribe (lotItems.ts:427) y el push lo
 * manda como celda vacía a la columna M (products.ts:1403). Se borra en Convex Y
 * en la hoja a la vez, así que al revisar después no hay discrepancia y todo
 * parece indicar que el precio nunca existió.
 *
 * Módulo PURO a propósito: no hay `convex-test` en este repo, así que la única
 * forma de fijar esta rama con un test es que no toque `ctx`.
 *
 * Spec: docs/superpowers/specs/2026-08-21-campos-protegidos-design.md
 */

export type Clase = 'dinero' | 'medida';

/**
 * Criterio de inclusión: campos que un humano teclea y que ninguna máquina puede
 * reconstruir. Un precio borrado no se recupera de ningún lado; un `syncStatus`
 * sí. `preponderancia` NO entra: Convex la deriva del lote.
 *
 * Agregar un campo es UNA LÍNEA acá. Ese es el punto de que la tabla exista.
 */
export const CAMPOS_PROTEGIDOS: Record<string, { clase: Clase }> = {
  costoBaseCOP: { clase: 'dinero' }, // L — base de impuesto y comisión
  precioFinalCOP: { clase: 'dinero' }, // M — precio al cliente
  precioCOP: { clase: 'dinero' },
  precioEmbajadorCOP: { clase: 'dinero' },
  peso: { clase: 'medida' }, // D — quilates
  medidas: { clase: 'medida' }, // I — la buena; J está en desuso
};

export type Origen = 'app' | 'bot' | 'hoja' | 'derivacion' | 'migracion';

/** Quién puede borrar declarando motivo. La hoja y las derivaciones, nunca. */
const PUEDE_DECLARAR: ReadonlySet<Origen> = new Set<Origen>([
  'app',
  'bot',
  'migracion',
]);

export type Rechazo = {
  campo: string;
  valorAnterior: unknown;
  valorIntentado: unknown;
  origen: Origen;
};

/**
 * Para `dinero` el 0 ES vacío: el borrado del 2026-08-20 fue un 0, no un blanco,
 * y hoy las piezas nacen con costo 0 significando "todavía no lo tecleé".
 * Para `medida` no lo es — 0 mm sería un dato, aunque improbable.
 */
export function esVacio(valor: unknown, clase: Clase): boolean {
  if (valor === undefined || valor === null) return true;
  if (typeof valor === 'string') return valor.trim() === '';
  if (clase === 'dinero' && typeof valor === 'number') return valor === 0;
  return false;
}

/** Un "x" no es una declaración de intención. */
function motivoValido(motivo: string | undefined): boolean {
  return typeof motivo === 'string' && motivo.trim().length >= 10;
}

/**
 * Devuelve el patch YA SIN los borrados prohibidos, más la lista de lo que sacó.
 *
 * NUNCA lanza y NUNCA falla la escritura entera: si una tanda de 9 correcciones
 * trae 1 borrado indebido, se aplican las 8 buenas y se rechaza la 1. Fallar en
 * bloque convertiría un guard en un obstáculo, y el obstáculo se termina
 * desactivando.
 */
export function filtrarBorradosNoDeclarados(
  existente: Record<string, unknown>,
  patch: Record<string, unknown>,
  opts: { origen: Origen; motivoBorrado?: string },
): { patch: Record<string, unknown>; rechazos: Rechazo[] } {
  const limpio: Record<string, unknown> = {};
  const rechazos: Rechazo[] = [];
  const declarado =
    PUEDE_DECLARAR.has(opts.origen) && motivoValido(opts.motivoBorrado);

  for (const [campo, valor] of Object.entries(patch)) {
    const spec = CAMPOS_PROTEGIDOS[campo];
    if (!spec) {
      limpio[campo] = valor;
      continue;
    }
    const borra =
      esVacio(valor, spec.clase) && !esVacio(existente[campo], spec.clase);
    if (borra && !declarado) {
      rechazos.push({
        campo,
        valorAnterior: existente[campo],
        valorIntentado: valor,
        origen: opts.origen,
      });
      continue;
    }
    limpio[campo] = valor;
  }

  return { patch: limpio, rechazos };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run tests/camposProtegidos.test.ts`
Expected: PASS — 13 tests

- [ ] **Step 5: Typecheck**

Run: `npm run lint`
Expected: solo los 2 errores preexistentes de `api/cotizacion-deck.ts`

- [ ] **Step 6: Commit**

```bash
git add convex/_lib/camposProtegidos.ts tests/camposProtegidos.test.ts
git commit -m "feat(sot): el portero de campos protegidos — vacío nunca pisa a lleno

Módulo puro con la tabla de campos y la tabla de decisión por origen. Todavía
no lo llama nadie: las cuatro conexiones vienen en los commits siguientes.

La regla nace del 2026-08-20, cuando 41 ítems quedaron sin precio de una vez
porque computePrecioFinal(0) devuelve undefined a propósito, la adjunción a
lote lo escribe y el push lo manda como celda vacía a la columna M."
```

---

## Task 2: `pushToSheet` deja de mandar vacíos

**Files:**

- Modify: `convex/products.ts` (dentro de `pushToSheet`, las líneas `costoBaseCOP: row.costoBaseCOP ?? ''` ≈1382 y `precioFinalCOP: row.precioFinalCOP ?? ''` ≈1403)
- Test: `tests/pushNoMandaVacios.test.ts` (crear)

**Interfaces:**

- Consumes: nada de Task 1 — este arreglo es un spread condicional, no el portero.
- Produces: `construirCamposDelPush(row)` exportada desde `convex/_lib/camposProtegidos.ts`, usada solo acá.

> **Por qué acá NO va el portero.** El portero filtra lo que se ESCRIBE en Convex. Esto es la
> dirección contraria: lo que se manda a la hoja. Si Convex no conoce el valor, la celda
> simplemente no debe viajar. El patrón exacto ya existe tres líneas más arriba, en
> `preponderancia`, con un comentario que dice literalmente **«do NOT collapse this to `?? ''`»**.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/pushNoMandaVacios.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { construirCamposDelPush } from '../convex/_lib/camposProtegidos';

/**
 * El push a la hoja NUNCA manda '' en las dos columnas de plata.
 *
 * products.ts mandaba `costoBaseCOP: row.costoBaseCOP ?? ''` y
 * `precioFinalCOP: row.precioFinalCOP ?? ''`. Como la columna L es propiedad de
 * la hoja (un humano la teclea) y el pull es diario o manual, el escenario era:
 * tecleás el costo, no apretás "🔄 Convex Sync", y esa tarde alguien entrega la
 * pieza a un asesor → el push manda '' y borra el costo. Convex nunca lo
 * aprendió, así que no queda copia en ningún lado.
 *
 * `preponderancia` ya tenía la protección, con un comentario que dice "do NOT
 * collapse this to `?? ''`". Las dos que más importan estaban tres líneas abajo,
 * colapsadas.
 */
describe('construirCamposDelPush', () => {
  it('omite costo y precio cuando Convex no los conoce', () => {
    const campos = construirCamposDelPush({});
    expect(campos).not.toHaveProperty('costoBaseCOP');
    expect(campos).not.toHaveProperty('precioFinalCOP');
  });

  it('los manda cuando sí los conoce', () => {
    const campos = construirCamposDelPush({
      costoBaseCOP: 41340039,
      precioFinalCOP: 186030176,
    });
    expect(campos.costoBaseCOP).toBe(41340039);
    expect(campos.precioFinalCOP).toBe(186030176);
  });

  it('un 0 explícito SÍ viaja — es distinto de no saber', () => {
    const campos = construirCamposDelPush({ costoBaseCOP: 0 });
    expect(campos.costoBaseCOP).toBe(0);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/pushNoMandaVacios.test.ts`
Expected: FAIL — `construirCamposDelPush is not a function`

- [ ] **Step 3: Agregar el helper al módulo**

Agregar al final de `convex/_lib/camposProtegidos.ts`:

```ts
/**
 * Las dos columnas de plata para el payload del push a la hoja.
 *
 * Copia el patrón del `preponderancia` de `pushToSheet`, cuyo comentario dice
 * "PUSH-ONLY FIELD — do NOT collapse this to `?? ''`". Si Convex no conoce el
 * valor, la celda NO viaja y la hoja conserva lo que tenga. Un 0 explícito sí
 * viaja: "vale 0" y "no sé cuánto vale" son cosas distintas, y esta es la única
 * parte del sistema donde esa diferencia se puede expresar.
 */
export function construirCamposDelPush(row: {
  costoBaseCOP?: number;
  precioFinalCOP?: number;
}): { costoBaseCOP?: number; precioFinalCOP?: number } {
  return {
    ...(row.costoBaseCOP !== undefined
      ? { costoBaseCOP: row.costoBaseCOP }
      : {}),
    ...(row.precioFinalCOP !== undefined
      ? { precioFinalCOP: row.precioFinalCOP }
      : {}),
  };
}
```

- [ ] **Step 4: Conectarlo en `pushToSheet`**

En `convex/products.ts`, dentro del objeto `fields` de `pushToSheet`, reemplazar las dos líneas:

```ts
            costoBaseCOP: row.costoBaseCOP ?? '',
```

```ts
            precioFinalCOP: row.precioFinalCOP ?? '',
```

por una sola invocación, ubicada donde estaba la primera:

```ts
            // Ver _lib/camposProtegidos.ts: si Convex no conoce el valor, la
            // celda NO viaja y la hoja conserva lo que un humano tecleó. Antes
            // iban con `?? ''` y borraban la columna L (2026-08-21).
            ...construirCamposDelPush(row),
```

Y agregar el import junto a los demás de `convex/products.ts`:

```ts
import { construirCamposDelPush } from './_lib/camposProtegidos';
```

- [ ] **Step 5: Verificar que no quedó ningún `?? ''` en columnas de plata**

Run: `grep -n "costoBaseCOP: row.costoBaseCOP ?? ''\|precioFinalCOP: row.precioFinalCOP ?? ''" convex/products.ts`
Expected: sin resultados

- [ ] **Step 6: Correr tests y typecheck**

Run: `npx vitest run tests/pushNoMandaVacios.test.ts && npm run lint`
Expected: PASS (3 tests) y solo los 2 errores preexistentes

- [ ] **Step 7: Commit**

```bash
git add convex/_lib/camposProtegidos.ts convex/products.ts tests/pushNoMandaVacios.test.ts
git commit -m "fix(sot): el push deja de mandar vacío en costo y precio

products.ts mandaba las dos columnas de plata con \`?? ''\`, así que cuando
Convex no las conocía borraba la celda. Como la columna L la teclea un humano
y el pull es diario o manual, bastaba con teclear el costo, no apretar
'Convex Sync' y que alguien entregara la pieza esa tarde.

Mismo spread condicional que \`preponderancia\` ya tenía tres líneas arriba,
con un comentario que decía 'do NOT collapse this to \`?? ''\`'."
```

---

## Task 3: El portero en las tres escrituras a Convex

**Files:**

- Modify: `convex/products.ts` (`_saveEdit`: args y el `ctx.db.patch`)
- Modify: `convex/_lib/sheetPullMaps.ts` (`planRowPatch`, antes del `return`)
- Modify: `convex/lotItems.ts` (`_create`, el objeto que se inserta/parchea)
- Modify: `convex/lots.ts` (≈531, el patch de cancelación de lote)
- Test: `tests/planRowPatchNoBorra.test.ts` (crear)

**Interfaces:**

- Consumes: `filtrarBorradosNoDeclarados`, `type Origen`, `type Rechazo` de Task 1.
- Produces: `RowPlan.rechazos: Rechazo[]` (campo nuevo en la interfaz existente de `sheetPullMaps.ts`).

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/planRowPatchNoBorra.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { planRowPatch } from '../convex/_lib/sheetPullMaps';

/**
 * Una celda vacía en la hoja NUNCA significa "borrá".
 *
 * Es la misma doctrina que este archivo ya aplicó dos veces —con `fotoUrl`,
 * tras perder 9 fotos el 2026-08-15— y que nunca se extendió a las columnas de
 * plata. Si vaciás la celda M, el próximo push la restaura desde Convex y el
 * rechazo queda registrado.
 */
describe('planRowPatch — la hoja no borra plata', () => {
  const existente = {
    syncStatus: 'synced' as const,
    precioFinalCOP: 150000,
    costoBaseCOP: 45000,
  };

  it('una celda de precio vaciada NO entra al patch', () => {
    const plan = planRowPatch('inventory', existente, { precioFinalCOP: '' });
    expect(plan.patch).not.toHaveProperty('precioFinalCOP');
    expect(plan.rechazos).toHaveLength(1);
    expect(plan.rechazos[0].campo).toBe('precioFinalCOP');
    expect(plan.rechazos[0].origen).toBe('hoja');
  });

  it('una celda de precio CAMBIADA sí entra', () => {
    const plan = planRowPatch('inventory', existente, {
      precioFinalCOP: '180000',
    });
    expect(plan.patch.precioFinalCOP).toBe(180000);
    expect(plan.rechazos).toEqual([]);
  });

  it('llenar un precio que estaba vacío sí entra', () => {
    const plan = planRowPatch(
      'inventory',
      { syncStatus: 'synced' as const },
      { precioFinalCOP: '150000' },
    );
    expect(plan.patch.precioFinalCOP).toBe(150000);
    expect(plan.rechazos).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/planRowPatchNoBorra.test.ts`
Expected: FAIL — `plan.rechazos` es `undefined`

- [ ] **Step 3: `planRowPatch` — agregar el campo y el filtro**

En `convex/_lib/sheetPullMaps.ts`, agregar a la interfaz `RowPlan` (≈445):

```ts
  /** Borrados que el portero rechazó — ver _lib/camposProtegidos.ts */
  rechazos: Rechazo[];
```

Agregar el import arriba:

```ts
import { filtrarBorradosNoDeclarados, type Rechazo } from './camposProtegidos';
```

**Todos** los `return` tempranos de `planRowPatch` (los de `action: 'protected'` y los de
`action: 'skip'`) llevan `rechazos: []` — `tsc` te los va a señalar uno por uno en cuanto
agregues el campo a la interfaz, así que dejá que el typecheck haga de lista.

Y justo antes del `return` final, filtrar:

```ts
// La hoja NUNCA borra plata: una celda vacía no es una orden de borrado.
// Misma doctrina que este archivo ya aplicó con `fotoUrl` (2026-08-15).
const filtrado = filtrarBorradosNoDeclarados(existing, patch, {
  origen: 'hoja',
});

const action =
  Object.keys(filtrado.patch).length > 0 || sideEffects.length > 0
    ? 'patch'
    : 'skip';
return {
  action,
  patch: filtrado.patch as RowPlan['patch'],
  sideEffects,
  flags,
  rechazos: filtrado.rechazos,
};
```

- [ ] **Step 4: Correr el test**

Run: `npx vitest run tests/planRowPatchNoBorra.test.ts`
Expected: PASS — 3 tests

- [ ] **Step 5: `_saveEdit` — aceptar el motivo y filtrar**

En `convex/products.ts`, agregar a los `args` de `_saveEdit` (≈1029):

```ts
    motivoBorrado: v.optional(v.string()),
```

Agregarlo al destructuring del handler y reemplazar el `ctx.db.patch` (≈1082) por:

```ts
// El portero: un valor que existe no puede volverse vacío sin declarar por
// qué. Ver _lib/camposProtegidos.ts. `origen` distingue app de bot para que
// la auditoría diga quién intentó borrar.
const origen: Origen = editorName === 'anima-bot' ? 'bot' : 'app';
const filtrado = filtrarBorradosNoDeclarados(existing, patch, {
  origen,
  motivoBorrado,
});

await ctx.db.patch(existing._id, {
  ...filtrado.patch,
  ...(filtrado.patch.precioFinalCOP !== undefined
    ? { precioFinalManual: true }
    : {}),
  syncStatus: 'pending' as const,
  syncError: undefined,
});
```

Import en `convex/products.ts`:

```ts
import {
  filtrarBorradosNoDeclarados,
  type Origen,
} from './_lib/camposProtegidos';
```

> Ojo con el orden: `construirCamposDelPush` ya se importó en Task 2 desde el mismo
> archivo. Unificá en un solo `import`.

- [ ] **Step 6: `lotItems._create` — la derivación no re-deriva sobre un valor vivo**

En `convex/lotItems.ts`, la línea `precioFinalCOP: computePrecioFinal(costoBaseCOP)` (≈427)
está dentro del objeto que se inserta. Cuando el ítem es NUEVO no hay valor anterior y la
regla no aplica. Cuando se ADJUNTA uno que ya existía, sí — y ese es el camino que borró los
cuatro dijes del lote TM-001.

Localizá la rama de adjunción (la que lee un `productInventory` existente, ≈606
`costoBaseCOP: product.costoBaseCOP ?? 0`) y envolvé su patch:

```ts
const filtrado = filtrarBorradosNoDeclarados(
  product,
  { precioFinalCOP: computePrecioFinal(costoBaseCOP) },
  { origen: 'derivacion' },
);
```

y aplicá `filtrado.patch` en vez del valor crudo. Los rechazos se acumulan para Task 4.

- [ ] **Step 7: `lots` — la cancelación de lote no vacía el costo**

En `convex/lots.ts` (≈531), el patch de cancelación pone `costoBaseCOP: undefined` en CADA
ítem del lote. Es el borrado de mayor alcance del sistema. Reemplazar:

```ts
await ctx.db.patch(product._id, {
  loteId: undefined,
  preponderancia: undefined,
  // costoBaseCOP NO se borra (2026-08-21): un lote cancelado deja de ser
  // lote, pero sus piedras siguen habiendo costado lo que costaron, y ese
  // número lo tecleó un humano en la columna L. Si el negocio quiere
  // olvidarlo, que lo declare por la app con motivoBorrado.
  mostrarEnCatalogo: false,
});
```

- [ ] **Step 8: Correr la suite completa**

Run: `npm run test:unit && npm run lint`
Expected: 1783+ tests en verde; solo los 2 errores preexistentes

- [ ] **Step 9: Commit**

```bash
git add convex/products.ts convex/_lib/sheetPullMaps.ts convex/lotItems.ts convex/lots.ts tests/planRowPatchNoBorra.test.ts
git commit -m "fix(sot): el portero en las tres escrituras a Convex

_saveEdit (app y bot) acepta motivoBorrado y filtra; planRowPatch trata la
celda vacía como 'sin cambio' y nunca como borrado; la adjunción a lote deja
de re-derivar sobre un precio vivo.

Y la cancelación de lote deja de poner costoBaseCOP: undefined en cada ítem
— era el borrado de mayor alcance del sistema y nadie lo había mirado."
```

---

## Task 4: Registrar y avisar

**Files:**

- Create: `convex/alertas.ts`
- Modify: `convex/products.ts` (`_saveEdit`: insertar el registro y agendar el aviso)
- Modify: `convex/fotoSync.ts` (≈285: los rechazos del pull entran a `reviewFlags`)
- Test: `tests/mensajeRechazo.test.ts` (crear)

**Interfaces:**

- Consumes: `type Rechazo` de Task 1.
- Produces: `formatearAvisoRechazos(itemId, nombre, rechazos) => string`, `internal.alertas.avisarRechazos`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/mensajeRechazo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatearAvisoRechazos } from '../convex/_lib/camposProtegidos';

describe('formatearAvisoRechazos', () => {
  it('dice qué se bloqueó, cuánto valía y que no se perdió', () => {
    const msg = formatearAvisoRechazos('544', 'Viaje Estelar', [
      {
        campo: 'costoBaseCOP',
        valorAnterior: 41340039,
        valorIntentado: 0,
        origen: 'derivacion',
      },
    ]);
    expect(msg).toContain('#544');
    expect(msg).toContain('Viaje Estelar');
    expect(msg).toContain('costoBaseCOP');
    expect(msg).toContain('41.340.039');
    expect(msg).toContain('derivacion');
    expect(msg).toContain('NO se perdió');
  });

  it('agrupa varios rechazos en UN mensaje', () => {
    const msg = formatearAvisoRechazos('577', 'Dije Sol Solsticio', [
      {
        campo: 'precioFinalCOP',
        valorAnterior: 150000,
        valorIntentado: undefined,
        origen: 'hoja',
      },
      {
        campo: 'peso',
        valorAnterior: '2.15',
        valorIntentado: '',
        origen: 'hoja',
      },
    ]);
    expect(msg).toContain('precioFinalCOP');
    expect(msg).toContain('peso');
    expect(msg.split('\n').filter((l) => l.includes('→')).length).toBe(2);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run tests/mensajeRechazo.test.ts`
Expected: FAIL — `formatearAvisoRechazos is not a function`

- [ ] **Step 3: Escribir el formateador**

Agregar a `convex/_lib/camposProtegidos.ts`:

```ts
const cop = (v: unknown): string =>
  typeof v === 'number'
    ? `$${v.toLocaleString('es-CO')}`
    : String(v ?? '(vacío)');

/**
 * Un mensaje por corrida, no uno por rechazo: si una tanda bloquea 9 borrados,
 * el dueño recibe un aviso, no nueve.
 */
export function formatearAvisoRechazos(
  itemId: string,
  nombre: string | undefined,
  rechazos: Rechazo[],
): string {
  const lineas = rechazos.map(
    (r) => `${r.campo}: ${cop(r.valorAnterior)} → ${cop(r.valorIntentado)}`,
  );
  return [
    '⚠️ Bloqueado un borrado en el SOT',
    '',
    `#${itemId} ${nombre ?? ''}`.trim(),
    ...lineas,
    `Origen: ${rechazos[0]?.origen ?? 'desconocido'}`,
    '',
    'El valor NO se perdió.',
  ].join('\n');
}
```

- [ ] **Step 4: Correr el test**

Run: `npx vitest run tests/mensajeRechazo.test.ts`
Expected: PASS — 2 tests

- [ ] **Step 5: El canal de Telegram**

Crear `convex/alertas.ts`:

```ts
// SIN `'use node'` a propósito: `fetch` existe en el runtime por defecto de
// Convex, y forzar el runtime de Node encarece el arranque sin dar nada.
import { internalAction } from './_generated/server';
import { v } from 'convex/values';

/**
 * Aviso saliente a Telegram.
 *
 * Convex hoy sólo RECIBE de Telegram (movimientosV4, saveEditViaBot, todos con
 * botSecret); no había salida. Esta es la más simple de las dos formas que
 * evaluó la spec (§6): un fetch directo, dos env vars, sin tocar anima-bot.
 * La alternativa —una tabla outbox que el bot drena, como espejoOutbox— queda
 * para cuando haya más de un tipo de aviso.
 *
 * NUNCA lanza: el rechazo ya quedó registrado en productEdits, y un aviso que
 * falla no puede tumbar la escritura que lo originó.
 */
export const avisarRechazos = internalAction({
  args: { texto: v.string() },
  handler: async (_ctx, { texto }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;
    if (!token || !chatId) {
      console.warn('[alertas] sin TELEGRAM_BOT_TOKEN/CHAT_ID — aviso omitido');
      return { enviado: false };
    }
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: texto }),
        },
      );
      return { enviado: res.ok };
    } catch (err) {
      console.warn('[alertas] Telegram no respondió:', err);
      return { enviado: false };
    }
  },
});
```

- [ ] **Step 6: Conectar el registro y el aviso en `_saveEdit`**

En `convex/products.ts`, sumá `formatearAvisoRechazos` al import que ya venís armando desde
Task 2 — al terminar debe quedar uno solo:

```ts
import {
  construirCamposDelPush,
  filtrarBorradosNoDeclarados,
  formatearAvisoRechazos,
  type Origen,
} from './_lib/camposProtegidos';
```

`internal` ya está importado en el archivo (lo usa `internal.products._saveEdit`), así que
`internal.alertas.avisarRechazos` resuelve sin tocar imports.

Después del `ctx.db.patch` de Task 3 y antes del `return`:

```ts
if (filtrado.rechazos.length > 0) {
  await ctx.db.insert('productEdits', {
    itemId,
    editorEmail,
    editorName,
    editedAt: new Date().toISOString(),
    changes: filtrado.rechazos.map((r) => ({
      field: r.campo,
      before:
        typeof r.valorAnterior === 'string' ||
        typeof r.valorAnterior === 'number'
          ? r.valorAnterior
          : null,
      after: null,
    })),
    status: 'failed' as const,
    error: `Borrado bloqueado (origen ${origen}, sin motivoBorrado válido)`,
  });
  await ctx.scheduler.runAfter(0, internal.alertas.avisarRechazos, {
    texto: formatearAvisoRechazos(itemId, existing.nombre, filtrado.rechazos),
  });
}
```

- [ ] **Step 7: Conectar los rechazos del pull**

En `convex/fotoSync.ts`, donde hoy se vuelcan los `plan.flags` a `reviewFlags` (≈285), agregar
al lado:

```ts
for (const r of plan.rechazos) {
  reviewFlags.push({
    table: t,
    key: row.key,
    reason: `Borrado bloqueado: ${r.campo} valía ${String(r.valorAnterior)} y la hoja lo mandó vacío. El valor NO se perdió; el próximo push restaura la celda.`,
  });
}
```

- [ ] **Step 8: Correr la suite y typecheck**

Run: `npm run test:unit && npm run lint`
Expected: verde; solo los 2 errores preexistentes

- [ ] **Step 9: Commit**

```bash
git add convex/alertas.ts convex/_lib/camposProtegidos.ts convex/products.ts convex/fotoSync.ts tests/mensajeRechazo.test.ts
git commit -m "feat(sot): los rechazos quedan registrados y avisan por Telegram

Cada borrado bloqueado inserta una fila en productEdits (status failed, con el
valor que se salvó) y dispara un aviso agrupado — uno por corrida, no uno por
campo. El canal es nuevo: convex/ sólo recibía de Telegram, no tenía salida.

El aviso nunca lanza: si Telegram no responde, el rechazo ya está registrado y
la escritura que lo originó no se ve afectada.

Requiere TELEGRAM_BOT_TOKEN y TELEGRAM_ALERT_CHAT_ID en el deployment; sin
ellas se omite el aviso con un warn y todo lo demás sigue funcionando."
```

---

## Task 5: El test que impide el quinto riel

**Files:**

- Create: `tests/camposProtegidosSinEsquivar.test.ts`

**Interfaces:**

- Consumes: nada en runtime — lee el fuente de `convex/`.
- Produces: nada.

> Esta es la tarea que da valor a largo plazo. Los cuatro arreglos anteriores cubren los
> caminos que conocemos hoy; este test cubre el que alguien escriba dentro de seis meses.

- [ ] **Step 1: Escribir el test**

Crear `tests/camposProtegidosSinEsquivar.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Ningún riel escribe en productInventory esquivando el portero.
 *
 * Los dos defectos del 2026-08-21 nacieron de duplicar lógica en vez de
 * compartirla — el propio comentario de `mapRowToTreasureItem` ya lo decía:
 * "duplicar el mapeo es como los dos se separan la próxima vez que una columna
 * se mueve". Este test es lo único que protege contra el quinto riel.
 *
 * No hay convex-test en este repo, así que se verifica sobre el fuente, igual
 * que tests/saleSafe.test.ts.
 */
const RAIZ = path.resolve(__dirname, '..', 'convex');

/** Archivos donde un patch a productInventory ya pasa por el portero o no lo necesita. */
const EXENTOS = new Set([
  // El portero mismo.
  '_lib/camposProtegidos.ts',
  // Sólo toca metadata de sincronización (rowIndex, lastPulledAt, syncStatus).
  'fotoSync.ts',
]);

function archivosTs(dir: string, base = ''): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.name === '_generated' || e.name === 'node_modules') return [];
    if (e.isDirectory()) return archivosTs(path.join(dir, e.name), rel);
    return e.name.endsWith('.ts') ? [rel] : [];
  });
}

describe('ningún riel esquiva el portero de campos protegidos', () => {
  it('todo archivo que parchea campos de plata importa camposProtegidos', () => {
    const CAMPOS = /(costoBaseCOP|precioFinalCOP|precioEmbajadorCOP)\s*:/;
    const culpables: string[] = [];

    for (const rel of archivosTs(RAIZ)) {
      if (EXENTOS.has(rel)) continue;
      const src = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
      // Sólo interesa quien ESCRIBE en el espejo.
      if (!src.includes('ctx.db.patch') && !src.includes('ctx.db.insert'))
        continue;
      // Sólo interesa si el patch toca un campo de plata.
      if (!CAMPOS.test(src)) continue;
      if (!src.includes('camposProtegidos')) culpables.push(rel);
    }

    expect(
      culpables,
      `Estos archivos escriben campos de plata sin pasar por el portero:\n` +
        culpables.map((c) => `  convex/${c}`).join('\n') +
        `\n\nSi el caso es legítimo, agregalo a EXENTOS con el motivo.`,
    ).toEqual([]);
  });

  it('la lista de exentos está justificada, no es un cajón de sastre', () => {
    // Si esto crece, el portero dejó de ser el camino y pasó a ser una sugerencia.
    expect(EXENTOS.size).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Correr el test**

Run: `npx vitest run tests/camposProtegidosSinEsquivar.test.ts`
Expected: PASS. **Si falla, leé la lista de culpables**: es un riel real que Tasks 2–3 no
cubrieron. Agregarlo al portero es el arreglo; agregarlo a `EXENTOS` sin motivo, no.

- [ ] **Step 3: Verificar que el test detecta de verdad**

Agregá temporalmente a `convex/migrations.ts` una línea `costoBaseCOP: undefined,` dentro de
cualquier `ctx.db.patch`, y quitá el import de `camposProtegidos` si lo hubiera.

**ANTES de correr el test, comprobá que la mutación se aplicó de verdad:**

```bash
grep -c "costoBaseCOP: undefined," convex/migrations.ts   # tiene que ser ≥ 1
```

Esto no es ceremonia. El 2026-08-22, validando los candados de `cotizacion-save.ts` por
mutación, a `cronos` **el `replace` no matcheó y falló mudo**: los 19 tests siguieron en verde y
por un momento eso se leyó como «los candados muerden». No mordía nada — el archivo nunca había
cambiado. **Una mutación que falla en silencio se disfraza exactamente de test que pasa**, y es
el único modo de falla que un test de inspección no puede detectar por su cuenta.

Run: `npx vitest run tests/camposProtegidosSinEsquivar.test.ts`
Expected: FAIL, nombrando `convex/migrations.ts`

Revertí el cambio temporal y confirmá la reversión con el mismo `grep` (tiene que dar 0).
**Un test de inspección que nunca se vio fallar no prueba nada.**

- [ ] **Step 4: Suite completa**

Run: `npm run test:unit && npm run lint`
Expected: verde; solo los 2 errores preexistentes

- [ ] **Step 5: Commit**

```bash
git add tests/camposProtegidosSinEsquivar.test.ts
git commit -m "test(sot): ningún riel escribe plata esquivando el portero

Inspección de fuente sobre convex/: si un archivo parchea costoBaseCOP,
precioFinalCOP o precioEmbajadorCOP sin importar camposProtegidos, falla y lo
nombra. Es lo único que cubre el riel que alguien escriba dentro de seis meses
— los cuatro arreglos anteriores sólo cubren los caminos que conocemos hoy.

Verificado que detecta: se le metió un patch crudo en migrations.ts y falló
nombrándolo."
```

---

## Cierre

- [ ] **Correr la suite entera una última vez**

Run: `npm run test:unit && npm run lint && npm run build`
Expected: 1783+ tests verdes, solo los 2 errores TS preexistentes, build OK

- [ ] **Abrir el PR**

El PR debe decir explícitamente que **requiere dos variables nuevas en el deployment de
Convex** (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`) y que sin ellas el aviso se omite
con un warn — nada más se rompe.

- [ ] **NO desplegar.** `npx convex deploy` sube todo `convex/`. El despliegue es de Kevin.

- [ ] **Escribir el Status Echo** en `Obsidian/Anima/Wings/Projects/Orchestration/constructor.md`, fila `TM-PRECIO-INTEGRIDAD`, con la plantilla de `conductor-protocol.md`.

## Lo que este plan NO hace

- **No repara los 28 ítems que siguen sin precio.** Necesitan un precio tecleado, no una regla.
- **No toca los otros 7 defectos** de `docs/audits/2026-08-21-rieles-precio-costo.md`.
- **No agrega marcas de tiempo por campo.** Es la evolución natural (resolvería además las carreras entre dos personas editando a la vez, que hoy nadie detecta), y está fuera de alcance por decisión de la spec §8.
