/**
 * Un error por tabla no puede viajar dentro de un HTTP 200.
 *
 * `runDelta` / `runFull` atrapan el fallo de CADA tabla y lo guardan en
 * `perTable[tabla].error`, y después devuelven normalmente. Envuelto en
 * `json(200, { ok: true, ... })`, el efecto era que aunque fallaran TODAS las
 * tablas el Apps Script recibía un 200.
 *
 * Y el contrato del script es explícito (scripts/apps-script/
 * fotosintesis-convex-sync.gs): `callConvex` sólo lanza fuera del rango 2xx, y
 * SÓLO cuando lanza el `catch` hace `clearFlushToken` y conserva la cola para
 * reintentar. Con 200 borra las filas enviadas —`deleteQueueRowsByFlushToken`—
 * y muestra «✅».
 *
 * La cola es el único registro de qué celdas se tocaron, y los tres crones de
 * reconciliación están apagados (medido 2026-09-04): no había respaldo. La
 * edición se perdía para siempre y en silencio.
 *
 * Este test fija la decisión del código de estado, que es la parte fácil de
 * romper sin querer: tiene que ser ≥300. Un 207 (Multi-Status), que es
 * semánticamente más preciso para un éxito parcial, NO sirve — está dentro de
 * 2xx, así que el script no lanzaría y borraría la cola igual.
 */
import { describe, it, expect } from 'vitest';

/** Espejo de la decisión en convex/http.ts. */
function tablasConError(r: unknown): string[] {
  const per = (r as { perTable?: Record<string, { error?: string }> })?.perTable;
  if (!per) return [];
  return Object.entries(per)
    .filter(([, v]) => v && typeof v.error === 'string' && v.error)
    .map(([t, v]) => `${t}: ${v.error}`);
}
const statusPara = (r: unknown) => (tablasConError(r).length ? 502 : 200);

describe('el estado HTTP del sync dice la verdad', () => {
  it('todo bien ⇒ 200', () => {
    const r = { perTable: { inventory: { patched: 2, skipped: 574 } } };
    expect(tablasConError(r)).toEqual([]);
    expect(statusPara(r)).toBe(200);
  });

  it('una tabla con error ⇒ NO 2xx, para que el script conserve la cola', () => {
    const r = { perTable: { inventory: { error: 'reader HTTP 500' } } };
    expect(statusPara(r)).toBe(502);
    // La condición que de verdad importa: fuera de 2xx. `callConvex` lanza
    // con `code < 200 || code >= 300`.
    expect(statusPara(r)).toBeGreaterThanOrEqual(300);
  });

  it('éxito PARCIAL también sale fuera de 2xx', () => {
    // Reintentar una tabla que sí sincronizó es inofensivo (el upsert es
    // idempotente); perder la edición de la que falló, no.
    const r = {
      perTable: {
        inventory: { patched: 5 },
        lots: { error: 'reader HTTP 429' },
      },
    };
    expect(statusPara(r)).toBe(502);
  });

  it('el motivo viaja en el cuerpo: qué tabla y por qué', () => {
    const r = {
      perTable: {
        inventory: { error: 'reader HTTP 500' },
        lots: { error: 'Quota exceeded' },
      },
    };
    const msg = tablasConError(r).join(' · ');
    expect(msg).toContain('inventory');
    expect(msg).toContain('reader HTTP 500');
    expect(msg).toContain('lots');
    // Sin esto el toast decía «algo falló» sin decir dónde.
    expect(tablasConError(r)).toHaveLength(2);
  });

  it('un perTable ausente o vacío no inventa un error', () => {
    expect(statusPara({})).toBe(200);
    expect(statusPara({ perTable: {} })).toBe(200);
    expect(statusPara({ perTable: { inventory: { error: '' } } })).toBe(200);
  });
});
