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
  alpha,
  useTheme,
} from "@mui/material";
import { Share2, Camera, Edit3, Star, Gem, DollarSign } from "lucide-react";
import { Asesor } from "../../../../hooks/useAsesores";
import {
  emeraldCore,
  goldAccent,
  cssTransition,
  fontFamilies,
  surfacesLight,
  surfacesDark,
} from "../../../../design-system";
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
    const theme = useTheme();
    const isLight = theme.palette.mode === "light";

    const isAdmin = (asesor.role || "").toLowerCase().includes("admin");
    const rating = deriveRating(totalProducts);
    const accentColor = isAdmin ? goldAccent.primary : emeraldCore.primary;

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
            zIndex: 1,
          }}
        >
          <Tooltip title="Compartir perfil">
            <IconButton
              onClick={onShare}
              aria-label="Compartir perfil"
              size="small"
              sx={{
                color: "text.secondary",
                bgcolor: isLight ? alpha("#000", 0.03) : alpha("#fff", 0.04),
                "&:hover": {
                  bgcolor: alpha(emeraldCore.primary, 0.08),
                  color: emeraldCore.primary,
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
                  color: "text.secondary",
                  bgcolor: isLight ? alpha("#000", 0.03) : alpha("#fff", 0.04),
                  "&:hover": {
                    bgcolor: alpha(emeraldCore.primary, 0.08),
                    color: emeraldCore.primary,
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
            {/* Ambient glow — matches the directory calling cards */}
            <Box
              sx={{
                position: "absolute",
                inset: -16,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${alpha(accentColor, 0.12)} 0%, transparent 68%)`,
                pointerEvents: "none",
              }}
            />
            {/* Outer decorative ring */}
            <Box
              sx={{
                position: "absolute",
                inset: -6,
                borderRadius: "50%",
                border: "1.5px solid",
                borderColor: alpha(accentColor, 0.2),
              }}
            />
            <Avatar
              src={photoUrl || asesor.photoUrl}
              sx={{
                width: { xs: 104, sm: 120, md: 130 },
                height: { xs: 104, sm: 120, md: 130 },
                bgcolor: accentColor,
                fontSize: "2.5rem",
                fontWeight: 700,
                opacity: isUploadingPhoto ? 0.6 : 1,
                transition: cssTransition.default,
                border: "3px solid",
                borderColor: accentColor,
                boxShadow: `0 4px 20px ${alpha(accentColor, 0.25)}`,
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
                  color: accentColor,
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
                  bgcolor: accentColor,
                  color: "#fff",
                  border: "2.5px solid",
                  borderColor: isLight
                    ? "#fff"
                    : surfacesDark.background.secondary,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  "&:hover": {
                    bgcolor: isAdmin ? goldAccent.dark : emeraldCore.dark,
                  },
                  "&.Mui-disabled": {
                    bgcolor: alpha(accentColor, 0.5),
                    color: "#fff",
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
            fontFamily: fontFamilies.display,
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
              bgcolor: alpha(emeraldCore.primary, 0.08),
              borderColor: alpha(emeraldCore.primary, 0.22),
              color: emeraldCore.primary,
            }}
          >
            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                bgcolor: emeraldCore.primary,
              }}
            />
            Embajador
          </Box>
          {isAdmin && (
            <Box
              sx={{
                ...pillBase,
                bgcolor: alpha(goldAccent.primary, 0.1),
                borderColor: alpha(goldAccent.primary, 0.3),
                color: isLight ? goldAccent.dark : goldAccent.light,
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  bgcolor: goldAccent.primary,
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
            borderRadius: "16px",
            overflow: "hidden",
            bgcolor: isLight
              ? surfacesLight.surface.default
              : surfacesDark.background.secondary,
            border: "1px solid",
            borderColor: isLight
              ? surfacesLight.border.light
              : surfacesDark.border.light,
            boxShadow: isLight
              ? "0 1px 6px rgba(0,0,0,0.05)"
              : "0 2px 12px rgba(0,0,0,0.28)",
          }}
        >
          {[
            {
              icon: <Gem size={15} color={emeraldCore.primary} />,
              value: String(totalProducts),
              label: "Tesoros",
            },
            {
              icon: <DollarSign size={15} color={goldAccent.primary} />,
              value: formatCurrency(stats.totalValue),
              label: "Valor",
            },
            {
              icon: <Star size={15} color={goldAccent.primary} />,
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
                    bgcolor: isLight
                      ? surfacesLight.border.light
                      : surfacesDark.border.light,
                  },
                }),
              }}
            >
              {stat.icon}
              <Typography
                sx={{
                  fontFamily: fontFamilies.display,
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
                  color: "text.secondary",
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
              fontFamily: fontFamilies.display,
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
