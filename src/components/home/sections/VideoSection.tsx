/**
 * VideoSection Component
 *
 * Featured Tierra Mädre videos on the Home page.
 * Liquid Glass Design - Apple iOS 26 inspired
 *
 * Performance:
 * - Click-to-play facade: the heavy YouTube <iframe> only mounts after the
 *   user taps a video. Until then we show the lightweight YouTube thumbnail,
 *   keeping the home page fast and avoiding layout shift / blinking.
 *
 * Thumbnail robustness:
 * - Not every video has a maxresdefault.jpg. When a resolution is missing,
 *   YouTube serves a 120x90 grey "no preview" placeholder (often with a 404
 *   body the browser still paints, so onError is unreliable). We walk down a
 *   resolution ladder and detect the grey placeholder via naturalWidth.
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

/** Best → smallest. We start at the top and step down on missing/placeholder. */
const THUMB_RESOLUTIONS = [
  "maxresdefault",
  "sddefault",
  "hqdefault",
  "mqdefault",
] as const;

/** YouTube's grey "no preview" placeholder is 120px wide. */
const PLACEHOLDER_MAX_WIDTH = 120;

// =============================================================================
// SINGLE VIDEO (facade -> iframe on click)
// =============================================================================

interface VideoCardProps {
  video: HomeVideo;
  index: number;
  isDarkMode: boolean;
  cardBg: string;
  cardBorder: string;
}

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  index,
  isDarkMode,
  cardBg,
  cardBorder,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [resIndex, setResIndex] = useState(0);

  const thumbnail = `https://i.ytimg.com/vi/${video.id}/${THUMB_RESOLUTIONS[resIndex]}.jpg`;

  const stepDownResolution = () => {
    setResIndex((i) => Math.min(i + 1, THUMB_RESOLUTIONS.length - 1));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: "easeOut" }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 5,
          overflow: "hidden",
          bgcolor: cardBg,
          backdropFilter: `blur(${blurValues["2xl"]}) saturate(180%)`,
          WebkitBackdropFilter: `blur(${blurValues["2xl"]}) saturate(180%)`,
          border: "1px solid",
          borderColor: cardBorder,
          boxShadow: isDarkMode
            ? `0 8px 32px ${blackAlpha(0.45)}, 0 2px 8px ${emeraldAlpha(0.08)}, inset 0 1px 0 rgba(255,255,255,0.05)`
            : defaultShadows.lg,
          transition: "box-shadow 0.35s ease, transform 0.35s ease",
          "@media (hover: hover)": {
            "&:hover": {
              transform: "translateY(-3px)",
              boxShadow: isDarkMode
                ? `0 16px 48px ${blackAlpha(0.55)}, 0 0 0 1px ${emeraldAlpha(0.22)}`
                : `0 16px 44px rgba(0,0,0,0.16), 0 0 0 1px ${emeraldAlpha(0.18)}`,
            },
            "&:hover .video-thumb": { transform: "scale(1.06)" },
            "&:hover .play-button": {
              transform: "translate(-50%, -50%) scale(1.09)",
              backgroundColor: emeraldAlpha(0.92),
              borderColor: "rgba(255,255,255,0.7)",
            },
            "&:hover .play-tri": { borderLeftColor: "#fff" },
            "&:hover .video-accent": { opacity: 1 },
          },
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
              "&:focus-visible .play-button": {
                transform: "translate(-50%, -50%) scale(1.09)",
                backgroundColor: emeraldAlpha(0.92),
                boxShadow: `0 0 0 4px ${emeraldAlpha(0.35)}, 0 12px 40px rgba(0,0,0,0.45)`,
              },
            }}
          >
            {/* Thumbnail (cinematic slow-zoom on hover) */}
            <Box
              className="video-thumb"
              component="img"
              src={thumbnail}
              alt={video.title}
              loading="lazy"
              onLoad={(e) => {
                // Grey "no preview" placeholder → drop to the next resolution.
                const img = e.currentTarget as HTMLImageElement;
                if (
                  img.naturalWidth <= PLACEHOLDER_MAX_WIDTH &&
                  resIndex < THUMB_RESOLUTIONS.length - 1
                ) {
                  stepDownResolution();
                }
              }}
              onError={() => {
                if (resIndex < THUMB_RESOLUTIONS.length - 1)
                  stepDownResolution();
              }}
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                transformOrigin: "center",
              }}
            />

            {/* Cinematic scrim for legibility */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.22) 38%, transparent 62%, rgba(0,0,0,0.18) 100%)",
              }}
            />

            {/* Emerald accent line at the top (reveals on hover) */}
            <Box
              className="video-accent"
              sx={{
                position: "absolute",
                top: 0,
                left: "12%",
                right: "12%",
                height: "2px",
                background: `linear-gradient(90deg, transparent, ${emeraldCore.primary}, ${emeraldCore.light}, transparent)`,
                opacity: 0,
                transition: "opacity 0.35s ease",
              }}
            />

            {/* Frosted-glass play button (fills emerald on hover/focus) */}
            <Box
              className="play-button"
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 72,
                height: 72,
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.16)",
                backdropFilter: "blur(14px) saturate(160%)",
                WebkitBackdropFilter: "blur(14px) saturate(160%)",
                border: "1.5px solid rgba(255,255,255,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 10px 36px rgba(0,0,0,0.45), 0 0 0 6px ${emeraldAlpha(0.1)}`,
                transition:
                  "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), background-color 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease",
              }}
            >
              {/* Play triangle */}
              <Box
                className="play-tri"
                sx={{
                  width: 0,
                  height: 0,
                  ml: "5px",
                  borderTop: "12px solid transparent",
                  borderBottom: "12px solid transparent",
                  borderLeft: `20px solid ${emeraldCore.primary}`,
                  transition: "border-left-color 0.28s ease",
                }}
              />
            </Box>

            {/* Title overlay */}
            <Typography
              sx={{
                position: "absolute",
                left: 18,
                right: 18,
                bottom: 15,
                color: "#fff",
                fontSize: { xs: "0.9rem", sm: "1rem" },
                fontWeight: 600,
                lineHeight: 1.35,
                letterSpacing: "-0.01em",
                textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
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

  const cardBg = isDarkMode
    ? blackAlpha(opacity.overlay)
    : surfacesLight.surface.glass;
  const cardBorder = isDarkMode
    ? "rgba(255,255,255,0.1)"
    : iosSeparators.default.light;
  const textPrimary = isDarkMode
    ? textOnGlass.onDarkGlass.primary
    : iosLabels.primary.light;
  const textSecondary = isDarkMode
    ? textOnGlass.onDarkGlass.secondary
    : iosLabels.secondary.light;

  return (
    <Box
      component="section"
      aria-labelledby="video-section-title"
      sx={{ px: 2, py: { xs: 2, md: 2.5 } }}
    >
      {/* Heading */}
      <Box sx={{ mb: 1.75, px: 0.5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 0.5,
          }}
        >
          <Box
            sx={{
              width: 22,
              height: "1.5px",
              borderRadius: 1,
              background: `linear-gradient(90deg, ${emeraldCore.primary}, transparent)`,
            }}
          />
          <Typography
            sx={{
              color: isDarkMode ? emeraldCore.light : emeraldCore.dark,
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Videos
          </Typography>
        </Box>
        <Typography
          id="video-section-title"
          sx={{
            color: textPrimary,
            fontSize: { xs: "1.15rem", sm: "1.25rem" },
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Descubre Tierra Mädre
        </Typography>
        <Typography
          sx={{
            color: textSecondary,
            fontSize: "0.82rem",
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
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
        ))}
      </Box>
    </Box>
  );
};

export default VideoSection;
