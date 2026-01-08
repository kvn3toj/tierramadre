/**
 * KnowledgeSection Component
 *
 * HIG Minimalistic Design - Simple category list with expandable facts
 * Principles: Clarity, Visual Hierarchy
 *
 * Designed by: Aria + Moksart
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, Collapse, IconButton } from '@mui/material';
import { ExpandMore, Bookmark, BookmarkBorder } from '@mui/icons-material';
import { KNOWLEDGE_CATEGORIES, DAILY_ORACLES, DailyOracle } from '../../../data/homeContent';
import { fadeInUp } from '../../../design-system/tokens/motion';
import { emeraldCore } from '../../../design-system/tokens/colors';

// =============================================================================
// TYPES
// =============================================================================

interface KnowledgeSectionProps {
  savedFacts: number[];
  onSelectFact: (fact: DailyOracle) => void;
  onSaveFact?: (factId: number) => void;
}

// =============================================================================
// COMPONENT - HIG Minimalistic with Expandable Facts
// =============================================================================

export const KnowledgeSection: React.FC<KnowledgeSectionProps> = ({
  savedFacts,
  onSaveFact,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Count facts per category
  const getCategoryCount = (categoryId: string) => {
    const total = DAILY_ORACLES.filter(f => f.category === categoryId).length;
    const saved = DAILY_ORACLES.filter(f => f.category === categoryId && savedFacts.includes(f.id)).length;
    return { total, saved };
  };

  // Get facts for a category
  const getCategoryFacts = useCallback((categoryId: string) => {
    return DAILY_ORACLES.filter(f => f.category === categoryId);
  }, []);

  // Toggle category expansion
  const handleCategoryClick = useCallback((categoryId: string) => {
    setExpandedCategory(prev => prev === categoryId ? null : categoryId);
  }, []);

  // Handle save fact
  const handleSaveFact = useCallback((factId: number) => {
    onSaveFact?.(factId);
  }, [onSaveFact]);

  return (
    <Box sx={{ px: 2, py: 2 }} component="section" aria-labelledby="knowledge-title">
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        {/* Section title */}
        <Typography
          id="knowledge-title"
          variant="overline"
          component="h2"
          sx={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            mb: 1.5,
            px: 0.5,
          }}
        >
          Explora
        </Typography>

        {/* Category list - iOS Settings style */}
        <Box
          sx={{
            bgcolor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {KNOWLEDGE_CATEGORIES.map((category, index) => {
            const { total, saved } = getCategoryCount(category.id);
            const isLast = index === KNOWLEDGE_CATEGORIES.length - 1;
            const isExpanded = expandedCategory === category.id;
            const categoryFacts = getCategoryFacts(category.id);

            return (
              <Box key={category.id}>
                {/* Category Header */}
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCategoryClick(category.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCategoryClick(category.id)}
                  aria-expanded={isExpanded}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    borderBottom: (isLast && !isExpanded) ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                    '&:active': {
                      bgcolor: 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  {/* Icon */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 2,
                      bgcolor: `${category.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: category.color,
                      '& svg': { fontSize: 18 },
                    }}
                  >
                    {category.icon}
                  </Box>

                  {/* Title */}
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                    }}
                  >
                    {category.title}
                  </Typography>

                  {/* Count badge */}
                  <Typography
                    variant="caption"
                    sx={{
                      color: saved > 0 ? category.color : 'rgba(255,255,255,0.4)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {saved > 0 ? `${saved}/${total}` : total}
                  </Typography>

                  {/* Expand Icon */}
                  <ExpandMore
                    sx={{
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: 20,
                      transition: 'transform 0.2s ease',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </Box>

                {/* Expandable Facts */}
                <Collapse in={isExpanded} timeout={200}>
                  <Box
                    sx={{
                      bgcolor: 'rgba(0,0,0,0.2)',
                      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <AnimatePresence>
                      {categoryFacts.map((fact, factIndex) => {
                        const isSaved = savedFacts.includes(fact.id);
                        const isLastFact = factIndex === categoryFacts.length - 1;

                        return (
                          <motion.div
                            key={fact.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: factIndex * 0.05 }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1.5,
                                px: 2,
                                py: 1.5,
                                pl: 6.5,
                                borderBottom: isLastFact ? 'none' : '1px solid rgba(255,255,255,0.04)',
                              }}
                            >
                              {/* Fact Icon */}
                              <Typography sx={{ fontSize: '1rem', lineHeight: 1.4, flexShrink: 0 }}>
                                {fact.icon}
                              </Typography>

                              {/* Fact Content */}
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'rgba(255,255,255,0.9)',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    mb: 0.25,
                                  }}
                                >
                                  {fact.title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '0.8rem',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {fact.content}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(255,255,255,0.35)',
                                    fontSize: '0.7rem',
                                    mt: 0.5,
                                    display: 'block',
                                  }}
                                >
                                  {fact.source}
                                </Typography>
                              </Box>

                              {/* Save Button */}
                              {onSaveFact && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveFact(fact.id);
                                  }}
                                  aria-label={isSaved ? 'Guardado' : 'Guardar'}
                                  sx={{
                                    color: isSaved ? emeraldCore.primary : 'rgba(255,255,255,0.3)',
                                    p: 0.5,
                                    '&:hover': { color: emeraldCore.primary },
                                  }}
                                >
                                  {isSaved ? (
                                    <Bookmark sx={{ fontSize: 18 }} />
                                  ) : (
                                    <BookmarkBorder sx={{ fontSize: 18 }} />
                                  )}
                                </IconButton>
                              )}
                            </Box>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Box>
      </motion.div>
    </Box>
  );
};

export default KnowledgeSection;
