/**
 * VideoSection Component
 *
 * Featured Tierra Madre videos on the Home page.
 * Liquid Glass Design - Apple iOS 26 inspired
 *
 * Performance:
 * - Click-to-play facade: the heavy YouTube <iframe> only mounts after the
 *   user taps a video. Until then we show the lightweight YouTube thumbnail,
 *   keeping the home page fast and avoiding layout shift / blinking.
 *
 * Designed by: Aria
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  emeraldCore,
  surfacesLight,
} from "../../../design-system/tokens/colors";
import { defaultShadows } from "../../../design-system/tokens/shadows";
import {
  blackAlpha,
  emeraldAlpha,
  opacity,
  blurValues,
} from "../../../design-system";
import {
  textOnGlass,
  iosLabels,
  iosSeparators,
} from "../../../design-system/utils/colorUtils";

// =============================================================================
// DATA
// =============================================================================

interface HomeVideo {
  id: string;
  title: string;
}

const VIDEOS: HomeVideo[] = [
  {
    id: "mZd_q9IvJZk",
    title: "This is a Seed of TierraMädre — Emeralds with the DNA of Peace",
  },
  { id: "NBslynbfacU", title: "Emeralds DNA of Peace" },
];

// =============================================================================
// SINGLE VIDEO (facade -> iframe on click)
// =============================================================================

interface VideoCardProps {
  video: HomeVideo;
  index: number;
  isDarkMode: boolean;
  colors: {
    cardBg: string;
    cardBorder: string;
    textSecondary: string;
  };
}

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  index,
  isDarkMode,
  colors,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // High-res thumbnail with graceful fallback to the standard one
  const thumbnail = `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`;
  const fallbackThumbnail = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 4,
          overflow: "hidden",
          bgcolor: colors.cardBg,
          backdropFilter: `blur(${blurValues["2xl"]}) saturate(180%)`,
          WebkitBackdropFilter: `blur(${blurValues["2xl"]}) saturate(180%)`,
          border: "1px solid",
          borderColor: colors.cardBorder,
          boxShadow: isDarkMode
            ? `0 4px 24px ${emeraldAlpha(0.08)}, inset 0 1px 0 rgba(255,255,255,0.04)`
            : defaultShadows.md,
        }}
      >
        {isPlaying ? (
          <Box
            component="iframe"
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        ) : (
          <Box
            role="button"
            tabIndex={0}
            aria-label={`Reproducir video: ${video.title}`}
            onClick={() => setIsPlaying(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsPlaying(true);
              }
            }}
            sx={{
              position: "absolute",
              inset: 0,
              cursor: "pointer",
              outline: "none",
              "&:focus-visible": {
                boxShadow: `inset 0 0 0 3px ${emeraldCore.primary}`,
              },
              "&:hover .play-button": {
                transform: "translate(-50%, -50%) scale(1.08)",
                bgcolor: emeraldCore.primary,
              },
            }}
          >
            {/* Thumbnail */}
            <Box
              component="img"
              src={thumbnail}
              alt={video.title}
              loading="lazy"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (img.src !== fallbackThumbnail) img.src = fallbackThumbnail;
              }}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />

            {/* Dark scrim for legibility */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.15) 100%)",
              }}
            />

            {/* Play button */}
            <Box
              className="play-button"
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: emeraldAlpha(0.85),
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1.5px solid rgba(255,255,255,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                transition: "transform 0.2s ease, background-color 0.2s ease",
              }}
            >
              {/* Play triangle */}
              <Box
                sx={{
                  width: 0,
                  height: 0,
                  ml: "4px",
                  borderTop: "11px solid transparent",
                  borderBottom: "11px solid transparent",
                  borderLeft: "18px solid #fff",
                }}
              />
            </Box>

            {/* Title overlay */}
            <Typography
              sx={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 12,
                color: "#fff",
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                fontWeight: 500,
                lineHeight: 1.35,
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              {video.title}
            </Typography>
          </Box>
        )}
      </Box>
    </motion.div>
  );
};

// =============================================================================
// SECTION
// =============================================================================

export const VideoSection: React.FC = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  const colors = {
    cardBg: isDarkMode
      ? blackAlpha(opacity.overlay)
      : surfacesLight.surface.glass,
    cardBorder: isDarkMode
      ? "rgba(255,255,255,0.1)"
      : iosSeparators.default.light,
    textPrimary: isDarkMode
      ? textOnGlass.onDarkGlass.primary
      : iosLabels.primary.light,
    textSecondary: isDarkMode
      ? textOnGlass.onDarkGlass.secondary
      : iosLabels.secondary.light,
  };

  return (
    <Box
      component="section"
      aria-labelledby="video-section-title"
      sx={{ px: 2, py: { xs: 1.5, md: 2 } }}
    >
      {/* Heading */}
      <Box sx={{ mb: 1.5, px: 0.5 }}>
        <Typography
          id="video-section-title"
          sx={{
            color: colors.textPrimary,
            fontSize: { xs: "1.05rem", sm: "1.15rem" },
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          Descubre Tierra Madre
        </Typography>
        <Typography
          sx={{
            color: colors.textSecondary,
            fontSize: "0.8rem",
            mt: 0.25,
          }}
        >
          Historias detrás de cada esmeralda
        </Typography>
      </Box>

      {/* Videos */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {VIDEOS.map((video, index) => (
          <VideoCard
            key={video.id}
            video={video}
            index={index}
            isDarkMode={isDarkMode}
            colors={colors}
          />
        ))}
      </Box>
    </Box>
  );
};

export default VideoSection;
