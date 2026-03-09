/**
 * MyProfileHeader Component
 *
 * Displays the current ambassador's avatar, name, role badge,
 * tagline/specialty, and member-since info.
 *
 * Features a collapsing sticky mini-bar that appears when the
 * full card scrolls out of view (iOS contact-page pattern).
 */

import { useRef, useState, useEffect } from 'react';
import { Box, Typography, Chip, Avatar, alpha } from '@mui/material';
import { Shield, Star, Award } from 'lucide-react';
import { emeraldCore, goldAccent, iosTypographyScale, primitiveSpacing as spacing, radius, accentColors, zIndex } from '../../../design-system';
import type { Asesor } from '../../../hooks/useAsesores';

interface MyProfileHeaderProps {
  asesor: Asesor;
  googlePicture?: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  Admin: { label: 'Admin', icon: Shield, color: accentColors.purple.light },
  Embajador: { label: 'Embajador', icon: Star, color: goldAccent.primary },
  Asesor: { label: 'Asesor', icon: Award, color: emeraldCore.primary },
};

export function MyProfileHeader({ asesor, googlePicture }: MyProfileHeaderProps) {
  const role = asesor.role || 'Asesor';
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.Asesor;
  const Icon = config.icon;
  const photoUrl = asesor.photoUrl || googlePicture;

  // Track when the full card scrolls out of view
  const cardRef = useRef<HTMLDivElement>(null);
  const [showMiniBar, setShowMiniBar] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    // Use the main-content scroll container as root
    const scrollRoot = document.getElementById('main-content') || null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show mini bar when card is less than 30% visible
        setShowMiniBar(!entry.isIntersecting || entry.intersectionRatio < 0.3);
      },
      {
        root: scrollRoot,
        threshold: [0, 0.3],
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sticky compact mini-bar — visible when full card scrolls away */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: zIndex.sticky,
          transform: showMiniBar ? 'translateY(0)' : 'translateY(-100%)',
          opacity: showMiniBar ? 1 : 0,
          transition: `transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease`,
          pointerEvents: showMiniBar ? 'auto' : 'none',
          mx: -spacing.md,         // bleed to page edge
          px: spacing.md,
          py: spacing.xs,
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          bgcolor: 'rgba(var(--surface-primary-rgb), 0.82)',
          borderBottom: '0.5px solid var(--border-default)',
          boxShadow: showMiniBar ? 'var(--shadow-sm)' : 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar
            src={photoUrl || undefined}
            alt={asesor.name}
            sx={{
              width: 30,
              height: 30,
              border: `1.5px solid ${alpha(config.color, 0.3)}`,
              fontSize: '0.75rem',
              fontWeight: 700,
              bgcolor: alpha(config.color, 0.15),
              color: config.color,
            }}
          >
            {asesor.name?.charAt(0).toUpperCase()}
          </Avatar>

          <Typography
            sx={{
              fontSize: iosTypographyScale.subhead,
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 0,
            }}
          >
            {asesor.name}
          </Typography>

          <Chip
            icon={<Icon size={10} />}
            label={config.label}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.6rem',
              fontWeight: 600,
              bgcolor: alpha(config.color, 0.12),
              color: config.color,
              border: `1px solid ${alpha(config.color, 0.25)}`,
              '& .MuiChip-icon': { color: config.color },
              flexShrink: 0,
            }}
          />
        </Box>
      </Box>

      {/* Full profile card */}
      <Box
        ref={cardRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          p: spacing.md,
          borderRadius: radius.lg,
          background: `linear-gradient(135deg, ${alpha(config.color, 0.06)} 0%, transparent 100%)`,
          border: `1px solid ${alpha(config.color, 0.15)}`,
          mb: spacing.md,
        }}
      >
        <Avatar
          src={photoUrl || undefined}
          alt={asesor.name}
          sx={{
            width: 64,
            height: 64,
            border: `2px solid ${alpha(config.color, 0.3)}`,
            fontSize: '1.5rem',
            fontWeight: 700,
            bgcolor: alpha(config.color, 0.15),
            color: config.color,
          }}
        >
          {asesor.name?.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: iosTypographyScale.title3,
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {asesor.name}
            </Typography>
            <Chip
              icon={<Icon size={12} />}
              label={config.label}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 600,
                bgcolor: alpha(config.color, 0.12),
                color: config.color,
                border: `1px solid ${alpha(config.color, 0.25)}`,
                '& .MuiChip-icon': { color: config.color },
                flexShrink: 0,
              }}
            />
          </Box>

          {asesor.especialidad && (
            <Typography
              variant="body2"
              sx={{
                fontSize: iosTypographyScale.footnote,
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {asesor.especialidad}
            </Typography>
          )}

          {asesor.email && (
            <Typography
              variant="caption"
              sx={{
                fontSize: iosTypographyScale.caption2,
                color: 'var(--text-tertiary)',
              }}
            >
              {asesor.email}
            </Typography>
          )}
        </Box>
      </Box>
    </>
  );
}
