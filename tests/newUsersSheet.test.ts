/**
 * Hoja `new-users` (SOT v3): padrón de clientes autorregistrados con Google.
 * Upsert por email; el `estado` funciona como en Asesores — sólo "activo"
 * concede acceso, así que bloquear a alguien es escribir cualquier otra cosa.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  findClientRow,
  upsertClient,
  NEW_USERS_HEADERS,
  NEW_USERS_SHEET,
} from '../api/_lib/newUsers';

function fakeSheets(rows: string[][]) {
  const state = { rows: rows.map((r) => [...r]) };
  const sheets = {
    spreadsheets: {
      get: vi.fn(async () => ({
        data: { sheets: [{ properties: { title: NEW_USERS_SHEET } }] },
      })),
      batchUpdate: vi.fn(async () => ({})),
      values: {
        get: vi.fn(async () => ({ data: { values: state.rows } })),
        update: vi.fn(async ({ range, requestBody }: any) => {
          const m = /!A(\d+):/.exec(range);
          state.rows[Number(m![1]) - 1] = requestBody.values[0];
          return {};
        }),
        append: vi.fn(async ({ requestBody }: any) => {
          state.rows.push(requestBody.values[0]);
          return {};
        }),
      },
    },
  };
  return { sheets, state };
}

const HEADER = [...NEW_USERS_HEADERS];

describe('findClientRow', () => {
  it('encuentra por email, insensible a mayúsculas, sólo si está activo', async () => {
    const { sheets } = fakeSheets([
      HEADER,
      ['Ana@Gmail.com', 'Ana', '', '2026-09-09', '2026-09-09', '1', 'es', 'activo'],
      ['bob@gmail.com', 'Bob', '', '2026-09-09', '2026-09-09', '1', 'es', 'bloqueado'],
    ]);
    const ana = await findClientRow(sheets as never, 'ana@gmail.com');
    expect(ana?.name).toBe('Ana');
    expect(ana?.accessLevel).toBe('cliente');
    expect(await findClientRow(sheets as never, 'bob@gmail.com')).toBeNull();
    expect(await findClientRow(sheets as never, 'nadie@gmail.com')).toBeNull();
  });
});

describe('findClientRow con la lista de pestañas', () => {
  it('sin pestaña new-users no lee nada y devuelve null', async () => {
    const { sheets } = fakeSheets([HEADER, ['ana@gmail.com', 'Ana', '', '', '', '1', 'es', 'activo']]);
    const r = await findClientRow(sheets as never, 'ana@gmail.com', ['Inventario', 'Asesores']);
    expect(r).toBeNull();
    expect(sheets.spreadsheets.values.get).not.toHaveBeenCalled();
    expect(sheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
  });

  it('la lectura nunca crea la pestaña (ensureSheet sólo en la escritura)', async () => {
    const { sheets } = fakeSheets([HEADER]);
    await findClientRow(sheets as never, 'x@gmail.com');
    expect(sheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    expect(sheets.spreadsheets.values.update).not.toHaveBeenCalled();
  });

  it('duplicados: si CUALQUIER copia está bloqueada, no entra', async () => {
    const { sheets } = fakeSheets([
      HEADER,
      ['ana@gmail.com', 'Ana', '', '', '', '1', 'es', 'activo'],
      ['ana@gmail.com', 'Ana', '', '', '', '1', 'es', 'bloqueado'],
    ]);
    expect(await findClientRow(sheets as never, 'ana@gmail.com')).toBeNull();
  });
});

describe('upsertClient', () => {
  it('agrega una fila nueva con estado activo, por rango CERRADO (nunca append abierto)', async () => {
    const { sheets, state } = fakeSheets([HEADER]);
    const user = await upsertClient(sheets as never, {
      email: 'ana@gmail.com',
      name: 'Ana',
      picture: 'https://p/x.jpg',
      locale: 'es',
    });
    expect(user?.accessLevel).toBe('cliente');
    expect(state.rows).toHaveLength(2);
    expect(state.rows[1][0]).toBe('ana@gmail.com');
    expect(state.rows[1][5]).toBe('1');
    expect(state.rows[1][7]).toBe('activo');
    expect(sheets.spreadsheets.values.append).not.toHaveBeenCalled();
    const call = sheets.spreadsheets.values.update.mock.calls[0][0] as { range: string };
    expect(call.range).toBe("'new-users'!A2:H2");
  });

  it('pestaña vaciada a mano: repone la cabecera en A1:H1 antes de escribir', async () => {
    const { sheets, state } = fakeSheets([]);
    await upsertClient(sheets as never, { email: 'ana@gmail.com', name: 'Ana', picture: '', locale: 'es' });
    expect(state.rows[0]).toEqual([...NEW_USERS_HEADERS]);
    expect(state.rows[1][0]).toBe('ana@gmail.com');
  });

  it('en una fila existente actualiza último acceso y cuenta, sin tocar el estado', async () => {
    const { sheets, state } = fakeSheets([
      HEADER,
      ['ana@gmail.com', 'Ana', '', '2026-09-01', '2026-09-01', '3', 'es', 'activo'],
    ]);
    const user = await upsertClient(sheets as never, {
      email: 'ANA@gmail.com',
      name: 'Ana María',
      picture: '',
      locale: 'en',
    });
    expect(user).not.toBeNull();
    expect(state.rows).toHaveLength(2);
    expect(state.rows[1][3]).toBe('2026-09-01'); // primerRegistro intacto
    expect(state.rows[1][5]).toBe('4');
    expect(state.rows[1][7]).toBe('activo');
    expect(sheets.spreadsheets.values.update).toHaveBeenCalledTimes(1);
  });

  it('una fila bloqueada se actualiza pero NO concede acceso', async () => {
    const { sheets } = fakeSheets([
      HEADER,
      ['bob@gmail.com', 'Bob', '', '2026-09-01', '2026-09-01', '1', 'es', 'bloqueado'],
    ]);
    const user = await upsertClient(sheets as never, {
      email: 'bob@gmail.com',
      name: 'Bob',
      picture: '',
      locale: 'es',
    });
    expect(user).toBeNull();
  });
});
