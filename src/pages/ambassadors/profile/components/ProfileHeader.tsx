/**
 * ProfileHeader Component (Museum Layout)
 * Centered avatar with decorative ring, name, badge row, elegant stats,
 * bio text. Action buttons (share/edit) as refined top-right icons.
 */

import React from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { Share2, Camera, Edit3, Star, Gem, DollarSign } from "lucide-react";
import { Asesor } from "../../../../hooks/useAsesores";
import { qeFont, zIndex } from "../../../../design-system";
import { deriveRating, formatCurrency } from "../../../../utils/formatting";

export interface ProfileStats {
  totalValue: number;
  avgPrice: number;
  looseCount: number;
  jewelryCount: number;
  disponibleCount: number;
  vendidaCount: number;
}

interface ProfileHeaderProps {
  asesor: Asesor;
  stats: ProfileStats;
  totalProducts: number;
  onShare: () => void;
  onShareWhatsApp?: () => void;
  onCopyLink?: () => void;
  isOwner?: boolean;
  onPhotoEdit?: () => void;
  onEditProfile?: () => void;
  photoUrl?: string;
  isUploadingPhoto?: boolean;
}

export const ProfileHeader = React.memo<ProfileHeaderProps>(
  ({
    asesor,
    stats,
    totalProducts,
    onShare,
    isOwner,
    onPhotoEdit,
    onEditProfile,
    photoUrl,
    isUploadingPhoto,
  }) => {
    const isAdmin = (asesor.role || "").toLowerCase().includes("admin");
    const rating = deriveRating(totalProducts);

    // Shared elegant pill base (full rounded, hairline border, airy tracking)
    const pillBase = {
      display: "inline-flex",
      alignItems: "center",
      gap: 0.55,
      height: 24,
      px: 1.15,
      borderRadius: "999px",
      fontSize: "0.6rem",
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase" as const,
      border: "1px solid",
      whiteSpace: "nowrap" as const,
    };

    return (
      <Box sx={{ position: "relative", mb: 2, textAlign: "center" }}>
        {/* Top-right action icons */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            display: "flex",
            gap: 0.5,
            zIndex: zIndex.base + 1,
          }}
        >
          <Tooltip title="Compartir perfil">
            <IconButton
              onClick={onShare}
              aria-label="Compartir perfil"
              size="small"
              sx={{
                color: "var(--tm-muted)",
                bgcolor: "var(--tm-well)",
                "&:hover": {
                  bgcolor: "var(--tm-accent-wash)",
                  color: "var(--tm-accent)",
                },
              }}
            >
              <Share2 size={16} />
            </IconButton>
          </Tooltip>
          {isOwner && onEditProfile && (
            <Tooltip title="Editar perfil">
              <IconButton
                onClick={onEditProfile}
                aria-label="Editar perfil"
                size="small"
                sx={{
                  color: "var(--tm-muted)",
                  bgcolor: "var(--tm-well)",
                  "&:hover": {
                    bgcolor: "var(--tm-accent-wash)",
                    color: "var(--tm-accent)",
                  },
                }}
              >
                <Edit3 size={16} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Centered Avatar with decorative ring */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
          <Box sx={{ position: "relative" }}>
            {/* Outer decorative ring */}
            <Box
              sx={{
                position: "absolute",
                inset: -6,
                borderRadius: "50%",
                border: "1px solid",
                borderColor: "var(--tm-border)",
              }}
            />
            <Avatar
              src={photoUrl || asesor.photoUrl}
              sx={{
                width: { xs: 104, sm: 120, md: 130 },
                height: { xs: 104, sm: 120, md: 130 },
                bgcolor: "var(--tm-accent-strong)",
                color: "var(--tm-on-accent)",
                fontSize: "2.5rem",
                fontWeight: 700,
                opacity: isUploadingPhoto ? 0.6 : 1,
                transition: "opacity var(--tm-base) var(--tm-ease)",
                border: "1px solid",
                borderColor: "var(--tm-border)",
              }}
            >
              {asesor.name.charAt(0).toUpperCase()}
            </Avatar>
            {isUploadingPhoto && (
              <CircularProgress
                aria-label="Cargando"
                size={28}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  mt: "-14px",
                  ml: "-14px",
                  color: "var(--tm-accent)",
                }}
              />
            )}
            {isOwner && onPhotoEdit && (
              <IconButton
                onClick={onPhotoEdit}
                disabled={isUploadingPhoto}
                size="small"
                aria-label="Cambiar foto de perfil"
                sx={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  width: 30,
                  height: 30,
                  bgcolor: "var(--tm-accent-strong)",
                  color: "var(--tm-on-accent)",
                  border: "2px solid",
                  borderColor: "var(--tm-surface)",
                  "&:hover": {
                    bgcolor: "var(--tm-accent)",
                  },
                  "&.Mui-disabled": {
                    bgcolor: "var(--tm-border)",
                    color: "var(--tm-subtle)",
                  },
                }}
              >
                <Camera size={14} />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Name — elegant display serif masthead */}
        <Typography
          variant="h5"
          sx={{
            fontFamily: qeFont.serif,
            fontWeight: 600,
            mb: 0.85,
            fontSize: { xs: "1.6rem", sm: "1.8rem", md: "1.95rem" },
            lineHeight: 1.12,
            letterSpacing: "0.005em",
          }}
        >
          {asesor.name}
        </Typography>

        {/* Badge Row — elegant pills (dot + label), no redundant role text */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 0.85,
            mb: 2.25,
          }}
        >
          <Box
            sx={{
              ...pillBase,
              bgcolor: "var(--tm-accent-wash)",
              borderColor: "var(--tm-border)",
              color: "var(--tm-accent)",
            }}
          >
            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                bgcolor: "var(--tm-accent-pure)",
              }}
            />
            Embajador
          </Box>
          {isAdmin && (
            <Box
              sx={{
                ...pillBase,
                bgcolor: "var(--tm-well)",
                borderColor: "var(--tm-border)",
                color: "var(--tm-muted)",
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  bgcolor: "var(--tm-muted)",
                }}
              />
              Elite
            </Box>
          )}
        </Box>

        {/* Stats — unified editorial ledger panel with hairline dividers */}
        <Box
          sx={{
            display: "flex",
            alignItems: "stretch",
            mx: { xs: 1, sm: 2, md: 3 },
            borderRadius: "var(--tm-radius-card)",
            overflow: "hidden",
            bgcolor: "var(--tm-surface)",
            border: "1px solid",
            borderColor: "var(--tm-border)",
          }}
        >
          {[
            {
              icon: <Gem size={15} style={{ color: "var(--tm-accent)" }} />,
              value: String(totalProducts),
              label: "Tesoros",
            },
            {
              icon: (
                <DollarSign size={15} style={{ color: "var(--tm-muted)" }} />
              ),
              value: formatCurrency(stats.totalValue),
              label: "Valor",
            },
            {
              icon: <Star size={15} style={{ color: "var(--tm-muted)" }} />,
              value: rating ? String(rating) : "—",
              label: "Rating",
            },
          ].map((stat, i) => (
            <Box
              key={stat.label}
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: { xs: "4px", sm: "6px" },
                py: { xs: 1.5, sm: 1.75 },
                px: 0.5,
                position: "relative",
                // Hairline divider between columns
                ...(i > 0 && {
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: "20%",
                    bottom: "20%",
                    width: "1px",
                    bgcolor: "var(--tm-hairline)",
                  },
                }),
              }}
            >
              {stat.icon}
              <Typography
                sx={{
                  fontFamily: qeFont.serif,
                  fontWeight: 600,
                  fontSize: { xs: "1.15rem", sm: "1.3rem" },
                  lineHeight: 1.05,
                  letterSpacing: "0.01em",
                  fontVariantNumeric: "lining-nums tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {stat.value}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.55rem",
                  fontWeight: 600,
                  color: "var(--tm-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Bio */}
        {asesor.especialidad && (
          <Typography
            sx={{
              mt: 2,
              color: "text.secondary",
              fontFamily: qeFont.serif,
              fontSize: { xs: "1.02rem", sm: "1.1rem" },
              lineHeight: 1.55,
              maxWidth: { xs: 340, sm: 420 },
              mx: "auto",
              fontStyle: "italic",
            }}
          >
            {asesor.especialidad}
          </Typography>
        )}
      </Box>
    );
  },
);

ProfileHeader.displayName = "ProfileHeader";

export default ProfileHeader;
