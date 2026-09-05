/**
 * Las reglas de la tanda 5, fijadas donde son puras.
 *
 * Todas nacen del mismo síntoma: la persona teclea algo y desaparece, o cree
 * que guardó y no guardó. Los tres casos que se pueden probar sin montar la
 * pantalla entera son los que más plata y más trabajo costaban.
 */
import { describe, it, expect } from 'vitest';

// ─── 1. «Aplicar» con el campo vacío ────────────────────────────────────────
/**
 * Espejo exacto de la validación en BulkActionBar.tsx.
 *
 * `Number('')` es 0, y 0 es finito: con el guard viejo —`if
 * (!Number.isFinite(n)) return;`— abrir el popover en modo «absoluto» (el que
 * viene por defecto), no escribir nada y darle a Aplicar ponía **$0 a toda la
 * selección**, sin previsualización ni deshacer, con toast verde. Hay una fila
 * así en producción hoy (#339 «Jardín Secreto»).
 */
function valorValido(raw: string, mode: 'absolute' | 'delta' | 'percent') {
  const limpio = raw.replace(/[^0-9.\-]/g, '').trim();
  const n = limpio === '' ? Number.NaN : Number(limpio);
  return Number.isFinite(n) && (mode !== 'absolute' || n > 0);
}

describe('edición de precio en lote', () => {
  it('el campo vacío NO se puede aplicar en ningún modo', () => {
    for (const mode of ['absolute', 'delta', 'percent'] as const) {
      expect(valorValido('', mode), mode).toBe(false);
      expect(valorValido('   ', mode), mode).toBe(false);
      // Sólo signos o puntos tampoco es un número.
      expect(valorValido('-', mode), mode).toBe(false);
    }
  });

  it('un 0 en modo ABSOLUTO no es un precio: se rechaza', () => {
    expect(valorValido('0', 'absolute')).toBe(false);
    // Es el caso exacto que puso #339 en $0.
    expect(valorValido('0.0', 'absolute')).toBe(false);
  });

  it('pero en delta y porcentaje un negativo SÍ es legítimo — bajar precios', () => {
    expect(valorValido('-5000', 'delta')).toBe(true);
    expect(valorValido('-10', 'percent')).toBe(true);
  });

  it('un absoluto positivo se aplica, como siempre', () => {
    expect(valorValido('150000', 'absolute')).toBe(true);
  });
});

// ─── 2. El aviso del lote cuenta lo que PASÓ ────────────────────────────────
describe('el aviso de edición en lote no infla el número', () => {
  /** Espejo del recuento en ProductManagementPage. */
  const resumen = (seleccionadas: number, aplicadas: number) => {
    const saltadas = seleccionadas - aplicadas;
    return {
      texto:
        `Precio actualizado en ${aplicadas} piedra${aplicadas === 1 ? '' : 's'}` +
        (saltadas > 0 ? ` · ${saltadas} sin precio, no se pudieron ajustar` : ''),
      tono: saltadas > 0 ? 'warning' : 'success',
    };
  };

  it('nombra las que se saltaron en vez de contarlas como hechas', () => {
    // 50 elegidas, 20 sin precio del que partir para un porcentaje.
    const r = resumen(50, 30);
    expect(r.texto).toContain('30 piedras');
    expect(r.texto).toContain('20 sin precio');
    expect(r.tono).toBe('warning');
    // Lo que decía antes, y que hacía irse creyendo que las 50 cambiaron:
    expect(r.texto).not.toContain('50 piedras');
  });

  it('cuando se aplicaron todas, no mete ruido', () => {
    const r = resumen(12, 12);
    expect(r.texto).toBe('Precio actualizado en 12 piedras');
    expect(r.tono).toBe('success');
  });
});

// ─── 3. El estado vacío distingue «no hay» de «no coincide» ─────────────────
describe('el estado vacío no acusa a la base de estar vacía', () => {
  /** Espejo de `hayFiltroActivo`. */
  const hayFiltro = (f: Record<string, unknown>) =>
    !!String(f.search ?? '').trim() ||
    f.filter !== 'all' ||
    !!f.collection ||
    !!f.onlyWithImages ||
    !!f.onlyMissingPrice ||
    f.tipo !== 'all' ||
    !!f.color ||
    !!f.priceRange;

  const base = {
    search: '', filter: 'all', collection: null, onlyWithImages: false,
    onlyMissingPrice: false, tipo: 'all', color: null, priceRange: null,
  };

  it('sin ningún filtro, un listado vacío SÍ es «espejo vacío»', () => {
    expect(hayFiltro(base)).toBe(false);
  });

  it('con el toggle «Sin precio» puesto, es «sin coincidencias»', () => {
    // El caso que mostraba «Espejo vacío» frente a 576 piezas vivas, y se leía
    // como que el sync se había roto.
    expect(hayFiltro({ ...base, onlyMissingPrice: true })).toBe(true);
  });

  it('lo mismo con colección, con «Con fotos» y con un filtro avanzado', () => {
    expect(hayFiltro({ ...base, collection: 'Dinastías' })).toBe(true);
    expect(hayFiltro({ ...base, onlyWithImages: true })).toBe(true);
    expect(hayFiltro({ ...base, color: 'Verde' })).toBe(true);
    expect(hayFiltro({ ...base, priceRange: [1, 2] })).toBe(true);
  });
});
