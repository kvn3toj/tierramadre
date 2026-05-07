/**
 * Bandeja — persistent inspector panel beside the inventory ledger.
 *
 * The Bandeja is the right-hand "tray" of the Fotosíntesis workbench.
 * It surfaces context for the row currently selected in the ledger
 * (selectedBandejaId), and renders an empty/overview state when no
 * row is selected. Cards (StoneHero, PatronCard, …) are added in
 * Phase D — for now this is just the shell + header.
 *
 * Spec: docs/superpowers/specs/2026-05-06-fotosintesis-admin-redesign-design.md
 */

import { Box, Typography } from "@mui/material";
import { fontFamilies, type FotoTokens } from "../../../design-system";

const SANS = fontFamilies.system;

export interface BandejaSelectedProduct {
  itemId: string;
  nombre?: string;
  peso?: string;
  color?: string;
  calidad?: string;
  coleccion?: string;
  precioCOP?: number;
  thumbnailUrl?: string;
  chromaHex?: string;
}

interface BandejaProps {
  foto: FotoTokens;
  /** Selected product from the ledger — null shows the overview state. */
  selected: BandejaSelectedProduct | null;
  /** Children render Bandeja cards (StoneHero, PatronCard, …) */
  children?: React.ReactNode;
}

export function Bandeja({ foto, selected, children }: BandejaProps) {
  return (
    <Box
      component="aside"
      aria-label="Bandeja"
      sx={{
        backgroundColor: foto.surfaces.panel,
        borderLeft: { xs: "none", md: `1px solid ${foto.surfaces.edge}` },
        p: 2.25,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        minHeight: { md: 560 },
      }}
    >
      <Typography
        component="div"
        sx={{
          fontFamily: SANS,
          fontSize: "9px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: foto.ink.tertiary,
          fontWeight: 500,
        }}
      >
        {selected
          ? `Bandeja · ${selected.itemId}${selected.nombre ? ` ${selected.nombre}` : ""}`
          : "Bandeja · resumen"}
      </Typography>
      {!selected && (
        <Typography
          component="div"
          sx={{
            fontFamily: SANS,
            fontSize: 11,
            color: foto.ink.tertiary,
            mt: -0.5,
            mb: 0.5,
            letterSpacing: "-0.005em",
          }}
        >
          Selecciona una piedra de la lista para ver su detalle, patrones e
          historial.
        </Typography>
      )}
      {children}
    </Box>
  );
}
