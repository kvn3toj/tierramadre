/**
 * El pie de la tienda.
 *
 * Tres columnas cortas y una línea legal. Las rutas legales cuelgan de aquí:
 * la ley 1480 (protección al consumidor) y la 1581 (habeas data) piden que un
 * comprador colombiano pueda encontrarlas antes de comprar, y el pie es donde
 * las busca.
 */
import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import { qeType, touchTargets } from '../../../design-system';
import {
  HOUSE_WHATSAPP_DISPLAY,
  INSTAGRAM_URL,
  houseWhatsAppLink,
} from '../../../constants/contact';
import { MenuPlacementSwitch } from './TiendaChromeBits';

/**
 * Un enlace del pie es un objetivo táctil, no una línea de texto.
 *
 * Medido en Chrome real, `paddingBlock: 8px` sobre una línea de ~15px daba
 * 39px de alto — por debajo de los 44 del contrato, en las tres ventanas.
 * `minHeight` con el texto centrado sube la caja sin tocar la tinta: la letra
 * sigue midiendo 15px, sólo crece el área que recibe el dedo.
 *
 * No se usó el mixin `hitSlop`: su propia documentación avisa de que la
 * cápsula absoluta se sale de la caja y pisa la del vecino, y aquí los
 * enlaces van apilados uno sobre otro — exactamente el caso que desaconseja.
 * La separación entre vecinos la pone el contenedor (`listaSx`, gap 8px).
 */
const enlaceSx = {
  ...qeType.body,
  fontSize: '0.9375rem',
  display: 'flex',
  alignItems: 'center',
  minHeight: `${touchTargets.minimum}px`,
  textDecoration: 'none',
  color: 'var(--tm-muted)',
  paddingBlock: '8px',
  transition: 'color var(--tm-fast) var(--tm-ease)',
  '&:hover': { color: 'var(--tm-accent)' },
  '&:focus-visible': { outline: 'none', boxShadow: 'var(--tm-focus-ring)' },
} as const;

/** Columna de enlaces: 8px de aire entre objetivos táctiles adyacentes. */
const listaSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
} as const;

const tituloSx = {
  ...qeType.overline,
  color: 'var(--tm-muted)',
  marginBlockEnd: '8px',
} as const;

export default function TiendaFooter() {
  const { t } = useLanguage();

  const columnas = [
    {
      titulo: t.tienda.footer.colecciones,
      enlaces: [
        { to: '/tienda/joyeria', label: t.tienda.categorias.joyeria.nombre },
        { to: '/tienda/simbolos', label: t.tienda.categorias.simbolos.nombre },
        { to: '/tienda/seleccion', label: t.tienda.nav.seleccion },
      ],
    },
    {
      titulo: t.tienda.footer.legal,
      enlaces: [
        { to: '/tienda/terminos', label: t.tienda.legal.terminos },
        { to: '/tienda/privacidad', label: t.tienda.legal.privacidad },
        { to: '/tienda/retracto', label: t.tienda.legal.retracto },
      ],
    },
  ];

  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid var(--tm-hairline)',
        marginBlockStart: '48px',
      }}
    >
      <Box
        sx={{
          maxWidth: 1080,
          margin: '0 auto',
          paddingInline: { xs: '16px', sm: '24px', md: '32px' },
          paddingBlock: { xs: '28px', sm: '36px' },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
            gap: { xs: '20px', sm: '28px' },
          }}
        >
          {columnas.map((col) => (
            <Box key={col.titulo}>
              <Typography sx={tituloSx}>{col.titulo}</Typography>
              <Box sx={listaSx}>
                {col.enlaces.map((e) => (
                  <Box key={e.to} component={Link} to={e.to} sx={enlaceSx}>
                    {e.label}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}

          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <Typography sx={tituloSx}>{t.tienda.footer.contacto}</Typography>
            <Box sx={listaSx}>
              <Box
                component="a"
                href={houseWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                sx={enlaceSx}
              >
                {HOUSE_WHATSAPP_DISPLAY}
              </Box>
              <Box
                component="a"
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={enlaceSx}
              >
                Instagram
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            marginBlockStart: '28px',
            paddingBlockStart: '20px',
            borderTop: '1px solid var(--tm-hairline)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Las dos líneas del cierre eran `qeType.spec` — 11px con el
              tracking de la ficha técnica, el registro reservado al METADATO
              (quilates, medidas). Ninguna de las dos lo es, y la segunda menos
              que ninguna: es la frase que avisa de que los precios son de
              referencia. Era el texto más pequeño de la página siendo el de
              mayor consecuencia. Las dos pasan a `qeType.body`, y la
              advertencia queda un punto por encima de la línea de autoría
              para que la jerarquía diga lo que la página necesita decir.
              `--tm-muted`, nunca `--tm-subtle`. */}
          <Box>
            <Typography
              sx={{
                ...qeType.body,
                fontSize: '0.8125rem',
                color: 'var(--tm-muted)',
              }}
            >
              {t.tienda.footer.rights}
            </Typography>
            <Typography
              sx={{
                ...qeType.body,
                fontSize: '0.875rem',
                color: 'var(--tm-muted)',
                marginBlockStart: '4px',
              }}
            >
              {t.tienda.shell.sampleNotice}
            </Typography>
          </Box>
          <MenuPlacementSwitch />
        </Box>
      </Box>
    </Box>
  );
}
