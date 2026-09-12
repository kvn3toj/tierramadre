/**
 * El único camino del visitante público hacia su carrito.
 *
 * Las superficies públicas (`/v/:code`, `/c/:folder`) no montan el shell de la
 * app, así que no tienen barra de navegación ni ícono de carrito. Sin este
 * indicador, «Agregar» sería un botón que no lleva a ningún lado: la pieza
 * entra al carrito y el cliente no tiene forma de llegar a pagarla.
 *
 * ## Es presentacional a propósito
 *
 * Recibe `count` por prop en vez de llamar a `useCart()`. **`useCart` no es un
 * contexto**: cada llamada crea su propio estado de React y las instancias sólo
 * se enteran de los cambios ajenas al escribir en `sessionStorage`, que no
 * dispara re-render. Si este componente llamara a `useCart()` por su cuenta, el
 * contador se quedaría clavado en 0 mientras el cliente agrega piezas —
 * silenciosamente, y sólo en producción, porque al recargar la página sí
 * aparecería el número correcto.
 *
 * Por eso la superficie que hospeda la grilla es la dueña del `useCart()` y
 * pasa `count` hacia abajo. Una sola instancia, un solo estado.
 */
import { Box, Badge } from '@mui/material';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { zIndex } from '../../design-system';

interface CarritoFlotanteProps {
  /** Piezas en el carrito. Con 0 el indicador no se renderiza. */
  count: number;
}

export default function CarritoFlotante({ count }: CarritoFlotanteProps) {
  const navigate = useNavigate();

  // Un carrito vacío no tiene nada que ofrecer y taparía la pieza.
  if (count <= 0) return null;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => navigate('/cart')}
      aria-label={`Ver tu selección (${count} ${count === 1 ? 'pieza' : 'piezas'})`}
      sx={{
        position: 'fixed',
        right: 16,
        // Por encima del borde inferior seguro en iOS, donde vive la barra
        // de gestos del sistema.
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        zIndex: zIndex.float,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 52,
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        color: 'var(--tm-on-accent)',
        bgcolor: 'var(--tm-accent-strong)',
        // La única sombra editorial del sistema (DS3 §3.3), que es exactamente
        // para lo que existe: una capa que flota de verdad.
        boxShadow: 'var(--tm-shadow)',
        // DS3 §4 regla 2/3: sólo color y opacidad. El `scale(0.94)` anterior
        // movía el layout en el press.
        transition:
          'opacity var(--tm-fast) var(--tm-ease), background-color var(--tm-fast) var(--tm-ease)',
        '&:hover': { backgroundColor: 'var(--tm-accent)' },
        '&:active': { opacity: 0.85 },
        '&:focus-visible': {
          boxShadow: 'var(--tm-focus-ring)',
          outline: 'none',
        },
      }}
    >
      <Badge
        badgeContent={count}
        sx={{
          '& .MuiBadge-badge': {
            top: -6,
            right: -6,
            bgcolor: 'var(--tm-surface)',
            color: 'var(--tm-accent)',
            fontWeight: 700,
            fontSize: '0.6875rem',
            fontFamily: 'var(--tm-font-mono)',
          },
        }}
      >
        <ShoppingBag size={21} />
      </Badge>
    </Box>
  );
}
