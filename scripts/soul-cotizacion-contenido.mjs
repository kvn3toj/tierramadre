/**
 * Contenido canónico de la Cotización Soul — 28 de julio de 2026.
 * Fuente única de verdad para el script que edita la presentación.
 *
 * Formato de cifras: se respeta el estilo de la casa del deck original
 * (apóstrofo tipográfico ’ como separador de millones: $8’000.000).
 */

export const ENCABEZADO = {
  titulo: 'Cotización Formal',
  fecha: '28 de julio de 2026',
  ciudad: 'Bogotá, Colombia',
  validez: '15 días',
  moneda: 'COP · Pesos colombianos',
  iva: 'No incluido',
};

export const LINEAS = [
  {
    n: '01',
    unidades: 200,
    titulo: 'Manilla de cuero 100% natural tipo exportación',
    para: 'Hombre y Mujer',
    desglose: '100 hombre + 100 mujer',
    gemas: null,
    joya:
      'Incluye mecanismo y módulos. Materiales de mecanismos y módulos ' +
      'con alineación y marca de SOUL.',
    unitario: 190_000,
    total: 38_000_000,
  },
  {
    n: '02',
    unidades: 8,
    titulo: 'Anillo Nexus',
    para: null,
    desglose: null,
    gemas: 'Esmeralda colombiana F2 · talla cuadrada',
    joya: 'Montura en Oro 18 k · 3 g',
    unitario: 4_000_000,
    total: 32_000_000,
  },
  {
    n: '03',
    unidades: 8,
    titulo: 'Manilla Tenis',
    para: null,
    desglose: null,
    gemas: '22 esmeraldas colombianas',
    joya: 'Joya en Oro 18 k · 6 g',
    unitario: 5_500_000,
    total: 44_000_000,
  },
  {
    n: '04',
    unidades: 1,
    titulo: 'Anillo Trinity',
    para: null,
    desglose: null,
    gemas: 'Esmeralda colombiana · talla redonda',
    joya: 'Montura en Oro 18 k · 3,5 g',
    unitario: 2_820_000,
    total: 2_820_000,
  },
];

export const NOTAS = [
  'Los precios incluyen materiales de mecanismos y módulos.',
  'Para joyería en oro 18 k: el peso y el quilataje están especificados por ítem.',
  'Tiempo de entrega: a confirmar según disponibilidad de materiales.',
  'Forma de pago: 90 % anticipo, 10 % contra entrega.',
];

export const TOTAL_UNIDADES = LINEAS.reduce((a, l) => a + l.unidades, 0); // 217
export const TOTAL_PLAN = LINEAS.reduce((a, l) => a + l.total, 0); // 116.820.000

/** Formatea al estilo del deck: $8’000.000 (apóstrofo para millones). */
export function money(n) {
  const s = n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  // es-CO usa punto como separador de miles: 116.820.000 → 116’820.000
  const partes = s.split('.');
  if (partes.length >= 3) {
    return '$' + partes[0] + '’' + partes.slice(1).join('.');
  }
  return '$' + s;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('COTIZACIÓN SOUL —', ENCABEZADO.fecha);
  console.log('Ciudad:', ENCABEZADO.ciudad, '· Validez:', ENCABEZADO.validez);
  console.log('Moneda:', ENCABEZADO.moneda, '· IVA:', ENCABEZADO.iva, '\n');
  for (const l of LINEAS) {
    console.log(
      `Línea ${l.n} · ${l.unidades} u · ${l.titulo}\n` +
        `   unitario ${money(l.unitario)}  →  total ${money(l.total)}`,
    );
  }
  console.log(`\nTOTAL: ${TOTAL_UNIDADES} unidades · ${money(TOTAL_PLAN)}`);
}
