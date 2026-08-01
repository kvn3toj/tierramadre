/**
 * Los defectos que encontró la revisión adversarial de la rama, fijados para
 * que no vuelvan.
 *
 * Cada bloque nombra el escenario concreto que rompía, porque un test que solo
 * dice «no regresión» no le enseña nada a quien lo lea dentro de seis meses.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { conciliarCostos, TOLERANCIA_TOPE_COP } from '../convex/_lib/casillaW2';
import {
  configVigenteEn,
  pisoReal,
  CONFIG_PRECIOS_2026_07,
} from '../convex/_lib/motorPrecios';
import {
  puedeAplicarseSobre,
  type TipoMovimiento,
} from '../convex/_lib/movimientoW3';
import { siguienteItemIdNumerico } from '../convex/_lib/casillasV4';

const raiz = join(__dirname, '..');
const leer = (rel: string) => readFileSync(join(raiz, rel), 'utf8');

describe('VENDIDA es terminal para cualquier movimiento', () => {
  it('una DEVOLUCION no puede des-vender una pieza', () => {
    // Antes: registrar una devolución sobre una pieza VENDIDA la devolvía a
    // DISPONIBLE. La venta quedaba revertida sin movimiento compensatorio, con
    // su precio y su comisión intactos, y el lote volvía a contar como activo
    // sin disparar recálculo (porque DEVOLUCION no mueve el divisor por tipo).
    const r = puedeAplicarseSobre('DEVOLUCION', {
      itemId: '525',
      estadoCasilla: 'VENDIDA',
    });
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/terminal/i);
  });

  it('ningún tipo la saca de VENDIDA', () => {
    for (const tipo of [
      'VENTA',
      'CONSIGNACION',
      'DEVOLUCION',
      'ASESOR',
    ] as TipoMovimiento[]) {
      expect(
        puedeAplicarseSobre(tipo, { itemId: '1', estadoCasilla: 'VENDIDA' }).ok,
        tipo,
      ).toBe(false);
    }
  });

  it('sobre cualquier otro estado sí se aplica', () => {
    for (const estado of ['DISPONIBLE', 'EN_CONSIGNACION', 'ASESOR']) {
      expect(
        puedeAplicarseSobre('DEVOLUCION', {
          itemId: '1',
          estadoCasilla: estado,
        }).ok,
        estado,
      ).toBe(true);
    }
  });
});

describe('el allocator de itemId mira los dos rieles', () => {
  it('el riel viejo también escanea lotItems', () => {
    // Escenario determinista, no una carrera: productInventory llega a 500, un
    // lote v4 crea las casillas 501-510 en lotItems (sin fila de inventario), y
    // la siguiente captura vieja pedía 501 otra vez. Como los QR impresos
    // referencian #NNN, eran dos piedras con la misma etiqueta física.
    const fuente = leer('convex/lotItems.ts');
    const bloque = fuente.slice(
      fuente.indexOf('async function nextItemId'),
      fuente.indexOf('async function nextItemId') + 1200,
    );
    expect(bloque).toMatch(/query\('lotItems'\)|query\("lotItems"\)/);
  });

  it('el lado v4 sigue mirando los dos', () => {
    expect(siguienteItemIdNumerico(['500'], ['512'])).toBe(513);
  });
});

describe('el riel viejo no toca lotes v4', () => {
  const fuente = leer('convex/lots.ts');

  it('define la guarda', () => {
    expect(fuente).toMatch(/function exigeLoteLegacy/);
  });

  it('la aplica en cancel, close, reopen, update y setLoteDisplay', () => {
    // `_cancel` era el peor: borraba las filas de lotItems del lote, que en v4
    // SON las casillas — con el costo capturado y la clasificación, sin copia
    // en productInventory que las respalde.
    const llamadas = fuente.match(/exigeLoteLegacy\(/g) ?? [];
    // 1 definición + 5 usos.
    expect(llamadas.length).toBeGreaterThanOrEqual(6);
    for (const mut of [
      '_cancel',
      '_close',
      '_reopen',
      '_update',
      '_setLoteDisplay',
    ]) {
      const i = fuente.indexOf(`export const ${mut} = internalMutation`);
      const siguiente = fuente.indexOf('export const ', i + 10);
      expect(
        fuente.slice(i, siguiente === -1 ? undefined : siguiente),
        mut,
      ).toMatch(/exigeLoteLegacy\(/);
    }
  });
});

describe('la tolerancia de conciliación tiene techo absoluto', () => {
  it('medio millón de descuadre en un lote de $100M NO es redondeo', () => {
    // Con solo el 0,5% relativo, `cuadra` daba true y el lote se publicaba sin
    // señal — en el módulo que existe para no esconder descuadres.
    const r = conciliarCostos(100_000_000, [100_499_000]);
    expect(r.cuadra).toBe(false);
  });

  it('el techo es explícito y modesto', () => {
    expect(TOLERANCIA_TOPE_COP).toBe(20_000);
  });

  it('los casos reales de redondeo siguen cuadrando', () => {
    expect(conciliarCostos(1_057_063, [1_057_693]).cuadra).toBe(true); // lote 52
    expect(conciliarCostos(826_846, [823_846]).cuadra).toBe(true); // lote 50
  });

  it('un lote sin casillas no inventa un descuadre de su tamaño', () => {
    const r = conciliarCostos(5_000_000, []);
    expect(r.diferencia).toBe(0);
    expect(r.aviso).toMatch(/todav[ií]a no tiene casillas/i);
  });
});

describe('empate de vigenteDesde: gana la corrección, no la vieja', () => {
  it('ante dos reglas de la misma fecha manda la última insertada', () => {
    const vieja = { ...CONFIG_PRECIOS_2026_07, gastosFijosMensualesCOP: 1 };
    const correccion = {
      ...CONFIG_PRECIOS_2026_07,
      gastosFijosMensualesCOP: 999,
    };
    // El orden del array es el de creación en Convex.
    expect(
      configVigenteEn([vieja, correccion], '2026-08-15')
        .gastosFijosMensualesCOP,
    ).toBe(999);
  });
});

describe('pisoReal se protege como divisorObjetivo', () => {
  it('una config con porcentajes en enteros lanza en vez de dar un piso negativo', () => {
    // `comisionPct: 10` queriendo decir 10% (y no 0,10) es el dedazo clásico de
    // una tabla de parámetros. Antes devolvía un equilibrio real NEGATIVO y la
    // tarjeta lo mostraba sin quejarse.
    const rota = { ...CONFIG_PRECIOS_2026_07, comisionPct: 10 };
    expect(() => pisoReal(1_345_874, 'gema', rota)).toThrow(
      /fracci[oó]n|precio entero/i,
    );
  });

  it('con la config sana sigue dando el número de la auditoría', () => {
    expect(pisoReal(1_383_809, 'gema', CONFIG_PRECIOS_2026_07)).toBe(1_537_566);
  });
});

describe('el fijo unitario se calcula, no se sirve de caché', () => {
  const fuente = leer('convex/precios.ts');

  it('costoFijoUnitarioVigente no lee recalculos', () => {
    // Leerlo hacía que (a) una config nueva no cambiara ningún precio, (b) un
    // evento con fecha retroactiva repreciara el presente con la config de otro
    // período, y (c) las ventas del riel viejo movieran el divisor real sin que
    // el número servido se enterara.
    const i = fuente.indexOf('export async function costoFijoUnitarioVigente');
    const bloque = fuente.slice(i, fuente.indexOf('\n}', i));
    expect(bloque).not.toMatch(/recalculos/);
    expect(bloque).toMatch(/contarLotesActivosDb/);
  });
});
