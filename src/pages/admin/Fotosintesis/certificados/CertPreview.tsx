/**
 * CertPreview — renders a certificate at its native pixel coordinate space.
 *
 * The artwork (`template.background`) is an <img> filling the page box at exact
 * dimensions; overlay fields are absolutely positioned in the SAME coordinate
 * space, so the SPEC coordinates map 1:1. The whole node is scaled to fit the
 * viewport via `transform: scale()` on a wrapper — the inner node keeps native
 * px so html2canvas/print capture it at full resolution.
 *
 * Pure function of (template, data). No data fetching, no side effects.
 */

import { forwardRef, useMemo } from "react";
import {
  CERT_TEMPLATES,
  type CertTemplate,
  type CertTypeId,
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
}

function fieldBoxStyle(f: TemplateField): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    left: f.x,
    top: f.y,
    width: f.w,
    height: f.h,
    overflow: "hidden",
  };
  if (f.center) base.transform = "translate(-50%, -50%)";
  else if (f.centerX) base.transform = "translateX(-50%)";
  if (f.cover) base.background = f.cover;
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

/** Render the ordered, non-empty detail lines for the Origen details field. */
function DetailsField({
  template,
  field,
  data,
}: {
  template: CertTemplate;
  field: TemplateField;
  data: Record<string, string>;
}) {
  const lines = (template.detailLines ?? [])
    .map((dl) => ({ label: dl.label, value: (data[dl.key] ?? "").trim() }))
    .filter((l) => l.value.length > 0);

  return (
    <div style={fieldBoxStyle(field)}>
      {lines.map((l) => (
        <div key={l.label}>
          <span style={{ color: field.labelColor, fontWeight: 700 }}>
            {l.label}:
          </span>{" "}
          {l.value}
        </div>
      ))}
    </div>
  );
}

function OverlayField({
  template,
  field,
  data,
}: {
  template: CertTemplate;
  field: TemplateField;
  data: Record<string, string>;
}) {
  if (field.kind === "photo") {
    const src = data[field.key] || "";
    return (
      <div
        style={{
          ...fieldBoxStyle(field),
          borderRadius: field.shape === "circle" ? "50%" : undefined,
          background: "transparent",
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            crossOrigin="anonymous"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : null}
      </div>
    );
  }

  if (field.kind === "details") {
    return <DetailsField template={template} field={field} data={data} />;
  }

  // text
  return (
    <div style={fieldBoxStyle(field)}>
      <span>{data[field.key] || ""}</span>
    </div>
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
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 30, lineHeight: 1, marginBottom: 4 }}>
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
        <div style={{ fontSize: 7, letterSpacing: ".3em", marginTop: 2, opacity: 0.92 }}>
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
        <div style={{ fontSize: 12.5, color: "#5a5b50" }}>{data.email || ""}</div>
      </div>
    </div>
  );
}

/**
 * The native-size certificate node. `ref` points at THIS node so export
 * captures it at scale 1 (the wrapper's CSS scale doesn't affect the ref node's
 * own layout box).
 */
const CertNode = forwardRef<HTMLDivElement, { type: CertTypeId; data: Record<string, string>; guides?: boolean }>(
  function CertNode({ type, data, guides }, ref) {
    const template = CERT_TEMPLATES[type];

    if (template.approxArt && type === "carnet") {
      return (
        <div ref={ref} style={{ background: "#fff", boxShadow: "0 30px 70px rgba(0,0,0,.45)" }}>
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
          <div
            key={f.key}
            style={
              guides
                ? { outline: "1.5px solid rgba(255,0,90,.9)" }
                : undefined
            }
          >
            <OverlayField template={template} field={f} data={data} />
          </div>
        ))}
      </div>
    );
  },
);

/**
 * Scaled wrapper around the native CertNode. Exposes the native node via `ref`
 * for export. The wrapper reserves the scaled footprint so layout is correct.
 */
const CertPreview = forwardRef<HTMLDivElement, CertPreviewProps>(
  function CertPreview({ type, data, scale = 1, guides }, ref) {
    const template = CERT_TEMPLATES[type];
    const footprint = useMemo(
      () => ({
        width: template.page.w * scale,
        height: template.page.h * scale,
      }),
      [template.page.w, template.page.h, scale],
    );

    return (
      <div style={{ width: footprint.width, height: footprint.height }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <CertNode ref={ref} type={type} data={data} guides={guides} />
        </div>
      </div>
    );
  },
);

export default CertPreview;
