/**
 * `/tienda/:categoria` — las piezas de una colección.
 *
 * El selector de montura vive aquí como control de vista previa, no como
 * ocho tarjetas: Joyería tiene dos diseños, y ocho tarjetas serían las mismas
 * dos fotografías repetidas cuatro veces. En un sistema cuya tesis es "una
 * joya en calma" eso se lee como inventario duplicado, justo la señal contraria
 * a la de una pieza hecha por encargo.
 */
import { Box, Typography } from '@mui/material';
import { SearchX } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TiendaShell from './TiendaShell';
import MetalSelector, { useMetalParam } from './components/MetalSelector';
import TiendaPieceCard from './components/TiendaPieceCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { EmptyState, qeType } from '../../design-system';
import { findCategoria, productosDe, tieneEjeDeMetal } from '../../utils/tienda';

export default function CategoriaPage() {
  const { categoria: categoriaParam } = useParams<{ categoria: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [metal, setMetal] = useMetalParam();

  const categoria = findCategoria(categoriaParam);

  if (!categoria) {
    return (
      <TiendaShell>
        <EmptyState
          icon={SearchX}
          title={t.tienda.notFound.coleccionTitle}
          subtitle={t.tienda.notFound.coleccionBody}
          action={{ label: t.tienda.notFound.cta, onClick: () => navigate('/tienda') }}
        />
      </TiendaShell>
    );
  }

  const copy = t.tienda.categorias[categoria.key];
  const productos = productosDe(categoria.key);
  const conMetal = productos.some(tieneEjeDeMetal);

  return (
    <TiendaShell>
      <Box sx={{ marginBlockEnd: { xs: '24px', sm: '32px' } }}>
        <Typography sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}>
          {t.tienda.eyebrowColeccion}
        </Typography>
        <Typography
          component="h1"
          sx={{
            ...qeType.display,
            fontSize: 'clamp(1.875rem, 6vw, 2.5rem)',
            color: 'var(--tm-text)',
            marginBlockStart: '10px',
          }}
        >
          {copy.nombre}
        </Typography>
        <Typography
          sx={{
            ...qeType.body,
            fontSize: '1.0625rem',
            color: 'var(--tm-muted)',
            marginBlockStart: '12px',
            maxWidth: '60ch',
          }}
        >
          {copy.descripcion}
        </Typography>
      </Box>

      {conMetal && (
        <Box
          sx={{
            marginBlockEnd: { xs: '20px', sm: '24px' },
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <Typography sx={{ ...qeType.overline, color: 'var(--tm-muted)' }}>
            {t.tienda.montura}
          </Typography>
          {/* Acotado: cuatro segmentos estirados sobre 1000px se leen como un
              error de maquetación, no como un control. */}
          <Box sx={{ width: '100%', maxWidth: { xs: 'none', sm: 440 } }}>
            <MetalSelector value={metal} onChange={setMetal} block />
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: { xs: '12px', sm: '20px' },
        }}
      >
        {productos.map((producto) => (
          <TiendaPieceCard
            key={producto.slug}
            producto={producto}
            metal={metal}
            search={location.search}
          />
        ))}
      </Box>
    </TiendaShell>
  );
}
