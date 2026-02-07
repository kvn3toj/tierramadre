/**
 * KeyboardShortcutsHelp Component
 * Shows available keyboard shortcuts in a dialog.
 * Triggered by pressing "?" key. Nielsen H10 (Help & Documentation).
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import { X, Keyboard } from 'lucide-react';
import { emeraldCore } from '../../design-system/tokens/colors';

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['←', '→', '↑', '↓'], description: 'Navegar productos' },
  { keys: ['Enter'], description: 'Abrir producto' },
  { keys: ['F'], description: 'Agregar a favoritos' },
  { keys: ['C'], description: 'Comparar producto' },
  { keys: ['/'], description: 'Buscar' },
  { keys: ['Home'], description: 'Ir al primer producto' },
  { keys: ['End'], description: 'Ir al último producto' },
  { keys: ['Esc'], description: 'Cerrar diálogo / Salir de navegación' },
  { keys: ['?'], description: 'Mostrar atajos de teclado' },
];

export default function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: isLight ? 'background.paper' : alpha('#1c1c1e', 0.95),
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Keyboard size={20} color={emeraldCore.primary} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          Atajos de teclado
        </Typography>
        <IconButton size="small" onClick={() => setOpen(false)} aria-label="Cerrar">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Box component="dl" sx={{ m: 0 }}>
          {SHORTCUTS.map((shortcut) => (
            <Box
              key={shortcut.description}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              <Typography
                component="dd"
                variant="body2"
                sx={{ color: 'text.secondary', m: 0 }}
              >
                {shortcut.description}
              </Typography>
              <Box component="dt" sx={{ display: 'flex', gap: 0.5, m: 0 }}>
                {shortcut.keys.map((key) => (
                  <Box
                    component="kbd"
                    key={key}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 28,
                      px: 0.75,
                      py: 0.25,
                      fontSize: '0.75rem',
                      fontFamily: 'inherit',
                      fontWeight: 600,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isLight ? alpha('#000', 0.04) : alpha('#fff', 0.08),
                      color: 'text.primary',
                    }}
                  >
                    {key}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
