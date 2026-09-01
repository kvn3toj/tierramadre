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
  /** El carnet como página de estado (01-09): cada pedido y en qué va. */
  necesidades: { whatINeed: string; estado: 'pendiente' | 'en_camino' | 'entregada'; resolvedAt: number | null }[];
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
  /** Idempotencia: acuñado por intento de envío, repetido en cada reintento. */
  clientToken?: string;
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
  /** Nombre de pila solo con consentimiento de visibilidad; si no, `null`. */
  authorName: string | null;
  body: string;
  createdAt: number;
}

/**
 * Los dos muros que se sirven hoy. `aliento` (aportadores, §4.7) sigue afuera: el
 * aportador no tiene credencial, y un muro que cualquiera puede firmar no es un muro.
 */
export type Muro = 'desahogo' | 'gratitud';

export async function leerMuro(muro: Muro = 'desahogo'): Promise<MensajeMuro[]> {
  const { mensajes } = await pedir<{ mensajes: MensajeMuro[] }>(
    `/api/renacer-muro?wall=${muro}`,
  );
  return mensajes;
}

/**
 * Reportar un mensaje del muro (01-09). Sin credencial: señalar algo que hace daño no
 * puede exigir carnet. El servidor responde igual exista o no el id.
 */
export function reportarMensaje(id: string): Promise<unknown> {
  return pedir('/api/renacer-muro', {
    method: 'POST',
    body: JSON.stringify({ accion: 'reportar', id }),
  });
}

export function publicarEnMuro(
  body: string,
  credencial: CredencialCarnet,
  muro: Muro = 'desahogo',
): Promise<{ id: string }> {
  return pedir<{ id: string }>('/api/renacer-muro', {
    method: 'POST',
    body: JSON.stringify({ body, wall: muro, ...credencial }),
  });
}

/** El panel de la raíz: su bloque, qué códigos quedan y cuál sigue. */
export interface PanelRaiz {
  nombre: string;
  comunidad: string;
  zona: string | null;
  estado: 'activa' | 'pausada' | 'cerrada';
  codigoBase: number;
  desde: number;
  hasta: number;
  cupo: number;
  usados: number;
  /** El siguiente código libre. `null` = cupo agotado. */
  proximoCodigo: number | null;
  /** `nombre` solo con consentimiento de visibilidad (D-0831-5); si no, `null`. */
  codigos: Array<{ codigo: number; usado: boolean; nombre: string | null }>;
}

export async function leerPanelRaiz(
  codigo: string | number,
  token: string,
): Promise<PanelRaiz | null> {
  const { panel } = await pedir<{ panel: PanelRaiz | null }>(
    `/api/renacer-raiz?codigo=${encodeURIComponent(String(codigo))}&t=${encodeURIComponent(token)}`,
  );
  return panel ?? null;
}

/**
 * Las credenciales de carnet viven en `localStorage`: sobreviven al cierre del navegador,
 * que en campo es lo normal. No son PII: son un número de carnet y un token opaco.
 *
 * **Es una LISTA, y esa es la corrección del 2026-09-01.** Hasta hoy había una sola clave
 * y `guardarCredencial` la sobrescribía en cada registro exitoso. En una mesa de registro
 * asistido —una raíz con UN teléfono inscribiendo a seis familias— la familia 2 borraba
 * el carnet de la familia 1, y así hasta la sexta. El `cardToken` se entrega UNA vez
 * (`registro.ts`) y no hay consulta del lado del servidor que lo devuelva: no lo puede
 * recuperar ni la raíz, ni operaciones, ni Kevin. Cinco de seis familias quedaban
 * registradas y sin carnet, para siempre.
 *
 * Y caía justo sobre el registro asistido, que es la mitigación de equidad del §9 — la
 * que existe para quien NO tiene teléfono propio. El defecto golpeaba exactamente a quien
 * el mecanismo pretendía proteger.
 *
 * La lista se ordena por recencia (la última registrada primero), que es lo que quiere
 * tanto el dueño del teléfono como la facilitadora en la mesa.
 */
const CLAVE = 'renacer:credenciales';
/** La clave vieja, de una sola credencial. Se migra al leer y no se vuelve a escribir. */
const CLAVE_LEGADO = 'renacer:credencial';
/** Techo defensivo: un teléfono de campo no acumula más carnets que esto en una jornada. */
const MAX_CREDENCIALES = 50;

function esCredencial(c: unknown): c is CredencialCarnet {
  const x = c as CredencialCarnet | null;
  return typeof x?.cardNumber === 'number' && typeof x?.cardToken === 'string';
}

/** Todas las credenciales de este dispositivo, la más reciente primero. */
export function leerCredenciales(): CredencialCarnet[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const lista = JSON.parse(crudo) as unknown;
      if (Array.isArray(lista)) return lista.filter(esCredencial);
    }
    // Migración del formato viejo: un teléfono que ya tenía una credencial no la pierde.
    const legado = localStorage.getItem(CLAVE_LEGADO);
    if (legado) {
      const c = JSON.parse(legado) as unknown;
      if (esCredencial(c)) return [c];
    }
    return [];
  } catch {
    return [];
  }
}

export function guardarCredencial(c: CredencialCarnet): void {
  try {
    const previas = leerCredenciales().filter((x) => x.cardNumber !== c.cardNumber);
    const lista = [c, ...previas].slice(0, MAX_CREDENCIALES);
    localStorage.setItem(CLAVE, JSON.stringify(lista));
    // El formato viejo se retira recién cuando el nuevo quedó escrito, no antes.
    localStorage.removeItem(CLAVE_LEGADO);
  } catch {
    // Modo privado o almacenamiento bloqueado. La sesión sigue; se pierde al recargar.
  }
}

/** La credencial "actual": la última registrada en este dispositivo. */
export function leerCredencial(): CredencialCarnet | null {
  return leerCredenciales()[0] ?? null;
}

/**
 * Saca una credencial de este dispositivo. Existe por el teléfono prestado y por el
 * teléfono compartido de un refugio: quien terminó su registro tiene que poder dejar de
 * dejar su carnet abierto para el siguiente que agarre el aparato.
 */
export function olvidarCredencial(cardNumber: number): void {
  try {
    const lista = leerCredenciales().filter((c) => c.cardNumber !== cardNumber);
    localStorage.setItem(CLAVE, JSON.stringify(lista));
    localStorage.removeItem(CLAVE_LEGADO);
  } catch {
    /* nada que hacer si el almacenamiento está bloqueado */
  }
}

/**
 * El borrador del registro en curso, por código de invitación.
 *
 * El formulario vivía entero en `useState`: un refresh, una llamada entrante o el botón
 * físico de Atrás en Android borraban la entrevista completa. En un refugio con señal
 * mala eso no es el caso raro, es el caso normal. Se guarda por código para que una mesa
 * de registro asistido pueda tener más de una entrevista a medias sin pisarlas.
 */
const CLAVE_BORRADOR = 'renacer:borrador:';

export function guardarBorrador(codigo: string | number, datos: unknown): void {
  try {
    localStorage.setItem(CLAVE_BORRADOR + codigo, JSON.stringify(datos));
  } catch {
    /* sin almacenamiento el flujo sigue: se pierde al recargar, como antes */
  }
}

export function leerBorrador<T>(codigo: string | number): T | null {
  try {
    const crudo = localStorage.getItem(CLAVE_BORRADOR + codigo);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

export function borrarBorrador(codigo: string | number): void {
  try {
    localStorage.removeItem(CLAVE_BORRADOR + codigo);
  } catch {
    /* idem */
  }
}

export interface Contadores {
  raicesActivas: number;
  familias: number;
  necesidadesAbiertas: number;
  voluntarios: number;
  /** `null` mientras nadie haya fijado el arranque de la campaña (D-0901-3). */
  diasDeCampana: number | null;
  updatedAt: number | null;
}

export async function leerContadores(): Promise<Contadores> {
  const { contadores } = await pedir<{ contadores: Contadores }>('/api/renacer-contadores');
  return contadores;
}

export interface Tablero {
  totales: {
    familias: number;
    necesidadesAbiertas: number;
    raicesActivas: number;
    voluntarios: number;
    diasDeCampana: number | null;
  };
  bolsas: Array<{ nombre: string; abiertas: number; resueltas: number; apoyos: number }>;
  comunidades: Array<{ comunidad: string; zona: string | null; registrados: number }>;
  capacidades: Array<{ titulo: string; total: number; voluntarios: number; beneficiarios: number }>;
  ultimos: Array<{ whatINeed: string; categoria: string | null; createdAt: number; supportCount: number }>;
  truncado: boolean;
  updatedAt: number;
}

export async function leerTablero(): Promise<Tablero> {
  const { tablero } = await pedir<{ tablero: Tablero }>('/api/renacer-tablero');
  return tablero;
}
