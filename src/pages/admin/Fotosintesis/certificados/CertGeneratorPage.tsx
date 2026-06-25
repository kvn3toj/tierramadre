/**
 * CertGeneratorPage — Generador de Certificados (Fotosíntesis admin).
 *
 * Pick a certificate type, autofill it from existing production data (a
 * treasure/gem or an ambassador/member), edit any field, preview the exact
 * design-team artwork with the variables filled in, and export a print-ready
 * PDF or shareable PNG.
 *
 * Data is read-only (useTreasure / useAsesores). Templates + coordinates live
 * in certTemplates.ts. The certificate IS the artwork — CertPreview renders the
 * rendered PDF background and overlays only the variable fields (SPEC §1).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  TextField,
  Typography,
} from "@mui/material";
import {
  Award,
  Download,
  IdCard,
  Image as ImageIcon,
  Lock,
  Printer,
  Save,
  Sprout,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { getFoto } from "../../../../design-system";
import { useNotification } from "../../../../contexts/NotificationContext";
import { useGoogleAuth } from "../../../../contexts/GoogleAuthContext";
import { useConvexClient } from "../../../../lib/convex-safe";
import { useTreasure } from "../../../../hooks/useTreasure";
import { useAsesores } from "../../../../hooks/useAsesores";
import type { TreasureItem } from "../../../../types";
import type { Asesor } from "../../../../hooks/useAsesores";
import CertPreview from "./CertPreview";
import {
  CERT_TEMPLATES,
  CERT_TYPE_ORDER,
  EMPTY_CARNET,
  EMPTY_EMBAJADOR,
  EMPTY_ORIGEN,
  slugify,
  type CarnetDraft,
  type CertTypeId,
  type EmbajadorDraft,
  type OrigenDraft,
} from "./certTemplates";
import { exportCertPdf, exportCertPng } from "./exportCert";
import { isCertificadoApproved, persistCertToProduct } from "./persistCert";

const foto = getFoto("light");

const TAB_ICON: Record<CertTypeId, React.ReactNode> = {
  origen: <Award size={15} strokeWidth={2} />,
  embajador: <Sprout size={15} strokeWidth={2} />,
  carnet: <IdCard size={15} strokeWidth={2} />,
};

// ── field mapping: existing prod data → cert draft (SPEC §5) ──────────────
function treasureToOrigen(t: TreasureItem): OrigenDraft {
  return {
    name: t.nombre ?? "",
    tipo: t.categoria ?? "",
    calidad: t.calidad ?? "",
    color: t.color ?? "",
    peso: t.peso != null ? String(t.peso) : "",
    corte: t.talla ?? "",
    joya: t.metalType ?? (t.isJewelry ? (t.categoria ?? "") : ""),
    tecnica: "",
    photo: t.imagen ?? "",
  };
}

function asesorToEmbajador(a: Asesor): EmbajadorDraft {
  return { name: a.name ?? "", photo: a.photoUrl ?? "" };
}

function asesorToCarnet(a: Asesor): CarnetDraft {
  return {
    name: a.name ?? "",
    role: a.role ?? "Embajador",
    id: a.id ?? "",
    email: a.email ?? "",
    year: "2026",
    photo: a.photoUrl ?? "",
  };
}

export default function CertGeneratorPage() {
  const { notify } = useNotification();
  const { user } = useGoogleAuth();
  const convexClient = useConvexClient();
  const { treasure } = useTreasure();
  const { asesores } = useAsesores();

  const [type, setType] = useState<CertTypeId>("origen");
  const [origen, setOrigen] = useState<OrigenDraft>(EMPTY_ORIGEN);
  const [embajador, setEmbajador] = useState<EmbajadorDraft>(EMPTY_EMBAJADOR);
  const [carnet, setCarnet] = useState<CarnetDraft>(EMPTY_CARNET);
  const [busy, setBusy] = useState(false);
  // The full TreasureItem the Origen autofill came from — kept so "Guardar al
  // producto" can resolve its lot (item + loteId). Cleared when the operator
  // edits the form by hand to a piece we can no longer attribute. The flat
  // `origen` draft intentionally drops these internal ids, so we track them here.
  const [selectedPiece, setSelectedPiece] = useState<TreasureItem | null>(null);
  const legalApproved = isCertificadoApproved();

  const certNodeRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.4);
  const [zoom, setZoom] = useState(1); // multiplier on top of fit

  // Only real, individual pieces (exclude grouped lote/sublote cards).
  const pieces = useMemo(
    () => (treasure ?? []).filter((t) => !t.isLote),
    [treasure],
  );

  // The flat draft consumed by CertPreview for the active type.
  const activeDraft: Record<string, string> = useMemo(() => {
    if (type === "origen") return origen as unknown as Record<string, string>;
    if (type === "embajador")
      return embajador as unknown as Record<string, string>;
    return carnet as unknown as Record<string, string>;
  }, [type, origen, embajador, carnet]);

  // ── fit-to-viewport ──────────────────────────────────────────────────────
  const recomputeFit = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const tpl = CERT_TEMPLATES[type];
    const availW = stage.clientWidth - 56;
    const availH = stage.clientHeight - 56;
    if (availW <= 0 || availH <= 0) return;
    const s = Math.min(availW / tpl.page.w, availH / tpl.page.h, 1.6);
    setFitScale(s > 0 ? s : 0.2);
  }, [type]);

  useEffect(() => {
    recomputeFit();
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(recomputeFit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [recomputeFit]);

  useEffect(() => {
    setZoom(1);
  }, [type]);

  const scale = fitScale * zoom;

  // ── exports ────────────────────────────────────────────────────────────
  const nameForFile = useMemo(() => {
    const n =
      type === "origen"
        ? origen.name
        : type === "embajador"
          ? embajador.name
          : carnet.name;
    return slugify(n || type);
  }, [type, origen.name, embajador.name, carnet.name]);

  const handlePdf = useCallback(async () => {
    const node = certNodeRef.current;
    if (!node) return;
    setBusy(true);
    try {
      const tpl = CERT_TEMPLATES[type];
      await exportCertPdf(
        node,
        { w: tpl.print.w, h: tpl.print.h, orientation: tpl.print.orientation },
        `TierraMadre_${type}_${nameForFile}.pdf`,
      );
      notify("PDF generado ✓", "success");
    } catch (e) {
      console.error("[CertGenerator] PDF export failed", e);
      notify("No se pudo generar el PDF", "error");
    } finally {
      setBusy(false);
    }
  }, [type, nameForFile, notify]);

  const handlePng = useCallback(async () => {
    const node = certNodeRef.current;
    if (!node) return;
    setBusy(true);
    try {
      await exportCertPng(node, `TierraMadre_${type}_${nameForFile}.png`);
      notify("PNG descargado ✓", "success");
    } catch (e) {
      console.error("[CertGenerator] PNG export failed", e);
      notify("No se pudo generar el PNG", "error");
    } finally {
      setBusy(false);
    }
  }, [type, nameForFile, notify]);

  // ── persist + link (ORIGEN → product) ────────────────────────────────────
  // Capture the same CertPreview node, upload it through the existing
  // Fotosíntesis cert-upload path, and link the hosted URL to the product so it
  // surfaces on the product-detail page (`certificateUrl`). Additive — the
  // export buttons are untouched.
  const handleSaveToProduct = useCallback(async () => {
    const node = certNodeRef.current;
    if (!node) return;

    if (!legalApproved) {
      notify(
        "Certificado pendiente: activá VITE_CERT_LEGAL_APPROVED tras la aprobación legal (Q-6).",
        "warning",
      );
      return;
    }
    if (!convexClient) {
      notify(
        "Convex no está configurado; no puedo enlazar el certificado.",
        "error",
      );
      return;
    }
    if (!selectedPiece) {
      notify(
        "Elegí una pieza del catálogo para poder enlazar el certificado a un producto.",
        "warning",
      );
      return;
    }
    if (!selectedPiece.loteId) {
      notify(
        "Este ítem no es de un lote Fotosíntesis; no puedo enlazar el certificado automáticamente.",
        "warning",
      );
      return;
    }

    setBusy(true);
    try {
      const tpl = CERT_TEMPLATES.origen;
      const { url } = await persistCertToProduct({
        client: convexClient,
        node,
        size: {
          w: tpl.print.w,
          h: tpl.print.h,
          orientation: tpl.print.orientation,
        },
        filename: `TierraMadre_origen_${nameForFile}.pdf`,
        loteId: selectedPiece.loteId,
        itemId: String(selectedPiece.item),
        editorEmail: user?.email,
      });
      console.info("[CertGenerator] cert linked to product", {
        item: selectedPiece.item,
        url,
      });
      notify(
        `Certificado guardado y enlazado al ítem #${selectedPiece.item} ✓`,
        "success",
      );
    } catch (e) {
      console.error("[CertGenerator] save-to-product failed", e);
      const msg =
        e instanceof Error ? e.message : "No se pudo guardar el certificado";
      notify(msg, "error");
    } finally {
      setBusy(false);
    }
  }, [legalApproved, convexClient, selectedPiece, nameForFile, user, notify]);

  // ── photo upload (object/data URL) ───────────────────────────────────────
  const onUploadPhoto = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = String(e.target?.result ?? "");
        if (type === "origen") setOrigen((d) => ({ ...d, photo: url }));
        else if (type === "embajador")
          setEmbajador((d) => ({ ...d, photo: url }));
        else setCarnet((d) => ({ ...d, photo: url }));
      };
      reader.readAsDataURL(file);
    },
    [type],
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 120px)",
        minHeight: 560,
      }}
    >
      {/* TABS */}
      <Box sx={{ display: "flex", gap: "8px", px: 2, pt: 1.5, pb: 0.5 }}>
        {CERT_TYPE_ORDER.map((id) => {
          const tpl = CERT_TEMPLATES[id];
          const active = id === type;
          return (
            <Box
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setType(id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.75,
                py: 1,
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: active ? foto.ink.primary : foto.ink.tertiary,
                background: active ? foto.surfaces.inset : "transparent",
                border: `1px solid ${active ? foto.surfaces.edgeStrong : "transparent"}`,
                transition: "background 120ms ease",
                "&:hover": { background: foto.surfaces.inset },
              }}
            >
              <Box
                sx={{
                  width: 11,
                  height: 11,
                  borderRadius: "3px",
                  background: tpl.swatch,
                }}
              />
              {TAB_ICON[id]}
              {tpl.label}
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          borderTop: `1px solid ${foto.surfaces.rule}`,
        }}
      >
        {/* FORM PANEL */}
        <Box
          sx={{
            width: 360,
            flexShrink: 0,
            borderRight: `1px solid ${foto.surfaces.rule}`,
            overflowY: "auto",
            p: 2.5,
            background: foto.surfaces.panel,
          }}
        >
          {type === "origen" && (
            <OrigenForm
              draft={origen}
              setDraft={setOrigen}
              pieces={pieces}
              onUploadPhoto={onUploadPhoto}
              onSelectPiece={setSelectedPiece}
            />
          )}
          {type === "embajador" && (
            <EmbajadorForm
              draft={embajador}
              setDraft={setEmbajador}
              asesores={asesores}
              onUploadPhoto={onUploadPhoto}
            />
          )}
          {type === "carnet" && (
            <CarnetForm
              draft={carnet}
              setDraft={setCarnet}
              asesores={asesores}
              onUploadPhoto={onUploadPhoto}
            />
          )}
        </Box>

        {/* PREVIEW */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* toolbar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              px: 2,
              py: 1.25,
              borderBottom: `1px solid ${foto.surfaces.rule}`,
            }}
          >
            <Typography sx={{ fontSize: 12, color: foto.ink.tertiary }}>
              Vista previa ·{" "}
              <Box component="b" sx={{ color: foto.ink.primary }}>
                {CERT_TEMPLATES[type].label}
              </Box>
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                border: `1px solid ${foto.surfaces.edge}`,
                borderRadius: "8px",
                px: 0.5,
                py: 0.25,
              }}
            >
              <IconBtn onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}>
                <ZoomOut size={15} />
              </IconBtn>
              <Typography
                sx={{
                  fontSize: 11,
                  color: foto.ink.tertiary,
                  minWidth: 42,
                  textAlign: "center",
                }}
              >
                {Math.round(scale * 100)}%
              </Typography>
              <IconBtn onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>
                <ZoomIn size={15} />
              </IconBtn>
              <IconBtn onClick={() => setZoom(1)} title="Ajustar">
                <Maximize2 size={15} />
              </IconBtn>
            </Box>
            {type === "origen" && (
              <Button
                onClick={handleSaveToProduct}
                disabled={busy || !selectedPiece}
                startIcon={<Save size={15} />}
                aria-label="Guardar el certificado y enlazarlo al producto"
                title={
                  !legalApproved
                    ? "Aprobación legal pendiente (VITE_CERT_LEGAL_APPROVED)"
                    : !selectedPiece
                      ? "Elegí una pieza del catálogo para enlazar"
                      : "Guardar y enlazar al producto"
                }
                sx={saveBtnSx}
              >
                Guardar al producto
              </Button>
            )}
            <Button
              onClick={handlePng}
              disabled={busy}
              startIcon={<Download size={15} />}
              aria-label="Descargar el certificado como PNG"
              sx={ghostBtnSx}
            >
              PNG
            </Button>
            <Button
              onClick={handlePdf}
              disabled={busy}
              startIcon={<Printer size={15} />}
              aria-label="Imprimir o exportar el certificado como PDF"
              sx={primaryBtnSx}
            >
              Imprimir / PDF
            </Button>
          </Box>

          {/* stage */}
          <Box
            ref={stageRef}
            sx={{
              flex: 1,
              overflow: "auto",
              display: "grid",
              placeItems: "center",
              p: 3,
              background:
                "radial-gradient(circle at 30% 20%, #eef3f0, #e3e8e5 70%)",
            }}
          >
            <CertPreview
              ref={certNodeRef}
              type={type}
              data={activeDraft}
              scale={scale}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── small UI helpers ────────────────────────────────────────────────────────

const ghostBtnSx = {
  textTransform: "none",
  fontWeight: 700,
  fontSize: 12.5,
  borderRadius: "9px",
  px: 1.75,
  color: foto.ink.primary,
  background: foto.surfaces.inset,
  border: `1px solid ${foto.surfaces.edge}`,
  "&:hover": { background: foto.surfaces.inset2 },
} as const;

const primaryBtnSx = {
  textTransform: "none",
  fontWeight: 700,
  fontSize: 12.5,
  borderRadius: "9px",
  px: 1.75,
  color: foto.ink.inverse,
  background: foto.accent.primary,
  "&:hover": { background: foto.accent.deep },
} as const;

// Persist-to-product action — visually distinct from the export buttons and
// sized to a 44px touch target (a11y). Disabled state dims rather than hides so
// the button never causes layout shift when a piece is/ isn't selected.
const saveBtnSx = {
  textTransform: "none",
  fontWeight: 700,
  fontSize: 12.5,
  borderRadius: "9px",
  px: 1.75,
  minHeight: 44,
  color: foto.ink.primary,
  background: foto.surfaces.inset,
  border: `1px solid ${foto.accent.primary}`,
  "&:hover": { background: foto.surfaces.inset2 },
  "&.Mui-disabled": { opacity: 0.5, color: foto.ink.tertiary },
} as const;

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      title={title}
      sx={{
        width: 26,
        height: 26,
        display: "grid",
        placeItems: "center",
        border: "none",
        background: "transparent",
        borderRadius: "6px",
        cursor: "pointer",
        color: foto.ink.tertiary,
        "&:hover": {
          background: foto.surfaces.inset2,
          color: foto.ink.primary,
        },
      }}
    >
      {children}
    </Box>
  );
}

function PanelHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        sx={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "1.1px",
          color: foto.accent.deep,
          fontWeight: 700,
          mb: 0.5,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{ fontSize: 12, color: foto.ink.tertiary, lineHeight: 1.5 }}
      >
        {lead}
      </Typography>
    </Box>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: ".6px",
          color: foto.ink.tertiary,
          mb: 0.75,
        }}
      >
        {label}
      </Typography>
      <TextField
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        size="small"
        fullWidth
        InputProps={{ sx: { fontSize: 13, background: foto.surfaces.canvas } }}
      />
    </Box>
  );
}

function PhotoInput({
  value,
  onUrl,
  onUpload,
}: {
  value: string;
  onUrl: (v: string) => void;
  onUpload: (f: File | undefined) => void;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: ".6px",
          color: foto.ink.tertiary,
          mb: 0.75,
        }}
      >
        Foto
      </Typography>
      <Box
        component="label"
        sx={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          background: foto.surfaces.canvas,
          border: `1px dashed ${foto.surfaces.edgeStrong}`,
          color: foto.ink.tertiary,
          py: 1.1,
          borderRadius: "9px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          "&:hover": {
            borderColor: foto.accent.primary,
            color: foto.ink.primary,
          },
        }}
      >
        <Upload size={14} /> Subir imagen
        <Box
          component="input"
          type="file"
          accept="image/*"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onUpload(e.target.files?.[0])
          }
          sx={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
        />
      </Box>
      <TextField
        value={value.startsWith("data:") ? "(imagen subida)" : value}
        onChange={(e) => onUrl(e.target.value)}
        placeholder="…o URL de imagen"
        size="small"
        fullWidth
        sx={{ mt: 1 }}
        InputProps={{
          startAdornment: (
            <ImageIcon size={14} style={{ marginRight: 6, opacity: 0.5 }} />
          ),
          sx: { fontSize: 13, background: foto.surfaces.canvas },
        }}
      />
    </Box>
  );
}

function LockNote({ text }: { text: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "flex-start",
        fontSize: 11,
        color: foto.ink.tertiary,
        background: foto.surfaces.inset,
        border: `1px solid ${foto.surfaces.edge}`,
        borderRadius: "8px",
        p: 1.25,
        mt: 1.5,
        lineHeight: 1.5,
      }}
    >
      <Lock size={13} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{text}</span>
    </Box>
  );
}

// ── forms ────────────────────────────────────────────────────────────────

function OrigenForm({
  draft,
  setDraft,
  pieces,
  onUploadPhoto,
  onSelectPiece,
}: {
  draft: OrigenDraft;
  setDraft: React.Dispatch<React.SetStateAction<OrigenDraft>>;
  pieces: TreasureItem[];
  onUploadPhoto: (f: File | undefined) => void;
  /** Track which catalog piece the draft came from (or null on hand-edit). */
  onSelectPiece: (piece: TreasureItem | null) => void;
}) {
  // Editing any field by hand drops the linkage attribution: the form may no
  // longer describe the originally-picked piece, so we won't auto-link a cert
  // to a product whose data was changed after autofill.
  const set = (k: keyof OrigenDraft) => (v: string) => {
    onSelectPiece(null);
    setDraft((d) => ({ ...d, [k]: v }));
  };

  return (
    <>
      <PanelHeader
        title="Certificación de Origen"
        lead="Certificado de origen de una esmeralda. Elige una pieza para autocompletar sobre la plantilla original."
      />
      <Autocomplete
        options={pieces}
        getOptionLabel={(o) => `${o.item} · ${o.nombre}`}
        onChange={(_, piece) => {
          onSelectPiece(piece ?? null);
          if (piece) setDraft(treasureToOrigen(piece));
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder="⚡ Autocompletar desde catálogo"
            InputProps={{ ...params.InputProps, sx: { fontSize: 13 } }}
          />
        )}
        sx={{ mb: 2 }}
      />
      <Field
        label="Nombre de la pieza"
        value={draft.name}
        onChange={set("name")}
      />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
        <Field label="Tipo" value={draft.tipo} onChange={set("tipo")} />
        <Field
          label="Calidad"
          value={draft.calidad}
          onChange={set("calidad")}
        />
        <Field label="Color" value={draft.color} onChange={set("color")} />
        <Field label="Peso" value={draft.peso} onChange={set("peso")} />
        <Field label="Corte" value={draft.corte} onChange={set("corte")} />
        <Field label="Joya" value={draft.joya} onChange={set("joya")} />
      </Box>
      <Field label="Técnica" value={draft.tecnica} onChange={set("tecnica")} />
      <PhotoInput
        value={draft.photo}
        onUrl={set("photo")}
        onUpload={onUploadPhoto}
      />
      <LockNote text="El mensaje, el sello, el logo y la marca de agua se conservan exactos de la plantilla del equipo de diseño." />
    </>
  );
}

function EmbajadorForm({
  draft,
  setDraft,
  asesores,
  onUploadPhoto,
}: {
  draft: EmbajadorDraft;
  setDraft: React.Dispatch<React.SetStateAction<EmbajadorDraft>>;
  asesores: Asesor[];
  onUploadPhoto: (f: File | undefined) => void;
}) {
  const set = (k: keyof EmbajadorDraft) => (v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <>
      <PanelHeader
        title="Certificado Embajador"
        lead='Reconocimiento "Embajador Semilla". Solo cambian el nombre y la foto; el resto es la plantilla original.'
      />
      <Autocomplete
        options={asesores}
        getOptionLabel={(o) => o.name}
        onChange={(_, a) => a && setDraft(asesorToEmbajador(a))}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder="⚡ Autocompletar desde usuarios"
            InputProps={{ ...params.InputProps, sx: { fontSize: 13 } }}
          />
        )}
        sx={{ mb: 2 }}
      />
      <Field
        label="Nombre del embajador"
        value={draft.name}
        onChange={set("name")}
      />
      <PhotoInput
        value={draft.photo}
        onUrl={set("photo")}
        onUpload={onUploadPhoto}
      />
      <LockNote text="Encabezado, mensaje, firma, sellos y decoración se conservan exactos de la plantilla." />
    </>
  );
}

function CarnetForm({
  draft,
  setDraft,
  asesores,
  onUploadPhoto,
}: {
  draft: CarnetDraft;
  setDraft: React.Dispatch<React.SetStateAction<CarnetDraft>>;
  asesores: Asesor[];
  onUploadPhoto: (f: File | undefined) => void;
}) {
  const set = (k: keyof CarnetDraft) => (v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <>
      <PanelHeader
        title="Carnet TM 2026"
        lead="Carnet de miembro. Versión aproximada — falta el PDF fuente del carnet para usar el arte exacto."
      />
      <Autocomplete
        options={asesores}
        getOptionLabel={(o) => o.name}
        onChange={(_, a) => a && setDraft(asesorToCarnet(a))}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder="⚡ Autocompletar desde usuarios"
            InputProps={{ ...params.InputProps, sx: { fontSize: 13 } }}
          />
        )}
        sx={{ mb: 2 }}
      />
      <Field
        label="Nombre completo"
        value={draft.name}
        onChange={set("name")}
      />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
        <Field label="Rol" value={draft.role} onChange={set("role")} />
        <Field label="ID" value={draft.id} onChange={set("id")} />
      </Box>
      <Field label="E-mail" value={draft.email} onChange={set("email")} />
      <PhotoInput
        value={draft.photo}
        onUrl={set("photo")}
        onUpload={onUploadPhoto}
      />
    </>
  );
}
