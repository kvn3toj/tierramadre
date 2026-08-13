/**
 * El candado que decide qué deployment puede escribir dónde.
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
 * ## Por qué es una allowlist y no una lista negra
 *
 * La primera versión preguntaba «¿la URL contiene `grand-hippopotamus-162`?» y
 * trataba como no-producción a todo lo demás. Una lista negra decide sobre lo que
 * conoce y se calla sobre lo que no, y ahí aparecieron dos agujeros opuestos:
 *
 *  - un preview llamado `grand-hippopotamus-162-preview` **contiene** la cadena,
 *    así que se hacía pasar por producción y quedaba habilitado a escribirle a la
 *    hoja viva;
 *  - un deployment nuevo —otro dev, un preview de PR— no figuraba en la lista, y
 *    por descarte quedaba habilitado para las utilidades destructivas de dev.
 *
 * Invertido, cada camino declara QUIÉNES pueden y todo lo demás queda afuera. Si
 * mañana cambia una URL, el candado se equivoca hacia el lado seguro: bloquea, y
 * alguien tiene que venir a agregar la URL nueva a mano.
 *
 * Puro y sin IO para poder testearlo.
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
export const DEPLOYMENT_PRODUCCION = 'valuable-mule-753';
/** El deployment de Convex donde se hace la Fase 1 y la doble corrida. */
export const DEPLOYMENT_DESARROLLO = 'admired-jaguar-376';

/**
 * ✅ VENTANA DE MIGRACIÓN CERRADA el 2026-08-13.
 *
 * Durante el corte esta lista aceptó también el par del proyecto anterior
 * (`grand-hippopotamus-162` / `flexible-wolverine-803`, equipo `dev-tec`),
 * porque mientras producción la servía el proyecto viejo cualquiera de los dos
 * extremos fallaba en cerrado: este gate no distingue «no autorizado» de «no lo
 * conozco». Verificado el corte —el bundle en vivo de `tierramadre.app`
 * referencia `valuable-mule-753` y ninguno de los slugs viejos—, esas entradas
 * se borraron.
 *
 * **No se vuelven a agregar.** Un deployment de un proyecto que ya no
 * controlamos no es «uno de los nuestros que está de más»: es exactamente el
 * `desconocido` que esta función existe para rechazar. Si algo necesita
 * escribir desde otro deployment, se nombra acá a propósito y se justifica —
 * nunca se deja una entrada vieja «por si acaso».
 *
 * Historial de slugs muertos, por si alguien encuentra uno escrito en un doc:
 * `wonderful-tortoise-984` (prod hasta 2026-07-21), `grand-hippopotamus-162`
 * (prod hasta 2026-08-13), `flexible-wolverine-803` (su dev),
 * `wandering-parrot-148` (anterior a todos). Ninguno es producción.
 */
export const DEPLOYMENTS_PRODUCCION: readonly string[] = [
  DEPLOYMENT_PRODUCCION,
];
export const DEPLOYMENTS_DESARROLLO: readonly string[] = [
  DEPLOYMENT_DESARROLLO,
];

/**
 * Las URLs exactas. La convención `https://<nombre>.convex.cloud` se verificó
 * contra el deployment real las dos veces: el 2026-08-01 con
 * `npx convex env get CONVEX_CLOUD_URL [--prod]` sobre el proyecto anterior, y
 * el 2026-08-13 al desplegar el nuevo, que respondió
 * `✔ Deployed Convex functions to https://valuable-mule-753.convex.cloud`.
 * La diferencia importa: de estas dos cadenas depende que producción siga
 * escribiendo su hoja.
 */
export const URL_PRODUCCION = `https://${DEPLOYMENT_PRODUCCION}.convex.cloud`;
export const URL_DESARROLLO = `https://${DEPLOYMENT_DESARROLLO}.convex.cloud`;

export type ClaseDeployment = 'produccion' | 'desarrollo' | 'desconocido';

/**
 * El nombre del deployment dentro de una `CONVEX_CLOUD_URL`, o `null` si la URL
 * no tiene la forma esperada.
 *
 * Se compara el **primer label del host**, no la URL entera ni un substring: así
 * `grand-hippopotamus-162-preview` es un nombre distinto y no un prefijo que
 * coincide.
 */
function nombreDeDeployment(convexCloudUrl?: string): string | null {
  if (!convexCloudUrl) return null;
  let host: string;
  try {
    host = new URL(convexCloudUrl.trim().toLowerCase()).host;
  } catch {
    return null;
  }
  if (!host.endsWith('.convex.cloud')) return null;
  const nombre = host.slice(0, -'.convex.cloud'.length);
  // Un solo label: `a.b.convex.cloud` no es un deployment, es otra cosa.
  return nombre && !nombre.includes('.') ? nombre : null;
}

/**
 * Qué deployment es este. Todo lo que no esté nombrado arriba es `desconocido`,
 * y `desconocido` nunca es un permiso.
 *
 * `CONVEX_CLOUD_URL` la inyecta Convex sola: no es una variable que alguien pueda
 * olvidarse de configurar, pero sí puede faltar fuera de Convex (un test, un
 * script), y ahí también corresponde `desconocido`.
 */
export function clasificaDeployment(convexCloudUrl?: string): ClaseDeployment {
  const nombre = nombreDeDeployment(convexCloudUrl);
  if (nombre === null) return 'desconocido';
  // Listas, no igualdad: durante la ventana de migración cada clase tiene dos
  // nombres válidos. La comparación sigue siendo por nombre exacto de
  // deployment, así que `…-preview` sigue sin colar.
  if (DEPLOYMENTS_PRODUCCION.includes(nombre)) return 'produccion';
  if (DEPLOYMENTS_DESARROLLO.includes(nombre)) return 'desarrollo';
  return 'desconocido';
}

export interface VeredictoEscritura {
  permitido: boolean;
  motivo?: string;
}

/**
 * Decide si este deployment puede escribirle a `appUrl` — el riel viejo, que
 * termina en el SOT v3 vivo.
 *
 * Permitido cuando el deployment ES producción (prod escribiéndole a prod es la
 * operación normal) o cuando el destino NO es un host de producción (escribirle a
 * un preview o a localhost es lo que queremos que se pueda probar).
 *
 * Prohibido en el único cruce peligroso: **deployment que no es prod → host de
 * producción**. Ese es el que ensucia datos reales de la operación. Un
 * deployment desconocido cae de este lado.
 */
export function verificaDestinoDeEscritura(input: {
  convexCloudUrl?: string;
  appUrl: string;
}): VeredictoEscritura {
  const clase = clasificaDeployment(input.convexCloudUrl);
  if (clase === 'produccion') return { permitido: true };

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

/**
 * Los deployments habilitados a tocar el libro del espejo.
 *
 * Hoy son los deployments de DESARROLLO y nada más — durante la ventana de
 * migración eso son dos nombres, no uno, pero la clase es la misma. Producción
 * sigue afuera.
 *
 * **Punto de extensión de la Fase 3:** cuando el cutover mueva el espejo al
 * libro de la operación, se agrega `DEPLOYMENT_PRODUCCION` acá y se cambia
 * `ESPEJO_SPREADSHEET_ID` en prod. Que sean dos actos separados y explícitos es
 * el punto: desplegar el código no habilita el espejo.
 */
export const DEPLOYMENTS_DEL_ESPEJO: readonly string[] = DEPLOYMENTS_DESARROLLO;

/**
 * Si este deployment puede escribirle al libro «SOT v4 · Espejo (PRUEBAS)».
 *
 * Allowlist pura: producción y cualquier deployment desconocido quedan afuera.
 * En Fase 1 el destino es un libro de ensayo, y que producción le escriba sería
 * mezclar el ensayo con la operación.
 */
export function verificaEscrituraEspejo(input: {
  convexCloudUrl?: string;
}): VeredictoEscritura {
  const nombre = nombreDeDeployment(input.convexCloudUrl);
  if (nombre && DEPLOYMENTS_DEL_ESPEJO.includes(nombre))
    return { permitido: true };

  return {
    permitido: false,
    motivo:
      `BLOQUEADO: el espejo escribe al libro de PRUEBAS y solo lo drena ` +
      `${DEPLOYMENTS_DEL_ESPEJO.join(', ')}. Este deployment es ` +
      `${nombre ?? 'desconocido'}. Habilitar producción es un acto deliberado ` +
      `de la Fase 3 (agregar el deployment acá + cambiar ESPEJO_SPREADSHEET_ID), ` +
      `no un efecto de desplegar.`,
  };
}

/**
 * Revienta si esto no corre en el deployment de desarrollo.
 *
 * Para las utilidades que **borran** —limpiar lotes de prueba antes de la doble
 * corrida y compañía—. Antes preguntaban «¿es producción?» y, si no lo era,
 * dejaban borrar: un deployment desconocido tenía permiso por descarte. Ahora hay
 * que ser dev, explícitamente.
 */
export function exigeDeploymentDeDesarrollo(convexCloudUrl?: string): void {
  const clase = clasificaDeployment(convexCloudUrl);
  if (clase === 'desarrollo') return;

  if (clase === 'produccion') {
    throw new Error(
      'Esta utilidad es de dev. En producción no se borran lotes: se cancelan ' +
        'por el flujo normal, que deja rastro.',
    );
  }

  throw new Error(
    `Esta utilidad solo corre en ${DEPLOYMENT_DESARROLLO}, y este deployment ` +
      `no se pudo identificar como tal (CONVEX_CLOUD_URL=` +
      `${convexCloudUrl ?? 'ausente'}). Un deployment desconocido no borra nada.`,
  );
}

/** Igual que `verificaEscrituraEspejo`, pero reventando. */
export function exigeDeploymentDelEspejo(convexCloudUrl?: string): void {
  const veredicto = verificaEscrituraEspejo({ convexCloudUrl });
  if (!veredicto.permitido) throw new Error(veredicto.motivo);
}
