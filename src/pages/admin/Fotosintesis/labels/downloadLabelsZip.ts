/**
 * downloadLabelsZip — render N item labels (via a caller-supplied off-screen
 * render function) and package them into a single zip download, one PNG per
 * item, named after the item id. A zip (not a merged multi-page PDF) matches
 * the real workflow: each label gets imported into NIIMBOT's app separately
 * regardless, so the operator wants individually-named files, not pages to
 * extract from a PDF.
 */

import JSZip from 'jszip';
import { renderLabelPngBlob } from './exportLabel';

export interface LabelItem {
  itemId: string;
  nombre?: string;
  peso?: string;
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * `renderNode` mounts (or reuses) an off-screen DOM node showing the given
 * item's label and resolves with that node once it's ready to rasterize —
 * the caller owns the actual React render (e.g. re-rendering one shared
 * hidden `LabelPreview` per iteration), this module only handles the
 * rasterize→zip→download plumbing.
 */
export async function downloadLabelsZip(
  items: LabelItem[],
  filename: string,
  renderNode: (item: LabelItem) => Promise<HTMLElement>,
): Promise<void> {
  const zip = new JSZip();
  for (const item of items) {
    const node = await renderNode(item);
    const blob = await renderLabelPngBlob(node);
    zip.file(`${item.itemId}.png`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}
