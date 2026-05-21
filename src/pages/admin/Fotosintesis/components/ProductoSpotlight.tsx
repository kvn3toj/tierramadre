import { Dialog } from "@mui/material";
import { Box } from "@mui/material";
import { getFoto } from "../../../../design-system";
import type { SpotlightProduct } from "../FotosintesisLayoutContext";

interface ProductoSpotlightProps {
  open: boolean;
  onClose: () => void;
  scope?: string;
  onSelect: (product: SpotlightProduct) => void;
}

/**
 * Slice 1 stub — minimal placeholder so the layout mounts without errors.
 * Real implementation (handoff §4.5) lands in task #7 with search, filters,
 * keyboard navigation, and result rendering.
 */
export function ProductoSpotlight({
  open,
  onClose,
  scope,
}: ProductoSpotlightProps) {
  const foto = getFoto("light");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 920,
          maxWidth: "calc(100vw - 48px)",
          borderRadius: "18px",
          border: `1px solid ${foto.surfaces.rule}`,
          padding: 0,
        },
      }}
    >
      <Box sx={{ padding: "20px 24px", color: foto.ink.secondary }}>
        Spotlight (próximamente) {scope ? `— ${scope}` : ""}
      </Box>
    </Dialog>
  );
}

export default ProductoSpotlight;
