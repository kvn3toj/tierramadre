/**
 * Lazy-load jsPDF so the main bundle does not include jspdf until catalog/PDF flows run.
 * Call `ensureJsPDFLoaded()` at the start of `generateCatalog` (or any PDF entrypoint).
 */

export type JsPDFModule = typeof import('jspdf');

let cached: JsPDFModule | null = null;

export async function ensureJsPDFLoaded(): Promise<JsPDFModule> {
  if (!cached) {
    cached = await import('jspdf');
  }
  return cached;
}

export function getJsPDFRuntime(): JsPDFModule {
  if (!cached) {
    throw new Error(
      '[pdf] jsPDF not loaded — call ensureJsPDFLoaded() before using PDF helpers'
    );
  }
  return cached;
}

/** GState constructor after `ensureJsPDFLoaded()` */
export function getGState() {
  return getJsPDFRuntime().GState;
}
