import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Los IDs de libro no pueden tener fallback a OTRO libro.
 *
 * `SPREADSHEET_ID` caía en legacy #3 y `FOTOSINTESIS_SPREADSHEET_ID` en la
 * SOT v2. Con la env vacía nada fallaba: la app servía el catálogo del libro
 * equivocado, sin un solo log. Averiguar cuál leía producción exigió medir el
 * comportamiento en vivo, porque en Vercel están marcadas *Sensitive* y la API
 * las devuelve vacías — un `vercel env pull` muestra `""` tanto si falta como
 * si está bien puesta.
 *
 * Ahora falta ⇒ centinela `MISSING_ENV_<NOMBRE>` + console.error. El centinela
 * hace reventar la llamada a Sheets con el nombre de la variable en el mensaje,
 * en vez de devolver filas de otro inventario.
 */

const SOT_V3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const LEGACY_3 = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';
const SOT_V2 = '18w0DcP_4CO-le9_vt_UPGCHXAVXkQ5sugLF4r_o2bVM';

/** Reimporta constants.js con el entorno de `env` y nada más. */
async function loadConstants(env: Record<string, string | undefined>) {
  vi.resetModules();
  const previous = { ...process.env };
  for (const k of ['SPREADSHEET_ID', 'FOTOSINTESIS_SPREADSHEET_ID']) {
    delete process.env[k];
  }
  Object.assign(process.env, env);
  try {
    return await import('../api/_lib/constants.js');
  } finally {
    process.env = previous;
  }
}

describe('IDs de libro sin fallback silencioso', () => {
  let err: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    err = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => err.mockRestore());

  it('usa el valor de la env cuando está puesta', async () => {
    const c = await loadConstants({
      SPREADSHEET_ID: SOT_V3,
      FOTOSINTESIS_SPREADSHEET_ID: SOT_V3,
    });
    expect(c.SPREADSHEET_ID).toBe(SOT_V3);
    expect(c.FOTOSINTESIS_SPREADSHEET_ID).toBe(SOT_V3);
    expect(err).not.toHaveBeenCalled();
  });

  it('limpia \\n y espacios pegados al valor', async () => {
    const c = await loadConstants({
      SPREADSHEET_ID: ` ${SOT_V3}\\n`,
      FOTOSINTESIS_SPREADSHEET_ID: `${SOT_V3}\n`,
    });
    expect(c.SPREADSHEET_ID).toBe(SOT_V3);
    expect(c.FOTOSINTESIS_SPREADSHEET_ID).toBe(SOT_V3);
  });

  it.each([
    ['ausente', undefined],
    ['vacía', ''],
    ['sólo espacios', '   '],
  ])('%s ⇒ centinela, nunca otro libro', async (_caso, value) => {
    const c = await loadConstants({
      SPREADSHEET_ID: value,
      FOTOSINTESIS_SPREADSHEET_ID: value,
    });
    expect(c.SPREADSHEET_ID).toBe('MISSING_ENV_SPREADSHEET_ID');
    expect(c.FOTOSINTESIS_SPREADSHEET_ID).toBe(
      'MISSING_ENV_FOTOSINTESIS_SPREADSHEET_ID',
    );
  });

  it('nunca cae en legacy #3 ni en la SOT v2', async () => {
    const c = await loadConstants({});
    for (const id of [c.SPREADSHEET_ID, c.FOTOSINTESIS_SPREADSHEET_ID]) {
      expect(id).not.toBe(LEGACY_3);
      expect(id).not.toBe(SOT_V2);
      expect(id).toMatch(/^MISSING_ENV_/);
    }
  });

  it('deja dicho en el log qué variable falta', async () => {
    await loadConstants({});
    const mensajes = err.mock.calls.map((c) => String(c[0])).join('\n');
    expect(mensajes).toContain('SPREADSHEET_ID');
    expect(mensajes).toContain('FOTOSINTESIS_SPREADSHEET_ID');
    expect(mensajes).toContain('.env.local');
  });

  it('los libros companion SÍ conservan su fallback', async () => {
    // Apuntan al companion correcto: un default ahí no puede mandar la lectura
    // a otro inventario, y quitarlo sin evidencia de que estén puestas en
    // producción sería cambiar un bug silencioso por una caída.
    const c = await loadConstants({});
    expect(c.FEEDBACK_SPREADSHEET_ID).toMatch(/^1[A-Za-z0-9_-]{20,}$/);
    expect(c.APP_SPREADSHEET_ID).toMatch(/^1[A-Za-z0-9_-]{20,}$/);
  });
});
