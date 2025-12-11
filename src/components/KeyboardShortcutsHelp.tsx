/**
 * KeyboardShortcutsHelp Component
 * Shows available keyboard shortcuts for the inventory browser.
 * Accessible modal with proper focus management.
 */
import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  alpha,
  Chip,
  Divider,
} from '@mui/material';
import { X, Keyboard, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useThemeMode } from '../contexts/ThemeContext';
import { emeraldCore, surfacesLight, surfacesDark } from '../design-system/tokens/colors';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
    icon?: React.ReactNode;
  }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navegación',
    shortcuts: [
      { keys: ['←', '→'], description: 'Mover entre productos', icon: <><ArrowLeft size={12} /><ArrowRight size={12} /></> },
      { keys: ['↑', '↓'], description: 'Mover entre filas', icon: <><ArrowUp size={12} /><ArrowDown size={12} /></> },
      { keys: ['Home'], description: 'Ir al primer producto' },
      { keys: ['End'], description: 'Ir al último producto' },
      { keys: ['Esc'], description: 'Salir de navegación' },
    ],
  },
  {
    title: 'Acciones',
    shortcuts: [
      { keys: ['Enter', 'Space'], description: 'Abrir producto seleccionado' },
      { keys: ['F'], description: 'Agregar/quitar de favoritos' },
      { keys: ['C'], description: 'Agregar/quitar de comparación' },
    ],
  },
  {
    title: 'Búsqueda',
    shortcuts: [
      { keys: ['/'], description: 'Enfocar búsqueda' },
      { keys: ['Esc'], description: 'Salir de búsqueda' },
    ],
  },
];

function KeyboardKey({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Box
      component="kbd"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 28,
        height: 28,
        px: 1,
        borderRadius: 1,
        bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.tertiary,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.default : surfacesDark.border.default,
        boxShadow: isLight
          ? '0 2px 0 0 rgba(0,0,0,0.1)'
          : '0 2px 0 0 rgba(0,0,0,0.3)',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: isLight ? surfacesLight.text.primary : surfacesDark.text.primary,
      }}
    >
      {children}
    </Box>
  );
}

export default function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button when dialog opens
  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [open]);

  // Handle keyboard shortcut to show this dialog (? key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !open) {
        // Only trigger if not in an input
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          // This would need to be connected to parent state
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="keyboard-shortcuts-title"
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isLight ? surfacesLight.background.primary : surfacesDark.background.primary,
        },
      }}
    >
      <DialogTitle
        id="keyboard-shortcuts-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: isLight ? surfacesLight.border.light : surfacesDark.border.default,
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Keyboard size={24} color={emeraldCore.primary} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Atajos de Teclado
          </Typography>
        </Box>
        <IconButton
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Cerrar"
          size="small"
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {SHORTCUT_GROUPS.map((group, groupIndex) => (
          <Box key={group.title} sx={{ mb: groupIndex < SHORTCUT_GROUPS.length - 1 ? 3 : 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: emeraldCore.primary,
                mb: 1.5,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.7rem',
              }}
            >
              {group.title}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {group.shortcuts.map((shortcut, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {shortcut.keys.map((key, keyIndex) => (
                      <Box key={keyIndex} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {keyIndex > 0 && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', mx: 0.25 }}
                          >
                            /
                          </Typography>
                        )}
                        <KeyboardKey>{key}</KeyboardKey>
                      </Box>
                    ))}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isLight ? surfacesLight.text.secondary : surfacesDark.text.secondary,
                      textAlign: 'right',
                    }}
                  >
                    {shortcut.description}
                  </Typography>
                </Box>
              ))}
            </Box>

            {groupIndex < SHORTCUT_GROUPS.length - 1 && (
              <Divider sx={{ mt: 2 }} />
            )}
          </Box>
        ))}

        {/* Help tip */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: alpha(emeraldCore.primary, 0.08),
            border: '1px solid',
            borderColor: alpha(emeraldCore.primary, 0.2),
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            <strong>Tip:</strong> Presiona <KeyboardKey>?</KeyboardKey> en cualquier momento para ver estos atajos.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// Button to trigger the help dialog
export function KeyboardShortcutsButton({
  onClick,
}: {
  onClick: () => void;
}) {
  const { mode } = useThemeMode();
  const isLight = mode === 'light';

  return (
    <Chip
      icon={<Keyboard size={14} />}
      label="?"
      size="small"
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        bgcolor: isLight ? surfacesLight.background.tertiary : surfacesDark.background.tertiary,
        border: '1px solid',
        borderColor: isLight ? surfacesLight.border.default : surfacesDark.border.default,
        '&:hover': {
          bgcolor: alpha(emeraldCore.primary, 0.1),
          borderColor: emeraldCore.primary,
        },
        '& .MuiChip-label': {
          fontFamily: 'monospace',
          fontWeight: 700,
        },
      }}
      aria-label="Mostrar atajos de teclado"
    />
  );
}
