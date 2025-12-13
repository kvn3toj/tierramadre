/**
 * OracleSection Component
 *
 * Daily oracle card with rotating facts and save/share functionality.
 * Features flip animation and accessibility enhancements.
 *
 * Designed by: Aria + Eunoia + Zeno
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import { Share, Bookmark, BookmarkBorder, Close } from '@mui/icons-material';
import { emeraldCore } from '../../../design-system/tokens/colors';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DAILY_ORACLES, DailyOracle } from '../../../data/homeContent';
import { fadeInUp, cardVariants } from '../../../theme/motionTokens';

// =============================================================================
// TYPES
// =============================================================================

interface OracleSectionProps {
  savedFacts: number[];
  onSaveFact: (factId: number) => void;
  onShare: (text: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const OracleSection: React.FC<OracleSectionProps> = ({
  savedFacts,
  onSaveFact,
  onShare,
}) => {
  const { t } = useLanguage();
  const [selectedFact, setSelectedFact] = useState<DailyOracle | null>(null);

  // Get daily oracle based on day of year
  const dailyOracle = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return DAILY_ORACLES[dayOfYear % DAILY_ORACLES.length];
  }, []);

  const isSaved = savedFacts.includes(dailyOracle.id);

  const handleCardClick = useCallback(() => {
    setSelectedFact(dailyOracle);
  }, [dailyOracle]);

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveFact(dailyOracle.id);
  }, [dailyOracle.id, onSaveFact]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShare(dailyOracle.content);
  }, [dailyOracle.content, onShare]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  }, [handleCardClick]);

  return (
    <Box sx={{ px: 2, mb: 2 }} component="section" aria-labelledby="oracle-title">
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        <Typography
          id="oracle-title"
          variant="h6"
          component="h2"
          sx={{ mb: 1.5, fontWeight: 600, color: 'white' }}
        >
          {t.pages.home.dailyFact}
        </Typography>

        <motion.div
          variants={cardVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <Card
            role="button"
            tabIndex={0}
            aria-label={`Oráculo del día: ${dailyOracle.title}. Presiona Enter para ver más detalles.`}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            sx={{
              borderLeft: `4px solid ${emeraldCore.primary}`,
              bgcolor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
              '&:focus-visible': {
                outline: `3px solid ${emeraldCore.primary}`,
                outlineOffset: 4,
              },
              '&:hover': {
                boxShadow: `0 8px 24px rgba(0, 174, 122, 0.2)`,
                bgcolor: 'rgba(0,0,0,0.5)',
              },
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Chip
                label="Descubrimiento del Día"
                size="small"
                sx={{
                  bgcolor: `${emeraldCore.primary}20`,
                  color: emeraldCore.primary,
                  mb: 1.5,
                  fontWeight: 600,
                }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <motion.div
                  animate={{
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: `${emeraldCore.primary}20`,
                      width: 56,
                      height: 56,
                      fontSize: '1.8rem',
                    }}
                    aria-hidden="true"
                  >
                    {dailyOracle.icon}
                  </Avatar>
                </motion.div>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    component="h3"
                    sx={{ fontWeight: 600, color: 'white' }}
                  >
                    {dailyOracle.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5, lineHeight: 1.5 }}
                  >
                    {dailyOracle.content.substring(0, 100)}...
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                    <Button
                      size="small"
                      startIcon={isSaved ? <Bookmark /> : <BookmarkBorder />}
                      onClick={handleSave}
                      aria-label={isSaved ? 'Quitar de guardados' : 'Guardar este dato'}
                      sx={{
                        color: isSaved ? emeraldCore.light || emeraldCore.primary : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {isSaved ? 'Guardado' : 'Guardar'}
                    </Button>
                    <IconButton
                      size="small"
                      onClick={handleShare}
                      aria-label="Compartir este dato"
                      sx={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      <Share fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Fact Detail Modal */}
      <AnimatePresence>
        {selectedFact && (
          <Dialog
            open={!!selectedFact}
            onClose={() => setSelectedFact(null)}
            maxWidth="sm"
            fullWidth
            aria-labelledby="oracle-dialog-title"
            PaperProps={{
              sx: { borderRadius: 4, bgcolor: 'var(--surface-secondary)' },
              component: motion.div,
              initial: { opacity: 0, scale: 0.95 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 0.95 },
            }}
          >
            <DialogTitle
              id="oracle-dialog-title"
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  sx={{ bgcolor: `${emeraldCore.primary}20`, fontSize: '1.5rem' }}
                  aria-hidden="true"
                >
                  {selectedFact.icon}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {selectedFact.title}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setSelectedFact(null)}
                aria-label="Cerrar diálogo"
              >
                <Close />
              </IconButton>
            </DialogTitle>

            <DialogContent>
              <Typography
                variant="body1"
                sx={{ lineHeight: 1.8, color: 'var(--text-primary)', mb: 2 }}
              >
                {selectedFact.content}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                Fuente: {selectedFact.source}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                <Button
                  variant={savedFacts.includes(selectedFact.id) ? 'contained' : 'outlined'}
                  startIcon={savedFacts.includes(selectedFact.id) ? <Bookmark /> : <BookmarkBorder />}
                  onClick={() => onSaveFact(selectedFact.id)}
                  sx={{ flex: 1 }}
                >
                  {savedFacts.includes(selectedFact.id) ? 'Guardado' : 'Guardar'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  onClick={() => onShare(selectedFact.content)}
                  sx={{ flex: 1 }}
                >
                  Compartir
                </Button>
              </Box>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default OracleSection;
