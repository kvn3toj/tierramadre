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
import { Box, Typography, Avatar } from '@mui/material';
import { Shield, Star, Award } from 'lucide-react';
import {
  Badge,
  type BadgeTone,
  iosTypographyScale,
  primitiveSpacing as spacing,
  radius,
  zIndex,
} from '../../../design-system';
import type { Asesor } from '../../../hooks/useAsesores';

interface MyProfileHeaderProps {
  asesor: Asesor;
  googlePicture?: string;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; tone: BadgeTone }
> = {
  Admin: { label: 'Admin', icon: Shield, tone: 'neutral' },
  Embajador: { label: 'Embajador', icon: Star, tone: 'accent' },
  Asesor: { label: 'Asesor', icon: Award, tone: 'accent' },
};

export function MyProfileHeader({
  asesor,
  googlePicture,
}: MyProfileHeaderProps) {
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
          transition:
            'transform var(--tm-base) var(--tm-ease), opacity var(--tm-fast) var(--tm-ease)',
          pointerEvents: showMiniBar ? 'auto' : 'none',
          mx: -spacing.md, // bleed to page edge
          px: spacing.md,
          py: spacing.xs,
          // In-page sticky bar, not the app top nav — DS3 keeps glass to the
          // top nav and tab bar, so this is a solid surface with a hairline.
          bgcolor: 'var(--tm-surface)',
          borderBottom: '1px solid var(--tm-hairline)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar
            src={photoUrl || undefined}
            alt={asesor.name}
            sx={{
              width: 30,
              height: 30,
              border: '1.5px solid var(--tm-border)',
              fontSize: '0.75rem',
              fontWeight: 700,
              bgcolor: 'var(--tm-well)',
              color: 'var(--tm-accent)',
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

          <Badge
            tone={config.tone}
            icon={<Icon size={10} />}
            label={config.label}
          />
        </Box>
      </Box>

      {/* Full profile card */}
      <Box
        ref={cardRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.75,
          px: 1.75,
          py: 1.75,
          borderRadius: radius.lg,
          bgcolor: 'var(--tm-surface)',
          border: '1px solid var(--tm-border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Avatar
          src={photoUrl || undefined}
          alt={asesor.name}
          sx={{
            width: 56,
            height: 56,
            border: '2px solid var(--tm-border)',
            fontSize: '1.3rem',
            fontWeight: 700,
            bgcolor: 'var(--tm-well)',
            color: 'var(--tm-accent)',
            flexShrink: 0,
          }}
        >
          {asesor.name?.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: iosTypographyScale.title3,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.15,
              }}
            >
              {asesor.name}
            </Typography>
            <Badge
              tone={config.tone}
              icon={<Icon size={11} />}
              label={config.label}
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
                lineHeight: 1.3,
              }}
            >
              {asesor.especialidad}
            </Typography>
          )}

          {asesor.email && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: 'var(--text-tertiary)',
                display: 'block',
                mt: 0.25,
                letterSpacing: '0.01em',
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
