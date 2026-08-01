/**
 * El candado que impide que un deployment que no es producción escriba en la
 * hoja viva.
 *
 * El hallazgo que lo motiva: el `APP_URL` del deployment de **dev**
 * (`flexible-wolverine-803`) apunta a `https://tierramadre.app`. Como los
 * `_create` del riel viejo agendan un push contra `${APP_URL}/api/...`, capturar
 * un lote en dev escribe una fila en el SOT v3 **vivo**. En la doble corrida va a
 * haber gente usando dev, y ese footgun cuesta datos reales.
 *
 * ¿Por qué no simplemente vaciar `APP_URL` en dev? Porque la misma variable
 * sirve las LECTURAS que dev necesita para funcionar: `authz.ts` resuelve el rol
 * de cada caller contra `${APP_URL}/api/validate`. Vaciarla dejaría dev sin
 * autenticación, o sea sin poder probar nada. La asimetría es el punto: leer de
 * producción desde dev es inofensivo; escribirle no.
 *
 * Por eso el candado es por DIRECCIÓN, no por variable. Puro y sin IO para poder
 * testearlo.
 */

/**
 * Los hosts que sirven datos reales. Misma lista que `TRUSTED_SYNC_HOSTS` de
 * `sheetSync.ts`, pero usada al revés: allá decide a quién se le puede confiar
 * el token; acá, a quién NO se le puede escribir desde un deployment de pruebas.
 */
export const HOSTS_PRODUCCION: readonly string[] = [
  'tierramadre.app',
  'www.tierramadre.app',
  'tierra-madre-studio.vercel.app',
];

/** El deployment de Convex que ES producción. */
export const DEPLOYMENT_PRODUCCION = 'grand-hippopotamus-162';

/**
 * Si el deployment donde corre este código es el de producción.
 *
 * Se deduce de `CONVEX_CLOUD_URL`, que Convex inyecta solo (no es una env var
 * que alguien pueda olvidar de configurar). Ante la duda —variable ausente o
 * ilegible— responde `false`: fallar cerrado significa que un deployment que no
 * se puede identificar se trata como si no fuera producción, y por lo tanto no
 * escribe.
 */
export function esDeploymentDeProduccion(convexCloudUrl?: string): boolean {
  if (!convexCloudUrl) return false;
  return convexCloudUrl.includes(DEPLOYMENT_PRODUCCION);
}

export interface VeredictoEscritura {
  permitido: boolean;
  motivo?: string;
}

/**
 * Decide si este deployment puede escribirle a `appUrl`.
 *
 * Permitido cuando el deployment es producción (prod escribiéndole a prod es la
 * operación normal) o cuando el destino NO es un host de producción (dev
 * escribiéndole a un preview o a localhost es lo que queremos).
 *
 * Prohibido en el único cruce peligroso: **deployment que no es prod → host de
 * producción**. Ese es el que borra datos reales de la operación.
 */
export function verificaDestinoDeEscritura(input: {
  convexCloudUrl?: string;
  appUrl: string;
}): VeredictoEscritura {
  if (esDeploymentDeProduccion(input.convexCloudUrl))
    return { permitido: true };

  let host: string;
  try {
    host = new URL(input.appUrl).host.toLowerCase();
  } catch {
    // Una URL ilegible no se puede clasificar, así que no se le escribe.
    return {
      permitido: false,
      motivo: `APP_URL ilegible ("${input.appUrl}"): no se puede verificar si es producción.`,
    };
  }

  if (!HOSTS_PRODUCCION.includes(host)) return { permitido: true };

  return {
    permitido: false,
    motivo:
      `BLOQUEADO: este deployment no es producción (${input.convexCloudUrl ?? 'desconocido'}) ` +
      `y APP_URL apunta a ${host}, que sí lo es. Escribir desde acá tocaría el ` +
      `SOT v3 vivo. Si necesitás probar el push, apuntá APP_URL a un preview.`,
  };
}
