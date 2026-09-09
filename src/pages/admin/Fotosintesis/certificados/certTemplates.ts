/**
 * certTemplates — static template config for the Generador de Certificados.
 *
 * Each certificate is `background image + ordered overlay fields`, all in the
 * artwork's native pixel coordinate space. This file is the authoritative
 * source of truth for placement (SPEC §6). Adding a template or moving a field
 * is a config change here — no component code changes.
 *
 * Backgrounds live in /public/assets/certificados/ (rendered from the design
 * team PDFs in docs/Feature-Generador-Certificados/disenos-fuente/). Overlay
 * fields are positioned in the SAME native coordinate space as `page`, so the
 * measured coordinates map 1:1 onto the rendered artwork.
 */

export type CertTypeId = "origen" | "embajador" | "carnet";

export type FieldKind = "text" | "details" | "photo";

export interface TemplateFieldFont {
  family: string;
  style?: "normal" | "italic";
  weight?: number;
  size: number;
  lineHeight: number;
  color: string;
}

export interface TemplateField {
  /** maps to a key in the cert draft data (see CERT_FIELD_ORDER / data keys) */
  key: string;
  kind: FieldKind;
  /** top-left, in template px space (centers are converted via `center`) */
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** when true, (x,y) is the CENTER and the field is translated -50%,-50% */
  center?: boolean;
  /** when true, only X is centered (translateX -50%) — y is the top */
  centerX?: boolean;
  align?: "left" | "center";
  font?: TemplateFieldFont;
  /** hex swatch painted under the field to mask the baked sample text */
  cover?: string;
  /** photo only */
  shape?: "circle";
  /** photo only — solid fill painted UNDER the image so a non-covering or
   *  transparent photo never reveals the artwork hole (cream/gap). */
  backdrop?: string;
  /** photo only — soft edge vignette so a flat product background reads as an
   *  intentional, framed shot rather than empty space. */
  vignette?: boolean;
  /** details only — color of the "Tipo:" etc. labels */
  labelColor?: string;
  /** text only — fixed copy baked into the template (not a draft key). Blank
   *  lines ("\n\n") separate paragraphs. */
  text?: string;
  /** text only — extra vertical space between paragraphs of `text` (px) */
  paragraphGap?: number;
  /** when true the operator may drag this block in layout mode; the offset is
   *  captured in exports. The `cover` swatch also stays painted at the ORIGINAL
   *  box so the baked sample text underneath never resurfaces. */
  movable?: boolean;
  /** human name for the block (drag handle a11y label + hint copy) */
  label?: string;
}

/**
 * Operator displacement of a movable text block, native px relative to the
 * template position. (0,0) = as designed.
 */
export interface FieldOffset {
  dx: number;
  dy: number;
}

export const DEFAULT_FIELD_OFFSET: FieldOffset = { dx: 0, dy: 0 };

export function hasFieldOffset(o: FieldOffset | undefined): boolean {
  return !!o && (o.dx !== 0 || o.dy !== 0);
}

/** Top-left of a field's box in page px (resolves `center` / `centerX`). */
export function fieldTopLeft(f: TemplateField): { left: number; top: number } {
  const w = f.w ?? 0;
  const h = f.h ?? 0;
  return {
    left: f.center || f.centerX ? f.x - w / 2 : f.x,
    top: f.center ? f.y - h / 2 : f.y,
  };
}

/**
 * Clamp an offset so the block's box stays fully inside the page (the artwork
 * clips anything outside, so an off-page block would silently vanish from the
 * export). Values are rounded to whole px: the export rasterizes at integer
 * device pixels and fractional offsets only blur the text edges.
 */
export function clampFieldOffset(
  o: FieldOffset,
  f: TemplateField,
  page: { w: number; h: number },
): FieldOffset {
  const { left, top } = fieldTopLeft(f);
  const w = f.w ?? 0;
  const h = f.h ?? 0;
  const minDx = -left;
  const maxDx = page.w - w - left;
  const minDy = -top;
  const maxDy = page.h - h - top;
  return {
    dx: Math.round(Math.min(Math.max(o.dx, minDx), maxDx)),
    dy: Math.round(Math.min(Math.max(o.dy, minDy), maxDy)),
  };
}

export interface DetailLine {
  /** data key on the draft */
  key: string;
  label: string;
}

/**
 * How the product image sits BEHIND the certificate's fixed circular frame.
 *
 * The frame (the printed decorative ring) never moves or resizes — the operator
 * only adjusts the image inside it: `zoom` scales the image and `offsetX/offsetY`
 * pan it (native px). The image is clipped to the circle, so it always stays
 * "behind" the ring and never spills outside it. Stored per cert type.
 */
export interface PhotoTransform {
  /** image scale within the fixed circle (≥ 1 keeps the circle fully covered) */
  zoom: number;
  /** pan of the image inside the frame, native px (0,0 = centered) */
  offsetX: number;
  offsetY: number;
}

export const MIN_PHOTO_ZOOM = 1;
export const MAX_PHOTO_ZOOM = 4;
export const DEFAULT_PHOTO_TRANSFORM: PhotoTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

/**
 * Clamp a transform so the image always covers the circle (no gap) and stays in
 * the zoom range. At zoom 1 the image exactly fills the frame, so pan is pinned
 * to 0; panning becomes available as you zoom in. `frameW/frameH` are the photo
 * field's native dimensions.
 */
export function clampPhotoTransform(
  t: PhotoTransform,
  frameW: number,
  frameH: number,
): PhotoTransform {
  const zoom = Math.min(Math.max(t.zoom, MIN_PHOTO_ZOOM), MAX_PHOTO_ZOOM);
  const maxX = Math.max(0, ((zoom - 1) * frameW) / 2);
  const maxY = Math.max(0, ((zoom - 1) * frameH) / 2);
  return {
    zoom,
    offsetX: Math.min(Math.max(t.offsetX, -maxX), maxX),
    offsetY: Math.min(Math.max(t.offsetY, -maxY), maxY),
  };
}

/**
 * An operator-added detail line on the Origen certificate ("create the name of
 * field and the content of field"). Rendered after the template detailLines in
 * the same details block, auto-fit so extra lines never overflow the artwork.
 */
export interface CustomDetail {
  /** stable id for React keys + edits (never rendered) */
  id: string;
  label: string;
  value: string;
}

export interface CertTemplate {
  id: CertTypeId;
  label: string;
  /** short tab swatch gradient */
  swatch: string;
  background: string;
  /** coordinate space (= artwork px) */
  page: { w: number; h: number };
  /** export size + orientation */
  print: { w: number; h: number; orientation: "portrait" | "landscape" };
  fields: TemplateField[];
  /** the ordered detail lines for a `details` field (origen) */
  detailLines?: DetailLine[];
  /** flagged when the artwork is an approximation (carnet, pending PDF) */
  approxArt?: boolean;
}

/** Detail block order for the Origen certificate (one line per non-empty value). */
export const ORIGEN_DETAIL_LINES: DetailLine[] = [
  { key: "tipo", label: "Tipo" },
  { key: "calidad", label: "Calidad" },
  { key: "color", label: "Color" },
  { key: "peso", label: "Peso" },
  { key: "corte", label: "Corte" },
  { key: "joya", label: "Joya" },
  { key: "tecnica", label: "Técnica" },
];

const CORMORANT = "'Cormorant Garamond', Cormorant, Georgia, serif";

/** Fixed message on the Origen certificate (SPEC §Origen, "quote"). */
export const ORIGEN_QUOTE =
  '"Tu elección hoy siembra semillas de abundancia que el universo convierte en paz verdadera.\n\n' +
  'Esta esmeralda es más que una gema: es un pacto entre la tierra y el alma."';

export const CERT_TEMPLATES: Record<CertTypeId, CertTemplate> = {
  // ── Certificación de Origen — gem/treasure certificate. Portrait. ──
  origen: {
    id: "origen",
    label: "Certificación de Origen",
    swatch: "linear-gradient(135deg,#0f5c3a,#2f8c5c)",
    background: "/assets/certificados/bg_origen.jpg",
    page: { w: 1080, h: 1920 },
    print: { w: 1080, h: 1920, orientation: "portrait" },
    detailLines: ORIGEN_DETAIL_LINES,
    fields: [
      {
        // Circle-fit against the printed emerald ring in bg_origen.jpg (2160×3840
        // artwork → page coords ÷2). The ring is a near-perfect circle centered at
        // (650.4, 636.2) with inner edge Ø433.7px and outer edge Ø445.2px (page).
        // The photo is sized to Ø435 (radius 217.5) so it covers the cream hole
        // with a ~0.6px margin — no gap crescent — while the ~5px green stroke
        // stays visible as a frame. (Previously y:626/Ø424 sat 10px high and 11px
        // narrow, leaving a cream crescent at the bottom of the ring.)
        key: "photo",
        kind: "photo",
        shape: "circle",
        x: 650,
        y: 636,
        w: 435,
        h: 435,
        center: true,
        // White backdrop = the artwork hole is cream; a clean white under the
        // gem makes any sub-pixel gap or transparent PNG read as part of the
        // photo, never a crescent. Vignette frames the flat catalog background.
        backdrop: "#ffffff",
        vignette: true,
      },
      {
        key: "name",
        kind: "text",
        label: "Nombre de la pieza",
        movable: true,
        x: 434,
        y: 940,
        w: 560,
        h: 142,
        align: "left",
        cover: "#FCF7EC",
        font: {
          family: CORMORANT,
          style: "italic",
          weight: 600,
          size: 50,
          lineHeight: 51,
          color: "#2c2c2c",
        },
      },
      {
        key: "details",
        kind: "details",
        label: "Detalles",
        movable: true,
        x: 434,
        y: 1082,
        w: 540,
        h: 210,
        align: "left",
        cover: "#FCF7EC",
        labelColor: "#0F5C3A",
        // Roomier line height + size so the typical 5-line block fills its
        // reserved area instead of leaving a blank gap above the baked quote.
        // The details field auto-fits, so the all-lines-filled case still never
        // overflows.
        font: {
          family: CORMORANT,
          weight: 400,
          size: 30,
          lineHeight: 37,
          color: "#2c2c2c",
        },
      },
      {
        // The design team's fixed message. It is ALSO baked into bg_origen.jpg
        // (dark text bbox 867–1840 × 2619–2966 on the 2160×3840 artwork, line
        // pitch 64 px, paragraph gap 96 px); this overlay re-renders the same
        // copy in the same typeface at the same spot so the operator can move
        // it, while the cover masks the baked original. Copy is not a draft
        // key on purpose — the legal message (SPEC Q-6) stays fixed.
        key: "quote",
        kind: "text",
        label: "Mensaje",
        movable: true,
        text: ORIGEN_QUOTE,
        paragraphGap: 16,
        x: 434,
        y: 1308,
        w: 500,
        h: 190,
        align: "left",
        cover: "#FCF7EC",
        // Measured against the baked text in the harness: weight 400 / 37px
        // reproduces the baked line widths (486 px) and wraps identically.
        font: {
          family: CORMORANT,
          style: "italic",
          weight: 400,
          size: 37,
          lineHeight: 32,
          color: "#2c2c2c",
        },
      },
    ],
  },

  // ── Certificado Embajador Semilla — ambassador recognition. Landscape. ──
  embajador: {
    id: "embajador",
    label: "Certificado Embajador",
    swatch: "linear-gradient(135deg,#8a2230,#a83d44)",
    background: "/assets/certificados/bg_embajador.jpg",
    page: { w: 792, h: 612 },
    print: { w: 792, h: 612, orientation: "landscape" },
    fields: [
      {
        // Photo slot re-measured against the rendered artwork: the gold-braid
        // ring opening centers at ~(138, 275) in page space with Ø~178 — lower
        // and larger than the spec's nominal (136,251)/Ø160. Using the measured
        // values so a generated portrait fully covers the baked sample photo
        // (no crescent peeking under the braid) while staying inside the ring.
        key: "photo",
        kind: "photo",
        shape: "circle",
        x: 138,
        y: 275,
        w: 178,
        h: 178,
        center: true,
      },
      {
        key: "name",
        kind: "text",
        label: "Nombre del embajador",
        movable: true,
        x: 529,
        y: 279,
        w: 380,
        h: 44,
        centerX: true,
        align: "center",
        cover: "#F7F2E4",
        font: {
          family: CORMORANT,
          weight: 600,
          size: 37,
          lineHeight: 44,
          color: "#8A2230",
        },
      },
    ],
  },

  // ── Carnet TM 2026 — member card. Portrait. Artwork pending (SPEC §6.4). ──
  // Approximate CSS art until CARNET TM ALVARO PELAEZ.pdf is provided. Rendered
  // entirely by CertPreview's carnet fallback branch, not by overlay fields.
  carnet: {
    id: "carnet",
    label: "Carnet TM 2026",
    swatch: "linear-gradient(135deg,#54bd8e,#3a9e72)",
    background: "",
    page: { w: 380, h: 600 },
    print: { w: 380, h: 600, orientation: "portrait" },
    approxArt: true,
    fields: [],
  },
};

export const CERT_TYPE_ORDER: CertTypeId[] = ["origen", "embajador", "carnet"];

// ── Draft shapes ───────────────────────────────────────────────────────────

export interface OrigenDraft {
  name: string;
  tipo: string;
  calidad: string;
  color: string;
  peso: string;
  corte: string;
  joya: string;
  tecnica: string;
  photo: string;
  /** operator-added detail lines, appended to the template detail block */
  customDetails: CustomDetail[];
}

export interface EmbajadorDraft {
  name: string;
  photo: string;
}

export interface CarnetDraft {
  name: string;
  role: string;
  id: string;
  email: string;
  year: string;
  photo: string;
}

export const EMPTY_ORIGEN: OrigenDraft = {
  name: "",
  tipo: "",
  calidad: "",
  color: "",
  peso: "",
  corte: "",
  joya: "",
  tecnica: "",
  photo: "",
  customDetails: [],
};

export const EMPTY_EMBAJADOR: EmbajadorDraft = { name: "", photo: "" };

export const EMPTY_CARNET: CarnetDraft = {
  name: "",
  role: "",
  id: "",
  email: "",
  year: "2026",
  photo: "",
};

/** Filename-safe slug for exported certificate files. */
export function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "certificado"
  );
}
