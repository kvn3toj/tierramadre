/**
 * Las "bolsas" — las categorías en que se agrupan las necesidades (reunión 2026-08-31).
 *
 * La decisión #8 del 25-08 dejó la lista de necesidades en texto libre, sin categorías
 * forzadas. El 31-08 la sala pidió agruparlas en "cajoncitos" para que el aportador pueda
 * verlas por tipo y elegir a cuál aportar. Las dos cosas conviven así: **el texto libre
 * sigue siendo el dato**; la bolsa es una etiqueta opcional que la persona elige de una
 * lista sugerida o escribe. Si ninguna encaja, la que escriba se vuelve una bolsa nueva.
 *
 * `createdAt` sigue siendo el turno (§9). La bolsa agrupa; no reordena.
 *
 * Este archivo lo importan el backend y la app: una sola lista, sin copia que derive.
 */

export const BOLSAS_SUGERIDAS = [
  'Comida',
  'Techo y materiales',
  'Cocina y enseres',
  'Ropa y cobijas',
  'Salud y medicinas',
  'Apoyo emocional',
  'Agua y aseo',
  'Volver a trabajar',
  'Escuela y estudio',
  'Animales y ganado',
  'Documentos y trámites',
] as const;

export const BOLSA_LARGO_MAX = 60;

/**
 * Normaliza una bolsa escrita por una persona: recorta, colapsa espacios, capitaliza la
 * primera letra y la acerca a una sugerida si coincide sin importar mayúsculas ni tildes.
 * Devuelve `null` si queda vacía o se pasa del largo.
 */
export function normalizarBolsa(cruda: string | null | undefined): string | null {
  const s = (cruda ?? '').trim().replace(/\s+/g, ' ');
  if (s.length === 0 || s.length > BOLSA_LARGO_MAX) return null;
  const clave = sinTildes(s).toLowerCase();
  const sugerida = BOLSAS_SUGERIDAS.find((b) => sinTildes(b).toLowerCase() === clave);
  if (sugerida) return sugerida;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Ideas para quien quiere ayudar y no sabe cómo — la lista que pidió la sala el 31-08. */
export const CAPACIDADES_SUGERIDAS = [
  'Cocinar',
  'Levantar escombros',
  'Construcción y arreglos',
  'Cuidar animales',
  'Acompañamiento psicológico',
  'Salud y primeros auxilios',
  'Dar talleres o formación',
  'Transporte (tengo vehículo)',
  'Asesorías (negocio, legal, contable)',
  'Clases para niños',
  'Organizar y coordinar',
  'Prestar un espacio o bodega',
] as const;
