/**
 * Cliente de la campaña Renacer hacia `/api/renacer-*`.
 *
 * **No hay cliente de Convex en el navegador para este flujo, a propósito.** El
 * backend de Renacer vive en un deployment aparte (§8.1) y se alcanza solo por estos
 * endpoints, que son los únicos que conocen su URL y su token. El costo aceptado es
 * que no hay reactividad viva: estas pantallas refrescan al montar y después de cada
 * acción, no solas.
 */

/** Lo que devuelve resolver un código de invitación (o de kit legado). */
export type CodigoResuelto =
  | { existe: false; motivo: 'no_existe' | 'es_raiz' }
  | {
      existe: true;
      origen: 'raiz' | 'kit';
      raiz?: { nombre: string; comunidad: string };
      activa: boolean;
      usado: boolean;
    };

export interface Necesidad {
  id: string;
  whatINeed: string;
  whyItMatters: string;
  /** La bolsa (31-08). `null` cuando la persona no eligió ninguna. */
  categoria: string | null;
  /** El orden en que la persona la escribió, 1 = la primera. */
  prioridad: number | null;
  status: 'open' | 'resolved';
  createdAt: number;
  supportCount: number;
  /** `null` cuando la persona no dio consentimiento de visibilidad (§10.3). Solo nombre de pila. */
  autorNombre: string | null;
}

export interface Carnet {
  cardNumber: number;
  primerNombre: string;
  codigo: number | null;
  raiz: { nombre: string; comunidad: string } | null;
}

/** La credencial que el registro entrega UNA vez. El cliente la guarda; el servidor no la repite. */
export interface CredencialCarnet {
  cardNumber: number;
  cardToken: string;
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const mensaje =
      (cuerpo && typeof cuerpo === 'object' && 'error' in cuerpo
        ? String((cuerpo as { error: unknown }).error)
        : null) ?? `Error ${respuesta.status}`;
    throw new Error(mensaje);
  }

  // `sendSuccess` responde `{ success: true, ...payload }`. Cada endpoint de Renacer
  // manda su payload bajo un nombre propio (`kit`, `carnet`, `necesidades`…) porque un
  // `null` suelto se aplanaría a `{ success: true }` — truthy, e indistinguible de un
  // resultado válido para quien lo consuma.
  return cuerpo as T;
}

/** El endpoint conserva el nombre `renacer-kit` de antes del pivote; resuelve raíces y kits. */
export async function resolverCodigo(codigo: string | number): Promise<CodigoResuelto> {
  const { kit } = await pedir<{ kit: CodigoResuelto }>(
    `/api/renacer-kit?codigo=${encodeURIComponent(String(codigo))}`,
  );
  return kit;
}

export async function leerCarnet(
  numero: string | number,
  token: string,
): Promise<Carnet | null> {
  const { carnet } = await pedir<{ carnet: Carnet | null }>(
    `/api/renacer-carnet?numero=${encodeURIComponent(String(numero))}&t=${encodeURIComponent(token)}`,
  );
  return carnet ?? null;
}

export interface NecesidadNueva {
  whatINeed: string;
  whyItMatters: string;
  categoria?: string;
}

export interface DatosRegistro {
  codigo: number;
  name: string;
  ubicacion: string;
  edad: number;
  genero: string;
  telefono?: string;
  email?: string;
  googleId?: string;
  habeasData: boolean;
  donorVisibilityConsent: boolean;
  imageConsent: boolean;
  assistedBy?: string;
  needs: NecesidadNueva[];
  capacities?: Array<{ title: string; description: string }>;
}

export async function registrar(datos: DatosRegistro): Promise<CredencialCarnet> {
  const { registro } = await pedir<{ registro: CredencialCarnet }>('/api/renacer-registro', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  return registro;
}

export interface DatosVoluntario {
  nombre: string;
  contacto: string;
  procedencia?: string;
  motivo?: string;
  habeasData: boolean;
  capacities: Array<{ title: string; description?: string; category?: string }>;
}

export async function registrarVoluntario(datos: DatosVoluntario): Promise<{ voluntarioId: string }> {
  const { voluntario } = await pedir<{ voluntario: { voluntarioId: string } }>(
    '/api/renacer-voluntario',
    { method: 'POST', body: JSON.stringify(datos) },
  );
  return voluntario;
}

export async function leerTribu(limite = 100): Promise<Necesidad[]> {
  const { necesidades } = await pedir<{ necesidades: Necesidad[] }>(
    `/api/renacer-tribu?limite=${limite}`,
  );
  return necesidades;
}

export function sumarseA(
  needId: string,
  credencial: CredencialCarnet,
): Promise<{ supportCount: number; yaEstaba: boolean }> {
  return pedir<{ resultado: { supportCount: number; yaEstaba: boolean } }>(
    '/api/renacer-tribu',
    { method: 'POST', body: JSON.stringify({ needId, ...credencial }) },
  ).then((r) => r.resultado);
}

export interface MensajeMuro {
  id: string;
  authorName: string;
  body: string;
  createdAt: number;
}

export async function leerMuro(): Promise<MensajeMuro[]> {
  const { mensajes } = await pedir<{ mensajes: MensajeMuro[] }>('/api/renacer-muro');
  return mensajes;
}

export function publicarEnMuro(
  body: string,
  credencial: CredencialCarnet,
): Promise<{ id: string }> {
  return pedir<{ id: string }>('/api/renacer-muro', {
    method: 'POST',
    body: JSON.stringify({ body, ...credencial }),
  });
}

/**
 * La credencial del carnet vive en `localStorage`: sobrevive al cierre del navegador,
 * que en campo es lo normal. No es PII: es un número de carnet y un token opaco.
 */
const CLAVE = 'renacer:credencial';

export function guardarCredencial(c: CredencialCarnet): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(c));
  } catch {
    // Modo privado o almacenamiento bloqueado. La sesión sigue; se pierde al recargar.
  }
}

export function leerCredencial(): CredencialCarnet | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const c = JSON.parse(crudo) as CredencialCarnet;
    return typeof c?.cardNumber === 'number' && typeof c?.cardToken === 'string' ? c : null;
  } catch {
    return null;
  }
}

export interface Contadores {
  raicesActivas: number;
  familias: number;
  necesidadesAbiertas: number;
  voluntarios: number;
  updatedAt: number | null;
}

export async function leerContadores(): Promise<Contadores> {
  const { contadores } = await pedir<{ contadores: Contadores }>('/api/renacer-contadores');
  return contadores;
}

export interface Tablero {
  totales: { familias: number; necesidadesAbiertas: number; raicesActivas: number; voluntarios: number };
  bolsas: Array<{ nombre: string; abiertas: number; resueltas: number; apoyos: number }>;
  comunidades: Array<{ comunidad: string; zona: string | null; registrados: number; cupo: number; activa: boolean }>;
  capacidades: Array<{ titulo: string; total: number; voluntarios: number; beneficiarios: number }>;
  ultimos: Array<{ whatINeed: string; categoria: string | null; createdAt: number; supportCount: number }>;
  truncado: boolean;
  updatedAt: number;
}

export async function leerTablero(): Promise<Tablero> {
  const { tablero } = await pedir<{ tablero: Tablero }>('/api/renacer-tablero');
  return tablero;
}
