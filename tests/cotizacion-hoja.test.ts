import { describe, expect, it } from 'vitest';
import {
  ENCABEZADOS,
  MIME_SHEETS,
  consultaHoja,
  filasDeCotizacion,
  nombreHoja,
  rangoDeEscritura,
} from '../api/_lib/hoja-cotizacion.js';
import { eligeOperacion, nombreDeck } from '../api/_lib/deck-upload.js';

/** Una cotización mínima con el dinero YA formateado, como llega del bot. */
const quote = {
  items: [
    {
      itemNumber: 548,
      nombre: 'Anillo Corazón Esmeralda',
      gemas: 'Esmeralda 2 mm',
      joya: 'Oro 18k',
      unidades: 10,
      unitario: "$7'907.465",
      total: "$79'074.650",
    },
    {
      itemNumber: 549,
      nombre: 'Dije Sacro',
      gemas: 'Cornalina 2 mm',
      joya: 'Plata 925',
      unidades: 2,
      unitario: '$365.854',
      total: '$731.708',
    },
  ],
  total: "$79'806.358",
  fecha: '2026-09-10',
};

describe('nombreHoja', () => {
  it('nombra por número de cotización, para poder deduplicar', () => {
    expect(nombreHoja('TM-2026-0043')).toBe('Hoja-Cotizacion-TM-2026-0043');
  });

  it('NO colisiona con el nombre del deck en la misma carpeta del asesor', () => {
    // El deck deduplica por nombre SIN filtro de mimeType: si los dos archivos
    // se llamaran igual, un endpoint haría files.update sobre el archivo del
    // otro. Esta aserción es el candado.
    expect(nombreHoja('TM-2026-0043')).not.toBe(nombreDeck('TM-2026-0043'));
    expect(nombreHoja('TM-2026-0043').startsWith('Cotizacion-')).toBe(false);
  });
});

describe('consultaHoja', () => {
  it('filtra por mimeType de Sheets, como segundo cinturón contra el deck', () => {
    const q = consultaHoja(nombreHoja('TM-1'), 'folder123');
    expect(q).toContain(`mimeType = '${MIME_SHEETS}'`);
    expect(MIME_SHEETS).toBe('application/vnd.google-apps.spreadsheet');
    expect(q).toBe(
      "name = 'Hoja-Cotizacion-TM-1' and 'folder123' in parents and " +
        "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    );
  });

  it('escapa el valor con el escapador compartido (barra antes que comilla)', () => {
    // Reutiliza escapaParaQuery de _lib: sin duplicar la barra, `name = 'a\'`
    // se lee como comilla ESCAPADA y el literal nunca cierra.
    const q = consultaHoja("Hoja-Cotizacion-a\\'b", 'folder123');
    expect(q).toContain("name = 'Hoja-Cotizacion-a\\\\\\'b'");
  });
});

describe('filasDeCotizacion', () => {
  it('escribe encabezado + una fila por ítem + fila de total', () => {
    const filas = filasDeCotizacion(quote);
    expect(filas).toHaveLength(1 + quote.items.length + 1);
    expect(filas[0]).toEqual(ENCABEZADOS);
    expect(filas[1]).toEqual([
      '01',
      '548',
      'Anillo Corazón Esmeralda',
      'Esmeralda 2 mm',
      'Oro 18k',
      '10',
      "$7'907.465",
      "$79'074.650",
    ]);
    expect(filas[2][0]).toBe('02');
    expect(filas[3]).toEqual([
      '',
      '',
      'TOTAL',
      '',
      '',
      '12',
      '',
      "$79'806.358",
    ]);
  });

  it('pasa el dinero VERBATIM: ni redondea, ni reformatea el apóstrofo', () => {
    const filas = filasDeCotizacion(quote);
    // El apóstrofo de los millones es el formato colombiano que ya calculó el
    // bot. Cualquier reinterpretación aquí (o un USER_ENTERED río abajo)
    // haría que la hoja contradiga al mensaje de Telegram.
    expect(filas[1][6]).toBe("$7'907.465");
    expect(filas[1][7]).toBe("$79'074.650");
    expect(filas[3][7]).toBe("$79'806.358");
  });

  it('devuelve solo strings, que es lo que espera un write RAW', () => {
    for (const fila of filasDeCotizacion(quote)) {
      for (const celda of fila) {
        expect(typeof celda).toBe('string');
      }
    }
  });

  it('todas las filas tienen el ancho del encabezado', () => {
    for (const fila of filasDeCotizacion(quote)) {
      expect(fila).toHaveLength(ENCABEZADOS.length);
    }
  });

  it('trata unidades ausentes como 1, igual que el render en Python', () => {
    const filas = filasDeCotizacion({
      items: [{ nombre: 'Suelto', unitario: '$1.000', total: '$1.000' }],
      total: '$1.000',
    });
    expect(filas[1][5]).toBe('1');
    expect(filas[2][5]).toBe('1');
  });

  it('rechaza una cotización sin ítems en vez de escribir una hoja vacía', () => {
    expect(() => filasDeCotizacion({ items: [], total: '$0' })).toThrow(
      /sin ítems/,
    );
    expect(() => filasDeCotizacion({ total: '$0' })).toThrow(/sin ítems/);
  });

  it('rechaza un ítem sin precio en vez de inventarlo', () => {
    expect(() =>
      filasDeCotizacion({
        items: [{ nombre: 'Sin precio', unidades: 1, total: '$1.000' }],
        total: '$1.000',
      }),
    ).toThrow(/sin precio/);

    expect(() =>
      filasDeCotizacion({
        items: [{ nombre: 'Sin total', unidades: 1, unitario: '$1.000' }],
        total: '$1.000',
      }),
    ).toThrow(/sin precio/);
  });

  it('rechaza una cotización sin total', () => {
    expect(() =>
      filasDeCotizacion({
        items: [{ nombre: 'X', unitario: '$1', total: '$1' }],
      }),
    ).toThrow(/sin total/);
  });

  it('rechaza unidades no numéricas en vez de sumar NaN', () => {
    expect(() =>
      filasDeCotizacion({
        items: [
          { nombre: 'X', unidades: 'muchas', unitario: '$1', total: '$1' },
        ],
        total: '$1',
      }),
    ).toThrow(/unidades inválidas/);
  });
});

describe('rangoDeEscritura', () => {
  it('cubre exactamente el alto y el ancho de las filas', () => {
    // 8 columnas -> H; 2 ítems -> encabezado + 2 + total = 4 filas
    expect(rangoDeEscritura(filasDeCotizacion(quote))).toBe('A1:H4');
  });

  it('va sin nombre de pestaña: el título de la que crea Drive depende del locale', () => {
    expect(rangoDeEscritura(filasDeCotizacion(quote))).not.toContain('!');
  });
});

describe('eligeOperacion (crear vs actualizar la hoja)', () => {
  it('crea cuando la carpeta del asesor no tiene esa hoja', () => {
    expect(eligeOperacion([])).toEqual({ tipo: 'crear' });
  });

  it('actualiza cuando ya existe, para que un segundo Sí no duplique', () => {
    expect(eligeOperacion([{ id: 'hoja1' }])).toEqual({
      tipo: 'actualizar',
      fileId: 'hoja1',
    });
  });

  it('el webViewLink del listado corresponde al archivo que se actualiza', () => {
    // El handler toma `existentes[0].webViewLink` en vez de un files.get extra:
    // vale porque eligeOperacion se queda justamente con el primero.
    const existentes = [
      {
        id: 'hoja1',
        webViewLink: 'https://docs.google.com/spreadsheets/d/hoja1',
      },
      {
        id: 'hoja2',
        webViewLink: 'https://docs.google.com/spreadsheets/d/hoja2',
      },
    ];
    const op = eligeOperacion(existentes);
    expect(op.fileId).toBe(existentes[0].id);
  });
});

describe('hoja — lo que el verificador encontró blando', () => {
  const itemBase = { nombre: 'Anillo', unitario: "$1'000.000", total: "$1'000.000" };
  const quoteCon = (unidades) => ({
    items: [{ ...itemBase, unidades }],
    total: "$1'000.000",
  });

  it('rechaza unidades que no son un entero positivo, en vez de convertirlas', () => {
    // `Number('')` es 0, `Number(true)` es 1 y `Number([3])` es 3: los tres pasaban por
    // `Number.isFinite` y salían impresos como una cantidad que nadie pidió.
    for (const basura of ['', true, [3], -5, 0, 2.5, '3']) {
      expect(() => filasDeCotizacion(quoteCon(basura))).toThrow(/unidades inválidas/);
    }
  });

  it('unidades ausentes siguen siendo 1, y un entero positivo pasa tal cual', () => {
    expect(filasDeCotizacion(quoteCon(undefined))[1]).toContain('1');
    expect(filasDeCotizacion(quoteCon(10))[1]).toContain('10');
  });

  it('el encabezado devuelto es una COPIA: tocarlo no corrompe la constante', () => {
    const filas = filasDeCotizacion(quoteCon(1));
    expect(filas[0]).not.toBe(ENCABEZADOS); // referencia distinta…
    expect(filas[0]).toEqual(ENCABEZADOS); // …pero mismo contenido
    filas[0][0] = 'MUTADO';
    expect(ENCABEZADOS[0]).not.toBe('MUTADO');
  });

  it('rangoDeEscritura pasa de la Z sin romperse y no acepta cero filas', () => {
    expect(rangoDeEscritura([new Array(8).fill('x')])).toBe('A1:H1');
    // 'A1:[1' era el rango inválido que salía de String.fromCharCode(64 + 27).
    expect(rangoDeEscritura([new Array(27).fill('x')])).toBe('A1:AA1');
    expect(rangoDeEscritura([new Array(52).fill('x')])).toBe('A1:AZ1');
    expect(() => rangoDeEscritura([])).toThrow(/sin filas/);
  });
});
