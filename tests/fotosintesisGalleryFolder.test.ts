import { describe, it, expect, beforeEach } from 'vitest';

/**
 * La galería de la ficha (`/api/get-drive-images`) solo sabía buscar en
 * `products/{item} - Nombre/`, pero el bot sube los álbumes a
 * `fotosintesis/<loteId>/<itemId>/` (carpetas con el id pelado: "TM-001"/"574").
 * Resultado: un ítem con 4 fotos en Drive mostraba UNA sola en la ficha — la
 * `fotoUrl` principal — porque el endpoint respondía "no folder found" y la
 * página caía al fallback de imagen única (caso TM-0574, 2026-08-19).
 *
 * `getFotosintesisItemFolderId` es el eslabón nuevo: encuentra la carpeta del
 * ítem dentro del árbol `fotosintesis/` verificando el LINAJE (padre o abuelo
 * = raíz fotosintesis), para que una carpeta "574" suelta en otra parte del
 * Drive no secuestre la galería.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

import {
  getFotosintesisItemFolderId,
  invalidateFolderCache,
} from '../api/_lib/drive-helpers.js';

const SHARED_DRIVE_ID = 'shared-drive-root';
const FOTO_ROOT_ID = 'folder-fotosintesis';

interface FakeFolder {
  id: string;
  name: string;
  parents: string[];
}

/**
 * Drive falso: resuelve las TRES llamadas que hace el helper —
 *   1. files.list buscando la raíz `fotosintesis` bajo el shared drive,
 *   2. files.list buscando carpetas con el nombre del ítem,
 *   3. files.get del padre de un candidato (para el chequeo de abuelo).
 * Cuenta las llamadas para poder afirmar "no tocó Drive".
 */
function fakeDrive(folders: FakeFolder[], hasFotoRoot = true) {
  const calls = { list: 0, get: 0 };
  const byId = new Map(folders.map((f) => [f.id, f]));
  const drive = {
    files: {
      list: async ({ q }: { q: string }) => {
        calls.list += 1;
        if (q.includes("name='fotosintesis'")) {
          return {
            data: {
              files: hasFotoRoot
                ? [{ id: FOTO_ROOT_ID, name: 'fotosintesis' }]
                : [],
            },
          };
        }
        const nameMatch = q.match(/name='([^']*)'/);
        const wanted = nameMatch?.[1];
        return {
          data: {
            files: folders
              .filter((f) => f.name === wanted)
              .map((f) => ({ id: f.id, name: f.name, parents: f.parents })),
          },
        };
      },
      get: async ({ fileId }: { fileId: string }) => {
        calls.get += 1;
        const folder = byId.get(fileId);
        if (!folder) throw new Error(`files.get: ${fileId} no existe`);
        return { data: { id: folder.id, parents: folder.parents } };
      },
    },
  };
  return { drive: drive as Any, calls };
}

beforeEach(() => {
  // El cache de carpetas es a nivel de módulo (sobrevive entre tests igual que
  // entre requests de Fluid Compute) — limpiarlo evita que un test lea el
  // resultado del anterior.
  invalidateFolderCache();
});

describe('getFotosintesisItemFolderId', () => {
  it('encuentra fotosintesis/<lote>/<item> verificando el abuelo', async () => {
    const { drive } = fakeDrive([
      { id: 'lote-tm001', name: 'TM-001', parents: [FOTO_ROOT_ID] },
      { id: 'item-574', name: '574', parents: ['lote-tm001'] },
    ]);
    await expect(
      getFotosintesisItemFolderId(drive, SHARED_DRIVE_ID, '574'),
    ).resolves.toBe('item-574');
  });

  it('acepta un ítem colgado directo de la raíz fotosintesis', async () => {
    const { drive, calls } = fakeDrive([
      { id: 'item-9', name: '9', parents: [FOTO_ROOT_ID] },
    ]);
    await expect(
      getFotosintesisItemFolderId(drive, SHARED_DRIVE_ID, 9),
    ).resolves.toBe('item-9');
    // Padre directo = raíz: no hace falta el files.get del abuelo.
    expect(calls.get).toBe(0);
  });

  it('ignora una carpeta homónima fuera del árbol fotosintesis', async () => {
    const { drive } = fakeDrive([
      { id: 'ajena', name: 'carpeta-ajena', parents: [SHARED_DRIVE_ID] },
      { id: 'decoy-574', name: '574', parents: ['ajena'] },
    ]);
    await expect(
      getFotosintesisItemFolderId(drive, SHARED_DRIVE_ID, '574'),
    ).resolves.toBeNull();
  });

  it('elige la carpeta del árbol fotosintesis aunque exista un decoy', async () => {
    const { drive } = fakeDrive([
      { id: 'ajena', name: 'carpeta-ajena', parents: [SHARED_DRIVE_ID] },
      { id: 'decoy-574', name: '574', parents: ['ajena'] },
      { id: 'lote-tm001', name: 'TM-001', parents: [FOTO_ROOT_ID] },
      { id: 'item-574', name: '574', parents: ['lote-tm001'] },
    ]);
    await expect(
      getFotosintesisItemFolderId(drive, SHARED_DRIVE_ID, '574'),
    ).resolves.toBe('item-574');
  });

  it('devuelve null sin buscar el ítem cuando no existe la raíz fotosintesis', async () => {
    const { drive, calls } = fakeDrive([], /* hasFotoRoot */ false);
    await expect(
      getFotosintesisItemFolderId(drive, SHARED_DRIVE_ID, '574'),
    ).resolves.toBeNull();
    // Solo la búsqueda de la raíz; nunca la del ítem.
    expect(calls.list).toBe(1);
  });

  it('rechaza un itemNumber que no sea un id plano, sin tocar Drive', async () => {
    // El nombre entra crudo al string de query de Drive: un valor con comillas
    // podría reescribir la búsqueda. Se rechaza en vez de escaparse.
    const { drive, calls } = fakeDrive([]);
    await expect(
      getFotosintesisItemFolderId(drive, SHARED_DRIVE_ID, "574' or name!='x"),
    ).resolves.toBeNull();
    expect(calls.list).toBe(0);
    expect(calls.get).toBe(0);
  });

  it('cachea el resultado: segunda llamada sin viajes a Drive', async () => {
    const { drive, calls } = fakeDrive([
      { id: 'lote-tm001', name: 'TM-001', parents: [FOTO_ROOT_ID] },
      { id: 'item-574', name: '574', parents: ['lote-tm001'] },
    ]);
    await getFotosintesisItemFolderId(drive, SHARED_DRIVE_ID, '574');
    const listsAfterFirst = calls.list;
    await expect(
      getFotosintesisItemFolderId(drive, SHARED_DRIVE_ID, '574'),
    ).resolves.toBe('item-574');
    expect(calls.list).toBe(listsAfterFirst);
  });
});
