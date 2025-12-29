/**
 * QuickActions Component
 *
 * Floating action menu for quick navigation to key features.
 * Implements Zeno's fractal navigation pattern with contextual actions.
 *
 * Designed by: Zeno (Navigation) + Aria (Accessibility)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Fab, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import {
  Add,
  Close,
  AutoAwesome,
  SelfImprovement,
  Inventory2,
  School,
  PhotoCamera,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { emeraldCore, goldAccent } from '../../../design-system/tokens/colors';
import { PHI_INVERSE } from '../../../design-system/tokens';

// =============================================================================
// TYPES
// =============================================================================

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  path?: string;
  action?: () => void;
  color?: string;
}

interface QuickActionsProps {
  /** Additional custom actions */
  customActions?: QuickAction[];
  /** Position on screen */
  position?: 'bottom-right' | 'bottom-left';
  /** Show keyboard shortcut hints */
  showShortcuts?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'oracle',
    icon: <AutoAwesome />,
    label: 'Oráculo',
    shortcut: 'O',
    action: () => document.getElementById('oracle-title')?.scrollIntoView({ behavior: 'smooth' }),
    color: goldAccent.primary,
  },
  {
    id: 'meditation',
    icon: <SelfImprovement />,
    label: 'Meditación',
    shortcut: 'M',
    action: () => document.getElementById('meditation-section')?.scrollIntoView({ behavior: 'smooth' }),
    color: emeraldCore.primary,
  },
  {
    id: 'treasure',
    icon: <Inventory2 />,
    label: 'Tesoros',
    shortcut: 'T',
    path: '/treasure',
    color: emeraldCore.light,
  },
  {
    id: 'knowledge',
    icon: <School />,
    label: 'Conocimiento',
    shortcut: 'C',
    action: () => document.getElementById('knowledge-section')?.scrollIntoView({ behavior: 'smooth' }),
    color: '#8B5CF6',
  },
  {
    id: 'upload',
    icon: <PhotoCamera />,
    label: 'Subir Esmeralda',
    shortcut: 'U',
    path: '/upload',
    color: '#F59E0B',
  },
];

// Animation variants
const containerVariants = {
  open: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
  closed: {
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
};

const itemVariants = {
  open: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  },
  closed: {
    y: 20,
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2 },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const QuickActions: React.FC<QuickActionsProps> = ({
  customActions = [],
  position = 'bottom-right',
  showShortcuts = false, // Disabled - target devices are mobile (iPhone 12+, iPad)
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const actions = [...DEFAULT_ACTIONS, ...customActions];

  // Handle action execution
  const handleAction = useCallback((action: QuickAction) => {
    if (action.path) {
      navigate(action.path);
    } else if (action.action) {
      action.action();
    }
    setIsOpen(false);
  }, [navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!showShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Toggle menu with '/'
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      // Quick action shortcuts (when menu is open or with Cmd/Ctrl)
      if (isOpen || e.metaKey || e.ctrlKey) {
        const action = actions.find(
          a => a.shortcut?.toLowerCase() === e.key.toLowerCase()
        );
        if (action) {
          e.preventDefault();
          handleAction(action);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, actions, handleAction, showShortcuts]);

  // Position styles
  const positionStyles = position === 'bottom-right'
    ? { right: 16, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }
    : { left: 16, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' };

  return (
    <Box
      sx={{
        position: 'fixed',
        ...positionStyles,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: position === 'bottom-right' ? 'flex-end' : 'flex-start',
        gap: 1,
      }}
    >
      {/* Action Items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={containerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 8,
            }}
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.id}
                variants={itemVariants}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexDirection: position === 'bottom-right' ? 'row-reverse' : 'row',
                }}
              >
                <Tooltip
                  title={
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2">{action.label}</Typography>
                      {showShortcuts && action.shortcut && (
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          Atajo: {action.shortcut}
                        </Typography>
                      )}
                    </Box>
                  }
                  placement={position === 'bottom-right' ? 'left' : 'right'}
                  arrow
                >
                  <Fab
                    size={isMobile ? 'small' : 'medium'}
                    onClick={() => handleAction(action)}
                    aria-label={`${action.label}${action.shortcut ? `. Atajo: ${action.shortcut}` : ''}`}
                    sx={{
                      bgcolor: action.color || emeraldCore.primary,
                      color: 'white',
                      boxShadow: `0 4px 12px ${action.color || emeraldCore.primary}40`,
                      '&:hover': {
                        bgcolor: action.color || emeraldCore.primary,
                        transform: 'scale(1.05)',
                      },
                      // Golden ratio sizing
                      transform: `scale(${1 - index * (1 - PHI_INVERSE) * 0.1})`,
                    }}
                  >
                    {action.icon}
                  </Fab>
                </Tooltip>

                {/* Label (desktop only) */}
                {!isMobile && (
                  <motion.div
                    initial={{ opacity: 0, x: position === 'bottom-right' ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    <Box
                      sx={{
                        bgcolor: 'var(--surface-elevated)',
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 2,
                        boxShadow: 'var(--shadow-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {action.label}
                      </Typography>
                      {showShortcuts && action.shortcut && (
                        <Typography
                          variant="caption"
                          sx={{
                            bgcolor: 'var(--surface-secondary)',
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 1,
                            fontFamily: 'monospace',
                          }}
                        >
                          {action.shortcut}
                        </Typography>
                      )}
                    </Box>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Toggle Button */}
      <motion.div
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Fab
          color="primary"
          onClick={() => setIsOpen(prev => !prev)}
          aria-label={isOpen ? 'Cerrar menú de acciones rápidas' : 'Abrir menú de acciones rápidas. Atajo: /'}
          aria-expanded={isOpen}
          sx={{
            bgcolor: isOpen ? 'var(--surface-secondary)' : emeraldCore.primary,
            color: isOpen ? 'var(--text-primary)' : 'white',
            boxShadow: isOpen
              ? 'var(--shadow-medium)'
              : `0 6px 20px ${emeraldCore.primary}50`,
            '&:hover': {
              bgcolor: isOpen ? 'var(--surface-tertiary)' : emeraldCore.dark,
            },
          }}
        >
          {isOpen ? <Close /> : <Add />}
        </Fab>
      </motion.div>

      {/* Keyboard hint (desktop only) */}
      {!isMobile && !isOpen && showShortcuts && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'var(--text-tertiary)',
              mt: 0.5,
              textAlign: 'center',
            }}
          >
            Pulsa / para abrir
          </Typography>
        </motion.div>
      )}
    </Box>
  );
};

export default QuickActions;
