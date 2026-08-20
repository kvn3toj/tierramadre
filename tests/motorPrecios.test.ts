/**
 * Paridad pinneada del motor de precios del Modelo v2.
 *
 * Estos tests NO son cobertura: son el candado contra la divergencia de los dos
 * motores (regla §4.6 de la spec de wizards). El motor vive también en anima-bot
 * (`src/cotizador/precios.ts`), y este port se valida reproduciendo **los mismos
 * números reales** que la auditoría del 2026-07-25 verificó contra el archivo
 * vivo. Si un caso de aquí cambia, o el port está mal, o el modelo cambió — y en
 * el segundo caso hay que cambiarlo en los dos lados a la vez.
 *
 * Cada caso lleva el nombre del lote/ítem real del que salió.
 */
import { describe, it, expect } from 'vitest';
import {
  CONFIG_PRECIOS_2026_07,
  CONFIG_PRECIOS_2026_08,
  calcularK,
  configVigenteEn,
  costoFijoUnitario,
  divisorObjetivo,
  exigeCategoriaFiscal,
  margenNetoReal,
  multiplicadorInformativo,
  pisoReal,
  precioVenta,
  type ConfigPrecios,
} from '../convex/_lib/motorPrecios';

/** Dentro de la ventana de remate (hasta 2026-08-31 inclusive). */
const EN_REMATE = '2026-08-15';
/** El primer día en que vuelve a regir el objetivo. */
const YA_OBJETIVO = '2026-09-01';

const CFG = CONFIG_PRECIOS_2026_07;

/** El fijo por lote de julio 2026: $33.651.815 / 76 lotes. */
const FIJO = 442_787;

describe('costoFijoUnitario — el divisor sale de un conteo, no de una celda', () => {
  it('gasto fijo mensual $33.651.815 entre 76 lotes = $442.787', () => {
    // Verificado contra el archivo vivo: lote 10 muestra K = $1.383.809 con
    // F = $931.931 y J = $9.091, lo que obliga a E6 = 442.787.
    expect(costoFijoUnitario(33_651_815, 76)).toBe(FIJO);
  });

  it('con 62 lotes (el conteo de EQUIVALENTES) el fijo sube a $542.771', () => {
    // La decisión D2 fijó «lotes activos», pero el número depende del conteo:
    // este test deja visible cuánto se mueve todo si el divisor cambia.
    expect(costoFijoUnitario(33_651_815, 62)).toBe(542_771);
  });

  it('rechaza un divisor en cero en vez de devolver Infinity', () => {
    // El defecto ① de la hoja: `E6` quedó en 0 y todo el inventario se cotizó
    // sin absorber un peso de gasto fijo. Aquí eso es un error, no un número.
    expect(() => costoFijoUnitario(33_651_815, 0)).toThrow();
    expect(() => costoFijoUnitario(33_651_815, -1)).toThrow();
  });
});

describe('configVigenteEn — un cambio de tasa nunca reprecia lo ya vendido', () => {
  const viejo: ConfigPrecios = { ...CFG, vigenteDesde: '2026-01-01' };
  const nuevo: ConfigPrecios = {
    ...CFG,
    vigenteDesde: '2026-09-01',
    gastosFijosMensualesCOP: 40_000_000,
  };

  it('toma la vigencia más reciente que no sea futura', () => {
    expect(configVigenteEn([viejo, nuevo], '2026-08-15')).toBe(viejo);
    expect(configVigenteEn([viejo, nuevo], '2026-09-01')).toBe(nuevo);
  });

  it('no depende del orden en que vengan las filas', () => {
    expect(configVigenteEn([nuevo, viejo], '2026-08-15')).toBe(viejo);
  });

  it('lanza si no hay ninguna regla vigente para esa fecha', () => {
    expect(() => configVigenteEn([nuevo], '2026-08-15')).toThrow();
    expect(() => configVigenteEn([], '2026-08-15')).toThrow();
  });
});

describe('calcularK — costo de compra + variables + fijo del lote', () => {
  it('lote 10: 931.931 + 9.091 + 442.787 = 1.383.809', () => {
    expect(
      calcularK({
        costoCompraCOP: 931_931,
        costosVariablesCOP: 9_091,
        costoFijoUnitarioCOP: FIJO,
      }),
    ).toBe(1_383_809);
  });

  it('lote 14: 893.996 + 9.091 + 442.787 = 1.345.874', () => {
    expect(
      calcularK({
        costoCompraCOP: 893_996,
        costosVariablesCOP: 9_091,
        costoFijoUnitarioCOP: FIJO,
      }),
    ).toBe(1_345_874);
  });

  it('EXIGE el fijo unitario — no hay default que sobreviva al cambio de mes', () => {
    // Divergencia deliberada contra anima-bot, donde cae a la constante 442.787.
    // Aquí el fijo sale de configPrecios ÷ COUNT(lotes activos): un default
    // sería la constante muerta del defecto `B5`/`E6`, otra vez.
    expect(() =>
      // @ts-expect-error el fijo unitario es obligatorio por contrato
      calcularK({ costoCompraCOP: 931_931, costosVariablesCOP: 9_091 }),
    ).toThrow(/costoFijoUnitarioCOP/);
  });

  it('«Choker + Piedra»: usa el costo capturado $119.999, jamás lo re-deriva', () => {
    // El candado anti-prorrateo (regla §4.2). Prorratear el costo del lote daba
    // $67.499 — un error real de $52.500 medido el 2026-07-25. El motor toma el
    // costo que le dan y no tiene forma de recalcularlo desde el lote.
    const K = calcularK({
      costoCompraCOP: 119_999,
      costoFijoUnitarioCOP: FIJO,
    });
    expect(K - FIJO).toBe(119_999);
    expect(K).not.toBe(67_499 + FIJO);
  });

  it('rechaza un costo de compra ausente o negativo en vez de cotizar en cero', () => {
    expect(() =>
      calcularK({ costoCompraCOP: -1, costoFijoUnitarioCOP: FIJO }),
    ).toThrow();
    expect(() =>
      calcularK({ costoCompraCOP: Number.NaN, costoFijoUnitarioCOP: FIJO }),
    ).toThrow();
  });
});

describe('la regla fiscal por categoría — el divisor NO es uno solo', () => {
  it('gema 0,60 y joya 0,41, derivados de las constantes', () => {
    expect(divisorObjetivo('gema', CFG)).toBeCloseTo(0.6, 10);
    expect(divisorObjetivo('joya', CFG)).toBeCloseTo(0.41, 10);
  });

  it('categoría ausente ⇒ throw, NUNCA un default', () => {
    // La regla dura §4.1: la columna «Tipo de Joya» vacía en 102 filas es lo que
    // dejó a la hoja sin poder elegir divisor. Un default aquí reimportaría el
    // defecto: cotizar con 0,60 lo que era joya mueve el precio 46%.
    expect(() => exigeCategoriaFiscal(undefined)).toThrow(/categor/i);
    expect(() => exigeCategoriaFiscal(null)).toThrow(/categor/i);
    expect(() => exigeCategoriaFiscal('')).toThrow(/categor/i);
    expect(() => exigeCategoriaFiscal('mixta')).toThrow(/categor/i);
    expect(exigeCategoriaFiscal('gema')).toBe('gema');
    expect(exigeCategoriaFiscal('joya')).toBe('joya');
  });

  it('cotizar una joya con el divisor de gema la mueve ~46%', () => {
    const joya = precioVenta({
      K: 500_000,
      categoria: 'joya',
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    const gema = precioVenta({
      K: 500_000,
      categoria: 'gema',
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    expect(joya.precioCOP / gema.precioCOP).toBeCloseTo(0.6 / 0.41, 2);
  });
});

describe('pisoReal — el equilibrio que la hoja NO calcula', () => {
  it('gema paga solo comisión: K / 0,90', () => {
    expect(pisoReal(1_383_809, 'gema', CFG)).toBe(Math.round(1_383_809 / 0.9));
  });

  it('joya paga comisión + IVA: K / 0,71', () => {
    expect(pisoReal(1_345_874, 'joya', CFG)).toBe(Math.round(1_345_874 / 0.71));
  });

  it('lote 10: el equilibrio real son $1.537.566, no el K de $1.383.809', () => {
    // Vender en K pierde plata: la comisión sale del precio y no está en K.
    expect(pisoReal(1_383_809, 'gema', CFG)).toBe(1_537_566);
  });

  it('lote 14: equilibrio real $1.895.597 contra un K de $1.345.874', () => {
    expect(pisoReal(1_345_874, 'joya', CFG)).toBe(1_895_597);
  });
});

describe('precioVenta — régimen objetivo (desde 2026-09-01)', () => {
  it('lote 10 (gema, /0,60): objetivo $2.306.348 — 2,47× el costo', () => {
    const p = precioVenta({
      K: 1_383_809,
      categoria: 'gema',
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    expect(p.precioCOP).toBe(2_306_348);
    expect(p.regla).toBe('objetivo');
    expect(p.precioCOP / 931_931).toBeCloseTo(2.47, 2);
  });

  it('lote 14 (joya, /0,41): objetivo $3.282.620 — 3,67× el costo', () => {
    const p = precioVenta({
      K: 1_345_874,
      categoria: 'joya',
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    expect(p.precioCOP).toBe(3_282_620);
    expect(p.precioCOP / 893_996).toBeCloseTo(3.67, 2);
  });

  it('el objetivo entrega exactamente el 30% de margen neto deseado', () => {
    for (const categoria of ['gema', 'joya'] as const) {
      const p = precioVenta({
        K: 500_000,
        categoria,
        fecha: YA_OBJETIVO,
        config: CFG,
      });
      expect(p.margenNetoPct, categoria).toBeCloseTo(30, 4);
    }
  });
});

describe('precioVenta — régimen de remate (hasta 2026-08-31)', () => {
  it('ítem 295 montado en oro 18k: K $2.148.787 × 1,6 = $3.438.059', () => {
    const p = precioVenta({
      K: 2_148_787,
      categoria: 'joya',
      fecha: EN_REMATE,
      config: CFG,
    });
    expect(p.precioCOP).toBe(3_438_059);
    expect(p.regla).toBe('remate');
  });

  it('ítem 295 montado en plata 925: K $938.787 × 1,6 = $1.502.059', () => {
    expect(
      precioVenta({
        K: 938_787,
        categoria: 'joya',
        fecha: EN_REMATE,
        config: CFG,
      }).precioCOP,
    ).toBe(1_502_059);
  });

  it('gema ×1,3 y joya ×1,6 sobre K', () => {
    expect(
      precioVenta({
        K: 500_000,
        categoria: 'gema',
        fecha: EN_REMATE,
        config: CFG,
      }).precioCOP,
    ).toBe(650_000);
    expect(
      precioVenta({
        K: 500_000,
        categoria: 'joya',
        fecha: EN_REMATE,
        config: CFG,
      }).precioCOP,
    ).toBe(800_000);
  });

  it('el 2026-08-31 todavía es remate; el 2026-09-01 ya no', () => {
    const el31 = precioVenta({
      K: 500_000,
      categoria: 'gema',
      fecha: '2026-08-31',
      config: CFG,
    });
    const el1 = precioVenta({
      K: 500_000,
      categoria: 'gema',
      fecha: '2026-09-01',
      config: CFG,
    });
    expect(el31.regla).toBe('remate');
    expect(el1.regla).toBe('objetivo');
    expect(el31.precioCOP).not.toBe(el1.precioCOP);
  });
});

describe('invariantes que valen en todos los regímenes', () => {
  it('el precio nunca cae bajo el piso real', () => {
    for (const fecha of [EN_REMATE, YA_OBJETIVO]) {
      for (const categoria of ['gema', 'joya'] as const) {
        for (const K of [100_000, 500_000, 3_400_000, 71_610_481]) {
          const p = precioVenta({ K, categoria, fecha, config: CFG });
          expect(p.precioCOP, `${fecha}/${categoria}/${K}`).toBeGreaterThan(
            p.pisoCOP,
          );
        }
      }
    }
  });

  it('el multiplicador NO es constante: un lote barato paga más fijo', () => {
    // Regla §4.3 — el 2,60× plano de la app es el vicio a erradicar. El fijo es
    // un monto plano, así que el múltiplo cae cuando el lote sube de precio.
    const barato = precioVenta({
      K: calcularK({ costoCompraCOP: 633_000, costoFijoUnitarioCOP: FIJO }),
      categoria: 'gema',
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    const caro = precioVenta({
      K: calcularK({ costoCompraCOP: 3_679_487, costoFijoUnitarioCOP: FIJO }),
      categoria: 'gema',
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    // El lote 57, el más caro del inventario, cotiza a 1,87× — verificado en la
    // auditoría. Del lote barato solo se pinnea la RELACIÓN: la nota reporta
    // 2,85× pero ese número no se reproduce desde su costo declarado (da 2,83×),
    // y pinnear una cifra que no puedo derivar sería fijar un error como ley.
    expect(multiplicadorInformativo(caro.precioCOP, 3_679_487)).toBeCloseTo(
      1.87,
      2,
    );
    expect(multiplicadorInformativo(barato.precioCOP, 633_000)).toBeGreaterThan(
      multiplicadorInformativo(caro.precioCOP, 3_679_487),
    );
  });

  it('el multiplicador se mide contra el costo, no contra K', () => {
    // Dividir por K daría un número más plano y más tranquilizador — taparía
    // justo lo que §4.3 quiere hacer visible. El piso teórico en gema (si el
    // fijo fuera cero) es 1,67×, y ese es el número que sale al dividir por K.
    const p = precioVenta({
      K: 1_383_809,
      categoria: 'gema',
      fecha: YA_OBJETIVO,
      config: CFG,
    });
    expect(multiplicadorInformativo(p.precioCOP, 931_931)).toBeCloseTo(2.47, 2);
    expect(multiplicadorInformativo(p.precioCOP, p.K)).toBeCloseTo(1.67, 2);
  });

  it('devuelve K y el piso para que la tarjeta no tenga que recalcularlos', () => {
    const p = precioVenta({
      K: 1_383_809,
      categoria: 'gema',
      fecha: EN_REMATE,
      config: CFG,
    });
    expect(p.K).toBe(1_383_809);
    expect(p.pisoCOP).toBe(pisoReal(1_383_809, 'gema', CFG));
    expect(p.categoria).toBe('gema');
  });

  it('no lee el reloj: la misma entrada da el mismo precio siempre', () => {
    // La fecha es un hecho del negocio sobre la cotización, no de cuándo corre
    // el proceso. Sin esto, el 1 de septiembre cambiaría precios ya acordados.
    const args = {
      K: 500_000,
      categoria: 'gema' as const,
      fecha: EN_REMATE,
      config: CFG,
    };
    expect(precioVenta(args).precioCOP).toBe(precioVenta(args).precioCOP);
  });

  it('rechaza una fecha que no sea AAAA-MM-DD en vez de adivinar el régimen', () => {
    expect(() =>
      precioVenta({
        K: 500_000,
        categoria: 'gema',
        fecha: '15/08/2026',
        config: CFG,
      }),
    ).toThrow(/AAAA-MM-DD/);
  });

  it('rechaza un K no positivo', () => {
    expect(() =>
      precioVenta({ K: 0, categoria: 'gema', fecha: EN_REMATE, config: CFG }),
    ).toThrow();
  });
});

describe('margenNetoReal — margen honesto sobre un precio puesto a mano', () => {
  it('lote 14 a los $1.922.677 que muestra la hoja deja 1,0%, no 30%', () => {
    // El síntoma que delata el divisor 0,70: a ese precio la joya está a
    // $27.080 de perder plata.
    expect(margenNetoReal(1_922_677, 1_345_874, 'joya', CFG)).toBeCloseTo(
      1.0,
      1,
    );
  });

  it('lote 10 a su precio de hoy deja 32,9% — las gemas sí están sanas', () => {
    // $2.423.021 = la suma de los precios de hoy de los ítems 372-375
    // (699.356 + 918.346 + 211.926 + 593.393), los cuatro que cuadran al peso.
    expect(margenNetoReal(2_423_021, 1_383_809, 'gema', CFG)).toBeCloseTo(
      32.9,
      1,
    );
  });
});

describe('la configuración semilla de julio 2026', () => {
  it('comisión 10%, IVA de joya 19%, margen deseado 30%, remate al 2026-08-31', () => {
    expect(CFG.comisionPct).toBe(0.1);
    expect(CFG.ivaJoyaPct).toBe(0.19);
    expect(CFG.margenNetoDeseadoPct).toBe(0.3);
    expect(CFG.remateHasta).toBe('2026-08-31');
    expect(CFG.multRemateGema).toBe(1.3);
    expect(CFG.multRemateJoya).toBe(1.6);
    expect(CFG.gastosFijosMensualesCOP).toBe(33_651_815);
  });

  it('NO trae ivaGemaPct: los números pinneados de arriba dependen de gema sin IVA', () => {
    // Si esto falla, alguien le puso IVA de gema a la config de julio — eso
    // repreciaría retroactivamente todo lo cotizado bajo esa regla. El régimen
    // nuevo entra por CONFIG_PRECIOS_2026_08, nunca editando la vieja.
    expect(CFG.ivaGemaPct).toBeUndefined();
  });
});

describe('CONFIG_PRECIOS_2026_08 — gemas gravadas con IVA (responsable de IVA)', () => {
  // Corrección legal verificada el 2026-08-20: el art. 424 ET no excluye las
  // piedras preciosas (solo 71.18 monedas), así que la venta NACIONAL de una
  // gema suelta paga la tarifa general del 19% (art. 468). La exención real es
  // por canal (exportación / CI, art. 481), no por categoría.
  const CFG08 = CONFIG_PRECIOS_2026_08;

  it('rige desde el 2026-08-20 y no toca la regla de julio', () => {
    expect(CFG08.vigenteDesde).toBe('2026-08-20');
    expect(configVigenteEn([CFG, CFG08], '2026-08-19')).toBe(CFG);
    expect(configVigenteEn([CFG, CFG08], '2026-08-20')).toBe(CFG08);
  });

  it('gema y joya quedan con el MISMO divisor: la asimetría fiscal era el error', () => {
    // 1 − 0,10 − 0,19 − 0,30 = 0,41 para ambas categorías.
    expect(divisorObjetivo('gema', CFG08)).toBeCloseTo(0.41, 10);
    expect(divisorObjetivo('joya', CFG08)).toBeCloseTo(0.41, 10);
  });

  it('el piso real de una gema sube de K/0,90 a K/0,71', () => {
    // Lote 10: K = $1.383.809. Bajo julio el piso era $1.537.566; con el IVA
    // que sí se debe, no perder plata exige $1.949.027.
    expect(pisoReal(1_383_809, 'gema', CFG)).toBe(1_537_566);
    expect(pisoReal(1_383_809, 'gema', CFG08)).toBe(1_949_027);
    // La joya no se mueve: siempre pagó su IVA.
    expect(pisoReal(1_383_809, 'joya', CFG)).toBe(
      pisoReal(1_383_809, 'joya', CFG08),
    );
  });

  it('durante el remate el precio de gema NO cambia (ancla en K, no en divisor)', () => {
    const conIva = precioVenta({
      K: 1_383_809,
      categoria: 'gema',
      fecha: '2026-08-25',
      config: CFG08,
    });
    expect(conIva.regla).toBe('remate');
    expect(conIva.precioCOP).toBe(Math.round(1_383_809 * 1.3));
    // Pero el margen reportado ya descuenta el IVA que se va a pagar.
    expect(conIva.margenNetoPct).toBeLessThan(
      precioVenta({
        K: 1_383_809,
        categoria: 'gema',
        fecha: '2026-08-25',
        config: CFG,
      }).margenNetoPct,
    );
  });

  it('desde el 2026-09-01 una gema se cotiza a K/0,41 — +46% sobre el K/0,60 viejo', () => {
    const precio = precioVenta({
      K: 1_383_809,
      categoria: 'gema',
      fecha: '2026-09-01',
      config: CFG08,
    });
    expect(precio.regla).toBe('objetivo');
    expect(precio.precioCOP).toBe(Math.round(1_383_809 / 0.41));
  });
});
