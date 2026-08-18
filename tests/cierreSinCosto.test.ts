import { describe, it, expect } from 'vitest';
import {
  loteExigePreponderancia,
  errorCierrePreponderancia,
} from '../convex/_lib/cierreLote';

/**
 * BR-2 relajada para lotes sin costo (decisión de producto, 2026-08-18).
 *
 * La preponderancia existía para repartir el costo del lote entre sus ítems.
 * Desde el 2026-07-24 el costo está desacoplado (es sheet-owned y una edición
 * de preponderancia ya no deriva costoBaseCOP), y en un lote sin costo —el
 * patrón "Recuperado": C-070, C-074, C-090— no hay además nada que repartir.
 * Exigir 100% ahí era ceremonia pura, y era EXACTAMENTE lo que tenía a C-090
 * atascado en "abierto": 11 ítems en 0%, "Cerrar lote" muerto, y por tanto
 * ningún camino a publicar sus cards en el treasure browser.
 *
 * Lo que NO cambia: un lote CON costo sigue exigiendo la suma ≡ 100 ± 0.01.
 * Mientras el número siga en la captura, un lote costeado lo declara completo.
 */
describe('loteExigePreponderancia — la exigencia sigue al costo', () => {
  it('un lote con costo real exige preponderancia', () => {
    expect(loteExigePreponderancia({ costoTotalCOP: 941022 })).toBe(true);
  });

  it('costo 0 no exige — no hay nada que repartir (C-090)', () => {
    expect(loteExigePreponderancia({ costoTotalCOP: 0 })).toBe(false);
  });

  it('costo ausente tampoco exige', () => {
    expect(loteExigePreponderancia({})).toBe(false);
    expect(loteExigePreponderancia({ costoTotalCOP: undefined })).toBe(false);
  });
});

describe('errorCierrePreponderancia — el candado BR-2 del cierre', () => {
  const conCosto = { costoTotalCOP: 500000 };
  const sinCosto = { costoTotalCOP: 0 };

  it('con costo y suma 100 el cierre pasa', () => {
    expect(errorCierrePreponderancia(conCosto, 100)).toBeNull();
  });

  it('con costo, la tolerancia ± 0.01 se respeta', () => {
    // 100.01 exacto NO pasa: en float, |100.01 − 100| > 0.01 por un pelo.
    // Es el comportamiento del _close original — la extracción lo preserva.
    expect(errorCierrePreponderancia(conCosto, 100.005)).toBeNull();
    expect(errorCierrePreponderancia(conCosto, 99.995)).toBeNull();
  });

  it('con costo y suma incompleta el cierre se BLOQUEA con el mensaje de siempre', () => {
    const err = errorCierrePreponderancia(conCosto, 99);
    expect(err).toBe(
      'Preponderancia 99.00% ≠ 100%. Ajusta los ítems antes de cerrar.',
    );
  });

  it('sin costo y suma 0 el cierre pasa — el caso C-090 (11 ítems en 0%)', () => {
    expect(errorCierrePreponderancia(sinCosto, 0)).toBeNull();
  });

  it('sin costo la suma se ignora por completo, no solo el cero', () => {
    // Una suma parcial (alguien cargó 47% y abandonó) tampoco bloquea: sin
    // costo, el número no alimenta nada y ningún valor suyo es "incompleto".
    expect(errorCierrePreponderancia(sinCosto, 47)).toBeNull();
    expect(errorCierrePreponderancia({}, 47)).toBeNull();
  });
});
