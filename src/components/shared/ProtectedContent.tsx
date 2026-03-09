import { ReactNode } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScreenProtection } from '../../contexts/ScreenProtectionContext';
import { brand, cssTransition, blurValues, zIndex } from '../../design-system';

interface ProtectedContentProps {
  children: ReactNode;
  /** Blur intensity in pixels (default: 20) */
  blurIntensity?: number;
  /** Show protection message overlay (default: true) */
  showMessage?: boolean;
  /** Custom message to display (default: "Contenido protegido") */
  message?: string;
}

/**
 * Wrapper component that blurs its children when a screenshot
 * attempt is detected via the ScreenProtectionContext.
 *
 * Usage:
 * ```tsx
 * <ProtectedContent>
 *   <img src="sensitive-image.jpg" />
 * </ProtectedContent>
 * ```
 */
export default function ProtectedContent({
  children,
  blurIntensity = 20,
  showMessage = true,
  message = 'Contenido protegido',
}: ProtectedContentProps) {
  const { isProtectionActive } = useScreenProtection();

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Content with blur transition */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          filter: isProtectionActive ? `blur(${blurIntensity}px)` : 'none',
          transition: cssTransition.fast,
          willChange: 'filter',
        }}
      >
        {children}
      </Box>

      {/* Protection overlay */}
      <AnimatePresence>
        {isProtectionActive && showMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha('#000', 0.3),
              backdropFilter: `blur(${blurValues.xs})`,
              zIndex: zIndex.base,
            }}
          >
            <Shield
              size={32}
              color={brand.emerald[400]}
              style={{ marginBottom: 8 }}
            />
            <Typography
              variant="body2"
              sx={{
                color: '#fff',
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {message}
            </Typography>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
