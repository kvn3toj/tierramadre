import { describe, it, expect } from 'vitest';
import {
  mergeNewestCandidates,
  type DriveNewestCandidate,
} from '../src/utils/newestProductsMerge';
import type { TreasureItem } from '../src/types';

function treasureItem(
  overrides: Partial<TreasureItem> & { item: number },
): TreasureItem {
  return {
    fechaIngreso: '',
    nombre: `Item ${overrides.item}`,
    peso: 1,
    color: '',
    calidad: '',
    cantidad: 1,
    talla: '',
    medidas: '',
    precioCOP: 0,
    ubicacion: '',
    asesor: '',
    estado: 'DISPONIBLE',
    isJewelry: false,
    ...overrides,
  } as TreasureItem;
}

function driveCandidate(
  overrides: Partial<DriveNewestCandidate> & { itemNumber: number },
): DriveNewestCandidate {
  return {
    productName: `Legacy ${overrides.itemNumber}`,
    proxyUrl: `/api/serve-drive-image?fileId=${overrides.itemNumber}`,
    imageCreatedTime: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mergeNewestCandidates', () => {
  it('sorts legacy (Drive) and Fotosíntesis items together, newest first', () => {
    const treasure = [
      treasureItem({ item: 1 }),
      treasureItem({
        item: 2,
        publishedAt: new Date('2026-07-01T00:00:00.000Z').getTime(),
      }),
      treasureItem({
        item: 3,
        publishedAt: new Date('2026-06-01T00:00:00.000Z').getTime(),
      }),
    ];
    const drive = [
      driveCandidate({
        itemNumber: 1,
        imageCreatedTime: '2026-06-15T00:00:00.000Z',
      }),
    ];

    const result = mergeNewestCandidates(drive, treasure, 10);

    expect(result.map((i) => i.item)).toEqual([2, 1, 3]);
  });

  it('excludes lote/sublote bundle cards even if they carry publishedAt', () => {
    const treasure = [
      treasureItem({ item: 2, publishedAt: Date.now(), isLote: true }),
      treasureItem({ item: 3, publishedAt: Date.now() - 1000 }),
    ];

    const result = mergeNewestCandidates([], treasure, 10);

    expect(result.map((i) => i.item)).toEqual([3]);
  });

  it('slices to the requested limit', () => {
    const treasure = Array.from({ length: 5 }, (_, i) =>
      treasureItem({ item: i + 1, publishedAt: i }),
    );

    const result = mergeNewestCandidates([], treasure, 2);

    expect(result).toHaveLength(2);
    expect(result.map((i) => i.item)).toEqual([5, 4]);
  });

  it('falls back to a minimal stub when a Drive item has no treasure match', () => {
    const drive = [
      driveCandidate({
        itemNumber: 99,
        imageCreatedTime: '2026-06-01T00:00:00.000Z',
      }),
    ];

    const result = mergeNewestCandidates(drive, [], 10);

    expect(result).toEqual([
      expect.objectContaining({
        item: 99,
        nombre: 'Legacy 99',
        imagen: drive[0].proxyUrl,
      }),
    ]);
  });

  it('returns [] when there are no candidates from either source', () => {
    expect(mergeNewestCandidates([], [], 10)).toEqual([]);
  });
});
