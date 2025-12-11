/**
 * KnowledgeSection Component
 *
 * Knowledge gems accordion with category progress tracking
 * and fact exploration.
 *
 * Designed by: Aria + Moksart
 */

import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  LinearProgress,
} from '@mui/material';
import { ExpandMore, CheckCircle, CircleOutlined } from '@mui/icons-material';
import { KNOWLEDGE_CATEGORIES, DAILY_ORACLES, DailyOracle } from '../../../data/homeContent';
import { fadeInUp } from '../../../theme/motionTokens';

// =============================================================================
// TYPES
// =============================================================================

interface KnowledgeSectionProps {
  savedFacts: number[];
  onSelectFact: (fact: DailyOracle) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const KnowledgeSection: React.FC<KnowledgeSectionProps> = ({
  savedFacts,
  onSelectFact,
}) => {
  // Calculate progress for each category
  const categoryProgress = useMemo(() => {
    return KNOWLEDGE_CATEGORIES.reduce((acc, category) => {
      const categoryFacts = DAILY_ORACLES.filter(f => f.category === category.id);
      const savedInCategory = categoryFacts.filter(f => savedFacts.includes(f.id)).length;
      acc[category.id] = {
        saved: savedInCategory,
        total: categoryFacts.length,
        percentage: categoryFacts.length > 0
          ? (savedInCategory / categoryFacts.length) * 100
          : 0,
      };
      return acc;
    }, {} as Record<string, { saved: number; total: number; percentage: number }>);
  }, [savedFacts]);

  const handleFactClick = useCallback((fact: DailyOracle) => {
    onSelectFact(fact);
  }, [onSelectFact]);

  const handleFactKeyDown = useCallback((e: React.KeyboardEvent, fact: DailyOracle) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFactClick(fact);
    }
  }, [handleFactClick]);

  return (
    <Box sx={{ px: 2, mb: 2 }} component="section" aria-labelledby="knowledge-title">
      <motion.div variants={fadeInUp} initial="initial" animate="animate">
        <Typography
          id="knowledge-title"
          variant="h6"
          component="h2"
          sx={{ mb: 1.5, fontWeight: 600, color: 'var(--text-primary)' }}
        >
          Gemas de Conocimiento
        </Typography>

        {KNOWLEDGE_CATEGORIES.map((category, index) => {
          const progress = categoryProgress[category.id];
          const categoryFacts = DAILY_ORACLES.filter(f => f.category === category.id);

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Accordion
                sx={{
                  bgcolor: 'var(--surface-secondary)',
                  mb: 1,
                  '&:before': { display: 'none' },
                  borderRadius: '12px !important',
                  overflow: 'hidden',
                  '&:focus-within': {
                    outline: `2px solid ${category.color}`,
                    outlineOffset: 2,
                  },
                }}
                slotProps={{
                  transition: {
                    unmountOnExit: true,
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  aria-controls={`${category.id}-content`}
                  id={`${category.id}-header`}
                  sx={{
                    '&:focus-visible': {
                      bgcolor: `${category.color}10`,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: `${category.color}20`,
                        color: category.color,
                        width: 40,
                        height: 40,
                      }}
                      aria-hidden="true"
                    >
                      {category.icon}
                    </Avatar>

                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="subtitle2"
                        component="h3"
                        sx={{ fontWeight: 600, color: 'var(--text-primary)' }}
                      >
                        {category.title}
                      </Typography>

                      <LinearProgress
                        variant="determinate"
                        value={progress.percentage}
                        aria-label={`Progreso en ${category.title}: ${progress.saved} de ${progress.total}`}
                        sx={{
                          mt: 0.5,
                          height: 4,
                          borderRadius: 2,
                          bgcolor: `${category.color}20`,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: category.color,
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Box>

                    <Chip
                      label={`${progress.saved}/${progress.total}`}
                      size="small"
                      aria-label={`${progress.saved} de ${progress.total} completados`}
                      sx={{
                        bgcolor: progress.percentage === 100 ? `${category.color}20` : 'default',
                        color: progress.percentage === 100 ? category.color : 'inherit',
                        fontWeight: progress.percentage === 100 ? 600 : 400,
                      }}
                    />
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ pt: 0 }}>
                  <List dense role="list" aria-label={`Datos de ${category.title}`}>
                    {categoryFacts.map((fact) => {
                      const isSaved = savedFacts.includes(fact.id);

                      return (
                        <ListItemButton
                          key={fact.id}
                          onClick={() => handleFactClick(fact)}
                          onKeyDown={(e) => handleFactKeyDown(e, fact)}
                          aria-label={`${fact.title}. ${isSaved ? 'Guardado' : 'No guardado'}. Presiona Enter para ver detalles.`}
                          sx={{
                            borderRadius: 2,
                            mb: 0.5,
                            '&:focus-visible': {
                              outline: `2px solid ${category.color}`,
                              outlineOffset: -2,
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {isSaved ? (
                              <CheckCircle sx={{ color: category.color }} aria-hidden="true" />
                            ) : (
                              <CircleOutlined sx={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={fact.title}
                            secondary={`${fact.content.substring(0, 60)}...`}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: isSaved ? 600 : 500,
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                            }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            </motion.div>
          );
        })}
      </motion.div>
    </Box>
  );
};

export default KnowledgeSection;
