/**
 * ¿En qué ambiente de Wompi estamos configurados? — por PREFIJO, nunca por valor.
 *
 * Wompi no tiene un toggle de ambiente: sandbox y producción se distinguen por
 * el prefijo de cada credencial (`pub_test_` / `pub_prod_`, `test_integrity_`
 * / `prod_integrity_`, …) y por el host de la API. `docs/wompi-setup.md` §2
 * lo formula como regla dura — «las cuatro credenciales y `WOMPI_BASE_URL`
 * viajan juntas, nunca mezcladas» — pero hasta ahora nada en el código la
 * comprobaba: `checkoutLink.ts` sólo miraba PRESENCIA. Una llave de test con
 * la base de producción la rechaza Wompi, sí, pero recién cuando un cliente ya
 * tiene una piedra reservada y un link que no cobra.
 *
 * Este módulo clasifica sin exponer nada: devuelve ambientes y NOMBRES de
 * variables, jamás un valor. Por eso lo consume también `api/health.js`, que
 * es público.
 */

export type WompiEnv = 'sandbox' | 'production';

export const WOMPI_ENV_VARS = [
  'WOMPI_PUBLIC_KEY',
  'WOMPI_PRIVATE_KEY',
  'WOMPI_INTEGRITY_SECRET',
  'WOMPI_EVENTS_SECRET',
  'WOMPI_BASE_URL',
] as const;

export type WompiEnvVar = (typeof WOMPI_ENV_VARS)[number];

export type WompiEnvInput = Partial<Record<WompiEnvVar, string | undefined>>;

export interface WompiEnvResolution {
  /**
   * `ok`: las cinco presentes y del mismo ambiente.
   * `incomplete`: falta alguna, pero las presentes concuerdan (o no se pueden
   *   clasificar). `env` es el ambiente de las que sí se clasifican.
   * `mismatch`: dos señales clasificables se contradicen — NUNCA armar un link.
   * `unset`: ninguna variable presente.
   */
  status: 'ok' | 'incomplete' | 'mismatch' | 'unset';
  env?: WompiEnv;
  /** Nombres de las variables ausentes (sólo en `incomplete`). */
  missing?: WompiEnvVar[];
  /** Explicación legible con NOMBRES de variables (sólo en `mismatch`). */
  detail?: string;
}

const SANDBOX_PREFIXES = ['pub_test_', 'prv_test_', 'test_integrity_', 'test_events_'];
const PRODUCTION_PREFIXES = ['pub_prod_', 'prv_prod_', 'prod_integrity_', 'prod_events_'];

export function wompiEnvFromCredential(value: string | undefined): WompiEnv | null {
  if (!value) return null;
  if (SANDBOX_PREFIXES.some((p) => value.startsWith(p))) return 'sandbox';
  if (PRODUCTION_PREFIXES.some((p) => value.startsWith(p))) return 'production';
  return null;
}

export function wompiEnvFromBaseUrl(value: string | undefined): WompiEnv | null {
  if (!value) return null;
  let host: string;
  try {
    host = new URL(value).host;
  } catch {
    return null;
  }
  if (host === 'sandbox.wompi.co') return 'sandbox';
  if (host === 'production.wompi.co') return 'production';
  return null;
}

export function resolveWompiEnv(input: WompiEnvInput): WompiEnvResolution {
  const present = WOMPI_ENV_VARS.filter((name) => Boolean(input[name]));
  if (present.length === 0) return { status: 'unset' };

  const signals = present
    .map((name) => ({
      name,
      env:
        name === 'WOMPI_BASE_URL'
          ? wompiEnvFromBaseUrl(input[name])
          : wompiEnvFromCredential(input[name]),
    }))
    .filter((s): s is { name: WompiEnvVar; env: WompiEnv } => s.env !== null);

  const sandbox = signals.filter((s) => s.env === 'sandbox').map((s) => s.name);
  const production = signals
    .filter((s) => s.env === 'production')
    .map((s) => s.name);

  if (sandbox.length > 0 && production.length > 0) {
    return {
      status: 'mismatch',
      detail: `sandbox: ${sandbox.join(', ')} · production: ${production.join(', ')}`,
    };
  }

  const env: WompiEnv | undefined =
    sandbox.length > 0 ? 'sandbox' : production.length > 0 ? 'production' : undefined;
  const missing = WOMPI_ENV_VARS.filter((name) => !input[name]);

  if (missing.length > 0) {
    return { status: 'incomplete', ...(env ? { env } : {}), missing };
  }
  return env ? { status: 'ok', env } : { status: 'incomplete', missing: [] };
}
