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

describe('un lote sin costo capturado NO cotiza', () => {
  // El caso C-085 del SOT vivo: costo 0 y cotizando igual. Su precio salía de
  // dividir SOLO el gasto fijo, o sea que el objetivo era 100% estructura y 0%
  // mercancía — un número que parece un precio y no lo es. Dictamen de Kevin
  // (2026-08-01): el motor devuelve el aviso, nunca el precio.
  const sinCosto = {
    costoCompraCOP: 0,
    categoriaFiscal: 'gema' as const,
    costoFijoUnitarioCOP: FIJO,
    fecha: YA_OBJETIVO,
    config: CFG,
  };

  it('no devuelve precio', () => {
    const p = construirPreviewLote(sinCosto);
    expect(p.cotizable).toBe(false);
    expect(p.precioCOP).toBeUndefined();
    expect(p.pisoCOP).toBeUndefined();
  });

  it('lo dice con un aviso, en vez de reventar', () => {
    // Reventar dejaría al operador sin pantalla; devolver 0 sería peor todavía.
    const p = construirPreviewLote(sinCosto);
    const aviso = p.advertencias.find(
      (a) => a.codigo === 'SIN_COSTO_CAPTURADO',
    );
    expect(aviso).toBeDefined();
    expect(aviso?.nivel).toBe('alerta');
    expect(aviso?.texto).toMatch(/sin costo capturado/i);
  });

  it('tampoco cotiza con costo negativo o ausente', () => {
    for (const c of [-1, Number.NaN]) {
      expect(
        construirPreviewLote({ ...sinCosto, costoCompraCOP: c }).cotizable,
      ).toBe(false);
    }
  });

  it('con costo capturado vuelve a cotizar normal', () => {
    expect(
      construirPreviewLote({ ...sinCosto, costoCompraCOP: 931_931 }).cotizable,
    ).toBe(true);
  });
});

describe('el divisor de dev antes de la migración', () => {
  // Dictamen de Kevin (2026-08-01): dev no reproduce el divisor del SOT porque
  // le faltan lotes, y eso se cura con la migración de la Fase 2, no con un
  // pull. Mientras tanto el número se muestra ETIQUETADO: nadie cotiza desde
  // dev, pero nadie debe confundirse tampoco.
  const enDev = {
    costoCompraCOP: 931_931,
    categoriaFiscal: 'gema' as const,
    costoFijoUnitarioCOP: 509_876,
    fecha: YA_OBJETIVO,
    config: CFG,
  };

  it('avisa cuando dev tiene menos lotes activos que el SOT', () => {
    const p = construirPreviewLote({ ...enDev, lotesActivos: 66 });
    const aviso = p.advertencias.find(
      (a) => a.codigo === 'DIVISOR_PRE_MIGRACION',
    );
    expect(aviso).toBeDefined();
    expect(aviso?.nivel).toBe('alerta');
  });

  it('el aviso dice cuál es la cifra operativa de verdad', () => {
    const p = construirPreviewLote({ ...enDev, lotesActivos: 66 });
    const aviso = p.advertencias.find(
      (a) => a.codigo === 'DIVISOR_PRE_MIGRACION',
    );
    expect(aviso?.texto).toContain('382.407');
    expect(aviso?.texto).toContain('88');
    expect(aviso?.texto).toMatch(/pre-migración/i);
  });

  it('se retira solo cuando la migración cierra la brecha', () => {
    // La condición es el síntoma, no un flag que alguien tenga que acordarse de
    // apagar: con el inventario completo el aviso desaparece sin tocar código.
    for (const lotes of [88, 91]) {
      expect(
        construirPreviewLote({
          ...enDev,
          lotesActivos: lotes,
        }).advertencias.some((a) => a.codigo === 'DIVISOR_PRE_MIGRACION'),
        String(lotes),
      ).toBe(false);
    }
  });

  it('sin conteo no inventa el aviso', () => {
    expect(
      construirPreviewLote(enDev).advertencias.some(
        (a) => a.codigo === 'DIVISOR_PRE_MIGRACION',
      ),
    ).toBe(false);
  });

  it('acompaña también a un lote que no cotiza', () => {
    // El fijo se muestra en pantalla aunque no haya precio, así que la etiqueta
    // tiene que viajar con él por los tres caminos: sin costo, mixto y normal.
    for (const caso of [
      { costoCompraCOP: 0 },
      { categoriaFiscal: 'mixta' as const },
    ]) {
      const p = construirPreviewLote({ ...enDev, ...caso, lotesActivos: 66 });
      expect(
        p.advertencias.some((a) => a.codigo === 'DIVISOR_PRE_MIGRACION'),
        JSON.stringify(caso),
      ).toBe(true);
    }
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
