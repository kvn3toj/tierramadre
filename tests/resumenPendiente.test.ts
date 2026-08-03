import { describe, it, expect } from 'vitest';
import { aResumenPendiente } from '../convex/_lib/resumenPendiente';

describe('aResumenPendiente', () => {
  it('mapea los campos seguros y calcula horas esperando', () => {
    const ahora = 1_700_000_000_000;
    const mov = {
      movimientoId: 'MOV-000001',
      tipo: 'VENTA',
      itemIds: ['515'],
      registradoPor: 'telegram:42',
      ts: ahora - 5 * 3600 * 1000,
      venta: {
        cliente: 'Cliente',
        precioVentaRealCOP: 500000,
        formaPago: 'transferencia',
        transferencia: {
          numeroCuenta: '999888777',
          titular: 'Cliente',
          banco: 'Bancolombia',
          numeroTransaccion: 'T1',
        },
      },
    };
    const resumen = aResumenPendiente(mov, ahora);
    expect(resumen.movimientoId).toBe('MOV-000001');
    expect(resumen.horasEsperando).toBe(5);
    expect(JSON.stringify(resumen)).not.toContain('999888777');
    expect(JSON.stringify(resumen)).not.toContain('Bancolombia');
    expect(JSON.stringify(resumen)).not.toContain('venta');
  });
});
