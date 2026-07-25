import { describe, it, expect } from 'vitest';
import {
  precioEspecialDeObservacion,
  ETIQUETA_PRECIO_ESPECIAL,
  PRECIO_ESPECIAL_HASTA,
  PRECIO_ESPECIAL_VENCE_MS,
} from '../convex/_lib/precioEspecial';

/**
 * La promoción de cierre de temporada vive como TEXTO en `observacion` (~156
 * ítems en producción). Las queries públicas de convex/products.ts la exponen
 * como objeto estructurado para que la UI no tenga que parsear strings.
 *
 * Estos tests fijan el contrato: etiqueta sola, etiqueta concatenada, sin
 * etiqueta, y ya vencida.
 */

// Un instante cómodamente dentro de la vigencia (hora Colombia).
const DENTRO = Date.parse('2026-07-25T12:00:00-05:00');
const VIGENTE = {
  etiqueta: ETIQUETA_PRECIO_ESPECIAL,
  hasta: PRECIO_ESPECIAL_HASTA,
};

describe('precioEspecialDeObservacion', () => {
  it('detecta la etiqueta sola', () => {
    expect(
      precioEspecialDeObservacion(
        'Precio especial por cierre de temporada',
        DENTRO,
      ),
    ).toEqual(VIGENTE);
  });

  it('detecta la etiqueta concatenada tras una observación previa con " · "', () => {
    const observacion =
      'Transformada 2026-07-24: engastada en la joya #398 «Choker Círculos». ' +
      'Fila conservada para trazar el costo · Precio especial por cierre de temporada';
    expect(precioEspecialDeObservacion(observacion, DENTRO)).toEqual(VIGENTE);
  });

  it('tolera espacio o salto de línea al final del texto', () => {
    expect(
      precioEspecialDeObservacion(
        'Precio especial por cierre de temporada  \n',
        DENTRO,
      ),
    ).toEqual(VIGENTE);
  });

  it('devuelve undefined sin etiqueta', () => {
    expect(precioEspecialDeObservacion(undefined, DENTRO)).toBeUndefined();
    expect(precioEspecialDeObservacion('', DENTRO)).toBeUndefined();
    expect(precioEspecialDeObservacion(null, DENTRO)).toBeUndefined();
    expect(
      precioEspecialDeObservacion('Engastada en la joya #398', DENTRO),
    ).toBeUndefined();
  });

  it('NO la detecta si la etiqueta no es lo último del texto', () => {
    // El marcador acordado es un sufijo. Si alguien escribe después de él, la
    // fila deja de estar marcada — mejor perder una promo que inventar una.
    expect(
      precioEspecialDeObservacion(
        'Precio especial por cierre de temporada · Vendida 2026-08-02',
        DENTRO,
      ),
    ).toBeUndefined();
  });

  it('devuelve undefined una vez vencida', () => {
    const despues = Date.parse('2026-09-01T00:00:00-05:00');
    expect(
      precioEspecialDeObservacion(ETIQUETA_PRECIO_ESPECIAL, despues),
    ).toBeUndefined();
  });

  it('sigue vigente hasta el último milisegundo del 2026-08-31 en Colombia', () => {
    expect(
      precioEspecialDeObservacion(
        ETIQUETA_PRECIO_ESPECIAL,
        PRECIO_ESPECIAL_VENCE_MS,
      ),
    ).toEqual(VIGENTE);
    expect(
      precioEspecialDeObservacion(
        ETIQUETA_PRECIO_ESPECIAL,
        PRECIO_ESPECIAL_VENCE_MS + 1,
      ),
    ).toBeUndefined();
    // El corte es hora Colombia (UTC-5), no UTC: a las 23:00 del 31 en Bogotá
    // ya es 1 de septiembre en UTC y la promo debe seguir viva.
    expect(
      precioEspecialDeObservacion(
        ETIQUETA_PRECIO_ESPECIAL,
        Date.parse('2026-09-01T03:00:00Z'),
      ),
    ).toEqual(VIGENTE);
  });

  it('acepta un Date además de un timestamp', () => {
    expect(
      precioEspecialDeObservacion(ETIQUETA_PRECIO_ESPECIAL, new Date(DENTRO)),
    ).toEqual(VIGENTE);
  });

  it('las constantes son las acordadas con la UI', () => {
    expect(ETIQUETA_PRECIO_ESPECIAL).toBe(
      'Precio especial por cierre de temporada',
    );
    expect(PRECIO_ESPECIAL_HASTA).toBe('2026-08-31');
  });
});
