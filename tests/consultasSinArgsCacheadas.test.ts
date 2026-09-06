/**
 * Ninguna consulta de Convex SIN ARGUMENTOS puede llamarse desde `api/` sin
 * pasar por la caché del centinela.
 *
 * ## Por qué esta regla y no otra
 *
 * Convex cobra I/O por documentos ESCANEADOS, y no hay proyección en la capa de
 * base de datos: leer menos significa leer MENOS documentos, nunca menos
 * campos. Una consulta que recibe argumentos casi siempre entra por un índice
 * (`by_itemId`, `by_token`, `by_estado`) y lee lo que necesita. Una consulta
 * SIN argumentos no tiene por dónde acotar: o escanea la tabla entera, o
 * escanea un índice completo. Por eso el criterio es la ausencia de argumentos
 * y no el nombre de la función.
 *
 * ## Lo que ya costó
 *
 * Tres veces, la misma forma:
 *
 *  1. **jun-2026** — el cron de pull cada 15 min. Apagado.
 *  2. **ago-2026** — `products.publishedCatalog` suscrito de forma reactiva por
 *     cada visitante: **759,76 MB, el 63%** de la cuota del equipo
 *     (`docs/audits/2026-08-12-convex-usage-audit.md`). Se arregló con el
 *     centinela… **sólo del lado del navegador**.
 *  3. **sep-2026** — el mismo `publishedCatalog`, más `products.fotoUrls`,
 *     llamados desde el SERVIDOR en cada request de `/api/get-treasure-sheets`.
 *     ~1,5 MB por visita: unas 700 visitas por gigabyte.
 *
 * Las tres veces la respuesta propuesta fue migrar de equipo, y la auditoría de
 * agosto ya la había descartado por escrito: *"do NOT move… a third team
 * migration would reset the counter and reproduce this in ~3–4 weeks, because
 * it does not touch the cause."* La cuota es por EQUIPO, así que mudarse no
 * agranda nada; sólo reinicia el contador.
 *
 * Esta prueba es la que impide la cuarta vez.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/** Archivos versionados de `api/`. Nada de node_modules ni de build. */
function archivosDeApi(): string[] {
  return execFileSync('git', ['ls-files', 'api'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
}

/**
 * `catalogVersion` es el centinela mismo: un documento de ~119 bytes cuya razón
 * de ser es leerse sin caché en cada request. Cachearlo sería cachear la llave.
 */
const EXENTAS = new Set(['api.products.catalogVersion']);

describe('las consultas sin argumentos van cacheadas', () => {
  it('ninguna llamada sin args escapa a conCache', () => {
    const infractoras: string[] = [];

    for (const archivo of archivosDeApi()) {
      const src = readFileSync(archivo, 'utf8');
      // `convexClient.query(api.modulo.fn, {})` — objeto de args VACÍO.
      const re =
        /convexClient!?\s*\.query\(\s*(api\.[A-Za-z0-9_.]+)\s*,\s*\{\s*\}\s*\)/g;
      for (const m of src.matchAll(re)) {
        const nombre = m[1];
        if (EXENTAS.has(nombre)) continue;
        // ¿Está envuelta por una llamada a conCache razonablemente cerca?
        const contexto = src.slice(Math.max(0, m.index - 900), m.index);
        if (/conCache\s*[<(]/.test(contexto)) continue;
        const linea = src.slice(0, m.index).split('\n').length;
        infractoras.push(`${archivo}:${linea} → ${nombre}`);
      }
    }

    expect(
      infractoras,
      'Estas consultas no reciben argumentos, así que no pueden acotar por ' +
        'índice: escanean la tabla o el índice completo, y se llaman por ' +
        'request. Envolvelas en conCache() de api/_lib/catalogCache.ts, o ' +
        'dales un argumento que las haga indexadas:\n  ' +
        infractoras.join('\n  '),
    ).toEqual([]);
  });

  it('las dos del catálogo público siguen cacheadas', () => {
    // Guard explícito para las dos que causaron el incidente: que un refactor
    // no las saque de la caché sin que nadie se entere.
    for (const archivo of [
      'api/_lib/catalogoPublicado.ts',
      'api/_lib/convex-foto-overlay.ts',
    ]) {
      const src = readFileSync(archivo, 'utf8');
      expect(
        /conCache\s*[<(]/.test(src),
        `${archivo} dejó de usar conCache: vuelve a leer el catálogo entero ` +
          `en cada request del sitio público.`,
      ).toBe(true);
    }
  });
});
