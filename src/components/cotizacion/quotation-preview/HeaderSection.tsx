/**
 * HeaderSection - Quotation header with client info, logo, asesor info, and quotation details.
 */

import React from "react";
import { Box, Typography } from "@mui/material";
import { Calendar, User, FileText } from "lucide-react";
import {
  brandColors,
  quotationStyles,
  quotationTypography,
} from "../constants";
import { qeTokens } from "../../../design-system";
import { InfoField } from "./shared";
import { useLanguage } from "../../../contexts/LanguageContext";

export interface HeaderSectionProps {
  quotationNumber: string;
  clientName: string;
  asesorName: string;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({
  quotationNumber,
  clientName,
  asesorName,
}) => {
  const { t, language } = useLanguage();
  const labels = t.pages.cotizacion.preview;

  // Always use today's date (date of export/preview), locale-aware
  const dateLocale = language === "en" ? "en-US" : "es-CO";
  const formattedDate = new Date().toLocaleDateString(dateLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Box sx={{ mb: 2.5 }}>
      {/* Top Row: Client info | Logo | Asesor info */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        {/* Left Column - Client Info */}
        <Box sx={{ flex: "0 0 120px", minWidth: 0 }}>
          {clientName && (
            <Box>
              <Typography
                sx={{
                  fontSize: "0.45rem",
                  color: brandColors.gray,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  mb: 0.25,
                }}
              >
                {labels.client}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <User size={10} color={qeTokens.light.accent} />
                <Typography
                  sx={{
                    fontSize: "0.6rem",
                    color: brandColors.textPrimary,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 100,
                  }}
                >
                  {clientName}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Center - Logo */}
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/logo-quotation.png"
              alt="Tierra Madre"
              style={{ height: 56, width: "auto", objectFit: "contain" }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  const fallback = document.createElement("span");
                  fallback.textContent = "TIERRA MADRE";
                  fallback.style.cssText =
                    "font-size: 1.2rem; font-weight: 700; letter-spacing: 0.1em; color: #111827;";
                  parent.appendChild(fallback);
                }
              }}
            />
          </Box>
          <Typography
            sx={{
              fontSize: "0.45rem",
              color: brandColors.textPrimary,
              letterSpacing: "0.12em",
              fontWeight: 500,
              textTransform: "uppercase",
              mt: 0.25,
            }}
          >
            {labels.subtitle}
          </Typography>
        </Box>

        {/* Right Column - Ambassador Info */}
        <Box sx={{ flex: "0 0 120px", minWidth: 0, textAlign: "right" }}>
          {asesorName && (
            <Box>
              <Typography
                sx={{
                  fontSize: "0.45rem",
                  color: brandColors.gray,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  mb: 0.25,
                }}
              >
                {labels.ambassador}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  color: qeTokens.light.accent,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {asesorName}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Quotation Info Card - Compact */}
      <Box
        sx={{
          bgcolor: quotationStyles.surfaceTint,
          borderRadius: 2,
          p: 1.25,
          border: `1px solid ${quotationStyles.borderLight}`,
        }}
      >
        {/* Title Row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.75,
            mb: 1,
            pb: 0.75,
            borderBottom: `1px solid ${quotationStyles.borderLight}`,
          }}
        >
          <FileText size={12} color={qeTokens.light.accent} />
          <Typography
            sx={{
              fontSize: "0.55rem",
              fontWeight: 600,
              color: qeTokens.light.accent,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {labels.salesQuotation}
          </Typography>
        </Box>

        {/* Info Row */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <InfoField
            label={labels.quotationNumber}
            value={quotationNumber}
            valueStyle={{
              fontSize: "0.65rem",
              fontWeight: 700,
              ...quotationTypography.monospace,
            }}
          />
          <InfoField
            label={labels.issueDate}
            value={formattedDate}
            icon={<Calendar size={10} color={brandColors.gray} />}
            valueStyle={{ fontWeight: 500, fontSize: "0.6rem" }}
          />
        </Box>
      </Box>
    </Box>
  );
};
