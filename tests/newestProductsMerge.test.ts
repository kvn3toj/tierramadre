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
    imagen: `/api/serve-drive-image?fileId=item-${overrides.item}`,
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
  it('sorts legacy (Drive) and Fotosíntesis items together by item number, highest first', () => {
    // "Newest" is the inventory number, not the publish stamp: item 542
    // published on 2026-08-23 must not outrank item 585 published on
    // 2026-08-20 (the production situation on 2026-09-09).
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

    expect(result.map((i) => i.item)).toEqual([3, 2, 1]);
  });

  it('ranks a higher item number above a more recent publishedAt', () => {
    const treasure = [
      treasureItem({
        item: 542,
        publishedAt: new Date('2026-08-23T20:01:00.000Z').getTime(),
      }),
      treasureItem({
        item: 585,
        publishedAt: new Date('2026-08-20T02:38:00.000Z').getTime(),
      }),
    ];

    const result = mergeNewestCandidates([], treasure, 10);

    expect(result.map((i) => i.item)).toEqual([585, 542]);
  });

  it('breaks an item-number tie (93A / 93B both parse to 93) by publishedAt', () => {
    const treasure = [
      treasureItem({ item: 93, itemId: '93A', publishedAt: 1000 }),
      treasureItem({ item: 93, itemId: '93B', publishedAt: 2000 }),
    ];

    const result = mergeNewestCandidates([], treasure, 10);

    expect(result.map((i) => i.itemId)).toEqual(['93B', '93A']);
  });

  it('excludes a sold item (estado VENDIDA) but keeps ASESOR / CONSIGNACION', () => {
    const treasure = [
      treasureItem({ item: 10, publishedAt: 1, estado: 'VENDIDA' }),
      treasureItem({ item: 9, publishedAt: 1, estado: 'ASESOR' }),
      treasureItem({ item: 8, publishedAt: 1, estado: 'CONSIGNACION' }),
      // Withheld for anon/guest: unknown is not "sold".
      treasureItem({ item: 7, publishedAt: 1, estado: undefined }),
    ];

    const result = mergeNewestCandidates([], treasure, 10);

    expect(result.map((i) => i.item)).toEqual([9, 8, 7]);
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

  it('does not double-count an item that has both a Drive folder and a Fotosíntesis publishedAt', () => {
    // Normally disjoint (Fotosíntesis photos never land in the products/
    // Drive folder), but an out-of-band manual upload could create both —
    // the Fotosíntesis-published copy must win, not both.
    const treasure = [treasureItem({ item: 7, publishedAt: Date.now() })];
    const drive = [
      driveCandidate({
        itemNumber: 7,
        imageCreatedTime: '2026-06-01T00:00:00.000Z',
      }),
    ];

    const result = mergeNewestCandidates(drive, treasure, 10);

    expect(result.map((i) => i.item)).toEqual([7]);
  });

  it('treats a malformed Drive imageCreatedTime as oldest in a tie rather than corrupting sort order', () => {
    const treasure = [treasureItem({ item: 1, publishedAt: Date.now() })];
    const drive = [
      driveCandidate({ itemNumber: 1, imageCreatedTime: 'not-a-date' }),
    ];
    // Same number, one side dated, one side not: the dated one wins the tie,
    // and the merge still returns a well-formed list.
    const treasureUnpublished = [treasureItem({ item: 1 })];

    expect(
      mergeNewestCandidates(drive, treasure, 10).map((i) => i.item),
    ).toEqual([1]);
    expect(
      mergeNewestCandidates(drive, treasureUnpublished, 10).map((i) => i.item),
    ).toEqual([1]);
  });

  it('excludes a published Fotosíntesis item that has no photo yet', () => {
    // Published before its photo was uploaded (or fotoUrl never set) would
    // otherwise render a broken-image placeholder in the carousel.
    const treasure = [
      treasureItem({ item: 1, publishedAt: Date.now(), imagen: undefined }),
      treasureItem({ item: 2, publishedAt: Date.now() - 1000 }),
    ];

    const result = mergeNewestCandidates([], treasure, 10);

    expect(result.map((i) => i.item)).toEqual([2]);
  });
});
