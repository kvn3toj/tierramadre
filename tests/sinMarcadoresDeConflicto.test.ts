/**
 * Ningún marcador de conflicto de git llega al árbol.
 *
 * El 2026-09-05 se mergearon a `main` marcadores dentro de `index.html`:
 *
 *     <<<<<<< HEAD
 *             var APP_VERSION = "2026.09.05.853";
 *     =======
 *             var APP_VERSION = "2026.09.05.249";
 *     >>>>>>> 3fc9ce7 (...)
 *
 * Pasó en un rebase: se resolvió el conflicto de `public/version.json` y NO el
 * de `index.html`, dando por hecho que `npm run build` lo iba a arreglar
 * —regenera la versión, pero no toca marcadores— y se hizo `git add` sin mirar.
 *
 * Y no era cosmético: ese bloque vive dentro del `<script>` BLOQUEANTE que
 * corre antes de React, así que el archivo entero deja de parsear y se lleva
 * puesta la comprobación de versión y el arranque de la app.
 *
 * `npm run lint` no lo ve (index.html no es TypeScript) y `npm run build` lo
 * empaqueta igual. Esta prueba es la única red que lo agarra antes de producción.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

describe('el árbol no tiene marcadores de conflicto', () => {
  it('ningún archivo versionado los contiene', () => {
    let salida = '';
    try {
      // `git grep` sólo mira archivos versionados: ni node_modules ni dist.
      // Los marcadores reales van al principio de línea y llevan un espacio
      // (`<<<<<<< rama`) o cierran la línea; se exige el patrón de 7 para no
      // marcar un `=======` decorativo de un markdown.
      salida = execFileSync(
        'git',
        ['grep', '-nE', '^(<{7}|>{7}) ', '--', '*.html', '*.ts', '*.tsx', '*.js', '*.mjs', '*.json', '*.gs', '*.css'],
        { encoding: 'utf8' },
      );
    } catch (e) {
      // git grep sale con 1 cuando NO encuentra nada: ése es el caso bueno.
      const err = e as { status?: number; stdout?: string };
      if (err.status === 1) salida = '';
      else throw e;
    }
    expect(salida.trim(), `marcadores de conflicto sin resolver:\n${salida}`).toBe('');
  });

  it('`index.html` define APP_VERSION una sola vez en el script bloqueante', () => {
    const html = execFileSync('cat', ['index.html'], { encoding: 'utf8' });
    const defs = html.match(/var APP_VERSION = "/g) ?? [];
    // Una sola asignación literal; la otra lectura del archivo toma
    // `window.__TM_VERSION__`, que no es una definición literal.
    expect(defs).toHaveLength(1);
  });
});
