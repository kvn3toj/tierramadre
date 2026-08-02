/**
 * Inferencia de `categoriaFiscal` por nombre (SOT-V4-FASE1, decisión de
 * Kevin 2026-08-02, bloqueo #2 de la doble corrida).
 *
 * La lista de palabras clave NO es nueva: es la que salió de la auditoría
 * del 25/07 («se infirió por nombre», pregunta abierta #2 de
 * `References/tierramadre-modelo-fijacion-precios-v2.md`) — hoy se codifica
 * por primera vez. Kevin nunca la revisó ítem por ítem; por eso lo que
 * siembra esta inferencia sale marcado `'inferida'`, nunca `'capturada'` —
 * es una hipótesis con evidencia, no un dictamen.
 */
import { describe, it, expect } from 'vitest';
import {
  inferirCategoriaFiscalItem,
  inferirCategoriaFiscalLote,
  lotesPendientesDeRevision,
  PALABRAS_CLAVE_JOYA,
} from '../convex/_lib/categoriaFiscalInferencia';

describe('inferirCategoriaFiscalItem', () => {
  it('reconoce cada palabra clave de la lista de la auditoría del 25/07', () => {
    for (const palabra of PALABRAS_CLAVE_JOYA) {
      expect(inferirCategoriaFiscalItem(`${palabra} de plata`)).toBe('joya');
    }
  });

  it('el resto va a gema — la regla es "resto → gema", no una lista propia', () => {
    expect(inferirCategoriaFiscalItem('Esmeralda en bruto')).toBe('gema');
    expect(inferirCategoriaFiscalItem('Piedra facetada verde')).toBe('gema');
  });

  it('no distingue mayúsculas ni acentos de más', () => {
    expect(inferirCategoriaFiscalItem('ANILLO Solitario')).toBe('joya');
    expect(inferirCategoriaFiscalItem('Anillo Solitario')).toBe('joya');
  });

  it('un nombre ausente o vacío también cae en gema, sin fabricar nada', () => {
    expect(inferirCategoriaFiscalItem(undefined)).toBe('gema');
    expect(inferirCategoriaFiscalItem('')).toBe('gema');
  });

  it('caso real del lote 10 (§5.2 de la auditoría): "Tesoro" no es joya', () => {
    expect(inferirCategoriaFiscalItem('Tesoro')).toBe('gema');
    expect(inferirCategoriaFiscalItem('Koru')).toBe('gema');
  });
});

describe('inferirCategoriaFiscalLote', () => {
  it('un lote donde todos los ítems infieren la misma categoría no es mixto', () => {
    const r = inferirCategoriaFiscalLote('C-001', [
      { itemId: '1', nombre: 'Esmeralda cruda' },
      { itemId: '2', nombre: 'Gema facetada' },
    ]);
    expect(r).toEqual({ loteId: 'C-001', categoriaFiscal: 'gema' });
  });

  it('un lote con ítems de las dos categorías sale `mixta`, con el detalle por ítem', () => {
    const r = inferirCategoriaFiscalLote('C-002', [
      { itemId: '1', nombre: 'Anillo Solitario' },
      { itemId: '2', nombre: 'Esmeralda cruda' },
    ]);
    expect(r.categoriaFiscal).toBe('mixta');
    expect(r.porItem?.get('1')).toBe('joya');
    expect(r.porItem?.get('2')).toBe('gema');
  });

  it('un lote sin ítems no se puede inferir — revienta en vez de adivinar', () => {
    expect(() => inferirCategoriaFiscalLote('C-003', [])).toThrow(/ítems/);
  });
});

describe('lotesPendientesDeRevision — el gate duro de Fase 3', () => {
  it('lista los lotes en `inferida`, nunca los `capturada` o `revisada`', () => {
    const lots = [
      { loteId: 'A', categoriaFiscalOrigen: 'inferida' as const },
      { loteId: 'B', categoriaFiscalOrigen: 'capturada' as const },
      { loteId: 'C', categoriaFiscalOrigen: 'revisada' as const },
      { loteId: 'D', categoriaFiscalOrigen: undefined },
    ];
    expect(lotesPendientesDeRevision(lots)).toEqual(['A']);
  });

  it('sin ningún lote en inferida, la lista sale vacía — prod puede cortar', () => {
    expect(
      lotesPendientesDeRevision([
        { loteId: 'A', categoriaFiscalOrigen: 'revisada' as const },
      ]),
    ).toEqual([]);
  });
});
