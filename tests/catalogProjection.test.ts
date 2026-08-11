import { describe, it, expect } from 'vitest';
import {
  PUBLIC_KEYS,
  toPublicItem,
  projectForGrant,
} from '../api/_lib/catalogProjection';
import type { TreasureItem } from '../src/types/index.ts';

// A row shaped like what get-treasure-sheets actually emits today (23 keys).
const ROW = {
  item: 1,
  fechaIngreso: '31-oct-2025',
  nombre: 'Rey Midas',
  peso: 1.47,
  color: 'Verde Natural',
  calidad: 'COMERCIAL FINA',
  cantidad: 1,
  talla: 'Esmeralda',
  tallaAnillo: '',
  medidas: '',
  medidasValores: '',
  categoria: 'Gema',
  precioCOP: 635000,
  precioInternacional: 200000,
  ubicacion: 'ASESOR',
  asesor: 'M.Campuzano',
  estado: 'VENDIDA',
  qr: 'https://tierramadre.app/p/1',
  coleccion: '#4000',
  caja: 'C-12',
  asesorActual: 'M.Campuzano',
  estadoAsesor: 'VENDIDA',
  isJewelry: false,
  sheetRow: 42,
} as unknown as TreasureItem;

describe('toPublicItem', () => {
  it('emits only allowlisted keys', () => {
    const out = toPublicItem(ROW);
    expect(Object.keys(out).sort()).toEqual([...PUBLIC_KEYS].sort());
  });

  it('withholds every commercially sensitive field', () => {
    const out = toPublicItem(ROW) as Record<string, unknown>;
    for (const key of [
      'precioCOP',
      'precioInternacional',
      'ubicacion',
      'caja',
      'estado',
      'cantidad',
      'asesor',
      'asesorActual',
      'estadoAsesor',
      'fechaIngreso',
      'sheetRow',
      'qr',
    ]) {
      expect(out[key]).toBeUndefined();
    }
  });

  it('keeps the fields that sell the stone', () => {
    const out = toPublicItem(ROW);
    expect(out.item).toBe(1);
    expect(out.nombre).toBe('Rey Midas');
    expect(out.peso).toBe(1.47);
    expect(out.calidad).toBe('COMERCIAL FINA');
  });

  it('does not mutate its input', () => {
    const before = JSON.stringify(ROW);
    toPublicItem(ROW);
    expect(JSON.stringify(ROW)).toBe(before);
  });
});

describe('projectForGrant', () => {
  it('returns staff rows untouched', () => {
    const [out] = projectForGrant([ROW], { kind: 'staff' });
    expect(out).toBe(ROW);
  });

  it('projects everything for anon', () => {
    const [out] = projectForGrant([ROW], { kind: 'anon' }) as Record<
      string,
      unknown
    >[];
    expect(out.precioCOP).toBeUndefined();
  });

  it('restores full rows only for the items a vitrina grants', () => {
    const other = { ...ROW, item: 2 } as TreasureItem;
    const out = projectForGrant([ROW, other], {
      kind: 'vitrina',
      itemIds: [1],
    }) as Record<string, unknown>[];
    expect(out[0].precioCOP).toBe(635000); // granted
    expect(out[1].precioCOP).toBeUndefined(); // not in this vitrina
  });
});
