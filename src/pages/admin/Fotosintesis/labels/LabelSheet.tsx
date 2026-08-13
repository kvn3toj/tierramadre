import { LabelPreview } from './LabelPreview';
import { LabelDuoPreview } from './LabelDuoPreview';
import {
  DEFAULT_LABEL_SIZE_ID,
  LABEL_SIZES,
  type LabelSizeId,
} from './labelSizes';
import type { LabelItem } from './downloadLabelsZip';

/**
 * LabelSheet — ONE physical label, whatever stock is selected.
 *
 * Callers hand it a GROUP of items (from `chunkForLabels`) rather than a single
 * item, and this component picks the layout: `LabelPreview` for the 1-up stocks,
 * `LabelDuoPreview` for the 2-up 15 × 30 that gets cut in half.
 *
 * The point of the indirection is that every export path — PNG, ZIP, direct
 * NIIMBOT print, the on-screen proof — rasterizes exactly one node type and
 * never branches on the stock itself. Adding a 3-up stock later means editing
 * this file and the registry, not five call sites.
 */
export interface LabelSheetProps {
  /** The items on this one label. Length must be ≤ `size.itemsPerLabel`. */
  items: LabelItem[];
  size?: LabelSizeId;
  /**
   * Data-URI of the Tierra Mädre mark, for the 1-up layouts (where it doubles
   * as the "compact gallery mode" flag `LabelPreview` already understands).
   * The duo layout ignores it and uses its own print-prepared black mark — see
   * the note on `LabelDuoPreviewProps`.
   */
  logoSrc?: string | null;
}

export function LabelSheet({
  items,
  size = DEFAULT_LABEL_SIZE_ID,
  logoSrc,
}: LabelSheetProps) {
  const stock = LABEL_SIZES[size];

  if (stock.itemsPerLabel > 1) {
    return <LabelDuoPreview items={items} size={size} />;
  }

  // A 1-up stock always renders the first item; groups from `chunkForLabels`
  // are single-element there, so there is nothing to drop.
  const item = items[0];
  if (!item) return null;

  return (
    <LabelPreview
      itemId={item.itemId}
      nombre={item.nombre}
      peso={item.peso}
      size={size}
      qrLogoSrc={logoSrc ?? undefined}
    />
  );
}

export default LabelSheet;
