/**
 * El menú desplegable de la tienda.
 *
 * Sirve a las DOS colocaciones: es el menú de hamburguesa en móvil cuando la
 * navegación vive en la cabecera, y es lo que abre la ranura «Menú» de la
 * barra inferior. Una sola lista de enlaces, dos maneras de llegar a ella.
 *
 * Se apoya en el `Sheet` de DS3, que ya trae trampa de foco, devolución del
 * foco al cerrar y Escape (WCAG 2.4.3) por venir de MUI `Modal`.
 */
import { Box } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Sheet, qeType, touchTargets } from '../../../design-system';
import { esRutaActiva, useTiendaNav } from './TiendaHeader';

export interface TiendaMenuSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function TiendaMenuSheet({
  open,
  onClose,
}: TiendaMenuSheetProps) {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const nav = useTiendaNav();

  const legales = [
    { to: '/tienda/terminos', label: t.tienda.legal.terminos },
    { to: '/tienda/privacidad', label: t.tienda.legal.privacidad },
    { to: '/tienda/retracto', label: t.tienda.legal.retracto },
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      ariaLabel={t.tienda.shell.menu}
      maxWidth={420}
    >
      <Box component="nav" sx={{ padding: '8px 4px 4px' }}>
        {nav.map((link) => {
          const activa = esRutaActiva(pathname, link);
          return (
            <Box
              key={link.to}
              component={Link}
              to={link.to}
              onClick={onClose}
              aria-current={activa ? 'page' : undefined}
              sx={{
                ...qeType.title,
                fontSize: '1.25rem',
                display: 'block',
                textDecoration: 'none',
                color: activa ? 'var(--tm-accent)' : 'var(--tm-text)',
                paddingBlock: '14px',
                paddingInline: '12px',
                borderRadius: 'var(--tm-radius-control)',
                transition: 'color var(--tm-fast) var(--tm-ease)',
                '&:hover': { color: 'var(--tm-accent)' },
                '&:focus-visible': {
                  outline: 'none',
                  boxShadow: 'var(--tm-focus-ring)',
                },
                '&:active': { opacity: 0.85 },
              }}
            >
              {link.label}
            </Box>
          );
        })}

        <Box
          sx={{
            marginBlockStart: '12px',
            paddingBlockStart: '12px',
            borderTop: '1px solid var(--tm-hairline)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {/* Estos tres son ENLACES, no metadato. Estaban en `qeType.spec`:
              11px con el tracking de la ficha técnica, el registro con el que
              la casa escribe quilates —
              ilegible como etiqueta pulsable, y la caja medía 39px de alto,
              por debajo del suelo de 44. Pasan a `qeType.body` a 14px (el pie
              de página de la tienda, ver PagoPage) y la caja sube a 44 con el
              texto centrado: crece el área táctil, no la tinta. El `gap` del
              contenedor sube de 4 a 8px para que dos objetivos vecinos no se
              toquen. */}
          {legales.map((l) => (
            <Box
              key={l.to}
              component={Link}
              to={l.to}
              onClick={onClose}
              sx={{
                ...qeType.body,
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: `${touchTargets.minimum}px`,
                textDecoration: 'none',
                color: 'var(--tm-muted)',
                paddingBlock: '8px',
                paddingInline: '12px',
                borderRadius: 'var(--tm-radius-control)',
                transition: 'color var(--tm-fast) var(--tm-ease)',
                '&:hover': { color: 'var(--tm-accent)' },
                '&:focus-visible': {
                  outline: 'none',
                  boxShadow: 'var(--tm-focus-ring)',
                },
              }}
            >
              {l.label}
            </Box>
          ))}
        </Box>
      </Box>
    </Sheet>
  );
}
