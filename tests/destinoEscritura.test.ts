/**
 * El candado que impide que dev escriba en la hoja viva.
 *
 * Hallazgo real: el `APP_URL` del deployment de dev apunta a
 * `https://tierramadre.app`. Los `_create` del riel viejo agendan un push contra
 * `${APP_URL}/api/...`, así que capturar un lote en dev escribía una fila en el
 * SOT v3 de verdad. En la doble corrida va a haber gente usando dev.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEPLOYMENT_PRODUCCION,
  esDeploymentDeProduccion,
  verificaDestinoDeEscritura,
} from '../convex/_lib/destinoEscritura';

const PROD = `https://${DEPLOYMENT_PRODUCCION}.convex.cloud`;
const DEV = 'https://flexible-wolverine-803.convex.cloud';

describe('esDeploymentDeProduccion', () => {
  it('reconoce el deployment de producción', () => {
    expect(esDeploymentDeProduccion(PROD)).toBe(true);
  });

  it('el de dev no lo es', () => {
    expect(esDeploymentDeProduccion(DEV)).toBe(false);
  });

  it('sin variable falla CERRADO: se asume que no es producción', () => {
    // Un deployment que no se puede identificar se trata como de pruebas, y por
    // lo tanto no escribe. El error caro es el contrario.
    expect(esDeploymentDeProduccion(undefined)).toBe(false);
    expect(esDeploymentDeProduccion('')).toBe(false);
  });
});

describe('verificaDestinoDeEscritura — el único cruce prohibido', () => {
  it('PROHIBIDO: dev escribiéndole a producción', () => {
    const r = verificaDestinoDeEscritura({
      convexCloudUrl: DEV,
      appUrl: 'https://tierramadre.app',
    });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/SOT v3|no es producción/i);
  });

  it('bloquea los tres hosts de producción', () => {
    for (const host of [
      'https://tierramadre.app',
      'https://www.tierramadre.app',
      'https://tierra-madre-studio.vercel.app',
    ]) {
      expect(
        verificaDestinoDeEscritura({ convexCloudUrl: DEV, appUrl: host })
          .permitido,
        host,
      ).toBe(false);
    }
  });

  it('PERMITIDO: producción escribiéndole a producción', () => {
    // Es la operación normal. El candado no puede romper prod.
    expect(
      verificaDestinoDeEscritura({
        convexCloudUrl: PROD,
        appUrl: 'https://tierramadre.app',
      }).permitido,
    ).toBe(true);
  });

  it('PERMITIDO: dev escribiéndole a un preview o a localhost', () => {
    for (const destino of [
      'https://tm-preview-abc123.vercel.app',
      'http://localhost:3000',
    ]) {
      expect(
        verificaDestinoDeEscritura({ convexCloudUrl: DEV, appUrl: destino })
          .permitido,
        destino,
      ).toBe(true);
    }
  });

  it('una APP_URL ilegible se bloquea en vez de adivinar', () => {
    const r = verificaDestinoDeEscritura({
      convexCloudUrl: DEV,
      appUrl: 'no-es-una-url',
    });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/ilegible/i);
  });

  it('ignora mayúsculas en el host', () => {
    expect(
      verificaDestinoDeEscritura({
        convexCloudUrl: DEV,
        appUrl: 'https://TierraMadre.app',
      }).permitido,
    ).toBe(false);
  });
});

/**
 * Test de deriva: el candado no sirve si nadie lo consulta. Estos leen los
 * archivos reales para que quitar la llamada ponga un test en rojo.
 */
describe('los caminos de escritura consultan el candado', () => {
  const raiz = join(__dirname, '..');
  const leer = (rel: string) => readFileSync(join(raiz, rel), 'utf8');

  it('pushTableRowToVercel lo consulta', () => {
    expect(leer('convex/_lib/sheetSync.ts')).toMatch(
      /verificaDestinoDeEscritura/,
    );
  });

  it('products.pushToSheet lo consulta', () => {
    expect(leer('convex/products.ts')).toMatch(/verificaDestinoDeEscritura/);
  });
});
