/**
 * El candado de escritura, en su forma invertida: ALLOWLIST por deployment.
 *
 * La primera versión preguntaba «¿esta URL contiene grand-hippopotamus-162?» y
 * trataba como no-producción a todo lo demás. Dos defectos, ambos por el mismo
 * motivo —una blocklist decide sobre lo que conoce y se calla sobre lo que no—:
 *
 *  1. **Falso positivo por substring.** Un preview llamado
 *     `grand-hippopotamus-162-preview` contiene la cadena, así que se hacía pasar
 *     por producción y podía escribirle a la hoja viva.
 *  2. **Falso negativo silencioso.** Un deployment nuevo (otro dev, un preview de
 *     PR) no está en la lista negra, así que quedaba habilitado para las
 *     utilidades destructivas de dev.
 *
 * Invertido, cada camino declara QUIÉNES pueden y todo lo demás queda afuera. Si
 * mañana cambia una URL, el candado se equivoca hacia el lado seguro: bloquea.
 *
 * Las URLs no se deducen por convención: se leyeron del deployment real las dos
 * veces que cambiaron — el 2026-08-01 con `npx convex env get CONVEX_CLOUD_URL`
 * sobre el proyecto anterior, y el 2026-08-13 al desplegar el nuevo, que
 * respondió `✔ Deployed Convex functions to https://valuable-mule-753.convex.cloud`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  clasificaDeployment,
  exigeDeploymentDeDesarrollo,
  URL_DESARROLLO,
  URL_PRODUCCION,
  verificaDestinoDeEscritura,
  verificaEscrituraEspejo,
} from '../convex/_lib/destinoEscritura';

const PROD = URL_PRODUCCION;
const DEV = URL_DESARROLLO;
/** El que la versión por substring dejaba pasar como si fuera producción. */
const IMPOSTOR = 'https://grand-hippopotamus-162-preview.convex.cloud';
const OTRO = 'https://wandering-parrot-148.convex.cloud';

/**
 * Ventana de migración: abierta y CERRADA el 2026-08-13. Estos dos slugs se
 * conservan a propósito como casos negativos permanentes — son los deployments
 * del proyecto anterior, y lo que hay que seguir probando es que ya NO son un
 * permiso. Aparecen escritos en docs y notas viejas, así que la probabilidad de
 * que alguien los reintroduzca no es cero.
 */
const PROD_ANTERIOR = 'https://grand-hippopotamus-162.convex.cloud';
const DEV_ANTERIOR = 'https://flexible-wolverine-803.convex.cloud';

describe('clasificaDeployment — identidad exacta, nunca por substring', () => {
  it('reconoce producción y desarrollo', () => {
    expect(clasificaDeployment(PROD)).toBe('produccion');
    expect(clasificaDeployment(DEV)).toBe('desarrollo');
  });

  it('ventana CERRADA: el proyecto anterior ya no es un permiso', () => {
    // Durante el corte estos dos clasificaban `produccion` y `desarrollo` a
    // propósito. Cerrada la ventana, la aserción se invierte — y esta forma es
    // la que vale: borrar los casos habría dejado de probar que la puerta está
    // cerrada, sólo que el código se borró. Un deployment de un proyecto que ya
    // no controlamos es exactamente el `desconocido` que este gate rechaza.
    expect(clasificaDeployment(PROD_ANTERIOR)).toBe('desconocido');
    expect(clasificaDeployment(DEV_ANTERIOR)).toBe('desconocido');
  });

  it('los nombres nuevos y los viejos son distintos — el test no pasa en vacío', () => {
    // Guarda contra el falso verde: si alguien hubiera "cerrado la ventana"
    // dejando las constantes viejas como canónicas, el bloque de arriba
    // seguiría verde probando lo mismo dos veces.
    expect(PROD).not.toBe(PROD_ANTERIOR);
    expect(DEV).not.toBe(DEV_ANTERIOR);
  });

  it('un deployment que contiene el nombre de prod NO es prod', () => {
    // El defecto que motiva la inversión: `includes()` lo daba por producción.
    expect(clasificaDeployment(IMPOSTOR)).toBe('desconocido');
  });

  it('cualquier otro deployment es desconocido, no «dev por descarte»', () => {
    expect(clasificaDeployment(OTRO)).toBe('desconocido');
  });

  it('sin variable o ilegible: desconocido', () => {
    expect(clasificaDeployment(undefined)).toBe('desconocido');
    expect(clasificaDeployment('')).toBe('desconocido');
    expect(clasificaDeployment('no-es-una-url')).toBe('desconocido');
  });

  it('tolera ruido de formato, no de identidad', () => {
    expect(clasificaDeployment(`${PROD}/`)).toBe('produccion');
    expect(clasificaDeployment(`  ${DEV.toUpperCase()}  `)).toBe('desarrollo');
  });
});

describe('verificaDestinoDeEscritura — el SOT v3 vivo', () => {
  it('PERMITIDO: producción escribiéndole a producción', () => {
    // Es la operación normal y el candado no puede romperla. Por eso se leyó la
    // URL real de prod antes de invertir nada.
    expect(
      verificaDestinoDeEscritura({
        convexCloudUrl: PROD,
        appUrl: 'https://tierramadre.app',
      }).permitido,
    ).toBe(true);
  });

  it('PROHIBIDO: dev escribiéndole a producción', () => {
    const r = verificaDestinoDeEscritura({
      convexCloudUrl: DEV,
      appUrl: 'https://tierramadre.app',
    });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/SOT v3|no es producción/i);
  });

  it('PROHIBIDO: un deployment desconocido escribiéndole a producción', () => {
    for (const url of [IMPOSTOR, OTRO, undefined]) {
      expect(
        verificaDestinoDeEscritura({
          convexCloudUrl: url,
          appUrl: 'https://tierramadre.app',
        }).permitido,
        String(url),
      ).toBe(false);
    }
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

describe('verificaEscrituraEspejo — allowlist de un solo miembro', () => {
  it('PERMITIDO: solo el deployment de desarrollo', () => {
    expect(verificaEscrituraEspejo({ convexCloudUrl: DEV }).permitido).toBe(
      true,
    );
  });

  it('PROHIBIDO: producción todavía no espeja', () => {
    // En Fase 1 el libro destino es «SOT v4 · Espejo (PRUEBAS)». Que prod le
    // escriba sería mezclar el ensayo con la operación. Habilitarlo es un acto
    // deliberado de la Fase 3, no un efecto de desplegar.
    const r = verificaEscrituraEspejo({ convexCloudUrl: PROD });
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/Fase 3|PRUEBAS/i);
  });

  it('PROHIBIDO: cualquier deployment desconocido, incluido el impostor', () => {
    for (const url of [IMPOSTOR, OTRO, '', undefined]) {
      expect(
        verificaEscrituraEspejo({ convexCloudUrl: url }).permitido,
        String(url),
      ).toBe(false);
    }
  });
});

describe('exigeDeploymentDeDesarrollo — utilidades destructivas', () => {
  it('deja pasar en dev', () => {
    expect(() => exigeDeploymentDeDesarrollo(DEV)).not.toThrow();
  });

  it('revienta en producción', () => {
    expect(() => exigeDeploymentDeDesarrollo(PROD)).toThrow(/producción/i);
  });

  it('revienta en un deployment desconocido', () => {
    // La versión anterior preguntaba «¿es prod?» y, si no lo era, dejaba borrar.
    // Un deployment que no sabemos identificar no borra nada.
    for (const url of [IMPOSTOR, OTRO, undefined]) {
      expect(() => exigeDeploymentDeDesarrollo(url), String(url)).toThrow();
    }
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

  it('el transporte del espejo lo consulta al pedir el token', () => {
    // El guard vive en `obtenerAccessToken` y no en cada acción: sin token no
    // hay forma de tocar el libro, así que un camino nuevo lo hereda solo.
    expect(leer('convex/_lib/espejoSheets.ts')).toMatch(
      /exigeDeploymentDelEspejo/,
    );
  });

  it('las utilidades de mantenimiento lo consultan', () => {
    expect(leer('convex/mantenimientoV4.ts')).toMatch(
      /exigeDeploymentDeDesarrollo/,
    );
  });
});
