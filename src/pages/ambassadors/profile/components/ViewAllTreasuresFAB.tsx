/**
 * ViewAllTreasuresFAB Component
 *
 * Floating action button shown on the ambassador profile page that lets
 * visitors jump from the curated ambassador collection to the full
 * Tierra Mädre treasure catalog.
 *
 * Behaviour:
 * - Fixed bottom-right, respects iOS safe-area.
 * - Hides while the user is scrolling DOWN (to avoid covering content),
 *   reappears when scrolling UP or when the page is idle.
 * - Tap → navigates to `/treasure?from=asesor-{slug}` so we can attribute
 *   the visit and (in the future) tailor the treasure listing.
 *
 * Anti-blink rules from CLAUDE.md:
 * - Uses framer-motion with simple opacity/translate (no layout shifts).
 * - No unmount/remount on scroll — only opacity/transform.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Gem } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { emeraldCore, goldAccent, cssTransition } from '../../../../design-system';
import { useLanguage } from '../../../../contexts/LanguageContext';

interface ViewAllTreasuresFABProps {
  /** Ambassador slug used to attribute the navigation. */
  asesorSlug: string;
  /** Optional extra label (i18n fallback handled internally). */
  label?: string;
}

const SCROLL_HIDE_THRESHOLD = 8; // px, ignore tiny scroll jitter

export const ViewAllTreasuresFAB: React.FC<ViewAllTreasuresFABProps> = ({
  asesorSlug,
  label,
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const lastScrollYRef = useRef<number>(typeof window !== 'undefined' ? window.scrollY : 0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;
      if (Math.abs(delta) < SCROLL_HIDE_THRESHOLD) return;

      // Always visible near the top
      if (currentY < 120) {
        setVisible(true);
      } else if (delta > 0) {
        // scrolling down → hide
        setVisible(false);
      } else {
        // scrolling up → show
        setVisible(true);
      }
      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = useCallback(() => {
    navigate(`/treasure?from=asesor-${encodeURIComponent(asesorSlug)}`);
  }, [navigate, asesorSlug]);

  const fabLabel =
    label
    ?? t.ambassador?.viewAllTreasures
    ?? 'Ver todos los tesoros';

  return (
    <motion.div
      initial={false}
      animate={prefersReducedMotion ? undefined : {
        opacity: visible ? 1 : 0,
        y: visible ? 0 : 12,
      }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
        zIndex: 1300,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        aria-label={fabLabel}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          height: 52,
          px: 2.25,
          borderRadius: 999,
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${emeraldCore.primary} 0%, ${emeraldCore.dark ?? emeraldCore.primary} 100%)`,
          color: '#fff',
          boxShadow: `0 8px 24px ${goldAccent?.primary ? `${goldAccent.primary}33` : 'rgba(0,0,0,0.25)'}, 0 2px 8px rgba(0,0,0,0.18)`,
          border: `1px solid ${goldAccent?.primary ?? '#C9A86A'}`,
          transition: cssTransition.default,
          userSelect: 'none',
          '&:hover': { transform: 'translateY(-2px)' },
          '&:active': { transform: 'translateY(0)' },
        }}
      >
        <Gem size={20} />
        <Typography
          component="span"
          sx={{
            fontSize: '0.95rem',
            fontWeight: 600,
            letterSpacing: 0.2,
            display: { xs: 'none', sm: 'inline' },
          }}
        >
          {fabLabel}
        </Typography>
      </Box>
    </motion.div>
  );
};

export default ViewAllTreasuresFAB;
