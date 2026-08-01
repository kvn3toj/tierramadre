/**
 * La cola del espejo: backoff, tope y dead-letter visible.
 *
 * Antes, `_marcarError` dejaba la fila en `pendiente` para siempre y sin espera.
 * Con `.take(limite)` en orden de creación, 25 filas que fallaran de forma
 * permanente —una pestaña renombrada, un rango inválido— consumían el cupo
 * entero del drenaje y **ninguna fila nueva llegaba nunca a la hoja**. La cola
 * quedaba viva y muerta a la vez, sin nada que lo dijera.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_INTENTOS, esperaTrasFallo } from '../convex/espejo';

const fuente = readFileSync(
  join(__dirname, '..', 'convex', 'espejo.ts'),
  'utf8',
);

describe('backoff exponencial', () => {
  it('crece con cada intento', () => {
    expect(esperaTrasFallo(1)).toBeLessThan(esperaTrasFallo(2));
    expect(esperaTrasFallo(2)).toBeLessThan(esperaTrasFallo(3));
  });

  it('el primer reintento es casi inmediato', () => {
    // Un fallo transitorio de red no debe costar minutos.
    expect(esperaTrasFallo(1)).toBeLessThanOrEqual(2_000);
  });

  it('tiene techo de una hora: no crece sin límite', () => {
    expect(esperaTrasFallo(50)).toBe(60 * 60 * 1_000);
  });
});

describe('tope de intentos y dead-letter', () => {
  it('el tope es explícito y modesto', () => {
    expect(MAX_INTENTOS).toBe(5);
  });

  it('al agotar intentos la fila se APARTA, no se borra', () => {
    // Borrarla sería perder el dato; dejarla pendiente sería bloquear la cola.
    // Apartarla la saca del camino y la deja contable.
    expect(fuente).toMatch(/estado: 'apartada'/);
    expect(fuente).not.toMatch(/ctx\.db\.delete\(id\)/);
  });

  it('lo apartado se puede LISTAR — un tope silencioso no sirve', () => {
    // «Se dejó de intentar» tiene que ser visible, o se lee como
    // «se sincronizó».
    expect(fuente).toMatch(/export const apartadas = internalQuery/);
  });

  it('el drenaje no toma filas que están esperando su backoff', () => {
    expect(fuente).toMatch(/proximoIntentoEn \?\? 0\) <= ahora/);
  });
});

describe('el espejo direcciona por cabecera, no por columna A', () => {
  it('busca la columna del id en la cabecera real', () => {
    // El Léeme promete que reordenar columnas es seguro. Leyendo `A2:A` esa
    // promesa era falsa: movida la columna, `indexOf` no encontraba nada y cada
    // drenaje hacía append, duplicando el lote una vez por mutación.
    expect(fuente).toMatch(/filaCabecera\.indexOf\(cabeceras\[0\]\)/);
    expect(fuente).not.toMatch(/!A2:A`/);
  });

  it('el append lo resuelve Google, no un contador local', () => {
    // `cuerpo.length + 2` es el mismo `rowIndex = maxRow + 1` que el riel viejo
    // tuvo que reparar.
    expect(fuente).toMatch(/agregarFila\(/);
    expect(fuente).not.toMatch(/columnaIds\.length \+ 2/);
  });

  it('una cabecera faltante se reporta en vez de perderse en silencio', () => {
    expect(fuente).toMatch(/cabecerasFaltantes\.length/);
  });
});

describe('ids de movimiento únicos', () => {
  const mov = readFileSync(
    join(__dirname, '..', 'convex', 'movimientos.ts'),
    'utf8',
  );

  it('el id sale de una secuencia, no de Date.now()', () => {
    // Dos registros en el mismo milisegundo daban `MOV-x` idéntico. Como el
    // espejo hace upsert por id, uno de los dos movimientos desaparecía de la
    // hoja aunque existiera en Convex.
    expect(mov).toMatch(/allocateNext\(ctx, 'movimientos'\)/);
    expect(mov).not.toMatch(/movimientoId = `MOV-\$\{ts\}`/);
  });

  it('acepta clientToken y hace replay como los demás create', () => {
    expect(mov).toMatch(/clientToken: v\.optional\(v\.string\(\)\)/);
    expect(mov).toMatch(/commitTokens/);
  });

  it('lotsV4.create también', () => {
    const lotes = readFileSync(
      join(__dirname, '..', 'convex', 'lotsV4.ts'),
      'utf8',
    );
    expect(lotes).toMatch(/clientToken: v\.optional\(v\.string\(\)\)/);
    expect(lotes).toMatch(/commitTokens/);
  });
});

describe('no se cuenta el inventario cuando el tipo no recalcula', () => {
  const mov = readFileSync(
    join(__dirname, '..', 'convex', 'movimientos.ts'),
    'utf8',
  );

  it('consignación y devolución se saltan los barridos', () => {
    // Eran dos barridos de tres tablas garantizadamente inútiles: el planner
    // devuelve `recalcula:false` por TIPO antes de mirar los conteos.
    expect(mov).toMatch(/recalculaPorTipo/);
  });

  it('la config se lee perezosamente', () => {
    // Leerla siempre impedía registrar un backfill con fecha anterior a la
    // primera regla de precios, aunque una devolución no toque ningún precio.
    const i = mov.indexOf('if (recalculaPorTipo) {');
    expect(i).toBeGreaterThan(-1);
    expect(mov.indexOf('configVigente(ctx, args.fecha)')).toBeGreaterThan(i);
  });
});
