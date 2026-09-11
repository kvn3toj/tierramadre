/**
 * `/tienda` — la puerta. Dos caminos, nada más.
 *
 * Sobre los cuatro estados de datos de DS3: el catálogo es un `import`
 * síncrono, así que "cargando" y "error" son inalcanzables por construcción en
 * esta pantalla. Poner un Skeleton aquí sería teatro, y un destello de
 * esqueleto falso es exactamente el parpadeo que DS3 prohíbe. Los estados
 * vacío y de error viven un nivel más abajo, donde sí son reales:
 * `CategoriaPage` para una colección que no existe, `ProductoPage` para una
 * pieza que no existe.
 */
import { Box, Typography } from '@mui/material';
import TiendaShell from './TiendaShell';
import DoorCard from './components/DoorCard';
import { TIENDA_CATEGORIAS } from '../../data/tiendaCategorias';
import { useLanguage } from '../../contexts/LanguageContext';
import { qeType } from '../../design-system';

export default function TiendaPage() {
  const { t } = useLanguage();

  return (
    <TiendaShell>
      <Box sx={{ marginBlockEnd: { xs: '28px', sm: '40px' } }}>
        <Typography sx={{ ...qeType.overline, color: 'var(--tm-subtle)' }}>
          {t.tienda.puerta.eyebrow}
        </Typography>
        <Typography
          component="h1"
          sx={{
            ...qeType.display,
            // `display` no trae fontSize a propósito: se acompaña con clamp()
            // en el sitio de uso.
            fontSize: 'clamp(2rem, 7vw, 2.75rem)',
            color: 'var(--tm-text)',
            marginBlockStart: '10px',
          }}
        >
          {t.tienda.puerta.title}
        </Typography>
        <Typography
          sx={{
            ...qeType.body,
            fontSize: '1.0625rem',
            color: 'var(--tm-muted)',
            marginBlockStart: '12px',
            maxWidth: '46ch',
          }}
        >
          {t.tienda.puerta.lead}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          // Apiladas en teléfono, no dos columnas: media pantalla a 400px deja
          // ~186px de imagen, y una puerta tiene que sentirse como una puerta.
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: { xs: '24px', sm: '20px', md: '28px' },
        }}
      >
        {TIENDA_CATEGORIAS.map((categoria, index) => (
          <DoorCard key={categoria.key} categoria={categoria} index={index} />
        ))}
      </Box>
    </TiendaShell>
  );
}
