/**
 * La barra flotante de la selección.
 *
 * Aparece sólo cuando hay algo elegido y se retira sola cuando se vacía. Se
 * revela con opacidad y un desplazamiento de 12px — transform y opacidad,
 * nunca alto ni margen — para que el contenido de la página no se re-maquete
 * al aparecer.
 *
 * Convive con la barra inferior: cuando el menú vive abajo, esta barra sube
 * por encima de la TabBar en vez de taparla. DS3 §5.2 ya resolvió que dos
 * barras no comparten el mismo borde inferior.
 *
 * Y reserva su propio hueco. Al ser `fixed` no ocupa sitio en el flujo, así
 * que al final del scroll la última tarjeta quedaba a 1.9px de la barra
 * (medido a 500px en /tienda/joyeria): la barra tapaba justo el contenido que
 * dice cuánto hay elegido. El separador hermano devuelve al documento la
 * altura que la barra le quita — misma idea que el hueco de la TabBar en
 * `TiendaShell`, y por el mismo motivo: quien flota paga su propio espacio.
 */
import { Box, Typography } from '@mui/material';
import { Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  Button,
  componentHeights,
  ds3Shell,
  qeType,
  touchTargets,
} from '../../../design-system';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useSeleccion } from '../useTienda';

/** Separación de la barra respecto al borde (y respecto a la TabBar). */
const STANDOFF = 12;
/** Aire interior de la píldora, arriba y abajo. */
const RELLENO = 10;
/** El hilo del borde, que también cuenta para el alto ocupado. */
const BORDE = 1;
/**
 * Alto de la fila: lo fija el control más alto, que es el CTA `size="lg"`.
 * Sale del token en vez de un número copiado, para que crecer el botón no
 * deje el separador corto en silencio.
 */
const FILA = componentHeights.button.lg;
/** Lo que la barra le quita al documento, y por tanto lo que debe devolverle. */
const ALTO_OCUPADO = FILA + 2 * RELLENO + 2 * BORDE + 2 * STANDOFF;

export interface SeleccionBarProps {
  conBarraInferior: boolean;
}

export default function SeleccionBar({ conBarraInferior }: SeleccionBarProps) {
  const { t } = useLanguage();
  const { count, clear } = useSeleccion();
  const prefersReducedMotion = useReducedMotion();

  if (count === 0) return null;

  const etiqueta =
    count === 1
      ? t.tienda.seleccion.countOne
      : t.tienda.seleccion.count.replace('{n}', String(count));

  return (
    <>
      {/* El hueco que la barra flotante no ocupa por sí sola. Va aquí y no en
          la página porque el alto lo conoce la barra, no quien la monta.
          El área segura se suma exactamente donde la suma el `bottom` de la
          barra: con TabBar ya la trae el hueco que reserva `TiendaShell`, y
          contarla dos veces dejaría un vacío al final del documento. */}
      <Box
        aria-hidden="true"
        sx={{
          flexShrink: 0,
          height: conBarraInferior
            ? `${ALTO_OCUPADO}px`
            : `calc(${ALTO_OCUPADO}px + env(safe-area-inset-bottom, 0px))`,
        }}
      />

      <Box
        component={motion.div}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        sx={{
          position: 'fixed',
          insetInline: 0,
          // Por encima de la TabBar cuando ésta existe; si no, pegada al borde.
          bottom: conBarraInferior
            ? ds3Shell.scroll.bottomBarClearance(ds3Shell.tabBarReserve)
            : 'env(safe-area-inset-bottom, 0px)',
          zIndex: ds3Shell.zIndex.panel,
          display: 'flex',
          justifyContent: 'center',
          paddingInline: '16px',
          paddingBlock: `${STANDOFF}px`,
          pointerEvents: 'none',
        }}
      >
        <Box
          role="status"
          sx={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: 560,
            display: 'flex',
            alignItems: 'center',
            // 12px entre controles: por encima del mínimo de 8 que pide el
            // contrato entre objetivos táctiles contiguos.
            gap: '12px',
            paddingInline: '14px',
            paddingBlock: `${RELLENO}px`,
            borderRadius: 'var(--tm-radius-card)',
            border: `${BORDE}px solid var(--tm-border)`,
            backgroundColor: 'var(--tm-surface)',
            boxShadow: 'var(--tm-shadow)',
          }}
        >
          <Bookmark
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
            color="var(--tm-accent)"
          />
          <Typography
            sx={{
              ...qeType.spec,
              color: 'var(--tm-text)',
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {etiqueta}
          </Typography>

          <Box
            component="button"
            type="button"
            onClick={clear}
            sx={{
              ...qeType.spec,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--tm-muted)',
              // `alignItems: 'center'` en la fila impide el estirado, así que
              // el alto real sale de aquí: 44 medidos, no heredados.
              minHeight: touchTargets.minimum,
              minWidth: touchTargets.minimum,
              flexShrink: 0,
              paddingInline: '8px',
              borderRadius: 'var(--tm-radius-control)',
              transition: 'color var(--tm-fast) var(--tm-ease)',
              '&:hover': { color: 'var(--tm-accent)' },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: 'var(--tm-focus-ring)',
              },
            }}
          >
            {t.tienda.seleccion.clear}
          </Box>

          {/* `lg` y no el `md` por defecto: el tamaño medio del sistema mide
              40px y este es el objetivo táctil principal de la barra. El
              arreglo es local a propósito — el token compartido lo usa toda
              la app. */}
          <Button
            component={Link}
            to="/tienda/seleccion"
            variant="primary"
            size="lg"
          >
            {t.tienda.seleccion.view}
          </Button>
        </Box>
      </Box>
    </>
  );
}
