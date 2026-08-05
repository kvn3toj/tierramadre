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

/** The only fields an anonymous caller ever sees. */
export const PUBLIC_KEYS = [
  'item',
  'nombre',
  'peso',
  'color',
  'calidad',
  'talla',
  'medidas',
  'medidasValores',
  'categoria',
  'coleccion',
  'isJewelry',
] as const;

/**
 * Everything else on TreasureItem. Listed explicitly so the exhaustiveness
 * check below can prove no field is unclassified. Several of these
 * (procedencia, mina, tipoEsmeralda, tratamiento, certificateUrl, the media
 * fields) are plausible future public fields — promote them deliberately by
 * moving them to PUBLIC_KEYS, never by loosening the projection.
 */
export const WITHHELD_KEYS = [
  'fechaIngreso',
  'cantidad',
  'imagen',
  'mediaType',
  'thumbnailUrl',
  'videoUrl',
  'posterUrl',
  'galleryCount',
  'tinyThumb',
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
    nombre: item.nombre,
    peso: item.peso,
    color: item.color,
    calidad: item.calidad,
    talla: item.talla,
    medidas: item.medidas,
    medidasValores: item.medidasValores,
    categoria: item.categoria,
    coleccion: item.coleccion,
    isJewelry: item.isJewelry,
  };
}

export function projectForGrant(
  items: TreasureItem[],
  grant: Grant,
): (TreasureItem | PublicItem)[] {
  if (grant.kind === 'staff') return items;
  if (grant.kind === 'vitrina') {
    const granted = new Set(grant.itemIds);
    return items.map((i) => (granted.has(i.item) ? i : toPublicItem(i)));
  }
  return items.map(toPublicItem);
}
