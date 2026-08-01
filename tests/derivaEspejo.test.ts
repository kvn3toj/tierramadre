/**
 * Detección de deriva: qué se editó a mano en el espejo.
 *
 * La regla de v4 es que la hoja nunca es origen. Pero la hoja se puede editar,
 * y alguien lo va a hacer. La respuesta correcta no es impedirlo (no se puede) ni
 * absorberlo (eso reintroduce el pull), sino **reportarlo**: decir qué celda se
 * tocó y con qué valor, para que un humano decida.
 */
import { describe, it, expect } from 'vitest';
import { checksumFila, detectarDeriva } from '../convex/_lib/derivaEspejo';

const CABECERAS = ['loteId', 'costoTotalCOP', 'estado'];

describe('checksumFila — estable e independiente del orden de las claves', () => {
  it('la misma fila da el mismo checksum', () => {
    const a = checksumFila({ loteId: 'B-002', estado: 'abierto' });
    const b = checksumFila({ estado: 'abierto', loteId: 'B-002' });
    expect(a).toBe(b);
  });

  it('un valor distinto cambia el checksum', () => {
    expect(checksumFila({ loteId: 'B-002' })).not.toBe(
      checksumFila({ loteId: 'B-003' }),
    );
  });
});

describe('detectarDeriva', () => {
  const convex = [
    { loteId: 'B-002', costoTotalCOP: '941022', estado: 'abierto' },
    { loteId: 'B-003', costoTotalCOP: '903087', estado: 'publicado' },
  ];

  it('sin ediciones no reporta nada', () => {
    const r = detectarDeriva({
      cabeceras: CABECERAS,
      idCabecera: 'loteId',
      filasEspejo: convex.map((f) => ({ ...f })),
      filasConvex: convex,
    });
    expect(r.derivas).toEqual([]);
    expect(r.sinDeriva).toBe(2);
  });

  it('reporta la celda editada, con los dos valores', () => {
    const espejo = convex.map((f) => ({ ...f }));
    espejo[0].costoTotalCOP = '999999';

    const r = detectarDeriva({
      cabeceras: CABECERAS,
      idCabecera: 'loteId',
      filasEspejo: espejo,
      filasConvex: convex,
    });

    expect(r.derivas).toHaveLength(1);
    expect(r.derivas[0]).toMatchObject({
      id: 'B-002',
      campo: 'costoTotalCOP',
      enEspejo: '999999',
      enConvex: '941022',
    });
  });

  it('reporta varias celdas de la misma fila por separado', () => {
    const espejo = convex.map((f) => ({ ...f }));
    espejo[1].estado = 'cancelado';
    espejo[1].costoTotalCOP = '1';

    const r = detectarDeriva({
      cabeceras: CABECERAS,
      idCabecera: 'loteId',
      filasEspejo: espejo,
      filasConvex: convex,
    });
    expect(r.derivas.map((d) => d.campo).sort()).toEqual([
      'costoTotalCOP',
      'estado',
    ]);
  });

  it('una fila que existe en el espejo y no en Convex es deriva', () => {
    // Alguien agregó una fila a mano. No se borra sola: se reporta.
    const r = detectarDeriva({
      cabeceras: CABECERAS,
      idCabecera: 'loteId',
      filasEspejo: [
        ...convex,
        { loteId: 'B-999', costoTotalCOP: '5', estado: 'abierto' },
      ],
      filasConvex: convex,
    });
    expect(r.soloEnEspejo).toEqual(['B-999']);
  });

  it('una fila que Convex tiene y el espejo no, está pendiente de empuje', () => {
    const r = detectarDeriva({
      cabeceras: CABECERAS,
      idCabecera: 'loteId',
      filasEspejo: [convex[0]],
      filasConvex: convex,
    });
    expect(r.soloEnConvex).toEqual(['B-003']);
  });

  it('ignora columnas que el espejo no gobierna', () => {
    // Una columna de notas que agregó el equipo no es deriva: el espejo nunca
    // dijo nada sobre ella.
    const espejo = convex.map((f) => ({ ...f, 'notas del equipo': 'ojo acá' }));
    const r = detectarDeriva({
      cabeceras: CABECERAS,
      idCabecera: 'loteId',
      filasEspejo: espejo,
      filasConvex: convex,
    });
    expect(r.derivas).toEqual([]);
  });

  it('NUNCA propone un valor corregido — solo reporta', () => {
    const espejo = convex.map((f) => ({ ...f }));
    espejo[0].estado = 'vendido a mano';
    const r = detectarDeriva({
      cabeceras: CABECERAS,
      idCabecera: 'loteId',
      filasEspejo: espejo,
      filasConvex: convex,
    });
    expect(Object.keys(r.derivas[0])).not.toContain('corregir');
    expect(Object.keys(r)).not.toContain('parche');
  });
});
