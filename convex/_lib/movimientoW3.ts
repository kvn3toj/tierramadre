/**
 * W3 — el modelo de eventos unificado.
 *
 * Todo lo que le pasa a una pieza después de existir es un **movimiento**, y la
 * venta es un tipo de movimiento, no un flujo aparte. Hoy en Fotosíntesis son
 * dos rieles separados que se parecen mucho (`sales.create` y
 * `asesorMovements`), y por esa separación el caso real del ítem 5 de Pablo
 * Loaiza —vendido, cobro pendiente— nunca entró como venta.
 *
 * Los tres candados que viven acá:
 *
 *  1. **Una venta sin `precioVentaRealCOP` no se puede registrar.** Ese campo
 *     vacío en 102 filas dejó dormida la mitad analítica del modelo: el lote 3
 *     se vendió y cobró $9.000.000 y la hoja nunca lo vio.
 *  2. **Vender una modalidad bloquea a sus hermanas** (`modalidadGrupo`). C-010
 *     está escrito en tres filas —el bulto y sus dos partes, las mismas 6
 *     piezas— y hoy nada impide venderlo dos veces.
 *  3. **La captura condicional por forma de pago es obligatoria.** Un pago sin
 *     su respaldo (recibo, transacción, fechas) es cartera que después nadie
 *     puede rastrear.
 *
 * Puro, sin IO. La mutation pre-lee la casilla y sus hermanas y delega acá.
 */

export type TipoMovimiento = 'VENTA' | 'CONSIGNACION' | 'DEVOLUCION' | 'ASESOR';

export type FormaPagoVenta = 'efectivo' | 'transferencia' | 'credito';

export interface BloqueVenta {
  cliente: string;
  /** OBLIGATORIO. Es el dato que enciende margen, utilidad, ROI y cartera. */
  precioVentaRealCOP: number;
  comisionPct?: number;
  pagoComisionesA?: string;
  formaPago: FormaPagoVenta;
  efectivo?: { numeroRecibo: string; recibidoPor: string; ubicacion?: string };
  transferencia?: {
    numeroCuenta: string;
    titular: string;
    banco: string;
    numeroTransaccion: string;
  };
  credito?: { fechaInicio: string; fechaPago: string };
}

export interface MovimientoInput {
  tipo: TipoMovimiento;
  fecha: string;
  itemIds: string[];
  entregadoPor: string;
  recibidoPor: string;
  condicion?: string;
  notas?: string;
  venta?: BloqueVenta;
  /** Enlaza la graduación consignación → venta. */
  origenKardexEventId?: string;
}

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** El estado en que queda la pieza según el tipo de movimiento. */
export function efectoSobreCasilla(tipo: TipoMovimiento): string {
  switch (tipo) {
    case 'VENTA':
      return 'VENDIDA';
    case 'CONSIGNACION':
      return 'EN_CONSIGNACION';
    case 'DEVOLUCION':
      return 'DISPONIBLE';
    case 'ASESOR':
      return 'ASESOR';
  }
}

function exigeTexto(valor: string | undefined, campo: string): string {
  if (!valor?.trim()) throw new Error(`${campo} es obligatorio.`);
  return valor.trim();
}

function validarBloqueVenta(venta: BloqueVenta): void {
  exigeTexto(venta.cliente, 'cliente');

  if (
    typeof venta.precioVentaRealCOP !== 'number' ||
    !Number.isFinite(venta.precioVentaRealCOP) ||
    venta.precioVentaRealCOP <= 0
  ) {
    throw new Error(
      'el precio de venta real es obligatorio y debe ser positivo: es el dato ' +
        'que enciende margen, utilidad, ROI y cartera. Sin él la venta existe ' +
        'para el inventario pero no para el modelo — el defecto que dejó 102 ' +
        'filas de la hoja sin análisis.',
    );
  }

  switch (venta.formaPago) {
    case 'efectivo':
      if (!venta.efectivo?.numeroRecibo?.trim()) {
        throw new Error(
          'un pago en efectivo exige número de recibo de caja y quién recibió.',
        );
      }
      exigeTexto(venta.efectivo.recibidoPor, 'efectivo.recibidoPor');
      break;
    case 'transferencia':
      if (
        !venta.transferencia?.numeroCuenta?.trim() ||
        !venta.transferencia?.titular?.trim() ||
        !venta.transferencia?.numeroTransaccion?.trim()
      ) {
        throw new Error(
          'una transferencia exige cuenta, titular, banco y número de ' +
            'transacción: sin respaldo el cobro no se puede rastrear.',
        );
      }
      break;
    case 'credito':
      if (
        !venta.credito?.fechaInicio?.trim() ||
        !venta.credito?.fechaPago?.trim()
      ) {
        throw new Error(
          'una venta a crédito exige fecha de inicio y fecha de pago: es lo ' +
            'que convierte la venta en cartera con vencimiento.',
        );
      }
      break;
    default:
      throw new Error(`forma de pago desconocida: ${venta.formaPago}`);
  }
}

export function validarMovimiento(input: MovimientoInput): MovimientoInput {
  if (!FECHA_ISO.test(input.fecha ?? '')) {
    throw new Error(`fecha debe ser AAAA-MM-DD (recibí "${input.fecha}").`);
  }
  if (!input.itemIds?.length) {
    throw new Error('un movimiento necesita al menos un ítem.');
  }
  if (new Set(input.itemIds).size !== input.itemIds.length) {
    throw new Error(
      'hay ítems repetidos en el movimiento: cada pieza se mueve una sola vez.',
    );
  }
  exigeTexto(input.entregadoPor, 'entregadoPor');
  exigeTexto(input.recibidoPor, 'recibidoPor');

  if (input.tipo === 'VENTA') {
    if (!input.venta) {
      throw new Error(
        'una venta exige su bloque de venta (cliente, precio real y forma de ' +
          'pago).',
      );
    }
    validarBloqueVenta(input.venta);
  } else if (input.venta) {
    throw new Error(
      `un movimiento de tipo ${input.tipo} no lleva bloque de venta. Si hubo ` +
        `plata de por medio, el tipo correcto es VENTA — con el tipo ` +
        `equivocado la venta queda fuera de todos los totales.`,
    );
  }

  return input;
}

export interface VeredictoVenta {
  ok: boolean;
  motivo?: string;
}

/**
 * Si una pieza se puede vender.
 *
 * Una pieza EN_CONSIGNACION **sí** se puede vender: eso es exactamente la
 * graduación (W5). Bloquearla obligaría a devolverla primero para volver a
 * sacarla, y esa fricción es la que hace que las ventas del comercializador no
 * se registren.
 *
 * `hermanas` son las otras modalidades del mismo `modalidadGrupo` (caso C-010:
 * vender el bulto completo tiene que impedir vender sus partes por separado).
 */
export function puedeVenderse(
  casilla: { estadoCasilla: string },
  hermanas: readonly { itemId: string; estadoCasilla: string }[],
): VeredictoVenta {
  if (casilla.estadoCasilla === 'VENDIDA') {
    return { ok: false, motivo: 'la pieza ya está vendida.' };
  }

  const hermanaVendida = hermanas.find((h) => h.estadoCasilla === 'VENDIDA');
  if (hermanaVendida) {
    return {
      ok: false,
      motivo:
        `otra modalidad de la misma mercancía ya se vendió (ítem ` +
        `${hermanaVendida.itemId}). Son las mismas piezas escritas de dos ` +
        `formas: venderlas dos veces vendería inventario que no existe.`,
    };
  }

  return { ok: true };
}
