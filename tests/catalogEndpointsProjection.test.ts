import { describe, it, expect } from 'vitest';
import { PUBLIC_KEYS } from '../api/_lib/catalogProjection';

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

  it('is exactly the 11 fields the spec approved', () => {
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
      ].sort(),
    );
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
