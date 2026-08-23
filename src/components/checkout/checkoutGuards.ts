/**
 * Guardas puras del checkout — separadas de `CheckoutSheet.tsx` para poder
 * probarlas sin montar el componente (ver `tests/checkoutGuards.test.ts`).
 *
 * FIX CRÍTICO (revisión final, checkout-in-app): un guest podía pagar por una
 * pieza con precio y llevarse gratis una "Consultar precio" en el mismo
 * pedido — con `precioCOP <= 0`, `precioConMarkup` da 0 en ambos lados
 * (`CheckoutSheet` y `convex/ghl.ts`'s `createOrder`), así que el invariante
 * de monto nunca dispara (ambos lados están de acuerdo en 0). La vitrina
 * pública ya se cuidaba de esto (`formatVitrinaPrice` devuelve '' y
 * `PublicProductView` exige `priceLabel !== ''`); el carrito no tenía
 * equivalente.
 *
 * `hayPiezaSinPrecio` es la mitad cliente de la defensa — bloquea la hoja
 * ENTERA (ver `CheckoutSheet.tsx`) en vez de descartar en silencio la pieza
 * sin precio. La mitad servidor es `ZERO_TOTAL` en `convex/ghl.ts`'s
 * `createOrder`, que rechaza cualquier `totalCOP <= 0` sin importar lo que
 * el cliente haya decidido mostrar — esta función NUNCA es la única defensa.
 */

/** Una pieza cuyo precio base decide si el checkout puede cobrarla. */
export interface PiezaConPrecio {
  precioCOP: number;
}

/**
 * `true` si alguna pieza no tiene precio asignado (0, negativo, o cualquier
 * valor que no sea un cobro real — "Consultar precio" en la UI de catálogo).
 */
export function hayPiezaSinPrecio(piezas: readonly PiezaConPrecio[]): boolean {
  return piezas.some((p) => p.precioCOP <= 0);
}
