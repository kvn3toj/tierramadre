import { describe, it, expect } from 'vitest';
import {
  WRITABLE,
  FOTO_SYNC_TABLES,
  coerceCell,
  planRowPatch,
  normalizeInvEstado,
  normalizeLotEstado,
  normalizeSaleEstado,
  normalizeSubLoteEstado,
  type FotoSyncTable,
} from '../convex/_lib/sheetPullMaps';
import { COLUMN_MAPS } from '../convex/_lib/columnMaps';
import { TABLE_CONFIGS } from '../api/_lib/admin-table-config';
// .js source of truth for the Inventario tab layout (no types; runtime import).
import { FOTO_INVENTARIO_COLUMNS } from '../api/_lib/fotosintesis-inventory-columns.js';

const INVENTORY_KEYS: string[] = (
  FOTO_INVENTARIO_COLUMNS as Array<{ key: string }>
).map((c) => c.key);

describe('drift: every writable allowlist key is a real column', () => {
  it('inventory allowlist ⊆ FOTO_INVENTARIO_COLUMNS keys', () => {
    for (const key of Object.keys(WRITABLE.inventory)) {
      expect(INVENTORY_KEYS, `inventory.${key}`).toContain(key);
    }
  });

  it('the 5 non-inventory allowlists ⊆ their COLUMN_MAPS', () => {
    const five: FotoSyncTable[] = [
      'providers',
      'lots',
      'clients',
      'sales',
      'subLotes',
    ];
    for (const table of five) {
      const cols = COLUMN_MAPS[table] as readonly string[];
      for (const key of Object.keys(WRITABLE[table])) {
        expect(cols, `${table}.${key}`).toContain(key);
      }
    }
  });
});

describe('guardrails: dangerous columns are NOT writable', () => {
  it('derived + FK-name + natural-key columns are excluded', () => {
    // costoBaseCOP is SHEET-OWNED since 2026-07-24 (asserted in its own block
    // below) — only preponderancia stays excluded on the inventory side.
    expect(WRITABLE.inventory).not.toHaveProperty('preponderancia');
    expect(WRITABLE.inventory).not.toHaveProperty('item'); // natural key (col A)
    expect(WRITABLE.lots).not.toHaveProperty('providerNombre'); // denormalized FK
    expect(WRITABLE.lots).not.toHaveProperty('loteId'); // natural key
    expect(WRITABLE.sales).not.toHaveProperty('clientNombre'); // denormalized FK
    expect(WRITABLE.sales).not.toHaveProperty('saleId');
    expect(WRITABLE.sales).not.toHaveProperty('totalCOP'); // derived: precioAcordado − descuento
    expect(WRITABLE.sales).not.toHaveProperty('comisionCOP'); // derived: % of total
    expect(WRITABLE.subLotes).not.toHaveProperty('unidades'); // derived
    expect(WRITABLE.subLotes).not.toHaveProperty('totalCostoCOP'); // derived
    expect(WRITABLE.providers).not.toHaveProperty('nombreORazonSocial');
    expect(WRITABLE.clients).not.toHaveProperty('nombre');
  });

  it('covers all 6 tables', () => {
    expect(Object.keys(WRITABLE).sort()).toEqual([...FOTO_SYNC_TABLES].sort());
  });
});

describe('price ownership (2026-07-23): the sheet owns precioFinalCOP', () => {
  // The official price list is not a fixed multiple of cost, so column M was
  // moved OUT of the derived set and INTO the allowlist. If someone reverts this,
  // the sheet's prices silently snap back to costoBaseCOP × 2.6 on the next push
  // — the exact bug this guards.
  it('precioFinalCOP is writable', () => {
    expect(WRITABLE.inventory).toHaveProperty('precioFinalCOP');
  });

  it('pulling a new price stamps precioFinalManual so the lote re-fan skips it', () => {
    const plan = planRowPatch(
      'inventory',
      { syncStatus: 'synced', precioFinalCOP: 364780 },
      { precioFinalCOP: '830116' },
    );
    expect(plan.action).toBe('patch');
    expect(plan.patch.precioFinalCOP).toBe(830116);
    expect(plan.patch.precioFinalManual).toBe(true);
  });

  it('an unchanged price is diff-skipped and does NOT stamp the flag', () => {
    const plan = planRowPatch(
      'inventory',
      { syncStatus: 'synced', precioFinalCOP: 830116 },
      { precioFinalCOP: '830116' },
    );
    expect(plan.patch).not.toHaveProperty('precioFinalCOP');
    expect(plan.patch).not.toHaveProperty('precioFinalManual');
  });

  it('a blanked price cell never clears the price (num coercion skips)', () => {
    const plan = planRowPatch(
      'inventory',
      { syncStatus: 'synced', precioFinalCOP: 830116 },
      { precioFinalCOP: '' },
    );
    expect(plan.patch).not.toHaveProperty('precioFinalCOP');
    expect(plan.patch).not.toHaveProperty('precioFinalManual');
  });

  it('cost sent from the sheet is now pulled (sheet-owned, 2026-07-24)', () => {
    const plan = planRowPatch(
      'inventory',
      { syncStatus: 'synced', costoBaseCOP: 140300 },
      { costoBaseCOP: '319275' },
    );
    expect(plan.action).toBe('patch');
    expect(plan.patch.costoBaseCOP).toBe(319275);
    // Cost is not the price — pulling it must NOT stamp the price-override flag.
    expect(plan.patch).not.toHaveProperty('precioFinalManual');
  });

  it('an unchanged cost is diff-skipped', () => {
    const plan = planRowPatch(
      'inventory',
      { syncStatus: 'synced', costoBaseCOP: 140300 },
      { costoBaseCOP: '140300' },
    );
    expect(plan.patch).not.toHaveProperty('costoBaseCOP');
  });

  it('a blanked cost cell never clears the cost (num coercion skips)', () => {
    const plan = planRowPatch(
      'inventory',
      { syncStatus: 'synced', costoBaseCOP: 140300 },
      { costoBaseCOP: '' },
    );
    expect(plan.patch).not.toHaveProperty('costoBaseCOP');
  });
});

describe('drift: Vercel TABLE_CONFIGS ≡ Convex COLUMN_MAPS', () => {
  // The two declarations of each tab's column layout (the Vercel reader/writer
  // and the Convex marshaler) MUST agree column-for-column and in order, or an
  // incoming/outgoing cell silently mis-routes. This is the automated guard the
  // missing scripts/verify-column-maps.ts was meant to provide.
  it('the 5 generic tables agree column-for-column (order + membership)', () => {
    const five = ['providers', 'lots', 'clients', 'sales', 'subLotes'] as const;
    for (const table of five) {
      expect(COLUMN_MAPS[table], table).toEqual(TABLE_CONFIGS[table].columns);
    }
  });
});

describe('coerceCell', () => {
  it('str trims', () => {
    expect(coerceCell('str', '  hola ')).toEqual({
      skip: false,
      value: 'hola',
    });
  });

  it('num parses $ and thousands separators, skips blank/invalid', () => {
    expect(coerceCell('num', '$1,250,000')).toEqual({
      skip: false,
      value: 1250000,
    });
    expect(coerceCell('num', '42')).toEqual({ skip: false, value: 42 });
    expect(coerceCell('num', '')).toEqual({ skip: true }); // never clear a number
    expect(coerceCell('num', 'abc')).toEqual({ skip: true });
  });

  it('bool recognizes truthy/falsey words, skips unknown', () => {
    expect(coerceCell('bool', 'TRUE')).toEqual({ skip: false, value: true });
    expect(coerceCell('bool', 'x')).toEqual({ skip: false, value: true });
    expect(coerceCell('bool', '0')).toEqual({ skip: false, value: false });
    expect(coerceCell('bool', 'no')).toEqual({ skip: false, value: false });
    expect(coerceCell('bool', 'quizás')).toEqual({ skip: true });
  });

  it('csv splits, trims, drops empties', () => {
    expect(coerceCell('csv', 'a, b ,,c')).toEqual({
      skip: false,
      value: ['a', 'b', 'c'],
    });
    expect(coerceCell('csv', '')).toEqual({ skip: false, value: [] });
  });

  it('fecha trunca el sufijo de hora que sirve Sheets sobre una celda datetime', () => {
    expect(coerceCell('fecha', '2026-05-25 00:00:00')).toEqual({
      skip: false,
      value: '2026-05-25',
    });
    expect(coerceCell('fecha', '2026-07-01')).toEqual({
      skip: false,
      value: '2026-07-01',
    });
  });

  it('estado normalizers route through coerce', () => {
    expect(coerceCell('estadoSale', 'Cancelada')).toEqual({
      skip: false,
      value: 'cancelada',
    });
    expect(coerceCell('estadoSale', '??')).toEqual({ skip: true });
    expect(coerceCell('estadoInv', 'vendida')).toEqual({
      skip: false,
      value: 'VENDIDA',
    });
  });
});

describe('estado normalizers', () => {
  it('inventory: case-insensitive, legacy default + casing', () => {
    expect(normalizeInvEstado('disponible')).toBe('DISPONIBLE');
    expect(normalizeInvEstado('RETORNADO')).toBe('Retornado');
    expect(normalizeInvEstado('')).toBe('DISPONIBLE');
    expect(normalizeInvEstado('xyz')).toBeNull();
  });

  it('lot / sale / subLote: lowercase whitelist, unknown → null', () => {
    expect(normalizeLotEstado('Publicado')).toBe('publicado');
    expect(normalizeLotEstado('foo')).toBeNull();
    expect(normalizeSaleEstado('CONFIRMADA')).toBe('confirmada');
    expect(normalizeSubLoteEstado('Archivada')).toBe('archivada');
    expect(normalizeSubLoteEstado('borrador')).toBeNull();
  });

  // `reconstruido` describe una agrupación retroactiva armada desde colecciones
  // legadas, no una compra. Que devolviera `null` es exactamente por lo que los
  // 28 lotes se omitieron en `804458e`, y por lo que dev reparte el gasto fijo
  // entre menos lotes de los que existen.
  it('lot: `reconstruido` ya es un estado del modelo', () => {
    expect(normalizeLotEstado('reconstruido')).toBe('reconstruido');
    expect(normalizeLotEstado('Reconstruido')).toBe('reconstruido');
    expect(normalizeLotEstado('  RECONSTRUIDO  ')).toBe('reconstruido');
  });
});
