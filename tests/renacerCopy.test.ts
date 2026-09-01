import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * La regla de copy del flujo, hecha test (§1/§15 del spec + pivote 31-08): en lo que ve
 * el usuario no hay "donación", no aparece CoomÜnity, y en el camino del beneficiario ya
 * no existe la manilla ni el estuche. Se revisa el JSX y el módulo de copy; los
 * comentarios se descartan antes de buscar.
 */
const dir = join(__dirname, '..', 'src', 'pages', 'renacer');

function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('copy de Renacer', () => {
  const archivos = readdirSync(dir).filter((f) => f.endsWith('.tsx') || f === 'renacerCopy.ts');

  it('revisa los archivos del flujo', () => {
    expect(archivos.length).toBeGreaterThan(5);
  });

  for (const archivo of archivos) {
    it(`${archivo}: sin "donación" ni CoomÜnity en lo visible`, () => {
      const texto = sinComentarios(readFileSync(join(dir, archivo), 'utf8'));
      expect(texto).not.toMatch(/donaci[oó]n/i);
      expect(texto).not.toMatch(/coom[uü]nity/i);
    });
  }

  for (const archivo of ['RenacerPuerta.tsx', 'RenacerBeneficiario.tsx', 'RenacerCarnet.tsx', 'RenacerTribu.tsx', 'renacerCopy.ts']) {
    it(`${archivo}: el beneficiario no ve manilla, estuche ni kit`, () => {
      const texto = sinComentarios(readFileSync(join(dir, archivo), 'utf8'));
      expect(texto).not.toMatch(/manilla|estuche|\bkit\b/i);
    });
  }
});
