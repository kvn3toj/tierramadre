/**
 * El motor de precios del Modelo v2 — «Comercializadora», port a Convex.
 *
 * La idea central, fácil de equivocar: **el precio no sale del valor de la
 * piedra, sale de cuánto gasto fijo debe absorber cada unidad.** Eso es `K`.
 *
 * Este archivo es un PORT de `anima-bot/src/cotizador/precios.ts`, con paridad
 * pinneada en `tests/motorPrecios.test.ts` contra los mismos números reales que
 * la auditoría del 2026-07-25 verificó en el archivo vivo. Los dos motores no
 * pueden divergir en silencio (regla §4.6 de la spec de wizards): si cambia el
 * modelo, cambia en los dos, y los tests de paridad lo delatan.
 *
 * Puro: sin IO de Convex y **sin leer el reloj**. La fecha entra por parámetro
 * porque qué régimen aplica es un hecho de negocio sobre la cotización, no sobre
 * cuándo corre el proceso — si el motor mirara `Date.now()`, el 1 de septiembre
 * repreciaría solo lo que ya se había acordado en agosto.
 *
 * Dos divergencias deliberadas contra anima-bot, ambas para no reimportar los
 * defectos de la hoja:
 *
 *  1. `costoFijoUnitarioCOP` es OBLIGATORIO. En anima-bot cae a una constante;
 *     aquí sale de `configPrecios ÷ COUNT(lotes activos)` (decisión D2). Un
 *     default sería exactamente la constante muerta del defecto `B5`/`E6`, que
 *     dejó a todo el inventario cotizado sin absorber un peso de gasto fijo.
 *  2. La categoría fiscal ausente LANZA. TypeScript ya la exige en anima-bot,
 *     pero aquí el dato viene de la base, donde puede faltar — como falta hoy en
 *     las 102 filas de la hoja cuya columna «Tipo de Joya» quedó vacía.
 */

/**
 * El régimen fiscal de una pieza. Las gemas no llevan IVA; las joyas sí, y esa
 * única asimetría parte el modelo en dos: cotizar con el divisor equivocado
 * mueve el precio un 46%.
 *
 * `mixta` NO existe aquí a propósito: es un estado del LOTE («todavía no se
 * sabe, se resuelve casilla por casilla»), nunca una categoría cotizable.
 */
export type CategoriaFiscal = 'gema' | 'joya';

/**
 * Los supuestos del modelo, con vigencia por fecha — el equivalente de
 * `Fijacion_Precios!B4:B12`, pero versionado.
 *
 * Que tenga `vigenteDesde` es lo que impide el defecto más caro de una tabla de
 * parámetros: cambiar la tasa este mes y repreciar retroactivamente lo que ya se
 * vendió con la tasa vieja.
 */
export interface ConfigPrecios {
  /** ISO `AAAA-MM-DD`. La regla rige desde este día, inclusive. */
  vigenteDesde: string;
  /** Gastos fijos mensuales asignados (`B5`). */
  gastosFijosMensualesCOP: number;
  /** Comisión comercial promedio, pagada en toda venta (`B8`). */
  comisionPct: number;
  /** IVA de joyería (`B9`). Las gemas sueltas no lo pagan. */
  ivaJoyaPct: number;
  /** Margen neto deseado SOBRE EL PRECIO, no markup sobre costo (`B10`). */
  margenNetoDeseadoPct: number;
  /** Último día del remate, ISO. Después vuelve a regir el objetivo. */
  remateHasta: string;
  /** Multiplicadores sobre `K` mientras el remate está vigente. */
  multRemateGema: number;
  multRemateJoya: number;
}

/**
 * La configuración vigente desde julio 2026, tal como quedó el archivo vivo tras
 * reparar `B5` el 2026-07-25. Es la semilla de la tabla `configPrecios`, no una
 * constante de cálculo: el motor siempre recibe la config que le corresponde a
 * la fecha.
 *
 * El remate (gema ×1,3 · joya ×1,6 hasta el 2026-08-31) existe para ROTAR
 * inventario y liberar caja, no para ganar margen — por eso vence.
 */
export const CONFIG_PRECIOS_2026_07: ConfigPrecios = {
  vigenteDesde: '2026-07-01',
  gastosFijosMensualesCOP: 33_651_815,
  comisionPct: 0.1,
  ivaJoyaPct: 0.19,
  margenNetoDeseadoPct: 0.3,
  remateHasta: '2026-08-31',
  multRemateGema: 1.3,
  multRemateJoya: 1.6,
};

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function exigeFecha(fecha: string, campo = 'fecha'): string {
  if (!FECHA_ISO.test(fecha)) {
    throw new Error(`${campo} debe ser AAAA-MM-DD (recibí "${fecha}").`);
  }
  return fecha;
}

function exigePositivo(n: number, campo: string): number {
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${campo} debe ser un número positivo (recibí ${n}).`);
  }
  return n;
}

/**
 * Valida que haya categoría fiscal y que sea cotizable.
 *
 * Es el candado de la regla dura §4.1. Lo que la hoja no puede hacer —elegir el
 * divisor cuando la columna está vacía— aquí es un error ruidoso en vez de un
 * default silencioso. `mixta` se rechaza igual que la ausencia: un lote mixto no
 * se cotiza, se resuelve casilla por casilla primero.
 */
export function exigeCategoriaFiscal(valor: unknown): CategoriaFiscal {
  if (valor === 'gema' || valor === 'joya') return valor;
  throw new Error(
    `categoría fiscal obligatoria y sin default: se esperaba "gema" o "joya", ` +
      `recibí ${JSON.stringify(valor)}. Un lote "mixta" se resuelve por casilla.`,
  );
}

/**
 * El gasto fijo que absorbe cada lote: gastos fijos del mes ÷ lotes activos.
 *
 * `lotesActivos` viene de un COUNT sobre la tabla (decisión D2: activo = lote con
 * ≥1 unidad no vendida), no de una celda escrita a mano. Eso es lo que hace
 * desaparecer los cuatro conteos en conflicto de la hoja (76 · 63 · 62 · 235):
 * queda uno solo, y es derivado.
 */
export function costoFijoUnitario(
  gastosFijosMensualesCOP: number,
  lotesActivos: number,
): number {
  exigePositivo(gastosFijosMensualesCOP, 'gastosFijosMensualesCOP');
  if (!Number.isInteger(lotesActivos) || lotesActivos <= 0) {
    throw new Error(
      `lotesActivos debe ser un entero positivo (recibí ${lotesActivos}). ` +
        `Sin lotes activos no hay entre qué repartir el gasto fijo.`,
    );
  }
  return Math.round(gastosFijosMensualesCOP / lotesActivos);
}

/**
 * La regla vigente en `fecha`: la de mayor `vigenteDesde` que no sea futura.
 *
 * Lanza si no hay ninguna en vez de caer a la más nueva — cotizar una fecha
 * anterior a toda la configuración conocida es un dato faltante, no un default.
 */
export function configVigenteEn(
  configs: readonly ConfigPrecios[],
  fecha: string,
): ConfigPrecios {
  exigeFecha(fecha);
  // Las fechas ISO comparan bien como string, así que no hay `Date` ni zona
  // horaria que equivocar.
  const vigentes = configs.filter((c) => c.vigenteDesde <= fecha);
  if (!vigentes.length) {
    throw new Error(
      `no hay configuración de precios vigente para ${fecha} ` +
        `(${configs.length} regla(s) conocida(s)).`,
    );
  }
  return vigentes.reduce((mejor, c) =>
    c.vigenteDesde > mejor.vigenteDesde ? c : mejor,
  );
}

/** Lo que el régimen paga del precio de venta, más allá de la comisión. */
function impuestosDe(
  categoria: CategoriaFiscal,
  config: ConfigPrecios,
): number {
  return categoria === 'joya' ? config.ivaJoyaPct : 0;
}

/**
 * `1 − comisión − impuestos − margen deseado` → 0,60 gema · 0,41 joya.
 *
 * Se deriva de la config en vez de escribirse como literal, para que cambiar el
 * margen objetivo no pueda dejar atrás un divisor viejo.
 */
export function divisorObjetivo(
  categoria: CategoriaFiscal,
  config: ConfigPrecios,
): number {
  const divisor =
    1 -
    config.comisionPct -
    impuestosDe(categoria, config) -
    config.margenNetoDeseadoPct;
  if (divisor <= 0) {
    throw new Error(
      `divisor objetivo no positivo (${divisor}) para ${categoria}: ` +
        `comisión + impuestos + margen deseado se comen el precio entero.`,
    );
  }
  return divisor;
}

export interface CalcularKInput {
  /** Lo que costó la mercancía. En una casilla, el costo unitario CAPTURADO. */
  costoCompraCOP: number;
  /** Costos variables del lote (viáticos, packing, domicilio). Ausente ⇒ 0. */
  costosVariablesCOP?: number;
  /** Parte del gasto fijo que absorbe. Obligatorio — ver cabecera del archivo. */
  costoFijoUnitarioCOP: number;
}

/**
 * `K` = costo de compra + costos variables + la parte del gasto fijo.
 *
 * OJO: `K` **no es el punto de equilibrio**. Vender en `K` pierde plata, porque
 * la comisión (y el IVA en joyas) salen del precio de venta y no están dentro de
 * `K`. Para el piso de verdad, `pisoReal`.
 *
 * El costo entra tal cual y el motor no tiene forma de re-derivarlo desde el
 * lote: ese es el candado anti-prorrateo de la regla §4.2 (el prorrateo cotizó
 * «Choker + Piedra» en $67.499 cuando costó $119.999).
 */
export function calcularK(input: CalcularKInput): number {
  exigePositivo(input.costoCompraCOP, 'costoCompraCOP');

  const variables = input.costosVariablesCOP ?? 0;
  if (!Number.isFinite(variables) || variables < 0) {
    throw new Error(`costosVariablesCOP inválido (recibí ${variables}).`);
  }

  const fijo = input.costoFijoUnitarioCOP;
  if (fijo === undefined || fijo === null) {
    throw new Error(
      'costoFijoUnitarioCOP es obligatorio: sale de configPrecios ÷ lotes ' +
        'activos, no de una constante. Sin él el precio no absorbe gasto fijo.',
    );
  }
  if (!Number.isFinite(fijo) || fijo < 0) {
    throw new Error(`costoFijoUnitarioCOP inválido (recibí ${fijo}).`);
  }

  return Math.round(input.costoCompraCOP + variables + fijo);
}

/**
 * El piso real de margen cero: lo que hay que cobrar apenas para no perder
 * plata, ya pagando comisión y —en joya— IVA. `gema: K/0,90 · joya: K/0,71`.
 *
 * La hoja no calcula este número, y es el que deja ver por qué 60 de 63 lotes
 * quedaron cotizados con ~1% de margen real mientras declaraban 30%.
 */
export function pisoReal(
  K: number,
  categoria: CategoriaFiscal,
  config: ConfigPrecios,
): number {
  exigePositivo(K, 'K');
  exigeCategoriaFiscal(categoria);
  return Math.round(
    K / (1 - config.comisionPct - impuestosDe(categoria, config)),
  );
}

/**
 * Margen neto real como porcentaje del precio, después de comisión e impuestos.
 *
 * Separado de `precioVenta` para que un precio que NO salió de la cadena
 * K×multiplicador —una cifra puesta a mano, como el `precioFinalCOP` de SOT v3—
 * pueda reportar un margen honesto contra lo que de verdad se cobra, en vez de
 * mentir con el margen teórico del multiplicador.
 */
export function margenNetoReal(
  precioCOP: number,
  K: number,
  categoria: CategoriaFiscal,
  config: ConfigPrecios,
): number {
  exigePositivo(precioCOP, 'precioCOP');
  exigePositivo(K, 'K');
  const retenido = 1 - config.comisionPct - impuestosDe(categoria, config);
  return ((precioCOP * retenido - K) / precioCOP) * 100;
}

export interface PrecioVentaInput {
  K: number;
  categoria: CategoriaFiscal;
  /** `AAAA-MM-DD`. Decide el régimen; jamás se infiere del reloj. */
  fecha: string;
  config: ConfigPrecios;
}

export interface PrecioVenta {
  precioCOP: number;
  categoria: CategoriaFiscal;
  /** Qué regla produjo el número, para que la UI pueda decirlo en voz alta. */
  regla: 'remate' | 'objetivo';
  /** Se arrastran para que nadie aguas abajo tenga que recalcular (ni diverger). */
  K: number;
  pisoCOP: number;
  /** Margen neto real como % del precio, tras comisión e impuestos. */
  margenNetoPct: number;
}

/**
 * `precio / costo de compra`, SOLO informativo (regla §4.3).
 *
 * Vive aparte de `precioVenta` a propósito: el motor no recibe el costo puro
 * —recibe `K`, que ya lo tiene sumado con el fijo— y dividir por `K` daría otro
 * número, más plano y más tranquilizador. El multiplicador que importa es contra
 * el costo, porque es el que hace visible que un lote barato paga
 * proporcionalmente más gasto fijo (2,85× contra 1,87×).
 *
 * Nunca se acepta como INSUMO. El 2,60× plano aplicado a los 142 ítems de SOT v3
 * sin distinguir gema de joya es exactamente el vicio que este modelo erradica.
 */
export function multiplicadorInformativo(
  precioCOP: number,
  costoCompraCOP: number,
): number {
  exigePositivo(precioCOP, 'precioCOP');
  exigePositivo(costoCompraCOP, 'costoCompraCOP');
  return precioCOP / costoCompraCOP;
}

/**
 * El precio de venta de una pieza, bajo el régimen que gobierne `fecha`.
 *
 * · hasta `config.remateHasta` — `gema K × 1,3` · `joya K × 1,6`
 * · desde el día siguiente   — `gema K / 0,60` · `joya K / 0,41`
 *
 * El remate ancla en `K` con un multiplicador corto para que el asesor tenga UNA
 * cifra defendible que decir de frente, en vez de negociar a la baja desde una
 * inflada.
 */
export function precioVenta(input: PrecioVentaInput): PrecioVenta {
  const { K, fecha, config } = input;
  const categoria = exigeCategoriaFiscal(input.categoria);
  exigePositivo(K, 'K');
  exigeFecha(fecha);
  exigeFecha(config.remateHasta, 'config.remateHasta');

  const enRemate = fecha <= config.remateHasta;
  const multiplicadorRemate =
    categoria === 'joya' ? config.multRemateJoya : config.multRemateGema;

  const precioCOP = enRemate
    ? Math.round(K * multiplicadorRemate)
    : Math.round(K / divisorObjetivo(categoria, config));

  return {
    precioCOP,
    categoria,
    regla: enRemate ? 'remate' : 'objetivo',
    K,
    pisoCOP: pisoReal(K, categoria, config),
    margenNetoPct: margenNetoReal(precioCOP, K, categoria, config),
  };
}
