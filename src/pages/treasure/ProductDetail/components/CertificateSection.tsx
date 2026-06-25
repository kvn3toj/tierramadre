/**
 * CertificateSection Component
 *
 * Surfaces a product's gemological certificate on the detail page. The real,
 * authoritative path is the raw certificate URL (`certificateUrl`, mapped from
 * the Convex `certificadoUrl` field). Structured `certifications` are a
 * FRONTEND-ONLY shape that is currently never populated by any data source, so
 * we render those defensively — only when actually present.
 *
 * Cert URLs are raw Google Drive links that often carry NO file extension, so we
 * can't reliably tell an image from a PDF. Rather than gamble on an <img> (which
 * would break for PDFs and hit CORS/hotlink blocking for Drive images), we route
 * the URL through the same `/api/serve-drive-image` proxy the product photos use
 * and expose it as a "Ver certificado" link that opens in a new tab — viewable
 * for images, downloadable for PDFs, never broken.
 *
 * Absent-safe: renders NOTHING (returns null) when there is no certificateUrl
 * and no structured certifications, so it never adds an empty section or causes
 * layout shift (anti-blinking rules).
 */

import React from "react";
import { Box, Typography, Link, useTheme } from "@mui/material";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { TreasureItem } from "../../../../types";
import { convertToProxyUrl } from "../../../../utils/driveUrl";
import { emeraldCore } from "../../../../design-system/tokens/colors";

interface CertificateSectionProps {
  product: TreasureItem;
}

export const CertificateSection: React.FC<CertificateSectionProps> = ({
  product,
}) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  const secondaryTextColor = isLight
    ? "rgba(60, 60, 67, 0.6)"
    : "rgba(235, 235, 245, 0.6)";

  const certUrl = product.certificateUrl?.trim();
  // Structured certifications are frontend-only and never populated today; read
  // defensively so that if a future source fills them, a lab line still shows.
  const gemological = product.certifications?.gemological;

  // Nothing to show — render no section at all (no empty box, no layout shift).
  if (!certUrl && !gemological) return null;

  // Route Drive URLs through the image proxy so the link works without
  // CORS/hotlink blocking; non-Drive URLs pass through unchanged.
  const viewUrl = certUrl ? convertToProxyUrl(certUrl) : undefined;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        sx={{
          fontSize: "13px",
          fontWeight: 600,
          color: secondaryTextColor,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          mb: 0.5,
        }}
      >
        Certificado
      </Typography>

      {viewUrl && (
        <Link
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 44,
            py: 1,
            px: 1.25,
            mx: -0.25,
            borderRadius: 1.5,
            color: theme.palette.text.primary,
            bgcolor: isLight
              ? `${emeraldCore.primary}0F`
              : `${emeraldCore.primary}1A`,
            border: `0.5px solid ${emeraldCore.primary}33`,
            transition: "background-color 0.2s ease",
            "&:hover": {
              bgcolor: isLight
                ? `${emeraldCore.primary}1A`
                : `${emeraldCore.primary}29`,
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShieldCheck size={18} color={emeraldCore.primary} />
            <Typography sx={{ fontSize: "15px", fontWeight: 500 }}>
              Ver certificado
            </Typography>
          </Box>
          <ExternalLink size={16} color={secondaryTextColor} aria-hidden />
        </Link>
      )}

      {/* Defensive: only renders if a future source populates structured certs. */}
      {gemological && (
        <Box sx={{ mt: viewUrl ? 1 : 0 }}>
          <Typography sx={{ fontSize: "13px", color: secondaryTextColor }}>
            {gemological.lab}
            {gemological.certificateNumber
              ? ` · ${gemological.certificateNumber}`
              : ""}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CertificateSection;
