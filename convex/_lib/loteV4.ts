/**
 * Las reglas de captura del lote W1 — el «Cerebro Racional» de la spec.
 *
 * Todo lo que aquí se valida es exactamente lo que la hoja NO puede obligar. La
 * más cara: la **categoría fiscal**, el campo que decide gema (divisor 0,60) o
 * joya (0,41). En el Modelo v2 esa columna quedó vacía en 102 filas con el
 * desplegable roto, y sin ella 60 de 63 lotes se cotizaron con divisor 0,70 —
 * 1% de margen real declarando 30%.
 *
 * Puro y sin IO, para poder testearlo: la mutation pre-lee lo que necesite y
 * delega aquí las decisiones branchy (el patrón de `lotMath.ts`).
 *
 * Ojo con la asimetría respecto al motor: aquí `mixta` es un valor LEGÍTIMO del
 * lote —la forma honesta de decir «vienen las dos»—, mientras que
 * `motorPrecios.exigeCategoriaFiscal` la rechaza. Es deliberado: un lote mixto
 * no se cotiza como bloque; cada casilla declara la suya antes de tener precio.
 */

/** La categoría a nivel LOTE. `mixta` se resuelve después, casilla por casilla. */
export type CategoriaFiscalLote = 'gema' | 'joya' | 'mixta';

const CATEGORIAS_LOTE: readonly string[] = ['gema', 'joya', 'mixta'];

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Un costo variable capturado como documento: sin concepto no es auditable. */
export interface CostoVariable {
  concepto: string;
  montoCOP: number;
}

/** El bloque de joyería, obligatorio cuando el lote es de joyas. */
export interface BloqueJoya {
  tipoJoya: string;
  mineral: string;
  gramaje: number;
  costoPorGramoCOP: number;
  presupuestoJoyaCOP?: number;
}

export interface LoteV4Input {
  categoriaFiscal: CategoriaFiscalLote;
  costoCompraCOP: number;
  unidadesDeclaradas: number;
  formaPago: string;
  fechaRecepcion: string;
  metodoContado?: string;
  fechaVencimiento?: string;
  numeroCuotas?: number;
  costosVariables?: CostoVariable[];
  abonoCOP?: number;
  joya?: BloqueJoya;
}

export interface LoteV4Validado {
  categoriaFiscal: CategoriaFiscalLote;
  /** true cuando el lote es `mixta`: cada casilla deberá declarar la suya. */
  exigeCategoriaPorCasilla: boolean;
  costoCompraCOP: number;
  costosVariablesCOP: number;
  /** Costo de compra + costos variables — el landed cost del lote. */
  costoTotalCOP: number;
  unidadesDeclaradas: number;
  abonoCOP: number;
  saldoCOP: number;
  joya?: BloqueJoya;
  /** Marca el lote como del modelo nuevo: el wizard viejo debe rechazarlo. */
  origenModelo: 'v4';
}

function exigePositivo(n: unknown, campo: string): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    throw new Error(`${campo} debe ser un número positivo (recibí ${n}).`);
  }
  return n;
}

/**
 * Suma los costos variables del lote (viáticos, packing, domicilio).
 *
 * Se capturan como documentos con concepto, no como un campo editable: el punto
 * es poder decir DE QUÉ fue el ajuste. Un monto suelto en el costo es
 * indistinguible de un dedazo, y así es como un lote termina con un costo que
 * nadie sabe explicar.
 */
export function costosVariablesTotal(
  costos: readonly CostoVariable[] | undefined,
): number {
  if (!costos?.length) return 0;
  return costos.reduce((acc, c) => {
    if (!c.concepto?.trim()) {
      throw new Error(
        'cada costo variable necesita un concepto: un ajuste sin nombre no es ' +
          'auditable después.',
      );
    }
    if (!Number.isFinite(c.montoCOP) || c.montoCOP < 0) {
      throw new Error(
        `monto inválido en el costo variable "${c.concepto}" (recibí ${c.montoCOP}).`,
      );
    }
    return acc + c.montoCOP;
  }, 0);
}

/**
 * Lo que falta por pagarle al PROVEEDOR: `costo de compra − abonos`.
 *
 * Los costos variables **no entran**. Son landed cost: capitalizan al costo del
 * lote para efectos de precio, pero se le pagan a terceros —la transportadora,
 * quien empaca—, no al proveedor de la piedra. Sumarlos infla la cuenta por
 * pagar con plata que se le debe a otro, o que ya se pagó de contado.
 *
 * (Antes recibía el landed cost y por eso un abono que saldaba al proveedor
 * dejaba un saldo fantasma igual a los viáticos.)
 *
 * Si algún día un proveedor cobra él mismo el domicilio, eso se modela
 * agregando un `acreedor` opcional al costo variable — NO volviendo a sumarlo
 * todo al saldo. Punto de extensión documentado, no construido.
 *
 * Un abono mayor al costo daría saldo negativo — un dato imposible que después
 * nadie sabe leer. O el abono está mal o el costo lo está; que lo resuelva quien
 * captura, no un `Math.max(0, …)` que esconde el problema.
 */
export function saldoProveedor(
  costoCompraCOP: number,
  abonoCOP: number | undefined,
): number {
  const abono = abonoCOP ?? 0;
  if (!Number.isFinite(abono) || abono < 0) {
    throw new Error(`abonoCOP inválido (recibí ${abono}).`);
  }
  if (abono > costoCompraCOP) {
    throw new Error(
      `el abono (${abono}) supera el costo de compra del lote ` +
        `(${costoCompraCOP}): revisá cuál de los dos está mal antes de ` +
        `guardar. Los costos variables no cuentan acá — se le pagan a ` +
        `terceros, no al proveedor.`,
    );
  }
  return costoCompraCOP - abono;
}

/**
 * Valida la captura de un lote W1 y devuelve los campos derivados.
 *
 * El orden importa: la categoría fiscal se valida PRIMERO, porque es la que
 * decide qué otros bloques son obligatorios y porque es el gate del wizard.
 */
export function validarLoteV4(input: LoteV4Input): LoteV4Validado {
  const categoriaFiscal = input?.categoriaFiscal;
  if (!CATEGORIAS_LOTE.includes(categoriaFiscal as string)) {
    throw new Error(
      `categoría fiscal obligatoria: se esperaba "gema", "joya" o "mixta", ` +
        `recibí ${JSON.stringify(categoriaFiscal)}. Es el campo que decide el ` +
        `divisor (0,60 contra 0,41) y no tiene default.`,
    );
  }

  if (categoriaFiscal === 'joya' && !input.joya) {
    throw new Error(
      'un lote de categoría "joya" exige su bloque joya (tipo, mineral, ' +
        'gramaje y costo por gramo).',
    );
  }
  if (categoriaFiscal === 'gema' && input.joya) {
    throw new Error(
      'un lote de categoría "gema" no puede traer bloque joya: la categoría y ' +
        'los datos se contradicen.',
    );
  }
  if (input.joya) {
    exigePositivo(input.joya.gramaje, 'gramaje');
    exigePositivo(input.joya.costoPorGramoCOP, 'costoPorGramoCOP');
  }

  const costoCompraCOP = exigePositivo(input.costoCompraCOP, 'costoCompraCOP');

  if (
    !Number.isInteger(input.unidadesDeclaradas) ||
    input.unidadesDeclaradas < 1
  ) {
    throw new Error(
      `unidadesDeclaradas debe ser un entero de al menos 1 (recibí ` +
        `${input.unidadesDeclaradas}). Son las casillas que se van a crear.`,
    );
  }

  if (!FECHA_ISO.test(input.fechaRecepcion ?? '')) {
    throw new Error(
      `fechaRecepcion debe ser AAAA-MM-DD (recibí "${input.fechaRecepcion}").`,
    );
  }

  // Las mismas guardas de forma de pago que ya exige el riel viejo
  // (`convex/lots.ts:154-160`), para que los dos caminos no se contradigan.
  if (input.formaPago === 'credito' && !input.fechaVencimiento) {
    throw new Error('una compra a crédito exige fecha de vencimiento.');
  }
  if (input.formaPago === 'contado' && !input.metodoContado) {
    throw new Error(
      'una compra de contado exige método (efectivo, transferencia…).',
    );
  }

  const costosVariablesCOP = costosVariablesTotal(input.costosVariables);
  const costoTotalCOP = costoCompraCOP + costosVariablesCOP;
  const abonoCOP = input.abonoCOP ?? 0;

  return {
    categoriaFiscal,
    exigeCategoriaPorCasilla: categoriaFiscal === 'mixta',
    costoCompraCOP,
    costosVariablesCOP,
    costoTotalCOP,
    unidadesDeclaradas: input.unidadesDeclaradas,
    abonoCOP,
    // Contra el costo de COMPRA, no el landed: la deuda es con el proveedor.
    saldoCOP: saldoProveedor(costoCompraCOP, abonoCOP),
    joya: input.joya,
    origenModelo: 'v4',
  };
}
