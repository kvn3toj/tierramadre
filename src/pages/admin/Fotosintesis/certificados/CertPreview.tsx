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
  DEFAULT_PHOTO_TRANSFORM,
  type CertTemplate,
  type CertTypeId,
  type CustomDetail,
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
  /** when true, render the pan/zoom adjust ring for the photo */
  photoEdit?: boolean;
  /** called with the new transform while the operator pans/zooms the photo */
  onPhotoTransformChange?: (t: PhotoTransform) => void;
}

/** smallest auto-fit scale for the details block before we let it clip */
const MIN_DETAILS_FIT = 0.5;

function fieldBoxStyle(f: TemplateField, guides = false): React.CSSProperties {
  const w = f.w ?? 0;
  const h = f.h ?? 0;
  // Center via PIXEL offsets, NOT transform: translate(-50%): html2canvas 1.4.1
  // does not resolve percentage transforms, so a translate-centered box lands in
  // the wrong place (bottom-right) in the exported raster while looking correct
  // on screen. Pixel left/top is layout-equivalent and renders identically in
  // both the browser preview and the html2canvas capture.
  const base: React.CSSProperties = {
    position: "absolute",
    left: f.center || f.centerX ? f.x - w / 2 : f.x,
    top: f.center ? f.y - h / 2 : f.y,
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
  guides,
}: {
  template: CertTemplate;
  field: TemplateField;
  data: Record<string, string>;
  customDetails?: CustomDetail[];
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
    <div style={fieldBoxStyle(field, guides)}>
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
        background: "transparent",
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
  guides,
}: {
  template: CertTemplate;
  field: TemplateField;
  data: Record<string, string>;
  customDetails?: CustomDetail[];
  /** clamped transform for the photo field (image zoom/pan within the circle) */
  photoTransform?: PhotoTransform;
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
        guides={guides}
      />
    );
  }

  // text
  return (
    <div style={fieldBoxStyle(field, guides)}>
      <span>{data[field.key] || ""}</span>
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
  const panning = useRef<{
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  // In-flight teardown so an unmount mid-drag still removes document listeners.
  const teardown = useRef<(() => void) | null>(null);
  useEffect(() => () => teardown.current?.(), []);

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

  const beginPan = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const { transform } = stateRef.current;
    panning.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: transform.offsetX,
      startY: transform.offsetY,
    };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const p = panning.current;
      if (!p) return;
      if (ev.buttons === 0) {
        onUp();
        return;
      }
      const { scale, transform, onChange } = stateRef.current;
      onChange({
        ...transform,
        offsetX: p.startX + (ev.clientX - p.startClientX) / scale,
        offsetY: p.startY + (ev.clientY - p.startClientY) / scale,
      });
    };
    const onUp = () => {
      panning.current = null;
      teardown.current = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
    teardown.current = onUp;
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { transform, onChange } = stateRef.current;
    const step = e.shiftKey ? 24 : 8;
    let next: PhotoTransform | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = { ...transform, offsetX: transform.offsetX - step };
        break;
      case "ArrowRight":
        next = { ...transform, offsetX: transform.offsetX + step };
        break;
      case "ArrowUp":
        next = { ...transform, offsetY: transform.offsetY - step };
        break;
      case "ArrowDown":
        next = { ...transform, offsetY: transform.offsetY + step };
        break;
      case "+":
      case "=":
        next = { ...transform, zoom: transform.zoom + 0.1 };
        break;
      case "-":
      case "_":
        next = { ...transform, zoom: transform.zoom - 0.1 };
        break;
      default:
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
  }
>(function CertNode(
  { type, data, guides, customDetails, photoTransform },
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
      {template.fields.map((f) => (
        <OverlayField
          key={f.key}
          template={template}
          field={f}
          data={data}
          customDetails={customDetails}
          photoTransform={f.kind === "photo" ? photoTransform : undefined}
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
      photoEdit,
      onPhotoTransformChange,
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

    const showOverlay = photoEdit && photoField && onPhotoTransformChange;

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
          />
          {showOverlay && (
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
