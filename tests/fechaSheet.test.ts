/**
 * Normalización de `fechaRecepcion` en la frontera (SOT-V4-FASE1, punto 8,
 * decisión de Kevin 2026-08-02, bloqueo #1).
 *
 * Hallazgo que motiva esto: `configVigenteEn` exige `AAAA-MM-DD` exacto y
 * revienta si no matchea. 122 de 128 lotes de dev traían la celda de Sheets
 * tal cual la sirve `FORMATTED_VALUE`, con hora («2026-05-25 00:00:00»),
 * porque nada en el camino Sheet→Convex la truncaba. El motor NO se afloja
 * (sigue exigiendo `AAAA-MM-DD` exacto) — se normaliza en la frontera, una
 * sola vez, antes de que la fecha entre a Convex.
 */
import { describe, it, expect } from 'vitest';
import { normalizarFechaRecepcion } from '../convex/_lib/fechaSheet';

describe('normalizarFechaRecepcion', () => {
  it('trunca el sufijo de hora que sirve Sheets', () => {
    expect(normalizarFechaRecepcion('2026-05-25 00:00:00')).toBe('2026-05-25');
  });

  it('funciona aunque el padding de la hora sea inconsistente', () => {
    // El caso real que delató el defecto: C-009 con "0:00:00", no "00:00:00".
    expect(normalizarFechaRecepcion('2026-05-26 0:00:00')).toBe('2026-05-26');
  });

  it('una fecha ya limpia sale sin tocar', () => {
    expect(normalizarFechaRecepcion('2026-07-01')).toBe('2026-07-01');
  });

  it('recorta espacios antes de mirar el formato', () => {
    expect(normalizarFechaRecepcion('  2026-07-01  ')).toBe('2026-07-01');
  });

  it('un valor vacío sale vacío, no fabrica una fecha', () => {
    expect(normalizarFechaRecepcion('')).toBe('');
    expect(normalizarFechaRecepcion('   ')).toBe('');
  });

  it('un valor que no es fecha sale sin tocar — no se inventa nada', () => {
    expect(normalizarFechaRecepcion('sin fecha')).toBe('sin fecha');
    expect(normalizarFechaRecepcion('N/A')).toBe('N/A');
  });

  it('no trunca a ciegas: los primeros 10 caracteres tienen que SER una fecha ISO', () => {
    // Si algún día una celda trae algo que por casualidad tiene 10+
    // caracteres pero no es AAAA-MM-DD, no hay que devolver basura truncada.
    expect(normalizarFechaRecepcion('lote sin fecha capturada')).toBe(
      'lote sin fecha capturada',
    );
  });
});

/**
 * La forma COMPACTA `AAAAMMDD` — agregada el 2026-08-12.
 *
 * Medido contra la pestaña `Lotes` del SOT v3: **14 lotes `LC-*` traen la fecha sin
 * guiones** (`20260127`, `20251208`, `20251123`). Son los lotes reconstruidos el
 * 2026-07-23 a partir de «colección + fecha de ingreso», y esa fecha entró con el
 * formato de origen. El motor exige `AAAA-MM-DD` y los rechaza, así que 14 lotes no
 * cotizan por un guión.
 *
 * Esto NO viola el «no inventa una fecha de un texto que no la tiene» de arriba:
 * `20260127` y `2026-01-27` son la MISMA fecha en otra notación. Lo que sí sería
 * inventar es completar una fecha incompleta — y por eso `2251207` (siete dígitos,
 * origen «07-dic-022», ya anotado en el vault como corrupto) se devuelve intacto en
 * lugar de adivinarle el dígito que le falta.
 */
describe('normalizarFechaRecepcion — la forma compacta AAAAMMDD', () => {
  it('convierte los ocho dígitos a ISO', () => {
    expect(normalizarFechaRecepcion('20260127')).toBe('2026-01-27');
    expect(normalizarFechaRecepcion('20251208')).toBe('2025-12-08');
  });

  it('NO adivina cuando faltan dígitos: `2251207` queda como está', () => {
    // El caso real de LC-14. Podría ser 2025-12-07 o 2022-51-20... y esa duda es
    // exactamente la razón de devolverlo intacto: que falle ruidoso río abajo.
    expect(normalizarFechaRecepcion('2251207')).toBe('2251207');
  });

  it('NO acepta una fecha imposible aunque tenga ocho dígitos', () => {
    // Ocho dígitos no alcanzan: el mes 13 y el día 32 no existen, y convertirlos
    // produciría una fecha con la que el motor cotizaría tan campante.
    expect(normalizarFechaRecepcion('20261301')).toBe('20261301');
    expect(normalizarFechaRecepcion('20260132')).toBe('20260132');
  });

  it('no toca lo que ya está bien, ni lo que no es una fecha', () => {
    expect(normalizarFechaRecepcion('2026-01-27')).toBe('2026-01-27');
    expect(normalizarFechaRecepcion('')).toBe('');
    expect(normalizarFechaRecepcion('sin fecha')).toBe('sin fecha');
  });

  it('sigue truncando el sufijo de hora, que era su motivo original', () => {
    expect(normalizarFechaRecepcion('2026-05-25 00:00:00')).toBe('2026-05-25');
  });
});
