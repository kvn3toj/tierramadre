/**
 * Segmentación operacional/colección (SOT-V4-FASE1, punto 5, dictamen de
 * Kevin 2026-08-02): los lotes `LC-*` son OTRO negocio — piezas de
 * colección reales, precio individual negociado, y NUNCA absorben el gasto
 * fijo mensual de la comercializadora ni cuentan en el divisor D2.
 *
 * Evidencia citada por Kevin: ítem 193 "Secretos del Sol" (LC-03),
 * 20,68 ct Fina Esencial, colección Finas 29-Ene, Bogotá/M.Campuzano,
 * costo $310M — el modelo histórico EXCLUÍA Bogotá por diseño.
 *
 * `C-017`/`S-001` (declaran costo, sin piezas) NO entran acá: siguen
 * EN AUDITORÍA — es una pregunta abierta distinta («¿qué son?»), no resuelta
 * todavía, y ya están excluidos de precio y divisor por `LOTE_SIN_PIEZAS`.
 */
import { describe, it, expect } from 'vitest';
import { inferirSegmentoLote } from '../convex/_lib/segmentoLote';

describe('inferirSegmentoLote', () => {
  it('el prefijo LC- es colección — la convención de nombres del propio SOT', () => {
    expect(inferirSegmentoLote('LC-03')).toBe('coleccion');
    expect(inferirSegmentoLote('LC-01')).toBe('coleccion');
    expect(inferirSegmentoLote('LC-15')).toBe('coleccion');
  });

  it('todo lo demás es operacional, incluidos los que aún están en auditoría', () => {
    expect(inferirSegmentoLote('C-017')).toBe('operacional');
    expect(inferirSegmentoLote('S-001')).toBe('operacional');
    expect(inferirSegmentoLote('C-001')).toBe('operacional');
    expect(inferirSegmentoLote('MED-004')).toBe('operacional');
    expect(inferirSegmentoLote('B-002')).toBe('operacional');
  });

  it('no confunde un prefijo que solo EMPIEZA parecido', () => {
    // "LOTECOLECCION-01" no es la convención real, pero el matcher tiene que
    // ser el prefijo exacto "LC-", no una coincidencia laxa.
    expect(inferirSegmentoLote('LCX-01')).toBe('operacional');
  });
});
