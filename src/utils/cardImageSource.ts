/**
 * Fuente de la imagen de una tarjeta del catálogo (useTreasure).
 *
 * Orden: galería manual → media legacy → fotoUrl → carpeta Drive legacy.
 *
 * `fotoUrl` (la foto principal que escribe el bot en Convex y viaja como
 * `item.imagen`) va ARRIBA del thumbnail de la carpeta `products/{item}`:
 * hasta 2026-08-18 iba última, así que cualquier ítem con carpeta legacy
 * mostraba la primera foto de esa carpeta para siempre — #97 exhibía su foto
 * de mayo con la nueva ya en Convex. Las dos fuentes manuales (galería y
 * media legacy) se curan a mano en la app, por eso siguen ganando.
 */
export interface CardImageSources {
  /** Primer ítem de la galería curada en la app. */
  galleryUrl?: string;
  /** Media legacy (localStorage) administrada en la app. */
  legacyUrl?: string;
  /** `fotoUrl` de Convex/hoja — la principal que alimenta el bot. */
  fotoUrl?: string;
  /** Primer archivo (alfabético) de la carpeta Drive `products/{item}`. */
  folderThumbUrl?: string;
  /** El thumbnail de carpeta viene de un producto solo-video. */
  folderThumbIsVideo?: boolean;
}

export interface CardImagePick {
  url?: string;
  /**
   * El ítem solo tiene video: únicamente cuando la carpeta manda. Con
   * cualquier fuente de imagen por encima, el tipo se queda en imagen —
   * si no, un ítem con video en la carpeta y foto nueva del bot quedaría
   * con mediaType=video mostrando un jpg.
   */
  isVideoOnly: boolean;
}

export function pickCardImage(src: CardImageSources): CardImagePick {
  const url =
    src.galleryUrl || src.legacyUrl || src.fotoUrl || src.folderThumbUrl;
  const isVideoOnly =
    Boolean(src.folderThumbIsVideo) &&
    !src.galleryUrl &&
    !src.legacyUrl &&
    !src.fotoUrl;
  return { url: url || undefined, isVideoOnly };
}
