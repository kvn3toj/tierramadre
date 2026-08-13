import { describe, it, expect, vi } from 'vitest';
// @ts-expect-error — `api/media-upload.js` es JS sin tipos; se importa por las dos ayudantes.
import {
  uploadFileToDrive,
  getOrCreateFolderOAuth,
} from '../api/media-upload.js';

/**
 * `/api/media-upload` marcaba TODO lo que subía como `{role:'reader', type:'anyone'}` — archivo y
 * carpeta, sin condición. Eso está bien para las fotos de piedras que suben los cinco llamadores
 * del navegador, y NO está bien para la factura de compra de `/lote`, que lleva costos de
 * proveedor (el schema los marca «SENSIBLES»).
 *
 * Lo que fija este archivo es el default: el permiso público se sigue aplicando salvo que el
 * llamador pida lo contrario. Un cambio que invierta eso rompe la captura web en silencio.
 */

function fakeDrive(overrides: Record<string, unknown> = {}) {
  const permissionsCreate = vi.fn(async () => ({}));
  return {
    permissionsCreate,
    drive: {
      permissions: { create: permissionsCreate },
      files: {
        create: vi.fn(async () => ({ data: { id: 'new-id' } })),
        list: vi.fn(async () => ({ data: { files: [] } })),
        get: vi.fn(async () => ({ data: { id: 'new-id' } })),
        ...(overrides.files ?? {}),
      },
    },
  };
}

function fakeFile() {
  return {
    originalFilename: 'factura.jpg',
    newFilename: 'factura.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    // `uploadFileToDrive` hace `fs.createReadStream(file.filepath)`; con un path
    // inexistente el stream falla recién al leerse, y el mock de `files.create`
    // nunca lo consume — alcanza para ejercer la rama de permisos.
    filepath: '/dev/null',
  };
}

describe('media-upload — el permiso público es opt-out, no incondicional', () => {
  it('por defecto marca el archivo como legible por cualquiera', async () => {
    const { drive, permissionsCreate } = fakeDrive();
    await uploadFileToDrive(drive, 'folder-1', fakeFile(), 0, null);
    expect(permissionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: { role: 'reader', type: 'anyone' },
      }),
    );
  });

  it('con makePublic=false NO pide ningún permiso para el archivo', async () => {
    const { drive, permissionsCreate } = fakeDrive();
    await uploadFileToDrive(drive, 'folder-1', fakeFile(), 0, null, false);
    expect(permissionsCreate).not.toHaveBeenCalled();
  });

  it('por defecto marca la carpeta nueva como legible por cualquiera', async () => {
    const { drive, permissionsCreate } = fakeDrive();
    await getOrCreateFolderOAuth(drive, 'parent-1', '_facturas');
    expect(permissionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: { role: 'reader', type: 'anyone' },
      }),
    );
  });

  it('con makePublic=false NO pide ningún permiso para la carpeta', async () => {
    // Importa tanto como el caso del archivo: Drive HEREDA los permisos del padre, así que un
    // archivo privado dentro de una carpeta pública sigue siendo legible por el link.
    const { drive, permissionsCreate } = fakeDrive();
    await getOrCreateFolderOAuth(drive, 'parent-1', '_facturas', false);
    expect(permissionsCreate).not.toHaveBeenCalled();
  });

  it('reutiliza una carpeta existente sin tocarle los permisos', async () => {
    const { drive, permissionsCreate } = fakeDrive({
      files: {
        list: vi.fn(async () => ({
          data: { files: [{ id: 'ya-existe', name: '_facturas' }] },
        })),
      },
    });
    const id = await getOrCreateFolderOAuth(
      drive,
      'parent-1',
      '_facturas',
      false,
    );
    expect(id).toBe('ya-existe');
    expect(permissionsCreate).not.toHaveBeenCalled();
  });
});
