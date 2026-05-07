/**
 * ChromaBar — row's left-edge accent for the Fotosíntesis ledger.
 *
 * 5×38 px band. When the thumbnail's dominant color has been sampled,
 * we paint that hex; otherwise we fall back to the emerald accent at
 * 40% opacity so the row's structure still reads.
 *
 * Spec: docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md
 */

import { Box } from "@mui/material";
import type { FotoTokens } from "../../../design-system";

interface ChromaBarProps {
  hex: string | undefined;
  foto: FotoTokens;
}

export function ChromaBar({ hex, foto }: ChromaBarProps) {
  const color = hex ?? foto.accent.primary;
  return (
    <Box
      aria-hidden
      data-chroma-bar
      sx={{
        width: "5px",
        height: "38px",
        borderRadius: "0 3px 3px 0",
        backgroundColor: color,
        opacity: hex ? 1 : 0.4,
        flexShrink: 0,
      }}
    />
  );
}
