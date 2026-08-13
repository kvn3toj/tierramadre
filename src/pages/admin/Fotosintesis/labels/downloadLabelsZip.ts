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
 * Name one PNG after the items printed on it. A 1-up label keeps the plain
 * `497.png` the operator (and every existing lote zip) already expects; a 2-up
 * label becomes `497+509.png`, so the filename says what is on the sticker
 * without opening it.
 *
 * `+` rather than `-` or `_`: item ids can themselves carry those as suffixes
 * (`497-A`), and a separator that also appears inside an id makes the name
 * ambiguous to read back.
 */
function zipEntryName(group: LabelItem[]): string {
  return `${group.map((item) => item.itemId).join('+')}.png`;
}

/**
 * Render and zip N PHYSICAL labels, where one label may carry more than one
 * item (see `chunkForLabels`). This is the general form; `downloadLabelsZip`
 * below is the one-item-per-label special case kept for existing callers.
 *
 * `renderNode` mounts (or reuses) an off-screen DOM node showing the given
 * group's label and resolves with that node once it's ready to rasterize —
 * the caller owns the actual React render (e.g. re-rendering one shared
 * hidden `LabelSheet` per iteration), this module only handles the
 * rasterize→zip→download plumbing.
 */
export async function downloadLabelGroupsZip(
  groups: LabelItem[][],
  filename: string,
  renderNode: (group: LabelItem[]) => Promise<HTMLElement>,
): Promise<void> {
  const zip = new JSZip();
  for (const group of groups) {
    if (group.length === 0) continue;
    const node = await renderNode(group);
    const blob = await renderLabelPngBlob(node);
    zip.file(zipEntryName(group), blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

/**
 * One item per label. Thin wrapper over `downloadLabelGroupsZip`, kept so the
 * callers that only ever print 1-up stock never have to know groups exist.
 */
export async function downloadLabelsZip(
  items: LabelItem[],
  filename: string,
  renderNode: (item: LabelItem) => Promise<HTMLElement>,
): Promise<void> {
  return downloadLabelGroupsZip(
    items.map((item) => [item]),
    filename,
    (group) => renderNode(group[0]),
  );
}
