/**
 * KnowledgeSection Component
 *
 * HIG Minimalistic Design - Simple category list
 * Principles: Clarity, Visual Hierarchy
 *
 * Designed by: Aria + Moksart
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { KNOWLEDGE_CATEGORIES, DAILY_ORACLES, DailyOracle } from '../../../data/homeContent';
import { fadeInUp } from '../../../design-system/tokens/motion';

// =============================================================================
// TYPES
// =============================================================================

interface KnowledgeSectionProps {
  savedFacts: number[];
  onSelectFact: (fact: DailyOracle) => void;
}

// =============================================================================
// COMPONENT - HIG Minimalistic
// =============================================================================

export const KnowledgeSection: React.FC<KnowledgeSectionProps> = ({
  savedFacts,
}) => {
  // Count facts per category
  const getCategoryCount = (categoryId: string) => {
    const total = DAILY_ORACLES.filter(f => f.category === categoryId).length;
    const saved = DAILY_ORACLES.filter(f => f.category === categoryId && savedFacts.includes(f.id)).length;
    return { total, saved };
  };

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

            return (
              <Box
                key={category.id}
                role="button"
                tabIndex={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
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
                {saved > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: category.color,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {saved}/{total}
                  </Typography>
                )}

                {/* Chevron */}
                <ChevronRight sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} />
              </Box>
            );
          })}
        </Box>
      </motion.div>
    </Box>
  );
};

export default KnowledgeSection;
