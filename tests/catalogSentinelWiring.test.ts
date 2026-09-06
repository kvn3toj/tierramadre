/**
 * Fix 1C — the sentinel's WIRING, as opposed to its decision logic.
 *
 * `tests/catalogVersionSentinel.test.ts` covers the helper in isolation: given
 * a before/after pair, does it bump? That file passed on the branch that
 * shipped `sales.create` WITHOUT a single call to `bumpCatalogVersion`. Apparent
 * coverage over a real hole, and the hole was the one thing Fix 1C existed to
 * prevent: with no bump, a sold stone stays "available" in every visitor's
 * cached catalog until the TTL floor expires.
 *
 * ## Why this guard is per MUTATION, not per file (2026-09-06)
 *
 * The first version of this guard was per file: "any module that reads
 * `productInventory` and patches an `estado` literal must mention the
 * sentinel". It was green on 2026-09-05 while these mutations had no bump:
 *
 *   · `lots._cancel`            — sets `mostrarEnCatalogo: false` on every member
 *   · `lotItems._remove`        — clears `loteId`, which `publishedCatalog`
 *                                 filters on (`products.ts` → `row.loteId !== undefined`)
 *   · `products._upsertFromSheet` — single-row sheet pull, may write `VENDIDA`
 *   · all of `subLotes.ts`      — zero references to the sentinel
 *
 * Three of those are UNPUBLISH paths. A file-level guard is satisfied by one
 * bump anywhere in the file, and the `.patch(..., { estado:` literal never
 * appears in a spread patch or in the shorthand `estado,`. So: split each
 * module into its mutations and judge each block on its own.
 *
 * ## The rule
 *
 * A mutation block that WRITES (`.patch(`, `.insert(`, `.delete(`) and touches
 * a table the public catalog reads (`productInventory`, `lots`, `subLotes`,
 * `lotItems`) and names a field the catalog projects or filters on must call
 * `bumpCatalogVersion` (or one of its `If*` variants) INSIDE that block —
 * unless it is listed in `EXENTAS` with a written reason.
 *
 * It is deliberately coarse. It cannot prove the bump sits on the right branch
 * — only that the mutation knows the sentinel exists. That catches the failure
 * that actually happened (whole mutations with zero calls) and is cheap enough
 * that nobody deletes it.
 *
 * There is no `convex-test` harness in this repo, so this is a structural
 * guard over the source text.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CONVEX_DIR = join(__dirname, '..', 'convex');

/** Tables in the read set of publishedCatalog / fotoUrls / publishedGroups. */
const TABLAS_DEL_CATALOGO = /['"](productInventory|lots|subLotes|lotItems)['"]/;

/**
 * Fields the public catalog projects or filters on. Moving any of them changes
 * what a visitor sees: membership (`mostrarEnCatalogo`, `loteId`,
 * `mostrarComoLote`, `estado` of a lot/sublote), availability (`estado` of a
 * piece), the photo overlay (`fotoUrl`, `fotoLoteUrl`) or the price.
 */
const CAMPOS_VISIBLES =
  /\b(mostrarEnCatalogo|mostrarComoLote|loteId|estado|fotoUrl|fotoLoteUrl|precioFinalCOP|certificadoUrl)\b/;

const ESCRIBE = /\.(patch|insert|delete)\(/;

const MUEVE_CENTINELA = /bumpCatalogVersion(IfPublished|IfShownGroup)?\s*\(/;

/**
 * Mutations that match the rule's shape but cannot change what the public
 * catalog renders. Every entry carries the reason; an entry without one is a
 * bug in this file, not a licence.
 */
const EXENTAS: Record<string, string> = {
  // Refuses rows with `loteId` and rows in VENDIDA; only an orphan, never a
  // published piece (publishedCatalog requires loteId), can be deleted.
  'adminOps.ts:deleteProductByItemId': 'rechaza filas con loteId',
  // Preponderancia is a cost share, not a projected field.
  'lotItems.ts:_updatePreponderancia': 'preponderancia no se proyecta',
  // A new lot is born `abierto` with no `mostrarComoLote`; a new sublote is
  // born without the flag. Neither is visible until publish/_setDisplay,
  // which do bump.
  'lots.ts:_create': 'lote nuevo nace abierto: invisible hasta publicar',
  'lots.ts:_insertMissingFromSheet': 'lotes sin mostrarComoLote desde la hoja',
  'lotsV4.ts:_create': 'lote nuevo nace abierto (riel V4)',
  'subLotes.ts:_create':
    'nace sin mostrarComoLote; el flag entra por _setDisplay',
  'migrations.ts:_createLoteExplicit': 'lote nuevo nace abierto',
  'migracionV4.ts:_aplicarPlan':
    'siembra V4 sólo en dev; lotes sin mostrarComoLote',
  // abierto → cerrado: a lot is a group card only when `publicado`.
  'lots.ts:_close': 'abierto → cerrado, ninguno visible',
  'lots.ts:_applyRowIndexRelink': 'sólo rowIndex',
  'migrations.ts:raiseLotSequences': 'sólo la tabla sequences',
  // A new piece is born unpublished; publishing goes through
  // `_setMostrarEnCatalogo`, which bumps.
  'products.ts:_createProduct': 'nace sin publicar',
  // The `casillas`, `movimientos` and `recalculos` tables are the V4 rail; the
  // public catalog does not read them. They match the rule only because their
  // bodies name `lots`/`lotItems` while reading.
  'casillas.ts:_guardar': 'tabla casillas (riel V4): el catálogo no la lee',
  'casillas.ts:_adjuntarFoto':
    'tabla casillas (riel V4): el catálogo no la lee',
  'categoriaFiscalInferencia.ts:_aplicar': 'categoriaFiscal no se proyecta',
  'movimientos.ts:_registrar':
    'escribe movimientos/recalculos, no productInventory',
  'movimientosV4.ts:_registrarPendiente':
    'escribe casillas/movimientos (riel V4)',
  'movimientosV4.ts:_confirmar': 'escribe movimientos/recalculos (riel V4)',
  'mantenimientoV4.ts:limpiarLotesDePrueba':
    'riel V4 sólo dev: borra lotes de prueba',
  'migracionV4.ts:_normalizarFechasEnDev':
    'riel V4 sólo dev; fecha no proyectada',
  'migracionV4.ts:_sembrarSegmentoEnDev':
    'riel V4 sólo dev; segmento no proyectado',
  'migracionV4.ts:_aplicarPromocion': 'riel V4 sólo dev: escribe casillas',
  // Online orders insert into `sales`; the piece flips to VENDIDA later in
  // `markOrderPaid`, which bumps.
  'ghl.ts:createOrder': 'sólo inserta en sales',
  // One-shot, run 2026-08-12: stamps `tipo: insumo`; insumos never publish.
  'migrations.ts:_stampInsumoTipo':
    'tipo/observación de insumos, corrida 2026-08-12',
};

/**
 * Mutations that MUST be found and MUST be covered. Guards the guard: if a
 * refactor changes the export shape so the splitter finds nothing, the suite
 * would pass vacuously. These are the movers of catalog-visible state known on
 * 2026-09-06.
 */
const CUBIERTAS_OBLIGATORIAS = [
  'products.ts:_saveEdit', // the sale path via the editor (estado → VENDIDA)
  'products.ts:_saveEditMany',
  'products.ts:_setMostrarEnCatalogo',
  'products.ts:_upsertManyFromSheet',
  'sales.ts:_create',
  'sales.ts:_cancel',
  'ghl.ts:markOrderPaid',
  'lots.ts:_publish',
  'lots.ts:_reopen',
  'lotItems.ts:_create',
  'lotItems.ts:_updateGemaFields',
  'asesorMovements.ts:_registerHandoff',
  'asesorMovements.ts:_registerReturn',
  // The 2026-09-06 gaps — the regression this per-mutation rewrite exists for.
  'lots.ts:_cancel',
  'lots.ts:_setLoteDisplay',
  'lotItems.ts:_remove',
  'lotItems.ts:_attachExistingToLote',
  'products.ts:_upsertFromSheet',
  'products.ts:_bulkPublishCertificados',
  'migrations.ts:_moveItemToLote',
  'subLotes.ts:_setEstado',
  'subLotes.ts:_setDisplay',
  'casillas.ts:_publicar',
];

interface Bloque {
  clave: string;
  cuerpo: string;
}

function modulosConvex(): string[] {
  return readdirSync(CONVEX_DIR).filter(
    (f) => f.endsWith('.ts') && !f.startsWith('_'),
  );
}

/**
 * Splits a module into its exported mutation blocks. A block runs from its
 * `export const X = (internal)?mutation(` line to the next top-level `export`
 * (or EOF). Helpers declared between exports are attributed to the preceding
 * block, which is the conservative direction: a bump inside a shared helper
 * such as `applyMediaToProduct` counts for the mutation that follows it only
 * if the helper sits after it — so mutations that delegate must still name the
 * sentinel themselves, or be exempted here with a reason.
 */
function bloquesDeMutacion(archivo: string, src: string): Bloque[] {
  const cabeceras = [
    ...src.matchAll(/^export const (\w+) = (?:internalMutation|mutation)\(/gm),
  ];
  const cortes = [...src.matchAll(/^export /gm)].map((m) => m.index!);
  return cabeceras.map((m) => {
    const inicio = m.index!;
    const fin = cortes.find((c) => c > inicio) ?? src.length;
    return { clave: `${archivo}:${m[1]}`, cuerpo: src.slice(inicio, fin) };
  });
}

/**
 * The grouping flags only exist on lots/subLotes, so a block that names them
 * touches a catalog table even when its args validator lives outside the block
 * (`lots._setLoteDisplay` takes `setLoteDisplayArgs`, declared above it).
 */
const CAMPOS_DE_AGRUPACION =
  /\b(mostrarEnCatalogo|mostrarComoLote|fotoLoteUrl)\b/;

function tocaElCatalogo(cuerpo: string): boolean {
  return (
    ESCRIBE.test(cuerpo) &&
    (TABLAS_DEL_CATALOGO.test(cuerpo) || CAMPOS_DE_AGRUPACION.test(cuerpo)) &&
    CAMPOS_VISIBLES.test(cuerpo)
  );
}

describe('catalog sentinel wiring, per mutation', () => {
  const sinBump: string[] = [];
  const cubiertas: string[] = [];
  const exentasUsadas = new Set<string>();

  for (const archivo of modulosConvex()) {
    const src = readFileSync(join(CONVEX_DIR, archivo), 'utf8');
    for (const { clave, cuerpo } of bloquesDeMutacion(archivo, src)) {
      // A block that names the sentinel is covered whatever its shape — some
      // (e.g. `subLotes._setEstado`) reach their table through a helper and
      // never spell the table name, so the shape test alone would miss them.
      if (MUEVE_CENTINELA.test(cuerpo)) {
        cubiertas.push(clave);
        continue;
      }
      if (!tocaElCatalogo(cuerpo)) continue;
      if (clave in EXENTAS) {
        exentasUsadas.add(clave);
        continue;
      }
      sinBump.push(clave);
    }
  }

  it('every mutation that writes catalog-visible state names the sentinel', () => {
    expect(
      sinBump,
      'Estas mutaciones escriben en una tabla que el catálogo público lee y ' +
        'tocan un campo que proyecta o filtra, y no llaman a ' +
        'bumpCatalogVersion(IfPublished|IfShownGroup). Sin el bump, el cambio ' +
        'no llega a ningún visitante hasta que venza el TTL. Agregá el bump ' +
        '(condicionado a visibilidad) o una entrada en EXENTAS con la razón:\n  ' +
        sinBump.join('\n  '),
    ).toEqual([]);
  });

  it('actually found and covered the known movers of catalog state', () => {
    const faltantes = CUBIERTAS_OBLIGATORIAS.filter(
      (c) => !cubiertas.includes(c),
    );
    expect(
      faltantes,
      'Estas mutaciones deberían aparecer como cubiertas. Si una dejó de ' +
        'existir, quitala de CUBIERTAS_OBLIGATORIAS; si el splitter dejó de ' +
        'verla, arreglá el splitter — una guarda que no ve nada pasa en vacío.',
    ).toEqual([]);
  });

  it('every exemption still points at a real mutation of the right shape', () => {
    // An exemption for a mutation that no longer matches the rule (or no
    // longer exists) is dead weight that hides a future rename.
    const muertas = Object.keys(EXENTAS).filter((k) => !exentasUsadas.has(k));
    expect(muertas, 'exenciones que ya no aplican').toEqual([]);
  });
});

describe('the sale path specifically', () => {
  const salesSrc = readFileSync(join(CONVEX_DIR, 'sales.ts'), 'utf8');

  it('bumps on both the sale and its cancellation', () => {
    // A cancellation returns stock to DISPONIBLE; without a bump the piece
    // stays invisible until the TTL expires.
    const calls = salesSrc.match(/bumpCatalogVersion\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it('guards the bump on mostrarEnCatalogo rather than firing it blindly', () => {
    // Bumping unconditionally would invalidate every visitor's catalog when an
    // UNpublished piece sells — reproducing the blow-up through another door.
    expect(salesSrc).toMatch(/mostrarEnCatalogo === true/);
  });
});
