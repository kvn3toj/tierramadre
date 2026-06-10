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
  Chip,
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

        {/* Name */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 0.75,
            fontSize: { xs: "1.3rem", sm: "1.45rem", md: "1.55rem" },
            letterSpacing: "-0.02em",
          }}
        >
          {asesor.name}
        </Typography>

        {/* Badge Row — refined outlined chips */}
        <Box
          sx={{ display: "flex", justifyContent: "center", gap: 0.75, mb: 2 }}
        >
          <Chip
            size="small"
            variant="outlined"
            label={(asesor.role || "Embajadora").toUpperCase()}
            sx={{
              height: 26,
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              borderColor: alpha(emeraldCore.primary, 0.4),
              color: emeraldCore.primary,
              borderRadius: "8px",
            }}
          />
          {isAdmin && (
            <Chip
              size="small"
              variant="outlined"
              label="ADMIN"
              sx={{
                height: 26,
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                borderColor: alpha(goldAccent.primary, 0.4),
                color: isLight ? goldAccent.dark : goldAccent.light,
                borderRadius: "8px",
              }}
            />
          )}
        </Box>

        {/* Stats Row — 3 elegant stat cells */}
        <Box
          sx={{
            display: "flex",
            gap: { xs: "8px", sm: "12px" },
            width: "100%",
            px: { xs: 1, sm: 2, md: 3 },
          }}
        >
          {[
            {
              icon: <Gem size={15} color={emeraldCore.primary} />,
              value: String(totalProducts),
              label: "Tesoros",
              accent: emeraldCore.primary,
            },
            {
              icon: <DollarSign size={15} color={goldAccent.primary} />,
              value: formatCurrency(stats.totalValue),
              label: "Valor",
              accent: goldAccent.primary,
            },
            {
              icon: <Star size={15} color={goldAccent.primary} />,
              value: rating ? String(rating) : "—",
              label: "Rating",
              accent: goldAccent.primary,
            },
          ].map((stat) => (
            <Box
              key={stat.label}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: { xs: "3px", sm: "5px" },
                flex: 1,
                py: { xs: 1.25, sm: 1.5 },
                borderRadius: "12px",
                bgcolor: isLight
                  ? surfacesLight.surface.default
                  : surfacesDark.background.secondary,
                border: "1px solid",
                borderColor: isLight
                  ? surfacesLight.border.light
                  : surfacesDark.border.light,
                boxShadow: isLight
                  ? "0 1px 4px rgba(0,0,0,0.04)"
                  : "0 1px 4px rgba(0,0,0,0.12)",
                position: "relative",
                overflow: "hidden",
                // Subtle top accent line
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: "25%",
                  right: "25%",
                  height: "1.5px",
                  bgcolor: alpha(stat.accent, 0.25),
                  borderRadius: "0 0 2px 2px",
                },
              }}
            >
              {stat.icon}
              <Typography
                sx={{
                  fontFamily: fontFamilies.mono,
                  fontWeight: 700,
                  fontSize: { xs: "0.82rem", sm: "0.9rem" },
                  letterSpacing: "-0.02em",
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
                  letterSpacing: "0.06em",
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
              fontFamily: fontFamilies.serif,
              fontSize: { xs: "0.88rem", sm: "0.94rem" },
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
