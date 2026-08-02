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
