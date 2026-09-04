/**
 * Field-level projection for catalog reads.
 *
 * ALLOWLIST, NOT DENYLIST. `toPublicItem` builds a new object naming the safe
 * fields. A denylist would fail OPEN — whoever adds a field and forgets to
 * classify it creates a silent leak. This fails CLOSED: a new field is
 * invisible until someone deliberately adds it to PUBLIC_KEYS.
 *
 * See docs/superpowers/specs/2026-08-05-control-de-acceso-al-catalogo-design.md
 */
import type { TreasureItem } from '../../src/types/index.ts';

/**
 * The only fields an anonymous caller ever sees.
 *
 * Includes the seven media fields (imagen, mediaType, thumbnailUrl,
 * videoUrl, posterUrl, galleryCount, tinyThumb) — deliberately promoted from
 * WITHHELD_KEYS on 2026-08-05 (Task 7 fix round). They are images/video
 * already served publicly through the Drive proxy and thumbnail endpoints
 * (get-batch-thumbnails, get-drive-images — never gated), so withholding
 * them here protected nothing while breaking public pages that need them to
 * render a card (e.g. get-collection.js's `/c/:folder`). Do not promote
 * anything else this way without the same reasoning: "already public
 * elsewhere, unconditionally."
 */
export const PUBLIC_KEYS = [
  'item',
  // El mismo dato que `item` pero sin pasar por parseInt, que aplasta los ids
  // alfanuméricos de las subdivisiones ("93A"/"93B" → 93). Público por la
  // misma razón que `item`: ya viaja en la URL de la ficha y en el QR.
  'itemId',
  // El certificado de laboratorio. Público a propósito: es el documento que
  // sostiene lo que el catálogo afirma de la piedra, y ya se sirve por el proxy
  // de Drive con permiso `anyone/reader`. Sin él acá, la ficha no puede pintar
  // la diapositiva del certificado en el carrusel.
  'certificateUrl',
  'nombre',
  'peso',
  'color',
  'calidad',
  'talla',
  'tallaAnillo',
  'medidas',
  'medidasValores',
  'categoria',
  'coleccion',
  'isJewelry',
  'imagen',
  'mediaType',
  'thumbnailUrl',
  'videoUrl',
  'posterUrl',
  'galleryCount',
  'tinyThumb',
] as const;

/**
 * Everything else on TreasureItem. Listed explicitly so the exhaustiveness
 * check below can prove no field is unclassified. Several of these
 * (procedencia, mina, tipoEsmeralda, tratamiento, certificateUrl) are
 * plausible future public fields — promote them deliberately by moving them
 * to PUBLIC_KEYS, never by loosening the projection.
 */
export const WITHHELD_KEYS = [
  'fechaIngreso',
  'cantidad',
  'costoTM',
  'precioCOP',
  'precioInternacional',
  'ubicacion',
  'asesor',
  'estado',
  'asesorActual',
  'estadoAsesor',
  'caja',
  'qr',
  'metalType',
  'certifications',
  'chainOfCustody',
  'aestheticRating',
  'demandIndicator',
  'imageGallery',
  'imageVerificationStatus',
  'lastImageVerification',
  'city',
  'isVaultExclusive',
  'certificateUrl',
  'procedencia',
  'loteId',
  'preponderancia',
  'publishedAt',
  'tipoEsmeralda',
  'nivelRareza',
  'calificacion',
  'tipoJoya',
  'tecnicaJoya',
  'minerales',
  'complementos',
  'mina',
  'tratamiento',
  'precioEspecial',
  'syncStatus',
  'syncError',
  'sheetRow',
  'description',
  'isLote',
  'groupKind',
  'groupId',
  'loteItems',
  'newestMemberItem',
] as const;

export type PublicItem = Pick<TreasureItem, (typeof PUBLIC_KEYS)[number]>;

// Compile-time exhaustiveness: adding a field to TreasureItem without putting
// it in PUBLIC_KEYS or WITHHELD_KEYS breaks the build here, on purpose.
type Classified = (typeof PUBLIC_KEYS)[number] | (typeof WITHHELD_KEYS)[number];
type Unclassified = Exclude<keyof TreasureItem, Classified>;
const _exhaustive: Unclassified extends never
  ? true
  : ['unclassified TreasureItem field:', Unclassified] = true;
void _exhaustive;

export type Grant =
  | { kind: 'staff' }
  | { kind: 'vitrina'; itemIds: number[] }
  | { kind: 'anon' };

/** Builds a new object containing only PUBLIC_KEYS. Never mutates `item`. */
export function toPublicItem(item: TreasureItem): PublicItem {
  return {
    item: item.item,
    itemId: item.itemId,
    certificateUrl: item.certificateUrl,
    nombre: item.nombre,
    peso: item.peso,
    color: item.color,
    calidad: item.calidad,
    talla: item.talla,
    tallaAnillo: item.tallaAnillo,
    medidas: item.medidas,
    medidasValores: item.medidasValores,
    categoria: item.categoria,
    coleccion: item.coleccion,
    isJewelry: item.isJewelry,
    imagen: item.imagen,
    mediaType: item.mediaType,
    thumbnailUrl: item.thumbnailUrl,
    videoUrl: item.videoUrl,
    posterUrl: item.posterUrl,
    galleryCount: item.galleryCount,
    tinyThumb: item.tinyThumb,
  };
}

/**
 * Lo que una vitrina otorga POR ENCIMA de lo público, y nada más.
 *
 * El diseño del control de acceso (spec 2026-08-05, tabla de la §«grants») define
 * el grant de vitrina en cinco palabras: «precio curado de las piezas de esa
 * vitrina». Precio. No dónde está la piedra, ni con qué asesor, ni en qué caja.
 *
 * Hasta el 2026-09-04 `projectForGrant` devolvía el ítem CRUDO para las piezas
 * otorgadas — sin pasar por ninguna proyección. Medido contra producción con un
 * token real y sin credencial, eso publicaba `ubicacion`, `asesor` (el nombre de
 * una persona), `asesorActual`, `caja`, `qr`, `sheetRow` y `fechaIngreso` de cada
 * pieza otorgada. Un link de vitrina se reenvía por WhatsApp: el alcance no es
 * «el cliente al que se lo mandaron».
 *
 * Es exactamente el modo de fallo contra el que advierte el encabezado de este
 * archivo — «una denylist falla ABIERTA» —, sólo que colado por la puerta del
 * grant en vez de por la de la lista.
 *
 * Los campos de abajo se dividen en tres razones, y ninguna es «venía en el
 * objeto»:
 *   · PRECIO — es el motivo del grant.
 *   · DISPONIBILIDAD — `cantidad` y `estado`: sin ellos la tarjeta no puede decir
 *     que la pieza ya se vendió, y el visitante pediría algo que no existe.
 *   · FORMA DE LA TARJETA — agrupación de lote y `metalType`: estructura de
 *     render, sin dato de negocio adentro.
 *
 * Para agregar uno nuevo: que quepa en una de esas tres razones y escribí cuál.
 */
export const VITRINA_EXTRA_KEYS = [
  // PRECIO — el motivo del grant
  'precioCOP',
  'precioInternacional',
  'precioEspecial',
  // DISPONIBILIDAD
  'cantidad',
  'estado',
  // FORMA DE LA TARJETA
  'metalType',
  'isLote',
  'groupKind',
  'groupId',
  'loteItems',
  'newestMemberItem',
] as const;

export type VitrinaItem = Pick<
  TreasureItem,
  (typeof PUBLIC_KEYS)[number] | (typeof VITRINA_EXTRA_KEYS)[number]
>;

// Un extra de vitrina TIENE que ser un campo hoy retenido. Si alguien mueve uno
// a PUBLIC_KEYS y se olvida de sacarlo de acá, esto rompe el build en vez de
// dejar una lista con dos verdades.
type VitrinaExtrasSonRetenidos =
  (typeof VITRINA_EXTRA_KEYS)[number] extends (typeof WITHHELD_KEYS)[number]
    ? true
    : ['VITRINA_EXTRA_KEYS tiene un campo que no está retenido'];
const _extrasRetenidos: VitrinaExtrasSonRetenidos = true;
void _extrasRetenidos;

/**
 * Los que NO se otorgan nunca, por más vitrina que haya: ubicación física,
 * identidad de terceros y plomería interna. Están acá con nombre y apellido
 * para que agregarlos a VITRINA_EXTRA_KEYS rompa la compilación — es el mismo
 * criterio que CAMPOS_RESERVADOS_CATALOGO usa del lado de Convex.
 */
export const NUNCA_EN_VITRINA = [
  'ubicacion',
  'asesor',
  'asesorActual',
  'estadoAsesor',
  'caja',
  'qr',
  'sheetRow',
  'costoTM',
  'loteId',
  'preponderancia',
  'fechaIngreso',
  'syncStatus',
  'syncError',
] as const;

type FugaEnVitrina = Extract<
  (typeof VITRINA_EXTRA_KEYS)[number],
  (typeof NUNCA_EN_VITRINA)[number]
>;
const _sinFuga: FugaEnVitrina extends never
  ? true
  : ['VITRINA_EXTRA_KEYS incluye un campo prohibido:', FugaEnVitrina] = true;
void _sinFuga;

/** Público + lo que la vitrina otorga. Objeto nuevo; nunca muta `item`. */
export function toVitrinaItem(item: TreasureItem): VitrinaItem {
  return {
    ...toPublicItem(item),
    precioCOP: item.precioCOP,
    precioInternacional: item.precioInternacional,
    precioEspecial: item.precioEspecial,
    cantidad: item.cantidad,
    estado: item.estado,
    metalType: item.metalType,
    isLote: item.isLote,
    groupKind: item.groupKind,
    groupId: item.groupId,
    loteItems: item.loteItems,
    newestMemberItem: item.newestMemberItem,
  };
}

export function projectForGrant(
  items: TreasureItem[],
  grant: Grant,
): (TreasureItem | PublicItem | VitrinaItem)[] {
  if (grant.kind === 'staff') return items;
  if (grant.kind === 'vitrina') {
    const granted = new Set(grant.itemIds);
    // Las otorgadas pasan por `toVitrinaItem`, no salen crudas: el grant da
    // precio, no la ubicación de la piedra ni el nombre del asesor.
    return items.map((i) => (granted.has(i.item) ? toVitrinaItem(i) : toPublicItem(i)));
  }
  return items.map(toPublicItem);
}

/**
 * Asesor-directory projection (F5, 2026-08 fix round).
 *
 * The row shape `api/get-asesores.ts` builds from the Sheets roster. Kept
 * here (not imported from get-asesores.ts) to avoid a circular import —
 * get-asesores.ts imports FROM this module. TypeScript is structural, so
 * `GetAsesoresRow` there and `AsesorRecord` here only need to match shape,
 * not share a declaration; kept in sync manually, it's small and stable.
 */
export interface AsesorRecord {
  id: string;
  name: string;
  slug: string;
  role: string;
  whatsapp: string | null;
  especialidad: string | null;
  email: string | null;
  photoFileId?: string;
  photoUrl?: string;
  vaultCode: string | null;
}

/**
 * The only fields an anonymous/guest caller ever sees for an asesor.
 *
 * Ruling (human, 2026-08 fix round F5): public = id, name, slug, role,
 * especialidad, photo; withheld = email, vaultCode (identifying/internal).
 *
 * DEVIATION, made under the ruling's own escape hatch ("if a public
 * consumer genuinely needs the asesor's WhatsApp to function, say so and
 * leave it public with a note, rather than silently breaking it"):
 * `whatsapp` is PUBLIC here, not withheld. Three anonymous/guest-facing
 * consumers read it with no auth today and have no fallback —
 * `useWhatsAppContact.ts` (admin WhatsApp contact widget),
 * `InvitationPage.tsx` (the guest's "contact my asesor" button after
 * accepting an invite), and `VitrinaPage.tsx`'s `useSenderPhone` (the
 * vitrina CTA's target number). Withholding it would silently break "contact
 * my asesor" for every non-staff visitor — the guest-facing feature this
 * whole access-control project exists to support — to protect a business
 * contact number asesores already hand out to close a sale. `email` has no
 * such consumer among the four checked (`InvitationPage.tsx` degrades to a
 * name-only match, still functional) and stays withheld per the ruling.
 */
export const PUBLIC_ASESOR_KEYS = [
  'id',
  'name',
  'slug',
  'role',
  'especialidad',
  'whatsapp',
  'photoFileId',
  'photoUrl',
] as const;

/** Everything else on AsesorRecord — exhaustiveness-checked below. */
export const WITHHELD_ASESOR_KEYS = ['email', 'vaultCode'] as const;

export type PublicAsesor = Pick<
  AsesorRecord,
  (typeof PUBLIC_ASESOR_KEYS)[number]
>;

type ClassifiedAsesor =
  | (typeof PUBLIC_ASESOR_KEYS)[number]
  | (typeof WITHHELD_ASESOR_KEYS)[number];
type UnclassifiedAsesor = Exclude<keyof AsesorRecord, ClassifiedAsesor>;
const _exhaustiveAsesor: UnclassifiedAsesor extends never
  ? true
  : ['unclassified AsesorRecord field:', UnclassifiedAsesor] = true;
void _exhaustiveAsesor;

/** Builds a new object containing only PUBLIC_ASESOR_KEYS. Never mutates `a`. */
export function toPublicAsesor(a: AsesorRecord): PublicAsesor {
  return {
    id: a.id,
    name: a.name,
    slug: a.slug,
    role: a.role,
    especialidad: a.especialidad,
    whatsapp: a.whatsapp,
    photoFileId: a.photoFileId,
    photoUrl: a.photoUrl,
  };
}

/**
 * No `vitrina` concept for the asesor directory — a vitrina grant is scoped
 * to specific catalog *items*, not to salespeople. Anon and vitrina both get
 * the same public projection; only `staff` sees everything.
 */
export function projectAsesoresForGrant(
  asesores: AsesorRecord[],
  grant: Grant,
): (AsesorRecord | PublicAsesor)[] {
  if (grant.kind === 'staff') return asesores;
  return asesores.map(toPublicAsesor);
}
