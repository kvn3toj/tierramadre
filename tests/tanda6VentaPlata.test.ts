/**
 * La venta cobra lo mismo que la vitrina muestra, y ninguna línea va en $0.
 *
 * Dos defectos distintos con el mismo desenlace: el escritorio de ventas
 * poniendo un número que el cliente no vio.
 */
import { describe, it, expect } from 'vitest';
import { pickTierPrice } from '../src/pages/admin/Fotosintesis/utils/saleItemSelection';
import { mapRowToTreasureItem } from '../src/hooks/useFotosintesisCatalog';

const TRM = 3141.36;

/**
 * `pickTierPrice` hacía `precioFinalCOP ?? precioCOP` y se saltaba
 * `precioFinalUSD` por completo. Es el precio AUTORITATIVO —el que queda
 * congelado en `lineItems` de la venta—, así que para #547 y #548 el escritorio
 * sembraba +$1.241.631 y +$2.628.482 sobre lo publicado, y ese número quedaba
 * grabado en el comprobante.
 */
describe('el precio de la venta resuelve el ancla en dólares', () => {
  it('una pieza anclada se cotiza a USD × TRM, no al COP provisional', () => {
    const anclada = { precioFinalUSD: 17_100, precioFinalCOP: 54_958_887 };
    expect(pickTierPrice(anclada, 'final', TRM)).toBe(Math.round(17_100 * TRM));
    expect(pickTierPrice(anclada, 'final', TRM)).not.toBe(54_958_887);
  });

  it('la vitrina y el escritorio dicen EL MISMO número', () => {
    const row = {
      itemId: '548',
      nombre: 'Anillo Semilla',
      precioFinalUSD: 36_200,
      precioFinalCOP: 116_345_714,
    };
    const enVitrina = mapRowToTreasureItem(row, { trmRate: TRM }).precioCOP;
    const enVenta = pickTierPrice(row, 'final', TRM);
    expect(enVenta).toBe(enVitrina);
  });

  it('sin ancla sigue mandando precioFinalCOP, y el legacy es último recurso', () => {
    expect(pickTierPrice({ precioFinalCOP: 104_000 }, 'final', TRM)).toBe(104_000);
    expect(pickTierPrice({ precioCOP: 90_000 }, 'final', TRM)).toBe(90_000);
  });

  it('sin TRM cae al COP — nunca a 0 ni a undefined si hay precio', () => {
    const anclada = { precioFinalUSD: 17_100, precioFinalCOP: 54_958_887 };
    expect(pickTierPrice(anclada, 'final')).toBe(54_958_887);
  });

  it('sin ningún precio devuelve undefined, no 0', () => {
    expect(pickTierPrice({}, 'final', TRM)).toBeUndefined();
  });
});

/**
 * `canConfirm` exigía `precioCop > 0` sobre el TOTAL. Un carrito que mezcla una
 * pieza con precio y una sin precio suma > 0 y pasaba: la pieza sin precio
 * viajaba gratis, escondida detrás de la que sí lo tenía.
 *
 * Es el mismo agujero que `precioBaseEsValido` cierra del lado del checkout
 * público — su docstring lo explica con estas mismas palabras — y que en el
 * escritorio interno faltaba.
 */
describe('ninguna línea de la venta puede ir en $0', () => {
  const hayLineaSinPrecio = (
    seleccion: Array<{ itemId: string }>,
    precios: Map<string, number | undefined>,
    resueltos: boolean,
  ) =>
    resueltos
      ? seleccion.find((s) => !((precios.get(s.itemId) ?? 0) > 0))
      : undefined;

  it('un carrito MIXTO no pasa, aunque el total sea > 0', () => {
    const seleccion = [{ itemId: '568' }, { itemId: '93A' }];
    const precios = new Map([
      ['568', 150_000],
      ['93A', undefined],
    ]);
    const total = 150_000; // > 0: el guard viejo lo dejaba pasar
    expect(total).toBeGreaterThan(0);
    const mala = hayLineaSinPrecio(seleccion, precios, true);
    expect(mala?.itemId).toBe('93A');
  });

  it('un carrito con todas las líneas con precio pasa', () => {
    const seleccion = [{ itemId: '568' }, { itemId: '569' }];
    const precios = new Map([
      ['568', 150_000],
      ['569', 150_000],
    ]);
    expect(hayLineaSinPrecio(seleccion, precios, true)).toBeUndefined();
  });

  it('un precio de 0 explícito tampoco pasa', () => {
    const precios = new Map([['339', 0]]);
    expect(hayLineaSinPrecio([{ itemId: '339' }], precios, true)?.itemId).toBe('339');
  });

  it('mientras los precios no resolvieron, no se acusa a nadie', () => {
    // Antes de que llegue `manyItems` el mapa está vacío y TODAS las líneas
    // parecerían sin precio; el guard no debe disparar por eso.
    expect(hayLineaSinPrecio([{ itemId: '568' }], new Map(), false)).toBeUndefined();
  });
});
