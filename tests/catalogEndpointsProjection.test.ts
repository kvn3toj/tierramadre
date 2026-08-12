import { describe, it, expect } from 'vitest';
import {
  PUBLIC_KEYS,
  toPublicItem,
  PUBLIC_ASESOR_KEYS,
  toPublicAsesor,
  type AsesorRecord,
} from '../api/_lib/catalogProjection';
import type { TreasureItem } from '../src/types/index.ts';

const SENSITIVE = [
  'precioCOP',
  'precioInternacional',
  'costoTM',
  'ubicacion',
  'caja',
  'estado',
  'cantidad',
  'asesor',
  'asesorActual',
  'estadoAsesor',
  'fechaIngreso',
  'sheetRow',
];

describe('PUBLIC_KEYS', () => {
  it('never overlaps the sensitive set', () => {
    for (const key of SENSITIVE) {
      expect(PUBLIC_KEYS).not.toContain(key);
    }
  });

  it('is exactly the 19 fields the spec approved (12 catalog + 7 media)', () => {
    // The 7 media fields (imagen, mediaType, thumbnailUrl, videoUrl,
    // posterUrl, galleryCount, tinyThumb) were deliberately promoted from
    // WITHHELD_KEYS in the Task 7 fix round: they're images/video already
    // served publicly through the Drive proxy and thumbnail endpoints
    // (get-batch-thumbnails, get-drive-images), so withholding them from
    // the catalog projection protected nothing while breaking public pages
    // (get-collection.js's `/c/:folder`) that need them to render a card.
    expect([...PUBLIC_KEYS].sort()).toEqual(
      [
        'calidad',
        'categoria',
        'coleccion',
        'color',
        'isJewelry',
        'item',
        'medidas',
        'medidasValores',
        'nombre',
        'peso',
        'talla',
        'tallaAnillo',
        'imagen',
        'mediaType',
        'thumbnailUrl',
        'videoUrl',
        'posterUrl',
        'galleryCount',
        'tinyThumb',
      ].sort(),
    );
  });

  it('does not change get-treasure-sheets: its rows never populate the media fields, so the projected payload is unchanged', () => {
    // get-treasure-sheets.ts's own doc comment lists its rows as one of 23
    // named keys, none of them media — this fixture mirrors that shape (no
    // imagen/thumbnailUrl/etc). Widening PUBLIC_KEYS to include media only
    // changes output when a source item actually HAS a media value; on a
    // row that never sets one, toPublicItem assigns `imagen: undefined`
    // etc, and JSON.stringify (what actually goes over the wire) drops
    // undefined-valued keys — so the HTTP response is byte-identical.
    const row = {
      item: 1,
      nombre: 'Rey Midas',
      peso: 1.47,
      color: 'Verde Natural',
      calidad: 'COMERCIAL FINA',
      talla: 'Esmeralda',
      medidas: '',
      medidasValores: '',
      categoria: 'Gema',
      coleccion: '#4000',
      isJewelry: false,
      // No imagen/mediaType/thumbnailUrl/videoUrl/posterUrl/galleryCount/
      // tinyThumb — matches what mapRowToTreasureItem produces when the SOT
      // row has no Fotosíntesis-captured fotoUrl.
    } as unknown as TreasureItem;

    const out = toPublicItem(row);
    const overWire = JSON.parse(JSON.stringify(out));
    expect(Object.keys(overWire).sort()).toEqual(
      [
        'item',
        'nombre',
        'peso',
        'color',
        'calidad',
        'talla',
        'medidas',
        'medidasValores',
        'categoria',
        'coleccion',
        'isJewelry',
      ].sort(),
    );
  });

  it('DOES surface a media field once populated (the intended widening, not a regression)', () => {
    // The one case where get-treasure-sheets' output actually changes:
    // mapRowToTreasureItem sets `imagen`/`thumbnailUrl` when the SOT row
    // carries a Fotosíntesis-captured `fotoUrl` (get-treasure-sheets.ts,
    // "Fotosíntesis-captured photo" block). Before this fix that photo was
    // stripped from anon/vitrina-excluded rows; now it is shown — safe, per
    // the same reasoning that already exempts get-batch-thumbnails/
    // get-drive-images from gating.
    const row = {
      item: 1,
      nombre: 'Rey Midas',
      imagen: '/api/serve-drive-image?fileId=abc123',
      thumbnailUrl: '/api/serve-drive-image?fileId=abc123',
    } as unknown as TreasureItem;

    const out = toPublicItem(row) as Record<string, unknown>;
    expect(out.imagen).toBe('/api/serve-drive-image?fileId=abc123');
    expect(out.thumbnailUrl).toBe('/api/serve-drive-image?fileId=abc123');
  });
});

describe('PUBLIC_ASESOR_KEYS (F5, 2026-08 fix round)', () => {
  const ROW: AsesorRecord = {
    id: 'asesor_1',
    name: 'Maria Campuzano',
    slug: 'maria-campuzano',
    role: 'Asesor',
    whatsapp: '+573001234567',
    especialidad: 'Esmeraldas',
    email: 'maria@tierramadre.co',
    photoFileId: 'abc123',
    photoUrl: '/api/serve-drive-image?fileId=abc123',
    vaultCode: 'BOVEDA-42',
  };

  it("never overlaps email or vaultCode — the human ruling's withheld set", () => {
    expect(PUBLIC_ASESOR_KEYS).not.toContain('email');
    expect(PUBLIC_ASESOR_KEYS).not.toContain('vaultCode');
  });

  it('is exactly the 8 fields ruled public — id, name, slug, role, especialidad, photo, and whatsapp (deviation, documented on toPublicAsesor)', () => {
    expect([...PUBLIC_ASESOR_KEYS].sort()).toEqual(
      [
        'id',
        'name',
        'slug',
        'role',
        'especialidad',
        'whatsapp',
        'photoFileId',
        'photoUrl',
      ].sort(),
    );
  });

  it('toPublicAsesor withholds email and vaultCode but keeps whatsapp', () => {
    const out = toPublicAsesor(ROW) as Record<string, unknown>;
    expect(out.email).toBeUndefined();
    expect(out.vaultCode).toBeUndefined();
    expect(out.whatsapp).toBe('+573001234567');
    expect(out.name).toBe('Maria Campuzano');
    expect(out.slug).toBe('maria-campuzano');
  });

  it('does not mutate its input', () => {
    const before = JSON.stringify(ROW);
    toPublicAsesor(ROW);
    expect(JSON.stringify(ROW)).toBe(before);
  });
});

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const API_DIR = join(__dirname, '..', 'api');

// Endpoints that read catalog rows and MUST gate on a grant.
const CATALOG_ENDPOINTS = [
  'get-treasure-sheets.ts',
  'get-newest-products.js',
  'get-inventory-rows.ts',
  'get-table.ts',
  'get-table-rows.ts',
  'get-collection.js',
  'get-asesores.ts',
];

describe('every catalog endpoint gates on a grant', () => {
  it.each(CATALOG_ENDPOINTS)('%s resolves a grant', (file) => {
    const src = readFileSync(join(API_DIR, file), 'utf8');
    expect(src).toContain('resolveGrant');
  });

  it('flags any new get-* endpoint nobody classified', () => {
    const onDisk = readdirSync(API_DIR).filter(
      (f) => f.startsWith('get-') && /\.[jt]s$/.test(f),
    );
    // Media-only endpoints serve images and carry no sensitive fields.
    const MEDIA_ONLY = ['get-batch-thumbnails.ts', 'get-drive-images.js'];
    const unclassified = onDisk.filter(
      (f) => !CATALOG_ENDPOINTS.includes(f) && !MEDIA_ONLY.includes(f),
    );
    expect(unclassified).toEqual([]);
  });
});
