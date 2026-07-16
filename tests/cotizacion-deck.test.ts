import { describe, expect, it, vi } from 'vitest';
import {
  construyeSubida,
  eligeOperacion,
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

  it('no toca strings sin comillas', () => {
    expect(escapaParaQuery(nombreDeck('TM-2026-0043'))).toBe(
      'Cotizacion-TM-2026-0043',
    );
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
