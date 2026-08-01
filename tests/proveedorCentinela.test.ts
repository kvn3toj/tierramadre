/**
 * El proveedor centinela de las agrupaciones reconstruidas.
 *
 * Los 28 lotes que la migración crea no traen proveedor, y ponerles uno real le
 * atribuiría piedras ajenas a alguien que nunca las vendió — un error invisible
 * una vez guardado. En vez de inventarlo, todos apuntan a UNA fila centinela que
 * se ve en la ficha del lote (para que se sepa que falta el dato) pero no en los
 * pickers ni en los reportes de proveedores (para que nadie la elija ni la sume).
 */
import { describe, it, expect } from 'vitest';
import {
  NOMBRE_PROVEEDOR_CENTINELA,
  esProveedorCentinela,
  filtrarCentinelas,
} from '../convex/_lib/proveedorCentinela';

const REAL = { nombreORazonSocial: 'Minas del Chivor' };
const CENTINELA = {
  nombreORazonSocial: NOMBRE_PROVEEDOR_CENTINELA,
  centinela: true,
};

describe('el proveedor centinela', () => {
  it('el nombre dice, en la propia celda, que el dato falta', () => {
    // El nombre viaja al espejo y a la ficha del lote. Uno neutro («Sin
    // proveedor») se lee como un proveedor llamado así; este se lee como lo que
    // es: una fila que hay que reemplazar.
    expect(NOMBRE_PROVEEDOR_CENTINELA).toContain('RECONSTRUIDO');
    expect(NOMBRE_PROVEEDOR_CENTINELA).toContain('sin dato de compra');
  });

  it('se reconoce por la bandera, no por el nombre', () => {
    // Si la marca fuera el nombre, renombrar la fila a mano en la hoja la
    // convertiría en un proveedor normal y volvería a aparecer en los pickers.
    expect(esProveedorCentinela(CENTINELA)).toBe(true);
    expect(esProveedorCentinela(REAL)).toBe(false);
    expect(
      esProveedorCentinela({ nombreORazonSocial: NOMBRE_PROVEEDOR_CENTINELA }),
    ).toBe(false);
  });

  it('sale de los pickers y de los reportes de proveedores', () => {
    expect(filtrarCentinelas([REAL, CENTINELA])).toEqual([REAL]);
  });

  it('una lista sin centinelas pasa entera', () => {
    expect(filtrarCentinelas([REAL])).toEqual([REAL]);
  });
});
