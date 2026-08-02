/**
 * El delta del canon de cabeceras para Lotes y Casillas.
 *
 * Aditivo por construcción: el upsert direcciona por cabecera NOMBRADA, así que
 * sumar columnas no mueve ninguna fila existente. Lo que sí hay que atar es que
 * la fila y la lista de cabeceras no se separen — el drenaje rechaza una fila a
 * la que le falte una columna, y una clave de más se escribiría en ningún lado.
 */
import { describe, it, expect } from 'vitest';
import {
  CABECERAS_CASILLAS,
  CABECERAS_LOTES,
  desglosaCostosVariables,
  filaCasillaParaEspejo,
  filaLoteParaEspejo,
} from '../convex/_lib/espejoFilas';

const LOTE_BASE = {
  loteId: 'C-090',
  fechaRecepcion: '2026-08-01',
  proveedor: 'Proveedor Uno',
  categoriaFiscal: 'joya',
  costoCompraCOP: 893_996,
  costosVariablesCOP: 9_091,
  costoTotalCOP: 903_087,
  unidadesDeclaradas: 4,
  abonoCOP: 400_000,
  saldoCOP: 493_996,
  formaPago: 'credito',
  estado: 'abierto',
};

describe('desglosaCostosVariables — los tres conceptos que el wizard sugiere', () => {
  it('reparte por concepto y manda el resto a otros', () => {
    // `CostosVariablesEditor` ofrece exactamente Viáticos · Packing · Domicilio
    // como sugerencias, así que el mapeo no es una adivinanza: son los mismos
    // tres. Lo escrito a mano cae en `otros`.
    const d = desglosaCostosVariables([
      { concepto: 'Viáticos', montoCOP: 5_000 },
      { concepto: 'Packing', montoCOP: 2_000 },
      { concepto: 'Domicilio', montoCOP: 1_091 },
      { concepto: 'Notaría', montoCOP: 1_000 },
    ]);
    expect(d).toEqual({
      viaticosCOP: 5_000,
      packingCOP: 2_000,
      domicilioCOP: 1_091,
      otrosVariablesCOP: 1_000,
    });
  });

  it('ignora tildes y mayúsculas al clasificar', () => {
    const d = desglosaCostosVariables([
      { concepto: 'viaticos', montoCOP: 3_000 },
      { concepto: 'PACKING', montoCOP: 1_000 },
    ]);
    expect(d.viaticosCOP).toBe(3_000);
    expect(d.packingCOP).toBe(1_000);
  });

  it('suma dos entradas del mismo concepto en vez de pisar una', () => {
    const d = desglosaCostosVariables([
      { concepto: 'Domicilio', montoCOP: 4_000 },
      { concepto: 'domicilio ida', montoCOP: 6_000 },
    ]);
    expect(d.domicilioCOP).toBe(10_000);
  });

  it('sin costos variables, cuatro ceros', () => {
    expect(desglosaCostosVariables()).toEqual({
      viaticosCOP: 0,
      packingCOP: 0,
      domicilioCOP: 0,
      otrosVariablesCOP: 0,
    });
  });

  it('el desglose SIEMPRE suma el total: es informativo, el total manda', () => {
    // Si el mapeo por palabra clave clasificara mal, el total no puede cambiar:
    // `costosVariablesCOP` sigue siendo la cifra autoritativa.
    const items = [
      { concepto: 'Viáticos', montoCOP: 5_000 },
      { concepto: 'lo que sea', montoCOP: 4_091 },
    ];
    const d = desglosaCostosVariables(items);
    const suma =
      d.viaticosCOP + d.packingCOP + d.domicilioCOP + d.otrosVariablesCOP;
    expect(suma).toBe(items.reduce((a, c) => a + c.montoCOP, 0));
  });
});

describe('filaLoteParaEspejo — el delta del canon', () => {
  const fila = filaLoteParaEspejo({
    ...LOTE_BASE,
    costosVariables: [
      { concepto: 'Viáticos', montoCOP: 5_000 },
      { concepto: 'Packing', montoCOP: 4_091 },
    ],
    joya: {
      tipoJoya: 'anillos mujer',
      mineral: 'oro',
      gramaje: 3.4,
      costoPorGramoCOP: 260_000,
      presupuestoJoyaCOP: 884_000,
    },
  });

  it('manda el desglose de variables además del total', () => {
    expect(fila.viaticosCOP).toBe('5000');
    expect(fila.packingCOP).toBe('4091');
    expect(fila.domicilioCOP).toBe('0');
    expect(fila.costosVariablesCOP).toBe('9091');
  });

  it('manda el bloque joya', () => {
    expect(fila.tipoJoya).toBe('anillos mujer');
    expect(fila.mineralJoya).toBe('oro');
    expect(fila.gramajeJoya).toBe('3.4');
    expect(fila.costoPorGramoCOP).toBe('260000');
    expect(fila.presupuestoJoyaCOP).toBe('884000');
  });

  it('un lote de gema deja el bloque joya vacío, no ausente', () => {
    const gema = filaLoteParaEspejo({ ...LOTE_BASE, categoriaFiscal: 'gema' });
    expect(gema.tipoJoya).toBe('');
    expect(gema.mineralJoya).toBe('');
    expect(Object.keys(gema).sort()).toEqual([...CABECERAS_LOTES].sort());
  });

  it('la fila trae exactamente las cabeceras declaradas', () => {
    expect(Object.keys(fila).sort()).toEqual([...CABECERAS_LOTES].sort());
  });

  it('una categoría inferida sale con sufijo — nadie la confunde con un dictamen', () => {
    // Decisión de Kevin, 2026-08-02, §2b: "El espejo muestra la categoría con
    // sufijo (p. ej. joya (inferida))".
    const inferida = filaLoteParaEspejo({
      ...LOTE_BASE,
      categoriaFiscal: 'joya',
      categoriaFiscalOrigen: 'inferida',
    });
    expect(inferida.categoriaFiscal).toBe('joya (inferida)');
  });

  it('capturada, revisada o ausente no llevan sufijo — solo inferida lo pide', () => {
    expect(
      filaLoteParaEspejo({
        ...LOTE_BASE,
        categoriaFiscalOrigen: 'capturada',
      }).categoriaFiscal,
    ).toBe('joya');
    expect(
      filaLoteParaEspejo({
        ...LOTE_BASE,
        categoriaFiscalOrigen: 'revisada',
      }).categoriaFiscal,
    ).toBe('joya');
    expect(filaLoteParaEspejo(LOTE_BASE).categoriaFiscal).toBe('joya');
  });
});

describe('filaCasillaParaEspejo — el delta del canon', () => {
  const fila = filaCasillaParaEspejo({
    itemId: '295',
    loteId: 'C-090',
    ordenEnLote: 1,
    estadoCasilla: 'DISPONIBLE',
    renombreLote: 'Fénix',
    tipoJoya: 'dije',
    gramaje: 2.1,
  });

  it('manda el renombre del lote, el tipo de joya y el gramaje', () => {
    expect(fila.renombreLote).toBe('Fénix');
    expect(fila.tipoJoya).toBe('dije');
    expect(fila.gramaje).toBe('2.1');
  });

  it('la fila trae exactamente las cabeceras declaradas', () => {
    expect(Object.keys(fila).sort()).toEqual([...CABECERAS_CASILLAS].sort());
  });

  it('hereda el sufijo "(inferida)" del lote, denormalizado igual que renombreLote', () => {
    const inferida = filaCasillaParaEspejo({
      itemId: '295',
      loteId: 'C-090',
      ordenEnLote: 1,
      estadoCasilla: 'DISPONIBLE',
      categoriaFiscal: 'joya',
      categoriaFiscalOrigen: 'inferida',
    });
    expect(inferida.categoriaFiscal).toBe('joya (inferida)');
  });
});
