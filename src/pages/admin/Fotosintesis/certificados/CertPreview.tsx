/**
 * CertPreview — renders a certificate at its native pixel coordinate space.
 *
 * The artwork (`template.background`) is an <img> filling the page box at exact
 * dimensions; overlay fields are absolutely positioned in the SAME coordinate
 * space, so the SPEC coordinates map 1:1. The whole node is scaled to fit the
 * viewport via `transform: scale()` on a wrapper — the inner node keeps native
 * px so html2canvas/print capture it at full resolution.
 *
 * Two operator affordances layer on top of the pure render:
 *  - the product photo sits BEHIND the fixed circular frame and is clipped to
 *    it. The operator zooms/pans the image inside the circle (it never spills
 *    outside). The transform is applied to the <img> INSIDE the captured
 *    CertNode; the (non-captured) adjust ring renders in the scaled wrapper.
 *  - extra detail lines ("custom fields") render after the template detail lines
 *    and auto-fit so added content never overflows the artwork.
 *  - movable text blocks (name, details, the fixed message) can be dragged in
 *    layout mode. The displacement is applied INSIDE the captured node (so the
 *    export reflects it) and the block's cover swatch stays painted at the
 *    template position as well, masking the sample text baked into the artwork.
 *    The drag handles live in the (non-captured) scaled wrapper.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CERT_TEMPLATES,
  clampPhotoTransform,
  DEFAULT_FIELD_OFFSET,
  DEFAULT_PHOTO_TRANSFORM,
  fieldTopLeft,
  hasFieldOffset,
  type CertTemplate,
  type CertTypeId,
  type CustomDetail,
  type FieldOffset,
  type PhotoTransform,
  type TemplateField,
} from "./certTemplates";

export interface CertPreviewProps {
  type: CertTypeId;
  /** flat draft: keys referenced by template fields (name, tipo, photo, …) */
  data: Record<string, string>;
  /** css scale applied to the native-size node */
  scale?: number;
  /** show red outlines over overlay boxes (coordinate QA) */
  guides?: boolean;
  /** operator-added detail lines, appended to the template detail block */
  customDetails?: CustomDetail[];
  /** per-type image zoom/pan within the fixed circle (null → default) */
  photoTransform?: PhotoTransform | null;
  /** displacement per movable field key (missing → as designed) */
  fieldOffsets?: Record<string, FieldOffset>;
  /** layout mode: render the photo adjust ring + the text drag handles */
  layoutEdit?: boolean;
  /** called with the new transform while the operator pans/zooms the photo */
  onPhotoTransformChange?: (t: PhotoTransform) => void;
  /** called with the raw (unclamped) offset while the operator drags a block */
  onFieldOffsetChange?: (key: string, offset: FieldOffset) => void;
}

/** smallest auto-fit scale for the details block before we let it clip */
const MIN_DETAILS_FIT = 0.5;

function fieldBoxStyle(
  f: TemplateField,
  guides = false,
  offset: FieldOffset = DEFAULT_FIELD_OFFSET,
): React.CSSProperties {
  // Center via PIXEL offsets, NOT transform: translate(-50%): html2canvas 1.4.1
  // does not resolve percentage transforms, so a translate-centered box lands in
  // the wrong place (bottom-right) in the exported raster while looking correct
  // on screen. Pixel left/top is layout-equivalent and renders identically in
  // both the browser preview and the html2canvas capture. The operator offset
  // is folded into the same left/top for the same reason.
  const { left, top } = fieldTopLeft(f);
  const base: React.CSSProperties = {
    position: "absolute",
    left: left + offset.dx,
    top: top + offset.dy,
    width: f.w,
    height: f.h,
    overflow: "hidden",
  };
  if (f.cover) base.background = f.cover;
  if (guides) {
    base.outline = "1.5px solid rgba(255,0,90,.9)";
    base.outlineOffset = "-1px";
  }
  if (f.font) {
    base.fontFamily = f.font.family;
    base.fontStyle = f.font.style ?? "normal";
    base.fontWeight = f.font.weight ?? 400;
    base.fontSize = f.font.size;
    base.lineHeight = `${f.font.lineHeight}px`;
    base.color = f.font.color;
  }
  if (f.align) base.textAlign = f.align;
  return base;
}

/**
 * Render the ordered, non-empty detail lines (template + operator custom) for
 * the Origen details field. Auto-fits: when the combined lines are taller than
 * the field box, the content is scaled down (origin top-left) so it stays
 * inside the artwork's reserved area instead of clipping or overlapping the
 * baked message below.
 */
function DetailsField({
  template,
  field,
  data,
  customDetails,
  offset,
  guides,
}: {
  template: CertTemplate;
  field: TemplateField;
  data: Record<string, string>;
  customDetails?: CustomDetail[];
  offset?: FieldOffset;
  guides?: boolean;
}) {
  const lines = useMemo(() => {
    const base = (template.detailLines ?? [])
      .map((dl) => ({ label: dl.label, value: (data[dl.key] ?? "").trim() }))
      .filter((l) => l.value.length > 0);
    const custom = (customDetails ?? [])
      .map((cd) => ({ label: cd.label.trim(), value: cd.value.trim() }))
      .filter((l) => l.label.length > 0 || l.value.length > 0);
    return [...base, ...custom];
  }, [template.detailLines, data, customDetails]);

  const contentRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const boxH = field.h ?? 0;

  // Measure the content's natural (untransformed) height vs the box. scrollHeight
  // reflects layout, NOT the CSS transform we apply here, and the content width
  // is fixed at 100% of the box — so this measurement is stable and can't
  // oscillate with `fit`. Re-runs only when the line set or box height changes.
  const linesKey = useMemo(
    () => lines.map((l) => `${l.label}${l.value}`).join(""),
    [lines],
  );
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || boxH <= 0) {
      setFit(1);
      return;
    }
    const natural = el.scrollHeight;
    const next = natural > boxH ? Math.max(MIN_DETAILS_FIT, boxH / natural) : 1;
    setFit(next);
  }, [linesKey, boxH]);

  return (
    <div style={fieldBoxStyle(field, guides, offset)}>
      <div
        ref={contentRef}
        style={{
          transformOrigin: "top left",
          transform: fit !== 1 ? `scale(${fit})` : undefined,
        }}
      >
        {lines.map((l, i) => (
          <div key={`${l.label}-${i}`}>
            {l.label ? (
              <>
                <span style={{ color: field.labelColor, fontWeight: 700 }}>
                  {l.label}:
                </span>{" "}
              </>
            ) : null}
            {l.value}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The product photo behind the fixed circular frame.
 *
 * Rendered as a 100%×100% `object-fit: cover` <img> centered in the frame, then
 * panned (offset) and zoomed (scale) about its center via a PIXEL-only transform,
 * and clipped to the circle by the parent's overflow:hidden.
 *
 * The export uses snapDOM (browser-native rendering), so `object-fit: cover` and
 * the transform are honored exactly as on screen — non-square photos are NOT
 * stretched. (The rare html2canvas fallback, used only if snapDOM blanks on iOS,
 * does not implement object-fit and would stretch a non-square source; that path
 * is the last-resort safety net, not the normal export.)
 */
function PhotoField({
  field,
  src,
  transform,
  guides,
}: {
  field: TemplateField;
  src: string;
  transform: PhotoTransform;
  guides?: boolean;
}) {
  const t = transform;
  const isCircle = field.shape === "circle";
  return (
    <div
      style={{
        ...fieldBoxStyle(field, guides),
        borderRadius: isCircle ? "50%" : undefined,
        // Backdrop sits UNDER the photo: a non-covering / transparent / sub-pixel
        // -gapped image then shows this clean fill instead of the cream artwork
        // hole, so the circle never reads as having a gap or wedge.
        background: field.backdrop ?? "transparent",
      }}
    >
      {src ? (
        <>
          <img
            src={src}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transform: `translate(${t.offsetX}px, ${t.offsetY}px) scale(${t.zoom})`,
              transformOrigin: "center center",
            }}
          />
          {/* Soft edge vignette: gently darkens the circle's rim so a flat,
             evenly-lit product background reads as an intentional framed shot
             (drawing the eye to the centered gem) instead of empty space. Center
             stays fully transparent so the subject is never dimmed. */}
          {isCircle && field.vignette ? (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                pointerEvents: "none",
                background:
                  "radial-gradient(circle at 50% 46%, rgba(0,0,0,0) 56%, rgba(0,0,0,.06) 78%, rgba(0,0,0,.16) 100%)",
              }}
            />
          ) : null}
          {/* Recessed inner shadow: makes the photo read as set INTO the printed
             ring (the photo is drawn over the ring's inner edge, so without this
             it looks pasted on top). Soft + neutral so it flatters a gem or a
             portrait without tinting either. Captured in the export node. */}
          {isCircle ? (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                pointerEvents: "none",
                boxShadow:
                  "inset 0 0 20px rgba(0,0,0,.20), inset 0 0 6px rgba(0,0,0,.16)",
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function OverlayField({
  template,
  field,
  data,
  customDetails,
  photoTransform,
  offset,
  guides,
}: {
  template: CertTemplate;
  field: TemplateField;
  data: Record<string, string>;
  customDetails?: CustomDetail[];
  /** clamped transform for the photo field (image zoom/pan within the circle) */
  photoTransform?: PhotoTransform;
  /** clamped displacement for a movable text/details block */
  offset?: FieldOffset;
  guides?: boolean;
}) {
  if (field.kind === "photo") {
    return (
      <PhotoField
        field={field}
        src={data[field.key] || ""}
        transform={photoTransform ?? DEFAULT_PHOTO_TRANSFORM}
        guides={guides}
      />
    );
  }

  if (field.kind === "details") {
    return (
      <DetailsField
        template={template}
        field={field}
        data={data}
        customDetails={customDetails}
        offset={offset}
        guides={guides}
      />
    );
  }

  // text — fixed template copy (blank-line separated paragraphs) or a draft key
  const paragraphs = (field.text ?? data[field.key] ?? "")
    .split(/\n\s*\n/)
    .filter((par) => par.length > 0);
  return (
    <div style={fieldBoxStyle(field, guides, offset)}>
      {paragraphs.map((par, i) => (
        <div
          key={i}
          style={i > 0 ? { marginTop: field.paragraphGap ?? 0 } : undefined}
        >
          {par}
        </div>
      ))}
    </div>
  );
}

/**
 * The cover swatch of a DISPLACED block, painted at its template position.
 * The artwork carries sample text under every covered block; once the block
 * moves away, this keeps that sample masked. Captured in the export.
 */
function CoverMask({ field }: { field: TemplateField }) {
  const { left, top } = fieldTopLeft(field);
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left,
        top,
        width: field.w,
        height: field.h,
        background: field.cover,
      }}
    />
  );
}

/**
 * Pointer drag → native-px delta, shared by the photo pan and the text block
 * handles. Listeners go on `document` so a fast drag that leaves the handle
 * keeps tracking; the teardown ref removes them on unmount mid-drag.
 */
function usePointerDrag(
  scale: number,
  getStart: () => { x: number; y: number },
  onMove: (x: number, y: number) => void,
  onEnd?: () => void,
) {
  const stateRef = useRef({ scale, getStart, onMove, onEnd });
  stateRef.current = { scale, getStart, onMove, onEnd };
  const teardown = useRef<(() => void) | null>(null);
  useEffect(() => () => teardown.current?.(), []);

  return useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const start = stateRef.current.getStart();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);

    const onPointerMove = (ev: PointerEvent) => {
      if (ev.buttons === 0) {
        onUp();
        return;
      }
      const { scale, onMove } = stateRef.current;
      onMove(
        start.x + (ev.clientX - startClientX) / scale,
        start.y + (ev.clientY - startClientY) / scale,
      );
    };
    const onUp = () => {
      teardown.current = null;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      stateRef.current.onEnd?.();
    };
    teardown.current = onUp;
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }, []);
}

/** Arrow-key nudge shared by the drag handles: 8 px, 24 px with Shift. */
function arrowDelta(e: React.KeyboardEvent): { dx: number; dy: number } | null {
  const step = e.shiftKey ? 24 : 8;
  switch (e.key) {
    case "ArrowLeft":
      return { dx: -step, dy: 0 };
    case "ArrowRight":
      return { dx: step, dy: 0 };
    case "ArrowUp":
      return { dx: 0, dy: -step };
    case "ArrowDown":
      return { dx: 0, dy: step };
    default:
      return null;
  }
}

/**
 * Alignment guides, canvas-editor style. While a block is dragged, its edges
 * and centre are compared with the other blocks' edges/centres, the photo's
 * centre line and the page centre; within SNAP_PX the block snaps and a guide
 * line is drawn across the page so the operator can SEE the alignment.
 */
const SNAP_PX = 6;

interface SnapTargets {
  xs: number[];
  ys: number[];
}

/** active guide lines (page px) */
interface SnapGuides {
  x?: number;
  y?: number;
}

function boxEdges(f: TemplateField, o: FieldOffset) {
  const { left, top } = fieldTopLeft(f);
  const w = f.w ?? 0;
  const h = f.h ?? 0;
  const l = left + o.dx;
  const t = top + o.dy;
  return { l, cx: l + w / 2, r: l + w, t, cy: t + h / 2, b: t + h };
}

/** Snap one axis: returns the shift to apply and the matched guide line. */
function snapAxis(
  edges: number[],
  targets: number[],
): { shift: number; guide?: number } {
  let best: { shift: number; guide: number; dist: number } | null = null;
  for (const e of edges) {
    for (const tg of targets) {
      const dist = Math.abs(tg - e);
      if (dist <= SNAP_PX && (!best || dist < best.dist)) {
        best = { shift: tg - e, guide: tg, dist };
      }
    }
  }
  return best ? { shift: best.shift, guide: best.guide } : { shift: 0 };
}

function snapOffset(
  field: TemplateField,
  raw: FieldOffset,
  targets: SnapTargets,
): { offset: FieldOffset; guides: SnapGuides } {
  const e = boxEdges(field, raw);
  const sx = snapAxis([e.l, e.cx, e.r], targets.xs);
  const sy = snapAxis([e.t, e.cy, e.b], targets.ys);
  return {
    offset: { dx: raw.dx + sx.shift, dy: raw.dy + sy.shift },
    guides: { x: sx.guide, y: sy.guide },
  };
}

/**
 * Drag handle for a movable text block, rendered in the SCALED wrapper (never
 * captured). Sits exactly over the displaced box; drag or arrow keys move it.
 */
function FieldDragOverlay({
  field,
  offset,
  scale,
  snapTargets,
  onChange,
  onGuides,
}: {
  field: TemplateField;
  offset: FieldOffset;
  scale: number;
  /** alignment lines of everything else on the page */
  snapTargets: SnapTargets;
  onChange: (offset: FieldOffset) => void;
  /** guide lines to draw while dragging ({} when idle) */
  onGuides: (g: SnapGuides) => void;
}) {
  const stateRef = useRef({ offset, onChange, onGuides, snapTargets, field });
  stateRef.current = { offset, onChange, onGuides, snapTargets, field };
  const beginDrag = usePointerDrag(
    scale,
    () => ({ x: stateRef.current.offset.dx, y: stateRef.current.offset.dy }),
    (x, y) => {
      const { field, snapTargets, onChange, onGuides } = stateRef.current;
      const snapped = snapOffset(field, { dx: x, dy: y }, snapTargets);
      onChange(snapped.offset);
      onGuides(snapped.guides);
    },
    () => stateRef.current.onGuides({}),
  );
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const d = arrowDelta(e);
    if (!d) return;
    e.preventDefault();
    const { offset, onChange } = stateRef.current;
    onChange({ dx: offset.dx + d.dx, dy: offset.dy + d.dy });
  }, []);

  const { left, top } = fieldTopLeft(field);
  const px = 1.5 / scale;
  const label = field.label ?? field.key;
  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`Mover «${label}»: arrastrá o usá las flechas`}
      title={`Mover «${label}»`}
      onPointerDown={beginDrag}
      onKeyDown={onKeyDown}
      style={{
        position: "absolute",
        left: left + offset.dx,
        top: top + offset.dy,
        width: field.w,
        height: field.h,
        border: `${px}px dashed rgba(15,92,58,.9)`,
        borderRadius: 2 / scale,
        boxSizing: "border-box",
        cursor: "move",
        touchAction: "none",
        outlineOffset: `${px}px`,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -22 / scale,
          left: -px,
          padding: `${2 / scale}px ${6 / scale}px`,
          fontFamily: "system-ui, sans-serif",
          fontSize: 11 / scale,
          lineHeight: 1.4,
          fontWeight: 600,
          color: "#fff",
          background: "rgba(15,92,58,.9)",
          borderRadius: `${4 / scale}px ${4 / scale}px 0 0`,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Pan/zoom adjust layer for the photo, rendered in the SCALED wrapper as a
 * sibling of the captured CertNode — so the dashed ring is never part of the
 * exported artwork. The FRAME is fixed (it matches the printed ring): the
 * operator only repositions/zooms the image behind it.
 *
 * - drag inside the ring → pan (native px = screen px / scale)
 * - mouse wheel → zoom (native non-passive listener so the stage doesn't scroll)
 * - arrows pan, +/- zoom (keyboard / AT path)
 *
 * Sends raw transforms via onChange; the page clamps them (no-gap + zoom range).
 */
function PhotoAdjustOverlay({
  frame,
  center,
  scale,
  transform,
  onChange,
}: {
  frame: { x: number; y: number; w: number; h: number };
  center: boolean;
  scale: number;
  transform: PhotoTransform;
  onChange: (t: PhotoTransform) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  // Latest props mirrored to a ref so the once-registered native/document
  // listeners always read fresh values without re-binding.
  const stateRef = useRef({ transform, onChange, scale });
  stateRef.current = { transform, onChange, scale };

  // Wheel-to-zoom needs a non-passive listener to preventDefault the stage scroll.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { transform, onChange } = stateRef.current;
      const factor = Math.pow(1.0018, -e.deltaY);
      onChange({ ...transform, zoom: transform.zoom * factor });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const beginPan = usePointerDrag(
    scale,
    () => {
      const { transform } = stateRef.current;
      return { x: transform.offsetX, y: transform.offsetY };
    },
    (x, y) => {
      const { transform, onChange } = stateRef.current;
      onChange({ ...transform, offsetX: x, offsetY: y });
    },
  );

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { transform, onChange } = stateRef.current;
    const d = arrowDelta(e);
    let next: PhotoTransform | null = null;
    if (d) {
      next = {
        ...transform,
        offsetX: transform.offsetX + d.dx,
        offsetY: transform.offsetY + d.dy,
      };
    } else if (e.key === "+" || e.key === "=") {
      next = { ...transform, zoom: transform.zoom + 0.1 };
    } else if (e.key === "-" || e.key === "_") {
      next = { ...transform, zoom: transform.zoom - 0.1 };
    } else {
      return;
    }
    e.preventDefault();
    onChange(next);
  }, []);

  const ringPx = 2 / scale;
  return (
    <div
      ref={boxRef}
      role="group"
      tabIndex={0}
      aria-label="Ajustar la foto dentro del círculo: arrastrá para reposicionar, rueda o +/− para acercar"
      onPointerDown={beginPan}
      onKeyDown={onKeyDown}
      style={{
        position: "absolute",
        left: frame.x,
        top: frame.y,
        width: frame.w,
        height: frame.h,
        transform: center ? "translate(-50%, -50%)" : undefined,
        borderRadius: "50%",
        border: `${ringPx}px dashed rgba(15,92,58,.95)`,
        boxSizing: "border-box",
        cursor: "grab",
        touchAction: "none",
        outlineOffset: `${ringPx}px`,
      }}
    />
  );
}

/** The active alignment guides, drawn across the whole page (never captured). */
function SnapGuideLines({
  guides,
  page,
  scale,
}: {
  guides: SnapGuides;
  page: { w: number; h: number };
  scale: number;
}) {
  const px = 1 / scale;
  const color = "rgba(214, 51, 132, .95)";
  return (
    <>
      {guides.x !== undefined && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: guides.x - px / 2,
            top: 0,
            width: px,
            height: page.h,
            background: color,
            pointerEvents: "none",
          }}
        />
      )}
      {guides.y !== undefined && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: guides.y - px / 2,
            width: page.w,
            height: px,
            background: color,
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
}

/** Approximate CSS carnet (artwork pending — SPEC §6.4). */
function CarnetFallback({ data }: { data: Record<string, string> }) {
  const green = "#54bd8e";
  const green2 = "#3a9e72";
  return (
    <div
      style={{
        width: 380,
        height: 600,
        background: "#fbf7ee",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "'Montserrat', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "rgba(184,146,63,.92)",
          color: "#fff",
          fontSize: 9,
          fontWeight: 700,
          padding: "4px 8px",
          borderRadius: 20,
          letterSpacing: ".04em",
        }}
      >
        arte aprox.
      </div>
      <div
        style={{
          background: `linear-gradient(150deg, ${green}, ${green2})`,
          padding: "24px 20px 16px",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 30,
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          ✣
        </div>
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 600,
            letterSpacing: ".12em",
            fontSize: 22,
          }}
        >
          TIERRA MÄDRE
        </div>
        <div
          style={{
            fontSize: 7,
            letterSpacing: ".3em",
            marginTop: 2,
            opacity: 0.92,
          }}
        >
          ESMERALDAS CON ADN DE PAZ
        </div>
      </div>
      <div
        style={{
          width: 230,
          height: 234,
          margin: "20px auto 0",
          borderRadius: 13,
          overflow: "hidden",
          background: "#e7e2d4",
          display: "grid",
          placeItems: "center",
        }}
      >
        {data.photo ? (
          <img
            src={data.photo}
            alt=""
            crossOrigin="anonymous"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>
      <div
        style={{
          padding: "16px 18px 22px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 24,
            color: green2,
            textTransform: "uppercase",
            lineHeight: 1.08,
          }}
        >
          {data.name || ""}
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 16,
            color: green2,
            letterSpacing: ".18em",
            textTransform: "uppercase",
          }}
        >
          {data.role || ""}
        </div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#46483c" }}>
          ID: {data.id || ""}
        </div>
        <div style={{ fontSize: 12.5, color: "#5a5b50" }}>
          {data.email || ""}
        </div>
      </div>
    </div>
  );
}

/**
 * The native-size certificate node. `ref` points at THIS node so export
 * captures it at scale 1 (the wrapper's CSS scale doesn't affect the ref node's
 * own layout box). The photo image transform is applied here so the captured
 * artwork reflects the operator's framing.
 */
const CertNode = forwardRef<
  HTMLDivElement,
  {
    type: CertTypeId;
    data: Record<string, string>;
    guides?: boolean;
    customDetails?: CustomDetail[];
    photoTransform?: PhotoTransform;
    /** clamped displacement per movable field key */
    fieldOffsets?: Record<string, FieldOffset>;
  }
>(function CertNode(
  { type, data, guides, customDetails, photoTransform, fieldOffsets },
  ref,
) {
  const template = CERT_TEMPLATES[type];

  if (template.approxArt && type === "carnet") {
    return (
      <div
        ref={ref}
        style={{ background: "#fff", boxShadow: "0 30px 70px rgba(0,0,0,.45)" }}
      >
        <CarnetFallback data={data} />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: template.page.w,
        height: template.page.h,
        background: "#fff",
        boxShadow: "0 30px 70px rgba(0,0,0,.45)",
        overflow: "hidden",
      }}
    >
      <img
        src={template.background}
        alt=""
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
          display: "block",
        }}
      />
      {/* Masks first so a displaced block always paints ABOVE another block's
          template position (e.g. the name dragged down over the details area). */}
      {template.fields.map((f) =>
        f.movable && f.cover && hasFieldOffset(fieldOffsets?.[f.key]) ? (
          <CoverMask key={`mask-${f.key}`} field={f} />
        ) : null,
      )}
      {template.fields.map((f) => (
        <OverlayField
          key={f.key}
          template={template}
          field={f}
          data={data}
          customDetails={customDetails}
          photoTransform={f.kind === "photo" ? photoTransform : undefined}
          offset={f.movable ? fieldOffsets?.[f.key] : undefined}
          guides={guides}
        />
      ))}
    </div>
  );
});

/**
 * Scaled wrapper around the native CertNode. Exposes the native node via `ref`
 * for export. The wrapper reserves the scaled footprint so layout is correct,
 * and hosts the (non-captured) photo adjust ring.
 */
const CertPreview = forwardRef<HTMLDivElement, CertPreviewProps>(
  function CertPreview(
    {
      type,
      data,
      scale = 1,
      guides,
      customDetails,
      photoTransform,
      fieldOffsets,
      layoutEdit,
      onPhotoTransformChange,
      onFieldOffsetChange,
    },
    ref,
  ) {
    const template = CERT_TEMPLATES[type];
    const footprint = useMemo(
      () => ({
        width: template.page.w * scale,
        height: template.page.h * scale,
      }),
      [template.page.w, template.page.h, scale],
    );

    // The fixed photo frame (if any), and the clamped transform to apply.
    const photoField = useMemo(
      () => template.fields.find((f) => f.kind === "photo"),
      [template.fields],
    );
    const frameW = photoField?.w ?? 0;
    const frameH = photoField?.h ?? 0;
    const effTransform = useMemo(
      () =>
        photoField
          ? clampPhotoTransform(
              photoTransform ?? DEFAULT_PHOTO_TRANSFORM,
              frameW,
              frameH,
            )
          : DEFAULT_PHOTO_TRANSFORM,
      [photoField, photoTransform, frameW, frameH],
    );

    const showPhotoOverlay = layoutEdit && photoField && onPhotoTransformChange;
    const movableFields = useMemo(
      () => template.fields.filter((f) => f.movable),
      [template.fields],
    );
    const showFieldOverlays = layoutEdit && onFieldOffsetChange;
    const [snapGuides, setSnapGuides] = useState<SnapGuides>({});
    // Everything a dragged block can align to: the page centre, the photo's
    // centre lines, and the other movable blocks' edges/centres where they
    // currently sit.
    const snapTargetsFor = useCallback(
      (key: string): SnapTargets => {
        const xs = [template.page.w / 2];
        const ys: number[] = [];
        if (photoField) {
          const e = boxEdges(photoField, DEFAULT_FIELD_OFFSET);
          xs.push(e.l, e.cx, e.r);
          ys.push(e.t, e.cy, e.b);
        }
        for (const f of movableFields) {
          if (f.key === key) continue;
          const e = boxEdges(f, fieldOffsets?.[f.key] ?? DEFAULT_FIELD_OFFSET);
          xs.push(e.l, e.cx, e.r);
          ys.push(e.t, e.cy, e.b);
        }
        return { xs, ys };
      },
      [template.page.w, photoField, movableFields, fieldOffsets],
    );

    return (
      <div style={{ width: footprint.width, height: footprint.height }}>
        <div
          style={{
            position: "relative",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <CertNode
            ref={ref}
            type={type}
            data={data}
            guides={guides}
            customDetails={customDetails}
            photoTransform={effTransform}
            fieldOffsets={fieldOffsets}
          />
          {showFieldOverlays &&
            movableFields.map((f) => (
              <FieldDragOverlay
                key={f.key}
                field={f}
                offset={fieldOffsets?.[f.key] ?? DEFAULT_FIELD_OFFSET}
                scale={scale}
                snapTargets={snapTargetsFor(f.key)}
                onChange={(o) => onFieldOffsetChange(f.key, o)}
                onGuides={setSnapGuides}
              />
            ))}
          {showFieldOverlays && (
            <SnapGuideLines
              guides={snapGuides}
              page={template.page}
              scale={scale}
            />
          )}
          {showPhotoOverlay && (
            <PhotoAdjustOverlay
              frame={{ x: photoField.x, y: photoField.y, w: frameW, h: frameH }}
              center={!!photoField.center}
              scale={scale}
              transform={effTransform}
              onChange={onPhotoTransformChange}
            />
          )}
        </div>
      </div>
    );
  },
);

export default CertPreview;
