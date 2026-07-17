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

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Slider,
  TextField,
  Typography,
} from '@mui/material';
import {
  Award,
  Crop,
  Download,
  IdCard,
  Image as ImageIcon,
  Lock,
  Move,
  Plus,
  Printer,
  RotateCcw,
  Ruler,
  Save,
  Sprout,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { getFoto } from '../../../../design-system';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useGoogleAuth } from '../../../../contexts/GoogleAuthContext';
import {
  useConvexClient,
  useAuthedConvexAction,
  convexApi,
} from '../../../../lib/convex-safe';
import { useTreasure } from '../../../../hooks/useTreasure';
import { useAsesores } from '../../../../hooks/useAsesores';
import type { TreasureItem } from '../../../../types';
import type { Asesor } from '../../../../hooks/useAsesores';
import CertPreview from './CertPreview';
import {
  CERT_TEMPLATES,
  CERT_TYPE_ORDER,
  clampPhotoTransform,
  DEFAULT_PHOTO_TRANSFORM,
  EMPTY_CARNET,
  EMPTY_EMBAJADOR,
  EMPTY_ORIGEN,
  MAX_PHOTO_ZOOM,
  MIN_PHOTO_ZOOM,
  slugify,
  type CarnetDraft,
  type CertTypeId,
  type CustomDetail,
  type EmbajadorDraft,
  type OrigenDraft,
  type PhotoTransform,
} from './certTemplates';
import { exportCertPdf, exportCertPng } from './exportCert';
import { computePhotoAutoFit } from './photoAutoFit';
import { isCertificadoApproved, persistCertToProduct } from './persistCert';

const foto = getFoto('light');

const TAB_ICON: Record<CertTypeId, React.ReactNode> = {
  origen: <Award size={15} strokeWidth={2} />,
  embajador: <Sprout size={15} strokeWidth={2} />,
  carnet: <IdCard size={15} strokeWidth={2} />,
};

// ── field mapping: existing prod data → cert draft (SPEC §5) ──────────────
function treasureToOrigen(t: TreasureItem): OrigenDraft {
  return {
    name: t.nombre ?? '',
    tipo: t.categoria ?? '',
    calidad: t.calidad ?? '',
    color: t.color ?? '',
    peso: t.peso != null ? String(t.peso) : '',
    corte: t.talla ?? '',
    joya: t.metalType ?? (t.isJewelry ? (t.categoria ?? '') : ''),
    tecnica: '',
    photo: t.imagen ?? '',
    // Autofill never invents custom rows; the operator adds those by hand.
    customDetails: [],
  };
}

function asesorToEmbajador(a: Asesor): EmbajadorDraft {
  return { name: a.name ?? '', photo: a.photoUrl ?? '' };
}

function asesorToCarnet(a: Asesor): CarnetDraft {
  return {
    name: a.name ?? '',
    role: a.role ?? 'Embajador',
    id: a.id ?? '',
    email: a.email ?? '',
    year: '2026',
    photo: a.photoUrl ?? '',
  };
}

export default function CertGeneratorPage() {
  const { notify } = useNotification();
  const { user } = useGoogleAuth();
  const convexClient = useConvexClient();
  const { treasure } = useTreasure();
  const { asesores } = useAsesores();

  const [type, setType] = useState<CertTypeId>('origen');
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

  // Bulk-publish every product that already has a certificate so it shows in
  // the product-page carousel — excluding insumos (handled server-side).
  const bulkPublishCertificados = useAuthedConvexAction(
    convexApi.products.bulkPublishCertificados,
  );
  const [publishingAll, setPublishingAll] = useState(false);
  const handlePublishAllCertificados = useCallback(async () => {
    if (publishingAll) return;
    setPublishingAll(true);
    try {
      const r = await bulkPublishCertificados({});
      notify(
        `Certificados publicados: ${r.published} nuevos · ${r.alreadyPublished} ya visibles · ${r.skippedInsumo} insumos excluidos`,
        'success',
      );
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'No se pudieron publicar los certificados';
      notify(msg, 'error');
    } finally {
      setPublishingAll(false);
    }
  }, [publishingAll, bulkPublishCertificados, notify]);

  const certNodeRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.4);
  const [zoom, setZoom] = useState(1); // multiplier on top of fit
  const [guides, setGuides] = useState(false); // coordinate QA overlay
  // Photo adjust: a toggleable edit mode + a per-type image transform (zoom/pan
  // BEHIND the fixed circular frame). Stored per type so adjusting the Origen gem
  // doesn't affect the Embajador portrait. Applied to the <img> inside the
  // captured node by CertPreview (so exports reflect it). The image is clipped to
  // the circle and never spills outside it.
  const [photoEdit, setPhotoEdit] = useState(false);
  const [photoTransforms, setPhotoTransforms] = useState<
    Partial<Record<CertTypeId, PhotoTransform>>
  >({});
  const tabRefs = useRef<Array<HTMLDivElement | null>>([]);

  // The active template's photo field, if any (carnet uses a CSS fallback with
  // no overlay photo field → no adjust affordance there).
  const photoField = useMemo(
    () => CERT_TEMPLATES[type].fields.find((f) => f.kind === 'photo'),
    [type],
  );
  const templateHasPhoto = !!photoField;
  const photoTransform = photoTransforms[type] ?? DEFAULT_PHOTO_TRANSFORM;
  const photoAdjusted =
    photoTransform.zoom !== DEFAULT_PHOTO_TRANSFORM.zoom ||
    photoTransform.offsetX !== 0 ||
    photoTransform.offsetY !== 0;
  // Clamp against the active frame so the image always covers the circle.
  const setPhotoTransform = useCallback(
    (t: PhotoTransform) =>
      setPhotoTransforms((prev) => ({
        ...prev,
        [type]: photoField
          ? clampPhotoTransform(t, photoField.w ?? 0, photoField.h ?? 0)
          : t,
      })),
    [type, photoField],
  );
  const resetPhotoTransform = useCallback(
    () =>
      setPhotoTransforms((prev) => {
        if (!(type in prev)) return prev;
        const next = { ...prev };
        delete next[type];
        return next;
      }),
    [type],
  );

  // Auto-frame: detect the gem against its flat catalog background and zoom/center
  // it to fill the circle (kills the "tiny gem + blank space" look). We remember
  // the last photo we framed per type so a manual pan/zoom is never clobbered —
  // re-framing only happens when the photo itself changes.
  const autoFramedRef = useRef<Partial<Record<CertTypeId, string>>>({});
  const applyAutoFit = useCallback(
    async (targetType: CertTypeId, photo: string) => {
      const field = CERT_TEMPLATES[targetType].fields.find(
        (f) => f.kind === 'photo',
      );
      if (!field?.w) return false;
      const t = await computePhotoAutoFit(photo, field.w);
      if (!t) return false;
      setPhotoTransforms((prev) => ({ ...prev, [targetType]: t }));
      return true;
    },
    [],
  );

  // Origen only (gems on light backgrounds auto-frame reliably; portraits don't).
  useEffect(() => {
    const photo = origen.photo;
    if (!photo || type !== 'origen') return;
    if (autoFramedRef.current.origen === photo) return; // already handled
    autoFramedRef.current.origen = photo; // record up-front (don't retry on fail)
    void applyAutoFit('origen', photo);
  }, [origen.photo, type, applyAutoFit]);

  // Manual "Encuadrar" — re-run detection on demand (e.g. after a hand tweak).
  const handleAutoFit = useCallback(async () => {
    const photo =
      type === 'origen'
        ? origen.photo
        : type === 'embajador'
          ? embajador.photo
          : carnet.photo;
    if (!photo) return;
    const ok = await applyAutoFit(type, photo);
    if (!ok)
      notify(
        'No pude detectar el sujeto para encuadrar automáticamente; ajustá con el zoom.',
        'warning',
      );
  }, [type, origen.photo, embajador.photo, carnet.photo, applyAutoFit, notify]);

  // Only real, individual pieces (exclude grouped lote/sublote cards and any
  // insumo — raw supplies are never certified).
  const pieces = useMemo(
    () =>
      (treasure ?? []).filter(
        (t) => !t.isLote && !/insumo/i.test(t.categoria ?? ''),
      ),
    [treasure],
  );

  // The flat draft consumed by CertPreview for the active type.
  const activeDraft: Record<string, string> = useMemo(() => {
    if (type === 'origen') return origen as unknown as Record<string, string>;
    if (type === 'embajador')
      return embajador as unknown as Record<string, string>;
    return carnet as unknown as Record<string, string>;
  }, [type, origen, embajador, carnet]);

  // Nothing entered yet → show a guidance hint over the artwork instead of an
  // empty-looking certificate (UX: empty states).
  const isEmptyDraft = !activeDraft.name && !activeDraft.photo;

  // Roving keyboard navigation across the type tabs (a11y: tablist pattern).
  const onTabKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setType(CERT_TYPE_ORDER[index]);
      return;
    }
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % CERT_TYPE_ORDER.length;
    else if (e.key === 'ArrowLeft')
      next = (index - 1 + CERT_TYPE_ORDER.length) % CERT_TYPE_ORDER.length;
    else return;
    e.preventDefault();
    setType(CERT_TYPE_ORDER[next]);
    tabRefs.current[next]?.focus();
  }, []);

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
    setPhotoEdit(false); // leave edit mode when switching certificates
  }, [type]);

  const scale = fitScale * zoom;

  // ── exports ────────────────────────────────────────────────────────────
  const nameForFile = useMemo(() => {
    const n =
      type === 'origen'
        ? origen.name
        : type === 'embajador'
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
      notify('PDF generado ✓', 'success');
    } catch (e) {
      console.error('[CertGenerator] PDF export failed', e);
      notify('No se pudo generar el PDF', 'error');
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
      notify('PNG descargado ✓', 'success');
    } catch (e) {
      console.error('[CertGenerator] PNG export failed', e);
      notify('No se pudo generar el PNG', 'error');
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
        'Certificado pendiente: activá VITE_CERT_LEGAL_APPROVED tras la aprobación legal (Q-6).',
        'warning',
      );
      return;
    }
    if (!convexClient) {
      notify(
        'Convex no está configurado; no puedo enlazar el certificado.',
        'error',
      );
      return;
    }
    if (!selectedPiece) {
      notify(
        'Elegí una pieza del catálogo para poder enlazar el certificado a un producto.',
        'warning',
      );
      return;
    }
    if (!selectedPiece.loteId) {
      notify(
        'Este ítem no es de un lote Fotosíntesis; no puedo enlazar el certificado automáticamente.',
        'warning',
      );
      return;
    }

    setBusy(true);
    try {
      // Product-linked certs are captured as PNG (see persistCert) so they show
      // as an inline slide in the product gallery, not only as a download link.
      const { url } = await persistCertToProduct({
        client: convexClient,
        node,
        filename: `TierraMadre_origen_${nameForFile}.png`,
        loteId: selectedPiece.loteId,
        itemId: String(selectedPiece.item),
        editorEmail: user?.email,
      });
      console.info('[CertGenerator] cert linked to product', {
        item: selectedPiece.item,
        url,
      });
      notify(
        `Certificado guardado y enlazado al ítem #${selectedPiece.item} ✓`,
        'success',
      );
    } catch (e) {
      console.error('[CertGenerator] save-to-product failed', e);
      const msg =
        e instanceof Error ? e.message : 'No se pudo guardar el certificado';
      notify(msg, 'error');
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
        const url = String(e.target?.result ?? '');
        if (type === 'origen') setOrigen((d) => ({ ...d, photo: url }));
        else if (type === 'embajador')
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
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        minHeight: 560,
      }}
    >
      {/* TABS */}
      <Box
        role="tablist"
        aria-label="Tipo de certificado"
        sx={{ display: 'flex', gap: '8px', px: 2, pt: 1.5, pb: 0.5 }}
      >
        {CERT_TYPE_ORDER.map((id, index) => {
          const tpl = CERT_TEMPLATES[id];
          const active = id === type;
          return (
            <Box
              key={id}
              ref={(el: HTMLDivElement | null) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setType(id)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.75,
                py: 1,
                minHeight: 40,
                borderRadius: '10px',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: 13,
                fontWeight: 600,
                color: active ? foto.ink.primary : foto.ink.tertiary,
                background: active ? foto.surfaces.inset : 'transparent',
                border: `1px solid ${active ? foto.surfaces.edgeStrong : 'transparent'}`,
                transition: 'background 120ms ease, color 120ms ease',
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                },
                '&:hover': { background: foto.surfaces.inset },
                '&:focus-visible': {
                  outline: '2px solid transparent',
                  boxShadow: `0 0 0 2px ${foto.surfaces.canvas}, 0 0 0 4px ${foto.accent.primary}`,
                },
              }}
            >
              <Box
                sx={{
                  width: 11,
                  height: 11,
                  borderRadius: '3px',
                  background: tpl.swatch,
                }}
              />
              {TAB_ICON[id]}
              {tpl.label}
            </Box>
          );
        })}

        {/* Bulk-publish all existing certificates (excludes insumos). */}
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={handlePublishAllCertificados}
          disabled={publishingAll}
          startIcon={
            publishingAll ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Sprout size={16} />
            )
          }
          sx={{
            alignSelf: 'center',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 13,
            borderRadius: '10px',
            color: foto.ink.primary,
            border: `1px solid ${foto.surfaces.edgeStrong}`,
            '&:hover': { background: foto.surfaces.inset },
          }}
        >
          {publishingAll ? 'Publicando…' : 'Publicar todos los certificados'}
        </Button>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
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
            overflowY: 'auto',
            p: 2.5,
            background: foto.surfaces.panel,
          }}
        >
          {type === 'origen' && (
            <OrigenForm
              draft={origen}
              setDraft={setOrigen}
              pieces={pieces}
              onUploadPhoto={onUploadPhoto}
              onSelectPiece={setSelectedPiece}
              photoAdjust={{
                zoom: photoTransform.zoom,
                min: MIN_PHOTO_ZOOM,
                max: MAX_PHOTO_ZOOM,
                adjusted: photoAdjusted,
                onZoom: (z) =>
                  setPhotoTransform({ ...photoTransform, zoom: z }),
                onReset: resetPhotoTransform,
                onAutoFit: handleAutoFit,
              }}
            />
          )}
          {type === 'embajador' && (
            <EmbajadorForm
              draft={embajador}
              setDraft={setEmbajador}
              asesores={asesores}
              onUploadPhoto={onUploadPhoto}
              photoAdjust={{
                zoom: photoTransform.zoom,
                min: MIN_PHOTO_ZOOM,
                max: MAX_PHOTO_ZOOM,
                adjusted: photoAdjusted,
                onZoom: (z) =>
                  setPhotoTransform({ ...photoTransform, zoom: z }),
                onReset: resetPhotoTransform,
                onAutoFit: handleAutoFit,
              }}
            />
          )}
          {type === 'carnet' && (
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
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* toolbar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 2,
              py: 1.25,
              borderBottom: `1px solid ${foto.surfaces.rule}`,
            }}
          >
            <Typography sx={{ fontSize: 12, color: foto.ink.tertiary }}>
              Vista previa ·{' '}
              <Box component="b" sx={{ color: foto.ink.primary }}>
                {CERT_TEMPLATES[type].label}
              </Box>
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                border: `1px solid ${foto.surfaces.edge}`,
                borderRadius: '8px',
                px: 0.5,
                py: 0.25,
              }}
            >
              <IconBtn
                label="Alejar"
                onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
              >
                <ZoomOut size={15} />
              </IconBtn>
              <Typography
                aria-live="polite"
                sx={{
                  fontSize: 11,
                  color: foto.ink.tertiary,
                  minWidth: 42,
                  textAlign: 'center',
                }}
              >
                {Math.round(scale * 100)}%
              </Typography>
              <IconBtn
                label="Acercar"
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              >
                <ZoomIn size={15} />
              </IconBtn>
              <IconBtn label="Ajustar a la pantalla" onClick={() => setZoom(1)}>
                <Maximize2 size={15} />
              </IconBtn>
            </Box>
            <IconBtn
              label="Mostrar guías de coordenadas"
              active={guides}
              toggle
              onClick={() => setGuides((g) => !g)}
            >
              <Ruler size={15} />
            </IconBtn>
            {templateHasPhoto && activeDraft.photo && (
              <IconBtn
                label="Encuadrar la foto automáticamente (detecta y centra el sujeto)"
                onClick={handleAutoFit}
              >
                <Crop size={15} />
              </IconBtn>
            )}
            {templateHasPhoto && (
              <IconBtn
                label={
                  photoEdit
                    ? 'Salir del ajuste de la foto'
                    : 'Ajustar la foto (zoom y posición dentro del círculo)'
                }
                active={photoEdit}
                toggle
                onClick={() => setPhotoEdit((v) => !v)}
              >
                <Move size={15} />
              </IconBtn>
            )}
            {templateHasPhoto && photoAdjusted && (
              <IconBtn
                label="Restablecer el encuadre de la foto"
                onClick={resetPhotoTransform}
              >
                <RotateCcw size={15} />
              </IconBtn>
            )}
            {type === 'origen' && (
              <Button
                onClick={handleSaveToProduct}
                disabled={busy || !selectedPiece}
                startIcon={<Save size={15} />}
                aria-label="Guardar el certificado y enlazarlo al producto"
                title={
                  !legalApproved
                    ? 'Aprobación legal pendiente (VITE_CERT_LEGAL_APPROVED)'
                    : !selectedPiece
                      ? 'Elegí una pieza del catálogo para enlazar'
                      : 'Guardar y enlazar al producto'
                }
                sx={saveBtnSx}
              >
                Guardar al producto
              </Button>
            )}
            <Button
              onClick={handlePng}
              disabled={busy}
              startIcon={
                busy ? (
                  <CircularProgress size={14} sx={{ color: 'inherit' }} />
                ) : (
                  <Download size={15} />
                )
              }
              aria-label="Descargar el certificado como PNG"
              sx={ghostBtnSx}
            >
              PNG
            </Button>
            <Button
              onClick={handlePdf}
              disabled={busy}
              startIcon={
                busy ? (
                  <CircularProgress size={14} sx={{ color: 'inherit' }} />
                ) : (
                  <Printer size={15} />
                )
              }
              aria-label="Imprimir o exportar el certificado como PDF"
              sx={primaryBtnSx}
            >
              {busy ? 'Generando…' : 'Imprimir / PDF'}
            </Button>
          </Box>

          {/* stage */}
          <Box
            ref={stageRef}
            sx={{
              position: 'relative',
              flex: 1,
              overflow: 'auto',
              display: 'grid',
              placeItems: 'center',
              p: 3,
              background:
                'radial-gradient(circle at 30% 20%, #eef3f0, #e3e8e5 70%)',
            }}
          >
            <CertPreview
              ref={certNodeRef}
              type={type}
              data={activeDraft}
              scale={scale}
              guides={guides}
              customDetails={
                type === 'origen' ? origen.customDetails : undefined
              }
              photoTransform={photoTransform}
              photoEdit={photoEdit}
              onPhotoTransformChange={setPhotoTransform}
            />
            {isEmptyDraft && (
              <Box
                role="status"
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.75,
                  py: 1,
                  borderRadius: '10px',
                  background: foto.surfaces.panel,
                  border: `1px solid ${foto.surfaces.edge}`,
                  boxShadow: '0 6px 20px rgba(0,0,0,.08)',
                  fontSize: 12,
                  color: foto.ink.secondary,
                  pointerEvents: 'none',
                  maxWidth: '90%',
                }}
              >
                <Award size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
                Elegí un registro en el panel izquierdo para autocompletar el
                certificado, o escribí los campos a mano.
              </Box>
            )}
            {photoEdit && !isEmptyDraft && (
              <Box
                role="status"
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.75,
                  py: 1,
                  borderRadius: '10px',
                  background: foto.surfaces.panel,
                  border: `1px solid ${foto.accent.primary}`,
                  boxShadow: '0 6px 20px rgba(0,0,0,.08)',
                  fontSize: 12,
                  color: foto.ink.secondary,
                  pointerEvents: 'none',
                  maxWidth: '90%',
                }}
              >
                <Move size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
                Arrastrá la foto para reposicionarla dentro del círculo; usá la
                rueda o «Zoom de la foto» para acercarla. La imagen queda
                recortada al círculo y el aro no aparece en la exportación.
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── small UI helpers ────────────────────────────────────────────────────────

const ghostBtnSx = {
  textTransform: 'none',
  fontWeight: 700,
  fontSize: 12.5,
  borderRadius: '9px',
  px: 1.75,
  color: foto.ink.primary,
  background: foto.surfaces.inset,
  border: `1px solid ${foto.surfaces.edge}`,
  '&:hover': { background: foto.surfaces.inset2 },
} as const;

const primaryBtnSx = {
  textTransform: 'none',
  fontWeight: 700,
  fontSize: 12.5,
  borderRadius: '9px',
  px: 1.75,
  color: foto.ink.inverse,
  background: foto.accent.primary,
  '&:hover': { background: foto.accent.deep },
} as const;

// Persist-to-product action — visually distinct from the export buttons and
// sized to a 44px touch target (a11y). Disabled state dims rather than hides so
// the button never causes layout shift when a piece is/ isn't selected.
const saveBtnSx = {
  textTransform: 'none',
  fontWeight: 700,
  fontSize: 12.5,
  borderRadius: '9px',
  px: 1.75,
  minHeight: 44,
  color: foto.ink.primary,
  background: foto.surfaces.inset,
  border: `1px solid ${foto.accent.primary}`,
  '&:hover': { background: foto.surfaces.inset2 },
  '&.Mui-disabled': { opacity: 0.5, color: foto.ink.tertiary },
} as const;

function IconBtn({
  children,
  onClick,
  label,
  active = false,
  toggle = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  /** accessible name for the icon-only button (a11y) + native tooltip */
  label: string;
  active?: boolean;
  /** true only for genuine toggle buttons — momentary actions must NOT expose
   *  aria-pressed (it would announce them as "toggle button, not pressed"). */
  toggle?: boolean;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      {...(toggle ? { 'aria-pressed': active } : {})}
      sx={{
        width: 30,
        height: 30,
        display: 'grid',
        placeItems: 'center',
        border: 'none',
        background: active ? foto.accent.soft : 'transparent',
        borderRadius: '6px',
        cursor: 'pointer',
        color: active ? foto.accent.deep : foto.ink.tertiary,
        transition: 'background 120ms ease, color 120ms ease',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        '&:hover': {
          background: foto.surfaces.inset2,
          color: foto.ink.primary,
        },
        '&:focus-visible': {
          outline: '2px solid transparent',
          boxShadow: `0 0 0 2px ${foto.surfaces.canvas}, 0 0 0 4px ${foto.accent.primary}`,
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
          textTransform: 'uppercase',
          letterSpacing: '1.1px',
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
  const inputId = useId();
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        component="label"
        htmlFor={inputId}
        sx={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '.6px',
          color: foto.ink.tertiary,
          mb: 0.75,
        }}
      >
        {label}
      </Typography>
      <TextField
        id={inputId}
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

/** Zoom/reset controls for the photo's framing within the fixed circle. */
interface PhotoAdjustControl {
  zoom: number;
  min: number;
  max: number;
  /** whether the framing differs from the default (drives the reset link) */
  adjusted: boolean;
  onZoom: (z: number) => void;
  onReset: () => void;
  /** detect + center the subject to fill the circle */
  onAutoFit: () => void;
}

function PhotoInput({
  value,
  onUrl,
  onUpload,
  adjust,
}: {
  value: string;
  onUrl: (v: string) => void;
  onUpload: (f: File | undefined) => void;
  /** when present (origen/embajador), shows a zoom slider for the circle image */
  adjust?: PhotoAdjustControl;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '.6px',
          color: foto.ink.tertiary,
          mb: 0.75,
        }}
      >
        Foto
      </Typography>
      <Box
        component="label"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          background: foto.surfaces.canvas,
          border: `1px dashed ${foto.surfaces.edgeStrong}`,
          color: foto.ink.tertiary,
          py: 1.1,
          borderRadius: '9px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': {
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
          sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
        />
      </Box>
      <TextField
        value={value.startsWith('data:') ? '(imagen subida)' : value}
        onChange={(e) => onUrl(e.target.value)}
        placeholder="…o URL de imagen"
        aria-label="URL de la imagen"
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
      {adjust && value && (
        <Box sx={{ mt: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.25,
            }}
          >
            <Typography
              component="label"
              htmlFor="cert-photo-zoom"
              sx={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.6px',
                color: foto.ink.tertiary,
              }}
            >
              Zoom de la foto
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="button"
                type="button"
                onClick={adjust.onAutoFit}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  border: 'none',
                  background: 'transparent',
                  color: foto.accent.deep,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  px: 0.5,
                  borderRadius: '6px',
                  '&:hover': { textDecoration: 'underline' },
                  '&:focus-visible': {
                    outline: '2px solid transparent',
                    boxShadow: `0 0 0 2px ${foto.surfaces.canvas}, 0 0 0 4px ${foto.accent.primary}`,
                  },
                }}
              >
                <Crop size={12} /> Encuadrar
              </Box>
              {adjust.adjusted && (
                <Box
                  component="button"
                  type="button"
                  onClick={adjust.onReset}
                  sx={{
                    border: 'none',
                    background: 'transparent',
                    color: foto.ink.tertiary,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    px: 0.5,
                    borderRadius: '6px',
                    '&:hover': { textDecoration: 'underline' },
                    '&:focus-visible': {
                      outline: '2px solid transparent',
                      boxShadow: `0 0 0 2px ${foto.surfaces.canvas}, 0 0 0 4px ${foto.accent.primary}`,
                    },
                  }}
                >
                  Restablecer
                </Box>
              )}
            </Box>
          </Box>
          <Slider
            id="cert-photo-zoom"
            value={adjust.zoom}
            min={adjust.min}
            max={adjust.max}
            step={0.05}
            onChange={(_, v) => adjust.onZoom(Array.isArray(v) ? v[0] : v)}
            aria-label="Zoom de la foto dentro del círculo"
            sx={{ color: foto.accent.primary, mt: 0.5 }}
          />
          <Typography sx={{ fontSize: 11, color: foto.ink.tertiary }}>
            La imagen se recorta al círculo. Arrastrala en la vista previa para
            reposicionarla.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function LockNote({ text }: { text: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        fontSize: 11,
        color: foto.ink.tertiary,
        background: foto.surfaces.inset,
        border: `1px solid ${foto.surfaces.edge}`,
        borderRadius: '8px',
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

// Monotonic, collision-free id for operator-added detail rows — survives the
// OrigenForm remounting on tab switches (a per-mount counter would not).
let _customDetailSeq = 0;
function newCustomDetailId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      return crypto.randomUUID();
  } catch {
    /* fall through to the sequence */
  }
  _customDetailSeq += 1;
  return `cd-${_customDetailSeq}`;
}

/**
 * Editor for operator-added detail lines (label + content). Each row appends a
 * "Nombre: Contenido" line to the certificate's detail block; the preview
 * auto-fits so extra lines never overflow the artwork.
 */
function CustomDetailsEditor({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: CustomDetail[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<CustomDetail>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '.6px',
          color: foto.ink.tertiary,
          mb: 0.75,
        }}
      >
        Detalles adicionales
      </Typography>
      {items.map((item, i) => (
        <Box
          key={item.id}
          sx={{
            border: `1px solid ${foto.surfaces.edge}`,
            borderRadius: '9px',
            p: 1.25,
            mb: 1,
            background: foto.surfaces.canvas,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.75,
            }}
          >
            <Typography sx={{ fontSize: 11, color: foto.ink.tertiary }}>
              Campo {i + 1}
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Eliminar el campo ${i + 1}`}
              title="Eliminar campo"
              sx={{
                width: 28,
                height: 28,
                display: 'grid',
                placeItems: 'center',
                border: 'none',
                background: 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                color: foto.ink.tertiary,
                '&:hover': {
                  background: foto.surfaces.inset2,
                  color: '#b3261e',
                },
                '&:focus-visible': {
                  outline: '2px solid transparent',
                  boxShadow: `0 0 0 2px ${foto.surfaces.canvas}, 0 0 0 4px ${foto.accent.primary}`,
                },
              }}
            >
              <Trash2 size={14} />
            </Box>
          </Box>
          <TextField
            value={item.label}
            onChange={(e) => onUpdate(item.id, { label: e.target.value })}
            placeholder="Nombre del campo (p. ej. Certificado N°)"
            aria-label={`Nombre del campo ${i + 1}`}
            size="small"
            fullWidth
            sx={{ mb: 0.75 }}
            InputProps={{
              sx: { fontSize: 13, background: foto.surfaces.canvas },
            }}
          />
          <TextField
            value={item.value}
            onChange={(e) => onUpdate(item.id, { value: e.target.value })}
            placeholder="Contenido (p. ej. TM-0042)"
            aria-label={`Contenido del campo ${i + 1}`}
            size="small"
            fullWidth
            InputProps={{
              sx: { fontSize: 13, background: foto.surfaces.canvas },
            }}
          />
        </Box>
      ))}
      <Box
        component="button"
        type="button"
        onClick={onAdd}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          width: '100%',
          py: 1,
          border: `1px dashed ${foto.surfaces.edgeStrong}`,
          borderRadius: '9px',
          background: 'transparent',
          color: foto.ink.secondary,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': {
            borderColor: foto.accent.primary,
            color: foto.ink.primary,
          },
          '&:focus-visible': {
            outline: '2px solid transparent',
            boxShadow: `0 0 0 2px ${foto.surfaces.canvas}, 0 0 0 4px ${foto.accent.primary}`,
          },
        }}
      >
        <Plus size={14} /> Agregar campo
      </Box>
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
  photoAdjust,
}: {
  draft: OrigenDraft;
  setDraft: React.Dispatch<React.SetStateAction<OrigenDraft>>;
  pieces: TreasureItem[];
  onUploadPhoto: (f: File | undefined) => void;
  /** Track which catalog piece the draft came from (or null on hand-edit). */
  onSelectPiece: (piece: TreasureItem | null) => void;
  photoAdjust: PhotoAdjustControl;
}) {
  // Editing any field by hand drops the linkage attribution: the form may no
  // longer describe the originally-picked piece, so we won't auto-link a cert
  // to a product whose data was changed after autofill.
  const set = (k: keyof OrigenDraft) => (v: string) => {
    onSelectPiece(null);
    setDraft((d) => ({ ...d, [k]: v }));
  };

  // Custom detail rows are additive operator info, not piece identity, so they
  // do NOT drop the product linkage the way editing a core field does.
  const addCustom = () =>
    setDraft((d) => ({
      ...d,
      customDetails: [
        ...d.customDetails,
        { id: newCustomDetailId(), label: '', value: '' },
      ],
    }));
  const updateCustom = (id: string, patch: Partial<CustomDetail>) =>
    setDraft((d) => ({
      ...d,
      customDetails: d.customDetails.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));
  const removeCustom = (id: string) =>
    setDraft((d) => ({
      ...d,
      customDetails: d.customDetails.filter((c) => c.id !== id),
    }));

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
            inputProps={{
              ...params.inputProps,
              'aria-label': 'Buscar pieza del catálogo',
            }}
            InputProps={{ ...params.InputProps, sx: { fontSize: 13 } }}
          />
        )}
        sx={{ mb: 2 }}
      />
      <Field
        label="Nombre de la pieza"
        value={draft.name}
        onChange={set('name')}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        <Field label="Tipo" value={draft.tipo} onChange={set('tipo')} />
        <Field
          label="Calidad"
          value={draft.calidad}
          onChange={set('calidad')}
        />
        <Field label="Color" value={draft.color} onChange={set('color')} />
        <Field label="Peso" value={draft.peso} onChange={set('peso')} />
        <Field label="Corte" value={draft.corte} onChange={set('corte')} />
        <Field label="Joya" value={draft.joya} onChange={set('joya')} />
      </Box>
      <Field label="Técnica" value={draft.tecnica} onChange={set('tecnica')} />
      <CustomDetailsEditor
        items={draft.customDetails}
        onAdd={addCustom}
        onUpdate={updateCustom}
        onRemove={removeCustom}
      />
      <PhotoInput
        value={draft.photo}
        onUrl={set('photo')}
        onUpload={onUploadPhoto}
        adjust={photoAdjust}
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
  photoAdjust,
}: {
  draft: EmbajadorDraft;
  setDraft: React.Dispatch<React.SetStateAction<EmbajadorDraft>>;
  asesores: Asesor[];
  onUploadPhoto: (f: File | undefined) => void;
  photoAdjust: PhotoAdjustControl;
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
            inputProps={{
              ...params.inputProps,
              'aria-label': 'Buscar usuario',
            }}
            InputProps={{ ...params.InputProps, sx: { fontSize: 13 } }}
          />
        )}
        sx={{ mb: 2 }}
      />
      <Field
        label="Nombre del embajador"
        value={draft.name}
        onChange={set('name')}
      />
      <PhotoInput
        value={draft.photo}
        onUrl={set('photo')}
        onUpload={onUploadPhoto}
        adjust={photoAdjust}
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
            inputProps={{
              ...params.inputProps,
              'aria-label': 'Buscar usuario',
            }}
            InputProps={{ ...params.InputProps, sx: { fontSize: 13 } }}
          />
        )}
        sx={{ mb: 2 }}
      />
      <Field
        label="Nombre completo"
        value={draft.name}
        onChange={set('name')}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        <Field label="Rol" value={draft.role} onChange={set('role')} />
        <Field label="ID" value={draft.id} onChange={set('id')} />
      </Box>
      <Field label="E-mail" value={draft.email} onChange={set('email')} />
      <PhotoInput
        value={draft.photo}
        onUrl={set('photo')}
        onUpload={onUploadPhoto}
      />
    </>
  );
}
