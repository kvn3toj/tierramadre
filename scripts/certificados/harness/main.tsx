/**
 * Headless certificate renderer — the browser half of
 * `scripts/generar-certificados.mjs`.
 *
 * Mounts the PRODUCTION `CertPreview` at native scale and exposes
 * `window.__renderCert(draft)` → PNG data URL. Every piece of certificate logic
 * (coordinates, fonts, details auto-fit, photo auto-framing, the snapDOM raster
 * with its html2canvas fallback) is imported from `src/`, never re-written here:
 * a certificate produced by this harness is byte-for-byte what the admin page's
 * "Guardar al producto" button produces for the same input.
 *
 * The caller passes `photo` as a `data:` URL (resolved in Node), so the canvas
 * is never cross-origin-tainted and auto-framing can read the pixels.
 */

import { createRoot } from 'react-dom/client';
import CertPreview from '../../../src/pages/admin/Fotosintesis/certificados/CertPreview';
import { renderCertPngBlob } from '../../../src/pages/admin/Fotosintesis/certificados/exportCert';
import { computePhotoAutoFit } from '../../../src/pages/admin/Fotosintesis/certificados/photoAutoFit';
import {
  CERT_TEMPLATES,
  type CustomDetail,
  type PhotoTransform,
} from '../../../src/pages/admin/Fotosintesis/certificados/certTemplates';

/** The flat Origen draft, plus the operator-style extra detail rows. */
interface CertJob {
  data: Record<string, string>;
  customDetails?: CustomDetail[];
  /** skip subject detection and use this framing verbatim (rarely needed) */
  photoTransform?: PhotoTransform | null;
}

const host = document.getElementById('cert-root')!;
const root = createRoot(host);
// CertPreview forwards its ref to the NATIVE-size node, which is what the
// rasterizer must capture (not the scaled wrapper).
const nodeRef: { current: HTMLDivElement | null } = { current: null };

const PHOTO_FRAME =
  CERT_TEMPLATES.origen.fields.find((f) => f.kind === 'photo')?.w ?? 0;

/** Resolve after React has committed AND the browser has painted. */
function afterPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('no pude leer el PNG generado'));
    fr.readAsDataURL(blob);
  });
}

async function renderCert(job: CertJob): Promise<string> {
  const photo = job.data.photo ?? '';

  // Same auto-framing the admin page applies on autofill: detect the gem against
  // its flat catalog background and zoom/center it to fill the circle. Returns
  // null when there's no clear subject (or no photo) — CertPreview then falls
  // back to the default 1:1 framing, exactly as the UI does.
  const transform =
    job.photoTransform !== undefined
      ? job.photoTransform
      : photo
        ? await computePhotoAutoFit(photo, PHOTO_FRAME)
        : null;

  root.render(
    <CertPreview
      ref={nodeRef}
      type="origen"
      data={job.data}
      scale={1}
      customDetails={job.customDetails ?? []}
      photoTransform={transform}
    />,
  );

  // The details block auto-fits in a useLayoutEffect, so the measured scale is
  // settled by the time the frame after commit has painted.
  await afterPaint();

  const node = nodeRef.current;
  if (!node) throw new Error('CertPreview no montó su nodo nativo');

  // renderCertPngBlob waits for images + fonts and clones into its own sandbox,
  // so nothing here needs to pre-wait.
  return blobToDataUrl(await renderCertPngBlob(node));
}

declare global {
  interface Window {
    __renderCert: (job: CertJob) => Promise<string>;
    __harnessReady: boolean;
  }
}

window.__renderCert = renderCert;
window.__harnessReady = true;
