/**
 * Las reglas de captura del lote W1 (Cerebro Racional).
 *
 * La spec de wizards existe porque la hoja no puede obligar a capturar lo que el
 * modelo necesita. Estas validaciones SON esa obligación, y viven aparte de la
 * mutation para poder probarlas (este repo no tiene arnés de mutations; ver
 * `docs/superpowers/specs/2026-08-01-task0-reconocimiento.md` §5.2).
 *
 * La regla que manda: **categoría fiscal obligatoria**. Es el campo que decide
 * gema (0,60) contra joya (0,41), y su ausencia es lo que dejó 102 filas de la
 * hoja sin poder elegir divisor.
 */
import { describe, it, expect } from 'vitest';
import {
  costosVariablesTotal,
  saldoProveedor,
  validarLoteV4,
  type LoteV4Input,
} from '../convex/_lib/loteV4';

/** Un lote de gemas válido y mínimo, para partir de aquí en cada caso. */
const BASE: LoteV4Input = {
  categoriaFiscal: 'gema',
  costoCompraCOP: 931_931,
  unidadesDeclaradas: 4,
  formaPago: 'contado',
  metodoContado: 'efectivo',
  fechaRecepcion: '2026-08-01',
};

describe('validarLoteV4 — la categoría fiscal es el primer candado', () => {
  it('acepta un lote de gemas bien formado', () => {
    const lote = validarLoteV4(BASE);
    expect(lote.categoriaFiscal).toBe('gema');
    expect(lote.origenModelo).toBe('v4');
  });

  it('rechaza el lote sin categoría fiscal — nunca un default', () => {
    const { categoriaFiscal: _, ...sinCategoria } = BASE;
    expect(() => validarLoteV4(sinCategoria as unknown as LoteV4Input)).toThrow(
      /categor/i,
    );
  });

  it('rechaza una categoría inventada', () => {
    expect(() =>
      validarLoteV4({ ...BASE, categoriaFiscal: 'insumo' as never }),
    ).toThrow(/categor/i);
  });

  it('SÍ acepta «mixta» a nivel lote — se resuelve casilla por casilla', () => {
    // A diferencia del motor, que rechaza `mixta` porque no es cotizable, el
    // lote puede declararla: es la forma honesta de decir «acá vienen las dos».
    const lote = validarLoteV4({ ...BASE, categoriaFiscal: 'mixta' });
    expect(lote.categoriaFiscal).toBe('mixta');
    expect(lote.exigeCategoriaPorCasilla).toBe(true);
  });

  it('un lote de una sola categoría no exige categoría por casilla', () => {
    expect(validarLoteV4(BASE).exigeCategoriaPorCasilla).toBe(false);
  });
});

describe('validarLoteV4 — el bloque joya', () => {
  const JOYA: LoteV4Input = {
    ...BASE,
    categoriaFiscal: 'joya',
    joya: {
      tipoJoya: 'anillos mujer',
      mineral: 'oro',
      gramaje: 4.2,
      costoPorGramoCOP: 320_000,
    },
  };

  it('acepta un lote de joyería con su bloque', () => {
    expect(validarLoteV4(JOYA).joya?.mineral).toBe('oro');
  });

  it('exige el bloque joya cuando la categoría es joya', () => {
    const { joya: _, ...sinBloque } = JOYA;
    expect(() => validarLoteV4(sinBloque)).toThrow(/joya/i);
  });

  it('rechaza el bloque joya en un lote de gemas — contradice la categoría', () => {
    expect(() => validarLoteV4({ ...BASE, joya: JOYA.joya })).toThrow(/gema/i);
  });

  it('un lote mixto puede traer el bloque joya sin exigirlo', () => {
    expect(() =>
      validarLoteV4({ ...BASE, categoriaFiscal: 'mixta', joya: JOYA.joya }),
    ).not.toThrow();
    expect(() =>
      validarLoteV4({ ...BASE, categoriaFiscal: 'mixta' }),
    ).not.toThrow();
  });

  it('rechaza un gramaje o costo por gramo no positivos', () => {
    expect(() =>
      validarLoteV4({ ...JOYA, joya: { ...JOYA.joya!, gramaje: 0 } }),
    ).toThrow(/gramaje/i);
    expect(() =>
      validarLoteV4({ ...JOYA, joya: { ...JOYA.joya!, costoPorGramoCOP: -1 } }),
    ).toThrow(/costoPorGramo/i);
  });
});

describe('costosVariablesTotal — landed cost como documentos que ajustan', () => {
  it('suma los conceptos', () => {
    expect(
      costosVariablesTotal([
        { concepto: 'viáticos', montoCOP: 5_000 },
        { concepto: 'packing', montoCOP: 3_091 },
        { concepto: 'domicilio', montoCOP: 1_000 },
      ]),
    ).toBe(9_091);
  });

  it('sin costos variables da cero, no undefined', () => {
    expect(costosVariablesTotal(undefined)).toBe(0);
    expect(costosVariablesTotal([])).toBe(0);
  });

  it('rechaza un concepto vacío — un ajuste sin nombre no es auditable', () => {
    // El punto de capturarlos como documentos es poder decir DE QUÉ fue el
    // ajuste. Un monto suelto es indistinguible de un dedazo en el costo.
    expect(() =>
      costosVariablesTotal([{ concepto: '  ', montoCOP: 5_000 }]),
    ).toThrow(/concepto/i);
  });

  it('rechaza montos negativos o no finitos', () => {
    expect(() =>
      costosVariablesTotal([{ concepto: 'viáticos', montoCOP: -1 }]),
    ).toThrow(/monto/i);
  });

  it('el lote 10 reconstruye sus $9.091 de costos variables', () => {
    const lote = validarLoteV4({
      ...BASE,
      costosVariables: [
        { concepto: 'costos variables del lote', montoCOP: 9_091 },
      ],
    });
    expect(lote.costosVariablesCOP).toBe(9_091);
    // Y el costo de compra NO se contamina con ellos: son cosas distintas y el
    // motor las suma por separado.
    expect(lote.costoCompraCOP).toBe(931_931);
  });
});

describe('saldoProveedor — la deuda es con el proveedor, no con los terceros', () => {
  it('el saldo es lo que falta por pagar', () => {
    expect(saldoProveedor(1_000_000, 300_000)).toBe(700_000);
  });

  it('sin abono el saldo es el costo entero', () => {
    expect(saldoProveedor(1_000_000, undefined)).toBe(1_000_000);
  });

  it('un abono igual al costo deja saldo cero', () => {
    expect(saldoProveedor(1_000_000, 1_000_000)).toBe(0);
  });

  it('rechaza un abono mayor al costo en vez de dejar saldo negativo', () => {
    // Un saldo negativo es un dato imposible que después nadie sabe leer: o el
    // abono está mal, o el costo. Que lo diga quien captura.
    expect(() => saldoProveedor(1_000_000, 1_500_000)).toThrow(/abono/i);
  });

  it('los costos variables NO entran en la deuda con el proveedor', () => {
    // Son landed cost: capitalizan al costo del lote para el precio, pero se le
    // pagan a la transportadora y a quien empaca, no al dueño de la piedra.
    // Antes esto daba 850.000 y dejaba un saldo fantasma de $50.000.
    const lote = validarLoteV4({
      ...BASE,
      costoCompraCOP: 1_000_000,
      costosVariables: [{ concepto: 'viáticos', montoCOP: 50_000 }],
      abonoCOP: 200_000,
    });
    expect(lote.costoTotalCOP).toBe(1_050_000); // el landed sí los suma
    expect(lote.saldoCOP).toBe(800_000); // la deuda, no
  });

  it('pagarle todo al proveedor deja saldo CERO aunque haya variables', () => {
    // El caso que delataba el error: el proveedor está saldado y el lote seguía
    // mostrando deuda por el monto exacto de los viáticos.
    const lote = validarLoteV4({
      ...BASE,
      costoCompraCOP: 1_000_000,
      costosVariables: [{ concepto: 'domicilio', montoCOP: 50_000 }],
      abonoCOP: 1_000_000,
    });
    expect(lote.saldoCOP).toBe(0);
  });

  it('un abono que excede la compra falla aunque quepa en el landed', () => {
    // $1.020.000 sobre una compra de $1.000.000 con $50.000 de variables: antes
    // pasaba como válido porque cabía en el total. Es un error de captura.
    expect(() =>
      validarLoteV4({
        ...BASE,
        costoCompraCOP: 1_000_000,
        costosVariables: [{ concepto: 'viáticos', montoCOP: 50_000 }],
        abonoCOP: 1_020_000,
      }),
    ).toThrow(/abono/i);
  });
});

describe('validarLoteV4 — las validaciones que ya exigía el riel viejo', () => {
  it('exige al menos una unidad declarada', () => {
    expect(() => validarLoteV4({ ...BASE, unidadesDeclaradas: 0 })).toThrow(
      /unidades/i,
    );
  });

  it('exige un costo de compra positivo', () => {
    expect(() => validarLoteV4({ ...BASE, costoCompraCOP: 0 })).toThrow(
      /costoCompra/i,
    );
  });

  it('crédito exige fecha de vencimiento', () => {
    expect(() =>
      validarLoteV4({
        ...BASE,
        formaPago: 'credito',
        metodoContado: undefined,
      }),
    ).toThrow(/vencimiento/i);
    expect(() =>
      validarLoteV4({
        ...BASE,
        formaPago: 'credito',
        metodoContado: undefined,
        fechaVencimiento: '2026-09-30',
      }),
    ).not.toThrow();
  });

  it('contado exige método', () => {
    expect(() => validarLoteV4({ ...BASE, metodoContado: undefined })).toThrow(
      /m[ée]todo/i,
    );
  });

  it('exige una fecha de recepción ISO', () => {
    expect(() =>
      validarLoteV4({ ...BASE, fechaRecepcion: '01/08/2026' }),
    ).toThrow(/AAAA-MM-DD/);
  });
});
