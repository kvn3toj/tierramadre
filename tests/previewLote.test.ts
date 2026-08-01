/**
 * El preview del motor que W1 muestra ANTES de guardar.
 *
 * Es la pieza que cambia la naturaleza de la captura: hoy el operador escribe un
 * costo y se entera del precio después, en otra hoja, calculado por otra persona.
 * Con el preview, la consecuencia económica de lo que está capturando se ve
 * mientras lo captura — incluida la advertencia de que el gasto fijo pesa más
 * que la pieza, que es la señal temprana de un lote que no debería comprarse.
 */
import { describe, it, expect } from 'vitest';
import { CONFIG_PRECIOS_2026_07 } from '../convex/_lib/motorPrecios';
import { construirPreviewLote } from '../convex/_lib/previewLote';

const CFG = CONFIG_PRECIOS_2026_07;
const FIJO = 442_787;
const EN_REMATE = '2026-08-15';
const YA_OBJETIVO = '2026-09-01';

describe('construirPreviewLote — los números del lote 10, en vivo', () => {
  const preview = construirPreviewLote({
    costoCompraCOP: 931_931,
    costosVariablesCOP: 9_091,
    categoriaFiscal: 'gema',
    costoFijoUnitarioCOP: FIJO,
    fecha: YA_OBJETIVO,
    config: CFG,
  });

  it('muestra K, el equilibrio real y el objetivo', () => {
    expect(preview.K).toBe(1_383_809);
    expect(preview.pisoCOP).toBe(1_537_566);
    expect(preview.precioCOP).toBe(2_306_348);
  });

  it('el multiplicador es informativo y se mide contra el costo', () => {
    expect(preview.multiplicador).toBeCloseTo(2.47, 2);
  });

  it('dice qué regla lo produjo', () => {
    expect(preview.regla).toBe('objetivo');
    expect(preview.enRemate).toBe(false);
  });
});

describe('la advertencia del remate', () => {
  it('marca REMATE vigente dentro de la ventana', () => {
    const p = construirPreviewLote({
      costoCompraCOP: 931_931,
      categoriaFiscal: 'gema',
      costoFijoUnitarioCOP: FIJO,
      fecha: EN_REMATE,
      config: CFG,
    });
    expect(p.enRemate).toBe(true);
    expect(p.regla).toBe('remate');
    expect(p.advertencias.some((a) => /remate/i.test(a.texto))).toBe(true);
  });

  it('la advertencia de remate dice hasta cuándo rige', () => {
    const p = construirPreviewLote({
      costoCompraCOP: 931_931,
      categoriaFiscal: 'gema',
      costoFijoUnitarioCOP: FIJO,
      fecha: EN_REMATE,
      config: CFG,
    });
    const remate = p.advertencias.find((a) => a.codigo === 'REMATE_VIGENTE');
    expect(remate?.texto).toContain('2026-08-31');
  });

  it('fuera de la ventana no la muestra', () => {
    const p = construirPreviewLote({
      costoCompraCOP: 931_931,
      categoriaFiscal: 'gema',
      costoFijoUnitarioCOP: FIJO,
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    expect(p.advertencias.some((a) => a.codigo === 'REMATE_VIGENTE')).toBe(
      false,
    );
  });
});

describe('la advertencia de que el fijo pesa más que la pieza', () => {
  it('avisa cuando el gasto fijo supera el costo de compra', () => {
    // Un lote de $300.000 absorbiendo $442.787 de fijo: más de la mitad del
    // precio es gasto de estructura, no mercancía. Comprarlo es una decisión,
    // pero tiene que ser una decisión, no una sorpresa.
    const p = construirPreviewLote({
      costoCompraCOP: 300_000,
      categoriaFiscal: 'gema',
      costoFijoUnitarioCOP: FIJO,
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    const aviso = p.advertencias.find((a) => a.codigo === 'FIJO_PESA_MAS');
    expect(aviso).toBeDefined();
    expect(aviso?.nivel).toBe('alerta');
  });

  it('no avisa cuando la pieza pesa más que el fijo', () => {
    const p = construirPreviewLote({
      costoCompraCOP: 931_931,
      categoriaFiscal: 'gema',
      costoFijoUnitarioCOP: FIJO,
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    expect(p.advertencias.some((a) => a.codigo === 'FIJO_PESA_MAS')).toBe(
      false,
    );
  });

  it('reporta qué porcentaje del K es puro gasto fijo', () => {
    const p = construirPreviewLote({
      costoCompraCOP: 300_000,
      categoriaFiscal: 'gema',
      costoFijoUnitarioCOP: FIJO,
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    // 442.787 / 742.787 = 59,6%
    expect(p.pesoDelFijoPct).toBeCloseTo(59.6, 1);
  });
});

describe('el precio por unidad — lo que de verdad se va a cotizar', () => {
  it('reparte el precio del lote entre las unidades declaradas', () => {
    const p = construirPreviewLote({
      costoCompraCOP: 931_931,
      costosVariablesCOP: 9_091,
      categoriaFiscal: 'gema',
      costoFijoUnitarioCOP: FIJO,
      fecha: YA_OBJETIVO,
      config: CFG,
      unidadesDeclaradas: 4,
    });
    expect(p.precioPorUnidadCOP).toBe(Math.round(2_306_348 / 4));
  });

  it('sin unidades declaradas no inventa un precio por unidad', () => {
    // Es una referencia de encuadre, no un precio: el precio real de cada pieza
    // sale de su costo unitario capturado en W2, jamás de dividir el lote.
    const p = construirPreviewLote({
      costoCompraCOP: 931_931,
      categoriaFiscal: 'gema',
      costoFijoUnitarioCOP: FIJO,
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    expect(p.precioPorUnidadCOP).toBeUndefined();
  });

  it('avisa que el reparto es referencial, no el precio de cada pieza', () => {
    const p = construirPreviewLote({
      costoCompraCOP: 931_931,
      categoriaFiscal: 'gema',
      costoFijoUnitarioCOP: FIJO,
      fecha: YA_OBJETIVO,
      config: CFG,
      unidadesDeclaradas: 4,
    });
    expect(p.advertencias.some((a) => a.codigo === 'REPARTO_REFERENCIAL')).toBe(
      true,
    );
  });
});

describe('el preview de un lote mixto', () => {
  it('no cotiza: pide resolver la categoría casilla por casilla', () => {
    const p = construirPreviewLote({
      costoCompraCOP: 931_931,
      categoriaFiscal: 'mixta',
      costoFijoUnitarioCOP: FIJO,
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    expect(p.cotizable).toBe(false);
    expect(p.precioCOP).toBeUndefined();
    expect(p.K).toBe(1_374_718); // K sí se puede: no depende del régimen
    expect(p.advertencias.some((a) => a.codigo === 'MIXTA_SIN_PRECIO')).toBe(
      true,
    );
  });

  it('un lote de una sola categoría sí es cotizable', () => {
    expect(
      construirPreviewLote({
        costoCompraCOP: 931_931,
        categoriaFiscal: 'joya',
        costoFijoUnitarioCOP: FIJO,
        fecha: YA_OBJETIVO,
        config: CFG,
      }).cotizable,
    ).toBe(true);
  });
});

describe('la comparación entre regímenes — por qué la categoría importa', () => {
  it('muestra lo que costaría con el divisor equivocado', () => {
    // No es adorno: es el número que hace obvio por qué el campo es obligatorio.
    const p = construirPreviewLote({
      costoCompraCOP: 893_996,
      costosVariablesCOP: 9_091,
      categoriaFiscal: 'joya',
      costoFijoUnitarioCOP: FIJO,
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    expect(p.precioCOP).toBe(3_282_620);
    expect(p.precioSiFueraLaOtraCategoriaCOP).toBe(2_243_123);
  });
});
