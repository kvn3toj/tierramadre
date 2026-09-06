/**
 * La caché de catálogo del lado servidor.
 *
 * POR QUÉ EXISTE. Convex cobra I/O por documentos ESCANEADOS. La auditoría del
 * 2026-08-12 midió el I/O como el único recurso por encima del plan gratuito
 * (1,2 GB contra 1 GB) y señaló dos consultas como el 85% del gasto. El arreglo
 * se hizo sólo del lado del navegador; `/api/get-treasure-sheets` siguió
 * llamando a las dos desde el servidor en CADA request del catálogo público:
 * `publishedCatalog` (~430 filas de 81 campos) y `fotoUrls` (las 576 enteras).
 *
 * Estas pruebas fijan las dos reglas que hacen que la caché sea segura, porque
 * las dos se pagaron con incidentes:
 *
 *   · La VERSIÓN sola no basta — `bumpCatalogVersion` se mantiene a mano y
 *     `applyMediaToProduct` no lo llamaba. Un bump olvidado dejaría la entrada
 *     viva para siempre. Por eso hay un TTL de piso.
 *   · El TTL solo tampoco basta — con TTL a secas una piedra recién VENDIDA
 *     sigue comprable hasta que venza, y son piezas únicas. Por eso el
 *     centinela invalida en segundos.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  entradaVigente,
  conCache,
  _vaciarCache,
  CATALOGO_TTL_MS,
} from '../api/_lib/catalogCache';

describe('entradaVigente — las dos redes', () => {
  const base = { version: 7, vencimiento: 1000, valor: 'x' };

  it('sirve cuando coincide la versión y no venció', () => {
    expect(entradaVigente(base, 7, 999)).toBe(true);
  });

  it('NO sirve si el centinela se movió, aunque no haya vencido', () => {
    // Es el caso de la venta: la pieza se vendió, la versión subió, y la
    // entrada tiene que morir ya aunque le quedaran minutos de TTL.
    expect(entradaVigente(base, 8, 999)).toBe(false);
  });

  it('NO sirve si venció, aunque la versión coincida', () => {
    // Es el caso del bump olvidado: sin este piso la entrada viviría para
    // siempre con la misma versión.
    expect(entradaVigente(base, 7, 1000)).toBe(false);
    expect(entradaVigente(base, 7, 5000)).toBe(false);
  });

  it('sin entrada previa, no sirve', () => {
    expect(entradaVigente(undefined, 7, 0)).toBe(false);
  });

  it('el TTL es el mismo que el del navegador (5 min)', () => {
    // Las dos puntas tienen que envejecer igual; si divergen, una sirve datos
    // que la otra ya descartó.
    expect(CATALOGO_TTL_MS).toBe(5 * 60 * 1000);
  });
});

describe('conCache — sin Convex configurado', () => {
  beforeEach(() => _vaciarCache());

  it('si no se puede leer el centinela, NO cachea: carga siempre', async () => {
    // En el entorno de pruebas no hay cliente de Convex, así que `leerVersion`
    // devuelve null. Ante la duda se paga el I/O y se sirve fresco: servir de
    // una caché cuya validez no se puede comprobar es exactamente como una
    // piedra vendida sigue a la venta.
    let cargas = 0;
    const cargar = async () => {
      cargas++;
      return ['a'];
    };

    await conCache('k', cargar);
    await conCache('k', cargar);
    await conCache('k', cargar);

    expect(cargas).toBe(3);
  });

  it('devuelve el valor que produce el cargador, sin tocarlo', async () => {
    const valor = new Set(['483', '93A']);
    const salida = await conCache(
      'publishedCatalog:itemIds',
      async () => valor,
    );
    expect(salida).toBe(valor);
  });
});

/**
 * La caché confía en que el centinela se mueva. Ésta es la mitad del contrato
 * que vive en Convex.
 *
 * `applyMediaToProduct` es por donde el bot sube las fotos, y NO llamaba a
 * `bumpCatalogVersion` — pese a que la firma del helper lista «foto» entre los
 * cambios que deben moverlo. Mientras el único consumidor era el navegador con
 * su TTL, el olvido sólo costaba unos minutos de retraso. Con el overlay de
 * fotos cacheado contra este mismo número, una foto recién subida se quedaría
 * fuera del catálogo hasta que venciera el TTL — que es exactamente el retraso
 * que el overlay existe para evitar (incidente 2026-08-15).
 */
describe('los caminos de escritura mueven el centinela', () => {
  const fuente = readFileSync('convex/lotItems.ts', 'utf8');

  it('applyMediaToProduct bumpea al cambiar foto o certificado', () => {
    const desde = fuente.indexOf('async function applyMediaToProduct');
    expect(desde, 'no se encontró applyMediaToProduct').toBeGreaterThan(0);
    const cuerpo = fuente.slice(desde, fuente.indexOf('\n}', desde));
    expect(
      /bumpCatalogVersion(IfPublished)?\s*\(/.test(cuerpo),
      'applyMediaToProduct cambia la foto del catálogo y NO mueve el ' +
        'centinela. api/_lib/catalogCache.ts cachea el overlay contra ese ' +
        'número, así que una foto nueva no aparecería hasta vencer el TTL.',
    ).toBe(true);
  });
});
