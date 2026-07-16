import { describe, expect, it, vi } from 'vitest';
import {
  construyeSubida,
  eligeOperacion,
  esNumeroValido,
  escapaParaQuery,
  nombreDeck,
} from '../api/_lib/deck-upload.js';

describe('nombreDeck', () => {
  it('nombra por número de cotización, para poder deduplicar', () => {
    expect(nombreDeck('TM-2026-0043')).toBe('Cotizacion-TM-2026-0043');
  });
});

describe('construyeSubida', () => {
  const buffer = Buffer.from('fake pptx');

  it('pide a Drive la conversión a Slides nativas', () => {
    const req = construyeSubida('Cotizacion-TM-1', 'folder123', buffer);
    // el mimeType del requestBody distinto al del media es lo que dispara la conversión
    expect(req.requestBody.mimeType).toBe(
      'application/vnd.google-apps.presentation',
    );
    expect(req.media.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    expect(req.requestBody.parents).toEqual(['folder123']);
    expect(req.supportsAllDrives).toBe(true);
  });
});

describe('escapaParaQuery', () => {
  it('escapa comillas simples para no romper la sintaxis del query q de Drive', () => {
    const nombre = nombreDeck("TM-2026-004'; DROP");

    // sin escapar, esta comilla cerraría el literal `name = '...'` antes de tiempo
    expect(nombre).toContain("'");
    expect(escapaParaQuery(nombre)).toBe("Cotizacion-TM-2026-004\\'; DROP");

    const query = `name = '${escapaParaQuery(nombre)}' and 'folder123' in parents and trashed = false`;
    expect(query).toBe(
      "name = 'Cotizacion-TM-2026-004\\'; DROP' and 'folder123' in parents and trashed = false",
    );
  });

  it('duplica una barra invertida final, para que no absorba la comilla de cierre', () => {
    // Caso que rompe un escapado que solo maneja comillas: sin duplicar la
    // barra, `name = 'a\'` se interpreta como una comilla ESCAPADA (literal),
    // así que el string nunca cierra y el query queda malformado/inyectable.
    const entrada = 'a\\'; // el string real es: a \  (dos caracteres)
    expect(escapaParaQuery(entrada)).toBe('a\\\\'); // a \\  (barra duplicada)

    const query = `name = '${escapaParaQuery(entrada)}' and 'folder123' in parents and trashed = false`;
    // el literal `'...'` cierra justo después de la barra doblada, no antes
    expect(query).toBe(
      "name = 'a\\\\' and 'folder123' in parents and trashed = false",
    );
  });

  it('escapa barra invertida y comilla juntas, en el orden correcto (barra primero)', () => {
    const entrada = "a\\'b"; // caracteres reales: a \ ' b
    // si se escapara la comilla primero, la barra quedaría suelta delante de \'
    // y podría re-combinarse; escapando la barra primero se evita eso.
    expect(escapaParaQuery(entrada)).toBe("a\\\\\\'b");
  });

  it('no toca strings sin comillas ni barras', () => {
    expect(escapaParaQuery(nombreDeck('TM-2026-0043'))).toBe(
      'Cotizacion-TM-2026-0043',
    );
  });
});

describe('esNumeroValido', () => {
  it('acepta letras, dígitos, guion y guion bajo', () => {
    expect(esNumeroValido('TM-2026-0043')).toBe(true);
    expect(esNumeroValido('TM_2026_0043')).toBe(true);
    expect(esNumeroValido('abc123')).toBe(true);
  });

  it('rechaza comillas, barras y otros caracteres fuera del allowlist', () => {
    expect(esNumeroValido("TM-2026-004'; DROP")).toBe(false);
    expect(esNumeroValido('a\\')).toBe(false);
    expect(esNumeroValido('TM 2026')).toBe(false); // espacio
    expect(esNumeroValido('')).toBe(false);
  });
});

describe('eligeOperacion', () => {
  it('crea cuando la carpeta no tiene ese deck', () => {
    expect(eligeOperacion([])).toEqual({ tipo: 'crear' });
  });

  it('actualiza cuando ya existe, para que un segundo Sí no duplique', () => {
    expect(eligeOperacion([{ id: 'f1' }])).toEqual({
      tipo: 'actualizar',
      fileId: 'f1',
    });
  });

  it('actualiza el primero si Drive devolviera varios', () => {
    expect(eligeOperacion([{ id: 'f1' }, { id: 'f2' }])).toEqual({
      tipo: 'actualizar',
      fileId: 'f1',
    });
  });
});
