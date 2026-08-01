/**
 * El preview del motor que W1 muestra ANTES de guardar el lote.
 *
 * Cambia la naturaleza de la captura. Hoy el operador escribe un costo y se
 * entera del precio después, en otra hoja, calculado por otra persona; para
 * cuando el número aparece, la compra ya se hizo. Con el preview la consecuencia
 * económica se ve mientras se captura — y con ella las dos señales que la hoja
 * nunca dio a tiempo: que el gasto fijo pesa más que la mercancía, y cuánto
 * cambia el precio según la categoría fiscal que se elija.
 *
 * Puro: no lee la base ni el reloj. La query de Convex resuelve el fijo unitario
 * vigente y la config, y le pasa todo hecho.
 */
import {
  calcularK,
  divisorObjetivo,
  margenNetoReal,
  multiplicadorInformativo,
  pisoReal,
  precioVenta,
  type CategoriaFiscal,
  type ConfigPrecios,
} from './motorPrecios';
import type { CategoriaFiscalLote } from './loteV4';

export type NivelAdvertencia = 'info' | 'alerta';

export interface Advertencia {
  codigo:
    | 'REMATE_VIGENTE'
    | 'FIJO_PESA_MAS'
    | 'REPARTO_REFERENCIAL'
    | 'MIXTA_SIN_PRECIO'
    | 'SIN_COSTO_CAPTURADO';
  nivel: NivelAdvertencia;
  texto: string;
}

export interface PreviewLoteInput {
  costoCompraCOP: number;
  costosVariablesCOP?: number;
  categoriaFiscal: CategoriaFiscalLote;
  costoFijoUnitarioCOP: number;
  /** `AAAA-MM-DD`. Decide el régimen; nunca sale del reloj. */
  fecha: string;
  config: ConfigPrecios;
  unidadesDeclaradas?: number;
}

export interface PreviewLote {
  /**
   * Costo + variables + fijo. Ausente cuando no hay costo capturado: sin
   * mercancía que absorber, `K` sería el gasto fijo disfrazado de costo.
   */
  K?: number;
  /** false para un lote `mixta`: no hay un divisor único que aplicarle. */
  cotizable: boolean;
  enRemate: boolean;
  /** Qué porcentaje de `K` es puro gasto de estructura. */
  pesoDelFijoPct: number;
  advertencias: Advertencia[];

  // Presentes solo cuando el lote es cotizable:
  pisoCOP?: number;
  precioCOP?: number;
  regla?: 'remate' | 'objetivo';
  margenNetoPct?: number;
  /** `precio / costo de compra` — informativo (regla §4.3), nunca un insumo. */
  multiplicador?: number;
  /** Reparto referencial del precio del lote. NO es el precio de cada pieza. */
  precioPorUnidadCOP?: number;
  /** Lo que costaría con el divisor de la otra categoría — la brecha del 46%. */
  precioSiFueraLaOtraCategoriaCOP?: number;
}

export function construirPreviewLote(input: PreviewLoteInput): PreviewLote {
  const {
    costoCompraCOP,
    costosVariablesCOP = 0,
    categoriaFiscal,
    costoFijoUnitarioCOP,
    fecha,
    config,
    unidadesDeclaradas,
  } = input;

  const enRemate = fecha <= config.remateHasta;

  // Un lote sin costo capturado NO cotiza (dictamen de Kevin, 2026-08-01, caso
  // C-085 del SOT vivo: costo 0 y cotizando igual). Su «precio» salía de dividir
  // solo el gasto fijo, o sea 100% estructura y 0% mercancía — un número con
  // forma de precio que no lo es. Se avisa en vez de reventar: reventar dejaría
  // al operador sin pantalla, y devolver 0 sería peor todavía.
  if (
    typeof costoCompraCOP !== 'number' ||
    !Number.isFinite(costoCompraCOP) ||
    costoCompraCOP <= 0
  ) {
    return {
      cotizable: false,
      enRemate,
      pesoDelFijoPct: 100,
      advertencias: [
        {
          codigo: 'SIN_COSTO_CAPTURADO',
          nivel: 'alerta',
          texto:
            'Lote sin costo capturado: no se puede cotizar. Un precio calculado ' +
            'solo sobre el gasto fijo sería 100% estructura y 0% mercancía — ' +
            'parece un precio y no lo es. Capturá el costo de compra primero.',
        },
      ],
    };
  }

  const K = calcularK({
    costoCompraCOP,
    costosVariablesCOP,
    costoFijoUnitarioCOP,
  });
  const pesoDelFijoPct = (costoFijoUnitarioCOP / K) * 100;
  const advertencias: Advertencia[] = [];

  if (enRemate) {
    advertencias.push({
      codigo: 'REMATE_VIGENTE',
      nivel: 'info',
      texto:
        `REMATE vigente hasta ${config.remateHasta}: el precio sale de ` +
        `K × ${config.multRemateGema} en gema y K × ${config.multRemateJoya} ` +
        `en joya. Desde el día siguiente vuelve a regir el objetivo.`,
    });
  }

  if (costoFijoUnitarioCOP > costoCompraCOP) {
    advertencias.push({
      codigo: 'FIJO_PESA_MAS',
      nivel: 'alerta',
      texto:
        `El gasto fijo (${costoFijoUnitarioCOP}) pesa más que la mercancía ` +
        `(${costoCompraCOP}): ${pesoDelFijoPct.toFixed(1)}% de K es estructura, ` +
        `no piedra. El lote se puede comprar igual, pero que sea una decisión.`,
    });
  }

  // Un lote mixto no tiene un divisor único, así que no se cotiza como bloque.
  // K sí se calcula: no depende del régimen fiscal.
  if (categoriaFiscal === 'mixta') {
    advertencias.push({
      codigo: 'MIXTA_SIN_PRECIO',
      nivel: 'info',
      texto:
        'Lote mixto: el precio se resuelve casilla por casilla, cuando cada ' +
        'pieza declare si es gema o joya. Aquí solo se puede mostrar K.',
    });
    return { K, cotizable: false, enRemate, pesoDelFijoPct, advertencias };
  }

  const categoria = categoriaFiscal as CategoriaFiscal;
  const otra: CategoriaFiscal = categoria === 'gema' ? 'joya' : 'gema';

  const precio = precioVenta({ K, categoria, fecha, config });

  const precioOtra = enRemate
    ? Math.round(
        K * (otra === 'joya' ? config.multRemateJoya : config.multRemateGema),
      )
    : Math.round(K / divisorObjetivo(otra, config));

  let precioPorUnidadCOP: number | undefined;
  if (unidadesDeclaradas && unidadesDeclaradas > 0) {
    precioPorUnidadCOP = Math.round(precio.precioCOP / unidadesDeclaradas);
    advertencias.push({
      codigo: 'REPARTO_REFERENCIAL',
      nivel: 'info',
      texto:
        'El precio por unidad es un reparto referencial para encuadrar la ' +
        'compra. El precio real de cada pieza sale de su costo unitario ' +
        'capturado en la casilla, jamás de dividir el lote.',
    });
  }

  return {
    K,
    cotizable: true,
    enRemate,
    pesoDelFijoPct,
    advertencias,
    pisoCOP: pisoReal(K, categoria, config),
    precioCOP: precio.precioCOP,
    regla: precio.regla,
    margenNetoPct: margenNetoReal(precio.precioCOP, K, categoria, config),
    multiplicador: multiplicadorInformativo(precio.precioCOP, costoCompraCOP),
    precioPorUnidadCOP,
    precioSiFueraLaOtraCategoriaCOP: precioOtra,
  };
}
